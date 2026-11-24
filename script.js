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
const empty = document.querySelector('#empty');
const postCount = document.querySelector('#post-count');

function applyFilter(name) {
  let visible = 0;
  for (const filter of filters) filter.setAttribute('aria-pressed', String(filter.dataset.filter === name));
  for (const entry of entries) {
    const matched = name === 'all' || entry.dataset.category === name;
    entry.hidden = !matched;
    if (matched) visible += 1;
  }
  if (empty) empty.hidden = visible > 0;
  if (postCount) postCount.textContent = `${visible} 篇`;
}
for (const button of filters) {
  button.addEventListener('click', () => applyFilter(button.dataset.filter));
}
