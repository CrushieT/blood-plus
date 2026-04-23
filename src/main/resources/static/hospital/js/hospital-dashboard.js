// ─── Config ──────────────────────────────────────────────────
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

// ─── State ───────────────────────────────────────────────────
let REQUESTS = [];
let currentFilter = 'ALL';
let cancelTargetId = null;
let docFile = null;

// ─── Panel navigation ─────────────────────────────────────────
function showPanel(id, navEl) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  if (navEl) navEl.classList.add('active');

  if (id === 'myrequests') { filterRequests(currentFilter, document.querySelector('.active-filter')); }
  if (id === 'dashboard')  { renderDashboard(); }
}

// ─── Dashboard ────────────────────────────────────────────────
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

  // Recent table
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
}

// ─── Requests table ───────────────────────────────────────────
function filterRequests(filter, btn) {
  currentFilter = filter;
  const q = (document.getElementById('req-search')?.value || '').toLowerCase();

  document.querySelectorAll('.req-filter').forEach(b => {
    b.style.color        = 'var(--muted)';
    b.style.borderBottom = '2px solid transparent';
    b.style.fontWeight   = '600';
    b.classList.remove('active-filter');
  });
  if (btn) {
    btn.style.color        = 'var(--red)';
    btn.style.borderBottom = '2px solid var(--red)';
    btn.style.fontWeight   = '700';
    btn.classList.add('active-filter');
  }

  let list = REQUESTS.filter(r => {
    if (filter === 'ACTIVE')   return ['PENDING','APPROVED','ALLOCATED','READY_FOR_RELEASE'].includes(r.status);
    if (filter === 'RELEASED') return r.status === 'RELEASED';
    if (filter === 'REJECTED') return ['REJECTED','CANCELLED'].includes(r.status);
    return true;
  });

  if (q) list = list.filter(r =>
    r.patientName.toLowerCase().includes(q) ||
    r.referenceNumber.toLowerCase().includes(q)
  );

  document.getElementById('req-count').textContent = list.length + ' total';

  const tbody = document.getElementById('requests-tbody');
  const empty = document.getElementById('req-empty');

  if (!list.length) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    return;
  }

  empty.style.display = 'none';
  tbody.innerHTML = list.map(r => {
    const sc  = STATUS_CFG[r.status];
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

// ─── Request detail modal ─────────────────────────────────────
function openRequestDetail(id) {
  const r  = REQUESTS.find(x => x.id === id);
  if (!r) return;
  const sc  = STATUS_CFG[r.status];
  const urg = URGENCY_LABELS[r.urgencyLevel];

  document.getElementById('rd-ref').textContent = r.referenceNumber;

  // Status strip
  const strip = document.getElementById('rd-status-strip');
  strip.style.background = sc.bg;
  document.getElementById('rd-status-icon').textContent = sc.icon;
  document.getElementById('rd-status-label').style.color = sc.color;
  document.getElementById('rd-status-label').textContent = 'Status';
  document.getElementById('rd-status-text').style.color  = sc.color;
  document.getElementById('rd-status-text').textContent  = sc.label;
  document.getElementById('rd-status-sub').style.color   = sc.color;
  document.getElementById('rd-status-sub').textContent   = sc.sub;
  document.getElementById('rd-blood-ghost').textContent  = BT_LABELS[r.bloodType];
  document.getElementById('rd-blood-ghost').style.color  = sc.color;

  // Fields
  document.getElementById('rd-blood').textContent    = BT_LABELS[r.bloodType];
  document.getElementById('rd-comp').textContent     = COMP_LABELS[r.bloodComponent];
  document.getElementById('rd-units').textContent    = r.numberOfUnits + ' unit(s)';
  document.getElementById('rd-urgency').innerHTML    = `<span class="badge ${URGENCY_BADGE[r.urgencyLevel]}">${urg}</span>`;
  document.getElementById('rd-patient').textContent  = r.patientName + ' · ' + r.patientAge + ' yrs / ' + r.patientSex;
  document.getElementById('rd-cat').textContent      = CAT_LABELS[r.requestCategory] + ' · ' + r.ageGroup;
  document.getElementById('rd-physician').textContent= r.requestingPhysician;
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
      document.getElementById('rd-bag-id').textContent     = r.fulfilledByBag.id;
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

function confirmCancel() {
  const r = REQUESTS.find(x => x.id === cancelTargetId);
  if (r) r.status = 'CANCELLED';
  closeModal('cancelConfirmModal');
  filterRequests(currentFilter, document.querySelector('.active-filter'));
  renderDashboard();
}

// ─── New request form ──────────────────────────────────────────
function syncForm() {
  // Optional: Can be used to sync form state, validate on change, etc.
  // Currently a placeholder for future enhancements
}

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

  // Doctor's note is optional for hospital requests
  const errSubmit = document.getElementById('err-submit');
  if (errSubmit) errSubmit.classList.toggle('show', !ok);
  
  return ok;
}

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

    const docFileInput = document.getElementById('doctorsNoteFile');
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

function resetNewRequestForm() {
  document.querySelectorAll('#panel-newrequest input[type=text], #panel-newrequest input[type=number], #panel-newrequest input[type=date], #panel-newrequest textarea')
    .forEach(el => el.value = '');
  document.querySelectorAll('#panel-newrequest input[type=radio]').forEach(el => el.checked = false);
  clearFile('doc');
  ['err-category','err-bt','err-comp','err-urgency'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  });
  const el = document.getElementById('err-submit');
  if (el) el.classList.remove('show');
}

// ─── File upload ───────────────────────────────────────────────
function handleDrop(e, key) {
  e.preventDefault();
  const zone = document.getElementById(key+'-zone');
  if (zone) zone.classList.remove('drag-over');
  if (e.dataTransfer.files[0]) processUpload(e.dataTransfer.files[0], key);
}

function handleFile(input, key) {
  if (input.files[0]) processUpload(input.files[0], key);
}

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

function clearFile(key) {
  if (key === 'doc') docFile = null;
  
  const fileInput = document.getElementById(key+'-file');
  if (fileInput) fileInput.value = '';

  const placeholder = document.getElementById(key+'-placeholder');
  const preview = document.getElementById(key+'-preview');
  if (placeholder) placeholder.style.display = 'block';
  if (preview) preview.style.display = 'none';
}

// ─── Modal ─────────────────────────────────────────────────────
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('show');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
}

document.querySelectorAll('.modal-overlay').forEach(o => {
  o.addEventListener('click', e => {
    if (e.target === o) o.classList.remove('show');
  });
});

// ─── Mobile sidebar ────────────────────────────────────────────
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

document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', () => {
    if (window.innerWidth <= 768) closeSidebar();
  });
});

window.addEventListener('resize', () => {
  if (window.innerWidth > 768) closeSidebar();
});

// ─── Utility ───────────────────────────────────────────────────
function formatDate(d) {
  if (!d) return '—';
  const dateStr = d.includes('T') ? d : d + 'T00:00:00';
  return new Date(dateStr)
    .toLocaleDateString('en-PH', { year:'numeric', month:'short', day:'numeric' });
}

// ─── Backend Integration ──────────────────────────────────────
/**
 * Fetch hospital blood requests from backend
 */
async function loadHospitalRequests() {
  try {
    const response = await fetch('/api/hospital/blood-requests', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include' // Include cookies for authentication
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

// ─── Document Viewer ──────────────────────────────────────────
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

// ─── Init ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const dashDate = document.getElementById('dash-date');
  if (dashDate) {
    dashDate.textContent = new Date().toLocaleDateString('en-PH', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  }

  const reqDateNeeded = document.getElementById('req-date-needed');
  if (reqDateNeeded) {
    reqDateNeeded.min = new Date().toISOString().slice(0, 10);
  }

  // Load requests from backend
  loadHospitalRequests();
});