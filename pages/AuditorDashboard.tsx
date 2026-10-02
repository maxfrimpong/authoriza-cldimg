import React, { useState, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { RequestStatus, PaymentRequest } from '../types';
import { Eye, XCircle, Printer } from 'lucide-react';
import { printPaymentRequest } from '../utils/pdfGenerator';
import { useSearchParams } from 'react-router-dom';

export const AuditorDashboard = () => {
  const { requests, users, logoUrl } = useApp();
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();

  // Handle URL Request ID
  useEffect(() => {
      const requestId = searchParams.get('requestId');
      if (requestId && requests.length > 0) {
          const req = requests.find(r => r.id === requestId);
          if (req) setSelectedRequest(req);
      }
  }, [searchParams, requests]);

  const approvedRequests = requests.filter(r => r.status === RequestStatus.APPROVED);

  const handlePrint = () => {
    if (!selectedRequest) return;
    printPaymentRequest(selectedRequest, users, logoUrl);
  };

  const closeDetails = () => {
    setSelectedRequest(null);
    setSearchParams(params => {
        params.delete('requestId');
        return params;
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Auditor Portal</h2>
        <p className="text-gray-500 text-sm">Review and download approved payment records</p>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
            <h3 className="font-semibold text-gray-800">Approved Requests Repository</h3>
            <span className="bg-brand-teal/10 text-brand-teal text-xs px-2 py-1 rounded-full font-bold">{approvedRequests.length} Records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Approved Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-brand-teal">Project</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {approvedRequests.length === 0 ? <tr><td colSpan={6} className="px-6 py-12 text-center text-gray-400">No approved requests available yet.</td></tr> : approvedRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(req.updatedAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{req.requestSubject}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{req.vendorName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-bold">{req.currency} {req.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-brand-teal">{req.billingProject}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => setSelectedRequest(req)} className="text-brand-dark hover:text-brand-teal flex items-center justify-end w-full"><Eye size={16} className="mr-1" /> View</button>
                    </td>
                    </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4">
             <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b">
                    <div><h3 className="text-xl font-bold text-gray-900">Request Details</h3><span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-teal/10 text-brand-teal mt-1">Verified Approved</span></div>
                    <button onClick={closeDetails} className="text-gray-400 hover:text-gray-600"><XCircle size={24} /></button>
                </div>
                
                <div className="p-6 space-y-6">
                     <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="col-span-2 md:col-span-1"><label className="block text-gray-500 text-xs uppercase font-bold">Subject</label><p className="text-gray-900 font-medium text-lg">{selectedRequest.requestSubject}</p></div>
                        <div className="col-span-2 md:col-span-1 text-right"><label className="block text-gray-500 text-xs uppercase font-bold">Total Amount</label><p className="text-brand-teal font-bold text-2xl">{selectedRequest.currency} {selectedRequest.amount.toLocaleString()}</p></div>
                        <div><label className="block text-gray-500 text-xs uppercase font-bold">Billing Project</label><p className="text-gray-900">{selectedRequest.billingProject}</p></div>
                        <div>
                            <label className="block text-gray-500 text-xs uppercase font-bold">Vendor</label>
                            <p className="text-gray-900">{selectedRequest.vendorName}</p>
                            {selectedRequest.vendorTin && <p className="text-gray-500 text-xs mt-1">TIN: {selectedRequest.vendorTin}</p>}
                        </div>
                        <div className="col-span-2"><label className="block text-gray-500 text-xs uppercase font-bold">Payment Details</label><p className="text-gray-700 bg-gray-50 p-2 rounded border border-gray-100 font-mono text-xs">{selectedRequest.paymentDetails}</p></div>
                        <div className="col-span-2"><label className="block text-gray-500 text-xs uppercase font-bold">Full Requested Amount</label><p className="text-gray-900 font-bold">{selectedRequest.currency} {(selectedRequest.fullRequestedAmount || selectedRequest.amount).toLocaleString()}</p></div>
                     </div>

                     {selectedRequest.billingItems && (
                         <div className="border border-gray-200 rounded-lg overflow-hidden">
                             <table className="min-w-full divide-y divide-gray-200">
                                 <thead className="bg-gray-50">
                                     <tr>
                                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                                         <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                                         <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                                         <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Freq</th>
                                         <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-200 bg-white">
                                     {selectedRequest.billingItems.map((item, idx) => (
                                         <tr key={idx}>
                                             <td className="px-3 py-2 text-sm">{item.description}</td>
                                             <td className="px-3 py-2 text-sm text-gray-500">{item.billingType || 'Normal'}</td>
                                             <td className="px-3 py-2 text-sm text-right">{item.unitCost.toLocaleString()}</td>
                                             <td className="px-3 py-2 text-sm text-right">{item.quantity}</td>
                                             <td className="px-3 py-2 text-sm text-right">{item.frequency}</td>
                                             <td className="px-3 py-2 text-sm text-right">{(item.unitCost * item.quantity * item.frequency).toLocaleString()}</td>
                                         </tr>
                                     ))}
                                     {(() => {
                                         const sService = selectedRequest.billingItems!.reduce((acc, i) => (i.billingType === 'Service') ? acc + (i.unitCost * i.quantity * i.frequency) : acc, 0);
                                         const sGoods = selectedRequest.billingItems!.reduce((acc, i) => (i.billingType === 'Goods') ? acc + (i.unitCost * i.quantity * i.frequency) : acc, 0);
                                         const sNormal = selectedRequest.billingItems!.reduce((acc, i) => (i.billingType === 'Normal' || !i.billingType) ? acc + (i.unitCost * i.quantity * i.frequency) : acc, 0);

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

                                         return (
                                            <>
                                                 {(sService > 0 || serviceTaxP > 0) && (
                                                     <>
                                                         <tr className="bg-blue-50/50">
                                                             <td colSpan={6} className="px-3 py-1 text-right text-xs font-medium text-gray-700">Sub-Total for Services: {selectedRequest.currency} {sService.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                         </tr>
                                                         <tr className="bg-blue-50/50">
                                                             <td colSpan={6} className="px-3 py-1 text-right text-xs text-gray-600">Part Payment of Services ({partPaymentP}%): <span className="font-medium text-gray-900">{selectedRequest.currency} {pService.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></td>
                                                         </tr>
                                                         <tr className="bg-blue-50/50">
                                                             <td colSpan={6} className="px-3 py-1 text-right text-xs text-gray-500">Services WHT ({serviceTaxP}%): <span className="text-red-500">-{selectedRequest.currency} {serviceTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></td>
                                                         </tr>
                                                     </>
                                                 )}
                                                 {(sGoods > 0 || otherTaxP > 0) && (
                                                     <>
                                                         <tr className="bg-orange-50/50">
                                                             <td colSpan={6} className="px-3 py-1 text-right text-xs font-medium text-gray-700">Sub-Total for Goods: {selectedRequest.currency} {sGoods.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                         </tr>
                                                         <tr className="bg-orange-50/50">
                                                             <td colSpan={6} className="px-3 py-1 text-right text-xs text-gray-600">Part Payment of Goods ({partPaymentP}%): <span className="font-medium text-gray-900">{selectedRequest.currency} {pGoods.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></td>
                                                         </tr>
                                                         <tr className="bg-orange-50/50">
                                                             <td colSpan={6} className="px-3 py-1 text-right text-xs text-gray-500">Other WHT ({otherTaxP}%): <span className="text-red-500">-{selectedRequest.currency} {otherTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></td>
                                                         </tr>
                                                     </>
                                                 )}
                                                 {sNormal > 0 && (
                                                     <tr className="bg-gray-50">
                                                         <td colSpan={6} className="px-3 py-1 text-right text-xs font-medium text-gray-700">
                                                             Sub-Total for Normal: {selectedRequest.currency} {sNormal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                             <br/>
                                                             <span className="text-gray-500 font-normal">Part Payment of Normal ({partPaymentP}%): {selectedRequest.currency} {pNormal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                                         </td>
                                                     </tr>
                                                 )}
                                                 
                                                 <tr className="bg-gray-100 border-t border-gray-200">
                                                     <td colSpan={6} className="px-3 py-1 text-right text-xs font-bold text-gray-800">Gross Sub-Total</td>
                                                     <td className="px-3 py-1 text-right text-xs font-bold text-gray-900">{selectedRequest.currency} {grossTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                 </tr>
                                                 
                                                 <tr className="bg-gray-100">
                                                     <td colSpan={6} className="px-3 py-1 text-right text-xs font-medium text-gray-700">Total Part Payment (%)</td>
                                                     <td className="px-3 py-1 text-right text-xs text-gray-500">{partPaymentP}%</td>
                                                 </tr>

                                                 <tr className="bg-gray-200 font-bold border-t border-gray-300">
                                                     <td colSpan={6} className="px-3 py-1 text-right text-xs text-gray-900">Grand Total Due</td>
                                                     <td className="px-3 py-1 text-right text-xs text-brand-teal">{selectedRequest.currency} {grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                 </tr>

                                                 <tr className="bg-gray-50 border-t border-gray-200">
                                                     <td colSpan={6} className="px-3 py-1 text-right text-xs font-medium text-gray-500">{isBal ? 'Initial Payment' : 'Outstanding Payment'}</td>
                                                     <td className="px-3 py-1 text-right text-xs text-gray-500 font-bold">{selectedRequest.currency} {outstanding.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                 </tr>

                                                 <tr className="bg-gray-50">
                                                     <td colSpan={6} className="px-3 py-1 text-right text-xs font-medium text-gray-400">{isBal ? 'Initial WHT Paid' : 'Remaining WHT Amount'}</td>
                                                     <td className="px-3 py-1 text-right text-xs text-gray-400">{selectedRequest.currency} {totalRemTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                 </tr>
                                            </>
                                         );
                                     })()}
                                 </tbody>
                             </table>
                         </div>
                     )}
                </div>
                <div className="p-4 md:p-6 border-t bg-gray-50 flex justify-between items-center sticky bottom-0">
                    <button onClick={handlePrint} className="flex items-center space-x-2 bg-brand-dark text-white px-4 py-2 rounded shadow hover:bg-[#004d61]">
                        <Printer size={16} /><span>Download PDF</span>
                    </button>
                    <button onClick={closeDetails} className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100 bg-white">Close</button>
                </div>
             </div>
        </div>
      )}
    </div>
  );
};