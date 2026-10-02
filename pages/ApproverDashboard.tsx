import React, { useState, useEffect, useRef } from 'react';
import { useApp } from '../context/AppContext';
import { RequestStatus, PaymentRequest, RequestFile } from '../types';
import { summarizeRequest } from '../services/geminiService';
import { CheckCircle, XCircle, Sparkles, Loader2, FileText, Download, X, Eye, Printer, PenTool, CreditCard, Info } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { printPaymentRequest } from '../utils/pdfGenerator';
import { useSearchParams } from 'react-router-dom';

export const ApproverDashboard = () => {
  const { requests, updateRequestStatus, users, logoUrl } = useApp();
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [geminiSummary, setGeminiSummary] = useState<string>('');
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [remarks, setRemarks] = useState('');
  const [action, setAction] = useState<'APPROVE' | 'REJECT' | null>(null);
  const [signature, setSignature] = useState<string>('');
  const [previewFile, setPreviewFile] = useState<RequestFile | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
      const requestId = searchParams.get('requestId');
      if (requestId && requests.length > 0) {
          const req = requests.find(r => r.id === requestId);
          if (req) setSelectedRequest(req);
      }
  }, [searchParams, requests]);

  const pendingApprovals = requests.filter(r => r.status === RequestStatus.AUTHORIZED);
  const historyRequests = requests.filter(r => r.status === RequestStatus.APPROVED || r.status === RequestStatus.REJECTED_BY_APPROVER);
  
  const totalAmountApproved = requests.filter(r => r.status === RequestStatus.APPROVED).reduce((acc, r) => acc + r.amount, 0);
  const totalPendingAmount = pendingApprovals.reduce((acc, r) => acc + r.amount, 0);
  
  const statusDataMap: Record<string, number> = {};
  requests.forEach(r => {
      let key = r.status.toString();
      if(key.includes('Rejected')) key = 'Rejected';
      statusDataMap[key] = (statusDataMap[key] || 0) + 1;
  });
  const statusData = Object.keys(statusDataMap).map(key => ({ name: key, count: statusDataMap[key] }));

  useEffect(() => {
    if (selectedRequest && selectedRequest.status === RequestStatus.AUTHORIZED) {
      setGeminiSummary(''); 
      setIsSummarizing(true);
      summarizeRequest(selectedRequest).then(summary => setGeminiSummary(summary)).finally(() => setIsSummarizing(false));
    }
  }, [selectedRequest]);

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.type !== 'image/png') {
              alert('Please upload a PNG file.');
              return;
          }
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => setSignature(reader.result as string);
      }
  };

  const handleFinish = () => {
    if(!selectedRequest || !action) return;
    if (action === 'APPROVE' && !signature) {
        alert("Signature required.");
        return;
    }
    const status = action === 'APPROVE' ? RequestStatus.APPROVED : RequestStatus.REJECTED_BY_APPROVER;
    updateRequestStatus(selectedRequest.id, status, remarks, action === 'APPROVE' ? signature : undefined);
    setSelectedRequest(null);
    setAction(null);
    setRemarks('');
    setSignature('');
  };

  const handlePrintPdf = () => {
      if (selectedRequest) printPaymentRequest(selectedRequest, users, logoUrl);
  };

  const handleDownload = (file: RequestFile) => {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const closeDetails = () => {
    setSelectedRequest(null);
    setSearchParams(params => { params.delete('requestId'); return params; });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div>
           <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Executive Dashboard</h2>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Organization Overview & Strategic Approvals</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Awaiting Decision</h3>
            <p className="text-3xl font-bold text-brand-dark dark:text-brand-teal mt-2">GHS {totalPendingAmount.toLocaleString()}</p>
            <p className="text-sm text-gray-400 mt-1">{pendingApprovals.length} requests pending</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
            <h3 className="text-gray-500 dark:text-gray-400 text-xs font-bold uppercase tracking-wider">Approved Capital</h3>
            <p className="text-3xl font-bold text-brand-teal mt-2">GHS {totalAmountApproved.toLocaleString()}</p>
            <p className="text-sm text-gray-400 mt-1">Life-to-date approvals</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
             <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusData}><Bar dataKey="count" fill="#00a88f" radius={[4, 4, 0, 0]} /></BarChart>
             </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden h-[600px] flex flex-col border border-gray-100 dark:border-gray-700">
             <div className="p-4 bg-gray-50 dark:bg-gray-900 border-b dark:border-gray-700"><h3 className="font-bold text-gray-700 dark:text-gray-300">Approval Queue</h3></div>
             <div className="divide-y dark:divide-gray-700 overflow-y-auto flex-1">
                {pendingApprovals.length === 0 ? <div className="p-8 text-center text-gray-400">Queue empty</div> : pendingApprovals.map(req => (
                    <div key={req.id} onClick={() => setSelectedRequest(req)} className={`p-4 cursor-pointer hover:bg-brand-teal/5 transition-colors border-l-4 ${selectedRequest?.id === req.id ? 'bg-brand-teal/5 border-brand-teal' : 'border-transparent'}`}>
                        <div className="flex justify-between items-start"><h4 className="font-bold text-gray-900 dark:text-white truncate pr-2">{req.requestSubject}</h4><span className="font-bold text-brand-teal text-xs whitespace-nowrap">{req.currency} {req.amount.toLocaleString()}</span></div>
                        <p className="text-xs text-gray-500 mt-1">{req.vendorName}</p>
                    </div>
                ))}
             </div>
        </div>

        <div className="lg:col-span-8 bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 h-[600px] flex flex-col border border-gray-100 dark:border-gray-700">
            {!selectedRequest ? (
                <div className="h-full flex flex-col items-center justify-center text-gray-300 dark:text-gray-600">
                    <Sparkles size={64} className="mb-4 opacity-20" /><p className="text-lg">Select a request to initiate review</p>
                </div>
            ) : (
                <div className="flex-1 overflow-y-auto space-y-6 pr-2 custom-scrollbar">
                    {selectedRequest.status === RequestStatus.AUTHORIZED && (
                        <div className="bg-gradient-to-br from-brand-teal/10 to-brand-dark/10 p-5 rounded-2xl border border-brand-teal/20 relative overflow-hidden shadow-inner shrink-0">
                            <div className="flex items-center space-x-2 text-brand-dark dark:text-brand-teal font-bold mb-2"><Sparkles size={18} /><span>Executive AI Insight</span></div>
                            {isSummarizing ? <div className="flex items-center space-x-3 text-brand-teal py-2 animate-pulse"><Loader2 size={18} className="animate-spin" /><span>Consulting Gemini...</span></div> : <p className="text-gray-800 dark:text-gray-200 leading-relaxed text-sm">{geminiSummary}</p>}
                            <div className="absolute top-0 right-0 p-4 opacity-5"><Sparkles size={120} className="text-brand-teal"/></div>
                        </div>
                    )}
                    
                    <div className="flex items-center justify-between border-b dark:border-gray-700 pb-4 shrink-0">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">{selectedRequest.requestSubject}</h3>
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${selectedRequest.status === RequestStatus.APPROVED ? 'bg-brand-teal/10 text-brand-teal' : 'bg-brand-orange/10 text-brand-orange'}`}>{selectedRequest.status}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm shrink-0">
                         <div><span className="text-gray-500 block text-xs font-bold uppercase">Requester</span><div className="font-medium text-gray-900 dark:text-white">{selectedRequest.requesterName} ({selectedRequest.department})</div></div>
                         <div><span className="text-gray-500 block text-xs font-bold uppercase">Project</span><div className="font-medium text-brand-teal">{selectedRequest.billingProject}</div></div>
                         <div className="col-span-2"><span className="text-gray-500 block text-xs font-bold uppercase">Vendor</span><div className="font-medium text-gray-900 dark:text-white">{selectedRequest.vendorName} {selectedRequest.vendorTin && <span className="font-normal text-gray-400 text-xs ml-2">({selectedRequest.vendorTin})</span>}</div></div>
                         <div className="col-span-2">
                             <span className="text-gray-500 block text-xs font-bold uppercase">Payment Details</span>
                             <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-gray-100 dark:border-gray-700 font-mono text-xs mt-1 text-gray-700 dark:text-gray-300">
                                {selectedRequest.paymentDetails}
                             </div>
                         </div>
                    </div>

                    <div className="space-y-4 shrink-0">
                        <div>
                            <span className="text-gray-500 block text-xs font-bold uppercase mb-1">Description / Memo Content</span>
                            <p className="text-gray-700 dark:text-gray-300 text-sm bg-gray-50 dark:bg-gray-700/30 p-3 rounded-lg border border-gray-100 dark:border-gray-700 leading-relaxed">
                                {selectedRequest.description}
                            </p>
                        </div>

                        {selectedRequest.billingItems && selectedRequest.billingItems.length > 0 && (
                            <div>
                                <span className="text-gray-500 block text-xs font-bold uppercase mb-2">Billing Items Breakdown</span>
                                <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden text-[11px]">
                                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                        <thead className="bg-gray-50 dark:bg-gray-900">
                                            <tr>
                                                <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 uppercase">Item</th>
                                                <th className="px-3 py-2 text-left text-gray-500 dark:text-gray-400 uppercase">Type</th>
                                                <th className="px-3 py-2 text-right text-gray-500 dark:text-gray-400 uppercase">Unit Cost</th>
                                                <th className="px-3 py-2 text-right text-gray-500 dark:text-gray-400 uppercase">Qty</th>
                                                <th className="px-3 py-2 text-right text-gray-500 dark:text-gray-400 uppercase">Freq</th>
                                                <th className="px-3 py-2 text-right text-gray-500 dark:text-gray-400 uppercase">Total</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                            {selectedRequest.billingItems.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="px-3 py-2 text-gray-900 dark:text-white">{item.description}</td>
                                                    <td className="px-3 py-2 text-gray-500 dark:text-gray-400">{item.billingType || 'Normal'}</td>
                                                    <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">{item.unitCost.toLocaleString()}</td>
                                                    <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">{item.quantity}</td>
                                                    <td className="px-3 py-2 text-right text-gray-500 dark:text-gray-400">{item.frequency}</td>
                                                    <td className="px-3 py-2 text-right text-gray-900 dark:text-white font-medium">
                                                        {(item.unitCost * item.quantity * item.frequency).toLocaleString()}
                                                    </td>
                                                </tr>
                                            ))}
                                            
                                            {/* Advanced Financial Breakdown Logic */}
                                            {(() => {
                                                const sService = selectedRequest.billingItems!.reduce((acc, i) => (i.billingType === 'Service') ? acc + (i.unitCost * i.quantity * i.frequency) : acc, 0);
                                                const sGoods = selectedRequest.billingItems!.reduce((acc, i) => (i.billingType === 'Goods') ? acc + (i.unitCost * i.quantity * i.frequency) : acc, 0);
                                                const sNormal = selectedRequest.billingItems!.reduce((acc, i) => (i.billingType === 'Normal' || !i.billingType) ? acc + (i.unitCost * i.quantity * i.frequency) : acc, 0);

                                                const partPaymentP = selectedRequest.partPaymentPercentage || 100;
                                                const partPaymentDec = partPaymentP / 100;
                                                const serviceTaxP = selectedRequest.withholdingTaxPercentage || 0;
                                                const otherTaxP = selectedRequest.otherWithholdingTaxPercentage || 0;

                                                const pService = sService * partPaymentDec;
                                                const pGoods = sGoods * partPaymentDec;
                                                const pNormal = sNormal * partPaymentDec;

                                                const serviceTax = pService * (serviceTaxP / 100);
                                                const otherTax = pGoods * (otherTaxP / 100);
                                                const grandTotal = (pService - serviceTax) + (pGoods - otherTax) + pNormal;
                                                const grossTotal = sService + sGoods + sNormal;

                                                // Calculations for Outstanding & Rem WHT
                                                const totalNetIfFull = (sService * (1 - serviceTaxP/100)) + (sGoods * (1 - otherTaxP/100)) + sNormal;
                                                const outstanding = totalNetIfFull - grandTotal;
                                                const totalRemTax = ((sService - pService) * (serviceTaxP / 100)) + ((sGoods - pGoods) * (otherTaxP / 100));

                                                return (
                                                    <>
                                                        {(sService > 0 || serviceTaxP > 0) && (
                                                            <>
                                                                <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                                                                    <td colSpan={6} className="px-3 py-1 text-right text-gray-600 dark:text-gray-400">Sub-Total (Services): {selectedRequest.currency} {sService.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                                </tr>
                                                                <tr className="bg-blue-50/30 dark:bg-blue-900/10">
                                                                    <td colSpan={6} className="px-3 py-1 text-right text-gray-500 dark:text-gray-400">
                                                                        Part Payment ({partPaymentP}%): <span className="text-gray-900 dark:text-white font-medium">{selectedRequest.currency} {pService.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                                                        <span className="ml-4">Tax ({serviceTaxP}%): <span className="text-red-500">-{selectedRequest.currency} {serviceTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></span>
                                                                    </td>
                                                                </tr>
                                                            </>
                                                        )}
                                                        {(sGoods > 0 || otherTaxP > 0) && (
                                                            <>
                                                                <tr className="bg-orange-50/30 dark:bg-orange-900/10">
                                                                    <td colSpan={6} className="px-3 py-1 text-right text-gray-600 dark:text-gray-400">Sub-Total (Goods): {selectedRequest.currency} {sGoods.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                                </tr>
                                                                <tr className="bg-orange-50/30 dark:bg-orange-900/10">
                                                                    <td colSpan={6} className="px-3 py-1 text-right text-gray-500 dark:text-gray-400">
                                                                        Part Payment ({partPaymentP}%): <span className="text-gray-900 dark:text-white font-medium">{selectedRequest.currency} {pGoods.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                                                        <span className="ml-4">Tax ({otherTaxP}%): <span className="text-red-500">-{selectedRequest.currency} {otherTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></span>
                                                                    </td>
                                                                </tr>
                                                            </>
                                                        )}
                                                        
                                                        <tr className="bg-gray-100 dark:bg-gray-900 font-bold border-t dark:border-gray-700">
                                                            <td colSpan={5} className="px-3 py-2 text-right text-gray-900 dark:text-white uppercase tracking-tight">Gross Sub-Total</td>
                                                            <td className="px-3 py-2 text-right text-gray-900 dark:text-white">
                                                                {selectedRequest.currency} {grossTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                            </td>
                                                        </tr>

                                                        <tr className="bg-gray-100 dark:bg-gray-900 font-medium">
                                                            <td colSpan={5} className="px-3 py-1 text-right text-gray-600 dark:text-gray-400 uppercase tracking-tight">Total Part Payment (%)</td>
                                                            <td className="px-3 py-1 text-right text-gray-700 dark:text-gray-300">
                                                                {partPaymentP}%
                                                            </td>
                                                        </tr>

                                                        <tr className="bg-gray-200 dark:bg-gray-800 font-black border-t-2 border-brand-teal/30">
                                                            <td colSpan={5} className="px-3 py-3 text-right text-gray-900 dark:text-white uppercase tracking-wider">Grand Total Due Now</td>
                                                            <td className="px-3 py-3 text-right text-brand-teal text-sm">
                                                                {selectedRequest.currency} {grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                            </td>
                                                        </tr>

                                                        <tr className="bg-gray-50 dark:bg-gray-900/50 italic text-gray-500 dark:text-gray-400">
                                                            <td colSpan={5} className="px-3 py-1 text-right text-[10px]">Outstanding Payment:</td>
                                                            <td className="px-3 py-1 text-right text-[10px]">
                                                                {selectedRequest.currency} {outstanding.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                            </td>
                                                        </tr>

                                                        <tr className="bg-gray-50 dark:bg-gray-900/50 italic text-gray-400 dark:text-gray-500">
                                                            <td colSpan={5} className="px-3 py-1 text-right text-[10px]">Remaining WHT Amount:</td>
                                                            <td className="px-3 py-1 text-right text-[10px]">
                                                                {selectedRequest.currency} {totalRemTax.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                            </td>
                                                        </tr>
                                                    </>
                                                );
                                            })()}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {selectedRequest.files.length > 0 && (
                            <div>
                                <span className="text-gray-500 block text-xs font-bold uppercase mb-2">Attachments</span>
                                <div className="flex flex-wrap gap-2">
                                    {selectedRequest.files.map((f, i) => (
                                        <button key={i} onClick={() => setPreviewFile(f)} className="flex items-center space-x-2 text-[10px] bg-brand-teal/5 text-brand-teal px-3 py-1.5 rounded-md border border-brand-teal/20 hover:bg-brand-teal/10 transition-colors">
                                            <FileText size={12}/><span className="font-medium">{f.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="border-t dark:border-gray-700 pt-6 mt-auto shrink-0">
                        {selectedRequest.status === RequestStatus.AUTHORIZED ? (
                            !action ? (
                                <div className="flex justify-end space-x-3">
                                    <button onClick={() => setAction('REJECT')} className="px-5 py-2.5 border border-red-200 text-brand-orange rounded-xl hover:bg-red-50 font-bold transition-all text-sm">Reject Request</button>
                                    <button onClick={() => setAction('APPROVE')} className="px-8 py-2.5 bg-brand-teal text-white rounded-xl hover:bg-[#008f7a] font-bold shadow-lg shadow-brand-teal/20 transition-all text-sm">Approve for Payment</button>
                                </div>
                            ) : (
                                <div className="animate-in slide-in-from-bottom-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-xl border dark:border-gray-700">
                                    <h4 className={`font-bold mb-3 text-sm ${action === 'APPROVE' ? 'text-brand-teal' : 'text-brand-orange'}`}>{action === 'APPROVE' ? 'Confirm Approval' : 'Rejection Reason'}</h4>
                                    {action === 'REJECT' && <textarea className="w-full border dark:border-gray-700 dark:bg-gray-800 rounded-lg p-3 mb-3 text-sm" placeholder="Detail the reason for rejection..." value={remarks} onChange={e => setRemarks(e.target.value)} rows={2} />}
                                    
                                    {action === 'APPROVE' && (
                                        <div className="mb-4">
                                            <div className="flex items-center gap-4">
                                                <button onClick={() => signatureInputRef.current?.click()} className="px-4 py-2 border dark:border-gray-700 rounded-lg text-xs font-bold bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2">
                                                    <PenTool size={14} /> <span>{signature ? 'Change Signature' : 'Attach Signature'}</span>
                                                </button>
                                                {signature && <img src={signature} alt="Sig" className="h-10 w-auto bg-white p-1 rounded border" />}
                                            </div>
                                            <input type="file" className="hidden" accept="image/png" ref={signatureInputRef} onChange={handleSignatureUpload} />
                                        </div>
                                    )}

                                    <div className="flex justify-end space-x-2">
                                        <button onClick={() => setAction(null)} className="px-4 py-2 text-xs text-gray-500 font-bold">Cancel</button>
                                        <button onClick={handleFinish} disabled={action === 'APPROVE' && !signature} className={`px-6 py-2 rounded-lg text-white font-bold text-xs disabled:opacity-50 ${action === 'APPROVE' ? 'bg-brand-teal' : 'bg-brand-orange'}`}>Confirm Action</button>
                                    </div>
                                </div>
                            )
                        ) : (
                             <div className="flex justify-between items-center bg-gray-50 dark:bg-gray-900 p-3 rounded-xl">
                                <span className="text-gray-500 text-[10px] italic flex items-center gap-1"><CheckCircle size={12}/> Request processed. Action logged in history.</span>
                                <button onClick={handlePrintPdf} className="text-[10px] bg-brand-dark text-white px-3 py-1.5 rounded-lg flex items-center gap-2 hover:opacity-90"><Printer size={12}/> Download Voucher</button>
                             </div>
                        )}
                    </div>
                </div>
            )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden border border-gray-100 dark:border-gray-700 mt-8">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-between items-center">
            <h3 className="font-bold text-gray-800 dark:text-gray-200">Requests History</h3>
            <span className="text-xs text-gray-500">{historyRequests.length} processed records</span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Requester</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {historyRequests.length === 0 ? (
                  <tr><td colSpan={7} className="px-6 py-8 text-center text-gray-400">No processing history found.</td></tr>
              ) : (
                  historyRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(req.updatedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-medium">{req.requesterName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{req.requestSubject}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{req.vendorName}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-bold">{req.currency} {req.amount.toLocaleString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-tighter ${req.status === RequestStatus.APPROVED ? 'bg-brand-teal/10 text-brand-teal' : 'bg-brand-orange/10 text-brand-orange'}`}>
                          {req.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => setSelectedRequest(req)} className="text-brand-dark hover:text-brand-teal dark:text-brand-teal dark:hover:text-white flex items-center justify-end w-full">
                          <Eye size={16} className="mr-1" /> View
                        </button>
                      </td>
                    </tr>
                  ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {previewFile && (
        <div className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center shrink-0">
              <div className="flex items-center gap-3">
                <div className="bg-brand-teal/10 p-2 rounded text-brand-teal"><FileText size={20} /></div>
                <div><h3 className="font-bold text-gray-900 dark:text-white">{previewFile.name}</h3><p className="text-[10px] text-gray-400 uppercase">{previewFile.type}</p></div>
              </div>
              <button onClick={() => setPreviewFile(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"><X size={20}/></button>
            </div>
            <div className="flex-1 overflow-hidden p-4 bg-gray-100 dark:bg-gray-900 relative flex flex-col items-center justify-center">
                {previewFile.url && previewFile.url !== '#' ? (
                    previewFile.name.toLowerCase().endsWith('.pdf') ? (
                        <iframe src={previewFile.url} className="w-full h-full border-none shadow-lg bg-white rounded" title="Preview"></iframe>
                    ) : (
                        <div className="w-full h-full flex items-center justify-center overflow-auto">
                            <img src={previewFile.url} alt="Preview" className="max-w-full max-h-full object-contain shadow-lg rounded" />
                        </div>
                    )
                ) : (
                    <div className="bg-white dark:bg-gray-800 shadow-lg p-12 max-w-2xl w-full min-h-[300px] flex flex-col items-center text-center rounded">
                         <Info size={64} className="text-gray-300 mb-6" />
                         <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-200 mb-2">PREVIEW UNAVAILABLE</h2>
                         <p className="text-gray-500 mb-8">This file cannot be previewed directly.</p>
                    </div>
                )}
            </div>
            <div className="p-4 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end shrink-0">
                 <button onClick={() => handleDownload(previewFile)} className="flex items-center space-x-2 bg-brand-teal hover:bg-[#008f7a] text-white px-4 py-2 rounded-lg transition-colors shadow-sm text-sm">
                    <Download size={16} /><span>Download File</span>
                 </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};