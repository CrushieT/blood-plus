// ═══════════════════════════════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════════════════════════════
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
    const staffNavItem = document.querySelector('[onclick="showPanel(\'staff\', this)"]');
    
    // Hide staff management if user is not ADMIN
    if (staffNavItem) {
      if (user.role === 'ADMIN') {
        staffNavItem.style.display = 'flex';
        staffLoadAll();  // ↑ Only load staff data if admin
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
  initializeAutoRefresh();  // ↑ This replaces the loadBloodBank() and loadDashboard() calls
  initStaffPanel();
  initializeLoggingPanel();
});

// ── Panel navigation ──────────────────────────────────────────────────────────
function showPanel(id, navEl) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  if (navEl) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    navEl.classList.add('active');
  }
}


// ── Modal helpers ──────────────────────────────────────────────────────────────
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.add('show');
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) modal.classList.remove('show');
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

// ── Logout ─────────────────────────────────────────────────────────────────────
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


// ═══════════════════════════════════════════════════════════════════════════════
// ADMIN DASHBOARD - FRONTEND (UPDATED)
// ═══════════════════════════════════════════════════════════════════════════════

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
      renderRecentActivities(data.recentActivities);  // ↑ ADD THIS LINE
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
    O_NEG:'O−', O_POS:'O+', A_POS:'A+', A_NEG:'A−',
    B_POS:'B+', B_NEG:'B−', AB_POS:'AB+', AB_NEG:'AB−'
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

  const urgencyColor = { CRITICAL:'var(--crimson)', HIGH:'var(--amber)', MEDIUM:'var(--blue)', LOW:'var(--green)' };

  container.innerHTML = pending.map(r => {
    const name    = r.hospitalProfile?.hospitalName ?? r.requesterName ?? '–';
    const blood   = r.bloodType ?? '–';
    const units   = r.numberOfUnits ?? 1;
    const urgency = r.urgencyLevel ?? 'LOW';
    const color   = urgencyColor[urgency] || 'var(--muted)';

    return `
      <div style="display:flex;align-items:center;gap:12px;padding:11px 0;border-bottom:1px solid var(--border)">
        <div style="width:4px;height:36px;background:${color};border-radius:2px;flex-shrink:0"></div>
        <div style="flex:1;min-width:0">
          <div style="font-size:13px;font-weight:600;color:var(--charcoal)">${name}</div>
          <div style="font-size:11px;color:var(--muted);margin-top:1px">${units} unit${units > 1 ? 's' : ''} · ${urgency[0] + urgency.slice(1).toLowerCase()} urgency</div>
        </div>
        <span style="font-family:'Playfair Display',serif;font-weight:700;font-size:15px;color:var(--crimson)">${blood}</span>
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

// ═══════════════════════════════════════════════════════════════════════════════
// BLOOD BANK
// ═══════════════════════════════════════════════════════════════════════════════

let BLOOD_BAGS      = [];
let INVENTORY       = [];
const BAGS_PER_PAGE = 10;
let bagsCurrentPage = 1;
let bagsCurrent     = [];

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
      'O_NEG_NEGATIVE':  'O−',  'O_POS_POSITIVE':  'O+',
      'A_POS_POSITIVE':  'A+',  'A_NEG_NEGATIVE':  'A−',
      'B_POS_POSITIVE':  'B+',  'B_NEG_NEGATIVE':  'B−',
      'AB_POS_POSITIVE': 'AB+', 'AB_NEG_NEGATIVE': 'AB−',
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

async function loadBloodBags() {
  try {
    const res = await fetch('/api/admin/blood-bank/bags', { credentials: 'include' });
    if (!res.ok) return;
    const data = await res.json();

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

    renderBagsTable();
    
    // Trigger blood request compatible bags cache invalidation
    invalidateBagCache();
  } catch (err) {
    console.error('Failed to load blood bags:', err);
  }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
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
  if (bag.eventName) return '🩸 ' + bag.eventName;
  const map = {
    DONATION:        '🩸 Blood Drive',
    WALK_IN:         '🚶 Walk-in Donor',
    TRANSFER:        '🔄 BMC Transfer',
    EXTERNAL_SUPPLY: '📦 External Supply',
  };
  return map[bag.source] ?? bag.source ?? '–';
}

function computeBagStatus(bag) {
  const now  = new Date();
  const soon = new Date(); soon.setDate(soon.getDate() + 10);
  const exp  = new Date(bag.expiresAt);

  if (bag.status === 'DISCARDED')    return 'DISCARDED';
  if (bag.status === 'DISPENSED')    return 'DISPENSED';
  if (bag.status === 'CROSSMATCHED') return 'CROSSMATCHED';
  if (bag.status === 'EXPIRED' || (bag.status === 'AVAILABLE' && exp < now)) return 'EXPIRED';
  if (bag.status === 'AVAILABLE' && exp <= soon) return 'EXPIRING';
  return 'AVAILABLE';
}

function formatBagDate(d) {
  if (!d) return '–';
  const str = d.includes('T') ? d : d + 'T00:00:00';
  return new Date(str).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// ── Tab Switcher ───────────────────────────────────────────────────────────────
function switchBBTab(tab, btn) {
  ['inventory','bags','analytics'].forEach(t => {
    document.getElementById('bb-tab-' + t).style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.bb-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (tab === 'bags')      renderBagsTable();
  if (tab === 'inventory') renderInventoryGrid();
}

// ── Inventory Grid ─────────────────────────────────────────────────────────────
function renderInventoryGrid(apiData) {
  const grid = document.getElementById('inv-grid');
  if (!grid) return;

  const levelMap = {
    EMPTY:    { label:'✕ Empty',    cls:'level-critical' },
    CRITICAL: { label:'⚠ Critical', cls:'level-critical' },
    LOW:      { label:'↓ Low',      cls:'level-low' },
    GOOD:     { label:'✓ Good',     cls:'level-ok' },
    HIGH:     { label:'↑ High',     cls:'level-high' },
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
        <div class="bu-vol" style="font-size:11px;color:var(--muted);margin-top:1px">
          ${item.volumeMl ? (item.volumeMl / 1000).toFixed(1) + ' L total' : ''}
        </div>
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
      alert.innerHTML = `<span style="font-size:16px">⚠</span>
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
    ?? BLOOD_BAGS.filter(b =>
        b.status === 'AVAILABLE' &&
        new Date(b.expiresAt) <= soon &&
        new Date(b.expiresAt) > now
      ).length;

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

// ── Bags Table ─────────────────────────────────────────────────────────────────
function renderBagsTable() {
  const q      = (document.getElementById('bags-search')?.value       || '').toLowerCase();
  const bt     = document.getElementById('bags-filter-bt')?.value     || 'ALL';
  const comp   = document.getElementById('bags-filter-comp')?.value   || 'ALL';
  const status = document.getElementById('bags-filter-status')?.value || 'ALL';
  const sort   = document.getElementById('bags-sort')?.value          || 'expiry_asc';

  let list = BLOOD_BAGS.map(bag => ({ ...bag, computedStatus: computeBagStatus(bag) }));

  if (bt !== 'ALL') {
    list = list.filter(b => {
      const key = b.bloodType + '_' + b.rhType;
      return key === bt;
    });
  }
  if (comp   !== 'ALL') list = list.filter(b => b.componentType === comp);
  if (status !== 'ALL') list = list.filter(b => b.computedStatus === status);
  if (q) list = list.filter(b =>
    (b.serialNumber      || '').toLowerCase().includes(q) ||
    (b.transactionNumber || '').toLowerCase().includes(q) ||
    fullBloodLabel(b.bloodType, b.rhType).toLowerCase().includes(q)
  );

  list.sort((a, b) => {
    if (sort === 'expiry_asc')     return new Date(a.expiresAt)   - new Date(b.expiresAt);
    if (sort === 'expiry_desc')    return new Date(b.expiresAt)   - new Date(a.expiresAt);
    if (sort === 'collected_desc') return new Date(b.collectedAt) - new Date(a.collectedAt);
    if (sort === 'collected_asc')  return new Date(a.collectedAt) - new Date(b.collectedAt);
    return 0;
  });

  bagsCurrent = list;

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

  bagsCurrentPage = 1;
  renderBagsPage();
}

function renderBagsPage() {
  const tbody  = document.getElementById('bags-tbody');
  const empty  = document.getElementById('bags-empty');
  const footer = document.getElementById('bags-footer');
  const total  = bagsCurrent.length;

  const sortedBags = [...bagsCurrent].sort((a, b) => {
    const statusPriority = {
      EXPIRING: 1,
      AVAILABLE: 2,
      CROSSMATCHED: 3,
      DISPENSED: 4,
      EXPIRED: 5,
      DISCARDED: 6
    };

    const aPriority = statusPriority[a.computedStatus] || 99;
    const bPriority = statusPriority[b.computedStatus] || 99;

    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }

    const aExpiry = new Date(a.expiresAt || '9999-12-31').getTime();
    const bExpiry = new Date(b.expiresAt || '9999-12-31').getTime();

    return aExpiry - bExpiry;
  });

  if (!total) {
    tbody.innerHTML      = '';
    empty.style.display  = 'block';
    footer.style.display = 'none';
    return;
  }

  empty.style.display  = 'none';
  footer.style.display = 'flex';

  const start   = (bagsCurrentPage - 1) * BAGS_PER_PAGE;
  const page    = sortedBags.slice(start, start + BAGS_PER_PAGE);
  const pages   = Math.ceil(total / BAGS_PER_PAGE);
  const now     = new Date();
  const twoDays = new Date(); twoDays.setDate(twoDays.getDate() + 2);
  const soon    = new Date(); soon.setDate(soon.getDate() + 7);

  tbody.innerHTML = page.map(bag => {
    const exp      = new Date(bag.expiresAt);
    const daysLeft = Math.ceil((exp - now) / 86400000);
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
      expiryPill = `<span class="expiry-pill expiry-critical">⚠ ${daysLeft < 1 ? '<1' : daysLeft}d (open)</span>`;
    } else if (exp <= twoDays) {
      expiryPill = `<span class="expiry-pill expiry-critical">⚠ ${daysLeft}d left</span>`;
    } else if (exp <= soon) {
      expiryPill = `<span class="expiry-pill expiry-soon">⚠ ${daysLeft}d left</span>`;
    } else {
      expiryPill = `<span class="expiry-pill expiry-ok">${daysLeft}d left</span>`;
    }

    const statusBadgeMap = {
      AVAILABLE:    `<span class="bag-status bag-status-available">● Available</span>`,
      EXPIRING:     `<span class="bag-status bag-status-expiring">⚠ Expiring</span>`,
      CROSSMATCHED: `<span class="bag-status bag-status-crossmatched">🔒 Reserved for patient </span>`,
      DISPENSED:    `<span class="bag-status bag-status-dispensed">↗ Dispensed</span>`,
      EXPIRED:      `<span class="bag-status bag-status-expired">✕ Expired</span>`,
      DISCARDED:    `<span class="bag-status bag-status-discarded">✕ Discarded</span>`,
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
      if (bag.componentType === 'WHOLE_BLOOD' && !bag.openSystem) {
        actions += `
          <button class="btn-secondary" style="font-size:11px;padding:5px 10px"
            onclick="confirmOpenSystem(${bag.id}, '${bag.serialNumber}')">↗ PRBC</button>`;
      }
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

  document.getElementById('bags-showing').textContent =
    `Showing ${start + 1}–${Math.min(start + BAGS_PER_PAGE, total)} of ${total} bags`;
  document.getElementById('bags-page-label').textContent = `${bagsCurrentPage} / ${pages}`;
  document.getElementById('bags-prev').disabled = bagsCurrentPage <= 1;
  document.getElementById('bags-next').disabled = bagsCurrentPage >= pages;
}

function bagsPrevPage() {
  if (bagsCurrentPage > 1) { bagsCurrentPage--; renderBagsPage(); }
}
function bagsNextPage() {
  if (bagsCurrentPage < Math.ceil(bagsCurrent.length / BAGS_PER_PAGE)) {
    bagsCurrentPage++;
    renderBagsPage();
  }
}

// ── Bag Detail Modal ───────────────────────────────────────────────────────────
function openBagDetail(id) {
  const bag = BLOOD_BAGS.find(b => b.id === id);
  if (!bag) return;
  const cs = computeBagStatus(bag);

  const statusBadgeMap = {
    AVAILABLE:    `<span class="bag-status bag-status-available"  style="font-size:13px;padding:5px 14px">● Available</span>`,
    EXPIRING:     `<span class="bag-status bag-status-expiring"   style="font-size:13px;padding:5px 14px">⚠ Expiring Soon</span>`,
    CROSSMATCHED: `<span class="bag-status bag-status-crossmatched" style="font-size:13px;padding:5px 14px">🔒 Crossmatched</span>`,
    DISPENSED:    `<span class="bag-status bag-status-dispensed"  style="font-size:13px;padding:5px 14px">↗ Dispensed</span>`,
    EXPIRED:      `<span class="bag-status bag-status-expired"    style="font-size:13px;padding:5px 14px">✕ Expired</span>`,
    DISCARDED:    `<span class="bag-status bag-status-discarded"  style="font-size:13px;padding:5px 14px">✕ Discarded</span>`,
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
    openWarn.innerHTML = `<span>⚠</span>
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
    const convertBtn = bag.componentType === 'WHOLE_BLOOD' && !bag.openSystem
      ? `<button class="btn-secondary" style="flex:1;justify-content:center;padding:11px"
           onclick="closeModal('bagDetailModal');confirmOpenSystem(${bag.id},'${bag.serialNumber}')">
           ↗ Convert to PRBC</button>`
      : '';
    actionsEl.innerHTML = `
      ${convertBtn}
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

// ── Open System Conversion ─────────────────────────────────────────────────────
async function confirmOpenSystem(id, bagLabel) {
  const confirmed = confirm(
    `Convert bag ${bagLabel} from Whole Blood to PRBC (Open System)?\n\n` +
    `⚠ This is irreversible. The expiry will reset to 24 hours from now.\n` +
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
    renderBagsTable();
    await loadInventory();
    invalidateBagCache();
  } catch (err) {
    console.error('Open system conversion error:', err);
    alert('Network error. Please try again.');
  }
}

// ── Discard ────────────────────────────────────────────────────────────────────
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
    renderBagsTable();
    await loadInventory();
    invalidateBagCache();
  } catch (err) {
    console.error('Discard error:', err);
    alert('Network error. Please try again.');
  }
}

// ── Add Stock Modal ────────────────────────────────────────────────────────────
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

function openAddBloodModal() {
  document.getElementById('add-transaction-number').value = '';
  document.getElementById('add-serial-number').value = '';
  document.getElementById('add-blood-type').value = '';
  document.getElementById('add-rh-type').value = 'POSITIVE';
  document.getElementById('add-component-type').value = '';
  document.getElementById('add-volume-ml').value = '';
  document.getElementById('add-collected-at').value = '';
  document.getElementById('add-expires-at').value = '';
  document.getElementById('add-remarks').value = '';

  const hint = document.getElementById('add-expiry-hint');
  if (hint) hint.textContent = '';

  const rows = document.getElementById('add-stock-rows');
  if (rows) rows.innerHTML = '';

  updateAddStockValidCount();
  openModal('addBloodModal');
}

function getAddStockDefaults() {
  const aboType = document.getElementById('add-blood-type').value;
  const rhType = document.getElementById('add-rh-type').value;

  return {
    serialNumber: document.getElementById('add-serial-number').value.trim(),
    bloodGroup: aboType ? `${aboType}_${rhType === 'POSITIVE' ? 'POS' : 'NEG'}` : '',
    componentType: document.getElementById('add-component-type').value,
    volumeMl: document.getElementById('add-volume-ml').value,
    collectedAt: document.getElementById('add-collected-at').value,
    expiresAt: document.getElementById('add-expires-at').value,
    remarks: document.getElementById('add-remarks').value.trim(),
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

  const serialNumber = data.serialNumber || '';
  const bloodGroup = data.bloodGroup || '';
  const componentType = data.componentType || '';
  const volumeMl = data.volumeMl || '';
  const collectedAt = data.collectedAt || '';
  const expiresAt = data.expiresAt || '';
  const remarks = data.remarks || '';

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
    { value: 'WHOLE_BLOOD', label: 'Whole Blood' },
    { value: 'PRBC', label: 'PRBC' },
    { value: 'LEUKOREDUCED_PRBC', label: 'Leukoreduced PRBC' },
    { value: 'ALIQUOTED_PRBC', label: 'Aliquoted PRBC' },
    { value: 'PLATELET_CONCENTRATE', label: 'Platelet Concentrate' },
    { value: 'FRESH_FROZEN_PLASMA', label: 'Fresh Frozen Plasma' },
    { value: 'CRYOPRECIPITATE', label: 'Cryoprecipitate' },
    { value: 'CRYOSUPERNATANT', label: 'Cryosupernatant' },
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
        <input type="text" class="add-stock-serial" value="${serialNumber}" placeholder="SN-00123" oninput="handleAddStockRowChange(this)">
      </div>
    </td>

    <td style="padding:6px">
      <div class="form-group-m" style="margin:0">
        <input type="date" class="add-stock-collected" value="${collectedAt}" onchange="handleAddStockRowDateChange(this)">
      </div>
    </td>

    <td style="padding:6px">
      <div class="form-group-m" style="margin:0">
        <input type="date" class="add-stock-expires" value="${expiresAt}" onchange="handleAddStockRowChange(this)">
      </div>
    </td>

    <td style="padding:6px">
      <div class="form-group-m" style="margin:0">
        <input type="number" class="add-stock-volume" value="${volumeMl}" min="1" placeholder="450" oninput="handleAddStockRowChange(this)">
      </div>
    </td>

    <td style="padding:6px">
      <div class="form-group-m" style="margin:0">
        <input type="text" class="add-stock-remarks" value="${remarks}" placeholder="Optional" oninput="handleAddStockRowChange(this)">
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

function handleAddStockRowDateChange(el) {
  const row = el.closest('tr');
  if (!row) return;

  const componentType = row.querySelector('.add-stock-component')?.value;
  const collectedAt = row.querySelector('.add-stock-collected')?.value;
  const expiresEl = row.querySelector('.add-stock-expires');

  if (componentType && collectedAt && expiresEl) {
    expiresEl.value = addStockCalculateExpiry(componentType, collectedAt);
  }

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

  updateAddStockValidCount();
}

function getAddStockRowData(row) {
  const bloodGroup = row.querySelector('.add-stock-blood-group')?.value || '';
  const split = splitBloodGroup(bloodGroup);

  return {
    serialNumber: row.querySelector('.add-stock-serial')?.value.trim() || '',
    bloodGroup,
    aboType: split.aboType,
    rhType: split.rhType,
    componentType: row.querySelector('.add-stock-component')?.value || '',
    volumeMl: row.querySelector('.add-stock-volume')?.value || '',
    collectedAt: row.querySelector('.add-stock-collected')?.value || '',
    expiresAt: row.querySelector('.add-stock-expires')?.value || '',
    remarks: row.querySelector('.add-stock-remarks')?.value.trim() || '',
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
    data.bloodGroup &&
    data.aboType &&
    data.rhType &&
    data.componentType &&
    data.volumeMl &&
    data.collectedAt &&
    data.expiresAt;
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
  });

  updateAddStockValidCount();
}

function applyAddStockDefaultsToAllRows() {
  const confirmed = confirm('Apply defaults to all rows? This will overwrite row values except serial numbers.');
  if (!confirmed) return;

  const defaults = getAddStockDefaults();
  const rows = [...document.querySelectorAll('#add-stock-rows tr')];

  rows.forEach(row => {
    row.querySelector('.add-stock-blood-group').value = defaults.bloodGroup;
    row.querySelector('.add-stock-component').value = defaults.componentType;
    row.querySelector('.add-stock-volume').value = defaults.volumeMl;
    row.querySelector('.add-stock-collected').value = defaults.collectedAt;
    row.querySelector('.add-stock-expires').value = defaults.expiresAt;
    row.querySelector('.add-stock-remarks').value = defaults.remarks;
  });

  updateAddStockValidCount();
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
  const transactionNumber = document.getElementById('add-transaction-number').value.trim();
  const rows = [...document.querySelectorAll('#add-stock-rows tr')];

  if (!rows.length) {
    alert('Please add at least one blood bag row.');
    return;
  }

  const allRows = rows.map(row => ({
    element: row,
    data: getAddStockRowData(row),
  }));

  const nonEmptyRows = allRows.filter(item => !isAddStockRowEmpty(item.data));

  if (!nonEmptyRows.length) {
    alert('Please fill in at least one blood bag row.');
    return;
  }

  const incomplete = nonEmptyRows.find(item => !isAddStockRowComplete(item.data));
  if (incomplete) {
    alert('Please complete all partially filled rows before submitting.');
    return;
  }

  const serials = nonEmptyRows.map(item => item.data.serialNumber.toLowerCase());
  const duplicateSerial = serials.find((serial, index) => serials.indexOf(serial) !== index);

  if (duplicateSerial) {
    alert('Duplicate serial number found: ' + duplicateSerial);
    return;
  }

  const confirmed = confirm(`Receive ${nonEmptyRows.length} blood bag(s) under transaction ${transactionNumber || 'N/A'}?`);
  if (!confirmed) return;

  try {
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
        alert(err.message || `Failed to add bag ${data.serialNumber}.`);
        return;
      }
    }

    closeModal('addBloodModal');
    await loadBloodBank();
  } catch (err) {
    console.error('Add stock batch error:', err);
    alert('Network error. Please try again.');
  }
}

// ── Add Stock Keyboard Navigation ─────────────────────────────────────────────
document.addEventListener('keydown', function (e) {

  const active = document.activeElement;

  if (
    !active ||
    !active.closest('#add-stock-rows')
  ) return;

  const row = active.closest('tr');
  if (!row) return;

  const rows = [...document.querySelectorAll('#add-stock-rows tr')];
  const currentRowIndex = rows.indexOf(row);

  const inputs = [
    ...row.querySelectorAll('input, select')
  ];

  const currentColIndex = inputs.indexOf(active);

  if (currentColIndex === -1) return;

  let target = null;

  // ← LEFT
  if (e.key === 'ArrowLeft') {
    e.preventDefault();

    if (currentColIndex > 0) {
      target = inputs[currentColIndex - 1];
    }
  }

  // → RIGHT
  else if (e.key === 'ArrowRight') {
    e.preventDefault();

    if (currentColIndex < inputs.length - 1) {
      target = inputs[currentColIndex + 1];
    }
  }

  // ↑ UP
  else if (e.key === 'ArrowUp') {
    e.preventDefault();

    if (currentRowIndex > 0) {
      const prevRow = rows[currentRowIndex - 1];
      const prevInputs = [
        ...prevRow.querySelectorAll('input, select')
      ];

      target = prevInputs[currentColIndex];
    }
  }

  // ↓ DOWN
  else if (e.key === 'ArrowDown') {
    e.preventDefault();

    if (currentRowIndex < rows.length - 1) {
      const nextRow = rows[currentRowIndex + 1];
      const nextInputs = [
        ...nextRow.querySelectorAll('input, select')
      ];

      target = nextInputs[currentColIndex];
    }
  }

  if (target) {
    target.focus();

    // highlight text for easier replacement
    if (target.select) {
      setTimeout(() => target.select(), 0);
    }
  }
}); 

// ── Sync Helper: Invalidate Blood Request Bag Cache ──────
function invalidateBagCache() {
  // Call the blood request bag cache invalidation function if it exists
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

  init: function() {
    this.loadMetrics();
    setInterval(() => {
      this.loadMetrics();
    }, this.apiConfig.refreshInterval);
  },

  loadMetrics: function() {
    const self = this;
    if (this.isLoading) return;
    this.isLoading = true;

    fetch(`${this.apiConfig.baseUrl}${this.apiConfig.endpoint}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        self.data = data;
        self.lastUpdate = new Date();
        self.render();
        self.isLoading = false;
      })
      .catch(error => {
        console.error('Error fetching analytics data:', error);
        self.isLoading = false;
        self.showErrorState();
      });
  },

  render: function() {
    if (!this.data) return;

    this.renderRequestStatus();
    this.renderUrgency();
    this.renderCategory();
    this.renderBloodTypes();
    this.renderDispatch();
    this.renderAlerts();
    this.renderRequesterType();
    this.renderBloodComponents();
    this.renderHospitals();
    this.renderFulfillmentMetrics();
  },

  renderRequestStatus: function() {
    const statuses = ['pending', 'approved', 'allocated', 'released', 'rejected'];
    statuses.forEach(status => {
      const el = document.querySelector(`[data-metric="request-${status}"]`);
      if (el && this.data.requests) {
        el.textContent = this.data.requests[status] || 0;
      }
    });
  },

  renderUrgency: function() {
    if (!this.data.urgency) return;

    const total = Object.values(this.data.urgency).reduce((a, b) => a + b, 0);

    Object.entries(this.data.urgency).forEach(([level, count]) => {
      const el = document.querySelector(`[data-metric="urgency-${level.toLowerCase()}"]`);
      if (el) el.textContent = count;
      
      const barEl = document.querySelector(`[data-urgency="${level}"]`);
      if (barEl) {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        barEl.style.width = percentage + '%';
        barEl.setAttribute('data-width', percentage.toFixed(1));
      }
    });
  },

  renderCategory: function() {
    if (!this.data.category) return;

    const total = Object.values(this.data.category).reduce((a, b) => a + b, 0);

    Object.entries(this.data.category).forEach(([cat, count]) => {
      const el = document.querySelector(`[data-metric="category-${cat.toLowerCase()}"]`);
      if (el) el.textContent = count;
      
      const barEl = document.querySelector(`[data-category="${cat}"]`);
      if (barEl) {
        const percentage = total > 0 ? (count / total) * 100 : 0;
        barEl.style.width = percentage + '%';
      }
    });
  },

  renderBloodTypes: function() {
    // Use local INVENTORY data instead of API (INVENTORY is populated by loadInventory)
    const inventoryMap = {
      'O_POS_POSITIVE':  'o-pos',
      'O_NEG_NEGATIVE':  'o-neg',
      'A_POS_POSITIVE':  'a-pos',
      'A_NEG_NEGATIVE':  'a-neg',
      'B_POS_POSITIVE':  'b-pos',
      'B_NEG_NEGATIVE':  'b-neg',
      'AB_POS_POSITIVE': 'ab-pos',
      'AB_NEG_NEGATIVE': 'ab-neg'
    };
 
    Object.entries(inventoryMap).forEach(([inventoryKey, domKey]) => {
      // Find matching inventory item
      const invItem = INVENTORY.find(item => item.key === inventoryKey);
      const count = invItem ? invItem.units : 0;
      
      const el = document.querySelector(`[data-metric="blood-${domKey}"]`);
      if (el) {
        el.textContent = count;
      }
 
      let status = 'Healthy';
      let statusColor = 'var(--green)';
      
      if (count === 0) {
        status = 'Empty';
        statusColor = 'var(--crimson)';
      } else if (count < 5) {
        status = 'Critical';
        statusColor = 'var(--crimson)';
      } else if (count < 10) {
        status = 'Low Stock';
        statusColor = 'var(--amber)';
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

    const dispatchTypes = ['USED', 'DISCARDED', 'TRANSFERRED'];
    dispatchTypes.forEach(type => {
      const el = document.querySelector(`[data-metric="dispatch-${type.toLowerCase()}"]`);
      if (el) el.textContent = this.data.dispatch[type] || 0;
    });
  },

  renderAlerts: function() {
    if (!this.data.alerts) return;

    const alertEl1 = document.querySelector('[data-metric="alert-expiring-soon"]');
    if (alertEl1) alertEl1.textContent = this.data.alerts.expiringSoon || 0;

    const alertEl2 = document.querySelector('[data-metric="alert-expired"]');
    if (alertEl2) alertEl2.textContent = this.data.alerts.expired || 0;

    const alertEl3 = document.querySelector('[data-metric="alert-quality-issues"]');
    if (alertEl3) alertEl3.textContent = this.data.alerts.qualityIssues || 0;
  },

  renderRequesterType: function() {
    if (!this.data.requesterType) return;

    const hospital = this.data.requesterType.HOSPITAL || 0;
    const anonymous = this.data.requesterType.ANONYMOUS || 0;
    const total = hospital + anonymous;

    const hospitalEl = document.querySelector('[data-metric="requester-hospital"]');
    if (hospitalEl) hospitalEl.textContent = hospital;

    const anonymousEl = document.querySelector('[data-metric="requester-anonymous"]');
    if (anonymousEl) anonymousEl.textContent = anonymous;
    
    if (total > 0) {
      const hospitalPctEl = document.querySelector('[data-metric="requester-hospital-pct"]');
      if (hospitalPctEl) {
        hospitalPctEl.textContent = Math.round((hospital / total) * 100) + '%';
      }

      const anonymousPctEl = document.querySelector('[data-metric="requester-anonymous-pct"]');
      if (anonymousPctEl) {
        anonymousPctEl.textContent = Math.round((anonymous / total) * 100) + '%';
      }
    }
  },

  renderBloodComponents: function() {
    if (!this.data.bloodComponent) return;

    const componentMap = {
      'WHOLE_BLOOD': 'whole-blood',
      'PRBC': 'red-cells',
      'LEUKOREDUCED_PRBC': 'red-cells',
      'ALIQUOTED_PRBC': 'red-cells',
      'FRESH_FROZEN_PLASMA': 'plasma',
      'PLATELET_CONCENTRATE': 'platelets',
      'CRYOPRECIPITATE': 'plasma',
      'CRYOSUPERNATANT': 'plasma'
    };

    const aggregated = {
      'whole-blood': 0,
      'red-cells': 0,
      'plasma': 0,
      'platelets': 0
    };

    Object.entries(this.data.bloodComponent).forEach(([key, count]) => {
      const category = componentMap[key];
      if (category) {
        aggregated[category] += count;
      }
    });

    const total = Object.values(aggregated).reduce((a, b) => a + b, 0);

    Object.entries(aggregated).forEach(([label, count]) => {
      const el = document.querySelector(`[data-metric="component-${label}"]`);
      if (el) el.textContent = count;

      const pctEl = document.querySelector(`[data-metric="component-${label}-pct"]`);
      if (pctEl) {
        pctEl.textContent = total > 0 ? Math.round((count / total) * 100) + '%' : '0%';
      }
    });
  },

  renderHospitals: function() {
    if (!this.data.hospitals || this.data.hospitals.length === 0) {
      return;
    }

    const container = document.getElementById('hospital-list');
    if (!container) return;

    container.innerHTML = this.data.hospitals.map((hospital, idx) => {
      const fulfillmentRate = hospital.requests > 0 
        ? Math.round((hospital.fulfilled / hospital.requests) * 100) 
        : 0;
      
      const statusColor = fulfillmentRate >= 90 
        ? 'var(--green)' 
        : fulfillmentRate >= 70 
          ? 'var(--amber)' 
          : 'var(--crimson)';

      return `
        <div style="background:var(--cream);border-radius:10px;padding:12px;border-left:4px solid ${statusColor}">
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px">
            <div>
              <div style="font-size:13px;font-weight:600;color:var(--charcoal)">${this.escapeHtml(hospital.name)}</div>
              <div style="font-size:11px;color:var(--muted);margin-top:2px">${hospital.fulfilled}/${hospital.requests} fulfilled</div>
            </div>
            <div style="text-align:right">
              <div style="font-size:16px;font-weight:700;color:var(--charcoal)">${fulfillmentRate}%</div>
            </div>
          </div>
          <div style="height:4px;background:var(--cream);border-radius:2px;overflow:hidden">
            <div style="height:100%;background:linear-gradient(90deg, var(--green), #10b981);width:${fulfillmentRate}%"></div>
          </div>
        </div>
      `;
    }).join('');
  },

  renderFulfillmentMetrics: function() {
    if (!this.data.fulfillmentMetrics) return;

    const metrics = this.data.fulfillmentMetrics;

    const rateEl = document.querySelector('[data-metric="fulfillment-rate"]');
    if (rateEl) {
      rateEl.textContent = metrics.rate.toFixed(1) + '%';
    }

    const barEl = document.querySelector('[data-metric-bar="fulfillment-rate"]');
    if (barEl) {
      barEl.style.width = metrics.rate + '%';
    }

    const releasedEl = document.querySelector('[data-metric="total-released"]');
    if (releasedEl) {
      releasedEl.textContent = metrics.totalReleased;
    }

    const daysEl = document.querySelector('[data-metric="avg-fulfillment-days"]');
    if (daysEl) {
      daysEl.textContent = metrics.avgDaysToRelease.toFixed(1) + ' days';
    }
  },

  showErrorState: function() {
    const elements = document.querySelectorAll('[data-metric]');
    elements.forEach(el => {
      el.textContent = 'Error';
      el.style.color = 'var(--crimson)';
    });
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

// ═══════════════════════════════════════════════════════════════════════════════
// PRINTING FUNCTIONS - PDF & EXCEL EXPORTS (UPDATED)
// ═══════════════════════════════════════════════════════════════════════════════
/**
 * Print Analytics Report (PDF) - Compact Professional Design
 */
/**
 * Print Analytics Report (PDF) - Minimalist Design
 * Reads directly from displayed metrics in analytics panel
 */
window.printAnalytics = function() {
  // Helper function to read metric values from DOM
  const readMetric = (selector) => {
    const el = document.querySelector(selector);
    return el ? el.textContent.trim() : '–';
  };

  // Read all metrics from the displayed analytics panel
  const metrics = {
    // Request Status
    pending: readMetric('[data-metric="request-pending"]'),
    approved: readMetric('[data-metric="request-approved"]'),
    allocated: readMetric('[data-metric="request-allocated"]'),
    released: readMetric('[data-metric="request-released"]'),
    rejected: readMetric('[data-metric="request-rejected"]'),
    
    // Urgency
    critical: parseInt(readMetric('[data-metric="urgency-critical"]')) || 0,
    high: parseInt(readMetric('[data-metric="urgency-high"]')) || 0,
    medium: parseInt(readMetric('[data-metric="urgency-medium"]')) || 0,
    low: parseInt(readMetric('[data-metric="urgency-low"]')) || 0,
    
    // Category
    emergency: parseInt(readMetric('[data-metric="category-emergency"]')) || 0,
    inpatient: parseInt(readMetric('[data-metric="category-inpatient"]')) || 0,
    outpatient: parseInt(readMetric('[data-metric="category-outpatient"]')) || 0,
    hospital: parseInt(readMetric('[data-metric="category-hospital"]')) || 0,
    
    // Blood Types
    o_neg: readMetric('[data-metric="blood-o-neg"]'),
    o_pos: readMetric('[data-metric="blood-o-pos"]'),
    a_neg: readMetric('[data-metric="blood-a-neg"]'),
    a_pos: readMetric('[data-metric="blood-a-pos"]'),
    b_neg: readMetric('[data-metric="blood-b-neg"]'),
    b_pos: readMetric('[data-metric="blood-b-pos"]'),
    ab_neg: readMetric('[data-metric="blood-ab-neg"]'),
    ab_pos: readMetric('[data-metric="blood-ab-pos"]'),
    
    // Dispatch
    used: readMetric('[data-metric="dispatch-used"]'),
    discarded: readMetric('[data-metric="dispatch-discarded"]'),
    transferred: readMetric('[data-metric="dispatch-transferred"]'),
    
    // Alerts
    expiringSoon: readMetric('[data-metric="alert-expiring-soon"]'),
    expired: readMetric('[data-metric="alert-expired"]'),
    qualityIssues: readMetric('[data-metric="alert-quality-issues"]'),
    
    // Fulfillment
    fulfillmentRate: readMetric('[data-metric="fulfillment-rate"]'),
    totalReleased: readMetric('[data-metric="total-released"]'),
    avgDays: readMetric('[data-metric="avg-fulfillment-days"]'),
    
    // Requester Type
    hospital: readMetric('[data-metric="requester-hospital"]'),
    hospitalPct: readMetric('[data-metric="requester-hospital-pct"]'),
    anonymous: readMetric('[data-metric="requester-anonymous"]'),
    anonymousPct: readMetric('[data-metric="requester-anonymous-pct"]'),
    
    // Components
    wholeBlood: readMetric('[data-metric="component-whole-blood"]'),
    wholeBloodPct: readMetric('[data-metric="component-whole-blood-pct"]'),
    redCells: readMetric('[data-metric="component-red-cells"]'),
    redCellsPct: readMetric('[data-metric="component-red-cells-pct"]'),
    plasma: readMetric('[data-metric="component-plasma"]'),
    plasmaPct: readMetric('[data-metric="component-plasma-pct"]'),
    platelets: readMetric('[data-metric="component-platelets"]'),
    plateletsPct: readMetric('[data-metric="component-platelets-pct"]'),
  };

  // Helper to draw horizontal bar
  function getBar(value, max) {
    const maxVal = 10;
    const percentage = Math.min((parseInt(value) || 0) / (max || maxVal), 1);
    const filledWidth = Math.round(percentage * 40);
    const emptyWidth = 40 - filledWidth;
    return `<span style="display:inline-flex;gap:2px;align-items:center"><span style="background:#666;height:8px;width:${filledWidth}px;border-radius:2px"></span><span style="background:#e8e8e8;height:8px;width:${emptyWidth}px;border-radius:2px"></span></span>`;
  }

  const totalUrgency = metrics.critical + metrics.high + metrics.medium + metrics.low;
  const totalCategory = metrics.emergency + metrics.inpatient + metrics.outpatient + metrics.hospital;

  const html = `
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Blood Bank Analytics Report</title>
      <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
          font-size: 10pt;
          line-height: 1.35;
          color: #1a1a1a;
          background: white;
          padding: 16px 20px;
        }
        
        .header {
          margin-bottom: 12px;
          border-bottom: 2px solid #333;
          padding-bottom: 6px;
        }
        
        h1 { font-size: 16pt; font-weight: 700; margin: 0; }
        .subtitle { font-size: 8pt; color: #666; margin-top: 2px; }
        
        h2 { 
          font-size: 9pt; 
          font-weight: 700; 
          margin: 10px 0 6px 0;
          color: #000;
        }
        
        .grid-5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 5px; margin: 6px 0; }
        .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5px; margin: 6px 0; }
        .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 6px 0; }
        
        .metric-box { 
          border: 1px solid #ddd; 
          padding: 8px 6px; 
          text-align: center; 
          background: #fafafa;
          border-left: 4px solid #999;
        }
        
        .metric-box.pending { border-left-color: #d4a574; background: #fefaf5; }
        .metric-box.approved { border-left-color: #27ae60; background: #f0fdf4; }
        .metric-box.allocated { border-left-color: #0066cc; background: #f0f8ff; }
        .metric-box.released { border-left-color: #8b5cf6; background: #faf5ff; }
        .metric-box.rejected { border-left-color: #c41e3a; background: #fef5f5; }
        
        .metric-val { font-size: 14pt; font-weight: 700; color: #000; margin: 3px 0; }
        .metric-label { font-size: 7pt; color: #666; text-transform: uppercase; font-weight: 600; }
        
        .mini-table { width: 100%; font-size: 8.5pt; border-collapse: collapse; margin: 4px 0; }
        .mini-table th, .mini-table td { padding: 4px 5px; border: 1px solid #e0e0e0; text-align: left; }
        .mini-table th { background: #f5f5f5; font-weight: 700; }
        .mini-table td { font-size: 8.5pt; }
        .mini-table .num { text-align: right; }
        
        .urgency-row {
          display: flex;
          gap: 8px;
          align-items: center;
          padding: 4px 0;
          border-bottom: 1px solid #eee;
          font-size: 8.5pt;
        }
        
        .urgency-row:last-child { border-bottom: none; }
        .urgency-label { width: 50px; font-weight: 600; text-transform: uppercase; }
        .urgency-bar { flex: 1; }
        .urgency-count { width: 20px; text-align: right; font-weight: 700; }
        
        .stat-line { display: flex; justify-content: space-between; padding: 3px 0; border-bottom: 1px solid #eee; font-size: 8.5pt; }
        .stat-line:last-child { border-bottom: none; }
        
        .col { padding: 0; }
        
        .footer { font-size: 7pt; color: #999; margin-top: 8px; text-align: right; }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>Blood Bank Analytics</h1>
        <div class="subtitle">Generated ${new Date().toLocaleString()}</div>
      </div>
      
      <!-- REQUEST STATUS -->
      <h2>Request Status Overview</h2>
      <div class="grid-5">
        <div class="metric-box pending">
          <div class="metric-label">Pending</div>
          <div class="metric-val">${metrics.pending}</div>
          <div style="font-size:7pt;color:#666">Awaiting review</div>
        </div>
        <div class="metric-box approved">
          <div class="metric-label">Approved</div>
          <div class="metric-val">${metrics.approved}</div>
          <div style="font-size:7pt;color:#666">Ready to allocate</div>
        </div>
        <div class="metric-box allocated">
          <div class="metric-label">Allocated</div>
          <div class="metric-val">${metrics.allocated}</div>
          <div style="font-size:7pt;color:#666">Bags assigned</div>
        </div>
        <div class="metric-box released">
          <div class="metric-label">Released</div>
          <div class="metric-val">${metrics.released}</div>
          <div style="font-size:7pt;color:#666">Delivered</div>
        </div>
        <div class="metric-box rejected">
          <div class="metric-label">Rejected</div>
          <div class="metric-val">${metrics.rejected}</div>
          <div style="font-size:7pt;color:#666">Not approved</div>
        </div>
      </div>
      
      <!-- URGENCY & CATEGORY -->
      <div class="grid-2">
        <div class="col">
          <h2>Requests by Urgency</h2>
          <div class="urgency-row">
            <div class="urgency-label">CRITICAL</div>
            <div class="urgency-bar">${getBar(metrics.critical, totalUrgency)}</div>
            <div class="urgency-count">${metrics.critical}</div>
          </div>
          <div class="urgency-row">
            <div class="urgency-label">HIGH</div>
            <div class="urgency-bar">${getBar(metrics.high, totalUrgency)}</div>
            <div class="urgency-count">${metrics.high}</div>
          </div>
          <div class="urgency-row">
            <div class="urgency-label">MEDIUM</div>
            <div class="urgency-bar">${getBar(metrics.medium, totalUrgency)}</div>
            <div class="urgency-count">${metrics.medium}</div>
          </div>
          <div class="urgency-row">
            <div class="urgency-label">LOW</div>
            <div class="urgency-bar">${getBar(metrics.low, totalUrgency)}</div>
            <div class="urgency-count">${metrics.low}</div>
          </div>
        </div>
        <div class="col">
          <h2>Requests by Category</h2>
          <div class="urgency-row">
            <div class="urgency-label">EMERGENCY</div>
            <div class="urgency-bar">${getBar(metrics.emergency, totalCategory)}</div>
            <div class="urgency-count">${metrics.emergency}</div>
          </div>
          <div class="urgency-row">
            <div class="urgency-label">INPATIENT</div>
            <div class="urgency-bar">${getBar(metrics.inpatient, totalCategory)}</div>
            <div class="urgency-count">${metrics.inpatient}</div>
          </div>
          <div class="urgency-row">
            <div class="urgency-label">OUTPATIENT</div>
            <div class="urgency-bar">${getBar(metrics.outpatient, totalCategory)}</div>
            <div class="urgency-count">${metrics.outpatient}</div>
          </div>
          <div class="urgency-row">
            <div class="urgency-label">HOSPITAL</div>
            <div class="urgency-bar">${getBar(metrics.hospital, totalCategory)}</div>
            <div class="urgency-count">${metrics.hospital}</div>
          </div>
        </div>
      </div>
      
      <!-- BLOOD INVENTORY -->
      <h2>Current Blood Type Inventory</h2>
      <div class="grid-4">
        <div class="metric-box">
          <div class="metric-label">O−</div>
          <div class="metric-val">${metrics.o_neg}</div>
          <div style="font-size:7pt;color:#666">units</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">O+</div>
          <div class="metric-val">${metrics.o_pos}</div>
          <div style="font-size:7pt;color:#666">units</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">A−</div>
          <div class="metric-val">${metrics.a_neg}</div>
          <div style="font-size:7pt;color:#666">units</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">A+</div>
          <div class="metric-val">${metrics.a_pos}</div>
          <div style="font-size:7pt;color:#666">units</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">B−</div>
          <div class="metric-val">${metrics.b_neg}</div>
          <div style="font-size:7pt;color:#666">units</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">B+</div>
          <div class="metric-val">${metrics.b_pos}</div>
          <div style="font-size:7pt;color:#666">units</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">AB−</div>
          <div class="metric-val">${metrics.ab_neg}</div>
          <div style="font-size:7pt;color:#666">units</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">AB+</div>
          <div class="metric-val">${metrics.ab_pos}</div>
          <div style="font-size:7pt;color:#666">units</div>
        </div>
      </div>
      
      <!-- DISPATCH & ALERTS -->
      <div class="grid-2">
        <div class="col">
          <h2>Bag Dispatch Summary</h2>
          <div class="stat-line"><span>Used</span><span style="font-weight:700">${metrics.used}</span></div>
          <div class="stat-line"><span>Discarded</span><span style="font-weight:700">${metrics.discarded}</span></div>
          <div class="stat-line"><span>Transferred</span><span style="font-weight:700">${metrics.transferred}</span></div>
        </div>
        <div class="col">
          <h2>Expiry & Quality Alerts</h2>
          <div class="stat-line"><span>Expiring Soon (≤7 days)</span><span style="font-weight:700">${metrics.expiringSoon}</span></div>
          <div class="stat-line"><span>Expired</span><span style="font-weight:700">${metrics.expired}</span></div>
          <div class="stat-line"><span>Quality Issues</span><span style="font-weight:700">${metrics.qualityIssues}</span></div>
        </div>
      </div>
      
      <!-- PERFORMANCE & REQUESTER -->
      <div class="grid-2">
        <div class="col">
          <h2>Request Fulfillment Performance</h2>
          <div class="stat-line"><span>Fulfillment Rate</span><span style="font-weight:700">${metrics.fulfillmentRate}</span></div>
          <div class="stat-line"><span>Total Released</span><span style="font-weight:700">${metrics.totalReleased}</span></div>
          <div class="stat-line"><span>Avg Days to Release</span><span style="font-weight:700">${metrics.avgDays}</span></div>
        </div>
        <div class="col">
          <h2>Requests by Requester Type</h2>
          <div class="stat-line"><span>Hospital Requests</span><span style="font-weight:700">${metrics.hospital} (${metrics.hospitalPct})</span></div>
          <div class="stat-line"><span>Anonymous Requests</span><span style="font-weight:700">${metrics.anonymous} (${metrics.anonymousPct})</span></div>
        </div>
      </div>
      
      <!-- COMPONENTS -->
      <h2>Requests by Blood Component</h2>
      <div class="grid-4">
        <div class="metric-box">
          <div class="metric-label">Whole Blood</div>
          <div class="metric-val">${metrics.wholeBlood}</div>
          <div style="font-size:7pt;color:#666">${metrics.wholeBloodPct}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Red Cells</div>
          <div class="metric-val">${metrics.redCells}</div>
          <div style="font-size:7pt;color:#666">${metrics.redCellsPct}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Plasma</div>
          <div class="metric-val">${metrics.plasma}</div>
          <div style="font-size:7pt;color:#666">${metrics.plasmaPct}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Platelets</div>
          <div class="metric-val">${metrics.platelets}</div>
          <div style="font-size:7pt;color:#666">${metrics.plateletsPct}</div>
        </div>
      </div>
      
      <div class="footer">End of Report</div>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  printWindow.document.write(html);
  printWindow.document.close();
  setTimeout(() => printWindow.print(), 250);
};

/**
 * Export Blood Bags to Excel - Enhanced with complete BloodBag model data
 */
/**
 * Export Blood Bags to Excel/CSV - Complete bag details
 * Exports from BLOOD_BAGS array with all available information
 */
window.exportBloodBagsToExcel = function() {
  // Build comprehensive data for export from BLOOD_BAGS
  const rows = [
    [
      'Serial Number',
      'Blood Type',
      'RH Type',
      'Component Type',
      'Volume (mL)',
      'Collected Date',
      'Expiration Date',
      'Status',
      'Source',
      'Transaction #',
      'Remarks',
      'Received By',
      'Discard Reason',
      'Open System',
      'Open System At'
    ]
  ];

  const now = new Date();
  const soon = new Date(); soon.setDate(soon.getDate() + 7);

  // Helper function to get status label (no emojis)
  function getStatusLabel(status) {
    const statusMap = {
      'AVAILABLE': 'Available',
      'EXPIRING': 'Expiring',
      'CROSSMATCHED': 'Crossmatched',
      'DISPENSED': 'Dispensed',
      'EXPIRED': 'Expired',
      'DISCARDED': 'Discarded'
    };
    return statusMap[status] || status || '';
  }

  // Helper function to compute bag status
  function computeStatus(bag) {
    const exp = new Date(bag.expiresAt);
    if (bag.status === 'DISCARDED') return 'DISCARDED';
    if (bag.status === 'DISPENSED') return 'DISPENSED';
    if (bag.status === 'CROSSMATCHED') return 'CROSSMATCHED';
    if (bag.status === 'EXPIRED' || (bag.status === 'AVAILABLE' && exp < now)) return 'EXPIRED';
    if (bag.status === 'AVAILABLE' && exp <= soon) return 'EXPIRING';
    return 'AVAILABLE';
  }

  // Helper function to format dates - long format to prevent ###
  function formatDate(d) {
    if (!d) return '';
    const str = d.includes('T') ? d : d + 'T00:00:00';
    return new Date(str).toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: '2-digit'
    });
  }

  // Helper function to format blood type
  function fullBloodLabel(bloodType, rhType) {
    const aboMap = {
      O_NEG:'O', O_POS:'O', A_POS:'A', A_NEG:'A',
      B_POS:'B', B_NEG:'B', AB_POS:'AB', AB_NEG:'AB'
    };
    const abo = aboMap[bloodType] ?? bloodType ?? '';
    const rh = rhType === 'POSITIVE' ? '+' : rhType === 'NEGATIVE' ? '−' : '';
    return abo + rh;
  }

  // Helper function to get component label
  function componentLabel(ct) {
    const map = {
      WHOLE_BLOOD: 'Whole Blood',
      PRBC: 'PRBC',
      LEUKOREDUCED_PRBC: 'Leukoreduced PRBC',
      ALIQUOTED_PRBC: 'Aliquoted PRBC',
      PLATELET_CONCENTRATE: 'Platelet',
      FRESH_FROZEN_PLASMA: 'FFP',
      CRYOPRECIPITATE: 'Cryoprecipitate',
      CRYOSUPERNATANT: 'Cryosupernatant',
    };
    return map[ct] ?? ct ?? '';
  }

  // Helper function to get source label (no emojis)
  function sourceLabel(bag) {
    if (bag.eventName) return bag.eventName;
    const map = {
      DONATION: 'Blood Drive',
      WALK_IN: 'Walk-in Donor',
      TRANSFER: 'BMC Transfer',
      EXTERNAL_SUPPLY: 'External Supply',
    };
    return map[bag.source] ?? bag.source ?? '';
  }

  // Export all BLOOD_BAGS
  BLOOD_BAGS.forEach(bag => {
    const computedStatus = computeStatus(bag);

    rows.push([
      bag.serialNumber || '',
      fullBloodLabel(bag.bloodType, bag.rhType),
      bag.rhType || '',
      componentLabel(bag.componentType),
      bag.volumeMl || '',
      formatDate(bag.collectedAt),
      formatDate(bag.expiresAt),
      getStatusLabel(computedStatus),
      sourceLabel(bag),
      bag.transactionNumber || '',
      bag.remarks || '',
      bag.receivedBy || '',
      bag.discardReason || '',
      bag.openSystem ? 'Yes' : 'No',
      formatDate(bag.openSystemAt)
    ]);
  });

  // If no bags, add message row
  if (rows.length === 1) {
    rows.push(['No blood bags in the system']);
  }

  // Convert to CSV with proper escaping
  const csv = rows.map(row => 
    row.map(cell => {
      const escaped = String(cell).replace(/"/g, '""');
      return escaped.includes(',') || escaped.includes('"') || escaped.includes('\n') 
        ? `"${escaped}"` 
        : escaped;
    }).join(',')
  ).join('\n');

  // Download as CSV file
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `blood-bags-${new Date().toISOString().slice(0, 10)}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// ═══════════════════════════════════════════════════════════════════════════════
// BLOOD REQUESTS – WITH PRINTING (PDF/EXCEL) FUNCTIONALITY
// ═══════════════════════════════════════════════════════════════════════════════

(function () {
  /* ────────────────────────────────────────────────────────────────────────────
     BLOOD TYPE MAPPING – Maps enum values to display format
     Preserves original enum for backend while displaying user-friendly text
  ──────────────────────────────────────────────────────────────────────────────── */
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

  /* ────────────────────────────────────────────────────────────────────────────
     INDICATION MAPPING – Maps indication codes to descriptions
  ──────────────────────────────────────────────────────────────────────────────── */
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
    'PW-1': 'Exchange transfusion in infant with indirect bilirubin ≥20 mg/dL in first week',
    'PW-2': 'Hyperbilirubinemia with prematurity/illness (asphyxia, acidosis, sepsis, hemolysis)',
    'PW-3': 'Other whole blood indications (requires review)',
    'PR-1': 'Signs/symptoms of anemia (pallor, etc.)',
    'PR-2': 'Hypovolemia from acute blood loss with shock signs or >10% loss',
    'PR-3': 'Major surgery candidate with Hematocrit < 0.30 or <0.35 (nocturnal)',
    'PR-4': 'Hypertransfusion for chronic hemolytic anemia (Thalassemia)',
    'PR-5': 'Hemoglobin ≥130 g/L and on assisted ventilation',
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

  /* ────────────────────────────────────────────────────────────────────────────
     PATIENT NAME FORMATTING – Format name parts as: Last, First Middle Suffix
  ──────────────────────────────────────────────────────────────────────────────── */
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

  
  /* ────────────────────────────────────────────────────────────────────────────
     BIRTHDATE FORMATTING
  ──────────────────────────────────────────────────────────────────────────────── */
  function formatBirthdate(birthdateStr) {
    if (!birthdateStr) return '–';
    try {
      const date = new Date(birthdateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch (e) {
      return birthdateStr;
    }
  }

  /* ────────────────────────────────────────────────────────────────────────────
     CONSTANTS
  ──────────────────────────────────────────────────────────────────────────────── */
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
 
  /* ────────────────────────────────────────────────────────────────────────────
     STATE
  ──────────────────────────────────────────────────────────────────────────────── */
  let reqData          = [];
  let reqExpanded      = {};
  let reqCurrentFilter = 'ALL';
  let reqPendingRejectId = null;
  let reqPendingResolutionMode = 'reject';
  let reqPendingRemarksId = null;
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
 
  const reqBagCache = {};
 
  /* ────────────────────────────────────────────────────────────────────────────
     DATA MAPPING
  ──────────────────────────────────────────────────────────────────────────────── */
  function mapRequest(r) {
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
 
    const allocatedBags = r.reservedBags ?? (r.fulfilledByBag ? [r.fulfilledByBag] : []);
 
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
      date:           r.requestedAt
        ? new Date(r.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '–',
      status:         r.status           ?? 'PENDING',
      requesterName:  r.requesterName    ?? null,
      requesterRelationship: r.requesterRelationship ?? null,
      requesterContact: r.requesterContact ?? null,
      requesterEmail: r.requesterEmail   ?? null,
      confirmationEmailSentAt: r.confirmationEmailSentAt ?? null,
      approvalRemarks: r.approvalRemarks ?? null,
      alternativeComponentSuggestion: r.alternativeComponentSuggestion ?? null,
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
      docUrl,
      docLabel,
      rejectionReason: r.rejectionReason ?? null,
      allocatedBags,
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
    if (el) el.innerHTML = `<div class="req-empty"><div style="font-size:32px;margin-bottom:10px;opacity:0.45">⏳</div>Loading requests…</div>`;
  }
  function reqShowError(msg) {
    const el = document.getElementById('req-list');
    if (el) el.innerHTML = `<div class="req-empty"><div style="font-size:32px;margin-bottom:10px;opacity:0.45">⚠️</div>${msg}</div>`;
  }
 
  async function reqFetchAll() {
    reqShowLoading();
    try {
      const res  = await fetch(`${API_BASE}/admin/blood-requests`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Server error: ${res.status} ${res.statusText}`);
      const json = await res.json();
      reqData    = (Array.isArray(json) ? json : (json.data ?? json.content ?? [])).map(mapRequest);
      reqRender();
      reqUpdateCounts();  
    } catch (err) {
      console.error('[BloodRequests] fetch failed', err);
      reqShowError(`Failed to load requests – ${err.message}`);
    }
  }
 
 
  async function reqFetchByStatus(status) {
    reqShowLoading();
    try {
      const url  = status === 'ALL'
        ? `${API_BASE}/admin/blood-requests`
        : `${API_BASE}/admin/blood-requests?status=${status}`;
      const res  = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      reqData    = (Array.isArray(json) ? json : (json.data ?? json.content ?? [])).map(mapRequest);
      reqRender();
      reqUpdateCounts();
    } catch (err) {
      console.error('[BloodRequests] fetch failed', err);
      reqShowError(`Failed to load requests - ${err.message}`);
    }
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
    const now        = Date.now();
 
    function bagRow(b) {
      const expDate  = b.expiresAt ? new Date(b.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '-';
      const daysLeft = b.expiresAt ? Math.ceil((new Date(b.expiresAt) - now) / 86400000) : null;
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
 
    return `<div id="${id}" class="req-bag-preview-wrap">
      <div class="req-section-label" style="display:flex;align-items:center;gap:8px">
        Available blood bags
        <span class="req-bag-preview-count">${compatible.length} - compatible . ${cache.bags.length} - total available</span>
      </div>
      <div class="req-bag-preview-list">
        ${compatible.map(bagRow).join('')}
        ${others.length ? `
          <div style="font-size:11px;color:var(--muted);padding:4px 0 2px;margin-top:2px;border-top:1px solid var(--border)">
            Other available types (not an exact match)
          </div>
          ${others.slice(0, 3).map(bagRow).join('')}
          ${others.length > 3 ? `<div style="font-size:11px;color:var(--muted);padding:3px 0">+${others.length - 3} more not shown</div>` : ''}
        ` : ''}
      </div>
    </div>`;
  }
 
  async function openBagPicker(reqId, isChange = false) {
    bagPickerReqId    = reqId;
    bagPickerSelected = null;
    bagPickerData     = [];
    bagPickerIsChange = isChange;
 
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
 
  function renderBagPicker(req) {
    const inner   = document.getElementById('req-bag-picker-inner');
    const confirm = document.getElementById('req-bag-picker-confirm');
 
    if (!bagPickerData.length) {
      inner.innerHTML  = `<div class="req-bag-picker-loading">No compatible bags available for ${req.bloodType}.</div>`;
      confirm.disabled = true;
      return;
    }
 
    const needed   = req.units;
    const selected = bagPickerSelected ? bagPickerSelected.split(',').filter(Boolean) : [];
    confirm.disabled = selected.length !== needed;
 
    inner.innerHTML = `
      <div class="req-bag-picker-hint">
        Select exactly <strong>${needed}</strong> bag${needed > 1 ? 's' : ''}.
        ${needed > 1 ? `<span class="req-bag-picker-count">${selected.length}/${needed} selected</span>` : ''}
      </div>
      <div class="req-bag-picker-list">
        ${bagPickerData.map(b => {
          const isSelected   = selected.includes(String(b.id));
          const isCompatible = b.compatible !== false;
          const expDate  = b.expiresAt
            ? new Date(b.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : '-';
          const daysLeft = b.expiresAt ? Math.ceil((new Date(b.expiresAt) - Date.now()) / 86400000) : null;
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
  }
 
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
      reqRender();
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
      reqRender();
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
    document.getElementById('req-alternative-component').value = '';
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
    const alternativeComponentSuggestion = document.getElementById('req-alternative-component').value.trim();

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
      alternativeComponentSuggestion: req.alternativeComponentSuggestion,
      patientAcceptedRemarks: req.patientAcceptedRemarks,
      confirmationEmailSentAt: req.confirmationEmailSentAt
    };

    req.status = 'NEEDS_CONFIRMATION';
    req.units = approvedUnits;
    req.approvedUnits = approvedUnits;
    req.approvalRemarks = approvalRemarks;
    req.alternativeComponentSuggestion = alternativeComponentSuggestion || null;
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
          approvalRemarks,
          alternativeComponentSuggestion: alternativeComponentSuggestion || null
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
      req.alternativeComponentSuggestion = prevState.alternativeComponentSuggestion;
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

    ['req-approved-units', 'req-approval-remarks', 'req-alternative-component'].forEach(id => {
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
    document.getElementById('req-alternative-component').value = '';

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
    const alternativeComponentSuggestion = document.getElementById('req-alternative-component').value.trim();
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
          approvalRemarks,
          alternativeComponentSuggestion: alternativeComponentSuggestion || null
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
      req.alternativeComponentSuggestion = data.alternativeComponentSuggestion ?? (alternativeComponentSuggestion || null);
      req.patientAcceptedRemarks = null;
      req.confirmationEmailSentAt = data.confirmationEmailSentAt ?? new Date().toISOString();
      reqExpanded[req.id] = true;

      delete reqBagCache[req.id];
      reqCloseApproveWithRemarks();
      reqRender();
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
    } catch (err) {
      console.error('[reqConfirmReject] failed', err);
      r.status = prevState.status;
      r.rejectionReason = prevState.rejectionReason;
      r.allocatedBags = prevState.allocatedBags;
      reqRender();
      alert(`${config.failureLabel} failed: ${err.message}`);
    }
  };
 
  window.reqViewDoc = function (url, label) {
    if (!url) { alert('No document uploaded for this request.'); return; }
    document.getElementById('req-doc-label').textContent = label;
    const isPdf        = url.toLowerCase().includes('.pdf');
    const googleViewer = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    document.getElementById('req-doc-frame').innerHTML = isPdf
      ? `<iframe src="${googleViewer}" style="width:100%;height:520px;border:none;border-radius:10px;display:block" title="${label}"></iframe>`
      : `<img src="${url}" style="width:100%;border-radius:10px;display:block"
           onerror="this.parentElement.innerHTML='<div style=padding:40px;text-align:center;color:var(--muted);font-size:13px>Preview unavailable - <a href=\\'${url}\\' target=\\'_blank\\' style=\\'color:var(--blue)\\'>open directly -></a></div>'" />`;
    document.getElementById('req-doc-modal').classList.add('open');
  };
 
  function reqGetFiltered() {
    const q       = (document.getElementById('req-search')?.value || '').toLowerCase().trim();
    const urgency = document.getElementById('req-filter-urgency')?.value || 'ALL';
    const sort    = document.getElementById('req-sort')?.value || 'date_desc';
    let list = reqData.slice();
    if (reqCurrentFilter !== 'ALL') list = list.filter(r => r.status === reqCurrentFilter);
    if (urgency !== 'ALL')          list = list.filter(r => r.urgency === urgency);
    if (q) list = list.filter(r =>
      r.name.toLowerCase().includes(q)      ||
      r.patient.toLowerCase().includes(q)   ||
      r.bloodType.toLowerCase().includes(q) ||
      r.component.toLowerCase().includes(q)||
      r.referenceNumber.toLowerCase().includes(q)
    );
    if (sort === 'date_desc') {
      list.sort((a, b) => {
        const statusDiff =
          (REQ_STATUS_PRIORITY[a.status] ?? 99) -
          (REQ_STATUS_PRIORITY[b.status] ?? 99);

        if (statusDiff !== 0) return statusDiff;

        const urgencyDiff =
          (REQ_URGENCY_ORDER[a.urgency] ?? 99) -
          (REQ_URGENCY_ORDER[b.urgency] ?? 99);

        if (urgencyDiff !== 0) return urgencyDiff;

        return b.id - a.id;
      });
    }
    else if (sort === 'date_asc') {
      list.sort((a, b) => {
        const statusDiff =
          (REQ_STATUS_PRIORITY[a.status] ?? 99) -
          (REQ_STATUS_PRIORITY[b.status] ?? 99);

        if (statusDiff !== 0) return statusDiff;

        const urgencyDiff =
          (REQ_URGENCY_ORDER[a.urgency] ?? 99) -
          (REQ_URGENCY_ORDER[b.urgency] ?? 99);

        if (urgencyDiff !== 0) return urgencyDiff;

        return a.id - b.id;
      });
    }
    else if (sort === 'urgency') {
      list.sort((a, b) => {
        const statusDiff =
          (REQ_STATUS_PRIORITY[a.status] ?? 99) -
          (REQ_STATUS_PRIORITY[b.status] ?? 99);

        if (statusDiff !== 0) return statusDiff;

        const urgencyDiff =
          (REQ_URGENCY_ORDER[a.urgency] ?? 99) -
          (REQ_URGENCY_ORDER[b.urgency] ?? 99);

        if (urgencyDiff !== 0) return urgencyDiff;

        return b.id - a.id;
      });
    }
    else if (sort === 'units_desc') {
      list.sort((a, b) => {
        const statusDiff =
          (REQ_STATUS_PRIORITY[a.status] ?? 99) -
          (REQ_STATUS_PRIORITY[b.status] ?? 99);

        if (statusDiff !== 0) return statusDiff;

        const urgencyDiff =
          (REQ_URGENCY_ORDER[a.urgency] ?? 99) -
          (REQ_URGENCY_ORDER[b.urgency] ?? 99);

        if (urgencyDiff !== 0) return urgencyDiff;

        return b.units - a.units;
      });
    }
    return list;
  }
 
  window.reqFilterBy = function (status, btn) {
    reqCurrentFilter = status;
    document.querySelectorAll('#req-filters .req-filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    reqRender();
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
          const expDate  = b.expiresAt
            ? new Date(b.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : b.expiresAt ?? '-';
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
    const canReject = ['PENDING', 'APPROVED', 'NEEDS_CONFIRMATION'].includes(req.status);
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
    if (!req.approvedUnits && !req.approvalRemarks && !req.alternativeComponentSuggestion) return '';

    const requestedVsApproved = req.approvedUnits != null && req.approvedUnits !== req.requestedUnits
      ? `<div class="req-detail-row"><span class="lbl">Requested units</span><span class="val">${req.requestedUnits}</span></div>
         <div class="req-detail-row"><span class="lbl">Approved units</span><span class="val">${req.approvedUnits}</span></div>`
      : `<div class="req-detail-row"><span class="lbl">Approved units</span><span class="val">${req.approvedUnits ?? req.requestedUnits}</span></div>`;

    const responseLabel = req.patientAcceptedRemarks === true
      ? 'Requester accepted via email'
      : req.patientAcceptedRemarks === false
        ? 'Requester rejected via email'
        : 'Awaiting requester reply';

    return `
      <div class="req-detail-box" style="margin-bottom:12px;border-left:3px solid #F4A259">
        <div class="req-detail-box-title" style="color:#9A5B13">Approval summary</div>
        ${requestedVsApproved}
        <div class="req-detail-row"><span class="lbl">Remarks</span><span class="val">${req.approvalRemarks ?? '-'}</span></div>
        ${req.alternativeComponentSuggestion
          ? `<div class="req-detail-row"><span class="lbl">Alternative component</span><span class="val">${req.alternativeComponentSuggestion}</span></div>`
          : ''}
        <div class="req-detail-row"><span class="lbl">Requester email</span><span class="val">${req.requesterEmail ?? '-'}</span></div>
        <div class="req-detail-row"><span class="lbl">Email sent at</span><span class="val">${req.confirmationEmailSentAt ? formatDateTime(req.confirmationEmailSentAt) : '-'}</span></div>
        <div class="req-detail-row"><span class="lbl">Confirmation status</span><span class="val">${responseLabel}</span></div>
        ${req.patientRespondedAt
          ? `<div class="req-detail-row"><span class="lbl">Requester responded at</span><span class="val">${formatDateTime(req.patientRespondedAt)}</span></div>`
          : ''}
      </div>`;
  }
 
  function reqRenderCard(req) {
    const isExp    = !!reqExpanded[req.id];
    const urgColor = REQ_URGENCY_COLOR[req.urgency];
    const typeLabel = req.type === 'ANONYMOUS' ? '' : `<span style="font-size:11px;font-weight:400;color:var(--muted)">(${req.type})</span>`;
    const unitsMeta = req.approvedUnits != null && req.approvedUnits !== req.requestedUnits
      ? `${req.approvedUnits} ${req.status === 'NEEDS_CONFIRMATION' ? 'offered' : 'approved'} of ${req.requestedUnits} requested`
      : `${req.units} unit${req.units > 1 ? 's' : ''}`;
 
    if (isExp && ['PENDING', 'APPROVED', 'NEEDS_CONFIRMATION'].includes(req.status)) {
      setTimeout(() => reqFetchCompatibleBags(req), 0);
    }
 
    return `<div class="req-card${isExp ? ' expanded' : ''}" id="req-card-${req.id}">
      <div class="req-head" onclick="reqToggle(${req.id})"
           style="display:flex;gap:0;padding:0;align-items:stretch">
        <div class="req-urgency-bar"
             style="background:${urgColor};margin-right:0;flex-shrink:0;border-radius:12px 0 0 ${isExp ? '0' : '12px'}"></div>
        <div style="flex:1;display:grid;grid-template-columns:1fr auto auto auto auto;align-items:center;gap:12px;padding:15px 18px">
          <div>
            <div class="req-name">${req.referenceNumber} ${typeLabel}</div>
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
            <div class="req-detail-row"><span class="lbl">Type</span><span class="val">${req.type[0] + req.type.slice(1).toLowerCase()}</span></div>
            <div class="req-detail-row"><span class="lbl">Urgency</span><span class="val">${req.urgency[0] + req.urgency.slice(1).toLowerCase()}</span></div>
            <div class="req-detail-row"><span class="lbl">Submitted</span><span class="val">${req.date}</span></div>
          </div>
        </div>
 
        ${reqRenderApprovalSummary(req)}

        <div class="req-section-label">Supporting document</div>
        <div class="req-doc-preview" onclick="reqViewDoc('${req.docUrl}','${req.docLabel}')">
          <div class="req-doc-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" stroke-width="1.5">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>
            </svg>
          </div>
          <div style="flex:1">
            <div style="font-size:13px;font-weight:600;color:var(--charcoal)">${req.docLabel}</div>
            <div style="font-size:11px;color:var(--muted);margin-top:2px">Tap to preview . stored in Cloudinary</div>
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
    if (info) info.textContent = `Showing ${filtered.length} of ${reqData.length} request${reqData.length !== 1 ? 's' : ''}`;
    reqUpdateCounts();
  }
 
  function reqUpdateCounts() {
    // Count each status separately
    const counts = {
      'ALL': reqData.length,
      'PENDING': reqData.filter(r => r.status === 'PENDING').length,
      'APPROVED': reqData.filter(r => r.status === 'APPROVED').length,
      'NEEDS_CONFIRMATION': reqData.filter(r => r.status === 'NEEDS_CONFIRMATION').length,
      'ALLOCATED': reqData.filter(r => r.status === 'ALLOCATED').length,
      'READY_FOR_RELEASE': reqData.filter(r => r.status === 'READY_FOR_RELEASE').length,
      'RELEASED': reqData.filter(r => r.status === 'RELEASED').length,
      'REJECTED': reqData.filter(r => r.status === 'REJECTED').length,
      'CANCELLED': reqData.filter(r => r.status === 'CANCELLED').length,
    };

    // Update the ALL and PENDING with IDs (they exist in HTML)
    const allEl = document.getElementById('req-cnt-all');
    const pendEl = document.getElementById('req-cnt-pending');
    if (allEl) allEl.textContent = counts['ALL'];
    if (pendEl) pendEl.textContent = counts['PENDING'];

    // Update all other filter chips by looking for their onclick attribute
    ['APPROVED', 'NEEDS_CONFIRMATION', 'ALLOCATED', 'READY_FOR_RELEASE', 'RELEASED', 'REJECTED', 'CANCELLED'].forEach(status => {
      // Find the button with this status filter
      const buttons = document.querySelectorAll('#req-filters button');
      buttons.forEach(btn => {
        if (btn.getAttribute('onclick')?.includes(`reqFilterBy('${status}'`)) {
          const badge = btn.querySelector('.chip-cnt');
          if (badge) {
            badge.textContent = counts[status];
          }
        }
      });
    });
  }
 
  window.reqToggle = id => { reqExpanded[id] = !reqExpanded[id]; reqRender(); };
  window.reqRender = reqRender;

  window.reqFetchAll = reqFetchAll;
  window.reqFetchByStatus = reqFetchByStatus;
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

  window.openReqDetailsModal = function (reqId) {
    window.initReqDetailsModal();
    
    const req = reqData.find(x => x.id === reqId);
    if (!req) {
      console.warn('[ReqDetailsModal] Request not found:', reqId);
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
              <span class="req-details-value">${req.requiredBy ?? '-'}</span>
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

        <div class="req-details-section">
          <div class="req-details-section-title">Requester Information</div>
          <div class="req-details-grid-2">
            <div class="req-details-field">
              <span class="req-details-label">Requester Name</span>
              <span class="req-details-value">${req.requesterName ?? req.name ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Relationship</span>
              <span class="req-details-value">${req.requesterRelationship ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Contact</span>
              <span class="req-details-value">${req.requesterContact ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Email</span>
              <span class="req-details-value">${req.requesterEmail ?? '-'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Requester Type</span>
              <span class="req-details-value">${req.type ?? '-'}</span>
            </div>
          </div>
        </div>

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
  return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '??';
}

function staffGetDepts() {
  return [...new Set(staffList.map(s => s.department).filter(Boolean))].sort();
}

function staffPopulateDepts() {
  const sel      = document.getElementById('staff-filter-dept');
  const datalist = document.getElementById('staff-dept-list');
  if (!sel) return;
  const current = sel.value;
  while (sel.options.length > 1) sel.remove(1);
  if (datalist) datalist.innerHTML = '';
  staffGetDepts().forEach(d => {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    sel.appendChild(opt.cloneNode(true));
    if (datalist) datalist.appendChild(opt);
  });
  if (current) sel.value = current;
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
    if (!isOther) custom.value = '';
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
  return document.getElementById('add-staff-custom-dept')?.value.trim() || '';
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
  ['add-staff-email','add-staff-first','add-staff-last',
   'add-staff-phone','add-staff-position','add-staff-custom-dept'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const deptChoice = document.getElementById('add-staff-dept-choice');
  if (deptChoice) deptChoice.value = 'Blood Bank';

  staffHideError('add-staff-error');
  staffToggleDepartmentInput();
  openModal('addStaffModal');
}

function staffPreviewPassword() {
  staffToggleDepartmentInput();
}

async function submitAddStaff() {
  const email    = document.getElementById('add-staff-email').value.trim();
  const first    = document.getElementById('add-staff-first').value.trim();
  const last     = document.getElementById('add-staff-last').value.trim();
  const phone    = document.getElementById('add-staff-phone').value.trim();
  const dept     = staffGetAddDepartment();
  const position = document.getElementById('add-staff-position').value.trim();

  if (!email || !first || !last || !dept) {
    staffShowError('add-staff-error', 'Email, first name, last name, and department are required.');
    return;
  }
  if (!staffValidEmail(email)) {
    staffShowError('add-staff-error', 'Please enter a valid email address.');
    return;
  }
  if (document.getElementById('add-staff-dept-choice')?.value === 'Others' && !dept) {
    staffShowError('add-staff-error', 'Please enter the custom department.');
    return;
  }

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
  document.getElementById('view-staff-hiredate').textContent = staffFmtDate(s.hireDate);
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
  document.getElementById('edit-staff-dept').value           = s.department  || '';
  document.getElementById('edit-staff-position').value       = s.position    || '';
  document.getElementById('edit-staff-status').value         = s.status || 'active';
  document.getElementById('edit-staff-password').value       = '';
  document.getElementById('edit-staff-target-id').value      = id;

  const hasAccess = staffHasDashboardAccess(s);
  const statusWrap = document.getElementById('edit-staff-status-wrap');
  const passwordTitle = document.getElementById('edit-staff-password-title');
  const passwordRow = document.getElementById('edit-staff-password-row');
  if (statusWrap) statusWrap.style.display = hasAccess ? '' : 'none';
  if (passwordTitle) passwordTitle.style.display = hasAccess ? '' : 'none';
  if (passwordRow) passwordRow.style.display = hasAccess ? 'flex' : 'none';

  staffHideError('edit-staff-error');
  staffPopulateDepts();
  openModal('editStaffModal');
}

async function submitEditStaff() {
  const id       = parseInt(document.getElementById('edit-staff-target-id').value);
  const first    = document.getElementById('edit-staff-first').value.trim();
  const last     = document.getElementById('edit-staff-last').value.trim();
  const phone    = document.getElementById('edit-staff-phone').value.trim();
  const staffId  = document.getElementById('edit-staff-id').value.trim();
  const dept     = document.getElementById('edit-staff-dept').value.trim();
  const position = document.getElementById('edit-staff-position').value.trim();
  const status   = document.getElementById('edit-staff-status').value;
  const password = document.getElementById('edit-staff-password').value;
  const current  = staffList.find(s => s.id === id);
  const hasAccess = staffHasDashboardAccess(current || {});

  if (!first || !last || !dept) {
    staffShowError('edit-staff-error', 'First name, last name, and department are required.');
    return;
  }
  if (hasAccess && password && password.length < 6) {
    staffShowError('edit-staff-error', 'New password must be at least 6 characters.');
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
                             newPassword: hasAccess ? (password || null) : null }),
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
}

document.addEventListener('DOMContentLoaded', initStaffPanel);

///////// HOSPITAL PANEL/////////////

const HOSPITAL_API = '/api/admin/hospitals';

let hospData = [];
let hospPage = 1;
const hospPerPage = 5;

document.addEventListener('DOMContentLoaded', () => {
    hospLoadAll();
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
    const sort = document.getElementById('hosp-sort')?.value || 'name_asc';
    
    let list = hospData.filter(h => {
        const matchQ = !q || 
            h.hospitalName.toLowerCase().includes(q) || 
            h.city.toLowerCase().includes(q) || 
            h.email.toLowerCase().includes(q);
        return matchQ;
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
        const row = `<tr>
            <td><strong>${h.hospitalName}</strong></td>
            <td style="font-size:12px;color:var(--muted)">${h.city}<br>${h.province}</td>
            <td style="font-size:12px;color:var(--muted)">${h.email}</td>
            <td style="font-size:12px;color:var(--muted)">${h.phoneNumber || '-'}</td>
            <td style="font-weight:700">${h.requestCount || 0}</td>
            <td><span class="tag tag-active">Active</span></td>
            <td>
                <div style="display:flex;gap:6px">
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// UPDATE STATS
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function hospUpdateStats() {
    const total = hospData.length;
    const totalReqs = hospData.reduce((s, h) => s + (h.requestCount || 0), 0);
    
    const activeEl = document.getElementById('hosp-active-count');
    if (activeEl) activeEl.textContent = total;
    
    const inactiveEl = document.getElementById('hosp-inactive-count');
    if (inactiveEl) inactiveEl.textContent = '0';
    
    const totalEl = document.getElementById('hosp-total-count');
    if (totalEl) totalEl.textContent = total;
    
    const reqsEl = document.getElementById('hosp-requests-count');
    if (reqsEl) reqsEl.textContent = totalReqs;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// PAGINATION
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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



// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CREATE HOSPITAL – Submit form
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function hospCreate() {
    const email = document.getElementById('hosp-add-email')?.value.trim();
    const name = document.getElementById('hosp-add-name')?.value.trim();
    const address = document.getElementById('hosp-add-address')?.value.trim();
    const city = document.getElementById('hosp-add-city')?.value.trim();
    const province = document.getElementById('hosp-add-province')?.value.trim();
    const phone = document.getElementById('hosp-add-phone')?.value.trim() || null;
    const contactName = document.getElementById('hosp-add-contact-name')?.value.trim() || null;
    const contactPhone = document.getElementById('hosp-add-contact-phone')?.value.trim() || null;
    
    // Validation
    if (!email) return alert('Email is required.');
    if (!name) return alert('Hospital name is required.');
    if (!address) return alert('Address is required.');
    if (!city) return alert('City is required.');
    if (!province) return alert('Province is required.');
    
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
        
        closeModal('addHospitalModal');
        
        // Show success modal with callback to re-render
        showSysSuccessModal(
            'Hospital Created!',
            `${name} has been added to the system. Credentials sent to ${email}.`,
            () => hospRender()
        );
        
    } catch (err) {
        alert('Error: ' + err.message);
        console.error('[Hospital] Create error:', err);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Create Account';
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EDIT HOSPITAL – Open modal with data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
function hospOpenEdit(id) {
    const h = hospData.find(x => x.id === id);
    if (!h) {
        alert('Hospital not found');
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
    document.getElementById('hosp-edit-status').value = 'active';
    
    openModal('editHospitalModal');
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// EDIT HOSPITAL – Save changes
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
async function hospSaveEdit() {
    const id = document.getElementById('hosp-edit-idx').value;
    const name = document.getElementById('hosp-edit-name')?.value.trim();
    const address = document.getElementById('hosp-edit-address')?.value.trim();
    const city = document.getElementById('hosp-edit-city')?.value.trim();
    const province = document.getElementById('hosp-edit-province')?.value.trim();
    const phone = document.getElementById('hosp-edit-phone')?.value.trim() || null;
    const contactName = document.getElementById('hosp-edit-contact-name')?.value.trim() || null;
    const contactPhone = document.getElementById('hosp-edit-contact-phone')?.value.trim() || null;
    
    if (!name) return alert('Hospital name is required.');
    
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
        alert('Error: ' + err.message);
        console.error('[Hospital] Edit error:', err);
    } finally {
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Save Changes';
        }
    }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DELETE HOSPITAL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// CONFIRM DELETE (from table row) – Uses reusable modal
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
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


// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// STAFF PROFILE FUNCTIONS
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ━━ GLOBAL STATE ━━
let currentUserRole = 'STAFF'; // Set from backend
let currentUserId = null;
let currentUserData = {};
let activePanel = 'dashboard';
let reqData          = [];
 
// ━━ INITIALIZATION ━━
document.addEventListener('DOMContentLoaded', () => {
  loadCurrentUserProfile();
  initializeProfileListeners();
});
 
// ━━ LOAD CURRENT USER PROFILE ━━
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

    if (currentUserRole === 'ADMIN') {
      loadAdminProfile();
    } else if (currentUserRole === 'STAFF') {
      loadStaffProfile();
    }
  } catch (error) {
    console.error('Error loading profile:', error);
  }
}
 
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ADMIN PROFILE FUNCTIONS
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

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


// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// STAFF PROFILE FUNCTIONS
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

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
  if (hiredEl) hiredEl.textContent = data.hireDate ? formatDate(data.hireDate) : '-';
  
  // Populate form fields
  const firstNameField = document.getElementById('staff-profile-firstname');
  const lastNameField = document.getElementById('staff-profile-lastname');
  const emailField = document.getElementById('staff-profile-email');
  const phoneField = document.getElementById('staff-profile-phone');
  const deptInputField = document.getElementById('staff-profile-department-input');
  const posInputField = document.getElementById('staff-profile-position-input');
  
  if (firstNameField) firstNameField.value = data.firstName || '';
  if (lastNameField) lastNameField.value = data.lastName || '';
  if (emailField) emailField.value = (data.user && data.user.email) || '';
  if (phoneField) phoneField.value = data.phoneNumber || '';
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
  const firstName = document.getElementById('staff-profile-firstname').value;
  const lastName = document.getElementById('staff-profile-lastname').value;
  const phoneNumber = document.getElementById('staff-profile-phone').value;
  
  // Validation
  if (!firstName || !lastName) {
    showStaffProfileError('First Name and Last Name are required');
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
}

function updateSidebarUser(initials, name, role) {
  const avatarEl = document.getElementById('sidebar-user-avatar');
  const nameEl = document.getElementById('sidebar-user-name');
  const roleEl = document.getElementById('sidebar-user-role');
  
  if (avatarEl) avatarEl.textContent = initials;
  if (nameEl) nameEl.textContent = name;
  if (roleEl) roleEl.textContent = role;
}


// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// PASSWORD MANAGEMENT (BOTH ADMIN AND STAFF)
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

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
  event.target.textContent = isPassword ? '🙈' : '👁';
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
  const submitBtn = event.target;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Updating...';
  submitBtn.disabled = true;
  
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
      const errorData = await response.json();
      showSecurityError(errorData.message || 'Failed to change password');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      return;
    }

    // Clear form
    document.getElementById('current-password').value = '';
    document.getElementById('new-password').value = '';
    document.getElementById('confirm-password').value = '';
    document.getElementById('password-strength').classList.remove('show');
    
    showSecuritySuccess('Password updated successfully');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  } catch (error) {
    console.error('Error changing password:', error);
    showSecurityError('An error occurred while changing password');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
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
  const submitBtn = event.target;
  const originalText = submitBtn.textContent;
  submitBtn.textContent = 'Updating...';
  submitBtn.disabled = true;
  
  try {
    const response = await fetch('/api/auth/change-password', {
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
      const errorData = await response.json();
      showStaffSecurityError(errorData.message || 'Failed to change password');
      submitBtn.textContent = originalText;
      submitBtn.disabled = false;
      return;
    }

    // Clear form
    document.getElementById('staff-current-password').value = '';
    document.getElementById('staff-new-password').value = '';
    document.getElementById('staff-confirm-password').value = '';
    document.getElementById('staff-password-strength').classList.remove('show');
    
    showStaffSecuritySuccess('Password updated successfully');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
  } catch (error) {
    console.error('Error changing password:', error);
    showStaffSecurityError('An error occurred while changing password');
    submitBtn.textContent = originalText;
    submitBtn.disabled = false;
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


// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// PROFILE TAB SWITCHING
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

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


// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// PANEL SWITCHING
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

function showPanel(panelName, element) {
  activePanel = panelName; // 👈 ADD THIS

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


// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// UTILITY FUNCTIONS
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
 
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}


// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// ERROR & SUCCESS MESSAGE HANDLERS
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

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



// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// EVENT LISTENERS INITIALIZATION
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

function initializeProfileListeners() {
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
    setServedRange('thisMonth', false);
  }
  const statusStartEl = document.getElementById('logging-status-date-from');
  const statusEndEl = document.getElementById('logging-status-date-to');
  if (statusStartEl && statusEndEl && !statusStartEl.value && !statusEndEl.value) {
    setStatusRange('thisMonth');
  }

  loadLoggingData();
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

function loggingStatusRender(resetPage = false) {
  try {
    if (resetPage) {
      loggingState.statusLogsPage = 1;
    }

    const searchEl = document.getElementById('logging-status-search');
    const statusFilterEl = document.getElementById('logging-status-filter-status');
    const sortEl = document.getElementById('logging-status-sort');

    const search = searchEl ? searchEl.value.trim() : '';
    const statusFilter = statusFilterEl ? statusFilterEl.value : 'ALL';
    const sort = sortEl ? sortEl.value : 'date_desc';

    const queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
    queryParams.append('sort', sort);
    queryParams.append('page', String(loggingState.statusLogsPage));
    queryParams.append('size', String(loggingState.itemsPerPage));

    showLoadingInTable('logging-status-tbody', 8);

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
        showErrorInTable('logging-status-tbody', 'Failed to load status logs', 8);
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
      return;
    }

    if (empty) empty.style.display = 'none';

    response.data.forEach((log) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>#${log.request?.id || 'N/A'}</td>
        <td>${log.request?.referenceNumber || '?'}</td>
        <td><span class="status-badge" style="background:#F8FAFC;color:#475569">${log.oldStatus || '?'}</span></td>
        <td><span class="status-badge" style="background:#E8F5E9;color:#22863A">${log.newStatus || '?'}</span></td>
        <td>${log.changedBy?.username || 'System'}</td>
        <td>${formatDateTime(log.changedAt)}</td>
        <td style="max-width:200px;white-space:normal;word-break:break-word;font-size:12px">${log.notes || '?'}</td>
        <td>
          <button class="btn-ghost" onclick="viewStatusLogDetail(${log.id})" style="padding:4px 8px;font-size:11px">View</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    updatePaginationControls('status', response.currentPage || 1, response.totalPages || 1, response.totalElements || 0);
  } catch (error) {
    console.error('Error rendering status logs table:', error);
  }
}

function loggingStatusPrevPage() {
  if (loggingState.statusLogsPage > 1) {
    loggingState.statusLogsPage -= 1;
    loggingStatusRender();
  }
}

function loggingStatusNextPage() {
  loggingState.statusLogsPage += 1;
  loggingStatusRender();
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

function loggingServedRender(resetPage = false) {
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

    showLoadingInTable('logging-served-tbody', 12);

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
        showErrorInTable('logging-served-tbody', 'Failed to load served logs', 12);
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
      return;
    }

    if (empty) empty.style.display = 'none';

    rows.forEach((rowData) => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>${rowData.referenceNumber || 'N/A'}</strong></td>
        <td>${rowData.patientName || '?'}</td>
        <td>${toDisplayEnum(rowData.requestCategory) || '?'}</td>
        <td>${resolveHospitalWard(rowData)}</td>
        <td>${toDisplayEnum(rowData.bloodType) || '?'}</td>
        <td>${toDisplayEnum(rowData.bloodComponent) || '?'}</td>
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
  } catch (error) {
    console.error('Error rendering served table:', error);
  }
}

function loggingServedPrevPage() {
  if (loggingState.servedPage > 1) {
    loggingState.servedPage -= 1;
    loggingServedRender();
  }
}

function loggingServedNextPage() {
  loggingState.servedPage += 1;
  loggingServedRender();
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
    document.getElementById('logging-status-modal-ref-num').textContent = log.request?.referenceNumber || '?';
    document.getElementById('logging-status-modal-old-status').textContent = log.oldStatus || '?';
    document.getElementById('logging-status-modal-new-status').textContent = log.newStatus || '?';
    document.getElementById('logging-status-modal-changed-by').textContent = log.changedBy?.fullName || log.changedBy?.username || 'System';
    document.getElementById('logging-status-modal-changed-at').textContent = formatDateTime(log.changedAt);
    document.getElementById('logging-status-modal-notes').textContent = log.notes || '?';
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
    document.getElementById('logging-served-modal-patient').textContent = detail.patientName || '?';
    document.getElementById('logging-served-modal-blood').textContent = `${toDisplayEnum(detail.bloodType) || '?'} / ${toDisplayEnum(detail.bloodComponent) || '?'}`;
    document.getElementById('logging-served-modal-requested').textContent = `${safeNumber(detail.requestedUnits)} unit(s)`;
    document.getElementById('logging-served-modal-served').textContent = `${servedUnits} unit(s)`;
    document.getElementById('logging-served-modal-unserved-count').textContent = `${unservedUnits} unit(s)`;
    document.getElementById('logging-served-modal-result').textContent = detail.result || '?';
    document.getElementById('logging-served-modal-requester-type').textContent = toDisplayEnum(detail.requestCategory) || '?';
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

function setStatusRange(range) {
  const startEl = document.getElementById('logging-status-date-from');
  const endEl = document.getElementById('logging-status-date-to');
  applyQuickDateRange(startEl, endEl, range);
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
  if (startDate) queryParams.append('startDate', startDate);
  if (endDate) queryParams.append('endDate', endDate);

  fetch(`${API_BASE_URL}/export/status-logs?${queryParams.toString()}`)
    .then((response) => {
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      return response.json();
    })
    .then((data) => {
      if (!data || data.length === 0) {
        alert('No status log data to export.');
        return;
      }

      const rows = data.map((log) => ({
        'Reference No.': log.request?.id || '',
        'Reference #': log.request?.referenceNumber || '',
        'Old Status': log.oldStatus || '',
        'New Status': log.newStatus || '',
        'Changed By': log.changedBy?.username || 'System',
        'Changed At': formatExcelDate(log.changedAt),
        Notes: log.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 14 },
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
        'Reference No.': row.referenceNumber || '',
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

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// SUCCESS MODAL FUNCTIONS
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

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

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// DELETE CONFIRMATION MODAL FUNCTIONS
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

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

// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓
// HELPER: Show toast notification (alternative to modal)
// ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓

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
    const icon = type === 'success' ? '✓' : 
                 type === 'error' ? '✕' : 'ℹ';

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
  }
}

/**
 * Fetches and compares blood bank data
 */
async function checkBloodBankUpdates() {
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
  }
}

/**
 * Fetches and compares blood requests data
 */
async function checkBloodRequestsUpdates() {
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
  loggingStatusRender()
  loggingServedRender()

  // Small delay to ensure initial data is loaded
  setTimeout(() => {
    dataSnapshots.dashboard = createSnapshot(window.dashboardData || {});
    dataSnapshots.bloodBank = createSnapshot(window.bankData || []);
    dataSnapshots.requests = createSnapshot(reqData || []);
  }, 500);

  console.log('[Auto-Refresh] Initialized - checking for changes every 30 seconds');

  const REFRESH_INTERVAL = 1000; // 30 seconds for checking

  autoRefreshIntervals.combined = setInterval(() => {
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
  console.log('[Auto-Refresh] Stopped');
}

/**
 * Pause auto-refresh temporarily
 */
function pauseAutoRefresh() {
  stopAutoRefresh();
  console.log('[Auto-Refresh] Paused');
}

/**
 * Resume auto-refresh
 */
function resumeAutoRefresh() {
  initializeAutoRefresh();
  console.log('[Auto-Refresh] Resumed');
}

/**
 * Change refresh check interval (in seconds)
 */
function changeRefreshInterval(seconds) {
  stopAutoRefresh();
  const REFRESH_INTERVAL = seconds * 1000;

  autoRefreshIntervals.combined = setInterval(() => {
    console.log(`[Auto-Refresh] Checking for changes (${seconds}s interval)...`);
    
    checkDashboardUpdates();
    checkBloodBankUpdates();
    checkBloodRequestsUpdates();

  }, REFRESH_INTERVAL);

  console.log(`[Auto-Refresh] Check interval changed to ${seconds} seconds`);
}

async function checkLoggingUpdates() {
  try {
    const res = await fetch('/api/admin/logs/summary', { headers: { Accept: 'application/json' } });
    if (!res.ok) return;
    const json = await res.json();
    
    const newSnapshot = createSnapshot(json);
    
    if (hasDataChanged(dataSnapshots.logging, newSnapshot)) {
      dataSnapshots.logging = newSnapshot;
      loadSummary();
      if (loggingState.currentTab === 'status-logs') {
        loggingStatusRender();
      } else {
        loggingServedRender();
      }
    }
  } catch (err) {
    console.error('[Auto-Refresh] Logging check failed:', err);
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
  console.log('[Auto-Refresh] Forced refresh - all data reloaded');
}