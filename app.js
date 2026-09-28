import chartJs, { registerables } from 'https://cdn.jsdelivr.net/npm/chart.js@4.5/+esm';
import { project } from './calculator.js';

chartJs.register(...registerables);

const form = document.querySelector('#calculator-form');
const currency = new Intl.NumberFormat('da-DK', { style: 'currency', currency: 'DKK', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('da-DK', { maximumFractionDigits: 0 });
const compact = new Intl.NumberFormat('da-DK', { notation: 'compact', maximumFractionDigits: 1 });
const text = (id, value) => { document.getElementById(id).textContent = value; };
const pairs = [['deposit', 'deposit-range'], ['annualReturn', 'return-range'], ['years', 'years-range']];
const chartCanvas = document.querySelector('#chart');
let chart;

function drawChart(deposit, result) {
  const net = [deposit, ...result.rows.map(row => row.closing)];
  const gross = [deposit, ...result.rows.map(row => row.beforeCosts)];
  const labels = Array.from({ length: result.rows.length + 1 }, (_, year) => year);
  const description = `Udvikling i din investering. Med de valgte forudsætninger går kontoværdien fra ${currency.format(deposit)} til ${currency.format(result.balance)} efter ${result.rows.length} år. Uden skat og omkostninger ville værdien være ${currency.format(gross.at(-1))}. Alle årlige værdier findes i tabellen nedenfor.`;
  chartCanvas.setAttribute('aria-label', description);
  const data = {
    labels,
    datasets: [
      {
        data: gross,
        borderColor: '#8a927d',
        borderDash: [5, 5],
        borderWidth: 2,
        pointRadius: 0,
      },
      {
        data: net,
        borderColor: '#27634a',
        backgroundColor: '#edf3e0',
        borderWidth: 3,
        pointRadius: context => context.dataIndex === labels.length - 1 ? 4 : 0,
        pointBackgroundColor: '#27634a',
        fill: 'origin',
      },
    ],
  };
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    animation: false,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        grid: { display: false },
        ticks: {
          color: '#58675f',
          maxRotation: 0,
          callback: (_, index) => index === 0
            ? 'I dag'
            : index === Math.round(result.rows.length / 2)
              ? `${index} år`
              : index === result.rows.length
                ? `${index} år`
                : '',
        },
      },
      y: {
        beginAtZero: true,
        max: Math.max(...net, ...gross, 1) * 1.08,
        grid: { color: '#e7ebe2' },
        ticks: { color: '#58675f', callback: value => compact.format(value) },
      },
    },
  };
  if (chart) {
    chart.data = data;
    chart.options = options;
    chart.update('none');
  } else {
    chart = new chartJs(chartCanvas, { type: 'line', data, options });
  }
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
