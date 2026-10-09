# Credify Backend API

A robust and scalable Node.js backend API for the Credify platform - an educational credentialing and certification system. Built with Express.js and MongoDB, this API provides comprehensive functionality for user management, course delivery, certification, payments, and more.

## Overview

Credify is a complete credential management platform that empowers educational institutions, corporations, and training providers to create, manage, and verify digital credentials. The backend API handles authentication, course management, certification, payment processing, leaderboards, and administrative operations.

## Features

- **User Authentication & Authorization**
  - Secure JWT-based authentication
  - bcryptjs password hashing
  - Role-based access control

- **Course Management**
  - Create and manage courses
  - Track course progress
  - Student enrollment

- **Certification System**
  - Digital certificates
  - Badge system
  - Credential verification

- **User Profiles**
  - User profile management
  - Profile customization
  - Portfolio building

- **Payment Integration**
  - Paystack integration for payments
  - Webhook support for payment callbacks
  - Multiple payment provider support

- **Leaderboard & Gamification**
  - User rankings
  - Rating system
  - Badges and achievements

- **Project Management**
  - Project creation and tracking
  - Submission management
  - Project-based learning

- **Admin Dashboard**
  - Administrative operations
  - User management
  - Analytics and reporting

- **Company Management**
  - Multi-tenant company support
  - Company-specific configurations

## Tech Stack

- **Runtime:** Node.js 20
- **Framework:** Express.js 5.2.1
- **Database:** MongoDB with Mongoose 9.3.3
- **Authentication:** JWT (jsonwebtoken 9.0.3)
- **Security:** bcryptjs 3.0.3, CORS
- **Environment Management:** dotenv
- **Containerization:** Docker & Docker Compose
- **Language:** JavaScript (CommonJS)

## Project Structure

```
credify-backend/
├── config/
│   ├── environment.js       # Environment variables configuration
│   └── db.js               # MongoDB connection setup
├── src/
│   ├── app.js              # Express app setup
│   ├── common/
│   │   └── http.js         # HTTP utilities and error handling
│   └── features/
│       ├── authentication/ # Auth routes and handlers
│       ├── profile/        # User profile management
│       ├── courses/        # Course management
│       ├── badges/         # Badge system
│       ├── certificates/   # Certificate management
│       ├── payments/       # Payment integration
│       ├── leaderboard/    # Leaderboard & rankings
│       ├── dashboard/      # Dashboard endpoints
│       ├── admin/          # Admin operations
│       ├── company/        # Company management
│       ├── projects/       # Project management
│       ├── ratings/        # Rating system
│       └── submissions/    # Submission handling
├── scripts/
│   └── start-ngrok.js      # ngrok tunnel setup for webhooks
├── postman/                # Postman collections
├── server.js               # Server entry point
├── Dockerfile              # Docker container setup
├── docker-compose.yml      # Multi-container Docker setup
├── .env.example            # Environment variables template
└── package.json            # Project dependencies
```

## Installation

### Prerequisites

- **Node.js** 20 or higher
- **MongoDB** 7.0 or higher
- **npm** or **yarn**
- **Docker** (optional, for containerized setup)

### Local Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/obedyakpa0-dev/Credify-backend.git
   cd Credify-backend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure environment variables**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` and configure the required variables

4. **Start MongoDB**

   ```bash
   # If running locally
   mongod
   ```

5. **Run the server**

   ```bash
   # Development mode with hot reload
   npm run dev

   # Production mode
   npm start
   ```

6. **Verify the server is running**
   ```bash
   curl http://localhost:5000/health
   ```

### Docker Setup

Docker Desktop with Compose v2 is required. To run only the backend API and MongoDB, run these commands from the backend repository folder:

1. **Create your local environment file**

   ```bash
   cp .env.example .env
   ```

For a basic local run, set `PAYMENT_PROVIDER=manual` and replace the example `JWT_SECRET` with a random local value. Paystack and SMTP credentials are optional; leave them blank unless testing those integrations. In PowerShell, use `Copy-Item .env.example .env`.

2. **Build and start the API and database**

   ```bash
   docker compose up --build
   ```

The API is available at <http://localhost:5000>; verify it at <http://localhost:5000/health>. Compose sets the container's MongoDB address to `mongodb://mongodb:27017/credify` and waits for MongoDB to become healthy. Do not change the container database hostname to `localhost`.

The backend image includes `scripts/seed-admin.js`. To create an admin account, set `SEED_ADMIN_EMAIL`, `SEED_ADMIN_PASSWORD`, and optionally `SEED_ADMIN_NAME` in `.env`, then run:

```bash
docker compose exec backend npm run seed-admin
```

The script will not change an existing account unless `SEED_ADMIN_FORCE=true` is explicitly set. The password is read at runtime and is not included in the image. Do not commit `.env` or paste the password into a command that may be saved in shell history.

3. **Stop the services**
   ```bash
   docker compose down
   ```

Use `docker compose down --volumes` only when you also want to delete the local database. Never commit `.env` or use local development values in production.

To run the **full application** with both repositories, follow the [frontend repository's full-stack Docker guide](https://github.com/quarmz77/credence-edgee#full-stack-docker-setup). It clones this backend as a sibling folder named `credify_backend` and starts the frontend, backend, and MongoDB together.

## Environment Variables

For non-containerized backend development, create `.env` from `.env.example` and use `mongodb://127.0.0.1:27017/credify` when MongoDB runs directly on your computer. In Docker, Compose overrides `MONGO_URI` to use its `mongodb` service. Use the checked-in `.env.example` as the source of supported variables; do not copy production credentials into local setup.

**Important Security Notes:**

- Never commit `.env` file to version control
- Change `JWT_SECRET` in production to a strong, random string
- Keep `PAYSTACK_SECRET_KEY` and `PAYSTACK_WEBHOOK_SECRET` confidential
- Use environment-specific values for production deployment

## API Endpoints

### Health & Status

- `GET /` - Welcome message
- `GET /health` - Server health check
- `GET /api/test` - Connection test

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/refresh` - Refresh JWT token
- `POST /api/auth/logout` - User logout

### User Profile

- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile
- `GET /api/profile/:id` - Get specific user profile

### Courses

- `GET /api/courses` - List all courses
- `POST /api/courses` - Create new course (admin)
- `GET /api/courses/:id` - Get course details
- `PUT /api/courses/:id` - Update course (admin)
- `DELETE /api/courses/:id` - Delete course (admin)
- `POST /api/courses/:id/enroll` - Enroll in course

### Certificates

- `GET /api/certificates` - List user certificates
- `GET /api/certificates/:id` - Get certificate details
- `POST /api/certificates` - Create certificate (admin)

### Badges

- `GET /api/badges` - List all badges
- `POST /api/badges` - Create badge (admin)
- `GET /api/badges/:id` - Get badge details

### Payments

- `POST /api/payments` - Initiate payment
- `GET /api/payments/:id` - Get payment status
- `POST /api/payments/webhook` - Handle payment webhooks

### Leaderboard

- `GET /api/leaderboard` - Get leaderboard
- `GET /api/leaderboard/:id` - Get user ranking

### Projects

- `GET /api/projects` - List projects
- `POST /api/projects` - Create project
- `GET /api/projects/:id` - Get project details
- `PUT /api/projects/:id` - Update project

### Submissions

- `POST /api/submissions` - Submit project work
- `GET /api/submissions/:id` - Get submission details
- `PUT /api/submissions/:id/grade` - Grade submission (instructor)

### Ratings

- `POST /api/ratings` - Create/update rating
- `GET /api/ratings/:id` - Get ratings for entity

### Dashboard

- `GET /api/dashboard` - Get user dashboard data
- `GET /api/dashboard/analytics` - Get analytics (admin)

### Admin

- `GET /api/admin/users` - List all users (admin)
- `PUT /api/admin/users/:id` - Update user (admin)
- `DELETE /api/admin/users/:id` - Delete user (admin)

### Company

- `GET /api/company` - Get company info
- `PUT /api/company` - Update company info (admin)
- `GET /api/company/members` - List company members

For detailed API documentation, refer to the [Postman Collection](./postman/).

## Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```bash
Authorization: Bearer <your-jwt-token>
```

### JWT Token Structure

Tokens are issued upon successful login and include:

- User ID
- Email
- Role
- Expiration time (default: 7 days)

## Development Workflow

### Available Scripts

```bash
# Development mode with auto-reload
npm run dev

# Start ngrok tunnel (for webhook testing)
npm run ngrok

# Start production server
npm start

# Run tests (currently not configured)
npm test
```

### Git Workflow

1. Create feature branch: `git checkout -b feature/your-feature`
2. Make changes and commit: `git commit -m "Add your feature"`
3. Push to branch: `git push origin feature/your-feature`
4. Create Pull Request

## Docker Deployment

### Build Docker Image

```bash
docker build -t credify-backend:latest .
```

### Run with Docker Compose

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop services
docker-compose down

# Remove volumes
docker-compose down -v
```

### Docker Compose Services

- **backend**: Express.js API server (port 5000)
- **mongodb**: MongoDB database (port 27017)

## Troubleshooting

### MongoDB Connection Issues

```bash
# Verify MongoDB is running
mongosh --eval "db.adminCommand('ping')"

# Check MongoDB logs
mongod --logpath /var/log/mongod.log
```

### Port Already in Use

```bash
# Find process using port 5000
lsof -i :5000

# Kill the process
kill -9 <PID>
```

### ngrok Issues for Webhooks

```bash
# Test ngrok connection
ngrok http 5000

# Check ngrok auth token
ngrok config check
```

### Environment Variable Issues

- Ensure `.env` file is in the project root
- Verify all required variables are set
- Use `.env.example` as reference

## Documentation

- [API Documentation](./docs/API.md) - Detailed API endpoints
- [Database Schema](./docs/SCHEMA.md) - MongoDB collections and models
- [Deployment Guide](./docs/DEPLOYMENT.md) - Production deployment instructions
- [Payment Integration](./docs/PAYMENTS.md) - Paystack integration guide

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Code Style

- Use 2-space indentation
- Follow Express.js best practices
- Use descriptive variable and function names
- Add comments for complex logic
- Keep functions small and focused

## License

This project is licensed under the ISC License - see the [package.json](./package.json) file for details.

## Bug Reports & Feature Requests

- [Report a Bug](https://github.com/obedyakpa0-dev/Credify-backend/issues/new?labels=bug)
- [Request a Feature](https://github.com/obedyakpa0-dev/Credify-backend/issues/new?labels=enhancement)

## Author

**Obed Yakpa**

- GitHub: [@obedyakpa0-dev](https://github.com/obedyakpa0-dev)
- Repository: [Credify-backend](https://github.com/obedyakpa0-dev/Credify-backend)

## Support

For support, email [your-email] or open an issue on the GitHub repository.

## Acknowledgments

- Express.js team for the excellent web framework
- MongoDB for the powerful database
- Mongoose for elegant MongoDB modeling
- Paystack for seamless payment integration
- All contributors and users of Credify

---

**Last Updated:** June 22, 2026

**Status:** Active Development

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
