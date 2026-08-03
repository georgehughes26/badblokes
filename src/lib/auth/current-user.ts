import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserForSessionToken, SESSION_COOKIE_NAME, type SessionUser } from "@/lib/auth/session";

// The NavBar, MobileTabBar, and the page itself each need the current user,
// and every one of those DB round-trips crosses the Atlantic to Supabase —
// `cache()` collapses them into a single session lookup per request instead
// of paying that latency 2-3 times on every navigation.
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return getUserForSessionToken(token);
});

/** Use in server components/route handlers that require any logged-in user. Redirects to /login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

/** Use in server components/route handlers that require an admin. Redirects non-admins to the dashboard. */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.role !== "ADMIN") redirect("/");
  return user;
}
