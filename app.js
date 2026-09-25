import { project } from './calculator.js';

const form = document.querySelector('#calculator-form');
const currency = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('da-DK', { notation: 'compact', maximumFractionDigits: 1 });
const text = (id, value) => { document.getElementById(id).textContent = value; };
const pairs = [['deposit', 'deposit-range'], ['annualReturn', 'return-range'], ['years', 'years-range']];
const svgNamespace = 'http://www.w3.org/2000/svg';

function svgElement(name, attributes, label) {
  const element = document.createElementNS(svgNamespace, name);
  for (const [key, value] of Object.entries(attributes)) element.setAttribute(key, value);
  if (label !== undefined) element.textContent = label;
  return element;
}

function drawChart(deposit, result) {
  const container = document.querySelector('#chart-content');
  container.replaceChildren();
  const net = [deposit, ...result.rows.map(row => row.closing)];
  const gross = [deposit, ...result.rows.map(row => row.beforeCosts)];
  const maximum = Math.max(...net, ...gross, 1) * 1.08;
  const x = index => 67 + index / result.rows.length * 589;
  const y = value => 226 - value / maximum * 206;

  for (let i = 0; i <= 4; i += 1) {
    const value = maximum * i / 4;
    container.append(
      svgElement('line', { x1: 67, y1: y(value), x2: 656, y2: y(value), stroke: '#e7ebe2', 'stroke-width': 1 }),
      svgElement('text', { x: 56, y: y(value) + 4, 'text-anchor': 'end', fill: '#58675f', 'font-size': 12 }, compact.format(value)),
    );
  }
  const netPoints = net.map((value, index) => `${x(index)},${y(value)}`).join(' ');
  container.append(
    svgElement('polygon', { points: `67,226 ${netPoints} 656,226`, fill: '#edf3e0' }),
    svgElement('polyline', { points: gross.map((value, index) => `${x(index)},${y(value)}`).join(' '), fill: 'none', stroke: '#8a927d', 'stroke-width': 2, 'stroke-dasharray': '5 5' }),
    svgElement('polyline', { points: netPoints, fill: 'none', stroke: '#27634a', 'stroke-width': 3, 'stroke-linejoin': 'round', 'stroke-linecap': 'round' }),
    svgElement('circle', { cx: x(net.length - 1), cy: y(result.balance), r: 4, fill: '#27634a' }),
  );
  const ticks = new Set([0, Math.round(result.rows.length / 2), result.rows.length]);
  for (const year of ticks) {
    container.append(svgElement('text', { x: x(year), y: 254, 'text-anchor': year === 0 ? 'start' : year === result.rows.length ? 'end' : 'middle', fill: '#58675f', 'font-size': 12 }, year === 0 ? 'I dag' : `${year} år`));
  }
  text('chart-description', `Med de valgte forudsætninger går kontoværdien fra ${currency.format(deposit)} til ${currency.format(result.balance)} efter ${result.rows.length} år. Uden skat og omkostninger ville værdien være ${currency.format(gross.at(-1))}. Alle årlige værdier findes i tabellen nedenfor.`);
}

function render() {
  const error = document.querySelector('#input-error');
  const valid = form.checkValidity();
  document.querySelector('#results').hidden = !valid;
  error.hidden = valid;
  document.querySelector('#yearly-rows').replaceChildren();
  if (!valid) {
    text('input-error', 'Udfyld alle felter: indbetaling 0–174.200 kr., afkast −100 til 50 %, ETF-omkostning 0–10 % og tidshorisont 1–40 hele år.');
    return;
  }
  const values = Object.fromEntries(['deposit', 'annualReturn', 'annualFee', 'years'].map(name => [name, form.elements[name].valueAsNumber]));
  const result = project(values);
  text('result-years', values.years);
  text('ending-value', currency.format(result.balance));
  text('change-value', `${result.change >= 0 ? '+' : '−'}${currency.format(Math.abs(result.change))} ${result.change >= 0 ? 'i gevinst' : 'i tab'}`);
  document.querySelector('#change-value').classList.toggle('negative', result.change < 0);
  text('deposited-value', currency.format(values.deposit));
  text('fees-value', currency.format(result.totalFees));
  text('tax-value', currency.format(result.totalTax));
  const lossNote = document.querySelector('#loss-note');
  lossNote.hidden = result.taxCredit <= 0;
  lossNote.textContent = `Fremført negativ skat: ${currency.format(result.taxCredit)}. Kan modregnes i fremtidig skat på samme konto, men udbetales ikke og er ikke medregnet i kontoværdien.`;
  for (const button of document.querySelectorAll('[data-return]')) {
    button.setAttribute('aria-pressed', String(Number(button.dataset.return) === values.annualReturn));
  }
  drawChart(values.deposit, result);
  const fragment = document.createDocumentFragment();
  for (const row of result.rows) {
    const tr = document.createElement('tr');
    for (const key of ['year', 'opening', 'gain', 'fee', 'tax', 'closing', 'taxCredit']) {
      const cell = document.createElement(key === 'year' ? 'th' : 'td');
      if (key === 'year') cell.scope = 'row';
      cell.textContent = number.format(row[key]);
      tr.append(cell);
    }
    fragment.append(tr);
  }
  document.querySelector('#yearly-rows').append(fragment);
}

for (const [numberId, rangeId] of pairs) {
  const input = document.getElementById(numberId);
  const range = document.getElementById(rangeId);
  input.addEventListener('input', () => {
    if (input.validity.valid) range.value = input.value;
  });
  range.addEventListener('input', () => { input.value = range.value; });
}
form.addEventListener('input', render);
form.addEventListener('submit', event => event.preventDefault());
form.addEventListener('reset', () => requestAnimationFrame(render));
for (const button of document.querySelectorAll('[data-return]')) {
  button.addEventListener('click', () => {
    form.elements.annualReturn.value = button.dataset.return;
    document.querySelector('#return-range').value = button.dataset.return;
    render();
  });
}
document.querySelector('#calculator-inputs').disabled = false;
document.querySelector('#loading-note').hidden = true;
render();
