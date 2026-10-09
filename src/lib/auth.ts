/** The Google Workspace domain allowed to sign in, e.g. "yourcompany.com". */
export const ALLOWED_DOMAIN = (
  process.env.NEXT_PUBLIC_ALLOWED_EMAIL_DOMAIN ?? ""
).toLowerCase();

export function isAllowedEmail(email: string | null | undefined): boolean {
  if (!email || !ALLOWED_DOMAIN) return false;
  return email.toLowerCase().split("@")[1] === ALLOWED_DOMAIN;
}
