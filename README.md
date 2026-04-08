# Openlier

Openlier is an open-source AI YouTube thumbnail generator built with Next.js.
It supports prompt-based generation, optional style references from YouTube links, credit-based usage, and Stripe checkout.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Better Auth (GitHub OAuth)
- PostgreSQL (`pg`)
- Stripe (checkout + webhook)
- Google Gemini (prompt safety + image generation)
- AWS S3 (image storage)
- Zustand + Tailwind CSS

## Quick Start

### 1) Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL database
- GitHub OAuth app
- Stripe account
- Google AI Studio key + YouTube Data API key
- AWS S3 bucket and IAM credentials

### 2) Install

```bash
pnpm install
```

### 3) Configure environment

Copy `.env.example` to `.env.local` and fill in the values you need:

```bash
cp .env.example .env.local
```

Minimum local variables:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DB_NAME
BETTER_AUTH_SECRET=replace-me-with-a-long-random-string

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
```

Keep the rest if you want the full product flow locally:

- Stripe for credit checkout
- Google AI Studio + YouTube API for generation/reference enrichment
- S3 for storing generated images

Set `GENERATE_IMAGES=false` if you want to avoid real image generation while wiring the app locally.

### 4) Create the database schema

The repo now ships with an idempotent local database bootstrap:

```bash
pnpm db:setup
```

This creates:

- Better Auth tables: `"user"`, `session`, `account`, `verification`
- App tables: `thumbnail_session`, `thumbnail_generation`, `credit_purchase`, `konami_redemption`, `user_cameo`

### 5) Run locally

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) and sign in with GitHub.
Local auth still requires a GitHub OAuth app configured for your local callback URL.

## Scripts

- `pnpm dev` - Start development server
- `pnpm build` - Build production bundle
- `pnpm start` - Start production server
- `pnpm lint` - Run ESLint
- `pnpm db:setup` - Create/update the local PostgreSQL schema

## Main API Routes

- `POST /api/generate` - Validate/enrich prompt and generate thumbnail
- `GET /api/sessions` - List user sessions
- `POST /api/sessions` - Create session
- `GET /api/sessions/:id` - Get generations for a session
- `DELETE /api/sessions/:id` - Delete session
- `GET /api/images/:id` - Resolve signed image URL / blob stream
- `POST /api/stripe/checkout` - Create Stripe checkout session
- `POST /api/stripe/confirm` - Confirm checkout result
- `POST /api/stripe/webhook` - Stripe webhook handler
- `GET /api/youtube/channel` - Fetch channel-based style references
- `GET /api/youtube/video` - Fetch video metadata/thumbnail
- `POST /api/konami` - One-time bonus credits
- `GET/POST /api/auth/[...all]` - Better Auth endpoints

## Basic Flow

1. User signs in with GitHub.
2. User creates a session.
3. User submits prompt (+ optional references).
4. API deducts 1 credit and runs Gemini safety/enrichment.
5. If enabled, image is generated and uploaded to S3.
6. Generation metadata is stored in PostgreSQL.

## Deploy (generic Node/Next.js)

1. Set all environment variables in your hosting platform.
2. Provision PostgreSQL and run `pnpm db:setup` before first request.
3. Expose a public HTTPS URL for `POST /api/stripe/webhook` and configure it in Stripe.
4. Build and run:

```bash
pnpm build
pnpm start
```

## Troubleshooting

- `401 Unauthorized`: verify session/auth cookies and GitHub OAuth config.
- `Error generating image`: verify `GOOGLE_AI_STUDIO_API_KEY` and `GENERATE_IMAGES=true`.
- Stripe webhook errors: verify `STRIPE_WEBHOOK_SECRET` and raw-body signature handling.
- YouTube lookup failures: verify `YOUTUBE_API_KEY` and quota.
- Missing image previews: verify S3 credentials, bucket name, and region.
- DB relation errors: run `pnpm db:setup` and confirm `DATABASE_URL` points to the expected database.
