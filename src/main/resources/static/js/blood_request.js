
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
  if (n > currentPage && !validate(currentPage)) return;
  document.getElementById('page-' + currentPage).classList.remove('active');
  currentPage = n;
  document.getElementById('page-' + n).classList.add('active');
  updateStepper(n);
  if (n === 4) buildReview();
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

  if (age <= 13) {
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
  if (formDownloadButtons) {
    formDownloadButtons.innerHTML = formHtml;
  }
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
    if (!document.getElementById('f-room').value.trim())
      return showError('Please enter the room number.'), false;
    if (!document.getElementById('f-purok').value.trim())
      return showError('Please enter the purok.'), false;
    if (!document.getElementById('f-barangay').value.trim())
      return showError('Please enter the barangay.'), false;
    if (!document.getElementById('f-municipality').value.trim())
      return showError('Please enter the municipality.'), false;
    if (!document.getElementById('f-province').value.trim())
      return showError('Please enter the province.'), false;
    if (!validateClinicalAndContactErrors('page1'))
      return false;
  }

  if (page === 2) {
    if (!document.getElementById('f-bloodType').value)
      return showError('Please select the blood type needed.'), false;
    if (!document.getElementById('f-component').value)
      return showError('Please select the blood component needed.'), false;
    if (!document.getElementById('f-units').value)
      return showError('Please select the number of units needed.'), false;
    if (!validateUnitsField())
      return showError('Please enter a valid number of units from 1 to 99 (up to 2 digits).'), false;
    if (!getRadioVal('urgency'))
      return showError('Please select an urgency level.'), false;
    if (!document.getElementById('f-diagnosis').value.trim())
      return showError('Please enter Clinical Impression / Diagnosis. If none, type N/A.'), false;
    if (!document.getElementById('f-hemoglobin').value.trim())
      return showError('Please enter hemoglobin.'), false;
    if (!document.getElementById('f-hematocrit').value.trim())
      return showError('Please enter hematocrit.'), false;

    // Check if indications are required for this component
    const selectedComponent = document.getElementById('f-component').value;
    const birthdate = document.getElementById('f-birthdate').value;
    const age = calculateAge(birthdate);
    const ageGroup = age !== null && age <= 13 ? 'PEDIA' : 'ADULT';
    
    // Components that REQUIRE indications
    const requiresIndications = [
      'WHOLE_BLOOD', 'PRBC', 'WRBC', 'PLATELET_CONCENTRATE', 
      'FRESH_FROZEN_PLASMA', 'CRYOPRECIPITATE'
    ];
    
    // If component requires indications, validate that at least one is selected
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
    
    // If component is OTHER, require component name and indication text
    if (selectedComponent === 'OTHER') {
      if (!document.getElementById('f-otherComponentName').value.trim())
        return showError('Please enter the component name.'), false;
      if (!document.getElementById('f-otherComponentIndication').value.trim())
        return showError('Please specify the indication(s) for this component.'), false;
    }

    if (!validateClinicalAndContactErrors('page2'))
      return false;
  }

  if (page === 3) {
    if (!selectedFile)
      return showError('Please upload the Doctor\'s Note or Blood Request Form.'), false;
    if (!document.getElementById('f-notes').value.trim())
      return showError('Please enter Additional Notes. If none, type N/A.'), false;
    var isHosp = isHospitalSubmissionMode();
    if (!isHosp) {
      if (!document.getElementById('f-requesterName').value.trim())
        return showError('Please enter your full name.'), false;
      if (document.getElementById('f-requesterName').value.trim().length > 50)
        return showError('Relative full name must be 50 characters or fewer.'), false;
      if (!document.getElementById('f-relationship').value)
        return showError('Please select your relationship to the patient.'), false;
      if (!validateClinicalAndContactErrors('page3'))
        return false;
      if (!ensureValidStaffUniqueCode(false))
        return false;
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
    const ageGroup = age !== null && age <= 13 ? 'PEDIA' : 'ADULT';
    const component = componentSelect.value;

    togglePlateletCountField(component);

    // Hide all groups
    document.querySelectorAll('.indication-group').forEach(group => {
      group.style.display = 'none';
    });

    // Show appropriate group
    if (component) {
      let groupId = `group-${component}`;
      // For pediatric, append -PEDIA to specific components
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

    // Clear all checkboxes when component changes
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

  // Handle parent checkbox expansion (for sub-items)
  document.querySelectorAll('.indication-checkbox:not(.sub)').forEach(checkbox => {
    checkbox.addEventListener('change', function() {
      const subGroupId = `sub-${this.value}`;
      const subGroup = document.getElementById(subGroupId);
      
      if (subGroup) {
        if (this.checked) {
          subGroup.classList.add('active');
        } else {
          subGroup.classList.remove('active');

          // Uncheck sub-items
          subGroup.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
          });
        }
      }
    });
  });

  // ══════════════════════════════════════════════════════════════
  // HANDLE TEXT INPUT FOR "OTHERS" OPTIONS — WITH VISIBILITY TOGGLE
  // ══════════════════════════════════════════════════════════════
  document.querySelectorAll('input[type="text"][data-ref]').forEach(input => {
    const checkboxId = `ind-${input.dataset.ref}`;
    const checkbox = document.getElementById(checkboxId);
    
    if (checkbox) {
      // Start hidden
      input.style.display = 'none';
      
      // Show when checkbox is checked, hide when unchecked
      checkbox.addEventListener('change', function() {
        if (this.checked) {
          input.style.display = 'inline-block';
          input.focus();
        } else {
          input.style.display = 'none';
          input.value = '';
        }
      });
      
      // Auto-check box if user types in the field
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

/**
 * Build the indicationOtherSpecify string for submission.
 * Format: "WB-2:reason1,R-5:reason2,P-6:reason3"
 * Only includes codes that have a text input with content.
 */
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
      font-size: 13px;
      line-height: 1.5;
    }

    .indication-item input[type="checkbox"] {
      margin-top: 3px;
      flex-shrink: 0;
      width: 18px;
      height: 18px;
      cursor: pointer;
    }

    .indication-item label {
      cursor: pointer;
      flex: 1;
    }

    .indication-sub-group {
      margin: -8px 0 12px 28px;
      padding: 10px 0 0 12px;
      border-left: 2px solid #C41E3A;
      background: rgba(196, 30, 58, 0.03);
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
  LOW: 'Low — Scheduled', MEDIUM: 'Medium — Within a week',
  HIGH: 'High — 2–3 days', CRITICAL: 'Critical — Immediately'
};

var CATEGORY_LABELS_R = {
  INPATIENT: 'Inpatient (CNPH)', OUTPATIENT: 'Outpatient', EMERGENCY: 'Emergency'
};

URGENCY_LABELS_R = {
  LOW: 'Low — Scheduled / Within a week',
  MEDIUM: 'Medium — 2-3 days',
  HIGH: 'High — 24hrs',
  CRITICAL: 'Critical — Immediately'
};

CATEGORY_LABELS_R = {
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
  var isHosp = isHospitalSubmissionMode();
  const departmentPreview = isHosp
    ? 'Linked to hospital account'
    : 'Auto-detected from Staff Authorization Code';

  // Calculate age from birthdate
  const birthdate = document.getElementById('f-birthdate').value;
  const age = calculateAge(birthdate);
  const ageGroup = age !== null && age <= 13 ? 'PEDIA' : 'ADULT';
  const addressParts = [
    document.getElementById('f-purok').value.trim(),
    document.getElementById('f-barangay').value.trim(),
    document.getElementById('f-municipality').value.trim(),
    document.getElementById('f-province').value.trim()
  ].filter(Boolean);

  // ── Patient section ──
  document.getElementById('review-patient').innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Patient</div>' +
    reviewRow('Name',        document.getElementById('f-patientName').value.trim()) +
    reviewRow('Date of Birth', birthdate) +
    reviewRow('Age', age + ' years') +
    reviewRow('Sex',         document.getElementById('f-sex').value) +
    reviewRow('Department',  departmentPreview) +
    reviewRow('Room',        document.getElementById('f-room').value.trim() || '—') +
    reviewRow('Address',     addressParts.length ? addressParts.join(' / ') : '—') +
    reviewRow('Physician',   document.getElementById('f-physician').value.trim()) +
    reviewRow('Patient Type', ageGroup) +
    reviewRow('Category',    catEl ? (CATEGORY_LABELS_R[catEl.value] || catEl.value) : '—');

  // ── Blood details section ──
  const componentVal = document.getElementById('f-component').value;
  const plateletCount = document.getElementById('f-plateletCount').value;
  let componentDisplay = COMPONENT_LABELS_R[componentVal] || componentVal;
  
  // If OTHER, append the component name
  if (componentVal === 'OTHER') {
    const otherName = document.getElementById('f-otherComponentName').value.trim();
    if (otherName) {
      componentDisplay += ` (${otherName})`;
    }
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

  // ── Clinical section ──
  const diagnosis = document.getElementById('f-diagnosis').value.trim();
  const hemoglobin = document.getElementById('f-hemoglobin').value;
  const hematocritRaw = document.getElementById('f-hematocrit').value;
  const hematocrit = hematocritRaw === '.' ? '' : hematocritRaw;
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
  if (/^\.\d{1,4}$/.test(hematocrit)) clinicalHtml += reviewRow('Hematocrit (%)', (parseFloat(`0${hematocrit}`) * 100).toFixed(1));
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

  // ── Indications section ──
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

  // ── Contact section ──
  document.getElementById('review-contact').innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Contact</div>' +
    (isHosp
      ? reviewRow('Hospital', document.getElementById('ch-hospital-name').textContent) +
        reviewRow('Staff',    document.getElementById('ch-staff-name').textContent)
      : reviewRow('Name',         document.getElementById('f-requesterName').value.trim()) +
        reviewRow('Relationship', document.getElementById('f-relationship').value) +
        reviewRow('Contact',      document.getElementById('f-contact').value.trim()) +
        reviewRow('Staff Authorization Code', normalizeStaffUniqueCode(document.getElementById('f-staffUniqueCode').value || '') || '-'));

  // ── Documents section ──
  document.getElementById('review-doc').innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Document</div>' +
    reviewRow('File', selectedFile ? selectedFile.name : '— (no file)');

  // Reveal review blocks with a small stagger so Step 4 content is visible.
  const reviewBlocks = document.querySelectorAll('#page-4 .review-block');
  reviewBlocks.forEach(block => block.classList.remove('revealed'));
  window.requestAnimationFrame(() => {
    reviewBlocks.forEach((block, index) => {
      setTimeout(() => block.classList.add('revealed'), index * 60);
    });
  });
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

function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(`${inputId}-error`);
  if (input) input.classList.add('field-error');
  if (errorEl) {
    errorEl.textContent = message || '';
    errorEl.classList.add('show');
  }
}

function clearFieldError(inputId) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(`${inputId}-error`);
  if (input) input.classList.remove('field-error');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.classList.remove('show');
  }
}

function validateSuffixField() {
  const input = document.getElementById('f-patientSuffix');
  if (!input) return true;

  const normalized = (input.value || '').trim().replace(/\s{2,}/g, ' ');
  input.value = normalized;
  clearFieldError('f-patientSuffix');

  if (!normalized) return true;

  if (normalized.length > 10 || !/^[A-Za-z0-9. ]+$/.test(normalized)) {
    setFieldError('f-patientSuffix', 'Suffix may only contain letters, numbers, spaces, and periods.');
    return false;
  }

  return true;
}

function enforceHemoglobinFormat() {
  const input = document.getElementById('f-hemoglobin');
  if (!input) return;
  input.value = String(input.value || '').replace(/\D/g, '').slice(0, 3);
}

function enforceHematocritFormat() {
  const input = document.getElementById('f-hematocrit');
  if (!input) return;

  let raw = String(input.value || '');
  if (!raw.trim()) {
    input.value = '.';
    return;
  }

  raw = raw.replace(/\s+/g, '').replace(/[^0-9.]/g, '');
  const dotIdx = raw.indexOf('.');
  const tail = (dotIdx >= 0 ? raw.slice(dotIdx + 1) : raw).replace(/\./g, '');
  input.value = `.${tail.slice(0, 4)}`;
}

function validateHemoglobinField() {
  const input = document.getElementById('f-hemoglobin');
  if (!input) return true;

  const value = (input.value || '').trim();
  clearFieldError('f-hemoglobin');

  if (!value) return true;

  if (!/^\d{1,3}$/.test(value)) {
    setFieldError('f-hemoglobin', 'Hemoglobin must contain numbers only and up to 3 digits.');
    return false;
  }

  return true;
}

function validateHematocritField() {
  const input = document.getElementById('f-hematocrit');
  if (!input) return true;

  const value = (input.value || '').trim();
  clearFieldError('f-hematocrit');

  if (!value || value === '.') return true;

  if (!/^\.\d{1,4}$/.test(value)) {
    setFieldError('f-hematocrit', 'Hematocrit must follow decimal format like .25');
    return false;
  }

  const numeric = Number(`0${value}`);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) {
    setFieldError('f-hematocrit', 'Hematocrit must follow decimal format like .25');
    return false;
  }

  return true;
}

function enforceUnitsFormat() {
  const input = document.getElementById('f-units');
  if (!input) return;

  let digits = String(input.value || '').replace(/\D/g, '').slice(0, 2);
  if (digits) {
    const numeric = parseInt(digits, 10);
    if (numeric <= 0) {
      digits = '';
    } else if (numeric > 99) {
      digits = '99';
    }
  }
  input.value = digits;
}

function validateUnitsField() {
  const input = document.getElementById('f-units');
  if (!input) return true;

  const value = String(input.value || '').trim();
  if (!value) return false;
  if (!/^\d{1,2}$/.test(value)) return false;

  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= 1 && numeric <= 99;
}

function formatAndLockContactNumber() {
  const input = document.getElementById('f-contact');
  if (!input) return '';

  let value = String(input.value || '');
  if (!value.trim()) {
    input.value = '+63';
    return input.value;
  }

  let digits = value.replace(/\D/g, '');
  if (digits.startsWith('63')) digits = digits.slice(2);
  digits = digits.slice(0, 10);

  input.value = `+63${digits}`;

  return input.value;
}

function validateContactNumberField() {
  const input = document.getElementById('f-contact');
  if (!input || isHospitalSubmissionMode()) return true;

  const normalized = formatAndLockContactNumber();
  clearFieldError('f-contact');

  if (!/^\+639\d{9}$/.test(normalized)) {
    setFieldError('f-contact', 'Contact number must start with +63 followed by exactly 10 digits.');
    return false;
  }

  return true;
}

function validateClinicalAndContactErrors(scope = 'all') {
  const firstInvalid = [];

  if (scope === 'all' || scope === 'page1') {
    if (!validateSuffixField()) firstInvalid.push('f-patientSuffix');
  }

  if (scope === 'all' || scope === 'page2') {
    if (!validateHemoglobinField()) firstInvalid.push('f-hemoglobin');
    if (!validateHematocritField()) firstInvalid.push('f-hematocrit');
  }

  if ((scope === 'all' || scope === 'page3') && !isHospitalSubmissionMode()) {
    if (!validateContactNumberField()) firstInvalid.push('f-contact');
  }

  if (firstInvalid.length > 0) {
    const firstInput = document.getElementById(firstInvalid[0]);
    showError('Please fix the highlighted field errors before proceeding.');
    if (firstInput) {
      firstInput.focus();
      firstInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    return false;
  }

  return true;
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
  if (normalized === 'null' || normalized === 'undefined') {
    return null;
  }

  return emailValue;
}

function isHospitalSubmissionMode() {
  const hospEl = document.getElementById('contact-hospital');
  return !!(hospEl && hospEl.style.display !== 'none' && hospEl.style.display !== '');
}

function normalizeStaffUniqueCode(rawValue) {
  if (!rawValue) return '';
  const compact = String(rawValue).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  if (compact.length <= 4) return compact;
  return `${compact.slice(0, 4)}-${compact.slice(4)}`;
}

function handleStaffCodeInput() {
  const input = document.getElementById('f-staffUniqueCode');
  if (!input) return;
  input.value = normalizeStaffUniqueCode(input.value);
  clearStaffCodeError();
}

function showStaffCodeError(message) {
  const input = document.getElementById('f-staffUniqueCode');
  const errEl = document.getElementById('f-staffUniqueCode-error');
  if (input) input.classList.add('input-error');
  if (errEl) {
    errEl.textContent = message || '';
    errEl.classList.add('show');
  }
}

function clearStaffCodeError() {
  const input = document.getElementById('f-staffUniqueCode');
  const errEl = document.getElementById('f-staffUniqueCode-error');
  if (input) input.classList.remove('input-error');
  if (errEl) {
    errEl.textContent = '';
    errEl.classList.remove('show');
  }
}

function isStaffCodeErrorMessage(message) {
  return message === 'Staff authorization code is required.' ||
         message === 'Invalid staff authorization code.';
}

function ensureValidStaffUniqueCode(showModal) {
  const input = document.getElementById('f-staffUniqueCode');
  if (!input) return true;

  const normalized = normalizeStaffUniqueCode(input.value);
  input.value = normalized;

  if (!normalized) {
    const message = 'Staff authorization code is required.';
    showStaffCodeError(message);
    if (showModal) {
      showBloodPlusModal('Authorization Required', message, 'warning');
    }
    input.focus();
    return false;
  }

  if (!/^[A-Z0-9]{4}-[A-Z0-9]{4}$/.test(normalized)) {
    const message = 'Invalid staff authorization code.';
    showStaffCodeError(message);
    if (showModal) {
      showBloodPlusModal('Invalid Authorization Code', message, 'error');
    }
    input.focus();
    return false;
  }

  clearStaffCodeError();
  return true;
}

function showBloodPlusModal(title, message, type = 'info') {
  const overlay = document.getElementById('bloodplus-modal-overlay');
  const titleEl = document.getElementById('bloodplus-modal-title');
  const messageEl = document.getElementById('bloodplus-modal-message');
  const iconEl = document.getElementById('bloodplus-modal-icon');
  if (!overlay || !titleEl || !messageEl || !iconEl) return;

  titleEl.textContent = title || 'Notice';
  messageEl.textContent = message || '';
  iconEl.className = 'bp-modal-icon';

  const typeMap = {
    success: { cls: 'bp-modal-success', icon: 'OK' },
    error: { cls: 'bp-modal-error', icon: '!' },
    warning: { cls: 'bp-modal-warning', icon: '!' },
    info: { cls: 'bp-modal-info', icon: 'i' }
  };
  const selectedType = typeMap[type] || typeMap.info;
  iconEl.classList.add(selectedType.cls);
  iconEl.textContent = selectedType.icon;

  overlay.classList.add('show');
  overlay.setAttribute('aria-hidden', 'false');
}

function closeBloodPlusModal() {
  const overlay = document.getElementById('bloodplus-modal-overlay');
  if (!overlay) return;
  overlay.classList.remove('show');
  overlay.setAttribute('aria-hidden', 'true');
}

// ── Submit with CALCULATED AGE FROM BIRTHDATE ─────────────────
async function submitRequest() {
  hideError();
  clearStaffCodeError();
  const ackCheckbox = document.getElementById('ack-confirm');
  if (!ackCheckbox.checked) {
    showError('Please acknowledge that the information provided is accurate before submitting.');
    return;
  }

  if (!validate(1) || !validate(2) || !validate(3)) {
    return;
  }

  if (!validateClinicalAndContactErrors('all')) {
    return;
  }

  // ──────────────────────────────────────────────
  // PATIENT INFORMATION (PAGE 1)
  // ──────────────────────────────────────────────
  const patientName   = document.getElementById('f-patientName').value.trim();
  const patientMiddle   = document.getElementById('f-patientMiddle').value.trim();
  const patientLast   = document.getElementById('f-patientLast').value.trim();
  const patientSuffix   = document.getElementById('f-patientSuffix').value.trim();
  const patientBirthdate = document.getElementById('f-birthdate').value;
  const patientAge = calculateAge(patientBirthdate);
  const patientSex    = document.getElementById('f-sex').value;
  const room      = document.getElementById('f-room').value.trim();
  const patientPurok = document.getElementById('f-purok').value.trim();
  const patientBarangay = document.getElementById('f-barangay').value.trim();
  const patientMunicipality = document.getElementById('f-municipality').value.trim();
  const patientProvince = document.getElementById('f-province').value.trim();
  const requestingPhysician = document.getElementById('f-physician').value.trim();

  // ──────────────────────────────────────────────
  // PATIENT TYPE & CATEGORY (PAGE 1)
  // ──────────────────────────────────────────────
  const ageGroup      = patientAge !== null && patientAge <= 13 ? 'PEDIA' : 'ADULT';
  const requestCategory = getRadioVal('category');

  // ──────────────────────────────────────────────
  // BLOOD DETAILS (PAGE 2)
  // ──────────────────────────────────────────────
  const bloodType     = document.getElementById('f-bloodType').value;
  const bloodComponent = document.getElementById('f-component').value;
  const numberOfUnits = document.getElementById('f-units').value;
  const plateletCount = document.getElementById('f-plateletCount').value;

  // ──────────────────────────────────────────────
  // CLINICAL INFORMATION (PAGE 2)
  // ──────────────────────────────────────────────
  const clinicalImpression = document.getElementById('f-diagnosis').value.trim();
  const hemoglobin = document.getElementById('f-hemoglobin').value;
  const hematocritRaw = document.getElementById('f-hematocrit').value;
  const hematocrit = hematocritRaw === '.' ? '' : hematocritRaw;
  const requestType = getRadioVal('requestType');

  // ──────────────────────────────────────────────
  // TRANSFUSION HISTORY (PAGE 2)
  // ──────────────────────────────────────────────
  const hadPreviousTransfusion = getRadioVal('prevTransfusion') === 'YES';
  const previousTransfusionDate = document.getElementById('f-prevTransDate').value;
  const previousTransfusionUnits = document.getElementById('f-prevUnits').value;

  // ──────────────────────────────────────────────
  // REACTION HISTORY (PAGE 2)
  // ──────────────────────────────────────────────
  const hadPreviousReaction = getRadioVal('prevReaction') === 'YES';
  const previousReactionDate = document.getElementById('f-reactionDate').value;
  const previousReactionDetails = document.getElementById('f-reactionDetails').value.trim();

  // ──────────────────────────────────────────────
  // INDICATIONS FOR TRANSFUSION (PAGE 2)
  // ──────────────────────────────────────────────
  const indicationSubmission = buildIndicationSubmission(bloodComponent);
  const indication = indicationSubmission.indication;
  const indicationOtherSpecify = indicationSubmission.indicationOtherSpecify;

  // ──────────────────────────────────────────────
  // URGENCY & TIMING (PAGE 2)
  // ──────────────────────────────────────────────
  const urgencyLevel  = getRadioVal('urgency');
  const requiredBy    = document.getElementById('f-requiredBy').value;

  // ──────────────────────────────────────────────
  // NOTES (PAGE 3)
  // ──────────────────────────────────────────────
  const notes = document.getElementById('f-notes').value.trim();

  // ──────────────────────────────────────────────
  // OTHER COMPONENT (if component = OTHER)
  // ──────────────────────────────────────────────
  const otherComponentName = bloodComponent === 'OTHER' ? document.getElementById('f-otherComponentName').value.trim() : null;
  const otherComponentIndication = bloodComponent === 'OTHER' ? document.getElementById('f-otherComponentIndication').value.trim() : null;

  // ──────────────────────────────────────────────
  // CONTACT / REQUESTER INFORMATION (PAGE 3)
  // ──────────────────────────────────────────────
  const requesterName = document.getElementById('f-requesterName').value.trim();
  const requesterRelationship = document.getElementById('f-relationship').value;
  const requesterContact = document.getElementById('f-contact').value.trim();
  const requesterEmail = getRequesterEmailValue();
  const isHosp = isHospitalSubmissionMode();
  const staffCodeInput = document.getElementById('f-staffUniqueCode');
  const staffUniqueCode = isHosp ? null : normalizeStaffUniqueCode(staffCodeInput ? staffCodeInput.value : '');

  if (!isHosp && !ensureValidStaffUniqueCode(true)) {
    return;
  }

  // ══════════════════════════════════════════════════════════════
  // BUILD COMPLETE DATA OBJECT (MATCHING BloodBagRequestDTO)
  // AGE IS CALCULATED FROM BIRTHDATE
  // ══════════════════════════════════════════════════════════════
  const requestData = {
    // PATIENT INFO
    patientName: patientName,
    patientMiddle: patientMiddle,
    patientLast: patientLast,
    patientSuffix: patientSuffix,
    patientBirthdate: patientBirthdate ? patientBirthdate : null,
    patientAge: patientAge,
    patientSex: patientSex || null,
    roomNo: room || null,
    patientPurok: patientPurok || null,
    patientBarangay: patientBarangay || null,
    patientMunicipality: patientMunicipality || null,
    patientProvince: patientProvince || null,
    requestingPhysician: requestingPhysician,

    // PATIENT TYPE & CATEGORY
    ageGroup: ageGroup,
    requestCategory: requestCategory,

    // BLOOD DETAILS
    bloodType: bloodType,
    bloodComponent: bloodComponent,
    numberOfUnits: numberOfUnits ? parseInt(numberOfUnits) : null,
    plateletCount: plateletCount ? parseInt(plateletCount, 10) : null,

    // URGENCY & TIMING
    urgencyLevel: urgencyLevel,
    requiredBy: requiredBy || null,

    // CONTACT / REQUESTER
    requesterName: requesterName,
    requesterRelationship: requesterRelationship || null,
    requesterContact: requesterContact,
    requesterEmail: requesterEmail,
    staffUniqueCode: staffUniqueCode || null,

    // NOTES
    notes: notes || null,

    // CLINICAL INFORMATION
    clinicalImpression: clinicalImpression || null,
    hemoglobin: hemoglobin ? parseFloat(hemoglobin) : null,
    hematocrit: hematocrit ? parseFloat(hematocrit) : null,
    requestType: requestType || 'ROUTINE',

    // TRANSFUSION HISTORY (STRUCTURED)
    hadPreviousTransfusion: hadPreviousTransfusion,
    previousTransfusionDate: previousTransfusionDate || null,
    previousTransfusionUnits: previousTransfusionUnits ? parseInt(previousTransfusionUnits) : null,

    // REACTION HISTORY (STRUCTURED)
    hadPreviousReaction: hadPreviousReaction,
    previousReactionDate: previousReactionDate || null,
    previousReactionDetails: previousReactionDetails || null,

    // INDICATIONS
    indication: indication || null,
    indicationOtherSpecify: indicationOtherSpecify,

    // OTHER COMPONENT (if applicable)
    otherComponentName: otherComponentName,
    otherComponentIndication: otherComponentIndication
  };
  

  // Log to console for development
  console.log('=== BLOOD BAG REQUEST DATA (STRUCTURED) ===');
  console.log(JSON.stringify(requestData, null, 2));
  console.log('=== FILE ATTACHED ===');
  console.log(selectedFile ? `${selectedFile.name} (${selectedFile.size} bytes)` : 'No file');

  // Disable button during submission
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    // Build FormData with JSON data and file
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(requestData)], { type: 'application/json' }));
    if (selectedFile) {
      formData.append('doctorsNote', selectedFile);
    }

    // Send to backend
    const res = await fetch('/api/req/blood-requests', {
      method: 'POST',
      body: formData
    });

    const json = await res.json();

    if (!res.ok) {
      const errorMessage = json && json.error ? json.error : 'Submission failed. Please try again.';
      if (isStaffCodeErrorMessage(errorMessage)) {
        showStaffCodeError(errorMessage);
        showBloodPlusModal('Authorization Code Error', errorMessage, 'error');
      } else {
        showBloodPlusModal('Submission Failed', errorMessage, 'error');
      }
      return;
    }

    // Success: generate/retrieve reference number
    const mockRefNum = json.referenceNumber || 
      ('BR-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 100000)).padStart(5, '0'));

    // Hide form, show success screen
    document.getElementById('request-form-body').style.display = 'none';
    document.getElementById('success-screen').style.display = 'block';
    document.getElementById('success-ref').textContent = mockRefNum;
    const contactEmail = (json.contactEmail || requesterEmail || '').trim();
    document.getElementById('success-email').textContent = contactEmail;

    // Store in session for tracker (including all fields)
    sessionStorage.setItem(mockRefNum, JSON.stringify({
      refNum: mockRefNum,
      patientName: patientName,
      patientAge: patientAge,
      patientSex: patientSex,
      roomNo: room || null,
      patientPurok: patientPurok || null,
      patientBarangay: patientBarangay || null,
      patientMunicipality: patientMunicipality || null,
      patientProvince: patientProvince || null,
      requestingPhysician: requestingPhysician,
      ageGroup: ageGroup,
      requestCategory: requestCategory,
      bloodType: bloodType,
      bloodComponent: bloodComponent,
      numberOfUnits: numberOfUnits,
      requiredBy: requiredBy,
      requesterName: requesterName,
      requesterRelationship: requesterRelationship,
      requesterContact: requesterContact,
      requesterEmail: contactEmail,
      staffUniqueCode: staffUniqueCode,
      notes: notes,
      clinicalImpression: clinicalImpression,
      hemoglobin: hemoglobin,
      hematocrit: hematocrit,
      plateletCount: plateletCount ? parseInt(plateletCount, 10) : null,
      requestType: requestType,
      hadPreviousTransfusion: hadPreviousTransfusion,
      previousTransfusionDate: previousTransfusionDate,
      previousTransfusionUnits: previousTransfusionUnits,
      hadPreviousReaction: hadPreviousReaction,
      previousReactionDate: previousReactionDate,
      previousReactionDetails: previousReactionDetails,
      indication: indication,
      indicationOtherSpecify: indicationOtherSpecify,
      otherComponentName: otherComponentName,
      otherComponentIndication: otherComponentIndication,
      status: 'PENDING',
      submittedAt: new Date().toISOString()
    }));

  } catch (err) {
    showBloodPlusModal('Network Error', 'Error processing request. Please try again.', 'error');
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
      'f-patientName','f-birthdate','f-room','f-purok','f-barangay','f-municipality','f-province','f-physician',
      'f-diagnosis','f-hemoglobin','f-hematocrit',
      'f-prevTransDate','f-prevUnits','f-reactionDate','f-reactionDetails',
      'f-requiredBy','f-notes','f-requesterName','f-contact','f-email','f-plateletCount','f-staffUniqueCode',
      'f-indicationSpecify-LEUKOREDUCED_PRBC','f-indicationSpecify-ALIQUOTED_PRBC','f-indicationSpecify-CRYOSUPERNATANT',
      'f-otherComponentName','f-otherComponentIndication'
    ].forEach(id => { 
      const el = document.getElementById(id);
      if (el) el.value = ''; 
    });
  ['f-sex','f-bloodType','f-component','f-units','f-relationship']
    .forEach(id => { 
      const el = document.getElementById(id);
      if (el) el.value = '';
    });
  // Reset radios
  document.getElementById('cat-inpatient').checked = true;
  document.getElementById('urg-med').checked = true;
  document.getElementById('rt-routine').checked = true;
  document.getElementById('pt-no').checked = true;
  document.getElementById('pr-no').checked = true;
  
    // Hide/reset conditional fields
    togglePrevTransFields();
    toggleReactionFields();
    togglePlateletCountField('');
    updatePatientTypeAndForms();
  
  hideError();
  clearStaffCodeError();
  closeBloodPlusModal();
  goTo(1);
}

async function copyRef() {
  const refEl = document.getElementById('success-ref');
  const btn = document.querySelector('.btn-copy');
  const ref = refEl ? String(refEl.textContent || '').trim() : '';
  if (!ref) return;

  const setBtnState = (text) => {
    if (!btn) return;
    btn.textContent = text;
    setTimeout(() => {
      btn.textContent = 'Copy';
    }, 1800);
  };

  // Primary path: async clipboard API
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(ref);
      setBtnState('Copied!');
      return;
    }
  } catch (_err) {
    // fall through to legacy copy
  }

  // Fallback: temporary textarea + execCommand
  try {
    const temp = document.createElement('textarea');
    temp.value = ref;
    temp.setAttribute('readonly', '');
    temp.style.position = 'fixed';
    temp.style.opacity = '0';
    temp.style.pointerEvents = 'none';
    temp.style.left = '-9999px';
    document.body.appendChild(temp);
    temp.focus();
    temp.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(temp);
    setBtnState(ok ? 'Copied!' : 'Copy failed');
  } catch (_err) {
    setBtnState('Copy failed');
  }
}

// ── Tracker ────────────────────────────────────────────────────
const BLOOD_LABELS = {
  O_NEG: "O-",
  O_POS: "O+",
  A_POS: "A+",
  A_NEG: "A-",
  B_POS: "B+",
  B_NEG: "B-",
  AB_POS: "AB+",
  AB_NEG: "AB-"
};

const COMPONENT_LABELS = {
  WHOLE_BLOOD: "Whole Blood",
  PRBC: "Packed RBC",
  LEUKOREDUCED_PRBC: "Leukoreduced PRBC",
  ALIQUOTED_PRBC: "Aliquoted PRBC",
  PLATELET_CONCENTRATE: "Platelet Concentrate",
  FRESH_FROZEN_PLASMA: "Fresh Frozen Plasma",
  CRYOPRECIPITATE: "Cryoprecipitate",
  CRYOSUPERNATANT: "Cryosupernatant",
  WRBC: "Whole Red Blood Cells",
  OTHER: "Other"
};

const URGENCY_LABELS = {
  LOW: "Low - Scheduled / Within a week",
  MEDIUM: "Medium - 2-3 days",
  HIGH: "High - 24hrs",
  CRITICAL: "Critical - Immediate"
};

const TRACK_FLOW = [
  "PENDING",
  "NEEDS_CONFIRMATION",
  "APPROVED",
  "ALLOCATED",
  "READY_FOR_RELEASE",
  "RELEASED"
];

const TRACK_TERMINAL = ["REJECTED", "CANCELLED"];

const TRACK_STATUS_META = {
  PENDING: {
    label: "Pending",
    badgeClass: "status-pending",
    description: "Your request has been submitted and is currently under review by the Blood Bank."
  },
  NEEDS_CONFIRMATION: {
    label: "Needs Confirmation",
    badgeClass: "status-needs-confirmation",
    description: "The Blood Bank approved your request with remarks or alternative recommendations. Please confirm the decision sent to your email."
  },
  APPROVED: {
    label: "Approved",
    badgeClass: "status-approved",
    description: "Your request has been approved and is waiting for blood allocation."
  },
  ALLOCATED: {
    label: "Allocated",
    badgeClass: "status-allocated",
    description: "Compatible blood units have been reserved for this request."
  },
  READY_FOR_RELEASE: {
    label: "Ready for Release",
    badgeClass: "status-ready-for-release",
    description: "The blood units are ready for pickup or release."
  },
  RELEASED: {
    label: "Released",
    badgeClass: "status-released",
    description: "The blood request has been successfully released."
  },
  REJECTED: {
    label: "Rejected",
    badgeClass: "status-rejected",
    description: "The request was rejected by the Blood Bank."
  },
  CANCELLED: {
    label: "Cancelled",
    badgeClass: "status-cancelled",
    description: "The request has been cancelled."
  },
  UNKNOWN: {
    label: "Status Update",
    badgeClass: "status-unknown",
    description: "Your request has a status update. Please contact the Blood Bank for clarification."
  }
};

const DEMO_REQUESTS = {
  "BR-2026-00001": {
    refNum: "BR-2026-00001",
    patientName: "Reyes, Maria Santos",
    bloodType: "O_POS",
    component: "PRBC",
    units: 2,
    urgency: "HIGH",
    physician: "Dr. Fernandez",
    status: "APPROVED",
    submittedAt: "2026-04-10T09:30:00",
    reviewedAt: "2026-04-10T10:15:00",
    updatedAt: "2026-04-10T10:15:00"
  }
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function normalizeTrackStatus(status) {
  const value = String(status || "").trim().toUpperCase();
  if (!value) return "PENDING";
  if (value === "TRANSFUSED") return "RELEASED";
  return value;
}

function getTrackStatusMeta(status) {
  return TRACK_STATUS_META[status] || TRACK_STATUS_META.UNKNOWN;
}

function isTerminalStatus(status) {
  return TRACK_TERMINAL.includes(status);
}

function renderTrackLoading(resultEl, refNum) {
  resultEl.innerHTML = `
    <div class="track-loading">
      <div class="track-loading-title">Checking request ${escapeHtml(refNum)}...</div>
      <div class="track-loading-bar"></div>
      <div class="track-loading-bar short"></div>
      <div class="track-loading-bar"></div>
    </div>
  `;
}

function renderTrackNotFound(resultEl, refNum) {
  resultEl.innerHTML = `
    <div class="track-empty">
      <div class="track-empty-icon">N/A</div>
      <div class="track-empty-title">Reference not found</div>
      <div style="font-size:13px;color:var(--muted);max-width:340px;margin:6px auto 0;line-height:1.6">
        No request found for <strong style="font-family:'DM Mono',monospace">${escapeHtml(refNum)}</strong>.
      </div>
    </div>
  `;
}

function resolveStepTime(stepKey, data) {
  switch (stepKey) {
    case "PENDING":
      return data.submittedAt || data.createdAt || null;
    case "NEEDS_CONFIRMATION":
      return data.reviewedAt || data.updatedAt || null;
    case "APPROVED":
      return data.reviewedAt || data.updatedAt || null;
    case "ALLOCATED":
      return data.allocatedAt || data.updatedAt || null;
    case "READY_FOR_RELEASE":
      return data.readyForReleaseAt || data.updatedAt || null;
    case "RELEASED":
      return data.releasedAt || data.updatedAt || null;
    default:
      return null;
  }
}

function buildTimelineHtml(data) {
  const status = normalizeTrackStatus(data.status);
  const statusIndex = TRACK_FLOW.indexOf(status);
  const isTerminal = isTerminalStatus(status);

  const normalTimeline = TRACK_FLOW.map((stepKey, idx) => {
    const stateClass = isTerminal
      ? (idx === 0 ? "is-done" : "is-pending")
      : (idx < statusIndex ? "is-done" : (idx === statusIndex ? "is-current" : "is-pending"));
    const dotClass = stateClass === "is-done" ? "done" : stateClass === "is-current" ? "current" : "pending";
    const dotText = stateClass === "is-done" ? "&#10003;" : String(idx + 1);
    const showLine = idx < TRACK_FLOW.length - 1;
    const stepMeta = getTrackStatusMeta(stepKey);
    const stepTime = resolveStepTime(stepKey, data);
    const stepClass = `tl-state-${stepKey.toLowerCase().replace(/_/g, "-")}`;

    return `
      <div class="tl-item ${stateClass} ${stepClass}">
        <div class="tl-left">
          <div class="tl-dot ${dotClass}">${dotText}</div>
          ${showLine ? `<div class="tl-line ${stateClass === "is-done" ? "done" : "pending"}"></div>` : ""}
        </div>
        <div class="tl-content">
          <div class="tl-label">${escapeHtml(stepMeta.label)}</div>
          ${stepTime ? `<div class="tl-time">${escapeHtml(fmtDate(stepTime))}</div>` : ""}
        </div>
      </div>
    `;
  }).join("");

  if (!isTerminal) return normalTimeline;

  const terminalMeta = getTrackStatusMeta(status);
  return `
    ${normalTimeline}
    <div class="tl-item is-current tl-terminal">
      <div class="tl-left">
        <div class="tl-dot current">!</div>
      </div>
      <div class="tl-content">
        <div class="tl-label">${escapeHtml(terminalMeta.label)}</div>
        <div class="tl-time">${escapeHtml(fmtDate(data.updatedAt || data.reviewedAt || data.submittedAt))}</div>
      </div>
    </div>
  `;
}

function buildRemarksHtml(data) {
  const rows = [];

  if (data.approvalRemarks) {
    rows.push(`<div class="track-remark-row"><span class="track-remark-label">Approval Remarks</span><span class="track-remark-value">${escapeHtml(data.approvalRemarks)}</span></div>`);
  }
  if (data.alternativeComponentSuggestion) {
    rows.push(`<div class="track-remark-row"><span class="track-remark-label">Alternative Component</span><span class="track-remark-value">${escapeHtml(data.alternativeComponentSuggestion)}</span></div>`);
  }
  if (data.rejectionReason) {
    rows.push(`<div class="track-remark-row"><span class="track-remark-label">Rejection Reason</span><span class="track-remark-value">${escapeHtml(data.rejectionReason)}</span></div>`);
  }
  if (data.patientAcceptedRemarks === true) {
    rows.push(`<div class="track-remark-row"><span class="track-remark-label">Requester Confirmation</span><span class="track-remark-value">Accepted</span></div>`);
  } else if (data.patientAcceptedRemarks === false) {
    rows.push(`<div class="track-remark-row"><span class="track-remark-label">Requester Confirmation</span><span class="track-remark-value">Declined</span></div>`);
  }
  if (data.patientRespondedAt) {
    rows.push(`<div class="track-remark-row"><span class="track-remark-label">Confirmation Time</span><span class="track-remark-value">${escapeHtml(fmtDate(data.patientRespondedAt))}</span></div>`);
  }
  if (data.adminNotes) {
    rows.push(`<div class="track-remark-row"><span class="track-remark-label">Staff Notes</span><span class="track-remark-value">${escapeHtml(data.adminNotes)}</span></div>`);
  }

  if (!rows.length) return "";

  return `
    <div class="track-remarks">
      <div class="track-remarks-title">Remarks and Updates</div>
      ${rows.join("")}
    </div>
  `;
}

function mapTrackApiResponse(api, fallbackRefNum) {
  const status = normalizeTrackStatus(api.status);
  const requestedUnits = api.numberOfUnits ?? api.unitsRequested ?? 0;
  const approvedUnits = api.approvedUnits ?? null;

  return {
    refNum: api.referenceNumber || api.refNum || fallbackRefNum,
    status,
    bloodType: api.bloodType || null,
    component: api.bloodComponent || api.componentType || api.component || null,
    urgency: api.urgencyLevel || api.urgency || null,
    physician: api.requestingPhysician || api.physician || null,
    requestedUnits,
    approvedUnits,
    units: api.patientAcceptedRemarks === true && approvedUnits != null ? approvedUnits : requestedUnits,
    patientName: api.patientName || null,
    submittedAt: api.requestedAt || api.createdAt || null,
    reviewedAt: api.reviewedAt || null,
    allocatedAt: api.allocatedAt || null,
    readyForReleaseAt: api.readyForReleaseAt || null,
    releasedAt: api.releasedAt || null,
    updatedAt: api.updatedAt || null,
    adminNotes: api.notes || null,
    approvalRemarks: api.approvalRemarks || null,
    alternativeComponentSuggestion: api.alternativeComponentSuggestion || null,
    patientAcceptedRemarks: api.patientAcceptedRemarks ?? null,
    patientRespondedAt: api.patientRespondedAt || null,
    rejectionReason: api.rejectionReason || null
  };
}

function renderTrackResult(resultEl, data) {
  const status = normalizeTrackStatus(data.status);
  const statusMeta = getTrackStatusMeta(status);
  const timelineHtml = buildTimelineHtml(data);
  const remarksHtml = buildRemarksHtml(data);

  const bloodTypeText = BLOOD_LABELS[data.bloodType] || data.bloodType || "—";
  const componentText = COMPONENT_LABELS[data.component] || data.component || "—";
  const urgencyText = URGENCY_LABELS[data.urgency] || data.urgency || "—";
  const unitsText = data.units != null ? data.units : "—";

  resultEl.innerHTML = `
    <div class="track-card">
      <div class="track-card-header">
        <div>
          <div class="track-ref">${escapeHtml(data.refNum || "—")}</div>
          <div style="font-size:15px;font-weight:700;margin-top:3px;color:var(--charcoal)">${escapeHtml(data.patientName || "Unnamed Patient")}</div>
        </div>
        <span class="status-badge ${statusMeta.badgeClass}">${escapeHtml(statusMeta.label)}</span>
      </div>

      <div class="track-status-desc">
        <div class="track-status-desc-title">Current Status</div>
        <div class="track-status-desc-text">${escapeHtml(statusMeta.description)}</div>
      </div>

      <div class="track-info-grid">
        <div class="track-info-cell">
          <div class="track-info-label">Blood Type</div>
          <div class="track-info-val">${escapeHtml(bloodTypeText)}</div>
        </div>
        <div class="track-info-cell">
          <div class="track-info-label">Component</div>
          <div class="track-info-val">${escapeHtml(componentText)}</div>
        </div>
        <div class="track-info-cell">
          <div class="track-info-label">Units</div>
          <div class="track-info-val">${escapeHtml(String(unitsText))}</div>
        </div>
        <div class="track-info-cell">
          <div class="track-info-label">Urgency</div>
          <div class="track-info-val">${escapeHtml(urgencyText)}</div>
        </div>
        <div class="track-info-cell">
          <div class="track-info-label">Physician</div>
          <div class="track-info-val">${escapeHtml(data.physician || "—")}</div>
        </div>
        <div class="track-info-cell">
          <div class="track-info-label">Updated</div>
          <div class="track-info-val">${escapeHtml(fmtDate(data.updatedAt || data.reviewedAt || data.submittedAt))}</div>
        </div>
      </div>

      ${remarksHtml}

      <div class="track-timeline">
        <div class="timeline-title">Request Lifecycle</div>
        <div class="timeline">${timelineHtml}</div>
      </div>
    </div>
  `;
}

async function trackRequest() {
  const rawInput = (document.getElementById("track-input").value || "").trim();
  const refNum = rawInput;
  const resultEl = document.getElementById("track-result");
  const defaultEl = document.getElementById("track-default");

  if (!refNum) {
    resultEl.style.display = "none";
    defaultEl.style.display = "block";
    return;
  }

  resultEl.style.display = "block";
  defaultEl.style.display = "none";
  renderTrackLoading(resultEl, refNum);

  let data = null;
  try {
    const res = await fetch(`/api/req/blood-requests/track/${refNum}`);
    if (!res.ok) throw new Error("not_found");
    const api = await res.json();
    data = mapTrackApiResponse(api, refNum);
  } catch (_err) {
    const fallback = DEMO_REQUESTS[refNum] || (sessionStorage.getItem(refNum) ? JSON.parse(sessionStorage.getItem(refNum)) : null);
    if (fallback) {
      data = {
        ...fallback,
        status: normalizeTrackStatus(fallback.status)
      };
    }
  }

  if (!data) {
    renderTrackNotFound(resultEl, refNum);
    return;
  }

  renderTrackResult(resultEl, data);
}

function fmtDate(d) {
  if (!d) return "-";
  const parsed = new Date(d);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
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
  a.download = type === 'adult'
    ? 'Blood_Request_Form_Adult.pdf'
    : 'Blood_Request_Form_Pediatric.pdf';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ── Urgency Level Management (dependent on Request Type) ────────
function updateUrgencyBasedOnRequestType() {
  const requestTypeRadios = document.querySelectorAll('input[name="requestType"]');
  const urgencyGroup = document.getElementById('urgency-group');
  const urgencyDisplay = document.getElementById('urgency-display');
  
  // Find selected request type
  let selectedType = null;
  requestTypeRadios.forEach(radio => {
    if (radio.checked) {
      selectedType = radio.value;
    }
  });

  if (selectedType === 'STAT') {
    // STAT: Auto-set to HIGH, hide radios, show badge
    urgencyDisplay.style.display = 'block';
    urgencyGroup.style.display = 'none';
    document.getElementById('urg-high').checked = true;
  } else if (selectedType === 'ROUTINE') {
    // ROUTINE: Show radio options, hide badge
    urgencyDisplay.style.display = 'none';
    urgencyGroup.style.display = 'grid';
    // Keep MEDIUM as default for routine (already checked)
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STANDALONE FORM SCANNER - COMPLETE WORKING VERSION
// ═══════════════════════════════════════════════════════════════════════════════

// Store detected data from scan
var scannedData = null;
var tesseractReady = false;

// ════════════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS (FIRST - No dependencies)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Convert file to base64
 */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Extract a single field from text using regex
 */
function extractField(text, regex) {
  try {
    const match = text.match(regex);
    if (match) {
      return match[1] || match[0];
    }
  } catch (e) {
    console.warn('Regex error:', e);
  }
  return null;
}

/**
 * Show error message in scanner
 */
function showScannerError(msg) {
  const errorDiv = document.getElementById('scanner-error');
  if (errorDiv) {
    errorDiv.textContent = '⚠ ' + msg;
    errorDiv.style.display = 'block';
  }
}

/**
 * Show success message in scanner
 */
function showScannerSuccess(msg) {
  const errorDiv = document.getElementById('scanner-error');
  if (errorDiv) {
    errorDiv.textContent = msg;
    errorDiv.style.background = 'rgba(46, 125, 79, 0.08)';
    errorDiv.style.borderColor = 'rgba(46, 125, 79, 0.2)';
    errorDiv.style.color = '#2E7D4F';
    errorDiv.style.display = 'block';
    
    setTimeout(() => {
      errorDiv.style.display = 'none';
      errorDiv.style.background = '';
      errorDiv.style.borderColor = '';
      errorDiv.style.color = '';
    }, 4000);
  }
}

/**
 * Clear scan
 */
function clearScan() {
  scannedData = null;
  const scanInput = document.getElementById('scan-input');
  if (scanInput) scanInput.value = '';
  const placeholder = document.getElementById('scan-placeholder');
  if (placeholder) placeholder.style.display = 'block';
  const preview = document.getElementById('scan-preview');
  if (preview) preview.style.display = 'none';
  const resultsBox = document.getElementById('scanner-results-box');
  if (resultsBox) resultsBox.style.display = 'none';
  const uploadZone = document.getElementById('scanner-upload-zone');
  if (uploadZone) uploadZone.classList.remove('has-file');
}

// ════════════════════════════════════════════════════════════════════════════════
// EXTRACTION FUNCTION (SECOND - Calls helpers)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Extract form data using Tesseract.js OCR
 */
async function extractFormData(base64, fileType) {
  const detected = {};

  try {
    // Check if Tesseract is loaded
    if (typeof Tesseract === 'undefined') {
      console.warn('Tesseract.js library not loaded');
      showScannerError('OCR library loading... Please try again in a moment.');
      return {};
    }

    // Try OCR recognition
    console.log('Starting OCR extraction...');
    const result = await Tesseract.recognize(base64, 'eng');

    const text = result.data.text;
    console.log('OCR completed, text length:', text.length);
    console.log('Raw OCR text:', text.substring(0, 500));

    if (!text || text.length < 10) {
      console.warn('OCR returned very little text');
      return {};
    }

    // ═══════════════════════════════════════════════════════════════
    // EXTRACT PATIENT INFORMATION
    // ═══════════════════════════════════════════════════════════════

    // Patient name - Try multiple patterns
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

    // Age (if present)
    detected.age = extractField(text, /Age\s+(\d+)/i);

    // Date of birth - multiple formats
    detected.birthdate =
      extractField(text, /Date\s+of\s+Birth\s*[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i) ||
      extractField(text, /DOB\s*[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);

    // Sex/Gender
    detected.sex = extractField(text, /Sex\s+([MF]|Male|Female)/i);

    // Room
    detected.room = extractField(text, /Room\s+([^\n\t,]+?)(?=CLINICAL|$)/i);

    // Physician
    detected.physician =
      extractField(text, /ATTENDING\s+PHYSICIAN[:\s]+([^\n]+?)(?=$|\n|CONTACT)/i) ||
      extractField(text, /PHYSICIAN[:\s]+([^\n]+?)(?=$|\n)/i);

    detected.contactNum = extractField(text, /CONTACT\s+N(?:UM|UMBER)[:\s]+([0-9\s\-\+]+)/i);

    // ═══════════════════════════════════════════════════════════════
    // EXTRACT BLOOD INFORMATION
    // ═══════════════════════════════════════════════════════════════

    // Blood type with RH
    const btMatch = text.match(/BLOOD\s+TYPE[:\s]*([OAB]+)\s*([+-]|Negative|Positive)?/i);
    if (btMatch) {
      detected.bloodType = btMatch[1].toUpperCase();
      const rh = btMatch[2];
      detected.rh = (rh && (rh.toLowerCase().includes('neg') || rh === '-')) ? '-' : '+';
    }

    // Hemoglobin
    detected.hemoglobin = extractField(text, /HEMOGLOBIN[:\s]*(\d+\.?\d*)/i);

    // Hematocrit
    detected.hematocrit = extractField(text, /HEMATOCRIT[:\s]*\.?(\d+)/i);

    // ═══════════════════════════════════════════════════════════════
    // EXTRACT CLINICAL INFORMATION
    // ═══════════════════════════════════════════════════════════════

    detected.diagnosis =
      extractField(text, /CLINICAL\s+IMPRESSION[:\s]+([^\n]+?)(?=$|BLOOD|REQUEST)/i) ||
      extractField(text, /DIAGNOSIS[:\s]+([^\n]+?)(?=$|BLOOD)/i);

    detected.requestType = extractField(text, /REQUEST\s+TYPE[:\s]*\(?([A-Za-z]+)\)?/i);

    // Previous transfusion
    if (text.match(/Previous\s+Transfusion.*?Yes/i)) {
      detected.prevTransfusion = 'YES';
      detected.prevTransDate = extractField(text, /When[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
      detected.prevUnits = extractField(text, /No\.\s+of\s+units[:\s]+(\d+)/i);
    } else if (text.match(/Previous\s+Transfusion.*?No/i)) {
      detected.prevTransfusion = 'NO';
    }

    // Previous reaction
    if (text.match(/Previous\s+Reaction.*?Yes/i)) {
      detected.prevReaction = 'YES';
      detected.reactionDate = extractField(text, /When[:\s]+(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i);
    } else if (text.match(/Previous\s+Reaction.*?No/i)) {
      detected.prevReaction = 'NO';
    }

    // ═══════════════════════════════════════════════════════════════
    // CLEAN UP
    // ═══════════════════════════════════════════════════════════════

    for (let key in detected) {
      if (detected[key]) {
        detected[key] = String(detected[key]).trim();
      }
    }

    console.log('✓ Extraction complete. Fields found:', Object.keys(detected).filter(k => detected[k]).length);
    return detected;

  } catch (err) {
    console.error('OCR error details:', err);
    console.error('Error message:', err.message);
    return {};
  }
}

// ════════════════════════════════════════════════════════════════════════════════
// DISPLAY FUNCTIONS (THIRD - Call helpers)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Display scan results
 */
function displayScanResults() {
  const resultsDiv = document.getElementById('scanner-results-box');
  const fieldsDiv = document.getElementById('scanner-fields-found');

  if (!resultsDiv || !fieldsDiv) return;

  let foundFields = [];
  const fieldMap = {
    patientName: 'Patient Name',
    patientLast: 'Last Name',
    patientMiddle: 'Middle Name',
    age: 'Age',
    birthdate: 'Date of Birth',
    sex: 'Sex',
    room: 'Room',
    physician: 'Physician',
    bloodType: 'Blood Type',
    rh: 'RH',
    hemoglobin: 'Hemoglobin',
    hematocrit: 'Hematocrit',
    diagnosis: 'Diagnosis',
    requestType: 'Request Type',
    prevTransfusion: 'Previous Transfusion',
    prevReaction: 'Previous Reaction',
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
  if (statusEl) {
    statusEl.textContent = `✓ Detected ${foundFields.length} field${foundFields.length !== 1 ? 's' : ''}`;
  }
  resultsDiv.style.display = 'block';
}

/**
 * Apply scanned data to main form
 */
function applyScanResults() {
  if (!scannedData) return;

  const mapping = {
    patientName: 'f-patientName',
    patientLast: 'f-patientLast',
    patientMiddle: 'f-patientMiddle',
    patientSuffix: 'f-patientSuffix',
    birthdate: 'f-birthdate',
    sex: 'f-sex',
    room: 'f-room',
    physician: 'f-physician',
    contactNum: 'f-contact',
    hemoglobin: 'f-hemoglobin',
    hematocrit: 'f-hematocrit',
    diagnosis: 'f-diagnosis',
    requestType: 'requestType'
  };

  let filledCount = 0;

  for (const [scanKey, htmlId] of Object.entries(mapping)) {
    const value = scannedData[scanKey];
    if (!value) continue;

    const element = document.getElementById(htmlId);

    try {
      // Handle radio buttons (request type)
      if (scanKey === 'requestType') {
        const match = value.match(/stat|routine/i);
        if (match) {
          const radioValue = match[0].toUpperCase();
          const radio = document.querySelector(`input[name="requestType"][value="${radioValue}"]`);
          if (radio) {
            radio.checked = true;
            radio.dispatchEvent(new Event('change'));
            filledCount++;
          }
        }
      }
      // Handle sex dropdown
      else if (scanKey === 'sex') {
        const match = value.match(/M|F|Male|Female/i);
        if (match) {
          const sexValue = match[0].toUpperCase().startsWith('M') ? 'MALE' : 'FEMALE';
          const sexSelect = document.getElementById('f-sex');
          if (sexSelect) {
            sexSelect.value = sexValue;
            sexSelect.dispatchEvent(new Event('change'));
            filledCount++;
          }
        }
      }
      // Handle blood type dropdown
      else if (scanKey === 'bloodType') {
        const type = value.toUpperCase();
        const rh = scannedData.rh === '-' ? '_NEG' : '_POS';

        let typeCode = '';
        if (type.includes('O')) {
          typeCode = 'O' + rh;
        } else if (type.includes('AB')) {
          typeCode = 'AB' + rh;
        } else if (type.includes('A')) {
          typeCode = 'A' + rh;
        } else if (type.includes('B')) {
          typeCode = 'B' + rh;
        }

        if (typeCode) {
          const bloodSelect = document.getElementById('f-bloodType');
          if (bloodSelect) {
            bloodSelect.value = typeCode;
            bloodSelect.dispatchEvent(new Event('change'));
            filledCount++;
          }
        }
      }
      // Regular text inputs
      else if (element) {
        element.value = value;
        element.dispatchEvent(new Event('change'));
        filledCount++;
      }
    } catch (e) {
      console.warn(`Error filling ${scanKey}:`, e);
    }
  }

  // Scroll to form and show success message
  const formSection = document.getElementById('form-section');
  if (formSection) {
    formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  showScannerSuccess(`✓ Filled ${filledCount} field${filledCount !== 1 ? 's' : ''} from scan. Please review and edit as needed.`);

  // Clear scan data
  clearScan();

  // Auto-switch to request tab
  switchTab('request');
}

// ════════════════════════════════════════════════════════════════════════════════
// MAIN HANDLER (FOURTH - Calls display functions)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Handle scan file upload
 */
async function handleScan(file) {
  if (!file) return;

  const uploadZone = document.getElementById('scanner-upload-zone');
  const errorDiv = document.getElementById('scanner-error');

  if (!uploadZone || !errorDiv) return;

  // Validation
  if (file.size > SCANNER_MAX_FILE_BYTES) {
    showScannerError("File exceeds 5MB limit.");
    return;
  }

  if (!['application/pdf', 'image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    showScannerError("Only PDF, JPG, PNG, or WebP files are accepted.");
    return;
  }

  errorDiv.style.display = 'none';

  // Show preview
  const placeholder = document.getElementById('scan-placeholder');
  const preview = document.getElementById('scan-preview');
  if (placeholder) placeholder.style.display = 'none';
  if (preview) preview.style.display = 'block';

  const fileName = document.getElementById('scan-file-name');
  if (fileName) fileName.textContent = file.name;

  const statusEl = document.getElementById('scan-status');
  if (statusEl) {
    statusEl.innerHTML = '<span class="scanner-spinner"></span> Processing...';
  }

  uploadZone.classList.add('has-file');

  try {
    const base64 = await fileToBase64(file);
    scannedData = await extractFormData(base64, file.type);

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

// ════════════════════════════════════════════════════════════════════════════════
// INITIALIZATION FUNCTIONS (FIFTH - Main setup)
// ════════════════════════════════════════════════════════════════════════════════

/**
 * Initialize Tesseract.js with proper loading
 */
async function initTesseractWorker() {
  try {
    if (typeof Tesseract === 'undefined') {
      console.warn('Tesseract.js not available, OCR will be limited');
      return false;
    }

    // Initialize Tesseract worker
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

/**
 * Initialize scanner UI
 */
function initStandaloneScanner() {
  const uploadZone = document.getElementById('scanner-upload-zone');
  if (uploadZone) {
    // Make it clickable
    uploadZone.style.cursor = 'pointer';
    uploadZone.addEventListener('click', function() {
      document.getElementById('scan-input').click();
    });

    // Drag & drop support
    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', () => {
      uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.classList.remove('drag-over');
      if (e.dataTransfer.files[0]) {
        handleScan(e.dataTransfer.files[0]);
      }
    });
  }

  // Try to initialize Tesseract in the background
  initTesseractWorker();
}

/**
 * Toggle scanner panel collapse/expand
 */
function toggleScannerPanel() {
  const content = document.getElementById('scanner-content');
  const btn = document.getElementById('scanner-collapse-btn');

  if (!content || !btn) return;

  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    btn.classList.remove('collapsed');
  } else {
    content.classList.add('collapsed');
    btn.classList.add('collapsed');
  }
}



// ── Init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
    injectIndicationStyles();
    initIndicationHandlers();
    initStandaloneScanner();
    
    // Set minimum date to today for required by field
    const requiredByInput = document.getElementById('f-requiredBy');
    if (requiredByInput) {
      requiredByInput.min = new Date().toISOString().split('T')[0];
    }

    // Listen to birthdate changes to update patient type and forms
    document.getElementById('f-birthdate').addEventListener('change', updatePatientTypeAndForms);

    // Add event listeners to request type radios
    const requestTypeRadios = document.querySelectorAll('input[name="requestType"]');
    requestTypeRadios.forEach(radio => {
      radio.addEventListener('change', updateUrgencyBasedOnRequestType);
    });
    
    // Initialize urgency display on page load
    updateUrgencyBasedOnRequestType();

    const staffCodeInput = document.getElementById('f-staffUniqueCode');
    if (staffCodeInput) {
      staffCodeInput.addEventListener('blur', handleStaffCodeInput);
      staffCodeInput.addEventListener('input', clearStaffCodeError);
    }

    const suffixInput = document.getElementById('f-patientSuffix');
    if (suffixInput) {
      suffixInput.addEventListener('blur', validateSuffixField);
      suffixInput.addEventListener('input', validateSuffixField);
    }

    const requesterNameInput = document.getElementById('f-requesterName');
    if (requesterNameInput) {
      requesterNameInput.addEventListener('input', function () {
        requesterNameInput.value = String(requesterNameInput.value || '').slice(0, 50);
      });
    }

    const hemoglobinInput = document.getElementById('f-hemoglobin');
    if (hemoglobinInput) {
      hemoglobinInput.addEventListener('keydown', function (event) {
        const ctrlLike = event.ctrlKey || event.metaKey;
        const navKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'];
        if (ctrlLike || navKeys.includes(event.key)) return;
        if (!/^\d$/.test(event.key)) {
          event.preventDefault();
          return;
        }
        if (hemoglobinInput.selectionStart === hemoglobinInput.selectionEnd && hemoglobinInput.value.length >= 3) {
          event.preventDefault();
        }
      });
      hemoglobinInput.addEventListener('input', function () {
        enforceHemoglobinFormat();
        validateHemoglobinField();
      });
      hemoglobinInput.addEventListener('focus', function () {
        enforceHemoglobinFormat();
      });
      hemoglobinInput.addEventListener('blur', validateHemoglobinField);
    }

    const unitsInput = document.getElementById('f-units');
    if (unitsInput) {
      unitsInput.addEventListener('keydown', function (event) {
        const ctrlLike = event.ctrlKey || event.metaKey;
        const navKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'];
        if (ctrlLike || navKeys.includes(event.key)) return;
        if (!/^\d$/.test(event.key)) {
          event.preventDefault();
          return;
        }
        if (String(unitsInput.value || '').replace(/\D/g, '').length >= 2) {
          event.preventDefault();
        }
      });
      unitsInput.addEventListener('input', enforceUnitsFormat);
      unitsInput.addEventListener('blur', enforceUnitsFormat);
    }

    const hematocritInput = document.getElementById('f-hematocrit');
    if (hematocritInput) {
      hematocritInput.addEventListener('keydown', function (event) {
        const ctrlLike = event.ctrlKey || event.metaKey;
        const navKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab'];
        if (ctrlLike || navKeys.includes(event.key)) {
          if (event.key === 'Backspace' && hematocritInput.selectionStart <= 1 && hematocritInput.selectionEnd <= 1) {
            event.preventDefault();
          }
          if (event.key === 'Delete' && hematocritInput.selectionStart === 0 && hematocritInput.selectionEnd === 0) {
            event.preventDefault();
          }
          return;
        }
        if (!/^\d$/.test(event.key)) {
          event.preventDefault();
          return;
        }
      });
      hematocritInput.addEventListener('focus', function () {
        if (!hematocritInput.value.trim()) {
          hematocritInput.value = '.';
        }
        enforceHematocritFormat();
        const pos = hematocritInput.value.length;
        hematocritInput.setSelectionRange(pos, pos);
      });
      hematocritInput.addEventListener('input', function () {
        const previousPos = hematocritInput.selectionStart;
        enforceHematocritFormat();
        validateHematocritField();
        const nextPos = Math.max(1, Math.min(hematocritInput.value.length, previousPos || hematocritInput.value.length));
        hematocritInput.setSelectionRange(nextPos, nextPos);
      });
      hematocritInput.addEventListener('blur', validateHematocritField);
    }

    const contactInput = document.getElementById('f-contact');
    if (contactInput) {
      contactInput.addEventListener('focus', function () {
        if (!contactInput.value.trim()) {
          contactInput.value = '+63';
        }
        formatAndLockContactNumber();
      });
      contactInput.addEventListener('input', function () {
        formatAndLockContactNumber();
        validateContactNumberField();
      });
      contactInput.addEventListener('blur', validateContactNumberField);
    }

    const modalOverlay = document.getElementById('bloodplus-modal-overlay');
    if (modalOverlay) {
      modalOverlay.addEventListener('click', function (event) {
        if (event.target === modalOverlay) {
          closeBloodPlusModal();
        }
      });
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        closeBloodPlusModal();
      }
    });
});


// Date Format

const birthdateInput = document.getElementById("f-birthdate");

// today = latest allowed birthdate
const today = new Date().toISOString().split("T")[0];

// optional: oldest allowed date (example: max 120 years old)
const minDate = new Date();
minDate.setFullYear(minDate.getFullYear() - 120);

birthdateInput.max = today;
birthdateInput.min = minDate.toISOString().split("T")[0];

["f-prevTransDate", "f-reactionDate"].forEach(id => {
  const input = document.getElementById(id);

  input.addEventListener("change", function () {
    const selected = new Date(this.value);
    const now = new Date();

    if (selected > now) {
      showBloodPlusModal('Invalid Date', 'Date cannot be in the future.', 'warning');
      this.value = "";
    }
  });
});

// Scanner overrides: backend OCR.space integration (no frontend Tesseract)
var scannedMeta = null;
let scannerProgressTimer = null;
let scannerProgressValue = 0;
let scannerProgressStage = 'Scanning form...';

const SCANNER_ACCEPTED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/bmp',
  'image/tiff',
  'image/jfif'
]);
const SCANNER_MAX_FILE_BYTES = 5 * 1024 * 1024;

function scannerEscapeHtml(value) {
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function showScannerNotice(msg) {
  const errorDiv = document.getElementById('scanner-error');
  if (!errorDiv) return;
  errorDiv.textContent = msg;
  errorDiv.style.background = 'rgba(183, 128, 2, 0.08)';
  errorDiv.style.borderColor = 'rgba(183, 128, 2, 0.2)';
  errorDiv.style.color = '#8A6000';
  errorDiv.style.display = 'block';
}

function showScannerError(msg) {
  const errorDiv = document.getElementById('scanner-error');
  if (!errorDiv) return;
  errorDiv.textContent = msg;
  errorDiv.style.background = '';
  errorDiv.style.borderColor = '';
  errorDiv.style.color = '';
  errorDiv.style.display = 'block';
}

function showScannerSuccess(msg) {
  const errorDiv = document.getElementById('scanner-error');
  if (!errorDiv) return;
  errorDiv.textContent = msg;
  errorDiv.style.background = 'rgba(46, 125, 79, 0.08)';
  errorDiv.style.borderColor = 'rgba(46, 125, 79, 0.2)';
  errorDiv.style.color = '#2E7D4F';
  errorDiv.style.display = 'block';
  setTimeout(() => {
    errorDiv.style.display = 'none';
    errorDiv.style.background = '';
    errorDiv.style.borderColor = '';
    errorDiv.style.color = '';
  }, 4500);
}

function setScanPopulateActionVisible(visible) {
  const actionWrap = document.getElementById('scan-fill-quick-action');
  const actionBtn = document.getElementById('btn-scan-populate');
  const actionText = document.querySelector('#scan-fill-quick-action .scan-fill-quick-text');
  if (!actionWrap) return;

  if (visible) {
    const confidence = scannedMeta && Number.isFinite(Number(scannedMeta.confidence))
      ? Math.max(0, Math.min(100, Math.round(Number(scannedMeta.confidence))))
      : null;
    if (actionText) {
      actionText.textContent = confidence == null
        ? 'Scanned details are ready to populate this request form.'
        : `Scanned details are ready to populate this request form (OCR confidence: ${confidence}%).`;
    }
    actionWrap.style.display = 'flex';
    if (actionBtn) actionBtn.disabled = false;
  } else {
    actionWrap.style.display = 'none';
  }
}

function clearScan() {
  stopScanProgress();
  scannedData = null;
  scannedMeta = null;
  setScanPopulateActionVisible(false);
  const scanInput = document.getElementById('scan-input');
  if (scanInput) scanInput.value = '';
  const placeholder = document.getElementById('scan-placeholder');
  if (placeholder) placeholder.style.display = 'block';
  const preview = document.getElementById('scan-preview');
  if (preview) preview.style.display = 'none';
  const resultsBox = document.getElementById('scanner-results-box');
  if (resultsBox) resultsBox.style.display = 'none';
  const fieldsFound = document.getElementById('scanner-fields-found');
  if (fieldsFound) fieldsFound.innerHTML = '';
  const uploadZone = document.getElementById('scanner-upload-zone');
  if (uploadZone) uploadZone.classList.remove('has-file');
}

function renderScanProgressStatus() {
  const statusEl = document.getElementById('scan-status');
  if (!statusEl) return;
  const pct = Math.max(0, Math.min(100, Math.round(scannerProgressValue)));
  statusEl.innerHTML = `<span class="scanner-spinner"></span> ${scannerProgressStage} ${pct}%`;
}

function stopScanProgress() {
  if (scannerProgressTimer) {
    clearInterval(scannerProgressTimer);
    scannerProgressTimer = null;
  }
}

function startScanProgress(stage = 'Scanning form...') {
  stopScanProgress();
  scannerProgressStage = stage;
  scannerProgressValue = 0;
  renderScanProgressStatus();
  scannerProgressTimer = setInterval(() => {
    if (scannerProgressValue >= 95) return;
    const step = scannerProgressValue < 50 ? 5 : (scannerProgressValue < 80 ? 3 : 1);
    scannerProgressValue = Math.min(95, scannerProgressValue + step);
    renderScanProgressStatus();
  }, 350);
}

function bumpScanProgress(stage, minValue) {
  if (stage) scannerProgressStage = stage;
  if (Number.isFinite(minValue)) {
    scannerProgressValue = Math.max(scannerProgressValue, Math.min(95, Number(minValue)));
  }
  renderScanProgressStatus();
}

function normalizeScannerResponse(payload) {
  const fieldsSource = payload && typeof payload.fields === 'object' && payload.fields ? payload.fields : {};
  const fields = {};
  Object.keys(fieldsSource).forEach(key => {
    const value = fieldsSource[key];
    fields[key] = typeof value === 'string' ? value.trim() : value;
  });

  fields.indicationCodes = Array.isArray(fieldsSource.indicationCodes)
    ? fieldsSource.indicationCodes
        .map(code => String(code || '').trim().toUpperCase())
        .filter(Boolean)
    : [];
  fields.otherIndicationText = fieldsSource.otherIndicationText && typeof fieldsSource.otherIndicationText === 'object'
    ? fieldsSource.otherIndicationText
    : {};

  return {
    confidence: Number.isFinite(Number(payload && payload.confidence))
      ? Math.max(0, Math.min(100, Math.round(Number(payload.confidence))))
      : 0,
    warnings: Array.isArray(payload && payload.warnings)
      ? payload.warnings.map(w => String(w || '').trim()).filter(Boolean)
      : [],
    rawText: payload && payload.rawText ? String(payload.rawText) : '',
    fields
  };
}

function hasAnyScannedField(fields) {
  if (!fields || typeof fields !== 'object') return false;
  const keys = [
    'patientName', 'patientMiddle', 'patientLast', 'birthdate', 'sex', 'purok',
    'barangay', 'municipality', 'province', 'physician', 'room', 'ward',
    'diagnosis', 'contact', 'bloodType', 'hemoglobin', 'hematocrit',
    'requestType', 'units', 'componentType', 'previousTransfusion', 'previousReaction'
  ];
  return keys.some(key => !!fields[key]) || (Array.isArray(fields.indicationCodes) && fields.indicationCodes.length > 0);
}

function scannerBloodTypeLabel(value) {
  if (!value) return null;
  const map = {
    O_POS: 'O+',
    O_NEG: 'O-',
    A_POS: 'A+',
    A_NEG: 'A-',
    B_POS: 'B+',
    B_NEG: 'B-',
    AB_POS: 'AB+',
    AB_NEG: 'AB-'
  };
  return map[value] || value;
}

function scannerComponentLabel(value) {
  if (!value) return null;
  if (typeof COMPONENT_LABELS_R === 'object' && COMPONENT_LABELS_R[value]) {
    return COMPONENT_LABELS_R[value];
  }
  return value;
}

function setScanFieldValue(inputId, value) {
  const input = document.getElementById(inputId);
  if (!input || value == null || value === '') return false;
  input.value = String(value);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  input.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function setScanRadioValue(name, value) {
  if (!value) return false;
  const normalized = String(value).trim().toUpperCase();
  const radio = document.querySelector(`input[name="${name}"][value="${normalized}"]`);
  if (!radio) return false;
  radio.checked = true;
  radio.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function setScanSelectValue(inputId, value) {
  if (!value) return false;
  const select = document.getElementById(inputId);
  if (!select) return false;
  const hasOption = Array.from(select.options).some(option => option.value === value);
  if (!hasOption) return false;
  select.value = value;
  select.dispatchEvent(new Event('change', { bubbles: true }));
  return true;
}

function applyScannedIndications(codes, otherTextMap) {
  const appliedCodes = [];
  const unmappedCodes = [];

  document.querySelectorAll('.indication-checkbox').forEach(cb => {
    cb.checked = false;
  });
  closeAllSubGroups();

  if (Array.isArray(codes)) {
    codes.forEach(code => {
      const normalized = String(code || '').trim().toUpperCase();
      if (!normalized) return;
      const checkbox = document.getElementById(`ind-${normalized}`);
      if (!checkbox) {
        unmappedCodes.push(normalized);
        return;
      }

      if (checkbox.dataset.parent) {
        const parent = document.getElementById(`ind-${checkbox.dataset.parent}`);
        if (parent) {
          parent.checked = true;
          parent.dispatchEvent(new Event('change', { bubbles: true }));
        }
      }

      checkbox.checked = true;
      checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      appliedCodes.push(normalized);
    });
  }

  if (otherTextMap && typeof otherTextMap === 'object') {
    Object.entries(otherTextMap).forEach(([code, value]) => {
      if (!value) return;
      const input = document.querySelector(`input[data-ref="${code}"]`);
      if (input) {
        input.value = value;
        input.dispatchEvent(new Event('input', { bubbles: true }));
      }
    });
  }

  return { appliedCodes, unmappedCodes };
}

function displayScanResults() {
  const resultsDiv = document.getElementById('scanner-results-box');
  const fieldsDiv = document.getElementById('scanner-fields-found');
  const statusEl = document.getElementById('scan-status');
  const applyBtn = document.getElementById('btn-apply-scan');
  const scannerContent = document.getElementById('scanner-content');
  const collapseBtn = document.getElementById('scanner-collapse-btn');
  if (!resultsDiv || !fieldsDiv || !statusEl) return;

  if (!hasAnyScannedField(scannedData)) {
    showScannerError('No recognizable blood request fields detected. Please review image quality or fill manually.');
    clearScan();
    return;
  }

  const fullName = [scannedData.patientName, scannedData.patientMiddle, scannedData.patientLast]
    .filter(Boolean)
    .join(' ')
    .trim();
  const address = [scannedData.purok, scannedData.barangay, scannedData.municipality, scannedData.province]
    .filter(Boolean)
    .join(', ')
    .trim();
  const indications = Array.isArray(scannedData.indicationCodes) && scannedData.indicationCodes.length > 0
    ? scannedData.indicationCodes.join(', ')
    : null;

  const previewRows = [
    { label: 'Patient Name', value: fullName || null },
    { label: 'Date of Birth', value: scannedData.birthdate },
    { label: 'Sex', value: scannedData.sex },
    { label: 'Address', value: address || null },
    { label: 'Physician', value: scannedData.physician },
    { label: 'Contact Number', value: scannedData.contact },
    { label: 'Blood Type', value: scannerBloodTypeLabel(scannedData.bloodType) },
    { label: 'Component', value: scannerComponentLabel(scannedData.componentType) },
    { label: 'Units', value: scannedData.units },
    { label: 'Hemoglobin', value: scannedData.hemoglobin },
    { label: 'Hematocrit', value: scannedData.hematocrit },
    { label: 'Request Type', value: scannedData.requestType },
    { label: 'Previous Transfusion', value: scannedData.previousTransfusion },
    { label: 'Previous Reaction', value: scannedData.previousReaction },
    { label: 'Indications', value: indications }
  ];

  fieldsDiv.innerHTML = previewRows.map(row => `
    <div class="result-field">
      <span class="result-field-label">${scannerEscapeHtml(row.label)}</span>
      <span class="result-field-value">${row.value ? scannerEscapeHtml(row.value) : 'Not detected'}</span>
    </div>
  `).join('');

  const detectedCount = previewRows.filter(row => !!row.value).length;
  statusEl.textContent = `Detected ${detectedCount} fields | OCR confidence: ${scannedMeta ? scannedMeta.confidence : 0}%`;
  if (scannerContent && scannerContent.classList.contains('collapsed')) {
    scannerContent.classList.remove('collapsed');
  }
  if (collapseBtn && collapseBtn.classList.contains('collapsed')) {
    collapseBtn.classList.remove('collapsed');
  }
  if (applyBtn) {
    applyBtn.disabled = false;
    applyBtn.style.display = 'block';
  }
  resultsDiv.style.display = 'block';
  setScanPopulateActionVisible(true);

  if (scannedMeta && Array.isArray(scannedMeta.warnings) && scannedMeta.warnings.length > 0) {
    showScannerNotice(scannedMeta.warnings.join(' '));
  }
}

function extractServerErrorMessage(response, payload, fallbackText) {
  if (payload && typeof payload === 'object') {
    const candidates = [payload.error, payload.message, payload.detail, payload.title];
    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim()) {
        return candidate.trim();
      }
    }
  }
  if (typeof fallbackText === 'string' && fallbackText.trim()) {
    const cleaned = fallbackText.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    if (cleaned) {
      if (cleaned.length > 220) {
        return cleaned.slice(0, 220).trim() + '...';
      }
      return cleaned;
    }
  }
  return `Scan failed (${response.status}). Please try a clearer image or fill the form manually.`;
}

function applyScanResults() {
  if (!scannedData || !hasAnyScannedField(scannedData)) {
    showScannerError('No scanned values are available. Please scan a form first.');
    return;
  }

  let filledCount = 0;
  const unresolvedNotes = [];

  const directMap = {
    patientName: 'f-patientName',
    patientMiddle: 'f-patientMiddle',
    patientLast: 'f-patientLast',
    patientSuffix: 'f-patientSuffix',
    birthdate: 'f-birthdate',
    purok: 'f-purok',
    barangay: 'f-barangay',
    municipality: 'f-municipality',
    province: 'f-province',
    physician: 'f-physician',
    room: 'f-room',
    ward: 'f-ward',
    diagnosis: 'f-diagnosis',
    contact: 'f-contact',
    hemoglobin: 'f-hemoglobin',
    hematocrit: 'f-hematocrit',
    units: 'f-units',
    previousTransfusionDate: 'f-prevTransDate',
    previousUnits: 'f-prevUnits',
    reactionDate: 'f-reactionDate',
    reactionDetails: 'f-reactionDetails'
  };

  Object.entries(directMap).forEach(([fieldKey, inputId]) => {
    if (setScanFieldValue(inputId, scannedData[fieldKey])) filledCount += 1;
  });

  if (setScanSelectValue('f-sex', scannedData.sex)) filledCount += 1;
  if (setScanSelectValue('f-bloodType', scannedData.bloodType)) filledCount += 1;

  if (scannedData.componentType) {
    if (setScanSelectValue('f-component', scannedData.componentType)) {
      filledCount += 1;
    } else {
      unresolvedNotes.push(`Component "${scannerComponentLabel(scannedData.componentType)}" needs manual selection.`);
    }
  }

  if (setScanRadioValue('requestType', scannedData.requestType)) filledCount += 1;
  if (setScanRadioValue('prevTransfusion', scannedData.previousTransfusion)) filledCount += 1;
  if (setScanRadioValue('prevReaction', scannedData.previousReaction)) filledCount += 1;

  togglePrevTransFields();
  toggleReactionFields();
  updatePatientTypeAndForms();
  updateUrgencyBasedOnRequestType();
  enforceHemoglobinFormat();
  enforceHematocritFormat();
  formatAndLockContactNumber();

  const indicationResult = applyScannedIndications(scannedData.indicationCodes, scannedData.otherIndicationText);
  if (indicationResult.appliedCodes.length > 0) {
    filledCount += indicationResult.appliedCodes.length;
  }
  if (indicationResult.unmappedCodes.length > 0) {
    unresolvedNotes.push(`Some indications need manual review: ${indicationResult.unmappedCodes.join(', ')}`);
  }

  switchTab('request');
  const formSection = document.getElementById('form-section');
  if (formSection) {
    formSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (unresolvedNotes.length > 0) {
    showScannerNotice(`Filled ${filledCount} fields. ${unresolvedNotes.join(' ')}`);
  } else {
    showScannerSuccess(`Filled ${filledCount} fields from OCR. Please review before submitting.`);
  }

  clearScan();
}

async function handleScan(file) {
  setScanPopulateActionVisible(false);
  if (!file) {
    showScannerError('No file selected. Please choose an image or PDF.');
    return;
  }

  const uploadZone = document.getElementById('scanner-upload-zone');
  const placeholder = document.getElementById('scan-placeholder');
  const preview = document.getElementById('scan-preview');
  const fileName = document.getElementById('scan-file-name');
  const statusEl = document.getElementById('scan-status');
  if (!uploadZone || !placeholder || !preview || !fileName || !statusEl) return;

  if (file.size > SCANNER_MAX_FILE_BYTES) {
    showScannerError('File is too large. Maximum upload size is 5MB.');
    return;
  }

  const contentType = String(file.type || '').toLowerCase();
  if (!SCANNER_ACCEPTED_TYPES.has(contentType)) {
    showScannerError('Unsupported file type. Please upload PDF, JPG, PNG, WEBP, BMP, or TIFF.');
    return;
  }

  const errorDiv = document.getElementById('scanner-error');
  if (errorDiv) {
    errorDiv.textContent = '';
    errorDiv.style.display = 'none';
  }

  placeholder.style.display = 'none';
  preview.style.display = 'block';
  fileName.textContent = file.name;
  startScanProgress('Preparing scan...');
  uploadZone.classList.add('has-file');

  try {
    bumpScanProgress('Uploading for OCR...', 20);
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch('/api/req/blood-requests/ocr', {
      method: 'POST',
      body: formData,
      credentials: 'include'
    });

    const responseType = String(response.headers.get('content-type') || '').toLowerCase();
    let payload = {};
    let fallbackText = '';
    if (responseType.includes('application/json')) {
      payload = await response.json().catch(() => ({}));
    } else {
      fallbackText = await response.text().catch(() => '');
      try {
        payload = JSON.parse(fallbackText);
      } catch (_) {
        payload = {};
      }
    }

    console.log('[Blood Request OCR] HTTP:', response.status, response.statusText);
    console.log('[Blood Request OCR] Raw response payload:', payload);

    if (!response.ok) {
      throw new Error(extractServerErrorMessage(response, payload, fallbackText));
    }

    bumpScanProgress('Processing OCR response...', 78);
    const normalized = normalizeScannerResponse(payload);
    console.log('[Blood Request OCR] Normalized fields:', normalized.fields);
    console.log('[Blood Request OCR] Confidence:', normalized.confidence, '| Warnings:', normalized.warnings);
    scannedData = normalized.fields;
    scannedMeta = {
      confidence: normalized.confidence,
      warnings: normalized.warnings,
      rawText: normalized.rawText
    };

    if (!hasAnyScannedField(scannedData)) {
      showScannerError('No recognizable blood request fields detected. Please try a clearer image.');
      clearScan();
      return;
    }

    bumpScanProgress('Finalizing scan...', 95);
    scannerProgressValue = 100;
    renderScanProgressStatus();
    stopScanProgress();
    displayScanResults();
  } catch (err) {
    console.error('Blood request OCR scan failed:', err);
    stopScanProgress();
    showScannerError(err && err.message
      ? err.message
      : 'Unable to scan the form. Please try a clearer image or fill the form manually.');
    clearScan();
  }
}

function initStandaloneScanner() {
  const uploadZone = document.getElementById('scanner-upload-zone');
  if (uploadZone) {
    uploadZone.style.cursor = 'pointer';
    uploadZone.addEventListener('click', function () {
      const scanInput = document.getElementById('scan-input');
      if (scanInput) scanInput.click();
    });

    uploadZone.addEventListener('dragover', function (event) {
      event.preventDefault();
      uploadZone.classList.add('drag-over');
    });

    uploadZone.addEventListener('dragleave', function () {
      uploadZone.classList.remove('drag-over');
    });

    uploadZone.addEventListener('drop', function (event) {
      event.preventDefault();
      uploadZone.classList.remove('drag-over');
      if (event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
        handleScan(event.dataTransfer.files[0]);
      }
    });
  }
}

function toggleScannerPanel() {
  const content = document.getElementById('scanner-content');
  const btn = document.getElementById('scanner-collapse-btn');

  if (!content || !btn) return;

  if (content.classList.contains('collapsed')) {
    content.classList.remove('collapsed');
    btn.classList.remove('collapsed');
  } else {
    content.classList.add('collapsed');
    btn.classList.add('collapsed');
  }
}

