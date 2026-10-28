import { betterAuth, type BetterAuthOptions } from "better-auth";
import { mongodbAdapter } from "@better-auth/mongo-adapter";
import { genericOAuth } from "better-auth/plugins/generic-oauth";
import { emailOTP, twoFactor } from "better-auth/plugins";
import { MongoClient } from "mongodb";
import { Resend } from "resend";

const required = (key: string) => {
  const value = process.env[key];
  if (!value) throw new Error(`Missing environment variable: ${key}`);
  return value;
};

let client: MongoClient | undefined;
export const db = {
  collection: (name: string) => {
    client ??= new MongoClient(required("MONGODB_URI"));
    return client.db(process.env.MONGODB_DB || "alumni_network").collection(name);
  },
} as ReturnType<MongoClient["db"]>;
const sendEmail = async (input: Parameters<Resend["emails"]["send"]>[0]) => {
  const resend = new Resend(required("RESEND_API_KEY"));
  return resend.emails.send(input);
};

let instance: ReturnType<typeof betterAuth<BetterAuthOptions>> | undefined;
export function getAuth() {
  if (!instance) instance = betterAuth<BetterAuthOptions>({
  appName: "Alumni Mentorship Network",
  baseURL: required("BETTER_AUTH_URL"),
  secret: required("BETTER_AUTH_SECRET"),
  database: mongodbAdapter(db),
  trustedOrigins: (process.env.AUTH_TRUSTED_ORIGINS || "").split(",").filter(Boolean),
  emailAndPassword: { enabled: false },
  user: {
    additionalFields: {
      role: { type: "string", required: false, defaultValue: "student", input: false },
      institutionId: { type: "string", required: false, input: false },
    },
  },
  session: { expiresIn: 15 * 60, updateAge: 5 * 60, cookieCache: { enabled: false } },
  advanced: {
    useSecureCookies: process.env.NODE_ENV === "production",
    defaultCookieAttributes: { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" },
  },
  plugins: [
    genericOAuth({ config: [{
      providerId: "university",
      name: "University SSO",
      discoveryUrl: `${required("OIDC_ISSUER_URL").replace(/\/$/, "")}/.well-known/openid-configuration`,
      requireIdTokenVerification: true,
      clientId: required("OIDC_CLIENT_ID"),
      clientSecret: required("OIDC_CLIENT_SECRET"),
      scopes: ["openid", "profile", "email"],
      mapProfileToUser: (profile) => ({
        email: String(profile.email || ""),
        name: String(profile.name || profile.email || "University user"),
        image: typeof profile.picture === "string" ? profile.picture : undefined,
        emailVerified: profile.email_verified === true,
      }),
    }] }),
    emailOTP({
      otpLength: 6,
      expiresIn: 300,
      allowedAttempts: 3,
      disableSignUp: true,
      storeOTP: "hashed",
      rateLimit: { window: 60, max: 3 },
      async sendVerificationOTP({ email, otp, type }) {
        const { error } = await sendEmail({
          from: required("RESEND_FROM_EMAIL"),
          to: [email],
          subject: "Your Alumni Network verification code",
          text: `Your ${type === "sign-in" ? "sign-in" : "verification"} code is ${otp}. It expires in 5 minutes.`,
        });
        if (error) throw new Error("Unable to send verification email");
      },
    }),
    twoFactor({
      issuer: "Alumni Mentorship Network",
      allowPasswordless: true,
      totpOptions: { digits: 6, period: 30 },
      otpOptions: { sendOTP: async ({ user, otp }) => {
        const { error } = await sendEmail({
          from: required("RESEND_FROM_EMAIL"), to: [user.email],
          subject: "Your administrator sign-in code", text: `Your one-time code is ${otp}.`,
        });
        if (error) throw new Error("Unable to send verification email");
      } },
    }),
  ],
  databaseHooks: {
    user: { create: { before: async (user) => ({ data: { ...user, role: process.env.DEFAULT_USER_ROLE || "student" } }) } },
  },
  });
  return instance;
}
