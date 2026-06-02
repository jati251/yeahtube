import "server-only";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getDb, schema } from "../db";
import { verifyPassword } from "./password";
import { eq } from "drizzle-orm";

// ── Types ───────────────────────────────────────────────

export interface SessionPayload {
  sub: number;
  username: string;
  isAdmin: boolean;
  iat: number;
  exp: number;
}

export interface CurrentUser {
  id: number;
  username: string;
  isAdmin: boolean;
}

// ── Constants ───────────────────────────────────────────

const SESSION_COOKIE_NAME = "yeahtube_session";
const SESSION_DURATION_SECONDS = 7 * 24 * 60 * 60; // 7 days

function getJwtSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("Missing JWT_SECRET environment variable");
  }
  return new TextEncoder().encode(secret);
}

// ── Token Operations ────────────────────────────────────

export async function createToken(payload: Omit<SessionPayload, "iat" | "exp">) {
  const secret = getJwtSecret();
  const now = Math.floor(Date.now() / 1000);

  return new SignJWT({
    sub: String(payload.sub),
    username: payload.username,
    isAdmin: payload.isAdmin,
    iat: now,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(now + SESSION_DURATION_SECONDS)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<SessionPayload> {
  const secret = getJwtSecret();
  const { payload } = await jwtVerify(token, secret);
  return {
    sub: Number(payload.sub),
    username: payload.username as string,
    isAdmin: payload.isAdmin as boolean,
    iat: payload.iat as number,
    exp: payload.exp as number,
  };
}

// ── Login / Register ────────────────────────────────────

export async function login(
  username: string,
  password: string,
): Promise<{ success: true; token: string } | { success: false; error: string }> {
  const db = getDb();

  const [user] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username));

  if (!user) {
    return { success: false, error: "Invalid username or password" };
  }

  if (!user.isWhitelisted) {
    return { success: false, error: "Account is not whitelisted. Contact an admin." };
  }

  const valid = await verifyPassword(password, user.passwordHash);
  if (!valid) {
    return { success: false, error: "Invalid username or password" };
  }

  const token = await createToken({
    sub: user.id,
    username: user.username,
    isAdmin: !!user.isAdmin,
  });

  return { success: true, token };
}

export async function register(
  username: string,
  password: string,
  email?: string,
): Promise<{ success: true; token: string } | { success: false; error: string }> {
  const db = getDb();

  const [existing] = await db
    .select()
    .from(schema.users)
    .where(eq(schema.users.username, username));

  if (existing) {
    return { success: false, error: "Username already taken" };
  }

  const { hashPassword } = await import("./password");
  const passwordHash = await hashPassword(password);

  const [newUser] = await db
    .insert(schema.users)
    .values({
      username,
      email: email ?? null,
      passwordHash,
      isWhitelisted: 0,
      isAdmin: 0,
    })
    .returning();

  const token = await createToken({
    sub: newUser.id,
    username,
    isAdmin: false,
  });

  return { success: true, token };
}

// ── Session Cookie Management ──────────────────────────

export async function setSessionCookie(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function clearSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

export async function getSessionCookie(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get(SESSION_COOKIE_NAME)?.value;
}

// ── Session / User Helpers ─────────────────────────────

export async function getSession(): Promise<SessionPayload | null> {
  const token = await getSessionCookie();
  if (!token) return null;

  try {
    return await verifyToken(token);
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;

  return {
    id: session.sub,
    username: session.username,
    isAdmin: session.isAdmin,
  };
}

export async function requireAuth(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }
  return user;
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await requireAuth();
  if (!user.isAdmin) {
    redirect("/");
  }
  return user;
}
