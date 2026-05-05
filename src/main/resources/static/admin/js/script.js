// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════
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
        staffLoadAll();  // ← Only load staff data if admin
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
  initializeAutoRefresh();  // ← This replaces the loadBloodBank() and loadDashboard() calls
  initStaffPanel();
  initializeLoggingPanel();
});

// ── Panel navigation ───────────────────────────────────────
function showPanel(id, navEl) {
  document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + id).classList.add('active');
  if (navEl) {
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    navEl.classList.add('active');
  }
}


// ── Modal helpers ──────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('show');
}

function closeModal(id) {
  document.getElementById(id).classList.remove('show');
}

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('show');
  });
});

// ── Logout ─────────────────────────────────────────────────
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


// ═══════════════════════════════════════════════════════
// ADMIN DASHBOARD - FRONTEND (UPDATED)
// ═══════════════════════════════════════════════════════

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
      renderRecentActivities(data.recentActivities);  // ← ADD THIS LINE
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
    const name    = r.hospitalProfile?.hospitalName ?? r.requesterName ?? '—';
    const blood   = r.bloodType ?? '—';
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

// ═══════════════════════════════════════════════════════
// BLOOD BANK
// ═══════════════════════════════════════════════════════

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

// ── Helpers ──────────────────────────────────────────
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
  const rh  = rhType === 'POSITIVE' ? '+' : rhType === 'NEGATIVE' ? '−' : '';
  return abo + rh;
}

function componentLabel(ct) {
  return COMPONENT_LABELS[ct] ?? ct ?? '—';
}

function sourceLabel(bag) {
  if (bag.eventName) return '🩸 ' + bag.eventName;
  const map = {
    DONATION:        '🩸 Blood Drive',
    WALK_IN:         '🚶 Walk-in Donor',
    TRANSFER:        '🔄 BMC Transfer',
    EXTERNAL_SUPPLY: '📦 External Supply',
  };
  return map[bag.source] ?? bag.source ?? '—';
}

function computeBagStatus(bag) {
  const now  = new Date();
  const soon = new Date(); soon.setDate(soon.getDate() + 7);
  const exp  = new Date(bag.expiresAt);

  if (bag.status === 'DISCARDED')    return 'DISCARDED';
  if (bag.status === 'DISPENSED')    return 'DISPENSED';
  if (bag.status === 'CROSSMATCHED') return 'CROSSMATCHED';
  if (bag.status === 'EXPIRED' || (bag.status === 'AVAILABLE' && exp < now)) return 'EXPIRED';
  if (bag.status === 'AVAILABLE' && exp <= soon) return 'EXPIRING';
  return 'AVAILABLE';
}

function formatBagDate(d) {
  if (!d) return '—';
  const str = d.includes('T') ? d : d + 'T00:00:00';
  return new Date(str).toLocaleDateString('en-PH', {
    year: 'numeric', month: 'short', day: 'numeric'
  });
}

// ── Tab Switcher ──────────────────────────────────────
function switchBBTab(tab, btn) {
  ['inventory','bags','analytics'].forEach(t => {
    document.getElementById('bb-tab-' + t).style.display = t === tab ? 'block' : 'none';
  });
  document.querySelectorAll('.bb-tab').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  if (tab === 'bags')      renderBagsTable();
  if (tab === 'inventory') renderInventoryGrid();
}

// ── Inventory Grid ────────────────────────────────────
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
      alert.innerHTML = `<span style="font-size:16px">⏰</span>
        <span><strong>${openCount} open system bag${openCount > 1 ? 's' : ''}</strong>
        converted from Whole Blood — expires in 24 hours. Prioritize immediately.</span>`;
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

// ── Bags Table ────────────────────────────────────────
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

  if (!total) {
    tbody.innerHTML      = '';
    empty.style.display  = 'block';
    footer.style.display = 'none';
    return;
  }

  empty.style.display  = 'none';
  footer.style.display = 'flex';

  const start   = (bagsCurrentPage - 1) * BAGS_PER_PAGE;
  const page    = bagsCurrent.slice(start, start + BAGS_PER_PAGE);
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
      DISPENSED:    `<span class="bag-status bag-status-dispensed">→ Dispensed</span>`,
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
            onclick="confirmOpenSystem(${bag.id}, '${bag.serialNumber}')">→ PRBC</button>`;
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

// ── Bag Detail Modal ──────────────────────────────────
function openBagDetail(id) {
  const bag = BLOOD_BAGS.find(b => b.id === id);
  if (!bag) return;
  const cs = computeBagStatus(bag);

  const statusBadgeMap = {
    AVAILABLE:    `<span class="bag-status bag-status-available"  style="font-size:13px;padding:5px 14px">● Available</span>`,
    EXPIRING:     `<span class="bag-status bag-status-expiring"   style="font-size:13px;padding:5px 14px">⚠ Expiring Soon</span>`,
    CROSSMATCHED: `<span class="bag-status bag-status-crossmatched" style="font-size:13px;padding:5px 14px">🔒 Crossmatched</span>`,
    DISPENSED:    `<span class="bag-status bag-status-dispensed"  style="font-size:13px;padding:5px 14px">→ Dispensed</span>`,
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
  document.getElementById('bagd-txn').textContent       = bag.transactionNumber || '—';
  document.getElementById('bagd-serial').textContent    = bag.serialNumber      || '—';
  document.getElementById('bagd-remarks').textContent   = bag.remarks           || '—';
  document.getElementById('bagd-received-by').textContent = bag.receivedBy      || '—';

  const openWarn = document.getElementById('bagd-open-system-warn');
  if (bag.openSystem) {
    openWarn.style.display = 'block';
    openWarn.innerHTML = `<span>⏰</span>
      <span>Converted to Open System PRBC on ${formatBagDate(bag.openSystemAt)}. Expires 24hrs after conversion.</span>`;
  } else {
    openWarn.style.display = 'none';
  }

  const dispSection = document.getElementById('bagd-dispensed-section');
  if (bag.status === 'DISPENSED') {
    dispSection.style.display = 'block';
    document.getElementById('bagd-dispensed-to').textContent = bag.dispensedTo   || '—';
    document.getElementById('bagd-dispensed-at').textContent = formatBagDate(bag.dispensedAt);
  } else {
    dispSection.style.display = 'none';
  }

  const discardSection = document.getElementById('bagd-discard-section');
  if (bag.status === 'DISCARDED') {
    discardSection.style.display = 'block';
    document.getElementById('bagd-discard-reason').textContent = bag.discardReason || '—';
  } else {
    discardSection.style.display = 'none';
  }

  const actionsEl = document.getElementById('bagd-actions');
  if (cs === 'AVAILABLE' || cs === 'EXPIRING') {
    const convertBtn = bag.componentType === 'WHOLE_BLOOD' && !bag.openSystem
      ? `<button class="btn-secondary" style="flex:1;justify-content:center;padding:11px"
           onclick="closeModal('bagDetailModal');confirmOpenSystem(${bag.id},'${bag.serialNumber}')">
           → Convert to PRBC</button>`
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

// ── Open System Conversion ────────────────────────────
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

// ── Discard ───────────────────────────────────────────
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

// ── Add Stock Modal ───────────────────────────────────
function updateAddExpiry() {
  const comp        = document.getElementById('add-component-type').value;
  const collectedEl = document.getElementById('add-collected-at');
  const expiresEl   = document.getElementById('add-expires-at');
  const hintEl      = document.getElementById('add-expiry-hint');

  const EXPIRY_DAYS = {
    WHOLE_BLOOD: 42, PRBC: 42, LEUKOREDUCED_PRBC: 42, ALIQUOTED_PRBC: 42,
    PLATELET_CONCENTRATE: 5, FRESH_FROZEN_PLASMA: 365,
    CRYOPRECIPITATE: 365, CRYOSUPERNATANT: 365,
  };

  const days = EXPIRY_DAYS[comp];
  hintEl.textContent = days ? `(${days}-day shelf life)` : '';

  if (collectedEl.value && days) {
    const exp = new Date(collectedEl.value);
    exp.setDate(exp.getDate() + days);
    expiresEl.value = exp.toISOString().split('T')[0];
  }
}

function openAddBloodModal() {
  document.getElementById('add-transaction-number').value = '';
  document.getElementById('add-serial-number').value      = '';
  document.getElementById('add-blood-type').value         = '';
  document.getElementById('add-rh-type').value            = 'POSITIVE';
  document.getElementById('add-component-type').value     = '';
  document.getElementById('add-volume-ml').value          = '';
  document.getElementById('add-collected-at').value       = '';
  document.getElementById('add-expires-at').value         = '';
  document.getElementById('add-remarks').value            = '';
  const hint = document.getElementById('add-expiry-hint');
  if (hint) hint.textContent = '';
  openModal('addBloodModal');
}

async function submitAddBloodStock() {
  const serialNumber      = document.getElementById('add-serial-number').value.trim();
  const transactionNumber = document.getElementById('add-transaction-number').value.trim();
  const aboType           = document.getElementById('add-blood-type').value;
  const rhType            = document.getElementById('add-rh-type').value;
  const componentType     = document.getElementById('add-component-type').value;
  const volumeMl          = document.getElementById('add-volume-ml').value;
  const collectedAt       = document.getElementById('add-collected-at').value;
  const expiresAt         = document.getElementById('add-expires-at').value;
  const remarks           = document.getElementById('add-remarks').value.trim();

  if (!serialNumber || !aboType || !rhType || !componentType || !volumeMl || !collectedAt || !expiresAt) {
    alert('Please fill in all required fields.');
    return;
  }

  try {
    const res = await fetch('/api/admin/blood-bank/intake', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        serialNumber,
        transactionNumber:  transactionNumber || null,
        aboType, rhType, componentType,
        volumeMl:    parseInt(volumeMl),
        collectedAt: collectedAt + 'T00:00:00',
        expiresAt:   expiresAt   + 'T00:00:00',
        remarks:     remarks || null,
        source:      'TRANSFER',
      })
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert(err.message || 'Failed to add blood stock.');
      return;
    }
    closeModal('addBloodModal');
    await loadBloodBank();
  } catch (err) {
    console.error('Add stock error:', err);
    alert('Network error. Please try again.');
  }
}

// ── Sync Helper: Invalidate Blood Request Bag Cache ────
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

// ═══════════════════════════════════════════════════════════════
// PRINTING FUNCTIONS - PDF & EXCEL EXPORTS (UPDATED)
// ═══════════════════════════════════════════════════════════════
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
    return el ? el.textContent.trim() : '—';
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
    critical: readMetric('[data-metric="urgency-critical"]'),
    high: readMetric('[data-metric="urgency-high"]'),
    medium: readMetric('[data-metric="urgency-medium"]'),
    low: readMetric('[data-metric="urgency-low"]'),
    
    // Category
    emergency: readMetric('[data-metric="category-emergency"]'),
    inpatient: readMetric('[data-metric="category-inpatient"]'),
    outpatient: readMetric('[data-metric="category-outpatient"]'),
    hospital: readMetric('[data-metric="category-hospital"]'),
    
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
        
        .metric-box { border: 1px solid #ddd; padding: 6px 4px; text-align: center; background: #fafafa; }
        .metric-val { font-size: 13pt; font-weight: 700; color: #000; margin: 2px 0; }
        .metric-label { font-size: 7pt; color: #666; text-transform: uppercase; font-weight: 600; }
        
        .mini-table { width: 100%; font-size: 8.5pt; border-collapse: collapse; margin: 4px 0; }
        .mini-table th, .mini-table td { padding: 4px 5px; border: 1px solid #e0e0e0; text-align: left; }
        .mini-table th { background: #f5f5f5; font-weight: 700; }
        .mini-table td { font-size: 8.5pt; }
        .mini-table .num { text-align: right; }
        
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
      <h2>Request Status</h2>
      <div class="grid-5">
        <div class="metric-box">
          <div class="metric-label">Pending</div>
          <div class="metric-val">${metrics.pending}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Approved</div>
          <div class="metric-val">${metrics.approved}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Allocated</div>
          <div class="metric-val">${metrics.allocated}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Released</div>
          <div class="metric-val">${metrics.released}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Rejected</div>
          <div class="metric-val">${metrics.rejected}</div>
        </div>
      </div>
      
      <!-- URGENCY & CATEGORY -->
      <div class="grid-2">
        <div class="col">
          <h2 style="margin-bottom: 4px;">Urgency</h2>
          <table class="mini-table">
            <tr><td>Critical</td><td class="num">${metrics.critical}</td></tr>
            <tr><td>High</td><td class="num">${metrics.high}</td></tr>
            <tr><td>Medium</td><td class="num">${metrics.medium}</td></tr>
            <tr><td>Low</td><td class="num">${metrics.low}</td></tr>
          </table>
        </div>
        <div class="col">
          <h2 style="margin-bottom: 4px;">Category</h2>
          <table class="mini-table">
            <tr><td>Emergency</td><td class="num">${metrics.emergency}</td></tr>
            <tr><td>Inpatient</td><td class="num">${metrics.inpatient}</td></tr>
            <tr><td>Outpatient</td><td class="num">${metrics.outpatient}</td></tr>
            <tr><td>Hospital</td><td class="num">${metrics.hospital}</td></tr>
          </table>
        </div>
      </div>
      
      <!-- BLOOD INVENTORY -->
      <h2>Blood Type Inventory</h2>
      <div class="grid-4">
        <div class="metric-box"><div class="metric-label">O−</div><div class="metric-val">${metrics.o_neg}</div></div>
        <div class="metric-box"><div class="metric-label">O+</div><div class="metric-val">${metrics.o_pos}</div></div>
        <div class="metric-box"><div class="metric-label">A−</div><div class="metric-val">${metrics.a_neg}</div></div>
        <div class="metric-box"><div class="metric-label">A+</div><div class="metric-val">${metrics.a_pos}</div></div>
        <div class="metric-box"><div class="metric-label">B−</div><div class="metric-val">${metrics.b_neg}</div></div>
        <div class="metric-box"><div class="metric-label">B+</div><div class="metric-val">${metrics.b_pos}</div></div>
        <div class="metric-box"><div class="metric-label">AB−</div><div class="metric-val">${metrics.ab_neg}</div></div>
        <div class="metric-box"><div class="metric-label">AB+</div><div class="metric-val">${metrics.ab_pos}</div></div>
      </div>
      
      <!-- DISPATCH & ALERTS -->
      <div class="grid-2">
        <div class="col">
          <h2 style="margin-bottom: 4px;">Bag Dispatch</h2>
          <div class="stat-line"><span>Used</span><span style="font-weight:700">${metrics.used}</span></div>
          <div class="stat-line"><span>Discarded</span><span style="font-weight:700">${metrics.discarded}</span></div>
          <div class="stat-line"><span>Transferred</span><span style="font-weight:700">${metrics.transferred}</span></div>
        </div>
        <div class="col">
          <h2 style="margin-bottom: 4px;">Alerts</h2>
          <div class="stat-line"><span>Expiring Soon</span><span style="font-weight:700">${metrics.expiringSoon}</span></div>
          <div class="stat-line"><span>Expired</span><span style="font-weight:700">${metrics.expired}</span></div>
          <div class="stat-line"><span>Quality Issues</span><span style="font-weight:700">${metrics.qualityIssues}</span></div>
        </div>
      </div>
      
      <!-- PERFORMANCE & REQUESTER -->
      <div class="grid-2">
        <div class="col">
          <h2 style="margin-bottom: 4px;">Fulfillment</h2>
          <div class="stat-line"><span>Rate</span><span style="font-weight:700">${metrics.fulfillmentRate}</span></div>
          <div class="stat-line"><span>Total Released</span><span style="font-weight:700">${metrics.totalReleased}</span></div>
          <div class="stat-line"><span>Avg Days</span><span style="font-weight:700">${metrics.avgDays}</span></div>
        </div>
        <div class="col">
          <h2 style="margin-bottom: 4px;">Requester Type</h2>
          <div class="stat-line"><span>Hospital</span><span style="font-weight:700">${metrics.hospital} (${metrics.hospitalPct})</span></div>
          <div class="stat-line"><span>Anonymous</span><span style="font-weight:700">${metrics.anonymous} (${metrics.anonymousPct})</span></div>
        </div>
      </div>
      
      <!-- COMPONENTS -->
      <h2>Blood Components</h2>
      <div class="grid-4">
        <div class="metric-box">
          <div class="metric-label">Whole Blood</div>
          <div class="metric-val">${metrics.wholeBlood}</div>
          <div style="font-size: 7pt; color: #999;">${metrics.wholeBloodPct}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Red Cells</div>
          <div class="metric-val">${metrics.redCells}</div>
          <div style="font-size: 7pt; color: #999;">${metrics.redCellsPct}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Plasma</div>
          <div class="metric-val">${metrics.plasma}</div>
          <div style="font-size: 7pt; color: #999;">${metrics.plasmaPct}</div>
        </div>
        <div class="metric-box">
          <div class="metric-label">Platelets</div>
          <div class="metric-val">${metrics.platelets}</div>
          <div style="font-size: 7pt; color: #999;">${metrics.plateletsPct}</div>
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
    const rh = rhType === 'POSITIVE' ? '+' : rhType === 'NEGATIVE' ? '-' : '';
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

// ═══════════════════════════════════════════════════════
// BLOOD REQUESTS — WITH PRINTING (PDF/EXCEL) FUNCTIONALITY
// ═══════════════════════════════════════════════════════

(function () {
  /* ─────────────────────────────────────────────────────────
     BLOOD TYPE MAPPING — Maps enum values to display format
     Preserves original enum for backend while displaying user-friendly text
  ───────────────────────────────────────────────────────── */
  const BLOOD_TYPE_MAP = {
    'A_POS': 'A+',
    'A_NEG': 'A-',
    'B_POS': 'B+',
    'B_NEG': 'B-',
    'AB_POS': 'AB+',
    'AB_NEG': 'AB-',
    'O_POS': 'O+',
    'O_NEG': 'O-',
  };

  function formatBloodType(bloodTypeEnum) {
    if (!bloodTypeEnum) return '—';
    return BLOOD_TYPE_MAP[bloodTypeEnum] || bloodTypeEnum;
  }

  /* ─────────────────────────────────────────────────────────
     INDICATION MAPPING — Maps indication codes to descriptions
  ───────────────────────────────────────────────────────── */
  const INDICATION_MAP = {
    'WB-1': 'Active bleeding with at least 15% blood volume loss, Hb<90 g/L, or BP drop >20%',
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

  function formatIndications(indicationString) {
    if (!indicationString) return 'Not specified';
    const codes = indicationString.split(',').map(s => s.trim()).filter(Boolean);
    const descriptions = codes.map(code => {
      const description = INDICATION_MAP[code];
      return description || code;
    }).filter(Boolean);
    return descriptions.length > 0 ? descriptions : ['Not specified'];
  }

  function getIndicationBadges(indicationString) {
    if (!indicationString) return '';
    const codes = indicationString.split(',').map(s => s.trim()).filter(Boolean);
    return codes.map(code => {
      return `<span class="req-indication-badge">${code}</span>`;
    }).join('');
  }

  function renderIndicationDetails(indicationString) {
    if (!indicationString) {
      return '<span class="req-details-value">Not specified</span>';
    }

    const codes = indicationString.split(',').map(s => s.trim()).filter(Boolean);
    
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
      const mainDescription = INDICATION_MAP[group.main] || '';
      const subCodes = group.subs;
      
      if (subCodes.length > 0) {
        html += `
          <div style="padding:12px;background:var(--subtle,#f9f9f9);border-left:3px solid var(--blue,#0066cc);border-radius:4px">
            <div style="font-weight:600;color:var(--blue,#0066cc);margin-bottom:8px;font-size:13px">
              ${group.main}
            </div>
            <div style="font-size:13px;color:var(--charcoal,#2a2a2a);line-height:1.5;margin-bottom:12px">
              ${mainDescription}
            </div>
            <div style="display:flex;flex-direction:column;gap:8px;margin-left:12px;border-left:2px solid var(--border,#e0e0e0);padding-left:12px;">
        `;
        
        subCodes.forEach(code => {
          const subLetter = code.replace(parentCode, '').toLowerCase();
          const subDescription = INDICATION_MAP[code] || code;
          html += `
            <div>
              <div style="font-weight:600;color:var(--muted,#666);font-size:12px;margin-bottom:2px">
                ${subLetter}.
              </div>
              <div style="font-size:12px;color:var(--charcoal,#2a2a2a);line-height:1.4">
                ${subDescription}
              </div>
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
              ${group.main}
            </div>
            <div style="font-size:13px;color:var(--charcoal,#2a2a2a);line-height:1.5">
              ${mainDescription}
            </div>
          </div>
        `;
      }
    });
    
    html += '</div>';
    return html;
  }

  /* ─────────────────────────────────────────────────────────
     CONSTANTS
  ───────────────────────────────────────────────────────── */
  const REQ_STATUSES = ['PENDING', 'APPROVED', 'ALLOCATED', 'READY_FOR_RELEASE', 'RELEASED'];
  const REQ_STATUS_LABEL = {
    PENDING: 'Pending', APPROVED: 'Approved', ALLOCATED: 'Allocated',
    READY_FOR_RELEASE: 'Ready for release', RELEASED: 'Released', REJECTED: 'Rejected',
  };
  const REQ_STATUS_TAG = {
    PENDING: 'tag-pending', APPROVED: 'tag-approved', ALLOCATED: 'tag-allocated',
    READY_FOR_RELEASE: 'tag-ready', RELEASED: 'tag-released', REJECTED: 'tag-rejected',
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
      body:       'This will move the request to <strong>Approved</strong>. You can select a blood bag when marking it as Allocated.',
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
 
  /* ─────────────────────────────────────────────────────────
     STATE
  ───────────────────────────────────────────────────────── */
  let reqData          = [];
  let reqExpanded      = {};
  let reqCurrentFilter = 'ALL';
  let reqPendingRejectId = null;
 
  let confirmPending = null;
 
  let bagPickerReqId    = null;
  let bagPickerSelected = null;
  let bagPickerData     = [];
  let bagPickerIsChange = false;
 
  const reqBagCache = {};
 
  /* ─────────────────────────────────────────────────────────
     DATA MAPPING
  ───────────────────────────────────────────────────────── */
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
              ?? '—';
 
    const allocatedBags = r.reservedBags ?? (r.fulfilledByBag ? [r.fulfilledByBag] : []);
 
    const bloodTypeEnum = r.bloodType ?? '—';
    const displayBloodType = formatBloodType(bloodTypeEnum);
 
    return {
      id:             r.id,
      name,
      type:           r.requesterType    ?? 'ANONYMOUS',
      patient:        r.patientName      ?? '—',
      patientName:    r.patientName      ?? '—',
      patientAge:     r.patientAge       ?? null,
      patientSex:     r.patientSex       ?? null,
      wardRoom:       r.wardRoom         ?? null,
      referenceNumber:       r.referenceNumber         ?? null,
      requestingPhysician: r.requestingPhysician ?? null,
      ageGroup:       r.ageGroup         ?? null,
      requestCategory: r.requestCategory ?? null,
      bloodTypeEnum:  bloodTypeEnum,
      bloodType:      displayBloodType,
      component:      COMPONENT_LABEL[r.bloodComponent] ?? r.bloodComponent ?? '—',
      bloodComponent: r.bloodComponent   ?? null,
      units:          r.numberOfUnits    ?? r.volumeMl ?? 1,
      volumeMl:       r.volumeMl         ?? null,
      urgency:        r.urgencyLevel     ?? 'LOW',
      urgencyLevel:   r.urgencyLevel     ?? 'LOW',
      requiredBy:     r.requiredBy       ?? null,
      date:           r.requestedAt
        ? new Date(r.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—',
      status:         r.status           ?? 'PENDING',
      requesterName:  r.requesterName    ?? null,
      requesterRelationship: r.requesterRelationship ?? null,
      requesterContact: r.requesterContact ?? null,
      requesterEmail: r.requesterEmail   ?? null,
      notes:          r.notes            ?? null,
      indication:     r.indication       ?? null,
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
    } catch (err) {
      console.error('[BloodRequests] fetch failed', err);
      reqShowError(`Failed to load requests — ${err.message}`);
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
    } catch (err) {
      console.error('[BloodRequests] fetch failed', err);
      reqShowError(`Failed to load requests — ${err.message}`);
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
        units:     req.units,
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
 
    const previewEl = document.getElementById(`req-bag-preview-${req.id}`);
    if (previewEl) {
      previewEl.outerHTML = reqBuildBagPreviewHTML(req);
    }
  }
 
  function reqBuildBagPreviewHTML(req) {
    const cache = reqBagCache[req.id];
    const id    = `req-bag-preview-${req.id}`;
 
    if (!['PENDING', 'APPROVED'].includes(req.status)) return `<div id="${id}"></div>`;
 
    if (!cache || cache.loading) {
      return `<div id="${id}" class="req-bag-preview-wrap">
        <div class="req-section-label">Compatible blood bags</div>
        <div class="req-bag-preview-loading">⏳ Checking available bags…</div>
      </div>`;
    }
    if (cache.error) {
      return `<div id="${id}" class="req-bag-preview-wrap">
        <div class="req-section-label">Compatible blood bags</div>
        <div class="req-bag-preview-loading" style="color:var(--crimson)">⚠️ ${cache.error}</div>
      </div>`;
    }
    if (!cache.bags?.length) {
      return `<div id="${id}" class="req-bag-preview-wrap">
        <div class="req-section-label">Compatible blood bags</div>
        <div class="req-bag-preview-loading">📭 No compatible bags in stock for ${req.bloodType}.</div>
      </div>`;
    }
 
    const compatible = cache.bags.filter(b => b.compatible !== false);
    const others     = cache.bags.filter(b => b.compatible === false);
    const now        = Date.now();
 
    function bagRow(b) {
      const expDate  = b.expiresAt ? new Date(b.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
      const daysLeft = b.expiresAt ? Math.ceil((new Date(b.expiresAt) - now) / 86400000) : null;
      const warn     = daysLeft !== null && daysLeft <= 7;
      return `<div class="req-bag-preview-row">
        <div class="req-bag-dot" style="${b.compatible === false ? 'background:var(--crimson);border-color:var(--crimson)' : ''}"></div>
        <div style="flex:1;min-width:0">
          <span class="req-bag-id">${b.serialNumber ?? b.id}</span>
          <span class="req-bag-info" style="margin-left:8px">
            ${formatBloodType(b.bloodType) ?? '—'} · ${b.componentType ?? '—'} · ${b.volumeMl ?? '—'} mL
            · Exp <span style="${warn ? 'color:var(--amber);font-weight:600' : ''}">${expDate}</span>
            ${warn ? `<span style="color:var(--amber);font-size:10px"> ⚠ ${daysLeft}d</span>` : ''}
          </span>
        </div>
        ${b.recommended ? `<span class="req-rec-badge" style="font-size:10px;padding:1px 7px">Recommended</span>` : ''}
      </div>`;
    }
 
    return `<div id="${id}" class="req-bag-preview-wrap">
      <div class="req-section-label" style="display:flex;align-items:center;gap:8px">
        Compatible blood bags
        <span class="req-bag-preview-count">${compatible.length} compatible · ${cache.bags.length} total available</span>
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
 
    title.textContent   = `Select ${req.units} bag${req.units > 1 ? 's' : ''} · ${req.bloodType} ${req.component}`;
    confirm.disabled    = true;
    confirm.textContent = isChange ? 'Change Selection' : 'Confirm & Mark Allocated';
    inner.innerHTML     = `<div class="req-bag-picker-loading">⏳ Loading available bags…</div>`;
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
      inner.innerHTML = `<div class="req-bag-picker-loading">⚠️ Failed to load bags — ${err.message}</div>`;
      return;
    }
 
    renderBagPicker(req);
  }
 
  function renderBagPicker(req) {
    const inner   = document.getElementById('req-bag-picker-inner');
    const confirm = document.getElementById('req-bag-picker-confirm');
 
    if (!bagPickerData.length) {
      inner.innerHTML  = `<div class="req-bag-picker-loading">📭 No compatible bags available for ${req.bloodType}.</div>`;
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
            : '—';
          const daysLeft = b.expiresAt ? Math.ceil((new Date(b.expiresAt) - Date.now()) / 86400000) : null;
          const warn     = daysLeft !== null && daysLeft <= 7;
          return `
            <div class="req-bag-row${isSelected ? ' selected' : ''}${!isCompatible ? ' incompatible' : ''}"
                 onclick="reqBagPickerToggle('${b.id}')">
              <div class="req-bag-check">${isSelected ? '✓' : ''}</div>
              <div class="req-bag-dot" style="${!isCompatible ? 'background:var(--crimson);border-color:var(--crimson)' : ''}"></div>
              <div style="flex:1;min-width:0">
                <div class="req-bag-id">${b.serialNumber ?? b.id}</div>
                <div class="req-bag-info">
                  ${formatBloodType(b.bloodType) ?? '—'} · ${b.componentType ?? '—'} · ${b.volumeMl ?? '—'} mL
                  · Exp <span style="${warn ? 'color:var(--amber);font-weight:600' : ''}">${expDate}</span>
                  ${warn ? `<span style="color:var(--amber);font-size:11px"> ⚠ ${daysLeft}d left</span>` : ''}
                  ${!isCompatible ? `<span style="color:var(--crimson)"> · not compatible</span>` : ''}
                </div>
                <div class="req-bag-info" style="margin-top:2px;color:var(--muted)">
                  Source: ${b.source ?? '—'} · SN: ${b.serialNumber ?? '—'}
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
    btn.textContent = bagPickerIsChange ? 'Changing…' : 'Allocating…';
 
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
      console.error('[reqAllocate] failed', err);
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
      `<strong>${req.name}</strong> — Patient: ${req.patient} &nbsp;·&nbsp; ${req.bloodType} ${req.component} &nbsp;·&nbsp; ${req.units} unit${req.units > 1 ? 's' : ''}`;
 
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
        openReleaseReceipt(r, data);
      }
    } catch (err) {
      console.error('[reqAdvance] failed', err);
      r.status = prevStatus;
      reqRender();
      alert(`Action failed: ${err.message}`);
    }
  };

  function openReleaseReceipt(req, data) {
    console.log(req);
    console.log(data);

    const payload = {
      referenceNumber: req.referenceNumber ?? data.referenceNumber,
      releasedAt:      new Date().toISOString(),
      patientName:     req.patient,
      bloodType:       req.bloodTypeEnum,
      wardRoom:        req.wardRoom ?? null,
      physician:       req.requestingPhysician ?? null,
      hospitalName:    req.name,
      urgency:         req.urgency,
      releasedBy:      data.releasedBy ?? null,
      bags:            (req.allocatedBags ?? []).map(b => ({
        serialNumber:  b.serialNumber,
        bloodType:     b.bloodType,
        componentType: b.componentType,
        volumeMl:      b.volumeMl,
        expiresAt:     b.expiresAt,
      })),
    };
    
    const encoded = btoa(JSON.stringify(payload));
    const url = `receipt/blood-release-receipt.html?data=${encoded}`;
    window.open(url, '_blank');
  }

  window.reqPrintReceipt = function(id) {
    const req = reqData.find(x => x.id === id);
    if (!req) return;
    openReleaseReceipt(req, {});
  };

  window.reqOpenReject = function (id) {
    reqPendingRejectId = id;
    const r = reqData.find(x => x.id === id);
    document.getElementById('req-reject-subtitle').textContent = r ? `${r.name} — ${r.patient}` : '';
    document.getElementById('req-reject-reason').value = '';
    document.getElementById('req-reject-reason').style.borderColor = 'var(--border)';
    document.getElementById('req-reject-modal').classList.add('open');
  };
 
  window.reqCloseReject = function () {
    document.getElementById('req-reject-modal').classList.remove('open');
  };
 
  window.reqConfirmReject = async function () {
    const reason = document.getElementById('req-reject-reason').value.trim();
    if (!reason) {
      document.getElementById('req-reject-reason').style.borderColor = 'var(--crimson)';
      return;
    }
    const r = reqData.find(x => x.id === reqPendingRejectId);
    if (!r) return;
    const prevStatus = r.status;
    r.status          = 'REJECTED';
    r.rejectionReason = reason;
    reqCloseReject();
    reqExpanded[reqPendingRejectId] = true;
    reqRender();
 
    try {
      const res = await fetch(`${API_BASE}/admin/blood-requests/${reqPendingRejectId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: reason }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${res.status}`);
      }
    } catch (err) {
      console.error('[reqConfirmReject] failed', err);
      r.status          = prevStatus;
      r.rejectionReason = null;
      reqRender();
      alert(`Rejection failed: ${err.message}`);
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
           onerror="this.parentElement.innerHTML='<div style=padding:40px;text-align:center;color:var(--muted);font-size:13px>Preview unavailable — <a href=\\'${url}\\' target=\\'_blank\\' style=\\'color:var(--blue)\\'>open directly ↗</a></div>'" />`;
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
      r.component.toLowerCase().includes(q)
    );
    if (sort === 'date_desc')       list.sort((a, b) => b.id - a.id);
    else if (sort === 'date_asc')   list.sort((a, b) => a.id - b.id);
    else if (sort === 'urgency')    list.sort((a, b) => REQ_URGENCY_ORDER[a.urgency] - REQ_URGENCY_ORDER[b.urgency]);
    else if (sort === 'units_desc') list.sort((a, b) => b.units - a.units);
    return list;
  }
 
  window.reqFilterBy = function (status, btn) {
    reqCurrentFilter = status;
    document.querySelectorAll('#req-filters .req-filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    reqFetchByStatus(status);
  };
 
  function reqRenderFlow(status) {
    if (status === 'REJECTED') return `<div style="margin-bottom:16px"><span class="tag tag-rejected">Rejected</span></div>`;
    const idx = REQ_STATUSES.indexOf(status);
    let h = `<div class="req-status-flow">`;
    REQ_STATUSES.forEach((s, i) => {
      const cls = i < idx ? 'done' : i === idx ? 'active' : 'todo';
      h += `<div class="req-sf-step">
              <span class="req-sf-node ${cls}">${REQ_STATUS_LABEL[s]}</span>
              ${i < REQ_STATUSES.length - 1 ? '<span class="req-sf-arrow">›</span>' : ''}
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
               ✎ Change selection
             </button>`
          : ''}
      </div>
      <div class="req-bag-preview-list">
        ${req.allocatedBags.map(b => {
          const expDate  = b.expiresAt
            ? new Date(b.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            : b.expiresAt ?? '—';
          return `<div class="req-bag-preview-row" style="border-left:3px solid var(--green);padding-left:10px">
            <div class="req-bag-dot" style="background:var(--green);border-color:var(--green)"></div>
            <div style="flex:1;min-width:0">
              <span class="req-bag-id">${b.serialNumber ?? b.id}</span>
              <span class="req-bag-info" style="margin-left:8px">
                ${formatBloodType(b.bloodType) ?? '—'} · ${b.componentType ?? '—'} · ${b.volumeMl ?? '—'} mL · Exp ${expDate}
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
          🖨 Print Receipt
        </button>
      </div>`;
    }

    if (req.status === 'REJECTED') return '';
    const next = REQ_NEXT[req.status];
    if (!next) return '';
    let h = `<div class="req-action-bar">
      <button class="req-btn ${next.cls}" onclick="reqOpenConfirm(${req.id},'${next.endpoint}')">${next.label}</button>`;
    if (req.status === 'PENDING' || req.status === 'APPROVED') {
      h += `<button class="req-btn req-btn-reject" onclick="reqOpenReject(${req.id})">Reject</button>`;
    }
    return h + `</div>`;
  }
 
  function reqRenderCard(req) {
    const isExp    = !!reqExpanded[req.id];
    const urgColor = REQ_URGENCY_COLOR[req.urgency];
 
    if (isExp && ['PENDING', 'APPROVED'].includes(req.status)) {
      setTimeout(() => reqFetchCompatibleBags(req), 0);
    }
 
    return `<div class="req-card${isExp ? ' expanded' : ''}" id="req-card-${req.id}">
      <div class="req-head" onclick="reqToggle(${req.id})"
           style="display:flex;gap:0;padding:0;align-items:stretch">
        <div class="req-urgency-bar"
             style="background:${urgColor};margin-right:0;flex-shrink:0;border-radius:12px 0 0 ${isExp ? '0' : '12px'}"></div>
        <div style="flex:1;display:grid;grid-template-columns:1fr auto auto auto auto;align-items:center;gap:12px;padding:15px 18px">
          <div>
            <div class="req-name">${req.name}${req.type === 'ANONYMOUS'
              ? ` <span style="font-size:11px;font-weight:400;color:var(--muted)">(anonymous)</span>` : ''}</div>
            <div class="req-meta">
              <span>${req.patient}</span><span class="req-meta-dot"></span>
              <span>${req.component}</span><span class="req-meta-dot"></span>
              <span style="font-weight:600;color:var(--charcoal)">${req.units} unit${req.units > 1 ? 's' : ''}</span>
              <span class="req-meta-dot"></span><span>${req.date}</span>
            </div>
          </div>
          <span class="req-blood-badge">${req.bloodType}</span>
          <span class="tag ${REQ_URGENCY_TAG[req.urgency]}">${req.urgency[0] + req.urgency.slice(1).toLowerCase()}</span>
          <span class="tag ${REQ_STATUS_TAG[req.status]}">${REQ_STATUS_LABEL[req.status]}</span>
          <span class="req-chevron${isExp ? ' open' : ''}">›</span>
        </div>
      </div>
 
      <div class="req-detail${isExp ? ' open' : ''}" id="req-detail-${req.id}">
        ${reqRenderFlow(req.status)}
 
        <div class="req-detail-grid">
          <div class="req-detail-box" onclick="window.openReqDetailsModal(${req.id})" 
               style="cursor:pointer;transition:all 0.2s ease"
               onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'"
               onmouseout="this.style.boxShadow=''">
            <div class="req-detail-box-title">Patient info 👁️ <span style="font-size:10px;font-weight:400;color:var(--muted)">click to view</span></div>
            <div class="req-detail-row"><span class="lbl">Name</span><span class="val">${req.patient}</span></div>
            <div class="req-detail-row"><span class="lbl">Blood type</span><span class="val">${req.bloodType}</span></div>
            <div class="req-detail-row"><span class="lbl">Component</span><span class="val">${req.component}</span></div>
            <div class="req-detail-row"><span class="lbl">Units needed</span><span class="val">${req.units}</span></div>
          </div>
          <div class="req-detail-box" onclick="window.openReqDetailsModal(${req.id})" 
               style="cursor:pointer;transition:all 0.2s ease"
               onmouseover="this.style.boxShadow='0 4px 12px rgba(0,0,0,0.08)'"
               onmouseout="this.style.boxShadow=''">
            <div class="req-detail-box-title">Requester info 👁️ <span style="font-size:10px;font-weight:400;color:var(--muted)">click to view</span></div>
            <div class="req-detail-row"><span class="lbl">From</span><span class="val">${req.name}</span></div>
            <div class="req-detail-row"><span class="lbl">Type</span><span class="val">${req.type[0] + req.type.slice(1).toLowerCase()}</span></div>
            <div class="req-detail-row"><span class="lbl">Urgency</span><span class="val">${req.urgency[0] + req.urgency.slice(1).toLowerCase()}</span></div>
            <div class="req-detail-row"><span class="lbl">Submitted</span><span class="val">${req.date}</span></div>
          </div>
        </div>
 
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
            <div style="font-size:11px;color:var(--muted);margin-top:2px">Tap to preview · stored in Cloudinary</div>
          </div>
          <span style="font-size:12px;color:var(--blue);font-weight:600;flex-shrink:0">View ↗</span>
        </div>
 
        ${req.status === 'REJECTED' && req.rejectionReason
          ? `<div class="req-detail-box" style="margin-bottom:12px;border-left:3px solid var(--crimson)">
              <div class="req-detail-box-title" style="color:var(--crimson)">Rejection reason</div>
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
      : `<div class="req-empty"><div style="font-size:32px;margin-bottom:10px;opacity:0.35">📋</div>No requests match the current filters.</div>`;
    if (info) info.textContent = `Showing ${filtered.length} of ${reqData.length} request${reqData.length !== 1 ? 's' : ''}`;
    reqUpdateCounts();
  }
 
  function reqUpdateCounts() {
    const allEl  = document.getElementById('req-cnt-all');
    const pendEl = document.getElementById('req-cnt-pending');
    if (allEl)  allEl.textContent  = reqData.length;
    if (pendEl) pendEl.textContent = reqData.filter(r => r.status === 'PENDING').length;
  }
 
  window.reqToggle = id => { reqExpanded[id] = !reqExpanded[id]; reqRender(); };
  window.reqRender = reqRender;

  // ─────────────────────────────────────────────────────────────────
  // EXPORT TO WINDOW SCOPE (for auto-refresh)
  // ─────────────────────────────────────────────────────────────────
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
        if (req && ['PENDING', 'APPROVED'].includes(req.status)) {
          setTimeout(() => reqFetchCompatibleBags(req), 0);
        }
      }
    });
  };
 
  ['req-reject-modal', 'req-doc-modal', 'req-confirm-modal', 'req-bag-picker-modal'].forEach(modalId => {
    const el = document.getElementById(modalId);
    if (!el) return;
    el.addEventListener('click', e => {
      if (e.target !== e.currentTarget) return;
      if (modalId === 'req-reject-modal')      reqCloseReject();
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
    
    title.textContent = `Request #${req.id} — ${req.name}`;
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
    const indicationBadges = getIndicationBadges(req.indication);
    const indicationDetailsHtml = renderIndicationDetails(req.indication);

    return `
      <div class="req-details-sections">
        
        <div class="req-details-section">
          <div class="req-details-section-title">Request Status</div>
          <div class="req-details-grid-2">
            <div class="req-details-field">
              <span class="req-details-label">Reference #</span>
              <span class="req-details-value">${req.id ?? '—'}</span>
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
                <span class="tag ${REQ_URGENCY_TAG[req.urgency] ?? ''}">${req.urgency ?? '—'}</span>
              </span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Request Type</span>
              <span class="req-details-value">${req.requestType ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Submitted</span>
              <span class="req-details-value">${req.date ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Required By</span>
              <span class="req-details-value">${req.requiredBy ?? '—'}</span>
            </div>
          </div>
        </div>

        <div class="req-details-section">
          <div class="req-details-section-title">Patient Information</div>
          <div class="req-details-grid-2">
            <div class="req-details-field">
              <span class="req-details-label">Patient Name</span>
              <span class="req-details-value">${req.patientName ?? req.patient ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Age / Age Group</span>
              <span class="req-details-value">${req.patientAge ?? '—'} ${req.ageGroup ? `(${req.ageGroup})` : ''}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Sex</span>
              <span class="req-details-value">${req.patientSex ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Ward / Room</span>
              <span class="req-details-value">${req.wardRoom ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Category</span>
              <span class="req-details-value">${req.requestCategory ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Requesting Physician</span>
              <span class="req-details-value">${req.requestingPhysician ?? '—'}</span>
            </div>
          </div>
        </div>

        <div class="req-details-section">
          <div class="req-details-section-title">Blood Requirements</div>
          <div class="req-details-grid-2">
            <div class="req-details-field">
              <span class="req-details-label">Blood Type</span>
              <span class="req-details-value req-details-highlight">${req.bloodType ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Component</span>
              <span class="req-details-value">${req.component ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Units Needed</span>
              <span class="req-details-value req-details-highlight">${req.units ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Volume (mL)</span>
              <span class="req-details-value">${req.volumeMl ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Notes</span>
              <span class="req-details-value">${req.notes ?? '—'}</span>
            </div>
          </div>
        </div>

        <div class="req-details-section">
          <div class="req-details-section-title">Transfusion Indications</div>
          ${indicationCodes.length > 0 ? `
            <div style="margin-bottom:12px">
              <div class="req-indication-badges">
                ${indicationBadges}
              </div>
            </div>
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
              <span class="req-details-value">${req.clinicalImpression ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Attending Physician</span>
              <span class="req-details-value">${req.attendingPhysician ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Contact Number</span>
              <span class="req-details-value">${req.contactNumber ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Hemoglobin (g/L)</span>
              <span class="req-details-value">${req.hemoglobin ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Hematocrit (%)</span>
              <span class="req-details-value">${req.hematocrit ? (req.hematocrit * 100).toFixed(1) : '—'}</span>
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
                <span class="req-details-value">${req.previousTransfusionDate ?? '—'}</span>
              </div>
              <div class="req-details-field">
                <span class="req-details-label">Units Transfused</span>
                <span class="req-details-value">${req.previousTransfusionUnits ?? '—'}</span>
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
                <span class="req-details-value">${req.previousReactionDate ?? '—'}</span>
              </div>
              <div class="req-details-field">
                <span class="req-details-label">Reaction Details</span>
                <span class="req-details-value">${req.previousReactionDetails ?? '—'}</span>
              </div>
            ` : ''}
          </div>
        </div>

        <div class="req-details-section">
          <div class="req-details-section-title">Requester Information</div>
          <div class="req-details-grid-2">
            <div class="req-details-field">
              <span class="req-details-label">Requester Name</span>
              <span class="req-details-value">${req.requesterName ?? req.name ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Relationship</span>
              <span class="req-details-value">${req.requesterRelationship ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Contact</span>
              <span class="req-details-value">${req.requesterContact ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Email</span>
              <span class="req-details-value">${req.requesterEmail ?? '—'}</span>
            </div>
            <div class="req-details-field">
              <span class="req-details-label">Requester Type</span>
              <span class="req-details-value">${req.type ?? '—'}</span>
            </div>
          </div>
        </div>

        ${req.status === 'REJECTED' && req.rejectionReason ? `
          <div class="req-details-section req-details-section-rejected">
            <div class="req-details-section-title" style="color: var(--crimson)">Rejection Reason</div>
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

/* ══════════════════════════════════════════════════════════════
   API HELPERS
══════════════════════════════════════════════════════════════ */

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

/* ══════════════════════════════════════════════════════════════
   HELPERS  (unchanged from original)
══════════════════════════════════════════════════════════════ */

function staffFmtDate(iso) {
  if (!iso) return '—';
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
  if (!sel || !datalist) return;
  const current = sel.value;
  while (sel.options.length > 1) sel.remove(1);
  datalist.innerHTML = '';
  staffGetDepts().forEach(d => {
    const opt = document.createElement('option');
    opt.value = d; opt.textContent = d;
    sel.appendChild(opt.cloneNode(true));
    datalist.appendChild(opt);
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

/* ══════════════════════════════════════════════════════════════
   SUMMARY STRIP
══════════════════════════════════════════════════════════════ */

function staffUpdateStrip() {
  const active   = staffList.filter(s => s.status === 'active').length;
  const inactive = staffList.filter(s => s.status === 'inactive').length;
  const depts    = staffGetDepts().length;
  document.getElementById('staff-active-count').textContent   = active;
  document.getElementById('staff-inactive-count').textContent = inactive;
  document.getElementById('staff-total-count').textContent    = staffList.length;
}

/* ══════════════════════════════════════════════════════════════
   RENDER TABLE  (unchanged logic, data now from API)
══════════════════════════════════════════════════════════════ */

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
    const matchS = status === 'ALL' || s.status === status;
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
    showing.textContent  = `Showing ${start + 1}–${Math.min(start + STAFF_PER_PAGE, total)} of ${total}`;
    if (info) info.textContent = `${total} staff found`;
  }

  tbody.innerHTML = slice.map(s => {
    const initials  = staffInitials(s.firstName, s.lastName);
    const isActive  = s.status === 'active';
    const statusTag = isActive
      ? `<span class="tag tag-active">Active</span>`
      : `<span class="tag tag-inactive">Inactive</span>`;

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
        <td style="font-family:monospace;font-size:12px">${escHtml(s.staffId || '—')}</td>
        <td style="font-size:12px">${escHtml(s.department || '—')}</td>
        <td style="font-size:12px">${escHtml(s.position || '—')}</td>
        <td style="font-size:12px;color:var(--muted)">${escHtml(s.phoneNumber || '—')}</td>
        <td style="font-size:12px">${staffFmtDate(s.hireDate)}</td>
        <td>${statusTag}</td>
        <td>
          <div style="display:flex;gap:6px;align-items:center">
            <button class="btn-ghost" style="font-size:12px;padding:5px 10px"
              onclick="staffOpenView(${s.id})">View</button>
            <button class="btn-ghost" style="font-size:12px;padding:5px 10px"
              onclick="staffOpenEdit(${s.id})">Edit</button>
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

/* ══════════════════════════════════════════════════════════════
   ADD STAFF  →  POST /api/admin/staff
══════════════════════════════════════════════════════════════ */

function openAddStaffModal() {
  ['add-staff-email','add-staff-first','add-staff-last',
   'add-staff-phone','add-staff-id','add-staff-dept','add-staff-position'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  const statusEl = document.getElementById('add-staff-status');
  if (statusEl) statusEl.value = 'active';
  const hireDateEl = document.getElementById('add-staff-hiredate');
  if (hireDateEl) hireDateEl.value = new Date().toISOString().split('T')[0];

  // Show the generated-password hint
  const hint = document.getElementById('add-staff-pass-hint');
  if (hint) hint.textContent = '';

  staffHideError('add-staff-error');
  staffPopulateDepts();
  openModal('addStaffModal');
}

// Preview the generated password as the admin types the name
function staffPreviewPassword() {
  const first = document.getElementById('add-staff-first')?.value.trim() || '';
  const last  = document.getElementById('add-staff-last')?.value.trim()  || '';
  const hint  = document.getElementById('add-staff-pass-hint');
  if (!hint) return;
  if (first && last) {
    const cap = s => s ? s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() : '';
    hint.textContent = `Generated password: ${cap(first)}${cap(last)}@1234`;
  } else {
    hint.textContent = '';
  }
}

async function submitAddStaff() {
  const email    = document.getElementById('add-staff-email').value.trim();
  const first    = document.getElementById('add-staff-first').value.trim();
  const last     = document.getElementById('add-staff-last').value.trim();
  const phone    = document.getElementById('add-staff-phone').value.trim();
  const hireDate = document.getElementById('add-staff-hiredate').value || null;
  const staffId  = document.getElementById('add-staff-id').value.trim();
  const dept     = "Blood bank";
  const position = document.getElementById('add-staff-position').value.trim();
  const status   = document.getElementById('add-staff-status').value;

  if (!email || !first || !last) {
    staffShowError('add-staff-error', 'Email, first name, and last name are required.');
    return;
  }
  if (!staffValidEmail(email)) {
    staffShowError('add-staff-error', 'Please enter a valid email address.');
    return;
  }

  const btn = document.getElementById('add-staff-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Creating…'; }

  try {
    const created = await staffApiFetch('', {
      method: 'POST',
      body: JSON.stringify({ email, firstName: first, lastName: last, phoneNumber: phone,
                             hireDate: hireDate || null, staffId: staffId || null,
                             department: dept, position, status }),
    });

    staffList.unshift(created);   // optimistic: prepend to local list
    closeModal('addStaffModal');
    staffRender();
    staffShowToast(`Staff account created for ${first} ${last}. Credentials emailed.`, 'success');
  } catch (err) {
    staffShowError('add-staff-error', err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Create Account'; }
  }
}

/* ══════════════════════════════════════════════════════════════
   VIEW STAFF  (read-only modal — no API call needed)
══════════════════════════════════════════════════════════════ */

function staffOpenView(id) {
  const s = staffList.find(x => x.id === id);
  if (!s) return;
  staffCurrentViewId = id;

  document.getElementById('view-staff-id-label').textContent       = s.staffId || '';
  document.getElementById('view-staff-avatar').textContent         = staffInitials(s.firstName, s.lastName);
  document.getElementById('view-staff-name').textContent           = `${s.firstName} ${s.lastName}`;
  document.getElementById('view-staff-position-label').textContent =
    [s.position, s.department].filter(Boolean).join(' · ') || '—';
  document.getElementById('view-staff-staffid').textContent  = s.staffId     || '—';
  document.getElementById('view-staff-dept').textContent     = s.department  || '—';
  document.getElementById('view-staff-phone').textContent    = s.phoneNumber || '—';
  document.getElementById('view-staff-hiredate').textContent = staffFmtDate(s.hireDate);
  document.getElementById('view-staff-email').textContent    = s.email;
  document.getElementById('view-staff-created').textContent  = staffFmtDate(s.createdAt);

  const badge = document.getElementById('view-staff-status-badge');
  badge.innerHTML = s.status === 'active'
    ? `<span class="tag tag-active">Active</span>`
    : `<span class="tag tag-inactive">Inactive</span>`;

  openModal('viewStaffModal');
}

function staffOpenEditFromView() {
  closeModal('viewStaffModal');
  staffOpenEdit(staffCurrentViewId);
}

/* ══════════════════════════════════════════════════════════════
   EDIT STAFF  →  PUT /api/admin/staff/{id}
══════════════════════════════════════════════════════════════ */

function staffOpenEdit(id) {
  const s = staffList.find(x => x.id === id);
  if (!s) return;
  staffCurrentViewId = id;

  document.getElementById('edit-staff-subtitle').textContent = s.staffId || s.email;
  document.getElementById('edit-staff-first').value          = s.firstName;
  document.getElementById('edit-staff-last').value           = s.lastName;
  document.getElementById('edit-staff-phone').value          = s.phoneNumber || '';
  document.getElementById('edit-staff-hiredate').value       = s.hireDate    || '';
  document.getElementById('edit-staff-id').value             = s.staffId     || '';
  document.getElementById('edit-staff-dept').value           = s.department  || '';
  document.getElementById('edit-staff-position').value       = s.position    || '';
  document.getElementById('edit-staff-status').value         = s.status;
  document.getElementById('edit-staff-password').value       = '';
  document.getElementById('edit-staff-target-id').value      = id;

  staffHideError('edit-staff-error');
  staffPopulateDepts();
  openModal('editStaffModal');
}

async function submitEditStaff() {
  const id       = parseInt(document.getElementById('edit-staff-target-id').value);
  const first    = document.getElementById('edit-staff-first').value.trim();
  const last     = document.getElementById('edit-staff-last').value.trim();
  const phone    = document.getElementById('edit-staff-phone').value.trim();
  const hireDate = document.getElementById('edit-staff-hiredate').value || null;
  const staffId  = document.getElementById('edit-staff-id').value.trim();
  const dept     = document.getElementById('edit-staff-dept').value.trim();
  const position = document.getElementById('edit-staff-position').value.trim();
  const status   = document.getElementById('edit-staff-status').value;
  const password = document.getElementById('edit-staff-password').value;

  if (!first || !last) {
    staffShowError('edit-staff-error', 'First name and last name are required.');
    return;
  }
  if (password && password.length < 6) {
    staffShowError('edit-staff-error', 'New password must be at least 6 characters.');
    return;
  }

  const btn = document.getElementById('edit-staff-submit-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Saving…'; }

  try {
    const updated = await staffApiFetch(`/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ firstName: first, lastName: last, phoneNumber: phone,
                             hireDate: hireDate || null, staffId: staffId || null,
                             department: dept, position, status,
                             newPassword: password || null }),
    });

    // Replace local copy
    const idx = staffList.findIndex(s => s.id === id);
    if (idx !== -1) staffList[idx] = updated;

    closeModal('editStaffModal');
    staffRender();
    staffShowToast(`${first} ${last}'s profile updated.`, 'success');
  } catch (err) {
    staffShowError('edit-staff-error', err.message);
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Save Changes'; }
  }
}

/* ══════════════════════════════════════════════════════════════
   DELETE STAFF  →  DELETE /api/admin/staff/{id}
══════════════════════════════════════════════════════════════ */

function staffOpenDelete(id) {
  const s = staffList.find(x => x.id === id);
  if (!s) return;
  staffCurrentViewId = id;
  document.getElementById('delete-staff-name-label').textContent =
    `${s.firstName} ${s.lastName} (${s.staffId || s.email})`;
  openModal('deleteStaffModal');
}

function staffOpenDeleteConfirm() {
  closeModal('viewStaffModal');
  staffOpenDelete(staffCurrentViewId);
}

async function staffConfirmDelete() {
  const id  = staffCurrentViewId;
  const s   = staffList.find(x => x.id === id);
  const name = s ? `${s.firstName} ${s.lastName}` : 'Staff member';

  const btn = document.getElementById('delete-staff-confirm-btn');
  if (btn) { btn.disabled = true; btn.textContent = 'Deleting…'; }

  try {
    await staffApiFetch(`/${id}`, { method: 'DELETE' });
    staffList = staffList.filter(x => x.id !== id);
    closeModal('deleteStaffModal');
    staffRender();
    staffShowToast(`${name}'s account has been deleted.`, 'danger');
  } catch (err) {
    staffShowToast(`Delete failed: ${err.message}`, 'danger');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Yes, Delete'; }
  }
}

/* ══════════════════════════════════════════════════════════════
   TOGGLE STATUS  →  PATCH /api/admin/staff/{id}/toggle-status
══════════════════════════════════════════════════════════════ */

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

/* ══════════════════════════════════════════════════════════════
   TOAST  (unchanged)
══════════════════════════════════════════════════════════════ */

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

/* ══════════════════════════════════════════════════════════════
   ERROR HELPERS  (unchanged)
══════════════════════════════════════════════════════════════ */

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

/* ══════════════════════════════════════════════════════════════
   INIT  — fetch from API instead of using mock array
══════════════════════════════════════════════════════════════ */

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

// ──────────────────────────────────────────────────────────────
// FILTER & SORT
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
// RENDER TABLE
// ──────────────────────────────────────────────────────────────
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
            <td style="font-size:12px;color:var(--muted)">${h.phoneNumber || '—'}</td>
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
        showingEl.textContent = total ? `Showing ${start}–${end} of ${total}` : 'No results';
    }
    
    const pageEl = document.getElementById('hosp-page-label');
    if (pageEl) pageEl.textContent = `Page ${hospPage} / ${pages}`;
    
    const prevBtn = document.getElementById('hosp-prev');
    if (prevBtn) prevBtn.disabled = hospPage <= 1;
    
    const nextBtn = document.getElementById('hosp-next');
    if (nextBtn) nextBtn.disabled = hospPage >= pages;
    
    hospUpdateStats();
}

// ──────────────────────────────────────────────────────────────
// UPDATE STATS
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
// PAGINATION
// ──────────────────────────────────────────────────────────────
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



// ──────────────────────────────────────────────────────────────
// CREATE HOSPITAL — Submit form
// ──────────────────────────────────────────────────────────────
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
        hospRender();
        
        // Clear form
        ['hosp-add-email','hosp-add-name','hosp-add-address','hosp-add-city','hosp-add-province',
         'hosp-add-phone','hosp-add-contact-name','hosp-add-contact-phone','hosp-add-status'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        
        closeModal('addHospitalModal');
        alert('Hospital account created! Credentials sent to their email.');
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

// ──────────────────────────────────────────────────────────────
// EDIT HOSPITAL — Open modal with data
// ──────────────────────────────────────────────────────────────
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

// ──────────────────────────────────────────────────────────────
// EDIT HOSPITAL — Save changes
// ──────────────────────────────────────────────────────────────
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
        
        hospRender();
        closeModal('editHospitalModal');
        alert('Hospital updated successfully!');
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

// ──────────────────────────────────────────────────────────────
// DELETE HOSPITAL
// ──────────────────────────────────────────────────────────────
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
        hospRender();
        closeModal('editHospitalModal');
        alert('Hospital deleted successfully!');
    } catch (err) {
        alert('Error: ' + err.message);
        console.error('[Hospital] Delete error:', err);
    }
}

// ──────────────────────────────────────────────────────────────
// CONFIRM DELETE (from table row)
// ──────────────────────────────────────────────────────────────
function hospConfirmDelete(id) {
    const h = hospData.find(x => x.id === id);
    if (!h) {
        alert('Hospital not found');
        return;
    }

    if (!confirm(`Delete "${h.hospitalName}"? This cannot be undone.`)) {
        return;
    }

    hospDelete(id); // ✅ PASS ID HERE
}



// ══════════════════════════════════════════════════════════════
// STAFF PROFILE FUNCTIONS
// ══════════════════════════════════════════════════════════════
// ── GLOBAL STATE ──
let currentUserRole = 'STAFF'; // Set from backend
let currentUserId = null;
let currentUserData = {};
let activePanel = 'dashboard';
let reqData          = [];
 
// ── INITIALIZATION ──
document.addEventListener('DOMContentLoaded', () => {
  loadCurrentUserProfile();
  initializeProfileListeners();
});
 
// ── LOAD CURRENT USER PROFILE ──
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
 
// ══════════════════════════════════════════════════════════════
// ADMIN PROFILE FUNCTIONS
// ══════════════════════════════════════════════════════════════

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


// ══════════════════════════════════════════════════════════════
// STAFF PROFILE FUNCTIONS
// ══════════════════════════════════════════════════════════════

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


// ══════════════════════════════════════════════════════════════
// PASSWORD MANAGEMENT (BOTH ADMIN AND STAFF)
// ══════════════════════════════════════════════════════════════

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


// ══════════════════════════════════════════════════════════════
// PROFILE TAB SWITCHING
// ══════════════════════════════════════════════════════════════

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


// ══════════════════════════════════════════════════════════════
// PANEL SWITCHING
// ══════════════════════════════════════════════════════════════

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


// ══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ══════════════════════════════════════════════════════════════

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}
 
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'long', day: 'numeric' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}


// ══════════════════════════════════════════════════════════════
// ERROR & SUCCESS MESSAGE HANDLERS
// ══════════════════════════════════════════════════════════════

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



// ══════════════════════════════════════════════════════════════
// EVENT LISTENERS INITIALIZATION
// ══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════

const API_BASE_URL = '/api/admin/logs'; // Change to your backend URL if different

// ═══════════════════════════════════════════════════════════════
// STATE MANAGEMENT
// ═══════════════════════════════════════════════════════════════

const loggingState = {
  statusLogs: [],
  fulfillments: [],
  statusLogsPage: 1,
  fulfillmentsPage: 1,
  itemsPerPage: 10,
  currentTab: 'status-logs',
  loading: false
};

// ═══════════════════════════════════════════════════════════════
// INITIALIZATION & LOADING
// ═══════════════════════════════════════════════════════════════

function initializeLoggingPanel() {
  
  
  // Check if elements exist
  const requiredElements = [
    'logging-fulfillments-count',
    'logging-status-changes-count',
    'logging-pending-requests-count',
    'logging-released-count',
    'logging-status-tbody',
    'logging-fulfillment-tbody'
  ];
  
  const missingElements = requiredElements.filter(id => !document.getElementById(id));
  
  if (missingElements.length > 0) {
    console.error('❌ Missing HTML elements:', missingElements);
    return;
  }
  
  // Load data from API
  loadLoggingData();
}

function loadLoggingData() {
  loggingState.loading = true;
  
  // Load summary
  loadSummary();
  
  // Load initial status logs
  loggingStatusRender();
}

// ═══════════════════════════════════════════════════════════════
// SUMMARY STATS - API CALL
// ═══════════════════════════════════════════════════════════════

function loadSummary() {
  fetch(`${API_BASE_URL}/summary`)
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      loggingUpdateSummary(data);
    })
    .catch(error => {
      console.error('Error loading summary:', error);
    });
}

function loggingUpdateSummary(summaryData) {
  try {
    const fulfillmentsEl = document.getElementById('logging-fulfillments-count');
    if (fulfillmentsEl) {
      fulfillmentsEl.textContent = summaryData.totalFulfillments || 0;
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

// ═══════════════════════════════════════════════════════════════
// TAB SWITCHING
// ═══════════════════════════════════════════════════════════════

function switchLoggingTab(tabName, element) {
  
  // Hide all tabs
  document.querySelectorAll('.logging-tab-content').forEach(tab => {
    tab.style.display = 'none';
  });

  // Remove active class from all buttons
  document.querySelectorAll('.logging-tab-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected tab
  const tabElement = document.getElementById(`logging-${tabName}-tab`);
  if (tabElement) {
    tabElement.style.display = 'block';
  } else {
    console.error('Tab not found:', `logging-${tabName}-tab`);
  }
  
  element.classList.add('active');
  loggingState.currentTab = tabName;

  // Render appropriate data
  if (tabName === 'status-logs') {
    loggingStatusRender();
  } else {
    loggingFulfillmentRender();
  }
}

// ═══════════════════════════════════════════════════════════════
// STATUS LOGS — API INTEGRATION
// ═══════════════════════════════════════════════════════════════

function loggingStatusRender() {
  try {
    const searchEl = document.getElementById('logging-status-search');
    const statusFilterEl = document.getElementById('logging-status-filter-status');
    const sortEl = document.getElementById('logging-status-sort');

    const search = searchEl ? searchEl.value : '';
    const statusFilter = statusFilterEl ? statusFilterEl.value : 'ALL';
    const sort = sortEl ? sortEl.value : 'date_desc';
    const page = loggingState.statusLogsPage;
    const size = loggingState.itemsPerPage;

    // Build query string
    let queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
    queryParams.append('sort', sort);
    queryParams.append('page', page);
    queryParams.append('size', size);

    const url = `${API_BASE_URL}/status-logs?${queryParams.toString()}`;

    showLoadingInTable('logging-status-tbody', 'status');

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        renderStatusLogsTable(data);
      })
      .catch(error => {
        console.error('Error fetching status logs:', error);
        showErrorInTable('logging-status-tbody', 'Failed to load status logs');
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
      console.error('❌ logging-status-tbody element not found');
      return;
    }

    tbody.innerHTML = '';

    if (!response.data || response.data.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    response.data.forEach(log => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>#${log.request?.id || 'N/A'}</strong></td>
        <td>${log.request?.referenceNumber || '—'}</td>
        <td><span class="status-badge" style="background:#E8F0FF;color:#0066CC">${log.oldStatus || '—'}</span></td>
        <td><span class="status-badge" style="background:#E8F5E9;color:#22863A">${log.newStatus}</span></td>
        <td>${log.changedBy?.username || 'System'}</td>
        <td>${formatDateTime(log.changedAt)}</td>
        <td style="max-width:200px;white-space:normal;word-break:break-word;font-size:12px">${log.notes || '—'}</td>
        <td>
          <button class="btn-ghost" onclick="viewStatusLogDetail(${log.id})" style="padding:4px 8px;font-size:11px">View</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    // Update pagination
    updatePaginationControls('status', response.currentPage, response.totalPages, response.totalElements);

  } catch (error) {
    console.error('Error rendering status logs table:', error);
  }
}

function loggingStatusPrevPage() {
  if (loggingState.statusLogsPage > 1) {
    loggingState.statusLogsPage--;
    loggingStatusRender();
  }
}

function loggingStatusNextPage() {
  const searchEl = document.getElementById('logging-status-search');
  const statusFilterEl = document.getElementById('logging-status-filter-status');
  const sortEl = document.getElementById('logging-status-sort');

  const search = searchEl ? searchEl.value : '';
  const statusFilter = statusFilterEl ? statusFilterEl.value : 'ALL';
  const sort = sortEl ? sortEl.value : 'date_desc';
  const page = loggingState.statusLogsPage + 1;
  const size = loggingState.itemsPerPage;

  let queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);
  if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);
  queryParams.append('sort', sort);
  queryParams.append('page', page);
  queryParams.append('size', size);

  fetch(`${API_BASE_URL}/status-logs?${queryParams.toString()}`)
    .then(response => response.json())
    .then(data => {
      if (data.data && data.data.length > 0) {
        loggingState.statusLogsPage++;
        renderStatusLogsTable(data);
      }
    })
    .catch(error => console.error('Error:', error));
}

// ═══════════════════════════════════════════════════════════════
// FULFILLMENTS — API INTEGRATION
// ═══════════════════════════════════════════════════════════════

function loggingFulfillmentRender() {
  try {
    const searchEl = document.getElementById('logging-fulfillment-search');
    const dateFromEl = document.getElementById('logging-fulfillment-date-from');
    const dateToEl = document.getElementById('logging-fulfillment-date-to');
    const sortEl = document.getElementById('logging-fulfillment-sort');

    const search = searchEl ? searchEl.value : '';
    const dateFrom = dateFromEl ? dateFromEl.value : '';
    const dateTo = dateToEl ? dateToEl.value : '';
    const sort = sortEl ? sortEl.value : 'date_desc';
    const page = loggingState.fulfillmentsPage;
    const size = loggingState.itemsPerPage;

    // Build query string
    let queryParams = new URLSearchParams();
    if (search) queryParams.append('search', search);
    if (dateFrom) queryParams.append('dateFrom', dateFrom);
    if (dateTo) queryParams.append('dateTo', dateTo);
    queryParams.append('sort', sort);
    queryParams.append('page', page);
    queryParams.append('size', size);

    const url = `${API_BASE_URL}/fulfillments?${queryParams.toString()}`;

    showLoadingInTable('logging-fulfillment-tbody', 'fulfillment');

    fetch(url)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        renderFulfillmentsTable(data);
      })
      .catch(error => {
        console.error('Error fetching fulfillments:', error);
        showErrorInTable('logging-fulfillment-tbody', 'Failed to load fulfillments');
      });
  } catch (error) {
    console.error('Error in loggingFulfillmentRender:', error);
  }
}

function renderFulfillmentsTable(response) {
  try {
    const tbody = document.getElementById('logging-fulfillment-tbody');
    const empty = document.getElementById('logging-fulfillment-empty');

    if (!tbody) {
      console.error('❌ logging-fulfillment-tbody element not found');
      return;
    }

    tbody.innerHTML = '';

    if (!response.data || response.data.length === 0) {
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    response.data.forEach(fulfillment => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td><strong>#${fulfillment.request?.id || 'N/A'}</strong></td>
        <td><strong>${fulfillment.bloodBag?.serialNumber || 'N/A'}</strong></td>
        <td>${fulfillment.bloodBag?.bloodType || '—'}</td>
        <td>${fulfillment.bloodBag?.componentType || '—'}</td>
        <td>${fulfillment.fulfilledBy?.username || 'System'}</td>
        <td>${formatDateTime(fulfillment.fulfilledAt)}</td>
        <td style="max-width:200px;white-space:normal;word-break:break-word;font-size:12px">${fulfillment.notes || '—'}</td>
        <td>
          <button class="btn-ghost" onclick="viewFulfillmentDetail(${fulfillment.id})" style="padding:4px 8px;font-size:11px">View</button>
        </td>
      `;
      tbody.appendChild(row);
    });

    // Update pagination
    updatePaginationControls('fulfillment', response.currentPage, response.totalPages, response.totalElements);

  } catch (error) {
    console.error('Error rendering fulfillments table:', error);
  }
}

function loggingFulfillmentPrevPage() {
  if (loggingState.fulfillmentsPage > 1) {
    loggingState.fulfillmentsPage--;
    loggingFulfillmentRender();
  }
}

function loggingFulfillmentNextPage() {
  const searchEl = document.getElementById('logging-fulfillment-search');
  const dateFromEl = document.getElementById('logging-fulfillment-date-from');
  const dateToEl = document.getElementById('logging-fulfillment-date-to');
  const sortEl = document.getElementById('logging-fulfillment-sort');

  const search = searchEl ? searchEl.value : '';
  const dateFrom = dateFromEl ? dateFromEl.value : '';
  const dateTo = dateToEl ? dateToEl.value : '';
  const sort = sortEl ? sortEl.value : 'date_desc';
  const page = loggingState.fulfillmentsPage + 1;
  const size = loggingState.itemsPerPage;

  let queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);
  if (dateFrom) queryParams.append('dateFrom', dateFrom);
  if (dateTo) queryParams.append('dateTo', dateTo);
  queryParams.append('sort', sort);
  queryParams.append('page', page);
  queryParams.append('size', size);

  fetch(`${API_BASE_URL}/fulfillments?${queryParams.toString()}`)
    .then(response => response.json())
    .then(data => {
      if (data.data && data.data.length > 0) {
        loggingState.fulfillmentsPage++;
        renderFulfillmentsTable(data);
      }
    })
    .catch(error => console.error('Error:', error));
}

// ═══════════════════════════════════════════════════════════════
// STATUS LOG DETAIL VIEW — MODAL
// ═══════════════════════════════════════════════════════════════

function viewStatusLogDetail(logId) {
  fetch(`${API_BASE_URL}/status-logs/${logId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch status log detail');
      }
      return response.json();
    })
    .then(log => {
      populateLoggingStatusModal(log);
    })
    .catch(error => {
      console.error('Error fetching status log detail:', error);
      alert('Failed to load status log details');
    });
}

/**
 * Populate the status log modal with data
 * @param {Object} log - The status log data from the API
 */
function populateLoggingStatusModal(log) {
  try {
    document.getElementById('logging-status-modal-request-id').textContent = `#${log.request?.id || 'N/A'}`;
    document.getElementById('logging-status-modal-ref-num').textContent = log.request?.referenceNumber || '—';
    document.getElementById('logging-status-modal-old-status').textContent = log.oldStatus || '—';
    document.getElementById('logging-status-modal-new-status').textContent = log.newStatus || '—';
    document.getElementById('logging-status-modal-changed-by').textContent = log.changedBy?.fullName || 'System';
    document.getElementById('logging-status-modal-changed-at').textContent = formatDateTime(log.changedAt);
    document.getElementById('logging-status-modal-notes').textContent = log.notes || '—';

    // Show the modal
    document.getElementById('logging-status-modal').style.display = 'flex';
  } catch (error) {
    console.error('Error populating status log modal:', error);
  }
}

/**
 * Close the status log modal
 */
function closeLoggingStatusModal() {
  const modal = document.getElementById('logging-status-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════════
// FULFILLMENT DETAIL VIEW — MODAL
// ═══════════════════════════════════════════════════════════════

function viewFulfillmentDetail(fulfillmentId) {
  fetch(`${API_BASE_URL}/fulfillments/${fulfillmentId}`)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to fetch fulfillment detail');
      }
      return response.json();
    })
    .then(fulfillment => {
      populateLoggingFulfillmentModal(fulfillment);
    })
    .catch(error => {
      console.error('Error fetching fulfillment detail:', error);
      alert('Failed to load fulfillment details');
    });
}

/**
 * Populate the fulfillment modal with data
 * @param {Object} fulfillment - The fulfillment data from the API
 */
function populateLoggingFulfillmentModal(fulfillment) {
  try {
    document.getElementById('logging-fulfillment-modal-request-id').textContent = `#${fulfillment.request?.id || 'N/A'}`;
    document.getElementById('logging-fulfillment-modal-blood-bag-num').textContent = fulfillment.bloodBag?.serialNumber || 'N/A';
    document.getElementById('logging-fulfillment-modal-blood-type').textContent = fulfillment.bloodBag?.bloodType || '—';
    document.getElementById('logging-fulfillment-modal-component').textContent = fulfillment.bloodBag?.componentType || '—';
    document.getElementById('logging-fulfillment-modal-fulfilled-by').textContent = fulfillment.fulfilledBy?.username || 'System';
    document.getElementById('logging-fulfillment-modal-fulfilled-at').textContent = formatDateTime(fulfillment.fulfilledAt);
    document.getElementById('logging-fulfillment-modal-notes').textContent = fulfillment.notes || '—';

    // Show the modal
    document.getElementById('logging-fulfillment-modal').style.display = 'flex';
  } catch (error) {
    console.error('Error populating fulfillment modal:', error);
  }
}

/**
 * Close the fulfillment modal
 */
function closeLoggingFulfillmentModal() {
  const modal = document.getElementById('logging-fulfillment-modal');
  if (modal) {
    modal.style.display = 'none';
  }
}

// ═══════════════════════════════════════════════════════════════
// EXPORT — API INTEGRATION
// ═══════════════════════════════════════════════════════════════

function exportStatusLogsExcel() {
  const searchEl = document.getElementById('logging-status-search');
  const statusFilterEl = document.getElementById('logging-status-filter-status');

  const search = searchEl ? searchEl.value : '';
  const statusFilter = statusFilterEl ? statusFilterEl.value : 'ALL';

  let queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);
  if (statusFilter !== 'ALL') queryParams.append('status', statusFilter);

  const url = `${API_BASE_URL}/export/status-logs?${queryParams.toString()}`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      return response.json();
    })
    .then(data => {
      if (!data || data.length === 0) {
        alert('No status log data to export.');
        return;
      }

      const rows = data.map(log => ({
        'Request ID': log.request?.id || '',
        'Reference #': log.request?.referenceNumber || '',
        'Old Status': log.oldStatus || '',
        'New Status': log.newStatus || '',
        'Changed By': log.changedBy?.username || 'System',
        'Changed At': formatExcelDate(log.changedAt),
        'Notes': log.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 12 },
        { wch: 18 },
        { wch: 18 },
        { wch: 22 },
        { wch: 20 },
        { wch: 22 },
        { wch: 40 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Status Logs');
      XLSX.writeFile(wb, `status-logs-${today()}.xlsx`);
    })
    .catch(error => {
      console.error('Error exporting status logs:', error);
      alert('Failed to export status logs');
    });
}

function exportFulfillmentsExcel() {
  const searchEl = document.getElementById('logging-fulfillment-search');
  const dateFromEl = document.getElementById('logging-fulfillment-date-from');
  const dateToEl = document.getElementById('logging-fulfillment-date-to');

  const search = searchEl ? searchEl.value : '';
  const dateFrom = dateFromEl ? dateFromEl.value : '';
  const dateTo = dateToEl ? dateToEl.value : '';

  let queryParams = new URLSearchParams();
  if (search) queryParams.append('search', search);
  if (dateFrom) queryParams.append('dateFrom', dateFrom);
  if (dateTo) queryParams.append('dateTo', dateTo);

  const url = `${API_BASE_URL}/export/fulfillments?${queryParams.toString()}`;

  fetch(url)
    .then(response => {
      if (!response.ok) {
        throw new Error('Failed to export data');
      }
      return response.json();
    })
    .then(data => {
      if (!data || data.length === 0) {
        alert('No fulfillment data to export.');
        return;
      }

      const rows = data.map(f => ({
        'Request ID': f.request?.id || '',
        'Blood Bag ID': f.bloodBag?.bagNumber || '',
        'Blood Type': f.bloodBag?.bloodType || '',
        'Component': f.bloodBag?.componentType || '',
        'Fulfilled By': f.fulfilledBy?.fullName || 'System',
        'Fulfilled At': formatExcelDate(f.fulfilledAt),
        'Notes': f.notes || '',
      }));

      const ws = XLSX.utils.json_to_sheet(rows);
      ws['!cols'] = [
        { wch: 12 },
        { wch: 18 },
        { wch: 12 },
        { wch: 16 },
        { wch: 20 },
        { wch: 22 },
        { wch: 40 },
      ];

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Fulfillments');
      XLSX.writeFile(wb, `fulfillments-${today()}.xlsx`);
    })
    .catch(error => {
      console.error('Error exporting fulfillments:', error);
      alert('Failed to export fulfillments');
    });
}

// ═══════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function formatDateTime(isoString) {
  if (!isoString) return '—';
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function formatExcelDate(raw) {
  if (!raw) return '';
  const d = new Date(raw);
  if (isNaN(d)) return raw;
  return d.toLocaleString('en-US', {
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: true
  });
}

function today() {
  return new Date().toISOString().split('T')[0];
}

function updatePaginationControls(type, currentPage, totalPages, totalElements) {
  const prefix = type === 'status' ? 'logging-status' : 'logging-fulfillment';
  
  const showingEl = document.getElementById(`${prefix}-showing`);
  const pageLabelEl = document.getElementById(`${prefix}-page-label`);
  const prevEl = document.getElementById(`${prefix}-prev`);
  const nextEl = document.getElementById(`${prefix}-next`);
  const resultsEl = document.getElementById(`${prefix}-results-info`);

  const startIdx = (currentPage - 1) * loggingState.itemsPerPage + 1;
  const endIdx = Math.min(currentPage * loggingState.itemsPerPage, totalElements);

  if (showingEl) showingEl.textContent = `Showing ${startIdx}–${endIdx} of ${totalElements}`;
  if (pageLabelEl) pageLabelEl.textContent = `${currentPage} / ${totalPages}`;
  if (prevEl) prevEl.disabled = currentPage === 1;
  if (nextEl) nextEl.disabled = currentPage >= totalPages;
  if (resultsEl) resultsEl.textContent = `${totalElements} result${totalElements !== 1 ? 's' : ''}`;
}

function showLoadingInTable(tbodyId, type) {
  const tbody = document.getElementById(tbodyId);
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:20px;color:var(--muted)">⏳ Loading...</td></tr>';
  }
}

function showErrorInTable(tbodyId, message) {
  const tbody = document.getElementById(tbodyId);
  if (tbody) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:20px;color:#E74C3C">${message}</td></tr>`;
  }
}

// ═══════════════════════════════════════════════════════════════
// MODAL BACKDROP CLICK HANDLERS
// ═══════════════════════════════════════════════════════════════

document.addEventListener('click', function(event) {
  const statusModal = document.getElementById('logging-status-modal');
  const fulfillmentModal = document.getElementById('logging-fulfillment-modal');

  // Close status modal if clicking on backdrop
  if (statusModal && event.target.classList.contains('logging-modal-backdrop') && event.target.parentElement === statusModal) {
    closeLoggingStatusModal();
  }

  // Close fulfillment modal if clicking on backdrop
  if (fulfillmentModal && event.target.classList.contains('logging-modal-backdrop') && event.target.parentElement === fulfillmentModal) {
    closeLoggingFulfillmentModal();
  }
});

// ═══════════════════════════════════════════════════════════════
// ENHANCED AUTO-REFRESH WITH CHANGE DETECTION (SILENT UPDATES)
// ═══════════════════════════════════════════════════════════════

let autoRefreshIntervals = {};
let dataSnapshots = {
  dashboard: null,
  bloodBank: null,
  requests: null,
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
  
  console.log('[Auto-Refresh] Forced refresh - all data reloaded');
}