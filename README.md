# InvisiShield Backend API

Express (ES6) + Prisma + PostgreSQL + AWS S3 + SendGrid

## Features

- Auth with JWT access + rotating refresh tokens
- RBAC (admin, dealer, installer, marketing, user)
- Users CRUD with cursor pagination and soft delete
- CMS Pages (draft/published) with ETag/Cache-Control
- S3 signed upload flow and asset registry
- Installations workflow (state machine) + reports
- Search endpoints (basic Postgres text search)
- Admin stats, events, impersonation
- Health checks (live/ready)

## Project Structure

- Entry: `server.js`, `app.js`
- Routes: `src/routes/`
- Controllers: `src/controllers/`
- Config: `src/config/`
- Utils: `src/utils/`
- Prisma schema: `prisma/schema.prisma`
- Postman: `postman/InvisiShield-API.postman_collection.json`

## Getting Started

1. Install dependencies

```bash
npm install
```

2. Configure environment

- Copy `.env.example` to `.env` and fill values
- Replace `DATABASE_URL` with your Render/Railway Postgres URL

3. Generate Prisma client (already generated once)

```bash
npx prisma generate
```

4. Run migrations (requires working DATABASE_URL)

```bash
npx prisma migrate dev --name init
```

5. Start the server

```bash
npm run dev
```

Server runs on `PORT` (default 8080). Base path is `/api/v1`.

## Environment Variables

- `PORT`, `NODE_ENV`, `CORS_ORIGINS`, `APP_URL`
- `DATABASE_URL`
- `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `ACCESS_TTL`, `REFRESH_TTL`
- `SENDGRID_API_KEY`, `SENDGRID_FROM_EMAIL`
- `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_PUBLIC_BASE_URL`

## Upload Flow (S3)

1. `POST /uploads/signed-url` to get a signed PUT URL
2. PUT file to returned `uploadUrl`
3. `POST /uploads/complete` with `{ objectKey, metadata }`

## Notes

- Background queues are not used. Emails and DB writes are inline.
- Search uses basic `contains` filters. `pg_trgm` can be added later.

## Deployment

- Works well on Render or Railway
- Ensure env vars are set in the platform dashboard
- Consider adding a separate `DATABASE_URL` for production

## Postman Collection

Import `postman/InvisiShield-API.postman_collection.json`. It includes all endpoints and auto-saves tokens to collection variables.
