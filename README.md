# WealthTrack — Personal Finance Tracker

Auto-fetches stock closing prices daily after 3:30 PM IST via serverless backend.

## Why This Works
The `api/prices.js` and `api/rate.js` files run as **Vercel serverless functions** (Node.js on a server).
Server-side requests to Yahoo Finance have no CORS restrictions — unlike browser-based apps.

## Deploy in 10 Minutes (Free)

### Step 1 — Create GitHub Account
Go to https://github.com → Sign up (free, use Google)

### Step 2 — Create a New Repository
1. Click the **+** button (top right) → **New repository**
2. Name: `wealthtrack`
3. Set to **Private**
4. Click **Create repository**

### Step 3 — Upload Files
1. Click **uploading an existing file** (link on the new repo page)
2. Drag and drop ALL files from this zip:
   - `api/prices.js`
   - `api/rate.js`
   - `public/index.html`
   - `vercel.json`
   - `package.json`
   - `.gitignore`
3. Click **Commit changes**

### Step 4 — Deploy on Vercel
1. Go to https://vercel.com → **Sign up with GitHub** (free)
2. Click **Add New Project**
3. Select your `wealthtrack` repository
4. Click **Deploy** (no settings to change)
5. Wait ~1 minute → Done!

### Step 5 — Get Your URL
Vercel gives you a URL like: `https://wealthtrack-yourname.vercel.app`

Bookmark it. Open it on your phone. It works like an app.

---

## How Prices Update
- **USD/INR rate**: Fetched every day automatically on app open
- **Stock prices**: Fetched every weekday after 3:30 PM IST (NSE official close)
  - Indian stocks → today's closing price from NSE
  - US stocks → previous day's closing price (US market not yet open at 3:30 PM IST)
- Just open the app after 3:30 PM IST — prices update automatically

## Symbol Format
When adding a stock, enter the ticker symbol:
- Indian NSE stocks: `RELIANCE`, `BSE`, `HDFCBANK`, `INFY`, `TCS`
  (The app automatically adds `.NS` for Yahoo Finance lookup)
- US stocks: `AAPL`, `TSLA`, `NVDA`, `MSFT`

## Transfer Data from Claude Artifact
1. In the old artifact → Settings → Export Backup → download the JSON file
2. In this new app → Settings → Import Backup → select the JSON file
All your data transfers over instantly.

## Files
```
api/prices.js    — Serverless: fetches stock prices from Yahoo Finance
api/rate.js      — Serverless: fetches USD/INR from free currency APIs
public/index.html — Complete app (same design, all features)
vercel.json      — Tells Vercel how to serve the app
package.json     — Node.js config
```
