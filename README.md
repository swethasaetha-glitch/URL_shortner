# ⚡ LinkPulse AI

> **Shorten Links. Track Performance. Grow Smarter.**

A full-stack URL shortener with real-time analytics, built as a production-ready SaaS. Features a dark glassmorphism UI, JWT authentication, and Recharts-powered dashboards.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, Vite, Tailwind CSS, Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| Backend | Node.js, Express.js |
| Database | MongoDB Atlas + Mongoose |
| Auth | JWT + bcryptjs |
| UA Parsing | ua-parser-js |

---

## Features

- **URL Shortening** — instant short codes, custom aliases, expiry dates
- **Analytics** — clicks, devices, browsers, OS, countries tracked per link
- **Dashboard** — stat cards, searchable URL table, per-link analytics pages
- **Charts** — 30-day area trend, device pie, browser pie, country bar chart
- **Auth** — signup/login with JWT, bcrypt-hashed passwords, session persistence
- **Security** — rate limiting, input validation, CORS restricted to frontend origin

---

## Architecture

```mermaid
graph TD
    subgraph Frontend ["Frontend (React + Vite — port 5173)"]
        A[Landing Page] --> B[Auth Pages]
        B --> C[Dashboard]
        C --> D[Analytics Page]
    end

    subgraph Backend ["Backend (Node + Express — port 5000)"]
        E[Auth Routes] --> F[JWT Middleware]
        G[URL Routes] --> F
        H[Analytics Routes] --> F
        I[Redirect Controller]
    end

    subgraph Database ["MongoDB Atlas"]
        J[(Users)]
        K[(URLs)]
        L[(Visits)]
    end

    C -->|REST API| G
    D -->|REST API| H
    B -->|REST API| E
    F --> J
    G --> K
    H --> L
    I --> K
    I --> L
```

---

## Database Schema

### Users
```js
{
  name:      String,   // display name
  email:     String,   // unique, indexed
  password:  String,   // bcrypt hashed (12 rounds)
  createdAt: Date
}
```

### URLs
```js
{
  userId:      ObjectId,                          // ref: User
  originalUrl: String,
  shortCode:   String,                            // unique 7-char nanoid
  customAlias: String,                            // optional
  title:       String,                            // optional label
  clicks:      Number,                            // incremented on redirect
  expiryDate:  Date,                              // null = never expires
  status:      'active' | 'expired' | 'disabled',
  createdAt:   Date
}
```

### Visits
```js
{
  urlId:     ObjectId,                        // ref: URL, indexed
  timestamp: Date,                            // indexed
  browser:   String,
  os:        String,
  device:    'Desktop' | 'Mobile' | 'Tablet' | 'Unknown',
  country:   String,
  city:      String,
  referrer:  String,
  ip:        String
}
```

---

## API Reference

### Auth
| Method | Endpoint | Auth | Body | Description |
|--------|----------|:----:|------|-------------|
| POST | `/api/auth/signup` | — | `{ name, email, password }` | Create account |
| POST | `/api/auth/login` | — | `{ email, password }` | Sign in, returns JWT |
| GET | `/api/auth/me` | ✓ | — | Get current user |

### URLs
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/urls` | ✓ | List user's URLs (paginated, searchable) |
| POST | `/api/urls` | ✓ | Create short URL |
| PUT | `/api/urls/:id` | ✓ | Update title, expiry, or status |
| DELETE | `/api/urls/:id` | ✓ | Delete URL and all visit records |
| GET | `/api/urls/stats` | ✓ | Dashboard stat totals |

### Analytics
| Method | Endpoint | Auth | Description |
|--------|----------|:----:|-------------|
| GET | `/api/analytics/overview` | ✓ | 30-day click totals across all links |
| GET | `/api/analytics/:urlId` | ✓ | Full breakdown for a single URL |

### Redirects
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/:shortCode` | Redirect to original URL and record visit |

---

## Project Structure

```
linkpulse/
├── backend/
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── urlController.js
│   │   ├── analyticsController.js
│   │   └── redirectController.js
│   ├── models/
│   │   ├── User.js
│   │   ├── URL.js
│   │   └── Visit.js
│   ├── routes/
│   │   ├── auth.js
│   │   ├── urls.js
│   │   └── analytics.js
│   ├── middleware/
│   │   └── auth.js
│   ├── server.js
│   └── .env.example
│
└── frontend/
    ├── src/
    │   ├── components/ui/
    │   │   ├── CreateUrlModal.jsx
    │   │   ├── UrlTableRow.jsx
    │   │   └── LoadingSpinner.jsx
    │   ├── contexts/
    │   │   └── AuthContext.jsx
    │   ├── layouts/
    │   │   └── DashboardLayout.jsx
    │   ├── pages/
    │   │   ├── LandingPage.jsx
    │   │   ├── LoginPage.jsx
    │   │   ├── SignupPage.jsx
    │   │   ├── DashboardPage.jsx
    │   │   └── AnalyticsPage.jsx
    │   ├── services/
    │   │   └── api.js
    │   ├── App.jsx
    │   ├── main.jsx
    │   └── index.css
    ├── index.html
    ├── vite.config.js
    └── tailwind.config.js
```

---

## Environment Variables

### `backend/.env`
```env
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/linkpulse
JWT_SECRET=replace_with_a_long_random_secret
PORT=5000
CLIENT_URL=http://localhost:5173
BASE_URL=http://localhost:5000
```

### `frontend/.env`
```env
VITE_API_URL=http://localhost:5000/api
VITE_BASE_URL=http://localhost:5000
```

---

## Local Setup

**Prerequisites:** Node.js ≥ 18, a MongoDB Atlas cluster (free tier is fine)

```bash
# 1. Clone
git clone https://github.com/yourname/linkpulse-ai.git
cd linkpulse-ai

# 2. Backend
cd backend
npm install
cp .env.example .env     # fill in MONGO_URI and JWT_SECRET
npm run dev              # runs on http://localhost:5000

# 3. Frontend (new terminal)
cd frontend
npm install
cp .env.example .env     # VITE_API_URL=http://localhost:5000/api
npm run dev              # runs on http://localhost:5173
```

---

## Deployment

### Backend → Render
1. Push the `backend/` folder to GitHub
2. Create a **Web Service** on [Render](https://render.com)
3. Set **Root Directory** to `backend`
4. Build command: `npm install` · Start command: `node server.js`
5. Add all environment variables from `.env`

### Frontend → Vercel
1. Push the `frontend/` folder to GitHub
2. Import the project on [Vercel](https://vercel.com)
3. Set **Root Directory** to `frontend`
4. Add environment variables pointing to your Render service URL

---

## License

MIT © 2025 LinkPulse AI
