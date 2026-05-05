<div align="center">

<br/>

```
██╗   ██╗███╗   ██╗██╗███████╗ █████╗      █████╗ ██████╗ ██╗
██║   ██║████╗  ██║██║██╔════╝██╔══██╗    ██╔══██╗██╔══██╗██║
██║   ██║██╔██╗ ██║██║███████╗███████║    ███████║██████╔╝██║
██║   ██║██║╚██╗██║██║╚════██║██╔══██║    ██╔══██║██╔═══╝ ██║
╚██████╔╝██║ ╚████║██║███████║██║  ██║    ██║  ██║██║     ██║
 ╚═════╝ ╚═╝  ╚═══╝╚═╝╚══════╝╚═╝  ╚═╝   ╚═╝  ╚═╝╚═╝     ╚═╝
```

**Serverless proxy API for Unisa**

[![Vercel](https://img.shields.io/badge/Deployed%20on-Vercel-000000?style=flat-square&logo=vercel)](https://unisa-api.vercel.app/)
[![Node.js](https://img.shields.io/badge/Node.js-Serverless-339933?style=flat-square&logo=node.js)](https://nodejs.org/)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Production-brightgreen?style=flat-square)]()
[![Colombia](https://img.shields.io/badge/Market-Colombia%20🇨🇴-yellow?style=flat-square)]()

<br/>

**[🌐 Live API](https://unisa-api.vercel.app/)** · **[📖 Docs](#-endpoints)** · **[🚀 Deploy](#-deploy)**

<br/>

</div>

---

## 🧠 What is UNISA API?

UNISA API is a **serverless proxy layer** (Backend for Frontend) built with Node.js and deployed on Vercel. It sits between your frontend and the DOMUS backend, acting as a secure, optimized gateway for real estate data in Colombia.

```
   UNISA Frontend         UNISA API              DOMUS Backend
  ┌───────────┐        ┌──────────────┐        ┌─────────────┐
  │  React /  │  HTTP  │  Vercel      │  HTTP  │  Private    │
  │  Next.js  │ ─────▶│  Serverless  │ ──────▶│  DOMUS API  │
  │  Webflow  │        │  Functions   │        │             │
  └───────────┘        └──────────────┘        └─────────────┘
        ▲                     │
        │   Clean JSON resp.  │  🔐 API Key never exposed
        └─────────────────────┘
```

**Why use it?**

- 🔐 **API keys stay server-side** — never exposed to the browser
- ⚡ **Standardized responses** — consistent JSON structure across all endpoints
- 🌎 **Frontend-ready** — plug directly into React, Next.js, Webflow, or any mobile app
- 🧱 **Zero config** — deploy in minutes with Vercel + GitHub

---

## 🚀 Base URL

```
https://unisa-api.vercel.app/
```

---

## 📡 Endpoints

### 🏘️ List Properties

```http
GET /api/properties
```

Returns a paginated list of available properties.

| Query Param | Type     | Default | Description                     |
|-------------|----------|---------|---------------------------------|
| `page`      | `number` | `1`     | Page number                     |
| `perpage`   | `number` | `9`     | Results per page                |
| `*filters`  | `string` | —       | Any additional dynamic filters  |

**Example:**
```
GET /api/properties?page=1&perpage=12&tipo=apartamento
```

---

### 🏠 Property Detail

```http
GET /api/properties?codpro={ID}
```

Returns full details for a single property by its unique ID.

**Example:**
```
GET /api/properties?codpro=9191276
```

---

### 📍 Neighborhoods

```http
GET /api/neighborhoods
```

Returns all available zones and neighborhoods for filtering.

---

### 🏷️ Property Types

```http
GET /api/types
```

Returns all available property categories (apartment, house, office, etc.).

---

## 🔐 Environment Variables

Create a `.env` file at the root or configure these in your Vercel dashboard:

```env
DOMUS_BASE_URL=https://api.domus.la/3.0
DOMUS_API_KEY=your_api_key
INMOBILIARIA=your_inmobiliaria_id
```

> ⚠️ **Never commit your `.env` file.** These variables are injected at runtime by Vercel and never reach the client.

---

## ⚙️ Local Development

**1. Clone the repository**
```bash
git clone https://github.com/FrankzDev/unisa-api.git
cd unisa-api
```

**2. Install dependencies**
```bash
npm install
```

**3. Set up environment variables**
```bash
cp .env.example .env
# Fill in your credentials
```

**4. Start local dev server**
```bash
vercel dev
```

Your API will be available at `http://localhost:3000`.

---

## 🚀 Deploy

This project uses **Vercel's GitHub integration** for continuous deployment. Every push to `main` triggers an automatic production deploy.

```bash
git add .
git commit -m "feat: your feature description"
git push origin main
```

> Vercel handles build, deployment, and SSL automatically.

For first-time setup, install and link the project:
```bash
npm install -g vercel
vercel login
vercel link
vercel env pull   # sync environment variables locally
```

---

## 🧩 Tech Stack

| Layer         | Technology                          |
|---------------|-------------------------------------|
| Runtime       | Node.js (Serverless Functions)      |
| Infrastructure| Vercel Edge Network                 |
| HTTP Client   | Native Fetch API                    |
| Config        | dotenv                              |
| Backend Source| DOMUS API (external)                |
| CI/CD         | GitHub + Vercel Auto Deploy         |

---

## 🛡️ Security Model

```
Client Request
      │
      ▼
┌─────────────────────────────┐
│  UNISA API (Serverless)     │
│  ✅ Validates request       │
│  ✅ Injects API Key         │  ← Key never leaves the server
│  ✅ Forwards to DOMUS       │
│  ✅ Sanitizes response      │
│  ✅ Returns clean JSON      │
└─────────────────────────────┘
      │
      ▼
Client Response (no keys, no internals)
```

- API keys injected server-side via Vercel env vars
- HTTP error handling with structured error responses
- Safe JSON parsing with fallback handling
- Separate dev / production environments

---

## 🌎 Use Cases

UNISA API is optimized for Unisa:

- **Property portals** — rentals and sales listings
- **Mobile apps** — iOS / Android real estate apps
- **Webflow sites** — no-code frontends connected to live data
- **React / Next.js apps** — full-stack property search platforms
- **Advanced search systems** — filtered, paginated property catalogs

---

## 👨‍💻 Author

<div align="center">

**UNISA API** — Backend infrastructure for modern real estate solutions.

Built by **[Frankz](https://www.linkedin.com/in/frankz-alvarz/)** · Developer @ **[Glued](https://getglued.co)**

[![LinkedIn](https://img.shields.io/badge/LinkedIn-Frankz%20Alvarz-0077B5?style=flat-square&logo=linkedin)](https://www.linkedin.com/in/frankz-alvarz/)
[![Glued](https://img.shields.io/badge/Company-getglued.co-FF6B35?style=flat-square&logo=google-chrome)](https://getglued.co)

<br/>

*Crafting scalable infrastructure for the Latin American proptech ecosystem.*

</div>

---

<div align="center">
<sub>🇨🇴 Built for Unisa Colombia · Powered by Glued</sub>
</div>
