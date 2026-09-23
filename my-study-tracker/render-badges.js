// バッジ条件は履修計画として表示。科目選択だけで取得済みとは判定しない。
function renderBadgesPage() {
  const codes = getAllPlannedCodes();
  const planned = BADGES.filter(badge => getBadgePlan(badge, codes).satisfied);
  document.getElementById('badge-summary').innerHTML =
    `<p class="settings-note">MCの取得要件に対する履修計画です。合格・バッジの発行状況は含みません。</p>
     <div class="plan-total"><strong>${planned.length}<small> / ${BADGES.length}</small></strong><span>計画上の条件を満たすバッジ</span></div>
     <p class="settings-note">タップすると前提バッジ・必要科目を確認できます。卒業研究のテーマや追加条件は大学で確認してください。</p>`;
  const container = document.getElementById('badge-list-container');
  container.replaceChildren();
  for (const category of ['専門','教養','外国語']) {
    const section = document.createElement('section');
    section.className = 'card';
    const heading = document.createElement('h2');
    heading.className = 'card-title';
    heading.textContent = category + 'のバッジ';
    const grid = document.createElement('div');
    grid.className = 'badge-plan-grid';
    for (const badge of BADGES.filter(item => item.category === category)) {
      const plan = getBadgePlan(badge, codes);
      const level = BADGE_LEVEL_CONFIG[badge.level];
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'badge-plan-card' + (plan.satisfied ? ' is-planned' : '');
      button.innerHTML = `<span style="color:${level.color}">${level.icon} ${level.label}</span>
        <strong>${badge.name}</strong><small>${plan.satisfied ? '計画条件を満たす' : `${plan.done} / ${plan.total} 条件を計画済み`}</small>`;
      button.addEventListener('click', () => showBadgeModal(badge.id));
      grid.appendChild(button);
    }
    section.append(heading, grid);
    container.appendChild(section);
  }
}

function showBadgeModal(badgeId) {
  const badge = BADGES.find(item => item.id === badgeId);
  if (!badge) return;
  document.getElementById('badge-modal')?.remove();
  const plan = getBadgePlan(badge, getAllPlannedCodes());
  const origin = document.activeElement;
  const modal = document.createElement('div');
  modal.id = 'badge-modal';
  modal.className = 'badge-plan-modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-label', badge.name);
  const level = BADGE_LEVEL_CONFIG[badge.level];
  modal.innerHTML = `<div class="badge-plan-dialog"><header><div>
    <p style="color:${level.color};font-size:12px">${level.label}</p><h2>${badge.name}</h2>
    </div><button type="button" aria-label="閉じる">閉じる</button></header>
    <p class="settings-note">${plan.done} / ${plan.total} 条件を計画済み。チェックは科目を選択したことを表します。</p>
    <ul>${plan.checks.map(check => `<li>${check.done ? '✓' : '○'} ${check.label}</li>`).join('')}</ul>
    ${badge.requirements.description ? `<p class="settings-note">${badge.requirements.description}</p>` : ''}
    <p class="settings-note">資料：2026/8/1取得要件チェックリスト。正式な単位修得・バッジ取得は大学の記録で確認してください。</p></div>`;
  const closeButton = modal.querySelector('button');
  const close = () => { modal.remove(); if (origin?.isConnected) origin.focus(); };
  closeButton.addEventListener('click', close);
  modal.addEventListener('click', event => { if (event.target === modal) close(); });
  modal.addEventListener('keydown', event => {
    if (event.key === 'Escape') { event.stopPropagation(); close(); }
    if (event.key === 'Tab') { event.preventDefault(); closeButton.focus(); }
  });
  document.body.appendChild(modal);
  closeButton.focus();
}
