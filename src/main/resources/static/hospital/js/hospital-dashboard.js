//====================================
// BLOODPLUS HOSPITAL DASHBOARD
// Updated with Blood Bank Availability
//====================================

// ---------------------------------------------------------------
// --- GLOBAL CONFIG & STATE ---
// ---------------------------------------------------------------

const BT_LABELS = { O_NEG:'O-',O_POS:'O+',A_NEG:'A-',A_POS:'A+',B_NEG:'B-',B_POS:'B+',AB_NEG:'AB-',AB_POS:'AB+' };
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
const URGENCY_LABELS = {
  LOW: 'Low',
  MEDIUM: 'Medium',
  HIGH: 'High',
  CRITICAL: 'Critical'
};
const CAT_LABELS = {
  INPATIENT: 'OPD/ INHOUSE',
  OUTPATIENT: 'OPD',
  HOSPITAL: 'Inter-hospital',
  EMERGENCY: 'Emergency'
};
const SPECIFY_ONLY_INDICATION_COMPONENTS = {
  LEUKOREDUCED_PRBC: 'LEUKOREDUCED_PRBC_SPECIFY',
  ALIQUOTED_PRBC: 'ALIQUOTED_PRBC_SPECIFY',
  CRYOSUPERNATANT: 'CRYOSUPERNATANT_SPECIFY'
};
const INDICATION_REQUIRED_COMPONENTS_HOSP = [
  'WHOLE_BLOOD',
  'PRBC',
  'PLATELET_CONCENTRATE',
  'FRESH_FROZEN_PLASMA',
  'CRYOPRECIPITATE'
];

const STATUS_CFG = {
  PENDING:          { label:'Pending Review',    icon:'', bg:'#FFF8E0', color:'#B35C00', sub:'Waiting for blood bank review' },
  APPROVED:         { label:'Approved',          icon:'', bg:'#E8F7EE', color:'#2E7D4F', sub:'Request has been approved' },
  NEEDS_CONFIRMATION:{ label:'Waiting for requester confirmation', icon:'?', bg:'#FFF4E5', color:'#9A5B13', sub:'Waiting for requester email confirmation' },
  ALLOCATED:        { label:'Allocated',         icon:'', bg:'#EEF3FF', color:'#2244AA', sub:'Blood bag has been allocated' },
  READY_FOR_RELEASE:{ label:'Ready for Release', icon:'', bg:'#EEEDFE', color:'#3C3489', sub:'Ready for pickup / transport' },
  RELEASED:         { label:'Released',          icon:'', bg:'#E8F7EE', color:'#2E7D4F', sub:'Blood has been released' },
  REJECTED:         { label:'Rejected',          icon:'', bg:'#FFF0F1', color:'#C41E3A', sub:'Request was not approved' },
  CANCELLED:        { label:'Cancelled',         icon:'',  bg:'#F0F0F0',            color:'#888',          sub:'Cancelled by hospital' },
};

const URGENCY_BADGE = { LOW: 'Low', MEDIUM: 'Medium', HIGH: 'High', CRITICAL: 'Critical' };

// Global State
let REQUESTS = [];
let currentFilter = 'ALL';
let cancelTargetId = null;

function formatCategoryLabelHosp(category) {
  return CAT_LABELS[category] || category || '-';
}

function formatUrgencyLabelHosp(urgency) {
  return URGENCY_LABELS[urgency] || urgency || '-';
}

function getFieldValueHosp(selectId, radioName) {
  const select = document.getElementById(selectId);
  if (select) return select.value || null;
  return document.querySelector(`input[name="${radioName}"]:checked`)?.value || null;
}

function getSpecifyOnlyIndicationValueHosp(component) {
  const input = document.getElementById(`req-indication-specify-${component}-hosp`);
  return input ? input.value.trim() : '';
}

function togglePlateletCountFieldHosp(component) {
  const field = document.getElementById('platelet-count-field-hosp');
  const input = document.getElementById('req-platelet-count-hosp');
  if (!field || !input) return;

  if (component === 'PLATELET_CONCENTRATE') {
    field.style.display = 'block';
  } else {
    field.style.display = 'none';
    input.value = '';
  }
}

// Blood Bank Availability Cache
let bloodBankAvailability = {
  bloodTypes: {},
  components: {},
  lastUpdated: null
};


// ---------------------------------------------------------------
// --- UTILITY FUNCTIONS ---
// ---------------------------------------------------------------

function formatDate(d) {
  if (!d) return '-';
  const dateStr = d.includes('T') ? d : d + 'T00:00:00';
  return new Date(dateStr)
    .toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
}

function getEffectiveUnitsHosp(request) {
  if (request?.patientAcceptedRemarks === true && Number.isInteger(request.approvedUnits) && request.approvedUnits > 0) {
    return request.approvedUnits;
  }
  return request?.numberOfUnits || 0;
}

function formatUnitsDisplayHosp(request) {
  const requestedUnits = request?.numberOfUnits || 0;
  const effectiveUnits = getEffectiveUnitsHosp(request);
  if (Number.isInteger(request?.approvedUnits) && request.approvedUnits > 0 && request.approvedUnits !== requestedUnits) {
    return `${effectiveUnits} of ${requestedUnits}`;
  }
  return `${effectiveUnits}`;
}

function formatBloodTypeDisplayHosp(bloodType) {
  const map = {
    A_POS: 'A Pos',
    A_NEG: 'A Neg',
    B_POS: 'B Pos',
    B_NEG: 'B Neg',
    AB_POS: 'AB Pos',
    AB_NEG: 'AB Neg',
    O_POS: 'O Pos',
    O_NEG: 'O Neg'
  };
  return map[bloodType] || bloodType || '-';
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
    // hideStepErrorBanner();
  }
}


// ---------------------------------------------------------------
// --- 1?? DASHBOARD TAB ---
// ---------------------------------------------------------------

/**
 * Render dashboard with statistics and recent requests
 */
function renderDashboard() {
  const pending  = REQUESTS.filter(r => ['PENDING','APPROVED','NEEDS_CONFIRMATION','ALLOCATED','READY_FOR_RELEASE'].includes(r.status)).length;
  const released = REQUESTS.filter(r => r.status === 'RELEASED').length;
  const total    = REQUESTS.length;
  const units    = REQUESTS.filter(r => r.status === 'RELEASED').reduce((s, r) => s + getEffectiveUnitsHosp(r), 0);

  document.getElementById('dash-stat-pending').textContent  = pending;
  document.getElementById('dash-stat-released').textContent = released;
  document.getElementById('dash-stat-total').textContent    = total;
  document.getElementById('dash-stat-units').textContent    = units;
  document.getElementById('prof-total').textContent = total;

  // Recent requests table
  const tbody = document.getElementById('dash-recent-tbody');
  const recent = [...REQUESTS].sort((a,b) => new Date(b.requestedAt) - new Date(a.requestedAt)).slice(0,5);
  tbody.innerHTML = recent.map(r => {
    const sc = STATUS_CFG[r.status];
    return `<tr>
      <td style="font-size:14px;font-weight:600;color:var(--charcoal)">${r.referenceNumber}</td>
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
    'O-': 'blood-o-neg-status',
    'A+': 'blood-a-pos-status',
    'A-': 'blood-a-neg-status',
    'B+': 'blood-b-pos-status',
    'B-': 'blood-b-neg-status',
    'AB+': 'blood-ab-pos-status',
    'AB-': 'blood-ab-neg-status'
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
    'platelet-concentrate': 'comp-platelet-concentrate',
    'fresh-frozen-plasma': 'comp-fresh-frozen-plasma',
    'cryoprecipitate': 'comp-cryoprecipitate',
    'cryosupernatant': 'comp-cryosupernatant'
  };
 
  for (const [componentKey, elementId] of Object.entries(componentMap)) {
    const statusEl = document.getElementById(elementId);
    if (!statusEl) {
      console.warn(`Element with ID ${elementId} not found`);
      continue;
    }
 
    const availability = bloodBankAvailability.components[componentKey];
    
    if (!availability) {
      statusEl.textContent = 'Not available';
      statusEl.parentElement.style.borderLeftColor = 'var(--muted)';
      continue;
    }
 
    const { status, label } = availability;
    let borderColor = 'var(--muted)';
    let statusColor = 'var(--muted)';
 
    // Determine border and text color based on availability status
    if (status === 'AVAILABLE') {
      borderColor = 'var(--green)';
      statusColor = 'var(--green)';
    } else if (status === 'LOW_STOCK') {
      borderColor = 'var(--amber)';
      statusColor = 'var(--amber)';
    } else if (status === 'OUT_OF_STOCK' || status === 'UNAVAILABLE') {
      borderColor = 'var(--muted)';
      statusColor = 'var(--muted)';
    }
 
    statusEl.textContent = label;
    statusEl.style.color = statusColor;
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

// ---------------------------------------------------------------
// --- NEW BLOOD REQUEST FORM (4 STEPS) - FIXED JS ---
// ---------------------------------------------------------------

const TOTAL_STEPS_HOSP = 4;
const HOSPITAL_FORM_STEP_IDS = {
  1: [1],
  2: [2],
  3: [4],
  4: [5]
};
const HOSPITAL_ALL_FORM_STEP_IDS = [1, 2, 4, 5];
let currentStepHosp = 1;
let docFileHosp = null;
let lastIndicationGroupKeyHosp = '';
const HOSP_UPLOAD_COMPRESSION_MAX_DIMENSION = 1600;
const HOSP_UPLOAD_COMPRESSION_QUALITY = 0.82;
const HOSP_UPLOAD_COMPRESSION_MIN_BYTES = 350 * 1024;

// --------------------------------------------------------------
// STEP NAVIGATION
// --------------------------------------------------------------

/**
 * Navigate to a specific step
 */
function goToStepHosp(n) {
  if (n > currentStepHosp && !validateStepHosp(currentStepHosp)) {
    return;
  }

  currentStepHosp = n;
  updateStepUI();
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/**
 * Next button handler
 */
function nextStepHosp() {
  if (currentStepHosp < TOTAL_STEPS_HOSP) {
    goToStepHosp(currentStepHosp + 1);
  }
}

/**
 * Previous button handler
 */
function prevStepHosp() {
  if (currentStepHosp > 1) {
    goToStepHosp(currentStepHosp - 1);
  }
}

/**
 * Update step UI (dots, lines, content visibility, buttons)
 */
function updateStepUI() {
  // Update step dots and lines
  for (let i = 1; i <= TOTAL_STEPS_HOSP; i++) {
    const dot = document.getElementById(`step-dot-hosp-${i}`);
    const line = document.getElementById(`step-line-hosp-${i}`);
    
    if (dot) {
      dot.classList.toggle('active', i === currentStepHosp);
    }
    
    if (line && i < TOTAL_STEPS_HOSP) {
      line.style.background = i < currentStepHosp ? '#2E7D4F' : '#E8E8E8';
    }
  }
  
  // Update step counter
  document.getElementById('current-step-num-hosp').textContent = currentStepHosp;
  
  // Show/hide step content
  HOSPITAL_ALL_FORM_STEP_IDS.forEach(id => {
    const step = document.getElementById(`form-step-hosp-${id}`);
    if (step) {
      step.classList.remove('active');
    }
  });

  (HOSPITAL_FORM_STEP_IDS[currentStepHosp] || []).forEach(id => {
    const step = document.getElementById(`form-step-hosp-${id}`);
    if (step) {
      step.classList.add('active');
    }
  });
  
  // Toggle button visibility
  document.getElementById('btn-prev-hosp').style.display = currentStepHosp > 1 ? 'block' : 'none';
  document.getElementById('btn-next-hosp').style.display = currentStepHosp < TOTAL_STEPS_HOSP ? 'block' : 'none';
  document.getElementById('submit-btn-hosp').style.display = currentStepHosp === TOTAL_STEPS_HOSP ? 'block' : 'none';
  
  // Populate review on the final step
  if (currentStepHosp === TOTAL_STEPS_HOSP) {
    populateReviewHosp();
  }
  
  hideErrorHosp();
}

// --------------------------------------------------------------
// ERROR HANDLING
// --------------------------------------------------------------

/**
 * Show error message
 */
function showErrorHosp(msg) {
  const el = document.getElementById('err-submit-hosp');
  if (el) {
    document.getElementById('err-submit-msg-hosp').textContent = msg;
    el.style.display = 'flex';
  }
}

/**
 * Hide error message
 */
function hideErrorHosp() {
  const el = document.getElementById('err-submit-hosp');
  if (el) {
    el.style.display = 'none';
  }
}

// --------------------------------------------------------------
// VALIDATION
// --------------------------------------------------------------

let firstInvalidFieldHosp = null;

function setFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(`${inputId}-error`);
  if (input) {
    input.classList.add('field-error');
    if (!firstInvalidFieldHosp) firstInvalidFieldHosp = input;
  }
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

function clearAllFieldErrorsHosp() {
  firstInvalidFieldHosp = null;
  document.querySelectorAll('#panel-newrequest .field-error').forEach((el) => el.classList.remove('field-error'));
  document.querySelectorAll('#panel-newrequest .form-inline-error').forEach((el) => {
    el.textContent = '';
    el.classList.remove('show');
  });
}

function focusFirstInvalidField() {
  if (!firstInvalidFieldHosp) return;
  firstInvalidFieldHosp.focus();
  firstInvalidFieldHosp.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function normalizeWhitespaceHosp(value) {
  return String(value || '').replace(/\s{2,}/g, ' ');
}

function toTitleCaseHosp(value) {
  return normalizeWhitespaceHosp(value)
    .split(' ')
    .map((word) => word
      .split(/([\-'.])/)
      .map((part) => (/^[-'.]$/.test(part) || !part ? part : `${part.charAt(0).toUpperCase()}${part.slice(1).toLowerCase()}`))
      .join(''))
    .join(' ');
}

function hasScriptLikeInputHosp(value) {
  return /<[^>]*>|<\/?script\b/i.test(String(value || ''));
}

function validatePersonNameField(inputId, label, required = false) {
  const input = document.getElementById(inputId);
  if (!input) return true;

  input.value = toTitleCaseHosp(input.value).slice(0, 25);
  clearFieldError(inputId);

  if (!input.value) {
    if (required) {
      setFieldError(inputId, `Please enter a valid ${label}.`);
      return false;
    }
    return true;
  }

  if (hasScriptLikeInputHosp(input.value) || !/^[A-Za-z .'-]+$/.test(input.value) || !/[A-Za-z]/.test(input.value)) {
    setFieldError(inputId, `Please enter a valid ${label}.`);
    return false;
  }

  return true;
}

function validateSuffixFieldHosp() {
  const input = document.getElementById('pat-suffix-hosp');
  if (!input) return true;

  input.value = normalizeWhitespaceHosp(input.value).slice(0, 10);
  clearFieldError('pat-suffix-hosp');

  if (!input.value) return true;

  if (hasScriptLikeInputHosp(input.value) || !/^[A-Za-z0-9. ]+$/.test(input.value)) {
    setFieldError('pat-suffix-hosp', 'Suffix may only contain letters, numbers, spaces, and periods.');
    return false;
  }

  return true;
}

function validateSimpleTextField(inputId, label, maxLength, required, pattern, customMessage) {
  const input = document.getElementById(inputId);
  if (!input) return true;

  const shouldTitleCase = ['pat-purok-hosp', 'pat-barangay-hosp', 'pat-municipality-hosp', 'pat-province-hosp', 'pat-ward-hosp'].includes(inputId);
  input.value = (shouldTitleCase ? toTitleCaseHosp(input.value) : normalizeWhitespaceHosp(input.value)).slice(0, maxLength);
  clearFieldError(inputId);

  if (!input.value) {
    if (required) {
      setFieldError(inputId, `${label} is required.`);
      return false;
    }
    return true;
  }

  if (hasScriptLikeInputHosp(input.value) || (pattern && !pattern.test(input.value))) {
    setFieldError(inputId, customMessage || `${label} contains invalid characters.`);
    return false;
  }

  return true;
}

function enforceHemoglobinFormatHosp() {
  const input = document.getElementById('pat-hemoglobin-hosp');
  if (!input) return;
  input.value = String(input.value || '').replace(/\D/g, '').slice(0, 3);
}

function validateHemoglobinFieldHosp() {
  const input = document.getElementById('pat-hemoglobin-hosp');
  if (!input) return true;

  input.value = normalizeWhitespaceHosp(input.value);
  clearFieldError('pat-hemoglobin-hosp');
  if (!input.value) return true;

  if (!/^\d{1,3}$/.test(input.value)) {
    setFieldError('pat-hemoglobin-hosp', 'Hemoglobin must contain numbers only and up to 3 digits.');
    return false;
  }

  return true;
}

function enforceHematocritFormatHosp() {
  const input = document.getElementById('pat-hematocrit-hosp');
  if (!input) return;

  let raw = String(input.value || '');
  if (!raw.trim()) {
    input.value = '.';
    return;
  }

  raw = raw.replace(/\s+/g, '').replace(/[^0-9.]/g, '');
  const dotIdx = raw.indexOf('.');
  const tail = (dotIdx >= 0 ? raw.slice(dotIdx + 1) : raw).replace(/\./g, '');
  input.value = tail ? `.${tail.slice(0, 4)}` : '.';
}

function validateHematocritFieldHosp() {
  const input = document.getElementById('pat-hematocrit-hosp');
  if (!input) return true;

  input.value = normalizeWhitespaceHosp(input.value);
  clearFieldError('pat-hematocrit-hosp');
  if (!input.value || input.value === '.') return true;

  if (!/^\.\d{1,4}$/.test(input.value)) {
    setFieldError('pat-hematocrit-hosp', 'Hematocrit must follow decimal format like .25.');
    return false;
  }

  const numeric = Number(`0${input.value}`);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 1) {
    setFieldError('pat-hematocrit-hosp', 'Hematocrit must follow decimal format like .25.');
    return false;
  }

  return true;
}

function validateUnitsFieldHosp() {
  const input = document.getElementById('req-units-hosp');
  if (!input) return true;

  clearFieldError('req-units-hosp');
  input.value = String(input.value || '').replace(/\D/g, '').slice(0, 2);
  if (!input.value || !/^\d{1,2}$/.test(input.value)) {
    setFieldError('req-units-hosp', 'Units must be between 1 and 99.');
    return false;
  }

  const numeric = Number(input.value);
  if (!Number.isFinite(numeric) || numeric < 1 || numeric > 99) {
    setFieldError('req-units-hosp', 'Units must be between 1 and 99.');
    return false;
  }

  return true;
}

function validatePlateletCountFieldHosp() {
  const input = document.getElementById('req-platelet-count-hosp');
  if (!input) return true;

  clearFieldError('req-platelet-count-hosp');
  input.value = String(input.value || '').replace(/\D/g, '');
  if (!input.value) return true;

  if (!/^\d+$/.test(input.value)) {
    setFieldError('req-platelet-count-hosp', 'Platelet count must be a valid number.');
    return false;
  }
  return true;
}

function validatePrevTransfusionUnitsFieldHosp() {
  const input = document.getElementById('prev-transfusion-units-hosp');
  if (!input) return true;

  clearFieldError('prev-transfusion-units-hosp');
  input.value = String(input.value || '').replace(/\D/g, '').slice(0, 2);
  const isYes = document.querySelector('input[name="prev-transfusion-hosp"][value="yes"]')?.checked;
  if (!isYes) return true;
  if (!input.value) {
    setFieldError('prev-transfusion-units-hosp', 'Please enter number of units.');
    return false;
  }

  const numeric = Number(input.value);
  if (!Number.isFinite(numeric) || numeric < 0 || numeric > 99) {
    setFieldError('prev-transfusion-units-hosp', 'Previous transfusion units must be between 0 and 99.');
    return false;
  }
  return true;
}

function validatePrevTransfusionDateFieldHosp() {
  const input = document.getElementById('prev-transfusion-date-hosp');
  if (!input) return true;

  clearFieldError('prev-transfusion-date-hosp');
  const isYes = document.querySelector('input[name="prev-transfusion-hosp"][value="yes"]')?.checked;
  if (!isYes) return true;
  if (!input.value) {
    setFieldError('prev-transfusion-date-hosp', 'Please select date of previous transfusion.');
    return false;
  }
  return true;
}

function validatePrevReactionDateFieldHosp() {
  const input = document.getElementById('prev-reaction-date-hosp');
  if (!input) return true;

  clearFieldError('prev-reaction-date-hosp');
  const isYes = document.querySelector('input[name="prev-reaction-hosp"][value="yes"]')?.checked;
  if (!isYes) return true;
  if (!input.value) {
    setFieldError('prev-reaction-date-hosp', 'Please select date of previous reaction.');
    return false;
  }
  return true;
}

function validatePrevReactionDetailsRequiredFieldHosp() {
  const isYes = document.querySelector('input[name="prev-reaction-hosp"][value="yes"]')?.checked;
  if (!isYes) {
    clearFieldError('prev-reaction-details-hosp');
    return true;
  }
  return validateSimpleTextField(
    'prev-reaction-details-hosp',
    'Reaction details',
    250,
    true,
    /^[A-Za-z0-9 .,'#()\-/:]*$/,
    'Reaction details must not exceed 250 characters.'
  );
}

function validateDateNeededFieldHosp() {
  const input = document.getElementById('req-date-needed-hosp');
  if (!input) return true;

  clearFieldError('req-date-needed-hosp');
  if (!input.value) {
    setFieldError('req-date-needed-hosp', 'Please select required by date.');
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const selected = new Date(input.value);
  selected.setHours(0, 0, 0, 0);

  if (selected < today) {
    setFieldError('req-date-needed-hosp', 'Date needed cannot be in the past.');
    return false;
  }
  return true;
}

function validateNotesFieldHosp() {
  const input = document.getElementById('notes-input-hosp');
  if (!input) return true;

  input.value = normalizeWhitespaceHosp(input.value);
  clearFieldError('notes-input-hosp');
  if (!input.value.trim()) {
    setFieldError('notes-input-hosp', 'Additional notes is required. If none, type N/A.');
    return false;
  }
  return true;
}

function validateHospitalFieldGroupsHosp(step) {
  let valid = true;

  if (step === 1) {
    valid = validatePersonNameField('pat-firstname-hosp', 'first name', true) && valid;
    valid = validatePersonNameField('pat-middlename-hosp', 'middle name', false) && valid;
    valid = validatePersonNameField('pat-lastname-hosp', 'last name', true) && valid;
    valid = validateSuffixFieldHosp() && valid;
    valid = validateSimpleTextField('pat-purok-hosp', 'Purok', 25, true, /^[A-Za-z0-9 .,'#()-]*$/) && valid;
    valid = validateSimpleTextField('pat-barangay-hosp', 'Barangay', 25, true, /^[A-Za-z0-9 .,'#()-]*$/) && valid;
    valid = validateSimpleTextField('pat-municipality-hosp', 'Municipality', 25, true, /^[A-Za-z0-9 .,'#()-]*$/) && valid;
    valid = validateSimpleTextField('pat-province-hosp', 'Province', 25, true, /^[A-Za-z0-9 .,'#()-]*$/) && valid;
    valid = validateSimpleTextField('pat-ward-hosp', 'Ward', 25, false, /^[A-Za-z0-9()\- ]*$/, 'Ward must not exceed 25 characters.') && valid;
    valid = validateSimpleTextField('pat-room-hosp', 'Room number', 25, false, /^[A-Za-z0-9,\- ]*$/, 'Room number must not exceed 25 characters.') && valid;
    const physicianValid = validatePersonNameField('pat-physician-hosp', 'requesting physician', true);
    if (!physicianValid) setFieldError('pat-physician-hosp', 'Please enter a valid requesting physician.');
    valid = physicianValid && valid;
  }

  if (step === 2) {
    valid = validateUnitsFieldHosp() && valid;
    valid = validatePlateletCountFieldHosp() && valid;
    valid = validateSimpleTextField('pat-diagnosis-hosp', 'Clinical impression', 250, true, /^[A-Za-z0-9 .,'#()\-/:]*$/, 'Clinical impression must not exceed 250 characters.') && valid;
    valid = validateHemoglobinFieldHosp() && valid;
    valid = validateHematocritFieldHosp() && valid;
    valid = validatePrevTransfusionDateFieldHosp() && valid;
    valid = validatePrevTransfusionUnitsFieldHosp() && valid;
    valid = validatePrevReactionDateFieldHosp() && valid;
    valid = validatePrevReactionDetailsRequiredFieldHosp() && valid;
    valid = validateDateNeededFieldHosp() && valid;
  }

  return valid;
}

function validateAcknowledgementHosp() {
  const ack = document.getElementById('ack-confirm-hosp');
  if (!ack) return true;

  clearFieldError('ack-confirm-hosp');
  if (ack.checked) return true;

  setFieldError('ack-confirm-hosp', 'Please acknowledge that the information provided is accurate before submitting.');
  showErrorHosp('Please acknowledge that the information provided is accurate before submitting.');
  ack.focus();
  ack.scrollIntoView({ behavior: 'smooth', block: 'center' });
  return false;
}

function validateStepHosp(step) {
  hideErrorHosp();
  clearAllFieldErrorsHosp();

  if (!validateHospitalFieldGroupsHosp(step)) {
    showErrorHosp('Please correct the highlighted fields before proceeding.');
    focusFirstInvalidField();
    return false;
  }

  if (step === 1) {
    const birthdate = document.getElementById('pat-birthdate-hosp')?.value;
    const sex = getFieldValueHosp('pat-sex-hosp', 'pat-sex-hosp');
    const category = document.querySelector('input[name="req-category-hosp"]:checked')?.value;

    if (!category) {
      showErrorHosp('Please select a request category.');
      return false;
    }
    if (!birthdate) {
      setFieldError('pat-birthdate-hosp', 'Please enter patient date of birth.');
      showErrorHosp('Please enter patient date of birth.');
      focusFirstInvalidField();
      return false;
    }
    if (!sex) {
      showErrorHosp('Please select patient sex.');
      return false;
    }
    return true;
  }

  if (step === 2) {
    const bloodType = getFieldValueHosp('req-bt-hosp', 'req-bt-hosp');
    const component = getFieldValueHosp('req-comp-hosp', 'req-comp-hosp');
    const requestType = getFieldValueHosp('req-type-hosp', 'req-type-hosp');
    const prevTransfusion = document.querySelector('input[name="prev-transfusion-hosp"]:checked')?.value;
    const prevReaction = document.querySelector('input[name="prev-reaction-hosp"]:checked')?.value;
    const plateletCount = document.getElementById('req-platelet-count-hosp')?.value;
    const hemoglobin = (document.getElementById('pat-hemoglobin-hosp')?.value || '').trim();
    const hematocrit = (document.getElementById('pat-hematocrit-hosp')?.value || '').trim();
    const dateNeeded = (document.getElementById('req-date-needed-hosp')?.value || '').trim();

    if (!bloodType) {
      showErrorHosp('Please select blood type.');
      return false;
    }
    if (!component) {
      showErrorHosp('Please select blood component.');
      return false;
    }
    if (!requestType) {
      showErrorHosp('Please select request type (STAT or ROUTINE).');
      return false;
    }
    if (!prevTransfusion) {
      showErrorHosp('Please select Yes or No for previous transfusion history.');
      return false;
    }
    if (!prevReaction) {
      showErrorHosp('Please select Yes or No for previous reaction to transfusion.');
      return false;
    }
    if (!hemoglobin) {
      setFieldError('pat-hemoglobin-hosp', 'Please enter hemoglobin.');
      showErrorHosp('Please enter hemoglobin.');
      focusFirstInvalidField();
      return false;
    }
    if (!hematocrit || hematocrit === '.') {
      setFieldError('pat-hematocrit-hosp', 'Please enter hematocrit.');
      showErrorHosp('Please enter hematocrit.');
      focusFirstInvalidField();
      return false;
    }
    if (!dateNeeded) {
      setFieldError('req-date-needed-hosp', 'Please select required by date.');
      showErrorHosp('Please select required by date.');
      focusFirstInvalidField();
      return false;
    }
    if (component === 'PLATELET_CONCENTRATE' && plateletCount && parseInt(plateletCount, 10) < 0) {
      showErrorHosp('Platelet count must be a valid number.');
      return false;
    }

    if (requestType === 'ROUTINE') {
      const urgency = getFieldValueHosp('req-urgency-hosp', 'req-urgency-hosp');
      if (!urgency) {
        showErrorHosp('For ROUTINE requests, please select an urgency level.');
        return false;
      }
    }

    const indicationSelected = document.querySelector('#panel-newrequest .indication-checkbox[id*="-hosp"]:checked');
    if (INDICATION_REQUIRED_COMPONENTS_HOSP.includes(component) && !indicationSelected) {
      document.getElementById('err-indication-hosp').style.display = 'block';
      showErrorHosp('Please select at least one indication for transfusion.');
      return false;
    }
    if (SPECIFY_ONLY_INDICATION_COMPONENTS[component] && !getSpecifyOnlyIndicationValueHosp(component)) {
      showErrorHosp('Please specify the indication for this component.');
      return false;
    }
    return true;
  }

  if (step === 3) {
    if (!validateNotesFieldHosp()) {
      showErrorHosp('Please enter additional notes. If none, type N/A.');
      focusFirstInvalidField();
      return false;
    }
    if (!docFileHosp) {
      showErrorHosp('Please upload Doctor\'s Blood Request Form.');
      return false;
    }
    return true;
  }

  return true;
}

// --------------------------------------------------------------
// PATIENT INFORMATION
// --------------------------------------------------------------

/**
 * Calculate patient age from date of birth
 * Auto-update Patient Type (Adult/Pediatric)
 */
function calculateAgeHosp() {
  const birthdateInput = document.getElementById('pat-birthdate-hosp');
  if (!birthdateInput || !birthdateInput.value) {
    document.getElementById('patient-type-display-hosp').textContent = 'Select date of birth';
    updateIndicationGroupsHosp();
    return;
  }

  const birthdate = new Date(birthdateInput.value);
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }

  // Auto-determine patient type
  const patientType = age <= 13 ? 'Pediatric (<=13 years)' : 'Adult (>=14 years)';
  document.getElementById('patient-type-display-hosp').textContent = `${patientType} - Age: ${age} years`;

  // Update indication groups when patient type changes
  updateIndicationGroupsHosp();
}

/**
 * Get patient type from birthdate (ADULT or PEDIA)
 */
function getPatientTypeHosp() {
  const birthdateInput = document.getElementById('pat-birthdate-hosp');
  if (!birthdateInput || !birthdateInput.value) return 'ADULT';

  const birthdate = new Date(birthdateInput.value);
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }

  return age <= 13 ? 'PEDIA' : 'ADULT';
}

/**
 * Get patient age as number
 */
function getPatientAgeHosp() {
  const birthdateInput = document.getElementById('pat-birthdate-hosp');
  if (!birthdateInput || !birthdateInput.value) return null;

  const birthdate = new Date(birthdateInput.value);
  const today = new Date();
  let age = today.getFullYear() - birthdate.getFullYear();
  const monthDiff = today.getMonth() - birthdate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
    age--;
  }

  return age;
}

// --------------------------------------------------------------
// BLOOD REQUEST DETAILS
// --------------------------------------------------------------

/**
 * Update urgency display based on request type
 * STAT = Auto HIGH urgency (non-selectable)
 * ROUTINE = Selectable urgency (Low, Medium, High)
 */
function updateUrgencyLevelHosp() {
  const requestType = getFieldValueHosp('req-type-hosp', 'req-type-hosp');
  const autoStatDisplay = document.getElementById('urgency-auto-stat-hosp');
  const routineOptions = document.getElementById('urgency-routine-options-hosp');

  if (requestType === 'STAT') {
    autoStatDisplay.style.display = 'block';
    routineOptions.style.display = 'none';
  } else if (requestType === 'ROUTINE') {
    autoStatDisplay.style.display = 'none';
    routineOptions.style.display = 'block';
  } else {
    autoStatDisplay.style.display = 'none';
    routineOptions.style.display = 'none';
  }
}

function clearIndicationSelectionsHosp() {
  document.querySelectorAll('#panel-newrequest .indication-checkbox[id*="-hosp"]').forEach(cb => {
    cb.checked = false;
  });
  document.querySelectorAll('#panel-newrequest .indication-sub-group[id*="-hosp"]').forEach(group => {
    group.style.display = 'none';
  });
  document.querySelectorAll('#panel-newrequest [data-ref]').forEach(input => {
    input.value = '';
  });
  document.querySelectorAll('#panel-newrequest .others-input-field[id*="-hosp"]').forEach(field => {
    field.classList.remove('visible');
  });
  document.querySelectorAll('#panel-newrequest .component-indication-specify-hosp').forEach(field => {
    field.value = '';
  });
  const indicationError = document.getElementById('err-indication-hosp');
  if (indicationError) indicationError.style.display = 'none';
}

// --------------------------------------------------------------
// CLINICAL DATA & INDICATION GROUPS
// --------------------------------------------------------------

/**
 * Update visible indication groups based on selected component and patient type
 * FIXED: Now properly shows indication container and groups
 * FIXED: Leukoreduced PRBC and Aliquoted PRBC have separate indication mappings
 */
function updateIndicationGroupsHosp() {
  const component = getFieldValueHosp('req-comp-hosp', 'req-comp-hosp');
  const birthdate = document.getElementById('pat-birthdate-hosp')?.value;
  const patientType = getPatientTypeHosp();
  const container = document.getElementById('indication-container-hosp');
  const groupKey = `${patientType}:${component || ''}`;

  togglePlateletCountFieldHosp(component);
  
  if (!container) {
    console.warn('indication-container-hosp not found');
    return;
  }

  if (groupKey !== lastIndicationGroupKeyHosp) {
    clearIndicationSelectionsHosp();
    lastIndicationGroupKeyHosp = groupKey;
  }

  // Hide all indication groups first
  document.querySelectorAll('#panel-newrequest .indication-group[id*="-hosp"]').forEach(g => {
    g.style.display = 'none';
  });

  // Only show container and groups if we have both birthdate and component
  if (!component || !birthdate) {
    container.style.display = 'none';
    return;
  }

  // IMPORTANT: Show the container first
  container.style.display = 'block';
  
  // Determine which group to show based on patient type and component
  let groupId = '';
  
  if (patientType === 'ADULT') {
    // ADULT GROUPS
    if (component === 'WHOLE_BLOOD') {
      groupId = 'group-WHOLE_BLOOD-hosp';
    } 
    else if (component === 'PRBC') {
      groupId = 'group-PRBC-hosp';
    }
    else if (component === 'LEUKOREDUCED_PRBC') {
      groupId = 'group-LEUKOREDUCED_PRBC-hosp';
    }
    else if (component === 'ALIQUOTED_PRBC') {
      groupId = 'group-ALIQUOTED_PRBC-hosp';
    }
    else if (component === 'PLATELET_CONCENTRATE') {
      groupId = 'group-PLATELET_CONCENTRATE-hosp';
    } 
    else if (component === 'FRESH_FROZEN_PLASMA') {
      groupId = 'group-FRESH_FROZEN_PLASMA-hosp';
    } 
    else if (component === 'CRYOPRECIPITATE') {
      groupId = 'group-CRYOPRECIPITATE-hosp';
    }
    else if (component === 'CRYOSUPERNATANT') {
      groupId = 'group-CRYOSUPERNATANT-hosp';
    }
  } else if (patientType === 'PEDIA') {
    // PEDIATRIC GROUPS
    if (component === 'WHOLE_BLOOD') {
      // Check if pediatric group exists, fall back to adult
      groupId = document.getElementById('group-WHOLE_BLOOD-PEDIA-hosp') ? 'group-WHOLE_BLOOD-PEDIA-hosp' : 'group-WHOLE_BLOOD-hosp';
    }
    else if (['PRBC'].includes(component)) {
      // Check if pediatric group exists, fall back to adult
      groupId = document.getElementById('group-PRBC-PEDIA-hosp') ? 'group-PRBC-PEDIA-hosp' : 'group-PRBC-hosp';
    } 
    else if (component === 'LEUKOREDUCED_PRBC') {
      groupId = 'group-LEUKOREDUCED_PRBC-hosp';
    }
    else if (component === 'ALIQUOTED_PRBC') {
      groupId = 'group-ALIQUOTED_PRBC-hosp';
    }
    else if (component === 'PLATELET_CONCENTRATE') {
      groupId = document.getElementById('group-PLATELET_CONCENTRATE-PEDIA-hosp') ? 'group-PLATELET_CONCENTRATE-PEDIA-hosp' : 'group-PLATELET_CONCENTRATE-hosp';
    } 
    else if (component === 'FRESH_FROZEN_PLASMA') {
      groupId = document.getElementById('group-FRESH_FROZEN_PLASMA-PEDIA-hosp') ? 'group-FRESH_FROZEN_PLASMA-PEDIA-hosp' : 'group-FRESH_FROZEN_PLASMA-hosp';
    } 
    else if (component === 'CRYOPRECIPITATE') {
      groupId = document.getElementById('group-CRYOPRECIPITATE-PEDIA-hosp') ? 'group-CRYOPRECIPITATE-PEDIA-hosp' : 'group-CRYOPRECIPITATE-hosp';
    }
    else if (component === 'CRYOSUPERNATANT') {
      groupId = 'group-CRYOSUPERNATANT-hosp';
    }
  }

  // Show the appropriate group
  if (groupId) {
    const group = document.getElementById(groupId);
    if (group) {
      group.style.display = 'block';
    } else {
      console.warn(`Group ${groupId} not found in DOM`);
    }
  }
}

/**
 * Handle indication checkbox parent/child toggling
 */
document.addEventListener('change', function(e) {
  if (e.target.classList.contains('indication-checkbox') && e.target.id.includes('-hosp')) {
    const parentId = e.target.getAttribute('data-parent');
    if (!parentId) {
      const elementId = e.target.id;
      if (elementId && elementId.startsWith('ind-')) {
        const code = elementId.replace('ind-', '').replace('-hosp', '');
        toggleIndicationSubgroupHosp(code);
      }
    }
  }
}, true);

/**
 * Toggle visibility of sub-items when parent indication is checked
 */
function toggleIndicationSubgroupHosp(parentId) {
  const subGroup = document.getElementById(`sub-${parentId}-hosp`);
  const parentCheckbox = document.getElementById(`ind-${parentId}-hosp`);
  
  if (parentCheckbox && subGroup) {
    if (parentCheckbox.checked) {
      subGroup.style.display = 'block';
    } else {
      subGroup.style.display = 'none';
      
      const subItems = subGroup.querySelectorAll('.indication-checkbox.sub');
      subItems.forEach(item => {
        item.checked = false;
      });
    }
  }
}

// --------------------------------------------------------------
// TOGGLE "OTHERS (SPECIFY)" INPUT FIELD
// --------------------------------------------------------------

/**
 * Toggle visibility of "Others (specify)" input field when checkbox is changed
 * Shows the input field when checkbox is checked
 * Hides and clears the input field when checkbox is unchecked
 */
function toggleOthersFieldHosp(checkbox) {
  const code = checkbox.value;
  const inputField = document.getElementById(`others-input-${code}-hosp`);
  
  if (inputField) {
    if (checkbox.checked) {
      // Show the field and focus on it
      inputField.classList.add('visible');
      inputField.focus();
    } else {
      // Hide the field and clear its value
      inputField.classList.remove('visible');
      inputField.value = '';
    }
  }
  
  syncForm(); // Call sync to update form state
}

// --------------------------------------------------------------
// CLINICAL DATA TOGGLES
// --------------------------------------------------------------

/**
 * Toggle previous transfusion history fields
 */
function togglePrevTransfusionFieldsHosp() {
  const selected = document.querySelector('input[name="prev-transfusion-hosp"]:checked')?.value;
  const fieldsDiv = document.getElementById('prev-transfusion-fields-hosp');
  
  if (fieldsDiv) {
    if (selected === 'yes') {
      fieldsDiv.style.display = 'block';
    } else {
      fieldsDiv.style.display = 'none';
      document.getElementById('prev-transfusion-date-hosp').value = '';
      document.getElementById('prev-transfusion-units-hosp').value = '';
      clearFieldError('prev-transfusion-date-hosp');
      clearFieldError('prev-transfusion-units-hosp');
    }
  }
  syncForm();
}

/**
 * Toggle previous reaction history fields
 */
function togglePrevReactionFieldsHosp() {
  const selected = document.querySelector('input[name="prev-reaction-hosp"]:checked')?.value;
  const fieldsDiv = document.getElementById('prev-reaction-fields-hosp');
  
  if (fieldsDiv) {
    if (selected === 'yes') {
      fieldsDiv.style.display = 'block';
    } else {
      fieldsDiv.style.display = 'none';
      document.getElementById('prev-reaction-date-hosp').value = '';
      document.getElementById('prev-reaction-details-hosp').value = '';
      clearFieldError('prev-reaction-date-hosp');
      clearFieldError('prev-reaction-details-hosp');
    }
  }
  syncForm();
}

// --------------------------------------------------------------
// FILE UPLOAD HANDLING
// --------------------------------------------------------------

/**
 * Handle file drop on upload zone
 */
function handleDrop(e, type) {
  e.preventDefault();
  const zone = document.getElementById(`${type}-zone-hosp`);
  if (zone) zone.classList.remove('drag-over');
  
  if (e.dataTransfer.files[0]) {
    const input = document.getElementById(`${type}-file-hosp`);
    handleFile(input, type);
  }
}

/**
 * Handle file selection from input
 * FIXED: Now properly extracts and stores file objects
 */
function handleFile(fileInput, type) {
  let file = null;
  
  // Handle different input types
  if (fileInput instanceof File) {
    file = fileInput;
  } else if (fileInput instanceof HTMLInputElement) {
    // Extract file from input element
    if (fileInput.files && fileInput.files.length > 0) {
      file = fileInput.files[0];
    }
  } else if (fileInput && fileInput.files) {
    // Handle as file list
    if (fileInput.files.length > 0) {
      file = fileInput.files[0];
    }
  }

  // Validate file exists
  if (!file) {
    console.warn(`No file selected for type: ${type}`);
    return;
  }

  // console.log(`File selected for ${type}:`, file.name, file.size, file.type);
  
  // Validate file size
  if (file.size > 5 * 1024 * 1024) {
    showErrorHosp("File exceeds 5MB limit.");
    return;
  }

  // Validate file type
  if (!['image/jpeg', 'image/png'].includes(file.type)) {
    showErrorHosp("Only JPG or PNG images are accepted.");
    return;
  }

  // Store file and update UI
  if (type === 'doc') {
    docFileHosp = file;
    // console.log('Doc file stored:', docFileHosp.name);
    document.getElementById('doc-placeholder-hosp').style.display = 'none';
    document.getElementById('doc-preview-hosp').style.display = 'block';
    document.getElementById('doc-name-hosp').textContent = file.name;
    document.getElementById('doc-size-hosp').textContent =
      file.size < 1024*1024 ? (file.size/1024).toFixed(1)+' KB' : (file.size/(1024*1024)).toFixed(1)+' MB';
  } 
}

/**
 * Clear uploaded file
 */
function clearFile(type) {
  if (type === 'doc') {
    docFileHosp = null;
    document.getElementById('doc-file-hosp').value = '';
    document.getElementById('doc-placeholder-hosp').style.display = 'block';
    document.getElementById('doc-preview-hosp').style.display = 'none';
  }
}

function isCompressibleHospUpload(file) {
  return !!file && ['image/jpeg', 'image/png'].includes(file.type);
}

function loadHospImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const imageUrl = URL.createObjectURL(file);
    const image = new Image();

    image.onload = () => {
      URL.revokeObjectURL(imageUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(imageUrl);
      reject(new Error('Unable to read the selected image.'));
    };

    image.src = imageUrl;
  });
}

function canvasToHospBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => {
      if (blob) {
        resolve(blob);
        return;
      }
      reject(new Error('Unable to optimize the selected image.'));
    }, type, quality);
  });
}

async function optimizeHospUploadFile(file) {
  if (!isCompressibleHospUpload(file) || file.size < HOSP_UPLOAD_COMPRESSION_MIN_BYTES) {
    return file;
  }

  const image = await loadHospImageFromFile(file);
  const largestSide = Math.max(image.width, image.height);
  const scale = largestSide > HOSP_UPLOAD_COMPRESSION_MAX_DIMENSION
    ? HOSP_UPLOAD_COMPRESSION_MAX_DIMENSION / largestSide
    : 1;

  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));

  const context = canvas.getContext('2d');
  if (!context) {
    return file;
  }

  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  const outputType = 'image/jpeg';
  const compressedBlob = await canvasToHospBlob(canvas, outputType, HOSP_UPLOAD_COMPRESSION_QUALITY);
  if (compressedBlob.size >= file.size) {
    return file;
  }

  const optimizedName = file.name.replace(/\.(png|jpe?g)$/i, '') + '.jpg';
  return new File([compressedBlob], optimizedName, {
    type: outputType,
    lastModified: Date.now()
  });
}

// --------------------------------------------------------------
// REVIEW PAGE
// --------------------------------------------------------------

/**
 * Populate review page with current form data
 */
function populateReviewHosp() {
  const firstName = document.getElementById('pat-firstname-hosp').value;
  const lastName = document.getElementById('pat-lastname-hosp').value;
  const selectedCategory = document.querySelector('input[name="req-category-hosp"]:checked')?.value;
  const selectedBloodType = getFieldValueHosp('req-bt-hosp', 'req-bt-hosp');
  const selectedComponent = getFieldValueHosp('req-comp-hosp', 'req-comp-hosp');
  const selectedUrgency = getFieldValueHosp('req-urgency-hosp', 'req-urgency-hosp');
  const plateletCount = document.getElementById('req-platelet-count-hosp').value;
  const reqType = getFieldValueHosp('req-type-hosp', 'req-type-hosp');
  const indicationSubmission = buildIndicationSubmissionHosp(selectedComponent);
  const fullName = `${firstName} ${lastName}`.trim();
  const addressParts = [
    document.getElementById('pat-purok-hosp').value.trim(),
    document.getElementById('pat-barangay-hosp').value.trim(),
    document.getElementById('pat-municipality-hosp').value.trim(),
    document.getElementById('pat-province-hosp').value.trim()
  ].filter(Boolean);

  document.getElementById('review-pat-name').textContent = fullName || '-';
  document.getElementById('review-pat-dob').textContent = document.getElementById('pat-birthdate-hosp').value || '-';
  document.getElementById('review-pat-type').textContent = document.getElementById('patient-type-display-hosp').textContent || '-';
  document.getElementById('review-pat-sex').textContent = getFieldValueHosp('pat-sex-hosp', 'pat-sex-hosp') || '-';
  document.getElementById('review-pat-address').textContent = addressParts.length ? addressParts.join(' / ') : '-';
  document.getElementById('review-pat-physician').textContent = document.getElementById('pat-physician-hosp').value || '-';
  document.getElementById('review-req-category').textContent = formatCategoryLabelHosp(selectedCategory);
  
  document.getElementById('review-blood-type').textContent = BT_LABELS[selectedBloodType] || selectedBloodType || '-';
  document.getElementById('review-blood-comp').textContent = COMP_LABELS[selectedComponent] || selectedComponent || '-';
  document.getElementById('review-blood-units').textContent = document.getElementById('req-units-hosp').value || '-';
  document.getElementById('review-req-type').textContent = reqType || '-';
  
  if (reqType === 'STAT') {
    document.getElementById('review-urgency').textContent = `${formatUrgencyLabelHosp('HIGH')} (Auto)`;
  } else {
    document.getElementById('review-urgency').textContent = formatUrgencyLabelHosp(selectedUrgency);
  }
  
  document.getElementById('review-date-needed').textContent = document.getElementById('req-date-needed-hosp').value || '-';

  const reviewPlateletCountBox = document.getElementById('review-platelet-count-box');
  const reviewPlateletCount = document.getElementById('review-platelet-count');
  if (selectedComponent === 'PLATELET_CONCENTRATE' && plateletCount) {
    reviewPlateletCountBox.style.display = 'block';
    reviewPlateletCount.textContent = plateletCount;
  } else {
    reviewPlateletCountBox.style.display = 'none';
    reviewPlateletCount.textContent = '-';
  }
  
  document.getElementById('review-hemoglobin').textContent = document.getElementById('pat-hemoglobin-hosp').value || '-';
  const hematocrit = document.getElementById('pat-hematocrit-hosp').value;
  const hematocritNumeric = /^\.\d{1,4}$/.test(String(hematocrit || '').trim()) ? Number(`0${hematocrit}`) : null;
  document.getElementById('review-hematocrit').textContent = Number.isFinite(hematocritNumeric) ? (hematocritNumeric * 100).toFixed(1) + '%' : '-';
  document.getElementById('review-diagnosis').textContent = document.getElementById('pat-diagnosis-hosp').value || '-';
  
  if (indicationSubmission.reviewItems.length > 0) {
    const indicationLabels = indicationSubmission.reviewItems.map(ind => {
      return ind.additional
        ? `<div style="margin-bottom:4px"><strong>${ind.code}:</strong> ${ind.additional}</div>`
        : `<div style="margin-bottom:4px"><strong>${ind.code}</strong></div>`;
    }).join('');
    document.getElementById('review-indications').innerHTML = indicationLabels || '-';
  } else {
    document.getElementById('review-indications').innerHTML = '<div style="color:var(--muted)">-</div>';
  }
  
  const docFile = docFileHosp || document.getElementById('doc-file-hosp').files.length > 0;
  document.getElementById('review-doc-status').textContent = docFile ? '? ' + (docFileHosp?.name || document.getElementById('doc-name-hosp').textContent) : '? Not uploaded';
  
  // Populate Additional Notes
  populateReviewNotes();
}

// Function to handle Additional Notes population and character count
function populateReviewNotes() {
  const notesInput = document.getElementById('notes-input-hosp');
  const reviewNotesDiv = document.getElementById('review-notes');
  const charCountSpan = document.getElementById('notes-char-count');
  
  if (!notesInput) return;
  
  const notesText = notesInput.value.trim();
  
  // Update review display
  if (notesText) {
    reviewNotesDiv.textContent = notesText;
    reviewNotesDiv.style.color = 'var(--charcoal)';
  } else {
    reviewNotesDiv.innerHTML = '<div style="color:var(--muted)">-</div>';
  }
  
  // Update character count
  charCountSpan.textContent = notesText.length;
}

// Function to handle real-time character count and validation
function setupNotesListener() {
  const notesInput = document.getElementById('notes-input-hosp');
  const charCountSpan = document.getElementById('notes-char-count');
  
  if (!notesInput) return;
  
  notesInput.addEventListener('input', function() {
    const currentLength = this.value.length;
    const maxLength = 1000;
    
    // Update character count
    charCountSpan.textContent = currentLength;
    
    // Optional: Prevent exceeding max length
    if (currentLength > maxLength) {
      this.value = this.value.substring(0, maxLength);
      charCountSpan.textContent = maxLength;
    }
    
    // Update review in real-time
    populateReviewNotes();
  });
}


// --------------------------------------------------------------
// FORM SUBMISSION
// --------------------------------------------------------------

function getSelectedIndicationItemsHosp() {
  const selected = [];
  const allChecked = document.querySelectorAll('#panel-newrequest .indication-checkbox[id*="-hosp"]:checked');

  allChecked.forEach(checkbox => {
    const input = document.querySelector(`#panel-newrequest [data-ref="${checkbox.value}"]`);
    selected.push({
      code: checkbox.value,
      additional: input ? input.value.trim() : null
    });
  });

  return selected;
}

function buildIndicationOtherSpecifyHosp() {
  const pairs = [];
  document.querySelectorAll('#panel-newrequest [data-ref]').forEach(input => {
    const text = input.value.trim();
    if (text) {
      pairs.push(`${input.dataset.ref}:${text}`);
    }
  });
  return pairs.length > 0 ? pairs.join(',') : null;
}

function buildIndicationSubmissionHosp(component) {
  const specifyOnlyCode = SPECIFY_ONLY_INDICATION_COMPONENTS[component];
  if (specifyOnlyCode) {
    const specifyValue = getSpecifyOnlyIndicationValueHosp(component);
    return {
      indication: specifyValue ? specifyOnlyCode : null,
      indicationOtherSpecify: specifyValue ? `${specifyOnlyCode}:${specifyValue}` : null,
      reviewItems: specifyValue
        ? [{ code: COMP_LABELS[component] || component, additional: specifyValue }]
        : []
    };
  }

  const indications = getSelectedIndicationItemsHosp();
  return {
    indication: indications.map(indication => indication.code).sort().join(',') || null,
    indicationOtherSpecify: buildIndicationOtherSpecifyHosp(),
    reviewItems: indications
  };
}

/**
 * Collect selected indications
 */
function getSelectedIndicationsHosp() {
  return getSelectedIndicationItemsHosp()
    .map(indication => indication.code)
    .sort()
    .join(',');
}

/**
 * Get urgency level based on request type
 */
function getUrgencyLevelHosp() {
  const requestType = getFieldValueHosp('req-type-hosp', 'req-type-hosp');
  
  if (requestType === 'STAT') {
    return 'HIGH';
  } else if (requestType === 'ROUTINE') {
    return getFieldValueHosp('req-urgency-hosp', 'req-urgency-hosp');
  }
  
  return null;
}

// ----------------------------------------------------------------
// SUCCESS MODAL FUNCTIONS
// ----------------------------------------------------------------

function showSuccessModal(referenceNumber, userEmail) {
  document.getElementById('success-ref').textContent = referenceNumber;
  document.getElementById('success-email').textContent = userEmail;
  
  const overlay = document.getElementById('success-modal-overlay');
  if (overlay) {
    overlay.classList.add('show');
    document.body.style.overflow = 'hidden';
  }
}

function closeSuccessModal(event) {
  // Allow closing from overlay click or close button
  if (event && event.target.id !== 'success-modal-overlay') {
    return;
  }
  
  const overlay = document.getElementById('success-modal-overlay');
  if (overlay) {
    overlay.classList.remove('show');
    document.body.style.overflow = 'auto';
  }
}

function copyRef() {
  const refNumber = document.getElementById('success-ref').textContent;
  const btn = event.target;
  
  navigator.clipboard.writeText(refNumber).then(() => {
    const originalText = btn.textContent;
    btn.textContent = '? Copied!';
    
    setTimeout(() => {
      btn.textContent = originalText;
    }, 2000);
  }).catch(() => {
    // Fallback for older browsers
    const textarea = document.createElement('textarea');
    textarea.value = refNumber;
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    
    btn.textContent = '? Copied!';
    setTimeout(() => {
      btn.textContent = 'Copy';
    }, 2000);
  });
}

function newAnotherRequest() {
  closeSuccessModal();
  resetFormHosp();
}

// ----------------------------------------------------------------
// UPDATED SUBMIT FUNCTION WITH MODAL
// ----------------------------------------------------------------

async function submitRequestHosp() {
  hideErrorHosp();

  if (!validateStepHosp(1)) {
    currentStepHosp = 1;
    updateStepUI();
    return;
  }
  if (!validateStepHosp(2)) {
    currentStepHosp = 2;
    updateStepUI();
    return;
  }
  if (!validateStepHosp(3)) {
    currentStepHosp = 3;
    updateStepUI();
    return;
  }
  if (!validateAcknowledgementHosp()) {
    return;
  }

  const patientFirstName = document.getElementById('pat-firstname-hosp').value.trim();
  const patientMiddleName = document.getElementById('pat-middlename-hosp').value.trim();
  const patientLastName = document.getElementById('pat-lastname-hosp').value.trim();
  const patientSuffix = document.getElementById('pat-suffix-hosp').value.trim();
  const patientBirthdate = document.getElementById('pat-birthdate-hosp').value;
  const patientAge = getPatientAgeHosp();
  const patientSex = getFieldValueHosp('pat-sex-hosp', 'pat-sex-hosp');
  const patientType = getPatientTypeHosp();

  const ward = document.getElementById('pat-ward-hosp').value.trim();
  const room = document.getElementById('pat-room-hosp').value.trim();
  const patientPurok = document.getElementById('pat-purok-hosp').value.trim();
  const patientBarangay = document.getElementById('pat-barangay-hosp').value.trim();
  const patientMunicipality = document.getElementById('pat-municipality-hosp').value.trim();
  const patientProvince = document.getElementById('pat-province-hosp').value.trim();
  const requestingPhysician = document.getElementById('pat-physician-hosp').value.trim();
  const diagnosis = document.getElementById('pat-diagnosis-hosp').value.trim();

  const requestCategory = document.querySelector('input[name="req-category-hosp"]:checked')?.value;
  const bloodType = getFieldValueHosp('req-bt-hosp', 'req-bt-hosp');
  const bloodComponent = getFieldValueHosp('req-comp-hosp', 'req-comp-hosp');
  const numberOfUnits = document.getElementById('req-units-hosp').value;
  const plateletCount = document.getElementById('req-platelet-count-hosp').value;
  const requestType = getFieldValueHosp('req-type-hosp', 'req-type-hosp');
  const urgencyLevel = getUrgencyLevelHosp();
  const requiredBy = document.getElementById('req-date-needed-hosp').value;

  const hemoglobin = normalizeWhitespaceHosp(document.getElementById('pat-hemoglobin-hosp').value);
  const hematocrit = normalizeWhitespaceHosp(document.getElementById('pat-hematocrit-hosp').value);

  const hadPreviousTransfusion = document.querySelector('input[name="prev-transfusion-hosp"]:checked')?.value === 'yes';
  const previousTransfusionDate = hadPreviousTransfusion ? document.getElementById('prev-transfusion-date-hosp').value : null;
  const previousTransfusionUnits = hadPreviousTransfusion ? document.getElementById('prev-transfusion-units-hosp').value : null;

  const hadPreviousReaction = document.querySelector('input[name="prev-reaction-hosp"]:checked')?.value === 'yes';
  const previousReactionDate = hadPreviousReaction ? document.getElementById('prev-reaction-date-hosp').value : null;
  const previousReactionDetails = hadPreviousReaction ? document.getElementById('prev-reaction-details-hosp').value.trim() : null;

  const indicationSubmission = buildIndicationSubmissionHosp(bloodComponent);
  const indication = indicationSubmission.indication;
  const indicationOtherSpecify = indicationSubmission.indicationOtherSpecify;
  const notes = document.getElementById('notes-input-hosp').value.trim();

  const requestData = {
    patientName: patientFirstName,
    patientMiddle: patientMiddleName,
    patientLast: patientLastName,
    patientSuffix: patientSuffix,

    patientBirthdate: patientBirthdate,
    patientAge: patientAge,
    patientSex: patientSex,

    ageGroup: patientType,

    wardRoom: ward || null,
    roomNo: room || null,
    patientPurok: patientPurok || null,
    patientBarangay: patientBarangay || null,
    patientMunicipality: patientMunicipality || null,
    patientProvince: patientProvince || null,

    requestingPhysician: requestingPhysician,
    clinicalImpression: diagnosis || null,

    requestCategory: requestCategory,
    bloodType: bloodType,
    bloodComponent: bloodComponent,

    numberOfUnits: numberOfUnits ? parseInt(numberOfUnits) : null,
    plateletCount: bloodComponent === 'PLATELET_CONCENTRATE' && plateletCount
      ? parseInt(plateletCount, 10)
      : null,

    requestType: requestType,
    urgencyLevel: urgencyLevel,
    requiredBy: requiredBy || null,

    hemoglobin: hemoglobin && /^\d{1,3}$/.test(hemoglobin) ? parseInt(hemoglobin, 10) : null,
    hematocrit: hematocrit && /^\.\d{1,4}$/.test(hematocrit) ? Number(`0${hematocrit}`) : null,

    hadPreviousTransfusion: hadPreviousTransfusion,
    previousTransfusionDate: previousTransfusionDate,
    previousTransfusionUnits: previousTransfusionUnits ? parseInt(previousTransfusionUnits) : null,

    hadPreviousReaction: hadPreviousReaction,
    previousReactionDate: previousReactionDate,
    previousReactionDetails: previousReactionDetails,

    indication: indication,
    indicationOtherSpecify: indicationOtherSpecify,
    notes: notes
  };

  // console.log('=== HOSPITAL BLOOD REQUEST DATA ===');
  // console.log(JSON.stringify(requestData, null, 2));

  const btn = document.getElementById('submit-btn-hosp');
  const originalText = btn.textContent;
  btn.disabled = true;
  btn.textContent = 'Submitting...';

  try {
    let uploadDocFile = docFileHosp;
    if (uploadDocFile && isCompressibleHospUpload(uploadDocFile)) {
      btn.textContent = 'Optimizing image...';
      try {
        uploadDocFile = await optimizeHospUploadFile(uploadDocFile);
      } catch (compressionError) {
        console.warn('Hospital request image optimization skipped:', compressionError);
        uploadDocFile = docFileHosp;
      }
      btn.textContent = 'Submitting...';
    }

    const formData = new FormData();
    formData.append('data', new Blob([JSON.stringify(requestData)], { type: 'application/json' }));

    if (uploadDocFile) {
      formData.append('doctorsNote', uploadDocFile, uploadDocFile.name);
    }

    const res = await fetch('/api/hospital/blood-requests', {
      method: 'POST',
      credentials: 'include',
      body: formData
    });

    const json = await res.json();

    if (!res.ok) {
      showErrorHosp(json.error || 'Submission failed. Please try again.');
      btn.disabled = false;
      btn.textContent = originalText;
      return;
    }

    // Generate reference number
    const referenceNumber = json.referenceNumber || 
      ('BR-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 100000)).padStart(5, '0'));

    // Get user email (from response or use a default)
    const userEmail = json.userEmail || 'your registered email';

    // Show success modal
    showSuccessModal(referenceNumber, userEmail);
    resetFormHosp();
    btn.disabled = false;
    btn.textContent = originalText;

    // console.log('Request submitted successfully with reference:', referenceNumber);

  } catch (err) {
    showErrorHosp('Error submitting request. Please try again.');
    console.error(err);
    btn.disabled = false;
    btn.textContent = originalText;
  }
}

// --------------------------------------------------------------
// FORM RESET
// --------------------------------------------------------------

/**
 * Reset hospital form
 */
function resetFormHosp() {
  [
    'pat-firstname-hosp', 'pat-middlename-hosp', 'pat-lastname-hosp', 'pat-suffix-hosp',
    'pat-birthdate-hosp', 'pat-sex-hosp', 'pat-ward-hosp', 'pat-room-hosp', 'pat-purok-hosp', 'pat-barangay-hosp',
    'pat-municipality-hosp', 'pat-province-hosp', 'pat-physician-hosp', 'pat-diagnosis-hosp',
    'pat-hemoglobin-hosp', 'pat-hematocrit-hosp', 'prev-transfusion-date-hosp', 'prev-transfusion-units-hosp',
    'prev-reaction-date-hosp', 'prev-reaction-details-hosp', 'req-bt-hosp', 'req-comp-hosp', 'req-date-needed-hosp',
    'req-platelet-count-hosp', 'req-indication-specify-LEUKOREDUCED_PRBC-hosp',
    'req-indication-specify-ALIQUOTED_PRBC-hosp', 'req-indication-specify-CRYOSUPERNATANT-hosp',
    'notes-input-hosp'
  ].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });

  document.querySelectorAll('#panel-newrequest input[type="radio"][id*="-hosp"], #panel-newrequest input[type="checkbox"][id*="-hosp"]').forEach(el => {
    el.checked = false;
  });

  clearFile('doc');

  clearIndicationSelectionsHosp();

  currentStepHosp = 1;
  lastIndicationGroupKeyHosp = '';
  updateStepUI();

  document.getElementById('patient-type-display-hosp').textContent = 'Select date of birth';

  document.getElementById('prev-transfusion-fields-hosp').style.display = 'none';
  document.getElementById('prev-reaction-fields-hosp').style.display = 'none';
  document.getElementById('indication-container-hosp').style.display = 'none';
  document.getElementById('platelet-count-field-hosp').style.display = 'none';
  document.getElementById('err-indication-hosp').style.display = 'none';

  const notesCount = document.getElementById('notes-char-count');
  if (notesCount) notesCount.textContent = '0';

  const submitBtn = document.getElementById('submit-btn-hosp');
  if (submitBtn) {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Submit Blood Request';
  }

  clearAllFieldErrorsHosp();
  hideErrorHosp();
}

function buildIndicationOtherSpecify() {
  return buildIndicationOtherSpecifyHosp();
}

function bindHospitalValidationInput(inputId, onInputHandler, onBlurHandler, onFocusHandler) {
  const input = document.getElementById(inputId);
  if (!input || input.dataset.validationBoundHosp === '1') return;

  input.dataset.validationBoundHosp = '1';
  if (onInputHandler) input.addEventListener('input', onInputHandler);
  if (onBlurHandler) input.addEventListener('blur', onBlurHandler);
  if (onFocusHandler) input.addEventListener('focus', onFocusHandler);
}

function attachHospitalRequestValidationListeners() {
  bindHospitalValidationInput('pat-firstname-hosp', () => validatePersonNameField('pat-firstname-hosp', 'first name', true), () => validatePersonNameField('pat-firstname-hosp', 'first name', true));
  bindHospitalValidationInput('pat-middlename-hosp', () => validatePersonNameField('pat-middlename-hosp', 'middle name', false), () => validatePersonNameField('pat-middlename-hosp', 'middle name', false));
  bindHospitalValidationInput('pat-lastname-hosp', () => validatePersonNameField('pat-lastname-hosp', 'last name', true), () => validatePersonNameField('pat-lastname-hosp', 'last name', true));
  bindHospitalValidationInput('pat-birthdate-hosp', () => clearFieldError('pat-birthdate-hosp'));
  bindHospitalValidationInput('pat-suffix-hosp', validateSuffixFieldHosp, validateSuffixFieldHosp);

  bindHospitalValidationInput('pat-purok-hosp', () => validateSimpleTextField('pat-purok-hosp', 'Purok', 25, true, /^[A-Za-z0-9 .,'#()-]*$/), () => validateSimpleTextField('pat-purok-hosp', 'Purok', 25, true, /^[A-Za-z0-9 .,'#()-]*$/));
  bindHospitalValidationInput('pat-barangay-hosp', () => validateSimpleTextField('pat-barangay-hosp', 'Barangay', 25, true, /^[A-Za-z0-9 .,'#()-]*$/), () => validateSimpleTextField('pat-barangay-hosp', 'Barangay', 25, true, /^[A-Za-z0-9 .,'#()-]*$/));
  bindHospitalValidationInput('pat-municipality-hosp', () => validateSimpleTextField('pat-municipality-hosp', 'Municipality', 25, true, /^[A-Za-z0-9 .,'#()-]*$/), () => validateSimpleTextField('pat-municipality-hosp', 'Municipality', 25, true, /^[A-Za-z0-9 .,'#()-]*$/));
  bindHospitalValidationInput('pat-province-hosp', () => validateSimpleTextField('pat-province-hosp', 'Province', 25, true, /^[A-Za-z0-9 .,'#()-]*$/), () => validateSimpleTextField('pat-province-hosp', 'Province', 25, true, /^[A-Za-z0-9 .,'#()-]*$/));
  bindHospitalValidationInput('pat-ward-hosp', () => validateSimpleTextField('pat-ward-hosp', 'Ward', 25, false, /^[A-Za-z0-9()\- ]*$/, 'Ward must not exceed 25 characters.'), () => validateSimpleTextField('pat-ward-hosp', 'Ward', 25, false, /^[A-Za-z0-9()\- ]*$/, 'Ward must not exceed 25 characters.'));
  bindHospitalValidationInput('pat-room-hosp', () => validateSimpleTextField('pat-room-hosp', 'Room number', 25, false, /^[A-Za-z0-9,\- ]*$/, 'Room number must not exceed 25 characters.'), () => validateSimpleTextField('pat-room-hosp', 'Room number', 25, false, /^[A-Za-z0-9,\- ]*$/, 'Room number must not exceed 25 characters.'));
  bindHospitalValidationInput('pat-physician-hosp', () => validatePersonNameField('pat-physician-hosp', 'requesting physician', true), () => validatePersonNameField('pat-physician-hosp', 'requesting physician', true));

  bindHospitalValidationInput('req-units-hosp', validateUnitsFieldHosp, validateUnitsFieldHosp);
  bindHospitalValidationInput('req-platelet-count-hosp', validatePlateletCountFieldHosp, validatePlateletCountFieldHosp);
  bindHospitalValidationInput('pat-diagnosis-hosp', () => validateSimpleTextField('pat-diagnosis-hosp', 'Clinical impression', 250, true, /^[A-Za-z0-9 .,'#()\-/:]*$/, 'Clinical impression must not exceed 250 characters.'), () => validateSimpleTextField('pat-diagnosis-hosp', 'Clinical impression', 250, true, /^[A-Za-z0-9 .,'#()\-/:]*$/, 'Clinical impression must not exceed 250 characters.'));

  bindHospitalValidationInput('pat-hemoglobin-hosp', () => {
    enforceHemoglobinFormatHosp();
    validateHemoglobinFieldHosp();
  }, validateHemoglobinFieldHosp);

  bindHospitalValidationInput('pat-hematocrit-hosp', () => {
    enforceHematocritFormatHosp();
    validateHematocritFieldHosp();
  }, validateHematocritFieldHosp, () => {
    const input = document.getElementById('pat-hematocrit-hosp');
    if (input && !String(input.value || '').trim()) input.value = '.';
  });

  bindHospitalValidationInput('prev-transfusion-units-hosp', validatePrevTransfusionUnitsFieldHosp, validatePrevTransfusionUnitsFieldHosp);
  bindHospitalValidationInput('prev-transfusion-date-hosp', validatePrevTransfusionDateFieldHosp, validatePrevTransfusionDateFieldHosp);
  bindHospitalValidationInput('prev-reaction-date-hosp', validatePrevReactionDateFieldHosp, validatePrevReactionDateFieldHosp);
  bindHospitalValidationInput('prev-reaction-details-hosp', validatePrevReactionDetailsRequiredFieldHosp, validatePrevReactionDetailsRequiredFieldHosp);
  bindHospitalValidationInput('req-date-needed-hosp', validateDateNeededFieldHosp, validateDateNeededFieldHosp);
  bindHospitalValidationInput('notes-input-hosp', validateNotesFieldHosp, validateNotesFieldHosp);

  document.querySelectorAll('input[name="prev-transfusion-hosp"]').forEach((radio) => {
    if (radio.dataset.validationBoundHosp === '1') return;
    radio.dataset.validationBoundHosp = '1';
    radio.addEventListener('change', () => {
      validatePrevTransfusionDateFieldHosp();
      validatePrevTransfusionUnitsFieldHosp();
    });
  });

  document.querySelectorAll('input[name="prev-reaction-hosp"]').forEach((radio) => {
    if (radio.dataset.validationBoundHosp === '1') return;
    radio.dataset.validationBoundHosp = '1';
    radio.addEventListener('change', () => {
      validatePrevReactionDateFieldHosp();
      validatePrevReactionDetailsRequiredFieldHosp();
    });
  });

  const ack = document.getElementById('ack-confirm-hosp');
  if (ack && ack.dataset.validationBoundHosp !== '1') {
    ack.dataset.validationBoundHosp = '1';
    ack.addEventListener('change', () => {
      if (ack.checked) {
        clearFieldError('ack-confirm-hosp');
        hideErrorHosp();
      }
    });
  }
}

/**
 * Sync form state (called by onchange/oninput handlers)
 */
function syncForm() {
  // Placeholder for form state sync logic
}

// --------------------------------------------------------------
// INITIALIZATION
// --------------------------------------------------------------

function initializeFormHosp() {
  attachHospitalRequestValidationListeners();

  const birthdateInput = document.getElementById('pat-birthdate-hosp');
  if (birthdateInput) {
    const today = new Date().toISOString().split('T')[0];
    const minDate = new Date();
    minDate.setFullYear(minDate.getFullYear() - 120);
    
    birthdateInput.max = today;
    birthdateInput.min = minDate.toISOString().split('T')[0];
  }
 
  const requiredByInput = document.getElementById('req-date-needed-hosp');
  if (requiredByInput) {
    requiredByInput.min = new Date().toISOString().split('T')[0];
  }
 
  if (typeof updateStepUI === 'function') {
    updateStepUI();
  }
  if (typeof updateUrgencyLevelHosp === 'function') {
    updateUrgencyLevelHosp();
  }
}
 
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeFormHosp);
} else {
  initializeFormHosp();
}
 
// ---------------------------------------------------------------
// --- 3?? MY REQUESTS TAB - ENHANCED WITH BACKEND & INDICATIONS ---
// ---------------------------------------------------------------

// Global state for sorting
let currentSort = 'date_desc';
let columnSort = {}; // Track column sort states
let reqCurrentPage = 1;
const REQ_PER_PAGE = 10;
let reqTotalPages = 1;
let reqTotalElements = 0;
let reqStatusCounts = {
    ALL: 0,
    PENDING: 0,
    NEEDS_CONFIRMATION: 0,
    APPROVED: 0,
    ALLOCATED: 0,
    READY_FOR_RELEASE: 0,
    RELEASED: 0,
    REJECTED: 0,
    CANCELLED: 0
};
let knownRequestIdsHosp = new Set();
let newRequestIdsHosp = new Set();
let hasInitializedRequestTrackerHosp = false;

function updateMyRequestsNavAlert() {
    const navItem = document.getElementById('nav-myrequests-item');
    const badge = document.getElementById('nav-myrequests-badge');
    if (!navItem || !badge) return;

    const count = newRequestIdsHosp.size;
    if (count > 0) {
        badge.style.display = 'inline-flex';
        badge.textContent = String(count);
        navItem.classList.add('has-new-requests');
    } else {
        badge.style.display = 'none';
        badge.textContent = '0';
        navItem.classList.remove('has-new-requests');
    }
}

function markRequestAsSeen(id) {
    const normalizedId = Number(id);
    if (!Number.isFinite(normalizedId)) return;
    if (!newRequestIdsHosp.has(normalizedId)) return;

    newRequestIdsHosp.delete(normalizedId);
    updateMyRequestsNavAlert();
    renderRequestTable();
}

async function trackNewHospitalRequests() {
    try {
        const params = new URLSearchParams();
        params.set('page', '1');
        params.set('size', '20');
        params.set('sort', 'date_desc');

        const response = await fetch(`/api/hospital/blood-requests?${params.toString()}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (!response.ok) return;

        const payload = await response.json();
        const latestRows = Array.isArray(payload?.data) ? payload.data : [];
        const latestIds = latestRows
            .map((row) => Number(row?.id))
            .filter((id) => Number.isFinite(id));

        if (!hasInitializedRequestTrackerHosp) {
            latestIds.forEach((id) => knownRequestIdsHosp.add(id));
            hasInitializedRequestTrackerHosp = true;
            updateMyRequestsNavAlert();
            return;
        }

        const newlyDetected = [];
        latestIds.forEach((id) => {
            if (!knownRequestIdsHosp.has(id)) {
                knownRequestIdsHosp.add(id);
                newRequestIdsHosp.add(id);
                newlyDetected.push(id);
            }
        });

        if (newlyDetected.length > 0) {
            updateMyRequestsNavAlert();
        }
    } catch (error) {
        console.error('Error tracking new hospital requests:', error);
    }
}

// --------------------------------------------------------------
// INDICATION MAP - Reference for all transfusion indications
// --------------------------------------------------------------

const INDICATION_MAP = {
    // WHOLE BLOOD (Adult)
    'WB-1': 'Active bleeding with at least 15% blood volume loss, Hb<90 g/L, or BP drop >20%',
    'WB-1a': 'Loss of over 15% of blood volume',
    'WB-1b': 'Hemoglobin less than 90 g/L',
    'WB-1c': 'Blood pressure decrease >20% and <90 mmHg systolic',
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
    'PW-1': 'Exchange transfusion in infant with indirect bilirubin =20 mg/dL in first week',
    'PW-2': 'Hyperbilirubinemia with prematurity/illness (asphyxia, acidosis, sepsis, hemolysis)',
    'PW-3': 'Other whole blood indications (requires review)',

    // PACKED RED BLOOD CELLS (Pediatric)
    'PR-1': 'Signs/symptoms of anemia (pallor, etc.)',
    'PR-2': 'Hypovolemia from acute blood loss with shock signs or >10% loss',
    'PR-3': 'Major surgery candidate with Hematocrit < 0.30 or <0.35 (nocturnal)',
    'PR-4': 'Hypertransfusion for chronic hemolytic anemia (Thalassemia)',
    'PR-5': 'Hemoglobin =130 g/L and on assisted ventilation',
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

// --------------------------------------------------------------
// INDICATION UTILITY FUNCTIONS
// --------------------------------------------------------------

/**
 * Format indications string into array of descriptions
 * @param {string} indicationString - Comma-separated codes (e.g., "R-1,R-2a,R-3")
 * @returns {array} Array of description strings
 */
function escapeIndicationTextHosp(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
}

function parseIndicationOtherSpecifyHosp(indicationOtherSpecify) {
    if (!indicationOtherSpecify) return {};

    return indicationOtherSpecify
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .reduce((map, pair) => {
            const separatorIndex = pair.indexOf(':');
            if (separatorIndex === -1) return map;

            const code = pair.slice(0, separatorIndex).trim();
            const note = pair.slice(separatorIndex + 1).trim();
            if (code && note) {
                map[code] = note;
            }
            return map;
        }, {});
}

function isSpecifyOnlyIndicationCodeHosp(code) {
    return typeof code === 'string' && code.endsWith('_SPECIFY');
}

function formatIndications(indicationString, indicationOtherSpecify) {
    if (!indicationString) return [];

    const noteMap = parseIndicationOtherSpecifyHosp(indicationOtherSpecify);
    const codes = indicationString.split(',').map(s => s.trim()).filter(Boolean);
    const descriptions = codes.map(code => {
        const note = noteMap[code];
        if (isSpecifyOnlyIndicationCodeHosp(code) && note) {
            return note;
        }
        return INDICATION_MAP[code] || (note ? note : code);
    }).filter(Boolean);

    return descriptions.length > 0 ? descriptions : [];
}

/**
 * Generate HTML badges for indication codes
 * @param {string} indicationString - Comma-separated codes
 * @returns {string} HTML string with badges
 */
function getIndicationBadges(indicationString, indicationOtherSpecify) {
    if (!indicationString) return '';

    const noteMap = parseIndicationOtherSpecifyHosp(indicationOtherSpecify);
    const codes = indicationString
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
        .filter(code => !(isSpecifyOnlyIndicationCodeHosp(code) && noteMap[code]));

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
function renderIndicationDetails(indicationString, indicationOtherSpecify) {
    if (!indicationString) {
        return '<span class="req-details-value">Not specified</span>';
    }

    const codes = indicationString.split(',').map(s => s.trim()).filter(Boolean);
    const noteMap = parseIndicationOtherSpecifyHosp(indicationOtherSpecify);
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

        if (code === parentCode) {
            grouped[parentCode].main = code;
        } else {
            grouped[parentCode].subs.push(code);
        }
    });

    let html = '<div style="display:flex;flex-direction:column;gap:12px;">';

    Object.keys(grouped).sort().forEach(parentCode => {
        const group = grouped[parentCode];
        const mainCode = group.main || parentCode;
        const mainDescription = INDICATION_MAP[mainCode] || '';
        const mainNote = noteMap[mainCode];
        const subCodes = group.subs;

        if (isSpecifyOnlyIndicationCodeHosp(mainCode) && mainNote) {
            html += `
                <div style="padding:12px;background:var(--subtle,#f9f9f9);border-left:3px solid var(--blue,#0066cc);border-radius:4px">
                    <div style="font-size:13px;color:var(--charcoal,#2a2a2a);line-height:1.5">
                        ${escapeIndicationTextHosp(mainNote)}
                    </div>
                </div>
            `;
            return;
        }

        if (subCodes.length > 0) {
            html += `
                <div style="padding:12px;background:var(--subtle,#f9f9f9);border-left:3px solid var(--blue,#0066cc);border-radius:4px">
                    <div style="font-weight:600;color:var(--blue,#0066cc);margin-bottom:8px;font-size:13px">
                        ${mainCode}
                    </div>
                    <div style="font-size:13px;color:var(--charcoal,#2a2a2a);line-height:1.5;margin-bottom:12px">
                        ${mainDescription}
                    </div>
                    ${mainNote ? `
                        <div style="font-size:12px;color:var(--charcoal,#2a2a2a);line-height:1.5;margin-bottom:12px;padding:8px 10px;background:#fff;border:1px solid var(--border,#e0e0e0);border-radius:4px">
                            ${escapeIndicationTextHosp(mainNote)}
                        </div>
                    ` : ''}
                    <div style="display:flex;flex-direction:column;gap:8px;margin-left:12px;border-left:2px solid var(--border,#e0e0e0);padding-left:12px;">
            `;

            subCodes.forEach(code => {
                const subLetter = code.replace(parentCode, '').toLowerCase();
                const subDescription = INDICATION_MAP[code] || code;
                const subNote = noteMap[code];
                html += `
                    <div>
                        <div style="font-weight:600;color:var(--muted,#666);font-size:12px;margin-bottom:2px">
                            ${subLetter}.
                        </div>
                        <div style="font-size:12px;color:var(--charcoal,#2a2a2a);line-height:1.4">
                            ${subDescription}
                        </div>
                        ${subNote ? `
                            <div style="font-size:12px;color:var(--charcoal,#2a2a2a);line-height:1.5;margin-top:6px;padding:8px 10px;background:#fff;border:1px solid var(--border,#e0e0e0);border-radius:4px">
                                ${escapeIndicationTextHosp(subNote)}
                            </div>
                        ` : ''}
                    </div>
                `;
            });

            html += `
                    </div>
                </div>
            `;
        } else {
            html += `
                <div style="padding:12px;background:var(--subtle,#f9f9f9);border-left:3px solid var(--blue,#0066cc);border-radius:4px">
                    <div style="font-weight:600;color:var(--blue,#0066cc);margin-bottom:4px;font-size:13px">
                        ${mainCode}
                    </div>
                    <div style="font-size:13px;color:var(--charcoal,#2a2a2a);line-height:1.5">
                        ${mainDescription}
                    </div>
                    ${mainNote ? `
                        <div style="font-size:12px;color:var(--charcoal,#2a2a2a);line-height:1.5;margin-top:10px;padding:8px 10px;background:#fff;border:1px solid var(--border,#e0e0e0);border-radius:4px">
                            ${escapeIndicationTextHosp(mainNote)}
                        </div>
                    ` : ''}
                </div>
            `;
        }
    });

    html += '</div>';
    return html;
}

// --------------------------------------------------------------
// BACKEND INTEGRATION - Load requests from API
// --------------------------------------------------------------

/**
 * Load hospital blood requests from backend
 * Transforms API response to match local REQUESTS format
 */
async function loadHospitalRequests(options = {}) {
    const {
        resetPage = false
    } = options;
    if (resetPage) reqCurrentPage = 1;

    try {
        const search = (document.getElementById('req-search')?.value || '').trim();
        const bloodType = document.getElementById('req-filter-blood-type')?.value || 'ALL';
        const component = document.getElementById('req-filter-component')?.value || 'ALL';
        const urgency = document.getElementById('req-filter-urgency')?.value || 'ALL';

        const params = new URLSearchParams();
        params.set('page', String(reqCurrentPage));
        params.set('size', String(REQ_PER_PAGE));
        params.set('sort', currentSort || 'date_desc');
        if (currentFilter && currentFilter !== 'ALL') params.set('status', currentFilter);
        if (search) params.set('search', search);
        if (bloodType !== 'ALL') params.set('bloodType', bloodType);
        if (component !== 'ALL') params.set('component', component);
        if (urgency !== 'ALL') params.set('urgency', urgency);

        const response = await fetch(`/api/hospital/blood-requests?${params.toString()}`, {
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

        const payload = await response.json();
        const rows = Array.isArray(payload?.data) ? payload.data : [];

        reqCurrentPage = Number(payload?.currentPage || reqCurrentPage || 1);
        reqTotalPages = Math.max(Number(payload?.totalPages || 1), 1);
        reqTotalElements = Number(payload?.totalElements || 0);

        // Transform backend response to match local REQUESTS format
        REQUESTS = rows.map(req => ({
            id: req.id,
            referenceNumber: req.referenceNumber,
            patientName: req.patientName,
            patientAge: req.patientAge, 
            patientSex: req.patientSex,
            wardRoom: req.wardRoom || '',
            roomNo: req.roomNo || '',
            patientPurok: req.patientPurok || '',
            patientBarangay: req.patientBarangay || '',
            patientMunicipality: req.patientMunicipality || '',
            patientProvince: req.patientProvince || '',
            requestingPhysician: req.requestingPhysician,
            ageGroup: req.ageGroup,
            requestCategory: req.requestCategory,
            bloodType: req.bloodType,
            bloodComponent: req.bloodComponent,
            numberOfUnits: req.numberOfUnits,
            approvedUnits: req.approvedUnits ?? null,
            effectiveUnits: req.patientAcceptedRemarks === true && Number.isInteger(req.approvedUnits) && req.approvedUnits > 0
                ? req.approvedUnits
                : (req.numberOfUnits || 0),
            plateletCount: req.plateletCount ?? null,
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
            indicationOtherSpecify: req.indicationOtherSpecify || null,
            
            // Requester info (NEW)
            requesterName: req.requesterName || null,
            requesterRelationship: req.requesterRelationship || null,
            requesterContact: req.requesterContact || null,
            requesterEmail: req.requesterEmail || null,
            requesterType: req.requesterType || null,
            
            // Fulfillment & rejection
            approvalRemarks: req.approvalRemarks || null,
            alternativeComponentSuggestion: req.alternativeComponentSuggestion || null,
            patientAcceptedRemarks: req.patientAcceptedRemarks ?? null,
            patientRespondedAt: req.patientRespondedAt || null,
            confirmationEmailSentAt: req.confirmationEmailSentAt || null,
            rejectionReason: req.rejectionReason || null,
            reviewedAt: req.reviewedAt || null,
            fulfilledByBag: req.fulfilledByBag || null,
            reservedBags: Array.isArray(req.reservedBags)
                ? req.reservedBags
                : (req.fulfilledByBag ? [req.fulfilledByBag] : [])
        }));

        REQUESTS.forEach((req) => {
            const id = Number(req?.id);
            if (Number.isFinite(id)) knownRequestIdsHosp.add(id);
        });

        await trackNewHospitalRequests();

        await loadHospitalRequestStatusCounts({
            search,
            bloodType,
            component,
            urgency
        });

        renderDashboard();
        renderRequestTable();

    } catch (error) {
        console.error('Error loading hospital requests:', error);
    }
}

async function loadHospitalRequestStatusCounts({ search, bloodType, component, urgency }) {
    try {
        const params = new URLSearchParams();
        if (search) params.set('search', search);
        if (bloodType && bloodType !== 'ALL') params.set('bloodType', bloodType);
        if (component && component !== 'ALL') params.set('component', component);
        if (urgency && urgency !== 'ALL') params.set('urgency', urgency);

        const response = await fetch(`/api/hospital/blood-requests/status-counts?${params.toString()}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include'
        });
        if (!response.ok) return;

        const counts = await response.json();
        reqStatusCounts = {
            ...reqStatusCounts,
            ...(counts || {})
        };
    } catch (error) {
        console.error('Error loading request status counts:', error);
    }
}

// --------------------------------------------------------------
// Filter & Sort UI Management
// --------------------------------------------------------------

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
    const ids = ['req-filter-blood-type', 'req-filter-component', 'req-filter-urgency', 'req-sort', 'req-search'];
    ids.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === 'req-search') el.value = '';
        else if (id === 'req-sort') el.value = 'date_desc';
        else el.value = 'ALL';
    });

    currentSort = 'date_desc';
    reqCurrentPage = 1;
    const allChip = document.querySelector('#req-filters .req-filter');
    filterRequests('ALL', allChip || null);
}

/**
 * Apply all filters and sorting together
 */
function applyFiltersAndSort() {
    const sortEl = document.getElementById('req-sort');
    currentSort = sortEl ? sortEl.value : currentSort;
    reqCurrentPage = 1;
    loadHospitalRequests({ resetPage: true });
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
        'date': 'date'
    };
    
    currentSort = sortMap[column] + (columnSort[column] === 'desc' ? '-desc' : '');
    
    // Update visual indicators
    updateSortIndicators(column);
    
    loadHospitalRequests({ resetPage: true });
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
                indicator.textContent = columnSort[col] === 'asc' ? ' ?' : ' ?';
                indicator.style.color = 'var(--blue)';
            } else {
                indicator.textContent = '';
            }
        }
    });
}

// --------------------------------------------------------------
// Advanced Filtering & Sorting Logic
// --------------------------------------------------------------

/**
 * Enhanced filter and display blood requests with multiple filter options
 */
function filterRequests(filter, btn) {
    const prevFilter = currentFilter;
    currentFilter = filter;
    document.querySelectorAll('#req-filters .req-filter').forEach((b) => b.classList.remove('active-filter'));
    if (btn) {
        btn.classList.add('active-filter');
    }
    if (prevFilter !== filter) {
        reqCurrentPage = 1;
    }

    loadHospitalRequests({ resetPage: prevFilter !== filter });
}

function renderRequestTable() {
    updateRequestFilterCounts();

    const list = REQUESTS;
    document.getElementById('req-count').textContent = `${reqTotalElements} total`;
    const resultsInfo = document.getElementById('req-results-info');
    if (resultsInfo) {
        const scope = currentFilter === 'ALL'
            ? `${reqTotalElements} total requests`
            : `${reqTotalElements} request(s) in ${currentFilter.replaceAll('_', ' ').toLowerCase()}`;
        resultsInfo.textContent = scope;
    }

    updateRequestStats(list);

    const tbody = document.getElementById('requests-tbody');
    const empty = document.getElementById('req-empty');
    const total = reqTotalElements;
    const totalPages = reqTotalPages;

    if (!total || !list.length) {
        if (tbody) tbody.innerHTML = '';
        if (empty) empty.style.display = 'block';
        reqUpdatePaginationUi(0, 0, 0, 0);
        return;
    }

    if (empty) empty.style.display = 'none';
    if (!tbody) return;

    tbody.innerHTML = list.map(r => {
        const sc = STATUS_CFG[r.status];
        const urg = URGENCY_BADGE[r.urgencyLevel];
        const isNew = newRequestIdsHosp.has(Number(r.id));
        return `<tr class="${isNew ? 'req-row-new' : ''}">
            <td style="font-size:14px;font-weight:600;color:var(--charcoal)">${r.referenceNumber}${isNew ? '<span class="new-request-pill">New</span>' : ''}</td>
            <td>
                <div style="font-weight:600">${r.patientName}</div>
                <div style="font-size:11px;color:var(--muted)">${CAT_LABELS[r.requestCategory]} - ${r.ageGroup}</div>
            </td>
            <td>${COMP_LABELS[r.bloodComponent]}</td>
            <td><span style="font-size:13px;font-weight:600;color:var(--charcoal)">${formatBloodTypeDisplayHosp(r.bloodType)}</span></td>
            <td style="font-weight:700">${formatUnitsDisplayHosp(r)}</td>
            <td><span class="badge ${urg}">${URGENCY_LABELS[r.urgencyLevel]}</span></td>
            <td><span class="badge badge-${r.status.toLowerCase().replace(/_/g, '-')}">${sc.icon} ${sc.label}</span></td>
            <td style="font-size:12px;color:var(--muted)">${formatDate(r.requestedAt)}</td>
            <td>
                <div style="display:flex;gap:6px">
                    <button class="btn-ghost" style="font-size:11px;padding:5px 10px" onclick="openRequestDetail(${r.id})">View</button>
                    ${r.doctorsNoteUrl ? `<button class="btn-ghost" style="font-size:11px;padding:5px 10px" onclick="window.reqViewDoc('${r.doctorsNoteUrl}', 'Doctor\\'s Note - ${r.referenceNumber}')">?? Doc</button>` : ''}
                </div>
            </td>
        </tr>`;
    }).join('');

    const start = ((reqCurrentPage - 1) * REQ_PER_PAGE) + 1;
    const end = start + list.length - 1;
    reqUpdatePaginationUi(start, end, total, totalPages);
}

function updateRequestFilterCounts() {
    const counters = {
        all: Number(reqStatusCounts.ALL || 0),
        pending: Number(reqStatusCounts.PENDING || 0),
        needs_confirmation: Number(reqStatusCounts.NEEDS_CONFIRMATION || 0),
        approved: Number(reqStatusCounts.APPROVED || 0),
        allocated: Number(reqStatusCounts.ALLOCATED || 0),
        ready_for_release: Number(reqStatusCounts.READY_FOR_RELEASE || 0),
        released: Number(reqStatusCounts.RELEASED || 0),
        rejected: Number(reqStatusCounts.REJECTED || 0),
        cancelled: Number(reqStatusCounts.CANCELLED || 0)
    };

    Object.entries(counters).forEach(([key, value]) => {
        const el = document.getElementById(`req-cnt-${key}`);
        if (el) el.textContent = String(value);
    });
}

function reqUpdatePaginationUi(start, end, total, totalPages) {
    const showingEl = document.getElementById('req-showing');
    const pageLabelEl = document.getElementById('req-page-label');
    const prevBtn = document.getElementById('req-prev');
    const nextBtn = document.getElementById('req-next');

    if (showingEl) {
        showingEl.textContent = total
            ? `Showing ${start}-${end} of ${total}`
            : 'No matching requests';
    }
    if (pageLabelEl) pageLabelEl.textContent = `${reqCurrentPage} / ${Math.max(totalPages, 1)}`;
    if (prevBtn) prevBtn.disabled = reqCurrentPage <= 1 || total === 0;
    if (nextBtn) nextBtn.disabled = reqCurrentPage >= totalPages || total === 0;
}

function reqPrevPage() {
    if (reqCurrentPage <= 1) return;
    reqCurrentPage -= 1;
    loadHospitalRequests();
}

function reqNextPage() {
    if (reqCurrentPage >= reqTotalPages) return;
    reqCurrentPage += 1;
    loadHospitalRequests();
}

/**
 * Update quick statistics display
 */
function updateRequestStats(list) {
    const statsRow = document.getElementById('req-stats');
    
    // Count statistics
    const pending = list.filter(r => ['PENDING','APPROVED','NEEDS_CONFIRMATION','ALLOCATED','READY_FOR_RELEASE'].includes(r.status)).length;
    const critical = list.filter(r => r.urgencyLevel === 'CRITICAL').length;
    const released = list.filter(r => r.status === 'RELEASED').length;
    const totalUnits = list.reduce((sum, r) => sum + getEffectiveUnitsHosp(r), 0);
    
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

// --------------------------------------------------------------
// REQUEST DETAIL MODAL - ENHANCED WITH ALL SECTIONS
// --------------------------------------------------------------

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
    markRequestAsSeen(id);
    const r = REQUESTS.find(x => x.id === id);
    if (!r) return;
    
    const sc = STATUS_CFG[r.status];
    const urg = URGENCY_LABELS[r.urgencyLevel];
    
    // ---------------------------------------------
    // HEADER & STATUS STRIP
    // ---------------------------------------------
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
    
    // ---------------------------------------------
    // SECTION: REQUEST STATUS
    // ---------------------------------------------
    document.getElementById('rd-blood').textContent = BT_LABELS[r.bloodType];
    document.getElementById('rd-urgency').innerHTML = `<span class="badge ${URGENCY_BADGE[r.urgencyLevel]}">${urg}</span>`;
    document.getElementById('rd-status-badge').innerHTML = `<span class="badge badge-${r.status.toLowerCase().replace(/_/g, '-')}">${sc.icon} ${sc.label}</span>`;
    document.getElementById('rd-request-type').textContent = r.requestType || '-';
    document.getElementById('rd-submitted-date').textContent = formatDate(r.requestedAt) || '-';
    document.getElementById('rd-required').textContent = r.requiredBy ? formatDate(r.requiredBy) : 'As soon as possible';
    
    // ---------------------------------------------
    // SECTION: PATIENT INFORMATION
    // ---------------------------------------------
    document.getElementById('rd-patient').textContent = r.patientName || '-';
    document.getElementById('rd-patient-age').textContent = 
        (r.patientAge || '-') + (r.ageGroup ? ` (${r.ageGroup})` : '');
    document.getElementById('rd-patient-sex').textContent = r.patientSex || '-';
    const wardRoomLabel = [r.wardRoom, r.roomNo].filter(Boolean).join(' / ');
    document.getElementById('rd-ward-room').textContent = wardRoomLabel || '-';
    const addressLabel = [r.patientPurok, r.patientBarangay, r.patientMunicipality, r.patientProvince]
        .filter(Boolean)
        .join(' / ');
    document.getElementById('rd-patient-address').textContent = addressLabel || '-';
    document.getElementById('rd-cat').textContent = formatCategoryLabelHosp(r.requestCategory);
    document.getElementById('rd-physician').textContent = r.requestingPhysician || '-';
    
    // ---------------------------------------------
    // SECTION: BLOOD REQUIREMENTS
    // ---------------------------------------------
    document.getElementById('rd-comp').textContent = COMP_LABELS[r.bloodComponent] || r.bloodComponent || '-';
    if (Number.isInteger(r.approvedUnits) && r.approvedUnits > 0 && r.approvedUnits !== r.numberOfUnits) {
        document.getElementById('rd-units').textContent = `${r.approvedUnits} unit(s) approved of ${r.numberOfUnits} requested`;
    } else {
        document.getElementById('rd-units').textContent = getEffectiveUnitsHosp(r) ? `${getEffectiveUnitsHosp(r)} unit(s)` : '-';
    }
    
       
    // ---------------------------------------------
    const plateletCountBox = document.getElementById('rd-platelet-count-box');
    if (r.bloodComponent === 'PLATELET_CONCENTRATE') {
        plateletCountBox.style.display = 'block';
        document.getElementById('rd-platelet-count').textContent =
            r.plateletCount !== null && r.plateletCount !== undefined && r.plateletCount !== ''
                ? r.plateletCount
                : '-';
    } else {
        plateletCountBox.style.display = 'none';
    }

    // SECTION: ADDITIONAL NOTES
    // ---------------------------------------------
    const notesDisplay = document.getElementById('rd-notes-display');
    const noteSections = [];
    if (r.notes && r.notes.trim() !== '') {
        noteSections.push(`
            <div style="margin-bottom:${r.approvalRemarks ? '14px' : '0'};white-space:pre-wrap;color:var(--charcoal)">
                ${escapeIndicationTextHosp(r.notes)}
            </div>
        `);
    }
    if (r.approvalRemarks) {
        const confirmationState = r.status === 'NEEDS_CONFIRMATION'
            ? 'Waiting for requester confirmation'
            : r.patientAcceptedRemarks === true
                ? 'Requester accepted via email'
                : r.patientAcceptedRemarks === false
                    ? 'Requester rejected via email'
                    : 'Approval update sent to requester';
        noteSections.push(`
            <div style="border:1px solid var(--border);border-radius:10px;background:white;padding:12px 14px">
                <div style="font-size:11px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--muted);margin-bottom:8px">Approval Update</div>
                <div style="color:var(--charcoal);line-height:1.6">
                    <div><strong>Requested Units:</strong> ${r.numberOfUnits ?? '-'}</div>
                    <div><strong>Approved Units:</strong> ${r.approvedUnits ?? r.numberOfUnits ?? '-'}</div>
                    <div><strong>Remarks:</strong> ${escapeIndicationTextHosp(r.approvalRemarks)}</div>
                    <div><strong>Units:</strong> ${formatUnitsDisplayHosp(r)} unit(s)</div>
                    ${r.alternativeComponentSuggestion ? `<div><strong>Alternative Component:</strong> ${escapeIndicationTextHosp(r.alternativeComponentSuggestion)}</div>` : ''}
                    <div><strong>Confirmation:</strong> ${confirmationState}</div>
                    ${r.patientRespondedAt ? `<div><strong>Requester Responded:</strong> ${formatDate(r.patientRespondedAt)}</div>` : ''}
                </div>
            </div>
        `);
    }
    if (noteSections.length > 0) {
        notesDisplay.innerHTML = noteSections.join('');
    } else {
        notesDisplay.innerHTML = '<div style="color:var(--muted)">-</div>';
    }
    
    // ---------------------------------------------
    // SECTION: TRANSFUSION INDICATIONS
    // ---------------------------------------------
    const indicationsSection = document.getElementById('rd-indications-section');
    if (r.indication) {
        const indCodes = r.indication.split(',').map(c => c.trim()).filter(c => c);
        if (indCodes.length > 0) {
            indicationsSection.style.display = 'block';
            
            // Build indication details with grouped hierarchy
            document.getElementById('rd-indication-details').innerHTML =
                renderIndicationDetails(r.indication, r.indicationOtherSpecify);
        } else {
            indicationsSection.style.display = 'none';
        }
    } else {
        indicationsSection.style.display = 'none';
    }
    
    // ---------------------------------------------
    // SECTION: CLINICAL INFORMATION
    // ---------------------------------------------
    document.getElementById('rd-clinical-impression').textContent = r.clinicalImpression || '-';
    document.getElementById('rd-hemoglobin').textContent = r.hemoglobin ? `${r.hemoglobin} g/L` : '-';
    document.getElementById('rd-hematocrit').textContent = r.hematocrit 
        ? `${(r.hematocrit * 100).toFixed(1)}%` 
        : '-';
    
    // ---------------------------------------------
    // SECTION: TRANSFUSION HISTORY
    // ---------------------------------------------
    const hasPrevTransfusion = r.hadPreviousTransfusion === true;
    document.getElementById('rd-previous-transfusion').textContent = hasPrevTransfusion ? 'Yes' : 'No';
    
    const transfusionDateBox = document.getElementById('rd-transfusion-date-box');
    const transfusionUnitsBox = document.getElementById('rd-transfusion-units-box');
    
    if (hasPrevTransfusion) {
        transfusionDateBox.style.display = 'block';
        transfusionUnitsBox.style.display = 'block';
        document.getElementById('rd-transfusion-date').textContent = 
            r.previousTransfusionDate ? formatDate(r.previousTransfusionDate) : '-';
        document.getElementById('rd-transfusion-units').textContent = 
            r.previousTransfusionUnits ? `${r.previousTransfusionUnits} unit(s)` : '-';
    } else {
        transfusionDateBox.style.display = 'none';
        transfusionUnitsBox.style.display = 'none';
    }
    
    // ---------------------------------------------
    // SECTION: REACTION HISTORY
    // ---------------------------------------------
    const hasPrevReaction = r.hadPreviousReaction === true;
    document.getElementById('rd-previous-reaction').textContent = hasPrevReaction ? 'Yes' : 'No';
    
    const reactionDateBox = document.getElementById('rd-reaction-date-box');
    const reactionDetailsBox = document.getElementById('rd-reaction-details-box');
    
    if (hasPrevReaction) {
        reactionDateBox.style.display = 'block';
        reactionDetailsBox.style.display = 'block';
        document.getElementById('rd-reaction-date').textContent = 
            r.previousReactionDate ? formatDate(r.previousReactionDate) : '-';
        document.getElementById('rd-reaction-details').textContent = 
            r.previousReactionDetails || '-';
    } else {
        reactionDateBox.style.display = 'none';
        reactionDetailsBox.style.display = 'none';
    }
    
    // ---------------------------------------------
    // SECTION: INDICATION OTHER (SPECIFY) DETAILS
    // ---------------------------------------------
    const indicationOtherSection = document.getElementById('rd-indication-other-section');
    if (false && r.indicationOtherSpecify) {
        indicationOtherSection.style.display = 'block';
        
        // Parse the format: "WB-2:reason1,R-5:reason2,P-6:reason3"
        const otherSpecifyPairs = r.indicationOtherSpecify.split(',').map(pair => pair.trim());
        let otherSpecifyHTML = '';
        
        otherSpecifyPairs.forEach((pair, index) => {
            if (pair.includes(':')) {
                const [code, text] = pair.split(':', 2).map(s => s.trim());
                otherSpecifyHTML += `
                    <div style="margin-bottom:10px">
                        <span style="font-weight:600;color:var(--charcoal)">${code}:</span>
                        <span style="color:var(--charcoal)">${text}</span>
                    </div>
                `;
            }
        });
        
        if (otherSpecifyHTML === '') {
            otherSpecifyHTML = '<div style="color:var(--muted)">-</div>';
        }
        
        document.getElementById('rd-indication-other-details').innerHTML = otherSpecifyHTML;
    } else if (indicationOtherSection) {
        indicationOtherSection.style.display = 'none';
    }
    
    // ---------------------------------------------
    // SECTION: REQUESTER INFORMATION
    // ---------------------------------------------
    if (false && r.indicationOtherSpecify) {
        const noteMap = parseIndicationOtherSpecifyHosp(r.indicationOtherSpecify);
        const otherSpecifyItems = Object.entries(noteMap).filter(([code]) => !isSpecifyOnlyIndicationCodeHosp(code));

        if (otherSpecifyItems.length > 0) {
            indicationOtherSection.style.display = 'block';
            document.getElementById('rd-indication-other-details').innerHTML = otherSpecifyItems
                .map(([, text]) => `
                    <div style="margin-bottom:10px;color:var(--charcoal)">
                        ${escapeIndicationTextHosp(text)}
                    </div>
                `)
                .join('') || '<div style="color:var(--muted)">-</div>';
        } else {
            indicationOtherSection.style.display = 'none';
        }
    }

    document.getElementById('rd-requester-name').textContent = r.requesterName || '-';
    document.getElementById('rd-requester-contact').textContent = r.requesterContact || '-';
    document.getElementById('rd-requester-email').textContent = r.requesterEmail || '-';
    document.getElementById('rd-requester-type').textContent = r.requesterType || '-';
    
    // ---------------------------------------------
    // REJECTION REASON (if applicable)
    // ---------------------------------------------
    const rejBox = document.getElementById('rd-rejection-box');
    if (r.rejectionReason && ['REJECTED', 'CANCELLED'].includes(r.status)) {
        rejBox.style.display = 'block';
        document.getElementById('rd-rejection-title').textContent =
            r.status === 'CANCELLED' ? 'Cancellation Note' : 'Rejection Reason';
        document.getElementById('rd-rejection-text').textContent = r.rejectionReason;
    } else {
        rejBox.style.display = 'none';
    }
    
    // ---------------------------------------------
    // FULFILLED BY BAG (if applicable)
    // ---------------------------------------------
    const fulBox = document.getElementById('rd-fulfilled-box');
    const reservedBags = Array.isArray(r.reservedBags)
        ? r.reservedBags
        : (r.fulfilledByBag ? [r.fulfilledByBag] : []);
    if (reservedBags.length > 0 && ['ALLOCATED', 'READY_FOR_RELEASE', 'RELEASED'].includes(r.status)) {
        fulBox.style.display = 'block';
        if (!r.fulfilledByBag) {
            r.fulfilledByBag = reservedBags[0];
        }
        document.getElementById('rd-bag-id').textContent = r.fulfilledByBag.id || '-';
        document.getElementById('rd-released-at').textContent = 
            r.fulfilledByBag.dispensedAt ? formatDate(r.fulfilledByBag.dispensedAt) : '-';
        const bagLabel = reservedBags.map(b => b.serialNumber || b.id || '—').join(', ');
        const firstDispensedAt = reservedBags.find(b => b.dispensedAt)?.dispensedAt;
        const statusTimestamp = firstDispensedAt || r.reviewedAt || null;
        document.getElementById('rd-fulfilled-title').textContent =
            r.status === 'RELEASED' ? 'Released Blood Bags' : 'Allocated Blood Bags';
        document.getElementById('rd-bag-label').textContent =
            reservedBags.length > 1 ? 'Bag Serials' : 'Bag Serial';
        document.getElementById('rd-fulfilled-time-label').textContent =
            r.status === 'RELEASED' ? 'Released' : 'Updated';
        document.getElementById('rd-bag-id').textContent = bagLabel;
        document.getElementById('rd-released-at').textContent =
            statusTimestamp ? formatDate(statusTimestamp) : '—';
    } else {
        fulBox.style.display = 'none';
    }
    
    // ---------------------------------------------
    // DOCTOR'S NOTE / REQUEST DOCUMENT
    // ---------------------------------------------
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
    
    // ---------------------------------------------
    // CANCEL BUTTON (only for PENDING status)
    // ---------------------------------------------
    // const cancelRow = document.getElementById('rd-cancel-row');
    // if (r.status === 'PENDING') {
    //     cancelRow.style.display = 'block';
    //     document.getElementById('rd-cancel-btn').onclick = () => {
    //         cancelTargetId = r.id;
    //         closeModal('requestDetailModal');
    //         openModal('cancelConfirmModal');
    //     };
    // } else {
    //     cancelRow.style.display = 'none';
    // }
    
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

// --------------------------------------------------------------
// Document Viewer
// --------------------------------------------------------------

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
            onerror="this.parentElement.innerHTML='<div style=\\'padding:40px;text-align:center;color:var(--muted);font-size:13px\\'>Preview unavailable - <a href=\\'${url}\\' target=\\'_blank\\' style=\\'color:var(--blue)\\'>open directly ?</a></div>'" />`;
    }
    
    openModal('req-doc-modal');
};

// --------------------------------------------------------------
// HELPER: Format dates
// --------------------------------------------------------------

/**
 * Format date for display
 * Expected format: "Mar 15, 2026" or similar
 */

// ---------------------------------------------------------------
// --- 4?? HOSPITAL PROFILE TAB ---
// ---------------------------------------------------------------

let currentProfileData = null;



function loadProfileDataWhenShown() {
    // This will be called when profile panel becomes active
    if (document.getElementById('panel-profile').classList.contains('active')) {
        loadHospitalProfile();
    }
}

function updateSidebarUserCard(profile) {
    const hospitalName = (profile?.hospitalName || '').trim() || 'Hospital';
    const initials = hospitalName
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map(part => part.charAt(0).toUpperCase())
        .join('') || 'HP';

    const avatarEl = document.getElementById('sidebar-user-avatar');
    const nameEl = document.getElementById('sidebar-user-name');
    const typeEl = document.getElementById('sidebar-user-type');

    if (avatarEl) avatarEl.textContent = initials;
    if (nameEl) nameEl.textContent = hospitalName;
    if (typeEl) typeEl.textContent = 'Hospital Account';
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
    updateSidebarUserCard(data);

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
    document.getElementById('profile-location-tag').textContent = `?? ${data.city || 'City'}, ${data.province || 'Province'}`;
    
    // Province
    document.getElementById('profile-province-input').value = data.province || '';
    
    // Phone
    document.getElementById('profile-phone-input').value = formatProfilePhoneValue(data.phoneNumber || '');
    
    // Contact person
    document.getElementById('profile-contact-name-input').value = data.contactPersonName || '';
    document.getElementById('profile-contact-phone-input').value = formatProfilePhoneValue(data.contactPersonPhone || '');
    
    clearProfileFieldErrors();
    
    // // Verified status
    // if (data.emailVerified) {
    //     document.getElementById('profile-verified-display').textContent = '? Verified';
    //     document.getElementById('profile-verified-tag').textContent = '? Verified';
    // } else {
    //     document.getElementById('profile-verified-display').textContent = '? Pending';
    //     document.getElementById('profile-verified-tag').textContent = '? Pending';
    // }
    
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

// --------------------------------------------------------------
// Save Profile Modal & Confirmation
// --------------------------------------------------------------

const profileTextLimits = {
    'profile-hospital-name-input': { label: 'Hospital name', max: 25, required: true },
    'profile-address-input': { label: 'Complete address', max: 50, required: true },
    'profile-city-input': { label: 'City / Municipality', max: 25, required: true },
    'profile-province-input': { label: 'Province / Region', max: 25, required: true },
    'profile-email-input': { label: 'Email address', max: 50, required: true }
};

function clearProfileFieldErrors() {
    firstInvalidFieldHosp = null;
    document.querySelectorAll('#panel-profile .field-error').forEach((el) => el.classList.remove('field-error'));
    document.querySelectorAll('#panel-profile .form-inline-error').forEach((el) => {
        el.textContent = '';
        el.classList.remove('show');
    });
}

function enforceProfileTextLimit(inputId) {
    const input = document.getElementById(inputId);
    const config = profileTextLimits[inputId];
    if (!input || !config) return;

    input.value = normalizeWhitespaceHosp(input.value).slice(0, config.max);
    clearFieldError(inputId);
}

function validateProfileTextField(inputId) {
    const input = document.getElementById(inputId);
    const config = profileTextLimits[inputId];
    if (!input || !config) return true;

    input.value = normalizeWhitespaceHosp(input.value).trim();
    clearFieldError(inputId);

    if (!input.value) {
        if (config.required) {
            setFieldError(inputId, `${config.label} is required.`);
            return false;
        }
        return true;
    }

    if (input.value.length > config.max) {
        setFieldError(inputId, `${config.label} must not exceed ${config.max} characters.`);
        return false;
    }

    if (hasScriptLikeInputHosp(input.value)) {
        setFieldError(inputId, `${config.label} contains invalid characters.`);
        return false;
    }

    return true;
}

function validateProfileEmailField() {
    const input = document.getElementById('profile-email-input');
    if (!input) return true;

    const valid = validateProfileTextField('profile-email-input');
    if (!valid || !input.value) return valid;

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.value)) {
        setFieldError('profile-email-input', 'Please enter a valid email address.');
        return false;
    }

    return true;
}

function formatProfilePhoneValue(value) {
    let digits = String(value || '').replace(/\D/g, '');

    if (digits.startsWith('63')) {
        digits = digits.slice(2);
    }
    if (digits.startsWith('0')) {
        digits = digits.slice(1);
    }

    return `+63${digits.slice(0, 10)}`;
}

function validateProfilePhoneField(inputId = 'profile-phone-input', label = 'Phone number') {
    const input = document.getElementById(inputId);
    if (!input) return true;

    input.value = formatProfilePhoneValue(input.value);
    clearFieldError(inputId);

    const digitsAfterPrefix = input.value.slice(3);
    if (!digitsAfterPrefix) return true;

    if (!/^\d{10}$/.test(digitsAfterPrefix)) {
        setFieldError(inputId, `${label} must have +63 followed by 10 digits.`);
        return false;
    }

    return true;
}

function enforceProfilePhoneInput(inputId = 'profile-phone-input') {
    const input = document.getElementById(inputId);
    if (!input) return;

    input.value = formatProfilePhoneValue(input.value);
    clearFieldError(inputId);
}

function getProfilePhoneValueForSave(inputId = 'profile-phone-input') {
    const input = document.getElementById(inputId);
    if (!input) return '';

    input.value = formatProfilePhoneValue(input.value);
    return input.value === '+63' ? '' : input.value;
}

function validateProfileForm() {
    clearProfileFieldErrors();

    let valid = true;
    valid = validateProfileTextField('profile-hospital-name-input') && valid;
    valid = validateProfileTextField('profile-address-input') && valid;
    valid = validateProfileTextField('profile-city-input') && valid;
    valid = validateProfileTextField('profile-province-input') && valid;
    valid = validateProfileEmailField() && valid;
    valid = validateProfilePhoneField() && valid;
    valid = validateProfilePhoneField('profile-contact-phone-input', 'Blood Bank Hotline') && valid;

    if (!valid) {
        focusFirstInvalidField();
    }

    return valid;
}

function attachProfileValidationListeners() {
    Object.keys(profileTextLimits).forEach((inputId) => {
        if (inputId === 'profile-email-input') return;
        bindHospitalValidationInput(inputId, () => enforceProfileTextLimit(inputId), () => validateProfileTextField(inputId));
    });

    bindHospitalValidationInput('profile-email-input', null, validateProfileEmailField);
    bindHospitalValidationInput('profile-phone-input', () => enforceProfilePhoneInput('profile-phone-input'), () => validateProfilePhoneField('profile-phone-input', 'Phone number'), () => {
        const input = document.getElementById('profile-phone-input');
        if (input && !input.value.trim()) input.value = '+63';
    });
    bindHospitalValidationInput(
        'profile-contact-phone-input',
        () => enforceProfilePhoneInput('profile-contact-phone-input'),
        () => validateProfilePhoneField('profile-contact-phone-input', 'Blood Bank Hotline'),
        () => {
            const input = document.getElementById('profile-contact-phone-input');
            if (input && !input.value.trim()) input.value = '+63';
        }
    );
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachProfileValidationListeners);
} else {
    attachProfileValidationListeners();
}

/**
 * Open save confirmation modal
 */
function openSaveConfirmModal() {
    if (!validateProfileForm()) {
        showProfileError('Please correct the highlighted fields before saving.');
        return;
    }
    
    openModal('saveProfileConfirmModal');
}

/**
 * Confirm and save profile
 */
async function confirmSaveProfile() {
    closeModal('saveProfileConfirmModal');
    
    if (!validateProfileForm()) {
        showProfileError('Please correct the highlighted fields before saving.');
        return;
    }
    
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
            phoneNumber: getProfilePhoneValueForSave(),
            contactPersonName: document.getElementById('profile-contact-name-input').value.trim(),
            contactPersonPhone: getProfilePhoneValueForSave('profile-contact-phone-input')
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

// --------------------------------------------------------------
// Password Change Modal & Confirmation
// --------------------------------------------------------------

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



// --------------------------------------------------------------
// Initialize on DOM Ready
// --------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // Setup modal close on backdrop click - EXCEPT for requestDetailModal
    document.querySelectorAll('.modal-overlay').forEach(o => {
        o.addEventListener('click', e => {
            // Don't close requestDetailModal when clicking outside
            if (o.id === 'requestDetailModal') {
                return; // Do nothing
            }
            
            // For all other modals, close on outside click
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


// ---------------------------------------------------------------
// --- INITIALIZATION ---
// ---------------------------------------------------------------

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
  loadHospitalProfile();
  setupNotesListener();

  

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

// ---------------------------------------------------------------
// --- AUTO-REFRESH ---
// ---------------------------------------------------------------

let autoRefreshInterval = null;

/**
 * Start auto-refresh of blood requests and dashboard
 * Refreshes every 30 seconds
 */
function startAutoRefresh() {
  autoRefreshInterval = setInterval(() => {
    if (document.hidden) return;
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


