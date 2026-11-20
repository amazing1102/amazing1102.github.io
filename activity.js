(() => {
  const snapshot = JSON.parse(document.querySelector('#activity-snapshot').textContent);
  const grid = document.querySelector('#activity-grid');
  const yearList = document.querySelector('#activity-years');
  const detail = document.querySelector('#activity-detail');
  const dayMs = 86400000;
  let data = snapshot;
  let selected = 'last';

  function renderCalendar() {
    const rolling = selected === 'last';
    const last = Date.parse(data.asOf);
    const end = rolling ? last : Math.min(last, Date.UTC(Number(selected), 11, 31));
    const weekday = new Date(end).getUTCDay();
    // GitHub's rolling view starts on Sunday and spans 53 week columns.
    const start = rolling ? end - (364 + weekday) * dayMs : Date.UTC(Number(selected), 0, 1);
    const offset = new Date(start).getUTCDay();
    const activity = new Map(data.days.map(day => [day.date, day]));
    const cells = document.createDocumentFragment();
    let total = 0;
    let previousMonthColumn = -3;
    for (let time = start, index = offset; time <= end; time += dayMs, index++) {
      const date = new Date(time);
      const iso = date.toISOString().slice(0,10);
      const record = activity.get(iso);
      const count = record?.count ?? 0;
      total += count;
      const column = Math.floor(index / 7) + 1;
      if ((time === start || date.getUTCDate() === 1) && column - previousMonthColumn >= 3) {
        const label = document.createElement('span');
        label.className = 'month';
        label.textContent = (date.getUTCMonth() + 1) + '月';
        label.style.gridArea = '1 / ' + column;
        cells.append(label);
        previousMonthColumn = column;
      }
      const cell = document.createElement('button');
      cell.type = 'button';
      cell.className = 'day';
      cell.dataset.level = record?.level ?? 0;
      cell.tabIndex = time === end ? 0 : -1;
      cell.title = iso + ' · ' + count + ' 次贡献';
      cell.setAttribute('aria-label', cell.title);
      cell.style.gridArea = (index % 7 + 2) + ' / ' + column;
      cells.append(cell);
    }
    grid.replaceChildren(cells);
    const period = rolling ? '近一年' : selected + ' 年';
    document.querySelector('#activity-total').textContent = period + ' · ' + total + ' 次贡献';
    detail.textContent = '截至 ' + new Date(end).toISOString().slice(0,10);
    for (const button of yearList.children) button.setAttribute('aria-pressed', String(button.value === selected));
    grid.parentElement.scrollLeft = rolling || end === last ? grid.scrollWidth : 0;
  }

  function renderYears() {
    yearList.replaceChildren();
    for (const value of ['last', ...data.years]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.value = value;
      button.textContent = value === 'last' ? '近一年' : value;
      yearList.append(button);
    }
  }
  yearList.addEventListener('click', event => {
    if (!event.target.matches('button')) return;
    selected = event.target.value;
    renderCalendar();
  });
  for (const name of ['pointerover','focusin','click']) {
    grid.addEventListener(name, event => {
      if (!event.target.matches('.day')) return;
      detail.textContent = event.target.title;
      if (name === 'focusin') {
        grid.querySelector('[tabindex="0"]').tabIndex = -1;
        event.target.tabIndex = 0;
      }
    });
  }
  grid.addEventListener('keydown', event => {
    const steps = {ArrowUp:-1, ArrowDown:1, ArrowLeft:-7, ArrowRight:7};
    if (!(event.key in steps)) return;
    event.preventDefault();
    const days = Array.from(grid.querySelectorAll('.day'));
    days[days.indexOf(event.target) + steps[event.key]]?.focus();
  });

  renderYears();
  renderCalendar();

  async function refresh() {
    const response = await fetch('https://github-contributions-api.jogruber.de/v4/amazing1102', {credentials:'omit', referrerPolicy:'no-referrer'});
    if (!response.ok) return;
    const {total, contributions} = await response.json();
    const years = Object.keys(total).filter(year => /^\d{4}$/.test(year)).sort().reverse();
    if (!years.length || !Array.isArray(contributions) || !contributions.length) return;
    const today = new Date().toISOString().slice(0,10);
    const known = contributions.filter(day => day.date <= today);
    const asOf = known.reduce((end, day) => day.date > end ? day.date : end, '');
    if (asOf < snapshot.asOf) return;
    const days = known.filter(day => day.count > 0).sort((a,b) => a.date.localeCompare(b.date));
    const next = {asOf, years, days};
    if (JSON.stringify(next) === JSON.stringify(snapshot)) return;
    data = next;
    renderYears();
    renderCalendar();
  }
  refresh().catch(() => { /* The bundled snapshot remains available offline. */ });
})();
