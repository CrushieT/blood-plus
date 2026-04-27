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
let docFile = null;
let currentStep = 1;
const TOTAL_STEPS = 4;

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
  const lastUpdatedEl = document.getElementById('bloodbank-last-updated');
  if (lastUpdatedEl && bloodBankAvailability.lastUpdated) {
    const timestamp = new Date(bloodBankAvailability.lastUpdated);
    const now = new Date();
    const diffMs = now - timestamp;
    const diffMins = Math.floor(diffMs / 60000);

    let timeStr = 'Just now';
    if (diffMins > 0) {
      timeStr = diffMins === 1 ? '1 minute ago' : `${diffMins} minutes ago`;
    }
    lastUpdatedEl.textContent = timeStr;
  }
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
// ░░░ 2️⃣ NEW BLOOD REQUEST TAB ░░░
// ═══════════════════════════════════════════════════════════════


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
 * Validate Step 3: Supporting Documents
 */
function validateStep3() {
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

  const errBanners = ['err-category','err-bt','err-comp','err-urgency'];
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

  const docFile = document.getElementById('doc-file')?.files[0];
  if (!docFile) {
    const el = document.getElementById('err-submit-msg');
    if (el) el.textContent = 'Please upload Doctor\'s Blood Request Form.';
    ok = false;
  }

  const errSubmit = document.getElementById('err-submit');
  if (errSubmit) errSubmit.classList.toggle('show', !ok);
  
  return ok;
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

  if (key === 'doc') docFile = file;

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
  if (key === 'doc') docFile = null;
  
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
 * Submit new blood request to backend
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
    const bloodType = document.querySelector('input[name="req-bt"]:checked')?.value;
    const bloodComponent = document.querySelector('input[name="req-comp"]:checked')?.value;
    const requestCategory = document.querySelector('input[name="req-category"]:checked')?.value;
    const urgencyLevel = document.querySelector('input[name="req-urgency"]:checked')?.value;
    const ageGroup = document.querySelector('input[name="req-agegroup"]:checked')?.value || 'ADULT';
    const patientSex = document.querySelector('input[name="pat-sex"]:checked')?.value;

    const requestDTO = {
      patientName: (
        document.getElementById('pat-lastname').value.trim() + ', ' +
        document.getElementById('pat-firstname').value.trim()
      ),
      patientAge: parseInt(document.getElementById('pat-age').value, 10),
      patientSex: patientSex,
      wardRoom: document.getElementById('pat-ward')?.value.trim() || '',
      requestingPhysician: document.getElementById('pat-physician').value.trim(),
      ageGroup: ageGroup,
      requestCategory: requestCategory,
      bloodType: bloodType,
      bloodComponent: bloodComponent,
      numberOfUnits: parseInt(document.getElementById('req-units').value, 10),
      urgencyLevel: urgencyLevel,
      requiredBy: document.getElementById('req-date-needed')?.value || null,
      notes: document.getElementById('req-notes')?.value.trim() || ''
    };

    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(requestDTO)], { type: 'application/json' }));

    const docFileInput = document.getElementById('doc-file');
    if (docFileInput && docFileInput.files.length > 0) {
      formData.append('doctorsNote', docFileInput.files[0]);
    }

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
 * Reset new request form to initial state
 */
function resetNewRequestForm() {
  document.querySelectorAll('#panel-newrequest input[type=text], #panel-newrequest input[type=number], #panel-newrequest input[type=date], #panel-newrequest textarea')
    .forEach(el => el.value = '');
  document.querySelectorAll('#panel-newrequest input[type=radio]').forEach(el => el.checked = false);
  clearFile('doc');
  clearFile('ref');
  ['err-category','err-bt','err-comp','err-urgency','err-agegroup'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
  const el = document.getElementById('err-submit');
  if (el) el.classList.remove('show');
  
  currentStep = 1;
  updateStepUI();
}


// ═══════════════════════════════════════════════════════════════
// ░░░ 3️⃣ MY REQUESTS TAB - ENHANCED FILTERING & SORTING ░░░
// ═══════════════════════════════════════════════════════════════

// Global state for sorting
let currentSort = 'recent';
let columnSort = {}; // Track column sort states

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
        const reqDate = new Date(today);
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

// ──────────────────────────────────────────────────────────────
// Request Detail Modal (Original Functions)
// ──────────────────────────────────────────────────────────────

/**
 * Open request detail modal with populated data
 */
function openRequestDetail(id) {
    const r = REQUESTS.find(x => x.id === id);
    if (!r) return;
    const sc = STATUS_CFG[r.status];
    const urg = URGENCY_LABELS[r.urgencyLevel];
    
    document.getElementById('rd-ref').textContent = r.referenceNumber;
    
    // Status strip
    const strip = document.getElementById('rd-status-strip');
    strip.style.background = sc.bg;
    document.getElementById('rd-status-icon').textContent = sc.icon;
    document.getElementById('rd-status-label').style.color = sc.color;
    document.getElementById('rd-status-label').textContent = 'Status';
    document.getElementById('rd-status-text').style.color = sc.color;
    document.getElementById('rd-status-text').textContent = sc.label;
    document.getElementById('rd-status-sub').style.color = sc.color;
    document.getElementById('rd-status-sub').textContent = sc.sub;
    document.getElementById('rd-blood-ghost').textContent = BT_LABELS[r.bloodType];
    document.getElementById('rd-blood-ghost').style.color = sc.color;
    
    // Fields
    document.getElementById('rd-blood').textContent = BT_LABELS[r.bloodType];
    document.getElementById('rd-comp').textContent = COMP_LABELS[r.bloodComponent];
    document.getElementById('rd-units').textContent = r.numberOfUnits + ' unit(s)';
    document.getElementById('rd-urgency').innerHTML = `<span class="badge ${URGENCY_BADGE[r.urgencyLevel]}">${urg}</span>`;
    document.getElementById('rd-patient').textContent = r.patientName + ' · ' + r.patientAge + ' yrs / ' + r.patientSex;
    document.getElementById('rd-cat').textContent = CAT_LABELS[r.requestCategory] + ' · ' + r.ageGroup;
    document.getElementById('rd-physician').textContent = r.requestingPhysician;
    document.getElementById('rd-required').textContent = r.requiredBy ? formatDate(r.requiredBy) : 'As soon as possible';
    
    // Rejection
    const rejBox = document.getElementById('rd-rejection-box');
    if (rejBox) {
        if (r.rejectionReason) {
            rejBox.style.display = 'block';
            document.getElementById('rd-rejection-text').textContent = r.rejectionReason;
        } else {
            rejBox.style.display = 'none';
        }
    }
    
    // Fulfilled
    const fulBox = document.getElementById('rd-fulfilled-box');
    if (fulBox) {
        if (r.fulfilledByBag) {
            fulBox.style.display = 'block';
            document.getElementById('rd-bag-id').textContent = r.fulfilledByBag.id;
            document.getElementById('rd-released-at').textContent = formatDate(r.fulfilledByBag.dispensedAt);
        } else {
            fulBox.style.display = 'none';
        }
    }
    
    // Doctor's Note
    const docBox = document.getElementById('rd-doc-box');
    const docBtn = document.getElementById('rd-view-doc-btn');
    if (docBox && docBtn) {
        if (r.doctorsNoteUrl) {
            docBox.style.display = 'block';
            docBtn.onclick = () => {
                window.reqViewDoc(r.doctorsNoteUrl, 'Request\'s Form - ' + r.referenceNumber);
            };
        } else {
            docBox.style.display = 'none';
        }
    }
    
    // Cancel
    const cancelRow = document.getElementById('rd-cancel-row');
    cancelRow.style.display = r.status === 'PENDING' ? 'block' : 'none';
    document.getElementById('rd-cancel-btn').onclick = () => {
        cancelTargetId = r.id;
        closeModal('requestDetailModal');
        openModal('cancelConfirmModal');
    };
    
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


// openModal(id) and closeModal(id) should already exist in hospital-dashboard.js
// If not, add these:
/*
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('show');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('show');
}
*/

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


// ═══════════════════════════════════════════════════════════════
// ░░░ BACKEND INTEGRATION ░░░
// ═══════════════════════════════════════════════════════════════


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
      urgencyLevel: req.urgencyLevel,
      status: req.status,
      requestedAt: req.requestedAt ? req.requestedAt.split('T')[0] : new Date().toISOString().split('T')[0],
      requiredBy: req.requiredBy,
      notes: req.notes || '',
      doctorsNoteUrl: req.doctorsNoteUrl || null,
      doctorsNoteKey: req.doctorsNoteKey || null,
      rejectionReason: req.rejectionReason || null,
      reviewedAt: req.reviewedAt,
      fulfilledByBag: null
    }));
    
    // Re-render with fetched data
    renderDashboard();
    filterRequests(currentFilter, document.querySelector('.active-filter'));

  } catch (error) {
    console.error('Error loading hospital requests:', error);
  }
}

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
});