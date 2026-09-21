import type { AuthUser } from "@/types";

/** What the backend needs: picked user ids, and/or "@team" for everyone signed up. */
export interface MentionPayload {
  mentions: number[];
  mention_team: boolean;
}

export const NO_MENTIONS: MentionPayload = { mentions: [], mention_team: false };

/**
 * The text typed after "@" for a person: their first name, or first_last when two
 * people share a first name. Kept as one word so a plain regex can find it again.
 */
export function mentionHandle(user: AuthUser, all: AuthUser[]): string {
  const name = (user.name || user.email.split("@")[0]).trim();
  const first = name.split(/\s+/)[0];
  const clash = all.some(
    (u) => u.id !== user.id && (u.name || u.email.split("@")[0]).trim().split(/\s+/)[0].toLowerCase() === first.toLowerCase(),
  );
  return clash ? name.split(/\s+/).join("_") : first;
}

/**
 * Reads the @names out of the finished text, so nothing has to be tracked while typing --
 * delete a name from the box and that person is simply no longer mentioned.
 */
export function extractMentions(text: string, users: AuthUser[]): MentionPayload {
  const byHandle = new Map(users.map((u) => [mentionHandle(u, users).toLowerCase(), u.id]));
  const ids = new Set<number>();
  let team = false;
  for (const m of text.matchAll(/(^|[\s(])@([\w.-]+)/g)) {
    const handle = m[2].replace(/[.-]+$/, "").toLowerCase();
    if (handle === "team") team = true;
    else if (byHandle.has(handle)) ids.add(byHandle.get(handle)!);
  }
  return { mentions: [...ids], mention_team: team };
}
