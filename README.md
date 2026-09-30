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
   - **Live SRM Portal Login**: Local proxy handles captcha relay and session cookies.
   - **Direct HTML / Table Paste**: Copy the table from your browser and paste it directly.
   - **Demo Profile**: Preloaded with authentic SRM courses (DSA, OS, DBMS, Mathematics, Labs) for instant demonstration.

5. **Target Customizer**:
   - Dynamically adjust target thresholds between **75%** (SRM minimum criteria), **80%**, **85%**, or **90%** (Distinction).

6. **Ultra-Modern Glassmorphic UI**:
   - Obsidian dark theme with neon cyan & amber accents, ambient glow orbs, circular SVG progress meters, card & table view toggle, real-time course search, and filter pills.

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

## 🔍 How to Find Your SRM Portal Network & Fetching Details

When logging into your student portal (e.g. `academia.srmist.edu.in` or `evarsity.srmist.edu.in`), here is how to capture the exact fetching details:

### Step 1: Open Developer Tools
1. In Google Chrome or Microsoft Edge, open the SRM student portal.
2. Press `F12` (or right-click anywhere and click **Inspect**).
3. Switch to the **Network** tab at the top.
4. Check the **Preserve log** checkbox.

### Step 2: Capture Login & Captcha Details
1. Type your Net ID, Password, and Captcha, then click **Login**.
2. In the Network tab filter box, type `fetch` or `xhr`, or look for the login request (often named `liveauth.php`, `signin.ac`, or `login`).
3. Click on the request and check:
   - **Request URL**: The full URL (e.g., `https://academia.srmist.edu.in/...`)
   - **Request Method**: `POST`
   - **Payload / Form Data**: Look at the keys (e.g. `txtusername`, `txtpassword`, `captcha`).
   - **Captcha URL**: In the Elements or Network tab, find the image URL for the captcha image (e.g., `/captcha` or `/login/captcha.do`).

### Step 3: Capture Attendance Page Details
1. Once logged in, click on the **Attendance** navigation menu item.
2. In the Network tab, look for the request that loads the attendance table or JSON data.
3. Right-click that request:
   - Click **Copy** -> **Copy as cURL (bash)** or **Copy response**.
   - Alternatively, right click on the attendance page -> **View Page Source**, find the `<table>...</table>` containing your courses, and copy it!
