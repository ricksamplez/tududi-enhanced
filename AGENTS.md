# AGENTS.md — tududi-enhanced

This file documents how this repo is organized, how to run it locally, and the conventions to follow when making changes. Treat it as the single source of truth for future work.

## Repository overview
- **Monorepo** with a **React + TypeScript frontend** and an **Express + Sequelize backend**.
- Top-level entry points:
  - **Frontend entry**: `frontend/index.tsx` (React app bootstrap).
  - **Frontend shell**: `frontend/App.tsx`, `frontend/Layout.tsx`.
  - **Backend entry**: `backend/app.js` (Express server, routes, auth, middleware, static serving).
- Default ports (dev):
  - **Frontend**: `http://localhost:8080`
  - **Backend/API**: `http://localhost:3002`

## Directory map
- `frontend/` — React + TypeScript app
  - `components/` UI components
  - `contexts/`, `hooks/`, `store/` state management and data flows
  - `styles/` Tailwind + CSS
  - `utils/`, `constants/`, `entities/` shared helpers/types
- `backend/` — Express + Sequelize API
  - `app.js` server bootstrap
  - `modules/` route modules and domain logic (tasks, projects, users, etc.)
  - `models/` Sequelize models
  - `migrations/` database migrations
  - `services/`, `utils/`, `middleware/` shared backend logic
  - `scripts/` database + user management scripts
- `public/` — static assets + `locales/` translations (served in dev)
- `e2e/` — Playwright-based end-to-end tests
- `scripts/` — repo-level dev tooling (e.g., start both servers)

## Development setup
### Prerequisites
- Node.js (v22+ recommended) and npm.

### Install and initialize
```bash
npm install
npm run db:init
```

### Start dev servers
```bash
# Start backend + frontend together
npm start

# Or separately:
npm run backend:dev
npm run frontend:dev
```

`npm start` uses `scripts/start-all-dev.sh`, which starts the backend via `npm run backend:start` and the frontend via `npm run frontend:dev`.

## Backend runtime behavior
### API base paths
`backend/app.js` registers routes at `/api` and (when `API_VERSION` is set) `/api/<version>`. The default version is `v1`.

### Swagger docs
If enabled, docs are served at `/api-docs` and **require authentication**. Toggle via `SWAGGER_ENABLED` (defaults on).

### Static files
- **Development**: backend serves `public/`
- **Production**: backend serves `backend/dist/`

### Database
SQLite is used by default.
- Default DB file: `backend/db/<environment>.sqlite3`
- Override with `DB_FILE`
- Migrations live in `backend/migrations/`

### Scheduler/Telegram
Scheduler and Telegram polling are initialized when the server starts. You can disable them via:
- `DISABLE_SCHEDULER=true`
- `DISABLE_TELEGRAM=true`

## Environment variables
These are sourced in `backend/config/config.js` and startup scripts.

### Core app
- `NODE_ENV` — `development`, `production`, or `test`
- `PORT` — backend port (default: `3002`)
- `HOST` — backend bind host (default `0.0.0.0` in dev, loopback for tests)
- `API_VERSION` — API version string (default: `v1`)
- `FRONTEND_URL` — frontend origin (default: `http://localhost:8080`)
- `BACKEND_URL` — backend origin (default: `http://localhost:3002`)
- `TUDUDI_ALLOWED_ORIGINS` — comma-separated CORS origins
- `TUDUDI_SESSION_SECRET` — session secret
- `TUDUDI_UPLOAD_PATH` — uploads directory

### Default admin user (startup scripts)
- `TUDUDI_USER_EMAIL`
- `TUDUDI_USER_PASSWORD`

### OAuth (Google Calendar)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` (default: `http://localhost:3002/api/calendar/oauth/callback`)

### Email
- `ENABLE_EMAIL` (set to `true` to enable)
- `EMAIL_SMTP_HOST`
- `EMAIL_SMTP_PORT` (default: 587)
- `EMAIL_SMTP_SECURE` (`true`/`false`)
- `EMAIL_SMTP_USERNAME`
- `EMAIL_SMTP_PASSWORD`
- `EMAIL_FROM_ADDRESS`
- `EMAIL_FROM_NAME` (default: `Tududi`)

### Rate limiting
Rate limiting is enabled by default (disabled in `test`).
- `RATE_LIMITING_ENABLED` (`false` to disable)
- `RATE_LIMIT_AUTH_WINDOW_MS`, `RATE_LIMIT_AUTH_MAX`
- `RATE_LIMIT_API_WINDOW_MS`, `RATE_LIMIT_API_MAX`
- `RATE_LIMIT_AUTH_API_WINDOW_MS`, `RATE_LIMIT_AUTH_API_MAX`
- `RATE_LIMIT_CREATE_WINDOW_MS`, `RATE_LIMIT_CREATE_MAX`
- `RATE_LIMIT_API_KEY_WINDOW_MS`, `RATE_LIMIT_API_KEY_MAX`

### Registration tokens
- `REGISTRATION_TOKEN_EXPIRY_HOURS` (default: 24)

## Common scripts (package.json)
### Start & build
- `npm start` — start backend + frontend (dev)
- `npm run frontend:dev` — webpack dev server
- `npm run backend:dev` — nodemon backend (development)
- `npm run frontend:build` — build frontend bundle

### Linting/formatting
- `npm run lint` / `npm run lint:fix`
- `npm run format` / `npm run format:fix`

### Tests
- `npm test` / `npm run test:backend`
- `npm run frontend:test`
- `npm run test:ui` (E2E)

### Database
- `npm run db:init`
- `npm run db:migrate`
- `npm run db:seed`
- `npm run db:reset`
- `npm run user:create`
- `npm run migration:create`

## Coding conventions
- **Frontend**: TypeScript + React functional components with hooks.
- **Backend**: async/await (no callbacks), Sequelize models, RESTful routes.
- **Formatting**: use ESLint + Prettier (scripts above).
- **Security**: do not commit secrets. Validate inputs at the API layer.
- **Imports**: never wrap imports in try/catch.

## Testing guidance
- Backend unit/integration tests live in `backend/tests/`.
- Frontend tests live in `frontend/__tests__/` or alongside components.
- E2E tests are in `e2e/` and run via `e2e/bin/run-e2e.sh`.

## Notes for future changes
- Keep API routes modular by adding new modules in `backend/modules/`.
- For database schema changes, add a migration and update the Sequelize models.
- If you add/modify UI strings, update translations in `public/locales/`.
- When changing API responses, confirm frontend consumers in `frontend/services/` or hooks.
