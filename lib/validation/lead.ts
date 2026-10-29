/**
 * Website/phone FORMAT checks for the Add Lead / Edit Lead forms (2026-10-28) -- lets the rep see
 * "incorrect format" immediately, before they even press Save, instead of submitting and finding out
 * from a 422. User's own correction after seeing an earlier version: "mujhse ghalti se qw lag jaye toh
 * woh add nahi hona chahiye, wahin bole incorrect format, add lead he na ho jab tak woh sahi ho ... bina
 * website k or bina number k bhaly lead add on ho jaye lekin galat formats me na ho".
 *
 * Mirrors outreach-backend/app/services/validation.py's `is_plausible_website()`/`is_plausible_phone()`
 * exactly -- same two functions, duplicated here (not shared, there's no cross-language import) so this
 * is a genuine PRE-check, not just an earlier call to the same code. The backend's own copies are still
 * the authoritative, final check (a field_validator on CreateLeadInput/UpdateLeadInput rejects with 422
 * either way) -- this file only ever makes the SAME verdict visible sooner.
 *
 * Both treat an EMPTY value as fine -- a lead is allowed to have no website/phone at all; only a GIVEN
 * garbage value is rejected.
 */

const _DOMAIN_RE =
  /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*\.[a-z]{2,}$/;

export function isPlausibleWebsite(raw: string): boolean {
  const value = (raw || "").trim();
  if (!value) return true;
  const withScheme = /^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(value) ? value : `https://${value}`;
  let host: string;
  try {
    host = new URL(withScheme).hostname.toLowerCase();
  } catch {
    return false;
  }
  host = host.replace(/^www\./, "");
  return _DOMAIN_RE.test(host);
}

/**
 * BUGFIX (2026-10-29): contact_phone has ALWAYS been allowed to carry several comma-joined numbers for
 * one lead (see components/leads/phone-number-list.tsx's own comment, and the backend's
 * is_plausible_phone() for the full list of existing call sites that already expect this). This check
 * didn't account for that -- a real multi-number lead (e.g. "+447786363281 ,+44 371 964 2113") failed
 * validation and blocked Save the moment the blocking version of this check shipped. Splits on comma and
 * checks each piece on its own, same as the backend now does.
 */
function isPlausibleSinglePhone(value: string): boolean {
  if (!/^[0-9+()\-. ]+$/.test(value)) return false;
  const digitCount = (value.match(/\d/g) || []).length;
  return digitCount >= 7;
}

export function isPlausiblePhone(raw: string): boolean {
  const value = (raw || "").trim();
  if (!value) return true;
  const pieces = value
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (pieces.length === 0) return false;
  return pieces.every(isPlausibleSinglePhone);
}

/**
 * Auto-inserts ", " between phone numbers typed/pasted back-to-back with no separator at all (user,
 * 2026-10-29: "agar koi add krna bhul jaye 2 3 numbers me sy ek k bech me toh system wahan auto add kr
 * dy"). Scoped to the one unambiguous boundary this data actually has: every number in this CRM's real
 * data is written with a leading "+<country code>" (see the same examples above) -- so a "+" that shows
 * up right after another number's digits, with nothing but whitespace (no comma) between them, is always
 * the start of a NEW number. A properly comma-separated input is left untouched (the comma itself isn't
 * whitespace, so the pattern below doesn't match across it).
 */
export function autoSeparatePhoneNumbers(raw: string): string {
  return (raw || "").replace(/(\d)[ \t]*(\+\d)/g, "$1, $2");
}
