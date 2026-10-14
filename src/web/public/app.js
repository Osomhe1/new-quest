let currentRawCSV = '';
let currentSummary = null;
let currentAnalyses = [];

async function loadSample(sampleName) {
  // Update button active states
  document.querySelectorAll('.sample-btn-group button').forEach((btn) => {
    btn.classList.remove('active');
  });
  const clickedBtn = Array.from(document.querySelectorAll('.sample-btn-group button')).find((b) =>
    b.getAttribute('onclick')?.includes(sampleName)
  );
  if (clickedBtn) clickedBtn.classList.add('active');

  // Pre-bundled datasets are calibrated to March 25, 2026
  document.getElementById('refDateInput').value = '2026-03-25';

  showLoadingState();

  try {
    const res = await fetch(`/api/sample/${sampleName}`);
    if (!res.ok) throw new Error(`Could not load sample dataset '${sampleName}'`);
    currentRawCSV = await res.text();
    await analyzeCSV(currentRawCSV);
  } catch (err) {
    alert(`Failed to load dataset: ${err.message}`);
  }
}

async function handleFileUpload(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  document.querySelectorAll('.sample-btn-group button').forEach((btn) => btn.classList.remove('active'));
  showLoadingState();

  const reader = new FileReader();
  reader.onload = async (e) => {
    currentRawCSV = e.target.result;

    // Automatically set reference date to today for custom uploads
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('refDateInput').value = todayStr;

    await analyzeCSV(currentRawCSV);
  };
  reader.readAsText(file);
}

async function reanalyzeCurrentData() {
  if (!currentRawCSV) return;
  await analyzeCSV(currentRawCSV);
}

async function analyzeCSV(csvContent) {
  showLoadingState();

  const refDate = document.getElementById('refDateInput').value || '2026-03-25';
  const thresholdVal = document.getElementById('slaOverride').value;

  try {
    const res = await fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        csv: csvContent,
        referenceDate: refDate,
        threshold: thresholdVal || undefined,
      }),
    });

    const data = await res.json();
    if (!data.success) throw new Error(data.error || 'Failed to process CSV');

    currentSummary = data.summary;
    currentAnalyses = data.summary.analyses || [];

    updateMetrics(data.summary, data.archivedCount);
    updateWarnings(data.summary.warnings || []);
    filterBoard();
  } catch (err) {
    alert(`Analysis error: ${err.message}`);
    document.getElementById('triageTableBody').innerHTML = `
      <tr><td colspan="9" class="loading-cell" style="color: #ef4444;">Error: ${err.message}</td></tr>
    `;
  }
}

function updateMetrics(summary, archivedCount) {
  document.getElementById('valTotalActive').textContent = summary.totalEvaluated;
  document.getElementById('subArchived').textContent = `${archivedCount || 0} closed / archived`;

  document.getElementById('valTotalStalled').textContent = summary.totalStalled;
  const pct = summary.totalEvaluated > 0 ? Math.round((summary.totalStalled / summary.totalEvaluated) * 100) : 0;
  document.getElementById('subStallPct').textContent = `${pct}% of active pool`;

  document.getElementById('valCritical').textContent = summary.criticalCount;
  document.getElementById('valHigh').textContent = summary.highCount;

  if (document.getElementById('valOnTrack')) {
    document.getElementById('valOnTrack').textContent = summary.onTrackCount || 0;
  }

  const warnCount = summary.warnings?.length || 0;
  document.getElementById('valWarnings').textContent = warnCount;

  // Auto-sync reference date picker if backend adjusted it
  if (summary.referenceDate) {
    const autoDate = new Date(summary.referenceDate).toISOString().split('T')[0];
    document.getElementById('refDateInput').value = autoDate;
  }
}

function updateWarnings(warnings) {
  const container = document.getElementById('warningsAccordion');
  const countEl = document.getElementById('warnCount');
  const listEl = document.getElementById('warningsList');

  if (warnings.length === 0) {
    container.style.display = 'none';
    return;
  }

  container.style.display = 'block';
  countEl.textContent = warnings.length;
  listEl.innerHTML = warnings
    .map(
      (w) =>
        `<div>• <strong>Row ${w.rowNumber} [${w.type}]:</strong> ${escapeHtml(w.message)}</div>`
    )
    .join('');
}

function toggleWarnings() {
  const listEl = document.getElementById('warningsList');
  const toggleText = document.getElementById('warnToggleText');
  if (listEl.style.display === 'none') {
    listEl.style.display = 'flex';
    toggleText.textContent = '▲ Hide Details';
  } else {
    listEl.style.display = 'none';
    toggleText.textContent = '▼ Show Details';
  }
}

function filterBoard() {
  if (!currentSummary) return;

  const query = document.getElementById('searchInput').value.toLowerCase().trim();
  const stage = document.getElementById('stageFilter').value;
  const urgency = document.getElementById('urgencyFilter').value;
  const statusView = document.getElementById('statusFilter')?.value || 'all';

  const filtered = currentAnalyses.filter((item) => {
    const cand = item.candidate;
    const matchQuery =
      !query ||
      cand.name.toLowerCase().includes(query) ||
      cand.role.toLowerCase().includes(query) ||
      cand.department.toLowerCase().includes(query) ||
      item.responsibleOwner.toLowerCase().includes(query);

    const matchStage = !stage || cand.canonicalStage === stage;
    const matchUrgency = !urgency || item.urgencyLevel === urgency;

    // View filter: 'all' (mixed), 'stalled' (only stalled), 'ontrack' (only healthy)
    let matchStatus = true;
    if (statusView === 'stalled') {
      matchStatus = item.isStalled === true;
    } else if (statusView === 'ontrack') {
      matchStatus = item.isStalled === false;
    }

    return matchQuery && matchStage && matchUrgency && matchStatus;
  });

  renderTable(filtered);
}

function renderTable(items) {
  const tbody = document.getElementById('triageTableBody');
  document.getElementById('showingCount').textContent = `Showing ${items.length} candidates`;

  if (items.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="loading-cell" style="color: #38bdf8;">
          No candidates matching current criteria. Try selecting "All Candidates (Mixed)" in the View dropdown above.
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = items
    .map((item, index) => {
      const cand = item.candidate;
      const rank = index + 1;
      const actionPlan = item.actionPlan;
      const urgencyClass = item.urgencyLevel.replace(/\s+/g, '-');

      const riskBadges = item.detectedRisks
        .map((r) => `<span class="risk-pill-inline">${escapeHtml(r)}</span>`)
        .join('');

      const stalledColumnHtml = item.isStalled
        ? `<span class="stalled-days-text">${item.businessDaysStalled} days</span>
           <div class="sla-sub">SLA: ${item.slaThresholdDays}d (${item.slaBreachDays > 0 ? '+' + item.slaBreachDays + 'd breach' : 'on track'})</div>`
        : `<span style="color: #34d399; font-weight: 600;">${item.businessDaysStalled} days</span>
           <div class="sla-sub" style="color: #34d399;">✓ Within ${item.slaThresholdDays}d SLA</div>`;

      return `
        <tr>
          <td><span class="rank-badge">#${rank}</span></td>
          <td>
            <span class="urgency-pill ${urgencyClass}">${item.urgencyLevel}</span>
          </td>
          <td>
            <div class="candidate-name-cell">${escapeHtml(cand.name)}</div>
            <div class="candidate-role-sub">${escapeHtml(cand.email || cand.id)}</div>
            ${riskBadges}
          </td>
          <td>
            <div>${escapeHtml(cand.role)}</div>
            <div class="candidate-role-sub">${escapeHtml(cand.department)}</div>
          </td>
          <td>
            <span class="stage-tag">${escapeHtml(cand.stage)}</span>
          </td>
          <td>
            ${stalledColumnHtml}
          </td>
          <td>
            <div><strong>${escapeHtml(item.responsibleOwner)}</strong></div>
            <div class="candidate-role-sub">HM: ${escapeHtml(cand.hiringManager)}</div>
          </td>
          <td>
            <div class="action-summary-cell">
              ${actionPlan ? escapeHtml(actionPlan.actionSummary) : 'Review status and contact candidate'}
            </div>
          </td>
          <td>
            <button class="btn-inspect" onclick="openModal('${cand.id}')">View Draft</button>
          </td>
        </tr>
      `;
    })
    .join('');
}

function openModal(candidateId) {
  const item = currentAnalyses.find((a) => a.candidate.id === candidateId);
  if (!item) return;

  const cand = item.candidate;
  const actionPlan = item.actionPlan;

  document.getElementById('modalUrgencyBadge').className = `modal-badge urgency-pill ${item.urgencyLevel}`;
  document.getElementById('modalUrgencyBadge').textContent = `${item.urgencyLevel} PRIORITY (Score: ${item.urgencyScore})`;

  document.getElementById('modalCandidateName').textContent = `${cand.name} (${cand.id})`;
  document.getElementById('modalSubInfo').textContent = `${cand.role} • ${cand.department}`;

  document.getElementById('modalStage').textContent = `${cand.stage} (Canonical: ${cand.canonicalStage})`;
  document.getElementById('modalLastActivity').textContent = `${cand.lastActivityDateRaw}`;
  document.getElementById('modalDaysStalled').textContent = `${item.businessDaysStalled} business days (${item.daysSinceLastActivity} calendar days)`;
  document.getElementById('modalSLA').textContent = `${item.slaThresholdDays} days (${item.slaBreachDays > 0 ? item.slaBreachDays + ' days overdue' : 'Within SLA'})`;
  document.getElementById('modalOwner').textContent = item.responsibleOwner;
  document.getElementById('modalRecruiter').textContent = cand.recruiter;

  const risksContainer = document.getElementById('modalRisksContainer');
  const risksList = document.getElementById('modalRisksList');
  if (item.detectedRisks.length > 0) {
    risksContainer.style.display = 'block';
    risksList.innerHTML = item.detectedRisks
      .map((r) => `<span class="risk-pill-card">${escapeHtml(r)}</span>`)
      .join('');
  } else {
    risksContainer.style.display = 'none';
  }

  document.getElementById('modalNotes').textContent = cand.notes ? `"${cand.notes}"` : 'No notes recorded on file.';

  if (actionPlan) {
    document.getElementById('modalChannelBadge').textContent = actionPlan.channel;
    document.getElementById('modalActionSummary').textContent = actionPlan.actionSummary;
    document.getElementById('modalRankReason').textContent = actionPlan.priorityRankReason;
    document.getElementById('modalSubject').textContent = actionPlan.draftSubject;
    document.getElementById('modalDraftMessage').value = actionPlan.draftMessage;
  }

  document.getElementById('actionModal').style.display = 'flex';
}

function closeModal() {
  document.getElementById('actionModal').style.display = 'none';
}

function closeModalOnBackdrop(event) {
  if (event.target.id === 'actionModal') {
    closeModal();
  }
}

function copyDraftMessage() {
  const textarea = document.getElementById('modalDraftMessage');
  textarea.select();
  navigator.clipboard.writeText(textarea.value);
  const copyBtn = document.querySelector('.btn-copy');
  const origText = copyBtn.textContent;
  copyBtn.textContent = '✓ Copied!';
  setTimeout(() => {
    copyBtn.textContent = origText;
  }, 1500);
}

function showLoadingState() {
  document.getElementById('triageTableBody').innerHTML = `
    <tr><td colspan="9" class="loading-cell">Analyzing pipeline & generating action plans...</td></tr>
  `;
}

function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Initial load on startup
window.addEventListener('DOMContentLoaded', () => {
  loadSample('clean_board');
});
