import { PaymentRequest } from '../types';

const fmt = (currency: string, amount: number) =>
  `${currency || 'GHS'} ${(Number(amount) || 0).toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;

/**
 * A plain, deterministic one-to-three sentence summary of a payment request,
 * built entirely from its own fields. No external service.
 */
export const computeRequestSummary = (r: PaymentRequest): string => {
  const parts: string[] = [];

  const requester = r.requesterName || 'A staff member';
  const dept = r.department ? ` from ${r.department}` : '';
  const vendor = r.vendorName || 'the named vendor';
  const project = r.billingProject ? ` for the ${r.billingProject} project` : '';
  parts.push(`${requester}${dept} requests ${fmt(r.currency, r.amount)} payable to ${vendor}${project}.`);

  const purpose = (r.requestSubject || r.description || '').trim();
  if (purpose) parts.push(`Purpose: ${purpose}.`);

  const part = Number(r.partPaymentPercentage);
  if (part > 0 && part < 100 && Number(r.fullRequestedAmount) > 0) {
    parts.push(`This is a part payment of ${part}% of a gross ${fmt(r.currency, r.fullRequestedAmount as number)}.`);
  }

  const wht = Number(r.withholdingTaxPercentage) || 0;
  const owht = Number(r.otherWithholdingTaxPercentage) || 0;
  if (wht > 0 || owht > 0) {
    const rates = [wht > 0 ? `${wht}%` : null, owht > 0 ? `${owht}%` : null].filter(Boolean).join(' and ');
    parts.push(`Withholding tax at ${rates} applies.`);
  }

  return parts.join(' ');
};
