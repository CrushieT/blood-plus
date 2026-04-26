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
  loadBloodBank();
  loadDashboard();
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
// ADMIN DASHBOARD
// ═══════════════════════════════════════════════════════

async function loadDashboard() {
  try {
    const [dashRes, reqRes] = await Promise.all([
      fetch('/api/admin/dashboard',       { credentials: 'include' }),
      fetch('/api/admin/blood-requests',  { credentials: 'include' }),
    ]);

    if (dashRes.ok) {
      const data = await dashRes.json();
      renderDashboardStats(data);
      renderBloodBankQuickView(data.bloodBankSummary);
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
      CROSSMATCHED: `<span class="bag-status bag-status-crossmatched">🔒 Crossmatched</span>`,
      DISPENSED:    `<span class="bag-status bag-status-dispensed">→ Dispensed</span>`,
      EXPIRED:      `<span class="bag-status bag-status-expired">✕ Expired</span>`,
      DISCARDED:    `<span class="bag-status bag-status-discarded">✕ Discarded</span>`,
    };
    const statusBadge = statusBadgeMap[bag.computedStatus] || '';

    let sourceInfo;
    if (bag.computedStatus === 'DISPENSED') {
      sourceInfo = `<span style="color:var(--blue,#1A4FA0);font-size:12px">→ ${bag.dispensedTo || '—'}</span>`;
    } else if (bag.computedStatus === 'CROSSMATCHED') {
      sourceInfo = `<span style="color:#534AB7;font-size:12px">🔒 Reserved for patient</span>`;
    } else if (bag.computedStatus === 'DISCARDED') {
      sourceInfo = `<span style="font-size:12px;color:#999">✕ ${bag.discardReason || 'Discarded'}</span>`;
    } else {
      sourceInfo = `<span style="font-size:12px;color:var(--muted)">${sourceLabel(bag)}</span>`;
    }

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


// ═══════════════════════════════════════════════════════
// BLOOD REQUESTS
// ═══════════════════════════════════════════════════════

(function () {
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
 
  /*
   * needsBag: true  → clicking this action opens the bag picker
   *           false → clicking opens the simple confirm modal
   */
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
 
  /* simple confirm modal */
  let confirmPending = null;
 
  /* bag picker */
  let bagPickerReqId    = null;
  let bagPickerSelected = null; // comma-separated bag id strings
  let bagPickerData     = [];
  let bagPickerIsChange = false; // true when re-selecting after allocation
 
  /* per-request: bags already fetched for preview in card */
  // reqBagCache[reqId] = { loading, bags, error }
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
 
    // Preserve any already-allocated bag info from the server
    const allocatedBags = r.reservedBags ?? (r.fulfilledByBag ? [r.fulfilledByBag] : []);
 
    return {
      id:             r.id,
      name,
      type:           r.requesterType    ?? 'ANONYMOUS',
      patient:        r.patientName      ?? '—',
      bloodType:      r.bloodType        ?? '—',
      component:      COMPONENT_LABEL[r.bloodComponent] ?? r.bloodComponent ?? '—',
      bloodComponent: r.bloodComponent   ?? null,
      units:          r.numberOfUnits    ?? r.volumeMl ?? 1,
      urgency:        r.urgencyLevel     ?? 'LOW',
      date:           r.requestedAt
        ? new Date(r.requestedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
        : '—',
      status:         r.status           ?? 'PENDING',
      docUrl,
      docLabel,
      rejectionReason: r.rejectionReason ?? null,
      allocatedBags,  // [{id, serialNumber, bloodType, componentType, volumeMl, expiresAt}]
    };
  }
 
  /* ─────────────────────────────────────────────────────────
     FETCH — requests
  ───────────────────────────────────────────────────────── */
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
 
  /* ─────────────────────────────────────────────────────────
     FETCH — available bags for a request (card preview)
     Called when a card is expanded and status is PENDING or APPROVED
  ───────────────────────────────────────────────────────── */
  async function reqFetchCompatibleBags(req) {
    const cacheKey = req.id;
    if (reqBagCache[cacheKey]?.loading || reqBagCache[cacheKey]?.bags) return;
 
    reqBagCache[cacheKey] = { loading: true, bags: null, error: null };
    // spinner is already rendered by reqBuildBagPreviewHTML when cache.loading is true
 
    try {
      const params = new URLSearchParams({
        bloodType: req.bloodType.replace(/[^A-Za-z0-9_]/g, '_'),
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
 
    // Re-render just the bag preview section of this card
    const previewEl = document.getElementById(`req-bag-preview-${req.id}`);
    if (previewEl) {
      previewEl.outerHTML = reqBuildBagPreviewHTML(req);
    }
  }
 
  /* Build the bag preview HTML (compatible bags shown in the card) */
  function reqBuildBagPreviewHTML(req) {
    const cache = reqBagCache[req.id];
    const id    = `req-bag-preview-${req.id}`;
 
    // Only show preview for PENDING and APPROVED (before allocation)
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
            ${b.bloodType ?? '—'} · ${b.componentType ?? '—'} · ${b.volumeMl ?? '—'} mL
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
 
  /* ─────────────────────────────────────────────────────────
     BAG PICKER MODAL — allocate step
  ───────────────────────────────────────────────────────── */
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
 
    // Pre-select already-allocated bags when changing
    if (isChange && req.allocatedBags?.length) {
      bagPickerSelected = req.allocatedBags.map(b => String(b.id)).join(',');
    }
 
    // Use cache if already loaded
    const cached = reqBagCache[req.id];
    if (cached?.bags) {
      bagPickerData = cached.bags;
      renderBagPicker(req);
      return;
    }
 
    try {
      const params = new URLSearchParams({
        bloodType: req.bloodType.replace(/[^A-Za-z0-9_]/g, '_'),
        component: req.bloodComponent ?? '',
        units:     req.units,
      });
      const res  = await fetch(`${API_BASE}/admin/available?${params}`, { headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      bagPickerData = Array.isArray(json) ? json : (json.data ?? json.content ?? []);
      // Also cache it
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
                  ${b.bloodType ?? '—'} · ${b.componentType ?? '—'} · ${b.volumeMl ?? '—'} mL
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
 
    // Capture full bag objects BEFORE closing the modal clears bagPickerData
    const capturedBags = bagPickerData.filter(b => bagIds.includes(String(b.id)));
 
    // Optimistic update — use captured full objects so display is correct immediately
    req.status        = 'ALLOCATED';
    req.allocatedBags = capturedBags;
    reqExpanded[req.id] = true;
 
    // Invalidate cache so fresh bags are fetched next time card is expanded
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
      // Server only returns IDs in reservedBags — keep using captured full objects
      // capturedBags already has the correct data so no re-assignment needed
      reqRender();
    } catch (err) {
      console.error('[reqAllocate] failed', err);
      req.status        = prevStatus;
      req.allocatedBags = prevBags;
      reqRender();
      alert(`${isChange ? 'Re-allocation' : 'Allocation'} failed: ${err.message}`);
    }
  };
 
  /* ─────────────────────────────────────────────────────────
     SIMPLE CONFIRM MODAL (approve / ready / release)
  ───────────────────────────────────────────────────────── */
  window.reqOpenConfirm = function (id, endpoint) {
    const req  = reqData.find(x => x.id === id);
    if (!req) return;
    const next = REQ_NEXT[req.status];
    if (!next) return;
 
    /* allocate goes straight to bag picker — no confirm step */
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
      if (endpoint === 'release') {        // ← add this block
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
      const payload = {
        referenceNumber: req.referenceNumber ?? data.referenceNumber,
        releasedAt:      new Date().toISOString(),
        patientName:     req.patient,
        bloodType:       req.bloodType,          // e.g. "A_POS"
        wardRoom:        req.wardRoom ?? null,
        physician:       req.physician ?? null,
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
    // Path to wherever you host the receipt HTML
    const url = `receipt/blood-release-receipt.html?data=${encoded}`;
    window.open(url, '_blank');
  }
  window.reqPrintReceipt = function(id) {
      const req = reqData.find(x => x.id === id);
      if (!req) return;
      openReleaseReceipt(req, {});
    };
  /* ─────────────────────────────────────────────────────────
     REJECT MODAL
  ───────────────────────────────────────────────────────── */
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
 
  /* ─────────────────────────────────────────────────────────
     DOCUMENT PREVIEW MODAL
  ───────────────────────────────────────────────────────── */
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
 
  /* ─────────────────────────────────────────────────────────
     FILTER / SORT / SEARCH
  ───────────────────────────────────────────────────────── */
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
 
  /* ─────────────────────────────────────────────────────────
     RENDER — status flow bar
  ───────────────────────────────────────────────────────── */
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
 
  /* ─────────────────────────────────────────────────────────
     RENDER — allocated bags section (shown after allocation)
  ───────────────────────────────────────────────────────── */
  function reqRenderAllocatedBags(req) {
    // Only show for ALLOCATED, READY_FOR_RELEASE, RELEASED
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
                ${b.bloodType ?? '—'} · ${b.componentType ?? '—'} · ${b.volumeMl ?? '—'} mL · Exp ${expDate}
              </span>
            </div>
            <span class="req-rec-badge" style="background:var(--green)">Allocated</span>
          </div>`;
        }).join('')}
      </div>
    </div>`;
  }
 
  /* ─────────────────────────────────────────────────────────
     RENDER — action bar
  ───────────────────────────────────────────────────────── */
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
 
  /* ─────────────────────────────────────────────────────────
     RENDER — full card
  ───────────────────────────────────────────────────────── */
  function reqRenderCard(req) {
    const isExp    = !!reqExpanded[req.id];
    const urgColor = REQ_URGENCY_COLOR[req.urgency];
 
    // Trigger background bag-fetch when card is expanded and status is pre-allocation
    if (isExp && ['PENDING', 'APPROVED'].includes(req.status)) {
      // Defer so the DOM renders first, then fetch updates the section
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
          <div class="req-detail-box">
            <div class="req-detail-box-title">Patient info</div>
            <div class="req-detail-row"><span class="lbl">Name</span><span class="val">${req.patient}</span></div>
            <div class="req-detail-row"><span class="lbl">Blood type</span><span class="val">${req.bloodType}</span></div>
            <div class="req-detail-row"><span class="lbl">Component</span><span class="val">${req.component}</span></div>
            <div class="req-detail-row"><span class="lbl">Units needed</span><span class="val">${req.units}</span></div>
          </div>
          <div class="req-detail-box">
            <div class="req-detail-box-title">Requester info</div>
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
 
  /* ─────────────────────────────────────────────────────────
     CHANGE BAGS — opens picker pre-populated with current selection
  ───────────────────────────────────────────────────────── */
  window.reqOpenChangeBags = function (id) {
    openBagPicker(id, true);
  };
 
  /* ─────────────────────────────────────────────────────────
     MAIN RENDER
  ───────────────────────────────────────────────────────── */
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
 
  /* ─────────────────────────────────────────────────────────
     MODAL BACKDROP CLOSE
  ───────────────────────────────────────────────────────── */
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
 
  /* ─────────────────────────────────────────────────────────
     BOOT
  ───────────────────────────────────────────────────────── */
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
  document.getElementById('staff-dept-count').textContent     = depts;
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
  const dept     = document.getElementById('add-staff-dept').value.trim();
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
// MODAL HELPERS
// ──────────────────────────────────────────────────────────────
function openModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.add('open');
}

function closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('open');
}

document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => {
        if (e.target === o) o.classList.remove('open');
    });
});

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