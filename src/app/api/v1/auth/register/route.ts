import { z } from "zod";
import { getAuth } from "@/lib/auth";
import { checkOrigin, rateLimit } from "@/lib/auth-security";

export const runtime = "nodejs";
const input = z.object({ name: z.string().trim().min(1).max(100), email: z.email(), password: z.string().min(12).max(128) }).strict();

export async function POST(request: Request) {
  if (!await rateLimit(request, 5)) return Response.json({ error: "Too many requests" }, { status: 429 });
  if (!checkOrigin(request)) return Response.json({ error: "Origin validation failed" }, { status: 403 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: "Invalid registration details" }, { status: 400 });
  try {
    await getAuth().api.signUpEmail({ body: parsed.data, headers: request.headers });
    return Response.json({ message: "Check your email for a verification code." }, { status: 202 });
  } catch {
    return Response.json({ error: "Unable to create account. The email may already be registered." }, { status: 400 });
  }
}
