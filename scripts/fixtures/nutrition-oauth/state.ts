export type FixtureUser = { id: string; email: string; displayName: string; role: string };
let current: FixtureUser | null = null;
export const fixtureCookies = new Map<string, string>();
export function setFixtureUser(user: FixtureUser | null) { current = user; }
export async function getSessionUser() { return current; }
export async function requireSessionUser() { if (!current) throw new Error("UNAUTHORIZED"); return current; }
export async function cookies() {
  return {
    get: (name: string) => fixtureCookies.has(name) ? { value: fixtureCookies.get(name)! } : undefined,
    set: (name: string, value: string) => { fixtureCookies.set(name, value); },
  };
}
