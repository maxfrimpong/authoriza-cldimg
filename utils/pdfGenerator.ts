import { PaymentRequest, User } from '../types';

export const printPaymentRequest = (selectedRequest: PaymentRequest, users: User[], logoUrl: string) => {
    if (!selectedRequest) return;
    
    // Create a new window for printing
    const printWindow = window.open('', '_blank', 'width=900,height=800');
    if (!printWindow) return;

    const requesterName = selectedRequest.requesterName || selectedRequest.signOff;
    const supervisorName = users.find(u => u.id === selectedRequest.supervisorId)?.name || 'Unknown Supervisor';
    const authorizerName = users.find(u => u.id === selectedRequest.authorizerId)?.name || 'Unknown Authorizer';
    const approverName = selectedRequest.approverId ? users.find(u => u.id === selectedRequest.approverId)?.name : 'Executive Director';

    // Helper to generate signature HTML (image or text fallback)
    const getSigHtml = (sigBase64?: string, name?: string) => {
        // Layout: Relative container. Image absolute positioned above. Name at bottom with top border to act as line.
        const sigImg = sigBase64 ? `<img src="${sigBase64}" style="position: absolute; bottom: 5px; left: 50%; transform: translateX(-50%); max-height: 60px; max-width: 140px; z-index: 5;" alt="Signature" />` : '';
        const nameHtml = `<div style="border-top: 1px solid #333; padding-top: 5px; font-weight: bold; width: 100%; text-align: center; z-index: 1;">${name}</div>`;
        
        return `
            <div style="position: relative; height: 80px; width: 100%; display: flex; flex-direction: column; justify-content: flex-end;">
                ${sigImg}
                ${nameHtml}
            </div>
        `;
    };

    // Calculate broken down totals
    const sService = selectedRequest.billingItems?.reduce((acc, i) => (i.billingType === 'Service') ? acc + (i.unitCost * i.quantity * i.frequency) : acc, 0) || 0;
    const sGoods = selectedRequest.billingItems?.reduce((acc, i) => (i.billingType === 'Goods') ? acc + (i.unitCost * i.quantity * i.frequency) : acc, 0) || 0;
    const sNormal = selectedRequest.billingItems?.reduce((acc, i) => (i.billingType === 'Normal' || !i.billingType) ? acc + (i.unitCost * i.quantity * i.frequency) : acc, 0) || 0;

    // Percentages
    const partPaymentP = selectedRequest.partPaymentPercentage || 100;
    const partPaymentDec = partPaymentP / 100;
    
    const serviceTaxP = selectedRequest.withholdingTaxPercentage || 0;
    const otherTaxP = selectedRequest.otherWithholdingTaxPercentage || 0;

    // Part Payment Amounts
    const pService = sService * partPaymentDec;
    const pGoods = sGoods * partPaymentDec;
    const pNormal = sNormal * partPaymentDec;

    // Tax on Part Payments
    const serviceTax = pService * (serviceTaxP / 100);
    const otherTax = pGoods * (otherTaxP / 100);
    
    // Grand Total
    const grandTotal = (pService - serviceTax) + (pGoods - otherTax) + pNormal;
    
    // Outstanding
    const totalNetIfFull = (sService * (1 - serviceTaxP/100)) + (sGoods * (1 - otherTaxP/100)) + sNormal;
    const outstanding = totalNetIfFull - grandTotal;

    // Remaining Tax
    const remServiceTax = (sService - pService) * (serviceTaxP / 100);
    const remOtherTax = (sGoods - pGoods) * (otherTaxP / 100);
    const totalRemTax = remServiceTax + remOtherTax;
    const grossTotal = sService + sGoods + sNormal;
    
    // Check if balance request
    const isBal = selectedRequest.requestSubject.toLowerCase().includes('balance');


    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Payment Request - ${selectedRequest.requestSubject}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; }
          .header { display: flex; align-items: center; justify-content: space-between; border-bottom: 2px solid #006680; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { max-height: 60px; }
          .title { font-size: 24px; font-weight: bold; color: #006680; text-transform: uppercase; }
          .meta-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
          .meta-item { font-size: 14px; }
          .meta-label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; display: block; margin-bottom: 4px; }
          .meta-value { font-weight: bold; font-size: 15px; }
          .section-title { font-size: 16px; font-weight: bold; border-bottom: 1px solid #ccc; padding-bottom: 5px; margin-bottom: 10px; margin-top: 20px; color: #00a88f; }
          .description { background: #f9f9f9; padding: 15px; border-radius: 4px; border: 1px solid #eee; margin-bottom: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
          th { text-align: left; background: #006680; color: white; padding: 8px; font-size: 12px; text-transform: uppercase; }
          td { border-bottom: 1px solid #eee; padding: 8px; font-size: 13px; }
          .text-right { text-align: right; }
          .totals-section { margin-top: 20px; display: flex; justify-content: flex-end; }
          .totals-table { width: 450px; border: none; }
          .totals-table td { border: none; padding: 4px 8px; }
          .grand-total { font-size: 16px; font-weight: bold; color: #006680; border-top: 2px solid #333; padding-top: 8px; }
          .signatures { margin-top: 60px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; page-break-inside: avoid; }
          .sig-box { padding-top: 10px; text-align: center; display: flex; flex-direction: column; align-items: center; justify-content: flex-start; height: 100px; }
          .sig-role { font-size: 10px; color: #666; text-transform: uppercase; letter-spacing: 1px; margin-top: auto; }
          .sig-img-container { flex: 1; display: flex; align-items: center; justify-content: center; width: 100%; }
        </style>
      </head>
      <body>
        <div class="header">
           <img src="${logoUrl}" class="logo" alt="Logo" />
           <div class="title">Payment Request Voucher</div>
        </div>

        <div class="meta-grid">
           <div class="meta-item">
              <span class="meta-label">Request ID</span>
              <span class="meta-value">#${selectedRequest.id}</span>
           </div>
           <div class="meta-item">
              <span class="meta-label">Date Approved</span>
              <span class="meta-value">${new Date(selectedRequest.updatedAt).toLocaleDateString()}</span>
           </div>
           <div class="meta-item">
              <span class="meta-label">Subject</span>
              <span class="meta-value">${selectedRequest.requestSubject}</span>
           </div>
           <div class="meta-item">
              <span class="meta-label">Billing Project</span>
              <span class="meta-value">${selectedRequest.billingProject}</span>
           </div>
           <div class="meta-item">
              <span class="meta-label">Vendor</span>
              <span class="meta-value">
                ${selectedRequest.vendorName}
                ${selectedRequest.vendorTin ? `<br/><span style="font-size: 11px; font-weight: normal; color: #555;">TIN: ${selectedRequest.vendorTin}</span>` : ''}
              </span>
           </div>
           <div class="meta-item">
              <span class="meta-label">Payment Details</span>
              <span class="meta-value" style="font-family: monospace; font-size: 13px;">${selectedRequest.paymentDetails}</span>
           </div>
        </div>

        <div class="section-title">Description</div>
        <div class="description">${selectedRequest.description}</div>

        <div class="section-title">Billing Items</div>
        <table>
           <thead>
             <tr>
               <th>Item</th>
               <th>Type</th>
               <th class="text-right">Unit Cost</th>
               <th class="text-right">Qty</th>
               <th class="text-right">Freq</th>
               <th class="text-right">Total</th>
             </tr>
           </thead>
           <tbody>
             ${selectedRequest.billingItems ? selectedRequest.billingItems.map(item => `
               <tr>
                 <td>${item.description}</td>
                 <td>${item.billingType || 'Normal'}</td>
                 <td class="text-right">${item.unitCost.toLocaleString()}</td>
                 <td class="text-right">${item.quantity}</td>
                 <td class="text-right">${item.frequency}</td>
                 <td class="text-right">${(item.unitCost * item.quantity * item.frequency).toLocaleString()}</td>
               </tr>
             `).join('') : ''}
           </tbody>
        </table>

        <div class="totals-section">
           <table class="totals-table">
              ${(sService > 0 || serviceTaxP > 0) ? `
              <tr>
                 <td class="text-right">Sub-Total for Services:</td>
                 <td class="text-right"><b>${selectedRequest.currency} ${sService.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td>
              </tr>
              <tr>
                 <td class="text-right" style="font-size: 11px; color: #666;">Part Payment of Services (${partPaymentP}%):</td>
                 <td class="text-right" style="font-size: 11px;">${selectedRequest.currency} ${pService.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              <tr>
                 <td class="text-right">
                    Services WHT (${serviceTaxP}%):
                 </td>
                 <td class="text-right" style="color: #fa4515;">- ${selectedRequest.currency} ${serviceTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              <tr><td colspan="2" style="height: 10px;"></td></tr>
              ` : ''}

              ${(sGoods > 0 || otherTaxP > 0) ? `
              <tr>
                 <td class="text-right">Sub-Total for Goods:</td>
                 <td class="text-right"><b>${selectedRequest.currency} ${sGoods.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td>
              </tr>
              <tr>
                 <td class="text-right" style="font-size: 11px; color: #666;">Part Payment of Goods (${partPaymentP}%):</td>
                 <td class="text-right" style="font-size: 11px;">${selectedRequest.currency} ${pGoods.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              <tr>
                 <td class="text-right">
                    Other WHT (${otherTaxP}%):
                 </td>
                 <td class="text-right" style="color: #fa4515;">- ${selectedRequest.currency} ${otherTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              <tr><td colspan="2" style="height: 10px;"></td></tr>
              ` : ''}

              ${sNormal > 0 ? `
              <tr>
                 <td class="text-right">Sub-Total for Normal:</td>
                 <td class="text-right"><b>${selectedRequest.currency} ${sNormal.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td>
              </tr>
              <tr>
                 <td class="text-right" style="font-size: 11px; color: #666;">Part Payment of Normal (${partPaymentP}%):</td>
                 <td class="text-right" style="font-size: 11px;">${selectedRequest.currency} ${pNormal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
              <tr><td colspan="2" style="height: 10px;"></td></tr>
              ` : ''}

              <tr style="border-top: 1px solid #ccc;">
                 <td class="text-right" style="padding-top: 8px;"><b>Gross Sub-Total:</b></td>
                 <td class="text-right" style="padding-top: 8px;"><b>${selectedRequest.currency} ${grossTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</b></td>
              </tr>
              <tr>
                 <td class="text-right">Total Part Payment:</td>
                 <td class="text-right">${partPaymentP}%</td>
              </tr>

              <tr>
                 <td class="text-right grand-total">Grand Total Due:</td>
                 <td class="text-right grand-total">${selectedRequest.currency} ${grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>

              <tr>
                 <td class="text-right" style="color: #666;">${isBal ? 'Initial Payment' : 'Outstanding Payment'}:</td>
                 <td class="text-right" style="color: #666; font-weight: bold;">${selectedRequest.currency} ${outstanding.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
               <tr>
                 <td class="text-right" style="color: #999; font-size: 11px;">${isBal ? 'Initial WHT Paid' : 'Remaining WHT Amount'}:</td>
                 <td class="text-right" style="color: #999; font-size: 11px;">${selectedRequest.currency} ${totalRemTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
              </tr>
           </table>
        </div>

        <div class="signatures">
           <div class="sig-box">
              <div class="sig-img-container">${getSigHtml(selectedRequest.requesterSignature, requesterName)}</div>
              <div class="sig-role">Requester</div>
           </div>
           <div class="sig-box">
              <div class="sig-img-container">${getSigHtml(selectedRequest.supervisorSignature, supervisorName)}</div>
              <div class="sig-role">Supervisor</div>
           </div>
           <div class="sig-box">
              <div class="sig-img-container">${getSigHtml(selectedRequest.authorizerSignature, authorizerName)}</div>
              <div class="sig-role">Authorizer</div>
           </div>
           <div class="sig-box">
              <div class="sig-img-container">${getSigHtml(selectedRequest.approverSignature, approverName)}</div>
              <div class="sig-role">Approver</div>
           </div>
        </div>

        <div style="margin-top: 40px; font-size: 11px; color: #999; text-align: center;">
           Generated by SendREQ System on ${new Date().toLocaleString()}
        </div>

        <script>
            window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
};