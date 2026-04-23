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

// ── Review builder ─────────────────────────────────────────────
var COMPONENT_LABELS_R = {
  WHOLE_BLOOD: 'Whole Blood', PRBC: 'Packed RBC', PLATELET: 'Platelet Concentrate',
  FFP: 'Fresh Frozen Plasma (FFP)', LEUKOREDUCED: 'Leukoreduced', ALIQUOT: 'Aliquot'
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

function reviewRow(l, v) {
  return '<div class="review-row"><span class="lbl">' + l + '</span><span class="val">' + v + '</span></div>';
}

function buildReview() {
  var catEl  = document.querySelector('input[name="category"]:checked');
  var agEl   = document.querySelector('input[name="ageGroup"]:checked');
  var urgEl  = document.querySelector('input[name="urgency"]:checked');
  var hospEl = document.getElementById('contact-hospital');
  var isHosp = hospEl && hospEl.style.display !== 'none' && hospEl.style.display !== '';

  document.getElementById('review-patient').innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Patient</div>' +
    reviewRow('Name',        document.getElementById('f-patientName').value.trim()) +
    reviewRow('Age / Sex',   document.getElementById('f-age').value + ' / ' + document.getElementById('f-sex').value) +
    reviewRow('Ward',        document.getElementById('f-ward').value.trim() || '—') +
    reviewRow('Physician',   document.getElementById('f-physician').value.trim()) +
    reviewRow('Patient Type', agEl  ? agEl.value  : '—') +
    reviewRow('Category',    catEl ? (CATEGORY_LABELS_R[catEl.value] || catEl.value) : '—');

  document.getElementById('review-blood').innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Blood details</div>' +
    reviewRow('Blood Type',  BLOOD_LABELS_R[document.getElementById('f-bloodType').value]     || document.getElementById('f-bloodType').value) +
    reviewRow('Component',   COMPONENT_LABELS_R[document.getElementById('f-component').value] || document.getElementById('f-component').value) +
    reviewRow('Units',       document.getElementById('f-units').value) +
    reviewRow('Urgency',     urgEl ? (URGENCY_LABELS_R[urgEl.value] || urgEl.value) : '—') +
    reviewRow('Required By', document.getElementById('f-requiredBy').value || '—') +
    reviewRow('Notes',       document.getElementById('f-notes').value.trim() || '—');

  document.getElementById('review-contact').innerHTML =
    '<div style="font-size:12px;font-weight:700;color:#888;letter-spacing:.05em;text-transform:uppercase;margin-bottom:10px;">Contact</div>' +
    (isHosp
      ? reviewRow('Hospital', document.getElementById('ch-hospital-name').textContent) +
        reviewRow('Staff',    document.getElementById('ch-staff-name').textContent)
      : reviewRow('Name',         document.getElementById('f-requesterName').value.trim()) +
        reviewRow('Relationship', document.getElementById('f-relationship').value) +
        reviewRow('Contact',      document.getElementById('f-contact').value.trim()) +
        reviewRow('Email',        document.getElementById('f-email').value.trim()));

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
  if (file.size > 5 * 1024 * 1024) { showError("File exceeds 5MB limit."); return; }
  if (!['application/pdf','image/jpeg','image/png'].includes(file.type)) {
    showError("Only PDF, JPG, or PNG files are accepted."); return;
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

// ── Submit ─────────────────────────────────────────────────────
async function submitRequest() {
  hideError();

  const patientName   = document.getElementById('f-patientName').value.trim();
  const age           = document.getElementById('f-age').value;
  const sex           = document.getElementById('f-sex').value;
  const physician     = document.getElementById('f-physician').value.trim();
  const bloodType     = document.getElementById('f-bloodType').value;
  const component     = document.getElementById('f-component').value;
  const units         = document.getElementById('f-units').value;
  const urgency       = getRadioVal('urgency');
  const ageGroup      = getRadioVal('ageGroup');
  const category      = getRadioVal('category');
  const requesterName = document.getElementById('f-requesterName').value.trim();
  const relationship  = document.getElementById('f-relationship').value;
  const contact       = document.getElementById('f-contact').value.trim();
  const email         = document.getElementById('f-email').value.trim();
  const requiredBy    = document.getElementById('f-requiredBy').value;
  const notes         = document.getElementById('f-notes').value.trim();

  const btn = document.getElementById('submit-btn');
  btn.disabled = true;
  btn.textContent = 'Submitting…';

  try {
    const formData = new FormData();

    const data = {
      patientName:           patientName,
      patientAge:            parseInt(age),
      patientSex:            sex,
      wardRoom:              document.getElementById('f-ward').value.trim(),
      requestingPhysician:   physician,
      ageGroup:              ageGroup,
      requestCategory:       category,
      bloodType:             bloodType,
      bloodComponent:        component,
      numberOfUnits:         parseInt(units),
      urgencyLevel:          urgency,
      requiredBy:            requiredBy || null,
      notes:                 notes,
      requesterName:         requesterName,
      requesterRelationship: relationship,
      requesterContact:      contact,
      requesterEmail:        email
    };
    console.log(data);

    formData.append('data', new Blob([JSON.stringify(data)], { type: 'application/json' }));
    formData.append('doctorsNote', selectedFile);

    const res = await fetch('/api/req/blood-requests', { method: 'POST', body: formData });
    const json = await res.json();

    if (!res.ok) {
      showError(json.error || 'Submission failed. Please try again.');
      return;
    }

    document.getElementById('request-form-body').style.display = 'none';
    document.getElementById('success-screen').style.display = 'block';
    document.getElementById('success-ref').textContent = json.referenceNumber;
    document.getElementById('success-email').textContent = email;

  } catch (err) {
    showError('Network error. Please check your connection and try again.');
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
    'f-requiredBy','f-notes','f-requesterName','f-contact','f-email'
  ].forEach(id => { document.getElementById(id).value = ''; });
  ['f-sex','f-bloodType','f-component','f-units','f-relationship']
    .forEach(id => { document.getElementById(id).value = ''; });
  hideError();
  goTo(1);
}

function copyRef() {
  const ref = document.getElementById('success-ref').textContent;
  navigator.clipboard.writeText(ref).catch(() => {});
  const btn = document.querySelector('.btn-copy');
  btn.textContent = 'Copied!';
  setTimeout(() => btn.textContent = 'Copy', 2000);
}

// ── Tracker ────────────────────────────────────────────────────
const BLOOD_LABELS = {
  O_NEG:'O−', O_POS:'O+', A_POS:'A+', A_NEG:'A−',
  B_POS:'B+', B_NEG:'B−', AB_POS:'AB+', AB_NEG:'AB−'
};

const COMPONENT_LABELS = {
  WHOLE_BLOOD:'Whole Blood', PRBC:'Packed RBC', PLATELET:'Platelet Concentrate',
  FFP:'Fresh Frozen Plasma', LEUKOREDUCED:'Leukoreduced', ALIQUOT:'Aliquot'
};

const URGENCY_LABELS = {
  LOW:'Low — Scheduled', MEDIUM:'Medium — Within a week',
  HIGH:'High — 2–3 days', CRITICAL:'Critical — Immediately'
};

const STATUS_CFG = {
  PENDING:    { label:'Pending Review',       badge:'status-pending',   step:1 },
  APPROVED:   { label:'Approved',             badge:'status-approved',  step:2 },
  RELEASED:   { label:'Ready for Pickup',     badge:'status-released',  step:3 },
  TRANSFUSED: { label:'Transfused',           badge:'status-transfused',step:4 },
  REJECTED:   { label:'Rejected',             badge:'status-rejected',  step:-1 },
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
      physician:       api.physician,
      units:           api.numberOfUnits || 0,
      patientName:     api.patientName,
      submittedAt:     api.requestedAt,
      approvedAt:      api.reviewedAt,
      releasedAt:      api.releasedAt,
      transfusedAt:    api.transfusedAt,
      adminNotes:      api.notes,
      rejectionReason: api.rejectionReason
    };
  } catch (err) {
    data = DEMO_REQUESTS[refNum] ||
      JSON.parse(sessionStorage.getItem(refNum) || 'null');
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
    if (data.status === 'REJECTED') {
      if (stepNum > 2) return '';
      const isDone    = stepNum === 1;
      return `
        <div class="tl-item">
          <div class="tl-left">
            <div class="tl-dot ${isDone ? 'done' : 'current'}">${isDone ? '✓' : '✕'}</div>
            ${stepNum < 2 ? `<div class="tl-line pending"></div>` : ''}
          </div>
          <div class="tl-content">
            <div class="tl-label">Request Rejected</div>
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
          <div class="track-info-val">${data.bloodType}</div>
        </div>
        <div class="track-info-cell">
          <div class="track-info-label">Component</div>
          <div class="track-info-val">${data.component}</div>
        </div>
        <div class="track-info-cell">
          <div class="track-info-label">Units</div>
          <div class="track-info-val">${data.units}</div>
        </div>
        <div class="track-info-cell">
          <div class="track-info-label">Urgency</div>
          <div class="track-info-val">${data.urgency}</div>
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
    adult: 'landing_page/forms/Blood_Request_Form_Adult.pdf',
    pedia: 'landing_page/forms/Blood_Request_Form_Pediatric.pdf'
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
document.getElementById('f-requiredBy').min = new Date().toISOString().split('T')[0];