# Credify Backend

Express + MongoDB backend for Credify with JWT auth, email verification, password reset, admin APIs, payments, and project management.

## What works now

- Authentication with signup, login, and JWT-protected routes
- Email verification via `GET /api/auth/verify-email?token=`
- Password reset via `POST /api/auth/forgot-password` and `POST /api/auth/reset-password`
- Admin overview and user list endpoints
- Project CRUD with admin-allowed updates
- Submission creation and review status updates
- Certificate issuance and listing endpoints
- Company profile read/update endpoints
- Paystack payment webhook support

## Local setup

```bash
cd credify_backend
npm install
npm run dev
```

## API routes

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/auth/verify-email`
- `GET /api/admin/overview`
- `GET /api/admin/users`
- `PATCH /api/admin/users/:userId`
- `GET /api/projects`
- `POST /api/projects`
- `PATCH /api/projects/:projectId`
- `GET /api/submissions`
- `PATCH /api/submissions/:submissionId/status`
- `GET /api/certificates`

## Notes

- Backend uses `.env` config for MongoDB, JWT, SMTP, and frontend URLs
- Nodemailer is installed for email workflows
