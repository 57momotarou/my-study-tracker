// ランク → 分野の順に並べる。正式取得と履修計画は区別する。
let badgeRankFilter = 'all';
function renderBadgesPage() {
  const codes = getAllPlannedCodes(), planned = BADGES.filter(b=>getBadgePlan(b,codes).satisfied);
  const ranks = ['bronze','silver','gold','platinum'];
  document.getElementById('badge-summary').innerHTML = `<p class="settings-note">科目の選択に基づく履修計画です。正式な取得・発行状況ではありません。</p>
    <div class="plan-total"><strong>${planned.length}<small> / ${BADGES.length}</small></strong><span>計画条件を満たすバッジ</span></div>
    <div class="badge-rank-filters">${['all',...ranks].map(rank=>`<button class="filter-btn${badgeRankFilter===rank?' active':''}" data-badge-rank="${rank}" aria-pressed="${badgeRankFilter===rank}">${rank==='all'?'すべて':BADGE_LEVEL_CONFIG[rank].label}</button>`).join('')}</div>`;
  document.querySelectorAll('[data-badge-rank]').forEach(b=>b.addEventListener('click',()=>{badgeRankFilter=b.dataset.badgeRank;renderBadgesPage();}));
  const container=document.getElementById('badge-list-container'); container.replaceChildren();
  for(const rank of ranks.filter(r=>badgeRankFilter==='all'||badgeRankFilter===r)) {
    const level=BADGE_LEVEL_CONFIG[rank], badges=BADGES.filter(b=>b.level===rank);
    if(!badges.length) continue;
    const section=document.createElement('section');section.className='card badge-rank-section';section.dataset.rank=rank;
    section.innerHTML=`<div class="badge-rank-heading"><h2 class="card-title" style="color:${level.color};margin:0">${level.icon} ${level.label}</h2><small>${badges.filter(b=>getBadgePlan(b,codes).satisfied).length}/${badges.length} 計画済み</small></div>`;
    for(const category of ['専門','教養','外国語']) {
      const items=badges.filter(b=>b.category===category);if(!items.length)continue;
      const title=document.createElement('h3');title.className='badge-category-heading';title.textContent=category;section.appendChild(title);
      const grid=document.createElement('div');grid.className='badge-plan-grid';
      for(const badge of items){
        const plan=getBadgePlan(badge,codes),button=document.createElement('button');button.type='button';button.className='badge-plan-card'+(plan.satisfied?' is-planned':'');
        button.innerHTML=`<strong>${escapeText(badge.name)}</strong><small>${plan.satisfied?'✓ 計画条件を満たす':`${plan.done} / ${plan.total} 条件を計画済み`}</small><div class="prog-wrap"><div class="prog-bar" style="width:${plan.total?Math.round(plan.done/plan.total*100):0}%;background:${level.color}"></div></div>`;
        button.addEventListener('click',()=>showBadgeModal(badge.id));grid.appendChild(button);
      }
      section.appendChild(grid);
    }
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
    <p class="settings-note">端末に読み込んだ要件の計画です。正式な単位修得・バッジ取得は大学の記録で確認してください。</p></div>`;
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
