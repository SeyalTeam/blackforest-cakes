# Separate Vercel Setup

This setup is for a new Vercel account or team and does not require changing the current live Black Forest deployment.

## Goal

Deploy three separate Vercel projects from the same repository:

1. `blackforest-api` from the repo root
2. `orders1` from `frontends/orders1.theblackforestcakes.com`
3. `admin1` from `frontends/admin1.theblackforestcakes.com`

## Important Scope

This setup isolates the HTTP backend and both frontend panels.

Realtime socket behavior from the old `api3` server is not migrated here. The preparation script disables the old Socket.IO clients in the frontend snapshots so the new account does not depend on the current live socket server.

That means the new setup supports normal usage such as:

- login
- viewing and updating orders
- image loading through the backend and R2
- order creation and standard admin flows

But these live-refresh behaviors will not auto-update until realtime is replaced:

- delivery tracking auto-refresh
- live branch order auto-refresh

## Backend Project

Create a Vercel project from the repo root:

- Root Directory: `.`
- Framework Preset: `Other`

Required environment variables are documented in `.env.example` at the repo root.

Deploy the backend first and note the claimed production URL, for example:

- `https://your-backend-project.vercel.app`

## Prepare Frontends For The New Backend

Run this locally after the backend project URL is known:

```bash
cd /Users/castromurugan/Documents/Blackforest/blackforest-cakes
node scripts/prepare-separate-vercel.js https://your-backend-project.vercel.app
```

What the script does:

- updates `orders1` to proxy all `/v1/*` traffic to the new backend
- updates `admin1` to proxy all `/v1/*` traffic to the new backend
- switches `admin1` API calls to relative `/v1`
- disables the old Socket.IO frontend clients so the separate setup does not depend on `api3`
- creates backups of changed files with the `.separate-backup` suffix

## Frontend Projects

Create two more Vercel projects from the same repo:

### orders1

- Root Directory: `frontends/orders1.theblackforestcakes.com`
- Framework Preset: `Other`

### admin1

- Root Directory: `frontends/admin1.theblackforestcakes.com`
- Framework Preset: `Other`

No frontend build step is required for these static snapshots.

## Validation Checklist

After deployment, check:

1. backend root responds
2. `orders1` login works
3. `admin1` login works
4. product images load
5. KOT/order images load
6. order creation works
7. order status update works

## Current Limitation

If the old server at `165.22.220.81` is shut down, the new setup will still work for standard HTTP flows, but live socket refresh features will remain disabled until we migrate them to Pusher or another realtime service.
