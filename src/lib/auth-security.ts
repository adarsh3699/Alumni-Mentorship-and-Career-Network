import { randomBytes, timingSafeEqual } from "node:crypto";
import { db } from "@/lib/auth";
import { verifyAccess, getUserById } from "@/lib/app-tokens";

const mutating = new Set(["POST", "PUT", "PATCH", "DELETE"]);

export function csrfToken() {
  return randomBytes(32).toString("base64url");
}

export function checkRequest(request: Request) {
  if (!mutating.has(request.method)) return true;
  return checkOrigin(request) && checkCsrf(request);
}

export function checkOrigin(request: Request) {
  const allowed = new Set((process.env.AUTH_TRUSTED_ORIGINS || "").split(",").filter(Boolean));
  const source = request.headers.get("origin") || request.headers.get("referer");
  if (!source) return false;
  try { if (!allowed.has(new URL(source).origin)) return false; } catch { return false; }
  return true;
}

function checkCsrf(request: Request) {
  const cookie = request.headers.get("cookie")?.match(/(?:^|;\s*)csrf_token=([^;]+)/)?.[1];
  const header = request.headers.get("x-csrf-token");
  if (!cookie || !header || cookie.length !== header.length) return false;
  return timingSafeEqual(Buffer.from(cookie), Buffer.from(header));
}

export async function currentUser(request: Request) {
  const token = request.headers.get("cookie")?.match(/(?:^|;\s*)access_token=([^;]+)/)?.[1];
  const payload = token && await verifyAccess(token);
  if (typeof payload?.sub !== "string") return null;
  const user = await getUserById(payload.sub);
  return user ? { user } : null;
}

export async function requireRole(request: Request, roles: string[]) {
  if (!checkRequest(request)) return { error: "CSRF or origin validation failed", status: 403 as const };
  const session = await currentUser(request);
  if (!session) return { error: "Authentication required", status: 401 as const };
  const role = (session.user as typeof session.user & { role?: string }).role || "student";
  if (!roles.includes(role)) return { error: "Forbidden", status: 403 as const };
  return { session, role };
}

export async function rateLimit(request: Request, limit = 10, windowSeconds = 60) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const key = `${new URL(request.url).pathname}:${ip}`;
  const bucketId = Buffer.from(key).toString("base64url");
  const now = new Date();
  const collection = db.collection("authRateLimits") as import("mongodb").Collection<{ _id: string; count: number; resetAt: Date }>;
  const bucket = await collection.findOne({ _id: bucketId });
  if (!bucket || bucket.resetAt <= now) {
    await collection.updateOne({ _id: bucketId }, { $set: { count: 1, resetAt: new Date(now.getTime() + windowSeconds * 1000) } }, { upsert: true });
    return true;
  }
  if (bucket.count >= limit) return false;
  await collection.updateOne({ _id: bucketId }, { $inc: { count: 1 } });
  return true;
}
