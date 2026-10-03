/**
 * Centralized Order Pricing, Fee Calculation, and Replacement Engine (Frontend).
 * 
 * RULES:
 * - Platform fee = 2% of the item/order subtotal
 * - Payment gateway fee = 3% of the item/order subtotal
 * - GST = 18% of the payment gateway fee
 * - No other hidden fees.
 * - Total payable (online) = subtotal + platform_fee + gateway_fee + gateway_gst (equivalent: subtotal * 1.0554)
 * - Zero intermediate rounding; only final values rounded to 2 decimal places.
 * - Matches backend app/core/pricing.py exactly.
 */

export interface OrderPricingResult {
  subtotal: number;
  platformFeeUnrounded: number;
  gatewayFeeUnrounded: number;
  gatewayGstUnrounded: number;
  totalPgFeeUnrounded: number;
  totalPayableUnrounded: number;

  // Final rounded values for display & charging
  platformFee: number;
  gatewayFee: number;
  gatewayGst: number;
  totalPgFee: number;
  totalPayable: number;
  amountSubunits: number; // in paise
}

export interface ReplacementCalculationResult {
  oldSubtotal: number;
  newSubtotal: number;
  originalPaidAmount: number;
  newTotalPayable: number;
  productDifference: number; // Pure product difference without charges
  difference: number;        // Pure product difference shown on admin side
  refundAmount: number;      // Pure product refund amount
  additionalPayment: number; // Customer payable amount on extra difference with online charges included
  action: 'refund' | 'payment_due' | 'none';
  pricing: OrderPricingResult;
}

export function roundStrictTwoDecimals(val: number): number {
  if (isNaN(val) || val === null || val === undefined) return 0;
  const num = Number(val);
  const shifted = Math.abs(num) * 1000;
  const thirdDigit = Math.floor(shifted + 1e-9) % 10;
  if (thirdDigit > 5) {
    return Math.sign(num) * (Math.ceil(Math.abs(num) * 100 - 1e-9) / 100);
  } else {
    return Math.sign(num) * (Math.floor(Math.abs(num) * 100 + 1e-9) / 100);
  }
}

export function calculateOrderPricing(subtotal: number, isOnline = true): OrderPricingResult {
  const cleanSub = Math.max(0, Number(subtotal) || 0);

  if (!isOnline) {
    const roundedSub = roundStrictTwoDecimals(cleanSub);
    return {
      subtotal: roundedSub,
      platformFeeUnrounded: 0,
      gatewayFeeUnrounded: 0,
      gatewayGstUnrounded: 0,
      totalPgFeeUnrounded: 0,
      totalPayableUnrounded: cleanSub,
      platformFee: 0,
      gatewayFee: 0,
      gatewayGst: 0,
      totalPgFee: 0,
      totalPayable: roundedSub,
      amountSubunits: Math.round(roundedSub * 100),
    };
  }

  // 1. 2% Platform Fee
  const platformFeeUnrounded = cleanSub * 0.02;

  // 2. 3% Payment Gateway Fee
  const gatewayFeeUnrounded = cleanSub * 0.03;

  // 3. 18% GST on the 3% Payment Gateway Fee
  const gatewayGstUnrounded = gatewayFeeUnrounded * 0.18;

  // 4. Combined Total PG Fee
  const totalPgFeeUnrounded = gatewayFeeUnrounded + gatewayGstUnrounded;

  // 5. Total Unrounded
  const totalPayableUnrounded = cleanSub + platformFeeUnrounded + totalPgFeeUnrounded;

  // Strict > 5 rounding
  const roundedSub = roundStrictTwoDecimals(cleanSub);
  const roundedPlat = roundStrictTwoDecimals(platformFeeUnrounded);
  const roundedGw = roundStrictTwoDecimals(gatewayFeeUnrounded);
  const roundedGst = roundStrictTwoDecimals(gatewayGstUnrounded);
  const roundedTotalPg = roundStrictTwoDecimals(totalPgFeeUnrounded);
  const roundedPayable = roundStrictTwoDecimals(totalPayableUnrounded);

  return {
    subtotal: roundedSub,
    platformFeeUnrounded,
    gatewayFeeUnrounded,
    gatewayGstUnrounded,
    totalPgFeeUnrounded,
    totalPayableUnrounded,
    platformFee: roundedPlat,
    gatewayFee: roundedGw,
    gatewayGst: roundedGst,
    totalPgFee: roundedTotalPg,
    totalPayable: roundedPayable,
    amountSubunits: Math.round(roundedPayable * 100),
  };
}

export function calculateReplacement(
  originalPaidAmount: number,
  newSubtotal: number,
  oldSubtotal = 0,
  isOnline = true
): ReplacementCalculationResult {
  const origPaid = roundStrictTwoDecimals(Number(originalPaidAmount) || 0);
  const oldSub = roundStrictTwoDecimals(Number(oldSubtotal) || 0);
  const newSub = roundStrictTwoDecimals(Number(newSubtotal) || 0);

  // Pure product price difference without charges
  const productDiff = roundStrictTwoDecimals(newSub - oldSub);
  const newPricing = calculateOrderPricing(newSub, isOnline);

  let refundAmount = 0;
  let additionalPayment = 0;
  let action: 'refund' | 'payment_due' | 'none' = 'none';

  if (productDiff < 0) {
    // Cheaper item replacement: refund purely the product price difference without charges
    refundAmount = Math.abs(productDiff);
    action = 'refund';
  } else if (productDiff > 0) {
    // More expensive item replacement: extra product amount due (+ fee on the extra amount if online for customer)
    if (isOnline) {
      const extraPricing = calculateOrderPricing(productDiff, true);
      additionalPayment = extraPricing.totalPayable;
    } else {
      additionalPayment = productDiff;
    }
    action = 'payment_due';
  }

  return {
    oldSubtotal: oldSub,
    newSubtotal: newSub,
    originalPaidAmount: origPaid,
    newTotalPayable: newPricing.totalPayable,
    productDifference: productDiff,
    difference: productDiff, // Pure product difference shown on admin side
    refundAmount,
    additionalPayment,
    action,
    pricing: newPricing,
  };
}

export function calculateOrderReplacementCredit(items: any[] = [], isPaid = true): number {
  if (!items || !items.length) return 0;

  const activeItems = items.filter((it: any) => !it.is_cancelled);
  const replacedCancelled = items.filter(
    (it: any) => it.is_cancelled && String(it.cancellation_reason || '').startsWith('Replaced with')
  );

  let totalCredit = 0;
  for (const act of activeItems) {
    const actName = act.name || '';
    const actPrice = Number(act.price || 0);
    const actQty = Number(act.quantity || 1);
    const actTotal = actPrice * actQty;

    // Direct predecessor in replacedCancelled
    const predecessor = replacedCancelled.find((p: any) =>
      String(p.cancellation_reason || '').startsWith(`Replaced with ${actName}`)
    );

    if (predecessor) {
      const predPrice = Number(predecessor.price || 0);
      const predQty = Number(predecessor.quantity || 1);
      const predTotal = predPrice * predQty;
      totalCredit += Math.min(actTotal, predTotal);
    } else if (isPaid) {
      totalCredit += actTotal;
    }
  }

  return roundStrictTwoDecimals(totalCredit);
}

