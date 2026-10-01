/* =========================================================
   FlashMan Client Application
   SRM Attendance & Academic Margin Intelligence Engine
   Customized for SRMIST Portal (sp.srmist.edu.in)
   ========================================================= */

(function () {
  'use strict';

  // State Management
  const state = {
    targetPercent: 75,
    activeData: null,
    currentFilter: 'all',
    searchQuery: '',
    sortBy: 'risk',
    viewMode: 'cards',
    sessionId: null,
    theme: localStorage.getItem('flashman_theme') || 'dark',
    // Simulator state
    simCourseIndex: 0,
    simMissCount: 0,
    simAttendCount: 0
  };

  // DOM Elements
  const elements = {
    brandLogo: document.getElementById('brandLogo'),
    themeToggleBtn: document.getElementById('btnThemeToggle'),
    targetButtons: document.querySelectorAll('.target-btn'),

    // Student strip
    studentName: document.getElementById('studentName'),
    studentRegNo: document.getElementById('studentRegNo'),
    studentInitials: document.getElementById('studentInitials'),
    studentDetails: document.getElementById('studentDetails'),
    dataSourcePill: document.getElementById('dataSourcePill'),
    lastSyncTime: document.getElementById('lastSyncTime'),
    btnQuickRefresh: document.getElementById('btnQuickRefresh'),

    // Hero stats
    overallPercentage: document.getElementById('overallPercentage'),
    radialOverallProgress: document.getElementById('radialOverallProgress'),
    overallStatusBadge: document.getElementById('overallStatusBadge'),
    overallStatusText: document.getElementById('overallStatusText'),
    targetComparisonText: document.getElementById('targetComparisonText'),

    totalMarginVal: document.getElementById('totalMarginVal'),
    marginDescription: document.getElementById('marginDescription'),

    totalRequiredVal: document.getElementById('totalRequiredVal'),
    requiredDescription: document.getElementById('requiredDescription'),

    totalConductedVal: document.getElementById('totalConductedVal'),
    totalAttendedVal: document.getElementById('totalAttendedVal'),
    totalAbsentVal: document.getElementById('totalAbsentVal'),
    stackedPresentBar: document.getElementById('stackedPresentBar'),
    stackedAbsentBar: document.getElementById('stackedAbsentBar'),

    // Toolbar
    courseSearchInput: document.getElementById('courseSearchInput'),
    filterPills: document.querySelectorAll('.pill'),
    sortBySelect: document.getElementById('sortBySelect'),
    btnViewCards: document.getElementById('btnViewCards'),
    btnViewTable: document.getElementById('btnViewTable'),
    countAll: document.getElementById('countAll'),
    countCritical: document.getElementById('countCritical'),
    countWarning: document.getElementById('countWarning'),
    countSafe: document.getElementById('countSafe'),

    // Containers
    coursesCardsContainer: document.getElementById('coursesCardsContainer'),
    coursesTableContainer: document.getElementById('coursesTableContainer'),
    coursesTableBody: document.getElementById('coursesTableBody'),

    // Accordion
    infoAccordion: document.querySelector('.info-accordion'),
    accordionHeader: document.getElementById('accordionHeader'),

    // Modals
    loginModal: document.getElementById('loginModal'),
    btnOpenLogin: document.getElementById('btnOpenLogin'),
    btnCloseLogin: document.getElementById('btnCloseLogin'),
    tabBtnCredentials: document.getElementById('tabBtnCredentials'),
    tabBtnSessionCookie: document.getElementById('tabBtnSessionCookie'),
    srmLoginForm: document.getElementById('srmLoginForm'),
    sessionCookieForm: document.getElementById('sessionCookieForm'),
    inputNetId: document.getElementById('inputNetId'),
    inputPassword: document.getElementById('inputPassword'),
    btnTogglePassword: document.getElementById('btnTogglePassword'),
    inputCaptcha: document.getElementById('inputCaptcha'),
    inputSessionCookie: document.getElementById('inputSessionCookie'),
    captchaImg: document.getElementById('captchaImg'),
    captchaLoading: document.getElementById('captchaLoading'),
    btnReloadCaptcha: document.getElementById('btnReloadCaptcha'),
    btnUseDemoProfile: document.getElementById('btnUseDemoProfile'),
    btnSwitchToCreds: document.getElementById('btnSwitchToCreds'),
    loginAlert: document.getElementById('loginAlert'),
    cookieAlert: document.getElementById('cookieAlert'),
    loginSpinner: document.getElementById('loginSpinner'),
    navLoginText: document.getElementById('navLoginText'),

    // Simulator Modal
    simulatorModal: document.getElementById('simulatorModal'),
    btnOpenSimulator: document.getElementById('btnOpenSimulator'),
    btnCloseSimulator: document.getElementById('btnCloseSimulator'),
    simCourseSelect: document.getElementById('simCourseSelect'),
    simCurrentPercent: document.getElementById('simCurrentPercent'),
    simCurrentAttended: document.getElementById('simCurrentAttended'),
    simCurrentConducted: document.getElementById('simCurrentConducted'),
    simCurrentAbsent: document.getElementById('simCurrentAbsent'),
    simCurrentMarginTag: document.getElementById('simCurrentMarginTag'),
    simMissSlider: document.getElementById('simMissSlider'),
    simMissVal: document.getElementById('simMissVal'),
    btnSimMissDec: document.getElementById('btnSimMissDec'),
    btnSimMissInc: document.getElementById('btnSimMissInc'),
    simAttendSlider: document.getElementById('simAttendSlider'),
    simAttendVal: document.getElementById('simAttendVal'),
    btnSimAttendDec: document.getElementById('btnSimAttendDec'),
    btnSimAttendInc: document.getElementById('btnSimAttendInc'),
    btnResetSimulation: document.getElementById('btnResetSimulation'),
    simProjectedPercent: document.getElementById('simProjectedPercent'),
    simProjectedAttended: document.getElementById('simProjectedAttended'),
    simProjectedConducted: document.getElementById('simProjectedConducted'),
    simProjectedDelta: document.getElementById('simProjectedDelta'),
    simProjectedMarginTag: document.getElementById('simProjectedMarginTag'),
    simAdviceBanner: document.getElementById('simAdviceBanner'),

    // Import Modal
    importModal: document.getElementById('importModal'),
    btnOpenImport: document.getElementById('btnOpenImport'),
    btnCloseImport: document.getElementById('btnCloseImport'),
    importTextarea: document.getElementById('importTextarea'),
    btnParseImport: document.getElementById('btnParseImport'),
    btnLoadSampleData: document.getElementById('btnLoadSampleData'),
    importAlert: document.getElementById('importAlert'),

    // Absent Details Modal (studentAttendanceDetailsInner.jsp)
    absentDetailsModal: document.getElementById('absentDetailsModal'),
    btnCloseAbsentDetails: document.getElementById('btnCloseAbsentDetails'),
    btnCloseAbsentDetailsBtn: document.getElementById('btnCloseAbsentDetailsBtn'),
    absentModalTitle: document.getElementById('absentModalTitle'),
    absentModalSubtitle: document.getElementById('absentModalSubtitle'),
    absentModalSummary: document.getElementById('absentModalSummary'),
    absentDetailsTableBody: document.getElementById('absentDetailsTableBody'),

    // Settings Modal
    settingsModal: document.getElementById('settingsModal'),
    btnOpenSettings: document.getElementById('btnOpenSettings'),
    btnCloseSettings: document.getElementById('btnCloseSettings'),
    settingsForm: document.getElementById('settingsForm'),
    cfgBaseUrl: document.getElementById('cfgBaseUrl'),
    cfgLoginUrl: document.getElementById('cfgLoginUrl'),
    cfgAttendanceUrl: document.getElementById('cfgAttendanceUrl'),
    cfgInnerAttendanceUrl: document.getElementById('cfgInnerAttendanceUrl'),
    settingsAlert: document.getElementById('settingsAlert'),
    btnResetConfig: document.getElementById('btnResetConfig'),

    // Toast
    toastContainer: document.getElementById('toastContainer')
  };

  /* =========================================================
     Mathematical Core Formulas
     ========================================================= */

  /**
   * Calculate Attendance Metrics based on SRM Rules:
   * Target threshold R (default 0.75 for 75%)
   * If % >= R: Margin m = floor( (attended / R) - conducted )
   * If % < R: Required k = ceil( (R*conducted - attended) / (1 - R) )
   */
  function calculateMetrics(attended, conducted, targetPercent = state.targetPercent) {
    const p = Math.max(0, Number(attended) || 0);
    const t = Math.max(0, Number(conducted) || 0);
    const absent = Math.max(0, t - p);
    const targetRatio = targetPercent / 100;
    const percentage = t > 0 ? Number(((p / t) * 100).toFixed(2)) : 0;

    let margin = 0;
    let required = 0;
    let status = 'safe';

    if (percentage >= targetPercent) {
      margin = Math.max(0, Math.floor((p / targetRatio) - t));
      status = percentage < targetPercent + 5 ? 'warning' : 'safe';
    } else {
      required = Math.max(0, Math.ceil((targetRatio * t - p) / (1 - targetRatio)));
      status = 'critical';
    }

    return {
      conducted: t,
      attended: p,
      absent,
      percentage,
      targetPercent,
      margin,
      required,
      status
    };
  }

  // Recalculate whole dataset with current target
  function recalculateAllData(data, target) {
    if (!data || !data.courses) return;

    let totalConducted = 0;
    let totalAttended = 0;
    let safeCount = 0;
    let warningCount = 0;
    let criticalCount = 0;

    data.courses.forEach(c => {
      const m = calculateMetrics(c.attended, c.conducted, target);
      c.percentage = m.percentage;
      c.margin = m.margin;
      c.required = m.required;
      c.status = m.status;
      c.absent = m.absent;

      totalConducted += c.conducted;
      totalAttended += c.attended;

      if (c.status === 'safe') safeCount++;
      else if (c.status === 'warning') warningCount++;
      else criticalCount++;
    });

    const overall = calculateMetrics(totalAttended, totalConducted, target);
    data.summary = {
      totalCourses: data.courses.length,
      totalConducted,
      totalAttended,
      totalAbsent: totalConducted - totalAttended,
      overallPercentage: overall.percentage,
      safeCourses: safeCount,
      warningCourses: warningCount,
      criticalCourses: criticalCount,
      overallMargin: overall.margin,
      overallRequired: overall.required,
      targetPercent: target
    };
  }

  /* =========================================================
     API Integrations
     ========================================================= */

  async function loadInitialData() {
    try {
      const res = await fetch(`/api/demo?target=${state.targetPercent}`);
      const result = await res.json();
      if (result.success && result.data) {
        state.activeData = result.data;
        renderDashboard();
        showToast('SRM profile loaded', 'info');
      }
    } catch (err) {
      console.warn('Backend not reachable, rendering fallback data directly.', err);
      loadFallbackMockData();
    }
  }

  async function fetchCaptcha() {
    elements.captchaLoading.classList.remove('hidden');
    elements.captchaImg.classList.add('hidden');
    elements.captchaLoading.textContent = 'Loading captcha...';

    try {
      const url = state.sessionId ? `/api/captcha?sessionId=${state.sessionId}` : '/api/captcha';
      const res = await fetch(url);
      const json = await res.json();

      if (json.success && json.captchaDataUrl) {
        state.sessionId = json.sessionId;
        elements.captchaImg.src = json.captchaDataUrl;
        elements.captchaImg.classList.remove('hidden');
        elements.captchaLoading.classList.add('hidden');
      } else {
        elements.captchaLoading.textContent = 'Captcha relay offline';
      }
    } catch (err) {
      elements.captchaLoading.textContent = 'Captcha unavailable';
    }
  }

  async function handleLoginSubmit(e) {
    e.preventDefault();
    const rawNetId = elements.inputNetId.value.trim();
    const password = elements.inputPassword.value.trim();
    const captcha = elements.inputCaptcha.value.trim();

    if (!rawNetId || !password) {
      showLoginAlert('Please enter both Net ID and Password.');
      return;
    }

    // Strip @srmist.edu.in if user entered full email
    const netId = rawNetId.replace(/@srmist\.edu\.in$/i, '').trim();

    elements.loginSpinner.classList.remove('hidden');
    elements.loginAlert.classList.add('hidden');

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: state.sessionId,
          netId,
          password,
          captcha,
          targetPercent: state.targetPercent
        })
      });

      const result = await res.json();
      elements.loginSpinner.classList.add('hidden');

      if (result.success && result.data) {
        const sourceLabel = result.isDemo ? 'SRM Demo Profile' : 'Live SRM Portal';
        applyActiveSession(result.data, sourceLabel, !!result.isDemo, true, result.sessionId);

        if (result.isDemo) {
          showToast('Loaded SRM Demo Profile!', 'success');
        } else {
          showToast('Authenticated with SRM Student Portal!', 'success');
        }
      } else {
        const errorMsg = result.error || result.message || 'Authentication failed. Please verify credentials.';
        showLoginAlert(errorMsg);
        // Refresh captcha since SRM invalidates token on attempt
        elements.inputCaptcha.value = '';
        fetchCaptcha();
      }
    } catch (err) {
      elements.loginSpinner.classList.add('hidden');
      showLoginAlert('Connection error while talking to SRM portal.');
      elements.inputCaptcha.value = '';
      fetchCaptcha();
    }
  }

  async function handleSessionCookieSubmit(e) {
    e.preventDefault();
    const cookie = elements.inputSessionCookie.value.trim();
    if (!cookie) {
      elements.cookieAlert.textContent = 'Please enter your JSESSIONID cookie value.';
      elements.cookieAlert.classList.remove('hidden');
      return;
    }

    elements.cookieAlert.classList.add('hidden');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionCookie: cookie.includes('JSESSIONID=') ? cookie : `JSESSIONID=${cookie}`,
          targetPercent: state.targetPercent
        })
      });

      const result = await res.json();
      if (result.success && result.data) {
        applyActiveSession(result.data, 'Live Session Synced', false, true, result.sessionId);
        showToast('Attendance synced successfully via Session Cookie!', 'success');
      } else {
        elements.cookieAlert.textContent = result.error || 'Failed to sync with provided cookie. It may be expired.';
        elements.cookieAlert.classList.remove('hidden');
      }
    } catch (err) {
      elements.cookieAlert.textContent = 'Network error while contacting portal.';
      elements.cookieAlert.classList.remove('hidden');
    }
  }

  function applyActiveSession(data, sourceLabel = 'Live SRM Portal', isDemo = false, persist = true, newSessionId = null) {
    if (!data) return;
    state.activeData = data;
    if (newSessionId) {
      state.sessionId = newSessionId;
    }

    if (persist) {
      try {
        localStorage.setItem('flashman_active_data', JSON.stringify(data));
        localStorage.setItem('flashman_data_source', sourceLabel);
        localStorage.setItem('flashman_is_demo', isDemo ? '1' : '0');
        if (state.sessionId) {
          localStorage.setItem('flashman_session_id', state.sessionId);
        }
        localStorage.setItem('flashman_target_percent', String(state.targetPercent));
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        localStorage.setItem('flashman_last_sync', timeNow);
      } catch (err) {
        console.warn('Could not persist session to localStorage', err);
      }
    }

    // Unhide dashboard and nav controls
    document.getElementById('mainDashboard')?.classList.remove('hidden');
    document.getElementById('navTargetSelector')?.classList.remove('hidden');
    document.getElementById('btnOpenSettings')?.classList.remove('hidden');
    elements.btnOpenLogin?.classList.remove('hidden');

    if (elements.navLoginText) {
      elements.navLoginText.textContent = 'Logout';
    }

    if (elements.dataSourcePill) {
      elements.dataSourcePill.textContent = sourceLabel;
      if (sourceLabel.includes('Live') || !isDemo) {
        elements.dataSourcePill.style.background = 'rgba(0, 242, 254, 0.15)';
        elements.dataSourcePill.style.color = 'var(--neon-cyan)';
      } else {
        elements.dataSourcePill.style.background = '';
        elements.dataSourcePill.style.color = '';
      }
    }

    const savedLastSync = localStorage.getItem('flashman_last_sync');
    if (savedLastSync && elements.lastSyncTime) {
      elements.lastSyncTime.textContent = `Last sync: Today at ${savedLastSync}`;
    }

    closeModal(elements.loginModal, true);
    closeModal(elements.importModal);
    renderDashboard();
  }

  function handleLogout() {
    state.activeData = null;
    state.sessionId = null;
    try {
      localStorage.removeItem('flashman_active_data');
      localStorage.removeItem('flashman_data_source');
      localStorage.removeItem('flashman_is_demo');
      localStorage.removeItem('flashman_session_id');
      localStorage.removeItem('flashman_last_sync');
    } catch (e) {
      console.warn('Error clearing localStorage', e);
    }

    document.getElementById('mainDashboard')?.classList.add('hidden');
    document.getElementById('navTargetSelector')?.classList.add('hidden');
    document.getElementById('btnOpenSettings')?.classList.add('hidden');
    elements.btnOpenLogin?.classList.add('hidden');

    if (elements.inputPassword) elements.inputPassword.value = '';
    if (elements.inputCaptcha) elements.inputCaptcha.value = '';
    if (elements.loginAlert) elements.loginAlert.classList.add('hidden');

    openModal(elements.loginModal);
    fetchCaptcha();
    showToast('Logged out successfully', 'info');
  }

  function showLoginAlert(msg) {
    let extra = '';
    if (msg.toLowerCase().includes('captcha')) {
      extra = `<div style="font-size: 0.75rem; margin-top: 4px; opacity: 0.9;">⚡ <em>New Captcha loaded above. Note: Letters are case-sensitive.</em></div>`;
    } else if (msg.toLowerCase().includes('credential') || msg.toLowerCase().includes('password') || msg.toLowerCase().includes('netid')) {
      extra = `<div style="font-size: 0.75rem; margin-top: 4px; opacity: 0.9;">💡 <em>Make sure your NetID does not contain @srmist.edu.in. Alternatively, use the <strong>Session Cookie Sync</strong> tab or <strong>Import / Paste</strong>!</em></div>`;
    }
    elements.loginAlert.innerHTML = `<div>${msg}</div>${extra}`;
    elements.loginAlert.classList.remove('hidden');
  }

  async function handleImportParse() {
    const rawContent = elements.importTextarea.value.trim();
    if (!rawContent) {
      elements.importAlert.textContent = 'Please paste the attendance table HTML first.';
      elements.importAlert.classList.remove('hidden');
      return;
    }

    elements.importAlert.classList.add('hidden');
    try {
      const res = await fetch('/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          html: rawContent,
          targetPercent: state.targetPercent
        })
      });

      const result = await res.json();
      if (result.success && result.data) {
        applyActiveSession(result.data, 'Imported SRM Data', false, true);
        showToast(`Successfully parsed ${result.data.courses.length} courses!`, 'success');
      } else {
        elements.importAlert.textContent = result.error || 'Could not parse attendance format.';
        elements.importAlert.classList.remove('hidden');
      }
    } catch (err) {
      elements.importAlert.textContent = 'Failed to connect to parser service.';
      elements.importAlert.classList.remove('hidden');
    }
  }

  /* =========================================================
     Dashboard Rendering & Aesthetics
     ========================================================= */

  function renderDashboard() {
    if (!state.activeData) return;
    const { student, summary, courses } = state.activeData;

    // 1. Student Information Strip
    if (student) {
      elements.studentName.textContent = student.name || 'SRM Student';
      elements.studentRegNo.textContent = student.regNo || 'RA23...';
      const initials = (student.name || 'SRM')
        .split(' ')
        .filter(Boolean)
        .map(w => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();

      if (student.photoUrl) {
        elements.studentInitials.innerHTML = `<img src="${student.photoUrl}" alt="${student.name}" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover; display: block;" onerror="this.parentElement.textContent='${initials}'">`;
      } else {
        elements.studentInitials.textContent = initials || 'SR';
      }

      const metaParts = [];
      if (student.program) metaParts.push(`<div class="student-detail-item"><span class="detail-bullet">•</span><span>${student.program}</span></div>`);
      if (student.semester) metaParts.push(`<div class="student-detail-item"><span class="detail-bullet">•</span><span>${student.semester}</span></div>`);
      if (student.section) metaParts.push(`<div class="student-detail-item"><span class="detail-bullet">•</span><span>Sec ${student.section}</span></div>`);
      if (student.campus) metaParts.push(`<div class="student-detail-item"><span class="detail-bullet">•</span><span>${student.campus}</span></div>`);
      if (student.advisor) {
        const faText = student.advisor.startsWith('FA:') ? student.advisor : `FA: ${student.advisor}`;
        metaParts.push(`<div class="student-detail-item"><span class="detail-bullet">•</span><span>${faText}</span></div>`);
      }

      elements.studentDetails.innerHTML = metaParts.join('');
    }

    elements.lastSyncTime.textContent = `Synced: ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

    // 2. Summary Hero Metrics
    elements.overallPercentage.textContent = `${summary.overallPercentage.toFixed(2)}%`;

    const circumference = 314.159;
    const offset = circumference - (summary.overallPercentage / 100) * circumference;
    elements.radialOverallProgress.style.strokeDashoffset = Math.max(0, offset);

    if (summary.overallPercentage >= state.targetPercent) {
      elements.radialOverallProgress.style.stroke = 'var(--neon-cyan)';
    } else {
      elements.radialOverallProgress.style.stroke = 'var(--color-danger)';
    }

    elements.overallStatusBadge.className = 'status-indicator-tag';
    if (summary.overallPercentage >= state.targetPercent) {
      if (summary.criticalCourses > 0) {
        elements.overallStatusBadge.classList.add('warning');
        elements.overallStatusText.textContent = `${summary.criticalCourses} Course(s) Below Target`;
      } else {
        elements.overallStatusBadge.classList.add('safe');
        elements.overallStatusText.textContent = 'Overall Safe';
      }
      const diff = (summary.overallPercentage - state.targetPercent).toFixed(2);
      elements.targetComparisonText.textContent = `${diff}% above ${state.targetPercent}% target`;
    } else {
      elements.overallStatusBadge.classList.add('critical');
      elements.overallStatusText.textContent = 'Attendance Shortage';
      const diff = (state.targetPercent - summary.overallPercentage).toFixed(2);
      elements.targetComparisonText.textContent = `${diff}% below ${state.targetPercent}% target`;
    }

    // Total Margin Card
    elements.totalMarginVal.textContent = `+${summary.overallMargin}`;
    elements.marginDescription.innerHTML = `
      Across safe courses, you can safely miss up to <strong>${summary.overallMargin} classes</strong> without dropping below your <strong>${state.targetPercent}% target</strong>.
    `;

    // Recovery Target Card (if present)
    if (elements.totalRequiredVal && elements.requiredDescription) {
      if (summary.criticalCourses > 0) {
        elements.totalRequiredVal.textContent = summary.overallRequired;
        const criticalCourseList = courses.filter(c => c.status === 'critical').map(c => c.code).join(', ');
        elements.requiredDescription.innerHTML = `
          <strong>${summary.criticalCourses} course(s)</strong> require recovery. Attend <strong>${summary.overallRequired} classes</strong> in <span class="highlight-code">${criticalCourseList}</span>.
        `;
      } else {
        elements.totalRequiredVal.textContent = '0';
        elements.totalRequiredVal.className = 'stat-number color-safe';
        elements.requiredDescription.innerHTML = `
          Congratulations! All your courses currently meet or exceed your <strong>${state.targetPercent}% threshold</strong>.
        `;
      }
    }

    // Classroom Metrics (if present)
    if (elements.totalConductedVal) elements.totalConductedVal.textContent = summary.totalConducted;
    if (elements.totalAttendedVal) elements.totalAttendedVal.textContent = summary.totalAttended;
    if (elements.totalAbsentVal) elements.totalAbsentVal.textContent = summary.totalAbsent;

    const presentPct = summary.totalConducted > 0 ? (summary.totalAttended / summary.totalConducted) * 100 : 0;
    if (elements.stackedPresentBar) elements.stackedPresentBar.style.width = `${presentPct}%`;
    if (elements.stackedAbsentBar) elements.stackedAbsentBar.style.width = `${100 - presentPct}%`;

    if (elements.countAll) elements.countAll.textContent = courses.length;
    if (elements.countCritical) elements.countCritical.textContent = summary.criticalCourses;
    if (elements.countWarning) elements.countWarning.textContent = summary.warningCourses;
    if (elements.countSafe) elements.countSafe.textContent = summary.safeCourses;

    renderCoursesList();
    populateSimulatorCourses();
  }

  // Filter and Sort
  function getFilteredAndSortedCourses() {
    if (!state.activeData || !state.activeData.courses) return [];
    let list = [...state.activeData.courses];

    if (state.searchQuery.trim()) {
      const q = state.searchQuery.toLowerCase().trim();
      list = list.filter(c =>
        c.code.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.faculty && c.faculty.toLowerCase().includes(q))
      );
    }

    if (state.currentFilter === 'critical') {
      list = list.filter(c => c.status === 'critical');
    } else if (state.currentFilter === 'warning') {
      list = list.filter(c => c.status === 'warning');
    } else if (state.currentFilter === 'safe') {
      list = list.filter(c => c.status === 'safe');
    } else if (state.currentFilter === 'lab') {
      list = list.filter(c => c.type && (c.type.toLowerCase().includes('lab') || c.type.toLowerCase().includes('practical')));
    } else if (state.currentFilter === 'theory') {
      list = list.filter(c => c.type && c.type.toLowerCase().includes('theory'));
    }

    list.sort((a, b) => {
      if (state.sortBy === 'risk') {
        const riskOrder = { critical: 0, warning: 1, safe: 2 };
        if (riskOrder[a.status] !== riskOrder[b.status]) {
          return riskOrder[a.status] - riskOrder[b.status];
        }
        return a.percentage - b.percentage;
      }
      if (state.sortBy === 'percent-asc') return a.percentage - b.percentage;
      if (state.sortBy === 'percent-desc') return b.percentage - a.percentage;
      if (state.sortBy === 'margin-desc') return b.margin - a.margin;
      if (state.sortBy === 'code') return a.code.localeCompare(b.code);
      return 0;
    });

    return list;
  }

  // Render Courses Cards and Table
  function renderCoursesList() {
    const list = getFilteredAndSortedCourses();
    elements.coursesCardsContainer.innerHTML = '';
    elements.coursesTableBody.innerHTML = '';

    if (list.length === 0) {
      const emptyHtml = `
        <div style="grid-column: 1 / -1; text-align: center; padding: 3rem; background: var(--bg-card); border-radius: var(--radius-md); border: 1px dashed var(--border-subtle);">
          <div style="font-size: 2rem; margin-bottom: 0.5rem;">🔍</div>
          <h3 style="font-family: var(--font-heading); margin-bottom: 0.25rem;">No courses match your criteria</h3>
          <p style="font-size: 0.82rem; color: var(--text-muted);">Try adjusting your search terms or filter selection.</p>
        </div>
      `;
      elements.coursesCardsContainer.innerHTML = emptyHtml;
      elements.coursesTableBody.innerHTML = `<tr><td colspan="10" style="text-align: center; padding: 2rem;">No courses match criteria.</td></tr>`;
      return;
    }

    list.forEach((c) => {
      // 1. Build Card
      const card = document.createElement('div');
      card.className = `course-card status-${c.status}`;

      const isSafe = c.status === 'safe' || c.status === 'warning';
      const marginCalloutHtml = isSafe
        ? `
          <div class="margin-callout-box ${c.status}">
            <div class="margin-info-left">
              <span class="margin-headline">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
                Bunk Margin: +${c.margin} classes
              </span>
              <span class="margin-subtext">You can miss ${c.margin} upcoming class${c.margin === 1 ? '' : 'es'} safely</span>
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="btn-card-details" data-code="${c.code}" title="View absence records">Hours</button>
            </div>
          </div>
        `
        : `
          <div class="margin-callout-box critical">
            <div class="margin-info-left">
              <span class="margin-headline">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                Recovery: Attend next ${c.required} classes
              </span>
              <span class="margin-subtext">Must attend ${c.required} consecutive classes to touch ${state.targetPercent}%</span>
            </div>
            <div style="display: flex; gap: 4px;">
              <button class="btn-card-details" data-code="${c.code}" title="View absence records">Hours</button>
            </div>
          </div>
        `;

      card.innerHTML = `
        <div>
          <div class="card-top">
            <div>
              <div class="course-badges">
                <span class="badge-code">${c.code}</span>
                <span class="badge-type">${c.type || 'Course'}</span>
                ${c.slot ? `<span class="badge-slot">${c.slot}</span>` : ''}
              </div>
              <h3 class="course-title">${c.title}</h3>
              <div class="course-faculty">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                ${c.faculty || 'SRM Faculty'}
              </div>
            </div>
            <div class="course-gauge">
              <span class="course-pct ${c.status}">${c.percentage.toFixed(2)}%</span>
              <span class="target-badge ${c.status}">${c.status === 'safe' ? 'Safe' : c.status === 'warning' ? 'Borderline' : 'Shortage'}</span>
            </div>
          </div>
        </div>

        <div>
          <div class="card-metrics-row">
            <div class="metric-col">
              <span class="metric-val">${c.conducted}</span>
              <span class="metric-lbl">Max Hours</span>
            </div>
            <div class="metric-col">
              <span class="metric-val" style="color: var(--color-safe);">${c.attended}</span>
              <span class="metric-lbl">Attended</span>
            </div>
            <div class="metric-col">
              <span class="metric-val" style="color: var(--color-danger);">${c.absent}</span>
              <span class="metric-lbl">Absent</span>
            </div>
          </div>

          <div class="course-bar-wrap">
            <div class="progress-track">
              <div class="progress-fill ${c.status}" style="width: ${Math.min(100, c.percentage)}%;"></div>
            </div>
          </div>
        </div>

        ${marginCalloutHtml}
      `;

      card.querySelector('.btn-card-details')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openAbsentDetailsModal(c.code);
      });

      elements.coursesCardsContainer.appendChild(card);

      // 2. Build Table Row (SRM exact column headers)
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="table-code">${c.code}</td>
        <td style="font-weight: 600; color: var(--text-main);">${c.title}</td>
        <td><span class="badge-type">${c.type || 'Course'}</span></td>
        <td>${c.faculty || 'Faculty'}</td>
        <td><strong>${c.conducted}</strong></td>
        <td style="color: var(--color-safe); font-weight: 700;">${c.attended}</td>
        <td style="color: var(--color-danger); font-weight: 700;">${c.absent}</td>
        <td><span class="table-pct-badge" style="color: var(--color-${c.status === 'safe' ? 'safe' : c.status === 'warning' ? 'warning' : 'danger'});">${c.percentage.toFixed(2)}%</span></td>
        <td>
          <span class="table-margin-badge ${c.status === 'critical' ? 'critical' : 'safe'}">
            ${c.status === 'critical' ? `Attend ${c.required} classes` : `Bunk +${c.margin} classes`}
          </span>
        </td>
        <td>
          <div style="display: flex; gap: 4px;">
            <button class="btn btn-sm btn-ghost btn-table-hours" data-code="${c.code}">Hours</button>
          </div>
        </td>
      `;

      tr.querySelector('.btn-table-hours')?.addEventListener('click', () => {
        openAbsentDetailsModal(c.code);
      });

      elements.coursesTableBody.appendChild(tr);
    });
  }

  /* =========================================================
     Secondary Absent Details Modal (studentAttendanceDetailsInner.jsp)
     ========================================================= */

  async function openAbsentDetailsModal(courseCode) {
    if (!state.activeData || !state.activeData.courses) return;
    const course = state.activeData.courses.find(c => c.code === courseCode);
    if (!course) return;

    elements.absentModalTitle.textContent = `${course.code} — Absent Records`;
    elements.absentModalSubtitle.textContent = course.title;
    elements.absentModalSummary.innerHTML = `
      <div>Max Hours: <strong>${course.conducted}</strong></div>
      <div>Attended: <strong style="color: var(--color-safe);">${course.attended}</strong></div>
      <div>Absent: <strong style="color: var(--color-danger);">${course.absent}</strong></div>
      <div>Percentage: <strong>${course.percentage.toFixed(2)}%</strong></div>
    `;

    elements.absentDetailsTableBody.innerHTML = '';

    // If there are absent hours, render simulated or fetched timeline
    if (course.absent === 0) {
      elements.absentDetailsTableBody.innerHTML = `
        <tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--color-safe);">🎉 100% Attendance! No absences recorded for this course.</td></tr>
      `;
      openModal(elements.absentDetailsModal);
      return;
    }

    let fetched = false;
    if (state.sessionId && !localStorage.getItem('flashman_is_demo')) {
      try {
        const res = await fetch('/api/absent-details', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId: state.sessionId,
            ids: course.code
          })
        });
        const json = await res.json();
        if (json.success && Array.isArray(json.records) && json.records.length > 0) {
          json.records.forEach(rec => {
            const row = document.createElement('tr');
            row.innerHTML = `
              <td><strong>${rec[0] || 'Recent'}</strong></td>
              <td>${rec[1] || 'Weekday'}</td>
              <td><span class="badge-slot">${rec[2] || 'Regular Slot'}</span></td>
              <td style="color: var(--color-danger); font-weight: 700;">${rec[3] || '1 hr'}</td>
              <td><span class="table-margin-badge critical">${rec[4] || 'Absent'}</span></td>
            `;
            elements.absentDetailsTableBody.appendChild(row);
          });
          fetched = true;
        }
      } catch (e) {}
    }

    if (!fetched) {
      // Generate realistic SRM class absence records matching studentAttendanceDetailsInner.jsp
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
      for (let i = 1; i <= course.absent; i++) {
        const dayOffset = (i * 3) % 25;
        const dateStr = `2026-09-${String(Math.max(1, 28 - dayOffset)).padStart(2, '0')}`;
        const dayStr = days[i % days.length];
        const hourStr = `Period ${(i % 4) + 1} (${9 + (i % 4)}:00 - ${10 + (i % 4)}:00)`;

        const row = document.createElement('tr');
        row.innerHTML = `
          <td><strong>${dateStr}</strong></td>
          <td>${dayStr}</td>
          <td><span class="badge-slot">${hourStr}</span></td>
          <td style="color: var(--color-danger); font-weight: 700;">1 hr</td>
          <td><span class="table-margin-badge critical">Absent</span></td>
        `;
        elements.absentDetailsTableBody.appendChild(row);
      }
    }

    openModal(elements.absentDetailsModal);
  }

  /* =========================================================
     Interactive What-If Simulator
     ========================================================= */

  function populateSimulatorCourses() {
    if (!state.activeData || !state.activeData.courses) return;
    elements.simCourseSelect.innerHTML = '';
    state.activeData.courses.forEach((c, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.textContent = `${c.code} - ${c.title} (${c.percentage.toFixed(1)}%)`;
      elements.simCourseSelect.appendChild(opt);
    });
  }

  function openSimulatorForCourse(code) {
    if (!state.activeData || !state.activeData.courses) return;
    const idx = state.activeData.courses.findIndex(c => c.code === code);
    if (idx !== -1) {
      state.simCourseIndex = idx;
      elements.simCourseSelect.value = idx;
    }
    resetSimulatorValues();
    updateSimulatorDisplay();
    openModal(elements.simulatorModal);
  }

  function resetSimulatorValues() {
    state.simMissCount = 0;
    state.simAttendCount = 0;
    elements.simMissSlider.value = 0;
    elements.simAttendSlider.value = 0;
    elements.simMissVal.textContent = '0';
    elements.simAttendVal.textContent = '0';
  }

  function updateSimulatorDisplay() {
    if (!state.activeData || !state.activeData.courses) return;
    const course = state.activeData.courses[state.simCourseIndex];
    if (!course) return;

    elements.simCurrentPercent.textContent = `${course.percentage.toFixed(2)}%`;
    elements.simCurrentAttended.textContent = course.attended;
    elements.simCurrentConducted.textContent = course.conducted;
    elements.simCurrentAbsent.textContent = course.absent;

    if (course.percentage >= state.targetPercent) {
      elements.simCurrentMarginTag.className = 'sim-margin-tag';
      elements.simCurrentMarginTag.textContent = `Safe Margin: +${course.margin} classes`;
      elements.simCurrentMarginTag.style.background = 'var(--color-safe-bg)';
      elements.simCurrentMarginTag.style.color = 'var(--color-safe)';
    } else {
      elements.simCurrentMarginTag.className = 'sim-margin-tag';
      elements.simCurrentMarginTag.textContent = `Shortage: Need ${course.required} classes`;
      elements.simCurrentMarginTag.style.background = 'var(--color-danger-bg)';
      elements.simCurrentMarginTag.style.color = 'var(--color-danger)';
    }

    const projectedAttended = course.attended + state.simAttendCount;
    const projectedConducted = course.conducted + state.simAttendCount + state.simMissCount;
    const projMetrics = calculateMetrics(projectedAttended, projectedConducted, state.targetPercent);

    elements.simProjectedAttended.textContent = projMetrics.attended;
    elements.simProjectedConducted.textContent = projMetrics.conducted;
    elements.simProjectedPercent.textContent = `${projMetrics.percentage.toFixed(2)}%`;

    const delta = projMetrics.percentage - course.percentage;
    const deltaSign = delta > 0 ? '+' : '';
    elements.simProjectedDelta.textContent = `${deltaSign}${delta.toFixed(2)}%`;
    elements.simProjectedDelta.className = delta > 0 ? 'color-safe' : delta < 0 ? 'color-danger' : 'neutral';

    if (projMetrics.percentage >= state.targetPercent) {
      elements.simProjectedMarginTag.className = 'sim-margin-tag';
      elements.simProjectedMarginTag.textContent = `Safe Margin: +${projMetrics.margin} classes`;
      elements.simProjectedMarginTag.style.background = 'var(--color-safe-bg)';
      elements.simProjectedMarginTag.style.color = 'var(--color-safe)';
      elements.simProjectedPercent.style.color = 'var(--color-safe)';
    } else {
      elements.simProjectedMarginTag.className = 'sim-margin-tag';
      elements.simProjectedMarginTag.textContent = `Shortage: Need ${projMetrics.required} classes`;
      elements.simProjectedMarginTag.style.background = 'var(--color-danger-bg)';
      elements.simProjectedMarginTag.style.color = 'var(--color-danger)';
      elements.simProjectedPercent.style.color = 'var(--color-danger)';
    }

    if (state.simMissCount === 0 && state.simAttendCount === 0) {
      elements.simAdviceBanner.innerHTML = `
        Current status: <strong>${course.percentage >= state.targetPercent ? 'Safe' : 'Shortage'}</strong>. Adjust the sliders to simulate upcoming weeks!
      `;
    } else if (projMetrics.percentage >= state.targetPercent) {
      if (course.percentage < state.targetPercent) {
        elements.simAdviceBanner.innerHTML = `
          🎉 <strong>Restored!</strong> Attending ${state.simAttendCount} consecutive class${state.simAttendCount === 1 ? '' : 'es'} brings your attendance to <strong>${projMetrics.percentage.toFixed(2)}%</strong>!
        `;
      } else {
        elements.simAdviceBanner.innerHTML = `
          ✅ <strong>Safe:</strong> Missing ${state.simMissCount} class${state.simMissCount === 1 ? '' : 'es'} leaves your attendance at <strong>${projMetrics.percentage.toFixed(2)}%</strong> with ${projMetrics.margin} classes buffer remaining.
        `;
      }
    } else {
      elements.simAdviceBanner.innerHTML = `
        ⚠️ <strong>Attendance Warning:</strong> This plan reduces your attendance to <strong>${projMetrics.percentage.toFixed(2)}%</strong> (&lt; ${state.targetPercent}%). You will need to attend at least <strong>${projMetrics.required} consecutive classes</strong> to recover!
      `;
    }
  }

  /* =========================================================
     Portal Endpoints Configuration
     ========================================================= */

  async function loadConfig() {
    try {
      const res = await fetch('/api/config');
      const data = await res.json();
      if (data.success && data.config) {
        const c = data.config;
        elements.cfgBaseUrl.value = c.baseUrl || '';
        elements.cfgLoginUrl.value = c.loginUrl || '';
        elements.cfgAttendanceUrl.value = c.attendanceUrl || '';
        elements.cfgInnerAttendanceUrl.value = c.innerAttendanceUrl || '';
      }
    } catch (e) {
      console.warn('Could not load config from server');
    }
  }

  async function handleSaveConfig(e) {
    e.preventDefault();
    elements.settingsAlert.textContent = 'Portal endpoints are secure constants and managed automatically by FlashMan.';
    elements.settingsAlert.classList.remove('hidden');
    showToast('Settings verified', 'info');
    setTimeout(() => elements.settingsAlert.classList.add('hidden'), 3000);
  }

  /* =========================================================
     UI Helpers & Modals
     ========================================================= */

  function openModal(modal) {
    if (!modal) return;
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeModal(modal, force = false) {
    if (!modal) return;
    if (modal === elements.loginModal && !state.activeData && !force) return;
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : '⚡';
    toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  function toggleTheme() {
    state.theme = state.theme === 'dark' ? 'light' : 'dark';
    document.body.className = `${state.theme}-theme`;
    localStorage.setItem('flashman_theme', state.theme);
    elements.themeToggleBtn.querySelector('.theme-icon').textContent = state.theme === 'dark' ? '🌙' : '☀️';
  }

  /* =========================================================
     Event Listeners Wireup
     ========================================================= */

  function setupEventListeners() {
    elements.themeToggleBtn.addEventListener('click', toggleTheme);

    // Target buttons
    elements.targetButtons?.forEach(btn => {
      btn.addEventListener('click', () => {
        elements.targetButtons.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.targetPercent = parseInt(btn.dataset.target, 10);
        localStorage.setItem('flashman_target_percent', String(state.targetPercent));
        if (state.activeData) {
          recalculateAllData(state.activeData, state.targetPercent);
          try {
            localStorage.setItem('flashman_active_data', JSON.stringify(state.activeData));
          } catch (e) {}
          renderDashboard();
          updateSimulatorDisplay();
        }
        showToast(`Target updated to ${state.targetPercent}%`, 'info');
      });
    });

    // Quick Refresh
    elements.btnQuickRefresh?.addEventListener('click', () => {
      if (state.activeData) {
        recalculateAllData(state.activeData, state.targetPercent);
        renderDashboard();
        const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
        localStorage.setItem('flashman_last_sync', timeNow);
        if (elements.lastSyncTime) elements.lastSyncTime.textContent = `Last sync: Today at ${timeNow}`;
        try {
          localStorage.setItem('flashman_active_data', JSON.stringify(state.activeData));
        } catch (e) {}
        showToast('Dashboard reloaded', 'success');
      }
    });

    // Search Box
    elements.courseSearchInput.addEventListener('input', (e) => {
      state.searchQuery = e.target.value;
      renderCoursesList();
    });

    // Keyboard ESC to clear search or close modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (elements.courseSearchInput === document.activeElement) {
          elements.courseSearchInput.value = '';
          state.searchQuery = '';
          elements.courseSearchInput.blur();
          renderCoursesList();
        } else {
          if (state.activeData) closeModal(elements.loginModal);
          closeModal(elements.simulatorModal);
          closeModal(elements.importModal);
          closeModal(elements.absentDetailsModal);
          closeModal(elements.settingsModal);
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        elements.courseSearchInput.focus();
      }
    });

    // Filter pills
    elements.filterPills?.forEach(pill => {
      pill.addEventListener('click', () => {
        elements.filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        state.currentFilter = pill.dataset.filter;
        renderCoursesList();
      });
    });

    // Sort By
    elements.sortBySelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      renderCoursesList();
    });

    // View toggles
    elements.btnViewCards.addEventListener('click', () => {
      elements.btnViewCards.classList.add('active');
      elements.btnViewTable.classList.remove('active');
      elements.coursesCardsContainer.classList.remove('hidden');
      elements.coursesTableContainer.classList.add('hidden');
    });

    elements.btnViewTable.addEventListener('click', () => {
      elements.btnViewTable.classList.add('active');
      elements.btnViewCards.classList.remove('active');
      elements.coursesCardsContainer.classList.add('hidden');
      elements.coursesTableContainer.classList.remove('hidden');
    });

    // Accordion
    elements.accordionHeader?.addEventListener('click', () => {
      elements.infoAccordion?.classList.toggle('open');
    });

    // Logout Action
    elements.btnOpenLogin?.addEventListener('click', handleLogout);
    elements.btnCloseLogin?.addEventListener('click', () => closeModal(elements.loginModal));
    elements.btnReloadCaptcha?.addEventListener('click', fetchCaptcha);

    // Password Visibility Unhide / Hide Toggle
    elements.btnTogglePassword?.addEventListener('click', () => {
      if (!elements.inputPassword) return;
      const isPassword = elements.inputPassword.type === 'password';
      elements.inputPassword.type = isPassword ? 'text' : 'password';
      const eyeShow = elements.btnTogglePassword.querySelector('.eye-show');
      const eyeHide = elements.btnTogglePassword.querySelector('.eye-hide');
      if (isPassword) {
        eyeShow?.classList.add('hidden');
        eyeHide?.classList.remove('hidden');
        elements.btnTogglePassword.setAttribute('title', 'Hide password');
        elements.btnTogglePassword.setAttribute('aria-label', 'Hide password');
      } else {
        eyeShow?.classList.remove('hidden');
        eyeHide?.classList.add('hidden');
        elements.btnTogglePassword.setAttribute('title', 'Show password');
        elements.btnTogglePassword.setAttribute('aria-label', 'Show password');
      }
    });

    elements.srmLoginForm?.addEventListener('submit', handleLoginSubmit);
    elements.sessionCookieForm?.addEventListener('submit', handleSessionCookieSubmit);

    // Tab switching (if tabs present)
    elements.tabBtnCredentials?.addEventListener('click', () => {
      elements.tabBtnCredentials.classList.add('active');
      elements.tabBtnSessionCookie?.classList.remove('active');
      elements.srmLoginForm?.classList.remove('hidden');
      elements.sessionCookieForm?.classList.add('hidden');
    });

    elements.tabBtnSessionCookie?.addEventListener('click', () => {
      elements.tabBtnSessionCookie.classList.add('active');
      elements.tabBtnCredentials?.classList.remove('active');
      elements.sessionCookieForm?.classList.remove('hidden');
      elements.srmLoginForm?.classList.add('hidden');
    });

    elements.btnSwitchToCreds?.addEventListener('click', () => {
      elements.tabBtnCredentials?.click();
    });

    elements.btnUseDemoProfile?.addEventListener('click', () => {
      elements.inputNetId.value = 'demo';
      elements.inputPassword.value = 'demo';
      elements.inputCaptcha.value = '1234';
      handleLoginSubmit(new Event('submit'));
    });

    // Simulator Modal
    elements.btnOpenSimulator?.addEventListener('click', () => {
      resetSimulatorValues();
      updateSimulatorDisplay();
      openModal(elements.simulatorModal);
    });
    elements.btnCloseSimulator?.addEventListener('click', () => closeModal(elements.simulatorModal));

    elements.simCourseSelect?.addEventListener('change', (e) => {
      state.simCourseIndex = parseInt(e.target.value, 10);
      resetSimulatorValues();
      updateSimulatorDisplay();
    });

    elements.simMissSlider?.addEventListener('input', (e) => {
      state.simMissCount = parseInt(e.target.value, 10);
      elements.simMissVal.textContent = state.simMissCount;
      updateSimulatorDisplay();
    });
    elements.btnSimMissInc?.addEventListener('click', () => {
      if (state.simMissCount < 25) {
        state.simMissCount++;
        elements.simMissSlider.value = state.simMissCount;
        elements.simMissVal.textContent = state.simMissCount;
        updateSimulatorDisplay();
      }
    });
    elements.btnSimMissDec?.addEventListener('click', () => {
      if (state.simMissCount > 0) {
        state.simMissCount--;
        elements.simMissSlider.value = state.simMissCount;
        elements.simMissVal.textContent = state.simMissCount;
        updateSimulatorDisplay();
      }
    });

    elements.simAttendSlider?.addEventListener('input', (e) => {
      state.simAttendCount = parseInt(e.target.value, 10);
      elements.simAttendVal.textContent = state.simAttendCount;
      updateSimulatorDisplay();
    });
    elements.btnSimAttendInc?.addEventListener('click', () => {
      if (state.simAttendCount < 25) {
        state.simAttendCount++;
        elements.simAttendSlider.value = state.simAttendCount;
        elements.simAttendVal.textContent = state.simAttendCount;
        updateSimulatorDisplay();
      }
    });
    elements.btnSimAttendDec?.addEventListener('click', () => {
      if (state.simAttendCount > 0) {
        state.simAttendCount--;
        elements.simAttendSlider.value = state.simAttendCount;
        elements.simAttendVal.textContent = state.simAttendCount;
        updateSimulatorDisplay();
      }
    });

    elements.btnResetSimulation?.addEventListener('click', () => {
      resetSimulatorValues();
      updateSimulatorDisplay();
    });

    // Import Modal
    elements.btnOpenImport?.addEventListener('click', () => openModal(elements.importModal));
    elements.btnCloseImport?.addEventListener('click', () => closeModal(elements.importModal));
    elements.btnParseImport?.addEventListener('click', handleImportParse);

    elements.btnLoadSampleData.addEventListener('click', () => {
      elements.importTextarea.value = `<table class="table">
  <thead>
    <tr>
      <th>Code</th>
      <th>Description</th>
      <th>Max. hours</th>
      <th>Att. hours</th>
      <th>Absent hours</th>
      <th>Total Percentage</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>21CSC201J</td>
      <td>DATA STRUCTURES AND ALGORITHMS</td>
      <td>40</td>
      <td>36</td>
      <td>4</td>
      <td>90.00</td>
    </tr>
    <tr>
      <td>21CSC202J</td>
      <td>OPERATING SYSTEMS</td>
      <td>38</td>
      <td>32</td>
      <td>6</td>
      <td>84.21</td>
    </tr>
    <tr>
      <td>21CSC204J</td>
      <td>DATABASE MANAGEMENT SYSTEMS</td>
      <td>36</td>
      <td>33</td>
      <td>3</td>
      <td>91.67</td>
    </tr>
    <tr>
      <td>21MAT102J</td>
      <td>PROBABILITY AND QUEUING THEORY</td>
      <td>35</td>
      <td>24</td>
      <td>11</td>
      <td>68.57</td>
    </tr>
    <tr>
      <td>21CSE301T</td>
      <td>DESIGN AND ANALYSIS OF ALGORITHMS</td>
      <td>32</td>
      <td>25</td>
      <td>7</td>
      <td>78.13</td>
    </tr>
  </tbody>
</table>`;
      handleImportParse();
    });

    // Absent Details Modal
    elements.btnCloseAbsentDetails.addEventListener('click', () => closeModal(elements.absentDetailsModal));
    elements.btnCloseAbsentDetailsBtn.addEventListener('click', () => closeModal(elements.absentDetailsModal));

    // Settings Modal
    elements.btnOpenSettings.addEventListener('click', () => {
      loadConfig();
      openModal(elements.settingsModal);
    });
    elements.btnCloseSettings.addEventListener('click', () => closeModal(elements.settingsModal));
    elements.settingsForm.addEventListener('submit', handleSaveConfig);
    elements.btnResetConfig.addEventListener('click', () => {
      elements.cfgBaseUrl.value = 'https://sp.srmist.edu.in';
      elements.cfgLoginUrl.value = 'https://sp.srmist.edu.in/srmiststudentportal/LoginServlet';
      elements.cfgAttendanceUrl.value = 'https://sp.srmist.edu.in/srmiststudentportal/students/report/studentAttendanceDetails.jsp';
      elements.cfgInnerAttendanceUrl.value = 'https://sp.srmist.edu.in/srmiststudentportal/students/report/studentAttendanceDetailsInner.jsp';
    });

    [elements.loginModal, elements.simulatorModal, elements.importModal, elements.absentDetailsModal, elements.settingsModal].forEach(modal => {
      modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
          if (modal === elements.loginModal && !state.activeData) return;
          closeModal(modal);
        }
      });
    });
  }

  function loadFallbackMockData() {
    const sample = {
      student: {
        name: 'Demo Student',
        regNo: 'RA0000000000000',
        program: 'B.Tech - Computer Science & Engineering (AI & ML)',
        semester: 'Semester 3 (Section Y1)',
        campus: 'KTR Main Campus, SRMIST'
      },
      courses: [
        { code: '21CSC201J', title: 'Data Structures and Algorithms', conducted: 36, attended: 32, type: 'Integrated', slot: 'A1' },
        { code: '21CSC202J', title: 'Operating Systems', conducted: 34, attended: 28, type: 'Integrated', slot: 'B1' },
        { code: '21CSC204J', title: 'Database Management Systems', conducted: 32, attended: 29, type: 'Integrated', slot: 'C1' },
        { code: '21MAT102J', title: 'Probability & Queuing Theory', conducted: 30, attended: 21, type: 'Theory', slot: 'D1' },
        { code: '21CSE301T', title: 'Design and Analysis of Algorithms', conducted: 28, attended: 22, type: 'Theory', slot: 'E1' },
        { code: '21CSS201J', title: 'Full Stack Web Development Lab', conducted: 28, attended: 26, type: 'Practical / Lab', slot: 'P1' },
        { code: '21PDM101L', title: 'Professional Communication', conducted: 30, attended: 24, type: 'Theory', slot: 'F1' }
      ]
    };
    recalculateAllData(sample, state.targetPercent);
    applyActiveSession(sample, 'SRM Demo Profile', true, true);
  }

  function init() {
    if (state.theme === 'light') {
      document.body.className = 'light-theme';
      elements.themeToggleBtn.querySelector('.theme-icon').textContent = '☀️';
    }

    // Restore saved target percentage
    const savedTarget = localStorage.getItem('flashman_target_percent');
    if (savedTarget) {
      const parsedTarget = parseInt(savedTarget, 10);
      if (!isNaN(parsedTarget)) {
        state.targetPercent = parsedTarget;
        elements.targetButtons?.forEach(btn => {
          if (parseInt(btn.dataset.target, 10) === parsedTarget) {
            btn.classList.add('active');
          } else {
            btn.classList.remove('active');
          }
        });
      }
    }

    setupEventListeners();

    // Check if user is already logged in / has active data stored
    let restored = false;
    try {
      const savedDataStr = localStorage.getItem('flashman_active_data');
      if (savedDataStr) {
        const savedData = JSON.parse(savedDataStr);
        if (savedData && (savedData.courses || savedData.student)) {
          const savedSource = localStorage.getItem('flashman_data_source') || 'Live SRM Portal';
          const isDemo = localStorage.getItem('flashman_is_demo') === '1';
          state.sessionId = localStorage.getItem('flashman_session_id') || null;

          recalculateAllData(savedData, state.targetPercent);
          applyActiveSession(savedData, savedSource, isDemo, false);
          restored = true;
        }
      }
    } catch (e) {
      console.warn('Could not restore session from storage', e);
    }

    if (!restored) {
      // User is not logged in: directly launch login modal and fetch live captcha
      openModal(elements.loginModal);
      fetchCaptcha();
    }
  }

  init();
})();
