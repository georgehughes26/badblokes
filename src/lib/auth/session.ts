import { nanoid } from "nanoid";
import { prisma } from "@/lib/prisma";
import type { Role } from "@prisma/client";

export const SESSION_COOKIE_NAME = "bba_session";
export const SESSION_TTL_DAYS = 30;

export interface SessionUser {
  id: string;
  username: string;
  name: string;
  role: Role;
  active: boolean;
}

/** Create a new DB-backed session and return its opaque token (this is what goes in the cookie). */
export async function createSession(userId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = nanoid(48);
  const expiresAt = new Date(Date.now() + SESSION_TTL_DAYS * 24 * 60 * 60 * 1000);
  await prisma.session.create({ data: { token, userId, expiresAt } });
  return { token, expiresAt };
}

/** Resolve a session token to its user. Returns null if the token is missing, expired, or the user's been deactivated. */
export async function getUserForSessionToken(token: string | undefined): Promise<SessionUser | null> {
  if (!token) return null;
  const session = await prisma.session.findUnique({ where: { token }, include: { user: true } });
  if (!session) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { token } }).catch(() => undefined);
    return null;
  }
  if (!session.user.active) return null;
  return {
    id: session.user.id,
    username: session.user.username,
    name: session.user.name,
    role: session.user.role,
    active: session.user.active,
  };
}

export async function deleteSession(token: string | undefined): Promise<void> {
  if (!token) return;
  await prisma.session.delete({ where: { token } }).catch(() => undefined);
}
