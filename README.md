# 🚀 Railway Calendar Scraper

Optimized calendar scraper for flight availability with Railway deployment.

## 📁 Files

- `test-calendar-html.js` - Optimized calendar scraper (headless, fast)
- `railway-calendar-api.js` - Express API server
- `database.js` - Database management (PostgreSQL/SQLite)
- `package.json` - Dependencies and scripts
- `railway.json` - Railway deployment config

## 🚀 Quick Start

```bash
npm install
npm start
```

## 📡 API Endpoints

- `GET /health` - Health check
- `POST /api/calendar/explore` - Start calendar exploration
- `GET /api/calendar/results` - Get latest results
- `GET /api/calendar/explorations` - Get all explorations

## 🗄️ Database

Automatically uses PostgreSQL on Railway, SQLite locally. 