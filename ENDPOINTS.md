# InvisiShield Backend API — Endpoints Reference

Base path: `/api/v1`

- **[Auth]** `/auth`
  - POST `/auth/login`
  - POST `/auth/refresh`
  - POST `/auth/logout`
  - POST `/auth/request-password-reset`
  - POST `/auth/reset-password`
  - GET `/auth/me`

- **[Users]** `/users`
  - GET `/users` — admin
  - POST `/users` — admin
  - GET `/users/:id` — admin or owner
  - PATCH `/users/:id` — admin or owner
  - DELETE `/users/:id` — admin

- **[Content]** `/content`
  - GET `/content/pages` — public; query: `status`, `slug`, `limit`
  - GET `/content/pages/:slug` — public
  - POST `/content/pages` — admin|marketing
  - PATCH `/content/pages/:id` — admin|marketing

- **[Uploads]** `/uploads`
  - POST `/uploads/signed-url` — auth; body: `{ filename, contentType, size, context }`
  - POST `/uploads/complete` — auth; body: `{ objectKey, metadata }`
  - GET `/uploads/:id` — auth

- **[Installations]** `/installations`
  - POST `/installations` — dealer|installer
  - GET `/installations` — dealer/admin with ownership rules
  - GET `/installations/:id` — owner/admin
  - PATCH `/installations/:id` — owner/admin
  - POST `/installations/:id/reports` — dealer/installer

- **[Reports]** `/reports`
  - GET `/reports` — admin/dealer; query: `installationId`, `type`
  - GET `/reports/:id` — owner/admin
  - DELETE `/reports/:id` — admin

- **[Search]** `/search`
  - GET `/search` — public or auth depending on type
  - GET `/search/suggest` — public

- **[Admin]** `/admin`
  - GET `/admin/stats` — admin
  - GET `/admin/events` — admin
  - POST `/admin/users/:id/impersonate` — admin

- **[Health]** `/health`
  - GET `/health/live` — public
  - GET `/health/ready` — internal

## Auth & Headers

- Use `Authorization: Bearer <accessToken>` for protected endpoints.
- Rate limits: global and auth-specific. Login also has additional limiter.

## Pagination

- Cursor-based: `?limit=&cursor=`
- Response: `{ items: [...], nextCursor }`

## Status Machines and Notes

- Installations status: `created -> scheduled -> in_progress -> completed -> archived`.
- Content pages track `createdBy`, `updatedBy`, `publishedAt`.

## Uploads

- Request signed URL then PUT file to S3 using returned URL. Finish with `/uploads/complete` including the `objectKey`.

## Errors

- JSON error format: `{ error: string }` or `{ errors: ValidationError[] }`.
