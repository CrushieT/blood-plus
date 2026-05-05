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

// ── Validation ─────────────────────────────────────────────────
function validate(page) {
  hideError();

  if (page === 1) {
    if (!document.getElementById('f-patientName').value.trim())
      return showError('Please enter the patient\'s full name.'), false;
    if (!document.getElementById('f-age').value)
      return showError('Please enter the patient\'s age.'), false;
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
    // Validate at least one indication is selected
    if (!hasSelectedIndications())
      return showError('Please select at least one indication for transfusion.'), false;
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
  const ageGroupRadios = document.querySelectorAll('input[name="ageGroup"]');
  const indicationContainer = document.getElementById('indication-container');

  function updateIndications() {
    const ageGroup = getRadioVal('ageGroup');
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

    // Clear all checkboxes when component or age group changes
    document.querySelectorAll('.indication-checkbox').forEach(cb => {
      cb.checked = false;
    });
    closeAllSubGroups();
  }

  componentSelect.addEventListener('change', updateIndications);
  ageGroupRadios.forEach(radio => {
    radio.addEventListener('change', updateIndications);
  });

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
          // Uncheck all sub-items
          subGroup.querySelectorAll('input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
          });
        }
      }
    });
  });

  // Handle text input for "Others" options
  document.querySelectorAll('input[type="text"][data-ref]').forEach(input => {
    const checkboxId = `ind-${input.dataset.ref}`;
    const checkbox = document.getElementById(checkboxId);
    
    if (checkbox) {
      input.addEventListener('input', function() {
        if (this.value.trim()) {
          checkbox.checked = true;
        }
      });
      
      checkbox.addEventListener('change', function() {
        if (!this.checked) {
          input.value = '';
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
      additional: input ? input.value : null
    });
  });
  return selected;
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
  CRYOSUPERNATANT: 'Cryosupernatant'
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
  var agEl   = document.querySelector('input[name="ageGroup"]:checked');
  var urgEl  = document.querySelector('input[name="urgency"]:checked');
  var reqTypeEl = document.querySelector('input[name="requestType"]:checked');
  var hospEl = document.getElementById('contact-hospital');
  var isHosp = hospEl && hospEl.style.display !== 'none' && hospEl.style.display !== '';

  // ── Patient section ──
  document.getElementById('review-patient').innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Patient</div>' +
    reviewRow('Name',        document.getElementById('f-patientName').value.trim()) +
    reviewRow('Age / Sex',   document.getElementById('f-age').value + ' / ' + document.getElementById('f-sex').value) +
    reviewRow('Ward',        document.getElementById('f-ward').value.trim() || '—') +
    reviewRow('Physician',   document.getElementById('f-physician').value.trim()) +
    reviewRow('Patient Type', agEl  ? agEl.value  : '—') +
    reviewRow('Category',    catEl ? (CATEGORY_LABELS_R[catEl.value] || catEl.value) : '—');

  // ── Blood details section ──
  document.getElementById('review-blood').innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Blood Details</div>' +
    reviewRow('Blood Type',  BLOOD_LABELS_R[document.getElementById('f-bloodType').value] || document.getElementById('f-bloodType').value) +
    reviewRow('Component',   COMPONENT_LABELS_R[document.getElementById('f-component').value] || document.getElementById('f-component').value) +
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
  if (file.size > 10 * 1024 * 1024) {  //  10 mb limit
    showError("File exceeds 10MB limit."); 
    return; 
  }
  if (!['image/jpeg','image/png'].includes(file.type)) {
    showError("Only JPG or PNG image files are accepted.");
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

// ── Submit with COMPLETE STRUCTURED DATA (MATCHING JAVA DTO/MODEL) ────────────
// ── Submit with ONLY EXISTING FORM FIELDS ────────────────────
async function submitRequest() {
  hideError();

  // ──────────────────────────────────────────────
  // PATIENT INFORMATION (PAGE 1)
  // ──────────────────────────────────────────────
  const patientName   = document.getElementById('f-patientName').value.trim();
  const patientAge    = document.getElementById('f-age').value;
  const patientSex    = document.getElementById('f-sex').value;
  const wardRoom      = document.getElementById('f-ward').value.trim();
  const requestingPhysician = document.getElementById('f-physician').value.trim();

  // ──────────────────────────────────────────────
  // PATIENT TYPE & CATEGORY (PAGE 1)
  // ──────────────────────────────────────────────
  const ageGroup      = getRadioVal('ageGroup');
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
  // CONTACT / REQUESTER INFORMATION (PAGE 3)
  // ──────────────────────────────────────────────
  const requesterName = document.getElementById('f-requesterName').value.trim();
  const requesterRelationship = document.getElementById('f-relationship').value;
  const requesterContact = document.getElementById('f-contact').value.trim();
  const requesterEmail = document.getElementById('f-email').value.trim();

  // ══════════════════════════════════════════════════════════════
  // BUILD COMPLETE DATA OBJECT (MATCHING BloodBagRequestDTO)
  // ══════════════════════════════════════════════════════════════
  const requestData = {
    // PATIENT INFO
    patientName: patientName,
    patientAge: patientAge ? parseInt(patientAge) : null,
    patientSex: patientSex || null,
    wardRoom: wardRoom || null,
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
    indication: indication || null
  };
  

  // Log to console for development
  console.log('=== BLOOD BAG REQUEST DATA (STRUCTURED) ===');
  console.log(JSON.stringify(requestData, null, 2));
  console.log('=== FILE ATTACHED ===');
  console.log(selectedFile ? `${selectedFile.name} (${selectedFile.size} bytes)` : 'No file');

  // Disable button during submission
  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

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
      wardRoom: wardRoom,
      requestingPhysician: requestingPhysician,
      ageGroup: ageGroup,
      requestCategory: requestCategory,
      bloodType: bloodType,
      bloodComponent: bloodComponent,
      numberOfUnits: numberOfUnits,
      urgencyLevel: urgencyLevel,
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
      status: 'PENDING',
      submittedAt: new Date().toISOString()
    }));

  } catch (err) {
    showError('Error processing request. Please try again.');
    console.error(err);
  } finally {
    btn.disabled = false;
    btn.textContent = '🩸 Submit Blood Request';
  }
}

function resetForm() {
  document.getElementById('request-form-body').style.display = 'block';
  document.getElementById('success-screen').style.display = 'none';
  clearFile();
  [
    'f-patientName','f-age','f-ward','f-physician',
    'f-diagnosis','f-hemoglobin','f-hematocrit',
    'f-prevTransDate','f-prevUnits','f-reactionDate','f-reactionDetails',
    'f-requiredBy','f-notes','f-requesterName','f-contact','f-email'
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
  document.getElementById('ag-adult').checked = true;
  document.getElementById('cat-inpatient').checked = true;
  document.getElementById('urg-med').checked = true;
  document.getElementById('rt-routine').checked = true;
  document.getElementById('pt-no').checked = true;
  document.getElementById('pr-no').checked = true;
  
  // Hide/reset conditional fields
  togglePrevTransFields();
  toggleReactionFields();
  
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
  CRYOSUPERNATANT:'Cryosupernatant'
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
            : (isCurrent ? '<div class="tl-time">In progress...</div>' : '')}
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

// ── Init ───────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  injectIndicationStyles();
  initIndicationHandlers();
  const requiredByInput = document.getElementById('f-requiredBy');
  if (requiredByInput) {
    requiredByInput.min = new Date().toISOString().split('T')[0];
  }
});