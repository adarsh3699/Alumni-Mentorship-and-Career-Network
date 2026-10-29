This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Backend authentication

The backend auth routes use email and password with Better Auth and MongoDB.
Copy `.env.example` to `.env.local`, fill in the MongoDB, Better Auth, trusted
origin, and Resend values, then run `pnpm dev`.

Register with `POST /api/v1/auth/register` (`name`, `email`, `password`), verify
the emailed code with `POST /api/v1/auth/verify-email` (`email`, `otp`), then
sign in with `POST /api/v1/auth/login` (`email`, `password`). Successful login
sets short-lived access and rotating refresh cookies. Admin login requires TOTP;
Better Auth's `/api/auth/two-factor/*` routes provide TOTP enrollment and the
`POST /api/v1/auth/verify-totp` endpoint completes a login challenge.

For local development, send `Origin: http://localhost:3000` on auth requests.
Use `Content-Type: application/json` and JSON bodies. After login, keep Postman's
cookies enabled. Call `GET /api/v1/me` to receive an `X-CSRF-Token`, then include
it on refresh and logout requests.

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
