import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateYear, project, DEPOSIT_LIMIT } from './calculator.js';

const defaults = { deposit: 100_000, annualReturn: 7, annualFee: 0.2, years: 10 };
const close = (actual, expected) => assert.ok(Math.abs(actual - expected) < 0.000001);

test('ETF-omkostning trækkes før 17 % skat af årets nettoafkast', () => {
  const result = project({ ...defaults, years: 1 });
  close(result.totalFees, 214);
  close(result.totalTax, 1153.62);
  close(result.balance, 105632.38);
});

test('skat og omkostninger reducerer den efterfølgende renters rente', () => {
  const result = project(defaults);
  close(result.balance, 100_000 * (1.0563238 ** 10));
  close(result.rows.at(-1).beforeCosts, 100_000 * (1.07 ** 10));
  close(result.balance, defaults.deposit + result.rows.reduce((sum, row) => sum + row.gain - row.fee - row.tax, 0));
});

test('tab giver fremført negativ skat, ikke kontant udbetaling', () => {
  const loss = calculateYear(100_000, -0.2, 0);
  close(loss.closing, 80_000);
  close(loss.tax, 0);
  close(loss.taxCredit, 3400);
  const recovery = calculateYear(loss.closing, 0.1, 0, loss.taxCredit);
  close(recovery.tax, 0);
  close(recovery.taxCredit, 2040);
  const profit = calculateYear(recovery.closing, 0.25, 0, recovery.taxCredit);
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
