import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateYear, project, DEPOSIT_LIMIT } from './calculator.js';

const defaults = { deposit: 100_000, annualReturn: 7, annualFee: 0.2, years: 10 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001);

test('skatten beregnes efter ETF-omkostninger og betales med ekstra indskud', () => {
  const result = project({ ...defaults, years: 1 });
  close(result.totalFees, 214);
  close(result.totalTax, 1153.62);
  close(result.balance, 106786);
  close(result.change, 5632.38);
});

test('kun omkostninger reducerer den efterfølgende renters rente på kontoen', () => {
  const result = project(defaults);
  close(result.balance, 100_000 * (1.06786 ** 10));
  close(result.balance, defaults.deposit + result.rows.reduce((sum, row) => sum + row.gain - row.fee, 0));
  close(result.change, result.balance - defaults.deposit - result.totalTax);
});

test('hver årsslutværdi følger kontoværdien frem til den valgte tidshorisont', () => {
  for (const years of [1, 10, 40]) {
    const result = project({ ...defaults, years });
    assert.equal(result.rows.length, years);
    result.rows.forEach((row, index) => {
      assert.equal(row.year, index + 1);
      close(row.closing, defaults.deposit * (1.06786 ** row.year));
    });
    close(result.balance, result.rows.at(-1).closing);
  }
});

test('skat betalt med ekstra indskud ændrer ikke kontoværdien uden omkostninger', () => {
  const result = project({ ...defaults, annualFee: 0 });
  assert.ok(result.totalTax > 0);
  close(result.balance, defaults.deposit * (1.07 ** defaults.years));
});

test('tab giver fremført negativ skat, ikke kontant udbetaling', () => {
  const loss = calculateYear(100_000, -0.2, 0);
  close(loss.closing, 80_000);
  close(loss.tax, 0);
  close(loss.taxCredit, 3400);
  const recovery = calculateYear(loss.closing, 0.1, 0, loss.taxCredit);
  close(recovery.closing, 88_000);
  close(recovery.tax, 0);
  close(recovery.taxCredit, 2040);
  const profit = calculateYear(recovery.closing, 0.25, 0, recovery.taxCredit);
  close(profit.closing, 110_000);
  close(profit.tax, 1700);
  close(profit.taxCredit, 0);
});

test('ETF-omkostninger kan give tab selv ved nul markedsafkast', () => {
  const result = project({ ...defaults, annualReturn: 0, years: 1 });
  close(result.balance, 99_800);
  close(result.taxCredit, 34);
  close(result.totalTax, 0);
});

test('nul indbetaling og totalt tab giver aldrig negativ kontoværdi', () => {
  close(project({ ...defaults, deposit: 0 }).balance, 0);
  const result = project({ ...defaults, annualReturn: -100 });
  close(result.balance, 0);
  close(result.totalFees, 0);
  close(result.totalTax, 0);
  close(result.taxCredit, 17_000);
});

test('nul afkast uden gebyr bevarer indbetalingen', () => {
  close(project({ ...defaults, annualReturn: 0, annualFee: 0 }).balance, 100_000);
});

test('hele det tilladte interval giver endelige resultater', () => {
  for (const annualReturn of [-100, -20, 0, 50]) {
    const result = project({ deposit: DEPOSIT_LIMIT, annualReturn, annualFee: 10, years: 40 });
    assert.ok(Number.isFinite(result.balance));
    assert.ok(result.rows.every(row => row.closing >= 0 && row.tax >= 0));
  }
});

test('ugyldige værdier afvises', () => {
  for (const [field, values] of Object.entries({
    deposit: [-1, DEPOSIT_LIMIT + 1, NaN, Infinity, '100'],
    annualReturn: [-101, 51, NaN],
    annualFee: [-1, 11, Infinity],
    years: [0, 41, 1.5, NaN],
  })) {
    for (const value of values) {
      assert.throws(() => project({ ...defaults, [field]: value }), RangeError);
    }
  }
});
