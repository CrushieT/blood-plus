// ═══════════════════════════════════════════════════════
// INIT
// ═══════════════════════════════════════════════════════

document.addEventListener('DOMContentLoaded', () => {
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

(function(){
  const REQ_STATUSES = ['PENDING','APPROVED','ALLOCATED','READY_FOR_RELEASE','RELEASED'];
  const REQ_STATUS_LABEL = {
    PENDING:'Pending', APPROVED:'Approved', ALLOCATED:'Allocated',
    READY_FOR_RELEASE:'Ready for release', RELEASED:'Released', REJECTED:'Rejected'
  };
  const REQ_STATUS_TAG = {
    PENDING:'tag-pending', APPROVED:'tag-approved', ALLOCATED:'tag-allocated',
    READY_FOR_RELEASE:'tag-ready', RELEASED:'tag-released', REJECTED:'tag-rejected'
  };
  const REQ_URGENCY_ORDER = {CRITICAL:0,HIGH:1,MEDIUM:2,LOW:3};
  const REQ_URGENCY_COLOR = {CRITICAL:'var(--crimson)',HIGH:'var(--amber)',MEDIUM:'var(--blue)',LOW:'var(--green)'};
  const REQ_URGENCY_TAG   = {CRITICAL:'tag-critical',HIGH:'tag-urgent',MEDIUM:'tag-low',LOW:'tag-good'};

  const REQ_NEXT = {
    PENDING:          {label:'Approve',         cls:'req-btn-approve',  next:'APPROVED',         endpoint:'approve'},
    APPROVED:         {label:'Mark Allocated',  cls:'req-btn-allocate', next:'ALLOCATED',        endpoint:'allocate'},
    ALLOCATED:        {label:'Mark Ready',      cls:'req-btn-ready',    next:'READY_FOR_RELEASE',endpoint:'ready'},
    READY_FOR_RELEASE:{label:'Confirm Release', cls:'req-btn-release',  next:'RELEASED',         endpoint:'release'},
  };

  const API_BASE = '/api';

  const COMPONENT_LABEL = {
    WHOLE_BLOOD:'Whole Blood', PRBC:'Packed RBC', PLATELET:'Platelet',
    FFP:'FFP', LEUKOREDUCED:'Leukoreduced', ALIQUOT:'Aliquot'
  };

  function mapRequest(r) {
    const docUrl = r.doctorsNoteUrl ?? '';
    const docLabel = docUrl
      ? 'DoctorsNote_' + (r.referenceNumber ?? r.id) + '_' + (
          r.requestedAt
            ? new Date(r.requestedAt).toISOString().slice(0,10).replace(/-/g,'')
            : 'doc'
        ) + (docUrl.toLowerCase().includes('.pdf') ? '.pdf' : '.jpg')
      : 'No document uploaded';

    const name = r.hospitalProfile?.hospitalName
              ?? r.donorProfile?.fullName
              ?? r.requesterName
              ?? '—';

    return {
      id:              r.id,
      name,
      type:            r.requesterType ?? 'ANONYMOUS',
      patient:         r.patientName   ?? '—',
      bloodType:       r.bloodType     ?? '—',
      component:       COMPONENT_LABEL[r.bloodComponent] ?? r.bloodComponent ?? '—',
      units:           r.numberOfUnits ?? r.volumeMl ?? 1,
      urgency:         r.urgencyLevel  ?? 'LOW',
      date:            r.requestedAt
                         ? new Date(r.requestedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})
                         : '—',
      status:          r.status        ?? 'PENDING',
      docUrl,
      docLabel,
      rejectionReason: r.rejectionReason ?? null,
      selectedBag:     r.fulfilledByBag?.id ?? null,
      bags:            [],
    };
  }

  let reqData            = [];
  let reqExpanded        = {};
  let reqCurrentFilter   = 'ALL';
  let reqPendingRejectId = null;

  function reqShowLoading(){
    const list = document.getElementById('req-list');
    if(list) list.innerHTML = `<div class="req-empty"><div style="font-size:32px;margin-bottom:10px;opacity:0.45">⏳</div>Loading requests…</div>`;
  }
  function reqShowError(msg){
    const list = document.getElementById('req-list');
    if(list) list.innerHTML = `<div class="req-empty"><div style="font-size:32px;margin-bottom:10px;opacity:0.45">⚠️</div>${msg}</div>`;
  }

  async function reqFetchAll(){
    reqShowLoading();
    try {
      const res  = await fetch(`${API_BASE}/admin/blood-requests`, { headers:{'Accept':'application/json'} });
      if(!res.ok) throw new Error(`Server error: ${res.status} ${res.statusText}`);
      const json = await res.json();
      const raw  = Array.isArray(json) ? json : (json.data ?? json.content ?? []);
      reqData    = raw.map(mapRequest);
      reqRender();
    } catch(err){
      console.error('[BloodRequests] fetch failed', err);
      reqShowError(`Failed to load requests — ${err.message}`);
    }
  }

  async function reqFetchByStatus(status){
    reqShowLoading();
    try {
      const url  = status === 'ALL'
        ? `${API_BASE}/admin/blood-requests`
        : `${API_BASE}/admin/blood-requests?status=${status}`;
      const res  = await fetch(url, { headers:{'Accept':'application/json'} });
      if(!res.ok) throw new Error(`Server error: ${res.status}`);
      const json = await res.json();
      const raw  = Array.isArray(json) ? json : (json.data ?? json.content ?? []);
      reqData    = raw.map(mapRequest);
      reqRender();
    } catch(err){
      console.error('[BloodRequests] fetch failed', err);
      reqShowError(`Failed to load requests — ${err.message}`);
    }
  }

  function reqGetFiltered(){
    const q       = (document.getElementById('req-search')?.value||'').toLowerCase().trim();
    const urgency = document.getElementById('req-filter-urgency')?.value || 'ALL';
    const sort    = document.getElementById('req-sort')?.value || 'date_desc';
    let list = reqData.slice();
    if(reqCurrentFilter !== 'ALL') list = list.filter(r => r.status === reqCurrentFilter);
    if(urgency !== 'ALL')          list = list.filter(r => r.urgency === urgency);
    if(q) list = list.filter(r =>
      r.name.toLowerCase().includes(q)      ||
      r.patient.toLowerCase().includes(q)   ||
      r.bloodType.toLowerCase().includes(q) ||
      r.component.toLowerCase().includes(q)
    );
    if(sort === 'date_desc')       list.sort((a,b) => b.id - a.id);
    else if(sort === 'date_asc')   list.sort((a,b) => a.id - b.id);
    else if(sort === 'urgency')    list.sort((a,b) => REQ_URGENCY_ORDER[a.urgency] - REQ_URGENCY_ORDER[b.urgency]);
    else if(sort === 'units_desc') list.sort((a,b) => b.units - a.units);
    return list;
  }

  function reqRenderFlow(status){
    if(status === 'REJECTED') return `<div style="margin-bottom:16px"><span class="tag tag-rejected">Rejected</span></div>`;
    const idx = REQ_STATUSES.indexOf(status);
    let h = `<div class="req-status-flow">`;
    REQ_STATUSES.forEach((s,i) => {
      const cls = i < idx ? 'done' : i === idx ? 'active' : 'todo';
      h += `<div class="req-sf-step"><span class="req-sf-node ${cls}">${REQ_STATUS_LABEL[s]}</span>${i < REQ_STATUSES.length-1 ? '<span class="req-sf-arrow">›</span>' : ''}</div>`;
    });
    return h + `</div>`;
  }

  function reqRenderBags(req){
    if(req.status === 'RELEASED' || req.status === 'REJECTED'){
      if(!req.selectedBag) return '';
      const b = req.bags.find(x => x.id === req.selectedBag);
      return b ? `<div class="req-section-label">Blood bag used</div>
        <div class="req-bag-list"><div class="req-bag-row selected">
          <span class="req-bag-dot" style="background:var(--blue);border-color:var(--blue)"></span>
          <div><div class="req-bag-id">${b.id}</div><div class="req-bag-info">${b.bloodType} · ${b.volume} · Exp ${b.expiry}</div></div>
        </div></div>` : '';
    }
    const rec = req.bags.find(b => b.compatible);
    if(!req.selectedBag && rec) req.selectedBag = rec.id;
    const sel = req.selectedBag;
    let h = `<div class="req-section-label">Blood bag selection — tap to choose</div><div class="req-bag-list">`;
    req.bags.forEach(b => {
      const isRec = rec && b.id === rec.id;
      const isSel = b.id === sel;
      h += `<div class="req-bag-row${isRec?' recommended':''}${isSel?' selected':''}" onclick="reqSelectBag(${req.id},'${b.id}')">
        <span class="req-bag-dot"></span>
        <div style="flex:1">
          <div class="req-bag-id">${b.id}</div>
          <div class="req-bag-info">${b.bloodType} · ${b.volume} · Exp ${b.expiry}${!b.compatible?' · <span style="color:var(--crimson)">not compatible</span>':''}</div>
        </div>
        ${isRec ? `<span class="req-rec-badge">Recommended</span>` : ''}
      </div>`;
    });
    return h + `</div>`;
  }

  function reqRenderActions(req){
    if(req.status === 'RELEASED' || req.status === 'REJECTED') return '';
    const next = REQ_NEXT[req.status];
    if(!next) return '';
    let h = `<div class="req-action-bar">
      <button class="req-btn ${next.cls}" onclick="reqAdvance(${req.id})">${next.label}</button>`;
    if(req.status === 'PENDING' || req.status === 'APPROVED'){
      h += `<button class="req-btn req-btn-reject" onclick="reqOpenReject(${req.id})">Reject</button>`;
    }
    return h + `</div>`;
  }

  function reqRenderCard(req){
    const isExp    = reqExpanded[req.id];
    const urgColor = REQ_URGENCY_COLOR[req.urgency];
    return `<div class="req-card${isExp?' expanded':''}" id="req-card-${req.id}">
      <div class="req-head" onclick="reqToggle(${req.id})" style="display:flex;gap:0;padding:0;align-items:stretch">
        <div class="req-urgency-bar" style="background:${urgColor};margin-right:0;flex-shrink:0;border-radius:12px 0 0 ${isExp?'0':'12px'}"></div>
        <div style="flex:1;display:grid;grid-template-columns:1fr auto auto auto auto;align-items:center;gap:12px;padding:15px 18px">
          <div>
            <div class="req-name">${req.name}${req.type==='ANONYMOUS'?` <span style="font-size:11px;font-weight:400;color:var(--muted)">(anonymous)</span>`:''}</div>
            <div class="req-meta">
              <span>${req.patient}</span>
              <span class="req-meta-dot"></span>
              <span>${req.component}</span>
              <span class="req-meta-dot"></span>
              <span style="font-weight:600;color:var(--charcoal)">${req.units} unit${req.units>1?'s':''}</span>
              <span class="req-meta-dot"></span>
              <span>${req.date}</span>
            </div>
          </div>
          <span class="req-blood-badge">${req.bloodType}</span>
          <span class="tag ${REQ_URGENCY_TAG[req.urgency]}">${req.urgency[0]+req.urgency.slice(1).toLowerCase()}</span>
          <span class="tag ${REQ_STATUS_TAG[req.status]}">${REQ_STATUS_LABEL[req.status]}</span>
          <span class="req-chevron${isExp?' open':''}">›</span>
        </div>
      </div>
      <div class="req-detail${isExp?' open':''}" id="req-detail-${req.id}">
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
            <div class="req-detail-row"><span class="lbl">Type</span><span class="val">${req.type[0]+req.type.slice(1).toLowerCase()}</span></div>
            <div class="req-detail-row"><span class="lbl">Urgency</span><span class="val">${req.urgency[0]+req.urgency.slice(1).toLowerCase()}</span></div>
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
        ${req.status !== 'REJECTED' ? reqRenderBags(req) : ''}
        ${req.status === 'REJECTED' && req.rejectionReason
          ? `<div class="req-detail-box" style="margin-bottom:12px;border-left:3px solid var(--crimson)">
              <div class="req-detail-box-title" style="color:var(--crimson)">Rejection Reason</div>
              <div style="font-size:13px;color:var(--charcoal);line-height:1.6">${req.rejectionReason}</div>
            </div>` : ''}
        ${reqRenderActions(req)}
      </div>
    </div>`;
  }

  function reqRender(){
    const list = document.getElementById('req-list');
    const info = document.getElementById('req-results-info');
    if(!list) return;
    const filtered = reqGetFiltered();
    list.innerHTML = filtered.length
      ? filtered.map(reqRenderCard).join('')
      : `<div class="req-empty"><div style="font-size:32px;margin-bottom:10px;opacity:0.35">📋</div>No requests match the current filters.</div>`;
    if(info) info.textContent = `Showing ${filtered.length} of ${reqData.length} request${reqData.length!==1?'s':''}`;
    reqUpdateCounts();
  }

  function reqUpdateCounts(){
    const allEl  = document.getElementById('req-cnt-all');
    const pendEl = document.getElementById('req-cnt-pending');
    if(allEl)  allEl.textContent  = reqData.length;
    if(pendEl) pendEl.textContent = reqData.filter(r => r.status === 'PENDING').length;
  }

  window.reqToggle    = id => { reqExpanded[id] = !reqExpanded[id]; reqRender(); };
  window.reqSelectBag = (reqId, bagId) => { const r = reqData.find(x => x.id === reqId); if(r) r.selectedBag = bagId; reqRender(); };
  window.reqRender    = reqRender;

  window.reqAdvance = async id => {
    const r = reqData.find(x => x.id === id);
    if(!r) return;
    const next = REQ_NEXT[r.status];
    if(!next) return;
    const prevStatus = r.status;
    r.status = next.next;
    reqExpanded[id] = true;
    reqRender();
    try {
      const res = await fetch(`${API_BASE}/admin/blood-requests/${id}/${next.endpoint}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }
      });
      if(!res.ok){
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${res.status}`);
      }
      const data = await res.json();
      r.status = data.status ?? next.next;
      reqRender();
    } catch(err){
      console.error('[reqAdvance] failed', err);
      r.status = prevStatus;
      reqRender();
      alert(`Action failed: ${err.message}`);
    }
  };

  window.reqOpenReject = id => {
    reqPendingRejectId = id;
    const r = reqData.find(x => x.id === id);
    document.getElementById('req-reject-subtitle').textContent = r ? r.name + ' — ' + r.patient : '';
    document.getElementById('req-reject-reason').value = '';
    document.getElementById('req-reject-reason').style.borderColor = 'var(--border)';
    document.getElementById('req-reject-modal').classList.add('open');
  };

  window.reqCloseReject = () => document.getElementById('req-reject-modal').classList.remove('open');

  window.reqConfirmReject = async () => {
    const reason = document.getElementById('req-reject-reason').value.trim();
    if(!reason){
      document.getElementById('req-reject-reason').style.borderColor = 'var(--crimson)';
      return;
    }
    const r = reqData.find(x => x.id === reqPendingRejectId);
    if(!r) return;
    const prevStatus = r.status;
    r.status = 'REJECTED';
    r.rejectionReason = reason;
    reqCloseReject();
    reqExpanded[reqPendingRejectId] = true;
    reqRender();
    try {
      const res = await fetch(`${API_BASE}/admin/blood-requests/${reqPendingRejectId}/reject`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rejectionReason: reason })
      });
      if(!res.ok){
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? `Server error ${res.status}`);
      }
    } catch(err){
      console.error('[reqConfirmReject] failed', err);
      r.status = prevStatus;
      r.rejectionReason = null;
      reqRender();
      alert(`Rejection failed: ${err.message}`);
    }
  };

  window.reqViewDoc = (url, label) => {
    if(!url){ alert('No document uploaded for this request.'); return; }
    document.getElementById('req-doc-label').textContent = label;
    const isPdf = url.toLowerCase().includes('.pdf');
    const googleViewer = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    document.getElementById('req-doc-frame').innerHTML = isPdf
      ? `<iframe src="${googleViewer}" style="width:100%;height:520px;border:none;border-radius:10px;display:block" title="${label}"></iframe>`
      : `<img src="${url}" style="width:100%;border-radius:10px;display:block"
           onerror="this.parentElement.innerHTML='<div style=padding:40px;text-align:center;color:var(--muted);font-size:13px>Preview unavailable — <a href=\\'${url}\\' target=\\'_blank\\' style=\\'color:var(--blue)\\'>open directly ↗</a></div>'" />`;
    document.getElementById('req-doc-modal').classList.add('open');
  };

  window.reqFilterBy = (status, btn) => {
    reqCurrentFilter = status;
    document.querySelectorAll('#req-filters .req-filter-chip').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    reqFetchByStatus(status);
  };

  document.getElementById('req-reject-modal').addEventListener('click', e => { if(e.target===e.currentTarget) reqCloseReject(); });
  document.getElementById('req-doc-modal').addEventListener('click',    e => { if(e.target===e.currentTarget) document.getElementById('req-doc-modal').classList.remove('open'); });

  reqFetchAll();
})();