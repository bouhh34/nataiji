/* Presentation only: retain the existing grade, roster and sync handlers. */
(() => {
  'use strict';
  if (window.__teacherVisualV3) return;
  window.__teacherVisualV3 = true;
  const q = s => document.querySelector(s);
  const root = document.documentElement;
  root.classList.add('nt-teacher-design');
  const fr = () => localStorage.getItem('nataiji-lang') === 'fr';
  const put = (node, value) => { if (node && node.textContent !== value) node.textContent = value; };
  function refresh() {
    if (root.classList.contains('nataiji-professor-mode')) return;
    const home = q('[data-page="home"]');
    const header = q('main > header');
    if (!home || !header) return;
    const page = q('.view:not(.hidden)')?.dataset.page;
    root.classList.toggle('nt-core-view', ['home', 'grades', 'students'].includes(page));
    let title = q('#ntTeacherTitle');
    if (!title) { title = document.createElement('h1'); title.id = 'ntTeacherTitle'; header.append(title); }
    const name = q('#welcomeName')?.textContent?.trim() || '';
    put(title, page === 'grades' ? (fr() ? 'Saisie des notes' : 'إدخال النتائج') : page === 'students' ? (fr() ? 'Mes élèves' : 'تلاميذي') : (fr() ? 'Bonjour, ' : 'مرحبًا، ') + name);
    const welcome = home.querySelector('.welcome > div:first-child');
    let heading = q('#ntTeacherStart');
    if (welcome && !heading) { heading = document.createElement('h2'); heading.id = 'ntTeacherStart'; welcome.prepend(heading); }
    put(heading, fr() ? 'Un petit pas, une journée plus simple' : 'خطوة صغيرة، يوم أسهل');
    // Empty averages stay in the DOM and reappear as soon as results exist.
    home.classList.toggle('nt-no-results', !q('#statAverage')?.textContent?.trim() || q('#statAverage').textContent.trim() === '—');
    let banner = q('#ntTeacherSupport');
    if (!banner) {
      banner = document.createElement('aside'); banner.id = 'ntTeacherSupport';
      const label = document.createElement('b'), text = document.createElement('span'), button = document.createElement('button');
      button.type = 'button';
      button.onclick = () => q('#supportBtn')?.click();
      banner.append(label, text, button); home.append(banner);
    }
    put(banner.querySelector('b'), fr() ? 'Nataiji vous accompagne gratuitement en 2026–2027' : 'نتائجي معك مجانًا طوال 2026–2027');
    put(banner.querySelector('span'), fr() ? 'Vos idées nous aident à progresser.' : 'ملاحظتك تساعدنا على التطوير.');
    put(banner.querySelector('button'), fr() ? 'Partagez votre suggestion' : 'شاركنا اقتراحك');
  }
  let pending;
  function schedule() { clearTimeout(pending); pending = setTimeout(refresh, 60); }
  // Observe only the values and view state used here; never grade input mutations.
  function init() {
    refresh();
    for (const id of ['welcomeName', 'statAverage']) {
      const node = q('#' + id);
      if (node) new MutationObserver(schedule).observe(node, { childList: true, characterData: true, subtree: true });
    }
    document.querySelectorAll('.view').forEach(node => new MutationObserver(schedule).observe(node, { attributes: true, attributeFilter: ['class'] }));
    new MutationObserver(schedule).observe(root, { attributes: true, attributeFilter: ['dir', 'lang'] });
  }
  document.addEventListener('click', e => { if (e.target.closest?.('[data-go],[data-view],#langSwitch')) schedule(); });
  window.addEventListener('storage', e => { if (e.key === 'nataiji-lang') schedule(); });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
})();
