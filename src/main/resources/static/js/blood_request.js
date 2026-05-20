// ═══════════════════════════════════════════════════════════════════════════════
// CNPH BLOOD BANK — REQUEST PORTAL
// Enhanced JS: EKG Animation + UI/UX Improvements
// All existing functionality preserved. Animation added cleanly on top.
// ═══════════════════════════════════════════════════════════════════════════════


// ══════════════════════════════════════════════════════════════════════
// SECTION 1: EKG / ECG LOADING SCREEN ANIMATION
// ══════════════════════════════════════════════════════════════════════

(function initEKGLoader() {
  // Run as soon as script is parsed — no DOMContentLoaded needed for canvas init
  // Canvas draw starts after DOM is ready

  // ── ECG waveform definition ─────────────────────────────────────────
  // A medically-accurate ECG: P-Q-R-S-T complex, flat baseline, repeat
  function buildECGPath() {
    // Each segment is [dx, dy] relative — normalized 0-1 horizontally
    // We build one full beat cycle, then tile it
    return [
      // Flat baseline
      { t: 0.000, y: 0 },
      { t: 0.080, y: 0 },
      // P wave (atrial depolarization) — gentle bump
      { t: 0.100, y: -0.08 },
      { t: 0.130, y: -0.18 },
      { t: 0.160, y: -0.08 },
      // P-R segment (flat)
      { t: 0.200, y: 0 },
      { t: 0.240, y: 0 },
      // Q dip
      { t: 0.255, y: 0.08 },
      // R spike — the dramatic peak
      { t: 0.270, y: -1.0 },
      // S dip
      { t: 0.285, y: 0.14 },
      // S-T segment (flat, slightly elevated)
      { t: 0.330, y: -0.04 },
      // T wave (ventricular repolarization) — broad hump
      { t: 0.380, y: -0.08 },
      { t: 0.430, y: -0.26 },
      { t: 0.480, y: -0.28 },
      { t: 0.530, y: -0.12 },
      { t: 0.580, y: 0 },
      // Flat baseline to next beat
      { t: 1.000, y: 0 },
    ];
  }

  // ── Interpolate Y at any t position ─────────────────────────────────
  function getY(path, t) {
    t = ((t % 1) + 1) % 1;
    for (let i = 0; i < path.length - 1; i++) {
      const a = path[i], b = path[i + 1];
      if (t >= a.t && t <= b.t) {
        const pct = (t - a.t) / (b.t - a.t);
        // Cubic ease for smooth curves
        const ease = pct < 0.5 ? 2 * pct * pct : -1 + (4 - 2 * pct) * pct;
        return a.y + (b.y - a.y) * ease;
      }
    }
    return 0;
  }

  // ── Spawn floating particles ─────────────────────────────────────────
  function spawnParticles() {
    const container = document.getElementById('ekg-particles');
    if (!container) return;

    const colors = ['#1F5FBF', '#2D3FA3', '#E5B325', '#2E8B57', '#4A90D9'];
    const count = 28;

    for (let i = 0; i < count; i++) {
      const p = document.createElement('div');
      p.className = 'ekg-particle';
      const size = Math.random() * 4 + 2;
      p.style.cssText = `
        width: ${size}px;
        height: ${size}px;
        left: ${Math.random() * 100}%;
        top: ${Math.random() * 100}%;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        --dur: ${(Math.random() * 4 + 3).toFixed(1)}s;
        --del: ${(Math.random() * 3).toFixed(1)}s;
        opacity: 0;
      `;
      container.appendChild(p);
    }
  }

  // ── Main canvas animation ────────────────────────────────────────────
  function runEKGCanvas() {
    const canvas = document.getElementById('ekg-canvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const wrap = canvas.parentElement;

    function resize() {
      canvas.width  = wrap.offsetWidth;
      canvas.height = wrap.offsetHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    const path   = buildECGPath();
    const W      = () => canvas.width;
    const H      = () => canvas.height;
    const MID    = () => H() * 0.55;   // vertical baseline position
    const AMP    = () => H() * 0.42;   // amplitude

    // Animation state
    let phase        = 0;          // 0–1, progress through waveform loop
    const SPEED      = 0.0028;     // phase units per frame (controls scroll speed)
    const TRAIL      = 0.72;       // fraction of canvas covered by drawn trail
    let startTime    = null;
    let raf          = null;
    let done         = false;

    // Color palette
    const COL_LINE   = '#4A90D9';   // main trace
    const COL_GLOW   = 'rgba(31,95,191,0.18)';
    const COL_PEAK   = '#E5B325';   // peak highlight
    const COL_HEAD   = '#FFFFFF';   // head dot
    const COL_GRID   = 'rgba(255,255,255,0.04)';

    function drawGrid() {
      const w = W(), h = H();
      ctx.strokeStyle = COL_GRID;
      ctx.lineWidth = 1;
      // Horizontal lines
      const hLines = 6;
      for (let i = 0; i <= hLines; i++) {
        const y = (h / hLines) * i;
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }
      // Vertical lines
      const vLines = 12;
      for (let i = 0; i <= vLines; i++) {
        const x = (w / vLines) * i;
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
    }

    function drawFrame(ts) {
      if (done) return;
      if (!startTime) startTime = ts;

      const w = W(), h = H();
      const mid = MID(), amp = AMP();

      // Advance phase
      phase += SPEED;

      // Clear
      ctx.clearRect(0, 0, w, h);

      // Grid
      drawGrid();

      // How many points to sample
      const pts = w * 2;
      const trailW = w * TRAIL;

      // ── Main trace with gradient glow ──────────────────────────
      // Shadow / glow pass (thick, blurred)
      ctx.save();
      ctx.shadowColor = COL_LINE;
      ctx.shadowBlur  = 12;
      ctx.strokeStyle = COL_GLOW;
      ctx.lineWidth   = 6;
      ctx.lineJoin    = 'round';
      ctx.lineCap     = 'round';
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const x   = (i / pts) * trailW;
        const tVal = phase - (trailW - x) / w * 0.45;
        const y   = mid + getY(path, tVal) * amp;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // Main line (crisp, gradient)
      const grad = ctx.createLinearGradient(0, 0, trailW, 0);
      grad.addColorStop(0,    'rgba(31,95,191,0)');
      grad.addColorStop(0.25, 'rgba(31,95,191,0.4)');
      grad.addColorStop(0.7,  COL_LINE);
      grad.addColorStop(1,    '#FFFFFF');

      ctx.save();
      ctx.shadowColor = '#1F5FBF';
      ctx.shadowBlur  = 8;
      ctx.strokeStyle = grad;
      ctx.lineWidth   = 2.2;
      ctx.lineJoin    = 'round';
      ctx.lineCap     = 'round';
      ctx.beginPath();
      for (let i = 0; i <= pts; i++) {
        const x   = (i / pts) * trailW;
        const tVal = phase - (trailW - x) / w * 0.45;
        const y   = mid + getY(path, tVal) * amp;
        i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.restore();

      // ── Peak highlight marker (R-spike glow) ───────────────────
      // Find the approximate peak position in current frame
      let peakX = -1, peakY = mid;
      for (let i = 0; i <= pts; i++) {
        const x   = (i / pts) * trailW;
        const tVal = phase - (trailW - x) / w * 0.45;
        const yRaw = getY(path, tVal);
        if (yRaw < -0.85) { // near R-peak
          const y = mid + yRaw * amp;
          if (y < peakY) { peakY = y; peakX = x; }
        }
      }
      if (peakX > 0) {
        // Vertical line at peak
        ctx.save();
        ctx.strokeStyle = 'rgba(229,179,37,0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([3, 5]);
        ctx.beginPath();
        ctx.moveTo(peakX, 0);
        ctx.lineTo(peakX, h);
        ctx.stroke();
        ctx.restore();

        // Glow dot at peak
        ctx.save();
        ctx.shadowColor = COL_PEAK;
        ctx.shadowBlur  = 20;
        ctx.fillStyle   = COL_PEAK;
        ctx.beginPath();
        ctx.arc(peakX, peakY, 3.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      // ── Animated head dot ───────────────────────────────────────
      const headX = trailW;
      const headT = phase;
      const headY = mid + getY(path, headT) * amp;

      // Ripple rings
      const rTime = (ts - startTime) / 1000;
      for (let r = 0; r < 3; r++) {
        const rPhase = (rTime * 2.5 + r * 0.33) % 1;
        const rRadius = 6 + rPhase * 18;
        const rAlpha  = (1 - rPhase) * 0.5;
        ctx.save();
        ctx.strokeStyle = `rgba(255,255,255,${rAlpha})`;
        ctx.lineWidth   = 1;
        ctx.beginPath();
        ctx.arc(headX, headY, rRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // Core dot
      ctx.save();
      ctx.shadowColor = COL_HEAD;
      ctx.shadowBlur  = 16;
      ctx.fillStyle   = COL_HEAD;
      ctx.beginPath();
      ctx.arc(headX, headY, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // ── Baseline reference line ─────────────────────────────────
      ctx.save();
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([6, 8]);
      ctx.beginPath();
      ctx.moveTo(0, mid);
      ctx.lineTo(w, mid);
      ctx.stroke();
      ctx.restore();

      raf = requestAnimationFrame(drawFrame);
    }

    raf = requestAnimationFrame(drawFrame);

    // Return cancel function
    return function cancel() {
      done = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }

  // ── Loader dismiss sequence ──────────────────────────────────────────
  function dismissLoader(cancelCanvas) {
    const loader = document.getElementById('ekg-loader');
    if (!loader) return;

    loader.classList.add('fade-out');

    setTimeout(function() {
      loader.style.display     = 'none';
      loader.style.pointerEvents = 'none';
      document.body.style.overflow = '';
      if (cancelCanvas) cancelCanvas();
    }, 900);
  }

  // ── Bootstrap sequence ────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', function() {
    // Lock body scroll during loader
    document.body.style.overflow = 'hidden';

    spawnParticles();

    // Small delay to let CSS animations kick in, then start canvas
    const cancelCanvas = runEKGCanvas();

    // Dismiss after 3.2 s (matches CSS progress bar + scanline animations)
    setTimeout(function() {
      dismissLoader(cancelCanvas);
    }, 3200);
  });

})();


// ══════════════════════════════════════════════════════════════════════
// SECTION 2: ENTRANCE + SCROLL ANIMATIONS (UI/UX Layer)
// ══════════════════════════════════════════════════════════════════════

(function initEntranceAnimations() {
  // Inject animation helper styles
  const style = document.createElement('style');
  style.textContent = `
    .reveal-up {
      opacity: 0;
      transform: translateY(24px);
      transition: opacity 0.6s cubic-bezier(0.4,0,0.2,1),
                  transform 0.6s cubic-bezier(0.4,0,0.2,1);
    }
    .reveal-up.visible {
      opacity: 1;
      transform: translateY(0);
    }
    .reveal-fade {
      opacity: 0;
      transition: opacity 0.7s cubic-bezier(0.4,0,0.2,1);
    }
    .reveal-fade.visible {
      opacity: 1;
    }
    .step:nth-child(1) { transition-delay: 0ms !important; }
    .step:nth-child(2) { transition-delay: 100ms !important; }
    .step:nth-child(3) { transition-delay: 200ms !important; }
    .step:nth-child(4) { transition-delay: 300ms !important; }

    /* Stat counter animation */
    @keyframes countUp {
      from { opacity: 0; transform: translateY(8px) scale(0.9); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    .stat.animated .stat-num {
      animation: countUp 0.5s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }

    /* Page transition for form pages */
    .req-page {
      animation: none;
    }
    .req-page.active {
      animation: pageSlideIn 0.35s cubic-bezier(0.4,0,0.2,1) forwards;
    }
    @keyframes pageSlideIn {
      from { opacity: 0; transform: translateX(12px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    /* Stepper done checkmark pop */
    .step-circle.done {
      animation: stepDone 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards;
    }
    @keyframes stepDone {
      0%   { transform: scale(0.8); }
      60%  { transform: scale(1.15); }
      100% { transform: scale(1); }
    }

    /* Track card entrance */
    .track-card {
      animation: trackCardIn 0.45s cubic-bezier(0.4,0,0.2,1) forwards;
    }
    @keyframes trackCardIn {
      from { opacity: 0; transform: translateY(16px); }
      to   { opacity: 1; transform: translateY(0); }
    }

    /* Timeline item stagger */
    .tl-item {
      opacity: 0;
      animation: tlItemIn 0.4s cubic-bezier(0.4,0,0.2,1) forwards;
    }
    .tl-item:nth-child(1) { animation-delay: 0.05s; }
    .tl-item:nth-child(2) { animation-delay: 0.12s; }
    .tl-item:nth-child(3) { animation-delay: 0.19s; }
    .tl-item:nth-child(4) { animation-delay: 0.26s; }
    .tl-item:nth-child(5) { animation-delay: 0.33s; }
    @keyframes tlItemIn {
      from { opacity: 0; transform: translateX(-10px); }
      to   { opacity: 1; transform: translateX(0); }
    }

    /* Submit button pulse on idle */
    @keyframes subtlePulse {
      0%, 100% { box-shadow: 0 4px 24px rgba(196,30,58,0.3); }
      50%       { box-shadow: 0 4px 40px rgba(196,30,58,0.55), 0 0 0 4px rgba(196,30,58,0.08); }
    }
    .btn-submit:not(:disabled):hover {
      animation: subtlePulse 2s ease infinite;
    }

    /* Error shake */
    @keyframes shakeX {
      0%, 100% { transform: translateX(0); }
      20%       { transform: translateX(-6px); }
      40%       { transform: translateX(6px); }
      60%       { transform: translateX(-4px); }
      80%       { transform: translateX(4px); }
    }
    #form-error.shake {
      animation: shakeX 0.4s cubic-bezier(0.36,0.07,0.19,0.97) both;
    }

    /* Upload zone hover spark */
    #upload-zone:hover,
    #scanner-upload-zone:not(.has-file):hover {
      transition: border-color 0.2s, box-shadow 0.2s, transform 0.2s;
      transform: translateY(-2px);
    }

    /* Tab active indicator slide */
    .tab-btn {
      position: relative;
      overflow: hidden;
    }
    .tab-btn::after {
      content: '';
      position: absolute;
      bottom: 0; left: 50%;
      width: 0; height: 2px;
      background: var(--crimson, #C41E3A);
      border-radius: 2px;
      transition: width 0.3s cubic-bezier(0.34,1.56,0.64,1), left 0.3s cubic-bezier(0.34,1.56,0.64,1);
    }
    .tab-btn.active::after {
      width: 80%; left: 10%;
    }

    /* Form field focus glow */
    .form-input:focus,
    .form-select:focus,
    .tracker-input:focus {
      transition: border-color 0.2s, box-shadow 0.25s;
    }

    /* Review block reveal stagger */
    .review-block {
      opacity: 0;
      transform: translateY(10px);
      transition: opacity 0.4s ease, transform 0.4s ease;
    }
    .review-block.revealed {
      opacity: 1;
      transform: translateY(0);
    }
  `;
  document.head.appendChild(style);

  document.addEventListener('DOMContentLoaded', function() {
    // ── IntersectionObserver for scroll reveals ──────────────────
    const revealEls = document.querySelectorAll('.step, .how-inner, .stats-bar, .scanner-container');
    revealEls.forEach(el => el.classList.add('reveal-up'));

    const io = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    revealEls.forEach(el => io.observe(el));

    // ── Stat counter animation when stats bar is visible ──────────
    const statItems = document.querySelectorAll('.stat');
    const statObs = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          setTimeout(function() {
            statItems.forEach(function(stat, i) {
              setTimeout(function() { stat.classList.add('animated'); }, i * 120);
            });
          }, 200);
          statObs.disconnect();
        }
      });
    }, { threshold: 0.5 });

    const statsBar = document.querySelector('.stats-bar');
    if (statsBar) statObs.observe(statsBar);

    // ── Hero content staggered entrance ──────────────────────────
    // (Delayed to run after loader dismisses at 3.2s)
    const heroContent = document.querySelector('.hero-content');
    const heroEyebrow = document.querySelector('.hero-eyebrow');
    const heroTitle   = document.querySelector('.hero-title');
    const heroSub     = document.querySelector('.hero-sub');
    const heroActions = document.querySelector('.hero-actions');

    [heroEyebrow, heroTitle, heroSub, heroActions].forEach(el => {
      if (el) { el.style.opacity = '0'; el.style.transform = 'translateY(20px)'; }
    });

    function revealHero() {
      var els = [heroEyebrow, heroTitle, heroSub, heroActions];
      els.forEach(function(el, i) {
        if (!el) return;
        setTimeout(function() {
          el.style.transition = 'opacity 0.7s cubic-bezier(0.4,0,0.2,1), transform 0.7s cubic-bezier(0.4,0,0.2,1)';
          el.style.opacity    = '1';
          el.style.transform  = 'translateY(0)';
        }, 3400 + i * 130);
      });
    }
    revealHero();
  });
})();


// ══════════════════════════════════════════════════════════════════════
// SECTION 3: HOSPITAL SESSION MANAGEMENT (nav chip / login state)
// ══════════════════════════════════════════════════════════════════════

function logoutHospital() {
  try {
    sessionStorage.removeItem('hospitalSession');
    localStorage.removeItem('hospitalSession');
  } catch (e) {}
  updateHospitalNavState(null);
}

function updateHospitalNavState(session) {
  var loginBtn    = document.getElementById('nav-login-btn');
  var hospitalChip = document.getElementById('nav-hospital-chip');
  var nameEl      = document.getElementById('nav-hospital-name');
  var staffEl     = document.getElementById('nav-hospital-staff');

  if (session && session.hospitalName) {
    if (loginBtn)     loginBtn.style.display     = 'none';
    if (hospitalChip) hospitalChip.style.display = 'flex';
    if (nameEl)       nameEl.textContent          = session.hospitalName;
    if (staffEl)      staffEl.textContent         = session.staffName || '';

    // Populate hospital contact block in form
    var chHosp  = document.getElementById('ch-hospital-name');
    var chStaff = document.getElementById('ch-staff-name');
    var chEmail = document.getElementById('ch-staff-email');
    if (chHosp)  chHosp.textContent  = session.hospitalName;
    if (chStaff) chStaff.textContent = session.staffName || '';
    if (chEmail) chEmail.textContent = session.email || '';

    var anonDiv  = document.getElementById('contact-anonymous');
    var hospDiv  = document.getElementById('contact-hospital');
    if (anonDiv) anonDiv.style.display = 'none';
    if (hospDiv) hospDiv.style.display = 'block';

    var emailInput = document.getElementById('f-email');
    if (emailInput && session.email) emailInput.value = session.email;

  } else {
    if (loginBtn)     loginBtn.style.display     = 'flex';
    if (hospitalChip) hospitalChip.style.display = 'none';

    var anonDiv = document.getElementById('contact-anonymous');
    var hospDiv = document.getElementById('contact-hospital');
    if (anonDiv) anonDiv.style.display = 'block';
    if (hospDiv) hospDiv.style.display = 'none';
  }
}

document.addEventListener('DOMContentLoaded', function() {
  // Restore hospital session on load
  var raw = null;
  try { raw = sessionStorage.getItem('hospitalSession') || localStorage.getItem('hospitalSession'); } catch (e) {}
  if (raw) {
    try { updateHospitalNavState(JSON.parse(raw)); } catch (e) {}
  }
});


// ══════════════════════════════════════════════════════════════════════
// SECTION 4: CORE FORM LOGIC (Unchanged from original)
// ══════════════════════════════════════════════════════════════════════

// ── Tab switching ──────────────────────────────────────────────
function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.getElementById('tab-' + tab).classList.add('active');
  document.getElementById('tab-' + tab + '-btn').classList.add('active');
}

function scrollToForm(tab) {
  switchTab(tab);
  document.getElementById('form-section').scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Paging state ───────────────────────────────────────────────
var currentPage = 1;

function updateStepper(page) {
  for (var i = 1; i <= 4; i++) {
    var sc = document.getElementById('sc' + i);
    var sl = document.getElementById('sl' + i);
    if (!sc) continue;
    sc.className = 'step-circle' + (i < page ? ' done' : i === page ? ' active' : '');
    sl.className = 'step-label' + (i < page ? ' done' : i === page ? ' active' : '');
    sc.textContent = i < page ? '✓' : String(i);
    if (i < 4) {
      var line = document.getElementById('line' + i);
      if (line) line.className = 'step-line' + (i < page ? ' done' : '');
    }
  }
}

function goTo(n) {
  if (n > currentPage && !validate(currentPage)) {
    // Shake the error box for feedback
    var errEl = document.getElementById('form-error');
    if (errEl && errEl.style.display !== 'none') {
      errEl.classList.remove('shake');
      void errEl.offsetWidth; // reflow
      errEl.classList.add('shake');
    }
    return;
  }
  document.getElementById('page-' + currentPage).classList.remove('active');
  currentPage = n;
  document.getElementById('page-' + n).classList.add('active');
  updateStepper(n);
  if (n === 4) {
    buildReview();
    // Animate review blocks
    setTimeout(function() {
      document.querySelectorAll('.review-block').forEach(function(el, i) {
        setTimeout(function() { el.classList.add('revealed'); }, i * 80);
      });
    }, 100);
  }
  window.scrollTo({ top: document.getElementById('form-section').offsetTop - 20, behavior: 'smooth' });
  hideError();
}

// ── Calculate age from birthdate ───────────────────────────────
function calculateAge(birthdate) {
  if (!birthdate) return null;
  const today = new Date();
  const birth = new Date(birthdate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

const SPECIFY_ONLY_INDICATION_COMPONENTS = {
  LEUKOREDUCED_PRBC: 'LEUKOREDUCED_PRBC_SPECIFY',
  ALIQUOTED_PRBC: 'ALIQUOTED_PRBC_SPECIFY',
  CRYOSUPERNATANT: 'CRYOSUPERNATANT_SPECIFY'
};

// ── Update patient type and form based on birthdate ─────────────
function updatePatientTypeAndForms() {
  const birthdateInput = document.getElementById('f-birthdate');
  if (!birthdateInput.value) {
    document.getElementById('patient-type-display').textContent = 'Enter date of birth to determine patient type';
    return;
  }

  const age = calculateAge(birthdateInput.value);
  const patientTypeEl = document.getElementById('patient-type-display');
  const formDownloadButtons = document.getElementById('form-download-buttons');

  let patientType = '';
  let formHtml = '';

  if (age < 13) {
    patientType = 'PEDIATRIC';
    formHtml = `
      <button class="dl-card-btn" onclick="downloadForm('pedia')"
        style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.06);
              border:1.5px solid rgba(255,255,255,0.12);border-radius:11px;padding:13px 16px;
              cursor:pointer;text-align:left;width:100%;font-family:'DM Sans',sans-serif"
        onmouseover="this.style.background='rgba(196,30,58,0.25)';this.style.borderColor='rgba(196,30,58,0.5)'"
        onmouseout="this.style.background='rgba(255,255,255,0.06)';this.style.borderColor='rgba(255,255,255,0.12)'">
        
        <div style="width:36px;height:36px;background:rgba(196,30,58,0.3);border-radius:8px;
                    display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📄</div>
        
        <div>
          <div style="font-size:13px;font-weight:700;color:white">Pediatric Form</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:1px">
            Blood Request Form (Pedia) · PDF ↓
          </div>
        </div>
      </button>
    `;
  } else {
    patientType = 'ADULT';
    formHtml = `
      <button class="dl-card-btn" onclick="downloadForm('adult')"
        style="display:flex;align-items:center;gap:10px;background:rgba(255,255,255,0.06);
              border:1.5px solid rgba(255,255,255,0.12);border-radius:11px;padding:13px 16px;
              cursor:pointer;text-align:left;width:100%;font-family:'DM Sans',sans-serif"
        onmouseover="this.style.background='rgba(196,30,58,0.25)';this.style.borderColor='rgba(196,30,58,0.5)'"
        onmouseout="this.style.background='rgba(255,255,255,0.06)';this.style.borderColor='rgba(255,255,255,0.12)'">
        
        <div style="width:36px;height:36px;background:rgba(196,30,58,0.3);border-radius:8px;
                    display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0">📄</div>
        
        <div>
          <div style="font-size:13px;font-weight:700;color:white">Adult Form</div>
          <div style="font-size:11px;color:rgba(255,255,255,0.4);margin-top:1px">
            Blood Request Form (Adult) · PDF ↓
          </div>
        </div>
      </button>
    `;
  }

  patientTypeEl.textContent = patientType + ' (' + age + ' years old)';
  formDownloadButtons.innerHTML = formHtml;
}

// ── Validation ─────────────────────────────────────────────────
function validate(page) {
  hideError();

  if (page === 1) {
    if (!document.getElementById('f-patientName').value.trim())
      return showError('Please enter the patient\'s first name.'), false;
    if (!document.getElementById('f-patientMiddle').value.trim())
      return showError('Please enter the patient\'s middle name.'), false;
    if (!document.getElementById('f-patientLast').value.trim())
      return showError('Please enter the patient\'s last name.'), false;
    if (!document.getElementById('f-birthdate').value)
      return showError('Please enter the patient\'s date of birth.'), false;
    
    const age = calculateAge(document.getElementById('f-birthdate').value);
    if (age < 0)
      return showError('Patient age cannot be negative. Please check the date of birth.'), false;
    if (age > 120)
      return showError('Please enter a valid date of birth.'), false;
    
    if (!document.getElementById('f-sex').value)
      return showError('Please select the patient\'s sex.'), false;
    if (!document.getElementById('f-physician').value.trim())
      return showError('Please enter the requesting physician\'s name.'), false;
  }

  if (page === 2) {
    if (!document.getElementById('f-bloodType').value)
      return showError('Please select the blood type needed.'), false;
    if (!document.getElementById('f-component').value)
      return showError('Please select the blood component needed.'), false;
    if (!document.getElementById('f-units').value)
      return showError('Please select the number of units needed.'), false;
    if (!getRadioVal('urgency'))
      return showError('Please select an urgency level.'), false;

    const selectedComponent = document.getElementById('f-component').value;
    const birthdate = document.getElementById('f-birthdate').value;
    const age = calculateAge(birthdate);
    const ageGroup = age !== null && age < 13 ? 'PEDIA' : 'ADULT';
    
    const requiresIndications = [
      'WHOLE_BLOOD', 'PRBC', 'WRBC', 'PLATELET_CONCENTRATE', 
      'FRESH_FROZEN_PLASMA', 'CRYOPRECIPITATE'
    ];
    
    if (requiresIndications.includes(selectedComponent)) {
      if (!hasSelectedIndications()) {
        return showError('Please select at least one indication for transfusion.'), false;
      }
    }

    if (SPECIFY_ONLY_INDICATION_COMPONENTS[selectedComponent]) {
      if (!getSpecifyOnlyIndicationValue(selectedComponent)) {
        return showError('Please specify the indication for this component.'), false;
      }
    }
    
    if (selectedComponent === 'OTHER') {
      if (!document.getElementById('f-otherComponentName').value.trim())
        return showError('Please enter the component name.'), false;
      if (!document.getElementById('f-otherComponentIndication').value.trim())
        return showError('Please specify the indication(s) for this component.'), false;
    }
  }

  if (page === 3) {
    if (!selectedFile)
      return showError('Please upload the Doctor\'s Note or Blood Request Form.'), false;
    var hospEl = document.getElementById('contact-hospital');
    var isHosp = hospEl && hospEl.style.display !== 'none' && hospEl.style.display !== '';
    if (!isHosp) {
      if (!document.getElementById('f-requesterName').value.trim())
        return showError('Please enter your full name.'), false;
      if (!document.getElementById('f-relationship').value)
        return showError('Please select your relationship to the patient.'), false;
      if (!document.getElementById('f-contact').value.trim())
        return showError('Please enter your contact number.'), false;
    }
  }

  return true;
}

// ── Clinical Data Helpers ──────────────────────────────────────
function togglePrevTransFields() {
  const prevTransVal = getRadioVal('prevTransfusion');
  const fieldsDiv = document.getElementById('prevTransFields');
  if (prevTransVal === 'YES') {
    fieldsDiv.style.display = 'block';
  } else {
    fieldsDiv.style.display = 'none';
    document.getElementById('f-prevTransDate').value = '';
    document.getElementById('f-prevUnits').value = '';
  }
}

function toggleReactionFields() {
  const reactionVal = getRadioVal('prevReaction');
  const fieldsDiv = document.getElementById('reactionFields');
  if (reactionVal === 'YES') {
    fieldsDiv.style.display = 'block';
  } else {
    fieldsDiv.style.display = 'none';
    document.getElementById('f-reactionDate').value = '';
    document.getElementById('f-reactionDetails').value = '';
  }
}

function togglePlateletCountField(component) {
  const plateletCountField = document.getElementById('platelet-count-field');
  const plateletCountInput = document.getElementById('f-plateletCount');
  if (!plateletCountField || !plateletCountInput) return;

  if (component === 'PLATELET_CONCENTRATE') {
    plateletCountField.style.display = 'block';
  } else {
    plateletCountField.style.display = 'none';
    plateletCountInput.value = '';
  }
}

function getSpecifyOnlyIndicationValue(component) {
  const input = document.getElementById(`f-indicationSpecify-${component}`);
  return input ? input.value.trim() : '';
}

function buildIndicationSubmission(component) {
  const specifyOnlyCode = SPECIFY_ONLY_INDICATION_COMPONENTS[component];
  if (specifyOnlyCode) {
    const specifyValue = getSpecifyOnlyIndicationValue(component);
    return {
      indication: specifyValue ? specifyOnlyCode : null,
      indicationOtherSpecify: specifyValue ? `${specifyOnlyCode}:${specifyValue}` : null,
      reviewItems: specifyValue
        ? [{ code: COMPONENT_LABELS_R[component] || component, additional: specifyValue }]
        : []
    };
  }

  const indications = getSelectedIndications();
  return {
    indication: indications.map(ind => ind.code).join(',') || null,
    indicationOtherSpecify: buildIndicationOtherSpecify(),
    reviewItems: indications
  };
}

// ── Indication Management ──────────────────────────────────────
function initIndicationHandlers() {
  const componentSelect = document.getElementById('f-component');
  const indicationContainer = document.getElementById('indication-container');

  function updateIndications() {
    const birthdate = document.getElementById('f-birthdate').value;
    const age = calculateAge(birthdate);
    const ageGroup = age !== null && age < 13 ? 'PEDIA' : 'ADULT';
    const component = componentSelect.value;

    togglePlateletCountField(component);

    document.querySelectorAll('.indication-group').forEach(group => {
      group.style.display = 'none';
    });

    if (component) {
      let groupId = `group-${component}`;
      if (ageGroup === 'PEDIA' && ['WHOLE_BLOOD', 'PRBC', 'WRBC', 'PLATELET_CONCENTRATE', 'FRESH_FROZEN_PLASMA', 'CRYOPRECIPITATE'].includes(component)) {
        groupId = `group-${component}-PEDIA`;
      }
      
      const group = document.getElementById(groupId);
      if (group) {
        group.style.display = 'block';
        indicationContainer.style.display = 'block';
      } else {
        indicationContainer.style.display = 'none';
      }
    } else {
      indicationContainer.style.display = 'none';
    }

    document.querySelectorAll('.indication-checkbox').forEach(cb => {
      cb.checked = false;
    });
    document.querySelectorAll('.component-indication-specify').forEach(input => {
      if (!component || input.dataset.component !== component) {
        input.value = '';
      }
    });
    closeAllSubGroups();
  }

  componentSelect.addEventListener('change', updateIndications);
  document.getElementById('f-birthdate').addEventListener('change', updateIndications);

  document.querySelectorAll('.indication-checkbox:not(.sub)').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const subGroupId = `sub-${this.value}`;
      const subGroup = document.getElementById(subGroupId);
      
      if (subGroup) {
        if (this.checked) {
          subGroup.classList.add('active');
        } else {
          subGroup.classList.remove('active');
          subGroup.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
          });
        }
      }
    });
  });

  document.querySelectorAll('input[type="text"][data-ref]').forEach(input => {
    const checkboxId = `ind-${input.dataset.ref}`;
    const checkbox = document.getElementById(checkboxId);
    
    if (checkbox) {
      input.style.display = 'none';
      
      checkbox.addEventListener('change', function() {
        if (this.checked) {
          input.style.display = 'inline-block';
          input.focus();
        } else {
          input.style.display = 'none';
          input.value = '';
        }
      });
      
      input.addEventListener('input', function() {
        if (this.value.trim()) {
          checkbox.checked = true;
        }
      });
    }
  });
}

function closeAllSubGroups() {
  document.querySelectorAll('.indication-sub-group').forEach(group => {
    group.classList.remove('active');
  });
}

function hasSelectedIndications() {
  const checked = document.querySelectorAll('.indication-checkbox:checked');
  return checked.length > 0;
}

function getSelectedIndications() {
  const selected = [];
  document.querySelectorAll('.indication-checkbox:checked').forEach(checkbox => {
    const input = document.querySelector(`input[type="text"][data-ref="${checkbox.value}"]`);
    selected.push({
      code: checkbox.value,
      additional: input ? input.value.trim() : null
    });
  });
  return selected;
}

function buildIndicationOtherSpecify() {
  const pairs = [];
  document.querySelectorAll('input[type="text"][data-ref]').forEach(input => {
    const text = input.value.trim();
    if (text) {
      pairs.push(`${input.dataset.ref}:${text}`);
    }
  });
  return pairs.length > 0 ? pairs.join(',') : null;
}

// ── Styles for Indications (CSS-in-JS) ──────────────────────────
function injectIndicationStyles() {
  if (document.getElementById('indication-styles')) return;
  
  const style = document.createElement('style');
  style.id = 'indication-styles';
  style.textContent = `
    .indication-group {
      background: #F8F8F8;
      border: 1.5px solid #E4E4E7;
      border-radius: 12px;
      padding: 16px;
      margin-bottom: 16px;
    }

    .indication-header {
      font-size: 14px;
      font-weight: 700;
      color: var(--charcoal);
      margin-bottom: 14px;
      padding-bottom: 10px;
      border-bottom: 2px solid #DDD;
    }

    .indication-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 10px 0;
      border-bottom: 1px solid #EFEFEF;
      font-size: 13px;
      line-height: 1.5;
    }

    .indication-item:last-child {
      border-bottom: none;
    }

    .indication-item input[type="checkbox"] {
      margin-top: 2px;
      flex-shrink: 0;
      width: 17px;
      height: 17px;
      cursor: pointer;
    }

    .indication-item label {
      cursor: pointer;
      flex: 1;
    }

    .indication-sub-group {
      margin-left: 24px;
      margin-top: 8px;
      padding-left: 12px;
      border-left: 3px solid var(--primary-blue, #1F5FBF);
      border-radius: 0 8px 8px 0;
      display: none !important;
    }

    .indication-sub-group.active {
      display: block !important;
    }

    .indication-sub-item {
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 8px 0;
      font-size: 12px;
      line-height: 1.5;
    }

    .indication-sub-item input[type="checkbox"] {
      margin-top: 2px;
      flex-shrink: 0;
      width: 16px;
      height: 16px;
      cursor: pointer;
    }

    .indication-sub-item label {
      cursor: pointer;
      flex: 1;
    }

    .inline-input {
      padding: 6px 10px !important;
      font-size: 12px !important;
      height: auto !important;
      border: 1px solid #DDD !important;
      border-radius: 4px !important;
      transition: all 0.2s ease;
    }

    .inline-input:focus {
      outline: none;
      border-color: #C41E3A !important;
      box-shadow: 0 0 0 2px rgba(196,30,58,0.1) !important;
    }

    .ward-dropdown {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: white;
      border: 1px solid #E4E4E7;
      border-top: none;
      border-radius: 0 0 10px 10px;
      max-height: 200px;
      overflow-y: auto;
      z-index: 100;
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }

    .ward-dropdown-list {
      padding: 4px 0;
    }

    .ward-dropdown-item {
      padding: 10px 14px;
      font-size: 13px;
      color: var(--charcoal);
      cursor: pointer;
      transition: background 0.15s;
    }

    .ward-dropdown-item:hover:not(.disabled) {
      background: #F0F0F0;
    }

    .ward-dropdown-item.disabled {
      color: var(--muted);
      cursor: not-allowed;
    }

    .ward-search-container {
      position: relative;
    }

    .btn-form-download {
      background: #C41E3A;
      color: white;
      border: none;
      border-radius: 10px;
      padding: 10px 16px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
      font-family: 'DM Sans', sans-serif;
    }

    .btn-form-download:hover {
      background: #A01830;
    }
  `;
  document.head.appendChild(style);
}

// ── Review builder ─────────────────────────────────────────────
var COMPONENT_LABELS_R = {
  WHOLE_BLOOD: 'Whole Blood', 
  PRBC: 'Packed RBC',
  LEUKOREDUCED_PRBC: 'Leukoreduced PRBC',
  ALIQUOTED_PRBC: 'Aliquoted PRBC',
  PLATELET_CONCENTRATE: 'Platelet Concentrate',
  FRESH_FROZEN_PLASMA: 'Fresh Frozen Plasma (FFP)',
  CRYOPRECIPITATE: 'Cryoprecipitate',
  CRYOSUPERNATANT: 'Cryosupernatant',
  WRBC: 'Whole Red Blood Cells',
  OTHER: 'Other'
};

var BLOOD_LABELS_R = {
  O_NEG: 'O−', O_POS: 'O+', A_POS: 'A+', A_NEG: 'A−',
  B_POS: 'B+', B_NEG: 'B−', AB_POS: 'AB+', AB_NEG: 'AB−'
};

var URGENCY_LABELS_R = {
  LOW: 'Low — Scheduled / Within a week',
  MEDIUM: 'Medium — 2-3 days',
  HIGH: 'High — 24hrs',
  CRITICAL: 'Critical — Immediately'
};

var CATEGORY_LABELS_R = {
  INPATIENT: 'OPD/ INHOUSE'
};

var REQUEST_TYPE_LABELS_R = {
  STAT: 'STAT (Emergency)', ROUTINE: 'Routine'
};

function reviewRow(l, v) {
  return '<div class="review-row"><span class="lbl">' + l + '</span><span class="val">' + (v || '—') + '</span></div>';
}

function buildReview() {
  var catEl  = document.querySelector('input[name="category"]:checked');
  var urgEl  = document.querySelector('input[name="urgency"]:checked');
  var reqTypeEl = document.querySelector('input[name="requestType"]:checked');
  var hospEl = document.getElementById('contact-hospital');
  var isHosp = hospEl && hospEl.style.display !== 'none' && hospEl.style.display !== '';

  const birthdate = document.getElementById('f-birthdate').value;
  const age = calculateAge(birthdate);
  const ageGroup = age !== null && age < 13 ? 'PEDIA' : 'ADULT';
  const addressParts = [
    document.getElementById('f-purok').value.trim(),
    document.getElementById('f-barangay').value.trim(),
    document.getElementById('f-municipality').value.trim(),
    document.getElementById('f-province').value.trim()
  ].filter(Boolean);

  document.getElementById('review-patient').innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Patient</div>' +
    reviewRow('Name',        document.getElementById('f-patientName').value.trim()) +
    reviewRow('Date of Birth', birthdate) +
    reviewRow('Age', age + ' years') +
    reviewRow('Sex',         document.getElementById('f-sex').value) +
    reviewRow('Ward',        document.getElementById('f-ward').value.trim() || '—') +
    reviewRow('Room',        document.getElementById('f-room').value.trim() || '—') +
    reviewRow('Address',     addressParts.length ? addressParts.join(' / ') : '—') +
    reviewRow('Physician',   document.getElementById('f-physician').value.trim()) +
    reviewRow('Patient Type', ageGroup) +
    reviewRow('Category',    catEl ? (CATEGORY_LABELS_R[catEl.value] || catEl.value) : '—');

  const componentVal = document.getElementById('f-component').value;
  const plateletCount = document.getElementById('f-plateletCount').value;
  let componentDisplay = COMPONENT_LABELS_R[componentVal] || componentVal;
  
  if (componentVal === 'OTHER') {
    const otherName = document.getElementById('f-otherComponentName').value.trim();
    if (otherName) componentDisplay += ` (${otherName})`;
  }

  document.getElementById('review-blood').innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Blood Details</div>' +
    reviewRow('Blood Type',  BLOOD_LABELS_R[document.getElementById('f-bloodType').value] || document.getElementById('f-bloodType').value) +
    reviewRow('Component',   componentDisplay) +
    reviewRow('Units',       document.getElementById('f-units').value) +
    (componentVal === 'PLATELET_CONCENTRATE' && plateletCount ? reviewRow('Platelet Count', plateletCount) : '') +
    reviewRow('Urgency',     urgEl ? (URGENCY_LABELS_R[urgEl.value] || urgEl.value) : '—') +
    reviewRow('Required By', document.getElementById('f-requiredBy').value || '—') +
    reviewRow('Notes',       document.getElementById('f-notes').value.trim() || '—');

  const diagnosis = document.getElementById('f-diagnosis').value.trim();
  const hemoglobin = document.getElementById('f-hemoglobin').value;
  const hematocrit = document.getElementById('f-hematocrit').value;
  const reqType = reqTypeEl ? reqTypeEl.value : 'ROUTINE';
  const prevTrans = getRadioVal('prevTransfusion');
  const prevTransDate = document.getElementById('f-prevTransDate').value;
  const prevUnits = document.getElementById('f-prevUnits').value;
  const prevReaction = getRadioVal('prevReaction');
  const reactionDate = document.getElementById('f-reactionDate').value;

  let clinicalHtml = '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Clinical Information</div>';
  clinicalHtml += reviewRow('Request Type', REQUEST_TYPE_LABELS_R[reqType] || reqType);
  if (diagnosis) clinicalHtml += reviewRow('Diagnosis/Clinical Impression', diagnosis);
  if (hemoglobin) clinicalHtml += reviewRow('Hemoglobin (g/L)', hemoglobin);
  if (hematocrit) clinicalHtml += reviewRow('Hematocrit (%)', (parseFloat(hematocrit) * 100).toFixed(1));
  clinicalHtml += reviewRow('Previous Transfusion', prevTrans);
  if (prevTrans === 'YES') {
    if (prevTransDate) clinicalHtml += reviewRow('  When', prevTransDate);
    if (prevUnits) clinicalHtml += reviewRow('  Units', prevUnits);
  }
  clinicalHtml += reviewRow('Previous Reaction', prevReaction);
  if (prevReaction === 'YES' && reactionDate) {
    clinicalHtml += reviewRow('  When', reactionDate);
  }
  document.getElementById('review-clinical').innerHTML = clinicalHtml;

  const indicationSubmission = buildIndicationSubmission(componentVal);
  const indications = indicationSubmission.reviewItems;
  let indicationHtml = '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Indications</div>';
  if (indications.length > 0) {
    indicationHtml += '<div style="padding:10px;background:#F0F0F0;border-radius:8px;font-size:12px">';
    indications.forEach(ind => {
      if (ind.additional) {
        indicationHtml += `<div style="margin-bottom:4px"><strong>${ind.code}:</strong> ${ind.additional}</div>`;
      } else {
        indicationHtml += `<div style="margin-bottom:4px"><strong>${ind.code}</strong></div>`;
      }
    });
    indicationHtml += '</div>';
  } else {
    indicationHtml += reviewRow('Selected Indications', 'None selected');
  }
  document.getElementById('review-indications').innerHTML = indicationHtml;

  document.getElementById('review-contact').innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Contact</div>' +
    (isHosp
      ? reviewRow('Hospital', document.getElementById('ch-hospital-name').textContent) +
        reviewRow('Staff',    document.getElementById('ch-staff-name').textContent)
      : reviewRow('Name',         document.getElementById('f-requesterName').value.trim()) +
        reviewRow('Relationship', document.getElementById('f-relationship').value) +
        reviewRow('Contact',      document.getElementById('f-contact').value.trim()));

  document.getElementById('review-doc').innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Document</div>' +
    reviewRow('File', selectedFile ? selectedFile.name : '— (no file)');
}

// ── File upload ────────────────────────────────────────────────
let selectedFile = null;

function handleDrop(e) {
  e.preventDefault();
  document.getElementById('upload-zone').classList.remove('has-file');
  if (e.dataTransfer.files[0]) handleFile(e.dataTransfer.files[0]);
}

function handleFile(file) {
  if (!file) return;
  if (file.size > 10 * 1024 * 1024) {
    showError("File exceeds 10MB limit."); 
    return; 
  }
  if (!['application/pdf', 'image/jpeg', 'image/png'].includes(file.type)) {
    showError("Only PDF, JPG or PNG files are accepted.");
    return;
  }
  selectedFile = file;
  document.getElementById('upload-placeholder').style.display = 'none';
  document.getElementById('upload-preview').style.display = 'block';
  document.getElementById('file-name').textContent = file.name;
  document.getElementById('file-size').textContent =
    file.size < 1024*1024 ? (file.size/1024).toFixed(1)+' KB' : (file.size/(1024*1024)).toFixed(1)+' MB';
  document.getElementById('upload-zone').classList.add('has-file');
}

function clearFile() {
  selectedFile = null;
  document.getElementById('file-input').value = '';
  document.getElementById('upload-placeholder').style.display = 'block';
  document.getElementById('upload-preview').style.display = 'none';
  document.getElementById('upload-zone').classList.remove('has-file');
}

// ── Error helpers ──────────────────────────────────────────────
function showError(msg) {
  const el = document.getElementById('form-error');
  document.getElementById('form-error-msg').textContent = msg;
  el.style.display = 'flex';
  el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function hideError() {
  document.getElementById('form-error').style.display = 'none';
}

function getRadioVal(name) {
  const checked = document.querySelector(`input[name="${name}"]:checked`);
  return checked ? checked.value : '';
}

function getRequesterEmailValue() {
  const emailInput = document.getElementById('f-email');
  if (!emailInput) return null;
  const emailValue = emailInput.value.trim();
  if (!emailValue) return null;
  const normalized = emailValue.toLowerCase();
  if (normalized === 'null' || normalized === 'undefined') return null;
  return emailValue;
}

// ── Submit ─────────────────────────────────────────────────────
async function submitRequest() {
  hideError();
  const ackCheckbox = document.getElementById('ack-confirm');
  if (!ackCheckbox.checked) {
    showError('Please acknowledge that the information provided is accurate before submitting.');
    return;
  }

  const patientName   = document.getElementById('f-patientName').value.trim();
  const patientMiddle = document.getElementById('f-patientMiddle').value.trim();
  const patientLast   = document.getElementById('f-patientLast').value.trim();
  const patientSuffix = document.getElementById('f-patientSuffix').value.trim();
  const patientBirthdate = document.getElementById('f-birthdate').value;
  const patientAge    = calculateAge(patientBirthdate);
  const patientSex    = document.getElementById('f-sex').value;
  const ward          = document.getElementById('f-ward').value.trim();
  const room          = document.getElementById('f-room').value.trim();
  const patientPurok  = document.getElementById('f-purok').value.trim();
  const patientBarangay = document.getElementById('f-barangay').value.trim();
  const patientMunicipality = document.getElementById('f-municipality').value.trim();
  const patientProvince = document.getElementById('f-province').value.trim();
  const requestingPhysician = document.getElementById('f-physician').value.trim();

  const ageGroup        = patientAge !== null && patientAge < 13 ? 'PEDIA' : 'ADULT';
  const requestCategory = getRadioVal('category');

  const bloodType      = document.getElementById('f-bloodType').value;
  const bloodComponent = document.getElementById('f-component').value;
  const numberOfUnits  = document.getElementById('f-units').value;
  const plateletCount  = document.getElementById('f-plateletCount').value;

  const clinicalImpression = document.getElementById('f-diagnosis').value.trim();
  const hemoglobin  = document.getElementById('f-hemoglobin').value;
  const hematocrit  = document.getElementById('f-hematocrit').value;
  const requestType = getRadioVal('requestType');

  const hadPreviousTransfusion  = getRadioVal('prevTransfusion') === 'YES';
  const previousTransfusionDate = document.getElementById('f-prevTransDate').value;
  const previousTransfusionUnits = document.getElementById('f-prevUnits').value;

  const hadPreviousReaction  = getRadioVal('prevReaction') === 'YES';
  const previousReactionDate = document.getElementById('f-reactionDate').value;
  const previousReactionDetails = document.getElementById('f-reactionDetails').value.trim();

  const indicationSubmission  = buildIndicationSubmission(bloodComponent);
  const indication            = indicationSubmission.indication;
  const indicationOtherSpecify = indicationSubmission.indicationOtherSpecify;

  const urgencyLevel = getRadioVal('urgency');
  const requiredBy   = document.getElementById('f-requiredBy').value;
  const notes        = document.getElementById('f-notes').value.trim();

  const otherComponentName = bloodComponent === 'OTHER' ? document.getElementById('f-otherComponentName').value.trim() : null;
  const otherComponentIndication = bloodComponent === 'OTHER' ? document.getElementById('f-otherComponentIndication').value.trim() : null;

  const requesterName         = document.getElementById('f-requesterName').value.trim();
  const requesterRelationship = document.getElementById('f-relationship').value;
  const requesterContact      = document.getElementById('f-contact').value.trim();
  const requesterEmail        = getRequesterEmailValue();

  const requestData = {
    patientName, patientMiddle, patientLast, patientSuffix,
    patientBirthdate: patientBirthdate || null,
    patientAge,
    patientSex: patientSex || null,
    wardRoom: ward || null,
    roomNo: room || null,
    patientPurok: patientPurok || null,
    patientBarangay: patientBarangay || null,
    patientMunicipality: patientMunicipality || null,
    patientProvince: patientProvince || null,
    requestingPhysician,
    ageGroup, requestCategory,
    bloodType, bloodComponent,
    numberOfUnits: numberOfUnits ? parseInt(numberOfUnits) : null,
    plateletCount: plateletCount ? parseInt(plateletCount, 10) : null,
    urgencyLevel,
    requiredBy: requiredBy || null,
    requesterName, requesterRelationship: requesterRelationship || null,
    requesterContact, requesterEmail,
    notes: notes || null,
    clinicalImpression: clinicalImpression || null,
    hemoglobin: hemoglobin ? parseFloat(hemoglobin) : null,
    hematocrit: hematocrit ? parseFloat(hematocrit) : null,
    requestType: requestType || 'ROUTINE',
    hadPreviousTransfusion,
    previousTransfusionDate: previousTransfusionDate || null,
    previousTransfusionUnits: previousTransfusionUnits ? parseInt(previousTransfusionUnits) : null,
    hadPreviousReaction,
    previousReactionDate: previousReactionDate || null,
    previousReactionDetails: previousReactionDetails || null,
    indication: indication || null,
    indicationOtherSpecify,
    otherComponentName, otherComponentIndication
  };

  console.log('=== BLOOD BAG REQUEST DATA (STRUCTURED) ===');
  console.log(JSON.stringify(requestData, null, 2));
  console.log('=== FILE ATTACHED ===');
  console.log(selectedFile ? `${selectedFile.name} (${selectedFile.size} bytes)` : 'No file');

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(requestData)], { type: 'application/json' }));
    if (selectedFile) formData.append('doctorsNote', selectedFile);

    const res  = await fetch('/api/req/blood-requests', { method: 'POST', body: formData });
    const json = await res.json();

    if (!res.ok) {
      showError(json.error || 'Submission failed. Please try again.');
      return;
    }

    const mockRefNum = json.referenceNumber || 
      ('BR-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 100000)).padStart(5, '0'));

    document.getElementById('request-form-body').style.display = 'none';
    document.getElementById('success-screen').style.display = 'block';
    document.getElementById('success-ref').textContent  = mockRefNum;
    document.getElementById('success-email').textContent = requesterEmail || '';

    sessionStorage.setItem(mockRefNum, JSON.stringify({
      refNum: mockRefNum,
      patientName, patientAge, patientSex,
      wardRoom: ward + ' ' + room,
      patientPurok: patientPurok || null,
      patientBarangay: patientBarangay || null,
      patientMunicipality: patientMunicipality || null,
      patientProvince: patientProvince || null,
      requestingPhysician,
      ageGroup, requestCategory,
      bloodType, bloodComponent, numberOfUnits, requiredBy,
      requesterName, requesterRelationship, requesterContact, requesterEmail,
      notes, clinicalImpression, hemoglobin, hematocrit,
      plateletCount: plateletCount ? parseInt(plateletCount, 10) : null,
      requestType, hadPreviousTransfusion, previousTransfusionDate,
      previousTransfusionUnits, hadPreviousReaction, previousReactionDate,
      previousReactionDetails, indication, indicationOtherSpecify,
      otherComponentName, otherComponentIndication,
      status: 'PENDING',
      submittedAt: new Date().toISOString()
    }));

  } catch (err) {
    showError('Error processing request. Please try again.');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Submit Blood Request';
  }
}

function resetForm() {
  document.getElementById('request-form-body').style.display = 'block';
  document.getElementById('success-screen').style.display = 'none';
  clearFile();
  [
    'f-patientName','f-birthdate','f-ward','f-room','f-purok','f-barangay','f-municipality','f-province','f-physician',
    'f-diagnosis','f-hemoglobin','f-hematocrit',
    'f-prevTransDate','f-prevUnits','f-reactionDate','f-reactionDetails',
    'f-requiredBy','f-notes','f-requesterName','f-contact','f-email','f-plateletCount',
    'f-indicationSpecify-LEUKOREDUCED_PRBC','f-indicationSpecify-ALIQUOTED_PRBC','f-indicationSpecify-CRYOSUPERNATANT',
    'f-otherComponentName','f-otherComponentIndication'
  ].forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });
  ['f-sex','f-bloodType','f-component','f-units','f-relationship']
    .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });

  document.getElementById('cat-inpatient').checked = true;
  document.getElementById('urg-med').checked = true;
  document.getElementById('rt-routine').checked = true;
  document.getElementById('pt-no').checked = true;
  document.getElementById('pr-no').checked = true;
  
  togglePrevTransFields();
  toggleReactionFields();
  togglePlateletCountField('');
  updatePatientTypeAndForms();

  // Reset review block animations
  document.querySelectorAll('.review-block').forEach(el => el.classList.remove('revealed'));

  hideError();
  goTo(1);
}

function copyRef() {
  const ref = document.getElementById('success-ref').textContent;
  navigator.clipboard.writeText(ref).catch(() => {});
  const btn = document.querySelector('.btn-copy');
  if (btn) {
    btn.textContent = 'Copied!';
    setTimeout(() => btn.textContent = 'Copy', 2000);
  }
}

// ── Tracker ────────────────────────────────────────────────────
const BLOOD_LABELS = {
  O_NEG:'O−', O_POS:'O+', A_POS:'A+', A_NEG:'A−',
  B_POS:'B+', B_NEG:'B−', AB_POS:'AB+', AB_NEG:'AB−'
};

const COMPONENT_LABELS = {
  WHOLE_BLOOD:'Whole Blood', PRBC:'Packed RBC', LEUKOREDUCED_PRBC:'Leukoreduced PRBC',
  ALIQUOTED_PRBC:'Aliquoted PRBC', PLATELET_CONCENTRATE:'Platelet Concentrate',
  FRESH_FROZEN_PLASMA:'Fresh Frozen Plasma', CRYOPRECIPITATE:'Cryoprecipitate',
  CRYOSUPERNATANT:'Cryosupernatant', WRBC:'Whole Red Blood Cells', OTHER:'Other'
};

const URGENCY_LABELS = {
  LOW:'Low — Scheduled / Within a week',
  MEDIUM:'Medium — 2-3 days',
  HIGH:'High — 24hrs',
  CRITICAL:'Critical — Immediately'
};

const STATUS_CFG = {
  PENDING:    { label:'Pending Review',       badge:'status-pending',   step:1 },
  APPROVED:   { label:'Approved',             badge:'status-approved',  step:2 },
  NEEDS_CONFIRMATION: { label:'Waiting for requester confirmation', badge:'status-pending', step:2 },
  ALLOCATED:  { label:'Allocated',            badge:'status-approved',  step:2 },
  READY_FOR_RELEASE: { label:'Ready for Pickup', badge:'status-released', step:3 },
  RELEASED:   { label:'Released',             badge:'status-released',  step:3 },
  TRANSFUSED: { label:'Transfused',           badge:'status-transfused',step:4 },
  REJECTED:   { label:'Rejected',             badge:'status-rejected',  step:-1 },
  CANCELLED:  { label:'Cancelled',            badge:'status-cancelled', step:-1 }
};

const DEMO_REQUESTS = {
  'BR-2026-00001': {
    refNum: 'BR-2026-00001', patientName: 'Reyes, Maria Santos',
    age: 42, sex: 'FEMALE', bloodType: 'O_POS', component: 'PRBC', units: 2,
    urgency: 'HIGH', category: 'INPATIENT', physician: 'Dr. Fernandez',
    requesterName: 'Jose Reyes', email: 'jose@example.com', status: 'APPROVED',
    submittedAt: '2026-04-10T09:30:00', approvedAt: '2026-04-10T10:15:00',
    adminNotes: 'Stock available. Please proceed to Blood Bank window with transport box.',
  },
  'BR-2026-00002': {
    refNum: 'BR-2026-00002', patientName: 'Santos, Pedro Cruz',
    age: 67, sex: 'MALE', bloodType: 'B_NEG', component: 'WHOLE_BLOOD', units: 1,
    urgency: 'CRITICAL', category: 'EMERGENCY', physician: 'Dr. Villanueva',
    requesterName: 'Ana Santos', email: 'ana@example.com', status: 'REJECTED',
    submittedAt: '2026-04-09T14:00:00',
    rejectionReason: 'B− is currently unavailable at CNPH. Please coordinate with Philippine Red Cross CN Chapter or wait for the next BMC stock delivery (estimated 2 days).',
  },
};

async function trackRequest() {
  const rawInput = document.getElementById('track-input').value.trim();
  const refNum   = rawInput.startsWith('BR-') ? rawInput : ('BR-' + rawInput);

  const resultEl  = document.getElementById('track-result');
  const defaultEl = document.getElementById('track-default');

  let data = null;

  try {
    const res = await fetch(`/api/req/blood-requests/track/${refNum}`);
    if (!res.ok) throw new Error("Not found");
    const api = await res.json();
    console.log(api);
    data = {
      refNum:          api.referenceNumber || api.refNum,
      status:          api.status,
      bloodType:       api.bloodType,
      component:       api.bloodComponent,
      urgency:         api.urgencyLevel,
      physician:       api.requestingPhysician,
      requestedUnits:  api.numberOfUnits || 0,
      approvedUnits:   api.approvedUnits ?? null,
      units:           api.patientAcceptedRemarks === true && api.approvedUnits != null
        ? api.approvedUnits : (api.numberOfUnits ?? 0),
      patientName:     api.patientName,
      patientPurok:    api.patientPurok ?? null,
      patientBarangay: api.patientBarangay ?? null,
      patientMunicipality: api.patientMunicipality ?? null,
      patientProvince: api.patientProvince ?? null,
      submittedAt:     api.requestedAt,
      approvedAt:      api.reviewedAt,
      releasedAt:      null,
      transfusedAt:    null,
      adminNotes:      api.notes,
      approvalRemarks: api.approvalRemarks,
      alternativeComponentSuggestion: api.alternativeComponentSuggestion,
      patientAcceptedRemarks: api.patientAcceptedRemarks ?? null,
      patientRespondedAt:     api.patientRespondedAt ?? null,
      rejectionReason: api.rejectionReason
    };
  } catch (err) {
    data = DEMO_REQUESTS[refNum] ||
      (sessionStorage.getItem(refNum) ? JSON.parse(sessionStorage.getItem(refNum)) : null);
  }

  if (!data) {
    resultEl.style.display = 'block';
    defaultEl.style.display = 'none';
    resultEl.innerHTML = `
      <div class="track-empty">
        <div class="track-empty-icon">🔎</div>
        <div class="track-empty-title">Reference not found</div>
        <div style="font-size:13px;color:var(--muted);max-width:300px;margin:6px auto 0;line-height:1.6">
          No request found for <strong style="font-family:'DM Mono',monospace">${refNum}</strong>.
        </div>
      </div>`;
    return;
  }

  const TRACK_STATUS_CFG = {
    PENDING:          { step: 1, label: "Pending",              badge: "pending" },
    APPROVED:         { step: 3, label: "Approved",             badge: "approved" },
    NEEDS_CONFIRMATION:{ step: 3, label: "Waiting for requester confirmation", badge: "pending" },
    ALLOCATED:        { step: 3, label: "Allocated",            badge: "approved" },
    READY_FOR_RELEASE:{ step: 4, label: "Ready for Release: Pick up in CNPH", badge: "approved" },
    RELEASED:         { step: 5, label: "Released",             badge: "released" },
    REJECTED:         { step: -1, label: "Rejected",            badge: "rejected" },
    CANCELLED:        { step: -1, label: "Cancelled",           badge: "cancelled" }
  };

  const sc = TRACK_STATUS_CFG[data.status] || TRACK_STATUS_CFG.PENDING;
  const currentStep = sc.step;

  const steps = [
    { label: 'Request Submitted',  time: data.submittedAt ? fmtDate(data.submittedAt) : null },
    { label: 'Under Admin Review', time: data.approvedAt  ? fmtDate(data.approvedAt)  : null },
    {
      label: data.status === 'NEEDS_CONFIRMATION'
        ? 'Waiting for Requester Confirmation'
        : data.status === 'APPROVED' && data.patientAcceptedRemarks === true
          ? 'Approved After Requester Confirmation'
          : 'Approved / Allocated',
      time: data.approvedAt ? fmtDate(data.approvedAt) : null
    },
    { label: 'Ready for Release', time: data.releasedAt ? fmtDate(data.releasedAt) : null },
    { label: 'Released',          time: data.releasedAt ? fmtDate(data.releasedAt) : null }
  ];

  function timelineItem(idx, step) {
    const stepNum = idx + 1;
    if (data.status === 'REJECTED' || data.status === 'CANCELLED') {
      if (stepNum > 2) return '';
      const isDone = stepNum === 1;
      return `
        <div class="tl-item">
          <div class="tl-left">
            <div class="tl-dot ${isDone ? 'done' : 'current'}">${isDone ? '✓' : '✕'}</div>
            ${stepNum < 2 ? `<div class="tl-line pending"></div>` : ''}
          </div>
          <div class="tl-content">
            <div class="tl-label">Request ${data.status}</div>
            ${data.rejectionReason ? `<div class="tl-time">${data.rejectionReason}</div>` : ''}
          </div>
        </div>`;
    }
    const isDone    = stepNum < currentStep;
    const isCurrent = stepNum === currentStep;
    return `
      <div class="tl-item">
        <div class="tl-left">
          <div class="tl-dot ${isDone ? 'done' : isCurrent ? 'current' : 'pending'}">
            ${isDone ? '✓' : isCurrent ? '●' : '○'}
          </div>
          ${idx < steps.length - 1 ? `<div class="tl-line ${isDone ? 'done' : 'pending'}"></div>` : ''}
        </div>
        <div class="tl-content">
          <div class="tl-label">${step.label}</div>
          ${step.time
            ? `<div class="tl-time">${step.time}</div>`
            : (isCurrent ? '<div class="tl-time">Done...</div>' : '')}
        </div>
      </div>`;
  }

  let adminNoteHtml = data.rejectionReason
    ? `<div class="admin-note-box rejection"><strong>Reason:</strong> ${data.rejectionReason}</div>`
    : data.approvalRemarks
      ? `<div class="admin-note-box info">
          <strong>Approval update:</strong> ${data.approvalRemarks}<br>
          <strong>Requested units:</strong> ${data.requestedUnits}<br>
          <strong>Approved units:</strong> ${data.approvedUnits ?? data.units}
          ${data.alternativeComponentSuggestion ? `<br><strong>Alternative component:</strong> ${data.alternativeComponentSuggestion}` : ''}
        </div>`
    : data.adminNotes
      ? `<div class="admin-note-box info">📋 <strong>Staff Note:</strong> ${data.adminNotes}</div>`
      : '';

  if (data.status === 'APPROVED' && data.patientAcceptedRemarks === true && data.approvalRemarks) {
    adminNoteHtml = `<div class="admin-note-box info">
        <strong>Approval update accepted:</strong> ${data.approvalRemarks}<br>
        <strong>Requested units:</strong> ${data.requestedUnits}<br>
        <strong>Approved units:</strong> ${data.approvedUnits ?? data.units}
        ${data.alternativeComponentSuggestion ? `<br><strong>Alternative component:</strong> ${data.alternativeComponentSuggestion}` : ''}
      </div>`;
  }

  if (data.status === 'REJECTED' && data.patientAcceptedRemarks === false && data.approvalRemarks) {
    adminNoteHtml = `<div class="admin-note-box rejection">
        <strong>Approval update rejected:</strong> ${data.approvalRemarks}<br>
        <strong>Approved units offered:</strong> ${data.approvedUnits ?? data.requestedUnits}
        ${data.alternativeComponentSuggestion ? `<br><strong>Alternative component:</strong> ${data.alternativeComponentSuggestion}` : ''}
        ${data.patientRespondedAt ? `<br><strong>Requester responded at:</strong> ${fmtDate(data.patientRespondedAt)}` : ''}
      </div>`;
  }

  resultEl.style.display = 'block';
  defaultEl.style.display = 'none';

  resultEl.innerHTML = `
    <div class="track-card">
      <div class="track-card-header">
        <div>
          <div class="track-ref">${data.refNum}</div>
          <div style="font-size:15px;font-weight:700;margin-top:3px;color:var(--charcoal)">${data.patientName}</div>
        </div>
        <span class="status-badge ${sc.badge}">${sc.label}</span>
      </div>
      <div class="track-info-grid">
        <div class="track-info-cell">
          <div class="track-info-label">Blood Type</div>
          <div class="track-info-val">${BLOOD_LABELS[data.bloodType] || data.bloodType}</div>
        </div>
        <div class="track-info-cell">
          <div class="track-info-label">Component</div>
          <div class="track-info-val">${COMPONENT_LABELS[data.component] || data.component}</div>
        </div>
        <div class="track-info-cell">
          <div class="track-info-label">Units</div>
          <div class="track-info-val">${data.units}</div>
        </div>
        <div class="track-info-cell">
          <div class="track-info-label">Urgency</div>
          <div class="track-info-val">${URGENCY_LABELS[data.urgency] || data.urgency}</div>
        </div>
        <div class="track-info-cell">
          <div class="track-info-label">Physician</div>
          <div class="track-info-val">${data.physician || '—'}</div>
        </div>
        <div class="track-info-cell">
          <div class="track-info-label">Submitted</div>
          <div class="track-info-val">${data.submittedAt ? fmtDate(data.submittedAt) : '—'}</div>
        </div>
      </div>
      ${adminNoteHtml}
      <div class="track-timeline">
        <div class="timeline-title">Request Timeline</div>
        <div class="timeline">
          ${steps.map((s, i) => timelineItem(i, s)).join('')}
        </div>
      </div>
    </div>`;
}

function fmtDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-PH', {
    year:'numeric', month:'short', day:'numeric',
    hour:'numeric', minute:'2-digit'
  });
}

// ── Form downloads ─────────────────────────────────────────────
function downloadForm(type) {
  const links = {
    adult: 'forms/Blood_Request_Form_Adult.pdf',
    pedia: 'forms/Blood_Request_Form_Pediatric.pdf'
  };
  const a = document.createElement('a');
  a.href = links[type];
  a.download = type === 'adult' ? 'Blood_Request_Form_Adult.pdf' : 'Blood_Request_Form_Pediatric.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Urgency Level Management ────────────────────────────────────
function updateUrgencyBasedOnRequestType() {
  const requestTypeRadios = document.querySelectorAll('input[name="requestType"]');
  const urgencyGroup   = document.getElementById('urgency-group');
  const urgencyDisplay = document.getElementById('urgency-display');
  
  let selectedType = null;
  requestTypeRadios.forEach(radio => {
    if (radio.checked) selectedType = radio.value;
  });

  if (selectedType === 'STAT') {
    urgencyDisplay.style.display = 'block';
    urgencyGroup.style.display   = 'none';
    document.getElementById('urg-high').checked = true;
  } else if (selectedType === 'ROUTINE') {
    urgencyDisplay.style.display = 'none';
    urgencyGroup.style.display   = 'grid';
  }
}


// ══════════════════════════════════════════════════════════════════════
// SECTION 5: STANDALONE FORM SCANNER (Unchanged from original)
// ══════════════════════════════════════════════════════════════════════

var scannedData    = null;
var tesseractReady = false;

// ── Helpers ─────────────────────────────────────────────────────
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function extractField(text, regex) {
  try {
    const match = text.match(regex);
    if (match) return match[1] || match[0];
  } catch (e) { console.warn('Regex error:', e); }
  return null;
}

function showScannerError(msg) {
  const errorDiv = document.getElementById('scanner-error');
  if (errorDiv) { errorDiv.textContent = '⚠ ' + msg; errorDiv.style.display = 'block'; }
}

function showScannerSuccess(msg) {
  const errorDiv = document.getElementById('scanner-error');
  if (errorDiv) {
    errorDiv.textContent    = msg;
    errorDiv.style.background   = 'rgba(46, 125, 79, 0.08)';
    errorDiv.style.borderColor  = 'rgba(46, 125, 79, 0.2)';
    errorDiv.style.color        = '#2E7D4F';
    errorDiv.style.display      = 'block';
    setTimeout(() => {
      errorDiv.style.display    = 'none';
      errorDiv.style.background = '';
      errorDiv.style.borderColor = '';
      errorDiv.style.color      = '';
    }, 4000);
  }
}

function clearScan() {
  scannedData = null;
  const scanInput   = document.getElementById('scan-input');
  if (scanInput)   scanInput.value = '';
  const placeholder = document.getElementById('scan-placeholder');
  if (placeholder) placeholder.style.display = 'block';
  const preview     = document.getElementById('scan-preview');
  if (preview)     preview.style.display = 'none';
  const resultsBox  = document.getElementById('scanner-results-box');
  if (resultsBox)  resultsBox.style.display = 'none';
  const uploadZone  = document.getElementById('scanner-upload-zone');
  if (uploadZone)  uploadZone.classList.remove('has-file');
}

// ── OCR Extraction ───────────────────────────────────────────────
async function extractFormData(base64, fileType) {
  const detected = {};
  try {
    if (typeof Tesseract === 'undefined') {
      console.warn('Tesseract.js library not loaded');
      showScannerError('OCR library loading... Please try again in a moment.');
      return {};
    }

    console.log('Starting OCR extraction...');
    const result = await Tesseract.recognize(base64, 'eng');
    const text   = result.data.text;
    console.log('OCR completed, text length:', text.length);
    console.log('Raw OCR text:', text.substring(0, 500));

    if (!text || text.length < 10) { console.warn('OCR returned very little text'); return {}; }

    detected.patientName =
      extractField(text, /Surname\s+([A-Za-z\s]+?)(?=Given|Middle|Age)/i) ||
      extractField(text, /PATIENT\s*:\s*([A-Za-z\s]+?)(?=ADDRESS|$)/i);
    detected.patientLast =
      extractField(text, /Given\s+Name\s+([A-Za-z\s]+?)(?=Middle|Age|Sex)/i) ||
      extractField(text, /Given\s+([A-Za-z\s]+?)(?=Middle|Age)/i);
    detected.patientMiddle =
      extractField(text, /Middle\s+Name\s+([A-Za-z\s]+?)(?=Age|Sex|DOB)/i) ||
      extractField(text, /Middle\s+([A-Za-z\s]+?)(?=Age|Sex)/i);
    detected.patientSuffix = extractField(text, /Suffix\s+([A-Za-z0-9\.]*)/i);
    detected.age           = extractField(text, /Age\s+(\d+)/i);
    detected.birthdate     =
      extractField(text, /Date\s+of\s+Birth\s*[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i) ||
      extractField(text, /DOB\s*[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
    detected.sex      = extractField(text, /Sex\s+([MF]|Male|Female)/i);
    detected.ward     = extractField(text, /Ward[\/\s]*Room\s+([^\n\t,]+?)(?=CLINICAL|$)/i);
    detected.room     = extractField(text, /Room\s+([^\n\t,]+?)(?=Ward|CLINICAL|$)/i);
    detected.physician =
      extractField(text, /ATTENDING\s+PHYSICIAN[:\s]+([^\n]+?)(?=$|\n|CONTACT)/i) ||
      extractField(text, /PHYSICIAN[:\s]+([^\n]+?)(?=$|\n)/i);
    detected.contactNum = extractField(text, /CONTACT\s+N(?:UM|UMBER)[:\s]+([0-9\s\-\+]+)/i);

    const btMatch = text.match(/BLOOD\s+TYPE[:\s]*([OAB]+)\s*([+-]|Negative|Positive)?/i);
    if (btMatch) {
      detected.bloodType = btMatch[1].toUpperCase();
      const rh = btMatch[2];
      detected.rh = (rh && (rh.toLowerCase().includes('neg') || rh === '-')) ? '-' : '+';
    }

    detected.hemoglobin  = extractField(text, /HEMOGLOBIN[:\s]*(\d+\.?\d*)/i);
    detected.hematocrit  = extractField(text, /HEMATOCRIT[:\s]*\.?(\d+)/i);
    detected.diagnosis   =
      extractField(text, /CLINICAL\s+IMPRESSION[:\s]+([^\n]+?)(?=$|BLOOD|REQUEST)/i) ||
      extractField(text, /DIAGNOSIS[:\s]+([^\n]+?)(?=$|BLOOD)/i);
    detected.requestType = extractField(text, /REQUEST\s+TYPE[:\s]*\(?([A-Za-z]+)\)?/i);

    if (text.match(/Previous\s+Transfusion.*?Yes/i)) {
      detected.prevTransfusion = 'YES';
      detected.prevTransDate   = extractField(text, /When[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
      detected.prevUnits       = extractField(text, /No\.\s+of\s+units[:\s]+(\d+)/i);
    } else if (text.match(/Previous\s+Transfusion.*?No/i)) {
      detected.prevTransfusion = 'NO';
    }

    if (text.match(/Previous\s+Reaction.*?Yes/i)) {
      detected.prevReaction = 'YES';
      detected.reactionDate = extractField(text, /When[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
    } else if (text.match(/Previous\s+Reaction.*?No/i)) {
      detected.prevReaction = 'NO';
    }

    for (let key in detected) {
      if (detected[key]) detected[key] = String(detected[key]).trim();
    }

    console.log('✓ Extraction complete. Fields found:', Object.keys(detected).filter(k => detected[k]).length);
    return detected;

  } catch (err) {
    console.error('OCR error details:', err);
    return {};
  }
}

// ── Display scan results ──────────────────────────────────────────
function displayScanResults() {
  const resultsDiv = document.getElementById('scanner-results-box');
  const fieldsDiv  = document.getElementById('scanner-fields-found');

  if (!resultsDiv || !fieldsDiv) return;

  let foundFields = [];
  const fieldMap = {
    patientName: 'Patient Name', patientLast: 'Last Name', patientMiddle: 'Middle Name',
    age: 'Age', birthdate: 'Date of Birth', sex: 'Sex', ward: 'Ward', room: 'Room',
    physician: 'Physician', bloodType: 'Blood Type', rh: 'RH', hemoglobin: 'Hemoglobin',
    hematocrit: 'Hematocrit', diagnosis: 'Diagnosis', requestType: 'Request Type',
    prevTransfusion: 'Previous Transfusion', prevReaction: 'Previous Reaction',
    contactNum: 'Contact Number'
  };

  for (const [key, label] of Object.entries(fieldMap)) {
    if (scannedData[key]) {
      foundFields.push(`
        <div class="result-field">
          <span class="result-field-label">${label}</span>
          <span class="result-field-value">${scannedData[key]}</span>
        </div>
      `);
    }
  }

  if (foundFields.length === 0) {
    showScannerError('No recognizable form fields found. Please fill the form manually.');
    clearScan();
    return;
  }

  fieldsDiv.innerHTML = foundFields.join('');
  const statusEl = document.getElementById('scan-status');
  if (statusEl) statusEl.textContent = `✓ Detected ${foundFields.length} field${foundFields.length !== 1 ? 's' : ''}`;
  resultsDiv.style.display = 'block';
}

// ── Apply scan results to form ─────────────────────────────────
function applyScanResults() {
  if (!scannedData) return;

  const mapping = {
    patientName: 'f-patientName', patientLast: 'f-patientLast', patientMiddle: 'f-patientMiddle',
    patientSuffix: 'f-patientSuffix', birthdate: 'f-birthdate', sex: 'f-sex',
    ward: 'f-ward', room: 'f-room', physician: 'f-physician',
    contactNum: 'f-contact', hemoglobin: 'f-hemoglobin', hematocrit: 'f-hematocrit',
    diagnosis: 'f-diagnosis', requestType: 'requestType'
  };

  let filledCount = 0;

  for (const [scanKey, htmlId] of Object.entries(mapping)) {
    const value = scannedData[scanKey];
    if (!value) continue;
    const element = document.getElementById(htmlId);
    try {
      if (scanKey === 'requestType') {
        const match = value.match(/stat|routine/i);
        if (match) {
          const radioValue = match[0].toUpperCase();
          const radio = document.querySelector(`input[name="requestType"][value="${radioValue}"]`);
          if (radio) { radio.checked = true; radio.dispatchEvent(new Event('change')); filledCount++; }
        }
      } else if (scanKey === 'sex') {
        const match = value.match(/M|F|Male|Female/i);
        if (match) {
          const sexValue = match[0].toUpperCase().startsWith('M') ? 'MALE' : 'FEMALE';
          const sexSelect = document.getElementById('f-sex');
          if (sexSelect) { sexSelect.value = sexValue; sexSelect.dispatchEvent(new Event('change')); filledCount++; }
        }
      } else if (scanKey === 'bloodType') {
        const type = value.toUpperCase();
        const rh   = scannedData.rh === '-' ? '_NEG' : '_POS';
        let typeCode = '';
        if (type.includes('O'))       typeCode = 'O' + rh;
        else if (type.includes('AB')) typeCode = 'AB' + rh;
        else if (type.includes('A')) typeCode = 'A' + rh;
        else if (type.includes('B')) typeCode = 'B' + rh;
        if (typeCode) {
          const bloodSelect = document.getElementById('f-bloodType');
          if (bloodSelect) { bloodSelect.value = typeCode; bloodSelect.dispatchEvent(new Event('change')); filledCount++; }
        }
      } else if (element) {
        element.value = value;
        element.dispatchEvent(new Event('change'));
        filledCount++;
      }
    } catch (e) { console.warn(`Error filling ${scanKey}:`, e); }
  }

  const formSection = document.getElementById('form-section');
  if (formSection) formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  showScannerSuccess(`✓ Filled ${filledCount} field${filledCount !== 1 ? 's' : ''} from scan. Please review and edit as needed.`);
  clearScan();
  switchTab('request');
}

// ── Handle scan file upload ─────────────────────────────────────
async function handleScan(file) {
  if (!file) return;
  const uploadZone = document.getElementById('scanner-upload-zone');
  const errorDiv   = document.getElementById('scanner-error');
  if (!uploadZone || !errorDiv) return;

  if (file.size > 10 * 1024 * 1024) { showScannerError("File exceeds 10MB limit."); return; }
  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    showScannerError("Only PDF, JPG, PNG, or WebP files are accepted."); return;
  }

  errorDiv.style.display = 'none';

  const placeholder = document.getElementById('scan-placeholder');
  const preview     = document.getElementById('scan-preview');
  if (placeholder) placeholder.style.display = 'none';
  if (preview)     preview.style.display = 'block';

  const fileName = document.getElementById('scan-file-name');
  if (fileName)   fileName.textContent = file.name;

  const statusEl = document.getElementById('scan-status');
  if (statusEl)   statusEl.innerHTML = '<span class="scanner-spinner"></span> Processing...';

  uploadZone.classList.add('has-file');

  try {
    const base64 = await fileToBase64(file);
    scannedData  = await extractFormData(base64, file.type);

    if (scannedData && Object.keys(scannedData).length > 0) {
      displayScanResults();
    } else {
      showScannerError('Could not detect form fields. Please fill the form manually.');
      clearScan();
    }
  } catch (err) {
    console.error('Scan error:', err);
    showScannerError('Error processing scan: ' + err.message);
    clearScan();
  }
}

// ── Tesseract init ──────────────────────────────────────────────
async function initTesseractWorker() {
  try {
    if (typeof Tesseract === 'undefined') { console.warn('Tesseract.js not available, OCR will be limited'); return false; }
    const worker = await Tesseract.createWorker('eng');
    tesseractReady = true;
    console.log('✓ Tesseract.js loaded successfully');
    return true;
  } catch (err) {
    console.error('Tesseract initialization failed:', err);
    tesseractReady = false;
    return false;
  }
}

// ── Scanner UI init ─────────────────────────────────────────────
function initStandaloneScanner() {
  const uploadZone = document.getElementById('scanner-upload-zone');
  if (uploadZone) {
    uploadZone.style.cursor = 'pointer';
    uploadZone.addEventListener('click', function() { document.getElementById('scan-input').click(); });
    uploadZone.addEventListener('dragover', (e) => { e.preventDefault(); uploadZone.classList.add('drag-over'); });
    uploadZone.addEventListener('dragleave', () => { uploadZone.classList.remove('drag-over'); });
    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) handleScan(e.dataTransfer.files[0]);
    });
  }
  initTesseractWorker();
}

// ── Toggle scanner collapse ─────────────────────────────────────
function toggleScannerPanel() {
  const content = document.getElementById('scanner-content');
  const btn     = document.getElementById('scanner-collapse-btn');
  if (!content || !btn) return;
  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    btn.classList.remove('collapsed');
  } else {
    content.classList.add('collapsed');
    btn.classList.add('collapsed');
  }
}


// ══════════════════════════════════════════════════════════════════════
// SECTION 6: DOMContentLoaded INIT
// ══════════════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', function() {
  injectIndicationStyles();
  initIndicationHandlers();
  initStandaloneScanner();

  // Set minimum date to today for required-by field
  const requiredByInput = document.getElementById('f-requiredBy');
  if (requiredByInput) requiredByInput.min = new Date().toISOString().split('T')[0];

  // Birthdate change handler
  document.getElementById('f-birthdate').addEventListener('change', updatePatientTypeAndForms);

  // Request type radios
  const requestTypeRadios = document.querySelectorAll('input[name="requestType"]');
  requestTypeRadios.forEach(radio => radio.addEventListener('change', updateUrgencyBasedOnRequestType));
  updateUrgencyBasedOnRequestType();

  // Birthdate limits
  const birthdateInput = document.getElementById('f-birthdate');
  if (birthdateInput) {
    const today = new Date().toISOString().split('T')[0];
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 120);
    birthdateInput.max = today;
    birthdateInput.min = minDate.toISOString().split('T')[0];
  }

  // Date validation for prev transfusion / reaction dates
  ['f-prevTransDate', 'f-reactionDate'].forEach(id => {
    const input = document.getElementById(id);
    if (!input) return;
    input.addEventListener('change', function() {
      const selected = new Date(this.value);
      const now = new Date();
      if (selected > now) { alert('Date cannot be in the future.'); this.value = ''; }
    });
  });
});