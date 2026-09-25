export const TAX_RATE = 0.17;
export const DEPOSIT_LIMIT = 174_200;

export function calculateYear(opening, returnRate, feeRate, taxCredit = 0) {
  const gain = opening * returnRate;
  const fee = Math.max(0, opening + gain) * feeRate;
  const taxableGain = gain - fee;
  const assessedTax = taxableGain * TAX_RATE;
  const tax = Math.max(0, assessedTax - taxCredit);
  const closingCredit = Math.max(0, taxCredit - assessedTax);

  return {
    opening,
    gain,
    fee,
    taxableGain,
    tax,
    taxCredit: closingCredit,
    closing: Math.max(0, opening + taxableGain - tax),
  };
}

export function project({ deposit, annualReturn, annualFee, years }) {
  if (
    ![deposit, annualReturn, annualFee, years].every(Number.isFinite) ||
    deposit < 0 || deposit > DEPOSIT_LIMIT ||
    annualReturn < -100 || annualReturn > 50 ||
    annualFee < 0 || annualFee > 10 ||
    !Number.isInteger(years) || years < 1 || years > 40
  ) {
    throw new RangeError('Vælg gyldige værdier inden for felternes grænser.');
  }

  const rows = [];
  let balance = deposit;
  let taxCredit = 0;
  let beforeCosts = deposit;
  let totalTax = 0;
  let totalFees = 0;

  for (let year = 1; year <= years; year += 1) {
    const result = calculateYear(balance, annualReturn / 100, annualFee / 100, taxCredit);
    beforeCosts *= 1 + annualReturn / 100;
    balance = result.closing;
    taxCredit = result.taxCredit;
    totalTax += result.tax;
    totalFees += result.fee;
    rows.push({ year, ...result, beforeCosts });
  }

  return { rows, balance, totalTax, totalFees, taxCredit, change: balance - deposit };
}
