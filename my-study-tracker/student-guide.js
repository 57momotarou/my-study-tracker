// ガイド本文は端末内の非公開データから表示する。
function setupSettingsHub() {
  const tabs = [...document.querySelectorAll('[data-settings-tab]')];
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(button => {
      const selected = button === tab;
      button.setAttribute('aria-selected', String(selected));
      document.getElementById(`settings-${button.dataset.settingsTab}`).hidden = !selected;
    });
  }));
  tabs.forEach((tab, index) => tab.addEventListener('keydown', event => {
    if (!['ArrowLeft','ArrowRight','Home','End'].includes(event.key)) return;
    event.preventDefault();
    const target = event.key === 'Home' ? 0 : event.key === 'End' ? tabs.length - 1
      : (index + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    tabs[target].click();
    tabs[target].focus();
  }));
  document.getElementById('subject-search').addEventListener('input', renderSettingsPage);
  document.getElementById('guide-search').addEventListener('input', event => renderStudentGuide(event.target.value));
  renderStudentGuide();
}

function renderStudentGuide(query = '') {
  const normalized = query.trim().normalize('NFKC').toLocaleLowerCase();
  const terms = normalized.split(/\s+/).filter(Boolean);
  const container = document.getElementById('student-guide-list');
  container.replaceChildren();
  let count = 0;
  STUDENT_GUIDE.forEach(section => {
    const details = document.createElement('details');
    details.className = 'guide-section';
    const summary = document.createElement('summary');
    summary.textContent = section.title;
    const content = document.createElement('div');
    content.className = 'guide-content';
    content.innerHTML = sanitizeGuideHTML(section.html);
    const searchable = `${section.title} ${section.tags} ${content.textContent}`.normalize('NFKC').toLocaleLowerCase();
    if (!terms.every(term => searchable.includes(term))) return;
    const source = document.createElement('p');
    source.className = 'guide-source';
    source.textContent = '参照：提供写真 ' + section.source;
    content.appendChild(source);
    details.append(summary, content);
    details.open = Boolean(normalized);
    container.appendChild(details);
    count++;
  });
  document.getElementById('guide-search-status').textContent = count ? `${count}項目` : '一致する項目がありません。別の言葉で検索してください。';
}
