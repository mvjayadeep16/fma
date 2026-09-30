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

// Exact SRMIST Student Portal Configuration
let portalConfig = {
  baseUrl: 'https://sp.srmist.edu.in',
  portalHomeUrl: 'https://sp.srmist.edu.in/srmiststudentportal/',
  loginUrl: 'https://sp.srmist.edu.in/srmiststudentportal/LoginServlet',
  attendanceUrl: 'https://sp.srmist.edu.in/srmiststudentportal/students/report/studentAttendanceDetails.jsp',
  innerAttendanceUrl: 'https://sp.srmist.edu.in/srmiststudentportal/students/report/studentAttendanceDetailsInner.jsp',
  profileUrl: 'https://sp.srmist.edu.in/srmiststudentportal/students/report/studentProfile.jsp',
  expectedHost: 'sp.srmist.edu.in'
};

// In-memory active user sessions: { sessionId: { cookies: string[], tokens: object, lastActive: number } }
const userSessions = new Map();

// Session clean-up interval (TTL: 1 hour)
setInterval(() => {
  const now = Date.now();
  for (const [id, session] of userSessions.entries()) {
    if (now - session.lastActive > 3600000) {
      userSessions.delete(id);
    }
  }
}, 300000);

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
  const currentRatio = t > 0 ? (p / t) : 0;
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

// Generate Realistic Telemetry Payload required by sp.srmist.edu.in secure2.js
function generateTelemetryPayload(startTime) {
  const now = Date.now();
  const timeOnPage = Math.max(3000, now - startTime);
  const clicks = Math.floor(Math.random() * 4) + 2;
  const moves = Math.floor(Math.random() * 25) + 12;
  const keys = Math.floor(Math.random() * 10) + 8;

  const telemetry = {
    startTime: startTime,
    currentDomain: portalConfig.expectedHost,
    timezoneOffset: -330, // Indian Standard Time (IST) offset
    screenWidth: 1920,
    screenHeight: 1080,
    colorDepth: 24,
    devicePixelRatio: 1,
    platform: 'Win32',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    language: 'en-US',
    hardwareConcurrency: 8,
    deviceMemory: 8,
    touchSupport: false,
    webdriver: false,
    mouseClicks: clicks,
    mouseMovements: moves,
    keystrokeCount: keys,
    typingSpeedMs: Math.floor(timeOnPage * 0.4),
    canvasHash: '9a7b2c4e',
    submitTime: now,
    timeOnPageMs: timeOnPage
  };

  const jsonStr = JSON.stringify(telemetry);
  return Buffer.from(jsonStr).toString('base64');
}

// SRM Student Profile (Maddipatla Venkata Jayadeep)
const mockStudentData = {
  student: {
    name: 'MADDIPATLA VENKATA JAYADEEP',
    regNo: 'RA2511026010556',
    studentId: '684988',
    email: 'vm2237@srmist.edu.in',
    program: 'B.Tech.-Computer Science and Engineering with specialization in Artificial Intelligence and Machine Learning[UG - FT - ACADEMIC]',
    semester: 'Semester -',
    batch: '1',
    section: 'Y1',
    academicYear: '2025 - 2026',
    department: 'School of Computing',
    institution: 'Faculty of Engineering and Technology, Kattankulathur',
    campus: 'KTR Main Campus, SRMIST',
    advisor: 'Dr.Sreekrishna M [sreekrim@srmist.edu.in]'
  },
  courses: [
    {
      code: '21CSC201J',
      title: 'Data Structures and Algorithms',
      faculty: 'Dr. K. Pradeep (Computing)',
      type: 'Integrated (Theory + Lab)',
      slot: 'A1 + AL1',
      conducted: 36,
      attended: 32,
      absent: 4
    },
    {
      code: '21CSC202J',
      title: 'Operating Systems',
      faculty: 'Dr. M. Lakshmi',
      type: 'Integrated',
      slot: 'B1 + BL1',
      conducted: 34,
      attended: 28,
      absent: 6
    },
    {
      code: '21CSC204J',
      title: 'Database Management Systems',
      faculty: 'Prof. Anitha Venkatesh',
      type: 'Integrated',
      slot: 'C1 + CL1',
      conducted: 32,
      attended: 29,
      absent: 3
    },
    {
      code: '21MAT102J',
      title: 'Probability & Queuing Theory',
      faculty: 'Dr. V. Sundar (Mathematics)',
      type: 'Theory',
      slot: 'D1',
      conducted: 30,
      attended: 21,
      absent: 9
    },
    {
      code: '21CSE301T',
      title: 'Design and Analysis of Algorithms',
      faculty: 'Dr. R. Balaji',
      type: 'Theory',
      slot: 'E1',
      conducted: 28,
      attended: 22,
      absent: 6
    },
    {
      code: '21CSS201J',
      title: 'Full Stack Web Development Lab',
      faculty: 'Prof. T. Gayathri',
      type: 'Practical / Lab',
      slot: 'P1',
      conducted: 28,
      attended: 26,
      absent: 2
    },
    {
      code: '21PDM101L',
      title: 'Professional Communication & Soft Skills',
      faculty: 'Dr. Sarah Thomas',
      type: 'Theory',
      slot: 'F1',
      conducted: 30,
      attended: 24,
      absent: 6
    }
  ]
};

// 1. Get Portal Configuration
app.get('/api/config', (req, res) => {
  res.json({
    success: true,
    config: portalConfig
  });
});

// Update portal configuration if needed
app.post('/api/config', (req, res) => {
  portalConfig = { ...portalConfig, ...req.body };
  res.json({ success: true, message: 'Portal config updated successfully', config: portalConfig });
});

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

// 2. Fetch Live Captcha & Initialize Portal Session from sp.srmist.edu.in
app.get('/api/captcha', async (req, res) => {
  const sessionId = req.query.sessionId || `sp_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  try {
    const cookieJar = new CookieJar();

    // Step 1: Request portal login page to get initial cookies and tokens
    const initRes = await axios.get(portalConfig.portalHomeUrl, {
      httpsAgent,
      headers: {
        'User-Agent': userAgent,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache'
      },
      timeout: 15000
    });

    cookieJar.setFromHeaders(initRes.headers);

    const $ = cheerio.load(initRes.data);

    // Extract dynamic security configuration
    const tokens = {
      startTime: Date.now(),
      nonce: '',
      captchaText: '',
      domainFieldName: 'dtoken_31171d',
      captchaFieldName: 'cptoken_266c98',
      randomDelimiter: 'fcf3',
      honeypotName: '',
      captchaDataSrc: $('img#secure_captcha').attr('data-src') || ''
    };

    // Find dynamic honeypot input (ph_...)
    $('input').each((_, inp) => {
      const name = $(inp).attr('name');
      if (name && name.startsWith('ph_')) {
        tokens.honeypotName = name;
      }
    });

    // Parse SECURE_CONFIG script (support both property: 'val' and obj.prop = 'val')
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

    // Step 2: Fetch the actual Captcha image using X-Domain-Proof header
    let captchaDataUrl = '';
    if (tokens.captchaDataSrc) {
      const captchaUrl = new URL(tokens.captchaDataSrc, portalConfig.baseUrl).href;
      const domainProof = Buffer.from(`${tokens.nonce}:${portalConfig.expectedHost}`).toString('base64');

      const imgRes = await axios.get(captchaUrl, {
        httpsAgent,
        responseType: 'arraybuffer',
        headers: {
          'User-Agent': userAgent,
          'Referer': portalConfig.portalHomeUrl,
          'Cookie': cookieJar.getCookieHeader(),
          'X-Domain-Proof': domainProof,
          'Accept': 'image/png, image/jpeg, image/svg+xml, image/*;q=0.9'
        },
        timeout: 15000
      });

      // Update cookie jar with captcha servlet response (replaces TS9dec798a027 cleanly)
      cookieJar.setFromHeaders(imgRes.headers);

      const base64Img = Buffer.from(imgRes.data, 'binary').toString('base64');
      const contentType = imgRes.headers['content-type'] || 'image/png';
      captchaDataUrl = `data:${contentType};base64,${base64Img}`;
    }

    // Encode stateless session payload for serverless environments (Vercel)
    const sessionPayload = {
      cookies: cookieJar.toJSON(),
      tokens,
      time: Date.now()
    };
    const statelessSessionId = Buffer.from(JSON.stringify(sessionPayload)).toString('base64url');

    // Save active session in memory as well
    userSessions.set(statelessSessionId, {
      cookieJar,
      tokens,
      lastActive: Date.now()
    });

    res.json({
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
    console.error('Error fetching captcha from SRM portal:', err.message);
    res.json({
      success: false,
      sessionId,
      error: err.message,
      message: 'Could not directly fetch CAPTCHA from sp.srmist.edu.in. Check network access or use demo/import mode.'
    });
  }
});

// 3. Authenticate with SRM Portal LoginServlet
app.post('/api/login', async (req, res) => {
  const { sessionId, netId, password, captcha, sessionCookie, targetPercent = 75 } = req.body;

  // If user requests Demo mode
  if (netId && (netId.toLowerCase() === 'demo' || password.toLowerCase() === 'demo')) {
    const data = recalculateMockData(targetPercent);
    return res.json({
      success: true,
      isDemo: true,
      message: 'SRM Demo Profile loaded successfully!',
      data
    });
  }

  // If user supplied an already authenticated session cookie (e.g. JSESSIONID=...)
  if (sessionCookie && sessionCookie.trim()) {
    try {
      const attendanceData = await fetchAttendanceWithCookie(sessionCookie.trim(), targetPercent);
      return res.json({
        success: true,
        isDemo: false,
        message: 'Successfully fetched attendance using session cookie!',
        data: attendanceData
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message,
        message: 'Failed to fetch attendance with provided session cookie. Ensure you copied JSESSIONID from a logged-in tab.'
      });
    }
  }

  if (!netId || !password) {
    return res.status(400).json({ success: false, error: 'Net ID and Password are required.' });
  }

  const cleanUsername = netId.trim().replace(/@srmist\.edu\.in$/i, '');

  let session = userSessions.get(sessionId);
  if ((!session || !session.tokens || !session.cookieJar) && sessionId) {
    try {
      const decoded = JSON.parse(Buffer.from(sessionId, 'base64url').toString('utf8'));
      if (decoded && decoded.cookies && decoded.tokens) {
        session = {
          cookieJar: CookieJar.fromJSON(decoded.cookies),
          tokens: decoded.tokens,
          lastActive: decoded.time || Date.now()
        };
      }
    } catch (e) {
      try {
        const decoded = JSON.parse(Buffer.from(sessionId, 'base64').toString('utf8'));
        if (decoded && decoded.cookies && decoded.tokens) {
          session = {
            cookieJar: CookieJar.fromJSON(decoded.cookies),
            tokens: decoded.tokens,
            lastActive: decoded.time || Date.now()
          };
        }
      } catch (err) {}
    }
  }

  if (!session || !session.tokens || !session.cookieJar) {
    return res.status(400).json({
      success: false,
      error: 'Session expired. Please click the refresh icon next to Captcha and try again.'
    });
  }

  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  try {
    const tokens = session.tokens || {};
    const reversedHost = portalConfig.expectedHost.split('').reverse().join('');
    const domainPayload = Buffer.from(reversedHost).toString('base64');

    const startTime = tokens.startTime || (Date.now() - 5000);
    const elapsedSeconds = Math.max(3, Math.floor((Date.now() - startTime) / 1000));
    const delimiter = tokens.randomDelimiter || 'fcf3';
    const trapPayload = `${elapsedSeconds}${delimiter}14`;
    const captchaTokenValue = Buffer.from(trapPayload).toString('base64');
    const telemetryPayload = generateTelemetryPayload(startTime);

    // Build Form Data according to sp.srmist.edu.in exact requirements (no extra un-named inputs)
    const postData = {
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

    console.log(`[LOGIN ATTEMPT] User: ${cleanUsername}, Captcha: ${captcha}, SessionId: ${sessionId}`);
    console.log(`[LOGIN POST KEYS]:`, Object.keys(postData));
    console.log(`[LOGIN COOKIES SENT]:`, session.cookieJar.getCookieHeader());

    // Request LoginServlet with maxRedirects: 0 to catch 302 Found and Set-Cookie!
    const loginResponse = await axios.post(
      portalConfig.loginUrl,
      new URLSearchParams(postData).toString(),
      {
        httpsAgent,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': userAgent,
          'Referer': portalConfig.portalHomeUrl,
          'Origin': portalConfig.baseUrl,
          'Cookie': session.cookieJar.getCookieHeader(),
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9'
        },
        maxRedirects: 0,
        timeout: 20000,
        validateStatus: () => true
      }
    );

    console.log(`[LOGIN RESPONSE] Status: ${loginResponse.status}, Set-Cookie:`, loginResponse.headers['set-cookie']);

    // Capture updated session cookies cleanly
    session.cookieJar.setFromHeaders(loginResponse.headers);
    session.lastActive = Date.now();
    userSessions.set(sessionId, session);

    // If status is 302 or 301, check redirect location
    const isRedirectSuccess = loginResponse.status === 302 || loginResponse.status === 301;
    const redirectLoc = loginResponse.headers['location'] || '';

    // If redirected back to login or error page, login failed
    if (isRedirectSuccess && (redirectLoc.includes('LoginServlet') || redirectLoc.includes('login') || redirectLoc.endsWith('/srmiststudentportal/'))) {
      console.warn(`[LOGIN REJECTED - REDIRECT TO LOGIN] Location: ${redirectLoc}`);
      return res.status(401).json({
        success: false,
        error: 'Invalid credentials or Captcha code. Please check your NetID (without @srmist.edu.in) and password.'
      });
    }

    if (!isRedirectSuccess) {
      const loginBody = String(loginResponse.data || '');
      const $err = cheerio.load(loginBody);
      let alertText = $err('.alert-danger, .alert, #error_msg, font[color="red"]').text().replace(/\s+/g, ' ').trim();

      // If portal returned the login form again or has an alert, login failed!
      if ($err('#login_form').length > 0 || $err('#username').length > 0 || loginBody.includes('LoginServlet') || alertText) {
        if (!alertText) {
          alertText = 'Invalid credentials or Captcha code. Please check your NetID (without @srmist.edu.in) and password.';
        }
        console.warn(`[LOGIN REJECTED BY SRM] ${alertText}`);
        return res.status(401).json({ success: false, error: alertText });
      }
    }

    console.log('[LOGIN SUCCESS] Fetching attendance from studentAttendanceDetails.jsp...');

    // Step 2: Fetch studentAttendanceDetails.jsp using authenticated session
    const attendanceData = await fetchAttendanceWithSession(session, '', targetPercent);

    return res.json({
      success: true,
      isDemo: false,
      message: 'Authenticated with SRM Student Portal!',
      data: attendanceData
    });
  } catch (err) {
    console.error('Login error:', err.message);
    return res.status(500).json({
      success: false,
      error: err.message,
      message: 'Failed to log in to SRM portal. You can also paste your attendance table HTML or use Session Cookie Sync!'
    });
  }
});

// Dynamic Student Profile Parser (extracts any student's name, regNo, program, section from studentProfile.jsp)
function parseStudentProfile(html) {
  if (!html || typeof html !== 'string') return null;
  const $ = cheerio.load(html);
  const student = {};

  // Exact row parsing matching SRM table.table-borderless from studentProfile.jsp
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

  // Extract student photo URL if present
  const photoSrc = $('#divImage img, img.imgPhoto').attr('src');
  if (photoSrc) {
    student.photoUrl = photoSrc.replace(/^\.\.\/\.\./, 'https://sp.srmist.edu.in/srmiststudentportal');
  }

  // Fallback regex scan for non-standard markup
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

// Helper to fetch attendance given session object
async function fetchAttendanceWithSession(session, csrfSalt = '', targetPercent = 75) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
  const cookieHeader = session.cookieJar ? session.cookieJar.getCookieHeader() : (session.cookies || []).join('; ');

  // Dynamically fetch student profile from studentProfile.jsp via POST (as requested by portal)
  let dynamicProfile = null;
  try {
    let profRes = await axios.post(portalConfig.profileUrl, '', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Referer': 'https://sp.srmist.edu.in/srmiststudentportal/students/template/HRDSystem.jsp',
        'Cookie': cookieHeader
      },
      timeout: 10000,
      validateStatus: () => true
    });

    if (profRes.status !== 200 || !profRes.data) {
      profRes = await axios.get(portalConfig.profileUrl, {
        headers: {
          'User-Agent': userAgent,
          'Referer': 'https://sp.srmist.edu.in/srmiststudentportal/students/template/HRDSystem.jsp',
          'Cookie': cookieHeader
        },
        timeout: 10000,
        validateStatus: () => true
      });
    }

    if (profRes.status === 200 && typeof profRes.data === 'string') {
      dynamicProfile = parseStudentProfile(profRes.data);
      if (dynamicProfile) {
        console.log('[DYNAMIC PROFILE EXTRACTED]:', dynamicProfile.name, dynamicProfile.regNo, dynamicProfile.program);
      }
    }
  } catch (err) {
    console.warn('[PROFILE FETCH] Could not fetch studentProfile.jsp:', err.message);
  }

  const attendancePost = {
    iden: '1',
    filter: '1',
    hdnFormDetails: '',
    csrfPreventionSalt: csrfSalt
  };

  const attRes = await axios.post(
    portalConfig.attendanceUrl,
    new URLSearchParams(attendancePost).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Referer': portalConfig.portalHomeUrl,
        'Cookie': cookieHeader
      },
      timeout: 15000
    }
  );

  return parseAttendanceContent(attRes.data, targetPercent, dynamicProfile);
}

// Helper to fetch attendance with raw session cookie string
async function fetchAttendanceWithCookie(cookieInput, targetPercent = 75) {
  const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

  let cookieStr = cookieInput.trim();
  if (!cookieStr.includes('=')) {
    cookieStr = `JSESSIONID=${cookieStr}`;
  }

  // Dynamically fetch student profile from studentProfile.jsp via POST
  let dynamicProfile = null;
  try {
    let profRes = await axios.post(portalConfig.profileUrl, '', {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Referer': 'https://sp.srmist.edu.in/srmiststudentportal/students/template/HRDSystem.jsp',
        'Cookie': cookieStr
      },
      timeout: 10000,
      validateStatus: () => true
    });

    if (profRes.status !== 200 || !profRes.data) {
      profRes = await axios.get(portalConfig.profileUrl, {
        headers: {
          'User-Agent': userAgent,
          'Referer': 'https://sp.srmist.edu.in/srmiststudentportal/students/template/HRDSystem.jsp',
          'Cookie': cookieStr
        },
        timeout: 10000,
        validateStatus: () => true
      });
    }

    if (profRes.status === 200 && typeof profRes.data === 'string') {
      dynamicProfile = parseStudentProfile(profRes.data);
      if (dynamicProfile) {
        console.log('[DYNAMIC PROFILE EXTRACTED WITH COOKIE]:', dynamicProfile.name, dynamicProfile.regNo, dynamicProfile.program);
      }
    }
  } catch (err) {
    console.warn('[PROFILE FETCH] Could not fetch studentProfile.jsp with cookie:', err.message);
  }

  const attendancePost = {
    iden: '1',
    filter: '1',
    hdnFormDetails: '',
    csrfPreventionSalt: ''
  };

  const attRes = await axios.post(
    portalConfig.attendanceUrl,
    new URLSearchParams(attendancePost).toString(),
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': userAgent,
        'Referer': portalConfig.portalHomeUrl,
        'Cookie': cookieStr
      },
      timeout: 15000
    }
  );

  return parseAttendanceContent(attRes.data, targetPercent, dynamicProfile);
}

// 4. Secondary Absent-Details Request
// studentAttendanceDetailsInner.jsp (POST: ids, attendanceMonth, attendanceYear)
app.post('/api/absent-details', async (req, res) => {
  const { sessionId, ids, attendanceMonth, attendanceYear } = req.body;
  let session = userSessions.get(sessionId);
  if (!session && sessionId) {
    try {
      const decoded = JSON.parse(Buffer.from(sessionId, 'base64url').toString('utf8'));
      if (decoded && decoded.cookies && decoded.tokens) {
        session = {
          cookieJar: CookieJar.fromJSON(decoded.cookies),
          tokens: decoded.tokens,
          lastActive: decoded.time || Date.now()
        };
      }
    } catch (e) {}
  }

  if (!session) {
    return res.status(400).json({ success: false, error: 'Session not found or expired.' });
  }

  try {
    const postData = {
      ids: ids || '',
      attendanceMonth: attendanceMonth || String(new Date().getMonth() + 1),
      attendanceYear: attendanceYear || String(new Date().getFullYear())
    };

    const cookieHeader = session.cookieJar ? session.cookieJar.getCookieHeader() : (session.cookies || []).join('; ');

    const detailRes = await axios.post(
      portalConfig.innerAttendanceUrl,
      new URLSearchParams(postData).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Referer': portalConfig.attendanceUrl,
          'Cookie': cookieHeader
        },
        timeout: 10000
      }
    );

    const $ = cheerio.load(detailRes.data);
    const records = [];

    $('table tr').each((_, tr) => {
      const cells = $(tr).find('td');
      if (cells.length >= 2) {
        records.push(cells.map((_, c) => $(c).text().trim()).get());
      }
    });

    res.json({
      success: true,
      html: detailRes.data,
      records
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 5. Universal HTML Table / Content Parser
// Mapped specifically to SRM table headers:
// - Code
// - Description
// - Max. hours
// - Att. hours
// - Absent hours
// - Total Percentage
app.post('/api/parse', (req, res) => {
  const { html, targetPercent = 75 } = req.body;
  if (!html || !html.trim()) {
    return res.status(400).json({ success: false, error: 'No HTML content provided to parse.' });
  }

  try {
    const parsedData = parseAttendanceContent(html, targetPercent);
    res.json({ success: true, data: parsedData });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// 6. Direct Profile Parser endpoint
app.post('/api/profile', (req, res) => {
  const { html } = req.body;
  if (!html) return res.status(400).json({ success: false, error: 'No profile HTML provided.' });
  const profile = parseStudentProfile(html);
  res.json({ success: !!profile, profile: profile || {} });
});

// 7. Proxy student avatar photos
app.get('/api/photo', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('No url');

  try {
    const imgRes = await axios.get(url, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Referer': 'https://sp.srmist.edu.in/srmiststudentportal/students/template/HRDSystem.jsp'
      },
      timeout: 10000
    });
    res.set('Content-Type', imgRes.headers['content-type'] || 'image/jpeg');
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(imgRes.data);
  } catch (e) {
    res.status(404).send('Photo unavailable');
  }
});

// 8. Get Demo Profile
app.get('/api/demo', (req, res) => {
  const targetPercent = Number(req.query.target) || 75;
  const data = recalculateMockData(targetPercent);
  res.json({ success: true, data });
});

// Robust Parser for SRMIST Attendance Tables
function parseAttendanceContent(content, targetPercent = 75, dynamicProfile = null) {
  if (typeof content === 'object') {
    return transformJsonAttendance(content, targetPercent);
  }

  const $ = cheerio.load(content);
  const courses = [];
  let studentInfo = { ...mockStudentData.student };

  // If a dynamic profile was fetched from studentProfile.jsp, apply it
  if (dynamicProfile && typeof dynamicProfile === 'object') {
    studentInfo = { ...studentInfo, ...dynamicProfile };
  } else {
    // Try to extract dynamic profile directly from pasted content
    const inlineProfile = parseStudentProfile(content);
    if (inlineProfile) {
      studentInfo = { ...studentInfo, ...inlineProfile };
    }
  }

  // 1. Try to extract student registration and name from page headers
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

  // 2. Locate the Attendance Table
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

      // Check if this row is the table header
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

      // Parse data rows
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

        // Fallback column guessing if exact headers weren't found
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

        // Validate valid course row
        if (conducted > 0 || (code && code.length >= 4 && !code.toLowerCase().includes('total'))) {
          // If absent was parsed but attended was not
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

  // If HTML table didn't yield courses, try parsing plain copied text
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

  // If table parsing found no valid rows
  if (courses.length === 0) {
    if (allowMockFallback) {
      return recalculateMockData(targetPercent);
    }
    throw new Error('No attendance records found in portal response. Please ensure you are logged in or try pasting your attendance table HTML directly.');
  }

  // Summary aggregation
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

if (process.env.NODE_ENV !== 'test' && !process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FlashMan SRM Attendance Server running on:`);
    console.log(`  Local:   http://localhost:${PORT}`);
    console.log(`  Network: http://10.3.192.27:${PORT}`);
  });
}

module.exports = app;
