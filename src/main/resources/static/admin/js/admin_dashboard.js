// -------------------------------------------------------------------------------
// INIT
// -------------------------------------------------------------------------------
function updateAdminPanelBadge(role) {
  const badgeEl = document.getElementById('admin-panel-badge');
  if (!badgeEl) return;
  const normalizedRole = String(role || '').trim().toUpperCase();
  badgeEl.textContent = normalizedRole === 'ADMIN' ? 'Admin Panel' : 'Staff Panel';
}

async function initializeNav() {
  try {
    const res = await fetch('/api/auth/me', {
      headers: { Accept: 'application/json' }
    });
    
    if (!res.ok) {
      console.error('Failed to get user info');
      return;
    }
    
    const user = await res.json();
    updateAdminPanelBadge(user.role);
    const staffNavItem = document.querySelector('[onclick="showPanel(\'staff\', this)"]');
    
    // Hide staff management if user is not ADMIN
    if (staffNavItem) {
      if (user.role === 'ADMIN') {
        staffNavItem.style.display = 'flex';
        staffLoadAll();  // ? Only load staff data if admin
      } else {
        staffNavItem.style.display = 'none';
      }
    }
  } catch (err) {
    console.error('[Nav] Failed to check role:', err);
  }
}

// Update your DOMContentLoaded to call this
document.addEventListener('DOMContentLoaded', () => {
  initializeNav();
  initStaffPanel();
  initializeLoggingPanel();
  initializeAutoRefresh();  // Start polling after panels have initialized their default filters
  initAddStockScanner();
});

// -- Panel navigation ----------------------------------------------------------
function showPanel(id, navEl) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  if (navEl) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    navEl.classList.add('active');
  }
}


// -- Modal helpers --------------------------------------------------------------
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('show');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
}

let bloodPlusConfirmCallback = null;
let bloodPlusModalOnHide = null;

function getBloodPlusModalTypeConfig(type) {
  const typeMap = {
    success: { icon: 'OK', label: 'Success', className: 'bp-type-success' },
    warning: { icon: '!', label: 'Warning', className: 'bp-type-warning' },
    error:   { icon: 'X', label: 'Error', className: 'bp-type-error' },
    info:    { icon: 'i', label: 'Info', className: 'bp-type-info' }
  };
  return typeMap[type] || typeMap.info;
}

function hideBloodPlusModal() {
  closeModal('bloodPlusActionModal');
  bloodPlusConfirmCallback = null;

  const confirmBtn = document.getElementById('bp-modal-confirm');
  if (confirmBtn) {
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirm';
  }

  if (typeof bloodPlusModalOnHide === 'function') {
    const onHide = bloodPlusModalOnHide;
    bloodPlusModalOnHide = null;
    onHide();
  } else {
    bloodPlusModalOnHide = null;
  }
}

function showBloodPlusMessage(title, message, type = 'info') {
  const config = getBloodPlusModalTypeConfig(type);
  const iconEl = document.getElementById('bp-modal-icon');
  const typeEl = document.getElementById('bp-modal-type');
  const titleEl = document.getElementById('bp-modal-title');
  const messageEl = document.getElementById('bp-modal-message');
  const cancelBtn = document.getElementById('bp-modal-cancel');
  const confirmBtn = document.getElementById('bp-modal-confirm');
  const okBtn = document.getElementById('bp-modal-ok');

  if (iconEl) {
    iconEl.className = `bp-modal-icon ${config.className}`;
    iconEl.textContent = config.icon;
  }
  if (typeEl) typeEl.textContent = config.label;
  if (titleEl) titleEl.textContent = title || 'Notice';
  if (messageEl) messageEl.textContent = message || '';
  if (cancelBtn) cancelBtn.style.display = 'none';
  if (confirmBtn) confirmBtn.style.display = 'none';
  if (okBtn) okBtn.style.display = 'inline-flex';

  bloodPlusConfirmCallback = null;
  openModal('bloodPlusActionModal');
}

function showBloodPlusConfirm(title, message, onConfirm, type = 'warning') {
  const config = getBloodPlusModalTypeConfig(type);
  const iconEl = document.getElementById('bp-modal-icon');
  const typeEl = document.getElementById('bp-modal-type');
  const titleEl = document.getElementById('bp-modal-title');
  const messageEl = document.getElementById('bp-modal-message');
  const cancelBtn = document.getElementById('bp-modal-cancel');
  const confirmBtn = document.getElementById('bp-modal-confirm');
  const okBtn = document.getElementById('bp-modal-ok');

  if (iconEl) {
    iconEl.className = `bp-modal-icon ${config.className}`;
    iconEl.textContent = config.icon;
  }
  if (typeEl) typeEl.textContent = config.label;
  if (titleEl) titleEl.textContent = title || 'Confirm Action';
  if (messageEl) messageEl.textContent = message || '';
  if (cancelBtn) cancelBtn.style.display = 'inline-flex';
  if (confirmBtn) {
    confirmBtn.style.display = 'inline-flex';
    confirmBtn.disabled = false;
    confirmBtn.textContent = 'Confirm';
  }
  if (okBtn) okBtn.style.display = 'none';

  bloodPlusConfirmCallback = typeof onConfirm === 'function' ? onConfirm : null;
  openModal('bloodPlusActionModal');
}

async function runBloodPlusConfirm() {
  if (!bloodPlusConfirmCallback) {
    hideBloodPlusModal();
    return;
  }

  const confirmFn = bloodPlusConfirmCallback;
  bloodPlusModalOnHide = null;
  hideBloodPlusModal();
  await Promise.resolve(confirmFn());
}

let addStockSubmitLocked = false;

function setAddStockSubmitState(disabled, label = 'Review / Receive Batch') {
  const btn = document.getElementById('add-stock-submit-btn');
  if (!btn) return;
  btn.disabled = disabled;
  btn.textContent = label;
}

function lockAddStockSubmit(label = 'Review / Receive Batch') {
  addStockSubmitLocked = true;
  setAddStockSubmitState(true, label);
}

function unlockAddStockSubmit() {
  addStockSubmitLocked = false;
  setAddStockSubmitState(false, 'Review / Receive Batch');
}

document.addEventListener('DOMContentLoaded', function() {
  // Get all modal overlays
  const modalOverlays = document.querySelectorAll('.modal-overlay');
 
  modalOverlays.forEach(overlay => {
    overlay.addEventListener('click', function(event) {
      // Only close if clicking directly on the overlay background, NOT on the modal
      if (event.target === this) {
        event.stopPropagation(); // Prevent the click from propagating
        // Do NOT close the modal - removed closeModal() call
      }
    });
  });
});

// -- Logout ---------------------------------------------------------------------
function handleLogout() {
  openModal('logoutModal');
}

async function logout() {
  try {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include"
    });
    if (response.ok) {
      window.location.href = "/landing_page/index.html";
    }
  } catch (error) {
    console.error("Logout error:", error);
    window.location.href = "/landing_page/index.html";
  }
}


// -------------------------------------------------------------------------------
// ADMIN DASHBOARD - FRONTEND (UPDATED)
// -------------------------------------------------------------------------------

async function loadDashboard() {
  try {
    const [dashRes, reqRes] = await Promise.all([
      fetch('/api/admin/dashboard', { credentials: 'include' }),
      fetch('/api/admin/blood-requests', { credentials: 'include' }),
    ]);
    
    if (dashRes.ok) {
      const data = await dashRes.json();
      renderDashboardStats(data);
      renderBloodBankQuickView(data.bloodBankSummary);
      renderRecentActivities(data.recentActivities);  // ? ADD THIS LINE
    }
 
    if (reqRes.ok) {
      const requests = await reqRes.json();
      renderPendingRequestsQuickView(requests);
    }
 
  } catch (err) {
    console.error('Failed to load dashboard:', err);
  }
}

function renderDashboardStats(data) {
  // Hero
  document.getElementById('dash-critical-count').textContent  = data.criticalBloodTypes ?? 0;
  document.getElementById('dash-pending-requests').textContent = data.pendingRequests    ?? 0;
  document.getElementById('dash-hospital-count').textContent  = data.totalHospitals     ?? 0;
  document.getElementById('dash-total-units').textContent     = data.totalUnits         ?? 0;

  // Stat cards
  document.getElementById('stat-critical-bt').textContent  = data.criticalBloodTypes ?? 0;
  document.getElementById('stat-hospitals').textContent    = data.totalHospitals     ?? 0;
  document.getElementById('stat-total-units').textContent  = data.totalUnits         ?? 0;
  document.getElementById('stat-pending-req').textContent  = data.pendingRequests    ?? 0;

  // Greeting
  const hour     = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const el = document.getElementById('dash-greeting');
  if (el) el.textContent = greeting + ', Admin';

  // Date
  const dateEl = document.getElementById('dash-date');
  if (dateEl) dateEl.textContent = new Date().toLocaleDateString('en-PH', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });
}

function renderBloodBankQuickView(countByType) {
  if (!countByType) return;

  const ORDER = ['O_NEG','O_POS','A_POS','A_NEG','B_POS','B_NEG','AB_POS','AB_NEG'];
  const LABELS = {
    O_NEG:'O-', O_POS:'O+', A_POS:'A+', A_NEG:'A-',
    B_POS:'B+', B_NEG:'B-', AB_POS:'AB+', AB_NEG:'AB-'
  };

  const max = Math.max(...ORDER.map(t => countByType[t] ?? 0), 1);
  const container = document.getElementById('dash-blood-bank');
  if (!container) return;

  container.innerHTML = ORDER.map((type, i) => {
    const units      = countByType[type] ?? 0;
    const pct        = Math.round((units / max) * 100);
    const isCritical = units <= 5;
    const isLow      = units <= 20 && !isCritical;
    const color      = isCritical ? 'var(--crimson)' : isLow ? 'var(--amber)' : 'var(--green)';
    const style      = i === ORDER.length - 1 ? 'margin-bottom:0' : '';

    return `
      <div class="analytic-row" style="${style}">
        <div class="analytic-label">${LABELS[type]}</div>
        <div class="analytic-bar-wrap">
          <div class="analytic-bar" style="width:${pct}%;background:${color}"></div>
        </div>
        <div class="analytic-val" style="color:${isCritical || isLow ? color : ''}">
          ${units} units
        </div>
      </div>`;
  }).join('');
}

/**
 * NEW: Render recent activities from the API
 * Converts activity data to UI with proper color-coding and relative timestamps
 */
function renderRecentActivities(activities) {
  const container = document.getElementById('dash-recent-activities');
  if (!container) return;

  // Fallback if no activities
  if (!activities || activities.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:24px;color:var(--muted);font-size:13px">
        No recent activities.
      </div>`;
    return;
  }

  // Map category to dot color CSS class
  const dotColorMap = {
    'CRITICAL': 'dot-red',
    'HIGH': 'dot-gold',
    'MEDIUM': 'dot-blue',
    'LOW': 'dot-green'
  };

  // Render each activity
  container.innerHTML = activities.map(activity => {
    const dotClass = dotColorMap[activity.category] || 'dot-blue';
    const relativeTime = getRelativeTime(activity.timestamp);

    return `
      <div class="activity-item">
        <div class="activity-dot ${dotClass}"></div>
        <div>
          <div class="activity-desc">${activity.message}</div>
          <div class="activity-time">${relativeTime}</div>
        </div>
      </div>`;
  }).join('');
}

/**
 * Convert ISO timestamp to relative time format
 * Examples: "2 hours ago", "Yesterday", "3 days ago"
 */
function getRelativeTime(timestamp) {
  if (!timestamp) return 'Unknown';

  const now = new Date();
  const activityDate = new Date(timestamp);
  const diffMs = now - activityDate;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  // For older dates, show the date
  return activityDate.toLocaleDateString('en-PH', { 
    month: 'short', 
    day: 'numeric' 
  });
}

function renderPendingRequestsQuickView(requests) {
  const raw     = Array.isArray(requests) ? requests : (requests.data ?? requests.content ?? []);
  const pending = raw.filter(r => r.status === 'PENDING').slice(0, 5);
  const container = document.getElementById('dash-pending-requests-list');
  if (!container) return;

  if (!pending.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:24px;color:var(--muted);font-size:13px">
        No pending requests.
      </div>`;
    return;
  }

  const urgencyColor = {
    CRITICAL:'var(--crimson)',
    HIGH:'var(--amber)',
    MEDIUM:'var(--blue)',
    LOW:'var(--green)'
  };

  // Blood type formatter
  function formatBloodType(type) {
    if (!type) return '–';

    return type
      .replace('_POS', ' Pos')
      .replace('_NEG', ' Neg')
      .replace(/_/g, ' ');
  }

  container.innerHTML = pending.map(r => {
    const name    = r.hospitalProfile?.hospitalName ?? r.requesterName ?? '–';

    // UPDATED
    const blood   = formatBloodType(r.bloodType);

    const units   = r.numberOfUnits ?? 1;
    const urgency = r.urgencyLevel ?? 'LOW';
    const color   = urgencyColor[urgency] || 'var(--muted)';

    return `
      <div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)">
        <div style="width:4px;height:36px;background:${color};border-radius:2px;flex-shrink:0"></div>

        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--charcoal)">
            ${name}
          </div>

          <div style="font-size:11px;color:var(--muted);margin-top:1px">
            ${units} unit${units > 1 ? 's' : ''} · ${urgency[0] + urgency.slice(1).toLowerCase()} urgency
          </div>
        </div>

        <span style="font-family:'Playfair Display',serif;font-weight:700;font-size:15px;color:var(--crimson)">
          ${blood}
        </span>
      </div>`;
  }).join('');
}

function renderRecentActivities(activities) {
  const container = document.getElementById('dash-recent-activities');
  if (!container) return;
 
  // Fallback if no activities
  if (!activities || activities.length === 0) {
    container.innerHTML = `
      <div style="text-align:center;padding:24px;color:var(--muted);font-size:13px">
        No recent activities.
      </div>`;
    return;
  }
 
  // Map severity to dot color CSS class
  const severityDotMap = {
    'CRITICAL': 'dot-red',
    'WARNING': 'dot-gold',
    'INFO': 'dot-blue',
    'SUCCESS': 'dot-green'
  };
 
  // Render each activity
  container.innerHTML = activities.map(activity => {
    const dotClass = severityDotMap[activity.severity] || 'dot-blue';
    const relativeTime = getRelativeTime(activity.timestamp);
 
    return `
      <div class="activity-item">
        <div class="activity-dot ${dotClass}"></div>
        <div>
          <div class="activity-desc">${activity.description}</div>
          <div class="activity-time">${relativeTime}</div>
        </div>
      </div>`;
  }).join('');
}
 
/**
 * Convert ISO timestamp to relative time format
 * Examples: "2 hours ago", "Yesterday", "3 days ago"
 */
function getRelativeTime(timestamp) {
  if (!timestamp) return 'Unknown';
 
  const now = new Date();
  const activityDate = new Date(timestamp);
  const diffMs = now - activityDate;
  const diffMins = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
 
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins} minute${diffMins > 1 ? 's' : ''} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  
  // For older dates, show the date
  return activityDate.toLocaleDateString('en-PH', { 
    month: 'short', 
    day: 'numeric' 
  });
}
 
/**
 * Navigation helper for "View all" link
 */

// -------------------------------------------------------------------------------
// BLOOD BANK
// -------------------------------------------------------------------------------

let BLOOD_BAGS      = [];
let INVENTORY       = [];
const BAGS_PER_PAGE = 10;
let bagsCurrentPage = 1;
let bagsCurrent     = [];
let bagsTotalPages  = 1;
let bagsTotalItems  = 0;
let bagsHasLocalPostFilter = false;
let bagsRequestToken = 0;

const COMPONENT_LABELS = {
  WHOLE_BLOOD:          'Whole Blood',
  PRBC:                 'PRBC',
  LEUKOREDUCED_PRBC:    'Leukoreduced PRBC',
  ALIQUOTED_PRBC:       'Aliquoted PRBC',
  PLATELET_CONCENTRATE: 'Platelet',
  FRESH_FROZEN_PLASMA:  'FFP',
  CRYOPRECIPITATE:      'Cryoprecipitate',
  CRYOSUPERNATANT:      'Cryosupernatant',
};

async function loadBloodBank() {
  await Promise.all([ loadInventory(), loadBloodBags() ]);
}

async function loadInventory() {
  try {
    const res = await fetch('/api/admin/blood-bank/inventory', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();

    const ORDER = ['O_NEG_NEGATIVE','O_POS_POSITIVE','A_POS_POSITIVE','A_NEG_NEGATIVE',
                   'B_POS_POSITIVE','B_NEG_NEGATIVE','AB_POS_POSITIVE','AB_NEG_NEGATIVE'];

    const INVENTORY_LABEL = {
      'O_NEG_NEGATIVE':  'O-',  'O_POS_POSITIVE':  'O+',
      'A_POS_POSITIVE':  'A+',  'A_NEG_NEGATIVE':  'A-',
      'B_POS_POSITIVE':  'B+',  'B_NEG_NEGATIVE':  'B-',
      'AB_POS_POSITIVE': 'AB+', 'AB_NEG_NEGATIVE': 'AB-',
    };

    INVENTORY = ORDER.map(key => {
      const units = data.countByType?.[key] ?? 0;
      return {
        key,
        label:    INVENTORY_LABEL[key] ?? key,
        units,
        volumeMl: data.volumeByType?.[key] ?? 0,
        level:    getInventoryLevel(units)
      };
    });

    renderInventoryGrid(data);
  } catch (err) {
    console.error('Failed to load inventory:', err);
  }
}

function mapBagSortToApi(sortValue) {
  const allowed = new Set(['collected_desc', 'collected_asc', 'expiry_asc', 'expiry_desc', 'registered_desc', 'registered_asc']);
  return allowed.has(sortValue) ? sortValue : 'registered_desc';
}

function normalizeBloodTypeFilterForApi(value) {
  if (!value || value === 'ALL') return value;
  return value.replace(/_(POSITIVE|NEGATIVE)$/i, '');
}

function collectBagsFilterState() {
  return {
    query: (document.getElementById('bags-search')?.value || '').trim(),
    bloodTypeFilter: document.getElementById('bags-filter-bt')?.value || 'ALL',
    componentFilter: document.getElementById('bags-filter-comp')?.value || 'ALL',
    statusFilter: document.getElementById('bags-filter-status')?.value || 'ALL',
    sort: document.getElementById('bags-sort')?.value || 'registered_desc',
    fromDate: document.getElementById('bags-print-from-date')?.value || '',
    toDate: document.getElementById('bags-print-to-date')?.value || '',
  };
}

function applyLocalBagFilters(rows, filters) {
  const {
    query,
    fromDate,
    toDate,
  } = filters;

  const q = query.toLowerCase();
  const rangeStart = fromDate ? new Date(`${fromDate}T00:00:00`) : null;
  const rangeEnd = toDate ? new Date(`${toDate}T23:59:59.999`) : null;

  let list = rows.map((bag) => ({ ...bag, computedStatus: computeBagStatus(bag) }));

  // status, blood type, and component are filtered server-side
  if (rangeStart || rangeEnd) {
    list = list.filter((b) => {
      const collected = parseBloodBagDateValue(b.collectedAt);
      if (!collected) return false;
      const ts = collected.getTime();
      if (rangeStart && ts < rangeStart.getTime()) return false;
      if (rangeEnd && ts > rangeEnd.getTime()) return false;
      return true;
    });
  }
  if (q) {
    list = list.filter((b) =>
      (b.serialNumber || '').toLowerCase().includes(q) ||
      (b.transactionNumber || '').toLowerCase().includes(q) ||
      fullBloodLabel(b.bloodType, b.rhType).toLowerCase().includes(q)
    );
  }

  return list;
}

function updateBagsStatTiles() {
  document.getElementById('bags-available-count').textContent =
    BLOOD_BAGS.filter(b => computeBagStatus(b) === 'AVAILABLE').length;
  document.getElementById('bags-expiring-count').textContent =
    BLOOD_BAGS.filter(b => computeBagStatus(b) === 'EXPIRING').length;
  document.getElementById('bags-dispensed-count').textContent =
    BLOOD_BAGS.filter(b => b.status === 'DISPENSED').length;
  document.getElementById('bags-expired-count').textContent =
    BLOOD_BAGS.filter(b => computeBagStatus(b) === 'EXPIRED').length;
  document.getElementById('bags-discarded-count').textContent =
    BLOOD_BAGS.filter(b => b.status === 'DISCARDED').length;

  const crossEl = document.getElementById('bags-crossmatched-count');
  if (crossEl) {
    crossEl.textContent = BLOOD_BAGS.filter(b => b.status === 'CROSSMATCHED').length;
  }
}

async function loadBloodBags(page = bagsCurrentPage) {
  const requestToken = ++bagsRequestToken;
  try {
    const filters = collectBagsFilterState();
    const params = new URLSearchParams({
      page: String(Math.max(page, 1)),
      size: String(BAGS_PER_PAGE),
      status: filters.statusFilter,
      sort: mapBagSortToApi(filters.sort),
    });
    if (filters.bloodTypeFilter !== 'ALL') {
      params.append('bloodType', normalizeBloodTypeFilterForApi(filters.bloodTypeFilter));
    }
    if (filters.componentFilter !== 'ALL') {
      params.append('component', filters.componentFilter);
    }
    if (filters.query) {
      params.append('search', filters.query);
    }

    const res = await fetch(`/api/admin/blood-bank/bags?${params.toString()}`, { credentials: 'include' });
    if (!res.ok) return;
    const payload = await res.json();
    if (requestToken !== bagsRequestToken) return;
    const data = Array.isArray(payload) ? payload : (payload.data ?? []);

    BLOOD_BAGS = data.map(b => ({
      id:                b.id,
      serialNumber:      b.serialNumber,
      bloodType:         b.bloodType,
      rhType:            b.rhType,
      componentType:     b.componentType,
      volumeMl:          b.volumeMl,
      transactionNumber: b.transactionNumber ?? null,
      remarks:           b.remarks           ?? null,
      collectedAt:       b.collectedAt,
      createdAt:         b.createdAt,
      expiresAt:         b.expiresAt,
      status:            b.status,
      source:            b.source,
      openSystem:        b.openSystem        ?? false,
      openSystemAt:      b.openSystemAt      ?? null,
      receivedBy:        b.receivedBy        ?? null,
      eventName:         b.eventName         ?? null,
      discardReason:     b.discardReason     ?? null,
      dispensedTo:       b.dispensedTo       ?? null,
      dispensedAt:       b.dispensedAt       ?? null,
    }));

    if (Array.isArray(payload)) {
      bagsCurrentPage = Math.max(page, 1);
      bagsTotalPages = 1;
      bagsTotalItems = BLOOD_BAGS.length;
    } else {
      bagsCurrentPage = Math.max(Number(payload.page) || page, 1);
      bagsTotalPages = Math.max(Number(payload.totalPages) || 1, 1);
      bagsTotalItems = Math.max(Number(payload.totalElements) || 0, 0);
    }

    bagsCurrent = applyLocalBagFilters(BLOOD_BAGS, filters);
    bagsHasLocalPostFilter =
      !!filters.fromDate ||
      !!filters.toDate;

    updateBagsStatTiles();
    renderBagsPage();
    
    // Trigger blood request compatible bags cache invalidation
    invalidateBagCache();
  } catch (err) {
    console.error('Failed to load blood bags:', err);
  }
}

// -- Helpers --------------------------------------------------------------------
function getInventoryLevel(units) {
  if (units === 0)  return 'EMPTY';
  if (units <= 5)   return 'CRITICAL';
  if (units <= 20)  return 'LOW';
  if (units <= 50)  return 'GOOD';
  return 'HIGH';
}

function fullBloodLabel(bloodType, rhType) {
  const aboMap = {
    O_NEG:'O', O_POS:'O', A_POS:'A', A_NEG:'A',
    B_POS:'B', B_NEG:'B', AB_POS:'AB', AB_NEG:'AB'
  };
  const abo = aboMap[bloodType] ?? bloodType ?? '';
  const rh  = rhType === 'POSITIVE' ? ' Pos' : rhType === 'NEGATIVE' ? ' Neg' : '';
  return abo + rh;
}

function componentLabel(ct) {
  return COMPONENT_LABELS[ct] ?? ct ?? '–';
}

function sourceLabel(bag) {
  if (bag.eventName) return '\uD83E\uDE78 ' + bag.eventName;
  const map = {
    DONATION:        '\uD83E\uDE78 Blood Drive',
    WALK_IN:         '\uD83D\uDEB6 Walk-in Donor',
    TRANSFER:        '\uD83D\uDE9A BMC Transfer',
    EXTERNAL_SUPPLY: '\uD83D\uDCE6 External Supply',
  };
  return map[bag.source] ?? bag.source ?? '–';
}

function computeBagStatus(bag) {
  const now  = new Date();
  const soon = new Date(); soon.setDate(soon.getDate() + 10);
  const exp  = parseBloodBagDateValue(bag.expiresAt);

  if (bag.status === 'DISCARDED')    return 'DISCARDED';
  if (bag.status === 'DISPENSED')    return 'DISPENSED';
  if (bag.status === 'CROSSMATCHED') return 'CROSSMATCHED';
  if (bag.status === 'EXPIRED' || (bag.status === 'AVAILABLE' && exp && exp < now)) return 'EXPIRED';
  if (bag.status === 'AVAILABLE' && exp && exp <= soon) return 'EXPIRING';
  return 'AVAILABLE';
}

function formatBagDate(d) {
  const parsed = parseBloodBagDateValue(d);
  if (!parsed) return '–';
  return parsed.toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// -- Tab Switcher ---------------------------------------------------------------
function switchBBTab(tab, btn) {
  ['inventory','bags','analytics'].forEach(t => {
    document.getElementById('bb-tab-' + t).style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.bb-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (tab === 'bags')      loadBloodBags(bagsCurrentPage);
  if (tab === 'inventory') renderInventoryGrid();
  if (tab === 'analytics' && window.AnalyticsDashboard && typeof window.AnalyticsDashboard.renderWhenVisible === 'function') {
    window.AnalyticsDashboard.renderWhenVisible();
  }
}

// -- Inventory Grid -------------------------------------------------------------
function renderInventoryGrid(apiData) {
  const grid = document.getElementById('inv-grid');
  if (!grid) return;

  const levelMap = {
    EMPTY:    { label:' Empty',    cls:'level-critical' },
    CRITICAL: { label:' Critical', cls:'level-critical' },
    LOW:      { label:' Low',      cls:'level-low' },
    GOOD:     { label:' Good',     cls:'level-ok' },
    HIGH:     { label:' High',     cls:'level-high' },
  };

  const barColorMap = {
    EMPTY:'bar-critical', CRITICAL:'bar-critical',
    LOW:'bar-low', GOOD:'bar-ok', HIGH:'bar-high'
  };

  const pct = { EMPTY:0, CRITICAL:8, LOW:28, GOOD:60, HIGH:88 };

  grid.innerHTML = INVENTORY.map(item => {
    const lm         = levelMap[item.level];
    const bc         = barColorMap[item.level];
    const isCritical = item.level === 'CRITICAL' || item.level === 'EMPTY';

    return `
      <div class="blood-unit ${isCritical ? 'critical' : ''}">
        <div class="bu-type">${item.label}</div>
        <div class="bu-units">${item.units} units</div>
        <div class="bu-level ${lm.cls}">${lm.label}</div>
        <div class="bu-bar-wrap">
          <div class="bu-bar ${bc}" style="width:${pct[item.level]}%"></div>
        </div>
        <div class="bu-actions">
          <button class="bu-btn" style="color:var(--crimson)"
            onclick="switchBBTab('bags', document.querySelectorAll('.bb-tab')[1]);
                     document.getElementById('bags-filter-bt').value='${item.key}';
                     document.getElementById('bags-filter-status').value='ALL';
                     renderBagsTable()">
            View Bags
          </button>
        </div>
      </div>`;
  }).join('');

  // Open system alert
  const openCount = apiData?.openSystemCount ?? 0;
  const existingAlert = document.getElementById('inv-open-system-alert');
  if (openCount > 0) {
    if (!existingAlert) {
      const alert = document.createElement('div');
      alert.id = 'inv-open-system-alert';
      alert.style.cssText = `background:var(--soft-red);border:1px solid rgba(196,30,58,0.2);
        border-radius:10px;padding:12px 16px;margin-bottom:16px;font-size:13px;
        color:var(--crimson);display:flex;gap:10px;align-items:center`;
      alert.innerHTML = `<span style="font-size:16px">?</span>
        <span><strong>${openCount} open system bag${openCount > 1 ? 's' : ''}</strong>
        converted from Whole Blood – expires in 24 hours. Prioritize immediately.</span>`;
      grid.parentElement.insertBefore(alert, grid);
    }
  } else if (existingAlert) {
    existingAlert.remove();
  }

  // Strip counts
  const now  = new Date();
  const soon = new Date(); soon.setDate(soon.getDate() + 7);
  const expiringSoon = apiData?.expiringSoon
    ?? BLOOD_BAGS.filter(b => {
        const expDate = parseBloodBagDateValue(b.expiresAt);
        return b.status === 'AVAILABLE' && expDate && expDate <= soon && expDate > now;
      }).length;

  document.getElementById('inv-critical-count').textContent =
    INVENTORY.filter(i => i.level === 'CRITICAL' || i.level === 'EMPTY').length;
  document.getElementById('inv-low-count').textContent =
    INVENTORY.filter(i => i.level === 'LOW').length;
  document.getElementById('inv-good-count').textContent =
    INVENTORY.filter(i => ['GOOD','HIGH'].includes(i.level)).length;
  document.getElementById('inv-total-units').textContent =
    INVENTORY.reduce((s, i) => s + i.units, 0);
  document.getElementById('inv-expiring-soon').textContent = expiringSoon;

  document.getElementById('inv-updated').textContent =
    'Updated: ' + new Date().toLocaleTimeString('en-PH', { hour:'2-digit', minute:'2-digit' });
}

// -- Bags Table -----------------------------------------------------------------
async function renderBagsTable(resetPage = true) {
  if (resetPage) {
    bagsCurrentPage = 1;
  }
  await loadBloodBags(bagsCurrentPage);
}

function renderBagsPage() {
  const tbody  = document.getElementById('bags-tbody');
  const empty  = document.getElementById('bags-empty');
  const footer = document.getElementById('bags-footer');
  const total  = bagsCurrent.length;

  if (!total) {
    tbody.innerHTML      = '';
    empty.style.display  = 'block';
    footer.style.display = bagsTotalItems > 0 ? 'flex' : 'none';
    document.getElementById('bags-showing').textContent =
      bagsTotalItems > 0
        ? `No matching rows on page ${bagsCurrentPage} (Total rows: ${bagsTotalItems})`
        : 'No blood bags found';
    document.getElementById('bags-page-label').textContent = `${bagsCurrentPage} / ${bagsTotalPages}`;
    document.getElementById('bags-prev').disabled = bagsCurrentPage <= 1;
    document.getElementById('bags-next').disabled = bagsCurrentPage >= bagsTotalPages;
    return;
  }

  empty.style.display  = 'none';
  footer.style.display = 'flex';
  const now     = new Date();
  const twoDays = new Date(); twoDays.setDate(twoDays.getDate() + 2);
  const soon    = new Date(); soon.setDate(soon.getDate() + 7);

  tbody.innerHTML = bagsCurrent.map(bag => {
    const exp      = parseBloodBagDateValue(bag.expiresAt);
    const daysLeft = calculateBloodBagDaysLeft(bag.expiresAt, now);
    const btLabel  = fullBloodLabel(bag.bloodType, bag.rhType);
    const compLbl  = componentLabel(bag.componentType);

    const openTag = bag.openSystem
      ? `<span style="background:var(--soft-red);color:var(--crimson);
           font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;
           margin-left:5px">OPEN</span>`
      : '';

    let expiryPill;
    if (bag.computedStatus === 'EXPIRED') {
      expiryPill = `<span class="expiry-pill expiry-expired">Expired</span>`;
    } else if (bag.openSystem) {
      expiryPill = `<span class="expiry-pill expiry-critical">${daysLeft <= 0 ? '<1' : daysLeft}d (open)</span>`;
    } else if (exp && exp <= twoDays) {
      expiryPill = `<span class="expiry-pill expiry-critical">${daysLeft}d left</span>`;
    } else if (exp && exp <= soon) {
      expiryPill = `<span class="expiry-pill expiry-soon">${daysLeft}d left</span>`;
    } else {
      expiryPill = `<span class="expiry-pill expiry-ok">${daysLeft}d left</span>`;
    }

    const statusBadgeMap = {
      AVAILABLE:    `<span class="bag-status bag-status-available">Available</span>`,
      EXPIRING:     `<span class="bag-status bag-status-expiring">Expiring</span>`,
      CROSSMATCHED: `<span class="bag-status bag-status-crossmatched">Reserved for patient</span>`,
      DISPENSED:    `<span class="bag-status bag-status-dispensed">Dispensed</span>`,
      EXPIRED:      `<span class="bag-status bag-status-expired">Expired</span>`,
      DISCARDED:    `<span class="bag-status bag-status-discarded">Discarded</span>`,
    };
    const statusBadge = statusBadgeMap[bag.computedStatus] || '';

    let sourceInfo = `<span style="font-size:12px;color:var(--muted)">${sourceLabel(bag)}</span>`;;

    let actions = `
      <button class="btn-ghost" style="font-size:11px;padding:5px 10px"
        onclick="openBagDetail(${bag.id})">View</button>`;
    if (bag.computedStatus === 'AVAILABLE' || bag.computedStatus === 'EXPIRING') {
      actions += `
        <button class="btn-warning" style="font-size:11px;padding:5px 10px"
          onclick="openDiscardModal(${bag.id}, '${bag.serialNumber}')">Discard</button>`;
      // if (bag.componentType === 'WHOLE_BLOOD' && !bag.openSystem) {
      //   actions += `
      //     <button class="btn-secondary" style="font-size:11px;padding:5px 10px"
      //       onclick="confirmOpenSystem(${bag.id}, '${bag.serialNumber}')">? PRBC</button>`;
      // }
    }

    const rowStyle = bag.computedStatus === 'EXPIRING' || bag.openSystem
      ? 'background:rgba(196,30,58,0.02)'
      : (bag.computedStatus === 'EXPIRED' || bag.computedStatus === 'DISCARDED')
      ? 'opacity:0.55'
      : bag.computedStatus === 'CROSSMATCHED'
      ? 'background:rgba(83,74,183,0.03)'
      : '';

    return `
      <tr style="${rowStyle}">
        <td>
          <div style="font-family:monospace;font-size:12px;font-weight:600;color:var(--charcoal)">
            ${bag.serialNumber}${openTag}
          </div>
          ${bag.serialNumber
            ? `<div style="font-size:10px;color:var(--muted);margin-top:1px">S/N: ${bag.serialNumber}</div>`
            : ''}
        </td>
        <td>
          <span style="font-family:'Playfair Display',serif;font-size:15px;font-weight:900">
            ${btLabel}
          </span>
        </td>
        <td><div style="font-size:12px;font-weight:600">${compLbl}</div></td>
        <td style="font-weight:600">${bag.volumeMl} mL</td>
        <td style="font-size:12px;color:var(--muted)">${formatBagDate(bag.collectedAt)}</td>
        <td>
          ${expiryPill}
          <div style="font-size:11px;color:var(--muted);margin-top:2px">${formatBagDate(bag.expiresAt)}</div>
        </td>
        <td>${statusBadge}</td>
        <td>${sourceInfo}</td>
        <td><div style="display:flex;gap:5px;flex-wrap:wrap">${actions}</div></td>
      </tr>`;
  }).join('');

  const pageStart = bagsTotalItems === 0 ? 0 : ((bagsCurrentPage - 1) * BAGS_PER_PAGE) + 1;
  const pageEnd = bagsTotalItems === 0 ? 0 : Math.min(bagsCurrentPage * BAGS_PER_PAGE, bagsTotalItems);
  document.getElementById('bags-showing').textContent = bagsHasLocalPostFilter
    ? `Showing ${total} filtered row(s) on page ${bagsCurrentPage} of ${bagsTotalPages} (${bagsTotalItems} total)`
    : `Showing ${pageStart}–${pageEnd} of ${bagsTotalItems} bags`;
  document.getElementById('bags-page-label').textContent = `${bagsCurrentPage} / ${bagsTotalPages}`;
  document.getElementById('bags-prev').disabled = bagsCurrentPage <= 1;
  document.getElementById('bags-next').disabled = bagsCurrentPage >= bagsTotalPages;
}

function bagsPrevPage() {
  if (bagsCurrentPage > 1) {
    loadBloodBags(bagsCurrentPage - 1);
  }
}
function bagsNextPage() {
  if (bagsCurrentPage < bagsTotalPages) {
    loadBloodBags(bagsCurrentPage + 1);
  }
}

// -- Bag Detail Modal -----------------------------------------------------------
function openBagDetail(id) {
  const bag = BLOOD_BAGS.find(b => b.id === id);
  if (!bag) return;
  const cs = computeBagStatus(bag);

  const statusBadgeMap = {
    AVAILABLE:    `<span class="bag-status bag-status-available"  style="font-size:13px;padding:5px 14px">Available</span>`,
    EXPIRING:     `<span class="bag-status bag-status-expiring"   style="font-size:13px;padding:5px 14px">Expiring Soon</span>`,
    CROSSMATCHED: `<span class="bag-status bag-status-crossmatched" style="font-size:13px;padding:5px 14px">Crossmatched</span>`,
    DISPENSED:    `<span class="bag-status bag-status-dispensed"  style="font-size:13px;padding:5px 14px">Dispensed</span>`,
    EXPIRED:      `<span class="bag-status bag-status-expired"    style="font-size:13px;padding:5px 14px">Expired</span>`,
    DISCARDED:    `<span class="bag-status bag-status-discarded"  style="font-size:13px;padding:5px 14px">Discarded</span>`,
  };

  document.getElementById('bagd-id').textContent        = bag.serialNumber;
  document.getElementById('bagd-status-row').innerHTML  = statusBadgeMap[cs] || '';
  document.getElementById('bagd-blood').textContent     = fullBloodLabel(bag.bloodType, bag.rhType);
  document.getElementById('bagd-volume').textContent    = bag.volumeMl + ' mL';
  document.getElementById('bagd-collected').textContent = formatBagDate(bag.collectedAt);
  document.getElementById('bagd-expires').textContent   = formatBagDate(bag.expiresAt);
  document.getElementById('bagd-source').textContent    = sourceLabel(bag);
  document.getElementById('bagd-component').textContent = componentLabel(bag.componentType) + (bag.openSystem ? ' (Open System)' : '');
  document.getElementById('bagd-txn').textContent       = bag.transactionNumber || '–';
  document.getElementById('bagd-serial').textContent    = bag.serialNumber      || '–';
  document.getElementById('bagd-remarks').textContent   = bag.remarks           || '–';
  document.getElementById('bagd-received-by').textContent = bag.receivedBy      || '–';

  const openWarn = document.getElementById('bagd-open-system-warn');
  if (bag.openSystem) {
    openWarn.style.display = 'block';
    openWarn.innerHTML = `<span>?</span>
      <span>Converted to Open System PRBC on ${formatBagDate(bag.openSystemAt)}. Expires 24hrs after conversion.</span>`;
  } else {
    openWarn.style.display = 'none';
  }

  const dispSection = document.getElementById('bagd-dispensed-section');
  if (bag.status === 'DISPENSED') {
    dispSection.style.display = 'block';
    document.getElementById('bagd-dispensed-to').textContent = bag.dispensedTo   || '–';
    document.getElementById('bagd-dispensed-at').textContent = formatBagDate(bag.dispensedAt);
  } else {
    dispSection.style.display = 'none';
  }

  const discardSection = document.getElementById('bagd-discard-section');
  if (bag.status === 'DISCARDED') {
    discardSection.style.display = 'block';
    document.getElementById('bagd-discard-reason').textContent = bag.discardReason || '–';
  } else {
    discardSection.style.display = 'none';
  }

  const actionsEl = document.getElementById('bagd-actions');
  if (cs === 'AVAILABLE' || cs === 'EXPIRING') {
    actionsEl.innerHTML = `
      <button class="btn-warning" style="flex:1;justify-content:center;padding:11px"
        onclick="closeModal('bagDetailModal');openDiscardModal(${bag.id},'${bag.serialNumber}')">
        Discard Bag
      </button>
      <button class="btn-ghost" onclick="closeModal('bagDetailModal')">Close</button>`;
  } else {
    actionsEl.innerHTML = `
      <button class="btn-secondary" style="flex:1;justify-content:center"
        onclick="closeModal('bagDetailModal')">Close</button>`;
  }

  openModal('bagDetailModal');
}

// -- Open System Conversion -----------------------------------------------------
async function confirmOpenSystem(id, bagLabel) {
  const confirmed = confirm(
    `Convert bag ${bagLabel} from Whole Blood to PRBC (Open System)?\n\n` +
    `Note: This is irreversible. The expiry will reset to 24 hours from now.\n` +
    `Only proceed if the patient is stable and IV line is patent.`
  );
  if (!confirmed) return;

  try {
    const res = await fetch(`/api/admin/blood-bank/bags/${id}/convert-open-system`, {
      method: 'PATCH', credentials: 'include',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || 'Conversion failed.');
      return;
    }
    const updated = await res.json();
    const bag = BLOOD_BAGS.find(b => b.id === id);
    if (bag) {
      bag.openSystem    = true;
      bag.openSystemAt  = updated.openSystemAt;
      bag.componentType = 'PRBC';
      bag.expiresAt     = updated.expiresAt;
    }
    await loadBloodBags(bagsCurrentPage);
    await loadInventory();
    invalidateBagCache();
  } catch (err) {
    console.error('Open system conversion error:', err);
    alert('Network error. Please try again.');
  }
}

// -- Discard --------------------------------------------------------------------
function openDiscardModal(id, bagLabel) {
  document.getElementById('discard-bag-id').textContent       = bagLabel || id;
  document.getElementById('discard-bag-target-id').value      = id;
  document.getElementById('discard-reason').value             = '';
  document.getElementById('discard-other-wrap').style.display = 'none';
  document.getElementById('discard-other').value              = '';
  openModal('discardBagModal');
}

document.addEventListener('change', e => {
  if (e.target.id === 'discard-reason') {
    document.getElementById('discard-other-wrap').style.display =
      e.target.value === 'other' ? 'block' : 'none';
  }
});

async function confirmDiscard() {
  const id        = document.getElementById('discard-bag-target-id').value;
  const reasonSel = document.getElementById('discard-reason').value;
  const reason    = reasonSel === 'other'
    ? (document.getElementById('discard-other').value.trim() || 'Other')
    : reasonSel;

  if (!reason) { alert('Please select a discard reason.'); return; }

  try {
    const res = await fetch(`/api/admin/blood-bank/bags/${id}/discard`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ reason })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || 'Failed to discard bag.');
      return;
    }
    const bag = BLOOD_BAGS.find(b => b.id == id);
    if (bag) { bag.status = 'DISCARDED'; bag.discardReason = reason; }
    closeModal('discardBagModal');
    await loadBloodBags(bagsCurrentPage);
    await loadInventory();
    invalidateBagCache();
  } catch (err) {
    console.error('Discard error:', err);
    alert('Network error. Please try again.');
  }
}

// -- Add Stock Modal ------------------------------------------------------------
const ADD_STOCK_EXPIRY_DAYS = {
  WHOLE_BLOOD: 42,
  PRBC: 42,
  LEUKOREDUCED_PRBC: 42,
  ALIQUOTED_PRBC: 42,
  PLATELET_CONCENTRATE: 5,
  FRESH_FROZEN_PLASMA: 365,
  CRYOPRECIPITATE: 365,
  CRYOSUPERNATANT: 365,
};
const ADD_STOCK_SCAN_MAX_ROWS = 10;
const ADD_STOCK_SCAN_MAX_FILE_BYTES = 5 * 1024 * 1024;
const ADD_STOCK_OCR_LOW_CONFIDENCE = 60;
const ADD_STOCK_SERIAL_MAX_LENGTH = 10;
const ADD_STOCK_VOLUME_MAX_LENGTH = 4;
const ADD_STOCK_REMARKS_MAX_LENGTH = 50;
const ADD_STOCK_SERIAL_ERROR_MESSAGE = '';
const ADD_STOCK_VOLUME_ERROR_MESSAGE = '';
const ADD_STOCK_REMARKS_ERROR_MESSAGE = 'Remarks must not exceed 50 characters.';
const ADD_STOCK_REMARKS_ALLOWED_REGEX = /^[A-Za-z0-9.,\-\s]*$/;
const TRACER_OCR_ROTATIONS = [0, -90, 90];
const TRACER_OCR_CROP_PRESETS = [
  { id: 'table-primary', x: 0.08, y: 0.24, w: 0.74, h: 0.64, priority: 6 },
  { id: 'table-secondary', x: 0.04, y: 0.22, w: 0.8, h: 0.66, priority: 5 },
  { id: 'table-tight', x: 0.12, y: 0.26, w: 0.66, h: 0.6, priority: 4 },
  { id: 'table-wide', x: 0.02, y: 0.2, w: 0.9, h: 0.68, priority: 3 },
];

const TRACER_COMPONENT_MAP = {
  WB: 'WHOLE_BLOOD',
  'W B': 'WHOLE_BLOOD',
  WS: 'WHOLE_BLOOD',
  W8: 'WHOLE_BLOOD',
  WR: 'WHOLE_BLOOD',
  WHOLE: 'WHOLE_BLOOD',
  'WHOLE BLOOD': 'WHOLE_BLOOD',
  PRBC: 'PRBC',
  'P RBC': 'PRBC',
  'P R B C': 'PRBC',
  LPRBC: 'LEUKOREDUCED_PRBC',
  'L-PRBC': 'LEUKOREDUCED_PRBC',
  LEUKOREDUCED: 'LEUKOREDUCED_PRBC',
  APRBC: 'ALIQUOTED_PRBC',
  'A-PRBC': 'ALIQUOTED_PRBC',
  ALIQUOTED: 'ALIQUOTED_PRBC',
  FFP: 'FRESH_FROZEN_PLASMA',
  PLT: 'PLATELET_CONCENTRATE',
  PLATELET: 'PLATELET_CONCENTRATE',
  CRYO: 'CRYOPRECIPITATE',
  CRYOPRECIPITATE: 'CRYOPRECIPITATE',
  CRYOSUP: 'CRYOSUPERNATANT',
  CRYOSUPERNATANT: 'CRYOSUPERNATANT',
};

const TRACER_COLUMN_SPLITS = {
  bloodGroup: [0.00, 0.10],
  component:  [0.10, 0.19],
  serial:     [0.19, 0.33],
  extraction: [0.33, 0.47],
  expiry:     [0.47, 0.60],
};

const TRACER_TABLE_GEOMETRY = {
  bodyStartX: 0.00,
  bodyEndX: 1.00,
  bodyStartY: 0.44,
  bodyEndY: 0.955,
  rowCount: 10,
  columnPaddingRatio: 0.006,
  rowPaddingRatio: 0.02,
};

const TRACER_COLUMN_OCR_OPTIONS = {
  bloodGroup: { whitelist: 'ABOPOSNEG- ', psm: '6' },
  component: { whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ- ', psm: '6' },
  serial: { whitelist: 'V0123456789', psm: '6' },
  extraction: { whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ ', psm: '6' },
  expiry: { whitelist: '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ ', psm: '6' },
};

const TRACER_COMPONENT_LOOKUP = buildTracerComponentLookup(TRACER_COMPONENT_MAP);
const TRACER_ROW_NOISE_TOKENS = [
  'BLOOD RELEASING', 'BLOOD TRACER', 'CHECKLIST', 'REMARKS', 'SIGNATURE',
  'BICOL MEDICAL', 'RESULT OF TEST', 'PATIENT', 'CONTACT', 'TRANSPORT',
  'ADDRESS', 'QC STAFF', 'DATE RELEASED', 'TIME RELEASED'
];
const TRACER_OCR_API_ENDPOINT = '/api/admin/blood-bank/tracer-ocr';
const TRACER_REVIEW_BLOOD_GROUP_OPTIONS = [
  { value: '', label: '-' },
  { value: 'A_POS', label: 'A POS' },
  { value: 'A_NEG', label: 'A NEG' },
  { value: 'B_POS', label: 'B POS' },
  { value: 'B_NEG', label: 'B NEG' },
  { value: 'AB_POS', label: 'AB POS' },
  { value: 'AB_NEG', label: 'AB NEG' },
  { value: 'O_POS', label: 'O POS' },
  { value: 'O_NEG', label: 'O NEG' },
];
const TRACER_REVIEW_COMPONENT_OPTIONS = [
  { value: '', label: '-' },
  { value: 'WHOLE_BLOOD', label: 'WB' },
  { value: 'PRBC', label: 'PRBC' },
  { value: 'LEUKOREDUCED_PRBC', label: 'L-PRBC' },
  { value: 'ALIQUOTED_PRBC', label: 'A-PRBC' },
  { value: 'FRESH_FROZEN_PLASMA', label: 'FFP' },
  { value: 'PLATELET_CONCENTRATE', label: 'PC' },
  { value: 'CRYOPRECIPITATE', label: 'CRYO' },
  { value: 'CRYOSUPERNATANT', label: 'CRYOSUP' },
];

let addStockScanBound = false;
let addStockValidationBound = false;
let addStockScanPreviewUrl = null;
let pendingTracerReviewRows = [];
let pendingTracerScanMeta = null;
let tracerScanProgressTimer = null;
let tracerScanProgressValue = 0;
let tracerScanProgressStage = 'Preparing tracer OCR...';

function initAddStockScanner() {
  if (addStockScanBound) return;
  addStockScanBound = true;

  const uploadInput = document.getElementById('scan-tracer-upload');
  const cameraInput = document.getElementById('scan-tracer-camera');
  const cameraBtn = document.getElementById('scan-tracer-camera-btn');

  if (cameraBtn) {
    cameraBtn.addEventListener('click', () => {
      if (!cameraInput) {
        showBloodPlusMessage('Camera Unavailable', 'Camera capture is not available on this device.', 'warning');
        return;
      }
      cameraInput.click();
    });
  }

  if (uploadInput) uploadInput.addEventListener('change', handleTracerFilePicked);
  if (cameraInput) cameraInput.addEventListener('change', handleTracerFilePicked);
}

function resetAddStockScannerUI() {
  stopTracerScanProgress();
  const previewEl = document.getElementById('scan-tracer-preview');
  if (previewEl) {
    previewEl.innerHTML = '';
    previewEl.classList.remove('has-image');
  }

  if (addStockScanPreviewUrl) {
    URL.revokeObjectURL(addStockScanPreviewUrl);
    addStockScanPreviewUrl = null;
  }

  pendingTracerReviewRows = [];
  pendingTracerScanMeta = null;

  setTracerScanStatus('No tracer form imported yet.', 'info');
  closeTracerOcrReviewModal();

  const uploadInput = document.getElementById('scan-tracer-upload');
  const cameraInput = document.getElementById('scan-tracer-camera');
  if (uploadInput) uploadInput.value = '';
  if (cameraInput) cameraInput.value = '';
}

function setTracerScanStatus(message, tone = 'info') {
  const statusEl = document.getElementById('scan-tracer-status');
  if (!statusEl) return;

  statusEl.textContent = message || '';
  statusEl.classList.remove('is-loading', 'is-success', 'is-warning', 'is-error');

  if (tone === 'loading') statusEl.classList.add('is-loading');
  if (tone === 'success') statusEl.classList.add('is-success');
  if (tone === 'warning') statusEl.classList.add('is-warning');
  if (tone === 'error') statusEl.classList.add('is-error');
}

function renderTracerScanProgress() {
  const safeValue = Math.max(0, Math.min(100, Math.round(tracerScanProgressValue)));
  setTracerScanStatus(`${tracerScanProgressStage} ${safeValue}%`, 'loading');
}

function startTracerScanProgress(stage = 'Preparing tracer OCR...') {
  stopTracerScanProgress();
  tracerScanProgressStage = stage;
  tracerScanProgressValue = 0;
  renderTracerScanProgress();
  tracerScanProgressTimer = setInterval(() => {
    if (tracerScanProgressValue >= 95) return;
    const step = tracerScanProgressValue < 50 ? 5 : (tracerScanProgressValue < 80 ? 3 : 1);
    tracerScanProgressValue = Math.min(95, tracerScanProgressValue + step);
    renderTracerScanProgress();
  }, 350);
}

function bumpTracerScanProgress(stage, minValue) {
  if (stage) tracerScanProgressStage = stage;
  if (Number.isFinite(minValue)) {
    tracerScanProgressValue = Math.max(tracerScanProgressValue, Math.min(95, Number(minValue)));
  }
  renderTracerScanProgress();
}

function stopTracerScanProgress() {
  if (tracerScanProgressTimer) {
    clearInterval(tracerScanProgressTimer);
    tracerScanProgressTimer = null;
  }
}

function setTracerPreviewImage(file) {
  const previewEl = document.getElementById('scan-tracer-preview');
  if (!previewEl || !file) return;

  if (addStockScanPreviewUrl) {
    URL.revokeObjectURL(addStockScanPreviewUrl);
    addStockScanPreviewUrl = null;
  }

  addStockScanPreviewUrl = URL.createObjectURL(file);
  previewEl.innerHTML = `<img src="${addStockScanPreviewUrl}" alt="Tracer form preview">`;
  previewEl.classList.add('has-image');
}

async function handleTracerFilePicked(event) {
  const input = event?.target;
  const file = input?.files?.[0];
  if (!file) return;

  const sourceName = input?.id === 'scan-tracer-camera' ? 'camera' : 'upload';
  await processTracerScanFile(file, sourceName);
  if (input) input.value = '';
}

async function processTracerScanFile(file, sourceName = 'upload') {
  if (!isSupportedTracerImageFile(file)) {
    setTracerScanStatus('Unsupported image format.', 'error');
    showBloodPlusMessage('Unsupported Image', 'Please upload or capture a JPG, PNG, WEBP, BMP, TIFF, or JFIF image.', 'warning');
    return;
  }
  if (Number(file?.size || 0) > ADD_STOCK_SCAN_MAX_FILE_BYTES) {
    setTracerScanStatus('Image exceeds 5MB limit.', 'error');
    showBloodPlusMessage('File Too Large', 'Please upload an image smaller than 5MB for tracer OCR.', 'warning');
    return;
  }

  setTracerPreviewImage(file);
  startTracerScanProgress('Preparing tracer OCR...');

  try {
    let scanResult = null;
    bumpTracerScanProgress('Uploading to secure OCR service...', 20);
    try {
      scanResult = await scanBloodTracerFormViaBackend(file);
    } catch (backendError) {
      if (backendError?.code === 'DUPLICATE_SERIALS') {
        const duplicates = Array.isArray(backendError?.duplicateSerials) ? backendError.duplicateSerials : [];
        stopTracerScanProgress();
        setTracerScanStatus('Duplicate serial numbers detected. Import blocked.', 'error');
        openTracerDuplicateErrorModal(duplicates);
        return;
      }
      throw backendError;
    }

    bumpTracerScanProgress('Processing OCR results...', 78);
    logTracerScanResult(scanResult, file, sourceName);
    const rows = sanitizeOCRImportedRows(Array.isArray(scanResult?.entries) ? scanResult.entries : []);
    scanResult.entries = rows;

    if (!rows.length) {
      stopTracerScanProgress();
      setTracerScanStatus('Please verify the scan and review data before importing.', 'warning');
      showBloodPlusMessage(
        'Review Required',
        'Please verify the scanned data before importing.',
        'warning'
      );
      return;
    }

    const warningMessages = [];
    if (Array.isArray(scanResult?.warnings) && scanResult.warnings.length) {
      warningMessages.push(...scanResult.warnings);
    }
    if (rows.length > ADD_STOCK_SCAN_MAX_ROWS) {
      warningMessages.push(`Detected ${rows.length} rows. Only the first ${ADD_STOCK_SCAN_MAX_ROWS} rows are available for import.`);
    }
    if (scanResult.confidence < ADD_STOCK_OCR_LOW_CONFIDENCE) {
      warningMessages.push('Always review extracted data before importing.');
    }
    const unknownComponentRows = rows.filter(row => !row.componentType).length;
    if (unknownComponentRows > 0) {
      warningMessages.push(`${unknownComponentRows} row(s) have unrecognized component labels and were marked as Needs Review.`);
    }
    const reviewStates = buildTracerReviewStates(rows);
    const duplicateRows = reviewStates.filter(state => state.duplicateSerial).length;
    if (duplicateRows > 0) {
      warningMessages.push(`${duplicateRows} duplicate serial row(s) were detected and flagged.`);
    }
    const invalidDateRows = reviewStates.filter(state => state.invalidDate).length;
    if (invalidDateRows > 0) {
      warningMessages.push(`${invalidDateRows} row(s) have invalid date ranges and were flagged.`);
    }
    if (warningMessages.length) {
      showBloodPlusMessage('OCR Review Notice', warningMessages.join(' '), 'warning');
    }

    bumpTracerScanProgress('Finalizing scan...', 95);
    tracerScanProgressValue = 100;
    renderTracerScanProgress();
    stopTracerScanProgress();
    openTracerOcrReviewModal(rows, scanResult, sourceName);
    setTracerScanStatus(`${rows.length} row(s) detected. Review and confirm import.`, 'success');
  } catch (error) {
    console.error('[Tracer OCR] Scan failed:', error);
    stopTracerScanProgress();
    setTracerScanStatus('OCR failed. Please try another image.', 'error');
    showBloodPlusMessage(
      'OCR Failed',
      error?.message || 'Unable to scan this tracer form image. Please retake the photo and try again.',
      'error'
    );
  }
}

function isSupportedTracerImageFile(file) {
  if (!file) return false;
  const type = String(file.type || '').toLowerCase();
  if (type.startsWith('image/')) return true;

  const name = String(file.name || '').toLowerCase();
  return /\.(jpe?g|png|webp|bmp|tiff?|jfif)$/.test(name);
}

async function scanBloodTracerFormViaBackend(file) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(TRACER_OCR_API_ENDPOINT, {
    method: 'POST',
    credentials: 'include',
    body: formData,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload?.error || payload?.message || 'OCR service failed.';
    const error = new Error(message);
    error.code = payload?.errorCode || '';
    error.duplicateSerials = Array.isArray(payload?.duplicateSerials) ? payload.duplicateSerials : [];
    throw error;
  }

  const rows = Array.isArray(payload?.rows) ? payload.rows : [];
  return {
    text: payload?.rawText || '',
    confidence: Number(payload?.confidence || 0),
    entries: rows,
    transactionNumber: String(payload?.transactionNumber || '').trim(),
    warnings: Array.isArray(payload?.warnings) ? payload.warnings : [],
    attempt: 'backend-ocr-space',
    score: scoreTracerOcrCandidate(rows, Number(payload?.confidence || 0), 0),
  };
}

function openTracerOcrReviewModal(rows, scanResult, sourceName) {
  const limitedRows = rows.slice(0, ADD_STOCK_SCAN_MAX_ROWS);
  pendingTracerReviewRows = limitedRows;
  pendingTracerScanMeta = {
    ...scanResult,
    sourceName,
    totalDetected: rows.length,
  };

  const summaryEl = document.getElementById('tracer-ocr-review-summary');
  const tbody = document.getElementById('tracer-ocr-review-rows');
  const duplicateEl = document.getElementById('tracer-ocr-duplicate-error');
  const importBtn = document.getElementById('tracer-ocr-import-btn');
  const txnInput = document.getElementById('tracer-ocr-transaction-number');
  if (!summaryEl || !tbody) return;

  if (duplicateEl) {
    duplicateEl.style.display = 'none';
    duplicateEl.innerHTML = '';
  }
  if (importBtn) importBtn.disabled = false;
  if (txnInput) {
    const rawTxn = String(scanResult?.transactionNumber || document.getElementById('add-transaction-number')?.value || '').trim();
    txnInput.value = rawTxn.replace(/\D/g, '').slice(0, 10);
  }

  const overLimit = rows.length > ADD_STOCK_SCAN_MAX_ROWS;
  const reviewStates = buildTracerReviewStates(limitedRows);
  const validCount = reviewStates.filter(state => state.importReady).length;
  summaryEl.innerHTML = `
    <strong>Source:</strong> ${sourceName} |
    <strong>OCR confidence:</strong> ${Math.round(Number(scanResult?.confidence || 0))}% |
    <strong>Detected:</strong> ${rows.length} row(s) |
    <strong>Review list:</strong> ${limitedRows.length} row(s)
    ${overLimit ? `<br><span style="color:var(--amber);font-weight:700">Only first ${ADD_STOCK_SCAN_MAX_ROWS} rows are available due to batch limit.</span>` : ''}
    ${validCount === 0 ? `<br><span style="color:var(--crimson);font-weight:700">No fully valid rows detected. You may include rows for manual correction.</span>` : ''}
  `;

  tbody.innerHTML = limitedRows.map((row, index) => {
    const assessment = reviewStates[index];
    let statusClass = 'status-good';
    let statusLabel = 'Ready';
    if (assessment.duplicateSerial) {
      statusClass = 'status-review';
      statusLabel = 'Duplicate Serial';
    } else if (assessment.invalidDate) {
      statusClass = 'status-review';
      statusLabel = 'Invalid Date';
    } else if (assessment.isLowConfidence) {
      statusClass = 'status-low';
      statusLabel = 'Low Confidence';
    } else if (assessment.bloodGroupInferred) {
      statusClass = 'status-review';
      statusLabel = 'Blood Group Inferred';
    } else if (assessment.needsReview) {
      statusClass = 'status-review';
      statusLabel = 'Needs Review';
    }
    const checked = (assessment.importReady && !assessment.needsReview) ? 'checked' : '';
    const rowClass = `${assessment.needsReview ? 'needs-review' : ''} ${assessment.isLowConfidence ? 'low-confidence' : ''}`.trim();
    const bloodGroupOptions = renderTracerReviewSelectOptions(TRACER_REVIEW_BLOOD_GROUP_OPTIONS, row.bloodGroup || '');
    const componentOptions = renderTracerReviewSelectOptions(TRACER_REVIEW_COMPONENT_OPTIONS, row.componentType || '');

    return `
      <tr class="${rowClass}">
        <td>${index + 1}</td>
        <td><input type="checkbox" class="tracer-ocr-row-check" data-row-index="${index}" ${checked}></td>
        <td class="tracer-ocr-edit-cell">
          <select class="tracer-ocr-edit tracer-ocr-edit-blood-group" data-row-index="${index}">
            ${bloodGroupOptions}
          </select>
        </td>
        <td class="tracer-ocr-edit-cell">
          <select class="tracer-ocr-edit tracer-ocr-edit-component" data-row-index="${index}">
            ${componentOptions}
          </select>
        </td>
        <td class="tracer-ocr-edit-cell">
          <input type="text" class="tracer-ocr-edit tracer-ocr-edit-serial" data-row-index="${index}" value="${escapeHtml(row.serialNumber || '')}" placeholder="e.g. V457679" maxlength="10" oninput="enforceSerialNumberFormat(this)">
        </td>
        <td class="tracer-ocr-edit-cell">
          <input type="date" class="tracer-ocr-edit tracer-ocr-edit-collected" data-row-index="${index}" value="${escapeHtml(row.collectedAt || '')}">
        </td>
        <td class="tracer-ocr-edit-cell">
          <input type="date" class="tracer-ocr-edit tracer-ocr-edit-expires" data-row-index="${index}" value="${escapeHtml(row.expiresAt || '')}">
        </td>
        <td>
          <span class="tracer-ocr-status-chip ${statusClass}">${statusLabel}</span>
          ${assessment.reasons.length ? `<div style="margin-top:4px;font-size:10px;color:var(--muted)">${assessment.reasons.join(', ')}</div>` : ''}
        </td>
      </tr>
    `;
  }).join('');

  bindTracerReviewEditHitArea();
  openModal('tracerOcrReviewModal');
}

function bindTracerReviewEditHitArea() {
  const tbody = document.getElementById('tracer-ocr-review-rows');
  if (!tbody || tbody.dataset.hitAreaBound === 'true') return;
  tbody.dataset.hitAreaBound = 'true';

  tbody.addEventListener('click', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    if (target.closest('.tracer-ocr-edit, .tracer-ocr-row-check')) return;

    const editableCell = target.closest('td.tracer-ocr-edit-cell');
    if (!editableCell) return;

    const field = editableCell.querySelector('.tracer-ocr-edit');
    if (!(field instanceof HTMLElement)) return;

    field.focus();

    if (field instanceof HTMLInputElement) {
      if (field.type === 'date' && typeof field.showPicker === 'function') {
        field.showPicker();
        return;
      }
      if (field.type === 'text') {
        const len = field.value.length;
        try { field.setSelectionRange(len, len); } catch (_) {}
      }
    }

    if (field instanceof HTMLSelectElement) {
      field.click();
    }
  });
}

function openTracerDuplicateErrorModal(duplicateSerials) {
  const summaryEl = document.getElementById('tracer-ocr-review-summary');
  const tbody = document.getElementById('tracer-ocr-review-rows');
  const duplicateEl = document.getElementById('tracer-ocr-duplicate-error');
  const importBtn = document.getElementById('tracer-ocr-import-btn');
  const txnInput = document.getElementById('tracer-ocr-transaction-number');
  const list = (Array.isArray(duplicateSerials) ? duplicateSerials : [])
    .map(serial => String(serial || '').trim())
    .filter(Boolean);

  pendingTracerReviewRows = [];
  pendingTracerScanMeta = {
    sourceName: 'upload',
    totalDetected: 0,
    confidence: 0,
    duplicateSerials: list,
  };

  if (summaryEl) {
    summaryEl.innerHTML = `
      <strong>Import blocked:</strong> Duplicate serial numbers were found in inventory.
      <br><span style="color:var(--crimson);font-weight:700">No rows were imported.</span>
    `;
  }
  if (tbody) {
    tbody.innerHTML = `
      <tr class="needs-review">
        <td>1</td>
        <td>-</td>
        <td colspan="6">Duplicate serials detected. Resolve duplicates before scanning/importing again.</td>
      </tr>
    `;
  }
  if (duplicateEl) {
    duplicateEl.style.display = 'block';
    duplicateEl.innerHTML = `
      <strong>Some serial numbers already exist.</strong><br>
      ${list.length ? list.map(serial => `• ${escapeHtml(serial)}`).join('<br>') : 'No duplicate list provided.'}
    `;
  }
  if (txnInput) txnInput.value = '';
  if (importBtn) importBtn.disabled = true;

  openModal('tracerOcrReviewModal');
}

function renderTracerReviewSelectOptions(options, selectedValue) {
  const selected = String(selectedValue || '');
  return (Array.isArray(options) ? options : []).map(option => {
    const value = String(option?.value ?? '');
    const label = String(option?.label ?? value);
    return `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`;
  }).join('');
}

function closeTracerOcrReviewModal() {
  closeModal('tracerOcrReviewModal');
}

function printTracerScannedData() {
  pendingTracerReviewRows = collectTracerReviewRowsFromTable(pendingTracerReviewRows);
  if (!Array.isArray(pendingTracerReviewRows) || pendingTracerReviewRows.length === 0) {
    showBloodPlusMessage('No Scanned Data', 'There is no scanned OCR data to print yet.', 'warning');
    return;
  }

  const reviewStates = buildTracerReviewStates(pendingTracerReviewRows);
  const now = new Date();
  const generatedAt = now.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
  const source = pendingTracerScanMeta?.sourceName || 'scan';
  const confidence = Math.round(Number(pendingTracerScanMeta?.confidence || 0));
  const detected = Number(pendingTracerScanMeta?.totalDetected || pendingTracerReviewRows.length);
  const transactionNumber = String(document.getElementById('tracer-ocr-transaction-number')?.value || '').trim();

  const rowsHtml = pendingTracerReviewRows.map((row, index) => {
    const state = reviewStates[index];
    const status = state?.importReady ? 'READY' : 'NEEDS REVIEW';
    const reasons = Array.isArray(state?.reasons) && state.reasons.length
      ? state.reasons.join(', ')
      : '-';
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeHtml(row?.bloodGroup || '-')}</td>
        <td>${escapeHtml(row?.componentType || row?.unknownComponentLabel || '-')}</td>
        <td>${escapeHtml(row?.serialNumber || '-')}</td>
        <td>${escapeHtml(row?.collectedAt || '-')}</td>
        <td>${escapeHtml(row?.expiresAt || '-')}</td>
        <td>${escapeHtml(status)}</td>
        <td>${escapeHtml(reasons)}</td>
      </tr>
    `;
  }).join('');

  const reportHtml = `
<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>BloodPlus - OCR Scanned Data</title>
  <style>
    :root { --crimson:#c41e3a; --charcoal:#1f2a37; --muted:#6b7280; --border:#e5d7cf; --cream:#f8f4f1; }
    * { box-sizing:border-box; }
    body { margin:0; padding:20px; font-family:Arial, sans-serif; color:var(--charcoal); background:#fff; }
    .header { border:1px solid var(--border); border-left:4px solid var(--crimson); border-radius:10px; padding:12px 14px; margin-bottom:12px; }
    .title { margin:0 0 4px; font-size:22px; font-weight:700; color:var(--crimson); }
    .meta { margin:2px 0; font-size:12px; color:var(--muted); }
    table { width:100%; border-collapse:collapse; font-size:12px; }
    thead th { background:var(--cream); border:1px solid var(--border); text-align:left; padding:8px; }
    tbody td { border:1px solid var(--border); padding:7px; vertical-align:top; }
    .note { margin-top:10px; font-size:11px; color:var(--muted); }
    @page { size: A4 landscape; margin: 10mm; }
  </style>
</head>
<body>
  <div class="header">
    <h1 class="title">BloodPlus - Tracer OCR Scanned Data</h1>
    <p class="meta">Source: ${escapeHtml(source)} | OCR Confidence: ${confidence}% | Detected Rows: ${detected}</p>
    <p class="meta">Transaction Number: ${escapeHtml(transactionNumber || '-')}</p>
    <p class="meta">Generated: ${escapeHtml(generatedAt)}</p>
  </div>
  <table>
    <thead>
      <tr>
        <th>#</th>
        <th>Blood Group</th>
        <th>Component</th>
        <th>Serial Number</th>
        <th>Extraction Date</th>
        <th>Expiry Date</th>
        <th>Status</th>
        <th>Reason</th>
      </tr>
    </thead>
    <tbody>
      ${rowsHtml}
    </tbody>
  </table>
  <p class="note">This report reflects OCR-detected rows before final stock submission.</p>
  <script>
    window.onload = function () { window.print(); };
  </script>
</body>
</html>
  `;

  const printWindow = window.open('', '_blank', 'width=1200,height=800');
  if (!printWindow) {
    showBloodPlusMessage('Print Blocked', 'Please allow popups in your browser to print scanned OCR data.', 'warning');
    return;
  }
  printWindow.document.open();
  printWindow.document.write(reportHtml);
  printWindow.document.close();
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function confirmTracerOcrImport() {
  pendingTracerReviewRows = collectTracerReviewRowsFromTable(pendingTracerReviewRows);
  const duplicateEl = document.getElementById('tracer-ocr-duplicate-error');
  if (duplicateEl && duplicateEl.style.display !== 'none') {
    showBloodPlusMessage('Import Blocked', 'Duplicate serial numbers were detected. Resolve duplicates before importing.', 'error');
    return;
  }

  const transactionInput = document.getElementById('tracer-ocr-transaction-number');
  const transactionNumber = String(transactionInput?.value || '')
    .replace(/\D/g, '')
    .slice(0, 10)
    .trim();
  if (transactionInput) transactionInput.value = transactionNumber;
  if (!transactionNumber) {
    showBloodPlusMessage('Transaction Number Required', 'Transaction number is required.', 'warning');
    if (transactionInput) transactionInput.focus();
    return;
  }

  const mainTxnInput = document.getElementById('add-transaction-number');
  if (mainTxnInput) mainTxnInput.value = transactionNumber;

  const selectedIndices = [...document.querySelectorAll('#tracer-ocr-review-rows .tracer-ocr-row-check:checked')]
    .map(el => Number(el.getAttribute('data-row-index')))
    .filter(Number.isFinite);

  if (!selectedIndices.length) {
    showBloodPlusMessage('No Rows Selected', 'Please select at least one row to import.', 'warning');
    return;
  }

  const selectedRows = selectedIndices.map(index => pendingTracerReviewRows[index]).filter(Boolean);
  const selectedSerials = selectedRows
    .map(row => String(row?.serialNumber || '').trim().toUpperCase())
    .filter(Boolean);
  const duplicateSerialInSelection = selectedSerials.find((serial, idx) => selectedSerials.indexOf(serial) !== idx);
  if (duplicateSerialInSelection) {
    showBloodPlusMessage('Duplicate Serial', `Duplicate serial number selected: ${duplicateSerialInSelection}. Remove duplicates before importing.`, 'error');
    return;
  }

  const reviewStates = buildTracerReviewStates(selectedRows);
  const needsReviewCount = reviewStates.filter(state => state.needsReview).length;

  const proceed = () => {
    const stats = applyScannedRowsToAddStock(selectedRows, pendingTracerScanMeta || {});
    closeTracerOcrReviewModal();
    setTracerScanStatus(`Imported ${stats.importedCount} row(s). Review highlighted rows before submit.`, 'success');

    const warningBits = [];
    if (stats.unknownCount > 0) warningBits.push(`${stats.unknownCount} row(s) have unknown components.`);
    if (stats.lowConfidenceCount > 0) warningBits.push('Always review extracted data before importing.');
    const extra = warningBits.length ? ` ${warningBits.join(' ')}` : '';

    showBloodPlusMessage(
      'Scan Imported',
      `Imported ${stats.importedCount} row(s) into intake rows.${extra}`,
      warningBits.length ? 'warning' : 'success'
    );
  };

  if (needsReviewCount > 0) {
    showBloodPlusConfirm(
      'Import Needs-Review Rows?',
      `${needsReviewCount} selected row(s) need review. You can still edit all values after import. Continue?`,
      proceed,
      'warning'
    );
    return;
  }

  proceed();
}

function collectTracerReviewRowsFromTable(baseRows) {
  const sourceRows = Array.isArray(baseRows) ? baseRows : [];
  const rows = sourceRows.map((row, index) => {
    const bloodGroup = sanitizeAddStockBloodGroup(
      document.querySelector(`.tracer-ocr-edit-blood-group[data-row-index="${index}"]`)?.value || ''
    );
    const componentType = normalizeAddStockComponentValue(
      document.querySelector(`.tracer-ocr-edit-component[data-row-index="${index}"]`)?.value || ''
    );
    const serialNumber = normalizeAddStockSerialValue(
      document.querySelector(`.tracer-ocr-edit-serial[data-row-index="${index}"]`)?.value || ''
    );
    const collectedAt = parseDateCandidate(
      document.querySelector(`.tracer-ocr-edit-collected[data-row-index="${index}"]`)?.value || ''
    );
    const expiresAt = parseDateCandidate(
      document.querySelector(`.tracer-ocr-edit-expires[data-row-index="${index}"]`)?.value || ''
    );

    return {
      ...row,
      bloodGroup,
      componentType,
      serialNumber,
      collectedAt,
      expiresAt,
    };
  });
  return rows;
}

function applyScannedRowsToAddStock(scannedRows, scanResult = {}) {
  const rowsToApply = Array.isArray(scannedRows) ? scannedRows.slice(0, ADD_STOCK_SCAN_MAX_ROWS) : [];
  if (!rowsToApply.length) {
    return { importedCount: 0, unknownCount: 0, lowConfidenceCount: 0 };
  }

  generateAddStockRows(rowsToApply.length);
  const reviewStates = buildTracerReviewStates(rowsToApply);

  const rowEls = [...document.querySelectorAll('#add-stock-rows tr')];
  const defaultVolume = String(document.getElementById('add-volume-ml')?.value || '')
    .replace(/\D/g, '')
    .slice(0, ADD_STOCK_VOLUME_MAX_LENGTH);
  let unknownCount = 0;
  let lowConfidenceCount = 0;

  rowEls.forEach((row, index) => {
    const parsed = rowsToApply[index];
    if (!row || !parsed) return;

    const assessment = reviewStates[index] || evaluateTracerRow(parsed);
    row.dataset.ocrImported = 'true';
    row.dataset.lowConfidence = assessment.isLowConfidence ? 'true' : 'false';
    row.dataset.unknownComponent = parsed.componentType ? 'false' : 'true';

    const bloodGroupEl = row.querySelector('.add-stock-blood-group');
    const componentEl = row.querySelector('.add-stock-component');
    const serialEl = row.querySelector('.add-stock-serial');
    const collectedEl = row.querySelector('.add-stock-collected');
    const expiresEl = row.querySelector('.add-stock-expires');
    const volumeEl = row.querySelector('.add-stock-volume');
    const remarksEl = row.querySelector('.add-stock-remarks');

    if (bloodGroupEl) bloodGroupEl.value = sanitizeAddStockBloodGroup(parsed.bloodGroup || '');
    if (componentEl) componentEl.value = normalizeAddStockComponentValue(parsed.componentType || '', parsed.unknownComponentLabel || '');
    if (serialEl) serialEl.value = normalizeAddStockSerialValue(parsed.serialNumber || '');
    if (collectedEl) collectedEl.value = parseDateCandidate(parsed.collectedAt || '');
    if (expiresEl) expiresEl.value = parseDateCandidate(parsed.expiresAt || '');
    if (volumeEl) {
      const sanitizedVolume = String(parsed.volumeMl || '').replace(/\D/g, '').slice(0, ADD_STOCK_VOLUME_MAX_LENGTH);
      volumeEl.value = sanitizedVolume || defaultVolume;
    }
    if (remarksEl) {
      remarksEl.value = String(parsed.remarks || '')
        .replace(/<[^>]*>/g, '')
        .replace(/[^A-Za-z0-9.,\-\s]/g, '')
        .slice(0, ADD_STOCK_REMARKS_MAX_LENGTH);
    }

    if (!parsed.componentType && parsed.unknownComponentLabel) {
      unknownCount += 1;
    }
    if (assessment.isLowConfidence) {
      lowConfidenceCount += 1;
    }

    validateAddStockRowInputs(row);
    refreshImportedRowReviewState(row);
  });

  updateAddStockValidCount();

  return {
    importedCount: rowsToApply.length,
    unknownCount,
    lowConfidenceCount,
    sourceConfidence: Math.round(Number(scanResult?.confidence || 0)),
  };
}

function buildTracerReviewStates(rows) {
  const seenSerials = new Set();
  return (Array.isArray(rows) ? rows : []).map(row => evaluateTracerRow(row, { seenSerials }));
}

function evaluateTracerRow(row, context = {}) {
  const reasons = [];
  const seenSerials = context?.seenSerials instanceof Set ? context.seenSerials : null;
  const bloodGroupOk = !!row?.bloodGroup;
  const bloodGroupInferred = !!row?.bloodGroupInferred;
  const componentOk = !!row?.componentType;
  const serialPatternOk = isAddStockSerialValueValid(String(row?.serialNumber || '').toUpperCase());
  const serialOk = !!row?.serialNumber && serialPatternOk;
  const hasDate = !!(row?.collectedAt && row?.expiresAt);
  const lowConfidence = Number(row?.confidence || 0) < ADD_STOCK_OCR_LOW_CONFIDENCE;
  const invalidDate = !!row?.dateIssue;
  const externalNeedsReview = !!row?.needsReview;
  const externalIssues = Array.isArray(row?.issues) ? row.issues.filter(Boolean) : [];

  let duplicateSerial = false;
  const normalizedSerial = String(row?.serialNumber || '').toUpperCase();
  if (normalizedSerial && seenSerials) {
    if (seenSerials.has(normalizedSerial)) {
      duplicateSerial = true;
    } else {
      seenSerials.add(normalizedSerial);
    }
  }

  if (!bloodGroupOk) reasons.push('Missing blood group');
  if (bloodGroupInferred) reasons.push('Blood Group Inferred');
  if (!componentOk) reasons.push('Unknown component');
  if (!row?.serialNumber) reasons.push('Missing serial number');
  if (row?.serialNumber && !serialPatternOk) reasons.push('Invalid serial format');
  if (duplicateSerial) reasons.push('Duplicate Serial');
  if (!hasDate) reasons.push('Missing Field: Date');
  if (invalidDate) reasons.push('Invalid Date');
  if (lowConfidence) reasons.push('Low Confidence');
  externalIssues.forEach(issue => reasons.push(issue));
  if (externalNeedsReview && !externalIssues.length) reasons.push('Needs Review');

  const critical = !bloodGroupOk || !componentOk || !serialOk || !hasDate || duplicateSerial || invalidDate || externalNeedsReview;
  return {
    reasons: [...new Set(reasons)],
    importReady: !critical,
    needsReview: reasons.length > 0,
    isLowConfidence: lowConfidence,
    duplicateSerial,
    invalidDate,
    bloodGroupInferred,
  };
}

function isTracerRowImportReady(row) {
  return evaluateTracerRow(row).importReady;
}

function markAddStockRowNeedsReview(row, reasons) {
  if (!row) return;
  const normalizedReasons = (Array.isArray(reasons) ? reasons : []).filter(Boolean);
  row.classList.add('needs-review');
  row.title = normalizedReasons.join(' | ');

  if (row.dataset.unknownComponent === 'true') {
    row.classList.add('has-unknown-component');
  }

  const actionCellContent = row.querySelector('td:last-child > div') || row.querySelector('td:last-child');
  if (!actionCellContent) return;

  let noteEl = row.querySelector('.add-stock-review-note');
  if (!noteEl) {
    noteEl = document.createElement('div');
    noteEl.className = 'add-stock-review-note';
    actionCellContent.appendChild(noteEl);
  }
  noteEl.textContent = normalizedReasons[0] || 'Needs review';
}

function clearAddStockRowReview(row) {
  if (!row) return;
  row.classList.remove('needs-review', 'has-unknown-component');
  row.removeAttribute('title');
  const noteEl = row.querySelector('.add-stock-review-note');
  if (noteEl) noteEl.remove();
}

function markImportedRowTouched(row) {
  if (!row || row.dataset.ocrImported !== 'true') return;
  row.dataset.lowConfidence = 'false';
  const componentEl = row.querySelector('.add-stock-component');
  if (componentEl && componentEl.value) {
    row.dataset.unknownComponent = 'false';
  }
}

function refreshImportedRowReviewState(row) {
  if (!row || row.dataset.ocrImported !== 'true') return;

  const data = getAddStockRowData(row);
  const reasons = [];
  if (!data.bloodGroup) reasons.push('Missing blood group');
  if (!data.componentType) reasons.push('Unknown component detected');
  if (!data.serialNumber) reasons.push('Missing serial number');
  if (data.serialNumber && !isAddStockSerialValueValid(data.serialNumber)) reasons.push('Invalid serial format');
  if (!data.volumeMl) reasons.push('Missing volume');
  if (data.volumeMl && !isAddStockVolumeValueValid(data.volumeMl)) reasons.push('Invalid volume');
  if (data.remarks && !isAddStockRemarksValueValid(data.remarks)) reasons.push('Invalid remarks');
  if (!data.collectedAt && !data.expiresAt) reasons.push('Missing extraction/expiry date');
  if (row.dataset.lowConfidence === 'true') reasons.push('Low OCR confidence');

  if (!reasons.length) {
    clearAddStockRowReview(row);
    row.dataset.ocrImported = 'false';
    row.dataset.unknownComponent = 'false';
    return;
  }

  markAddStockRowNeedsReview(row, reasons);
}

async function scanBloodTracerForm(file) {
  if (typeof Tesseract === 'undefined') {
    throw new Error('OCR library is not available. Please refresh and try again.');
  }

  const image = await loadImageFromFile(file);
  const candidates = buildTracerOcrCandidates(image);
  if (!candidates.length) {
    throw new Error('Could not prepare OCR candidates from the image.');
  }

  let best = null;
  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index];
    const label = `${candidate.rotationLabel} / ${candidate.cropLabel}`;
    setTracerScanStatus(`Scanning table region ${index + 1}/${candidates.length} (${label})...`, 'loading');

    const ocrResult = await runTracerOcrCandidate(candidate, label);
    const parsedRows = parseTracerRowsFromGeometryWords(candidate, ocrResult, ocrResult.confidence);
    const score = scoreTracerOcrCandidate(parsedRows, ocrResult.confidence, candidate.priority);

    const candidateResult = {
      text: ocrResult.text,
      confidence: ocrResult.confidence,
      entries: parsedRows,
      attempt: label,
      candidateId: candidate.id,
      candidate,
      score,
    };

    if (!best || candidateResult.score > best.score) {
      best = candidateResult;
    }
  }

  if (!best) {
    return { text: '', confidence: 0, entries: [], attempt: 'none', score: 0 };
  }

  setTracerScanStatus(`Refining rows by fixed columns (${best.attempt})...`, 'loading');
  const refined = await refineTracerRowsByColumns(best.candidate, best.attempt, best.text);
  const refinedRows = Array.isArray(refined?.entries) ? refined.entries : [];

  if (refinedRows.length) {
    const refinedConfidence = Number(refined?.confidence || best.confidence || 0);
    return {
      text: refined?.text || best.text,
      confidence: refinedConfidence,
      entries: refinedRows,
      attempt: `${best.attempt} | column-refined`,
      score: scoreTracerOcrCandidate(refinedRows, refinedConfidence, best.candidate?.priority || 0),
    };
  }

  const fallbackRows = parseTracerRowsFromRawTextWithOrder(best.text, best.confidence);
  if (fallbackRows.length) {
    return {
      text: best.text,
      confidence: best.confidence,
      entries: fallbackRows,
      attempt: `${best.attempt} | raw-text-fallback`,
      score: scoreTracerOcrCandidate(fallbackRows, best.confidence, best.candidate?.priority || 0),
    };
  }

  return best;
}

function logTracerScanResult(scanResult, file, sourceName) {
  try {
    const fileName = file?.name || 'captured-image';
    const fileSizeKb = file?.size ? (file.size / 1024).toFixed(1) : 'unknown';
    const attempt = scanResult?.attempt || 'none';
    const confidence = Math.round(Number(scanResult?.confidence || 0));
    const rows = Array.isArray(scanResult?.entries) ? scanResult.entries : [];
    const rawText = scanResult?.text || '';

    if (typeof console.groupCollapsed === 'function') {
      console.groupCollapsed(`[Tracer OCR] ${fileName} (${sourceName})`);
    }

    // console.log('Source:', sourceName);
    // console.log('File:', { name: fileName, sizeKb: fileSizeKb, type: file?.type || 'unknown' });
    // console.log('Selected OCR candidate:', attempt, '| score:', scanResult?.score || 0);
    // console.log('OCR confidence:', confidence);
    // console.log('Raw OCR text:\n', rawText);
    // console.log('Parsed tracer rows:', rows);

    if (typeof console.groupEnd === 'function') {
      console.groupEnd();
    }
  } catch (error) {
    // console.log('[Tracer OCR] Logging failed:', error);
  }
}

function buildTracerComponentLookup(componentMap) {
  const list = Object.entries(componentMap).map(([alias, componentType]) => ({
    alias,
    componentType,
    normalized: normalizeComponentMatchText(alias),
  }));
  list.sort((a, b) => b.normalized.length - a.normalized.length);
  return list;
}

function buildTracerOcrCandidates(image) {
  const candidates = [];
  let candidateIndex = 0;
  const presets = TRACER_OCR_CROP_PRESETS.slice(0, 2);

  TRACER_OCR_ROTATIONS.forEach((angle) => {
    const rotatedCanvas = createRotatedCanvas(image, angle);
    const preprocessed = preprocessTracerCanvas(rotatedCanvas);

    presets.forEach((preset) => {
      const cropped = cropCanvasByRatio(preprocessed, preset);
      if (!cropped) return;
      candidates.push({
        id: `candidate-${candidateIndex++}`,
        canvas: cropped,
        priority: preset.priority || 0,
        rotationLabel: `${angle}deg`,
        cropLabel: preset.id,
      });
    });
  });

  return candidates;
}

function createRotatedCanvas(image, angleDegrees) {
  const sourceWidth = image.naturalWidth || image.width;
  const sourceHeight = image.naturalHeight || image.height;

  const scaleBase = 2200 / Math.max(sourceWidth, sourceHeight);
  const scale = Math.max(1, Math.min(1.8, scaleBase));
  const drawWidth = Math.round(sourceWidth * scale);
  const drawHeight = Math.round(sourceHeight * scale);

  const radians = (angleDegrees * Math.PI) / 180;
  const swap = Math.abs(angleDegrees) === 90 || Math.abs(angleDegrees) === 270;
  const canvas = document.createElement('canvas');
  canvas.width = swap ? drawHeight : drawWidth;
  canvas.height = swap ? drawWidth : drawHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return canvas;

  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate(radians);
  ctx.drawImage(image, -drawWidth / 2, -drawHeight / 2, drawWidth, drawHeight);
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return canvas;
}

function preprocessTracerCanvas(sourceCanvas) {
  const upscale = 2;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(sourceCanvas.width * upscale);
  canvas.height = Math.round(sourceCanvas.height * upscale);

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return sourceCanvas;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sourceCanvas, 0, 0, canvas.width, canvas.height);

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const pixels = imageData.data;
  let minGray = 255;
  let maxGray = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const gray = (0.299 * pixels[i]) + (0.587 * pixels[i + 1]) + (0.114 * pixels[i + 2]);
    minGray = Math.min(minGray, gray);
    maxGray = Math.max(maxGray, gray);
    pixels[i] = gray;
    pixels[i + 1] = gray;
    pixels[i + 2] = gray;
  }

  const spread = Math.max(1, maxGray - minGray);
  const contrast = 255 / spread;
  let luminanceSum = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    const normalized = (pixels[i] - minGray) * contrast;
    const boosted = ((normalized - 128) * 1.25) + 128;
    const clamped = Math.max(0, Math.min(255, boosted));
    pixels[i] = clamped;
    pixels[i + 1] = clamped;
    pixels[i + 2] = clamped;
    luminanceSum += clamped;
  }

  const average = luminanceSum / (pixels.length / 4);
  const threshold = Math.max(120, Math.min(205, average * 0.94));

  for (let i = 0; i < pixels.length; i += 4) {
    const value = pixels[i] >= threshold ? 255 : 0;
    pixels[i] = value;
    pixels[i + 1] = value;
    pixels[i + 2] = value;
  }

  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function cropCanvasByRatio(sourceCanvas, preset) {
  const sx = Math.max(0, Math.floor(sourceCanvas.width * preset.x));
  const sy = Math.max(0, Math.floor(sourceCanvas.height * preset.y));
  const sw = Math.floor(sourceCanvas.width * preset.w);
  const sh = Math.floor(sourceCanvas.height * preset.h);

  if (sw < 80 || sh < 80) return null;

  const canvas = document.createElement('canvas');
  canvas.width = sw;
  canvas.height = sh;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, sw, sh);
  ctx.drawImage(sourceCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return canvas;
}

async function runTracerOcrCandidate(candidate, stageLabel) {
  const logger = createTracerOcrLogger(stageLabel);
  const result = await Tesseract.recognize(candidate.canvas.toDataURL('image/png'), 'eng', {
    logger,
    tessedit_pageseg_mode: '6',
    preserve_interword_spaces: '1',
  });

  const rawWords = Array.isArray(result?.data?.words) ? result.data.words : [];
  const words = rawWords
    .map(word => ({
      text: String(word?.text || '').trim(),
      confidence: Number(word?.confidence || 0),
      x0: Number(word?.bbox?.x0 || 0),
      y0: Number(word?.bbox?.y0 || 0),
      x1: Number(word?.bbox?.x1 || 0),
      y1: Number(word?.bbox?.y1 || 0),
    }))
    .filter(word => word.text.length > 0 && (word.x1 > word.x0) && (word.y1 > word.y0));

  return {
    text: result?.data?.text || '',
    confidence: Number(result?.data?.confidence || 0),
    words,
  };
}

function getTracerGeometryBounds(canvas) {
  const w = canvas.width;
  const h = canvas.height;
  const bodyStartX = Number(TRACER_TABLE_GEOMETRY.bodyStartX ?? 0);
  const bodyEndX = Number(TRACER_TABLE_GEOMETRY.bodyEndX ?? 1);
  const bodyStartY = Number(TRACER_TABLE_GEOMETRY.bodyStartY ?? 0);
  const bodyEndY = Number(TRACER_TABLE_GEOMETRY.bodyEndY ?? 1);

  const x0 = Math.max(0, Math.floor(w * bodyStartX));
  const x1 = Math.min(w, Math.ceil(w * bodyEndX));
  const y0 = Math.max(0, Math.floor(h * bodyStartY));
  const y1 = Math.min(h, Math.ceil(h * bodyEndY));

  return {
    x0,
    y0,
    x1,
    y1,
    width: Math.max(1, x1 - x0),
    height: Math.max(1, y1 - y0),
  };
}

function buildTracerColumnBounds(bounds) {
  const pad = Math.max(1, Math.floor(bounds.width * (TRACER_TABLE_GEOMETRY.columnPaddingRatio || 0)));
  const columns = {};
  Object.keys(TRACER_COLUMN_SPLITS).forEach((key) => {
    const split = TRACER_COLUMN_SPLITS[key];
    const start = bounds.x0 + Math.floor(bounds.width * split[0]) + pad;
    const end = bounds.x0 + Math.ceil(bounds.width * split[1]) - pad;
    columns[key] = {
      x0: Math.max(bounds.x0, start),
      x1: Math.min(bounds.x1, Math.max(start + 2, end)),
      y0: bounds.y0,
      y1: bounds.y1,
    };
  });
  return columns;
}

function pickTracerColumnByX(x, columnBounds) {
  const keys = Object.keys(columnBounds);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const bounds = columnBounds[key];
    if (x >= bounds.x0 && x <= bounds.x1) return key;
  }
  return '';
}

function parseTracerRowsFromGeometryWords(candidate, ocrResult, globalConfidence = 0) {
  const words = Array.isArray(ocrResult?.words) ? ocrResult.words : [];
  const bounds = getTracerGeometryBounds(candidate.canvas);
  const columnBounds = buildTracerColumnBounds(bounds);
  const rowCount = Number(TRACER_TABLE_GEOMETRY.rowCount || 10);
  const rowHeight = bounds.height / rowCount;
  const rowCells = Array.from({ length: rowCount }, () => ({
    bloodGroup: [],
    component: [],
    serial: [],
    extraction: [],
    expiry: [],
  }));

  words
    .filter(word => word && word.text && word.confidence >= 10)
    .forEach((word) => {
      const cy = (word.y0 + word.y1) / 2;
      if (cy < bounds.y0 || cy > bounds.y1) return;
      const rowIndex = Math.max(0, Math.min(rowCount - 1, Math.floor((cy - bounds.y0) / rowHeight)));
      const cx = (word.x0 + word.x1) / 2;
      const key = pickTracerColumnByX(cx, columnBounds);
      if (!key) return;
      rowCells[rowIndex][key].push(word);
    });

  const rows = rowCells
    .map((cell, index) => {
      const normalizedCells = {};
      Object.keys(cell).forEach((key) => {
        normalizedCells[key] = cell[key]
          .sort((a, b) => a.x0 - b.x0)
          .map(word => word.text)
          .join(' ')
          .replace(/\s+/g, ' ')
          .trim();
      });
      return parseTracerRowFromCells(normalizedCells, globalConfidence, index);
    });

  return finalizeTracerRows(trimTracerRowsToSignalSpan(rows), ocrResult?.text || '');
}

function hasTracerRowSignal(row) {
  if (!row) return false;
  return !!(row.bloodGroup || row.componentType || row.unknownComponentLabel || row.serialNumber || row.collectedAt || row.expiresAt);
}

function trimTracerRowsToSignalSpan(rows) {
  const list = Array.isArray(rows) ? rows : [];
  if (!list.length) return [];

  let first = -1;
  let last = -1;
  for (let i = 0; i < list.length; i += 1) {
    if (!hasTracerRowSignal(list[i])) continue;
    if (first === -1) first = i;
    last = i;
  }

  if (first === -1 || last === -1) return [];
  return list.slice(first, last + 1);
}

function parseTracerRowFromCells(cells, globalConfidence, rowIndex = 0) {
  const bloodText = cells?.bloodGroup || '';
  const componentText = cells?.component || '';
  const serialText = cells?.serial || '';
  const extractionText = cells?.extraction || '';
  const expiryText = cells?.expiry || '';

  const bloodGroup = parseBloodGroupFromText(bloodText);
  const component = parseComponentFromText(componentText);
  const serialMeta = parseTracerSerialFromCell(serialText);
  const collectedAt = parseTracerDateFromCell(extractionText);
  const expiresAt = parseTracerDateFromCell(expiryText);
  const dateValidation = normalizeTracerDateRange(collectedAt, expiresAt);

  return {
    bloodGroup,
    bloodGroupInferred: false,
    componentType: component.componentType || '',
    unknownComponentLabel: component.componentType ? '' : component.rawLabel,
    serialNumber: serialMeta.serialNumber,
    serialDigitsRaw: serialMeta.serialDigitsRaw,
    serialRawText: serialMeta.serialRawText,
    collectedAt: dateValidation.collectedAt,
    expiresAt: dateValidation.expiresAt,
    confidence: Math.round(Number(globalConfidence || 0)),
    sourceText: [
      bloodText,
      componentText,
      serialText,
      extractionText,
      expiryText,
    ].filter(Boolean).join(' | '),
    rowOrder: Number.isFinite(rowIndex) ? rowIndex : 0,
    dateIssue: dateValidation.invalid,
    dateSwapped: dateValidation.swapped,
    rowBand: null,
  };
}

function parseTracerSerialFromCell(text) {
  const source = String(text || '')
    .toUpperCase()
    .replace(/[|]/g, ' ')
    .replace(/\s+/g, '');

  if (!source) {
    return { serialNumber: '', serialDigitsRaw: '', serialRawText: '' };
  }

  const corrected = source
    .replace(/O/g, '0')
    .replace(/[IL]/g, '1')
    .replace(/B/g, '8');

  const fromV = corrected.match(/V[A-Z0-9]{4,10}/);
  const fromLoose = corrected.match(/[A-Z]?\d{5,8}/);
  let token = fromV ? fromV[0] : (fromLoose ? fromLoose[0] : '');

  if (!token) {
    return { serialNumber: '', serialDigitsRaw: '', serialRawText: source };
  }

  token = token.replace(/^VA(?=\d)/, 'V');
  if (!token.startsWith('V')) {
    token = `V${token.replace(/^[A-Z]/, '')}`;
  }

  const digitsRaw = token.replace(/^V/, '').replace(/[^0-9]/g, '');
  if (!digitsRaw) {
    return { serialNumber: '', serialDigitsRaw: '', serialRawText: source };
  }

  let digitsNormalized = digitsRaw;
  if (digitsNormalized.length > 6) {
    digitsNormalized = digitsNormalized.slice(0, 6);
  }

  const serialNumber = digitsNormalized.length >= 5 ? `V${digitsNormalized}` : '';
  return {
    serialNumber,
    serialDigitsRaw: digitsRaw,
    serialRawText: source,
  };
}

function parseTracerDateFromCell(text) {
  if (!text) return '';
  const normalized = String(text || '')
    .toUpperCase()
    .replace(/O(?=\d)/g, '0')
    .replace(/I(?=\d)/g, '1')
    .replace(/%/g, '6')
    .replace(/S0(?=\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC))/g, '30')
    .replace(/TU?0?2(?=\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC))/g, '02')
    .replace(/U0?2(?=\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC))/g, '02')
    .replace(/\s+/g, ' ')
    .trim();

  const values = extractDateValuesFromText(normalized);
  return values[0] || '';
}

function finalizeTracerRows(rows, sourceText = '') {
  const ordered = (Array.isArray(rows) ? rows : [])
    .map((row, index) => ({ ...row, rowOrder: index }))
    .sort((a, b) => (a.rowOrder ?? 0) - (b.rowOrder ?? 0));

  const majorPrefix = detectTracerMajorSerialPrefix(ordered);
  const fixedRows = ordered.map((row) => {
    const fixedSerial = normalizeTracerSerialWithContext(row, majorPrefix);
    return {
      ...row,
      serialNumber: fixedSerial,
    };
  });
  return applyTracerBloodGroupInference(fixedRows, sourceText);
}

function detectTracerMajorSerialPrefix(rows) {
  const freq = new Map();
  (Array.isArray(rows) ? rows : []).forEach((row) => {
    const serial = String(row?.serialNumber || '').toUpperCase();
    if (!/^V\d{6}$/.test(serial)) return;
    const prefix = serial.slice(1, 4);
    freq.set(prefix, (freq.get(prefix) || 0) + 1);
  });

  let bestPrefix = '';
  let bestCount = 0;
  [...freq.entries()].forEach(([prefix, count]) => {
    if (count > bestCount) {
      bestPrefix = prefix;
      bestCount = count;
    }
  });
  return bestCount >= 2 ? bestPrefix : '';
}

function normalizeTracerSerialWithContext(row, majorPrefix) {
  const current = String(row?.serialNumber || '').toUpperCase();
  const digitsRaw = String(row?.serialDigitsRaw || '').replace(/[^0-9]/g, '');
  let digits = current.replace(/^V/, '').replace(/[^0-9]/g, '');

  if (!digits && digitsRaw) {
    digits = digitsRaw;
  }
  if (!digits) return '';

  if (digits.length > 6) {
    if (majorPrefix && digits.startsWith(majorPrefix)) {
      digits = digits.slice(0, 6);
    } else if (majorPrefix && digits.length >= 5) {
      digits = `${majorPrefix}${digits.slice(2, 5)}`;
    } else {
      digits = digits.slice(0, 6);
    }
  }

  if (digits.length === 5 && majorPrefix) {
    digits = `${majorPrefix}${digits.slice(-3)}`;
  }

  if (digits.length === 6 && majorPrefix && !digits.startsWith(majorPrefix)) {
    const raw = digitsRaw || digits;
    if (raw.length >= 7) {
      digits = `${majorPrefix}${raw.slice(2, 5)}`;
    } else if (raw.length === 6) {
      digits = `${majorPrefix}${raw.slice(-3)}`;
    }
  }

  if (!/^\d{6}$/.test(digits)) {
    return '';
  }
  return `V${digits}`;
}

async function refineTracerRowsByColumns(candidate, stageLabel, sourceText = '') {
  if (!candidate?.canvas) {
    return { text: '', confidence: 0, entries: [] };
  }

  const bounds = getTracerGeometryBounds(candidate.canvas);
  const bodyCanvas = cropCanvasRect(candidate.canvas, bounds.x0, bounds.y0, bounds.width, bounds.height);
  if (!bodyCanvas) {
    return { text: '', confidence: 0, entries: [] };
  }

  const rowCount = Number(TRACER_TABLE_GEOMETRY.rowCount || 10);
  const columnTexts = {};
  const confidences = [];
  const keys = Object.keys(TRACER_COLUMN_SPLITS);
  const padY = Math.max(0, Math.floor(bodyCanvas.height * (TRACER_TABLE_GEOMETRY.rowPaddingRatio || 0)));

  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    const split = TRACER_COLUMN_SPLITS[key];
    const padX = Math.max(1, Math.floor(bodyCanvas.width * (TRACER_TABLE_GEOMETRY.columnPaddingRatio || 0)));
    const x0 = Math.max(0, Math.floor(bodyCanvas.width * split[0]) + padX);
    const x1 = Math.min(bodyCanvas.width, Math.ceil(bodyCanvas.width * split[1]) - padX);
    const y0 = Math.max(0, padY);
    const y1 = Math.min(bodyCanvas.height, bodyCanvas.height - padY);
    const colCanvas = cropCanvasRect(bodyCanvas, x0, y0, Math.max(2, x1 - x0), Math.max(2, y1 - y0));
    if (!colCanvas) {
      columnTexts[key] = Array.from({ length: rowCount }, () => '');
      continue;
    }

    const ocr = await runTracerOcrColumnCanvas(colCanvas, key, `${stageLabel} | ${key}`);
    confidences.push(Number(ocr?.confidence || 0));
    columnTexts[key] = mapColumnWordsToRows(ocr, rowCount);
  }

  const columnShift = detectTracerColumnShift(columnTexts, rowCount);
  const rows = [];
  for (let rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
    let cells = {
      bloodGroup: columnTexts.bloodGroup?.[rowIndex] || '',
      component: columnTexts.component?.[rowIndex] || '',
      serial: columnTexts.serial?.[rowIndex] || '',
      extraction: columnTexts.extraction?.[rowIndex] || '',
      expiry: columnTexts.expiry?.[rowIndex] || '',
    };
    if (columnShift === 1) {
      cells = {
        bloodGroup: '',
        component: columnTexts.bloodGroup?.[rowIndex] || '',
        serial: columnTexts.component?.[rowIndex] || '',
        extraction: columnTexts.serial?.[rowIndex] || '',
        expiry: columnTexts.extraction?.[rowIndex] || columnTexts.expiry?.[rowIndex] || '',
      };
    }
    const row = parseTracerRowFromCells(cells, averageTracerConfidence(confidences), rowIndex);
    if (row) rows.push(row);
  }

  const entries = finalizeTracerRows(trimTracerRowsToSignalSpan(rows), sourceText);
  const text = entries.map(row => row.sourceText || '').join('\n');
  return {
    text,
    confidence: averageTracerConfidence(confidences),
    entries,
  };
}

function detectTracerColumnShift(columnTexts, rowCount) {
  const size = Math.max(1, Number(rowCount || 0));
  let componentInBloodCol = 0;
  let serialInComponentCol = 0;
  let dateInSerialCol = 0;

  for (let i = 0; i < size; i += 1) {
    const bloodCol = String(columnTexts?.bloodGroup?.[i] || '');
    const componentCol = String(columnTexts?.component?.[i] || '');
    const serialCol = String(columnTexts?.serial?.[i] || '');

    if (parseComponentFromText(bloodCol).componentType) componentInBloodCol += 1;
    if (parseTracerSerialFromCell(componentCol).serialNumber) serialInComponentCol += 1;
    if (extractDateValuesFromText(serialCol).length >= 1) dateInSerialCol += 1;
  }

  if (componentInBloodCol >= 3 && serialInComponentCol >= 3 && dateInSerialCol >= 3) {
    return 1;
  }
  return 0;
}

function detectTracerFormLevelBloodGroup(sourceText) {
  const normalized = String(sourceText || '')
    .toUpperCase()
    .replace(/[|]/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/P0S/g, 'POS')
    .replace(/N3G/g, 'NEG')
    .replace(/NE6/g, 'NEG');

  const match = normalized.match(/\b(AB|A|B|O|0)\s*(POSITIVE|POS|\+|NEGATIVE|NEG|-)\b/);
  if (!match) return '';
  const abo = match[1] === '0' ? 'O' : match[1];
  const rh = match[2].includes('NEG') || match[2] === '-' ? 'NEG' : 'POS';
  return `${abo}_${rh}`;
}

function applyTracerBloodGroupInference(rows, sourceText = '') {
  const list = Array.isArray(rows) ? rows.map(row => ({ ...row })) : [];
  if (!list.length) return list;

  const formLevel = detectTracerFormLevelBloodGroup(sourceText);
  const counts = new Map();
  list.forEach((row) => {
    const bg = String(row?.bloodGroup || '');
    if (!bg) return;
    counts.set(bg, (counts.get(bg) || 0) + 1);
  });

  let majority = '';
  let max = 0;
  [...counts.entries()].forEach(([key, count]) => {
    if (count > max) {
      max = count;
      majority = key;
    }
  });

  const inferred = formLevel || (max >= 2 ? majority : '');
  if (!inferred) return list;

  return list.map((row) => {
    if (row.bloodGroup) return { ...row, bloodGroupInferred: !!row.bloodGroupInferred };
    return {
      ...row,
      bloodGroup: inferred,
      bloodGroupInferred: true,
    };
  });
}

function parseTracerRowsFromRawTextWithOrder(rawText, globalConfidence = 0) {
  const normalized = String(rawText || '')
    .toUpperCase()
    .replace(/\r/g, '\n')
    .replace(/P0S/g, 'POS')
    .replace(/N3G/g, 'NEG')
    .replace(/NE6/g, 'NEG');

  const lines = normalized
    .split('\n')
    .map(line => line.replace(/[|]/g, ' | ').replace(/\s+/g, ' ').trim())
    .filter(line => line.length >= 8);

  const rows = [];
  lines.forEach((line, index) => {
    const component = parseComponentFromText(line);
    const serialMeta = parseTracerSerialFromCell(line);
    const dates = extractDateValuesFromText(line);
    if (!component.componentType) return;
    if (!serialMeta.serialNumber) return;
    if (dates.length < 2) return;

    const dateValidation = normalizeTracerDateRange(dates[0], dates[1]);
    const bloodGroup = parseBloodGroupFromText(line);
    rows.push({
      bloodGroup,
      bloodGroupInferred: false,
      componentType: component.componentType || '',
      unknownComponentLabel: component.componentType ? '' : component.rawLabel,
      serialNumber: serialMeta.serialNumber,
      serialDigitsRaw: serialMeta.serialDigitsRaw,
      serialRawText: serialMeta.serialRawText,
      collectedAt: dateValidation.collectedAt,
      expiresAt: dateValidation.expiresAt,
      confidence: Math.round(Number(globalConfidence || 0)),
      sourceText: line,
      rowOrder: index,
      dateIssue: dateValidation.invalid,
      dateSwapped: dateValidation.swapped,
      rowBand: null,
    });
  });

  return finalizeTracerRows(rows, rawText);
}

async function runTracerOcrColumnCanvas(canvas, columnKey, stageLabel) {
  const options = TRACER_COLUMN_OCR_OPTIONS[columnKey] || {};
  const logger = createTracerOcrLogger(stageLabel);
  const result = await Tesseract.recognize(canvas.toDataURL('image/png'), 'eng', {
    logger,
    tessedit_pageseg_mode: options.psm || '6',
    preserve_interword_spaces: '1',
    tessedit_char_whitelist: options.whitelist || undefined,
  });

  const words = (Array.isArray(result?.data?.words) ? result.data.words : [])
    .map(word => ({
      text: String(word?.text || '').trim(),
      confidence: Number(word?.confidence || 0),
      x0: Number(word?.bbox?.x0 || 0),
      y0: Number(word?.bbox?.y0 || 0),
      x1: Number(word?.bbox?.x1 || 0),
      y1: Number(word?.bbox?.y1 || 0),
    }))
    .filter(word => word.text.length > 0 && word.x1 > word.x0 && word.y1 > word.y0);

  return {
    text: String(result?.data?.text || ''),
    confidence: Number(result?.data?.confidence || 0),
    words,
    canvasHeight: canvas.height,
  };
}

function mapColumnWordsToRows(ocrResult, rowCount) {
  const words = Array.isArray(ocrResult?.words) ? ocrResult.words : [];
  const canvasHeight = Number(ocrResult?.canvasHeight || 0) || 1;
  const rowHeight = canvasHeight / rowCount;
  const rows = Array.from({ length: rowCount }, () => []);

  words
    .filter(word => word.confidence >= 8)
    .forEach((word) => {
      const cy = (word.y0 + word.y1) / 2;
      const rowIndex = Math.max(0, Math.min(rowCount - 1, Math.floor(cy / rowHeight)));
      rows[rowIndex].push(word);
    });

  return rows.map((rowWords) => rowWords
    .sort((a, b) => a.x0 - b.x0)
    .map(word => word.text)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim());
}

function cropCanvasRect(sourceCanvas, x, y, w, h) {
  if (!sourceCanvas || w < 2 || h < 2) return null;
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(2, Math.floor(w));
  canvas.height = Math.max(2, Math.floor(h));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(sourceCanvas, Math.floor(x), Math.floor(y), Math.floor(w), Math.floor(h), 0, 0, canvas.width, canvas.height);
  return canvas;
}

function averageTracerConfidence(values) {
  const nums = (Array.isArray(values) ? values : []).map(Number).filter(Number.isFinite);
  if (!nums.length) return 0;
  return nums.reduce((sum, value) => sum + value, 0) / nums.length;
}

function createTracerOcrLogger(stageLabel) {
  return function onOcrProgress(message) {
    if (!message || !message.status) return;
    if (message.status === 'recognizing text') {
      const percent = Math.round((message.progress || 0) * 100);
      setTracerScanStatus(`${stageLabel}: ${percent}%`, 'loading');
      return;
    }

    if (message.status === 'loading tesseract core' || message.status === 'initializing tesseract') {
      setTracerScanStatus(`${stageLabel}: initializing OCR...`, 'loading');
    }
  };
}

function scoreTracerOcrCandidate(rows, confidence, priority) {
  const parsedRows = Array.isArray(rows) ? rows : [];
  if (!parsedRows.length) return (confidence / 12) + priority;

  const strictRows = parsedRows.filter(isTracerRowImportReady).length;
  const unknownRows = parsedRows.filter(row => !row.componentType).length;
  const missingSerialRows = parsedRows.filter(row => !/^V\d{6}$/.test(String(row?.serialNumber || ''))).length;
  return (strictRows * 12) + (parsedRows.length * 5) + (confidence / 7) + priority - (unknownRows * 2.5) - (missingSerialRows * 2);
}

function parseBloodGroupFromText(text) {
  if (!text) return '';

  const normalized = String(text)
    .toUpperCase()
    .replace(/P0S/g, 'POS')
    .replace(/N3G/g, 'NEG')
    .replace(/NE6/g, 'NEG')
    .replace(/\s+/g, ' ');

  const match = normalized.match(/\b(AB|A|B|O|0)\s*(POSITIVE|POS|\+|NEGATIVE|NEG|-)\b/);
  if (!match) return '';

  const abo = match[1] === '0' ? 'O' : match[1];
  const rh = match[2].includes('NEG') || match[2] === '-' ? 'NEG' : 'POS';
  return `${abo}_${rh}`;
}

function parseComponentFromText(text) {
  if (!text) return { componentType: '', rawLabel: '' };

  const normalized = normalizeComponentMatchText(text);
  for (const alias of TRACER_COMPONENT_LOOKUP) {
    if (normalized.includes(alias.normalized)) {
      return { componentType: alias.componentType, rawLabel: '' };
    }
  }

  const fallbackToken = findUnknownComponentToken(text);
  return { componentType: '', rawLabel: fallbackToken };
}

function normalizeComponentMatchText(text) {
  return String(text || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
}

function findUnknownComponentToken(text) {
  const stripped = String(text || '')
    .toUpperCase()
    .replace(/\b(AB|A|B|O|0)\s*(POSITIVE|POS|\+|NEGATIVE|NEG|-)\b/g, ' ')
    .replace(/\b\d{1,4}\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|OCT|NOV|DEC)\s*\d{2,4}\b/g, ' ')
    .replace(/[^\w\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const ignore = new Set([
    'DATE', 'UNIT', 'SERIAL', 'NO', 'NUMBER', 'EXTRACTION', 'EXPIRY',
    'BLOOD', 'GROUP', 'COMPONENT', 'PATIENT', 'RELEASED', 'BAG', 'BLOODSTOCK'
  ]);

  const token = stripped.split(' ').find(part => {
    if (!part || part.length < 2 || part.length > 16) return false;
    if (!/[A-Z]/.test(part)) return false;
    if (ignore.has(part)) return false;
    if (/^\d+$/.test(part)) return false;
    if (/^[A-Z]?\d{4,}$/.test(part)) return false;
    return true;
  });

  return token || '';
}

function parseSerialFromText(text) {
  if (!text) return '';
  const normalized = String(text).toUpperCase().replace(/\s+/g, ' ');

  const explicit = normalized.match(/\b(?:S\/N|SN|SERIAL(?:\s*NO)?|UNIT(?:\s*SERIAL)?)(?:\s*NO)?\s*[:#-]?\s*([A-Z0-9-]{5,10})\b/);
  if (explicit) {
    const fixed = normalizeTracerSerialCandidate(explicit[1]);
    if (fixed) return fixed;
  }

  const compact = normalized.replace(/\s+/g, '');
  const direct = compact.match(/V[A-Z]?\d{5,7}/g) || [];
  for (const candidate of direct) {
    const fixed = normalizeTracerSerialCandidate(candidate);
    if (fixed) return fixed;
  }

  const fallback = normalized.match(/\b[A-Z]{1,2}\d{5,8}\b/g) || [];
  for (const candidate of fallback) {
    const fixed = normalizeTracerSerialCandidate(candidate);
    if (fixed) return fixed;
  }

  return '';
}

function sanitizeSerial(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function normalizeTracerSerialCandidate(value) {
  const cleaned = sanitizeSerial(value).replace(/_/g, '');
  if (!cleaned) return '';

  // Common OCR drift: VA457679 -> V457679
  let normalized = cleaned.replace(/^VA(?=\d{5,7}$)/, 'V');
  normalized = normalized.replace(/^V0(?=\d{4,6}$)/, 'V');

  if (/^V\d{5,7}$/.test(normalized)) {
    return normalized;
  }

  return '';
}

function extractDateValuesFromText(text) {
  if (!text) return [];

  const source = String(text).toUpperCase().replace(/O(?=\d)/g, '0');
  const found = [];

  const monthRegex = /\b([0-3]?\d)\s*(JAN|FEB|MAR|APR|MAY|JUN|JUL|AUG|SEP|SEPT|OCT|NOV|DEC)\s*,?\s*([12]\d{3}|\d{2})\b/g;
  const ymdRegex = /\b([12]\d{3})[\/-]([01]?\d)[\/-]([0-3]?\d)\b/g;
  const dmyRegex = /\b([0-3]?\d)[\/-]([01]?\d)[\/-]([12]\d{3}|\d{2})\b/g;

  const collectMatches = (regex, transform) => {
    let match;
    while ((match = regex.exec(source)) !== null) {
      const parsed = transform(match);
      if (parsed && !found.includes(parsed)) found.push(parsed);
    }
  };

  collectMatches(monthRegex, m => parseDateParts(m[3], monthNameToNumber(m[2]), m[1]));
  collectMatches(ymdRegex, m => parseDateParts(m[1], m[2], m[3]));
  collectMatches(dmyRegex, m => parseDateParts(m[3], m[2], m[1]));

  return found.slice(0, 2);
}

function normalizeTracerDateRange(collectedAt, expiresAt) {
  let extraction = collectedAt || '';
  let expiry = expiresAt || '';
  let swapped = false;
  let invalid = false;

  const extractionDate = extraction ? new Date(extraction) : null;
  const expiryDate = expiry ? new Date(expiry) : null;

  if (extractionDate && expiryDate && extractionDate > expiryDate) {
    const temp = extraction;
    extraction = expiry;
    expiry = temp;
    swapped = true;
  }

  const extractionYear = extraction ? Number(String(extraction).slice(0, 4)) : null;
  const expiryYear = expiry ? Number(String(expiry).slice(0, 4)) : null;
  if ((extractionYear && (extractionYear < 2024 || extractionYear > 2035)) ||
      (expiryYear && (expiryYear < 2024 || expiryYear > 2035))) {
    invalid = true;
  }

  return { collectedAt: extraction, expiresAt: expiry, swapped, invalid };
}

function monthNameToNumber(name) {
  const map = {
    JAN: 1, FEB: 2, MAR: 3, APR: 4, MAY: 5, JUN: 6, JUL: 7, AUG: 8, SEP: 9, SEPT: 9, OCT: 10, NOV: 11, DEC: 12
  };
  return map[String(name || '').toUpperCase()] || 0;
}

function parseDateParts(yearToken, monthToken, dayToken) {
  let year = Number(String(yearToken).replace(/O/g, '0'));
  let month = Number(String(monthToken).replace(/O/g, '0'));
  let day = Number(String(dayToken).replace(/O/g, '0'));

  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return '';
  if (String(yearToken).length === 2) year += year >= 70 ? 1900 : 2000;

  return formatDateInput(year, month, day);
}

function parseDateCandidate(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';

  if (/^\d{8}$/.test(raw)) {
    const y = Number(raw.slice(0, 4));
    const m = Number(raw.slice(4, 6));
    const d = Number(raw.slice(6, 8));
    return formatDateInput(y, m, d);
  }

  const asDate = new Date(raw);
  if (!Number.isNaN(asDate.getTime())) {
    return formatDateInput(asDate.getFullYear(), asDate.getMonth() + 1, asDate.getDate());
  }
  return '';
}

function formatDateInput(year, month, day) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return '';
  if (year < 1990 || year > 2100) return '';
  if (month < 1 || month > 12) return '';
  if (day < 1 || day > 31) return '';

  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function loadImageFromFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Unable to load tracer image for OCR.'));
      img.src = reader.result;
    };
    reader.onerror = () => reject(new Error('Failed to read tracer image file.'));
    reader.readAsDataURL(file);
  });
}

function addStockCalculateExpiry(componentType, collectedAt) {
  const days = ADD_STOCK_EXPIRY_DAYS[componentType];
  if (!days || !collectedAt) return '';

  const exp = new Date(collectedAt);
  exp.setDate(exp.getDate() + days);
  return exp.toISOString().split('T')[0];
}

function updateAddExpiry() {
  const comp = document.getElementById('add-component-type').value;
  const collectedEl = document.getElementById('add-collected-at');
  const expiresEl = document.getElementById('add-expires-at');
  const hintEl = document.getElementById('add-expiry-hint');

  const days = ADD_STOCK_EXPIRY_DAYS[comp];
  if (hintEl) hintEl.textContent = days ? `(${days}-day shelf life)` : '';

  if (collectedEl.value && days) {
    expiresEl.value = addStockCalculateExpiry(comp, collectedEl.value);
  }
}

function getAddStockErrorElement(inputEl, explicitId = '') {
  if (explicitId) return document.getElementById(explicitId);
  if (!inputEl) return null;
  if (inputEl.dataset.errorId) return document.getElementById(inputEl.dataset.errorId);

  if (inputEl.id) {
    const staticError = document.getElementById(`${inputEl.id}-error`);
    if (staticError) return staticError;
  }

  const group = inputEl.closest('.form-group-m');
  if (!group) return null;
  let dynamicError = group.querySelector('.form-inline-error');
  if (!dynamicError) {
    dynamicError = document.createElement('div');
    dynamicError.className = 'form-inline-error';
    group.appendChild(dynamicError);
  }
  return dynamicError;
}

function setAddStockFieldError(inputEl, message, explicitId = '') {
  if (!inputEl) return false;
  const errorEl = getAddStockErrorElement(inputEl, explicitId);
  inputEl.classList.add('field-error');
  inputEl.setAttribute('aria-invalid', 'true');
  if (errorEl) {
    errorEl.textContent = message || '';
    errorEl.style.display = message ? 'block' : 'none';
  }
  return false;
}

function clearAddStockFieldError(inputEl, explicitId = '') {
  if (!inputEl) return true;
  const errorEl = getAddStockErrorElement(inputEl, explicitId);
  inputEl.classList.remove('field-error');
  inputEl.removeAttribute('aria-invalid');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
  return true;
}

function enforceTransactionNumberFormat(inputEl) {
  if (!inputEl) return '';
  const cleaned = String(inputEl.value || '')
    .replace(/\D/g, '')
    .slice(0, 10);
  if (inputEl.value !== cleaned) inputEl.value = cleaned;
  return cleaned;
}

function enforceSerialNumberFormat(inputEl) {
  if (!inputEl) return '';
  const cleaned = String(inputEl.value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, ADD_STOCK_SERIAL_MAX_LENGTH);
  if (inputEl.value !== cleaned) inputEl.value = cleaned;
  return cleaned;
}

function enforceVolumeFormat(inputEl) {
  if (!inputEl) return '';
  const cleaned = String(inputEl.value || '')
    .replace(/\D/g, '')
    .slice(0, ADD_STOCK_VOLUME_MAX_LENGTH);
  if (inputEl.value !== cleaned) inputEl.value = cleaned;
  return cleaned;
}

function enforceRemarksLimit(inputEl) {
  if (!inputEl) return '';
  const cleaned = String(inputEl.value || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[^A-Za-z0-9.,\-\s]/g, '')
    .slice(0, ADD_STOCK_REMARKS_MAX_LENGTH);
  if (inputEl.value !== cleaned) inputEl.value = cleaned;
  return cleaned;
}

function isAddStockSerialValueValid(value) {
  return /^[A-Z0-9]{1,10}$/.test(String(value || '').trim().toUpperCase());
}

function isAddStockVolumeValueValid(value) {
  const str = String(value || '').trim();
  if (!/^\d{1,4}$/.test(str)) return false;
  const parsed = Number(str);
  return Number.isFinite(parsed) && parsed > 0;
}

function isAddStockRemarksValueValid(value) {
  const str = String(value || '');
  return str.length <= ADD_STOCK_REMARKS_MAX_LENGTH && ADD_STOCK_REMARKS_ALLOWED_REGEX.test(str);
}

function validateSerialNumberField(inputEl, options = {}) {
  const value = enforceSerialNumberFormat(inputEl);
  const required = !!options.required;
  const errorId = options.errorId || '';
  if (!value) {
    return required ? setAddStockFieldError(inputEl, ADD_STOCK_SERIAL_ERROR_MESSAGE, errorId) : clearAddStockFieldError(inputEl, errorId);
  }
  return isAddStockSerialValueValid(value)
    ? clearAddStockFieldError(inputEl, errorId)
    : setAddStockFieldError(inputEl, ADD_STOCK_SERIAL_ERROR_MESSAGE, errorId);
}

function validateVolumeField(inputEl, options = {}) {
  const value = enforceVolumeFormat(inputEl);
  const required = !!options.required;
  const errorId = options.errorId || '';
  if (!value) {
    return required ? setAddStockFieldError(inputEl, ADD_STOCK_VOLUME_ERROR_MESSAGE, errorId) : clearAddStockFieldError(inputEl, errorId);
  }
  return isAddStockVolumeValueValid(value)
    ? clearAddStockFieldError(inputEl, errorId)
    : setAddStockFieldError(inputEl, ADD_STOCK_VOLUME_ERROR_MESSAGE, errorId);
}

function validateRemarksField(inputEl, options = {}) {
  const value = enforceRemarksLimit(inputEl);
  const errorId = options.errorId || '';
  if (!value) return clearAddStockFieldError(inputEl, errorId);
  return isAddStockRemarksValueValid(value)
    ? clearAddStockFieldError(inputEl, errorId)
    : setAddStockFieldError(inputEl, ADD_STOCK_REMARKS_ERROR_MESSAGE, errorId);
}

function sanitizeAddStockBloodGroup(value) {
  const source = String(value || '').toUpperCase().trim();
  if (!source) return '';
  const compact = source.replace(/[^A-Z0-9]/g, '');
  const map = {
    APOS: 'A_POS',
    ANEG: 'A_NEG',
    BPOS: 'B_POS',
    BNEG: 'B_NEG',
    ABPOS: 'AB_POS',
    ABNEG: 'AB_NEG',
    OPOS: 'O_POS',
    ONEG: 'O_NEG',
    'A_POS': 'A_POS',
    'A_NEG': 'A_NEG',
    'B_POS': 'B_POS',
    'B_NEG': 'B_NEG',
    'AB_POS': 'AB_POS',
    'AB_NEG': 'AB_NEG',
    'O_POS': 'O_POS',
    'O_NEG': 'O_NEG',
  };
  return map[compact] || map[source] || '';
}

function normalizeAddStockComponentValue(value, fallbackText = '') {
  const raw = String(value || '').trim();
  if (!raw && !fallbackText) return '';
  const normalized = String(raw || fallbackText).toUpperCase().replace(/[^A-Z0-9]/g, '');

  const aliasMap = {
    WB: 'WHOLE_BLOOD',
    WHOLEBLOOD: 'WHOLE_BLOOD',
    PRBC: 'PRBC',
    LPRBC: 'LEUKOREDUCED_PRBC',
    APRBC: 'ALIQUOTED_PRBC',
    FFP: 'FRESH_FROZEN_PLASMA',
    PC: 'PLATELET_CONCENTRATE',
    PLT: 'PLATELET_CONCENTRATE',
    PLATELET: 'PLATELET_CONCENTRATE',
    CRYO: 'CRYOPRECIPITATE',
    CRYOSUP: 'CRYOSUPERNATANT',
  };
  return aliasMap[normalized] || (Object.values(aliasMap).includes(raw) ? raw : '');
}

function normalizeAddStockSerialValue(value) {
  let serial = String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');

  if (/^VA\d{5,8}$/.test(serial)) {
    serial = `V4${serial.slice(2)}`;
  }

  return serial.slice(0, ADD_STOCK_SERIAL_MAX_LENGTH);
}

function sanitizeOCRImportedRows(rows) {
  if (!Array.isArray(rows)) return [];
  return rows.map((row) => {
    const cleanedSerial = normalizeAddStockSerialValue(row?.serialNumber);
    const cleanedRemarks = String(row?.remarks || '')
      .replace(/<[^>]*>/g, '')
      .replace(/[^A-Za-z0-9.,\-\s]/g, '')
      .slice(0, ADD_STOCK_REMARKS_MAX_LENGTH);
    const cleanedVolume = String(row?.volumeMl || '').replace(/\D/g, '').slice(0, ADD_STOCK_VOLUME_MAX_LENGTH);
    const cleanedBloodGroup = sanitizeAddStockBloodGroup(row?.bloodGroup);
    const cleanedComponent = normalizeAddStockComponentValue(row?.componentType, row?.unknownComponentLabel);
    const collectedAt = parseDateCandidate(row?.collectedAt || '');
    const expiresAt = parseDateCandidate(row?.expiresAt || '');

    const issues = Array.isArray(row?.issues) ? [...row.issues] : [];
    if (cleanedSerial && !isAddStockSerialValueValid(cleanedSerial)) issues.push('Invalid serial format');
    if (cleanedVolume && !isAddStockVolumeValueValid(cleanedVolume)) issues.push('Invalid volume');
    if (cleanedRemarks && !isAddStockRemarksValueValid(cleanedRemarks)) issues.push('Invalid remarks');
    if (!cleanedBloodGroup) issues.push('Missing blood group');
    if (!cleanedComponent) issues.push('Unknown component');
    if (!collectedAt || !expiresAt) issues.push('Missing extraction/expiry date');

    return {
      ...row,
      bloodGroup: cleanedBloodGroup || '',
      componentType: cleanedComponent || '',
      serialNumber: cleanedSerial || '',
      volumeMl: cleanedVolume || '',
      remarks: cleanedRemarks,
      collectedAt,
      expiresAt,
      needsReview: Boolean(row?.needsReview) || issues.length > 0,
      issues: [...new Set(issues)],
    };
  });
}

function initAddStockValidation() {
  if (addStockValidationBound) return;
  addStockValidationBound = true;

  const serialInput = document.getElementById('add-serial-number');
  const volumeInput = document.getElementById('add-volume-ml');
  const remarksInput = document.getElementById('add-remarks');

  if (serialInput) {
    serialInput.addEventListener('input', () => validateSerialNumberField(serialInput, { errorId: 'add-serial-number-error' }));
    serialInput.addEventListener('blur', () => validateSerialNumberField(serialInput, { errorId: 'add-serial-number-error' }));
  }
  if (volumeInput) {
    volumeInput.addEventListener('input', () => validateVolumeField(volumeInput, { errorId: 'add-volume-ml-error' }));
    volumeInput.addEventListener('blur', () => validateVolumeField(volumeInput, { errorId: 'add-volume-ml-error' }));
  }
  if (remarksInput) {
    remarksInput.addEventListener('input', () => validateRemarksField(remarksInput, { errorId: 'add-remarks-error' }));
    remarksInput.addEventListener('blur', () => validateRemarksField(remarksInput, { errorId: 'add-remarks-error' }));
  }
  const transactionInput = document.getElementById('add-transaction-number');
  const reviewTransactionInput = document.getElementById('tracer-ocr-transaction-number');
  if (transactionInput) {
    transactionInput.addEventListener('input', () => enforceTransactionNumberFormat(transactionInput));
    transactionInput.addEventListener('blur', () => enforceTransactionNumberFormat(transactionInput));
  }
  if (reviewTransactionInput) {
    reviewTransactionInput.addEventListener('input', () => enforceTransactionNumberFormat(reviewTransactionInput));
    reviewTransactionInput.addEventListener('blur', () => enforceTransactionNumberFormat(reviewTransactionInput));
  }

  document.addEventListener('keydown', (event) => {
    const target = event.target;
    if (!(target instanceof HTMLElement)) return;

    const isControlKey = event.ctrlKey || event.metaKey || event.altKey ||
      ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Tab', 'Home', 'End', 'Enter'].includes(event.key);
    if (isControlKey) return;

    if (target.matches('#add-serial-number, .add-stock-serial, .tracer-ocr-edit-serial')) {
      if (event.key.length === 1 && !/[a-zA-Z0-9]/.test(event.key)) {
        event.preventDefault();
      }
      return;
    }

    if (target.matches('#add-volume-ml, .add-stock-volume')) {
      if (event.key.length === 1 && !/\d/.test(event.key)) {
        event.preventDefault();
      }
    }
  });
}

function openAddBloodModal() {
  initAddStockScanner();
  initAddStockValidation();

  document.getElementById('add-transaction-number').value = '';
  document.getElementById('add-serial-number').value = '';
  document.getElementById('add-blood-type').value = '';
  document.getElementById('add-rh-type').value = 'POSITIVE';
  document.getElementById('add-component-type').value = '';
  document.getElementById('add-volume-ml').value = '';
  document.getElementById('add-collected-at').value = '';
  document.getElementById('add-expires-at').value = '';
  document.getElementById('add-remarks').value = '';
  clearAddStockFieldError(document.getElementById('add-serial-number'), 'add-serial-number-error');
  clearAddStockFieldError(document.getElementById('add-volume-ml'), 'add-volume-ml-error');
  clearAddStockFieldError(document.getElementById('add-remarks'), 'add-remarks-error');

  const hint = document.getElementById('add-expiry-hint');
  if (hint) hint.textContent = '';

  const rows = document.getElementById('add-stock-rows');
  if (rows) rows.innerHTML = '';

  resetAddStockScannerUI();
  updateAddStockValidCount();
  openModal('addBloodModal');
}

function getAddStockDefaults() {
  const aboType = document.getElementById('add-blood-type').value;
  const rhType = document.getElementById('add-rh-type').value;
  const serialInput = document.getElementById('add-serial-number');
  const volumeInput = document.getElementById('add-volume-ml');
  const remarksInput = document.getElementById('add-remarks');

  return {
    serialNumber: normalizeAddStockSerialValue(serialInput?.value || ''),
    bloodGroup: aboType ? `${aboType}_${rhType === 'POSITIVE' ? 'POS' : 'NEG'}` : '',
    componentType: normalizeAddStockComponentValue(document.getElementById('add-component-type').value),
    volumeMl: String(enforceVolumeFormat(volumeInput) || ''),
    collectedAt: document.getElementById('add-collected-at').value,
    expiresAt: document.getElementById('add-expires-at').value,
    remarks: String(enforceRemarksLimit(remarksInput) || '').trim(),
  };
}

function createAddStockSelect(options, value, className) {
  return `
    <select class="${className}" onchange="handleAddStockRowChange(this)">
      ${options.map(opt => `
        <option value="${opt.value}" ${opt.value === value ? 'selected' : ''}>
          ${opt.label}
        </option>
      `).join('')}
    </select>`;
}

function splitBloodGroup(bloodGroup) {
  if (!bloodGroup) return { aboType: '', rhType: '' };

  const [aboType, rhShort] = bloodGroup.split('_');
  return {
    aboType,
    rhType: rhShort === 'POS' ? 'POSITIVE' : 'NEGATIVE',
  };
}

function addStockRow(data = {}) {
  const tbody = document.getElementById('add-stock-rows');
  if (!tbody) return;

  const index = tbody.children.length + 1;

  const row = document.createElement('tr');
  row.className = 'add-stock-row';

  const serialNumber = normalizeAddStockSerialValue(data.serialNumber || '');
  const bloodGroup = sanitizeAddStockBloodGroup(data.bloodGroup || '');
  const componentType = normalizeAddStockComponentValue(data.componentType || '', data.unknownComponentLabel || '');
  const volumeMl = String(data.volumeMl || '').replace(/\D/g, '').slice(0, ADD_STOCK_VOLUME_MAX_LENGTH);
  const collectedAt = data.collectedAt || '';
  const expiresAt = data.expiresAt || '';
  const remarks = String(data.remarks || '')
    .replace(/<[^>]*>/g, '')
    .replace(/[^A-Za-z0-9.,\-\s]/g, '')
    .slice(0, ADD_STOCK_REMARKS_MAX_LENGTH);

  const bloodGroupOptions = [
    { value: '', label: 'Select...' },
    { value: 'A_POS', label: 'A POS' },
    { value: 'A_NEG', label: 'A NEG' },
    { value: 'B_POS', label: 'B POS' },
    { value: 'B_NEG', label: 'B NEG' },
    { value: 'AB_POS', label: 'AB POS' },
    { value: 'AB_NEG', label: 'AB NEG' },
    { value: 'O_POS', label: 'O POS' },
    { value: 'O_NEG', label: 'O NEG' },
  ];

  const componentOptions = [
    { value: '', label: 'Select...' },
    { value: 'WHOLE_BLOOD', label: 'WB' },
    { value: 'PRBC', label: 'PRBC' },
    { value: 'LEUKOREDUCED_PRBC', label: 'L-PRBC' },
    { value: 'ALIQUOTED_PRBC', label: 'A-PRBC' },
    { value: 'PLATELET_CONCENTRATE', label: 'PC' },
    { value: 'FRESH_FROZEN_PLASMA', label: 'FFP' },
    { value: 'CRYOPRECIPITATE', label: 'CRYO' },
    { value: 'CRYOSUPERNATANT', label: 'CRYOSUP' },
  ];

  row.innerHTML = `
    <td style="padding:6px;color:var(--muted);font-weight:700">${index}</td>

    <td style="padding:6px">
      <div class="form-group-m" style="margin:0">
        ${createAddStockSelect(bloodGroupOptions, bloodGroup, 'add-stock-blood-group')}
      </div>
    </td>

    <td style="padding:6px">
      <div class="form-group-m" style="margin:0">
        ${createAddStockSelect(componentOptions, componentType, 'add-stock-component')}
      </div>
    </td>

    <td style="padding:6px">
      <div class="form-group-m" style="margin:0">
        <input type="text" class="add-stock-serial" value="${serialNumber}" placeholder="e.g. V457679" maxlength="10" oninput="enforceSerialNumberFormat(this);handleAddStockRowChange(this)">
      </div>
    </td>

    <td style="padding:6px">
      <div class="form-group-m" style="margin:0">
        <input type="date" class="add-stock-collected" value="${collectedAt}" placeholder="MM/DD/YYYY" onchange="handleAddStockRowDateChange(this)">
      </div>
    </td>

    <td style="padding:6px">
      <div class="form-group-m" style="margin:0">
        <input type="date" class="add-stock-expires" value="${expiresAt}" placeholder="MM/DD/YYYY" onchange="handleAddStockRowChange(this)">
      </div>
    </td>

    <td style="padding:6px">
      <div class="form-group-m" style="margin:0">
        <input type="text" class="add-stock-volume" value="${volumeMl}" maxlength="4" inputmode="numeric" placeholder="e.g. 450" oninput="enforceVolumeFormat(this);handleAddStockRowChange(this)">
      </div>
    </td>

    <td style="padding:6px">
      <div class="form-group-m" style="margin:0">
        <input type="text" class="add-stock-remarks" value="${remarks}" maxlength="${ADD_STOCK_REMARKS_MAX_LENGTH}" placeholder="e.g. Hemolyzed" oninput="enforceRemarksLimit(this);handleAddStockRowChange(this)">
      </div>
    </td>

    <td style="padding:6px">
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        <button class="btn-ghost" type="button" style="font-size:11px;padding:5px 8px" onclick="copyPreviousAddStockRow(${index - 1})">
          Copy Prev
        </button>
        <button class="btn-warning" type="button" style="font-size:11px;padding:5px 8px" onclick="removeAddStockRow(this)">
          Remove
        </button>
      </div>
    </td>
  `;

  tbody.appendChild(row);
  updateAddStockRowNumbers();
  updateAddStockValidCount();
}

function generateAddStockRows(count = 10) {
  const tbody = document.getElementById('add-stock-rows');
  if (!tbody) return;

  tbody.innerHTML = '';
  const defaults = getAddStockDefaults();

  for (let i = 0; i < count; i++) {
    addStockRow({
      serialNumber: i === 0 ? defaults.serialNumber : '',
      bloodGroup: defaults.bloodGroup,
      componentType: defaults.componentType,
      volumeMl: defaults.volumeMl,
      collectedAt: defaults.collectedAt,
      expiresAt: defaults.expiresAt,
      remarks: defaults.remarks,
    });
  }

  updateAddStockValidCount();
}

function validateAddStockRowInputs(row) {
  if (!row) return true;
  const data = getAddStockRowData(row);
  const serialEl = row.querySelector('.add-stock-serial');
  const volumeEl = row.querySelector('.add-stock-volume');
  const remarksEl = row.querySelector('.add-stock-remarks');

  if (isAddStockRowEmpty(data)) {
    if (serialEl) clearAddStockFieldError(serialEl);
    if (volumeEl) clearAddStockFieldError(volumeEl);
    if (remarksEl) clearAddStockFieldError(remarksEl);
    return true;
  }

  const serialValid = serialEl ? validateSerialNumberField(serialEl, { required: true }) : false;
  const volumeValid = volumeEl ? validateVolumeField(volumeEl, { required: true }) : false;
  const remarksValid = remarksEl ? validateRemarksField(remarksEl) : true;
  return serialValid && volumeValid && remarksValid;
}

function handleAddStockRowDateChange(el) {
  const row = el.closest('tr');
  if (!row) return;

  const componentType = row.querySelector('.add-stock-component')?.value;
  const collectedAt = row.querySelector('.add-stock-collected')?.value;
  const expiresEl = row.querySelector('.add-stock-expires');

  if (componentType && collectedAt && expiresEl) {
    expiresEl.value = addStockCalculateExpiry(componentType, collectedAt);
  }

  markImportedRowTouched(row);
  refreshImportedRowReviewState(row);
  validateAddStockRowInputs(row);
  updateAddStockValidCount();
}

function handleAddStockRowChange(el) {
  const row = el.closest('tr');
  if (!row) {
    updateAddStockValidCount();
    return;
  }

  const componentEl = row.querySelector('.add-stock-component');
  const collectedEl = row.querySelector('.add-stock-collected');
  const expiresEl = row.querySelector('.add-stock-expires');

  if (
    el.classList.contains('add-stock-component') &&
    componentEl?.value &&
    collectedEl?.value &&
    expiresEl
  ) {
    expiresEl.value = addStockCalculateExpiry(componentEl.value, collectedEl.value);
  }

  if (el.classList.contains('add-stock-serial')) {
    validateSerialNumberField(el, { required: false });
  } else if (el.classList.contains('add-stock-volume')) {
    validateVolumeField(el, { required: false });
  } else if (el.classList.contains('add-stock-remarks')) {
    validateRemarksField(el);
  }

  markImportedRowTouched(row);
  refreshImportedRowReviewState(row);
  validateAddStockRowInputs(row);
  updateAddStockValidCount();
}

function getAddStockRowData(row) {
  const bloodGroup = sanitizeAddStockBloodGroup(row.querySelector('.add-stock-blood-group')?.value || '');
  const split = splitBloodGroup(bloodGroup);

  return {
    serialNumber: normalizeAddStockSerialValue(row.querySelector('.add-stock-serial')?.value || ''),
    bloodGroup,
    aboType: split.aboType,
    rhType: split.rhType,
    componentType: normalizeAddStockComponentValue(row.querySelector('.add-stock-component')?.value || ''),
    volumeMl: String(row.querySelector('.add-stock-volume')?.value || '').replace(/\D/g, '').slice(0, ADD_STOCK_VOLUME_MAX_LENGTH),
    collectedAt: parseDateCandidate(row.querySelector('.add-stock-collected')?.value || ''),
    expiresAt: parseDateCandidate(row.querySelector('.add-stock-expires')?.value || ''),
    remarks: String(row.querySelector('.add-stock-remarks')?.value || '')
      .replace(/<[^>]*>/g, '')
      .replace(/[^A-Za-z0-9.,\-\s]/g, '')
      .slice(0, ADD_STOCK_REMARKS_MAX_LENGTH)
      .trim(),
  };
}

function isAddStockRowEmpty(data) {
  return !data.serialNumber &&
    !data.bloodGroup &&
    !data.componentType &&
    !data.volumeMl &&
    !data.collectedAt &&
    !data.expiresAt &&
    !data.remarks;
}

function isAddStockRowComplete(data) {
  return data.serialNumber &&
    isAddStockSerialValueValid(data.serialNumber) &&
    data.bloodGroup &&
    data.aboType &&
    data.rhType &&
    data.componentType &&
    data.volumeMl &&
    isAddStockVolumeValueValid(data.volumeMl) &&
    data.collectedAt &&
    data.expiresAt &&
    isAddStockRemarksValueValid(data.remarks);
}

function getValidAddStockRows() {
  const rows = [...document.querySelectorAll('#add-stock-rows tr')];
  return rows.map(row => getAddStockRowData(row)).filter(data => !isAddStockRowEmpty(data));
}

function updateAddStockValidCount() {
  const countEl = document.getElementById('add-stock-valid-count');
  if (!countEl) return;

  const validRows = getValidAddStockRows().filter(data => isAddStockRowComplete(data));
  countEl.textContent = validRows.length;
}

function updateAddStockRowNumbers() {
  document.querySelectorAll('#add-stock-rows tr').forEach((row, index) => {
    const firstCell = row.querySelector('td');
    if (firstCell) firstCell.textContent = index + 1;

    const copyBtn = row.querySelector('button[onclick^="copyPreviousAddStockRow"]');
    if (copyBtn) {
      copyBtn.setAttribute('onclick', `copyPreviousAddStockRow(${index})`);
      copyBtn.disabled = index === 0;
      copyBtn.style.opacity = index === 0 ? '0.5' : '1';
    }
  });
}

function removeAddStockRow(btn) {
  const row = btn.closest('tr');
  if (row) row.remove();

  updateAddStockRowNumbers();
  updateAddStockValidCount();
}

function copyPreviousAddStockRow(index) {
  if (index <= 0) return;

  const rows = [...document.querySelectorAll('#add-stock-rows tr')];
  const current = rows[index];
  const previous = rows[index - 1];

  if (!current || !previous) return;

  const prevData = getAddStockRowData(previous);

  current.querySelector('.add-stock-blood-group').value = prevData.bloodGroup;
  current.querySelector('.add-stock-component').value = prevData.componentType;
  current.querySelector('.add-stock-volume').value = prevData.volumeMl;
  current.querySelector('.add-stock-collected').value = prevData.collectedAt;
  current.querySelector('.add-stock-expires').value = prevData.expiresAt;

  validateAddStockRowInputs(current);
  updateAddStockValidCount();
}

function applyAddStockDefaultsToEmptyRows() {
  const defaults = getAddStockDefaults();
  const rows = [...document.querySelectorAll('#add-stock-rows tr')];

  rows.forEach((row, index) => {
    const data = getAddStockRowData(row);
    if (!isAddStockRowEmpty(data)) return;

    row.querySelector('.add-stock-serial').value = index === 0 ? defaults.serialNumber : '';
    row.querySelector('.add-stock-blood-group').value = defaults.bloodGroup;
    row.querySelector('.add-stock-component').value = defaults.componentType;
    row.querySelector('.add-stock-volume').value = defaults.volumeMl;
    row.querySelector('.add-stock-collected').value = defaults.collectedAt;
    row.querySelector('.add-stock-expires').value = defaults.expiresAt;
    row.querySelector('.add-stock-remarks').value = defaults.remarks;
    validateAddStockRowInputs(row);
  });

  updateAddStockValidCount();
}

function applyAddStockDefaultsToAllRows() {
  const defaults = getAddStockDefaults();
  const rows = [...document.querySelectorAll('#add-stock-rows tr')];

  if (!rows.length) {
    showBloodPlusMessage('No Rows Found', 'Please add at least one blood bag row before applying defaults.', 'warning');
    return;
  }

  rows.forEach(row => {
    row.querySelector('.add-stock-blood-group').value = defaults.bloodGroup;
    row.querySelector('.add-stock-component').value = defaults.componentType;
    row.querySelector('.add-stock-volume').value = defaults.volumeMl;
    row.querySelector('.add-stock-collected').value = defaults.collectedAt;
    row.querySelector('.add-stock-expires').value = defaults.expiresAt;
    row.querySelector('.add-stock-remarks').value = defaults.remarks;
    validateAddStockRowInputs(row);
  });

  updateAddStockValidCount();
  showBloodPlusMessage('Defaults Applied', 'Defaults applied to all rows.', 'success');
}

function clearEmptyAddStockRows() {
  const rows = [...document.querySelectorAll('#add-stock-rows tr')];

  rows.forEach(row => {
    const data = getAddStockRowData(row);
    if (isAddStockRowEmpty(data)) row.remove();
  });

  updateAddStockRowNumbers();
  updateAddStockValidCount();
}

async function submitAddBloodStock() {
  if (addStockSubmitLocked) {
    return;
  }

  const transactionInput = document.getElementById('add-transaction-number');
  const transactionNumber = String(transactionInput?.value || '')
    .replace(/\D/g, '')
    .slice(0, 10)
    .trim();
  if (transactionInput) transactionInput.value = transactionNumber;
  const rows = [...document.querySelectorAll('#add-stock-rows tr')];

  if (!rows.length) {
    showBloodPlusMessage('No Rows Added', 'Please add at least one blood bag row.', 'warning');
    return;
  }

  const allRows = rows.map(row => ({
    element: row,
    data: getAddStockRowData(row),
  }));

  const nonEmptyRows = allRows.filter(item => !isAddStockRowEmpty(item.data));

  if (!nonEmptyRows.length) {
    showBloodPlusMessage('No Filled Rows', 'Please fill in at least one blood bag row.', 'warning');
    return;
  }

  const firstInvalidRow = nonEmptyRows.find(item => !validateAddStockRowInputs(item.element));
  if (firstInvalidRow) {
    firstInvalidRow.element.scrollIntoView({ behavior: 'smooth', block: 'center' });
    showBloodPlusMessage('Invalid Row Data', 'Please fix highlighted serial, volume, or remarks fields before submitting.', 'warning');
    return;
  }

  const incomplete = nonEmptyRows.find(item => !isAddStockRowComplete(item.data));
  if (incomplete) {
    showBloodPlusMessage('Incomplete Row', 'Please complete all partially filled rows before submitting.', 'warning');
    return;
  }

  const serials = nonEmptyRows.map(item => item.data.serialNumber.toUpperCase());
  const duplicateSerial = serials.find((serial, index) => serials.indexOf(serial) !== index);

  if (duplicateSerial) {
    showBloodPlusMessage('Duplicate Serial', 'Duplicate serial number found: ' + duplicateSerial, 'error');
    return;
  }

  lockAddStockSubmit('Waiting for confirmation...');
  bloodPlusModalOnHide = unlockAddStockSubmit;

  showBloodPlusConfirm(
    'Receive Blood Bags',
    `Receive ${nonEmptyRows.length} blood bag(s) under transaction ${transactionNumber || 'N/A'}?`,
    async () => {
      try {
        lockAddStockSubmit('Receiving batch...');
        for (const item of nonEmptyRows) {
          const data = item.data;

          const res = await fetch('/api/admin/blood-bank/intake', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({
              serialNumber: data.serialNumber,
              transactionNumber: transactionNumber || null,
              aboType: data.aboType,
              rhType: data.rhType,
              componentType: data.componentType,
              volumeMl: parseInt(data.volumeMl, 10),
              collectedAt: data.collectedAt + 'T00:00:00',
              expiresAt: data.expiresAt + 'T00:00:00',
              remarks: data.remarks || null,
              source: 'TRANSFER',
            })
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            showBloodPlusMessage('Failed to Add Bag', err.message || `Failed to add bag ${data.serialNumber}.`, 'error');
            unlockAddStockSubmit();
            return;
          }
        }

        closeModal('addBloodModal');
        await loadBloodBank();
        showBloodPlusMessage('Batch Received', `${nonEmptyRows.length} blood bag(s) received successfully.`, 'success');
        unlockAddStockSubmit();
      } catch (err) {
        console.error('Add stock batch error:', err);
        showBloodPlusMessage('Network Error', 'Network error. Please try again.', 'error');
        unlockAddStockSubmit();
      }
    },
    'info'
  );
}

// -- Add Stock Keyboard Navigation ------------------------------------------------
document.addEventListener('keydown', function (e) {
  const active = document.activeElement;
  if (!active || !active.closest('#add-stock-rows')) return;

  const row = active.closest('tr');
  if (!row) return;

  const rows = [...document.querySelectorAll('#add-stock-rows tr')];
  const currentRowIndex = rows.indexOf(row);
  const inputs = [...row.querySelectorAll('input, select')];
  const currentColIndex = inputs.indexOf(active);

  if (currentColIndex === -1) return;

  let target = null;

  if (e.key === 'ArrowRight') {
    if (currentColIndex < inputs.length - 1) {
      target = inputs[currentColIndex + 1];
    }
  } else if (e.key === 'ArrowLeft') {
    if (currentColIndex > 0) {
      target = inputs[currentColIndex - 1];
    }
  } else if (e.key === 'ArrowDown' || e.key === 'Enter') {
    const nextRow = rows[currentRowIndex + 1];
    if (nextRow) {
      const nextInputs = [...nextRow.querySelectorAll('input, select')];
      target = nextInputs[currentColIndex] || nextInputs[0];
    }
  } else if (e.key === 'ArrowUp') {
    const prevRow = rows[currentRowIndex - 1];
    if (prevRow) {
      const prevInputs = [...prevRow.querySelectorAll('input, select')];
      target = prevInputs[currentColIndex] || prevInputs[0];
    }
  }

  if (!target) return;

  e.preventDefault();
  target.focus();
  if (target.select) {
    setTimeout(() => target.select(), 0);
  }
});

// -- Sync Helper: Invalidate Blood Request Bag Cache -----------------------------
function invalidateBagCache() {
  if (typeof reqInvalidateBagCache === 'function') {
    reqInvalidateBagCache();
  }
}

// ANALYTICS
const AnalyticsDashboard = {
  apiConfig: {
    baseUrl: window.location.origin,
    endpoint: '/api/admin/analytics',
    refreshInterval: 30000
  },

  data: null,
  isLoading: false,
  lastUpdate: null,
  resizeBound: false,
  chartAnimations: {},
  activeChartFilters: {
    status: null,
    component: null
  },
  activeUrgencyFilters: new Set(),
  activeCategoryFilters: new Set(),
  hoveredUrgencyLabel: null,

  init: function() {
    this.loadMetrics();
    this.bindResize();
    if (!this._refreshTimer) {
      this._refreshTimer = setInterval(() => {
        this.loadMetrics();
      }, this.apiConfig.refreshInterval);
    }
  },

  bindResize: function() {
    if (this.resizeBound) return;
    this.resizeBound = true;

    window.addEventListener('resize', () => {
      clearTimeout(this._resizeTimer);
      this._resizeTimer = setTimeout(() => {
        this.renderWhenVisible();
      }, 140);
    });
  },

  getSelectedDateRange: function() {
    const startEl = document.getElementById('analytics-export-from-date');
    const endEl = document.getElementById('analytics-export-to-date');
    return {
      startDate: startEl ? startEl.value : '',
      endDate: endEl ? endEl.value : ''
    };
  },

  buildMetricsUrl: function() {
    const { startDate, endDate } = this.getSelectedDateRange();
    const hasStart = Boolean(startDate);
    const hasEnd = Boolean(endDate);

    if (!hasStart && !hasEnd) {
      return `${this.apiConfig.baseUrl}${this.apiConfig.endpoint}`;
    }
    if (hasStart !== hasEnd) {
      return null;
    }
    if (startDate > endDate) {
      throw new Error('Start date must be on or before end date.');
    }

    const query = new URLSearchParams({ startDate, endDate });
    return `${this.apiConfig.baseUrl}${this.apiConfig.endpoint}?${query.toString()}`;
  },

  onDateRangeChanged: function() {
    this.loadMetrics(true);
  },

  loadMetrics: function(force = false) {
    if (this.isLoading) {
      if (force) this._refreshAfterLoad = true;
      return;
    }
    this.isLoading = true;

    let url = '';
    try {
      url = this.buildMetricsUrl();
      if (!url) {
        this.isLoading = false;
        return;
      }
    } catch (error) {
      console.error('Invalid analytics date range:', error);
      this.isLoading = false;
      return;
    }

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        this.data = data;
        this.lastUpdate = new Date();
        this.render();
        this.isLoading = false;
      })
      .catch(error => {
        console.error('Error fetching analytics data:', error);
        this.showErrorState();
      })
      .finally(() => {
        this.isLoading = false;
        if (this._refreshAfterLoad) {
          this._refreshAfterLoad = false;
          this.loadMetrics(true);
        }
      });
  },

  render: function() {
    const hasData = this.data && Object.keys(this.data).length > 0;
    this.toggleEmptyState(hasData);
    if (!hasData) return;

    this.renderMetricCards();
    this.syncChartMetrics();
    this.renderDispatch();
    this.renderAlerts();
    this.renderRequesterType();
    this.renderHospitals();
    this.renderFulfillmentMetrics();
    this.renderWhenVisible();
  },

  toggleEmptyState: function(hasData) {
    const emptyEl = document.getElementById('analytics-empty-state');
    const contentEl = document.getElementById('analytics-content');
    if (emptyEl) emptyEl.style.display = hasData ? 'none' : 'block';
    if (contentEl) contentEl.style.display = hasData ? 'block' : 'none';
  },

  isAnalyticsTabVisible: function() {
    const tab = document.getElementById('bb-tab-analytics');
    if (!tab) return false;
    if (tab.style.display === 'none') return false;

    const rect = tab.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0;
  },

  getChartCanvasHeight: function(canvasId) {
    const heightMap = {
      analyticsUrgencyChart: 150
    };
    return heightMap[canvasId] || 170;
  },

  resizeAnalyticsCanvases: function() {
    const canvasIds = ['analyticsUrgencyChart'];
    const dpr = window.devicePixelRatio || 1;
    let readyCount = 0;

    canvasIds.forEach((canvasId) => {
      const canvas = document.getElementById(canvasId);
      if (!canvas) return;

      const parent = canvas.parentElement;
      const parentWidth = Math.floor(parent ? parent.getBoundingClientRect().width : canvas.getBoundingClientRect().width);
      const cssWidth = Math.max(0, parentWidth);
      const cssHeight = this.getChartCanvasHeight(canvasId);

      if (cssWidth <= 0 || cssHeight <= 0) return;

      canvas.style.width = '100%';
      canvas.style.height = `${cssHeight}px`;

      const targetWidth = Math.floor(cssWidth * dpr);
      const targetHeight = Math.floor(cssHeight * dpr);
      if (targetWidth <= 0 || targetHeight <= 0) return;

      if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
        canvas.width = targetWidth;
        canvas.height = targetHeight;
      }

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, cssWidth, cssHeight);
      readyCount += 1;
    });

    return readyCount > 0;
  },

  renderWhenVisible: function () {
    const tab = document.getElementById('bb-tab-analytics');
    if (!tab || tab.style.display === 'none') return;

    requestAnimationFrame(() => {
      setTimeout(() => {
        this.renderCharts();
      }, 80);
    });
  },

  toNumber: function(value) {
    const num = Number(value);
    return Number.isFinite(num) ? num : 0;
  },

  setMetric: function(metricKey, value) {
    const el = document.querySelector(`[data-metric="${metricKey}"]`);
    if (el) el.textContent = value;
  },

  readByCandidates: function(obj, candidates) {
    if (!obj) return 0;
    for (const key of candidates) {
      if (obj[key] !== undefined && obj[key] !== null) {
        return this.toNumber(obj[key]);
      }
    }
    return 0;
  },

  clamp: function(value, min, max) {
    return Math.max(min, Math.min(max, value));
  },

  renderMetricCards: function() {
    const requests = this.data.requests || {};
    const statuses = ['pending', 'approved', 'allocated', 'released', 'rejected', 'cancelled'];

    statuses.forEach(status => {
      const value = this.toNumber(requests[status]);
      this.setMetric(`request-${status}`, value);

      const card = document.querySelector(`[data-status-card="${status}"]`);
      if (card) {
        const accent = (status === 'pending' || status === 'rejected') && value > 0;
        card.classList.toggle('is-accent', accent);
      }
    });
  },

  getStatusItems: function() {
    const requests = this.data.requests || {};
    return [
      { label: 'Pending', value: this.toNumber(requests.pending), emphasis: true },
      { label: 'Approved', value: this.toNumber(requests.approved) },
      { label: 'Allocated', value: this.toNumber(requests.allocated) },
      { label: 'Released', value: this.toNumber(requests.released), emphasis: true },
      { label: 'Rejected', value: this.toNumber(requests.rejected) },
      { label: 'Cancelled', value: this.toNumber(requests.cancelled) }
    ];
  },

  getUrgencyItems: function() {
    const urgency = this.data.urgency || {};
    return [
      { label: 'Critical', value: this.toNumber(urgency.CRITICAL), metricKey: 'urgency-critical', tone: 'accent', color: 'rgba(196, 30, 58, 0.92)' },
      { label: 'High', value: this.toNumber(urgency.HIGH), metricKey: 'urgency-high', tone: 'strong', color: 'rgba(43, 46, 52, 0.92)' },
      { label: 'Medium', value: this.toNumber(urgency.MEDIUM), metricKey: 'urgency-medium', tone: 'muted', color: 'rgba(121, 127, 136, 0.88)' },
      { label: 'Low', value: this.toNumber(urgency.LOW), metricKey: 'urgency-low', tone: 'soft', color: 'rgba(187, 191, 198, 0.9)' }
    ];
  },

  getCategoryItems: function() {
    const category = this.data.category || {};
    return [
      { label: 'Inpatient', value: this.toNumber(category.INPATIENT), metricKey: 'category-inpatient', tone: 'strong', color: 'rgba(43, 46, 52, 0.92)' },
      { label: 'Outpatient', value: this.toNumber(category.OUTPATIENT), metricKey: 'category-outpatient', tone: 'accent', color: 'rgba(196, 30, 58, 0.88)' }
    ];
  },

  getComponentItems: function() {
    const source = this.data.bloodComponent || {};
    return [
      { label: 'WB', fullLabel: 'Whole Blood', value: this.toNumber(source.WHOLE_BLOOD), metricKey: 'component-whole-blood', tone: 'accent', color: 'rgba(196, 30, 58, 0.9)' },
      { label: 'PRBC', fullLabel: 'Packed Red Blood Cells', value: this.toNumber(source.PRBC), metricKey: 'component-prbc', tone: 'strong', color: 'rgba(43, 46, 52, 0.92)' },
      { label: 'L-PRBC', fullLabel: 'Leukoreduced PRBC', value: this.toNumber(source.LEUKOREDUCED_PRBC), metricKey: 'component-leukoreduced-prbc', tone: 'muted', color: 'rgba(112, 118, 126, 0.9)' },
      { label: 'A-PRBC', fullLabel: 'Aliquoted PRBC', value: this.toNumber(source.ALIQUOTED_PRBC), metricKey: 'component-aliquoted-prbc', tone: 'soft', color: 'rgba(171, 176, 184, 0.9)' },
      { label: 'FFP', fullLabel: 'Fresh Frozen Plasma', value: this.toNumber(source.FRESH_FROZEN_PLASMA), metricKey: 'component-ffp', tone: 'muted', color: 'rgba(121, 127, 136, 0.88)' },
      { label: 'PLT', fullLabel: 'Platelet Concentrate', value: this.toNumber(source.PLATELET_CONCENTRATE), metricKey: 'component-platelet-concentrate', tone: 'strong', color: 'rgba(74, 79, 88, 0.9)' },
      { label: 'CRYO', fullLabel: 'Cryoprecipitate', value: this.toNumber(source.CRYOPRECIPITATE), metricKey: 'component-cryoprecipitate', tone: 'muted', color: 'rgba(134, 139, 147, 0.9)' },
      { label: 'CRYOSUP', fullLabel: 'Cryosupernatant', value: this.toNumber(source.CRYOSUPERNATANT), metricKey: 'component-cryosupernatant', tone: 'soft', color: 'rgba(187, 191, 198, 0.9)' }
    ];
  },

  syncChartMetrics: function() {
    const urgencyItems = this.getUrgencyItems();
    const categoryItems = this.getCategoryItems();
    const componentItems = this.getComponentItems();

    const setMetricsWithPct = (items) => {
      const total = items.reduce((sum, item) => sum + this.toNumber(item.value), 0);
      items.forEach((item) => {
        if (!item.metricKey) return;
        this.setMetric(item.metricKey, this.toNumber(item.value));
        this.setMetric(`${item.metricKey}-pct`, total > 0 ? `${Math.round((item.value / total) * 100)}%` : '0%');
      });
    };

    setMetricsWithPct(urgencyItems);
    setMetricsWithPct(categoryItems);
    setMetricsWithPct(componentItems);
    this.setMetric('category-emergency', 0);
    this.setMetric('category-hospital', 0);
    this.setMetric('category-emergency-pct', '0%');
    this.setMetric('category-hospital-pct', '0%');

    const componentTotal = componentItems.reduce((sum, item) => sum + this.toNumber(item.value), 0);
    const redCells = this.toNumber(componentItems[1].value) + this.toNumber(componentItems[2].value) + this.toNumber(componentItems[3].value);
    const plasma = this.toNumber(componentItems[4].value);
    const platelets = this.toNumber(componentItems[5].value);

    this.setMetric('component-red-cells', redCells);
    this.setMetric('component-plasma', plasma);
    this.setMetric('component-platelets', platelets);
    this.setMetric('component-red-cells-pct', componentTotal > 0 ? `${Math.round((redCells / componentTotal) * 100)}%` : '0%');
    this.setMetric('component-plasma-pct', componentTotal > 0 ? `${Math.round((plasma / componentTotal) * 100)}%` : '0%');
    this.setMetric('component-platelets-pct', componentTotal > 0 ? `${Math.round((platelets / componentTotal) * 100)}%` : '0%');
  },

  renderMiniBars: function(containerId, items, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rows = (items || []).map(item => ({
      label: item.label || '',
      value: this.toNumber(item.value),
      metricKey: item.metricKey || null,
      pctMetricKey: item.pctMetricKey || null,
      tone: item.tone || 'muted',
      showPercent: item.showPercent !== false
    }));

    if (!rows.length) {
      container.innerHTML = '<div class="an-empty-row">No data available.</div>';
      return;
    }

    const maxValue = Math.max(...rows.map(row => row.value), 1);
    const total = rows.reduce((sum, row) => sum + row.value, 0);

    container.innerHTML = rows.map(row => {
      const width = this.clamp((row.value / maxValue) * 100, 0, 100);
      const pct = total > 0 ? Math.round((row.value / total) * 100) : 0;
      const valueAttr = row.metricKey ? ` data-metric="${row.metricKey}"` : '';
      const pctAttr = row.pctMetricKey ? ` data-metric="${row.pctMetricKey}"` : '';
      const pctNode = row.showPercent ? `<em${pctAttr}>${pct}%</em>` : '';

      return `
        <div class="an-mini-stat">
          <div class="an-mini-stat-top">
            <span class="an-mini-label">${this.escapeHtml(row.label)}</span>
            <span class="an-mini-values">
              <strong${valueAttr}>${row.value}</strong>
              ${pctNode}
            </span>
          </div>
          <div class="an-mini-track"><div class="an-mini-fill tone-${row.tone}" data-fill-target="${width.toFixed(2)}"></div></div>
        </div>`;
    }).join('');

    this.animateFillElements(container);
  },

  animateFillElements: function(root) {
    const fills = root.querySelectorAll('[data-fill-target]');
    fills.forEach(fill => {
      fill.style.width = '0%';
      const target = this.clamp(this.toNumber(fill.getAttribute('data-fill-target')), 0, 100);
      requestAnimationFrame(() => {
        fill.style.width = `${target}%`;
      });
    });
  },

  renderProgressMetric: function(metricKey, value, options = {}) {
    const numeric = this.toNumber(value);
    const decimals = Number.isInteger(options.decimals) ? options.decimals : 1;
    const suffix = options.suffix || '';
    const text = options.formatter
      ? options.formatter(numeric)
      : `${numeric.toFixed(decimals)}${suffix}`;

    this.setMetric(metricKey, text);

    if (options.barKey) {
      const bar = document.querySelector(`[data-metric-bar="${options.barKey}"]`);
      if (bar) {
        const width = this.clamp(numeric, 0, 100);
        bar.style.width = '0%';
        requestAnimationFrame(() => {
          bar.style.width = `${width}%`;
        });
      }
    }
  },

  renderRequestStatus: function() {
    // Request status values are rendered in top summary cards.
    return;
  },

  renderUrgency: function() {
    this.renderInteractiveDonutChart(
      'analyticsUrgencyChart',
      'analytics-urgency-legend',
      this.getUrgencyItems(),
      {
        unitLabel: 'requests',
        filterSet: this.activeUrgencyFilters,
        hoverStateKey: 'hoveredUrgencyLabel'
      }
    );
  },

  renderCategory: function() {
    this.renderInteractiveBarChart('analytics-category-chart', this.getCategoryItems(), {
      chartKey: 'category',
      orientation: 'horizontal',
      unitLabel: 'requests',
      showPercent: true,
      scaleByTotal: true,
      selectionSet: this.activeCategoryFilters
    });
  },

  renderBloodTypes: function() {
    const bloodTypes = this.data.bloodTypes || {};
    const inventoryMap = {
      'o-neg': ['O_NEG', 'O_NEG_NEGATIVE', 'O_NEGATIVE', 'O-'],
      'o-pos': ['O_POS', 'O_POS_POSITIVE', 'O_POSITIVE', 'O+'],
      'a-neg': ['A_NEG', 'A_NEG_NEGATIVE', 'A_NEGATIVE', 'A-'],
      'a-pos': ['A_POS', 'A_POS_POSITIVE', 'A_POSITIVE', 'A+'],
      'b-neg': ['B_NEG', 'B_NEG_NEGATIVE', 'B_NEGATIVE', 'B-'],
      'b-pos': ['B_POS', 'B_POS_POSITIVE', 'B_POSITIVE', 'B+'],
      'ab-neg': ['AB_NEG', 'AB_NEG_NEGATIVE', 'AB_NEGATIVE', 'AB-'],
      'ab-pos': ['AB_POS', 'AB_POS_POSITIVE', 'AB_POSITIVE', 'AB+']
    };

    Object.entries(inventoryMap).forEach(([domKey, candidates]) => {
      const count = this.readByCandidates(bloodTypes, candidates);
      this.setMetric(`blood-${domKey}`, count);

      let status = 'Available';
      let statusColor = 'var(--muted)';

      if (count === 0) {
        status = 'No stock';
        statusColor = 'var(--crimson)';
      } else if (count < 5) {
        status = 'Low stock';
        statusColor = 'var(--crimson)';
      }

      const statusEl = document.querySelector(`[data-status="blood-${domKey}-status"]`);
      if (statusEl) {
        statusEl.textContent = status;
        statusEl.style.color = statusColor;
      }
    });
  },

  renderDispatch: function() {
    if (!this.data.dispatch) return;

    ['USED', 'DISCARDED', 'TRANSFERRED'].forEach(type => {
      this.setMetric(`dispatch-${type.toLowerCase()}`, this.toNumber(this.data.dispatch[type]));
    });
  },

  renderAlerts: function() {
    if (!this.data.alerts) return;

    this.setMetric('alert-expiring-soon', this.toNumber(this.data.alerts.expiringSoon));
    this.setMetric('alert-expired', this.toNumber(this.data.alerts.expired));
    this.setMetric('alert-quality-issues', this.toNumber(this.data.alerts.qualityIssues));
  },

  renderRequesterType: function() {
    if (!this.data.requesterType) return;

    const requester = this.data.requesterType;
    const hospital = this.toNumber(requester.HOSPITAL);
    const other = requester.ANONYMOUS !== undefined
      ? this.toNumber(requester.ANONYMOUS)
      : Object.entries(requester)
          .filter(([key]) => key !== 'HOSPITAL')
          .reduce((sum, [, value]) => sum + this.toNumber(value), 0);

    this.renderMiniBars('analytics-requester-list', [
      {
        label: 'Outpatient',
        value: hospital,
        metricKey: 'requester-hospital',
        pctMetricKey: 'requester-hospital-pct',
        tone: 'critical'
      },
      {
        label: 'Inpatient',
        value: other,
        metricKey: 'requester-anonymous',
        pctMetricKey: 'requester-anonymous-pct',
        tone: 'muted'
      }
    ]);
  },

  renderBloodComponents: function() {
    this.renderInteractiveBarChart('analytics-component-chart', this.getComponentItems(), {
      chartKey: 'component',
      orientation: 'vertical',
      unitLabel: 'requests',
      showPercent: false
    });
  },

  renderHospitals: function() {
    const container = document.getElementById('hospital-list');
    if (!container) return;

    if (!this.data.hospitals || this.data.hospitals.length === 0) {
      container.innerHTML = `
        <div class="an-row an-empty-row">
          No hospital analytics available.
        </div>`;
      return;
    }

    const hospitals = [...this.data.hospitals]
      .sort((a, b) => this.toNumber(b.requests) - this.toNumber(a.requests))
      .slice(0, 6);

    container.innerHTML = hospitals.map(hospital => {
      const requests = this.toNumber(hospital.requests);
      const fulfilled = this.toNumber(hospital.fulfilled);
      const rate = requests > 0 ? Math.round((fulfilled / requests) * 100) : 0;

      return `
        <div class="an-row">
          <div class="an-row-top">
            <span>${this.escapeHtml(hospital.name || 'Unknown Hospital')}</span>
            <span>${rate}%</span>
          </div>
          <div class="an-row-sub">${fulfilled} / ${requests} Served requests</div>
          <div class="an-mini-bar"><div data-fill-target="${rate.toFixed(2)}"></div></div>
        </div>`;
    }).join('');

    this.animateFillElements(container);
  },

  renderFulfillmentMetrics: function() {
    if (!this.data.fulfillmentMetrics) return;

    const metrics = this.data.fulfillmentMetrics;
    const rate = this.toNumber(metrics.rate);
    const totalReleased = this.toNumber(metrics.totalReleased);
    const avgDays = this.toNumber(metrics.avgDaysToRelease);

    this.renderProgressMetric('fulfillment-rate', rate, {
      barKey: 'fulfillment-rate',
      suffix: '%',
      decimals: 1
    });

    this.setMetric('total-released', totalReleased);
    this.setMetric('avg-fulfillment-days', `${avgDays.toFixed(1)} days`);
  },

  // -- Chart Rendering ------------------------------------------------------------
  renderCharts: function() {
    if (!this.data) return;
    if (!this.isAnalyticsTabVisible()) return;
    this.resizeAnalyticsCanvases();
    this.hideAnalyticsTooltip();

    this.renderInteractiveBarChart('analytics-status-chart', this.getStatusItems(), {
      chartKey: 'status',
      orientation: 'vertical',
      unitLabel: 'requests',
      showPercent: false
    });
    this.renderUrgency();
    this.renderCategory();
    this.renderBloodComponents();
  },

  getPalette: function() {
    return {
      accent: 'rgba(196, 30, 58, 0.92)',
      strong: 'rgba(43, 46, 52, 0.92)',
      muted: 'rgba(86, 92, 102, 0.86)',
      soft: 'rgba(123, 129, 139, 0.78)',
      inactive: 'rgba(140, 145, 153, 0.36)',
      track: 'rgba(25, 27, 32, 0.06)',
      text: '#2d2d31'
    };
  },

  prepareCanvas: function(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const rect = canvas.getBoundingClientRect();
    const cssWidth = Math.floor(rect.width || canvas.clientWidth || 0);
    const cssHeight = Math.floor(rect.height || canvas.clientHeight || 0);
    if (cssWidth <= 0 || cssHeight <= 0) return null;

    const dpr = window.devicePixelRatio || 1;
    const targetWidth = Math.floor(cssWidth * dpr);
    const targetHeight = Math.floor(cssHeight * dpr);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
      canvas.width = targetWidth;
      canvas.height = targetHeight;
    }

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, cssWidth, cssHeight);

    return { canvas, ctx, cssWidth, cssHeight };
  },

  getChartItemColor: function(item, index, activeLabel, isHovered) {
    const palette = this.getPalette();
    if (activeLabel && activeLabel !== item.label) return palette.inactive;
    if (activeLabel && activeLabel === item.label) return palette.accent;
    if (isHovered) return 'rgba(75, 79, 88, 0.95)';
    if (item.tone === 'accent' || item.emphasis) return palette.accent;
    if (item.tone === 'soft') return palette.soft;
    if (item.tone === 'muted') return palette.muted;
    if (item.tone === 'strong') return palette.strong;
    return index % 2 === 0 ? palette.strong : palette.muted;
  },

  renderInteractiveBarChart: function(containerId, items, options = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const chartKey = options.chartKey || containerId;
    const orientation = options.orientation === 'vertical' ? 'vertical' : 'horizontal';
    const showPercent = options.showPercent !== false;
    const unitLabel = options.unitLabel || 'items';
    const scaleByTotal = options.scaleByTotal === true;
    const selectionSet = options.selectionSet || null;
    const hasSelectionSet = selectionSet instanceof Set;
    const activeLabel = hasSelectionSet ? null : (this.activeChartFilters[chartKey] || null);
    const hasSelection = hasSelectionSet ? selectionSet.size > 0 : !!activeLabel;
    const palette = this.getPalette();

    const safeItems = (items || []).map((item, index) => ({
      ...item,
      value: this.toNumber(item.value),
      label: item.label || `Item ${index + 1}`,
      tooltipLabel: item.fullLabel || item.label || `Item ${index + 1}`
    }));

    if (!safeItems.length) {
      container.innerHTML = '<div class="an-empty-row">No data available.</div>';
      return;
    }

    const total = safeItems.reduce((sum, item) => sum + item.value, 0);
    const maxValue = Math.max(...safeItems.map(item => item.value), 1);
    const scaleBase = scaleByTotal ? total : maxValue;

    container.innerHTML = safeItems.map((item, index) => {
      const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
      const relative = scaleBase > 0 ? this.clamp((item.value / scaleBase) * 100, 0, 100) : 0;
      const isActive = hasSelection
        ? (hasSelectionSet ? selectionSet.has(item.label) : activeLabel === item.label)
        : false;
      const isMuted = hasSelection
        ? (hasSelectionSet ? !selectionSet.has(item.label) : activeLabel !== item.label)
        : false;
      const baseColor = item.color || this.getChartItemColor(item, index, null, false);
      const color = isMuted ? palette.inactive : baseColor;

      const metricAttr = item.metricKey ? ` data-metric="${item.metricKey}"` : '';
      const pctAttr = item.metricKey ? ` data-metric="${item.metricKey}-pct"` : '';
      const rowClass = [
        'an-chart-item',
        orientation === 'vertical' ? 'an-vbar-item' : 'an-hbar-item',
        isActive ? 'is-active' : '',
        isMuted ? 'is-muted' : ''
      ].filter(Boolean).join(' ');

      if (orientation === 'vertical') {
        return `
          <button type="button" class="${rowClass}"
            data-chart-key="${chartKey}"
            data-label="${this.escapeHtml(item.label)}"
            data-tooltip-label="${this.escapeHtml(item.tooltipLabel)}"
            data-value="${item.value}"
            data-pct="${pct}">
            <span class="an-vbar-value"${metricAttr}>${item.value}</span>
            <span class="an-vbar-track"><span class="an-vbar-fill ${item.value > 0 ? 'has-value' : ''}" data-fill-target="${relative.toFixed(2)}" style="background:${color}"></span></span>
            <span class="an-vbar-label">${this.escapeHtml(item.label)}</span>
          </button>`;
      }
      // console.log({ item, metricAttr, pctAttr, rowClass, color, relative });
      return `
        <button type="button" class="${rowClass}"
          data-chart-key="${chartKey}"
          data-label="${this.escapeHtml(item.label)}"
          data-tooltip-label="${this.escapeHtml(item.tooltipLabel)}"
          data-value="${item.value}"
          data-pct="${pct}">
          <span class="an-hbar-top">
            <span class="an-hbar-label">${this.escapeHtml(item.label)}</span>
            <span class="an-hbar-values">
              <strong${metricAttr}>${item.value}</strong>
              ${showPercent ? `<em${pctAttr}>${pct}%</em>` : ''}
            </span>
          </span>
          <span class="an-hbar-track"><span class="an-hbar-fill ${item.value > 0 ? 'has-value' : ''}" data-fill-target="${relative.toFixed(2)}" style="background:${color}"></span></span>
        </button>`;
    }).join('');

    const fills = container.querySelectorAll('[data-fill-target]');
    fills.forEach(fill => {
      if (orientation === 'vertical') {
        fill.style.height = '0%';
      } else {
        fill.style.width = '0%';
      }
      const target = this.clamp(this.toNumber(fill.getAttribute('data-fill-target')), 0, 100);
      requestAnimationFrame(() => {
        if (orientation === 'vertical') {
          fill.style.height = `${target}%`;
        } else {
          fill.style.width = `${target}%`;
        }
      });
    });

    const rows = container.querySelectorAll('.an-chart-item');
    rows.forEach(row => {
      const rowLabel = row.getAttribute('data-label') || '';
      const tooltipLabel = row.getAttribute('data-tooltip-label') || rowLabel;
      const value = this.toNumber(row.getAttribute('data-value'));
      const pct = this.toNumber(row.getAttribute('data-pct'));
      const tooltip = `<strong>${this.escapeHtml(tooltipLabel)}</strong><span>${value} ${unitLabel} (${pct}%)</span>`;

      row.addEventListener('mouseenter', (event) => {
        row.classList.add('is-hover');
        this.showAnalyticsTooltip(event, tooltip);
      });
      row.addEventListener('mousemove', (event) => {
        this.showAnalyticsTooltip(event, tooltip);
      });
      row.addEventListener('mouseleave', () => {
        row.classList.remove('is-hover');
        this.hideAnalyticsTooltip();
      });
      row.addEventListener('click', () => {
        if (hasSelectionSet) {
          if (selectionSet.has(rowLabel)) {
            selectionSet.delete(rowLabel);
          } else {
            selectionSet.add(rowLabel);
          }
        } else {
          const current = this.activeChartFilters[chartKey];
          this.activeChartFilters[chartKey] = current === rowLabel ? null : rowLabel;
        }
        this.renderCharts();
      });
    });
  },

  renderInteractiveDonutChart: function(canvasId, legendId, items, options = {}) {
    const prepared = this.prepareCanvas(canvasId);
    const legend = document.getElementById(legendId);
    if (!prepared || !legend) return;

    const { canvas, ctx, cssWidth, cssHeight } = prepared;
    const palette = this.getPalette();
    const unitLabel = options.unitLabel || 'requests';
    const filterSet = options.filterSet instanceof Set ? options.filterSet : new Set();
    const hoverStateKey = options.hoverStateKey || 'hoveredUrgencyLabel';
    const hoveredLabel = this[hoverStateKey] || null;
    const hasSelection = filterSet.size > 0;
    const safeItems = (items || []).map((item, index) => ({
      ...item,
      value: this.toNumber(item.value),
      label: item.label || `Item ${index + 1}`
    }));
    const total = safeItems.reduce((sum, item) => sum + item.value, 0);

    const cx = cssWidth / 2;
    const cy = cssHeight / 2;
    const outer = Math.min(cssWidth, cssHeight) * 0.43;
    const inner = outer * 0.62;
    const baseColors = [palette.accent, palette.strong, palette.muted, palette.soft];

    let cursor = 0;
    const segments = safeItems.map((item, index) => {
      const angle = total > 0 ? (item.value / total) * Math.PI * 2 : 0;
      const startRel = cursor;
      const endRel = cursor + angle;
      cursor = endRel;

      const isActive = hasSelection ? filterSet.has(item.label) : false;
      const isMuted = hasSelection ? !filterSet.has(item.label) : false;
      const isHover = hoveredLabel === item.label;
      const baseColor = item.color || baseColors[index % baseColors.length];
      let color = isMuted ? palette.inactive : baseColor;
      if (isHover && !isMuted) color = baseColor;

      return {
        ...item,
        index,
        pct: total > 0 ? Math.round((item.value / total) * 100) : 0,
        startRel,
        endRel,
        baseColor,
        color,
        isActive,
        isMuted,
        isHover
      };
    });

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    if (!total) {
      ctx.beginPath();
      ctx.arc(cx, cy, outer, 0, Math.PI * 2);
      ctx.arc(cx, cy, inner, Math.PI * 2, 0, true);
      ctx.closePath();
      ctx.fillStyle = palette.track;
      ctx.fill();
    } else {
      segments.forEach(seg => {
        const start = -Math.PI / 2 + seg.startRel;
        const end = -Math.PI / 2 + seg.endRel;
        const ringOuter = seg.isHover ? outer + 3 : outer;

        ctx.beginPath();
        ctx.arc(cx, cy, ringOuter, start, end);
        ctx.arc(cx, cy, inner, end, start, true);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();
      });
    }

    ctx.fillStyle = palette.text;
    ctx.textAlign = 'center';
    ctx.font = "700 20px 'Playfair Display', serif";
    ctx.fillText(String(total), cx, cy + 3);
    ctx.font = "11px 'DM Sans', sans-serif";
    ctx.fillStyle = 'rgba(102, 107, 115, 0.95)';
    ctx.fillText('Total', cx, cy + 19);

    legend.innerHTML = segments.map(seg => {
      const itemClass = [
        'an-donut-legend-item',
        seg.isActive ? 'is-active' : '',
        seg.isMuted ? 'is-muted' : '',
        seg.isHover ? 'is-hover' : ''
      ].filter(Boolean).join(' ');
      const metricAttr = seg.metricKey ? ` data-metric="${seg.metricKey}"` : '';
      const pctAttr = seg.metricKey ? ` data-metric="${seg.metricKey}-pct"` : '';

      return `
        <button type="button" class="${itemClass}"
          data-label="${this.escapeHtml(seg.label)}"
          data-value="${seg.value}"
          data-pct="${seg.pct}">
          <span class="swatch" style="background:${seg.baseColor}"></span>
          <span class="lbl">${this.escapeHtml(seg.label)}</span>
          <span class="vals"><strong${metricAttr}>${seg.value}</strong><em${pctAttr}>${seg.pct}%</em></span>
        </button>`;
    }).join('');

    const hitTest = (event) => {
      if (!total) return null;

      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < inner || dist > outer + 6) return null;

      let relAngle = Math.atan2(dy, dx) + Math.PI / 2;
      if (relAngle < 0) relAngle += Math.PI * 2;
      if (relAngle > Math.PI * 2) relAngle -= Math.PI * 2;

      return segments.find(seg => seg.value > 0 && relAngle >= seg.startRel && relAngle < seg.endRel) || null;
    };

    const refreshHover = (label) => {
      if (this[hoverStateKey] === label) return;
      this[hoverStateKey] = label;
      this.renderInteractiveDonutChart(canvasId, legendId, items, options);
    };

    canvas.onmousemove = (event) => {
      const hit = hitTest(event);
      if (!hit) {
        this.hideAnalyticsTooltip();
        refreshHover(null);
        return;
      }

      refreshHover(hit.label);
      this.showAnalyticsTooltip(
        event,
        `<strong>${this.escapeHtml(hit.label)}</strong><span>${hit.value} ${unitLabel} (${hit.pct}%)</span>`
      );
    };

    canvas.onmouseleave = () => {
      this.hideAnalyticsTooltip();
      refreshHover(null);
    };

    canvas.onclick = (event) => {
      const hit = hitTest(event);
      if (!hit) return;
      if (filterSet.has(hit.label)) {
        filterSet.delete(hit.label);
      } else {
        filterSet.add(hit.label);
      }
      this.renderCharts();
    };

    legend.querySelectorAll('.an-donut-legend-item').forEach((row) => {
      const label = row.getAttribute('data-label') || '';
      const value = this.toNumber(row.getAttribute('data-value'));
      const pct = this.toNumber(row.getAttribute('data-pct'));

      row.addEventListener('mouseenter', (event) => {
        refreshHover(label);
        this.showAnalyticsTooltip(
          event,
          `<strong>${this.escapeHtml(label)}</strong><span>${value} ${unitLabel} (${pct}%)</span>`
        );
      });
      row.addEventListener('mousemove', (event) => {
        this.showAnalyticsTooltip(
          event,
          `<strong>${this.escapeHtml(label)}</strong><span>${value} ${unitLabel} (${pct}%)</span>`
        );
      });
      row.addEventListener('mouseleave', () => {
        this.hideAnalyticsTooltip();
        refreshHover(null);
      });
      row.addEventListener('click', () => {
        if (filterSet.has(label)) {
          filterSet.delete(label);
        } else {
          filterSet.add(label);
        }
        this.renderCharts();
      });
    });
  },

  showAnalyticsTooltip: function(event, content) {
    const tooltip = document.getElementById('analytics-chart-tooltip');
    if (!tooltip) return;
    tooltip.innerHTML = content;
    tooltip.style.display = 'block';
    this.positionAnalyticsTooltip(event, tooltip);
  },

  positionAnalyticsTooltip: function(event, tooltip) {
    const pad = 12;
    const tooltipWidth = tooltip.offsetWidth || 160;
    const tooltipHeight = tooltip.offsetHeight || 42;
    let left = event.clientX + pad;
    let top = event.clientY + pad;

    if (left + tooltipWidth > window.innerWidth - 6) {
      left = event.clientX - tooltipWidth - pad;
    }
    if (top + tooltipHeight > window.innerHeight - 6) {
      top = event.clientY - tooltipHeight - pad;
    }

    tooltip.style.left = `${Math.max(6, left)}px`;
    tooltip.style.top = `${Math.max(6, top)}px`;
  },

  hideAnalyticsTooltip: function() {
    const tooltip = document.getElementById('analytics-chart-tooltip');
    if (!tooltip) return;
    tooltip.style.display = 'none';
  },

  showErrorState: function() {
    const elements = document.querySelectorAll('[data-metric]');
    elements.forEach(el => {
      el.textContent = '-';
    });
    this.toggleEmptyState(false);
  },

  escapeHtml: function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

document.addEventListener('DOMContentLoaded', function() {
  AnalyticsDashboard.init();
});

window.AnalyticsDashboard = AnalyticsDashboard;

// -------------------------------------------------------------------------------
// PRINTING FUNCTIONS - PDF & EXCEL EXPORTS (UPDATED)
// -------------------------------------------------------------------------------
window.printAnalyticsWithRange = async function() {
  const fromInput = document.getElementById('analytics-export-from-date');
  const toInput = document.getElementById('analytics-export-to-date');
  const startDate = fromInput ? fromInput.value : '';
  const endDate = toInput ? toInput.value : '';
  const hasDateFilter = Boolean(startDate || endDate);

  if (hasDateFilter && (!startDate || !endDate)) {
    alert('Please select both start and end dates, or leave both empty to export all analytics data.');
    return;
  }
  if (hasDateFilter && startDate > endDate) {
    alert('Start date must be on or before end date.');
    return;
  }

  let exportData = null;
  try {
    const query = new URLSearchParams();
    if (hasDateFilter) {
      query.set('startDate', startDate);
      query.set('endDate', endDate);
    }
    const exportUrl = query.toString()
      ? `${window.location.origin}/api/admin/analytics/export?${query.toString()}`
      : `${window.location.origin}/api/admin/analytics/export`;
    const response = await fetch(exportUrl);
    if (!response.ok) {
      let message = hasDateFilter
        ? 'Failed to export analytics for the selected date range.'
        : 'Failed to export analytics data.';
      try {
        const errorBody = await response.json();
        if (errorBody && errorBody.error) {
          message = errorBody.error;
        }
      } catch (_) {}
      alert(message);
      return;
    }
    exportData = await response.json();
  } catch (error) {
    console.error('Error exporting analytics with range:', error);
    alert('Unable to export analytics right now. Please try again.');
    return;
  }

  const previousData = window.AnalyticsDashboard ? window.AnalyticsDashboard.data : null;
  const previousRange = window.__analyticsExportRangeLabel;
  const exportRangeLabel = hasDateFilter ? `${startDate} to ${endDate}` : 'All Time';

  try {
    if (window.AnalyticsDashboard) {
      window.AnalyticsDashboard.data = exportData;
      window.AnalyticsDashboard.render();
    }
    window.__analyticsExportRangeLabel = exportRangeLabel;
    window.printAnalytics();
  } finally {
    window.__analyticsExportRangeLabel = previousRange;
    if (window.AnalyticsDashboard) {
      window.AnalyticsDashboard.data = previousData;
      window.AnalyticsDashboard.render();
    }
  }
};

/**
 * Print Analytics Report (PDF) - Compact Professional Design
 */
/**
 * Print Analytics Report (PDF) - Minimalist Design
 * Reads directly from displayed metrics in analytics panel
 */
window.printAnalytics = function() {
  const analyticsTab = document.getElementById('bb-tab-analytics');
  const analyticsContent = document.getElementById('analytics-content');
  if (!analyticsTab || !analyticsContent) return;

  const applyChartFillTargets = (root) => {
    root.querySelectorAll('[data-fill-target]').forEach((fillEl) => {
      const target = Number(fillEl.getAttribute('data-fill-target'));
      const safeTarget = Number.isFinite(target) ? Math.max(0, Math.min(100, target)) : 0;
      if (fillEl.classList.contains('an-vbar-fill')) {
        fillEl.style.height = `${safeTarget}%`;
        fillEl.style.width = '100%';
      } else {
        fillEl.style.width = `${safeTarget}%`;
      }
    });
  };

  if (window.AnalyticsDashboard && typeof window.AnalyticsDashboard.renderWhenVisible === 'function') {
    window.AnalyticsDashboard.renderWhenVisible();
  }
  if (window.AnalyticsDashboard && typeof window.AnalyticsDashboard.renderCharts === 'function') {
    window.AnalyticsDashboard.renderCharts();
  }
  applyChartFillTargets(analyticsTab);

  const hasVisibleData = window.getComputedStyle(analyticsContent).display !== 'none';
  const sourceRoot = hasVisibleData
    ? analyticsContent.cloneNode(true)
    : document.getElementById('analytics-empty-state')?.cloneNode(true);
  if (!sourceRoot) return;
  sourceRoot.id = hasVisibleData ? 'analytics-content-print' : 'analytics-empty-state-print';
  applyChartFillTargets(sourceRoot);

  sourceRoot.querySelectorAll('button').forEach((btn) => {
    const replacement = document.createElement('div');
    replacement.className = btn.className;
    replacement.innerHTML = btn.innerHTML;
    Array.from(btn.attributes).forEach((attr) => {
      if (attr.name !== 'class') replacement.setAttribute(attr.name, attr.value);
    });
    btn.replaceWith(replacement);
  });

  const originalCanvases = analyticsTab.querySelectorAll('canvas');
  const clonedCanvases = sourceRoot.querySelectorAll('canvas');
  clonedCanvases.forEach((clonedCanvas, index) => {
    const original = originalCanvases[index];
    if (!original) return;

    const img = document.createElement('img');
    img.src = original.toDataURL('image/png');
    img.alt = original.getAttribute('aria-label') || 'Analytics chart';
    img.className = original.className;
    img.style.width = '100%';
    img.style.height = `${original.clientHeight || 150}px`;
    img.style.display = 'block';
    img.style.objectFit = 'contain';
    clonedCanvas.replaceWith(img);
  });

  const generatedAt = new Date().toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });
  const rangeFrom = document.getElementById('analytics-export-from-date')?.value || '';
  const rangeTo = document.getElementById('analytics-export-to-date')?.value || '';
  const liveRangeLabel = (rangeFrom && rangeTo) ? `${rangeFrom} to ${rangeTo}` : '';
  const analyticsRangeLabel = window.__analyticsExportRangeLabel || liveRangeLabel || 'Current dashboard snapshot';

  const styleNodes = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
    .map((node) => {
      if (node.tagName === 'LINK') {
        const href = node.href || node.getAttribute('href') || '';
        return `<link rel="stylesheet" href="${href}">`;
      }
      return node.outerHTML;
    })
    .join('\n');

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Blood Bank Analytics Report</title>
        ${styleNodes}
        <style>
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          * {
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }

          body {
            margin: 0;
            background: #fff;
            color: var(--charcoal, #1A1A1A);
            font-family: 'DM Sans', sans-serif;
          }

          .analytics-print-shell {
            padding: 10px;
          }

          .analytics-print-head {
            border: 1px solid var(--border, #E8DDD5);
            border-left: 4px solid var(--crimson, #C41E3A);
            border-radius: 12px;
            background: #fff;
            padding: 12px 14px;
            margin-bottom: 12px;
          }

          .analytics-print-title {
            margin: 0;
            font-family: 'Playfair Display', serif;
            color: var(--crimson, #C41E3A);
            font-size: 24px;
            font-weight: 700;
            line-height: 1.1;
          }

          .analytics-print-sub {
            margin-top: 4px;
            color: var(--muted, #7A7A7A);
            font-size: 12px;
          }

          .analytics-print-meta {
            margin-top: 4px;
            color: var(--muted, #7A7A7A);
            font-size: 11px;
          }

          #analytics-content-print {
            display: block !important;
          }

          #analytics-content-print .an-layout,
          #analytics-content-print .an-metric-grid {
            gap: 10px !important;
          }

          #analytics-content-print .an-card,
          #analytics-content-print .an-summary-card {
            break-inside: avoid;
            page-break-inside: avoid;
            background: #fff !important;
          }

          #analytics-content-print .analytics-chart-tooltip,
          #analytics-content-print .no-print {
            display: none !important;
          }

          @media print {
            body {
              background: #fff;
            }

            .no-print {
              display: none !important;
            }

            #analytics-content-print .an-card,
            #analytics-content-print .an-summary-card {
              break-inside: avoid;
              page-break-inside: avoid;
            }
          }
        </style>
      </head>
      <body>
        <div class="analytics-print-shell">
          <div class="analytics-print-head">
            <h1 class="analytics-print-title">BloodPlus - Blood Bank Analytics Report</h1>
            <div class="analytics-print-sub">Generated from current analytics dashboard</div>
            <div class="analytics-print-meta">Range: ${analyticsRangeLabel}</div>
            <div class="analytics-print-meta">Generated: ${generatedAt}</div>
          </div>
          <div id="bb-tab-analytics">
            ${sourceRoot.outerHTML}
          </div>
        </div>
      </body>
    </html>`;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 160);
  };
};

/**
 * Blood Bag reporting helpers
 * Shared by print/export to keep one source of truth.
 */
function mapBloodBagStatusLabel(status) {
  const statusMap = {
    AVAILABLE: 'Available',
    EXPIRING: 'Expiring Soon',
    CROSSMATCHED: 'Crossmatched',
    DISPENSED: 'Dispensed',
    EXPIRED: 'Expired',
    DISCARDED: 'Discarded'
  };
  return statusMap[status] || status || '-';
}

function getBloodBagSourceLabelPlain(bag) {
  if (bag.eventName) return bag.eventName;
  const sourceMap = {
    DONATION: 'Blood Drive',
    WALK_IN: 'Walk-in Donor',
    TRANSFER: 'BMC Transfer',
    EXTERNAL_SUPPLY: 'External Supply'
  };
  return sourceMap[bag.source] || bag.source || '-';
}

function parseBloodBagDateValue(value) {
  if (!value) return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;

  const raw = String(value).trim();
  if (!raw) return null;

  // Parse SQL/ISO prefixes as local wall-clock date/time and ignore timezone tails.
  // This preserves the stored calendar date (prevents client-side +1 day shifts).
  const datePrefixMatch = raw.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{2})(?::?(\d{2}))?(?::?(\d{2}))?)?/i);
  if (datePrefixMatch) {
    const [, year, month, day, hour = '00', minute = '00', second = '00'] = datePrefixMatch;
    const fractionMatch = raw.match(/\.(\d{1,9})/);
    const fraction = fractionMatch ? fractionMatch[1] : '0';
    const ms = Number(String(fraction).padEnd(3, '0').slice(0, 3));
    const parsedLocal = new Date(
      Number(year),
      Number(month) - 1,
      Number(day),
      Number(hour),
      Number(minute),
      Number(second),
      Number.isFinite(ms) ? ms : 0
    );
    return Number.isNaN(parsedLocal.getTime()) ? null : parsedLocal;
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function calculateBloodBagDaysLeft(expiresAtValue, reference = new Date()) {
  const expiry = parseBloodBagDateValue(expiresAtValue);
  const base = reference instanceof Date ? reference : new Date(reference);
  if (!expiry || Number.isNaN(base.getTime())) return 0;

  const expiryStart = new Date(expiry.getFullYear(), expiry.getMonth(), expiry.getDate());
  const baseStart = new Date(base.getFullYear(), base.getMonth(), base.getDate());
  const dayDiff = Math.round((expiryStart - baseStart) / 86400000);
  return Number.isFinite(dayDiff) ? dayDiff : 0;
}

function formatBloodBagShortDate(value) {
  const parsed = parseBloodBagDateValue(value);
  if (!parsed) return '-';
  return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatBloodBagReportDate(value) {
  const parsed = parseBloodBagDateValue(value);
  if (!parsed) return '-';
  return parsed.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: '2-digit' });
}

function sortBloodBagListBySelection(list, sortValue) {
  list.sort((a, b) => {
    const aExpiry = parseBloodBagDateValue(a.expiresAt)?.getTime() || 0;
    const bExpiry = parseBloodBagDateValue(b.expiresAt)?.getTime() || 0;
    const aCollected = parseBloodBagDateValue(a.collectedAt)?.getTime() || 0;
    const bCollected = parseBloodBagDateValue(b.collectedAt)?.getTime() || 0;
    const aRegistered = parseBloodBagDateValue(a.createdAt)?.getTime() || 0;
    const bRegistered = parseBloodBagDateValue(b.createdAt)?.getTime() || 0;

    if (sortValue === 'collected_desc') return bCollected - aCollected;
    if (sortValue === 'collected_asc') return aCollected - bCollected;
    if (sortValue === 'expiry_asc') return aExpiry - bExpiry;
    if (sortValue === 'expiry_desc') return bExpiry - aExpiry;
    if (sortValue === 'registered_desc') return bRegistered - aRegistered;
    if (sortValue === 'registered_asc') return aRegistered - bRegistered;
    return 0;
  });
}

function escapeBloodBagReportHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

window.getBloodBagsForPrint = function(mode = 'current') {
  const effectiveMode = mode === 'range' ? 'range' : 'current';
  const selectedSort = document.getElementById('bags-sort')?.value || 'registered_desc';

  if (effectiveMode === 'range') {
    const fromDate = document.getElementById('bags-print-from-date')?.value || '';
    const toDate = document.getElementById('bags-print-to-date')?.value || '';

    if (!fromDate || !toDate) {
      showBloodPlusMessage('Date Range Required', 'Please select both From Date and To Date.', 'warning');
      return { rows: [], mode: effectiveMode, invalid: true };
    }

    if (fromDate > toDate) {
      showBloodPlusMessage('Invalid Date Range', 'From Date must be on or before To Date.', 'warning');
      return { rows: [], mode: effectiveMode, invalid: true };
    }

    const fromTime = new Date(`${fromDate}T00:00:00`).getTime();
    const toTime = new Date(`${toDate}T23:59:59`).getTime();

    const rows = BLOOD_BAGS
      .map(bag => ({ ...bag, computedStatus: bag.computedStatus || computeBagStatus(bag) }))
      .filter(bag => {
        const collected = parseBloodBagDateValue(bag.collectedAt);
        if (!collected) return false;
        const collectedTime = collected.getTime();
        return collectedTime >= fromTime && collectedTime <= toTime;
      });

    sortBloodBagListBySelection(rows, selectedSort);

    return {
      rows,
      mode: effectiveMode,
      invalid: false,
      scopeLabel: `Collected from ${fromDate} to ${toDate}`,
      fromDate,
      toDate
    };
  }

  const rows = (Array.isArray(bagsCurrent) ? bagsCurrent : []).map(bag => ({
    ...bag,
    computedStatus: bag.computedStatus || computeBagStatus(bag)
  }));

  sortBloodBagListBySelection(rows, selectedSort);

  return {
    rows,
    mode: effectiveMode,
    invalid: false,
    scopeLabel: 'Current filtered and sorted results'
  };
};

window.printBloodBags = function(mode = 'current') {
  const result = window.getBloodBagsForPrint(mode);
  if (!result || result.invalid) return;

  const rows = result.rows || [];
  if (!rows.length) {
    showBloodPlusMessage('No Data to Print', 'No blood bags match the selected criteria.', 'info');
    return;
  }

  const generatedAt = new Date().toLocaleString('en-PH', {
    year: 'numeric',
    month: 'long',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

  const bodyRows = rows.map((bag, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${escapeBloodBagReportHtml(bag.serialNumber || '-')}</td>
        <td>${escapeBloodBagReportHtml(fullBloodLabel(bag.bloodType, bag.rhType))}</td>
        <td>${escapeBloodBagReportHtml(componentLabel(bag.componentType))}</td>
        <td>${escapeBloodBagReportHtml(bag.volumeMl ? `${bag.volumeMl} mL` : '-')}</td>
        <td>${escapeBloodBagReportHtml(formatBloodBagReportDate(bag.collectedAt))}</td>
        <td>${escapeBloodBagReportHtml(formatBloodBagReportDate(bag.expiresAt))}</td>
        <td>${escapeBloodBagReportHtml(mapBloodBagStatusLabel(bag.computedStatus || computeBagStatus(bag)))}</td>
        <td>${escapeBloodBagReportHtml(getBloodBagSourceLabelPlain(bag))}</td>
        <td>${escapeBloodBagReportHtml(bag.transactionNumber || '-')}</td>
        <td>${escapeBloodBagReportHtml(bag.remarks || '-')}</td>
      </tr>
    `).join('');

  const html = `
    <!doctype html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Blood Bags Report</title>
        <style>
          :root {
            --crimson: #C41E3A;
            --charcoal: #1A1A1A;
            --muted: #6F6F6F;
            --border: #E8DDD5;
            --bg: #FDF8F3;
          }
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 24px;
            font-family: 'Segoe UI', Arial, sans-serif;
            color: var(--charcoal);
            background: white;
          }
          .report-shell {
            border: 1px solid var(--border);
            border-radius: 14px;
            overflow: hidden;
          }
          .report-head {
            padding: 18px 20px;
            background: linear-gradient(90deg, rgba(196,30,58,0.12) 0%, rgba(253,248,243,1) 100%);
            border-bottom: 2px solid var(--crimson);
          }
          .report-title {
            margin: 0;
            font-size: 20px;
            color: var(--crimson);
          }
          .report-sub {
            margin-top: 6px;
            font-size: 12px;
            color: var(--muted);
          }
          table {
            width: 100%;
            border-collapse: collapse;
          }
          th, td {
            border: 1px solid var(--border);
            padding: 8px 10px;
            font-size: 12px;
            vertical-align: top;
          }
          th {
            background: var(--bg);
            text-align: left;
            color: var(--charcoal);
            font-weight: 700;
          }
          td:first-child, th:first-child {
            text-align: center;
            width: 40px;
          }
          .report-foot {
            font-size: 11px;
            color: var(--muted);
            padding: 12px 20px 16px;
          }
          @media print {
            body {
              padding: 0;
            }
            .report-shell {
              border: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="report-shell">
          <div class="report-head">
            <h1 class="report-title">Blood Bags Report</h1>
            <div class="report-sub">Scope: ${escapeBloodBagReportHtml(result.scopeLabel || '-')}</div>
            <div class="report-sub">Generated: ${escapeBloodBagReportHtml(generatedAt)}</div>
          </div>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Serial Number</th>
                <th>Blood Type</th>
                <th>Component</th>
                <th>Volume</th>
                <th>Collected Date</th>
                <th>Expiry Date</th>
                <th>Status</th>
                <th>Source</th>
                <th>Transaction Number</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>${bodyRows}</tbody>
          </table>
          <div class="report-foot">BloodPlus Blood Bank Module</div>
        </div>
      </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    showBloodPlusMessage('Pop-up Blocked', 'Please allow pop-ups to print the blood bag report.', 'warning');
    return;
  }

  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 250);
};

window.exportBloodBagsToExcel = function(mode = 'auto') {
  const hasRangeInputs = Boolean(
    document.getElementById('bags-print-from-date')?.value &&
    document.getElementById('bags-print-to-date')?.value
  );
  const effectiveMode =
    mode === 'current' || mode === 'range'
      ? mode
      : (hasRangeInputs ? 'range' : 'current');

  const result = window.getBloodBagsForPrint(effectiveMode);
  if (!result || result.invalid) return;

  const rows = result.rows || [];
  if (!rows.length) {
    showBloodPlusMessage('No Data to Export', 'No blood bags match the selected criteria.', 'info');
    return;
  }

  const csvRows = [[
    'Serial Number',
    'Blood Type',
    'Component',
    'Volume',
    'Collected Date',
    'Expiry Date',
    'Status',
    'Source',
    'Transaction Number',
    'Remarks'
  ]];

  rows.forEach(bag => {
    csvRows.push([
      bag.serialNumber || '',
      fullBloodLabel(bag.bloodType, bag.rhType),
      componentLabel(bag.componentType),
      bag.volumeMl ? `${bag.volumeMl} mL` : '',
      formatBloodBagReportDate(bag.collectedAt),
      formatBloodBagReportDate(bag.expiresAt),
      mapBloodBagStatusLabel(bag.computedStatus || computeBagStatus(bag)),
      getBloodBagSourceLabelPlain(bag),
      bag.transactionNumber || '',
      bag.remarks || ''
    ]);
  });

  const csvContent = csvRows.map(row =>
    row.map(cell => {
      const escaped = String(cell ?? '').replaceAll('"', '""');
      return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
    }).join(',')
  ).join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  const today = new Date().toISOString().slice(0, 10);
  const scopeName = result.mode === 'range' ? `${result.fromDate}_to_${result.toDate}` : 'current-results';
  link.setAttribute('href', url);
  link.setAttribute('download', `blood-bags-${scopeName}-${today}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// -------------------------------------------------------------------------------
// BLOOD REQUESTS – WITH PRINTING (PDF/EXCEL) FUNCTIONALITY
// -------------------------------------------------------------------------------

(function () {
  /* ----------------------------------------------------------------------------
     BLOOD TYPE MAPPING – Maps enum values to display format
     Preserves original enum for backend while displaying user-friendly text
  -------------------------------------------------------------------------------- */
  const BLOOD_TYPE_MAP = {
    'A_POS': 'A Pos',
    'A_NEG': 'A Neg',
    'B_POS': 'B Pos',
    'B_NEG': 'B Neg',
    'AB_POS': 'AB Pos',
    'AB_NEG': 'AB Neg',
    'O_POS': 'O Pos',
    'O_NEG': 'O Neg',
  };

  function formatBloodType(bloodTypeEnum) {
    if (!bloodTypeEnum) return '–';
    return BLOOD_TYPE_MAP[bloodTypeEnum] || bloodTypeEnum;
  }

  /* ----------------------------------------------------------------------------
     INDICATION MAPPING – Maps indication codes to descriptions
  -------------------------------------------------------------------------------- */
  const INDICATION_MAP = {
    'WB-1': 'Active bleeding with at least 15% blood volume loss, Hb<90 g/L, or BP drop >20%',
    'WB-1a': 'Loss of over 15% of blood volume',
    'WB-1b': 'Hemoglobin less than 90 g/L',
    'WB-1c': 'Blood pressure decrease >20% and <90 mmHg systolic',
    'WB-2': 'Other whole blood indications (requires review)',
    'R-1': 'Hemoglobin < 80 g/L or Hematocrit < 0.24',
    'R-2': 'Preoperative with Hb < 80 g/L or Hct < 0.24-0.30, or major surgery with high bleeding risk',
    'R-2a': 'Preoperative hemoglobin of less than 80 g/L or Hematocrit less than 0.24 (24%) or Hematocrit less than 0.30 (30%)',
    'R-2b': 'Major operation with high probability of bleeding with a Hemoglobin of less than 100 g/L or Hematocrit less than 0.30 (30%)',
    'R-2c': 'Sign of hemodynamic instability or inadequate oxygen carrying capacity (symptomatic anemia)',
    'R-3': 'Symptomatic anemia (dyspnea, syncope, tachycardia, chest pain, etc.)',
    'R-4': 'Hb < 80 g/L with concomitant COPD, CAD, hemoglobinopathy, or sepsis',
    'R-5': 'Other PRBC indications (requires review)',
    'W-1': 'History of allergic/anaphylactic reactions in immunocompromised patients',
    'W-2': 'Group O blood transfusion in emergency when specific blood unavailable',
    'W-3': 'Paroxysmal Nocturnal Hemoglobinuria (PNH)',
    'W-4': 'Other WRBC indications (requires review)',
    'P-1': 'Prophylactic for count < 20,000 (not TTP/ITP/HUS)',
    'P-2': 'Active bleeding with platelet count < 50,000',
    'P-3': 'Platelet count < 50,000 and invasive procedure within 8 hours',
    'P-4': 'Platelet count < 100,000 and surgery in critical areas (eyes, brain, etc.)',
    'P-5': 'Massive transfusion with diffuse microvascular bleeding',
    'P-6': 'Other platelet indications (requires review)',
    'C-1': 'Significant Hypofibrinogenemia (< 100 mg/dL)',
    'C-2': 'Hemophilia A',
    'C-3': 'Von Willebrand\'s Disease or Uremic Bleeding with prolonged BT',
    'C-4': 'Other cryoprecipitate indications (requires review)',
    'F-1': 'PT or PTT > 1.5x normal within 8 hours (PT>17 sec or PTT>47 sec)',
    'F-2': 'Specific factor deficiencies not treatable with cryoprecipitate',
    'F-3': 'Coumadin reversal in bleeding patients (Vitamin K ineffective)',
    'F-4': 'Treatment of Thrombotic Thrombocytopenic Purpura (TTP)',
    'F-5': 'Clinical Coagulopathy associated with:',
    'F-5a': 'Massive Transfusion (>20 units of blood in 24 hours)',
    'F-5b': 'Late pregnancy termination or Abruptio Placentae',
    'F-6': 'Other FFP indications (requires review)',
    'PW-1': 'Exchange transfusion in infant with indirect bilirubin =20 mg/dL in first week',
    'PW-2': 'Hyperbilirubinemia with prematurity/illness (asphyxia, acidosis, sepsis, hemolysis)',
    'PW-3': 'Other whole blood indications (requires review)',
    'PR-1': 'Signs/symptoms of anemia (pallor, etc.)',
    'PR-2': 'Hypovolemia from acute blood loss with shock signs or >10% loss',
    'PR-3': 'Major surgery candidate with Hematocrit < 0.30 or <0.35 (nocturnal)',
    'PR-4': 'Hypertransfusion for chronic hemolytic anemia (Thalassemia)',
    'PR-5': 'Hemoglobin =130 g/L and on assisted ventilation',
    'PR-6': 'Anemia with Hb < 80 g/L or Hct < 0.25',
    'PR-7': 'Blood volume reduction 10 mL/kg with Hct < 0.45 in newborn <4 months',
    'PR-8': 'Pulmonary disease or CHD with Hct 0.40-0.45',
    'PR-9': 'Other PRBC indications (requires review)',
    'PWR': 'Other WRBC indications (requires review)',
    'PP-1': 'Active bleeding with thrombocytopenia < 50,000 or ICH risk',
    'PP-2': 'Active bleeding with qualitative defect',
    'PP-3': 'Prophylaxis for severe thrombocytopenia < 20,000 or qualitative defect',
    'PP-4': 'Invasive procedure with thrombocytopenia < 70,000 or qualitative defect',
    'PP-5': 'Other platelet indications (requires review)',
    'PF-1': 'Multiple coagulation factor deficiency (e.g., dengue shock syndrome)',
    'PF-2': 'Congenital factor deficiency',
    'PF-3': 'Anti-Thrombin III Deficiency',
    'PF-4': 'Bleeding in exchange transfusion or massive transfusion (>1 blood volume)',
    'PF-5': 'Other FFP indications (requires review)',
    'PC-1': 'Factor VIII Deficiency (Hemophilia A)',
    'PC-2': 'Von Willebrand\'s Disease',
    'PC-3': 'Disseminated Intravascular Coagulation (DIC)',
    'PC-4': 'Uremia with active bleeding or invasive procedure planned',
    'PC-5': 'Other cryoprecipitate indications (requires review)',
  };

  function escapeIndicationText(text) {
    const div = document.createElement('div');
    div.textContent = text ?? '';
    return div.innerHTML;
  }

  function parseIndicationOtherSpecify(indicationOtherSpecify) {
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

  function isSpecifyOnlyIndicationCode(code) {
    return typeof code === 'string' && code.endsWith('_SPECIFY');
  }

  function formatIndications(indicationString, indicationOtherSpecify) {
    if (!indicationString) return 'Not specified';
    const codes = indicationString.split(',').map(s => s.trim()).filter(Boolean);
    const noteMap = parseIndicationOtherSpecify(indicationOtherSpecify);
    const descriptions = codes.map(code => {
      const note = noteMap[code];
      if (isSpecifyOnlyIndicationCode(code) && note) {
        return note;
      }
      return INDICATION_MAP[code] || (note ? `${code}:${note}` : code);
    }).filter(Boolean);
    return descriptions.length > 0 ? descriptions : ['Not specified'];
  }

  function getIndicationBadges(indicationString, indicationOtherSpecify) {
    if (!indicationString) return '';
    const noteMap = parseIndicationOtherSpecify(indicationOtherSpecify);
    const codes = indicationString
      .split(',')
      .map(s => s.trim())
      .filter(Boolean)
      .filter(code => !(isSpecifyOnlyIndicationCode(code) && noteMap[code]));

    return codes.map(code => {
      return `<span class="req-indication-badge">${code}</span>`;
    }).join('');
  }

  function renderIndicationDetails(indicationString, indicationOtherSpecify) {
    if (!indicationString) {
      return '<span class="req-details-value">Not specified</span>';
    }

    const codes = indicationString.split(',').map(s => s.trim()).filter(Boolean);
    const noteMap = parseIndicationOtherSpecify(indicationOtherSpecify);
    
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

      if (isSpecifyOnlyIndicationCode(mainCode) && mainNote) {
        html += `
          <div style="padding:12px;background:var(--subtle,#f9f9f9);border-left:3px solid var(--blue,#0066cc);border-radius:4px">
            <div style="font-size:13px;color:var(--charcoal,#2a2a2a);line-height:1.5">
              ${escapeIndicationText(mainNote)}
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
                ${escapeIndicationText(mainNote)}
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
                  ${escapeIndicationText(subNote)}
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
                ${escapeIndicationText(mainNote)}
              </div>
            ` : ''}
          </div>
        `;
      }
    });
    
    html += '</div>';
    return html;
  }

  /* ----------------------------------------------------------------------------
     PATIENT NAME FORMATTING – Format name parts as: Last, First Middle Suffix
  -------------------------------------------------------------------------------- */
  function formatPatientName(req) {
    const first = req.patientName || '';
    const middle = req.patientMiddle || '';
    const last = req.patientLast || '';
    const suffix = req.patientSuffix || '';

    if (!first && !last) return '–';

    let formatted = '';
    // Last, First Middle Suffix format
    if (last) {
      formatted = last;
      if (first) formatted += ', ' + first;
      if (middle) formatted += ' ' + middle;
      if (suffix) formatted += ' ' + suffix;
    } else {
      // Fallback if only first name exists
      formatted = first;
      if (middle) formatted += ' ' + middle;
      if (suffix) formatted += ' ' + suffix;
    }

    return formatted.trim();
  }

  
  /* ----------------------------------------------------------------------------
     BIRTHDATE FORMATTING
  -------------------------------------------------------------------------------- */
  function formatBirthdate(birthdateStr) {
    if (!birthdateStr) return '–';
    try {
      const date = new Date(birthdateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return birthdateStr;
    }
  }

  /* ----------------------------------------------------------------------------
     CONSTANTS
  -------------------------------------------------------------------------------- */
  const REQ_STATUSES = ['PENDING', 'APPROVED', 'NEEDS_CONFIRMATION', 'ALLOCATED', 'READY_FOR_RELEASE', 'RELEASED'];
  const REQ_STATUS_LABEL = {
    PENDING: 'Pending',
    APPROVED: 'Approved',
    NEEDS_CONFIRMATION: 'Waiting for confirmation',
    ALLOCATED: 'Allocated',
    READY_FOR_RELEASE: 'Ready for release',
    RELEASED: 'Released',
    REJECTED: 'Rejected',
    CANCELLED: 'Cancelled',
  };
  const REQ_STATUS_TAG = {
    PENDING: 'tag-pending',
    APPROVED: 'tag-approved',
    NEEDS_CONFIRMATION: 'tag-needs-confirmation',
    ALLOCATED: 'tag-allocated',
    READY_FOR_RELEASE: 'tag-ready',
    RELEASED: 'tag-released',
    REJECTED: 'tag-rejected',
    CANCELLED: 'tag-inactive',
  };
  const REQ_URGENCY_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  const REQ_URGENCY_COLOR = {
    CRITICAL: 'var(--crimson)', HIGH: 'var(--amber)',
    MEDIUM: 'var(--blue)', LOW: 'var(--green)',
  };
  const REQ_URGENCY_TAG = {
    CRITICAL: 'tag-critical', HIGH: 'tag-urgent',
    MEDIUM: 'tag-low', LOW: 'tag-good',
  };
 
  const REQ_NEXT = {
    PENDING:           { label: 'Approve',         cls: 'req-btn-approve',  next: 'APPROVED',          endpoint: 'approve',  needsBag: false },
    APPROVED:          { label: 'Mark Allocated',  cls: 'req-btn-allocate', next: 'ALLOCATED',         endpoint: 'allocate', needsBag: true  },
    ALLOCATED:         { label: 'Mark Ready',      cls: 'req-btn-ready',    next: 'READY_FOR_RELEASE', endpoint: 'ready',    needsBag: false },
    READY_FOR_RELEASE: { label: 'Confirm Release', cls: 'req-btn-release',  next: 'RELEASED',          endpoint: 'release',  needsBag: false },
  };
 
  const CONFIRM_COPY = {
    approve:  {
      title:      'Approve this request?',
      body:       'This will move the request to <strong>Approved</strong> only when enough compatible bags are available for full fulfillment.',
      confirmCls: 'req-btn-approve',
    },
    ready: {
      title:      'Mark as Ready for Release?',
      body:       'Confirm the bag is prepared and ready for pickup/delivery. Status will move to <strong>Ready for Release</strong>.',
      confirmCls: 'req-btn-ready',
    },
    release: {
      title:      'Confirm Blood Release?',
      body:       'This is the final step. The blood bag will be marked as <strong>Released</strong> and inventory will be updated. This cannot be undone.',
      confirmCls: 'req-btn-release',
    },
  };
 
  const COMPONENT_LABEL = {
    WHOLE_BLOOD: 'Whole Blood', PRBC: 'Packed RBC', PLATELET: 'Platelet',
    FFP: 'FFP', LEUKOREDUCED: 'Leukoreduced', ALIQUOT: 'Aliquot',
    PLATELET_CONCENTRATE: 'Platelet', FRESH_FROZEN_PLASMA: 'FFP',
    CRYOPRECIPITATE: 'Cryoprecipitate', CRYOSUPERNATANT: 'Cryosupernatant',
    LEUKOREDUCED_PRBC: 'Leukoreduced PRBC', ALIQUOTED_PRBC: 'Aliquoted PRBC',
  };
 
  const API_BASE = '/api';
  const REQ_PAGE_SIZE = 25;

  /* ----------------------------------------------------------------------------
     STATE
  -------------------------------------------------------------------------------- */
  let reqData          = [];
  let reqExpanded      = {};
  let reqCurrentFilter = 'PENDING';
  let reqPendingRejectId = null;
  let reqPendingResolutionMode = 'reject';
  let reqPendingRemarksId = null;
  let reqCurrentPage = 1;
  let reqTotalPages = 1;
  let reqTotalElements = 0;
  let reqStatusCounts = null;
  let reqSearchDebounceTimer = null;
  const REQ_STATUS_PRIORITY = {
    PENDING: 0,
    NEEDS_CONFIRMATION: 1,
    APPROVED: 2,
    ALLOCATED: 3,
    READY_FOR_RELEASE: 4,
    RELEASED: 5,
    REJECTED: 6,
    CANCELLED: 7,
  };
 
  let confirmPending = null;
 
  let bagPickerReqId    = null;
  let bagPickerSelected = null;
  let bagPickerData     = [];
  let bagPickerIsChange = false;
  let bagPickerSearchQuery = '';
  let reqDocZoom        = 1;
  let reqDocIsPdf       = false;

  const REQ_DOC_ZOOM_MIN = 0.5;
  const REQ_DOC_ZOOM_MAX = 5;
  const REQ_DOC_ZOOM_STEP = 0.2;

  const reqBagCache = {};
  const REQ_NEW_BADGE_STATUSES = new Set(['PENDING']);
  const reqSeenIds = new Set();
  const reqUnseenIds = new Set();
  let reqBadgePrimed = false;

  function reqGetIdentity(req) {
    if (!req) return null;
    if (req.referenceNumber) return `ref:${String(req.referenceNumber).trim()}`;
    if (req.id !== null && req.id !== undefined) return `id:${String(req.id).trim()}`;
    return null;
  }

  function reqShouldCountAsNew(req) {
    return REQ_NEW_BADGE_STATUSES.has(req?.status);
  }

  function isBloodRequestsPanelActive() {
    const panel = document.getElementById('panel-bloodrequests');
    return !!(panel && panel.classList.contains('active'));
  }

  function updateBloodRequestBadge(animate = false) {
    const badge = document.getElementById('blood-request-nav-badge');
    if (!badge) return;

    const count = reqUnseenIds.size;
    const previousCount = Number(badge.dataset.count || '0');

    if (count <= 0) {
      badge.textContent = '0';
      badge.dataset.count = '0';
      badge.hidden = true;
      badge.classList.remove('is-pulse');
      return;
    }

    badge.hidden = false;
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.dataset.count = String(count);

    if (animate && count > previousCount) {
      badge.classList.remove('is-pulse');
      void badge.offsetWidth;
      badge.classList.add('is-pulse');
    }
  }

  function markBloodRequestsAsViewed() {
    reqUnseenIds.clear();
    reqData.forEach(req => {
      if (!reqShouldCountAsNew(req)) return;
      const key = reqGetIdentity(req);
      if (key) reqSeenIds.add(key);
    });
    updateBloodRequestBadge(false);
  }

  function markBloodRequestAsViewedById(reqId) {
    const target = reqData.find(r => Number(r?.id) === Number(reqId));
    if (!target) return;
    const key = reqGetIdentity(target);
    if (!key) return;
    if (!reqUnseenIds.has(key)) return;
    reqUnseenIds.delete(key);
    updateBloodRequestBadge(false);
  }

  function detectNewBloodRequests(nextReqData) {
    const rows = Array.isArray(nextReqData) ? nextReqData : [];
    const currentRelevant = new Set();

    rows.forEach(req => {
      if (!reqShouldCountAsNew(req)) return;
      const key = reqGetIdentity(req);
      if (!key) return;

      currentRelevant.add(key);
      if (!reqSeenIds.has(key)) {
        reqSeenIds.add(key);
        if (reqBadgePrimed) {
          reqUnseenIds.add(key);
        }
      }
    });

    if (!reqBadgePrimed) {
      reqBadgePrimed = true;
      reqUnseenIds.clear();
      updateBloodRequestBadge(false);
      return;
    }

    updateBloodRequestBadge(true);
  }
 
  /* ----------------------------------------------------------------------------
     DATA MAPPING
  -------------------------------------------------------------------------------- */
  function mapRequest(r, options = {}) {
    const isDetailPayload = Boolean(options.detail);
    const docUrl = r.doctorsNoteUrl ?? '';
    const docLabel = docUrl
      ? 'DoctorsNote_' + (r.referenceNumber ?? r.id) + '_' +
        (r.requestedAt
          ? new Date(r.requestedAt).toISOString().slice(0, 10).replace(/-/g, '')
          : 'doc') +
        (docUrl.toLowerCase().includes('.pdf') ? '.pdf' : '.jpg')
      : 'No document uploaded';
 
    const name = r.hospitalProfile?.hospitalName
              ?? r.donorProfile?.fullName
              ?? r.requesterName
              ?? '–';
 
    const allocatedBags = r.reservedBags ?? r.allocatedBags ?? (r.fulfilledByBag ? [r.fulfilledByBag] : []);
 
    const bloodTypeEnum = r.bloodType ?? '–';
    const displayBloodType = formatBloodType(bloodTypeEnum);
    const requestedUnits = r.numberOfUnits ?? r.volumeMl ?? 1;
    const approvedUnits = r.approvedUnits ?? null;
    const workflowUnits =
      Number.isInteger(approvedUnits) && approvedUnits > 0 &&
      (r.status === 'NEEDS_CONFIRMATION' || r.patientAcceptedRemarks === true)
        ? approvedUnits
        : requestedUnits;

    return {
      id:             r.id,
      name,
      type:           r.requesterType    ?? 'ANONYMOUS',
      requesterType:  r.requesterType    ?? null,
      hospitalProfile: r.hospitalProfile ?? null,
      hospitalName:   r.hospitalName ?? r.hospitalProfile?.hospitalName ?? null,
      hospitalContactName: r.hospitalContactName ?? r.hospitalProfile?.contactPersonName ?? null,
      hospitalContactEmail: r.hospitalContactEmail ?? r.requesterEmail ?? r.hospitalProfile?.user?.email ?? null,
      hospitalPhoneNumber: r.hospitalPhoneNumber ?? r.hospitalProfile?.phoneNumber ?? r.hospitalProfile?.contactPersonPhone ?? null,
      patient:        formatPatientName(r) ?? '–',
      patientName:    r.patientName      ?? '–',
      patientMiddle:  r.patientMiddle    ?? null,
      patientLast:    r.patientLast      ?? null,
      patientSuffix:  r.patientSuffix    ?? null,
      patientAge:     r.patientAge       ?? null,
      patientSex:     r.patientSex       ?? null,
      patientBirthdate: r.patientBirthdate ?? null,
      wardRoom:       r.wardRoom         ?? null,
      roomNo:         r.roomNo           ?? null,
      patientPurok:   r.patientPurok     ?? null,
      patientBarangay: r.patientBarangay ?? null,
      patientMunicipality: r.patientMunicipality ?? null,
      patientProvince: r.patientProvince ?? null,
      referenceNumber:       r.referenceNumber         ?? null,
      requestingPhysician: r.requestingPhysician ?? null,
      ageGroup:       r.ageGroup         ?? null,
      requestCategory: r.requestCategory ?? null,
      bloodTypeEnum:  bloodTypeEnum,
      bloodType:      displayBloodType,
      component:      COMPONENT_LABEL[r.bloodComponent] ?? r.bloodComponent ?? '–',
      bloodComponent: r.bloodComponent   ?? null,
      units:          workflowUnits,
      requestedUnits,
      approvedUnits,
      plateletCount:  r.plateletCount    ?? null,
      volumeMl:       r.volumeMl         ?? null,
      urgency:        r.urgencyLevel     ?? 'LOW',
      urgencyLevel:   r.urgencyLevel     ?? 'LOW',
      requiredBy:     r.requiredBy       ?? null,
      reviewedAt:     r.reviewedAt       ?? null,
      requestedAt:    r.requestedAt      ?? null,
      date:           r.requestedAt
        ? new Date(r.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '–',
      status:         r.status           ?? 'PENDING',
      requesterName:  r.requesterName    ?? null,
      requesterRelationship: r.requesterRelationship ?? null,
      requesterContact: r.requesterContact ?? null,
      requesterEmail: r.requesterEmail   ?? null,
      requesterStaffId: r.requesterStaffId ?? null,
      requesterStaffName: r.requesterStaffName ?? null,
      requesterStaffEmail: r.requesterStaffEmail ?? null,
      requesterStaffPhone: r.requesterStaffPhone ?? null,
      confirmationEmailSentAt: r.confirmationEmailSentAt ?? null,
      approvalRemarks: r.approvalRemarks ?? null,
      patientAcceptedRemarks: r.patientAcceptedRemarks ?? null,
      patientRespondedAt: r.patientRespondedAt ?? null,
      notes:          r.notes            ?? null,
      indication:     r.indication       ?? null,
      indicationOtherSpecify:     r.indicationOtherSpecify       ?? null,
      clinicalImpression: r.clinicalImpression ?? null,
      attendingPhysician: r.attendingPhysician ?? null,
      contactNumber:  r.contactNumber    ?? null,
      hemoglobin:     r.hemoglobin       ?? null,
      hematocrit:     r.hematocrit       ?? null,
      requestType:    r.requestType      ?? null,
      hadPreviousTransfusion: r.hadPreviousTransfusion ?? false,
      previousTransfusionDate: r.previousTransfusionDate ?? null,
      previousTransfusionUnits: r.previousTransfusionUnits ?? null,
      hadPreviousReaction: r.hadPreviousReaction ?? false,
      previousReactionDate: r.previousReactionDate ?? null,
      previousReactionDetails: r.previousReactionDetails ?? null,
      transactionNumber: r.transactionNumber ?? null,
      docUrl,
      docLabel,
      rejectionReason: r.rejectionReason ?? null,
      allocatedBags,
      isDetailLoaded: isDetailPayload,
    };
  }

  function reqHasAcceptedPartialApproval(req) {
    return Number.isInteger(req?.approvedUnits) && req.approvedUnits > 0 && req?.patientAcceptedRemarks === true;
  }

  function reqGetRequiredUnits(req) {
    if (reqHasAcceptedPartialApproval(req)) {
      return req.approvedUnits;
    }
    return req?.requestedUnits ?? req?.units ?? 0;
  }

  function reqGetAvailabilitySnapshot(req) {
    const cache = reqBagCache[req.id];
    const compatible = Array.isArray(cache?.bags)
      ? cache.bags.filter(b => b.compatible !== false)
      : [];
    const required = reqGetRequiredUnits(req);
    return {
      known: Array.isArray(cache?.bags),
      compatible,
      available: compatible.length,
      required,
      enough: compatible.length >= required,
    };
  }
 
  function reqShowLoading() {
    const el = document.getElementById('req-list');
    if (el) el.innerHTML = `<div class="req-empty"><div style="font-size:32px;margin-bottom:10px;opacity:0.45">...</div>Loading requests…</div>`;
  }
  function reqShowError(msg) {
    const el = document.getElementById('req-list');
    if (el) el.innerHTML = `<div class="req-empty"><div style="font-size:32px;margin-bottom:10px;opacity:0.45">Error</div>${msg}</div>`;
  }

  function reqGetSearchQuery() {
    return (document.getElementById('req-search')?.value || '').trim();
  }

  function reqGetBloodTypeFilter() {
    return document.getElementById('req-filter-blood-type')?.value || 'ALL';
  }

  function reqGetComponentFilter() {
    return document.getElementById('req-filter-component')?.value || 'ALL';
  }

  function reqBuildListQuery(page) {
    const params = new URLSearchParams({
      page: String(Math.max(page, 1)),
      size: String(REQ_PAGE_SIZE),
    });

    if (reqCurrentFilter !== 'ALL') {
      params.append('status', reqCurrentFilter);
    }

    const searchQuery = reqGetSearchQuery();
    if (searchQuery) {
      params.append('search', searchQuery);
    }
    const bloodType = reqGetBloodTypeFilter();
    if (bloodType !== 'ALL') {
      params.append('bloodType', bloodType);
    }
    const component = reqGetComponentFilter();
    if (component !== 'ALL') {
      params.append('component', component);
    }

    return params;
  }

  function reqBuildStatusCountsQuery() {
    const params = new URLSearchParams();
    const searchQuery = reqGetSearchQuery();
    if (searchQuery) {
      params.append('search', searchQuery);
    }
    const bloodType = reqGetBloodTypeFilter();
    if (bloodType !== 'ALL') {
      params.append('bloodType', bloodType);
    }
    const component = reqGetComponentFilter();
    if (component !== 'ALL') {
      params.append('component', component);
    }
    return params;
  }

  function reqGetLocalStatusCounts() {
    return {
      ALL: reqTotalElements > 0 ? reqTotalElements : reqData.length,
      PENDING: reqData.filter(r => r.status === 'PENDING').length,
      NEEDS_CONFIRMATION: reqData.filter(r => r.status === 'NEEDS_CONFIRMATION').length,
      APPROVED: reqData.filter(r => r.status === 'APPROVED').length,
      ALLOCATED: reqData.filter(r => r.status === 'ALLOCATED').length,
      READY_FOR_RELEASE: reqData.filter(r => r.status === 'READY_FOR_RELEASE').length,
      RELEASED: reqData.filter(r => r.status === 'RELEASED').length,
      REJECTED: reqData.filter(r => r.status === 'REJECTED').length,
      CANCELLED: reqData.filter(r => r.status === 'CANCELLED').length,
    };
  }

  async function reqFetchPage(page = 1) {
    reqShowLoading();
    try {
      const params = reqBuildListQuery(page);
      const countParams = reqBuildStatusCountsQuery();
      const [res, countRes] = await Promise.all([
        fetch(`${API_BASE}/admin/blood-requests?${params.toString()}`, {
          headers: { Accept: 'application/json' }
        }),
        fetch(`${API_BASE}/admin/blood-requests/status-counts?${countParams.toString()}`, {
          headers: { Accept: 'application/json' }
        }).catch(() => null)
      ]);
      if (!res.ok) throw new Error(`Server error: ${res.status} ${res.statusText}`);
      const json = await res.json();

      const rows = Array.isArray(json) ? json : (json.data ?? json.content ?? []);
      const mapped = rows.map(r => mapRequest(r, { detail: false }));
      const nextExpanded = {};
      mapped.forEach(r => {
        if (reqExpanded[r.id]) nextExpanded[r.id] = true;
      });

      reqData = mapped;
      reqExpanded = nextExpanded;

      if (Array.isArray(json)) {
        reqCurrentPage = 1;
        reqTotalPages = 1;
        reqTotalElements = mapped.length;
      } else {
        reqCurrentPage = Math.max(Number(json.page) || page, 1);
        reqTotalPages = Math.max(Number(json.totalPages) || 1, 1);
        reqTotalElements = Math.max(Number(json.totalElements) || mapped.length, 0);
      }

      if (countRes?.ok) {
        const countJson = await countRes.json();
        reqStatusCounts = countJson && typeof countJson === 'object' ? countJson : null;
      } else {
        reqStatusCounts = null;
      }

      if (reqCurrentPage > reqTotalPages) {
        reqCurrentPage = reqTotalPages;
        await reqFetchPage(reqCurrentPage);
        return;
      }

      detectNewBloodRequests(reqData);
      reqRender();
      reqUpdateCounts();
    } catch (err) {
      console.error('[BloodRequests] fetch failed', err);
      reqShowError(`Failed to load requests - ${err.message}`);
      reqTotalElements = 0;
      reqTotalPages = 1;
      reqCurrentPage = 1;
      reqUpdatePaginationUi(0);
    }
  }

  async function reqFetchAll() {
    await reqFetchPage(reqCurrentPage);
  }

  async function reqFetchByStatus(status) {
    reqCurrentFilter = status === 'ALL' ? 'ALL' : status;
    reqCurrentPage = 1;
    await reqFetchPage(1);
  }

  async function reqLoadDetail(reqId, force = false) {
    const idx = reqData.findIndex(r => r.id === reqId);
    if (idx < 0) return null;
    const existing = reqData[idx];
    if (existing.isDetailLoaded && !force) return existing;

    const res = await fetch(`${API_BASE}/admin/blood-requests/${reqId}`, {
      headers: { Accept: 'application/json' }
    });
    if (!res.ok) {
      throw new Error(`Failed to load request details (${res.status})`);
    }

    const json = await res.json();
    const detailed = mapRequest(json, { detail: true });
    reqData[idx] = { ...existing, ...detailed, isDetailLoaded: true };
    return reqData[idx];
  }
 
  async function reqFetchCompatibleBags(req) {
    const cacheKey = req.id;
    if (reqBagCache[cacheKey]?.loading || reqBagCache[cacheKey]?.bags) return;
 
    reqBagCache[cacheKey] = { loading: true, bags: null, error: null };
 
    try {
      const params = new URLSearchParams({
        bloodType: req.bloodTypeEnum.replace(/[^A-Za-z0-9_]/g, '_'),
        component: req.bloodComponent ?? '',
        units:     reqGetRequiredUnits(req),
      });
      const res  = await fetch(`${API_BASE}/admin/available?${params}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      reqBagCache[cacheKey] = {
        loading: false,
        bags: Array.isArray(json) ? json : (json.data ?? json.content ?? []),
        error: null,
      };
    } catch (err) {
      console.error('[BagPreview] fetch failed', err);
      reqBagCache[cacheKey] = { loading: false, bags: [], error: err.message };
    }
 
    reqRender();
  }
 
  function reqBuildBagPreviewHTML(req) {
    const cache = reqBagCache[req.id];
    const id    = `req-bag-preview-${req.id}`;
 
    if (!['PENDING', 'APPROVED', 'NEEDS_CONFIRMATION'].includes(req.status)) return `<div id="${id}"></div>`;
 
    if (!cache || cache.loading) {
      return `<div id="${id}" class="req-bag-preview-wrap">
        <div class="req-section-label">Available blood bags</div>
        <div class="req-bag-preview-loading">Checking available bags...</div>
      </div>`;
    }
    if (cache.error) {
      return `<div id="${id}" class="req-bag-preview-wrap">
        <div class="req-section-label">Available blood bags</div>
        <div class="req-bag-preview-loading" style="color:var(--crimson)">Error: ${cache.error}</div>
      </div>`;
    }
    if (!cache.bags?.length) {
      return `<div id="${id}" class="req-bag-preview-wrap">
        <div class="req-section-label">Available blood bags</div>
        <div class="req-bag-preview-loading">No Available bags in stock for ${req.bloodType}.</div>
      </div>`;
    }
 
    const compatible = cache.bags.filter(b => b.compatible !== false);
    const others     = cache.bags.filter(b => b.compatible === false);
    const availability = reqGetAvailabilitySnapshot(req);
    const now          = new Date();
 
    function bagRow(b) {
      const expDate  = formatBloodBagShortDate(b.expiresAt);
      const daysLeft = b.expiresAt ? calculateBloodBagDaysLeft(b.expiresAt, now) : null;
      const warn     = daysLeft !== null && daysLeft <= 7;
      return `<div class="req-bag-preview-row">
        <div class="req-bag-dot" style="${b.compatible === false ? 'background:var(--crimson);border-color:var(--crimson)' : ''}"></div>
        <div style="flex:1;min-width:0">
          <span class="req-bag-id">${b.serialNumber ?? b.id}</span>
          <span class="req-bag-info" style="margin-left:8px">
            ${formatBloodType(b.bloodType) ?? '-'} . ${b.componentType ?? '-'} . ${b.volumeMl ?? '-'} mL
            . Exp <span style="${warn ? 'color:var(--amber);font-weight:600' : ''}">${expDate}</span>
            ${warn ? `<span style="color:var(--amber);font-size:10px"> ! ${daysLeft}d</span>` : ''}
          </span>
        </div>
        ${b.recommended ? `<span class="req-rec-badge" style="font-size:10px;padding:1px 7px">Recommended</span>` : ''}
      </div>`;
    }
 
    const PREVIEW_COMPATIBLE_LIMIT = 8;
    const PREVIEW_OTHERS_LIMIT = 3;
    const compatiblePreview = compatible.slice(0, PREVIEW_COMPATIBLE_LIMIT);
    const hiddenCompatibleCount = Math.max(compatible.length - compatiblePreview.length, 0);

    return `<div id="${id}" class="req-bag-preview-wrap">
      <div class="req-section-label" style="display:flex;align-items:center;gap:8px">
        Available blood bags
        <span class="req-bag-preview-count">${compatible.length} - compatible . ${cache.bags.length} - total available</span>
      </div>
      <div class="req-bag-preview-list">
        ${compatiblePreview.map(bagRow).join('')}
        ${hiddenCompatibleCount > 0 ? `
          <div style="font-size:11px;color:var(--muted);padding:3px 0">
            +${hiddenCompatibleCount} more compatible not shown
          </div>
        ` : ''}
        ${others.length ? `
          <div style="font-size:11px;color:var(--muted);padding:4px 0 2px;margin-top:2px;border-top:1px solid var(--border)">
            Other available types (not an exact match)
          </div>
          ${others.slice(0, PREVIEW_OTHERS_LIMIT).map(bagRow).join('')}
          ${others.length > PREVIEW_OTHERS_LIMIT ? `<div style="font-size:11px;color:var(--muted);padding:3px 0">+${others.length - PREVIEW_OTHERS_LIMIT} more not shown</div>` : ''}
        ` : ''}
      </div>
    </div>`;
  }
 
  async function openBagPicker(reqId, isChange = false) {
    bagPickerReqId    = reqId;
    bagPickerSelected = null;
    bagPickerData     = [];
    bagPickerIsChange = isChange;
    bagPickerSearchQuery = '';
 
    const req = reqData.find(x => x.id === reqId);
    if (!req) return;
 
    const modal   = document.getElementById('req-bag-picker-modal');
    const inner   = document.getElementById('req-bag-picker-inner');
    const title   = document.getElementById('req-bag-picker-title');
    const confirm = document.getElementById('req-bag-picker-confirm');
 
    title.textContent   = `Select ${req.units} bag${req.units > 1 ? 's' : ''} . ${req.bloodType} ${req.component}`;
    confirm.disabled    = true;
    confirm.textContent = isChange ? 'Change Selection' : 'Confirm & Mark Allocated';
    inner.innerHTML     = `<div class="req-bag-picker-loading">Loading available bags...</div>`;
    modal.classList.add('open');
 
    if (isChange && req.allocatedBags?.length) {
      bagPickerSelected = req.allocatedBags.map(b => String(b.id)).join(',');
    }
 
    const cached = reqBagCache[req.id];
    if (cached?.bags) {
      bagPickerData = cached.bags;
      renderBagPicker(req);
      return;
    }
 
    try {
      const params = new URLSearchParams({
        bloodType: req.bloodTypeEnum.replace(/[^A-Za-z0-9_]/g, '_'),
        component: req.bloodComponent ?? '',
        units:     req.units,
      });
      const res  = await fetch(`${API_BASE}/admin/available?${params}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      bagPickerData = Array.isArray(json) ? json : (json.data ?? json.content ?? []);
      reqBagCache[req.id] = { loading: false, bags: bagPickerData, error: null };
    } catch (err) {
      console.error('[BagPicker] fetch failed', err);
      inner.innerHTML = `<div class="req-bag-picker-loading">Error loading bags - ${err.message}</div>`;
      return;
    }
 
    renderBagPicker(req);
  }
 
  function renderBagPicker(req, options = {}) {
    const {
      preserveSearchFocus = false,
      searchCaret = null,
    } = options;
    const inner   = document.getElementById('req-bag-picker-inner');
    const confirm = document.getElementById('req-bag-picker-confirm');
 
    if (!bagPickerData.length) {
      inner.innerHTML  = `<div class="req-bag-picker-loading">No compatible bags available for ${req.bloodType}.</div>`;
      confirm.disabled = true;
      return;
    }
 
    const needed   = req.units;
    const selected = bagPickerSelected ? bagPickerSelected.split(',').filter(Boolean) : [];
    const serialSearch = (bagPickerSearchQuery || '').trim().toLowerCase();
    const filteredBags = !serialSearch
      ? bagPickerData
      : bagPickerData.filter((b) => {
          const serial = String(b.serialNumber || '').toLowerCase();
          const fallbackId = String(b.id || '').toLowerCase();
          return serial.includes(serialSearch) || fallbackId.includes(serialSearch);
        });
    confirm.disabled = selected.length !== needed;
 
    inner.innerHTML = `
      <div class="req-bag-picker-hint">
        Select exactly <strong>${needed}</strong> bag${needed > 1 ? 's' : ''}.
        ${needed > 1 ? `<span class="req-bag-picker-count">${selected.length}/${needed} selected</span>` : ''}
      </div>
      <div class="req-bag-picker-search-wrap">
        <input
          id="req-bag-picker-search"
          class="req-bag-picker-search-input"
          type="text"
          value="${escapeHtml(bagPickerSearchQuery)}"
          oninput="reqBagPickerSetSearch(this.value, this.selectionStart)"
          placeholder="Search serial no. (e.g. V457679)"
        >
        <div class="req-bag-picker-search-meta">
          Showing ${filteredBags.length} of ${bagPickerData.length} available bag(s)
        </div>
      </div>
      <div class="req-bag-picker-list">
        ${filteredBags.length === 0 ? `
          <div class="req-bag-picker-loading req-bag-picker-search-empty">No blood bags match "${escapeHtml(bagPickerSearchQuery)}".</div>
        ` : filteredBags.map(b => {
          const isSelected   = selected.includes(String(b.id));
          const isCompatible = b.compatible !== false;
          const expDate  = formatBloodBagShortDate(b.expiresAt);
          const daysLeft = b.expiresAt ? calculateBloodBagDaysLeft(b.expiresAt) : null;
          const warn     = daysLeft !== null && daysLeft <= 7;
          return `
            <div class="req-bag-row${isSelected ? ' selected' : ''}${!isCompatible ? ' incompatible' : ''}"
                 onclick="reqBagPickerToggle('${b.id}')">
              <div class="req-bag-check">${isSelected ? 'X' : ''}</div>
              <div class="req-bag-dot" style="${!isCompatible ? 'background:var(--crimson);border-color:var(--crimson)' : ''}"></div>
              <div style="flex:1;min-width:0">
                <div class="req-bag-id">${b.serialNumber ?? b.id}</div>
                <div class="req-bag-info">
                  ${formatBloodType(b.bloodType) ?? '-'} . ${b.componentType ?? '-'} . ${b.volumeMl ?? '-'} mL
                  . Exp <span style="${warn ? 'color:var(--amber);font-weight:600' : ''}">${expDate}</span>
                  ${warn ? `<span style="color:var(--amber);font-size:11px"> ! ${daysLeft}d left</span>` : ''}
                  ${!isCompatible ? `<span style="color:var(--crimson)"> . not compatible</span>` : ''}
                </div>
                <div class="req-bag-info" style="margin-top:2px;color:var(--muted)">
                  Source: ${b.source ?? '-'} . SN: ${b.serialNumber ?? '-'}
                </div>
              </div>
              ${b.recommended ? `<span class="req-rec-badge">Recommended</span>` : ''}
            </div>`;
        }).join('')}
      </div>`;

    if (preserveSearchFocus) {
      requestAnimationFrame(() => {
        const searchInput = document.getElementById('req-bag-picker-search');
        if (!searchInput) return;
        searchInput.focus();
        const maxPos = searchInput.value.length;
        const nextPos = Number.isInteger(searchCaret) ? Math.min(Math.max(searchCaret, 0), maxPos) : maxPos;
        searchInput.setSelectionRange(nextPos, nextPos);
      });
    }
  }

  window.reqBagPickerSetSearch = function (value, caretPos) {
    bagPickerSearchQuery = value || '';
    const req = reqData.find((x) => x.id === bagPickerReqId);
    if (!req) return;
    renderBagPicker(req, {
      preserveSearchFocus: true,
      searchCaret: Number.isInteger(caretPos) ? caretPos : null,
    });
  };
 
  window.reqBagPickerToggle = function (bagId) {
    const req    = reqData.find(x => x.id === bagPickerReqId);
    if (!req) return;
    const needed = req.units;
    let   sel    = bagPickerSelected ? bagPickerSelected.split(',').filter(Boolean) : [];
    const idx    = sel.indexOf(String(bagId));
 
    if (idx >= 0) {
      sel.splice(idx, 1);
    } else {
      if (sel.length >= needed) {
        if (needed === 1) sel = [];
        else sel.shift();
      }
      sel.push(String(bagId));
    }
    bagPickerSelected = sel.join(',');
    renderBagPicker(req);
  };
 
  window.reqCloseBagPicker = function () {
    document.getElementById('req-bag-picker-modal').classList.remove('open');
    bagPickerReqId    = null;
    bagPickerSelected = null;
    bagPickerData     = [];
    bagPickerIsChange = false;
    bagPickerSearchQuery = '';
  };
 
  window.reqConfirmBagSelection = async function () {
    if (!bagPickerReqId || !bagPickerSelected) return;
    const req    = reqData.find(x => x.id === bagPickerReqId);
    if (!req) return;
    const bagIds = bagPickerSelected.split(',').filter(Boolean);
    const btn    = document.getElementById('req-bag-picker-confirm');
    btn.disabled    = true;
    btn.textContent = bagPickerIsChange ? 'Changing...' : 'Allocating...';
 
    const isChange   = bagPickerIsChange;
    const prevStatus = req.status;
    const prevBags   = req.allocatedBags;
 
    const capturedBags = bagPickerData.filter(b => bagIds.includes(String(b.id)));
 
    req.status        = 'ALLOCATED';
    req.allocatedBags = capturedBags;
    reqExpanded[req.id] = true;
 
    delete reqBagCache[req.id];
 
    reqCloseBagPicker();
    reqRender();
 
    try {
      const endpoint = isChange ? 'reallocate' : 'allocate';
      const res = await fetch(`${API_BASE}/admin/blood-requests/${req.id}/${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bagIds: bagIds.map(Number) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${res.status}`);
      }
      const data = await res.json();
      req.status = data.status ?? 'ALLOCATED';
      await reqFetchPage(reqCurrentPage);
    } catch (err) {
      console.error(`[req${isChange ? 'Reallocate' : 'Allocate'}] failed`, err);
      req.status        = prevStatus;
      req.allocatedBags = prevBags;
      reqRender();
      alert(`${isChange ? 'Re-allocation' : 'Allocation'} failed: ${err.message}`);
    }
  };
 
  window.reqOpenConfirm = function (id, endpoint) {
    const req  = reqData.find(x => x.id === id);
    if (!req) return;
    const next = REQ_NEXT[req.status];
    if (!next) return;

    if (endpoint === 'approve') {
      const availability = reqGetAvailabilitySnapshot(req);
      if (availability.known && !availability.enough) {
        alert(
          `Not enough available bags for full approval. Available compatible bags: ${availability.available} of ${availability.required}. Use Approve with Remarks instead.`
        );
        return;
      }
    }
 
    if (endpoint === 'allocate') {
      openBagPicker(id, false);
      return;
    }
 
    confirmPending = { id, endpoint, next };
    const copy  = CONFIRM_COPY[endpoint];
    const modal = document.getElementById('req-confirm-modal');
 
    document.getElementById('req-confirm-title').textContent = copy.title;
    document.getElementById('req-confirm-body').innerHTML    = copy.body;
    document.getElementById('req-confirm-meta').innerHTML    =
      `<strong>${req.name}</strong> - Patient: ${req.patient} . ${req.bloodType} ${req.component} . ${req.units} unit${req.units > 1 ? 's' : ''}`;
 
    const btn = document.getElementById('req-confirm-proceed');
    btn.className   = `req-btn ${copy.confirmCls}`;
    btn.textContent = next.label;
    modal.classList.add('open');
  };
 
  window.reqCloseConfirm = function () {
    document.getElementById('req-confirm-modal').classList.remove('open');
    confirmPending = null;
  };
 
  window.reqProceedConfirm = async function () {
    if (!confirmPending) return;
    const { id, endpoint, next } = confirmPending;
    reqCloseConfirm();

    const r = reqData.find(x => x.id === id);
    if (!r) return;
    const prevStatus = r.status;
    r.status = next.next;
    reqExpanded[id] = true;
    reqRender();
 
    try {
      const res = await fetch(`${API_BASE}/admin/blood-requests/${id}/${endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${res.status}`);
      }
      const data = await res.json();
      r.status   = data.status ?? next.next;
      await reqFetchPage(reqCurrentPage);
      if (endpoint === 'release') {
        r.reviewedAt = data.reviewedAt ?? r.reviewedAt ?? null;
        openReleaseTracer(r, data);
      }
    } catch (err) {
      console.error('[reqAdvance] failed', err);
      r.status = prevStatus;
      reqRender();
      alert(`Action failed: ${err.message}`);
    }
  };

  function getCurrentReleaseStaffName() {
    if (currentUserData?.firstName || currentUserData?.lastName) {
      return `${currentUserData.firstName ?? ''} ${currentUserData.lastName ?? ''}`.trim();
    }
    return currentUserData?.username
      ?? document.getElementById('staff-profile-name-display')?.textContent?.trim()
      ?? document.getElementById('profile-name-display')?.textContent?.trim()
      ?? null;
  }

  function formatDateForTracer(value) {
    if (!value) return '';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleDateString('en-CA');
  }

  function formatTimeForTracer(value) {
    if (!value) return '';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '';
    return dt.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
  }

  function encodeTracerPayload(payload) {
    const json = JSON.stringify(payload);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return encodeURIComponent(btoa(binary));
  }

  function openReleaseTracer(req, data) {
    const releasedAt = req.reviewedAt ?? data.reviewedAt ?? new Date().toISOString();
    const patientAddress = [
      req.patientPurok,
      req.patientBarangay,
      req.patientMunicipality,
      req.patientProvince
    ].filter(Boolean).join(' / ');
    const rows = (req.allocatedBags ?? []).map((b) => ({
      aboRh: formatBloodType(b.bloodType ?? req.bloodTypeEnum ?? req.bloodType),
      componentReleased: COMPONENT_LABEL[b.componentType] ?? b.componentType ?? req.component ?? '',
      serialNumber: b.serialNumber ?? '',
      extractionDate: formatDateForTracer(b.collectedAt),
      expirationDate: formatDateForTracer(b.expiresAt),
      patientName: req.patient ?? '',
      address: patientAddress,
      age: req.patientAge ?? '',
      sex: req.patientSex ?? '',
      ward: req.wardRoom ?? '',
      rmNo: req.roomNo ?? '',
      indicationCode: req.indication ?? '',
      transfusionDate: '',
      comp: '',
      rxn: '',
      remarks: 'Released',
    }));

    const payload = {
      requestId: req.id,
      bloodServiceFacility: 'CNPH BSF',
      preparedBy: 'MARY ANN C. MEJIA, RMT',
      transactionNumber: req.referenceNumber ?? data.referenceNumber ?? '',
      releasedAt,
      dateReleased: formatDateForTracer(releasedAt),
      timeReleased: formatTimeForTracer(releasedAt),
      releasedBy: data.releasedBy ?? getCurrentReleaseStaffName() ?? '',
      qualityManager: 'Mary Ann C. Mejia, RMT',
      pathologist: 'MONINA CACAWA-MONTENEGRO, MD',
      rows,
    };

    const encoded = encodeTracerPayload(payload);
    const url = `receipt/blood-request-tracer.html?data=${encoded}`;
    window.open(url, '_blank');
  }

  window.reqPrintReceipt = function(id) {
    const req = reqData.find(x => x.id === id);
    if (!req) return;
    openReleaseTracer(req, {});
  };

  function reqOpenApproveWithRemarksLegacy(id) {
    reqPendingRemarksId = id;
    const req = reqData.find(x => x.id === id);
    if (!req) return;

    document.getElementById('req-remarks-subtitle').textContent = `${req.name} - ${req.patient}`;
    document.getElementById('req-remarks-requested-units').textContent = req.requestedUnits ?? req.units ?? '-';
    document.getElementById('req-remarks-email').textContent = req.requesterEmail || 'No requester email on file';
    document.getElementById('req-approved-units').value = req.requestedUnits ?? req.units ?? '';
    document.getElementById('req-approval-remarks').value = '';
    document.getElementById('req-remarks-modal').classList.add('open');
  };

  function reqCloseApproveWithRemarksLegacy() {
    document.getElementById('req-remarks-modal').classList.remove('open');
  };

  async function reqSubmitApproveWithRemarksLegacy() {
    const req = reqData.find(x => x.id === reqPendingRemarksId);
    if (!req) return;

    if (!req.requesterEmail || !req.requesterEmail.trim()) {
      alert('Requester email is required before a confirmation email can be sent.');
      return;
    }

    const approvedUnits = Number(document.getElementById('req-approved-units').value);
    const approvalRemarks = document.getElementById('req-approval-remarks').value.trim();

    if (!Number.isInteger(approvedUnits) || approvedUnits <= 0) {
      alert('Approved units must be greater than 0.');
      return;
    }
    if (approvedUnits > (req.requestedUnits ?? req.units ?? 0)) {
      alert('Approved units cannot be greater than the requested units.');
      return;
    }
    if (!approvalRemarks) {
      alert('Approval remarks are required.');
      return;
    }

    const prevState = {
      status: req.status,
      units: req.units,
      approvedUnits: req.approvedUnits,
      approvalRemarks: req.approvalRemarks,
      patientAcceptedRemarks: req.patientAcceptedRemarks,
      confirmationEmailSentAt: req.confirmationEmailSentAt
    };

    req.status = 'NEEDS_CONFIRMATION';
    req.units = approvedUnits;
    req.approvedUnits = approvedUnits;
    req.approvalRemarks = approvalRemarks;
    req.patientAcceptedRemarks = null;
    req.confirmationEmailSentAt = new Date().toISOString();
    reqExpanded[req.id] = true;
    reqCloseApproveWithRemarks();
    reqRender();

    try {
      const res = await fetch(`${API_BASE}/admin/blood-requests/${req.id}/approve-with-remarks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedUnits,
          approvalRemarks
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${res.status}`);
      }

      const data = await res.json();
      req.status = data.status ?? 'NEEDS_CONFIRMATION';
      req.approvedUnits = data.approvedUnits ?? approvedUnits;
      req.units = req.approvedUnits ?? approvedUnits;
      req.confirmationEmailSentAt = data.confirmationEmailSentAt ?? req.confirmationEmailSentAt;
      reqRender();
      alert(data.message ?? 'Confirmation email sent to requester.');
    } catch (err) {
      console.error('[reqApproveWithRemarks] failed', err);
      req.status = prevState.status;
      req.units = prevState.units;
      req.approvedUnits = prevState.approvedUnits;
      req.approvalRemarks = prevState.approvalRemarks;
      req.patientAcceptedRemarks = prevState.patientAcceptedRemarks;
      req.confirmationEmailSentAt = prevState.confirmationEmailSentAt;
      reqRender();
      alert(`Approve with remarks failed: ${err.message}`);
    }
  };

  function reqClearRemarksFeedback() {
    const feedback = document.getElementById('req-remarks-feedback');
    if (feedback) {
      feedback.hidden = true;
      feedback.textContent = '';
    }

    ['req-approved-units', 'req-approval-remarks'].forEach(id => {
      const field = document.getElementById(id);
      if (field) field.classList.remove('is-invalid');
    });
  }

  function reqShowRemarksFeedback(message, fieldId = null) {
    const feedback = document.getElementById('req-remarks-feedback');
    if (feedback) {
      feedback.hidden = false;
      feedback.textContent = message;
    }

    if (fieldId) {
      const field = document.getElementById(fieldId);
      if (field) {
        field.classList.add('is-invalid');
        field.focus();
      }
    }
  }

  function reqSetRemarksSubmitting(isSubmitting) {
    const submitBtn = document.getElementById('req-remarks-submit-btn');
    if (submitBtn) {
      submitBtn.disabled = isSubmitting;
      submitBtn.textContent = isSubmitting ? 'Sending Confirmation...' : 'Send Confirmation Email';
    }
  }

  window.reqOpenApproveWithRemarks = function(id) {
    reqPendingRemarksId = id;
    const req = reqData.find(x => x.id === id);
    if (!req) return;

    reqClearRemarksFeedback();
    reqSetRemarksSubmitting(false);

    document.getElementById('req-remarks-subtitle').textContent = `${req.name} - ${req.patient}`;
    document.getElementById('req-remarks-requested-units').textContent = req.requestedUnits ?? req.units ?? 'N/A';
    document.getElementById('req-remarks-email').textContent = req.requesterEmail || 'No requester email on file';
    document.getElementById('req-approved-units').value = req.requestedUnits ?? req.units ?? '';
    document.getElementById('req-approval-remarks').value = '';

    const submitBtn = document.getElementById('req-remarks-submit-btn');
    const hasRequesterEmail = !!(req.requesterEmail && req.requesterEmail.trim());
    if (submitBtn) submitBtn.disabled = !hasRequesterEmail;
    if (!hasRequesterEmail) {
      reqShowRemarksFeedback('Requester email is required before a confirmation email can be sent.');
    }

    document.getElementById('req-remarks-modal').classList.add('open');
  };

  window.reqCloseApproveWithRemarks = function() {
    document.getElementById('req-remarks-modal').classList.remove('open');
    reqPendingRemarksId = null;
    reqClearRemarksFeedback();
    reqSetRemarksSubmitting(false);
  };

  window.reqSubmitApproveWithRemarks = async function() {
    const req = reqData.find(x => x.id === reqPendingRemarksId);
    if (!req) return;

    reqClearRemarksFeedback();

    if (!req.requesterEmail || !req.requesterEmail.trim()) {
      reqShowRemarksFeedback('Requester email is required before a confirmation email can be sent.');
      return;
    }

    const approvedUnits = Number(document.getElementById('req-approved-units').value);
    const approvalRemarks = document.getElementById('req-approval-remarks').value.trim();
    const requestedUnits = req.requestedUnits ?? req.units ?? 0;

    if (!Number.isInteger(approvedUnits) || approvedUnits <= 0) {
      reqShowRemarksFeedback('Approved units must be greater than 0.', 'req-approved-units');
      return;
    }
    if (approvedUnits > requestedUnits) {
      reqShowRemarksFeedback('Approved units cannot be greater than the requested units.', 'req-approved-units');
      return;
    }
    if (!approvalRemarks) {
      reqShowRemarksFeedback('Approval remarks are required.', 'req-approval-remarks');
      return;
    }

    reqSetRemarksSubmitting(true);

    try {
      const res = await fetch(`${API_BASE}/admin/blood-requests/${req.id}/approve-with-remarks`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          approvedUnits,
          approvalRemarks
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${res.status}`);
      }

      const data = await res.json();
      req.status = data.status ?? 'NEEDS_CONFIRMATION';
      req.units = data.approvedUnits ?? approvedUnits;
      req.approvedUnits = data.approvedUnits ?? approvedUnits;
      req.approvalRemarks = data.approvalRemarks ?? approvalRemarks;
      req.patientAcceptedRemarks = null;
      req.confirmationEmailSentAt = data.confirmationEmailSentAt ?? new Date().toISOString();
      reqExpanded[req.id] = true;

      delete reqBagCache[req.id];
      reqCloseApproveWithRemarks();
      await reqFetchPage(reqCurrentPage);
      setTimeout(() => reqFetchCompatibleBags(req), 0);

      const successMessage = data.message
        ?? `A confirmation email was sent to ${req.requesterEmail}. The request is now waiting for requester confirmation.`;
      if (typeof showSysSuccessModal === 'function') {
        showSysSuccessModal('Confirmation Email Sent', successMessage);
      } else if (typeof showToast === 'function') {
        showToast(successMessage, 'success');
      }
    } catch (err) {
      console.error('[reqApproveWithRemarks] failed', err);
      reqShowRemarksFeedback(`Approve with remarks failed: ${err.message}`);
    } finally {
      reqSetRemarksSubmitting(false);
    }
  };

  function reqGetResolutionConfig(mode) {
    if (mode === 'cancel') {
      return {
        title: 'Cancel Request',
        helper: 'Use this when the request can no longer be fulfilled. Reserved bags will be released back to inventory.',
        label: 'Cancellation Note',
        placeholder: 'e.g. Crossmatched bags became unavailable, storage issue, sudden stock discrepancy...',
        confirmText: 'Confirm Cancel',
        endpoint: 'cancel',
        requestKey: 'cancellationReason',
        nextStatus: 'CANCELLED',
        failureLabel: 'Cancellation',
      };
    }

    return {
      title: 'Reject Request',
      helper: 'This will notify the requester. Provide a clear, specific reason.',
      label: 'Reason for Rejection',
      placeholder: 'e.g. Incompatible blood type on cross-match, insufficient documentation...',
      confirmText: 'Confirm Reject',
      endpoint: 'reject',
      requestKey: 'rejectionReason',
      nextStatus: 'REJECTED',
      failureLabel: 'Rejection',
    };
  }

  function reqOpenResolutionModal(id, mode) {
    reqPendingRejectId = id;
    reqPendingResolutionMode = mode;
    const r = reqData.find(x => x.id === id);
    document.getElementById('req-reject-subtitle').textContent = r ? `${r.name} - ${r.patient}` : '';
    const config = reqGetResolutionConfig(mode);
    document.getElementById('req-reject-title').textContent = config.title;
    document.getElementById('req-reject-helper').innerHTML = `<span>!</span><span>${config.helper}</span>`;
    document.getElementById('req-reject-label').textContent = config.label;
    document.getElementById('req-reject-confirm').textContent = config.confirmText;
    document.getElementById('req-reject-reason').value = '';
    document.getElementById('req-reject-reason').placeholder = config.placeholder;
    document.getElementById('req-reject-reason').style.borderColor = 'var(--border)';
    document.getElementById('req-reject-modal').classList.add('open');
  }

  window.reqOpenReject = function (id) {
    reqOpenResolutionModal(id, 'reject');
    const r = reqData.find(x => x.id === id);
    document.getElementById('req-reject-subtitle').textContent = r ? `${r.name} - ${r.patient}` : '';
  };

  window.reqOpenCancel = function (id) {
    reqOpenResolutionModal(id, 'cancel');
  };
 
  window.reqCloseReject = function () {
    document.getElementById('req-reject-modal').classList.remove('open');
    reqPendingRejectId = null;
    reqPendingResolutionMode = 'reject';
  };
 
  window.reqConfirmReject = async function () {
    const reason = document.getElementById('req-reject-reason').value.trim();
    if (!reason) {
      document.getElementById('req-reject-reason').style.borderColor = 'var(--crimson)';
      return;
    }
    const targetId = reqPendingRejectId;
    const r = reqData.find(x => x.id === targetId);
    if (!r) return;
    const config = reqGetResolutionConfig(reqPendingResolutionMode);
    const prevState = {
      status: r.status,
      rejectionReason: r.rejectionReason,
      allocatedBags: r.allocatedBags,
    };
    r.status = config.nextStatus;
    r.rejectionReason = reason;
    r.allocatedBags = [];
    reqCloseReject();
    reqExpanded[targetId] = true;
    reqRender();
 
    try {
      const res = await fetch(`${API_BASE}/admin/blood-requests/${targetId}/${config.endpoint}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [config.requestKey]: reason,
          notes: reason,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${res.status}`);
      }
      await reqFetchPage(reqCurrentPage);
    } catch (err) {
      console.error('[reqConfirmReject] failed', err);
      r.status = prevState.status;
      r.rejectionReason = prevState.rejectionReason;
      r.allocatedBags = prevState.allocatedBags;
      reqRender();
      alert(`${config.failureLabel} failed: ${err.message}`);
    }
  };
 
  function reqDocClampZoom(nextZoom) {
    return Math.min(REQ_DOC_ZOOM_MAX, Math.max(REQ_DOC_ZOOM_MIN, nextZoom));
  }

  function reqDocGetZoomImage() {
    return document.getElementById('req-doc-zoom-image');
  }

  function reqDocUpdateZoomUi() {
    const zoomOutBtn = document.getElementById('req-doc-zoom-out');
    const zoomInBtn = document.getElementById('req-doc-zoom-in');
    const zoomResetBtn = document.getElementById('req-doc-zoom-reset');
    const zoomValue = document.getElementById('req-doc-zoom-value');
    const zoomImage = reqDocGetZoomImage();
    const disabled = reqDocIsPdf || !zoomImage;

    if (zoomValue) {
      zoomValue.textContent = `${Math.round(reqDocZoom * 100)}%`;
    }
    if (zoomOutBtn) zoomOutBtn.disabled = disabled;
    if (zoomInBtn) zoomInBtn.disabled = disabled;
    if (zoomResetBtn) zoomResetBtn.disabled = disabled;

    if (!disabled) {
      zoomImage.style.transform = `scale(${reqDocZoom})`;
    }
  }

  window.reqDocZoomIn = function () {
    reqDocZoom = reqDocClampZoom(reqDocZoom + REQ_DOC_ZOOM_STEP);
    reqDocUpdateZoomUi();
  };

  window.reqDocZoomOut = function () {
    reqDocZoom = reqDocClampZoom(reqDocZoom - REQ_DOC_ZOOM_STEP);
    reqDocUpdateZoomUi();
  };

  window.reqDocZoomReset = function () {
    reqDocZoom = 1;
    reqDocUpdateZoomUi();
  };

  window.reqCloseDocModal = function () {
    const modal = document.getElementById('req-doc-modal');
    const frame = document.getElementById('req-doc-frame');
    if (modal) modal.classList.remove('open');
    if (frame) frame.innerHTML = '';
    reqDocZoom = 1;
    reqDocIsPdf = false;
    reqDocUpdateZoomUi();
  };

  window.reqViewDoc = function (url, label) {
    if (!url) { alert('No document uploaded for this request.'); return; }

    const frame = document.getElementById('req-doc-frame');
    const docLabel = document.getElementById('req-doc-label');
    const openLink = document.getElementById('req-doc-open-link');
    const safeLabel = label || 'Blood Request Form';
    const lowerUrl = String(url).toLowerCase();
    const isPdf = lowerUrl.includes('.pdf');
    const googleViewer = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;

    reqDocIsPdf = isPdf;
    reqDocZoom = 1;

    if (docLabel) docLabel.textContent = safeLabel;
    if (openLink) openLink.href = url;

    if (!frame) return;

    frame.innerHTML = isPdf
      ? `<iframe class="req-doc-pdf" src="${googleViewer}" title="${safeLabel}"></iframe>`
      : `<div class="req-doc-image-wrap">
          <img
            id="req-doc-zoom-image"
            class="req-doc-image"
            src="${url}"
            alt="${safeLabel}"
            onerror="this.parentElement.innerHTML='<div style=\\'padding:40px;text-align:center;color:var(--muted);font-size:13px\\'>Preview unavailable - <a href=\\'${url}\\' target=\\'_blank\\' style=\\'color:var(--blue)\\'>open directly</a></div>'"
          />
        </div>`;

    if (!isPdf) {
      const zoomImage = reqDocGetZoomImage();
      if (zoomImage) {
        zoomImage.addEventListener('wheel', function (event) {
          if (!event.ctrlKey) return;
          event.preventDefault();
          const next = reqDocZoom + (event.deltaY < 0 ? REQ_DOC_ZOOM_STEP : -REQ_DOC_ZOOM_STEP);
          reqDocZoom = reqDocClampZoom(next);
          reqDocUpdateZoomUi();
        }, { passive: false });
      }
    }

    reqDocUpdateZoomUi();
    document.getElementById('req-doc-modal').classList.add('open');
  };
 
  function reqGetFiltered() {
    const urgency = document.getElementById('req-filter-urgency')?.value || 'ALL';
    const sort    = document.getElementById('req-sort')?.value || 'date_desc';
    let list = reqData.slice();
    if (urgency !== 'ALL')          list = list.filter(r => r.urgency === urgency);

    const requestTs = (r) => {
      const ts = new Date(r?.requestedAt || 0).getTime();
      return Number.isFinite(ts) ? ts : 0;
    };

    if (sort === 'date_desc') {
      list.sort((a, b) => {
        const tsDiff = requestTs(b) - requestTs(a);
        if (tsDiff !== 0) return tsDiff;
        return (Number(b?.id) || 0) - (Number(a?.id) || 0);
      });
    }
    else if (sort === 'date_asc') {
      list.sort((a, b) => {
        const tsDiff = requestTs(a) - requestTs(b);
        if (tsDiff !== 0) return tsDiff;
        return (Number(a?.id) || 0) - (Number(b?.id) || 0);
      });
    }
    else if (sort === 'units_desc') {
      list.sort((a, b) => {
        const aUnits = Number(a?.units ?? 0);
        const bUnits = Number(b?.units ?? 0);
        if (bUnits !== aUnits) return bUnits - aUnits;
        const tsDiff = requestTs(b) - requestTs(a);
        if (tsDiff !== 0) return tsDiff;
        return (Number(b?.id) || 0) - (Number(a?.id) || 0);
      });
    }
    return list;
  }

  function reqUpdatePaginationUi(filteredCount) {
    const showingEl = document.getElementById('req-showing');
    const pageLabelEl = document.getElementById('req-page-label');
    const prevEl = document.getElementById('req-prev');
    const nextEl = document.getElementById('req-next');
    const urgency = document.getElementById('req-filter-urgency')?.value || 'ALL';

    const safePage = Math.max(reqCurrentPage, 1);
    const safeTotalPages = Math.max(reqTotalPages, 1);
    const safeTotalElements = Math.max(reqTotalElements, 0);
    const start = safeTotalElements === 0 ? 0 : ((safePage - 1) * REQ_PAGE_SIZE) + 1;
    const end = safeTotalElements === 0 ? 0 : Math.min((safePage - 1) * REQ_PAGE_SIZE + reqData.length, safeTotalElements);

    if (showingEl) {
      showingEl.textContent = urgency === 'ALL'
        ? `Showing ${start}-${end} of ${safeTotalElements}`
        : `Showing ${filteredCount} filtered on page ${safePage} (${safeTotalElements} total)`;
    }
    if (pageLabelEl) pageLabelEl.textContent = `${safePage} / ${safeTotalPages}`;
    if (prevEl) prevEl.disabled = safePage <= 1;
    if (nextEl) nextEl.disabled = safePage >= safeTotalPages;
  }

  function reqApplyClientFilters() {
    reqRender();
  }

  function reqHandleSearchInput() {
    if (reqSearchDebounceTimer) clearTimeout(reqSearchDebounceTimer);
    reqSearchDebounceTimer = setTimeout(() => {
      reqCurrentPage = 1;
      reqFetchPage(1);
    }, 300);
  }

  async function reqHandleServerFiltersChange() {
    reqCurrentPage = 1;
    await reqFetchPage(1);
  }

  async function reqPrevPage() {
    if (reqCurrentPage <= 1) return;
    reqCurrentPage -= 1;
    await reqFetchPage(reqCurrentPage);
  }

  async function reqNextPage() {
    if (reqCurrentPage >= reqTotalPages) return;
    reqCurrentPage += 1;
    await reqFetchPage(reqCurrentPage);
  }

  window.reqFilterBy = async function (status, btn) {
    reqCurrentFilter = status;
    reqCurrentPage = 1;
    document.querySelectorAll('#req-filters .req-filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    await reqFetchPage(1);
  };
 
  function reqUsesConfirmationFlow(req) {
    return Boolean(
      req.approvalRemarks ||
      req.approvedUnits != null ||
      req.patientAcceptedRemarks != null ||
      req.status === 'NEEDS_CONFIRMATION'
    );
  }

  function reqRenderFlow(req) {
    if (req.status === 'REJECTED') return `<div style="margin-bottom:16px"><span class="tag tag-rejected">Rejected</span></div>`;
    if (req.status === 'CANCELLED') return `<div style="margin-bottom:16px"><span class="tag tag-inactive">Cancelled</span></div>`;

    const flowStatuses = reqUsesConfirmationFlow(req)
      ? ['PENDING', 'NEEDS_CONFIRMATION', 'APPROVED', 'ALLOCATED', 'READY_FOR_RELEASE', 'RELEASED']
      : ['PENDING', 'APPROVED', 'ALLOCATED', 'READY_FOR_RELEASE', 'RELEASED'];
    const idx = flowStatuses.indexOf(req.status);
    let h = `<div class="req-status-flow">`;
    flowStatuses.forEach((s, i) => {
      const cls = i < idx ? 'done' : i === idx ? 'active' : 'todo';
      h += `<div class="req-sf-step">
              <span class="req-sf-node ${cls}">${REQ_STATUS_LABEL[s]}</span>
              ${i < flowStatuses.length - 1 ? '<span class="req-sf-arrow">></span>' : ''}
            </div>`;
    });
    return h + `</div>`;
  }
 
  function reqRenderAllocatedBags(req) {
    if (!['ALLOCATED', 'READY_FOR_RELEASE', 'RELEASED'].includes(req.status)) return '';
    if (!req.allocatedBags?.length) return '';
 
    const canChange = ['ALLOCATED', 'READY_FOR_RELEASE'].includes(req.status);
 
    return `<div class="req-allocated-wrap">
      <div class="req-section-label" style="display:flex;align-items:center;gap:8px;justify-content:space-between">
        <span>Allocated blood bag${req.allocatedBags.length > 1 ? 's' : ''}</span>
        ${canChange
          ? `<button class="req-change-bag-btn" onclick="reqOpenChangeBags(${req.id})">
               = Change selection
             </button>`
          : ''}
      </div>
      <div class="req-bag-preview-list">
        ${req.allocatedBags.map(b => {
          const expDate = formatBloodBagShortDate(b.expiresAt);
          return `<div class="req-bag-preview-row" style="border-left:3px solid var(--green);padding-left:10px">
            <div class="req-bag-dot" style="background:var(--green);border-color:var(--green)"></div>
            <div style="flex:1;min-width:0">
              <span class="req-bag-id">${b.serialNumber ?? b.id}</span>
              <span class="req-bag-info" style="margin-left:8px">
                ${formatBloodType(b.bloodType) ?? '-'} . ${b.componentType ?? '-'} . ${b.volumeMl ?? '-'} mL . Exp ${expDate}
              </span>
            </div>
            <span class="req-rec-badge" >Allocated</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }
 
  function reqRenderActions(req) {
    if (req.status === 'RELEASED') {
      return `<div class="req-action-bar">
        <button class="req-btn req-btn-approve" onclick="reqPrintReceipt(${req.id})">
          Print Tracer
        </button>
      </div>`;
    }

    if (['REJECTED', 'CANCELLED'].includes(req.status)) return '';
    const next = REQ_NEXT[req.status];
    const availability = reqGetAvailabilitySnapshot(req);
    const canReject = ['PENDING', 'NEEDS_CONFIRMATION'].includes(req.status);
    const canCancel = ['APPROVED', 'NEEDS_CONFIRMATION', 'ALLOCATED', 'READY_FOR_RELEASE'].includes(req.status);
    const approveChecking = req.status === 'PENDING' && !availability.known;
    const approveDisabled = req.status === 'PENDING' && availability.known && !availability.enough;
    if (!next && !canReject && !canCancel) return '';
    let h = `<div class="req-action-bar">`;
    if (next) {
      if (req.status === 'PENDING' && (approveChecking || approveDisabled)) {
        h += `<button class="req-btn ${next.cls}" disabled title="${approveChecking ? 'Checking available compatible bags for full approval.' : 'Not enough available bags for full approval. Use Approve with Remarks instead.'}">${next.label}</button>`;
      } else {
        h += `<button class="req-btn ${next.cls}" onclick="reqOpenConfirm(${req.id},'${next.endpoint}')">${next.label}</button>`;
      }
    }
    if (req.status === 'PENDING') {
      h += `<button class="req-btn req-btn-review" onclick="reqOpenApproveWithRemarks(${req.id})">Approve with Remarks</button>`;
    }
    if (canReject) {
      h += `<button class="req-btn req-btn-reject" onclick="reqOpenReject(${req.id})">Reject</button>`;
    }
    if (canCancel) {
      h += `<button class="req-btn req-btn-reject" onclick="reqOpenCancel(${req.id})">Cancel with Note</button>`;
    }
    if (approveChecking) {
      h += `<div style="width:100%;padding:10px 12px;border-radius:12px;background:rgba(59,130,246,0.08);border:1px solid rgba(59,130,246,0.18);color:var(--blue);font-size:12px;line-height:1.6">Checking compatible stock before full approval.</div>`;
    }
    if (approveDisabled) {
      h += `<div style="width:100%;padding:10px 12px;border-radius:12px;background:rgba(244,162,89,0.12);border:1px solid rgba(244,162,89,0.28);color:#9A5B13;font-size:12px;line-height:1.6">Not enough available bags for full approval. Use <strong>Approve with Remarks</strong> to offer partial fulfillment.</div>`;
    }
    return h + `</div>`;
  }

  function reqRenderApprovalSummary(req) {
    if (!req.approvedUnits && !req.approvalRemarks) return '';

    const requestedVsApproved = req.approvedUnits != null && req.approvedUnits !== req.requestedUnits
      ? `<div class="req-detail-row"><span class="lbl">Requested units</span><span class="val">${req.requestedUnits}</span></div>
         <div class="req-detail-row"><span class="lbl">Approved units</span><span class="val">${req.approvedUnits}</span></div>`
      : `<div class="req-detail-row"><span class="lbl">Approved units</span><span class="val">${req.approvedUnits ?? req.requestedUnits}</span></div>`;

    return `
      <div class="req-detail-box" style="margin-bottom:12px;border-left:3px solid #F4A259">
        <div class="req-detail-box-title" style="color:#9A5B13">Approval summary</div>
        ${requestedVsApproved}
        <div class="req-detail-row"><span class="lbl">Remarks</span><span class="val">${req.approvalRemarks ?? '-'}</span></div>
        <div class="req-detail-row"><span class="lbl">Requester email</span><span class="val">${req.requesterEmail ?? '-'}</span></div>
        <div class="req-detail-row"><span class="lbl">Email sent at</span><span class="val">${req.confirmationEmailSentAt ? formatDateTime(req.confirmationEmailSentAt) : '-'}</span></div>
        ${req.patientRespondedAt
          ? `<div class="req-detail-row"><span class="lbl">Requester responded at</span><span class="val">${formatDateTime(req.patientRespondedAt)}</span></div>`
          : ''}
      </div>`;
  }
 
  function reqRenderCard(req) {
    const isExp    = !!reqExpanded[req.id];
    const reqKey   = reqGetIdentity(req);
    const isNewReq = !!(reqKey && reqUnseenIds.has(reqKey));
    const urgColor = REQ_URGENCY_COLOR[req.urgency];
    const requestCategoryRaw = String(req.requestCategory ?? '').trim().toUpperCase();
    const requesterTypeDisplay =
      requestCategoryRaw === 'INPATIENT' || requestCategoryRaw === 'INHOUSE' ? 'INHOUSE'
      : requestCategoryRaw === 'OUTPATIENT' || requestCategoryRaw === 'OPD' ? 'OPD'
      : (req.requestCategory ? req.requestCategory : (req.type ?? ''));
    const typeLabel = requesterTypeDisplay
      ? `<span style="font-size:11px;font-weight:400;color:var(--muted)">(${requesterTypeDisplay})</span>`
      : '';
    const unitsMeta = req.approvedUnits != null && req.approvedUnits !== req.requestedUnits
      ? `${req.approvedUnits} ${req.status === 'NEEDS_CONFIRMATION' ? 'offered' : 'approved'} of ${req.requestedUnits} requested`
      : `${req.units} unit${req.units > 1 ? 's' : ''}`;
    const docTransactionLabel = req.transactionNumber || req.referenceNumber || req.id || 'N/A';
    const docDisplayLabel = `Doctor's Form - ${docTransactionLabel}`;
    const safeDocUrl = String(req.docUrl ?? '').replace(/'/g, "\\'");
    const safeDocDisplayLabel = docDisplayLabel
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'");
 
    if (isExp && ['PENDING', 'APPROVED', 'NEEDS_CONFIRMATION'].includes(req.status)) {
      setTimeout(() => reqFetchCompatibleBags(req), 0);
    }
 
    return `<div class="req-card${isExp ? ' expanded' : ''}${isNewReq ? ' req-card-new' : ''}" id="req-card-${req.id}">
      <div class="req-head" onclick="reqToggle(${req.id})"
           style="display:flex;gap:0;padding:0;align-items:stretch">
        <div class="req-urgency-bar"
             style="background:${urgColor};margin-right:0;flex-shrink:0;border-radius:12px 0 0 ${isExp ? '0' : '12px'}"></div>
        <div style="flex:1;display:grid;grid-template-columns:1fr auto auto auto auto;align-items:center;gap:12px;padding:15px 18px">
          <div>
            <div class="req-name">${req.referenceNumber} ${typeLabel}${isNewReq ? '<span class="req-new-pill">New</span>' : ''}</div>
            <div class="req-meta">
              <span>${req.referenceNumber ? `Ref: ${req.name}` : 'N/A'}</span><span class="req-meta-dot"></span>
              <span>${req.patient}</span><span class="req-meta-dot"></span>
              <span>${req.component}</span><span class="req-meta-dot"></span>
              <span style="font-weight:600;color:var(--charcoal)">${unitsMeta}</span>
              <span class="req-meta-dot"></span><span>${req.date}</span>
            </div>
          </div>
          <span class="req-blood-badge">${req.bloodType}</span>
          <span class="tag ${REQ_URGENCY_TAG[req.urgency]}">${req.urgency[0] + req.urgency.slice(1).toLowerCase()}</span>
          <span class="tag ${REQ_STATUS_TAG[req.status]}">${REQ_STATUS_LABEL[req.status]}</span>
          <span class="req-chevron${isExp ? ' open' : ''}">></span>
        </div>
      </div>
 
      <div class="req-detail${isExp ? ' open' : ''}" id="req-detail-${req.id}">
        ${reqRenderFlow(req)}
 
        <div class="req-detail-grid">
          <div class="req-detail-box" onclick="window.openReqDetailsModal(${req.id})" 
               style="cursor:pointer;transition:all 0.2s ease"
               onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'"
               onmouseout="this.style.boxShadow=''">
            <div class="req-detail-box-title">Patient info (view)</div>
            <div class="req-detail-row"><span class="lbl">Name</span><span class="val">${req.patient}</span></div>
            <div class="req-detail-row"><span class="lbl">Blood type</span><span class="val">${req.bloodType}</span></div>
            <div class="req-detail-row"><span class="lbl">Component</span><span class="val">${req.component}</span></div>
            <div class="req-detail-row"><span class="lbl">Units requested</span><span class="val">${req.requestedUnits}</span></div>
          </div>
          <div class="req-detail-box" onclick="window.openReqDetailsModal(${req.id})" 
               style="cursor:pointer;transition:all 0.2s ease"
               onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'"
               onmouseout="this.style.boxShadow=''">
            <div class="req-detail-box-title">Requester info (view)</div>
            <div class="req-detail-row"><span class="lbl">From</span><span class="val">${req.name}</span></div>
            <div class="req-detail-row"><span class="lbl">Type</span><span class="val">${requesterTypeDisplay || '-'}</span></div>
            <div class="req-detail-row"><span class="lbl">Urgency</span><span class="val">${req.urgency[0] + req.urgency.slice(1).toLowerCase()}</span></div>
            <div class="req-detail-row"><span class="lbl">Submitted</span><span class="val">${req.date}</span></div>
          </div>
        </div>
 
        ${reqRenderApprovalSummary(req)}

        <div class="req-section-label">Supporting document</div>
        <div class="req-doc-preview" onclick="reqViewDoc('${safeDocUrl}','${safeDocDisplayLabel}')">
          <div class="req-doc-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
            </svg>
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:var(--charcoal)">${docDisplayLabel}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">Tap to preview</div>
          </div>
          <span style="font-size:12px;color:var(--blue);font-weight:600;flex-shrink:0">View -></span>
        </div>
 
        ${['REJECTED', 'CANCELLED'].includes(req.status) && req.rejectionReason
          ? `<div class="req-detail-box" style="margin-bottom:12px;border-left:3px solid var(--crimson)">
              <div class="req-detail-box-title" style="color:var(--crimson)">Resolution note</div>
              <div style="font-size:13px;color:var(--charcoal);line-height:1.6">${req.rejectionReason}</div>
            </div>` : ''}
 
        ${reqBuildBagPreviewHTML(req)}
        ${reqRenderAllocatedBags(req)}
        ${reqRenderActions(req)}
      </div>
    </div>`;
  }
 
  window.reqOpenChangeBags = function (id) {
    openBagPicker(id, true);
  };
 
  function reqRender() {
    const list = document.getElementById('req-list');
    const info = document.getElementById('req-results-info');
    if (!list) return;
    const filtered = reqGetFiltered();
    list.innerHTML = filtered.length
      ? filtered.map(reqRenderCard).join('')
      : `<div class="req-empty"><div style="font-size:32px;margin-bottom:10px;opacity:0.35">No match</div>No requests match the current filters.</div>`;
    if (info) info.textContent = `Page ${reqCurrentPage} of ${reqTotalPages} . ${reqTotalElements} total request${reqTotalElements !== 1 ? 's' : ''}`;
    reqUpdatePaginationUi(filtered.length);
    reqUpdateCounts();
  }
 
  function reqUpdateCounts() {
    const counts = reqStatusCounts ?? reqGetLocalStatusCounts();

    // Update the ALL and PENDING with IDs (they exist in HTML)
    const allEl = document.getElementById('req-cnt-all');
    const pendEl = document.getElementById('req-cnt-pending');
    if (allEl) allEl.textContent = String(counts['ALL'] ?? 0);
    if (pendEl) pendEl.textContent = String(counts['PENDING'] ?? 0);

    // Update all other filter chips by looking for their onclick attribute
    ['APPROVED', 'NEEDS_CONFIRMATION', 'ALLOCATED', 'READY_FOR_RELEASE', 'RELEASED', 'REJECTED', 'CANCELLED'].forEach(status => {
      // Find the button with this status filter
      const buttons = document.querySelectorAll('#req-filters button');
      buttons.forEach(btn => {
        if (btn.getAttribute('onclick')?.includes(`reqFilterBy('${status}'`)) {
          const badge = btn.querySelector('.chip-cnt');
          if (badge) {
            badge.textContent = String(counts[status] ?? 0);
          }
        }
      });
    });
  }
 
  window.reqToggle = async id => {
    markBloodRequestAsViewedById(id);
    const willExpand = !reqExpanded[id];
    reqExpanded[id] = willExpand;
    if (willExpand) {
      try {
        await reqLoadDetail(id);
      } catch (err) {
        console.error('[BloodRequests] detail load failed', err);
      }
    }
    reqRender();
  };
  window.reqRender = reqRender;
  window.updateBloodRequestBadge = updateBloodRequestBadge;
  window.markBloodRequestsAsViewed = markBloodRequestsAsViewed;
  window.detectNewBloodRequests = detectNewBloodRequests;

  window.reqFetchAll = reqFetchAll;
  window.reqFetchByStatus = reqFetchByStatus;
  window.reqApplyClientFilters = reqApplyClientFilters;
  window.reqHandleSearchInput = reqHandleSearchInput;
  window.reqHandleServerFiltersChange = reqHandleServerFiltersChange;
  window.reqPrevPage = reqPrevPage;
  window.reqNextPage = reqNextPage;
  window.reqFetchCompatibleBags = reqFetchCompatibleBags;
  window.reqInvalidateBagCache = function() {
    for (const key in reqBagCache) {
      delete reqBagCache[key];
    }
    Object.keys(reqExpanded).forEach(reqId => {
      if (reqExpanded[reqId]) {
        const req = reqData.find(r => r.id == reqId);
        if (req && ['PENDING', 'APPROVED', 'NEEDS_CONFIRMATION'].includes(req.status)) {
          setTimeout(() => reqFetchCompatibleBags(req), 0);
        }
      }
    });
  };
 
  ['req-reject-modal', 'req-remarks-modal', 'req-doc-modal', 'req-confirm-modal', 'req-bag-picker-modal'].forEach(modalId => {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.addEventListener('click', e => {
      if (e.target !== e.currentTarget) return;
      if (modalId === 'req-reject-modal')      reqCloseReject();
      else if (modalId === 'req-remarks-modal') reqCloseApproveWithRemarks();
      else if (modalId === 'req-confirm-modal') reqCloseConfirm();
      else if (modalId === 'req-bag-picker-modal') reqCloseBagPicker();
      else if (modalId === 'req-doc-modal') reqCloseDocModal();
      else el.classList.remove('open');
    });
  });
 
  window.initReqDetailsModal = function () {
    if (document.getElementById('req-details-modal')) return;
    document.body.insertAdjacentHTML('beforeend', window.REQ_DETAILS_MODAL_HTML);
    const modal = document.getElementById('req-details-modal');
    const backdrop = modal.querySelector('.req-details-modal-backdrop');
    backdrop.addEventListener('click', () => window.closeReqDetailsModal());
  };

  window.openReqDetailsModal = async function (reqId) {
    markBloodRequestAsViewedById(reqId);
    window.initReqDetailsModal();

    let req = reqData.find(x => x.id === reqId);
    if (!req) {
      console.warn('[ReqDetailsModal] Request not found:', reqId);
      return;
    }

    try {
      req = await reqLoadDetail(reqId);
    } catch (err) {
      console.error('[ReqDetailsModal] Failed to load detail:', err);
      alert('Failed to load complete request details.');
      return;
    }
    
    const modal = document.getElementById('req-details-modal');
    const title = document.getElementById('req-details-title');
    const body = document.getElementById('req-details-body');
    
    title.textContent = `Request #${req.referenceNumber ?? req.id} - ${req.name}`;
    body.innerHTML = renderReqDetailsContent(req);
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  };

  window.closeReqDetailsModal = function () {
    const modal = document.getElementById('req-details-modal');
    if (modal) modal.classList.remove('open');
    document.body.style.overflow = '';
  };

  function renderReqDetailsContent(req) {
    const indicationCodes = req.indication ? req.indication.split(',').map(s => s.trim()).filter(Boolean) : [];
    const indicationBadges = getIndicationBadges(req.indication, req.indicationOtherSpecify);
    const indicationDetailsHtml = renderIndicationDetails(req.indication, req.indicationOtherSpecify);
    const formattedPatientName = formatPatientName(req);
    const formattedBirthdate = formatBirthdate(req.patientBirthdate);
    const formattedPatientAddress = [
      req.patientPurok,
      req.patientBarangay,
      req.patientMunicipality,
      req.patientProvince
    ].filter(Boolean).join(' / ');
    const normalizedRequesterType = String(req.type ?? req.requesterType ?? '').trim().toUpperCase();
    const normalizedRequestCategory = String(req.requestCategory ?? '').trim().toUpperCase();
    const isHospitalRequest =
      normalizedRequesterType === 'HOSPITAL' ||
      !!(req.hospitalProfile || req.hospitalName || req.hospitalContactName || req.hospitalPhoneNumber);
    const showRequesterRelationship = !isHospitalRequest && normalizedRequestCategory === 'INPATIENT';
    const hospitalName = req.hospitalName ?? req.hospitalProfile?.hospitalName ?? req.name ?? '-';
    const hospitalContactName = req.hospitalContactName ?? req.hospitalProfile?.contactPersonName ?? req.requesterName ?? '-';
    const hospitalContactEmail = req.hospitalContactEmail ?? req.requesterEmail ?? req.hospitalProfile?.user?.email ?? '-';
    const hospitalPhoneNumber = req.hospitalPhoneNumber ?? req.hospitalProfile?.phoneNumber ?? req.hospitalProfile?.contactPersonPhone ?? req.requesterContact ?? '-';
    const hasRequesterInfo = [req.requesterName, req.requesterRelationship, req.requesterContact, req.requesterEmail]
      .some(value => value !== null && value !== undefined && String(value).trim() !== '');
    const hasStaffAuthorizationInfo =
      req.type === 'ANONYMOUS' &&
      [req.requesterStaffId, req.requesterStaffName, req.requesterStaffEmail, req.requesterStaffPhone]
        .some(value => value !== null && value !== undefined && String(value).trim() !== '');

    return `
      <div class="req-details-sections">
        
        <div class="req-details-section">
          <div class="req-details-section-title">Request Status</div>
          <div class="req-details-grid-2">
            <div class="req-details-field">
              <span class="req-details-label">Reference #</span>
              <span class="req-details-value">${req.referenceNumber ?? req.id ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Status</span>
              <span class="req-details-value">
                <span class="tag ${REQ_STATUS_TAG[req.status] ?? ''}">${REQ_STATUS_LABEL[req.status] ?? req.status}</span>
              </span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Urgency</span>
              <span class="req-details-value">
                <span class="tag ${REQ_URGENCY_TAG[req.urgency] ?? ''}">${req.urgency ?? '-'}</span>
              </span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Request Type</span>
              <span class="req-details-value">${req.requestType ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Submitted</span>
              <span class="req-details-value">${req.date ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Required By</span>
              <span class="req-details-value">${req.requiredBy ? formatDate(req.requiredBy) : '-'}</span>
            </div>
          </div>
        </div>

        <div class="req-details-section">
          <div class="req-details-section-title">Patient Information</div>
          <div class="req-details-grid-2">
            <div class="req-details-field">
              <span class="req-details-label">Patient Name</span>
              <span class="req-details-value">${formattedPatientName}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Age / Age Group</span>
              <span class="req-details-value">${req.patientAge ?? '-'} ${req.ageGroup ? `(${req.ageGroup})` : ''}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Sex</span>
              <span class="req-details-value">${req.patientSex ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Date of Birth</span>
              <span class="req-details-value">${formattedBirthdate}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Location (Ward)</span>
              <span class="req-details-value">${req.wardRoom ?? '-'}</span>
            </div><div class="req-details-field">
              <span class="req-details-label">Location (Room)</span>
              <span class="req-details-value">${req.roomNo ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Patient Address</span>
              <span class="req-details-value">${formattedPatientAddress || '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Category</span>
              <span class="req-details-value">${req.requestCategory ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Requesting Physician</span>
              <span class="req-details-value">${req.requestingPhysician ?? '-'}</span>
            </div>
          </div>
        </div>

        <div class="req-details-section">
          <div class="req-details-section-title">Blood Requirements</div>
          <div class="req-details-grid-2">
            <div class="req-details-field">
              <span class="req-details-label">Blood Type</span>
              <span class="req-details-value req-details-highlight">${req.bloodType ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Component</span>
              <span class="req-details-value">${req.component ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Units Needed</span>
              <span class="req-details-value req-details-highlight">${req.units ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Platelet Count</span>
              <span class="req-details-value">${req.plateletCount ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Notes</span>
              <span class="req-details-value">${req.notes ?? '-'}</span>
            </div>
          </div>
        </div>

        <div class="req-details-section">
          <div class="req-details-section-title">Transfusion Indications</div>
          ${indicationCodes.length > 0 ? `
            ${indicationBadges ? `
              <div style="margin-bottom:12px">
                <div class="req-indication-badges">
                  ${indicationBadges}
                </div>
              </div>
            ` : ''}
            <div style="font-size:13px;color:var(--charcoal);line-height:1.8;">
              ${indicationDetailsHtml}
            </div>
          ` : `<span class="req-details-value">Not specified</span>`}
        </div>

        <div class="req-details-section">
          <div class="req-details-section-title">Clinical Information</div>
          <div class="req-details-grid-2">
            <div class="req-details-field">
              <span class="req-details-label">Clinical Impression</span>
              <span class="req-details-value">${req.clinicalImpression ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Attending Physician</span>
              <span class="req-details-value">${req.attendingPhysician ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Contact Number</span>
              <span class="req-details-value">${req.contactNumber ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Hemoglobin (g/L)</span>
              <span class="req-details-value">${req.hemoglobin ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Hematocrit (%)</span>
              <span class="req-details-value">${req.hematocrit ? (req.hematocrit * 100).toFixed(1) : '-'}</span>
            </div>
          </div>
        </div>

        <div class="req-details-section">
          <div class="req-details-section-title">Transfusion History</div>
          <div class="req-details-grid-2">
            <div class="req-details-field">
              <span class="req-details-label">Previous Transfusion</span>
              <span class="req-details-value">${req.hadPreviousTransfusion ? 'Yes' : 'No'}</span>
            </div>
            ${req.hadPreviousTransfusion ? `
              <div class="req-details-field">
                <span class="req-details-label">Last Transfusion Date</span>
                <span class="req-details-value">${req.previousTransfusionDate ?? '-'}</span>
              </div>
              <div class="req-details-field">
                <span class="req-details-label">Units Transfused</span>
                <span class="req-details-value">${req.previousTransfusionUnits ?? '-'}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="req-details-section">
          <div class="req-details-section-title">Reaction History</div>
          <div class="req-details-grid-2">
            <div class="req-details-field">
              <span class="req-details-label">Previous Reaction</span>
              <span class="req-details-value">${req.hadPreviousReaction ? 'Yes' : 'No'}</span>
            </div>
            ${req.hadPreviousReaction ? `
              <div class="req-details-field">
                <span class="req-details-label">Reaction Date</span>
                <span class="req-details-value">${req.previousReactionDate ?? '-'}</span>
              </div>
              <div class="req-details-field">
                <span class="req-details-label">Reaction Details</span>
                <span class="req-details-value">${req.previousReactionDetails ?? '-'}</span>
              </div>
            ` : ''}
          </div>
        </div>

        ${isHospitalRequest ? `
          <div class="req-details-section">
            <div class="req-details-section-title">Hospital Information</div>
            <div class="req-details-grid-2">
              <div class="req-details-field">
                <span class="req-details-label">Hospital Name</span>
                <span class="req-details-value">${hospitalName}</span>
              </div>
              <div class="req-details-field">
                <span class="req-details-label">Contact Name</span>
                <span class="req-details-value">${hospitalContactName}</span>
              </div>
              <div class="req-details-field">
                <span class="req-details-label">Contact Email</span>
                <span class="req-details-value">${hospitalContactEmail}</span>
              </div>
              <div class="req-details-field">
                <span class="req-details-label">Phone Number</span>
                <span class="req-details-value">${hospitalPhoneNumber}</span>
              </div>
            </div>
          </div>
        ` : ''}

        ${(!isHospitalRequest || hasRequesterInfo) ? `
          <div class="req-details-section">
            <div class="req-details-section-title">Requester Information</div>
            <div class="req-details-grid-2">
              <div class="req-details-field">
                <span class="req-details-label">Requester Name</span>
                <span class="req-details-value">${req.requesterName ?? req.name ?? '-'}</span>
              </div>
              ${showRequesterRelationship ? `
              <div class="req-details-field">
                <span class="req-details-label">Relationship</span>
                <span class="req-details-value">${req.requesterRelationship ?? '-'}</span>
              </div>
              ` : ''}
              <div class="req-details-field">
                <span class="req-details-label">Contact</span>
                <span class="req-details-value">${req.requesterContact ?? '-'}</span>
              </div>
            </div>
          </div>
        ` : ''}

        ${hasStaffAuthorizationInfo ? `
          <div class="req-details-section">
            <div class="req-details-section-title">Staff Requestor Information</div>
            <div class="req-details-grid-2">
              <div class="req-details-field">
                <span class="req-details-label">Staff ID</span>
                <span class="req-details-value">${req.requesterStaffId ?? '-'}</span>
              </div>
              <div class="req-details-field">
                <span class="req-details-label">Staff Name</span>
                <span class="req-details-value">${req.requesterStaffName ?? '-'}</span>
              </div>
              <div class="req-details-field">
                <span class="req-details-label">Staff Email</span>
                <span class="req-details-value">${req.requesterStaffEmail ?? '-'}</span>
              </div>
              <div class="req-details-field">
                <span class="req-details-label">Phone Number</span>
                <span class="req-details-value">${req.requesterStaffPhone ?? '-'}</span>
              </div>
            </div>
          </div>
        ` : ''}

        ${['REJECTED', 'CANCELLED'].includes(req.status) && req.rejectionReason ? `
          <div class="req-details-section req-details-section-rejected">
            <div class="req-details-section-title" style="color: var(--crimson)">Resolution Note</div>
            <div class="req-details-value" style="color: var(--charcoal); line-height: 1.6;">${req.rejectionReason}</div>
          </div>
        ` : ''}

      </div>
    `;
  }

  reqFetchAll();
})();
/////// STAFF MANAGEMENT ////////

const STAFF_API = '/api/admin/staff';

let staffList = [];   // populated from API

let staffPage          = 1;
const STAFF_PER_PAGE   = 10;
let staffCurrentViewId = null;

/* ========================================
   API HELPERS
========================================== */

async function staffApiFetch(path, options = {}) {
  const res = await fetch(STAFF_API + path, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);
  return data;
}

async function staffLoadAll() {
  try {
    staffList = await staffApiFetch('');
    staffRender();
  } catch (err) {
    console.error('[Staff] load failed', err);
    staffShowToast('Failed to load staff list.', 'danger');
  }
}

/* ========================================
   HELPERS  (unchanged from original)
========================================== */

function staffFmtDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
}

function staffInitials(first, last) {
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || 'NA';
}

const STAFF_DEPARTMENTS = [
  'Blood Bank',
  'Emergency Room (ER)',
  'ICU',
  'Operating Room (OR)',
  'Medical Ward',
  'Surgical Ward',
  'Pediatric Ward',
  'Maternity Ward',
  'NICU',
  'Dialysis Unit',
  'Oncology Ward',
  'OPD'
];

const STAFF_NON_BLOOD_BANK_DEPARTMENTS = STAFF_DEPARTMENTS.filter((dept) => dept !== 'Blood Bank');
const STAFF_POSITION_UPPER_TOKENS = new Set(['RMT', 'RN', 'MD', 'ICU', 'ER', 'OR', 'OPD', 'NICU']);
const STAFF_ROMAN_NUMERALS = new Set(['I', 'II', 'III', 'IV', 'V']);

function renderStaffDepartmentOptions(selectId, includeAllOption = false) {
  const select = document.getElementById(selectId);
  if (!select) return;

  const current = select.value;
  const options = selectId === 'add-staff-custom-dept'
    ? STAFF_NON_BLOOD_BANK_DEPARTMENTS
    : STAFF_DEPARTMENTS;

  select.innerHTML = '';
  if (includeAllOption) {
    const allOpt = document.createElement('option');
    allOpt.value = 'ALL';
    allOpt.textContent = 'All Departments/ Wards';
    select.appendChild(allOpt);
  } else if (selectId === 'add-staff-custom-dept') {
    const placeholderOpt = document.createElement('option');
    placeholderOpt.value = '';
    placeholderOpt.textContent = 'Select department...';
    select.appendChild(placeholderOpt);
  }

  options.forEach((dept) => {
    const opt = document.createElement('option');
    opt.value = dept;
    opt.textContent = dept;
    select.appendChild(opt);
  });

  if (current) {
    if ([...select.options].some((opt) => opt.value === current)) {
      select.value = current;
    } else {
      select.value = includeAllOption ? 'ALL' : '';
    }
  } else if (includeAllOption) {
    select.value = 'ALL';
  }
}

function staffPopulateDepts() {
  renderStaffDepartmentOptions('staff-filter-dept', true);
  const editDept = document.getElementById('edit-staff-dept');
  if (editDept && editDept.options.length <= 1) {
    renderStaffDepartmentOptions('edit-staff-dept', false);
  }
  const addCustomDept = document.getElementById('add-staff-custom-dept');
  if (addCustomDept && addCustomDept.options.length <= 1) {
    renderStaffDepartmentOptions('add-staff-custom-dept', false);
  }
}

function staffTogglePass(inputId, icon) {
  const inp = document.getElementById(inputId);
  if (!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
  icon.style.opacity = inp.type === 'text' ? '1' : '0.5';
}

function escHtml(str) {
  return String(str ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function staffValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function setStaffFieldError(inputId, message) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(`${inputId}-error`);
  if (input) input.classList.add('field-error');
  if (errorEl) {
    errorEl.textContent = message || '';
    errorEl.style.display = message ? 'block' : 'none';
  }
  return false;
}

function clearStaffFieldError(inputId) {
  const input = document.getElementById(inputId);
  const errorEl = document.getElementById(`${inputId}-error`);
  if (input) input.classList.remove('field-error');
  if (errorEl) {
    errorEl.textContent = '';
    errorEl.style.display = 'none';
  }
  return true;
}

function focusStaffField(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return;
  try { el.focus(); } catch (_) {}
  if (typeof el.scrollIntoView === 'function') {
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

function normalizePersonName(value) {
  const cleaned = String(value || '')
    .replace(/[^A-Za-z .'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  return cleaned
    .split(' ')
    .map((word) => word.toLowerCase().replace(/(^|[-'.])[a-z]/g, (char) => char.toUpperCase()))
    .join(' ');
}

function normalizePositionTitle(value) {
  const cleaned = String(value || '')
    .replace(/[^A-Za-z0-9 .'-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (!cleaned) return '';

  return cleaned
    .split(' ')
    .map((word) => {
      const upper = word.toUpperCase();
      const plain = upper.replace(/[^A-Z0-9]/g, '');
      if (STAFF_POSITION_UPPER_TOKENS.has(plain) || STAFF_ROMAN_NUMERALS.has(plain)) {
        return upper;
      }
      return word.toLowerCase().replace(/(^|[-'.])[a-z]/g, (char) => char.toUpperCase());
    })
    .join(' ');
}

function applyStaffNameFormatting() {
  const nameFieldIds = ['add-staff-first', 'add-staff-last', 'edit-staff-first', 'edit-staff-last', 'staff-profile-firstname', 'staff-profile-lastname'];
  nameFieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.nameFormattingBound === '1') return;
    el.dataset.nameFormattingBound = '1';
    el.addEventListener('input', () => {
      el.value = String(el.value || '').replace(/[^A-Za-z .'-]/g, ' ').replace(/\s{2,}/g, ' ').slice(0, 25);
      clearStaffFieldError(id);
    });
    el.addEventListener('blur', () => {
      el.value = normalizePersonName(el.value).slice(0, 25);
      validateStaffNameField(id);
    });
  });
}

function applyStaffPositionFormatting() {
  const positionFieldIds = ['add-staff-position', 'edit-staff-position'];
  positionFieldIds.forEach((id) => {
    const el = document.getElementById(id);
    if (!el || el.dataset.positionFormattingBound === '1') return;
    el.dataset.positionFormattingBound = '1';
    el.addEventListener('blur', () => {
      el.value = normalizePositionTitle(el.value);
      validateStaffPositionField(id);
    });
  });
}

function validateStaffDepartment(selectId) {
  const select = document.getElementById(selectId);
  if (!select) return true;

  const selected = (select.value || '').trim();
  const allowed = selectId === 'add-staff-custom-dept'
    ? STAFF_NON_BLOOD_BANK_DEPARTMENTS
    : STAFF_DEPARTMENTS;

  if (!selected || !allowed.includes(selected)) {
    return setStaffFieldError(selectId, 'Please select a department.');
  }
  return clearStaffFieldError(selectId);
}

function validateStaffNameField(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return true;
  const value = normalizePersonName(el.value);
  el.value = value.slice(0, 25);
  let message = 'Please enter a valid name.';
  if (inputId.includes('first')) message = 'Please enter a valid first name.';
  if (inputId.includes('last')) message = 'Please enter a valid last name.';
  if (!value || !/^[A-Za-z][A-Za-z .'-]*$/.test(value)) {
    return setStaffFieldError(inputId, message);
  }
  return clearStaffFieldError(inputId);
}

function validateStaffPositionField(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return true;
  const value = normalizePositionTitle(el.value);
  el.value = value.slice(0, 25);
  if (!el.value) return clearStaffFieldError(inputId);
  if (!/^[A-Za-z0-9][A-Za-z0-9 .'-]*$/.test(el.value)) {
    return setStaffFieldError(inputId, 'Please enter a valid position.');
  }
  return clearStaffFieldError(inputId);
}

function normalizeStaffId(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .slice(0, 20)
    .trim();
}

function validateStaffIdField(inputId) {
  const el = document.getElementById(inputId);
  if (!el) return true;
  const raw = String(el.value || '').toUpperCase().replace(/[^A-Z0-9-]/g, '').trim();
  const normalized = raw.slice(0, 20);
  el.value = normalized;
  if (raw.length > 20) {
    return setStaffFieldError(inputId, 'Staff ID must not exceed 20 characters.');
  }
  return clearStaffFieldError(inputId);
}

function normalizeStaffUsername(value) {
  return String(value || '')
    .replace(/[^A-Za-z0-9 ._-]/g, '')
    .replace(/\s{2,}/g, ' ')
    .slice(0, 25);
}

function validateStaffProfileUsernameField() {
  const inputId = 'staff-profile-username';
  const el = document.getElementById(inputId);
  if (!el) return true;

  el.value = normalizeStaffUsername(el.value).trim();
  if (!el.value) {
    return setStaffFieldError(inputId, 'Username is required.');
  }
  if (el.value.length > 25) {
    return setStaffFieldError(inputId, 'Username must not exceed 25 characters.');
  }
  if (!/^[A-Za-z0-9][A-Za-z0-9 ._-]*$/.test(el.value)) {
    return setStaffFieldError(inputId, 'Username may only contain letters, numbers, spaces, dots, underscores, and hyphens.');
  }
  return clearStaffFieldError(inputId);
}

function staffHasDashboardAccess(staff) {
  return staff.hasDashboardAccess === true || staff.userId != null;
}

function staffAccessStatus(staff) {
  return staff.accountAccessStatus || (staffHasDashboardAccess(staff) ? 'Dashboard Access' : 'Request Code Only');
}

function staffCodeLabel(staff) {
  if (staff.codeStatus && staff.codeStatus !== 'Active') return staff.codeStatus;
  return staff.maskedUniqueCode || 'Code Active';
}

function staffToggleDepartmentInput() {
  const choice = document.getElementById('add-staff-dept-choice')?.value || 'Blood Bank';
  const wrap = document.getElementById('add-staff-custom-dept-wrap');
  const custom = document.getElementById('add-staff-custom-dept');
  const note = document.getElementById('add-staff-access-note');
  const isOther = choice === 'Others';

  if (wrap) wrap.style.display = isOther ? 'flex' : 'none';
  if (custom) {
    custom.required = isOther;
    if (!isOther) {
      custom.value = '';
      clearStaffFieldError('add-staff-custom-dept');
    }
  }
  if (note) {
    note.innerHTML = isOther
      ? `<span style="font-size:15px;flex-shrink:0">i</span> Other department staff receive a staff authorization code only and cannot log in to the dashboard.`
      : `<span style="font-size:15px;flex-shrink:0">i</span> Blood Bank staff receive dashboard credentials and a staff authorization code.`;
  }
}

function staffGetAddDepartment() {
  const choice = document.getElementById('add-staff-dept-choice')?.value || 'Blood Bank';
  if (choice === 'Blood Bank') return 'Blood Bank';
  return document.getElementById('add-staff-custom-dept')?.value || '';
}

const staffPhoneBindings = new Set();

function bindStaffPhoneInput(inputId) {
  if (staffPhoneBindings.has(inputId)) return;
  staffPhoneBindings.add(inputId);

  const input = document.getElementById(inputId);
  if (!input) return;

  input.addEventListener('focus', () => {
    if (!input.value.trim()) {
      input.value = '+63';
    } else {
      lockPhilippinePhoneInput(inputId);
    }
    const pos = input.value.length;
    if (typeof input.setSelectionRange === 'function') {
      try { input.setSelectionRange(pos, pos); } catch (_) {}
    }
  });

  input.addEventListener('input', () => {
    lockPhilippinePhoneInput(inputId);
    const pos = input.value.length;
    if (typeof input.setSelectionRange === 'function') {
      try { input.setSelectionRange(pos, pos); } catch (_) {}
    }
  });

  input.addEventListener('blur', () => {
    lockPhilippinePhoneInput(inputId);
  });

  input.addEventListener('keydown', (event) => {
    const selectionStart = input.selectionStart ?? 0;
    const selectionEnd = input.selectionEnd ?? 0;
    const isBackspace = event.key === 'Backspace';
    const isDelete = event.key === 'Delete';

    if ((isBackspace && selectionStart <= 3) || (isDelete && selectionStart < 3)) {
      event.preventDefault();
    }
    if (event.key.length === 1 && !/\d/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();
    }
    if (event.key.length === 1 && /\d/.test(event.key)) {
      const localDigits = input.value.slice(3).replace(/\D/g, '');
      const selectedPrefix = input.value.slice(selectionStart, selectionEnd);
      const selectedLocalDigits = selectedPrefix.replace(/\D/g, '');
      if (localDigits.length - selectedLocalDigits.length >= 10) {
        event.preventDefault();
      }
    }
  });
}

function bindAddStaffPhoneInput() {
  bindStaffPhoneInput('add-staff-phone');
}

function bindEditStaffPhoneInput() {
  bindStaffPhoneInput('edit-staff-phone');
}

function bindStaffProfilePhoneInput() {
  bindStaffPhoneInput('staff-profile-phone');
}

function validateStaffProfilePhoneField(focusInvalid = false) {
  const normalizedPhone = lockPhilippinePhoneInput('staff-profile-phone');
  const phoneDigits = normalizedPhone.slice(3).replace(/\D/g, '');

  if (phoneDigits.length > 0 && phoneDigits.length !== 10) {
    setStaffFieldError('staff-profile-phone', 'Phone number must start with +63 followed by exactly 10 digits.');
    if (focusInvalid) focusStaffField('staff-profile-phone');
    return false;
  }

  clearStaffFieldError('staff-profile-phone');
  return true;
}

function staffCloseModals(exceptId = null) {
  ['addStaffModal', 'editStaffModal', 'viewStaffModal', 'deleteStaffModal', 'sysDeleteConfirmModal']
    .forEach(id => {
      if (id !== exceptId) closeModal(id);
    });
}

/* ========================================
   SUMMARY STRIP
========================================== */

function staffUpdateStrip() {
  const dashboardAccess = staffList.filter(staffHasDashboardAccess).length;
  const codeOnly = staffList.length - dashboardAccess;
  document.getElementById('staff-active-count').textContent   = dashboardAccess;
  document.getElementById('staff-inactive-count').textContent = codeOnly;
  document.getElementById('staff-total-count').textContent    = staffList.length;
}

/* ========================================
   RENDER TABLE  (unchanged logic, data now from API)
========================================== */

function staffGetFiltered() {
  const q      = (document.getElementById('staff-search')?.value || '').toLowerCase();
  const dept   = document.getElementById('staff-filter-dept')?.value   || 'ALL';
  const status = document.getElementById('staff-filter-status')?.value || 'ALL';
  const sort   = document.getElementById('staff-sort')?.value          || 'name_asc';

  let list = staffList.filter(s => {
    const fullName = (s.firstName + ' ' + s.lastName).toLowerCase();
    const matchQ = !q || fullName.includes(q)
                    || (s.staffId || '').toLowerCase().includes(q)
                    || (s.department || '').toLowerCase().includes(q)
                    || (s.position || '').toLowerCase().includes(q)
                    || (s.email || '').toLowerCase().includes(q);
    const matchD = dept   === 'ALL' || s.department === dept;
    const hasAccess = staffHasDashboardAccess(s);
    const matchS = status === 'ALL'
                    || (status === 'dashboard' && hasAccess)
                    || (status === 'code-only' && !hasAccess);
    return matchQ && matchD && matchS;
  });

  list.sort((a, b) => {
    switch (sort) {
      case 'name_desc': return (b.lastName + b.firstName).localeCompare(a.lastName + a.firstName);
      case 'hire_desc': return (b.hireDate || '').localeCompare(a.hireDate || '');
      case 'hire_asc':  return (a.hireDate || '').localeCompare(b.hireDate || '');
      case 'dept':      return (a.department || '').localeCompare(b.department || '');
      default:          return (a.lastName + a.firstName).localeCompare(b.lastName + b.firstName);
    }
  });
  return list;
}

function staffRender() {
  staffPopulateDepts();
  staffUpdateStrip();

  const filtered = staffGetFiltered();
  const total    = filtered.length;
  const pages    = Math.max(1, Math.ceil(total / STAFF_PER_PAGE));
  if (staffPage > pages) staffPage = pages;

  const start = (staffPage - 1) * STAFF_PER_PAGE;
  const slice = filtered.slice(start, start + STAFF_PER_PAGE);

  const tbody   = document.getElementById('staff-tbody');
  const empty   = document.getElementById('staff-empty');
  const showing = document.getElementById('staff-showing');
  const info    = document.getElementById('staff-results-info');

  if (!total) {
    tbody.innerHTML = '';
    empty.style.display = 'block';
    showing.textContent = 'No results';
    if (info) info.textContent = '';
  } else {
    empty.style.display = 'none';
    showing.textContent  = `Showing ${start + 1}-${Math.min(start + STAFF_PER_PAGE, total)} of ${total}`;
    if (info) info.textContent = `${total} staff found`;
  }

  tbody.innerHTML = slice.map(s => {
    const initials  = staffInitials(s.firstName, s.lastName);
    const hasAccess = staffHasDashboardAccess(s);
    const accessTag = hasAccess
      ? `<span class="tag tag-active">Dashboard Access</span>`
      : `<span class="tag tag-inactive">Request Code Only</span>`;

    return `
      <tr>
        <td>
          <div style="display:flex;align-items:center;gap:10px">
            <div style="width:34px;height:34px;border-radius:50%;background:var(--soft-red);
                flex-shrink:0;display:flex;align-items:center;justify-content:center;
                font-size:12px;font-weight:700;color:var(--crimson)">${initials}</div>
            <div>
              <div style="font-weight:600;font-size:13px">${escHtml(s.firstName)} ${escHtml(s.lastName)}</div>
              <div style="font-size:11px;color:var(--muted)">${escHtml(s.email)}</div>
            </div>
          </div>
        </td>
        <td style="font-family:monospace;font-size:12px">${escHtml(s.staffId || '-')}</td>
        <td style="font-size:12px">${escHtml(s.department || '-')}</td>
        <td style="font-size:12px">${escHtml(s.position || '-')}</td>
        <td style="font-size:12px;color:var(--muted)">${escHtml(s.phoneNumber || '-')}</td>
        <td>${accessTag}</td>
        <td style="font-family:monospace;font-size:12px">${escHtml(staffCodeLabel(s))}</td>
        <td>
          <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
            <button class="btn-ghost" style="font-size:12px;padding:5px 10px"
              onclick="staffOpenView(${s.id})">View</button>
            <button class="btn-ghost" style="font-size:12px;padding:5px 10px"
              onclick="staffOpenEdit(${s.id})">Edit</button>
            <button class="btn-ghost" style="font-size:12px;padding:5px 10px"
              onclick="staffRegenerateCode(${s.id})">Regenerate Code</button>
            <button class="btn-danger" style="font-size:12px;padding:5px 10px"
              onclick="staffOpenDelete(${s.id})">Delete</button>
          </div>
        </td>
      </tr>`;
  }).join('');

  document.getElementById('staff-page-label').textContent = `Page ${staffPage} / ${pages}`;
  document.getElementById('staff-prev').disabled = staffPage <= 1;
  document.getElementById('staff-next').disabled = staffPage >= pages;
}

function staffPrevPage() { if (staffPage > 1) { staffPage--; staffRender(); } }
function staffNextPage() {
  const pages = Math.max(1, Math.ceil(staffGetFiltered().length / STAFF_PER_PAGE));
  if (staffPage < pages) { staffPage++; staffRender(); }
}

/* ========================================
   ADD STAFF  -> POST /api/admin/staff
========================================== */

function openAddStaffModal() {
  staffCloseModals('addStaffModal');
  staffCurrentViewId = null;
  staffPopulateDepts();
  ['add-staff-email','add-staff-first','add-staff-last',
   'add-staff-phone','add-staff-position','add-staff-custom-dept'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const deptChoice = document.getElementById('add-staff-dept-choice');
  if (deptChoice) deptChoice.value = 'Blood Bank';

  staffHideError('add-staff-error');
  staffToggleDepartmentInput();
  ['add-staff-first', 'add-staff-last', 'add-staff-position', 'add-staff-custom-dept']
    .forEach((id) => clearStaffFieldError(id));
  const phoneEl = document.getElementById('add-staff-phone');
  if (phoneEl) phoneEl.value = '+63';
  openModal('addStaffModal');
}

function staffPreviewPassword() {
  staffToggleDepartmentInput();
}

async function submitAddStaff() {
  staffHideError('add-staff-error');
  const email    = document.getElementById('add-staff-email').value.trim();
  const firstInput = document.getElementById('add-staff-first');
  const lastInput = document.getElementById('add-staff-last');
  const normalizedPhone = lockPhilippinePhoneInput('add-staff-phone');
  const phoneDigits = normalizedPhone.slice(3).replace(/\D/g, '');
  const phone = phoneDigits.length === 10 ? normalizedPhone : null;
  const dept     = staffGetAddDepartment();
  const positionInput = document.getElementById('add-staff-position');
  const customDeptInput = document.getElementById('add-staff-custom-dept');
  if (firstInput) firstInput.value = normalizePersonName(firstInput.value).slice(0, 25);
  if (lastInput) lastInput.value = normalizePersonName(lastInput.value).slice(0, 25);
  if (positionInput) positionInput.value = normalizePositionTitle(positionInput.value).slice(0, 25);
  const first = firstInput?.value || '';
  const last = lastInput?.value || '';
  const position = positionInput?.value || '';
  const isOtherDepartment = document.getElementById('add-staff-dept-choice')?.value === 'Others';

  let hasInlineError = false;
  if (!validateStaffNameField('add-staff-first')) hasInlineError = true;
  if (!validateStaffNameField('add-staff-last')) hasInlineError = true;
  if (!validateStaffPositionField('add-staff-position')) hasInlineError = true;
  if (isOtherDepartment) {
    if (!validateStaffDepartment('add-staff-custom-dept')) hasInlineError = true;
  } else {
    clearStaffFieldError('add-staff-custom-dept');
  }
  if (hasInlineError || !dept) return;

  if (!email) {
    staffShowError('add-staff-error', 'Email is required.');
    return;
  }
  if (!staffValidEmail(email)) {
    staffShowError('add-staff-error', 'Please enter a valid email address.');
    return;
  }
  if (phoneDigits.length > 0 && phoneDigits.length !== 10) {
    staffShowError('add-staff-error', 'Phone number must start with +63 followed by exactly 10 digits.');
    return;
  }
  if (customDeptInput) customDeptInput.value = dept;

  const btn = document.getElementById('add-staff-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Adding...'; }

  try {
    const created = await staffApiFetch('', {
      method: 'POST',
      body: JSON.stringify({ email, firstName: first, lastName: last, phoneNumber: phone,
                             department: dept, position }),
    });

    staffList.unshift(created);   // optimistic: prepend to local list
    closeModal('addStaffModal');
    staffRender();
    
    // Show success modal
    showSysSuccessModal(
      'Staff Added',
      created.hasDashboardAccess
        ? `Dashboard credentials and authorization code have been emailed to ${first} ${last}.`
        : `Authorization code has been emailed to ${first} ${last}.`
    );
  } catch (err) {
    staffShowError('add-staff-error', err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Add Staff'; }
  }
}

/* ========================================
   VIEW STAFF  (read-only modal - no API call needed)
========================================== */

function staffOpenView(id) {
  const s = staffList.find(x => x.id === id);
  if (!s) return;
  staffCloseModals('viewStaffModal');
  staffCurrentViewId = id;

  document.getElementById('view-staff-id-label').textContent       = s.staffId || '';
  document.getElementById('view-staff-avatar').textContent         = staffInitials(s.firstName, s.lastName);
  document.getElementById('view-staff-name').textContent           = `${s.firstName} ${s.lastName}`;
  document.getElementById('view-staff-position-label').textContent =
    [s.position, s.department].filter(Boolean).join(' . ') || '-';
  document.getElementById('view-staff-staffid').textContent  = s.staffId     || '-';
  document.getElementById('view-staff-dept').textContent     = s.department  || '-';
  document.getElementById('view-staff-phone').textContent    = s.phoneNumber || '-';
  // document.getElementById('view-staff-hiredate').textContent = staffFmtDate(s.hireDate);
  document.getElementById('view-staff-email').textContent    = s.email;
  document.getElementById('view-staff-access').textContent   = staffAccessStatus(s);
  document.getElementById('view-staff-code').textContent     = staffCodeLabel(s);
  document.getElementById('view-staff-created').textContent  = staffFmtDate(s.createdAt);

  const badge = document.getElementById('view-staff-status-badge');
  badge.innerHTML = staffHasDashboardAccess(s)
    ? `<span class="tag tag-active">Dashboard Access</span>`
    : `<span class="tag tag-inactive">Request Code Only</span>`;

  openModal('viewStaffModal');
}

function staffOpenEditFromView() {
  closeModal('viewStaffModal');
  staffOpenEdit(staffCurrentViewId);
}

/* ========================================
   EDIT STAFF  -> PUT /api/admin/staff/{id}
========================================== */

function staffOpenEdit(id) {
  const s = staffList.find(x => x.id === id);
  if (!s) return;
  staffCloseModals('editStaffModal');
  staffCurrentViewId = id;

  document.getElementById('edit-staff-subtitle').textContent = s.staffId || s.email;
  document.getElementById('edit-staff-first').value          = s.firstName;
  document.getElementById('edit-staff-last').value           = s.lastName;
  document.getElementById('edit-staff-phone').value          = s.phoneNumber || '';
  document.getElementById('edit-staff-id').value             = s.staffId     || '';
  renderStaffDepartmentOptions('edit-staff-dept', false);
  const editDeptInput = document.getElementById('edit-staff-dept');
  if (editDeptInput) {
    editDeptInput.value = STAFF_DEPARTMENTS.includes(s.department) ? s.department : '';
  }
  document.getElementById('edit-staff-position').value       = s.position    || '';
  document.getElementById('edit-staff-status').value         = s.status || 'active';
  document.getElementById('edit-staff-password').value       = '';
  document.getElementById('edit-staff-target-id').value      = id;
  const editPhoneEl = document.getElementById('edit-staff-phone');
  if (editPhoneEl && !editPhoneEl.value.trim()) {
    editPhoneEl.value = '+63';
  } else {
    lockPhilippinePhoneInput('edit-staff-phone');
  }
  const editStaffIdEl = document.getElementById('edit-staff-id');
  if (editStaffIdEl) {
    editStaffIdEl.value = normalizeStaffId(editStaffIdEl.value);
  }

  const hasAccess = staffHasDashboardAccess(s);
  const statusWrap = document.getElementById('edit-staff-status-wrap');
  const passwordTitle = document.getElementById('edit-staff-password-title');
  const passwordRow = document.getElementById('edit-staff-password-row');
  if (statusWrap) statusWrap.style.display = hasAccess ? '' : 'none';
  if (passwordTitle) passwordTitle.style.display = hasAccess ? '' : 'none';
  if (passwordRow) passwordRow.style.display = hasAccess ? 'flex' : 'none';

  staffHideError('edit-staff-error');
  ['edit-staff-first', 'edit-staff-last', 'edit-staff-position', 'edit-staff-dept']
    .forEach((id) => clearStaffFieldError(id));
  openModal('editStaffModal');
}

async function submitEditStaff() {
  staffHideError('edit-staff-error');
  const id       = parseInt(document.getElementById('edit-staff-target-id').value);
  const firstInput = document.getElementById('edit-staff-first');
  const lastInput = document.getElementById('edit-staff-last');
  const normalizedPhone = lockPhilippinePhoneInput('edit-staff-phone');
  const phoneDigits = normalizedPhone.slice(3).replace(/\D/g, '');
  const phone = phoneDigits.length === 10 ? normalizedPhone : null;
  const staffIdInput = document.getElementById('edit-staff-id');
  if (staffIdInput) staffIdInput.value = normalizeStaffId(staffIdInput.value);
  const staffId  = staffIdInput?.value || '';
  const deptInput = document.getElementById('edit-staff-dept');
  const positionInput = document.getElementById('edit-staff-position');
  if (firstInput) firstInput.value = normalizePersonName(firstInput.value).slice(0, 25);
  if (lastInput) lastInput.value = normalizePersonName(lastInput.value).slice(0, 25);
  if (positionInput) positionInput.value = normalizePositionTitle(positionInput.value).slice(0, 25);
  const first = firstInput?.value || '';
  const last = lastInput?.value || '';
  const dept = deptInput?.value || '';
  const position = positionInput?.value || '';
  const status   = document.getElementById('edit-staff-status').value;
  const password = document.getElementById('edit-staff-password').value;
  const current  = staffList.find(s => s.id === id);
  const hasAccess = staffHasDashboardAccess(current || {});

  const validators = [
    ['edit-staff-first', () => validateStaffNameField('edit-staff-first')],
    ['edit-staff-last', () => validateStaffNameField('edit-staff-last')],
    ['edit-staff-position', () => validateStaffPositionField('edit-staff-position')],
    ['edit-staff-dept', () => validateStaffDepartment('edit-staff-dept')]
  ];

  let firstInvalidId = '';
  validators.forEach(([fieldId, validate]) => {
    const valid = validate();
    if (!valid && !firstInvalidId) firstInvalidId = fieldId;
  });

  if (!first || !last || !dept) {
    if (!firstInvalidId) {
      firstInvalidId = !first ? 'edit-staff-first' : (!last ? 'edit-staff-last' : 'edit-staff-dept');
    }
  }
  if (firstInvalidId) {
    focusStaffField(firstInvalidId);
    return;
  }

  if (phoneDigits.length > 0 && phoneDigits.length !== 10) {
    staffShowError('edit-staff-error', 'Phone number must start with +63 followed by exactly 10 digits.');
    focusStaffField('edit-staff-phone');
    return;
  }

  const trimmedPassword = (password || '').trim();
  if (password && !trimmedPassword) {
    staffShowError('edit-staff-error', 'Password must be at least 8 characters.');
    focusStaffField('edit-staff-password');
    return;
  }
  if (hasAccess && trimmedPassword && trimmedPassword.length < 8) {
    staffShowError('edit-staff-error', 'Password must be at least 8 characters.');
    focusStaffField('edit-staff-password');
    return;
  }

  const btn = document.getElementById('edit-staff-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving...'; }

  try {
    const updated = await staffApiFetch(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ firstName: first, lastName: last, phoneNumber: phone,
                             staffId: staffId || null,
                             department: dept, position,
                             status: hasAccess ? status : null,
                             newPassword: hasAccess ? (trimmedPassword || null) : null }),
    });

    // Replace local copy
    const idx = staffList.findIndex(s => s.id === id);
    if (idx !== -1) staffList[idx] = updated;

    closeModal('editStaffModal');
    staffRender();
    
    // Show success modal
    showSysSuccessModal(
      'Profile Updated',
      `${first} ${last}'s profile has been successfully updated.`
    );
  } catch (err) {
    staffShowError('edit-staff-error', err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
  }
}

/* ========================================
   DELETE STAFF  -> DELETE /api/admin/staff/{id}
========================================== */

function staffOpenDelete(id) {
  const s = staffList.find(x => x.id === id);
  if (!s) return;
  staffCloseModals();
  staffCurrentViewId = id;
  
  // Show delete confirmation modal using the reusable system modal
  showSysDeleteConfirmModal(
    'Staff Account',
    `${s.firstName} ${s.lastName}`,
    `${s.staffId || s.email}`,
    staffConfirmDelete
  );
}

function staffOpenDeleteConfirm() {
  closeModal('viewStaffModal');
  staffOpenDelete(staffCurrentViewId);
}

async function staffConfirmDelete() {
  const id  = staffCurrentViewId;
  const s   = staffList.find(x => x.id === id);
  const name = s ? `${s.firstName} ${s.lastName}` : 'Staff member';

  try {
    await staffApiFetch(`/${id}`, { method: 'DELETE' });
    staffList = staffList.filter(x => x.id !== id);
    staffRender();
    
    // Show success modal for delete
    showSysSuccessModal(
      'Account Deleted',
      `${name}'s account has been permanently deleted.`
    );
  } catch (err) {
    staffShowToast(`Delete failed: ${err.message}`, 'danger');
  }
}

/* ========================================
   TOGGLE STATUS  -> PATCH /api/admin/staff/{id}/toggle-status
========================================== */

async function staffRegenerateCode(id) {
  const s = staffList.find(x => x.id === id);
  if (!s) return;

  const name = `${s.firstName} ${s.lastName}`;
  if (!confirm(`Generate a new staff authorization code for ${name}? The previous code will no longer be used.`)) {
    return;
  }

  try {
    const result = await staffApiFetch(`/${id}/regenerate-code`, { method: 'POST' });
    await staffLoadAll();
    staffShowToast(
      result.message || 'New staff authorization code generated and emailed successfully.',
      'success'
    );
  } catch (err) {
    staffShowToast(`Code regeneration failed: ${err.message}`, 'danger');
  }
}

async function staffToggleStatus(id) {
  const s = staffList.find(x => x.id === id);
  if (!s) return;

  try {
    const updated = await staffApiFetch(`/${id}/toggle-status`, { method: 'PATCH' });
    const idx = staffList.findIndex(x => x.id === id);
    if (idx !== -1) staffList[idx] = updated;
    staffRender();
    staffShowToast(
      `${updated.firstName} ${updated.lastName} is now ${updated.status}.`,
      updated.status === 'active' ? 'success' : 'warn'
    );
  } catch (err) {
    staffShowToast(`Status toggle failed: ${err.message}`, 'danger');
  }
}

/* ========================================
   TOAST  (unchanged)
========================================== */

function staffShowToast(msg, type = 'success') {
  if (typeof showToast === 'function') { showToast(msg, type); return; }

  const colors = {
    success: { bg:'var(--green-light)',  border:'rgba(22,163,74,.25)',  color:'var(--green)'   },
    danger:  { bg:'var(--soft-red)',     border:'rgba(196,30,58,.25)',  color:'var(--crimson)' },
    warn:    { bg:'var(--amber-light)',  border:'rgba(179,92,0,.25)',   color:'var(--amber)'   },
    info:    { bg:'#E8F0FF',             border:'rgba(59,130,246,.25)', color:'var(--blue)'    },
  };
  const c = colors[type] || colors.info;

  let container = document.getElementById('staff-toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'staff-toast-container';
    container.style.cssText = 'position:fixed;bottom:28px;right:28px;z-index:9999;display:flex;flex-direction:column;gap:8px;pointer-events:none';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `background:${c.bg};border:1px solid ${c.border};color:${c.color};
    border-radius:10px;padding:11px 18px;font-size:13px;font-weight:600;
    font-family:'DM Sans',sans-serif;pointer-events:auto;max-width:320px;line-height:1.4;
    animation:staffToastIn .22s ease;`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity .3s';
    setTimeout(() => toast.remove(), 320);
  }, 3200);
}

(function injectToastStyle() {
  if (document.getElementById('staff-toast-style')) return;
  const s = document.createElement('style');
  s.id = 'staff-toast-style';
  s.textContent = `@keyframes staffToastIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}`;
  document.head.appendChild(s);
})();

/* ========================================
   ERROR HELPERS  (unchanged)
========================================== */

function staffShowError(elId, msg) {
  const el = document.getElementById(elId);
  if (!el) return;
  el.textContent  = msg;
  el.style.display = 'flex';
}

function staffHideError(elId) {
  const el = document.getElementById(elId);
  if (el) el.style.display = 'none';
}

/* ========================================
   INIT  - fetch from API instead of using mock array
========================================== */

function initStaffPanel() {
  staffPage = 1;
  staffPopulateDepts();
  bindAddStaffPhoneInput();
  bindEditStaffPhoneInput();
  applyStaffNameFormatting();
  applyStaffPositionFormatting();

  const addDeptChoice = document.getElementById('add-staff-dept-choice');
  if (addDeptChoice && addDeptChoice.dataset.staffDeptBound !== '1') {
    addDeptChoice.dataset.staffDeptBound = '1';
    addDeptChoice.addEventListener('change', () => staffToggleDepartmentInput());
  }

  const addCustomDept = document.getElementById('add-staff-custom-dept');
  if (addCustomDept && addCustomDept.dataset.staffCustomDeptBound !== '1') {
    addCustomDept.dataset.staffCustomDeptBound = '1';
    addCustomDept.addEventListener('change', () => validateStaffDepartment('add-staff-custom-dept'));
  }

  const editDept = document.getElementById('edit-staff-dept');
  if (editDept && editDept.dataset.staffEditDeptBound !== '1') {
    editDept.dataset.staffEditDeptBound = '1';
    editDept.addEventListener('change', () => validateStaffDepartment('edit-staff-dept'));
  }
}

document.addEventListener('DOMContentLoaded', initStaffPanel);

///////// HOSPITAL PANEL/////////////

const HOSPITAL_API = '/api/admin/hospitals';

let hospData = [];
let hospPage = 1;
const hospPerPage = 5;
let hospCreateValidationBound = false;
let hospEditValidationBound = false;

document.addEventListener('DOMContentLoaded', () => {
    hospLoadAll();
    initHospitalCreateValidation();
    initHospitalEditValidation();
});

async function hospLoadAll() {
    try {
        const res = await fetch(HOSPITAL_API);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        hospData = await res.json();
        hospPage = 1;
        hospRender();
    } catch (err) {
        console.error('[Hospital] Load failed:', err);
        hospData = [];
        hospRender();
    }
}

// FILTER & SORT
function hospFiltered() {
    const q = document.getElementById('hosp-search')?.value.toLowerCase() || '';
    const statusFilter = (document.getElementById('hosp-filter-status')?.value || 'ALL').toLowerCase();
    const sort = document.getElementById('hosp-sort')?.value || 'name_asc';
    
    let list = hospData.filter(h => {
        const status = String(h.status || 'active').toLowerCase();
        const matchQ = !q || 
            h.hospitalName.toLowerCase().includes(q) || 
            h.city.toLowerCase().includes(q) || 
            h.email.toLowerCase().includes(q);
        const matchStatus = statusFilter === 'ALL'.toLowerCase() || status === statusFilter;
        return matchQ && matchStatus;
    });
    
    if (sort === 'name_asc') list.sort((a, b) => a.hospitalName.localeCompare(b.hospitalName));
    else if (sort === 'name_desc') list.sort((a, b) => b.hospitalName.localeCompare(a.hospitalName));
    else if (sort === 'requests_desc') list.sort((a, b) => (b.requestCount || 0) - (a.requestCount || 0));
    
    return list;
}

// RENDER TABLE
function hospRender() {
    const list = hospFiltered();
    const total = list.length;
    const pages = Math.max(1, Math.ceil(total / hospPerPage));
    
    if (hospPage > pages) hospPage = pages;
    
    const slice = list.slice((hospPage - 1) * hospPerPage, hospPage * hospPerPage);
    const tbody = document.getElementById('hosp-tbody');
    
    if (!tbody) return;
    
    tbody.innerHTML = '';
    
    const emptyEl = document.getElementById('hosp-empty');
    if (emptyEl) emptyEl.style.display = slice.length ? 'none' : 'block';
    
    slice.forEach((h) => {
        const status = String(h.status || 'active').toLowerCase();
        const statusBadge = status === 'inactive'
            ? '<span class="tag tag-inactive">Inactive</span>'
            : '<span class="tag tag-active">Active</span>';
        const row = `<tr>
            <td><strong>${h.hospitalName}</strong></td>
            <td style="font-size:12px;color:var(--muted)">${h.city}<br>${h.province}</td>
            <td style="font-size:12px;color:var(--muted)">${h.email}</td>
            <td style="font-size:12px;color:var(--muted)">${h.phoneNumber || '-'}</td>
            <td style="font-weight:700">${h.requestCount || 0}</td>
            <td>${statusBadge}</td>
            <td>
                <div style="display:flex;gap:6px">
                    <button class="btn-ghost" style="font-size:12px" onclick="openHospitalViewModal(${h.id})">View</button>
                    <button class="btn-ghost" style="font-size:12px" onclick="hospOpenEdit(${h.id})">Edit</button>
                    <button class="btn-danger" onclick="hospConfirmDelete(${h.id})">Delete</button>
                </div>
            </td>
        </tr>`;
        tbody.innerHTML += row;
    });
    
    // Update pagination info
    const start = (hospPage - 1) * hospPerPage + 1;
    const end = Math.min(hospPage * hospPerPage, total);
    
    const resultsEl = document.getElementById('hosp-results-info');
    if (resultsEl) resultsEl.textContent = total + ' hospital' + (total !== 1 ? 's' : '');
    
    const showingEl = document.getElementById('hosp-showing');
    if (showingEl) {
        showingEl.textContent = total ? `Showing ${start}-${end} of ${total}` : 'No results';
    }
    
    const pageEl = document.getElementById('hosp-page-label');
    if (pageEl) pageEl.textContent = `Page ${hospPage} / ${pages}`;
    
    const prevBtn = document.getElementById('hosp-prev');
    if (prevBtn) prevBtn.disabled = hospPage <= 1;
    
    const nextBtn = document.getElementById('hosp-next');
    if (nextBtn) nextBtn.disabled = hospPage >= pages;
    
    hospUpdateStats();
}

// ??????????????????????????????????????????????????????????????????????????
// UPDATE STATS
// ??????????????????????????????????????????????????????????????????????????
function hospUpdateStats() {
    const total = hospData.length;
    const totalReqs = hospData.reduce((s, h) => s + (h.requestCount || 0), 0);
    const activeCount = hospData.filter(h => String(h.status || 'active').toLowerCase() !== 'inactive').length;
    const inactiveCount = total - activeCount;
    
    const activeEl = document.getElementById('hosp-active-count');
    if (activeEl) activeEl.textContent = activeCount;
    
    const inactiveEl = document.getElementById('hosp-inactive-count');
    if (inactiveEl) inactiveEl.textContent = inactiveCount;
    
    const totalEl = document.getElementById('hosp-total-count');
    if (totalEl) totalEl.textContent = total;
    
    const reqsEl = document.getElementById('hosp-requests-count');
    if (reqsEl) reqsEl.textContent = totalReqs;
}

// ??????????????????????????????????????????????????????????????????????????
// PAGINATION
// ??????????????????????????????????????????????????????????????????????????
function hospPrevPage() {
    if (hospPage > 1) {
        hospPage--;
        hospRender();
    }
}

function hospNextPage() {
    const pages = Math.ceil(hospFiltered().length / hospPerPage);
    if (hospPage < pages) {
        hospPage++;
        hospRender();
    }
}

const HOSPITAL_VIEW_STATUS_ORDER = [
    'PENDING',
    'NEEDS_CONFIRMATION',
    'APPROVED',
    'ALLOCATED',
    'READY_FOR_RELEASE',
    'RELEASED',
];
const HOSPITAL_VIEW_ACTIVE_STATUS = new Set([
    'PENDING',
    'NEEDS_CONFIRMATION',
    'APPROVED',
    'ALLOCATED',
    'READY_FOR_RELEASE',
]);
const HOSPITAL_VIEW_STATUS_META = {
    PENDING:            { label: 'Pending',            tagClass: 'tag-pending' },
    NEEDS_CONFIRMATION: { label: 'Needs Confirmation', tagClass: 'tag-needs-confirmation' },
    APPROVED:           { label: 'Approved',           tagClass: 'tag-approved' },
    ALLOCATED:          { label: 'Allocated',          tagClass: 'tag-allocated' },
    READY_FOR_RELEASE:  { label: 'Ready for Release',  tagClass: 'tag-ready' },
    RELEASED:           { label: 'Released',           tagClass: 'tag-released' },
    REJECTED:           { label: 'Rejected',           tagClass: 'tag-rejected' },
    CANCELLED:          { label: 'Cancelled',          tagClass: 'tag-inactive' },
};
let hospitalViewCurrentId = null;
let hospitalViewCurrentData = null;

function hospitalViewSafeText(value, fallback = 'Not Available') {
    if (value === null || value === undefined) return fallback;
    const text = String(value).trim();
    return text ? text : fallback;
}

function hospitalViewFormatDate(value) {
    if (!value) return 'Not Available';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return hospitalViewSafeText(value);
    return parsed.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function hospitalViewFormatDateTime(value) {
    if (!value) return 'Not Available';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return hospitalViewSafeText(value);
    return parsed.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function hospitalViewBloodLabel(value) {
    const map = {
        O_NEG: 'O-',
        O_POS: 'O+',
        A_POS: 'A+',
        A_NEG: 'A-',
        B_POS: 'B+',
        B_NEG: 'B-',
        AB_POS: 'AB+',
        AB_NEG: 'AB-',
    };
    const key = String(value || '').trim().toUpperCase();
    return map[key] || hospitalViewSafeText(value, '-');
}

function hospitalViewComponentLabel(value) {
    if (!value) return '-';
    const key = String(value).trim().toUpperCase();
    return componentLabel(key);
}

function hospitalViewNormalizeStatus(status) {
    return String(status || '').trim().toUpperCase();
}

function hospitalViewStatusBadge(status) {
    const normalized = hospitalViewNormalizeStatus(status);
    const meta = HOSPITAL_VIEW_STATUS_META[normalized];
    if (!meta) return `<span class="tag tag-inactive">${escHtml(hospitalViewSafeText(status, 'Unknown'))}</span>`;
    return `<span class="tag ${meta.tagClass}">${escHtml(meta.label)}</span>`;
}

function hospitalViewSetContainerHtml(containerId, html) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.innerHTML = html;
}

function hospitalViewSetLoadingState(message = 'Loading hospital details...') {
    const loading = `<div class="hospital-view-placeholder">${escHtml(message)}</div>`;
    [
        'hospital-view-info',
        'hospital-view-contact',
        'hospital-view-account',
        'hospital-view-analytics',
        'hospital-view-active',
        'hospital-view-components',
        'hospital-view-activity',
    ].forEach((id) => hospitalViewSetContainerHtml(id, loading));

    hospitalViewSetContainerHtml(
        'hospital-view-recent-body',
        `<tr><td colspan="7" class="hospital-view-table-empty">${escHtml(message)}</td></tr>`
    );
}

function hospitalViewFindById(id) {
    return hospData.find((h) => String(h.id) === String(id)) || null;
}

function hospitalViewMatchesHospitalRequest(request, hospital) {
    if (!request || !hospital) return false;

    const reqHospitalIdRaw = request.hospitalId
        ?? request.hospitalProfile?.id
        ?? request.hospital?.id
        ?? request.requestingHospital?.id;
    const reqHospitalId = reqHospitalIdRaw !== undefined && reqHospitalIdRaw !== null
        ? Number(reqHospitalIdRaw)
        : null;
    const targetId = Number(hospital.id);
    if (reqHospitalId && targetId && reqHospitalId === targetId) return true;

    const reqHospitalName = String(
        request.hospitalName
        ?? request.hospitalProfile?.hospitalName
        ?? request.hospital?.hospitalName
        ?? request.requestingHospital?.hospitalName
        ?? request.requesterName
        ?? ''
    ).trim().toLowerCase();
    const hospitalName = String(hospital.hospitalName || '').trim().toLowerCase();
    if (reqHospitalName && hospitalName && reqHospitalName === hospitalName) return true;

    const reqEmail = String(
        request.hospitalContactEmail
        ?? request.requesterEmail
        ?? request.hospitalProfile?.user?.email
        ?? ''
    ).trim().toLowerCase();
    const hospitalEmail = String(hospital.email || '').trim().toLowerCase();
    if (reqEmail && hospitalEmail && reqEmail === hospitalEmail) return true;

    return false;
}

function hospitalViewBuildFallbackActivity(requests) {
    if (!Array.isArray(requests) || !requests.length) return [];

    const sorted = [...requests].sort((a, b) => {
        const aTs = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const bTs = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return bTs - aTs;
    });

    return sorted.slice(0, 8).map((item) => {
        const status = hospitalViewNormalizeStatus(item.status);
        const ref = item.referenceNumber || item.referenceNo || `Request #${item.id ?? '-'}`;
        const eventText = status === 'RELEASED'
            ? `Blood released for ${ref}`
            : status === 'REJECTED'
                ? `Request rejected: ${ref}`
                : status === 'CANCELLED'
                    ? `Request cancelled: ${ref}`
                    : `Request ${ref} is ${hospitalViewSafeText(HOSPITAL_VIEW_STATUS_META[status]?.label || status, 'updated')}`;
        return {
            message: eventText,
            timestamp: item.updatedAt || item.createdAt || null,
        };
    });
}

function hospitalViewNormalizeData(raw, hospital, fallbackRequests = []) {
    const response = raw && typeof raw === 'object' ? raw : {};
    const scopedHospital = response.hospital || hospital || {};
    const requestList = Array.isArray(response.requests)
        ? response.requests
        : Array.isArray(response.recentRequests)
            ? response.recentRequests
        : Array.isArray(fallbackRequests) ? fallbackRequests : [];

    const activeFromResponse = Array.isArray(response.activeRequests)
        ? response.activeRequests
        : requestList.filter((req) => HOSPITAL_VIEW_ACTIVE_STATUS.has(hospitalViewNormalizeStatus(req.status)));

    const analyticsRaw = response.analytics && typeof response.analytics === 'object'
        ? response.analytics
        : {};
    const statusCounts = {
        PENDING: Number(analyticsRaw.pending ?? 0),
        NEEDS_CONFIRMATION: Number(analyticsRaw.needsConfirmation ?? analyticsRaw.needs_confirm ?? 0),
        APPROVED: Number(analyticsRaw.approved ?? 0),
        ALLOCATED: Number(analyticsRaw.allocated ?? 0),
        READY_FOR_RELEASE: Number(analyticsRaw.readyForRelease ?? analyticsRaw.ready_for_release ?? 0),
        RELEASED: Number(analyticsRaw.released ?? 0),
        REJECTED: Number(analyticsRaw.rejected ?? 0),
        CANCELLED: Number(analyticsRaw.cancelled ?? 0),
    };
    const totalFromStatus = Object.values(statusCounts).reduce((sum, count) => sum + (Number.isFinite(count) ? count : 0), 0);
    const computedTotal = Number(analyticsRaw.totalRequests ?? analyticsRaw.total ?? 0)
        || totalFromStatus
        || Number(scopedHospital.requestCount || 0);

    const componentStats = Array.isArray(response.componentStats)
        ? response.componentStats
        : response.componentStats && typeof response.componentStats === 'object'
            ? Object.entries(response.componentStats).map(([component, count]) => ({ component, count: Number(count) || 0 }))
            : null;
    const activityLogs = Array.isArray(response.activityLogs) ? response.activityLogs : null;

    const recentRequests = Array.isArray(response.recentRequests)
        ? response.recentRequests
        : [...requestList]
            .sort((a, b) => {
                const aTs = new Date(a.createdAt || a.updatedAt || 0).getTime();
                const bTs = new Date(b.createdAt || b.updatedAt || 0).getTime();
                return bTs - aTs;
            });

    return {
        hospital: scopedHospital,
        account: response.account || response.hospitalAccount || null,
        requests: requestList,
        recentRequests,
        activeRequests: activeFromResponse,
        analytics: {
            totalRequests: computedTotal,
            ...statusCounts,
        },
        componentStats: componentStats,
        activityLogs: activityLogs,
    };
}

function hospitalViewComputeAnalyticsFromRequests(requests) {
    const counts = {
        totalRequests: Array.isArray(requests) ? requests.length : 0,
        PENDING: 0,
        NEEDS_CONFIRMATION: 0,
        APPROVED: 0,
        ALLOCATED: 0,
        READY_FOR_RELEASE: 0,
        RELEASED: 0,
        REJECTED: 0,
        CANCELLED: 0,
    };
    if (!Array.isArray(requests)) return counts;

    requests.forEach((request) => {
        const status = hospitalViewNormalizeStatus(request.status);
        if (Object.prototype.hasOwnProperty.call(counts, status)) {
            counts[status] += 1;
        }
    });
    return counts;
}

function hospitalViewComputeComponentStats(requests) {
    if (!Array.isArray(requests) || !requests.length) return [];
    const tally = new Map();
    requests.forEach((request) => {
        const rawComponent = request.componentType || request.bloodComponent || request.component || '';
        const key = String(rawComponent || '').trim().toUpperCase();
        if (!key) return;
        tally.set(key, (tally.get(key) || 0) + 1);
    });
    return [...tally.entries()]
        .map(([component, count]) => ({ component, count }))
        .sort((a, b) => b.count - a.count);
}

async function openHospitalViewModal(hospitalId) {
    const hospital = hospitalViewFindById(hospitalId);
    if (!hospital) {
        showBloodPlusMessage('Hospital Not Found', 'The selected hospital record could not be loaded.', 'error');
        return;
    }

    hospitalViewCurrentId = hospitalId;
    hospitalViewCurrentData = null;

    const titleEl = document.getElementById('hospital-view-title-name');
    if (titleEl) titleEl.textContent = hospital.hospitalName || 'Hospital Details';
    hospitalViewSetLoadingState('Loading hospital details...');
    openModal('viewHospitalModal');
    await loadHospitalDetails(hospitalId);
}

function closeHospitalViewModal() {
    closeModal('viewHospitalModal');
}

function hospitalViewOpenAllRequests() {
    closeHospitalViewModal();
    const nav = document.getElementById('nav-bloodrequests');
    showPanel('bloodrequests', nav || null);
    if (typeof window.reqFetchAll === 'function') {
        window.reqFetchAll();
    }
}

function hospitalViewOpenCreateRequest() {
    showBloodPlusMessage(
        'Create Request',
        'Use the public Blood Request Portal to create a new hospital request.',
        'info'
    );
}

function hospitalViewOpenEdit() {
    if (!hospitalViewCurrentId) return;
    closeHospitalViewModal();
    hospOpenEdit(hospitalViewCurrentId);
}

function hospitalViewPrepareDeactivate() {
    if (!hospitalViewCurrentId) return;
    closeHospitalViewModal();
    hospOpenEdit(hospitalViewCurrentId);
    const statusEl = document.getElementById('hosp-edit-status');
    if (statusEl) statusEl.value = 'inactive';
    showBloodPlusMessage(
        'Set Hospital Inactive',
        'Review the hospital account, then save changes to apply the Inactive status.',
        'warning'
    );
}

async function loadHospitalDetails(hospitalId) {
    const hospital = hospitalViewFindById(hospitalId);
    if (!hospital) return;

    let normalized = null;
    try {
        const detailRes = await fetch(`${HOSPITAL_API}/${hospitalId}/details`, {
            headers: { Accept: 'application/json' },
            credentials: 'include',
        });
        if (!detailRes.ok) {
            throw new Error(`Hospital details endpoint returned ${detailRes.status}`);
        }
        const detailData = await detailRes.json();
        normalized = hospitalViewNormalizeData(detailData, hospital);
    } catch (error) {
        try {
            const reqRes = await fetch('/api/admin/blood-requests', {
                headers: { Accept: 'application/json' },
                credentials: 'include',
            });
            if (!reqRes.ok) throw new Error(`Blood requests endpoint returned ${reqRes.status}`);
            const requestPayload = await reqRes.json();
            const requestList = Array.isArray(requestPayload)
                ? requestPayload
                : Array.isArray(requestPayload?.content)
                    ? requestPayload.content
                    : Array.isArray(requestPayload?.data)
                        ? requestPayload.data
                        : [];
            const scopedRequests = requestList.filter((request) => hospitalViewMatchesHospitalRequest(request, hospital));
            normalized = hospitalViewNormalizeData({}, hospital, scopedRequests);
            normalized.analytics = hospitalViewComputeAnalyticsFromRequests(scopedRequests);
            normalized.componentStats = hospitalViewComputeComponentStats(scopedRequests);
            normalized.activityLogs = hospitalViewBuildFallbackActivity(scopedRequests);
        } catch (fallbackError) {
            console.error('[Hospital View] Fallback load failed:', fallbackError);
            normalized = hospitalViewNormalizeData({}, hospital, []);
            normalized.analytics = hospitalViewComputeAnalyticsFromRequests([]);
            normalized.componentStats = [];
            normalized.activityLogs = [];
        }
        console.warn('[Hospital View] Detail API unavailable, fallback used.', error);
    }

    hospitalViewCurrentData = normalized;
    renderHospitalInfo(normalized);
    renderHospitalAnalytics(normalized);
    renderRecentRequests(normalized);
    renderActiveRequests(normalized);
    renderComponentStats(normalized);
    renderHospitalActivity(normalized);
}

function renderHospitalInfo(data) {
    const hospital = data?.hospital || {};
    const account = data?.account || {};
    const status = hospital.status || account.status || 'active';
    const statusTag = String(status).toLowerCase() === 'inactive'
        ? `<span class="tag tag-inactive">Inactive</span>`
        : `<span class="tag tag-active">Active</span>`;

    const city = hospitalViewSafeText(hospital.city, '');
    const province = hospitalViewSafeText(hospital.province, '');
    const locationText = [city, province].filter(Boolean).join(', ') || 'Not Available';

    hospitalViewSetContainerHtml('hospital-view-info', `
        <div class="hospital-view-kv-grid">
            <div class="hospital-view-kv-item">
                <div class="hospital-view-kv-label">Hospital Name</div>
                <div class="hospital-view-kv-value">${escHtml(hospitalViewSafeText(hospital.hospitalName))}</div>
            </div>
            <div class="hospital-view-kv-item">
                <div class="hospital-view-kv-label">Location</div>
                <div class="hospital-view-kv-value">${escHtml(locationText)}</div>
            </div>
            <div class="hospital-view-kv-item">
                <div class="hospital-view-kv-label">Full Address</div>
                <div class="hospital-view-kv-value">${escHtml(hospitalViewSafeText(hospital.address))}</div>
            </div>
            <div class="hospital-view-kv-item">
                <div class="hospital-view-kv-label">Date Registered</div>
                <div class="hospital-view-kv-value">${escHtml(hospitalViewFormatDate(hospital.createdAt || account.createdAt))}</div>
            </div>
        </div>
    `);

    hospitalViewSetContainerHtml('hospital-view-contact', `
        <div class="hospital-view-kv-grid">
            <div class="hospital-view-kv-item">
                <div class="hospital-view-kv-label">Hospital Email</div>
                <div class="hospital-view-kv-value">${escHtml(hospitalViewSafeText(hospital.email || account.email))}</div>
            </div>
            <div class="hospital-view-kv-item">
                <div class="hospital-view-kv-label">Hospital Phone Number</div>
                <div class="hospital-view-kv-value">${escHtml(hospitalViewSafeText(hospital.phoneNumber))}</div>
            </div>
            <div class="hospital-view-kv-item">
                <div class="hospital-view-kv-label">Contact Person Name</div>
                <div class="hospital-view-kv-value">${escHtml(hospitalViewSafeText(hospital.contactPersonName))}</div>
            </div>
            <div class="hospital-view-kv-item">
                <div class="hospital-view-kv-label">Contact Person Phone</div>
                <div class="hospital-view-kv-value">${escHtml(hospitalViewSafeText(hospital.contactPersonPhone))}</div>
            </div>
        </div>
    `);

    hospitalViewSetContainerHtml('hospital-view-account', `
        <div class="hospital-view-kv-grid">
            <div class="hospital-view-kv-item">
                <div class="hospital-view-kv-label">Hospital Account ID</div>
                <div class="hospital-view-kv-value">${escHtml(hospitalViewSafeText(account.id || hospital.id, '-'))}</div>
            </div>
            <div class="hospital-view-kv-item">
                <div class="hospital-view-kv-label">Login Email</div>
                <div class="hospital-view-kv-value">${escHtml(hospitalViewSafeText(account.email || hospital.email))}</div>
            </div>
            <div class="hospital-view-kv-item">
                <div class="hospital-view-kv-label">Account Status</div>
                <div class="hospital-view-kv-value">${statusTag}</div>
            </div>
        </div>
    `);
}

function renderHospitalAnalytics(data) {
    const analytics = data?.analytics || {};
    const cards = [
        ['Total Requests', analytics.totalRequests, 'neutral'],
        ['Pending', analytics.PENDING, 'PENDING'],
        ['Needs Confirmation', analytics.NEEDS_CONFIRMATION, 'NEEDS_CONFIRMATION'],
        ['Approved', analytics.APPROVED, 'APPROVED'],
        ['Allocated', analytics.ALLOCATED, 'ALLOCATED'],
        ['Ready for Release', analytics.READY_FOR_RELEASE, 'READY_FOR_RELEASE'],
        ['Released', analytics.RELEASED, 'RELEASED'],
        ['Rejected', analytics.REJECTED, 'REJECTED'],
        ['Cancelled', analytics.CANCELLED, 'CANCELLED'],
    ];

    hospitalViewSetContainerHtml('hospital-view-analytics', `
        <div class="hospital-view-stats-grid">
            ${cards.map(([label, count, status]) => {
                const cssStatus = status === 'neutral' ? 'neutral' : status.toLowerCase();
                return `
                    <div class="hospital-view-stat-card ${cssStatus}">
                        <div class="hospital-view-stat-label">${escHtml(label)}</div>
                        <div class="hospital-view-stat-value">${Number.isFinite(Number(count)) ? Number(count) : 0}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `);
}

function renderRecentRequests(data) {
    const list = Array.isArray(data?.requests) && data.requests.length
        ? data.requests
        : Array.isArray(data?.recentRequests) ? data.recentRequests : [];
    const sorted = [...list].sort((a, b) => {
        const aTs = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const bTs = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return bTs - aTs;
    });

    if (!sorted.length) {
        hospitalViewSetContainerHtml(
            'hospital-view-recent-body',
            '<tr><td colspan="7" class="hospital-view-table-empty">No blood requests found.</td></tr>'
        );
        return;
    }

    hospitalViewSetContainerHtml(
        'hospital-view-recent-body',
        sorted.map((request) => {
            const ref = request.referenceNumber || request.referenceNo || `#${request.id ?? '-'}`;
            const patient = request.patientName || request.name || request.requesterName || '-';
            const blood = hospitalViewBloodLabel(request.bloodType || request.bloodTypeEnum);
            const component = hospitalViewComponentLabel(request.componentType || request.bloodComponent || request.component);
            const units = request.unitsRequested ?? request.numberOfUnits ?? request.units ?? '-';
            const date = hospitalViewFormatDate(request.createdAt || request.updatedAt);
            return `
                <tr>
                    <td>${escHtml(hospitalViewSafeText(ref, '-'))}</td>
                    <td>${escHtml(hospitalViewSafeText(patient, '-'))}</td>
                    <td>${escHtml(hospitalViewSafeText(blood, '-'))}</td>
                    <td>${escHtml(hospitalViewSafeText(component, '-'))}</td>
                    <td>${escHtml(String(units))}</td>
                    <td>${hospitalViewStatusBadge(request.status)}</td>
                    <td>${escHtml(date)}</td>
                </tr>
            `;
        }).join('')
    );
}

function renderActiveRequests(data) {
    const list = Array.isArray(data?.activeRequests) ? data.activeRequests : [];
    const filtered = list.filter((request) => HOSPITAL_VIEW_ACTIVE_STATUS.has(hospitalViewNormalizeStatus(request.status)));

    if (!filtered.length) {
        hospitalViewSetContainerHtml('hospital-view-active', '<div class="hospital-view-placeholder">No active requests.</div>');
        return;
    }

    hospitalViewSetContainerHtml('hospital-view-active', `
        <div class="hospital-view-active-list">
            ${filtered.map((request) => {
                const ref = request.referenceNumber || request.referenceNo || `#${request.id ?? '-'}`;
                const patient = request.patientName || request.name || request.requesterName || '-';
                const component = hospitalViewComponentLabel(request.componentType || request.bloodComponent || request.component);
                return `
                    <div class="hospital-view-active-item">
                        <div class="hospital-view-active-meta">
                            <div class="hospital-view-active-ref">${escHtml(hospitalViewSafeText(ref, '-'))}</div>
                            <div class="hospital-view-active-sub">${escHtml(hospitalViewSafeText(patient, '-'))} · ${escHtml(hospitalViewSafeText(component, '-'))}</div>
                        </div>
                        <div>${hospitalViewStatusBadge(request.status)}</div>
                    </div>
                `;
            }).join('')}
        </div>
    `);
}

function renderComponentStats(data) {
    const rawStats = Array.isArray(data?.componentStats) ? data.componentStats : hospitalViewComputeComponentStats(data?.requests || []);
    const allComponents = Object.entries(COMPONENT_LABELS).map(([component, label]) => ({ component, label }));
    const statMap = new Map();
    rawStats.forEach((item) => {
        const key = String(item.component || item.componentType || item.name || '').trim().toUpperCase();
        if (!key) return;
        statMap.set(key, Number(item.count || item.requests || 0) || 0);
    });
    const merged = allComponents.map((entry) => ({
        component: entry.component,
        label: entry.label,
        count: statMap.get(entry.component) || 0,
    }));
    const extras = [...statMap.keys()]
        .filter((key) => !COMPONENT_LABELS[key])
        .map((key) => ({
            component: key,
            label: hospitalViewComponentLabel(key),
            count: statMap.get(key) || 0,
        }));
    const stats = [...merged, ...extras];
    const total = stats.reduce((sum, item) => sum + Number(item.count || 0), 0) || 1;

    hospitalViewSetContainerHtml('hospital-view-components', `
        <div class="hospital-view-component-list">
            ${stats.map((item) => {
                const count = Number(item.count || 0);
                const label = item.label || hospitalViewComponentLabel(item.component || '-');
                const pct = Math.max(2, Math.round((count / total) * 100));
                return `
                    <div class="hospital-view-component-item">
                        <div class="hospital-view-component-row ${count <= 0 ? 'no-data' : ''}">
                            <span>${escHtml(hospitalViewSafeText(label, '-'))}</span>
                            ${count > 0 ? `<strong>${count}</strong>` : ''}
                        </div>
                        ${count > 0 ? `
                            <div class="hospital-view-component-bar">
                                <span style="width:${pct}%"></span>
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('')}
        </div>
    `);
}

function renderHospitalActivity(data) {
    const list = Array.isArray(data?.activityLogs) && data.activityLogs.length
        ? data.activityLogs
        : hospitalViewBuildFallbackActivity(data?.requests || []);

    if (!list.length) {
        hospitalViewSetContainerHtml('hospital-view-activity', '<div class="hospital-view-placeholder">No recent activity found.</div>');
        return;
    }

    const timeline = list.slice(0, 8).map((item) => {
        const when = item.timestamp || item.createdAt || item.updatedAt || item.occurredAt;
        const text = item.message || item.description || item.activity || item.event || 'Activity update';
        const dateText = when ? hospitalViewFormatDate(when) : '';
        return `
            <div class="hospital-view-timeline-item">
                <div class="hospital-view-timeline-dot"></div>
                <div class="hospital-view-timeline-content">
                    ${dateText && dateText !== 'Not Available'
                        ? `<div class="hospital-view-timeline-date">${escHtml(dateText)}</div>`
                        : ''}
                    <div class="hospital-view-timeline-text">${escHtml(hospitalViewSafeText(text, 'Activity update'))}</div>
                </div>
            </div>
        `;
    }).join('');

    hospitalViewSetContainerHtml('hospital-view-activity', `<div class="hospital-view-timeline">${timeline}</div>`);
}

function setHospitalFieldError(inputId, message) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(`${inputId}-error`);
    if (input) {
        input.classList.add('field-error');
        input.setAttribute('aria-invalid', 'true');
    }
    if (error) {
        error.textContent = message || '';
        error.style.display = message ? 'block' : 'none';
    }
    return false;
}

function clearHospitalFieldError(inputId) {
    const input = document.getElementById(inputId);
    const error = document.getElementById(`${inputId}-error`);
    if (input) {
        input.classList.remove('field-error');
        input.removeAttribute('aria-invalid');
    }
    if (error) {
        error.textContent = '';
        error.style.display = 'none';
    }
    return true;
}

function enforceHospitalTextLimit(inputId, maxLength) {
    const input = document.getElementById(inputId);
    if (!input) return '';
    const cleaned = String(input.value || '')
        .replace(/<[^>]*>/g, '')
        .slice(0, maxLength);
    if (input.value !== cleaned) input.value = cleaned;
    return cleaned;
}

function validateHospitalName(commitTrim = true) {
    const inputId = 'hosp-add-name';
    const input = document.getElementById(inputId);
    if (!input) return false;
    enforceHospitalTextLimit(inputId, 50);
    const value = input.value.trim();
    if (commitTrim) input.value = value;
    const validFormat = /^[A-Za-z0-9 .'-]+$/.test(value) && !/<\/?script/i.test(value);
    if (!value || value.length > 50 || !validFormat) {
        return setHospitalFieldError(inputId, 'Hospital name is required.');
    }
    return clearHospitalFieldError(inputId);
}

function validateHospitalCity(commitTrim = true) {
    const inputId = 'hosp-add-city';
    const input = document.getElementById(inputId);
    if (!input) return false;
    enforceHospitalTextLimit(inputId, 25);
    const value = input.value.trim();
    if (commitTrim) input.value = value;
    const validFormat = /^[A-Za-z .-]+$/.test(value);
    if (!value || value.length > 25 || !validFormat) {
        return setHospitalFieldError(inputId, 'City is required.');
    }
    return clearHospitalFieldError(inputId);
}

function validateHospitalProvince(commitTrim = true) {
    const inputId = 'hosp-add-province';
    const input = document.getElementById(inputId);
    if (!input) return false;
    enforceHospitalTextLimit(inputId, 25);
    const value = input.value.trim();
    if (commitTrim) input.value = value;
    const validFormat = /^[A-Za-z .-]+$/.test(value);
    if (!value || value.length > 25 || !validFormat) {
        return setHospitalFieldError(inputId, 'Province is required.');
    }
    return clearHospitalFieldError(inputId);
}

function validateHospitalAddress(commitTrim = true) {
    const inputId = 'hosp-add-address';
    const input = document.getElementById(inputId);
    if (!input) return false;
    enforceHospitalTextLimit(inputId, 50);
    const value = input.value.trim();
    if (commitTrim) input.value = value;
    const validFormat = /^[A-Za-z0-9\s,.\-#]+$/.test(value) && !/<\/?script/i.test(value);
    if (!value || value.length > 50 || !validFormat) {
        return setHospitalFieldError(inputId, 'Address is required.');
    }
    return clearHospitalFieldError(inputId);
}

function validateHospitalEmail(commitTrim = true) {
    const inputId = 'hosp-add-email';
    const input = document.getElementById(inputId);
    if (!input) return false;
    enforceHospitalTextLimit(inputId, 50);
    const noSpaces = String(input.value || '').replace(/\s+/g, '');
    if (input.value !== noSpaces) input.value = noSpaces;
    const value = input.value.trim();
    if (commitTrim) input.value = value;
    const validFormat = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
    if (!value || value.length > 50 || !validFormat) {
        return setHospitalFieldError(inputId, 'Enter a valid email address.');
    }
    return clearHospitalFieldError(inputId);
}

function lockPhilippinePhoneInput(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return '';
    const raw = String(input.value || '');
    const digits = raw.replace(/\D/g, '');
    let local = digits.startsWith('63') ? digits.slice(2) : digits;
    local = local.slice(0, 10);
    input.value = `+63${local}`;
    return input.value;
}

function validatePhilippinePhone(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return false;
    const value = lockPhilippinePhoneInput(inputId);
    if (!/^\+63\d{10}$/.test(value)) {
        return setHospitalFieldError(inputId, 'Phone number must start with +63 followed by exactly 10 digits.');
    }
    return clearHospitalFieldError(inputId);
}

function validateHospitalContactName(commitTrim = true) {
    const inputId = 'hosp-add-contact-name';
    const input = document.getElementById(inputId);
    if (!input) return false;
    enforceHospitalTextLimit(inputId, 40);
    const value = input.value.trim();
    if (commitTrim) input.value = value;
    const validFormat = /^[A-Za-z .-]+$/.test(value);
    if (!value || value.length > 40 || !validFormat) {
        return setHospitalFieldError(inputId, 'Contact person name is required.');
    }
    return clearHospitalFieldError(inputId);
}

function validateHospitalEditName(commitTrim = true) {
    const inputId = 'hosp-edit-name';
    const input = document.getElementById(inputId);
    if (!input) return false;
    enforceHospitalTextLimit(inputId, 50);
    const value = input.value.trim();
    if (commitTrim) input.value = value;
    const validFormat = /^[A-Za-z0-9 .'-]+$/.test(value) && !/<\/?script/i.test(value);
    if (!value || value.length > 50 || !validFormat) {
        return setHospitalFieldError(inputId, 'Hospital name is required.');
    }
    return clearHospitalFieldError(inputId);
}

function validateHospitalEditCity(commitTrim = true) {
    const inputId = 'hosp-edit-city';
    const input = document.getElementById(inputId);
    if (!input) return false;
    enforceHospitalTextLimit(inputId, 25);
    const value = input.value.trim();
    if (commitTrim) input.value = value;
    const validFormat = /^[A-Za-z .-]+$/.test(value);
    if (!value || value.length > 25 || !validFormat) {
        return setHospitalFieldError(inputId, 'City is required.');
    }
    return clearHospitalFieldError(inputId);
}

function validateHospitalEditProvince(commitTrim = true) {
    const inputId = 'hosp-edit-province';
    const input = document.getElementById(inputId);
    if (!input) return false;
    enforceHospitalTextLimit(inputId, 25);
    const value = input.value.trim();
    if (commitTrim) input.value = value;
    const validFormat = /^[A-Za-z .-]+$/.test(value);
    if (!value || value.length > 25 || !validFormat) {
        return setHospitalFieldError(inputId, 'Province is required.');
    }
    return clearHospitalFieldError(inputId);
}

function validateHospitalEditAddress(commitTrim = true) {
    const inputId = 'hosp-edit-address';
    const input = document.getElementById(inputId);
    if (!input) return false;
    enforceHospitalTextLimit(inputId, 50);
    const value = input.value.trim();
    if (commitTrim) input.value = value;
    const validFormat = /^[A-Za-z0-9\s,.\-#]+$/.test(value) && !/<\/?script/i.test(value);
    if (!value || value.length > 50 || !validFormat) {
        return setHospitalFieldError(inputId, 'Address is required.');
    }
    return clearHospitalFieldError(inputId);
}

function validateHospitalEditEmail(commitTrim = true) {
    const inputId = 'hosp-edit-email';
    const input = document.getElementById(inputId);
    if (!input) return false;
    enforceHospitalTextLimit(inputId, 50);
    const noSpaces = String(input.value || '').replace(/\s+/g, '');
    if (input.value !== noSpaces) input.value = noSpaces;
    const value = input.value.trim();
    if (commitTrim) input.value = value;
    const validFormat = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i.test(value);
    if (!value || value.length > 50 || !validFormat) {
        return setHospitalFieldError(inputId, 'Enter a valid email address.');
    }
    return clearHospitalFieldError(inputId);
}

function validateHospitalEditContactName(commitTrim = true) {
    const inputId = 'hosp-edit-contact-name';
    const input = document.getElementById(inputId);
    if (!input) return false;
    enforceHospitalTextLimit(inputId, 40);
    const value = input.value.trim();
    if (commitTrim) input.value = value;
    const validFormat = /^[A-Za-z .-]+$/.test(value);
    if (!value || value.length > 40 || !validFormat) {
        return setHospitalFieldError(inputId, 'Contact person name is required.');
    }
    return clearHospitalFieldError(inputId);
}

function validateHospitalCreateForm() {
    const checks = [
        { id: 'hosp-add-name', fn: validateHospitalName },
        { id: 'hosp-add-city', fn: validateHospitalCity },
        { id: 'hosp-add-province', fn: validateHospitalProvince },
        { id: 'hosp-add-address', fn: validateHospitalAddress },
        { id: 'hosp-add-email', fn: validateHospitalEmail },
        { id: 'hosp-add-phone', fn: () => validatePhilippinePhone('hosp-add-phone') },
        { id: 'hosp-add-contact-name', fn: validateHospitalContactName },
        { id: 'hosp-add-contact-phone', fn: () => validatePhilippinePhone('hosp-add-contact-phone') },
    ];

    let firstInvalidId = '';
    checks.forEach(check => {
        const valid = check.fn();
        if (!valid && !firstInvalidId) firstInvalidId = check.id;
    });

    if (firstInvalidId) {
        const firstEl = document.getElementById(firstInvalidId);
        if (firstEl) {
            firstEl.focus();
            firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return false;
    }
    return true;
}

function validateHospitalEditForm() {
    const checks = [
        { id: 'hosp-edit-name', fn: validateHospitalEditName },
        { id: 'hosp-edit-city', fn: validateHospitalEditCity },
        { id: 'hosp-edit-province', fn: validateHospitalEditProvince },
        { id: 'hosp-edit-address', fn: validateHospitalEditAddress },
        { id: 'hosp-edit-email', fn: validateHospitalEditEmail },
        { id: 'hosp-edit-phone', fn: () => validatePhilippinePhone('hosp-edit-phone') },
        { id: 'hosp-edit-contact-name', fn: validateHospitalEditContactName },
        { id: 'hosp-edit-contact-phone', fn: () => validatePhilippinePhone('hosp-edit-contact-phone') },
    ];

    let firstInvalidId = '';
    checks.forEach(check => {
        const valid = check.fn();
        if (!valid && !firstInvalidId) firstInvalidId = check.id;
    });

    if (firstInvalidId) {
        const firstEl = document.getElementById(firstInvalidId);
        if (firstEl) {
            firstEl.focus();
            firstEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        return false;
    }
    return true;
}

function initHospitalCreateValidation() {
    if (hospCreateValidationBound) return;
    hospCreateValidationBound = true;

    const textLimits = [
        ['hosp-add-name', 50, validateHospitalName],
        ['hosp-add-city', 25, validateHospitalCity],
        ['hosp-add-province', 25, validateHospitalProvince],
        ['hosp-add-address', 50, validateHospitalAddress],
        ['hosp-add-email', 50, validateHospitalEmail],
        ['hosp-add-contact-name', 40, validateHospitalContactName],
    ];

    textLimits.forEach(([id, max, validator]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            enforceHospitalTextLimit(id, max);
            validator(false);
        });
        el.addEventListener('blur', () => validator(true));
        if (id === 'hosp-add-email' || id === 'hosp-edit-email') {
            el.addEventListener('keydown', (event) => {
                if (event.key === ' ') event.preventDefault();
            });
        }
    });

    ['hosp-add-phone', 'hosp-add-contact-phone'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('focus', () => {
            if (!el.value.trim()) {
                el.value = '+63';
            } else {
                lockPhilippinePhoneInput(id);
            }
            const pos = el.value.length;
            if (typeof el.setSelectionRange === 'function') {
                try { el.setSelectionRange(pos, pos); } catch (_) {}
            }
        });
        el.addEventListener('input', () => {
            lockPhilippinePhoneInput(id);
            validatePhilippinePhone(id);
            const pos = el.value.length;
            if (typeof el.setSelectionRange === 'function') {
                try { el.setSelectionRange(pos, pos); } catch (_) {}
            }
        });
        el.addEventListener('blur', () => validatePhilippinePhone(id));
        el.addEventListener('keydown', (event) => {
            const selectionStart = el.selectionStart ?? 0;
            const selectionEnd = el.selectionEnd ?? 0;
            const isBackspace = event.key === 'Backspace';
            const isDelete = event.key === 'Delete';
            if ((isBackspace && selectionStart <= 3) || (isDelete && selectionStart < 3)) {
                event.preventDefault();
            }
            if (event.key.length === 1 && !/\d/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
            }
            if (event.key.length === 1 && /\d/.test(event.key)) {
                const localDigits = el.value.slice(3).replace(/\D/g, '');
                const selectedPrefix = el.value.slice(selectionStart, selectionEnd);
                const selectedLocalDigits = selectedPrefix.replace(/\D/g, '');
                if (localDigits.length - selectedLocalDigits.length >= 10) {
                    event.preventDefault();
                }
            }
        });
    });
}

function initHospitalEditValidation() {
    if (hospEditValidationBound) return;
    hospEditValidationBound = true;

    const textLimits = [
        ['hosp-edit-name', 50, validateHospitalEditName],
        ['hosp-edit-city', 25, validateHospitalEditCity],
        ['hosp-edit-province', 25, validateHospitalEditProvince],
        ['hosp-edit-address', 50, validateHospitalEditAddress],
        ['hosp-edit-email', 50, validateHospitalEditEmail],
        ['hosp-edit-contact-name', 40, validateHospitalEditContactName],
    ];

    textLimits.forEach(([id, max, validator]) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', () => {
            enforceHospitalTextLimit(id, max);
            validator(false);
        });
        el.addEventListener('blur', () => validator(true));
        if (id === 'hosp-edit-email') {
            el.addEventListener('keydown', (event) => {
                if (event.key === ' ') event.preventDefault();
            });
        }
    });

    ['hosp-edit-phone', 'hosp-edit-contact-phone'].forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('focus', () => {
            if (!el.value.trim()) {
                el.value = '+63';
            } else {
                lockPhilippinePhoneInput(id);
            }
            const pos = el.value.length;
            if (typeof el.setSelectionRange === 'function') {
                try { el.setSelectionRange(pos, pos); } catch (_) {}
            }
        });
        el.addEventListener('input', () => {
            lockPhilippinePhoneInput(id);
            validatePhilippinePhone(id);
            const pos = el.value.length;
            if (typeof el.setSelectionRange === 'function') {
                try { el.setSelectionRange(pos, pos); } catch (_) {}
            }
        });
        el.addEventListener('blur', () => validatePhilippinePhone(id));
        el.addEventListener('keydown', (event) => {
            const selectionStart = el.selectionStart ?? 0;
            const selectionEnd = el.selectionEnd ?? 0;
            const isBackspace = event.key === 'Backspace';
            const isDelete = event.key === 'Delete';
            if ((isBackspace && selectionStart <= 3) || (isDelete && selectionStart < 3)) {
                event.preventDefault();
            }
            if (event.key.length === 1 && !/\d/.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
                event.preventDefault();
            }
            if (event.key.length === 1 && /\d/.test(event.key)) {
                const localDigits = el.value.slice(3).replace(/\D/g, '');
                const selectedPrefix = el.value.slice(selectionStart, selectionEnd);
                const selectedLocalDigits = selectedPrefix.replace(/\D/g, '');
                if (localDigits.length - selectedLocalDigits.length >= 10) {
                    event.preventDefault();
                }
            }
        });
    });
}



// ??????????????????????????????????????????????????????????????????????????
// CREATE HOSPITAL – Submit form
// ??????????????????????????????????????????????????????????????????????????
async function hospCreate() {
    if (!validateHospitalCreateForm()) return;

    const email = document.getElementById('hosp-add-email')?.value.trim();
    const name = document.getElementById('hosp-add-name')?.value.trim();
    const address = document.getElementById('hosp-add-address')?.value.trim();
    const city = document.getElementById('hosp-add-city')?.value.trim();
    const province = document.getElementById('hosp-add-province')?.value.trim();
    const phone = document.getElementById('hosp-add-phone')?.value.trim();
    const contactName = document.getElementById('hosp-add-contact-name')?.value.trim();
    const contactPhone = document.getElementById('hosp-add-contact-phone')?.value.trim();
    
    const btn = document.querySelector('#addHospitalModal .btn-primary');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Creating…';
    }
    
    try {
        const res = await fetch(HOSPITAL_API, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email, hospitalName: name, address, city, province,
                phoneNumber: phone, contactPersonName: contactName,
                contactPersonPhone: contactPhone
            })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Creation failed');
        }
        
        const created = await res.json();
        hospData.unshift(created);
        hospPage = 1;
        
        // Clear form
        ['hosp-add-email','hosp-add-name','hosp-add-address','hosp-add-city','hosp-add-province',
         'hosp-add-phone','hosp-add-contact-name','hosp-add-contact-phone','hosp-add-status'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        ['hosp-add-email','hosp-add-name','hosp-add-address','hosp-add-city','hosp-add-province',
         'hosp-add-phone','hosp-add-contact-name','hosp-add-contact-phone'].forEach(id => {
            clearHospitalFieldError(id);
        });
        
        closeModal('addHospitalModal');
        
        // Show success modal with callback to re-render
        showSysSuccessModal(
            'Hospital Created!',
            `${name} has been added to the system. Credentials sent to ${email}.`,
            () => hospRender()
        );
        
    } catch (err) {
        showBloodPlusMessage('Create Hospital Failed', err.message || 'Creation failed', 'error');
        console.error('[Hospital] Create error:', err);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    }
}

// ??????????????????????????????????????????????????????????????????????????
// EDIT HOSPITAL – Open modal with data
// ??????????????????????????????????????????????????????????????????????????
function hospOpenEdit(id) {
    const h = hospData.find(x => x.id === id);
    if (!h) {
        showBloodPlusMessage('Hospital Not Found', 'The selected hospital record could not be loaded.', 'error');
        return;
    }
    
    document.getElementById('hosp-edit-idx').value = id;
    document.getElementById('hosp-edit-name').value = h.hospitalName || '';
    document.getElementById('hosp-edit-address').value = h.address || '';
    document.getElementById('hosp-edit-city').value = h.city || '';
    document.getElementById('hosp-edit-province').value = h.province || '';
    document.getElementById('hosp-edit-phone').value = h.phoneNumber || '';
    document.getElementById('hosp-edit-contact-name').value = h.contactPersonName || '';
    document.getElementById('hosp-edit-contact-phone').value = h.contactPersonPhone || '';
    document.getElementById('hosp-edit-email').value = h.email || '';
    document.getElementById('hosp-edit-pass').value = '';
    document.getElementById('hosp-edit-status').value = (h.status || 'active').toLowerCase();

    ['hosp-edit-name', 'hosp-edit-city', 'hosp-edit-province', 'hosp-edit-address',
     'hosp-edit-email', 'hosp-edit-phone', 'hosp-edit-contact-name', 'hosp-edit-contact-phone'].forEach(id => {
        clearHospitalFieldError(id);
    });
    lockPhilippinePhoneInput('hosp-edit-phone');
    lockPhilippinePhoneInput('hosp-edit-contact-phone');
    
    openModal('editHospitalModal');
}

// ??????????????????????????????????????????????????????????????????????????
// EDIT HOSPITAL – Save changes
// ??????????????????????????????????????????????????????????????????????????
async function hospSaveEdit() {
    if (!validateHospitalEditForm()) return;

    const id = document.getElementById('hosp-edit-idx').value;
    const name = document.getElementById('hosp-edit-name')?.value.trim();
    const address = document.getElementById('hosp-edit-address')?.value.trim();
    const city = document.getElementById('hosp-edit-city')?.value.trim();
    const province = document.getElementById('hosp-edit-province')?.value.trim();
    const email = document.getElementById('hosp-edit-email')?.value.trim().toLowerCase();
    const newPassword = document.getElementById('hosp-edit-pass')?.value?.trim() || '';
    const status = (document.getElementById('hosp-edit-status')?.value || 'active').toLowerCase();
    const phone = lockPhilippinePhoneInput('hosp-edit-phone').trim();
    const contactName = document.getElementById('hosp-edit-contact-name')?.value.trim() || null;
    const contactPhone = lockPhilippinePhoneInput('hosp-edit-contact-phone').trim();

    if (newPassword && newPassword.length < 8) {
        showBloodPlusMessage('Invalid Password', 'Reset password must be at least 8 characters.', 'error');
        const passEl = document.getElementById('hosp-edit-pass');
        if (passEl) passEl.focus();
        return;
    }
    
    const btn = document.querySelector('#editHospitalModal .btn-primary');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Saving…';
    }
    
    try {
        const res = await fetch(`${HOSPITAL_API}/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                hospitalName: name, address, city, province,
                email,
                status,
                newPassword: newPassword || null,
                phoneNumber: phone, contactPersonName: contactName,
                contactPersonPhone: contactPhone
            })
        });
        
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Update failed');
        }
        
        const updated = await res.json();
        const idx = hospData.findIndex(x => x.id === parseInt(id));
        if (idx >= 0) hospData[idx] = updated;
        
        closeModal('editHospitalModal');
        
        // Show success modal with callback to re-render
        showSysSuccessModal(
            'Hospital Updated!',
            `${name} has been successfully updated.`,
            () => hospRender()
        );
        
    } catch (err) {
        showBloodPlusMessage('Update Hospital Failed', err.message || 'Update failed', 'error');
        console.error('[Hospital] Edit error:', err);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    }
}

// ??????????????????????????????????????????????????????????????????????????
// DELETE HOSPITAL
// ??????????????????????????????????????????????????????????????????????????
async function hospDelete(id) {
    const h = hospData.find(x => x.id === parseInt(id));
    if (!h) {
        alert('Hospital not found');
        return;
    }

    try {
        const res = await fetch(`${HOSPITAL_API}/${id}`, { method: 'DELETE' });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.error || 'Deletion failed');
        }

        hospData = hospData.filter(x => x.id !== parseInt(id));
        closeModal('editHospitalModal');
        
        // Show success modal with callback to re-render
        showSysSuccessModal(
            'Hospital Deleted!',
            `${h.hospitalName} has been permanently removed from the system.`,
            () => hospRender()
        );
        
    } catch (err) {
        alert('Error: ' + err.message);
        console.error('[Hospital] Delete error:', err);
    }
}

// ??????????????????????????????????????????????????????????????????????????
// CONFIRM DELETE (from table row) – Uses reusable modal
// ??????????????????????????????????????????????????????????????????????????
function hospConfirmDelete(id) {
    const h = hospData.find(x => x.id === id);
    if (!h) {
        alert('Hospital not found');
        return;
    }

    // Show delete confirmation modal
    showSysDeleteConfirmModal(
        'hospital',                          // resourceType
        h.hospitalName,                      // resourceName (what's being deleted)
        `Email: ${h.email}`,                 // details
        () => hospDelete(id)                 // onConfirmCallback
    );
}


// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
// STAFF PROFILE FUNCTIONS
// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
// ?? GLOBAL STATE ??
let currentUserRole = 'STAFF'; // Set from backend
let currentUserId = null;
let currentUserData = {};
let activePanel = 'dashboard';
let reqData          = [];
 
// ?? INITIALIZATION ??
document.addEventListener('DOMContentLoaded', () => {
  loadCurrentUserProfile();
  initializeProfileListeners();
});
 
// ?? LOAD CURRENT USER PROFILE ??
async function loadCurrentUserProfile() {
  try {
    const response = await fetch('/api/auth/me', {
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Failed to load user profile');
      return;
    }

    const userData = await response.json();
    currentUserRole = userData.role;
    currentUserId = userData.id;
    updateAdminPanelBadge(userData.role);

    if (currentUserRole === 'ADMIN') {
      loadAdminProfile();
    } else if (currentUserRole === 'STAFF') {
      loadStaffProfile();
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}
 
// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
// ADMIN PROFILE FUNCTIONS
// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦

async function loadAdminProfile() {
  try {
    const response = await fetch('/api/admin/profile', {
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Failed to load admin profile');
      return;
    }

    const adminData = await response.json();
    currentUserData = adminData;
    currentUserId = adminData.id;
    
    // Show admin profile container, hide staff
    const adminContainer = document.getElementById('admin-profile-container');
    const staffContainer = document.getElementById('staff-profile-container');
    if (adminContainer) adminContainer.style.display = 'block';
    if (staffContainer) staffContainer.style.display = 'none';
    
    // Populate sidebar
    updateSidebarUser('AD', adminData.username || 'Administrator', 'System Administrator');
    
    // Populate profile panel
    populateAdminProfileForm(adminData);
    
    // Show the first tab (Overview) by default
    showAdminProfileDefaultTab();
  } catch (error) {
    console.error('Error loading admin profile:', error);
  }
}

function populateAdminProfileForm(data) {
  // Populate avatar
  const avatarEl = document.getElementById('profile-avatar-display');
  if (avatarEl) {
    avatarEl.textContent = (data.username || 'Admin').substring(0, 2).toUpperCase();
  }
  
  // Populate name and role
  const nameDisplay = document.getElementById('profile-name-display');
  const roleDisplay = document.getElementById('profile-role-display');
  if (nameDisplay) nameDisplay.textContent = data.username || 'Administrator';
  if (roleDisplay) roleDisplay.textContent = 'System Administrator';
  
  // Populate member since
  const memberSinceEl = document.getElementById('profile-member-since');
  if (memberSinceEl && data.createdAt) {
    memberSinceEl.textContent = formatDate(data.createdAt);
  }
  
  // Populate form fields
  const emailField = document.getElementById('profile-email');
  const usernameField = document.getElementById('profile-username');
  
  if (emailField) emailField.value = data.email || '';
  if (usernameField) usernameField.value = data.username || '';
}

function showAdminProfileDefaultTab() {
  // Display the first tab (Overview) by default using CSS classes
  const firstTabButton = document.querySelector('#admin-profile-container .profile-tab-btn:first-child');
  const firstTabContent = document.querySelector('#admin-profile-container .profile-tab-content:first-child');
  
  // Remove active class from all tabs and buttons
  document.querySelectorAll('#admin-profile-container .profile-tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('#admin-profile-container .profile-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Add active class to first tab and button
  if (firstTabContent) {
    firstTabContent.classList.add('active');
  }
  
  if (firstTabButton) {
    firstTabButton.classList.add('active');
  }
}
 
async function submitAdminProfileUpdate() {
  const email = document.getElementById('profile-email').value;
  const username = document.getElementById('profile-username').value;
  
  // Validation
  if (!email || !username) {
    showProfileError('All fields are required');
    return;
  }
  
  if (!isValidEmail(email)) {
    showProfileError('Invalid email address');
    return;
  }
  
  // Show loading state
  const submitBtn = event.target;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Saving...';
  submitBtn.disabled = true;
  
  try {
    const response = await fetch('/api/admin/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        email: email,
        username: username
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      showProfileError(errorData.message || 'Failed to update profile');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      return;
    }

    const updated = await response.json();
    currentUserData = updated;
    
    showProfileSuccess('Profile updated successfully');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  } catch (error) {
    console.error('Error updating profile:', error);
    showProfileError('An error occurred while updating profile');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}
 
function resetAdminProfileForm() {
  populateAdminProfileForm(currentUserData);
  document.getElementById('profile-edit-error').style.display = 'none';
  document.getElementById('profile-edit-success').style.display = 'none';
}


// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
// STAFF PROFILE FUNCTIONS
// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦

async function loadStaffProfile() {
  try {
    const response = await fetch('/api/admin/staff/profile', {
      headers: { 
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include'
    });

    if (!response.ok) {
      console.error('Failed to load staff profile');
      return;
    }

    const staffData = await response.json();
    currentUserData = staffData;
    currentUserId = staffData.id;
    
    // Show staff profile container, hide admin
    const adminContainer = document.getElementById('admin-profile-container');
    const staffContainer = document.getElementById('staff-profile-container');
    if (adminContainer) adminContainer.style.display = 'none';
    if (staffContainer) staffContainer.style.display = 'block';
    
    // Populate sidebar
    const initials = (staffData.firstName.charAt(0) + staffData.lastName.charAt(0)).toUpperCase();
    updateSidebarUser(initials, staffData.firstName + ' ' + staffData.lastName, staffData.position);
    
    // Populate profile panel
    populateStaffProfileForm(staffData);
    
    // Show the first tab (Overview) by default
    showStaffProfileDefaultTab();
  } catch (error) {
    console.error('Error loading staff profile:', error);
  }
}

function populateStaffProfileForm(data) {
  // Populate avatar
  const avatarEl = document.getElementById('staff-profile-avatar-display');
  if (avatarEl) {
    const initials = (data.firstName.charAt(0) + data.lastName.charAt(0)).toUpperCase();
    avatarEl.textContent = initials;
  }
  
  // Populate name and role
  const nameDisplay = document.getElementById('staff-profile-name-display');
  const roleDisplay = document.getElementById('staff-profile-role-display');
  if (nameDisplay) nameDisplay.textContent = data.firstName + ' ' + data.lastName;
  if (roleDisplay) roleDisplay.textContent = data.position || '-';
  
  // Populate info cards
  const staffIdEl = document.getElementById('staff-profile-staffid');
  const deptEl = document.getElementById('staff-profile-department');
  const hiredEl = document.getElementById('staff-profile-hiredate');
  
  if (staffIdEl) staffIdEl.textContent = data.staffId || '-';
  if (deptEl) deptEl.textContent = data.department || '-';
  if (hiredEl) {
    const createdValue = data.createdAt || data.user?.createdAt || data.hireDate;
    hiredEl.textContent = createdValue ? formatDate(createdValue) : '-';
  }
  
  // Populate form fields
  const firstNameField = document.getElementById('staff-profile-firstname');
  const lastNameField = document.getElementById('staff-profile-lastname');
  const emailField = document.getElementById('staff-profile-email');
  const usernameField = document.getElementById('staff-profile-username');
  const phoneField = document.getElementById('staff-profile-phone');
  const deptInputField = document.getElementById('staff-profile-department-input');
  const posInputField = document.getElementById('staff-profile-position-input');
  
  if (firstNameField) firstNameField.value = data.firstName || '';
  if (lastNameField) lastNameField.value = data.lastName || '';
  if (emailField) emailField.value = (data.user && data.user.email) || '';
  if (usernameField) {
    usernameField.value = normalizeStaffUsername(data.user?.username || '');
    clearStaffFieldError('staff-profile-username');
  }
  if (phoneField) {
    phoneField.value = data.phoneNumber || '+63';
    lockPhilippinePhoneInput('staff-profile-phone');
    clearStaffFieldError('staff-profile-phone');
  }
  if (deptInputField) deptInputField.value = data.department || '';
  if (posInputField) posInputField.value = data.position || '';
}

function showStaffProfileDefaultTab() {
  // Display the first tab (Overview) by default using CSS classes
  const firstTabButton = document.querySelector('#staff-profile-container .profile-tab-btn:first-child');
  const firstTabContent = document.querySelector('#staff-profile-container .profile-tab-content:first-child');
  
  // Remove active class from all tabs and buttons
  document.querySelectorAll('#staff-profile-container .profile-tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('#staff-profile-container .profile-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // Add active class to first tab and button
  if (firstTabContent) {
    firstTabContent.classList.add('active');
  }
  
  if (firstTabButton) {
    firstTabButton.classList.add('active');
  }
}

async function submitStaffProfileUpdate() {
  const firstNameInput = document.getElementById('staff-profile-firstname');
  const lastNameInput = document.getElementById('staff-profile-lastname');
  const usernameInput = document.getElementById('staff-profile-username');
  if (firstNameInput) firstNameInput.value = normalizePersonName(firstNameInput.value).slice(0, 25);
  if (lastNameInput) lastNameInput.value = normalizePersonName(lastNameInput.value).slice(0, 25);
  if (usernameInput) usernameInput.value = normalizeStaffUsername(usernameInput.value);

  const firstName = firstNameInput?.value || '';
  const lastName = lastNameInput?.value || '';
  const normalizedPhone = lockPhilippinePhoneInput('staff-profile-phone');
  const phoneDigits = normalizedPhone.slice(3).replace(/\D/g, '');
  const phoneNumber = phoneDigits.length === 10 ? normalizedPhone : null;
  
  // Validation
  let firstInvalidId = '';
  if (!validateStaffNameField('staff-profile-firstname')) firstInvalidId = 'staff-profile-firstname';
  if (!validateStaffNameField('staff-profile-lastname') && !firstInvalidId) firstInvalidId = 'staff-profile-lastname';
  if (!validateStaffProfileUsernameField() && !firstInvalidId) firstInvalidId = 'staff-profile-username';
  if (!validateStaffProfilePhoneField(true) && !firstInvalidId) firstInvalidId = 'staff-profile-phone';
  const username = usernameInput?.value || '';

  if (firstInvalidId) {
    showStaffProfileError('Please correct the highlighted fields before saving.');
    focusStaffField(firstInvalidId);
    return;
  }
  
  // Show loading state
  const submitBtn = event.target;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Saving...';
  submitBtn.disabled = true;
  
  try {
    const response = await fetch('/api/admin/staff/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        firstName: firstName,
        lastName: lastName,
        username: username,
        phoneNumber: phoneNumber
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      showStaffProfileError(errorData.message || 'Failed to update profile');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      return;
    }

    const updated = await response.json();
    currentUserData = updated;
    
    // Update sidebar with new name
    const initials = (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
    updateSidebarUser(initials, firstName + ' ' + lastName, currentUserData.position);
    
    showStaffProfileSuccess('Profile updated successfully');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  } catch (error) {
    console.error('Error updating profile:', error);
    showStaffProfileError('An error occurred while updating profile');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  }
}

function resetStaffProfileForm() {
  populateStaffProfileForm(currentUserData);
  document.getElementById('staff-profile-edit-error').style.display = 'none';
  document.getElementById('staff-profile-edit-success').style.display = 'none';
  ['staff-profile-firstname', 'staff-profile-lastname', 'staff-profile-username', 'staff-profile-phone']
    .forEach((id) => clearStaffFieldError(id));
}

function updateSidebarUser(initials, name, role) {
  const avatarEl = document.getElementById('sidebar-user-avatar');
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = role;
}


// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
// PASSWORD MANAGEMENT (BOTH ADMIN AND STAFF)
// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦

function checkPasswordStrength() {
  const password = document.getElementById('new-password').value;
  const meter = document.getElementById('password-strength');
  
  if (!password) {
    meter.classList.remove('show');
    return;
  }
  
  meter.classList.add('show');
  meter.innerHTML = '';
  
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
  if (password.match(/[0-9]/)) strength++;
  if (password.match(/[^a-zA-Z0-9]/)) strength++;
  
  const bar = document.createElement('div');
  bar.className = 'password-strength-bar';
  
  if (strength <= 1) {
    bar.classList.add('password-strength-weak');
  } else if (strength <= 2) {
    bar.classList.add('password-strength-fair');
  } else {
    bar.classList.add('password-strength-strong');
  }
  
  meter.appendChild(bar);
}

function checkStaffPasswordStrength() {
  const password = document.getElementById('staff-new-password').value;
  const meter = document.getElementById('staff-password-strength');
  
  if (!password) {
    meter.classList.remove('show');
    return;
  }
  
  meter.classList.add('show');
  meter.innerHTML = '';
  
  let strength = 0;
  if (password.length >= 8) strength++;
  if (password.match(/[a-z]/) && password.match(/[A-Z]/)) strength++;
  if (password.match(/[0-9]/)) strength++;
  if (password.match(/[^a-zA-Z0-9]/)) strength++;
  
  const bar = document.createElement('div');
  bar.className = 'password-strength-bar';
  
  if (strength <= 1) {
    bar.classList.add('password-strength-weak');
  } else if (strength <= 2) {
    bar.classList.add('password-strength-fair');
  } else {
    bar.classList.add('password-strength-strong');
  }
  
  meter.appendChild(bar);
}

function togglePasswordVisibility(fieldId) {
  const field = document.getElementById(fieldId);
  const isPassword = field.type === 'password';
  field.type = isPassword ? 'text' : 'password';
  event.target.textContent = isPassword ? 'Hide' : 'Show';
}

async function submitPasswordChange() {
  const currentPassword = document.getElementById('current-password').value;
  const newPassword = document.getElementById('new-password').value;
  const confirmPassword = document.getElementById('confirm-password').value;
  
  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    showSecurityError('All password fields are required');
    return;
  }
  
  if (newPassword.length < 8) {
    showSecurityError('New password must be at least 8 characters long');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showSecurityError('New password and confirmation do not match');
    return;
  }
  
  if (currentPassword === newPassword) {
    showSecurityError('New password must be different from current password');
    return;
  }
  
  // Show loading state
  const submitBtn = (typeof event !== 'undefined' && event?.target)
    ? event.target
    : document.querySelector('#profile-tab-security .btn-primary');
  const originalText = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.textContent = 'Updating...';
    submitBtn.disabled = true;
  }
  
  try {
    const response = await fetch('/api/admin/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        currentPassword: currentPassword,
        newPassword: newPassword
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      showSecurityError(errorData.message || 'Failed to change password');
      if (submitBtn) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
      return;
    }

    // Clear form
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    document.getElementById('password-strength').classList.remove('show');
    
    showSecuritySuccess('Password updated successfully');
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error changing password:', error);
    showSecurityError('An error occurred while changing password');
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
}

async function submitStaffPasswordChange() {
  const currentPassword = document.getElementById('staff-current-password').value;
  const newPassword = document.getElementById('staff-new-password').value;
  const confirmPassword = document.getElementById('staff-confirm-password').value;
  
  // Validation
  if (!currentPassword || !newPassword || !confirmPassword) {
    showStaffSecurityError('All password fields are required');
    return;
  }
  
  if (newPassword.length < 8) {
    showStaffSecurityError('New password must be at least 8 characters long');
    return;
  }
  
  if (newPassword !== confirmPassword) {
    showStaffSecurityError('New password and confirmation do not match');
    return;
  }
  
  if (currentPassword === newPassword) {
    showStaffSecurityError('New password must be different from current password');
    return;
  }
  
  // Show loading state
  const submitBtn = (typeof event !== 'undefined' && event?.target)
    ? event.target
    : document.querySelector('#staff-profile-tab-security .btn-primary');
  const originalText = submitBtn ? submitBtn.textContent : '';
  if (submitBtn) {
    submitBtn.textContent = 'Updating...';
    submitBtn.disabled = true;
  }
  
  try {
    const response = await fetch('/api/admin/staff/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        currentPassword: currentPassword,
        newPassword: newPassword
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      showStaffSecurityError(errorData.message || 'Failed to change password');
      if (submitBtn) {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
      }
      return;
    }

    // Clear form
    document.getElementById('staff-current-password').value = '';
    document.getElementById('staff-new-password').value = '';
    document.getElementById('staff-confirm-password').value = '';
    document.getElementById('staff-password-strength').classList.remove('show');
    
    showStaffSecuritySuccess('Password updated successfully');
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error changing password:', error);
    showStaffSecurityError('An error occurred while changing password');
    if (submitBtn) {
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
    }
  }
}

function resetPasswordForm() {
  document.getElementById('current-password').value = '';
  document.getElementById('new-password').value = '';
  document.getElementById('confirm-password').value = '';
  document.getElementById('password-strength').classList.remove('show');
  document.getElementById('security-error').style.display = 'none';
  document.getElementById('security-success').style.display = 'none';
}

function resetStaffPasswordForm() {
  document.getElementById('staff-current-password').value = '';
  document.getElementById('staff-new-password').value = '';
  document.getElementById('staff-confirm-password').value = '';
  document.getElementById('staff-password-strength').classList.remove('show');
  document.getElementById('staff-security-error').style.display = 'none';
  document.getElementById('staff-security-success').style.display = 'none';
}


// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
// PROFILE TAB SWITCHING
// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦

function switchProfileTab(tabName, element) {
  // For Admin Profile - Use classes instead of inline styles
  document.querySelectorAll('#admin-profile-container .profile-tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('#admin-profile-container .profile-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const tabElement = document.getElementById('profile-tab-' + tabName);
  if (tabElement) {
    tabElement.classList.add('active');
  }
  
  element.classList.add('active');
}

function switchStaffProfileTab(tabName, element) {
  // For Staff Profile - Use classes instead of inline styles
  document.querySelectorAll('#staff-profile-container .profile-tab-content').forEach(tab => {
    tab.classList.remove('active');
  });
  
  document.querySelectorAll('#staff-profile-container .profile-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  const tabElement = document.getElementById('staff-profile-tab-' + tabName);
  if (tabElement) {
    tabElement.classList.add('active');
  }
  
  element.classList.add('active');
}


// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
// PANEL SWITCHING
// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦

function showPanel(panelName, element) {
  activePanel = panelName; // ?? ADD THIS

  document.querySelectorAll('.panel').forEach(panel => {
    panel.classList.remove('active');
  });

  document.querySelectorAll('.nav-item').forEach(item => {
    item.classList.remove('active');
  });

  const panelElement = document.getElementById('panel-' + panelName);
  if (panelElement) {
    panelElement.classList.add('active');
  }

  if (element) {
    element.classList.add('active');
  }

  window.scrollTo(0, 0);
}


// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
// UTILITY FUNCTIONS
// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
 
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}


// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
// ERROR & SUCCESS MESSAGE HANDLERS
// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦

// Admin Profile Messages
function showProfileError(message) {
  const errorEl = document.getElementById('profile-edit-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'flex';
    
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }
}
 
function showProfileSuccess(message) {
  const successEl = document.getElementById('profile-edit-success');
  if (successEl) {
    successEl.textContent = message;
    successEl.style.display = 'flex';
    
    setTimeout(() => {
      successEl.style.display = 'none';
    }, 4000);
  }
}

// Staff Profile Messages
function showStaffProfileError(message) {
  const errorEl = document.getElementById('staff-profile-edit-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'flex';
    
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }
}

function showStaffProfileSuccess(message) {
  const successEl = document.getElementById('staff-profile-edit-success');
  if (successEl) {
    successEl.textContent = message;
    successEl.style.display = 'flex';
    
    setTimeout(() => {
      successEl.style.display = 'none';
    }, 4000);
  }
}

// Security Messages (Admin)
function showSecurityError(message) {
  const errorEl = document.getElementById('security-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'flex';
    
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }
}
 
function showSecuritySuccess(message) {
  const successEl = document.getElementById('security-success');
  if (successEl) {
    successEl.textContent = message;
    successEl.style.display = 'flex';
    
    setTimeout(() => {
      successEl.style.display = 'none';
    }, 4000);
  }
}

// Security Messages (Staff)
function showStaffSecurityError(message) {
  const errorEl = document.getElementById('staff-security-error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'flex';
    
    setTimeout(() => {
      errorEl.style.display = 'none';
    }, 5000);
  }
}

function showStaffSecuritySuccess(message) {
  const successEl = document.getElementById('staff-security-success');
  if (successEl) {
    successEl.textContent = message;
    successEl.style.display = 'flex';
    
    setTimeout(() => {
      successEl.style.display = 'none';
    }, 4000);
  }
}



// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
// EVENT LISTENERS INITIALIZATION
// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦

function initializeProfileListeners() {
  bindStaffProfilePhoneInput();
  applyStaffNameFormatting();

  const staffProfilePhone = document.getElementById('staff-profile-phone');
  if (staffProfilePhone && staffProfilePhone.dataset.staffProfilePhoneValidationBound !== '1') {
    staffProfilePhone.dataset.staffProfilePhoneValidationBound = '1';
    staffProfilePhone.addEventListener('blur', validateStaffProfilePhoneField);
  }

  const staffProfileUsername = document.getElementById('staff-profile-username');
  if (staffProfileUsername && staffProfileUsername.dataset.staffProfileUsernameBound !== '1') {
    staffProfileUsername.dataset.staffProfileUsernameBound = '1';
    staffProfileUsername.addEventListener('input', () => {
      staffProfileUsername.value = normalizeStaffUsername(staffProfileUsername.value);
      clearStaffFieldError('staff-profile-username');
    });
    staffProfileUsername.addEventListener('blur', validateStaffProfileUsernameField);
  }

  // Add any additional event listeners if needed
  document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const activePanel = document.querySelector('.panel.active');
      if (activePanel && activePanel.id === 'panel-profile') {
        // Optional: auto-submit on Enter if needed
      }
    }
  });
}


//////// LOGS PANEL - API INTEGRATION //////

// Configuration
const API_BASE_URL = '/api/admin/logs';

// State
const loggingState = {
  statusLogsPage: 1,
  servedPage: 1,
  itemsPerPage: 10,
  currentTab: 'status-logs',
  loading: false,
  restoreScrollAfterRefresh: false,
  pendingScrollY: 0,
  servedFilters: {
    search: '',
    startDate: '',
    endDate: '',
    requestGroup: 'ALL',
    sort: 'date_desc',
  },
  servedFilteredRows: [],
  servedFilteredTotal: 0,
};

function initializeLoggingPanel() {
  const requiredElements = [
    'logging-served-units-count',
    'logging-status-changes-count',
    'logging-pending-requests-count',
    'logging-released-count',
    'logging-status-tbody',
    'logging-served-tbody',
  ];

  const missingElements = requiredElements.filter((id) => !document.getElementById(id));
  if (missingElements.length > 0) {
    console.error('Missing logging panel elements:', missingElements);
    return;
  }

  const startEl = document.getElementById('logging-served-date-from');
  const endEl = document.getElementById('logging-served-date-to');
  if (startEl && endEl && !startEl.value && !endEl.value) {
    setServedRange('thisYear', false);
  }
  const statusStartEl = document.getElementById('logging-status-date-from');
  const statusEndEl = document.getElementById('logging-status-date-to');
  if (statusStartEl && statusEndEl && !statusStartEl.value && !statusEndEl.value) {
    setStatusRange('thisYear', false);
  }

  loadLoggingData();
}

function queueLoggingScrollRestore() {
  loggingState.restoreScrollAfterRefresh = true;
  loggingState.pendingScrollY = window.scrollY || window.pageYOffset || 0;
}

function restoreLoggingScrollIfNeeded() {
  if (!loggingState.restoreScrollAfterRefresh) {
    return;
  }

  const targetY = loggingState.pendingScrollY || 0;
  loggingState.restoreScrollAfterRefresh = false;

  requestAnimationFrame(() => {
    window.scrollTo(0, targetY);
  });
}

function loadLoggingData() {
  loggingState.loading = true;
  loadSummary();
  loggingStatusRender();
}

function loadSummary() {
  fetch(`${API_BASE_URL}/summary`)
    .then((response) => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then((data) => {
      loggingUpdateSummary(data);
    })
    .catch((error) => {
      console.error('Error loading summary:', error);
    });
}

function loggingUpdateSummary(summaryData) {
  try {
    const servedCountEl = document.getElementById('logging-served-units-count');
    if (servedCountEl) {
      servedCountEl.textContent = summaryData.totalFulfillments || 0;
    }

    const statusChangesEl = document.getElementById('logging-status-changes-count');
    if (statusChangesEl) {
      statusChangesEl.textContent = summaryData.totalStatusChanges || 0;
    }

    const pendingEl = document.getElementById('logging-pending-requests-count');
    if (pendingEl) {
      pendingEl.textContent = summaryData.pendingRequestsCount || 0;
    }

    const releasedEl = document.getElementById('logging-released-count');
    if (releasedEl) {
      releasedEl.textContent = summaryData.releasedCount || 0;
    }
  } catch (error) {
    console.error('Error updating summary:', error);
  }
}

function switchLoggingTab(tabName, element) {
  document.querySelectorAll('.logging-tab-content').forEach((tab) => {
    tab.style.display = 'none';
  });

  document.querySelectorAll('.logging-tab-btn').forEach((btn) => {
    btn.classList.remove('active');
  });

  const tabElement = document.getElementById(`logging-${tabName}-tab`);
  if (tabElement) {
    tabElement.style.display = 'block';
  }

  if (element) {
    element.classList.add('active');
  }
  loggingState.currentTab = tabName;

  if (tabName === 'status-logs') {
    loggingStatusRender();
    return;
  }

  loggingServedRender();
}

function loggingStatusRender(resetPage = false, silent = false) {
  try {
    if (resetPage) {
      loggingState.statusLogsPage = 1;
    }

    const searchEl = document.getElementById('logging-status-search');
    const statusFilterEl = document.getElementById('logging-status-filter-status');
    const dateFromEl = document.getElementById('logging-status-date-from');
    const dateToEl = document.getElementById('logging-status-date-to');
    const sortEl = document.getElementById('logging-status-sort');

    const search = searchEl ? searchEl.value.trim() : '';
    const statusFilter = statusFilterEl ? statusFilterEl.value : 'ALL';
    const dateFrom = dateFromEl ? dateFromEl.value : '';
    const dateTo = dateToEl ? dateToEl.value : '';
    const sort = sortEl ? sortEl.value : 'date_desc';

    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
    if (dateFrom) queryParams.append('dateFrom', dateFrom);
    if (dateTo) queryParams.append('dateTo', dateTo);
    queryParams.append('sort', sort);
    queryParams.append('page', String(loggingState.statusLogsPage));
    queryParams.append('size', String(loggingState.itemsPerPage));

    if (!silent) {
      showLoadingInTable('logging-status-tbody', 7);
    }

    fetch(`${API_BASE_URL}/status-logs?${queryParams.toString()}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        renderStatusLogsTable(data);
      })
      .catch((error) => {
        console.error('Error fetching status logs:', error);
        if (!silent) {
          showErrorInTable('logging-status-tbody', 'Failed to load status logs', 7);
        }
      });
  } catch (error) {
    console.error('Error in loggingStatusRender:', error);
  }
}

function renderStatusLogsTable(response) {
  try {
    const tbody = document.getElementById('logging-status-tbody');
    const empty = document.getElementById('logging-status-empty');

    if (!tbody) {
      return;
    }

    tbody.innerHTML = '';

    if (!response.data || response.data.length === 0) {
      if (empty) empty.style.display = 'block';
      updatePaginationControls('status', response.currentPage || 1, response.totalPages || 1, response.totalElements || 0);
      restoreLoggingScrollIfNeeded();
      return;
    }

    if (empty) empty.style.display = 'none';

    response.data.forEach((log) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${log.request?.referenceNumber || 'N/A'}</td>
        <td><span class="status-badge" style="background:#F8FAFC;color:#475569">${log.oldStatus || 'N/A'}</span></td>
        <td><span class="status-badge" style="background:#E8F5E9;color:#22863A">${log.newStatus || 'N/A'}</span></td>
        <td>${log.changedBy?.username || 'System'}</td>
        <td>${formatDateTime(log.changedAt)}</td>
        <td style="max-width:200px;white-space:normal;word-break:break-word;font-size:12px">${log.notes || 'N/A'}</td>
        <td>
          <button class="btn-ghost" onclick="viewStatusLogDetail(${log.id})" style="padding:4px 8px;font-size:11px">View</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    updatePaginationControls('status', response.currentPage || 1, response.totalPages || 1, response.totalElements || 0);
    restoreLoggingScrollIfNeeded();
  } catch (error) {
    console.error('Error rendering status logs table:', error);
  }
}

function loggingStatusPrevPage() {
  if (loggingState.statusLogsPage > 1) {
    queueLoggingScrollRestore();
    loggingState.statusLogsPage -= 1;
    loggingStatusRender(false, true);
  }
}

function loggingStatusNextPage() {
  queueLoggingScrollRestore();
  loggingState.statusLogsPage += 1;
  loggingStatusRender(false, true);
}

function getServedFilterState() {
  const searchEl = document.getElementById('logging-served-search');
  const startEl = document.getElementById('logging-served-date-from');
  const endEl = document.getElementById('logging-served-date-to');
  const sortEl = document.getElementById('logging-served-sort');
  const requestGroupEl = document.getElementById('logging-served-request-group');

  return {
    search: searchEl ? searchEl.value.trim() : '',
    startDate: startEl ? startEl.value : '',
    endDate: endEl ? endEl.value : '',
    sort: sortEl ? sortEl.value : 'date_desc',
    requestGroup: requestGroupEl ? requestGroupEl.value : 'ALL',
  };
}

function buildServedQueryParams(filters, options = {}) {
  const {
    includePagination = true,
    page = loggingState.servedPage,
    size = loggingState.itemsPerPage,
  } = options;

  const queryParams = new URLSearchParams();
  if (filters.search) queryParams.append('search', filters.search);
  if (filters.startDate) queryParams.append('startDate', filters.startDate);
  if (filters.endDate) queryParams.append('endDate', filters.endDate);
  if (filters.requestGroup && filters.requestGroup !== 'ALL') queryParams.append('requestGroup', filters.requestGroup);
  queryParams.append('sort', filters.sort || 'date_desc');

  if (includePagination) {
    queryParams.append('page', String(page));
    queryParams.append('size', String(size));
  }

  return queryParams;
}

function loggingServedRender(resetPage = false, silent = false) {
  try {
    if (resetPage) {
      loggingState.servedPage = 1;
    }

    const filters = getServedFilterState();
    loggingState.servedFilters = filters;
    const queryParams = buildServedQueryParams(filters, {
      includePagination: true,
      page: loggingState.servedPage,
      size: loggingState.itemsPerPage,
    });

    if (!silent) {
      showLoadingInTable('logging-served-tbody', 12);
    }

    fetch(`${API_BASE_URL}/served?${queryParams.toString()}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        renderServedTable(data);
      })
      .catch((error) => {
        console.error('Error fetching served logs:', error);
        if (!silent) {
          showErrorInTable('logging-served-tbody', 'Failed to load served logs', 12);
        }
      });
  } catch (error) {
    console.error('Error in loggingServedRender:', error);
  }
}

function renderServedTable(response) {
  try {
    const tbody = document.getElementById('logging-served-tbody');
    const empty = document.getElementById('logging-served-empty');

    if (!tbody) {
      return;
    }

    tbody.innerHTML = '';

    const rows = response.data || [];
    loggingState.servedFilteredRows = rows;
    loggingState.servedFilteredTotal = Number(response.totalElements || 0);

    if (rows.length === 0) {
      if (empty) empty.style.display = 'block';
      updatePaginationControls('served', response.currentPage || 1, response.totalPages || 1, response.totalElements || 0);
      restoreLoggingScrollIfNeeded();
      return;
    }

    if (empty) empty.style.display = 'none';

    rows.forEach((rowData) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${rowData.referenceNumber || 'N/A'}</strong></td>
        <td>${rowData.patientName || 'N/A'}</td>
        <td>${toDisplayEnum(rowData.requestCategory) || 'N/A'}</td>
        <td>${resolveHospitalWard(rowData)}</td>
        <td>${toDisplayEnum(rowData.bloodType) || 'N/A'}</td>
        <td>${toDisplayEnum(rowData.bloodComponent) || 'N/A'}</td>
        <td>${safeNumber(rowData.requestedUnits)}</td>
        <td>${safeNumber(rowData.servedUnits)}</td>
        <td>${safeNumber(rowData.unservedUnits)}</td>
        <td>${renderResultBadge(rowData.result)}</td>
        <td>${formatDateTime(rowData.lastServedAt)}</td>
        <td>
          <button class="btn-ghost" onclick="openServedDetails(${rowData.requestId})" style="padding:4px 8px;font-size:11px">View</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    updatePaginationControls('served', response.currentPage || 1, response.totalPages || 1, response.totalElements || 0);
    restoreLoggingScrollIfNeeded();
  } catch (error) {
    console.error('Error rendering served table:', error);
  }
}

function loggingServedPrevPage() {
  if (loggingState.servedPage > 1) {
    queueLoggingScrollRestore();
    loggingState.servedPage -= 1;
    loggingServedRender(false, true);
  }
}

function loggingServedNextPage() {
  queueLoggingScrollRestore();
  loggingState.servedPage += 1;
  loggingServedRender(false, true);
}

function viewStatusLogDetail(logId) {
  fetch(`${API_BASE_URL}/status-logs/${logId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch status log detail');
      }
      return response.json();
    })
    .then((log) => {
      populateLoggingStatusModal(log);
    })
    .catch((error) => {
      console.error('Error fetching status log detail:', error);
      alert('Failed to load status log details');
    });
}

function populateLoggingStatusModal(log) {
  try {
    document.getElementById('logging-status-modal-request-id').textContent = `#${log.request?.id || 'N/A'}`;
    document.getElementById('logging-status-modal-ref-num').textContent = log.request?.referenceNumber || 'N/A';
    document.getElementById('logging-status-modal-old-status').textContent = log.oldStatus || 'N/A';
    document.getElementById('logging-status-modal-new-status').textContent = log.newStatus || 'N/A';
    document.getElementById('logging-status-modal-changed-by').textContent = log.changedBy?.fullName || log.changedBy?.username || 'System';
    document.getElementById('logging-status-modal-changed-at').textContent = formatDateTime(log.changedAt);
    document.getElementById('logging-status-modal-notes').textContent = log.notes || 'N/A';
    document.getElementById('logging-status-modal').style.display = 'flex';
  } catch (error) {
    console.error('Error populating status log modal:', error);
  }
}

function closeLoggingStatusModal() {
  const modal = document.getElementById('logging-status-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function openServedDetails(requestId) {
  fetch(`${API_BASE_URL}/served/${requestId}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to fetch served detail');
      }
      return response.json();
    })
    .then((detail) => {
      populateLoggingServedModal(detail);
    })
    .catch((error) => {
      console.error('Error fetching served details:', error);
      alert('Failed to load served details');
    });
}

function populateLoggingServedModal(detail) {
  try {
    const servedUnits = safeNumber(detail.servedUnits);
    const unservedUnits = safeNumber(detail.unservedUnits);

    const modalTitle = document.getElementById('logging-served-modal-title');
    if (modalTitle) {
      modalTitle.textContent = `Served Details - ${detail.referenceNumber || `#${detail.requestId || 'N/A'}`}`;
    }

    document.getElementById('logging-served-modal-request-id').textContent = detail.referenceNumber || `#${detail.requestId || 'N/A'}`;
    document.getElementById('logging-served-modal-patient').textContent = detail.patientName || 'N/A';
    document.getElementById('logging-served-modal-blood').textContent = `${toDisplayEnum(detail.bloodType) || 'N/A'} / ${toDisplayEnum(detail.bloodComponent) || 'N/A'}`;
    document.getElementById('logging-served-modal-requested').textContent = `${safeNumber(detail.requestedUnits)} unit(s)`;
    document.getElementById('logging-served-modal-served').textContent = `${servedUnits} unit(s)`;
    document.getElementById('logging-served-modal-unserved-count').textContent = `${unservedUnits} unit(s)`;
    document.getElementById('logging-served-modal-result').textContent = detail.result || 'N/A';
    document.getElementById('logging-served-modal-requester-type').textContent = toDisplayEnum(detail.requestCategory) || 'N/A';
    document.getElementById('logging-served-modal-hospital-ward').textContent = resolveHospitalWard(detail);
    document.getElementById('logging-served-modal-last-served').textContent = formatDateTime(detail.lastServedAt);

    const servedBagsEl = document.getElementById('logging-served-modal-bags');
    const servedBags = Array.isArray(detail.servedBags) ? detail.servedBags : [];
    if (servedBagsEl) {
      if (servedBags.length === 0) {
        servedBagsEl.innerHTML = '<div>No served blood bags recorded.</div>';
      } else {
        servedBagsEl.innerHTML = servedBags
          .map((bag, idx) => {
            const serial = bag.serialNumber || 'N/A';
            const staff = bag.fulfilledBy || 'System';
            const when = formatDetailedDateTime(bag.fulfilledAt);
            return `<div>${idx + 1}. ${serial} | 1 unit | ${staff} | ${when}</div>`;
          })
          .join('');
      }
    }

    const unservedReasonEl = document.getElementById('logging-served-modal-unserved-reason');
    if (unservedReasonEl) {
      if (unservedUnits > 0) {
        unservedReasonEl.textContent = `${unservedUnits} unit(s) - ${detail.unservedReason || 'No compatible stock available.'}`;
      } else {
        unservedReasonEl.textContent = 'None';
      }
    }

    document.getElementById('logging-served-modal').style.display = 'flex';
  } catch (error) {
    console.error('Error populating served modal:', error);
  }
}

function closeLoggingServedModal() {
  const modal = document.getElementById('logging-served-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

function applyQuickDateRange(startEl, endEl, range) {
  if (!startEl || !endEl) {
    return;
  }

  const todayDate = new Date();
  let start = new Date(todayDate);
  let end = new Date(todayDate);

  if (range === 'thisMonth') {
    start = new Date(todayDate.getFullYear(), todayDate.getMonth(), 1);
  } else if (range === 'lastMonth') {
    start = new Date(todayDate.getFullYear(), todayDate.getMonth() - 1, 1);
    end = new Date(todayDate.getFullYear(), todayDate.getMonth(), 0);
  } else if (range === 'last7Days') {
    start = new Date(todayDate);
    start.setDate(todayDate.getDate() - 6);
  } else if (range === 'thisYear') {
    start = new Date(todayDate.getFullYear(), 0, 1);
  }

  startEl.value = toInputDate(start);
  endEl.value = toInputDate(end);
}

function setServedRange(range, shouldRender = true) {
  const startEl = document.getElementById('logging-served-date-from');
  const endEl = document.getElementById('logging-served-date-to');
  applyQuickDateRange(startEl, endEl, range);

  if (shouldRender) {
    loggingState.servedPage = 1;
    loggingServedRender();
  }
}

function setStatusRange(range, shouldRender = true) {
  const startEl = document.getElementById('logging-status-date-from');
  const endEl = document.getElementById('logging-status-date-to');
  applyQuickDateRange(startEl, endEl, range);
  if (shouldRender) {
    loggingState.statusLogsPage = 1;
    loggingStatusRender();
  }
}

function exportStatusLogsExcel() {
  const searchEl = document.getElementById('logging-status-search');
  const statusFilterEl = document.getElementById('logging-status-filter-status');
  const startEl = document.getElementById('logging-status-date-from');
  const endEl = document.getElementById('logging-status-date-to');

  const search = searchEl ? searchEl.value.trim() : '';
  const statusFilter = statusFilterEl ? statusFilterEl.value : 'ALL';
  const startDate = startEl ? startEl.value : '';
  const endDate = endEl ? endEl.value : '';

  const queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);
  if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
  if (!startDate || !endDate) {
    alert('Please select both start and end dates before exporting.');
    return;
  }
  queryParams.append('startDate', startDate);
  queryParams.append('endDate', endDate);

  fetch(`${API_BASE_URL}/export/status-logs?${queryParams.toString()}`)
    .then((response) => {
      if (!response.ok) {
        return response.json().catch(() => ({})).then((errorBody) => {
          throw new Error(errorBody.error || 'Failed to export data');
        });
      }
      return response.json();
    })
    .then((data) => {
      if (!data || data.length === 0) {
        alert('No status log data to export.');
        return;
      }

      const rows = data.map((log) => ({
        'Serial no.': log.referenceNumber || '',
        'Old Status': log.oldStatus || '',
        'New Status': log.newStatus || '',
        'Changed By': log.changedByUsername || 'System',
        'Changed At': formatExcelDate(log.changedAt),
        Notes: log.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 20 },
        { wch: 18 },
        { wch: 18 },
        { wch: 20 },
        { wch: 32 },
        { wch: 40 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Status Logs');
      XLSX.writeFile(wb, `status-logs-${today()}.xlsx`);
    })
    .catch((error) => {
      console.error('Error exporting status logs:', error);
      alert('Failed to export status logs');
    });
}

function exportDetailedServedLogs() {
  const filters = getServedFilterState();
  loggingState.servedFilters = filters;
  const queryParams = buildServedQueryParams(filters, { includePagination: false });

  fetch(`${API_BASE_URL}/export/served/details?${queryParams.toString()}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to export served details');
      }
      return response.json();
    })
    .then((rowsData) => {
      if (!rowsData || rowsData.length === 0) {
        alert('No served log data to export for the selected range.');
        return;
      }

      const rows = rowsData.map((row) => ({
        'Serial no.': row.referenceNumber || '',
        Patient: row.patientName || '',
        'Request Category': toDisplayEnum(row.requestCategory) || '',
        'Hospital / Ward': resolveHospitalWard(row),
        'Blood Type': toDisplayEnum(row.bloodType) || '',
        Component: toDisplayEnum(row.bloodComponent) || '',
        'Requested Units': safeNumber(row.requestedUnits),
        'Served Units': safeNumber(row.servedUnits),
        'Unserved Units': safeNumber(row.unservedUnits),
        Result: row.result || '',
        'Served Blood Bags': (row.servedBags || []).map((bag) => bag.serialNumber || 'N/A').join('; '),
        'Unserved Reason': row.unservedReason || '',
        'Last Served At': formatDetailedDateTime(row.lastServedAt),
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 20 },
        { wch: 24 },
        { wch: 18 },
        { wch: 28 },
        { wch: 14 },
        { wch: 18 },
        { wch: 14 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
        { wch: 32 },
        { wch: 36 },
        { wch: 34 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Served Details');
      XLSX.writeFile(wb, `served-details-${today()}.xlsx`);
    })
    .catch((error) => {
      console.error('Error exporting served details:', error);
      alert('Failed to export served details');
    });
}

function formatDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDetailedDateTime(raw) {
  if (!raw) return '—';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '—';

  const datePart = date.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
  const weekday = date.toLocaleDateString('en-US', { weekday: 'long' });
  const time = date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${datePart} | ${weekday} | ${time}`;
}

function formatExcelDate(raw) {
  if (!raw) return '';
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function toInputDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toDisplayEnum(value) {
  if (!value) return '';
  return String(value)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

function safeNumber(value) {
  return Number.isFinite(value) ? value : 0;
}

function resolveHospitalWard(row) {
  const requestCategory = String(row.requestCategory || '').toUpperCase();
  if (requestCategory === 'INPATIENT' || requestCategory === 'INHOUSE') {
    return row.wardRoom || row.hospitalName || '—';
  }
  if (requestCategory === 'OUTPATIENT' || requestCategory === 'OPD' || requestCategory === 'HOSPITAL') {
    return row.hospitalName || row.wardRoom || '—';
  }
  return row.hospitalName || row.wardRoom || '—';
}

function renderResultBadge(result) {
  const value = result || 'Unserved';
  let style = 'background:#FFF4E5;color:#9A6700';
  if (value === 'Served') {
    style = 'background:#E8F5E9;color:#22863A';
  } else if (value === 'Partially Served') {
    style = 'background:#FFF3E0;color:#B45309';
  }
  return `<span class="status-badge" style="${style}">${value}</span>`;
}

function updatePaginationControls(type, currentPage, totalPages, totalElements) {
  const prefix = type === 'status' ? 'logging-status' : 'logging-served';

  const safeCurrent = Math.max(Number(currentPage) || 1, 1);
  const safePages = Math.max(Number(totalPages) || 1, 1);
  const safeTotal = Math.max(Number(totalElements) || 0, 0);
  const normalizedCurrent = Math.min(safeCurrent, safePages);

  if (type === 'status') {
    loggingState.statusLogsPage = normalizedCurrent;
  } else {
    loggingState.servedPage = normalizedCurrent;
  }

  const showingEl = document.getElementById(`${prefix}-showing`);
  const pageLabelEl = document.getElementById(`${prefix}-page-label`);
  const prevEl = document.getElementById(`${prefix}-prev`);
  const nextEl = document.getElementById(`${prefix}-next`);
  const resultsEl = document.getElementById(`${prefix}-results-info`);

  const startIdx = safeTotal === 0 ? 0 : ((normalizedCurrent - 1) * loggingState.itemsPerPage) + 1;
  const endIdx = safeTotal === 0 ? 0 : Math.min(normalizedCurrent * loggingState.itemsPerPage, safeTotal);

  if (showingEl) showingEl.textContent = `Showing ${startIdx}-${endIdx} of ${safeTotal}`;
  if (pageLabelEl) pageLabelEl.textContent = `${normalizedCurrent} / ${safePages}`;
  if (prevEl) prevEl.disabled = normalizedCurrent <= 1;
  if (nextEl) nextEl.disabled = normalizedCurrent >= safePages;
  if (resultsEl) resultsEl.textContent = `${safeTotal} result${safeTotal !== 1 ? 's' : ''}`;
}

function showLoadingInTable(tbodyId, colSpan = 8) {
  const tbody = document.getElementById(tbodyId);
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:20px;color:var(--muted)">Loading...</td></tr>`;
  }
}

function showErrorInTable(tbodyId, message, colSpan = 8) {
  const tbody = document.getElementById(tbodyId);
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="${colSpan}" style="text-align:center;padding:20px;color:#E74C3C">${message}</td></tr>`;
  }
}

document.addEventListener('click', function(event) {
  const statusModal = document.getElementById('logging-status-modal');
  const servedModal = document.getElementById('logging-served-modal');

  if (statusModal && event.target.classList.contains('logging-modal-backdrop') && event.target.parentElement === statusModal) {
    closeLoggingStatusModal();
  }

  if (servedModal && event.target.classList.contains('logging-modal-backdrop') && event.target.parentElement === servedModal) {
    closeLoggingServedModal();
  }
});
/**
 * REUSABLE MODAL SYSTEM
 * Functions for success and delete confirmation modals
 * Used across the entire system for consistency
 */

// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
// SUCCESS MODAL FUNCTIONS
// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦

let sysSuccessCallback = null;

function showSysSuccessModal(title = 'Success!', message = 'Operation completed successfully.', callback = null) {
    const titleEl = document.getElementById('sysSuccessTitle');
    const messageEl = document.getElementById('sysSuccessMessage');
    const iconEl = document.getElementById('sysSuccessIcon');

    if (titleEl) titleEl.textContent = title;
    if (messageEl) messageEl.textContent = message;
    
    // Reset animation
    if (iconEl) {
        iconEl.style.animation = 'none';
        setTimeout(() => {
            if (iconEl) iconEl.style.animation = 'successPulse 0.6s ease';
        }, 10);
    }

    sysSuccessCallback = callback;
    openModal('sysSuccessModal');
}

function closeSysSuccessModal() {
    closeModal('sysSuccessModal');
    if (sysSuccessCallback && typeof sysSuccessCallback === 'function') {
        sysSuccessCallback();
    }
}

// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
// DELETE CONFIRMATION MODAL FUNCTIONS
// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦

let sysDeleteAction = null;

function showSysDeleteConfirmModal(resourceType = 'Item', resourceName = '', details = '', onConfirmCallback) {
    const messageEl = document.getElementById('sysDeleteConfirmMessage');
    const detailsEl = document.getElementById('sysDeleteConfirmDetails');
    const btn = document.getElementById('sysDeleteConfirmBtn');

    // Set message
    if (messageEl) {
        messageEl.textContent = `Are you sure you want to delete this ${resourceType}?`;
    }

    // Set details (what's being deleted)
    if (detailsEl) {
        detailsEl.textContent = resourceName || details || 'This item will be permanently removed.';
    }

    // Store callback
    sysDeleteAction = onConfirmCallback;

    // Update button text if needed
    if (btn) {
        btn.textContent = 'Yes, Delete';
    }

    openModal('sysDeleteConfirmModal');
}

function closeSysDeleteConfirmModal() {
    closeModal('sysDeleteConfirmModal');
    sysDeleteAction = null;
}

function sysConfirmDeleteAction() {
    if (sysDeleteAction && typeof sysDeleteAction === 'function') {
        const btn = document.getElementById('sysDeleteConfirmBtn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Deleting…';
        }

        Promise.resolve(sysDeleteAction()).then(() => {
            closeSysDeleteConfirmModal();
        }).catch(err => {
            console.error('Delete action error:', err);
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Yes, Delete';
            }
        });
    }
}

// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦
// HELPER: Show toast notification (alternative to modal)
// ¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦¦

function showToast(message, type = 'info', duration = 3000) {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 9999;
            display: flex;
            flex-direction: column;
            gap: 10px;
        `;
        document.body.appendChild(toastContainer);
    }

    // Create toast element
    const toast = document.createElement('div');
    const bgColor = type === 'success' ? 'var(--soft-green, #E8F5E9)' : 
                    type === 'error' ? 'var(--soft-red, #FFEBEE)' : 
                    'var(--blue-light, #E8F0FF)';
    const textColor = type === 'success' ? 'var(--green, #2E7D32)' : 
                      type === 'error' ? 'var(--crimson, #C41E3A)' : 
                      'var(--blue, #1E40AF)';
    const icon = type === 'success' ? 'OK' : 
                 type === 'error' ? 'X' : 'i';

    toast.style.cssText = `
        background: ${bgColor};
        border: 1px solid rgba(0, 0, 0, 0.1);
        border-radius: 8px;
        padding: 12px 16px;
        font-size: 13px;
        color: ${textColor};
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
        animation: slideIn 0.3s ease;
    `;
    toast.innerHTML = `<span style="font-size: 16px;">${icon}</span><span>${message}</span>`;

    toastContainer.appendChild(toast);

    // Auto remove after duration
    setTimeout(() => {
        toast.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => toast.remove(), 300);
    }, duration);
}

// Add toast animations
if (!document.getElementById('toast-styles')) {
    const style = document.createElement('style');
    style.id = 'toast-styles';
    style.textContent = `
        @keyframes slideIn {
            from {
                transform: translateX(400px);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }
        @keyframes slideOut {
            from {
                transform: translateX(0);
                opacity: 1;
            }
            to {
                transform: translateX(400px);
                opacity: 0;
            }
        }
    `;
    document.head.appendChild(style);
}

// -----------------------------------------------------------
// ENHANCED AUTO-REFRESH WITH CHANGE DETECTION (SILENT UPDATES)
// =============================================================

let autoRefreshIntervals = {};
let dataSnapshots = {
  dashboard: null,
  bloodBank: null,
  requests: null,
  logging: null,  
};
const autoRefreshInFlight = {
  dashboard: false,
  bloodBank: false,
  requests: false,
  logging: false,
};
/**
 * Creates a snapshot of data for change detection
 */
function createSnapshot(data) {
  if (!data) return null;
  return JSON.stringify(data);
}

/**
 * Detects if data has changed by comparing snapshots
 */
function hasDataChanged(oldSnapshot, newSnapshot) {
  if (oldSnapshot === null || newSnapshot === null) return true;
  return oldSnapshot !== newSnapshot;
}

/**
 * Fetches and compares dashboard data
 */
async function checkDashboardUpdates() {
  if (autoRefreshInFlight.dashboard) return;
  autoRefreshInFlight.dashboard = true;
  try {
    const res = await fetch('/api/admin/dashboard', { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const json = await res.json();
    
    const newSnapshot = createSnapshot(json);
    
    if (hasDataChanged(dataSnapshots.dashboard, newSnapshot)) {
      dataSnapshots.dashboard = newSnapshot;
      loadDashboard();
    }
  } catch (err) {
    console.error('[Auto-Refresh] Dashboard check failed:', err);
  } finally {
    autoRefreshInFlight.dashboard = false;
  }
}

/**
 * Fetches and compares blood bank data
 */
async function checkBloodBankUpdates() {
  if (autoRefreshInFlight.bloodBank) return;
  autoRefreshInFlight.bloodBank = true;
  try {
    const res = await fetch('/api/admin/blood-bank/bags', { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const json = await res.json();
    
    const newSnapshot = createSnapshot(json);
    
    if (hasDataChanged(dataSnapshots.bloodBank, newSnapshot)) {
      dataSnapshots.bloodBank = newSnapshot;
      loadBloodBank();
    }
  } catch (err) {
    console.error('[Auto-Refresh] Blood Bank check failed:', err);
  } finally {
    autoRefreshInFlight.bloodBank = false;
  }
}

/**
 * Fetches and compares blood requests data
 */
async function checkBloodRequestsUpdates() {
  if (autoRefreshInFlight.requests) return;
  autoRefreshInFlight.requests = true;
  try {
    const res = await fetch('/api/admin/blood-requests', { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const json = await res.json();
    
    const newSnapshot = createSnapshot(json);
    
    if (hasDataChanged(dataSnapshots.requests, newSnapshot)) {
      dataSnapshots.requests = newSnapshot;
      reqFetchAll();
    }
  } catch (err) {
    console.error('[Auto-Refresh] Blood Requests check failed:', err);
  } finally {
    autoRefreshInFlight.requests = false;
  }
}

/**
 * Initialize auto-refresh with change detection
 * Checks every 30 seconds for changes, silently updates if data has changed
 */
function initializeAutoRefresh() {
  // Load initial data and create snapshots
  loadDashboard();
  loadBloodBank();
  reqFetchAll();

  // Small delay to ensure initial data is loaded
  setTimeout(() => {
    dataSnapshots.dashboard = createSnapshot(window.dashboardData || {});
    dataSnapshots.bloodBank = createSnapshot(window.bankData || []);
    dataSnapshots.requests = createSnapshot(reqData || []);
  }, 500);

  // console.log('[Auto-Refresh] Initialized - checking for changes every 30 seconds');

  const REFRESH_INTERVAL = 5000; // 5 seconds for checking

  autoRefreshIntervals.combined = setInterval(() => {
    if (document.hidden) return;
    checkDashboardUpdates();
    checkBloodBankUpdates();
    checkBloodRequestsUpdates();
    checkLoggingUpdates(); 
  }, REFRESH_INTERVAL);
}

/**
 * Stop auto-refresh
 */
function stopAutoRefresh() {
  if (autoRefreshIntervals.combined) clearInterval(autoRefreshIntervals.combined);
  // console.log('[Auto-Refresh] Stopped');
}

/**
 * Pause auto-refresh temporarily
 */
function pauseAutoRefresh() {
  stopAutoRefresh();
  // console.log('[Auto-Refresh] Paused');
}

/**
 * Resume auto-refresh
 */
function resumeAutoRefresh() {
  initializeAutoRefresh();
  // console.log('[Auto-Refresh] Resumed');
}

/**
 * Change refresh check interval (in seconds)
 */
function changeRefreshInterval(seconds) {
  stopAutoRefresh();
  const REFRESH_INTERVAL = seconds * 1000;

  autoRefreshIntervals.combined = setInterval(() => {
    if (document.hidden) return;
    // console.log(`[Auto-Refresh] Checking for changes (${seconds}s interval)...`);
    
    checkDashboardUpdates();
    checkBloodBankUpdates();
    checkBloodRequestsUpdates();
    checkLoggingUpdates();

  }, REFRESH_INTERVAL);

  // console.log(`[Auto-Refresh] Check interval changed to ${seconds} seconds`);
}

async function checkLoggingUpdates() {
  if (autoRefreshInFlight.logging) return;
  autoRefreshInFlight.logging = true;
  try {
    const res = await fetch('/api/admin/logs/summary', { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const json = await res.json();

    const newSnapshot = createSnapshot(json);
    const summaryChanged = hasDataChanged(dataSnapshots.logging, newSnapshot);
    const loggingPanelActive = activePanel === 'logging';

    if (summaryChanged) {
      dataSnapshots.logging = newSnapshot;
    }

    // Keep summary cards accurate from the poll response itself.
    loggingUpdateSummary(json);

    // While the logs panel is open, always refresh the active table.
    // Summary counters are too coarse to detect every row-level change.
    if (loggingPanelActive) {
      queueLoggingScrollRestore();
      if (loggingState.currentTab === 'status-logs') {
        loggingStatusRender(false, true);
      } else {
        loggingServedRender(false, true);
      }
      return;
    }

  } catch (err) {
    console.error('[Auto-Refresh] Logging check failed:', err);
  } finally {
    autoRefreshInFlight.logging = false;
  }
}

/**
 * Force invalidate all snapshots and refresh
 * Useful when user manually triggers refresh
 */
function forceRefreshAll() {
  dataSnapshots.dashboard = null;
  dataSnapshots.bloodBank = null;
  dataSnapshots.requests = null;
  
  loadDashboard();
  loadBloodBank();
  reqFetchAll();
  loadSummary();
  if (loggingState.currentTab === 'status-logs') {
    loggingStatusRender();
  } else {
    loggingServedRender();
  }
  // console.log('[Auto-Refresh] Forced refresh - all data reloaded');
}




