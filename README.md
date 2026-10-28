This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Backend authentication

The backend auth routes use Better Auth with MongoDB and university OIDC. Copy
`.env.example` to `.env.local`, fill in the MongoDB, Better Auth, university IdP,
trusted origin, and Resend values, then run `pnpm dev`. Register this OIDC
callback URL with the university identity provider:

```text
{BETTER_AUTH_URL}/api/auth/callback/university
```

Start university SSO at `GET /api/auth/sign-in/social?provider=university&callbackURL=/`.
After the SSO callback, exchange its Better Auth session for the application's
short-lived access and rotating refresh cookies with `POST /api/v1/auth/session`.
`GET /api/v1/me` returns the current identity and an `X-CSRF-Token`; send that
value as `X-CSRF-Token` for `POST /api/v1/auth/refresh` and
`POST /api/v1/auth/logout`, together with the browser's cookies. Email OTP is
available through Better Auth's `/api/auth/email-otp/*` routes and is delivered
by Resend. Admin users must enroll TOTP using Better Auth's `/api/auth/two-factor/*`
routes before exchanging their session for application tokens.

Set user `role` and `institutionId` on the server as part of provisioning; public
auth input cannot set these fields. `src/lib/authorization.ts` provides the
server-side role, institution, owner, and relationship authorization helper.

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
