const express = require('express');
const cors = require('cors');
const path = require('path');
const https = require('https');
const axios = require('axios');
const cheerio = require('cheerio');

const httpsAgent = new https.Agent({ keepAlive: true, rejectUnauthorized: false });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Immutable Portal Configuration Constants
const PORTAL_CONFIG = Object.freeze({
  baseUrl: 'https://sp.srmist.edu.in',
  portalHomeUrl: 'https://sp.srmist.edu.in/srmiststudentportal/',
  loginUrl: 'https://sp.srmist.edu.in/srmiststudentportal/LoginServlet',
  attendanceUrl: 'https://sp.srmist.edu.in/srmiststudentportal/students/report/studentAttendanceDetails.jsp',
  innerAttendanceUrl: 'https://sp.srmist.edu.in/srmiststudentportal/students/report/studentAttendanceDetailsInner.jsp',
  profileUrl: 'https://sp.srmist.edu.in/srmiststudentportal/students/report/studentProfile.jsp',
  expectedHost: 'sp.srmist.edu.in'
});

// In-memory active user sessions cache (speed-up for single-instance, with stateless fallback)
// NOTE: On Vercel serverless, this Map is per-invocation and NOT shared across requests.
// All session state MUST be reconstructible from the base64url sessionId token alone.
const userSessions = new Map();

// Session clean-up interval (TTL: 1 hour) — only meaningful for long-running local server
if (!process.env.VERCEL) {
  setInterval(() => {
    const now = Date.now();
    for (const [id, session] of userSessions.entries()) {
      if (now - session.lastActive > 3600000) {
        userSessions.delete(id);
      }
    }
  }, 300000);
}

/**
 * Attendance Mathematics:
 * - Target threshold R (default 0.75 for 75%)
 * - If attended / conducted >= R:
 *     Margin m = floor( (attended / R) - conducted )
 * - If attended / conducted < R:
 *     Required k = ceil( (R * conducted - attended) / (1 - R) )
 */
function calculateAttendanceMetrics(attended, conducted, targetPercent = 75) {
  const p = Math.max(0, Number(attended) || 0);
  const t = Math.max(0, Number(conducted) || 0);
  const absent = Math.max(0, t - p);
  const targetRatio = targetPercent / 100;
  const currentPercentage = t > 0 ? Number(((p / t) * 100).toFixed(2)) : 0;

  let margin = 0;
  let required = 0;
  let status = 'safe';

  if (currentPercentage >= targetPercent) {
    margin = Math.max(0, Math.floor((p / targetRatio) - t));
    status = currentPercentage < targetPercent + 5 ? 'warning' : 'safe';
  } else {
    required = Math.max(0, Math.ceil((targetRatio * t - p) / (1 - targetRatio)));
    status = 'critical';
  }

  return {
    conducted: t,
    attended: p,
    absent,
    percentage: currentPercentage,
    targetPercent,
    margin,
    required,
    status
  };
}

// Generate Exact Minified Telemetry Payload required by sp.srmist.edu.in secure2.js
function generateTelemetryPayload(startTime) {
  const now = Date.now();
  const timeOnPage = Math.max(3000, now - startTime);
  const clicks = Math.floor(Math.random() * 4) + 2;
  const moves = Math.floor(Math.random() * 25) + 12;
  const keys = Math.floor(Math.random() * 10) + 8;

  // SRM secure2.js expects minified keys:
  // E: currentDomain, D: timezoneOffset, C: screenWidth, B: screenHeight,
  // z: mouseClicks, y: mouseMovements, x: keystrokeCount, w: typingSpeedMs,
  // v: touchSupport, u: canvasHash
  const telemetry = {
    E: PORTAL_CONFIG.expectedHost,
    D: -330, // Indian Standard Time (IST) offset
    C: 1920,
    B: 1080,
    z: clicks,
    y: moves,
    x: keys,
    w: Math.max(500, Math.floor(timeOnPage * 0.4)),
    v: false,
    u: '5801b41c'
  };

  const jsonStr = JSON.stringify(telemetry);
  return Buffer.from(jsonStr).toString('base64');
}

// SRM Demo Student Profile
const mockStudentData = {
  student: {
    name: 'Demo Student',
    regNo: 'RA0000000000000',
    studentId: '100001',
    email: 'demo@example.com',
    program: 'B.Tech.-Computer Science and Engineering with specialization in Artificial Intelligence and Machine Learning[UG - FT - ACADEMIC]',
    semester: 'Semester 3',
    batch: '1',
    section: 'Y1',
    academicYear: '2025 - 2026',
    department: 'School of Computing',
    institution: 'Faculty of Engineering and Technology, Kattankulathur',
    campus: 'KTR Main Campus, SRMIST',
    advisor: 'Faculty Advisor [advisor@example.com]'
  },
  courses: [
    {
      code: '21CSC201J',
      title: 'Data Structures and Algorithms',
      faculty: 'Dr. Faculty (Computing)',
      type: 'Integrated (Theory + Lab)',
      slot: 'A1 + AL1',
      conducted: 36,
      attended: 32,
      absent: 4
    },
    {
      code: '21CSC202J',
      title: 'Operating Systems',
      faculty: 'Dr. Faculty (Systems)',
      type: 'Integrated',
      slot: 'B1 + BL1',
      conducted: 34,
      attended: 28,
      absent: 6
    },
    {
      code: '21CSC204J',
      title: 'Database Management Systems',
      faculty: 'Prof. Faculty (Data)',
      type: 'Integrated',
      slot: 'C1 + CL1',
      conducted: 32,
      attended: 29,
      absent: 3
    },
    {
      code: '21MAT102J',
      title: 'Probability & Queuing Theory',
      faculty: 'Dr. Faculty (Mathematics)',
      type: 'Theory',
      slot: 'D1',
      conducted: 30,
      attended: 21,
      absent: 9
    },
    {
      code: '21CSE301T',
      title: 'Design and Analysis of Algorithms',
      faculty: 'Dr. Faculty (Algorithms)',
      type: 'Theory',
      slot: 'E1',
      conducted: 28,
      attended: 22,
      absent: 6
    },
    {
      code: '21CSS201J',
      title: 'Full Stack Web Development Lab',
      faculty: 'Prof. Faculty (Web)',
      type: 'Practical / Lab',
      slot: 'P1',
      conducted: 28,
      attended: 26,
      absent: 2
    },
    {
      code: '21PDM101L',
      title: 'Professional Communication & Soft Skills',
      faculty: 'Dr. Faculty (Humanities)',
      type: 'Theory',
      slot: 'F1',
      conducted: 30,
      attended: 24,
      absent: 6
    }
  ]
};

// CookieJar to maintain precise, non-duplicating cookies by name across requests
class CookieJar {
  constructor() {
    this.cookies = new Map();
  }

  setFromHeaders(headers) {
    if (!headers) return;
    const raw = headers['set-cookie'] || [];
    raw.forEach(header => {
      const firstPart = header.split(';')[0];
      const eqIdx = firstPart.indexOf('=');
      if (eqIdx !== -1) {
        const name = firstPart.substring(0, eqIdx).trim();
        const value = firstPart.substring(eqIdx + 1).trim();
        this.cookies.set(name, value);
      }
    });
  }

  setCookie(name, value) {
    this.cookies.set(name, value);
  }

  getCookieHeader() {
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  get(name) {
    return this.cookies.get(name);
  }

  toJSON() {
    return Array.from(this.cookies.entries());
  }

  static fromJSON(entries) {
    const jar = new CookieJar();
    if (Array.isArray(entries)) {
      entries.forEach(([k, v]) => jar.cookies.set(k, v));
    }
    return jar;
  }
}

// Stateless Session Helpers
function encodeSessionId(cookieJar, tokens = {}) {
  const payload = {
    cookies: cookieJar ? cookieJar.toJSON() : [],
    tokens: tokens || {},
    time: Date.now()
  };
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function decodeSession(sessionId) {
  if (!sessionId || typeof sessionId !== 'string') return null;

  // On Vercel, always decode from token first (Map is empty per cold-start instance)
  // Try base64url first, then plain base64 as fallback
  const decoders = ['base64url', 'base64'];
  for (const encoding of decoders) {
    try {
      const raw = Buffer.from(sessionId, encoding).toString('utf8');
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.cookies)) {
        const restored = {
          cookieJar: CookieJar.fromJSON(parsed.cookies),
          tokens: parsed.tokens || {},
          lastActive: parsed.time || Date.now()
        };
        // Cache in Map for same-invocation reuse
        userSessions.set(sessionId, restored);
        return restored;
      }
    } catch (e) {
      // Try next encoding
    }
  }

  // Final fallback: check in-memory Map (works locally or within same invocation)
  const cached = userSessions.get(sessionId);
  if (cached && cached.cookieJar) return cached;

  return null;
}

// Express Router to handle API routes cleanly under both /api and /
const apiRouter = express.Router();

// 1. Get Portal Configuration (Read-only, non-sensitive)
apiRouter.get('/config', (req, res) => {
  res.json({
    success: true,
    config: {
      baseUrl: PORTAL_CONFIG.baseUrl,
      loginUrl: PORTAL_CONFIG.loginUrl,
      attendanceUrl: PORTAL_CONFIG.attendanceUrl,
      innerAttendanceUrl: PORTAL_CONFIG.innerAttendanceUrl
    }
  });
});

// 2. Health & Diagnostics Route
apiRouter.get('/health', async (req, res) => {
  const startTime = Date.now();
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  try {
    const portalRes = await axios.get(PORTAL_CONFIG.portalHomeUrl, {
      httpsAgent,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      timeout: 10000,
      validateStatus: () => true
    });

    const responseTimeMs = Date.now() - startTime;
    const bodyStr = String(portalRes.data || '');
    const $ = cheerio.load(bodyStr);
    const captchaImg = $('img#secure_captcha, img.captcha-img, img[src*="captcha"], img[data-src*="captcha"]');
    const captchaFound = captchaImg.length > 0 || bodyStr.includes('secure_captcha') || bodyStr.includes('cptoken');

    return res.json({
      success: true,
      status: 'ok',
      portal: {
        url: PORTAL_CONFIG.portalHomeUrl,
        httpStatus: portalRes.status,
        responseTimeMs,
        captchaFound,
        accessible: portalRes.status === 200 && captchaFound
      },
      serverTime: new Date().toISOString()
    });
  } catch (err) {
    const responseTimeMs = Date.now() - startTime;
    return res.json({
      success: false,
      status: 'error',
      portal: {
        url: PORTAL_CONFIG.portalHomeUrl,
        httpStatus: err.response ? err.response.status : null,
        responseTimeMs,
        captchaFound: false,
        accessible: false,
        error: err.message
      },
      message: 'The SRM portal blocked or did not respond to this server. Use the Paste HTML or Session Cookie option instead.',
      serverTime: new Date().toISOString()
    });
  }
});

// 3. Fetch Live Captcha & Initialize Portal Session from sp.srmist.edu.in
apiRouter.get('/captcha', async (req, res) => {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  try {
    const cookieJar = new CookieJar();

    // Request portal login page to get initial cookies and tokens
    const initRes = await axios.get(PORTAL_CONFIG.portalHomeUrl, {
      httpsAgent,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      timeout: 25000,
      validateStatus: () => true
    });

    if (initRes.status === 403 || String(initRes.data).includes('Access denied')) {
      return res.status(403).json({
        success: false,
        error: 'The SRM portal blocked or did not respond to this server. Use the Paste HTML or Session Cookie option instead.',
        message: 'The SRM portal blocked or did not respond to this server. Use the Paste HTML or Session Cookie option instead.'
      });
    }

    cookieJar.setFromHeaders(initRes.headers);
    const $ = cheerio.load(initRes.data);

    // Extract dynamic hidden input fields
    const hiddenInputs = {};
    $('form#login_form input[type="hidden"], form#login_form input[id="challengeId"], form#login_form input[id="fpNonce"], form#login_form input[id="dname"]').each((_, inp) => {
      const name = $(inp).attr('name') || $(inp).attr('id');
      const val = $(inp).val() || '';
      if (name) hiddenInputs[name] = val;
    });

    // Extract dynamic security configuration
    const tokens = {
      startTime: Date.now(),
      nonce: '',
      captchaText: '',
      domainFieldName: 'dtoken_31171d',
      captchaFieldName: 'cptoken_266c98',
      randomDelimiter: 'fcf3',
      honeypotName: '',
      hiddenInputs,
      captchaDataSrc: $('img#secure_captcha').attr('data-src') || ''
    };

    $('input').each((_, inp) => {
      const name = $(inp).attr('name');
      if (name && name.startsWith('ph_')) {
        tokens.honeypotName = name;
      }
    });

    $('script').each((_, scr) => {
      const txt = $(scr).html() || '';
      if (txt.includes('SECURE_CONFIG')) {
        const matchNonce = txt.match(/nonce\s*[=:]\s*'([^']+)'/i);
        if (matchNonce) tokens.nonce = matchNonce[1];

        const matchDomainField = txt.match(/domainFieldName\s*[=:]\s*'([^']+)'/i);
        if (matchDomainField) tokens.domainFieldName = matchDomainField[1];

        const matchCaptchaField = txt.match(/captchaFieldName\s*[=:]\s*'([^']+)'/i);
        if (matchCaptchaField) tokens.captchaFieldName = matchCaptchaField[1];

        const matchDelimiter = txt.match(/randomDelimiter\s*[=:]\s*'([^']+)'/i);
        if (matchDelimiter) tokens.randomDelimiter = matchDelimiter[1];

        const matchCaptchaText = txt.match(/captchaText\s*[=:]\s*'([^']+)'/i);
        if (matchCaptchaText) tokens.captchaText = matchCaptchaText[1];
      }
    });

    let captchaDataUrl = '';
    if (tokens.captchaDataSrc) {
      const captchaUrl = new URL(tokens.captchaDataSrc, PORTAL_CONFIG.baseUrl).href;
      const domainProof = Buffer.from(`${tokens.nonce}:${PORTAL_CONFIG.expectedHost}`).toString('base64');

      const imgRes = await axios.get(captchaUrl, {
        httpsAgent,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': userAgent,
          'Referer': PORTAL_CONFIG.portalHomeUrl,
          'Cookie': cookieJar.getCookieHeader(),
          'X-Domain-Proof': domainProof,
          'Accept': 'image/png, image/jpeg, image/svg+xml, image/*;q=0.9'
        },
        timeout: 15000,
        validateStatus: () => true
      });

      if (imgRes.status === 200) {
        cookieJar.setFromHeaders(imgRes.headers);
        const base64Img = Buffer.from(imgRes.data).toString('base64');
        const contentType = imgRes.headers['content-type'] || 'image/png';
        captchaDataUrl = `data:${contentType};base64,${base64Img}`;
      }
    }

    const statelessSessionId = encodeSessionId(cookieJar, tokens);
    userSessions.set(statelessSessionId, {
      cookieJar,
      tokens,
      lastActive: Date.now()
    });

    return res.json({
      success: true,
      sessionId: statelessSessionId,
      captchaDataUrl,
      tokens: {
        domainFieldName: tokens.domainFieldName,
        captchaFieldName: tokens.captchaFieldName,
        honeypotName: tokens.honeypotName
      }
    });
  } catch (err) {
    return res.json({
      success: false,
      error: 'The SRM portal blocked or did not respond to this server. Use the Paste HTML or Session Cookie option instead.',
      message: 'Could not fetch CAPTCHA from sp.srmist.edu.in. Use Demo Mode or Paste HTML / Session Cookie.'
    });
  }
});

// 4. Authenticate with SRM Portal LoginServlet
apiRouter.post('/login', async (req, res) => {
  const { sessionId, netId, password, captcha, sessionCookie, targetPercent = 75 } = req.body;

  // Demo mode
  if (netId && (netId.toLowerCase() === 'demo' || (password && password.toLowerCase() === 'demo'))) {
    const data = recalculateMockData(targetPercent);
    const demoSessionId = encodeSessionId(new CookieJar(), {});
    return res.json({
      success: true,
      isDemo: true,
      message: 'SRM Demo Profile loaded successfully!',
      sessionId: demoSessionId,
      data
    });
  }

  // Session Cookie sync
  if (sessionCookie && sessionCookie.trim()) {
    try {
      const attendanceData = await fetchAttendanceWithCookie(sessionCookie.trim(), targetPercent);
      const jar = new CookieJar();
      const rawCookie = sessionCookie.trim();
      const cName = rawCookie.includes('=') ? rawCookie.split('=')[0].trim() : 'JSESSIONID';
      const cVal = rawCookie.includes('=') ? rawCookie.split('=').slice(1).join('=').trim() : rawCookie;
      jar.setCookie(cName, cVal);

      const cookieSessionId = encodeSessionId(jar);
      userSessions.set(cookieSessionId, { cookieJar: jar, tokens: {}, lastActive: Date.now() });

      return res.json({
        success: true,
        isDemo: false,
        message: 'Successfully fetched attendance using session cookie!',
        sessionId: cookieSessionId,
        data: attendanceData
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message || 'Failed to fetch attendance with provided session cookie.',
        message: 'The SRM portal blocked or did not respond to this server. Use the Paste HTML or Session Cookie option instead.'
      });
    }
  }

  if (!netId || !password) {
    return res.status(400).json({ success: false, error: 'Net ID and Password are required.' });
  }

  const cleanUsername = netId.trim().replace(/@srmist\.edu\.in$/i, '');
  const session = decodeSession(sessionId);

  if (!session || !session.tokens || !session.cookieJar) {
    return res.status(400).json({
      success: false,
      error: 'Session expired or not initialized. Please enter credentials or use Session Cookie sync / Demo mode.'
    });
  }

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  try {
    const tokens = session.tokens || {};
    const reversedHost = PORTAL_CONFIG.expectedHost.split('').reverse().join('');
    const domainPayload = Buffer.from(reversedHost).toString('base64');

    const startTime = tokens.startTime || (Date.now() - 5000);
    const elapsedSeconds = Math.max(2, Math.floor((Date.now() - startTime) / 1000));
    const delimiter = tokens.randomDelimiter || 'fcf3';
    const interactCount = Math.floor(Math.random() * 15) + 5;
    const trapPayload = `${elapsedSeconds}${delimiter}${interactCount}`;
    const captchaTokenValue = Buffer.from(trapPayload).toString('base64');
    const telemetryPayload = generateTelemetryPayload(startTime);

    const postData = {
      ...(tokens.hiddenInputs || {}),
      username: cleanUsername,
      password: password,
      captcha: (captcha || '').trim(),
      [tokens.honeypotName || 'ph_31def45e']: '',
      [tokens.domainFieldName || 'dtoken_31171d']: domainPayload,
      [tokens.captchaFieldName || 'cptoken_266c98']: captchaTokenValue,
      telemetryPayload: telemetryPayload,
      fpPayload: '',
      fpToken: ''
    };

    console.log('[LOGIN ATTEMPT] Processing user authentication request for:', cleanUsername);

    const loginResponse = await axios.post(
      PORTAL_CONFIG.loginUrl,
      new URLSearchParams(postData).toString(),
      {
        httpsAgent,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': userAgent,
          'Referer': PORTAL_CONFIG.portalHomeUrl,
          'Origin': PORTAL_CONFIG.baseUrl,
          'Cookie': session.cookieJar.getCookieHeader(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        maxRedirects: 0,
        timeout: 30000,
        validateStatus: () => true
      }
    );

    console.log(`[LOGIN RESPONSE] Status: ${loginResponse.status}`);

    if (loginResponse.status === 403) {
      return res.status(403).json({
        success: false,
        error: 'The SRM portal blocked or did not respond to this server. Use the Paste HTML or Session Cookie option instead.'
      });
    }

    session.cookieJar.setFromHeaders(loginResponse.headers);
    session.lastActive = Date.now();

    const isRedirectSuccess = loginResponse.status === 302 || loginResponse.status === 301;
    const redirectLoc = loginResponse.headers['location'] || '';

    if (isRedirectSuccess && (redirectLoc.includes('LoginServlet') || redirectLoc.includes('login') || redirectLoc.endsWith('/srmiststudentportal/'))) {
      console.warn('[LOGIN REJECTED - REDIRECT TO LOGIN]');
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials or Captcha code. Please check your NetID (without @srmist.edu.in) and password.'
      });
    }

    if (!isRedirectSuccess) {
      const loginBody = String(loginResponse.data || '');
      const $err = cheerio.load(loginBody);
      let alertText = $err('.alert-danger, .alert, #error_msg, font[color="red"]').text().replace(/\s+/g, ' ').trim();

      if ($err('#login_form').length > 0 || $err('#username').length > 0 || loginBody.includes('LoginServlet') || alertText) {
        if (!alertText) {
          alertText = 'Invalid credentials or Captcha code. Please check your NetID (without @srmist.edu.in) and password.';
        }
        console.warn('[LOGIN REJECTED BY SRM]');
        return res.status(401).json({ success: false, error: alertText });
      }
    }

    console.log('[LOGIN SUCCESS] Fetching attendance and profile in parallel...');

    // Fetch attendance & profile in parallel
    const attendanceData = await fetchAttendanceWithSession(session, '', targetPercent);

    // Generate new stateless sessionId with post-login cookies
    const updatedSessionId = encodeSessionId(session.cookieJar, session.tokens);
    userSessions.set(updatedSessionId, session);

    return res.json({
      success: true,
      isDemo: false,
      message: 'Authenticated with SRM Student Portal!',
      sessionId: updatedSessionId,
      data: attendanceData
    });
  } catch (err) {
    console.error('[LOGIN ERROR]:', err.message);
    const isTimeout = err.code === 'ECONNABORTED' || (err.message && err.message.toLowerCase().includes('timeout'));
    const isForbidden = err.response && err.response.status === 403;
    const errorMsg = (isTimeout || isForbidden)
      ? 'The SRM portal blocked or did not respond to this server. Use the Paste HTML or Session Cookie option instead.'
      : (err.message || 'Failed to log in to SRM portal. Use the Paste HTML or Session Cookie option instead.');

    return res.status(500).json({
      success: false,
      error: errorMsg,
      message: 'The SRM portal blocked or did not respond to this server. Use the Paste HTML or Session Cookie option instead.'
    });
  }
});

// 5. Secondary Absent-Details Request
apiRouter.post('/absent-details', async (req, res) => {
  const { sessionId, ids, attendanceMonth, attendanceYear } = req.body;
  const session = decodeSession(sessionId);

  if (!session || !session.cookieJar) {
    return res.status(400).json({
      success: false,
      error: 'Session not found or expired. Please re-authenticate.',
      message: 'The SRM portal session was not found. Please log in again.'
    });
  }

  try {
    const postData = {
      ids: ids || '',
      attendanceMonth: attendanceMonth || String(new Date().getMonth() + 1),
      attendanceYear: attendanceYear || String(new Date().getFullYear())
    };

    const cookieHeader = session.cookieJar.getCookieHeader();

    const detailRes = await axios.post(
      PORTAL_CONFIG.innerAttendanceUrl,
      new URLSearchParams(postData).toString(),
      {
        httpsAgent,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': PORTAL_CONFIG.attendanceUrl,
          'Cookie': cookieHeader
        },
        timeout: 10000,
        validateStatus: () => true
      }
    );

    if (detailRes.status !== 200) {
      return res.status(detailRes.status || 500).json({
        success: false,
        error: 'The SRM portal blocked or did not respond to this server. Use the Paste HTML or Session Cookie option instead.'
      });
    }

    const $ = cheerio.load(detailRes.data);
    const records = [];

    $('table tr').each((_, tr) => {
      const cells = $(tr).find('td');
      if (cells.length >= 2) {
        records.push(cells.map((_, c) => $(c).text().trim()).get());
      }
    });

    return res.json({
      success: true,
      html: detailRes.data,
      records
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: 'The SRM portal blocked or did not respond to this server. Use the Paste HTML or Session Cookie option instead.',
      message: err.message
    });
  }
});

// 6. Universal HTML Table / Content Parser
apiRouter.post('/parse', (req, res) => {
  const { html, targetPercent = 75 } = req.body;
  if (!html || !html.trim()) {
    return res.status(400).json({ success: false, error: 'No HTML content provided to parse.' });
  }

  try {
    const parsedData = parseAttendanceContent(html, targetPercent);
    return res.json({ success: true, data: parsedData });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err.message || 'Could not parse attendance HTML format.',
      message: 'The SRM portal blocked or did not respond to this server. Use the Paste HTML or Session Cookie option instead.'
    });
  }
});

// 7. Direct Profile Parser endpoint
apiRouter.post('/profile', (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ success: false, error: 'No profile HTML provided.' });
  const profile = parseStudentProfile(html);
  return res.json({ success: !!profile, profile: profile || {} });
});

// 8. Proxy student avatar photos
apiRouter.get('/photo', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).json({ success: false, error: 'No url provided' });

  try {
    const imgRes = await axios.get(url, {
      httpsAgent,
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://sp.srmist.edu.in/srmiststudentportal/students/template/HRDSystem.jsp'
      },
      timeout: 10000,
      validateStatus: () => true
    });

    if (imgRes.status !== 200) {
      return res.status(404).json({ success: false, error: 'Photo unavailable' });
    }

    res.set('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    return res.send(imgRes.data);
  } catch (e) {
    return res.status(404).json({ success: false, error: 'Photo unavailable' });
  }
});

// 9. Get Demo Profile
apiRouter.get('/demo', (req, res) => {
  const targetPercent = Number(req.query.target) || 75;
  const data = recalculateMockData(targetPercent);
  return res.json({ success: true, data });
});

// 10. Debug / Diagnostics endpoint (safe, read-only)
apiRouter.get('/debug', async (req, res) => {
  const env = {
    isVercel: !!process.env.VERCEL,
    region: process.env.VERCEL_REGION || process.env.AWS_REGION || 'unknown',
    nodeVersion: process.version,
    platform: process.platform
  };

  // Try a lightweight probe to the SRM portal
  let portalProbe = { status: null, blocked: null, error: null };
  try {
    const probe = await axios.get(PORTAL_CONFIG.portalHomeUrl, {
      httpsAgent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'text/html'
      },
      timeout: 12000,
      validateStatus: () => true
    });
    portalProbe.status = probe.status;
    portalProbe.blocked = probe.status === 403 || String(probe.data || '').toLowerCase().includes('access denied');
    portalProbe.captchaPresent = String(probe.data || '').includes('secure_captcha') || String(probe.data || '').includes('cptoken');
  } catch (e) {
    portalProbe.error = e.message;
    portalProbe.blocked = e.code === 'ECONNREFUSED' || e.code === 'ECONNRESET' || (e.message || '').includes('timeout');
  }

  return res.json({
    success: true,
    env,
    portalProbe,
    message: portalProbe.blocked
      ? '⚠️ The SRM portal appears to be blocking this server\'s IP. Use Session Cookie Sync or Paste HTML method instead.'
      : portalProbe.captchaPresent
        ? '✅ SRM portal is reachable and captcha is available.'
        : '⚠️ SRM portal responded but captcha not found — portal may have changed its HTML structure.',
    timestamp: new Date().toISOString()
  });
});

// Mount router on both /api and / to ensure seamless compatibility with Vercel rewrites
app.use('/api', apiRouter);
app.use('/', apiRouter);

// Dynamic Student Profile Parser
function parseStudentProfile(html) {
  if (!html || typeof html !== 'string') return null;
  const $ = cheerio.load(html);
  const student = {};

  $('table tr').each((_, tr) => {
    const tds = $(tr).find('td');
    if (tds.length >= 2) {
      const label = $(tds[0]).text().replace(/\s+/g, ' ').trim().toLowerCase();
      const val = $(tds[1]).text().replace(/\s+/g, ' ').trim();

      if (label.includes('student name')) student.name = val;
      else if (label.includes('student id')) student.studentId = val;
      else if (label.includes('register no') || label.includes('reg no')) student.regNo = val;
      else if (label.includes('email id') || label.includes('email')) student.email = val;
      else if (label.includes('institution')) student.institution = val;
      else if (label.includes('program')) student.program = val;
      else if (label.includes('semester')) student.semester = `Semester ${val}`;
      else if (label.includes('batch')) student.batch = val;
      else if (label.includes('section')) student.section = val;
      else if (label.includes('faculty advisor')) student.advisor = val;
      else if (label.includes('academic advisor')) student.academicAdvisor = val;
    }
  });

  const photoSrc = $('#divImage img, img.imgPhoto').attr('src');
  if (photoSrc) {
    student.photoUrl = photoSrc.replace(/^\.\.\/\.\./, 'https://sp.srmist.edu.in/srmiststudentportal');
  }

  if (!student.name) {
    $('tr, div.row, div.form-group, li, p').each((_, el) => {
      const text = $(el).text().replace(/\s+/g, ' ').trim();
      if (/Student\s*Name/i.test(text)) {
        const match = text.match(/Student\s*Name\s*[:\s]*([A-Z\s.]+?)(?:Student\s*ID|Register|Email|Institution|$)/i);
        if (match && match[1].trim().length > 2) student.name = match[1].trim();
      }
      if (/Register\s*(?:No|Number)/i.test(text)) {
        const match = text.match(/RA\d{13}/i);
        if (match) student.regNo = match[0].toUpperCase();
      }
    });
  }

  return Object.keys(student).length > 0 ? student : null;
}

// Helper to fetch attendance given session object (parallel attendance & profile fetch)
async function fetchAttendanceWithSession(session, csrfSalt = '', targetPercent = 75) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const cookieHeader = session.cookieJar ? session.cookieJar.getCookieHeader() : (session.cookies || []).join('; ');

  const attendancePost = {
    iden: '1',
    filter: '1',
    hdnFormDetails: '',
    csrfPreventionSalt: csrfSalt
  };

  const attPromise = axios.post(
    PORTAL_CONFIG.attendanceUrl,
    new URLSearchParams(attendancePost).toString(),
    {
      httpsAgent,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Referer': PORTAL_CONFIG.portalHomeUrl,
        'Cookie': cookieHeader
      },
      timeout: 25000,
      validateStatus: () => true
    }
  );

  const profPromise = axios.post(
    PORTAL_CONFIG.profileUrl,
    '',
    {
      httpsAgent,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Referer': 'https://sp.srmist.edu.in/srmiststudentportal/students/template/HRDSystem.jsp',
        'Cookie': cookieHeader
      },
      timeout: 15000,
      validateStatus: () => true
    }
  );

  const [attResult, profResult] = await Promise.allSettled([attPromise, profPromise]);

  if (attResult.status === 'rejected') {
    throw attResult.reason;
  }

  const attRes = attResult.value;
  if (attRes.status === 403 || String(attRes.data).includes('Access denied')) {
    throw new Error('The SRM portal blocked or did not respond to this server. Use the Paste HTML or Session Cookie option instead.');
  }

  let dynamicProfile = null;
  if (profResult.status === 'fulfilled' && profResult.value && profResult.value.status === 200 && typeof profResult.value.data === 'string') {
    dynamicProfile = parseStudentProfile(profResult.value.data);
  }

  return parseAttendanceContent(attRes.data, targetPercent, dynamicProfile);
}

// Helper to fetch attendance with raw session cookie string
async function fetchAttendanceWithCookie(cookieInput, targetPercent = 75) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  let cookieStr = cookieInput.trim();
  if (!cookieStr.includes('=')) {
    cookieStr = `JSESSIONID=${cookieStr}`;
  }

  const attendancePost = {
    iden: '1',
    filter: '1',
    hdnFormDetails: '',
    csrfPreventionSalt: ''
  };

  const attPromise = axios.post(
    PORTAL_CONFIG.attendanceUrl,
    new URLSearchParams(attendancePost).toString(),
    {
      httpsAgent,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Referer': PORTAL_CONFIG.portalHomeUrl,
        'Cookie': cookieStr
      },
      timeout: 25000,
      validateStatus: () => true
    }
  );

  const profPromise = axios.post(
    PORTAL_CONFIG.profileUrl,
    '',
    {
      httpsAgent,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Referer': 'https://sp.srmist.edu.in/srmiststudentportal/students/template/HRDSystem.jsp',
        'Cookie': cookieStr
      },
      timeout: 15000,
      validateStatus: () => true
    }
  );

  const [attResult, profResult] = await Promise.allSettled([attPromise, profPromise]);

  if (attResult.status === 'rejected') {
    throw attResult.reason;
  }

  const attRes = attResult.value;
  if (attRes.status === 403 || String(attRes.data).includes('Access denied')) {
    throw new Error('The SRM portal blocked or did not respond to this server. Use the Paste HTML or Session Cookie option instead.');
  }

  let dynamicProfile = null;
  if (profResult.status === 'fulfilled' && profResult.value && profResult.value.status === 200 && typeof profResult.value.data === 'string') {
    dynamicProfile = parseStudentProfile(profResult.value.data);
  }

  return parseAttendanceContent(attRes.data, targetPercent, dynamicProfile);
}

// Robust Parser for SRMIST Attendance Tables
function parseAttendanceContent(content, targetPercent = 75, dynamicProfile = null) {
  if (typeof content === 'object') {
    return transformJsonAttendance(content, targetPercent);
  }

  const $ = cheerio.load(content);
  const courses = [];
  let studentInfo = { ...mockStudentData.student };

  if (dynamicProfile && typeof dynamicProfile === 'object') {
    studentInfo = { ...studentInfo, ...dynamicProfile };
  } else {
    const inlineProfile = parseStudentProfile(content);
    if (inlineProfile) {
      studentInfo = { ...studentInfo, ...inlineProfile };
    }
  }

  // Extract student registration and name from headers if available
  $('td, th, span, div, p, b, strong').each((_, el) => {
    const text = $(el).text().trim();
    const regMatch = text.match(/RA\d{13}/i);
    if (regMatch) {
      studentInfo.regNo = regMatch[0].toUpperCase();
    }
    if (text.includes('Name') && (text.includes(':') || $(el).next().length)) {
      const nameVal = $(el).next().text().trim() || text.split(':')[1];
      if (nameVal && nameVal.length > 2 && !nameVal.includes('Registration')) {
        studentInfo.name = nameVal.trim();
      }
    }
  });

  let bestTable = null;
  let maxScore = -1;

  $('table').each((_, tbl) => {
    const text = $(tbl).text().toLowerCase();
    let score = 0;
    if (text.includes('code')) score += 2;
    if (text.includes('description') || text.includes('course') || text.includes('subject')) score += 2;
    if (text.includes('max. hours') || text.includes('max hours') || text.includes('conducted')) score += 3;
    if (text.includes('att. hours') || text.includes('attended')) score += 3;
    if (text.includes('absent hours') || text.includes('absent')) score += 2;
    if (text.includes('percentage') || text.includes('total percentage')) score += 2;

    if (score > maxScore) {
      maxScore = score;
      bestTable = tbl;
    }
  });

  if (bestTable && maxScore >= 4) {
    const rows = $(bestTable).find('tr');

    let colMap = {
      code: -1,
      description: -1,
      maxHours: -1,
      attHours: -1,
      absentHours: -1,
      percentage: -1
    };

    rows.each((rowIndex, row) => {
      const headerCells = $(row).find('th, td');
      const cellTexts = headerCells.map((_, c) => $(c).text().trim().toLowerCase()).get();

      const hasCode = cellTexts.some(t => t === 'code' || t.includes('sub code') || t.includes('course code'));
      const hasHours = cellTexts.some(t => t.includes('hours') || t.includes('conducted') || t.includes('attended'));

      if (hasCode && hasHours && colMap.code === -1) {
        cellTexts.forEach((text, idx) => {
          if (text === 'code' || text.includes('sub code') || text.includes('course code')) colMap.code = idx;
          else if (text.includes('description') || text.includes('course title') || text.includes('subject')) colMap.description = idx;
          else if (text.includes('max. hours') || text.includes('max hours') || text.includes('conducted') || text.includes('held') || text.includes('total hours')) colMap.maxHours = idx;
          else if (text.includes('att. hours') || text.includes('attended') || text.includes('present')) colMap.attHours = idx;
          else if (text.includes('absent hours') || text.includes('absent')) colMap.absentHours = idx;
          else if (text.includes('percentage') || text.includes('%')) colMap.percentage = idx;
        });
        return;
      }

      if (headerCells.length >= 4) {
        const rawTexts = headerCells.map((_, c) => $(c).text().trim()).get();

        let code = '';
        let description = '';
        let conducted = 0;
        let attended = 0;
        let absent = 0;

        if (colMap.code !== -1 && rawTexts[colMap.code]) {
          code = rawTexts[colMap.code];
        }
        if (colMap.description !== -1 && rawTexts[colMap.description]) {
          description = rawTexts[colMap.description];
        }
        if (colMap.maxHours !== -1 && rawTexts[colMap.maxHours]) {
          conducted = parseInt(rawTexts[colMap.maxHours].replace(/[^\d]/g, ''), 10) || 0;
        }
        if (colMap.attHours !== -1 && rawTexts[colMap.attHours]) {
          attended = parseInt(rawTexts[colMap.attHours].replace(/[^\d]/g, ''), 10) || 0;
        }
        if (colMap.absentHours !== -1 && rawTexts[colMap.absentHours]) {
          absent = parseInt(rawTexts[colMap.absentHours].replace(/[^\d]/g, ''), 10) || 0;
        }

        if (colMap.code === -1) {
          rawTexts.forEach((val, idx) => {
            if (/^[A-Z0-9]{5,12}$/i.test(val) && !code) code = val;
            else if (val.length > 5 && isNaN(Number(val)) && !description) description = val;
          });
          const numbers = rawTexts
            .map((v, i) => ({ val: parseInt(v.replace(/[^\d]/g, ''), 10), idx: i }))
            .filter(n => !isNaN(n.val) && n.val >= 0 && n.val <= 200);

          if (numbers.length >= 2) {
            conducted = numbers[0].val >= numbers[1].val ? numbers[0].val : numbers[1].val;
            attended = numbers[0].val >= numbers[1].val ? numbers[1].val : numbers[0].val;
          }
        }

        if (conducted > 0 || (code && code.length >= 4 && !code.toLowerCase().includes('total'))) {
          if (attended === 0 && absent > 0 && conducted >= absent) {
            attended = conducted - absent;
          }

          const metrics = calculateAttendanceMetrics(attended, conducted, targetPercent);
          const type = code.includes('J') ? 'Integrated (Theory + Lab)' : code.includes('L') || code.includes('P') ? 'Practical / Lab' : 'Theory';

          courses.push({
            code: code || `CRS-${courses.length + 1}`,
            title: description || `Course ${courses.length + 1}`,
            faculty: 'SRM Faculty',
            type,
            slot: 'Slot ' + String.fromCharCode(65 + (courses.length % 6)),
            ...metrics
          });
        }
      }
    });
  }

  if (courses.length === 0 && typeof content === 'string') {
    const lines = content.split('\n').map(l => l.trim()).filter(Boolean);
    const textRegex = /([A-Z0-9]{6,12})\s+([A-Za-z0-9\s&()\-.,]+?)\s+(\d{1,3})\s+(\d{1,3})\s+(\d{1,3})?\s+(\d{1,3}(?:\.\d{1,2})?)/;

    lines.forEach(line => {
      const match = line.match(textRegex);
      if (match) {
        const code = match[1].trim();
        const title = match[2].trim();
        const conducted = parseInt(match[3], 10);
        const attended = parseInt(match[4], 10);
        const absent = match[5] ? parseInt(match[5], 10) : Math.max(0, conducted - attended);

        const metrics = calculateAttendanceMetrics(attended, conducted, targetPercent);
        const type = code.includes('J') ? 'Integrated (Theory + Lab)' : code.includes('L') || code.includes('P') ? 'Practical / Lab' : 'Theory';

        courses.push({
          code,
          title,
          faculty: 'SRM Faculty',
          type,
          slot: 'Slot ' + String.fromCharCode(65 + (courses.length % 6)),
          ...metrics
        });
      }
    });
  }

  if (courses.length === 0) {
    throw new Error('No attendance records found in portal response. Use the Paste HTML or Session Cookie option instead.');
  }

  let totalConducted = 0;
  let totalAttended = 0;
  let safeCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  courses.forEach(c => {
    totalConducted += c.conducted;
    totalAttended += c.attended;
    if (c.status === 'safe') safeCount++;
    else if (c.status === 'warning') warningCount++;
    else criticalCount++;
  });

  const overallMetrics = calculateAttendanceMetrics(totalAttended, totalConducted, targetPercent);

  return {
    student: studentInfo,
    summary: {
      totalCourses: courses.length,
      totalConducted,
      totalAttended,
      totalAbsent: totalConducted - totalAttended,
      overallPercentage: overallMetrics.percentage,
      safeCourses: safeCount,
      warningCourses: warningCount,
      criticalCourses: criticalCount,
      overallMargin: overallMetrics.margin,
      overallRequired: overallMetrics.required,
      targetPercent
    },
    courses
  };
}

// Recalculate Mock Profile with target threshold
function recalculateMockData(targetPercent) {
  let totalConducted = 0;
  let totalAttended = 0;
  let safeCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  const courses = mockStudentData.courses.map(c => {
    const metrics = calculateAttendanceMetrics(c.attended, c.conducted, targetPercent);
    totalConducted += metrics.conducted;
    totalAttended += metrics.attended;

    if (metrics.status === 'safe') safeCount++;
    else if (metrics.status === 'warning') warningCount++;
    else criticalCount++;

    return {
      ...c,
      conducted: metrics.conducted,
      attended: metrics.attended,
      absent: metrics.absent,
      percentage: metrics.percentage,
      margin: metrics.margin,
      required: metrics.required,
      status: metrics.status
    };
  });

  const overallMetrics = calculateAttendanceMetrics(totalAttended, totalConducted, targetPercent);

  return {
    student: mockStudentData.student,
    summary: {
      totalCourses: courses.length,
      totalConducted,
      totalAttended,
      totalAbsent: totalConducted - totalAttended,
      overallPercentage: overallMetrics.percentage,
      safeCourses: safeCount,
      warningCourses: warningCount,
      criticalCourses: criticalCount,
      overallMargin: overallMetrics.margin,
      overallRequired: overallMetrics.required,
      targetPercent
    },
    courses
  };
}

// JSON fallback parser
function transformJsonAttendance(json, targetPercent = 75) {
  const rawList = Array.isArray(json) ? json : json.courses || json.attendance || json.data || [];
  const courses = rawList.map((item, idx) => {
    const code = item.code || item.Code || item.courseCode || `CRS-${idx + 1}`;
    const title = item.description || item.Description || item.title || item.courseTitle || `Course ${idx + 1}`;
    const conducted = Number(item['Max. hours'] || item.maxHours || item.conducted || item.totalHours) || 0;
    const attended = Number(item['Att. hours'] || item.attHours || item.attended || item.present) || 0;
    const metrics = calculateAttendanceMetrics(attended, conducted, targetPercent);

    return {
      code,
      title,
      faculty: item.faculty || 'SRM Faculty',
      type: code.includes('J') ? 'Integrated' : code.includes('L') ? 'Lab' : 'Theory',
      slot: item.slot || 'A1',
      ...metrics
    };
  });

  if (courses.length === 0) return recalculateMockData(targetPercent);

  let totalConducted = 0;
  let totalAttended = 0;
  let safeCount = 0;
  let warningCount = 0;
  let criticalCount = 0;

  courses.forEach(c => {
    totalConducted += c.conducted;
    totalAttended += c.attended;
    if (c.status === 'safe') safeCount++;
    else if (c.status === 'warning') warningCount++;
    else criticalCount++;
  });

  const overallMetrics = calculateAttendanceMetrics(totalAttended, totalConducted, targetPercent);

  return {
    student: json.student || mockStudentData.student,
    summary: {
      totalCourses: courses.length,
      totalConducted,
      totalAttended,
      totalAbsent: totalConducted - totalAttended,
      overallPercentage: overallMetrics.percentage,
      safeCourses: safeCount,
      warningCourses: warningCount,
      criticalCourses: criticalCount,
      overallMargin: overallMetrics.margin,
      overallRequired: overallMetrics.required,
      targetPercent
    },
    courses
  };
}

// Global JSON error handler
app.use((err, req, res, next) => {
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
    message: 'The SRM portal blocked or did not respond to this server. Use the Paste HTML or Session Cookie option instead.'
  });
});

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL && require.main === module) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FlashMan SRM Attendance Server running on: http://localhost:${PORT}`);
  });
}

module.exports = app;
