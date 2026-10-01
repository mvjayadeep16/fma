# ⚡ FlashMan — SRM Academic Margin & Attendance Engine

A modern, high-aesthetic attendance dashboard and bunk margin calculator engineered specifically for **SRM University (SRMIST)** students.

![FlashMan Logo](public/assets/flashman_logo.png)

---

## 🌟 Key Features

1. **Exact Bunk Margin Calculation ($\ge 75\%$)**:
   - Calculates the exact number of future classes you can safely miss while keeping your attendance at or above 75%.
   - Formula: $\lfloor \frac{4 \times \text{Attended} - 3 \times \text{Conducted}}{3} \rfloor$

2. **Shortage Recovery Target ($< 75\%$)**:
   - If your attendance drops below 75%, FlashMan calculates the exact number of consecutive upcoming classes you must attend to cross back into the safe zone.
   - Formula: $\lceil 3 \times \text{Conducted} - 4 \times \text{Attended} \rceil$

3. **Interactive "What-If" Bunk Simulator**:
   - Test out upcoming weeks or leaves with real-time sliders before taking a single absence.
   - See projected percentages, margin delta, and safety warnings instantly.

4. **Multiple Ingestion Methods**:
   - **Live SRM Portal Login**: Proxy handles captcha relay and session cookies.
   - **Session Cookie Sync**: Paste your `JSESSIONID` directly from a logged-in tab.
   - **Direct HTML / Table Paste**: Copy the table from your browser and paste it directly.
   - **Demo Profile**: Preloaded with authentic SRM courses (DSA, OS, DBMS, Mathematics, Labs) for instant demonstration.

5. **Target Customizer**:
   - Dynamically adjust target thresholds between **75%** (SRM minimum criteria), **80%**, **85%**, or **90%** (Distinction).

6. **Ultra-Modern Glassmorphic UI**:
   - Obsidian dark theme with neon cyan & amber accents, ambient glow orbs, circular SVG progress meters, card & table view toggle, real-time course search, and filter pills.

---

## ⚠️ Important Note on Cloud Hosting & Live SRM Login

> [!NOTE]
> The live SRM Student Portal (`sp.srmist.edu.in`) employs firewall protections and IP blocking that frequently reject or time out requests coming from cloud/datacenter IP ranges (such as AWS, Vercel, Render, or DigitalOcean).
> 
> **Recommended Fallbacks on Cloud Deployments:**
> - **Import / Paste HTML**: In your SRM portal tab, press `Ctrl+U` (or right-click table -> Inspect), copy the `<table>...</table>`, and paste it into FlashMan's **Import** modal.
> - **Session Cookie Sync**: Copy the `JSESSIONID` cookie from your logged-in browser session and sync instantly.
> - **Demo Mode**: Test all analytics, margin formulas, and simulators using the built-in SRM Demo Profile.

---

## 🚀 Running FlashMan Locally

```bash
# 1. Install dependencies
npm install

# 2. Start the local server
npm start
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 🌐 Deploying to Vercel

FlashMan is configured out-of-the-box for serverless deployment on **Vercel** with stateless session support and optimized timeouts.

1. Install the Vercel CLI (or connect your GitHub repository to [Vercel Dashboard](https://vercel.com)):
   ```bash
   npm i -g vercel
   ```
2. Deploy directly from the project directory:
   ```bash
   vercel
   ```
3. For production deployment:
   ```bash
   vercel --prod
   ```

**Configuration Details (`vercel.json`)**:
- Uses modern `rewrites` to route `/api/(.*)` to `/api/index.js`.
- Configures serverless functions with `maxDuration: 30` (maximum supported on the Free Hobby plan).
- Deploys to the `bom1` (Mumbai, India) region for lowest latency to SRM servers.

---

## ☁️ Deploying to Render

FlashMan includes a `render.yaml` Blueprint for 1-click deployment on **Render's Free Web Service**:

1. Push this repository to GitHub or GitLab.
2. In the [Render Dashboard](https://dashboard.render.com/), click **New** &rarr; **Blueprint** (or **Web Service**).
3. Connect your repository. Render will automatically detect `render.yaml` with:
   - **Environment**: Node
   - **Plan**: Free
   - **Region**: Singapore (`singapore`)
   - **Health Check Path**: `/api/health`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

---

## 🩺 Diagnostics API (`/api/health`)

FlashMan includes a diagnostic health check endpoint at `/api/health` to test connectivity between the server and the SRM portal:

```bash
curl https://your-deployed-domain.com/api/health
```

Example response:
```json
{
  "success": true,
  "status": "ok",
  "portal": {
    "url": "https://sp.srmist.edu.in/srmiststudentportal/",
    "httpStatus": 200,
    "responseTimeMs": 312,
    "captchaFound": true,
    "accessible": true
  },
  "serverTime": "2026-10-01T14:30:00.000Z"
}
```
