import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getUserForSessionToken, SESSION_COOKIE_NAME, type SessionUser } from "@/lib/auth/session";

export async function getCurrentUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE_NAME)?.value;
  return getUserForSessionToken(token);
}

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
