import { PaymentRequest, RequestStatus } from '../types';

// ---------------------------------------------------------------------------
// SendREQ email templates (rendered client-side, sent via the Resend Edge
// Function). One branded template per approval stage, for two audiences:
//   - 'actor'     : the person who must act next (supervisor / authorizer / ED)
//   - 'requester' : the originator, kept informed as the request moves
// ---------------------------------------------------------------------------

export type EmailAudience = 'actor' | 'requester';
export interface EmailTemplate { subject: string; html: string; }

export interface StageEmailArgs {
  status: RequestStatus;
  audience: EmailAudience;
  recipientName: string;
  request: PaymentRequest;
  appUrl: string;
  reason?: string;
}

// Brand palette (from the YOTA wordmark)
const TEAL_DARK = '#006680';
const TEAL = '#00A88F';
const ORANGE = '#FA4515';
const INK = '#1f2937';
const MUTED = '#6b7280';
const BORDER = '#e5e7eb';
const BG = '#f3f4f6';

const esc = (v: unknown): string =>
  String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');

const money = (r: PaymentRequest): string => {
  const n = Number(r.amount) || 0;
  return `${esc(r.currency || 'GHS')} ${n.toLocaleString('en-GB', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

const dateOf = (iso: string): string => {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
};

const statusBadge = (status: RequestStatus): string => {
  let bg = '#FEF3C7', fg = '#92400E'; // pending (amber) default
  if (status === RequestStatus.APPROVED || status === RequestStatus.AUTHORIZED) {
    bg = '#DCFCE7'; fg = '#166534';
  } else if (status.toString().includes('Rejected')) {
    bg = '#FEE2E2'; fg = '#991B1B';
  } else if (status === RequestStatus.FROZEN) {
    bg = '#E0E7FF'; fg = '#3730A3';
  }
  return `<span style="display:inline-block;padding:4px 12px;border-radius:9999px;background:${bg};color:${fg};font-size:12px;font-weight:700;letter-spacing:.02em;">${esc(status)}</span>`;
};

const detailsTable = (r: PaymentRequest): string => {
  const row = (label: string, value: string) => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid ${BORDER};color:${MUTED};font-size:13px;width:42%;vertical-align:top;">${esc(label)}</td>
      <td style="padding:10px 0;border-bottom:1px solid ${BORDER};color:${INK};font-size:14px;font-weight:600;text-align:right;vertical-align:top;">${value}</td>
    </tr>`;
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 4px;">
      ${row('Subject', esc(r.requestSubject) || '&mdash;')}
      ${row('Vendor', esc(r.vendorName) || '&mdash;')}
      ${row('Amount', `<span style="color:${TEAL_DARK};font-size:16px;">${money(r)}</span>`)}
      ${row('Project', esc(r.billingProject) || '&mdash;')}
      ${row('Department', esc(r.department) || '&mdash;')}
      ${row('Requested by', esc(r.requesterName) || '&mdash;')}
      ${row('Date raised', dateOf(r.createdAt))}
      ${row('Reference', esc(r.id))}
      ${row('Current status', statusBadge(r.status))}
    </table>`;
};

const button = (label: string, url: string): string => `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px 0 8px;">
    <tr><td style="border-radius:8px;background:${ORANGE};">
      <a href="${esc(url)}" style="display:inline-block;padding:13px 26px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;border-radius:8px;">${esc(label)} &rarr;</a>
    </td></tr>
  </table>`;

const callout = (label: string, text: string): string => `
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">
    <tr><td style="padding:14px 16px;background:#FEF2F2;border-left:4px solid #DC2626;border-radius:6px;">
      <div style="color:#991B1B;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;margin-bottom:4px;">${esc(label)}</div>
      <div style="color:#7f1d1d;font-size:14px;line-height:1.5;">${esc(text)}</div>
    </td></tr>
  </table>`;

const shell = (opts: {
  previewText: string;
  recipientName: string;
  heading: string;
  intro: string;
  request: PaymentRequest;
  cta: { label: string; url: string };
  extra?: string;
}): string => `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>SendREQ notification</title>
</head>
<body style="margin:0;padding:0;background:${BG};">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(opts.previewText)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};padding:24px 12px;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid ${BORDER};font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <!-- header -->
        <tr><td style="background:${TEAL_DARK};padding:20px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:800;letter-spacing:.04em;">SendREQ</span>
          <span style="color:${TEAL};font-size:20px;font-weight:800;">.</span>
          <div style="color:#b9e6de;font-size:11px;margin-top:2px;">YOTA payment request workflow</div>
        </td></tr>
        <!-- body -->
        <tr><td style="padding:28px 32px 8px;">
          <h1 style="margin:0 0 6px;color:${INK};font-size:20px;font-weight:700;line-height:1.3;">${esc(opts.heading)}</h1>
          <p style="margin:0 0 4px;color:${MUTED};font-size:14px;">Hello ${esc(opts.recipientName) || 'there'},</p>
          <p style="margin:12px 0 0;color:${INK};font-size:15px;line-height:1.55;">${esc(opts.intro)}</p>
          ${opts.extra || ''}
          ${detailsTable(opts.request)}
          ${button(opts.cta.label, opts.cta.url)}
          <p style="margin:12px 0 0;color:${MUTED};font-size:12px;line-height:1.5;">If the button does not work, open SendREQ and go to your dashboard.</p>
        </td></tr>
        <!-- footer -->
        <tr><td style="padding:20px 32px;border-top:1px solid ${BORDER};">
          <p style="margin:0;color:${MUTED};font-size:12px;line-height:1.5;">This is an automated message from SendREQ. Please do not reply to this email.</p>
          <p style="margin:6px 0 0;color:#9ca3af;font-size:11px;">&copy; ${new Date().getFullYear()} YOTA - Youth Opportunity and Transformation in Africa.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

/**
 * Build the email for a given (status, audience). Returns null when no email is
 * defined for that combination (e.g. DRAFT, or a requester copy we do not send).
 */
export function buildStageEmail(args: StageEmailArgs): EmailTemplate | null {
  const { status, audience, recipientName, request, appUrl, reason } = args;
  const v = esc(request.vendorName) || 'a vendor';
  const amt = money(request);
  const base = { recipientName, request, cta: { label: 'Open SendREQ', url: appUrl } };

  switch (status) {
    case RequestStatus.PENDING_SUPERVISOR:
      if (audience !== 'actor') return null;
      return {
        subject: `Action needed: confirm payment request (${request.vendorName}, ${amt})`,
        html: shell({
          ...base,
          previewText: `${request.requesterName} submitted a request awaiting your confirmation.`,
          heading: 'A request needs your confirmation',
          intro: `${request.requesterName || 'A staff member'} has submitted a payment request for ${v}. It is awaiting your confirmation as supervisor before it moves to authorisation.`,
          cta: { label: 'Review and confirm', url: appUrl },
        }),
      };

    case RequestStatus.PENDING_AUTHORIZATION:
      if (audience === 'actor') {
        return {
          subject: `Action needed: authorise payment (${request.vendorName}, ${amt})`,
          html: shell({
            ...base,
            previewText: `A supervisor-confirmed request is awaiting your authorisation.`,
            heading: 'A request needs your authorisation',
            intro: `A payment request for ${v} has been confirmed by the supervisor and is now awaiting your authorisation.`,
            cta: { label: 'Review and authorise', url: appUrl },
          }),
        };
      }
      return {
        subject: `Update: your request was confirmed (${request.vendorName})`,
        html: shell({
          ...base,
          previewText: `Your request has moved to the authorisation stage.`,
          heading: 'Your request moved forward',
          intro: `Your payment request for ${v} has been confirmed by your supervisor and is now pending authorisation.`,
          cta: { label: 'View status', url: appUrl },
        }),
      };

    case RequestStatus.AUTHORIZED:
      if (audience === 'actor') {
        return {
          subject: `Action needed: final approval (${request.vendorName}, ${amt})`,
          html: shell({
            ...base,
            previewText: `An authorised request is awaiting your final approval.`,
            heading: 'A request needs your final approval',
            intro: `A payment request for ${v} has been authorised and is awaiting your final approval as Executive Director.`,
            cta: { label: 'Review and approve', url: appUrl },
          }),
        };
      }
      return {
        subject: `Update: your request was authorised (${request.vendorName})`,
        html: shell({
          ...base,
          previewText: `Your request has moved to the final approval stage.`,
          heading: 'Your request moved forward',
          intro: `Your payment request for ${v} has been authorised and is now awaiting final approval.`,
          cta: { label: 'View status', url: appUrl },
        }),
      };

    case RequestStatus.APPROVED:
      if (audience !== 'requester') return null;
      return {
        subject: `Approved: your payment request (${request.vendorName}, ${amt})`,
        html: shell({
          ...base,
          previewText: `Your payment request has received final approval.`,
          heading: 'Your request has been approved',
          intro: `Good news. Your payment request for ${v} (${amt}) has received final approval and is cleared for processing.`,
          cta: { label: 'View details', url: appUrl },
        }),
      };

    case RequestStatus.REJECTED_BY_SUPERVISOR:
    case RequestStatus.REJECTED_BY_AUTHORIZER:
    case RequestStatus.REJECTED_BY_APPROVER: {
      if (audience !== 'requester') return null;
      const stageName =
        status === RequestStatus.REJECTED_BY_SUPERVISOR ? 'supervisor'
        : status === RequestStatus.REJECTED_BY_AUTHORIZER ? 'authorisation'
        : 'final approval';
      return {
        subject: `Not approved: your request was returned (${request.vendorName})`,
        html: shell({
          ...base,
          previewText: `Your request was rejected at the ${stageName} stage.`,
          heading: `Your request was rejected at the ${stageName} stage`,
          intro: `Your payment request for ${v} was not approved. You can revise and resubmit it from your dashboard.`,
          cta: { label: 'Review and resubmit', url: appUrl },
          extra: reason ? callout('Reason given', reason) : '',
        }),
      };
    }

    case RequestStatus.FROZEN:
      if (audience !== 'requester') return null;
      return {
        subject: `On hold: your payment request (${request.vendorName})`,
        html: shell({
          ...base,
          previewText: `Your request has been placed on hold.`,
          heading: 'Your request has been frozen',
          intro: `Your payment request for ${v} has been placed on hold and is not progressing until it is released.`,
          cta: { label: 'View details', url: appUrl },
          extra: reason ? callout('Reason given', reason) : '',
        }),
      };

    default:
      return null;
  }
}
