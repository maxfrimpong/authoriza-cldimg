import { buildStageEmail, StageEmailArgs } from '../services/emailTemplates';
import { PaymentRequest, RequestStatus } from '../types';
import { writeFileSync } from 'node:fs';

const baseReq: PaymentRequest = {
  id: 'r1730500000000',
  requesterId: 'u1', requesterName: 'Ama Boateng',
  department: 'Projects', position: 'Project Officer',
  vendorName: 'Accra Print Works Ltd', vendorTin: 'C0012345678',
  paymentDetails: 'Bank transfer', amount: 18450, fullRequestedAmount: 18450,
  currency: 'GHS', billingProject: 'Skills Hub',
  requestSubject: 'Training materials for the Q4 cohort',
  description: 'Printing of 500 participant workbooks and event banners.',
  billingItems: [], withholdingTaxPercentage: 0, otherWithholdingTaxPercentage: 0,
  partPaymentPercentage: 100, files: [], supervisorId: 'u2', authorizerId: 'u3',
  status: RequestStatus.PENDING_SUPERVISOR,
  createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  signOff: 'Ama Boateng', editCount: 0,
};

const appUrl = 'https://authoriza.yotaweb.org/#/';

type Case = { label: string; args: StageEmailArgs };
const cases: Case[] = [
  { label: '1. New request → Supervisor (confirm)', args: { status: RequestStatus.PENDING_SUPERVISOR, audience: 'actor', recipientName: 'Kofi Mensah', request: { ...baseReq, status: RequestStatus.PENDING_SUPERVISOR }, appUrl } },
  { label: '2. Confirmed → Authorizer (authorise)', args: { status: RequestStatus.PENDING_AUTHORIZATION, audience: 'actor', recipientName: 'Yaa Asante', request: { ...baseReq, status: RequestStatus.PENDING_AUTHORIZATION }, appUrl } },
  { label: '3. Authorised → Approver/ED (final approval)', args: { status: RequestStatus.AUTHORIZED, audience: 'actor', recipientName: 'Dr Nana Owusu', request: { ...baseReq, status: RequestStatus.AUTHORIZED }, appUrl } },
  { label: '4. Approved → Requester (personal)', args: { status: RequestStatus.APPROVED, audience: 'requester', recipientName: 'Ama Boateng', request: { ...baseReq, status: RequestStatus.APPROVED }, appUrl } },
  { label: '5. Approved → Supervisor / Finance Manager (informational)', args: { status: RequestStatus.APPROVED, audience: 'actor', recipientName: 'Kofi Mensah', request: { ...baseReq, status: RequestStatus.APPROVED }, appUrl } },
  { label: '6. Rejected (Supervisor) → Requester', args: { status: RequestStatus.REJECTED_BY_SUPERVISOR, audience: 'requester', recipientName: 'Ama Boateng', request: { ...baseReq, status: RequestStatus.REJECTED_BY_SUPERVISOR }, appUrl, reason: 'Vendor TIN does not match the invoice. Please correct and resubmit.' } },
  { label: '7. Rejected (Authorizer) → Requester', args: { status: RequestStatus.REJECTED_BY_AUTHORIZER, audience: 'requester', recipientName: 'Ama Boateng', request: { ...baseReq, status: RequestStatus.REJECTED_BY_AUTHORIZER }, appUrl, reason: 'Budget line for Skills Hub is exhausted this quarter.' } },
  { label: '8. Rejected (Approver/ED) → Requester', args: { status: RequestStatus.REJECTED_BY_APPROVER, audience: 'requester', recipientName: 'Ama Boateng', request: { ...baseReq, status: RequestStatus.REJECTED_BY_APPROVER }, appUrl, reason: 'Hold all non-essential print spend pending the October review.' } },
  { label: '9. Frozen → Requester', args: { status: RequestStatus.FROZEN, audience: 'requester', recipientName: 'Ama Boateng', request: { ...baseReq, status: RequestStatus.FROZEN }, appUrl, reason: 'Awaiting confirmation of delivery before release.' } },
];

const forAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

const cards = cases.map((c) => {
  const tpl = buildStageEmail(c.args);
  if (!tpl) return '';
  return `
  <section class="card">
    <div class="meta">
      <div class="label">${c.label}</div>
      <div class="subject"><span>Subject:</span> ${tpl.subject.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</div>
    </div>
    <iframe srcdoc="${forAttr(tpl.html)}" title="${c.label}"></iframe>
  </section>`;
}).join('\n');

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Authoriza email templates preview</title>
<style>
  body{margin:0;background:#eef1f4;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color:#111827;}
  header{background:#006680;color:#fff;padding:20px 24px;}
  header h1{margin:0;font-size:18px;}
  header p{margin:4px 0 0;font-size:13px;color:#b9e6de;}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(360px,1fr));gap:20px;padding:24px;}
  .card{background:#fff;border:1px solid #e5e7eb;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;}
  .meta{padding:12px 16px;border-bottom:1px solid #eef1f4;}
  .label{font-weight:700;font-size:14px;}
  .subject{font-size:12px;color:#6b7280;margin-top:4px;}
  .subject span{font-weight:600;color:#374151;}
  iframe{width:100%;height:760px;border:0;background:#f3f4f6;}
</style></head>
<body>
  <header><h1>Authoriza email templates (Resend)</h1><p>One template per approval stage. Preview with sample data.</p></header>
  <div class="grid">${cards}</div>
</body></html>`;

const out = process.argv[2] || 'email-preview.html';
writeFileSync(out, page);
console.log(`Wrote ${out} (${cases.length} templates)`);
