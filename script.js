const root = document.documentElement;
const themeButton = document.querySelector('#theme');
const themeIcon = themeButton.querySelector('img');
const moonIcon = themeIcon.src;
const sunIcon = new URL('sun.svg', moonIcon).href;

function showTheme(dark) {
  root.classList.toggle('dark', dark);
  themeIcon.src = dark ? sunIcon : moonIcon;
  const label = dark ? '切换浅色模式' : '切换深色模式';
  themeButton.setAttribute('aria-label', label);
  themeButton.title = label;
}
let storedTheme;
try { storedTheme = localStorage.getItem('cloverneo-theme'); } catch {}
showTheme(storedTheme ? storedTheme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches);
themeButton.addEventListener('click', () => {
  const dark = !root.classList.contains('dark');
  showTheme(dark);
  try { localStorage.setItem('cloverneo-theme', dark ? 'dark' : 'light'); } catch {}
});

const filters = document.querySelectorAll('[data-filter]');
const entries = Array.from(document.querySelectorAll('.entry'));
for (const button of filters) {
  button.addEventListener('click', () => {
    for (const filter of filters) filter.setAttribute('aria-pressed', String(filter === button));
    for (const entry of entries) {
      entry.hidden = button.dataset.filter !== 'all' && entry.dataset.category !== button.dataset.filter;
    }
    document.querySelector('#empty').hidden = entries.some(entry => !entry.hidden);
  });
}
