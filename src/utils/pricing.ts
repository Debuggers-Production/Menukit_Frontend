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
  difference: number;
  refundAmount: number;
  additionalPayment: number;
  action: 'refund' | 'payment_due' | 'none';
  pricing: OrderPricingResult;
}

export function roundStrictTwoDecimals(val: number): number {
  if (isNaN(val)) return 0;
  const shifted = Math.abs(val) * 1000;
  const thirdDigit = Math.floor(shifted + 1e-9) % 10;
  if (thirdDigit > 5) {
    return Math.sign(val) * (Math.ceil(Math.abs(val) * 100 - 1e-9) / 100);
  } else {
    return Math.sign(val) * (Math.floor(Math.abs(val) * 100 + 1e-9) / 100);
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

  const platformFeeUnrounded = cleanSub * 0.02;
  const gatewayFeeUnrounded = cleanSub * 0.03;
  const gatewayGstUnrounded = gatewayFeeUnrounded * 0.18;
  const totalPgFeeUnrounded = gatewayFeeUnrounded + gatewayGstUnrounded;
  const totalPayableUnrounded = cleanSub + platformFeeUnrounded + totalPgFeeUnrounded;

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
  const newPricing = calculateOrderPricing(newSubtotal, isOnline);
  const newTotal = newPricing.totalPayable;

  const diff = roundStrictTwoDecimals(newTotal - origPaid);

  let refundAmount = 0;
  let additionalPayment = 0;
  let action: 'refund' | 'payment_due' | 'none' = 'none';

  if (diff < 0) {
    refundAmount = Math.abs(diff);
    action = 'refund';
  } else if (diff > 0) {
    additionalPayment = diff;
    action = 'payment_due';
  }

  return {
    oldSubtotal: roundStrictTwoDecimals(oldSubtotal),
    newSubtotal: roundStrictTwoDecimals(newSubtotal),
    originalPaidAmount: origPaid,
    newTotalPayable: newTotal,
    difference: diff,
    refundAmount,
    additionalPayment,
    action,
    pricing: newPricing,
  };
}
