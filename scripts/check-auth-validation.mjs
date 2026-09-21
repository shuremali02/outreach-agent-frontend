// Offline checks for the sign-in / create-account rules. From outreach-frontend:
//   node --experimental-strip-types scripts/check-auth-validation.mjs
// (Node warns about the module type; that is harmless.)
import { signInSchema, signUpSchema, passwordProblem, passwordScore } from "../lib/validation/auth.ts";
let fail = 0;
const t = (label, ok) => { if (!ok) fail++; console.log(`  [${ok ? "ok  " : "FAIL"}] ${label}`); };
const first = (r) => (r.success ? null : r.error.issues[0].message);
const good = { name: "Ayesha Khan", email: "Ayesha@Elipsestudio.com", password: "Abcdef12", confirm: "Abcdef12", code: "" };
const S = signUpSchema();

t("valid form passes", S.safeParse(good).success);
t("email is lower-cased", (S.safeParse(good)).data.email === "ayesha@elipsestudio.com");
for (const [label, pw] of [["no uppercase","abcdef12"],["no lowercase","ABCDEF12"],["no number","Abcdefgh"],["7 chars","Abcde12"]] )
  t(`password with ${label} fails`, !S.safeParse({ ...good, password: pw, confirm: pw }).success);
t("message names all missing", passwordProblem("abc") === "Password needs at least 8 characters, an uppercase letter and a number.");
t("one missing -> single phrase", passwordProblem("Abcdefgh") === "Password needs a number.");
t("password kept exactly (spaces)", (S.safeParse({ ...good, password: " Abcdef12 ", confirm: " Abcdef12 " })).data.password === " Abcdef12 ");
t("129 chars fails", !S.safeParse({ ...good, password: "Aa1" + "x".repeat(126), confirm: "Aa1" + "x".repeat(126) }).success);
t("mismatch reported on confirm", (S.safeParse({ ...good, confirm: "Abcdef13" })).error.issues.some((i) => i.path[0] === "confirm"));
for (const e of ["nope","a@b","a@@b.com","a b@c.com","a..b@c.com","@c.com","a@c.",""]) t(`email ${JSON.stringify(e)} fails`, !S.safeParse({ ...good, email: e }).success);
for (const n of ["","A","<b>x</b>","1234","Sara@home"]) t(`name ${JSON.stringify(n)} fails`, !S.safeParse({ ...good, name: n }).success);
t("name tidied", (S.safeParse({ ...good, name: "  Ali   Khan " })).data.name === "Ali Khan");
t("O'Brien / Mary-Ann ok", ["O'Brien","Mary-Ann","Ayesha Bibi"].every((n) => S.safeParse({ ...good, name: n }).success));
t("invite code required only when asked", !signUpSchema({ codeRequired: true }).safeParse(good).success && signUpSchema({ codeRequired: true }).safeParse({ ...good, code: "x" }).success && S.safeParse(good).success);
t("score 0..4", passwordScore("") === 0 && passwordScore("Abcdef12") === 4 && passwordScore("abc") === 1);
t("sign-in has no strength rules", signInSchema.safeParse({ email: "a@b.com", password: "x" }).success);
t("sign-in needs a password", !signInSchema.safeParse({ email: "a@b.com", password: "" }).success);
t("sign-in checks email format", first(signInSchema.safeParse({ email: "nope", password: "x" })) === "Enter a valid email address.");
console.log(fail ? `${fail} FAILED` : "All checks passed.");
process.exit(fail ? 1 : 0);
