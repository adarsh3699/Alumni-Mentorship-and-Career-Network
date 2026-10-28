import { createHash, randomBytes } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import { ObjectId } from "mongodb";
import { db } from "@/lib/auth";

const key = () => new TextEncoder().encode(process.env.BETTER_AUTH_SECRET!);
const accessSeconds = 15 * 60;
const refreshSeconds = 30 * 24 * 60 * 60;
const digest = (token: string) => createHash("sha256").update(token).digest("hex");

export async function issueTokens(user: { id: string; role?: string; institutionId?: string }) {
  const family = randomBytes(24).toString("base64url");
  const access = await new SignJWT({ role: user.role || "student", institutionId: user.institutionId })
    .setProtectedHeader({ alg: "HS256" }).setSubject(user.id).setIssuer(process.env.BETTER_AUTH_URL!).setAudience("alumni-api").setIssuedAt().setExpirationTime("15m").sign(key());
  const refresh = randomBytes(48).toString("base64url");
  await db.collection("authRefreshTokens").insertOne({ tokenHash: digest(refresh), family, userId: user.id, createdAt: new Date(), expiresAt: new Date(Date.now() + refreshSeconds * 1000), revokedAt: null });
  return { access, refresh };
}

export async function rotateRefresh(token: string) {
  const collection = db.collection("authRefreshTokens");
  const tokenHash = digest(token);
  const record = await collection.findOne({ tokenHash });
  if (!record || record.revokedAt || record.expiresAt <= new Date()) return null;
  const next = randomBytes(48).toString("base64url");
  const result = await collection.updateOne({ _id: record._id, revokedAt: null, expiresAt: { $gt: new Date() } }, { $set: { revokedAt: new Date() } });
  if (!result.modifiedCount) {
    await collection.updateMany({ family: record.family }, { $set: { revokedAt: new Date() } });
    return null;
  }
  await collection.insertOne({ tokenHash: digest(next), family: record.family, userId: record.userId, createdAt: new Date(), expiresAt: new Date(Date.now() + refreshSeconds * 1000), revokedAt: null });
  const user = await getUserById(record.userId);
  if (!user) return null;
  const access = await new SignJWT({ role: user.role || "student", institutionId: user.institutionId })
    .setProtectedHeader({ alg: "HS256" }).setSubject(record.userId).setIssuer(process.env.BETTER_AUTH_URL!).setAudience("alumni-api").setIssuedAt().setExpirationTime("15m").sign(key());
  return { access, refresh: next, userId: record.userId };
}

export async function revokeRefresh(token: string) {
  const record = await db.collection("authRefreshTokens").findOne({ tokenHash: digest(token) });
  if (record) await db.collection("authRefreshTokens").updateMany({ family: record.family }, { $set: { revokedAt: new Date() } });
}

export async function verifyAccess(token: string) {
  try { return (await jwtVerify(token, key(), { issuer: process.env.BETTER_AUTH_URL, audience: "alumni-api" })).payload; }
  catch { return null; }
}

export function authCookies(access: string, refresh: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return [
    `access_token=${access}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${accessSeconds}${secure}`,
    `refresh_token=${refresh}; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=${refreshSeconds}${secure}`,
  ];
}

export function clearAuthCookies() {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return [`access_token=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure}`, `refresh_token=; Path=/api/v1/auth; HttpOnly; SameSite=Lax; Max-Age=0${secure}`];
}

export async function getUserById(id: string) {
  const users = db.collection("user");
  if (ObjectId.isValid(id)) {
    const byObjectId = await users.findOne({ _id: new ObjectId(id) });
    if (byObjectId) return byObjectId;
  }
  return users.findOne({ _id: id } as never);
}
