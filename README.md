# Expenses Tracker

**Batch 21CS29 · Personal Finance Management System**

A production-quality full-stack web application for recording income, tracking daily expenses,
managing monthly budgets, analysing spending patterns and generating downloadable financial reports.

---

## 1. Features

| Module | What works |
| --- | --- |
| **Authentication** | Register, login, logout, JWT sessions, bcrypt password hashing, protected routes, profile + password change |
| **Dashboard** | Total balance, income, expenses, monthly savings, income vs expense chart, spending trend, category donut, 14-day activity, recent transactions, budget progress, date filters (Today / Week / Month / Year / Custom / All time) |
| **Transactions** | Add, view details, edit, delete, search, filter (type, category, payment method, date range), sortable columns, pagination, running income/expense/net totals |
| **Categories** | 10 default expense + 6 default income categories seeded per user, custom categories, icon picker (Lucide), colour picker, edit/delete |
| **Budgets** | Overall + per-category monthly budgets, month navigator, spending progress bars, remaining amount, utilisation %, alerts at **75% / 90% / 100%** |
| **Analytics** | Daily / weekly / monthly / yearly analysis, income vs expense, savings overview, category share, highest spending categories, average daily expense, active days, biggest expense day |
| **Reports** | Monthly, yearly and custom period reports; summary, category breakdown, payment-method split, largest expenses; **CSV** (PapaParse) and **PDF** (jsPDF + AutoTable) export |
| **Settings** | Profile name, currency (9 currencies, default **INR ₹**), change password, light/dark theme with persistence, account details |
| **UI/UX** | Navy / white / emerald fintech design, collapsible sidebar, mobile drawer + FAB, soft shadows, rounded cards, smooth transitions, light & dark themes, fully responsive |
| **Motion & scroll** | Native smooth scrolling, scroll-aware sticky header (blur/opacity/shadow), fade-and-rise section reveals, staggered list entrances, subtle hero parallax, animated page transitions, spring modal/confirm transitions, animated progress bars, mobile horizontal snap scrollers for categories |
| **Accessibility** | Keyboard-navigable forms and modals, visible focus states, `prefers-reduced-motion` honoured globally (`MotionConfig` + CSS media query), semantic headings, contrast-checked palette |

Every button, form, chart and CRUD operation is wired to the real MongoDB-backed API — there is no
dummy data and no placeholder screen.

---

## 2. Technology Stack

**Frontend:** React 18 · Vite 6 · Tailwind CSS 3 · React Router 6 · Lucide React · Recharts ·
Axios · React Hook Form · Zod · React Hot Toast · jsPDF · PapaParse

**Backend:** Node.js · Express 4 · MongoDB 8 · Mongoose 8 · JWT (`jsonwebtoken`) · bcryptjs ·
Zod validation · Helmet · CORS · express-rate-limit

> `bcryptjs` is used instead of the native `bcrypt` package: it is a drop-in API-compatible,
> pure-JS implementation, which avoids native build failures on Windows/Node 24 while providing
> the same `genSalt`/`hash`/`compare` semantics.

---

## 3. Prerequisites

* **Node.js** 18+ (tested on Node 24)
* **MongoDB** 6+ running locally or a remote connection string (tested on MongoDB 8.2)

### MongoDB setup

**Option A — local service (Windows)**

```powershell
# MongoDB is already installed and running on this machine (port 27017).
# Verify it is up:
Get-Process mongod
```

If it is not running:

```powershell
& "C:\Program Files\MongoDB\Server\8.2\bin\mongod.exe" --dbpath "C:\data\db" --install
net start MongoDB
```

**Option B — Docker**

```bash
docker run -d --name expenses-mongo -p 27017:27017 mongo:7
```

**Option C — MongoDB Atlas (cloud)**

Create a free cluster and paste the connection string into `backend/.env` as `MONGO_URI`.

No application code changes are required for any option.

---

## 4. Getting started

```bash
# 1. install dependencies
cd backend  && npm install
cd ../frontend && npm install

# 2. configure environment
copy backend\.env.example backend\.env      # then edit JWT_SECRET
copy frontend\.env.example frontend\.env    # optional, dev proxy works out of the box

# 3. start the API (terminal 1)
cd backend && npm start                     # http://localhost:5000

# 4. start the app (terminal 2)
cd frontend && npm run dev                  # http://localhost:5173
```

Open **http://localhost:5173**, create an account and start adding transactions.
Default categories are seeded automatically on registration.

A pre-seeded demo account is available on the dev database:

| Field | Value |
| --- | --- |
| Email | `demo@expenses.app` |
| Password | `Demo@1234` |

It comes with 36 transactions, 6 budgets and 16 categories so every chart, report and
scroll animation has real data to show.

### Environment variables

**`backend/.env`**

| Key | Description | Default |
| --- | --- | --- |
| `PORT` | API port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb://127.0.0.1:27017/expenses_tracker` |
| `JWT_SECRET` | **Change this in production** | dev value |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CLIENT_URL` | Allowed CORS origin(s), comma separated | `http://localhost:5173` |
| `NODE_ENV` | `development` / `production` / `test` | `development` |

**`frontend/.env`**

| Key | Description |
| --- | --- |
| `VITE_API_URL` | Empty = use the Vite dev proxy (`/api` → `localhost:5000`). Set an absolute URL (e.g. `https://api.example.com`) for production deployments where the API is on another origin. |

`.env` files are git-ignored; only `.env.example` files are committed.

---

## 5. Production build

```bash
cd frontend && npm run build     # outputs frontend/dist
cd backend  && npm start
```

Serve `frontend/dist` from any static host (Nginx, Vercel, Netlify) and either proxy `/api` to the
Express server or set `VITE_API_URL` at build time.

---

## 6. Testing

```bash
cd backend && npm test     # 18 integration tests (node:test + real MongoDB test database)

# browser end-to-end tests (requires both servers running)
cd e2e && npm install && npm test
```

The test suite covers registration, login, JWT protection, validation failures, full transaction
CRUD, filtering/search/sort/pagination, category CRUD, budget spent calculation, dashboard
summary/analytics, report generation, cross-user isolation (a second user sees zero records),
password change and 404/400 error handling.

### Browser end-to-end suite (`e2e/ui-e2e.js`)

Drives real Chrome over the DevTools Protocol against the running app — real clicks, real
typing, real API calls — and asserts the rendered UI. It launches its own headless Chrome if
one is not already listening on port `9222`, and cleans up every record it creates.

31 checks: login → dashboard, transaction create / search / detail / edit / delete, budget
create + delete, category create + delete, CSV export (verifies the file lands on disk),
analytics and dashboard rendering, sticky-header blur reacting to scroll, theme toggle and
logout. Any JavaScript error or console warning fails the run.

```bash
cd e2e && npm test           # exits non-zero on any failed check or JS error
CHROME_PATH=... npm test     # override Chrome location if needed
```

**Verification performed for this delivery**

| Check | Result |
| --- | --- |
| `backend: npm test` | 18 / 18 passing |
| `frontend: npm run build` | successful (vendor chunks split: react / charts / forms / pdf) |
| `e2e: npm test` | 31 / 31 passing, 0 JS errors, 0 console warnings |
| Live smoke test through the Vite proxy against a running MongoDB | 35 / 35 passing (auth, transactions, budgets with correct spent %, dashboard, analytics, reports with export rows, categories, profile/password, user isolation, 401/404 handling) |

---

## 7. API reference

All `/api/*` routes except `POST /auth/register`, `POST /auth/login` and `GET /health` require
`Authorization: Bearer <token>`. The `userId` is **always derived from the JWT** — never trusted
from the request body.

### Auth
| Method | Route | Body / notes |
| --- | --- | --- |
| POST | `/api/auth/register` | `name, email, password` → seeds default categories |
| POST | `/api/auth/login` | `email, password` → `{ token, user }` |
| GET | `/api/auth/me` | current user |
| PUT | `/api/auth/profile` | `name?, currency?` |
| PUT | `/api/auth/password` | `currentPassword, newPassword` |

### Transactions
| Method | Route | Notes |
| --- | --- | --- |
| GET | `/api/transactions` | `page, limit, search, type, category, paymentMethod, from, to, sort, order` |
| GET | `/api/transactions/stats` | totals for the same filters |
| GET | `/api/transactions/:id` | single record (owner only) |
| POST | `/api/transactions` | `type, amount, category, date, paymentMethod, description?` |
| PUT | `/api/transactions/:id` | partial update |
| DELETE | `/api/transactions/:id` | delete |

### Budgets
| Method | Route | Notes |
| --- | --- | --- |
| GET | `/api/budgets?month=&year=` | includes `spent`, `remaining`, `percent`, `status` |
| GET | `/api/budgets/overview` | all budgets |
| POST | `/api/budgets` | `category, amount, month, year` (`category: "Overall"` = whole-month budget) |
| PUT | `/api/budgets/:id` | partial update |
| DELETE | `/api/budgets/:id` | delete |

### Categories
`GET /api/categories?type=` · `POST /api/categories` · `PUT /api/categories/:id` · `DELETE /api/categories/:id`
(body: `name, type, icon, color`)

### Dashboard & Reports
| Route | Returns |
| --- | --- |
| `GET /api/dashboard/summary?from=&to=` | totals, current-month figures, recent transactions, budget progress, 14-day activity |
| `GET /api/dashboard/analytics?from=&to=` | monthly/daily/weekly/yearly series, category breakdown, stats |
| `GET /api/reports/summary?from=&to=&include=transactions` | report totals, category & payment breakdowns, daily/monthly series, largest expenses, optional transaction rows for export |

Errors always return `{ success: false, message, details? }` with proper HTTP status codes
(400 validation, 401 auth, 403/404 owner checks, 409 conflicts, 500 unexpected).

---

## 8. Project structure

```
expenses-tracker/
├── backend/
│   ├── config/db.js               # Mongoose connection
│   ├── controllers/               # auth, transaction, budget, category, dashboard, report
│   ├── middleware/                # auth (JWT), error handler, zod validation
│   ├── models/                    # User, Transaction, Budget, Category (+ indexes)
│   ├── routes/                    # express routers
│   ├── utils/                     # ApiError, date helpers, defaults, seeding
│   ├── test/api.test.js           # integration suite
│   └── server.js                  # app entry
├── frontend/
│   └── src/
│       ├── components/            # UI primitives, modals, tables, charts, filters
│       ├── context/               # AuthContext, ThemeContext
│       ├── hooks/                 # useAsync, useCategories, useChartTheme, useDocumentTitle
│       ├── layouts/               # DashboardLayout (sidebar + topbar + mobile drawer)
│       ├── pages/                 # Login, Register, Dashboard, Transactions, Budgets,
│       │                          # Analytics, Reports, Categories, Settings, NotFound
│       ├── services/              # axios instance + typed API modules
│       └── utils/                 # formatting, date presets, icon map
├── .env.example / README.md
```

---

## 9. Security notes

* Passwords hashed with bcrypt (cost factor 10) and never returned by any API.
* JWT verified server-side; user record re-loaded per request; expired/invalid tokens → 401.
* Every query is scoped by `userId` from the token — cross-user access returns 404/empty results.
* Zod validation on every body, query and route parameter.
* `helmet` security headers, CORS restricted to `CLIENT_URL`, rate limiting on auth routes.
* `.env` files are git-ignored; no secrets are committed.
* The session token is stored in `localStorage` (standard SPA pattern). For a higher-security
  deployment, switch the API to httpOnly cookies — the backend already sends JSON responses, so the
  change is isolated to `services/api.js` plus a small Express `cookie` layer.

---

## 10. Known configuration notes

* MongoDB must be running before starting the backend; the server exits with a clear error if it
  cannot connect.
* The API test suite uses its own database (`expenses_tracker_test`) and drops it before/after runs,
  so it never touches development data.
* No demo/seed account is provided — accounts are real and isolated by design.
