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

    // Check if indications are required for this component
    const selectedComponent = document.getElementById('f-component').value;
    const birthdate = document.getElementById('f-birthdate').value;
    const age = calculateAge(birthdate);
    const ageGroup = age !== null && age < 13 ? 'PEDIA' : 'ADULT';
    
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
    
    // If component is OTHER, require component name and indication text
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
      var em = document.getElementById('f-email').value.trim();
      if (!em || !em.includes('@'))
        return showError('Please enter a valid email address.'), false;
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

// ── Indication Management ──────────────────────────────────────
function initIndicationHandlers() {
  const componentSelect = document.getElementById('f-component');
  const indicationContainer = document.getElementById('indication-container');

  function updateIndications() {
    const birthdate = document.getElementById('f-birthdate').value;
    const age = calculateAge(birthdate);
    const ageGroup = age !== null && age < 13 ? 'PEDIA' : 'ADULT';
    const component = componentSelect.value;

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
  LOW: 'Low — Scheduled', MEDIUM: 'Medium — Within a week',
  HIGH: 'High — 2–3 days', CRITICAL: 'Critical — Immediately'
};

var CATEGORY_LABELS_R = {
  INPATIENT: 'Inpatient (CNPH)', OUTPATIENT: 'Outpatient', EMERGENCY: 'Emergency'
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

  // Calculate age from birthdate
  const birthdate = document.getElementById('f-birthdate').value;
  const age = calculateAge(birthdate);
  const ageGroup = age !== null && age < 13 ? 'PEDIA' : 'ADULT';

  // ── Patient section ──
  document.getElementById('review-patient').innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Patient</div>' +
    reviewRow('Name',        document.getElementById('f-patientName').value.trim()) +
    reviewRow('Date of Birth', birthdate) +
    reviewRow('Age', age + ' years') +
    reviewRow('Sex',         document.getElementById('f-sex').value) +
    reviewRow('Ward',        document.getElementById('f-ward').value.trim() || '—') +
    reviewRow('Room',        document.getElementById('f-room').value.trim() || '—') +
    reviewRow('Physician',   document.getElementById('f-physician').value.trim()) +
    reviewRow('Patient Type', ageGroup) +
    reviewRow('Category',    catEl ? (CATEGORY_LABELS_R[catEl.value] || catEl.value) : '—');

  // ── Blood details section ──
  const componentVal = document.getElementById('f-component').value;
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
    reviewRow('Urgency',     urgEl ? (URGENCY_LABELS_R[urgEl.value] || urgEl.value) : '—') +
    reviewRow('Required By', document.getElementById('f-requiredBy').value || '—') +
    reviewRow('Notes',       document.getElementById('f-notes').value.trim() || '—');

  // ── Clinical section ──
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

  // ── Indications section ──
  const indications = getSelectedIndications();
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
        reviewRow('Email',        document.getElementById('f-email').value.trim()));

  // ── Documents section ──
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

// ── Submit with CALCULATED AGE FROM BIRTHDATE ─────────────────
async function submitRequest() {
  hideError();
  const ackCheckbox = document.getElementById('ack-confirm');
  if (!ackCheckbox.checked) {
    showError('Please acknowledge that the information provided is accurate before submitting.');
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
  const ward     = document.getElementById('f-ward').value.trim();
  const room      = document.getElementById('f-room').value.trim();
  const requestingPhysician = document.getElementById('f-physician').value.trim();

  // ──────────────────────────────────────────────
  // PATIENT TYPE & CATEGORY (PAGE 1)
  // ──────────────────────────────────────────────
  const ageGroup      = patientAge !== null && patientAge < 13 ? 'PEDIA' : 'ADULT';
  const requestCategory = getRadioVal('category');

  // ──────────────────────────────────────────────
  // BLOOD DETAILS (PAGE 2)
  // ──────────────────────────────────────────────
  const bloodType     = document.getElementById('f-bloodType').value;
  const bloodComponent = document.getElementById('f-component').value;
  const numberOfUnits = document.getElementById('f-units').value;

  // ──────────────────────────────────────────────
  // CLINICAL INFORMATION (PAGE 2)
  // ──────────────────────────────────────────────
  const clinicalImpression = document.getElementById('f-diagnosis').value.trim();
  const hemoglobin = document.getElementById('f-hemoglobin').value;
  const hematocrit = document.getElementById('f-hematocrit').value;
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
  const indications = getSelectedIndications();
  const indication = indications.map(ind => ind.code).join(',');
  const indicationOtherSpecify = buildIndicationOtherSpecify();

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
  const requesterEmail = document.getElementById('f-email').value.trim();

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
    ward: ward || null,
    room: room || null,
    requestingPhysician: requestingPhysician,

    // PATIENT TYPE & CATEGORY
    ageGroup: ageGroup,
    requestCategory: requestCategory,

    // BLOOD DETAILS
    bloodType: bloodType,
    bloodComponent: bloodComponent,
    numberOfUnits: numberOfUnits ? parseInt(numberOfUnits) : null,

    // URGENCY & TIMING
    urgencyLevel: urgencyLevel,
    requiredBy: requiredBy || null,

    // CONTACT / REQUESTER
    requesterName: requesterName,
    requesterRelationship: requesterRelationship || null,
    requesterContact: requesterContact,
    requesterEmail: requesterEmail,

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
      showError(json.error || 'Submission failed. Please try again.');
      return;
    }

    // Success: generate/retrieve reference number
    const mockRefNum = json.referenceNumber || 
      ('BR-' + new Date().getFullYear() + '-' + String(Math.floor(Math.random() * 100000)).padStart(5, '0'));

    // Hide form, show success screen
    document.getElementById('request-form-body').style.display = 'none';
    document.getElementById('success-screen').style.display = 'block';
    document.getElementById('success-ref').textContent = mockRefNum;
    document.getElementById('success-email').textContent = requesterEmail;

    // Store in session for tracker (including all fields)
    sessionStorage.setItem(mockRefNum, JSON.stringify({
      refNum: mockRefNum,
      patientName: patientName,
      patientAge: patientAge,
      patientSex: patientSex,
      wardRoom: ward + ' ' + room,
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
      requesterEmail: requesterEmail,
      notes: notes,
      clinicalImpression: clinicalImpression,
      hemoglobin: hemoglobin,
      hematocrit: hematocrit,
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
    'f-patientName','f-birthdate','f-ward', 'f-room','f-physician',
    'f-diagnosis','f-hemoglobin','f-hematocrit',
    'f-prevTransDate','f-prevUnits','f-reactionDate','f-reactionDetails',
    'f-requiredBy','f-notes','f-requesterName','f-contact','f-email',
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
  updatePatientTypeAndForms();
  
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
  WHOLE_BLOOD:'Whole Blood', 
  PRBC:'Packed RBC', 
  LEUKOREDUCED_PRBC:'Leukoreduced PRBC',
  ALIQUOTED_PRBC:'Aliquoted PRBC',
  PLATELET_CONCENTRATE:'Platelet Concentrate',
  FRESH_FROZEN_PLASMA:'Fresh Frozen Plasma',
  CRYOPRECIPITATE:'Cryoprecipitate',
  CRYOSUPERNATANT:'Cryosupernatant',
  WRBC:'Whole Red Blood Cells',
  OTHER:'Other'
};

const URGENCY_LABELS = {
  LOW:'Low — Scheduled', MEDIUM:'Medium — Within a week',
  HIGH:'High — 2–3 days', CRITICAL:'Critical — Immediately'
};

const STATUS_CFG = {
  PENDING:    { label:'Pending Review',       badge:'status-pending',   step:1 },
  APPROVED:   { label:'Approved',             badge:'status-approved',  step:2 },
  ALLOCATED:  { label:'Allocated',            badge:'status-approved',  step:2 },
  READY_FOR_RELEASE: { label:'Ready for Pickup', badge:'status-released', step:3 },
  RELEASED:   { label:'Released',             badge:'status-released',  step:3 },
  TRANSFUSED: { label:'Transfused',           badge:'status-transfused',step:4 },
  REJECTED:   { label:'Rejected',             badge:'status-rejected',  step:-1 },
  CANCELLED:  { label:'Cancelled',            badge:'status-cancelled', step:-1 }
};

// Demo data for testing tracker
const DEMO_REQUESTS = {
  'BR-2026-00001': {
    refNum: 'BR-2026-00001',
    patientName: 'Reyes, Maria Santos',
    age: 42, sex: 'FEMALE',
    bloodType: 'O_POS', component: 'PRBC', units: 2,
    urgency: 'HIGH', category: 'INPATIENT',
    physician: 'Dr. Fernandez',
    requesterName: 'Jose Reyes', email: 'jose@example.com',
    status: 'APPROVED',
    submittedAt: '2026-04-10T09:30:00',
    approvedAt:  '2026-04-10T10:15:00',
    adminNotes: 'Stock available. Please proceed to Blood Bank window with transport box.',
  },
  'BR-2026-00002': {
    refNum: 'BR-2026-00002',
    patientName: 'Santos, Pedro Cruz',
    age: 67, sex: 'MALE',
    bloodType: 'B_NEG', component: 'WHOLE_BLOOD', units: 1,
    urgency: 'CRITICAL', category: 'EMERGENCY',
    physician: 'Dr. Villanueva',
    requesterName: 'Ana Santos', email: 'ana@example.com',
    status: 'REJECTED',
    submittedAt: '2026-04-09T14:00:00',
    rejectionReason: 'B− is currently unavailable at CNPH. Please coordinate with Philippine Red Cross CN Chapter or wait for the next BMC stock delivery (estimated 2 days).',
  },
};

async function trackRequest() {
  const rawInput = document.getElementById('track-input').value.trim();
  const refNum = rawInput.startsWith('BR-') ? rawInput : ('BR-' + rawInput);

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
      units:           api.numberOfUnits || 0,
      patientName:     api.patientName,
      submittedAt:     api.requestedAt,
      approvedAt:      api.reviewedAt,
      releasedAt:      null, // Will be added in future updates
      transfusedAt:    null,
      adminNotes:      api.notes,
      rejectionReason: api.rejectionReason
    };
  } catch (err) {
    // Fall back to demo or session storage
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
    ALLOCATED:        { step: 3, label: "Allocated",            badge: "approved" },
    READY_FOR_RELEASE:{ step: 4, label: "Ready for Release: Pick up in CNPH", badge: "approved" },
    RELEASED:         { step: 5, label: "Released",             badge: "released" },
    REJECTED:         { step: -1, label: "Rejected",            badge: "rejected" },
    CANCELLED:        { step: -1, label: "Cancelled",           badge: "cancelled" }
  };

  const sc = TRACK_STATUS_CFG[data.status] || TRACK_STATUS_CFG.PENDING;
  const currentStep = sc.step;

  const steps = [
    { label: 'Request Submitted',   time: data.submittedAt ? fmtDate(data.submittedAt) : null },
    { label: 'Under Admin Review',  time: data.approvedAt  ? fmtDate(data.approvedAt)  : null },
    { label: 'Approved / Allocated',time: data.approvedAt  ? fmtDate(data.approvedAt)  : null },
    { label: 'Ready for Release',   time: data.releasedAt  ? fmtDate(data.releasedAt)  : null },
    { label: 'Released',            time: data.releasedAt  ? fmtDate(data.releasedAt)  : null }
  ];

  function timelineItem(idx, step) {
    const stepNum = idx + 1;
    if (data.status === 'REJECTED' || data.status === 'CANCELLED') {
      if (stepNum > 2) return '';
      const isDone    = stepNum === 1;
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

  const adminNoteHtml = data.rejectionReason
    ? `<div class="admin-note-box rejection"><strong>Reason:</strong> ${data.rejectionReason}</div>`
    : data.adminNotes
      ? `<div class="admin-note-box info">📋 <strong>Staff Note:</strong> ${data.adminNotes}</div>`
      : '';

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

    // Ward and room
    detected.ward = extractField(text, /Ward[\/\s]*Room\s+([^\n\t,]+?)(?=CLINICAL|$)/i);
    detected.room = extractField(text, /Room\s+([^\n\t,]+?)(?=Ward|CLINICAL|$)/i);

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
    ward: 'Ward',
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
    ward: 'f-ward',
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
  if (file.size > 10 * 1024 * 1024) {
    showScannerError("File exceeds 10MB limit.");
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
      alert("Date cannot be in the future.");
      this.value = "";
    }
  });
});

