//====================================
// BLOODPLUS HOSPITAL DASHBOARD
// Updated with Blood Bank Availability
//====================================

// ═══════════════════════════════════════════════════════════════
// ░░░ GLOBAL CONFIG & STATE ░░░
// ═══════════════════════════════════════════════════════════════

const BT_LABELS = { O_NEG:'O−',O_POS:'O+',A_NEG:'A−',A_POS:'A+',B_NEG:'B−',B_POS:'B+',AB_NEG:'AB−',AB_POS:'AB+' };
const COMP_LABELS = { 
  WHOLE_BLOOD:'Whole Blood',
  PRBC:'Packed RBC',
  LEUKOREDUCED_PRBC:'Leukoreduced PRBC',
  ALIQUOTED_PRBC:'Aliquoted PRBC',
  PLATELET_CONCENTRATE:'Platelet Concentrate',
  FRESH_FROZEN_PLASMA:'Fresh Frozen Plasma',
  CRYOPRECIPITATE:'Cryoprecipitate',
  CRYOSUPERNATANT:'Cryosupernatant'
};
const URGENCY_LABELS = { LOW:'Low',MEDIUM:'Medium',HIGH:'High',CRITICAL:'Critical' };
const CAT_LABELS = { INPATIENT:'Inpatient',OUTPATIENT:'Outpatient',HOSPITAL:'Inter-hospital',EMERGENCY:'Emergency' };

const STATUS_CFG = {
  PENDING:          { label:'Pending Review',    icon:'⏳', bg:'var(--amber-soft)',  color:'var(--amber)',  sub:'Waiting for blood bank review' },
  APPROVED:         { label:'Approved',          icon:'✓',  bg:'var(--blue-soft)',   color:'var(--blue)',   sub:'Request has been approved' },
  ALLOCATED:        { label:'Allocated',         icon:'🩸', bg:'var(--purple-soft)', color:'var(--purple)', sub:'Blood bag has been allocated' },
  READY_FOR_RELEASE:{ label:'Ready for Release', icon:'📦', bg:'var(--gold-soft)',   color:'var(--gold)',   sub:'Ready for pickup / transport' },
  RELEASED:         { label:'Released',          icon:'✅', bg:'var(--green-soft)',  color:'var(--green)',  sub:'Blood has been released' },
  REJECTED:         { label:'Rejected',          icon:'✕',  bg:'var(--red-soft)',    color:'var(--red)',    sub:'Request was not approved' },
  CANCELLED:        { label:'Cancelled',         icon:'—',  bg:'#F0F0F0',            color:'#888',          sub:'Cancelled by hospital' },
};

const URGENCY_BADGE = { LOW:'badge-low', MEDIUM:'badge-medium', HIGH:'badge-high', CRITICAL:'badge-critical' };

// Global State
let REQUESTS = [];
let currentFilter = 'ALL';
let cancelTargetId = null;

// Blood Bank Availability Cache
let bloodBankAvailability = {
  bloodTypes: {},
  components: {},
  lastUpdated: null
};


// ═══════════════════════════════════════════════════════════════
// ░░░ UTILITY FUNCTIONS ░░░
// ═══════════════════════════════════════════════════════════════

function formatDate(d) {
  if (!d) return '—';
  const dateStr = d.includes('T') ? d : d + 'T00:00:00';
  return new Date(dateStr)
    .toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
}

// Modal helpers
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('show');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
}

// Mobile sidebar helpers
function toggleSidebar() {
  const s = document.getElementById('sidebar');
  const b = document.getElementById('sidebarBackdrop');
  const h = document.getElementById('hamburger');
  if (!s || !b || !h) return;

  const open = s.classList.contains('open');
  if (open) {
    closeSidebar();
    return;
  }
  s.classList.add('open');
  b.classList.add('show');
  h.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSidebar() {
  const s = document.getElementById('sidebar');
  const b = document.getElementById('sidebarBackdrop');
  const h = document.getElementById('hamburger');
  if (s) s.classList.remove('open');
  if (b) b.classList.remove('show');
  if (h) h.classList.remove('open');
  document.body.style.overflow = '';
}

// Panel navigation
function showPanel(id, navEl) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');

  if (id === 'myrequests') { filterRequests(currentFilter, document.querySelector('.active-filter')); }
  if (id === 'dashboard')  { renderDashboard(); }
  if (id === 'newrequest') { 
    currentStep = 1;
    updateStepUI();
    hideStepErrorBanner();
  }
}


// ═══════════════════════════════════════════════════════════════
// ░░░ 1️⃣ DASHBOARD TAB ░░░
// ═══════════════════════════════════════════════════════════════

/**
 * Render dashboard with statistics and recent requests
 */
function renderDashboard() {
  const pending  = REQUESTS.filter(r => ['PENDING','APPROVED','ALLOCATED','READY_FOR_RELEASE'].includes(r.status)).length;
  const released = REQUESTS.filter(r => r.status === 'RELEASED').length;
  const total    = REQUESTS.length;
  const units    = REQUESTS.filter(r => r.status === 'RELEASED').reduce((s,r) => s + r.numberOfUnits, 0);

  document.getElementById('dash-stat-pending').textContent  = pending;
  document.getElementById('dash-stat-released').textContent = released;
  document.getElementById('dash-stat-total').textContent    = total;
  document.getElementById('dash-stat-units').textContent    = units;
  document.getElementById('nav-pending-count').textContent  = pending;
  document.getElementById('prof-total').textContent = total;

  // Recent requests table
  const tbody = document.getElementById('dash-recent-tbody');
  const recent = [...REQUESTS].sort((a,b) => new Date(b.requestedAt) - new Date(a.requestedAt)).slice(0,5);
  tbody.innerHTML = recent.map(r => {
    const sc = STATUS_CFG[r.status];
    return `<tr>
      <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted)">${r.referenceNumber}</td>
      <td style="font-weight:600">${r.patientName}</td>
      <td>${COMP_LABELS[r.bloodComponent]}</td>
      <td><span class="badge badge-${r.status.toLowerCase().replace(/_/g, '-')}">${sc.icon} ${sc.label}</span></td>
    </tr>`;
  }).join('');

  // Load blood bank availability
  loadBloodBankAvailability();
}

/**
 * Load blood bank availability from backend
 */
async function loadBloodBankAvailability() {
  try {
    const response = await fetch('/api/hospital/blood-bank/availability', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch blood bank availability:', response.status);
      return;
    }

    const data = await response.json();
    bloodBankAvailability = {
      bloodTypes: data.bloodTypes || {},
      components: data.components || {},
      lastUpdated: data.timestamp || new Date().toISOString()
    };

    // Update blood type display
    updateBloodTypeDisplay();
    
    // Update component display
    updateComponentDisplay();

  } catch (error) {
    console.error('Error loading blood bank availability:', error);
  }
}

/**
 * Update blood type availability display
 */
function updateBloodTypeDisplay() {
  const btMap = {
    'O+': 'blood-o-pos-status',
    'O−': 'blood-o-neg-status',
    'A+': 'blood-a-pos-status',
    'A−': 'blood-a-neg-status',
    'B+': 'blood-b-pos-status',
    'B−': 'blood-b-neg-status',
    'AB+': 'blood-ab-pos-status',
    'AB−': 'blood-ab-neg-status'
  };

  for (const [displayLabel, elementId] of Object.entries(btMap)) {
    const statusEl = document.getElementById(elementId);
    if (!statusEl) continue;

    const availability = bloodBankAvailability.bloodTypes[displayLabel];
    if (!availability) {
      statusEl.textContent = 'Loading...';
      continue;
    }

    const { status, label } = availability;
    let bgClass = 'var(--gray-soft)';
    let color = 'var(--muted)';

    if (status === 'AVAILABLE') {
      bgClass = 'var(--green-soft)';
      color = 'var(--green)';
    } else if (status === 'LOW_STOCK') {
      bgClass = 'var(--amber-soft)';
      color = 'var(--amber)';
    }

    statusEl.textContent = label;
    statusEl.style.background = bgClass;
    statusEl.style.color = color;
  }
}

/**
 * Update component availability display
 */
function updateComponentDisplay() {
  const componentMap = {
    'whole-blood': 'comp-whole-blood',
    'prbc': 'comp-prbc',
    'leukoreduced-prbc': 'comp-leukoreduced-prbc',
    'aliquoted-prbc': 'comp-aliquoted-prbc',
    'platelet-concentrate': 'comp-platelets',
    'fresh-frozen-plasma': 'comp-ffp',
    'cryoprecipitate': 'comp-cryo',
    'cryosupernatant': 'comp-cryo-sn'
  };

  for (const [componentKey, elementId] of Object.entries(componentMap)) {
    const statusEl = document.getElementById(elementId);
    if (!statusEl) continue;

    const availability = bloodBankAvailability.components[componentKey];
    if (!availability) {
      statusEl.textContent = 'Loading...';
      continue;
    }

    const { status, label } = availability;
    let borderColor = 'var(--muted)';

    if (status === 'AVAILABLE') {
      borderColor = 'var(--green)';
    } else if (status === 'LOW_STOCK') {
      borderColor = 'var(--amber)';
    }

    statusEl.textContent = label;
    statusEl.parentElement.style.borderLeftColor = borderColor;
  }

  // Update last updated timestamp
  // const lastUpdatedEl = document.getElementById('bloodbank-last-updated');
  // if (lastUpdatedEl && bloodBankAvailability.lastUpdated) {
  //   const timestamp = new Date(bloodBankAvailability.lastUpdated);
  //   const now = new Date();
  //   const diffMs = now - timestamp;
  //   const diffMins = Math.floor(diffMs / 60000);

  //   let timeStr = 'Just now';
  //   if (diffMins > 0) {
  //     timeStr = diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
  //   }
  //   lastUpdatedEl.textContent = timeStr;
  // }
}

/**
 * Refresh blood bank status button animation
 */
function refreshBloodBankStatus() {
    const btn = document.getElementById('refresh-blood-status');
    btn.disabled = true;
    btn.style.opacity = '0.6';

    // Add rotating animation
    btn.style.animation = 'spin 1s linear infinite';

    // Reload availability
    loadBloodBankAvailability();

    // Re-enable button after 1.5 seconds
    setTimeout(() => {
        btn.disabled = false;
        btn.style.opacity = '1';
        btn.style.animation = 'none';
    }, 1500);
}

// Add spin animation CSS for refresh button
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
`;
document.head.appendChild(style);

// ═══════════════════════════════════════════════════════════════
// ░░░ UPDATED: NEW BLOOD REQUEST TAB (6 STEPS) ░░░
// ═══════════════════════════════════════════════════════════════

const TOTAL_STEPS = 6;
let currentStep = 1;
let docFile = null;

/**
 * Update step indicator UI (dots, lines, buttons, content visibility)
 */
function updateStepUI() {
  // Update step dots and lines
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const dot = document.getElementById(`step-dot-${i}`);
    const line = document.getElementById(`step-line-${i}`);
    
    if (dot) {
      dot.classList.remove('active');
      if (i === currentStep) {
        dot.classList.add('active');
      } else if (i < currentStep) {
        dot.textContent = '✓';
        dot.style.background = '#2E7D4F';
        dot.style.color = 'white';
      } else {
        dot.textContent = i;
        dot.style.background = '#F0F0F0';
        dot.style.color = '#999';
      }
    }
    
    if (line && i < TOTAL_STEPS) {
      line.style.background = i < currentStep ? '#2E7D4F' : '#E8E8E8';
    }
  }
  
  // Update step counter
  const counter = document.getElementById('current-step-num');
  if (counter) counter.textContent = currentStep;
  
  // Show/hide step content
  for (let i = 1; i <= TOTAL_STEPS; i++) {
    const step = document.getElementById(`form-step-${i}`);
    if (step) {
      step.style.display = i === currentStep ? 'block' : 'none';
    }
  }
  
  // Update button visibility
  const prevBtn = document.getElementById('btn-prev');
  const nextBtn = document.getElementById('btn-next');
  const submitBtn = document.getElementById('submit-btn');
  const resetBtn = document.getElementById('btn-reset');
  
  if (prevBtn) prevBtn.style.display = currentStep > 1 ? 'block' : 'none';
  if (nextBtn) nextBtn.style.display = currentStep < TOTAL_STEPS ? 'block' : 'none';
  if (submitBtn) submitBtn.style.display = currentStep === TOTAL_STEPS ? 'block' : 'none';
  if (resetBtn) resetBtn.style.display = currentStep === TOTAL_STEPS ? 'none' : 'block';
  
  hideStepErrorBanner();
}

/**
 * Move to next step
 */
function nextStep() {
  hideStepErrorBanner();
  
  // Validate current step before proceeding
  if (currentStep === 1 && !validateStep1()) return;
  if (currentStep === 2 && !validateStep2()) return;
  if (currentStep === 3 && !validateStep3()) return;
  if (currentStep === 4 && !validateStep4()) return;
  if (currentStep === 5 && !validateStep5()) return;

  if (currentStep < TOTAL_STEPS) {
    currentStep++;
    updateStepUI();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

/**
 * Move to previous step
 */
function prevStep() {
  if (currentStep > 1) {
    currentStep--;
    updateStepUI();
    hideStepErrorBanner();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

// ──────────────────────────────────────────────────────────────
// Form Validation
// ──────────────────────────────────────────────────────────────

/**
 * Error display helpers
 */
function showStepError(message) {
  const el = document.getElementById('err-submit-msg');
  if (el) el.textContent = message;
}

function showStepErrorBanner() {
  const errSubmit = document.getElementById('err-submit');
  if (errSubmit) errSubmit.classList.add('show');
}

function hideStepErrorBanner() {
  const errSubmit = document.getElementById('err-submit');
  if (errSubmit) errSubmit.classList.remove('show');
}

/**
 * Validate Step 1: Patient Information
 */
function validateStep1() {
  let ok = true;
  const errBanners = ['err-category', 'err-agegroup'];
  errBanners.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });

  // Check Request Category
  if (!document.querySelector('input[name="req-category"]:checked')) {
    const el = document.getElementById('err-category');
    if (el) el.classList.add('show');
    showStepError('Please select a request category.');
    ok = false;
  }

  // Check Age Group
  if (!document.querySelector('input[name="req-agegroup"]:checked')) {
    const el = document.getElementById('err-agegroup');
    if (el) el.classList.add('show');
    showStepError('Please select an age group.');
    ok = false;
  }

  // Check required text fields
  const required = [
    ['pat-lastname', 'Patient Last Name'],
    ['pat-firstname', 'Patient First Name'],
    ['pat-age', 'Patient Age'],
    ['pat-physician', 'Requesting Physician'],
  ];

  for (const [id, name] of required) {
    const val = document.getElementById(id)?.value?.trim();
    if (!val) {
      showStepError(`⚠ ${name} is required.`);
      ok = false;
      break;
    }
  }

  // Check Patient Sex
  if (!document.querySelector('input[name="pat-sex"]:checked')) {
    showStepError('⚠ Please select patient sex.');
    ok = false;
  }

  if (!ok) {
    showStepErrorBanner();
  }

  return ok;
}

/**
 * Validate Step 2: Blood Request Details
 */
function validateStep2() {
  let ok = true;
  const errBanners = ['err-bt', 'err-comp', 'err-urgency'];
  errBanners.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });

  // Check Blood Type
  if (!document.querySelector('input[name="req-bt"]:checked')) {
    const el = document.getElementById('err-bt');
    if (el) el.classList.add('show');
    showStepError('⚠ Please select a blood type.');
    ok = false;
  }

  // Check Component
  if (!document.querySelector('input[name="req-comp"]:checked')) {
    const el = document.getElementById('err-comp');
    if (el) el.classList.add('show');
    showStepError('⚠ Please select a blood component.');
    ok = false;
  }

  // Check Units
  const units = document.getElementById('req-units')?.value?.trim();
  if (!units || parseInt(units) < 1) {
    showStepError('⚠ Please enter number of units (minimum 1).');
    ok = false;
  }

  // Check Urgency
  if (!document.querySelector('input[name="req-urgency"]:checked')) {
    const el = document.getElementById('err-urgency');
    if (el) el.classList.add('show');
    showStepError('⚠ Please select an urgency level.');
    ok = false;
  }

  if (!ok) {
    showStepErrorBanner();
  }

  return ok;
}

/**
 * Validate Step 3: Clinical Data & History (optional, no validation needed)
 */
function validateStep3() {
  // This step is optional - no validation required
  return true;
}

/**
 * Validate Step 4: Indication for Transfusion
 */
function validateStep4() {
  const checkedIndications = document.querySelectorAll('.indication-checkbox:checked');
  
  if (checkedIndications.length === 0) {
    showStepError('⚠ Please select at least one indication.');
    const errEl = document.getElementById('err-indication');
    if (errEl) errEl.classList.add('show');
    showStepErrorBanner();
    return false;
  }

  const errEl = document.getElementById('err-indication');
  if (errEl) errEl.classList.remove('show');
  return true;
}

/**
 * Validate Step 5: Supporting Documents
 */
function validateStep5() {
  const docFile = document.getElementById('doc-file')?.files[0];
  
  if (!docFile) {
    showStepError('⚠ Please upload Doctor\'s Blood Request Form. This is required.');
    showStepErrorBanner();
    return false;
  }
  
  return true;
}

/**
 * Full form validation (used when submitting)
 */
function validateNewRequest() {
  let ok = true;

  const errBanners = ['err-category','err-bt','err-comp','err-urgency','err-indication'];
  errBanners.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });

  if (!document.querySelector('input[name="req-category"]:checked')) {
    const el = document.getElementById('err-category');
    if (el) el.classList.add('show');
    ok = false;
  }
  if (!document.querySelector('input[name="req-bt"]:checked')) {
    const el = document.getElementById('err-bt');
    if (el) el.classList.add('show');
    ok = false;
  }
  if (!document.querySelector('input[name="req-comp"]:checked')) {
    const el = document.getElementById('err-comp');
    if (el) el.classList.add('show');
    ok = false;
  }
  if (!document.querySelector('input[name="req-urgency"]:checked')) {
    const el = document.getElementById('err-urgency');
    if (el) el.classList.add('show');
    ok = false;
  }

  const checkedIndications = document.querySelectorAll('.indication-checkbox:checked');
  if (checkedIndications.length === 0) {
    const el = document.getElementById('err-indication');
    if (el) el.classList.add('show');
    ok = false;
  }

  const required = [
    ['pat-lastname','Last Name'],
    ['pat-firstname','First Name'],
    ['pat-age','Age'],
    ['pat-physician','Requesting Physician'],
    ['req-units','Number of Units'],
  ];

  for (const [id, name] of required) {
    if (!document.getElementById(id)?.value?.trim()) {
      const el = document.getElementById('err-submit-msg');
      if (el) el.textContent = `Please fill in: ${name}`;
      ok = false;
      break;
    }
  }

  if (!document.querySelector('input[name="pat-sex"]:checked')) {
    const el = document.getElementById('err-submit-msg');
    if (el) el.textContent = 'Please select patient sex.';
    ok = false;
  }

  const docFileInput = document.getElementById('doc-file');
  if (!docFileInput?.files[0]) {
    const el = document.getElementById('err-submit-msg');
    if (el) el.textContent = 'Please upload Doctor\'s Blood Request Form.';
    ok = false;
  }

  const errSubmit = document.getElementById('err-submit');
  if (errSubmit) errSubmit.classList.toggle('show', !ok);
  
  return ok;
}

// ──────────────────────────────────────────────────────────────
// Indication Management
// ──────────────────────────────────────────────────────────────

/**
 * Update visible indication groups based on selected component and age group
 */
function updateIndicationGroups() {
  const component = document.querySelector('input[name="req-comp"]:checked')?.value;
  const ageGroup = document.querySelector('input[name="req-agegroup"]:checked')?.value;

  // Hide all indication groups
  document.querySelectorAll('.indication-group').forEach(g => {
    g.style.display = 'none';
  });

  // Show indication container
  const container = document.getElementById('indication-container');
  if (container && component && ageGroup) {
    container.style.display = 'block';

    // Determine which group(s) to show
    let groupId = '';
    if (ageGroup === 'ADULT') {
      if (component === 'WHOLE_BLOOD') groupId = 'group-WHOLE_BLOOD';
      else if (component === 'PRBC' || component === 'LEUKOREDUCED_PRBC' || component === 'ALIQUOTED_PRBC') groupId = 'group-PRBC';
      else if (component === 'PLATELET_CONCENTRATE') groupId = 'group-PLATELET_CONCENTRATE';
      else if (component === 'FRESH_FROZEN_PLASMA') groupId = 'group-FRESH_FROZEN_PLASMA';
      else if (component === 'CRYOPRECIPITATE') groupId = 'group-CRYOPRECIPITATE';
    } else if (ageGroup === 'PEDIA') {
      if (component === 'WHOLE_BLOOD') groupId = 'group-WHOLE_BLOOD-PEDIA';
      else if (component === 'PRBC' || component === 'LEUKOREDUCED_PRBC' || component === 'ALIQUOTED_PRBC') groupId = 'group-PRBC-PEDIA';
      else if (component === 'PLATELET_CONCENTRATE') groupId = 'group-PLATELET_CONCENTRATE-PEDIA';
      else if (component === 'FRESH_FROZEN_PLASMA') groupId = 'group-FRESH_FROZEN_PLASMA-PEDIA';
      else if (component === 'CRYOPRECIPITATE') groupId = 'group-CRYOPRECIPITATE-PEDIA';
    }

    if (groupId) {
      const group = document.getElementById(groupId);
      if (group) group.style.display = 'block';
    }
  } else {
    container.style.display = 'none';
  }
}

/**
 * Handle indication checkbox changes (toggle sub-groups if parent is checked)
 */
document.addEventListener('change', function(e) {
  if (e.target.classList.contains('indication-checkbox')) {
    // If this is a parent checkbox, toggle its sub-group
    const parentId = e.target.getAttribute('data-parent');
    if (!parentId) {
      // This is a parent (no data-parent attribute)
      // Extract the parent code from the ID (e.g., "ind-F-5" -> "F-5")
      const elementId = e.target.id;
      if (elementId && elementId.startsWith('ind-')) {
        const parentCode = elementId.substring(4);  // Remove "ind-" prefix
        toggleIndicationSubgroup(parentCode);
      }
    }
  }
}, true);

// ──────────────────────────────────────────────────────────────
// Clinical Data Toggle Functions
// ──────────────────────────────────────────────────────────────

/**
 * Toggle previous transfusion history fields
 */
function togglePrevTransfusionFields() {
  const selected = document.querySelector('input[name="prev-transfusion"]:checked')?.value;
  const fieldsDiv = document.getElementById('prev-transfusion-fields');
  
  if (selected === 'yes') {
    fieldsDiv.style.display = 'block';
  } else {
    fieldsDiv.style.display = 'none';
    // Clear fields when hidden
    document.getElementById('prev-transfusion-date').value = '';
    document.getElementById('prev-transfusion-units').value = '';
  }
}

/**
 * Toggle previous reaction history fields
 */
function togglePrevReactionFields() {
  const selected = document.querySelector('input[name="prev-reaction"]:checked')?.value;
  const fieldsDiv = document.getElementById('prev-reaction-fields');
  
  if (selected === 'yes') {
    fieldsDiv.style.display = 'block';
  } else {
    fieldsDiv.style.display = 'none';
    // Clear fields when hidden
    document.getElementById('prev-reaction-date').value = '';
    document.getElementById('prev-reaction-details').value = '';
  }
}

// ──────────────────────────────────────────────────────────────
// File Upload Handling
// ──────────────────────────────────────────────────────────────

/**
 * Handle file drop on upload zone
 */
function handleDrop(e, key) {
  e.preventDefault();
  const zone = document.getElementById(key+'-zone');
  if (zone) zone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) processUpload(e.dataTransfer.files[0], key);
}

/**
 * Handle file selection from input
 */
function handleFile(input, key) {
  if (input.files[0]) processUpload(input.files[0], key);
}

/**
 * Process uploaded file (validate size, type, display preview)
 */
function processUpload(file, key) {
  const errEl = document.getElementById(key+'-err');
  if (errEl) errEl.style.display = 'none';
 
  if (file.size > 5*1024*1024) {
    if (errEl) {
      errEl.textContent = '⚠ File too large (max 5MB)';
      errEl.style.display = 'block';
    }
    return;
  }
 
  if (!['application/pdf','image/jpeg','image/png'].includes(file.type)) {
    if (errEl) {
      errEl.textContent = '⚠ Only PDF, JPG, PNG accepted';
      errEl.style.display = 'block';
    }
    return;
  }
 
  const placeholder = document.getElementById(key+'-placeholder');
  const preview = document.getElementById(key+'-preview');
  if (placeholder) placeholder.style.display = 'none';
  if (preview) preview.style.display = 'flex';
 
  const nameEl = document.getElementById(key+'-name');
  const sizeEl = document.getElementById(key+'-size');
  if (nameEl) nameEl.textContent = file.name;
  if (sizeEl) sizeEl.textContent = file.size < 1024*1024
    ? (file.size/1024).toFixed(1)+' KB' : (file.size/(1024*1024)).toFixed(1)+' MB';
}

/**
 * Clear uploaded file
 */
function clearFile(key) {
  const fileInput = document.getElementById(key+'-file');
  if (fileInput) fileInput.value = '';
 
  const placeholder = document.getElementById(key+'-placeholder');
  const preview = document.getElementById(key+'-preview');
  if (placeholder) placeholder.style.display = 'block';
  if (preview) preview.style.display = 'none';
}

// ──────────────────────────────────────────────────────────────
// Form Submission & Reset
// ──────────────────────────────────────────────────────────────

/**
 * Optional: Can be used to sync form state, validate on change, etc.
 */
function syncForm() {
  // Placeholder for future validation on change
}

/**
 * Collect all indication codes from checked checkboxes
 */
function getSelectedIndications() {
  const indications = [];
  document.querySelectorAll('.indication-checkbox:checked').forEach(cb => {
    indications.push(cb.value);
  });
  return indications.join(',');
}

/**
 * Submit new blood request to backend
 * Note: New fields (hemoglobin, hematocrit, clinicalImpression, previousTransfusion*, previousReaction*, indication)
 * are NOT sent to backend yet - ready for future implementation
 */
async function submitRequest() {
  if (!validateNewRequest()) {
    console.error('Form validation failed');
    return;
  }
 
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting...';
 
  try {
    // ─────────────────────────────────────────────────────────────
    // COLLECT CORE FIELDS
    // ─────────────────────────────────────────────────────────────
    
    const bloodType = document.querySelector('input[name="req-bt"]:checked')?.value;
    const bloodComponent = document.querySelector('input[name="req-comp"]:checked')?.value;
    const requestCategory = document.querySelector('input[name="req-category"]:checked')?.value;
    const urgencyLevel = document.querySelector('input[name="req-urgency"]:checked')?.value;
    const ageGroup = document.querySelector('input[name="req-agegroup"]:checked')?.value || 'ADULT';
    const patientSex = document.querySelector('input[name="pat-sex"]:checked')?.value;
 
    // ─────────────────────────────────────────────────────────────
    // COLLECT CLINICAL DATA FIELDS (Step 3)
    // ─────────────────────────────────────────────────────────────
    
    const clinicalImpression = document.getElementById('pat-diagnosis')?.value?.trim() || '';
    const attendingPhysician = document.getElementById('pat-physician')?.value?.trim() || '';
    const contactNumber = document.getElementById('pat-contact')?.value?.trim() || '';
    const hemoglobin = document.getElementById('pat-hemoglobin')?.value 
      ? parseFloat(document.getElementById('pat-hemoglobin').value) 
      : null;
    const hematocrit = document.getElementById('pat-hematocrit')?.value 
      ? parseFloat(document.getElementById('pat-hematocrit').value) 
      : null;
    const requestType = document.querySelector('input[name="req-type"]:checked')?.value || 'ROUTINE';
 
    // ─────────────────────────────────────────────────────────────
    // COLLECT TRANSFUSION HISTORY (Step 3)
    // ─────────────────────────────────────────────────────────────
    
    const hadPreviousTransfusion = document.querySelector('input[name="prev-transfusion"]:checked')?.value === 'yes';
    const previousTransfusionDate = hadPreviousTransfusion 
      ? document.getElementById('prev-transfusion-date')?.value || null 
      : null;
    const previousTransfusionUnits = hadPreviousTransfusion 
      ? document.getElementById('prev-transfusion-units')?.value 
        ? parseInt(document.getElementById('prev-transfusion-units').value) 
        : null 
      : null;
 
    // ─────────────────────────────────────────────────────────────
    // COLLECT REACTION HISTORY (Step 3)
    // ─────────────────────────────────────────────────────────────
    
    const hadPreviousReaction = document.querySelector('input[name="prev-reaction"]:checked')?.value === 'yes';
    const previousReactionDate = hadPreviousReaction 
      ? document.getElementById('prev-reaction-date')?.value || null 
      : null;
    const previousReactionDetails = hadPreviousReaction
      ? document.getElementById('prev-reaction-details')?.value?.trim() || null
      : null;
 
    // ─────────────────────────────────────────────────────────────
    // COLLECT INDICATIONS (Step 4) - HIERARCHICAL CODES
    // Includes parent codes and their selected sub-codes
    // Example: "F-5,F-5a,F-5b" or "R-2,R-2a,R-2c"
    // ─────────────────────────────────────────────────────────────
    
    const indication = getSelectedIndicationsHierarchical();
 
    // ─────────────────────────────────────────────────────────────
    // BUILD REQUEST DTO
    // ─────────────────────────────────────────────────────────────
 
    const requestDTO = {
      // Core fields
      patientName: (
        document.getElementById('pat-lastname').value.trim() + ', ' +
        document.getElementById('pat-firstname').value.trim()
      ),
      patientAge: parseInt(document.getElementById('pat-age').value, 10),
      patientSex: patientSex,
      wardRoom: document.getElementById('pat-ward')?.value.trim() || '',
      requestingPhysician: document.getElementById('pat-physician').value.trim(),
      
      // Patient type & category
      ageGroup: ageGroup,
      requestCategory: requestCategory,
      
      // Blood request details
      bloodType: bloodType,
      bloodComponent: bloodComponent,
      numberOfUnits: parseInt(document.getElementById('req-units').value, 10),
      urgencyLevel: urgencyLevel,
      requiredBy: document.getElementById('req-date-needed')?.value || null,
      notes: document.getElementById('req-notes')?.value.trim() || '',
      
      // ────── CLINICAL DATA ──────
      clinicalImpression: clinicalImpression || null,
      attendingPhysician: attendingPhysician || null,
      contactNumber: contactNumber || null,
      hemoglobin: hemoglobin,
      hematocrit: hematocrit,
      requestType: requestType,
      
      // ────── TRANSFUSION HISTORY ──────
      hadPreviousTransfusion: hadPreviousTransfusion,
      previousTransfusionDate: previousTransfusionDate,
      previousTransfusionUnits: previousTransfusionUnits,
      
      // ────── REACTION HISTORY ──────
      hadPreviousReaction: hadPreviousReaction,
      previousReactionDate: previousReactionDate,
      previousReactionDetails: previousReactionDetails,
      
      // ────── INDICATIONS (HIERARCHICAL) ──────
      indication: indication  // "F-5,F-5a,F-5b" format
    };
 
    // ─────────────────────────────────────────────────────────────
    // PREPARE FORM DATA (Include file upload)
    // ─────────────────────────────────────────────────────────────
 
    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(requestDTO)], { type: 'application/json' }));
 
    const docFileInput = document.getElementById('doc-file');
    if (docFileInput && docFileInput.files.length > 0) {
      formData.append('doctorsNote', docFileInput.files[0]);
    }
 
    // ─────────────────────────────────────────────────────────────
    // SUBMIT TO BACKEND
    // ─────────────────────────────────────────────────────────────
 
    const response = await fetch('/api/hospital/blood-requests', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });
 
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }
 
    const result = await response.json();
 
    // Show success modal
    const successRefElement = document.getElementById('success-ref');
    if (successRefElement) {
      successRefElement.textContent = result.referenceNumber;
    }
 
    const successModal = document.getElementById('successModal');
    if (successModal) {
      openModal('successModal');
    }
 
    // Clear form
    resetNewRequestForm();
 
    // Reload requests from backend
    await loadHospitalRequests();
 
  } catch (error) {
    console.error('Error submitting request:', error);
    alert(`Failed to submit blood request: ${error.message}`);
 
    const errorElement = document.getElementById('error-message');
    if (errorElement) {
      errorElement.textContent = error.message;
      errorElement.style.display = 'block';
    }
 
  } finally {
    btn.disabled = false;
    btn.textContent = '🩸 Submit Blood Request';
  }
}
 
/**
 * Collect all indication codes including hierarchical parent-child relationships
 * Example output: "F-5,F-5a,F-5b,R-2,R-2a"
 * 
 * If parent (e.g., F-5) is checked, include it
 * If child (e.g., F-5a, F-5b) is checked, include both parent and child
 * This preserves the logical hierarchy in the saved data
 */
function getSelectedIndicationsHierarchical() {
  const selected = new Set();
  const allChecked = document.querySelectorAll('.indication-checkbox:checked');
  
  allChecked.forEach(checkbox => {
    const code = checkbox.value;
    selected.add(code);
    
    // If this is a sub-item (e.g., F-5a), also add the parent (e.g., F-5)
    const parentId = checkbox.getAttribute('data-parent');
    if (parentId) {
      const parentCode = parentId;  // data-parent already contains the code like "F-5"
      selected.add(parentCode);
    }
  });
  
  // Convert set to comma-separated string and sort for consistency
  return Array.from(selected).sort().join(',');
}
 
/**
 * Toggle visibility of sub-items when parent indication is checked
 * Triggered on parent checkbox change
 */
function toggleIndicationSubgroup(parentId) {
  const subGroup = document.getElementById(`sub-${parentId}`);
  const parentCheckbox = document.getElementById(`ind-${parentId}`);
  
  if (parentCheckbox && subGroup) {
    if (parentCheckbox.checked) {
      // Show sub-items when parent is checked
      subGroup.style.display = 'block';
    } else {
      // Hide sub-items AND uncheck them when parent is unchecked
      subGroup.style.display = 'none';
      
      // Uncheck all sub-items
      const subItems = subGroup.querySelectorAll('.indication-checkbox.sub');
      subItems.forEach(item => {
        item.checked = false;
      });
    }
  }
}

/**
 * Reset new request form to initial state
 */
function resetNewRequestForm() {
  document.querySelectorAll('#panel-newrequest input[type=text], #panel-newrequest input[type=number], #panel-newrequest input[type=date], #panel-newrequest input[type=tel], #panel-newrequest textarea')
    .forEach(el => el.value = '');
  document.querySelectorAll('#panel-newrequest input[type=radio], #panel-newrequest input[type=checkbox]').forEach(el => el.checked = false);
  clearFile('doc');
  clearFile('ref');
  ['err-category','err-bt','err-comp','err-urgency','err-agegroup','err-indication'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
  const el = document.getElementById('err-submit');
  if (el) el.classList.remove('show');
 
  // Hide clinical data conditional fields
  document.getElementById('prev-transfusion-fields').style.display = 'none';
  document.getElementById('prev-reaction-fields').style.display = 'none';
 
  // Hide all indication groups and sub-groups
  document.querySelectorAll('.indication-group').forEach(g => {
    g.style.display = 'none';
  });
  document.querySelectorAll('.indication-sub-group').forEach(g => {
    g.style.display = 'none';
  });
  document.getElementById('indication-container').style.display = 'none';
 
  currentStep = 1;
  updateStepUI();
}

// ═══════════════════════════════════════════════════════════════
// ░░░ 3️⃣ MY REQUESTS TAB - ENHANCED WITH BACKEND & INDICATIONS ░░░
// ═══════════════════════════════════════════════════════════════

// Global state for sorting
let currentSort = 'recent';
let columnSort = {}; // Track column sort states

// ──────────────────────────────────────────────────────────────
// INDICATION MAP — Reference for all transfusion indications
// ──────────────────────────────────────────────────────────────

const INDICATION_MAP = {
    // WHOLE BLOOD (Adult)
    'WB-1': 'Active bleeding with at least 15% blood volume loss, Hb<90 g/L, or BP drop >20%',
    'WB-2': 'Other whole blood indications (requires review)',

    // PACKED RED BLOOD CELLS (Adult)
    'R-1': 'Hemoglobin < 80 g/L or Hematocrit < 0.24',
    'R-2': 'Preoperative with Hb < 80 g/L or Hct < 0.24-0.30, or major surgery with high bleeding risk',
    'R-2a': 'Preoperative hemoglobin of less than 80 g/L or Hematocrit less than 0.24 (24%) or Hematocrit less than 0.30 (30%)',
    'R-2b': 'Major operation with high probability of bleeding with a Hemoglobin of less than 100 g/L or Hematocrit less than 0.30 (30%)',
    'R-2c': 'Sign of hemodynamic instability or inadequate oxygen carrying capacity (symptomatic anemia)',
    'R-3': 'Symptomatic anemia (dyspnea, syncope, tachycardia, chest pain, etc.)',
    'R-4': 'Hb < 80 g/L with concomitant COPD, CAD, hemoglobinopathy, or sepsis',
    'R-5': 'Other PRBC indications (requires review)',

    // WHOLE RED BLOOD CELLS (Adult)
    'W-1': 'History of allergic/anaphylactic reactions in immunocompromised patients',
    'W-2': 'Group O blood transfusion in emergency when specific blood unavailable',
    'W-3': 'Paroxysmal Nocturnal Hemoglobinuria (PNH)',
    'W-4': 'Other WRBC indications (requires review)',

    // PLATELET CONCENTRATE (Adult)
    'P-1': 'Prophylactic for count < 20,000 (not TTP/ITP/HUS)',
    'P-2': 'Active bleeding with platelet count < 50,000',
    'P-3': 'Platelet count < 50,000 and invasive procedure within 8 hours',
    'P-4': 'Platelet count < 100,000 and surgery in critical areas (eyes, brain, etc.)',
    'P-5': 'Massive transfusion with diffuse microvascular bleeding',
    'P-6': 'Other platelet indications (requires review)',

    // CRYOPRECIPITATE (Adult)
    'C-1': 'Significant Hypofibrinogenemia (< 100 mg/dL)',
    'C-2': 'Hemophilia A',
    'C-3': 'Von Willebrand\'s Disease or Uremic Bleeding with prolonged BT',
    'C-4': 'Other cryoprecipitate indications (requires review)',

    // FRESH FROZEN PLASMA (Adult)
    'F-1': 'PT or PTT > 1.5x normal within 8 hours (PT>17 sec or PTT>47 sec)',
    'F-2': 'Specific factor deficiencies not treatable with cryoprecipitate',
    'F-3': 'Coumadin reversal in bleeding patients (Vitamin K ineffective)',
    'F-4': 'Treatment of Thrombotic Thrombocytopenic Purpura (TTP)',
    'F-5': 'Clinical Coagulopathy associated with:',
    'F-5a': 'Massive Transfusion (>20 units of blood in 24 hours)',
    'F-5b': 'Late pregnancy termination or Abruptio Placentae',
    'F-6': 'Other FFP indications (requires review)',

    // WHOLE BLOOD (Pediatric)
    'PW-1': 'Exchange transfusion in infant with indirect bilirubin ≥20 mg/dL in first week',
    'PW-2': 'Hyperbilirubinemia with prematurity/illness (asphyxia, acidosis, sepsis, hemolysis)',
    'PW-3': 'Other whole blood indications (requires review)',

    // PACKED RED BLOOD CELLS (Pediatric)
    'PR-1': 'Signs/symptoms of anemia (pallor, etc.)',
    'PR-2': 'Hypovolemia from acute blood loss with shock signs or >10% loss',
    'PR-3': 'Major surgery candidate with Hematocrit < 0.30 or <0.35 (nocturnal)',
    'PR-4': 'Hypertransfusion for chronic hemolytic anemia (Thalassemia)',
    'PR-5': 'Hemoglobin ≥130 g/L and on assisted ventilation',
    'PR-6': 'Anemia with Hb < 80 g/L or Hct < 0.25',
    'PR-7': 'Blood volume reduction 10 mL/kg with Hct < 0.45 in newborn <4 months',
    'PR-8': 'Pulmonary disease or CHD with Hct 0.40-0.45',
    'PR-9': 'Other PRBC indications (requires review)',

    // WHOLE RED BLOOD CELLS (Pediatric)
    'PWR': 'Other WRBC indications (requires review)',

    // PLATELET CONCENTRATE (Pediatric)
    'PP-1': 'Active bleeding with thrombocytopenia < 50,000 or ICH risk',
    'PP-2': 'Active bleeding with qualitative defect',
    'PP-3': 'Prophylaxis for severe thrombocytopenia < 20,000 or qualitative defect',
    'PP-4': 'Invasive procedure with thrombocytopenia < 70,000 or qualitative defect',
    'PP-5': 'Other platelet indications (requires review)',

    // FRESH FROZEN PLASMA (Pediatric)
    'PF-1': 'Multiple coagulation factor deficiency (e.g., dengue shock syndrome)',
    'PF-2': 'Congenital factor deficiency',
    'PF-3': 'Anti-Thrombin III Deficiency',
    'PF-4': 'Bleeding in exchange transfusion or massive transfusion (>1 blood volume)',
    'PF-5': 'Other FFP indications (requires review)',

    // CRYOPRECIPITATE (Pediatric)
    'PC-1': 'Factor VIII Deficiency (Hemophilia A)',
    'PC-2': 'Von Willebrand\'s Disease',
    'PC-3': 'Disseminated Intravascular Coagulation (DIC)',
    'PC-4': 'Uremia with active bleeding or invasive procedure planned',
    'PC-5': 'Other cryoprecipitate indications (requires review)',
};

// ──────────────────────────────────────────────────────────────
// INDICATION UTILITY FUNCTIONS
// ──────────────────────────────────────────────────────────────

/**
 * Format indications string into array of descriptions
 * @param {string} indicationString - Comma-separated codes (e.g., "R-1,R-2a,R-3")
 * @returns {array} Array of description strings
 */
function formatIndications(indicationString) {
    if (!indicationString) return [];
    
    const codes = indicationString.split(',').map(s => s.trim()).filter(Boolean);
    const descriptions = codes.map(code => {
        const description = INDICATION_MAP[code];
        return description || code;
    }).filter(Boolean);
    
    return descriptions.length > 0 ? descriptions : [];
}

/**
 * Generate HTML badges for indication codes
 * @param {string} indicationString - Comma-separated codes
 * @returns {string} HTML string with badges
 */
function getIndicationBadges(indicationString) {
    if (!indicationString) return '';
    
    const codes = indicationString.split(',').map(s => s.trim()).filter(Boolean);
    return codes.map(code => {
        return `<span class="req-indication-badge">${code}</span>`;
    }).join('');
}

/**
 * Render indication details with parent/sub-code hierarchy
 * Groups parent codes with their sub-codes (e.g., F-5, F-5a, F-5b)
 * @param {string} indicationString - Comma-separated codes
 * @returns {string} HTML string with grouped indication details
 */
function renderIndicationDetails(indicationString) {
    if (!indicationString) {
        return '<span class="req-details-value">Not specified</span>';
    }

    const codes = indicationString.split(',').map(s => s.trim()).filter(Boolean);
    
    // Group parent codes with their sub-codes
    const grouped = {};
    codes.forEach(code => {
        const parentMatch = code.match(/^([A-Z]+-\d+)/);
        const parentCode = parentMatch ? parentMatch[1] : code;
        
        if (!grouped[parentCode]) {
            grouped[parentCode] = {
                parent: parentCode,
                main: null,
                subs: []
            };
        }
        
        // Separate main code from sub-codes
        if (code === parentCode) {
            grouped[parentCode].main = code;
        } else {
            grouped[parentCode].subs.push(code);
        }
    });
    
    // Build HTML
    let html = '<div style="margin-bottom:12px">';
    
    Object.values(grouped).forEach(group => {
        // Main code
        if (group.main) {
            const desc = INDICATION_MAP[group.main] || group.main;
            html += `
                <div style="margin-bottom:8px">
                    <strong>${group.main}</strong>: ${desc}
                </div>
            `;
        }
        
        // Sub-codes
        group.subs.forEach(subCode => {
            const desc = INDICATION_MAP[subCode] || subCode;
            html += `
                <div style="margin-left:20px;margin-bottom:6px;color:var(--muted)">
                    <strong>${subCode}</strong>: ${desc}
                </div>
            `;
        });
    });
    
    html += '</div>';
    return html;
}

// ──────────────────────────────────────────────────────────────
// BACKEND INTEGRATION — Load requests from API
// ──────────────────────────────────────────────────────────────

/**
 * Load hospital blood requests from backend
 * Transforms API response to match local REQUESTS format
 */
async function loadHospitalRequests() {
    try {
        const response = await fetch('/api/hospital/blood-requests', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            console.error('Failed to fetch requests:', response.status);
            return;
        }

        const requests = await response.json();

        // Transform backend response to match local REQUESTS format
        REQUESTS = requests.map(req => ({
            id: req.id,
            referenceNumber: req.referenceNumber,
            patientName: req.patientName,
            patientAge: req.patientAge, 
            patientSex: req.patientSex,
            wardRoom: req.wardRoom || '',
            requestingPhysician: req.requestingPhysician,
            ageGroup: req.ageGroup,
            requestCategory: req.requestCategory,
            bloodType: req.bloodType,
            bloodComponent: req.bloodComponent,
            numberOfUnits: req.numberOfUnits,
            volumeMl: req.volumeMl || null,
            urgencyLevel: req.urgencyLevel,
            status: req.status,
            requestType: req.requestType || null,
            requestedAt: req.requestedAt,
            requiredBy: req.requiredBy || null,
            notes: req.notes || '',
            doctorsNoteUrl: req.doctorsNoteUrl || null,
            doctorsNoteKey: req.doctorsNoteKey || null,
            
            // Clinical info (NEW)
            clinicalImpression: req.clinicalImpression || null,
            attendingPhysician: req.attendingPhysician || null,
            contactNumber: req.contactNumber || null,
            hemoglobin: req.hemoglobin || null,
            hematocrit: req.hematocrit || null,
            
            // Transfusion history (NEW)
            hadPreviousTransfusion: req.hadPreviousTransfusion || false,
            previousTransfusionDate: req.previousTransfusionDate || null,
            previousTransfusionUnits: req.previousTransfusionUnits || null,
            
            // Reaction history (NEW)
            hadPreviousReaction: req.hadPreviousReaction || false,
            previousReactionDate: req.previousReactionDate || null,
            previousReactionDetails: req.previousReactionDetails || null,
            
            // Indications (NEW)
            indication: req.indication || null,
            
            // Requester info (NEW)
            requesterName: req.requesterName || null,
            requesterRelationship: req.requesterRelationship || null,
            requesterContact: req.requesterContact || null,
            requesterEmail: req.requesterEmail || null,
            requesterType: req.requesterType || null,
            
            // Fulfillment & rejection
            rejectionReason: req.rejectionReason || null,
            reviewedAt: req.reviewedAt || null,
            fulfilledByBag: req.fulfilledByBag || null
        }));
        // console.log(requests);
        // Re-render with fetched data
        renderDashboard();
        filterRequests(currentFilter, document.querySelector('.active-filter'));

    } catch (error) {
        console.error('Error loading hospital requests:', error);
    }
}

// Call on page load
document.addEventListener('DOMContentLoaded', () => {
    loadHospitalRequests();
});

// ──────────────────────────────────────────────────────────────
// Filter & Sort UI Management
// ──────────────────────────────────────────────────────────────

/**
 * Toggle advanced filters section visibility
 */
function toggleAdvancedFilters() {
    const section = document.getElementById('advanced-filters-section');
    const btn = document.getElementById('toggle-filters-btn');
    
    if (section.style.display === 'none') {
        section.style.display = 'block';
        btn.style.background = 'var(--blue-soft)';
        btn.style.color = 'var(--blue)';
    } else {
        section.style.display = 'none';
        btn.style.background = '';
        btn.style.color = '';
    }
}

/**
 * Clear all filters and reset to defaults
 */
function clearAllFilters() {
    // Reset filter dropdowns
    document.getElementById('filter-blood-type').value = '';
    document.getElementById('filter-component').value = '';
    document.getElementById('filter-urgency').value = '';
    document.getElementById('filter-category').value = '';
    document.getElementById('filter-units').value = '';
    document.getElementById('filter-date-range').value = '';
    document.getElementById('req-search').value = '';
    
    // Reset sort to default
    document.getElementById('req-sort').value = 'recent';
    currentSort = 'recent';
    
    // Reapply filters
    applyFiltersAndSort();
}

/**
 * Apply all filters and sorting together
 */
function applyFiltersAndSort() {
    filterRequests(currentFilter, document.querySelector('.active-filter'));
}

/**
 * Toggle sort direction on column header click
 */
function toggleSortColumn(column) {
    // Initialize column state if not exists
    if (!columnSort[column]) {
        columnSort[column] = 'asc';
    } else {
        columnSort[column] = columnSort[column] === 'asc' ? 'desc' : 'asc';
    }
    
    // Map column to sort value
    const sortMap = {
        'ref': 'ref',
        'patient': 'patient',
        'units': 'units',
        'date': 'recent'
    };
    
    currentSort = sortMap[column] + (columnSort[column] === 'desc' ? '-desc' : '');
    
    // Update visual indicators
    updateSortIndicators(column);
    
    applyFiltersAndSort();
}

/**
 * Update sort indicator symbols on column headers
 */
function updateSortIndicators(activeColumn) {
    const columns = ['ref', 'patient', 'units', 'date'];
    
    columns.forEach(col => {
        const indicator = document.getElementById(`sort-indicator-${col}`);
        if (indicator) {
            if (col === activeColumn) {
                indicator.textContent = columnSort[col] === 'asc' ? ' ↑' : ' ↓';
                indicator.style.color = 'var(--blue)';
            } else {
                indicator.textContent = '';
            }
        }
    });
}

// ──────────────────────────────────────────────────────────────
// Advanced Filtering & Sorting Logic
// ──────────────────────────────────────────────────────────────

/**
 * Enhanced filter and display blood requests with multiple filter options
 */
function filterRequests(filter, btn) {
    currentFilter = filter;
    
    // Get search query
    const q = (document.getElementById('req-search')?.value || '').toLowerCase();
    
    // Get advanced filter values
    const bloodType = document.getElementById('filter-blood-type')?.value || '';
    const component = document.getElementById('filter-component')?.value || '';
    const urgency = document.getElementById('filter-urgency')?.value || '';
    const category = document.getElementById('filter-category')?.value || '';
    const unitsRange = document.getElementById('filter-units')?.value || '';
    const dateRange = document.getElementById('filter-date-range')?.value || '';
    
    // Update button styles
    document.querySelectorAll('.req-filter').forEach(b => {
        b.style.color = 'var(--muted)';
        b.style.borderBottom = '2px solid transparent';
        b.style.fontWeight = '600';
        b.classList.remove('active-filter');
    });
    
    if (btn) {
        btn.style.color = 'var(--red)';
        btn.style.borderBottom = '2px solid var(--red)';
        btn.style.fontWeight = '700';
        btn.classList.add('active-filter');
    }
    
    // Apply status filter
    let list = REQUESTS.filter(r => {
        if (filter === 'ACTIVE') return ['PENDING','APPROVED','ALLOCATED','READY_FOR_RELEASE'].includes(r.status);
        if (filter === 'RELEASED') return r.status === 'RELEASED';
        if (filter === 'REJECTED') return ['REJECTED','CANCELLED'].includes(r.status);
        return true;
    });
    
    // Apply search filter
    if (q) {
        list = list.filter(r =>
            r.patientName.toLowerCase().includes(q) ||
            r.referenceNumber.toLowerCase().includes(q)
        );
    }
    
    // Apply blood type filter
    if (bloodType) {
        list = list.filter(r => r.bloodType === bloodType);
    }
    
    // Apply component filter
    if (component) {
        list = list.filter(r => r.bloodComponent === component);
    }
    
    // Apply urgency filter
    if (urgency) {
        list = list.filter(r => r.urgencyLevel === urgency);
    }
    
    // Apply category filter
    if (category) {
        list = list.filter(r => r.requestCategory === category);
    }
    
    // Apply units range filter
    if (unitsRange) {
        list = list.filter(r => {
            const units = r.numberOfUnits;
            switch(unitsRange) {
                case '1-2': return units >= 1 && units <= 2;
                case '3-5': return units >= 3 && units <= 5;
                case '6-10': return units >= 6 && units <= 10;
                case '11+': return units >= 11;
                default: return true;
            }
        });
    }
    
    // Apply date range filter
    if (dateRange) {
        const now = new Date();
        let filterDate;
        
        switch(dateRange) {
            case 'today':
                filterDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                break;
            case 'week':
                filterDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case 'month':
                filterDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '3months':
                filterDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
        }
        
        if (filterDate) {
            list = list.filter(r => {
                const rDate = new Date(r.requestedAt);
                return rDate >= filterDate;
            });
        }
    }
    
    // Apply sorting
    list = sortRequests(list, currentSort);
    
    // Update count
    document.getElementById('req-count').textContent = list.length + ' total';
    
    // Update statistics
    updateRequestStats(list);
    
    // Render table
    const tbody = document.getElementById('requests-tbody');
    const empty = document.getElementById('req-empty');
    
    if (!list.length) {
        tbody.innerHTML = '';
        empty.style.display = 'block';
        return;
    }
    
    empty.style.display = 'none';
    tbody.innerHTML = list.map(r => {
        const sc = STATUS_CFG[r.status];
        const urg = URGENCY_BADGE[r.urgencyLevel];
        return `<tr>
            <td style="font-family:'DM Mono',monospace;font-size:11px;color:var(--muted)">${r.referenceNumber}</td>
            <td>
                <div style="font-weight:600">${r.patientName}</div>
                <div style="font-size:11px;color:var(--muted)">${CAT_LABELS[r.requestCategory]} · ${r.ageGroup}</div>
            </td>
            <td>${COMP_LABELS[r.bloodComponent]}</td>
            <td><span style="font-family:'Playfair Display',serif;font-size:14px;font-weight:900">${BT_LABELS[r.bloodType]}</span></td>
            <td style="font-weight:700">${r.numberOfUnits}</td>
            <td><span class="badge ${urg}">${URGENCY_LABELS[r.urgencyLevel]}</span></td>
            <td><span class="badge badge-${r.status.toLowerCase().replace(/_/g, '-')}">${sc.icon} ${sc.label}</span></td>
            <td style="font-size:12px;color:var(--muted)">${formatDate(r.requestedAt)}</td>
            <td>
                <div style="display:flex;gap:6px">
                    <button class="btn-ghost" style="font-size:11px;padding:5px 10px" onclick="openRequestDetail(${r.id})">View</button>
                    ${r.doctorsNoteUrl ? `<button class="btn-ghost" style="font-size:11px;padding:5px 10px" onclick="window.reqViewDoc('${r.doctorsNoteUrl}', 'Doctor\\'s Note - ${r.referenceNumber}')">📄 Doc</button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');
}

/**
 * Sort requests based on selected sort criteria
 */
function sortRequests(list, sortType) {
    const sorted = [...list];
    
    switch(sortType) {
        case 'recent':
            return sorted.sort((a, b) => new Date(b.requestedAt) - new Date(a.requestedAt));
        
        case 'oldest':
            return sorted.sort((a, b) => new Date(a.requestedAt) - new Date(b.requestedAt));
        
        case 'urgent':
            const urgencyOrder = { 'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3 };
            return sorted.sort((a, b) => 
                (urgencyOrder[a.urgencyLevel] || 4) - (urgencyOrder[b.urgencyLevel] || 4)
            );
        
        case 'patient':
        case 'patient-asc':
            return sorted.sort((a, b) => a.patientName.localeCompare(b.patientName));
        
        case 'patient-desc':
            return sorted.sort((a, b) => b.patientName.localeCompare(a.patientName));
        
        case 'status-pending':
            const statusOrder = { 'PENDING': 0, 'APPROVED': 1, 'ALLOCATED': 2, 'READY_FOR_RELEASE': 3, 'RELEASED': 4, 'REJECTED': 5, 'CANCELLED': 6 };
            return sorted.sort((a, b) => 
                (statusOrder[a.status] || 7) - (statusOrder[b.status] || 7)
            );
        
        case 'units':
        case 'units-asc':
            return sorted.sort((a, b) => a.numberOfUnits - b.numberOfUnits);
        
        case 'units-desc':
            return sorted.sort((a, b) => b.numberOfUnits - a.numberOfUnits);
        
        case 'recent-desc':
        case 'date-desc':
            return sorted.sort((a, b) => new Date(a.requestedAt) - new Date(b.requestedAt));
        
        default:
            return sorted;
    }
}

/**
 * Update quick statistics display
 */
function updateRequestStats(list) {
    const statsRow = document.getElementById('req-stats');
    
    // Count statistics
    const pending = list.filter(r => r.status === 'PENDING').length;
    const critical = list.filter(r => r.urgencyLevel === 'CRITICAL').length;
    const released = list.filter(r => r.status === 'RELEASED').length;
    const totalUnits = list.reduce((sum, r) => sum + r.numberOfUnits, 0);
    
    // Update stats
    document.getElementById('stat-pending').textContent = pending;
    document.getElementById('stat-critical').textContent = critical;
    document.getElementById('stat-released').textContent = released;
    document.getElementById('stat-units').textContent = totalUnits;
    
    // Show stats if there are results
    if (list.length > 0) {
        statsRow.style.display = 'grid';
    } else {
        statsRow.style.display = 'none';
    }
}

// ══════════════════════════════════════════════════════════════
// REQUEST DETAIL MODAL — ENHANCED WITH ALL SECTIONS
// ══════════════════════════════════════════════════════════════

/**
 * Open request detail modal with comprehensive data population
 * Maps all request data to modal fields including:
 * - Request Status
 * - Patient Information
 * - Blood Requirements
 * - Transfusion Indications (with INDICATION_MAP)
 * - Clinical Information
 * - Transfusion History
 * - Reaction History
 * - Requester Information
 */
function openRequestDetail(id) {
    const r = REQUESTS.find(x => x.id === id);
    if (!r) return;
    
    const sc = STATUS_CFG[r.status];
    const urg = URGENCY_LABELS[r.urgencyLevel];
    
    // ─────────────────────────────────────────────
    // HEADER & STATUS STRIP
    // ─────────────────────────────────────────────
    document.getElementById('rd-ref').textContent = r.referenceNumber;
    
    const strip = document.getElementById('rd-status-strip');
    strip.style.background = sc.bg;
    document.getElementById('rd-status-icon').textContent = sc.icon;
    document.getElementById('rd-status-label').style.color = sc.color;
    document.getElementById('rd-status-label').textContent = 'Status';
    document.getElementById('rd-status-text').style.color = sc.color;
    document.getElementById('rd-status-text').textContent = sc.label;
    document.getElementById('rd-status-sub').style.color = sc.color;
    document.getElementById('rd-status-sub').textContent = sc.sub || '';
    document.getElementById('rd-blood-ghost').textContent = BT_LABELS[r.bloodType];
    document.getElementById('rd-blood-ghost').style.color = sc.color;
    
    // ─────────────────────────────────────────────
    // SECTION: REQUEST STATUS
    // ─────────────────────────────────────────────
    document.getElementById('rd-blood').textContent = BT_LABELS[r.bloodType];
    document.getElementById('rd-urgency').innerHTML = `<span class="badge ${URGENCY_BADGE[r.urgencyLevel]}">${urg}</span>`;
    document.getElementById('rd-status-badge').innerHTML = `<span class="badge badge-${r.status.toLowerCase().replace(/_/g, '-')}">${sc.icon} ${sc.label}</span>`;
    document.getElementById('rd-request-type').textContent = r.requestType || '—';
    document.getElementById('rd-submitted-date').textContent = formatDate(r.requestedAt) || '—';
    document.getElementById('rd-required').textContent = r.requiredBy ? formatDate(r.requiredBy) : 'As soon as possible';
    
    // ─────────────────────────────────────────────
    // SECTION: PATIENT INFORMATION
    // ─────────────────────────────────────────────
    document.getElementById('rd-patient').textContent = r.patientName || '—';
    document.getElementById('rd-patient-age').textContent = 
        (r.patientAge || '—') + (r.ageGroup ? ` (${r.ageGroup})` : '');
    document.getElementById('rd-patient-sex').textContent = r.patientSex || '—';
    document.getElementById('rd-ward-room').textContent = r.wardRoom || '—';
    document.getElementById('rd-cat').textContent = r.requestCategory || '—';
    document.getElementById('rd-physician').textContent = r.requestingPhysician || '—';
    
    // ─────────────────────────────────────────────
    // SECTION: BLOOD REQUIREMENTS
    // ─────────────────────────────────────────────
    document.getElementById('rd-comp').textContent = COMP_LABELS[r.bloodComponent] || r.bloodComponent || '—';
    document.getElementById('rd-units').textContent = r.numberOfUnits ? `${r.numberOfUnits} unit(s)` : '—';
    document.getElementById('rd-volume').textContent = r.volumeMl ? `${r.volumeMl} mL` : '—';
    document.getElementById('rd-notes').textContent = r.notes || '—';
    
    // ─────────────────────────────────────────────
    // SECTION: TRANSFUSION INDICATIONS
    // ─────────────────────────────────────────────
    const indicationsSection = document.getElementById('rd-indications-section');
    if (r.indication) {
        const indCodes = r.indication.split(',').map(c => c.trim()).filter(c => c);
        if (indCodes.length > 0) {
            indicationsSection.style.display = 'block';
            
            
            // Build indication details with grouped hierarchy
            document.getElementById('rd-indication-details').innerHTML = renderIndicationDetails(r.indication);
        } else {
            indicationsSection.style.display = 'none';
        }
    } else {
        indicationsSection.style.display = 'none';
    }
    
    // ─────────────────────────────────────────────
    // SECTION: CLINICAL INFORMATION
    // ─────────────────────────────────────────────
    document.getElementById('rd-clinical-impression').textContent = r.clinicalImpression || '—';
    document.getElementById('rd-attending-physician').textContent = r.attendingPhysician || '—';
    document.getElementById('rd-contact-number').textContent = r.contactNumber || '—';
    document.getElementById('rd-hemoglobin').textContent = r.hemoglobin ? `${r.hemoglobin} g/L` : '—';
    document.getElementById('rd-hematocrit').textContent = r.hematocrit 
        ? `${(r.hematocrit * 100).toFixed(1)}%` 
        : '—';
    
    // ─────────────────────────────────────────────
    // SECTION: TRANSFUSION HISTORY
    // ─────────────────────────────────────────────
    const hasPrevTransfusion = r.hadPreviousTransfusion === true;
    document.getElementById('rd-previous-transfusion').textContent = hasPrevTransfusion ? 'Yes' : 'No';
    
    const transfusionDateBox = document.getElementById('rd-transfusion-date-box');
    const transfusionUnitsBox = document.getElementById('rd-transfusion-units-box');
    
    if (hasPrevTransfusion) {
        transfusionDateBox.style.display = 'block';
        transfusionUnitsBox.style.display = 'block';
        document.getElementById('rd-transfusion-date').textContent = 
            r.previousTransfusionDate ? formatDate(r.previousTransfusionDate) : '—';
        document.getElementById('rd-transfusion-units').textContent = 
            r.previousTransfusionUnits ? `${r.previousTransfusionUnits} unit(s)` : '—';
    } else {
        transfusionDateBox.style.display = 'none';
        transfusionUnitsBox.style.display = 'none';
    }
    
    // ─────────────────────────────────────────────
    // SECTION: REACTION HISTORY
    // ─────────────────────────────────────────────
    const hasPrevReaction = r.hadPreviousReaction === true;
    document.getElementById('rd-previous-reaction').textContent = hasPrevReaction ? 'Yes' : 'No';
    
    const reactionDateBox = document.getElementById('rd-reaction-date-box');
    const reactionDetailsBox = document.getElementById('rd-reaction-details-box');
    
    if (hasPrevReaction) {
        reactionDateBox.style.display = 'block';
        reactionDetailsBox.style.display = 'block';
        document.getElementById('rd-reaction-date').textContent = 
            r.previousReactionDate ? formatDate(r.previousReactionDate) : '—';
        document.getElementById('rd-reaction-details').textContent = 
            r.previousReactionDetails || '—';
    } else {
        reactionDateBox.style.display = 'none';
        reactionDetailsBox.style.display = 'none';
    }
    
    // ─────────────────────────────────────────────
    // SECTION: REQUESTER INFORMATION
    // ─────────────────────────────────────────────
    document.getElementById('rd-requester-name').textContent = r.requesterName || '—';
    document.getElementById('rd-requester-relationship').textContent = r.requesterRelationship || '—';
    document.getElementById('rd-requester-contact').textContent = r.requesterContact || '—';
    document.getElementById('rd-requester-email').textContent = r.requesterEmail || '—';
    document.getElementById('rd-requester-type').textContent = r.requesterType || '—';
    
    // ─────────────────────────────────────────────
    // REJECTION REASON (if applicable)
    // ─────────────────────────────────────────────
    const rejBox = document.getElementById('rd-rejection-box');
    if (r.rejectionReason && r.status === 'REJECTED') {
        rejBox.style.display = 'block';
        document.getElementById('rd-rejection-text').textContent = r.rejectionReason;
    } else {
        rejBox.style.display = 'none';
    }
    
    // ─────────────────────────────────────────────
    // FULFILLED BY BAG (if applicable)
    // ─────────────────────────────────────────────
    const fulBox = document.getElementById('rd-fulfilled-box');
    if (r.fulfilledByBag && r.status === 'RELEASED') {
        fulBox.style.display = 'block';
        document.getElementById('rd-bag-id').textContent = r.fulfilledByBag.id || '—';
        document.getElementById('rd-released-at').textContent = 
            r.fulfilledByBag.dispensedAt ? formatDate(r.fulfilledByBag.dispensedAt) : '—';
    } else {
        fulBox.style.display = 'none';
    }
    
    // ─────────────────────────────────────────────
    // DOCTOR'S NOTE / REQUEST DOCUMENT
    // ─────────────────────────────────────────────
    const docBox = document.getElementById('rd-doc-box');
    const docBtn = document.getElementById('rd-view-doc-btn');
    if (r.doctorsNoteUrl) {
        docBox.style.display = 'block';
        docBtn.onclick = () => {
            window.reqViewDoc(r.doctorsNoteUrl, `Request Form - ${r.referenceNumber}`);
        };
    } else {
        docBox.style.display = 'none';
    }
    
    // ─────────────────────────────────────────────
    // CANCEL BUTTON (only for PENDING status)
    // ─────────────────────────────────────────────
    const cancelRow = document.getElementById('rd-cancel-row');
    if (r.status === 'PENDING') {
        cancelRow.style.display = 'block';
        document.getElementById('rd-cancel-btn').onclick = () => {
            cancelTargetId = r.id;
            closeModal('requestDetailModal');
            openModal('cancelConfirmModal');
        };
    } else {
        cancelRow.style.display = 'none';
    }
    
    // Open the modal
    openModal('requestDetailModal');
}

/**
 * Confirm request cancellation
 */
function confirmCancel() {
    const r = REQUESTS.find(x => x.id === cancelTargetId);
    if (r) r.status = 'CANCELLED';
    closeModal('cancelConfirmModal');
    filterRequests(currentFilter, document.querySelector('.active-filter'));
    renderDashboard();
}

// ──────────────────────────────────────────────────────────────
// Document Viewer
// ──────────────────────────────────────────────────────────────

/**
 * View request document (PDF or image) in modal
 */
window.reqViewDoc = function (url, label) {
    if (!url) {
        alert('No document uploaded for this request.');
        return;
    }
    
    const docLabel = document.getElementById('req-doc-label');
    const docFrame = document.getElementById('req-doc-frame');
    
    if (!docLabel || !docFrame) return;
    
    docLabel.textContent = label;
    
    const isPdf = url.toLowerCase().includes('.pdf');
    const googleViewer = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    
    if (isPdf) {
        docFrame.innerHTML = `<iframe src="${googleViewer}" style="width:100%;height:520px;border:none;border-radius:10px;display:block" title="${label}"></iframe>`;
    } else {
        docFrame.innerHTML = `<img src="${url}" 
            style="width:100%;border-radius:10px;display:block;max-height:520px;object-fit:contain" 
            alt="${label}"
            onerror="this.parentElement.innerHTML='<div style=\\'padding:40px;text-align:center;color:var(--muted);font-size:13px\\'>Preview unavailable — <a href=\\'${url}\\' target=\\'_blank\\' style=\\'color:var(--blue)\\'>open directly ↗</a></div>'" />`;
    }
    
    openModal('req-doc-modal');
};

// ──────────────────────────────────────────────────────────────
// HELPER: Format dates
// ──────────────────────────────────────────────────────────────

/**
 * Format date for display
 * Expected format: "Mar 15, 2026" or similar
 */

// ═══════════════════════════════════════════════════════════════
// ░░░ 4️⃣ HOSPITAL PROFILE TAB ░░░
// ═══════════════════════════════════════════════════════════════

let currentProfileData = null;



function loadProfileDataWhenShown() {
    // This will be called when profile panel becomes active
    if (document.getElementById('panel-profile').classList.contains('active')) {
        loadHospitalProfile();
    }
}

// Override showPanel to load profile when needed
const originalShowPanel = window.showPanel;
window.showPanel = function(id, navEl) {
    originalShowPanel(id, navEl);
    if (id === 'profile') {
        loadHospitalProfile();
    }
};

/**
 * Fetch hospital profile from backend
 */
async function loadHospitalProfile() {
    try {
        const response = await fetch('/api/hospital/profile', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include'
        });

        if (!response.ok) {
            console.error('Failed to load profile:', response.status);
            showProfileError('Failed to load hospital profile');
            return;
        }

        const data = await response.json();
        currentProfileData = data;
        populateProfileForm(data);

    } catch (error) {
        console.error('Error loading hospital profile:', error);
        showProfileError('Failed to load hospital profile');
    }
}


function populateProfileForm(data) {
    // Hospital name
    document.getElementById('profile-hospital-name').textContent = data.hospitalName || 'Hospital';
    document.getElementById('profile-hospital-name-input').value = data.hospitalName || '';
    
    // Email
    document.getElementById('profile-email').textContent = data.email || '';
    document.getElementById('profile-email-input').value = data.email || '';
    
    // Account type
    document.getElementById('profile-account-type').textContent = 'Registered Hospital Account';
    document.getElementById('profile-account-type-display').textContent = data.accountType || 'HOSPITAL';
    
    // Address
    document.getElementById('profile-address-input').value = data.address || '';
    
    // City
    document.getElementById('profile-city-input').value = data.city || '';
    document.getElementById('profile-location-tag').textContent = `📍 ${data.city || 'City'}, ${data.province || 'Province'}`;
    
    // Province
    document.getElementById('profile-province-input').value = data.province || '';
    
    // Phone
    document.getElementById('profile-phone-input').value = data.phoneNumber || '';
    
    // Contact person
    document.getElementById('profile-contact-name-input').value = data.contactPersonName || '';
    document.getElementById('profile-contact-phone-input').value = data.contactPersonPhone || '';
    
    // Verified status
    if (data.emailVerified) {
        document.getElementById('profile-verified-display').textContent = '✓ Verified';
        document.getElementById('profile-verified-tag').textContent = '✓ Verified';
    } else {
        document.getElementById('profile-verified-display').textContent = '⚠ Pending';
        document.getElementById('profile-verified-tag').textContent = '⚠ Pending';
    }
    
    // Member since
    if (data.createdAt) {
        const date = new Date(data.createdAt);
        const monthName = date.toLocaleDateString('en-US', { month: 'long' });
        const year = date.getFullYear();
        document.getElementById('profile-member-since').textContent = `${monthName} ${year}`;
    }
}

/**
 * Reset form to original data
 */
function resetProfileForm() {
    if (currentProfileData) {
        populateProfileForm(currentProfileData);
    }
}

// ──────────────────────────────────────────────────────────────
// Save Profile Modal & Confirmation
// ──────────────────────────────────────────────────────────────

/**
 * Open save confirmation modal
 */
function openSaveConfirmModal() {
    // Validate required fields
    const hospitalName = document.getElementById('profile-hospital-name-input').value.trim();
    const address = document.getElementById('profile-address-input').value.trim();
    const city = document.getElementById('profile-city-input').value.trim();
    const province = document.getElementById('profile-province-input').value.trim();
    
    if (!hospitalName) {
        showProfileError('Hospital name is required');
        return;
    }
    if (!address) {
        showProfileError('Address is required');
        return;
    }
    if (!city) {
        showProfileError('City is required');
        return;
    }
    if (!province) {
        showProfileError('Province is required');
        return;
    }
    
    openModal('saveProfileConfirmModal');
}

/**
 * Confirm and save profile
 */
async function confirmSaveProfile() {
    closeModal('saveProfileConfirmModal');
    
    const btn = document.getElementById('btn-save-profile');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Saving...';
    
    try {
        const updateData = {
            hospitalName: document.getElementById('profile-hospital-name-input').value.trim(),
            address: document.getElementById('profile-address-input').value.trim(),
            city: document.getElementById('profile-city-input').value.trim(),
            province: document.getElementById('profile-province-input').value.trim(),
            phoneNumber: document.getElementById('profile-phone-input').value.trim(),
            contactPersonName: document.getElementById('profile-contact-name-input').value.trim(),
            contactPersonPhone: document.getElementById('profile-contact-phone-input').value.trim()
        };
        
        const response = await fetch('/api/hospital/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(updateData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to save profile');
        }
        
        const result = await response.json();
        currentProfileData = result.profile;
        populateProfileForm(result.profile);
        
        // Show success modal
        document.getElementById('success-modal-title').textContent = 'Changes Saved!';
        document.getElementById('success-modal-message').textContent = 'Your hospital profile has been updated successfully.';
        openModal('profileSuccessModal');
        
    } catch (error) {
        console.error('Error saving profile:', error);
        showProfileError(error.message || 'Failed to save hospital profile');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}

// ──────────────────────────────────────────────────────────────
// Password Change Modal & Confirmation
// ──────────────────────────────────────────────────────────────

function openPasswordConfirmModal() {
    // Validate password fields
    const currentPassword = document.getElementById('profile-current-password').value;
    const newPassword = document.getElementById('profile-new-password').value;
    const confirmPassword = document.getElementById('profile-confirm-password').value;
    
    if (!currentPassword) {
        showProfileError('Current password is required');
        return;
    }
    if (!newPassword) {
        showProfileError('New password is required');
        return;
    }
    if (newPassword.length < 6) {
        showProfileError('New password must be at least 6 characters');
        return;
    }
    if (!confirmPassword) {
        showProfileError('Please confirm your new password');
        return;
    }
    if (newPassword !== confirmPassword) {
        showProfileError('Passwords do not match');
        return;
    }
    
    openModal('passwordConfirmModal');
}


async function confirmChangePassword() {
    closeModal('passwordConfirmModal');
    
    const btn = document.getElementById('btn-change-password');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Updating...';
    
    try {
        const passwordData = {
            currentPassword: document.getElementById('profile-current-password').value,
            newPassword: document.getElementById('profile-new-password').value,
            confirmPassword: document.getElementById('profile-confirm-password').value
        };
        
        const response = await fetch('/api/hospital/profile/change-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(passwordData)
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to change password');
        }
        
        // Clear password fields
        document.getElementById('profile-current-password').value = '';
        document.getElementById('profile-new-password').value = '';
        document.getElementById('profile-confirm-password').value = '';
        
        // Show success modal
        document.getElementById('success-modal-title').textContent = 'Password Changed!';
        document.getElementById('success-modal-message').textContent = 'Your password has been updated successfully. Please log in again with your new password.';
        openModal('profileSuccessModal');
        
        // Redirect to login after modal close (in real implementation)
        setTimeout(() => {
            closeModal('profileSuccessModal');
            // Optional: redirect to login
            // window.location.href = '/login';
        }, 3000);
        
    } catch (error) {
        console.error('Error changing password:', error);
        showProfileError(error.message || 'Failed to change password');
    } finally {
        btn.disabled = false;
        btn.textContent = originalText;
    }
}


function showProfileError(message) {
    document.getElementById('error-modal-message').textContent = message || 'An error occurred';
    openModal('profileErrorModal');
}



// ──────────────────────────────────────────────────────────────
// Initialize on DOM Ready
// ──────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
    // Setup modal close on backdrop click for profile modals
    document.querySelectorAll('.modal-overlay').forEach(o => {
        o.addEventListener('click', e => {
            if (e.target === o) o.classList.remove('show');
        });
    });
});



/**
 * Logout user
 */
async function logout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    if (response.ok) {
      window.location.href = "blood-request.html";
    }
  } catch (error) {
    console.error("Logout error:", error);
    window.location.href = "blood-request.html";
  }
}


// ═══════════════════════════════════════════════════════════════
// ░░░ INITIALIZATION ░░░
// ═══════════════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
  // Set dashboard date
  const dashDate = document.getElementById('dash-date');
  if (dashDate) {
    dashDate.textContent = new Date().toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  // Set minimum date for blood request form
  const reqDateNeeded = document.getElementById('req-date-needed');
  if (reqDateNeeded) {
    reqDateNeeded.min = new Date().toISOString().slice(0, 10);
  }

  // Initialize step UI
  updateStepUI();

  // Load requests from backend
  loadHospitalRequests();

  // Setup modal close on backdrop click
  document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => {
      if (e.target === o) o.classList.remove('show');
    });
  });

  // Setup mobile sidebar
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', () => {
      if (window.innerWidth <= 768) closeSidebar();
    });
  });

  window.addEventListener('resize', () => {
    if (window.innerWidth > 768) closeSidebar();
  });

  // Start auto-refresh
  startAutoRefresh();
  
  // Stop auto-refresh when user leaves (optional)
  window.addEventListener('beforeunload', stopAutoRefresh);
});

// ═══════════════════════════════════════════════════════════════
// ░░░ AUTO-REFRESH ░░░
// ═══════════════════════════════════════════════════════════════

let autoRefreshInterval = null;

/**
 * Start auto-refresh of blood requests and dashboard
 * Refreshes every 30 seconds
 */
function startAutoRefresh() {
  autoRefreshInterval = setInterval(() => {
    loadHospitalRequests();
    loadBloodBankAvailability();
  }, 5000); // 30 seconds
}

/**
 * Stop auto-refresh
 */
function stopAutoRefresh() {
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval);
    autoRefreshInterval = null;
  }
}

/**
 * Manual refresh trigger with visual feedback
 */
function refreshDashboard() {
  const btn = document.querySelector('[onclick="refreshDashboard()"]');
  if (btn) {
    btn.disabled = true;
    btn.style.opacity = '0.6';
    btn.style.animation = 'spin 1s linear';
  }
  
  Promise.all([
    loadHospitalRequests(),
    loadBloodBankAvailability()
  ]).then(() => {
    if (btn) {
      btn.disabled = false;
      btn.style.opacity = '1';
      btn.style.animation = 'none';
    }
  });
}