import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../context/AppContext';
import { RequestStatus, Role, RequestFile, PaymentRequest, BillingItem } from '../types';
import { PlusCircle, Upload, CheckCircle, XCircle, Clock, AlertCircle, Eye, FileText, Download, X, Edit3, CreditCard, Smartphone, Landmark, Briefcase, FileType, Plus, Trash2, Printer, RefreshCw, Save, PenTool } from 'lucide-react';
import { printPaymentRequest } from '../utils/pdfGenerator';
import { useSearchParams } from 'react-router-dom';

export const StaffDashboard = () => {
  const { user, requests, users, addRequest, editRequest, systemLists, logoUrl } = useApp();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [editingRequestId, setEditingRequestId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Track submission intent (Draft vs Submit)
  const [submissionStatus, setSubmissionStatus] = useState<RequestStatus | null>(null);

  // View Details State
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [previewFile, setPreviewFile] = useState<RequestFile | null>(null);

  // Handle URL Request ID
  useEffect(() => {
      const requestId = searchParams.get('requestId');
      if (requestId && requests.length > 0) {
          const req = requests.find(r => r.id === requestId);
          if (req) setSelectedRequest(req);
      }
  }, [searchParams, requests]);

  // Form State
  const [vendor, setVendor] = useState('');
  const [vendorTin, setVendorTin] = useState(''); // New State for TIN
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('GHS');
  const [billingProject, setBillingProject] = useState('');
  const [requestSubject, setRequestSubject] = useState('');
  const [description, setDescription] = useState('');
  const [selectedSupervisor, setSelectedSupervisor] = useState(''); // New Supervisor Selection
  const [selectedAuthorizer, setSelectedAuthorizer] = useState('');
  const [files, setFiles] = useState<{name: string, type: 'memo'|'invoice'|'other', url: string}[]>([]);
  
  // Signature State
  const [signature, setSignature] = useState<string>(''); // Base64 signature

  // Billing Items Table State
  const [billingItems, setBillingItems] = useState<BillingItem[]>([
      { description: '', billingType: 'Normal', unitCost: 0, quantity: 1, frequency: 1 }
  ]);
  const [whtPercentage, setWhtPercentage] = useState<string>('0');
  const [otherWhtPercentage, setOtherWhtPercentage] = useState<string>('0');
  const [partPaymentPercentage, setPartPaymentPercentage] = useState<string>('100');
  
  // Calculations State
  const [subTotalService, setSubTotalService] = useState(0);
  const [subTotalGoods, setSubTotalGoods] = useState(0);
  const [subTotalNormal, setSubTotalNormal] = useState(0);
  
  const [partServiceAmount, setPartServiceAmount] = useState(0);
  const [partGoodsAmount, setPartGoodsAmount] = useState(0);
  const [partNormalAmount, setPartNormalAmount] = useState(0);

  const [taxServiceAmount, setTaxServiceAmount] = useState(0);
  const [taxGoodsAmount, setTaxGoodsAmount] = useState(0);
  
  const [remainingWhtAmount, setRemainingWhtAmount] = useState(0);

  const [grossSubTotal, setGrossSubTotal] = useState(0);
  const [grandTotal, setGrandTotal] = useState(0);
  const [outstandingAmount, setOutstandingAmount] = useState(0);

  // Payment Details State
  const [paymentMethod, setPaymentMethod] = useState(''); 
  
  // Momo Fields
  const [momoOperator, setMomoOperator] = useState('');
  const [momoNumber, setMomoNumber] = useState('');
  
  // Bank Fields
  const [bankName, setBankName] = useState('');
  const [accName, setAccName] = useState('');
  const [accNumber, setAccNumber] = useState('');
  const [branchName, setBranchName] = useState('');
  const [sortCode, setSortCode] = useState('');
  const [swift, setSwift] = useState('');
  
  // Generic Fields
  const [genericPaymentDetails, setGenericPaymentDetails] = useState('');

  // Refs for file inputs
  const invoiceInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  // Filter users who have roles
  const supervisors = users.filter(u => u.roles.includes(Role.SUPERVISOR));
  const authorizers = users.filter(u => u.roles.includes(Role.AUTHORIZER));
  const myRequests = requests.filter(r => r.requesterId === user?.id);

  // Defaults
  useEffect(() => {
      if (systemLists.paymentMethods.length > 0 && !paymentMethod) {
          setPaymentMethod(systemLists.paymentMethods[0]);
      }
      if (systemLists.momoOperators.length > 0 && !momoOperator) {
          setMomoOperator(systemLists.momoOperators[0]);
      }
      if (systemLists.currencies.length > 0 && !currency) {
          setCurrency(systemLists.currencies[0]);
      }
  }, [systemLists]);

  // Calculations for Billing Table
  useEffect(() => {
    // 1. Calculate Gross Sub-Totals by Type
    let sService = 0;
    let sGoods = 0;
    let sNormal = 0;

    billingItems.forEach(item => {
        const lineTotal = item.unitCost * item.quantity * item.frequency;
        if (item.billingType === 'Service') sService += lineTotal;
        else if (item.billingType === 'Goods') sGoods += lineTotal;
        else sNormal += lineTotal;
    });

    // Percentages
    const serviceTaxP = parseFloat(whtPercentage) || 0;
    const goodsTaxP = parseFloat(otherWhtPercentage) || 0;
    const partPayP = parseFloat(partPaymentPercentage) || 100;
    const partPayDec = partPayP / 100;

    // 2. Calculate Part Payment Amounts (The portion being paid now)
    const pService = sService * partPayDec;
    const pGoods = sGoods * partPayDec;
    const pNormal = sNormal * partPayDec;

    // 3. Calculate Tax on the Part Payment Amount (Not the Gross)
    const tService = pService * (serviceTaxP / 100);
    const tGoods = pGoods * (goodsTaxP / 100);

    // 4. Calculate Net Payable (Grand Total)
    // Formula: (PartService - TaxOnPartService) + (PartGoods - TaxOnPartGoods) + PartNormal
    const gTotal = (pService - tService) + (pGoods - tGoods) + pNormal;

    // 5. Gross Sub-Total (Sum of all full amounts before tax/part pay)
    const calculatedGross = sService + sGoods + sNormal;

    // Calculate Total Net Payable if 100% was paid
    const totalNetPayableIfFull = (sService * (1 - serviceTaxP/100)) + (sGoods * (1 - goodsTaxP/100)) + sNormal;

    // 6. Outstanding Payment
    // Total Net Payable if 100% was paid = (sService * (1-tax)) + (sGoods * (1-tax)) + sNormal
    const outstanding = totalNetPayableIfFull - gTotal;

    // 7. Remaining WHT (Tax that is deferred)
    // Tax on the outstanding portion of Service + Goods
    const remainingServiceAmount = sService - pService;
    const remainingGoodsAmount = sGoods - pGoods;
    const remTaxService = remainingServiceAmount * (serviceTaxP / 100);
    const remTaxGoods = remainingGoodsAmount * (goodsTaxP / 100);
    const totalRemTax = remTaxService + remTaxGoods;

    setSubTotalService(sService);
    setSubTotalGoods(sGoods);
    setSubTotalNormal(sNormal);

    setPartServiceAmount(pService);
    setPartGoodsAmount(pGoods);
    setPartNormalAmount(pNormal);

    setTaxServiceAmount(tService);
    setTaxGoodsAmount(tGoods);
    
    setRemainingWhtAmount(totalRemTax);

    setGrossSubTotal(calculatedGross);
    setGrandTotal(gTotal);
    setOutstandingAmount(outstanding);

    // Update main amount if items exist
    if (calculatedGross > 0) {
        setAmount(gTotal.toFixed(2));
    }
  }, [billingItems, whtPercentage, otherWhtPercentage, partPaymentPercentage]);

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = error => reject(error);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>, type: 'memo' | 'invoice') => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const fileName = file.name;
      
      try {
          const base64Url = await convertFileToBase64(file);
          setFiles(prev => [...prev, { name: fileName, type, url: base64Url }]);
      } catch (error) {
          console.error("Error converting file:", error);
          alert("Failed to process file. Please try again.");
      }
    }
  };

  const handleSignatureUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          if (file.type !== 'image/png') {
              alert('Please upload a PNG file for the signature.');
              return;
          }
          try {
              const base64Url = await convertFileToBase64(file);
              setSignature(base64Url);
          } catch (error) {
              console.error("Error converting signature:", error);
              alert("Failed to process signature. Please try again.");
          }
      }
  };

  const handleBillingItemChange = (index: number, field: keyof BillingItem, value: string) => {
      const newItems = [...billingItems];
      if (field === 'description' || field === 'billingType') {
          // @ts-ignore
          newItems[index][field] = value;
      } else {
          // @ts-ignore
          newItems[index][field] = parseFloat(value) || 0;
      }
      setBillingItems(newItems);
  };

  const addBillingItem = () => {
      setBillingItems([...billingItems, { description: '', billingType: 'Normal', unitCost: 0, quantity: 1, frequency: 1 }]);
  };

  const removeBillingItem = (index: number) => {
      if (billingItems.length > 1) {
        const newItems = [...billingItems];
        newItems.splice(index, 1);
        setBillingItems(newItems);
      }
  };

  const handleOpenNewRequest = () => {
      setEditingRequestId(null);
      resetForm();
      setIsFormOpen(true);
  };

  const handleRequestBalance = (req: PaymentRequest) => {
      const originalPartPayment = req.partPaymentPercentage || 100;
      const remainingPercent = 100 - originalPartPayment;

      if (remainingPercent <= 0) {
          alert("This request is already fully paid.");
          return;
      }

      setEditingRequestId(null); // New request
      setVendor(req.vendorName);
      setVendorTin(req.vendorTin || '');
      setCurrency(req.currency);
      setBillingProject(req.billingProject || '');
      setRequestSubject(`${req.requestSubject} (Balance Payment)`);
      setDescription(`Balance payment for previous request: ${req.requestSubject}. Original part payment was ${originalPartPayment}%.`);
      setSelectedSupervisor(req.supervisorId);
      setSelectedAuthorizer(req.authorizerId);
      setSignature(''); // Clear signature for new request
      
      // We don't copy files automatically as new invoice might be needed
      setFiles([]); 
      
      if (req.billingItems && req.billingItems.length > 0) {
          // Copy items exactly
          setBillingItems(req.billingItems.map(item => ({...item})));
      }
      
      setWhtPercentage(req.withholdingTaxPercentage ? req.withholdingTaxPercentage.toString() : '0');
      setOtherWhtPercentage(req.otherWithholdingTaxPercentage ? req.otherWithholdingTaxPercentage.toString() : '0');
      
      // CRITICAL: Set the part payment to the REMAINING percentage
      setPartPaymentPercentage(remainingPercent.toString());

      // Parse Payment Details
      const details = req.paymentDetails || '';
      let foundMethod = systemLists.paymentMethods.find(m => details.startsWith(m));
      if (!foundMethod) {
          if (details.includes('Mobile Money') || details.includes('Momo')) foundMethod = 'Mobile Money';
          else if (details.includes('Bank')) foundMethod = 'Bank Account';
          else foundMethod = systemLists.paymentMethods[0];
      }
      setPaymentMethod(foundMethod || '');

      if (details.includes('Mobile Money') || details.includes('Momo')) {
          const parts = details.split(':');
          if (parts.length >= 2) {
              const opPart = parts[0].split('-')[1]?.trim();
              if (opPart) setMomoOperator(opPart);
              setMomoNumber(parts[1]?.trim() || '');
          }
      } else if (details.includes('Bank')) {
          const bankMatch = details.match(/Bank:\s*([^,]+)/);
          const nameMatch = details.match(/Name:\s*([^,]+)/);
          const noMatch = details.match(/No:\s*([^,]+)/);
          const branchMatch = details.match(/Branch:\s*([^,]+)/);
          const codeMatch = details.match(/Code:\s*([^,]+)/);
          const swiftMatch = details.match(/SWIFT:\s*([^$]+)/);

          if (bankMatch) setBankName(bankMatch[1].trim());
          if (nameMatch) setAccName(nameMatch[1].trim());
          if (noMatch) setAccNumber(noMatch[1].trim());
          if (branchMatch) setBranchName(branchMatch[1].trim());
          if (codeMatch) setSortCode(codeMatch[1].trim());
          if (swiftMatch) setSwift(swiftMatch[1].trim());
      } else {
          setGenericPaymentDetails(details);
      }

      setSelectedRequest(null); // Close details
      setSearchParams(params => {
          params.delete('requestId');
          return params;
      });
      setIsFormOpen(true); // Open form
  };

  const handleOpenEditRequest = (req: PaymentRequest) => {
      setEditingRequestId(req.id);
      setVendor(req.vendorName);
      setVendorTin(req.vendorTin || '');
      setAmount(req.amount.toString());
      setCurrency(req.currency);
      setBillingProject(req.billingProject || '');
      setRequestSubject(req.requestSubject || '');
      setDescription(req.description);
      setSelectedSupervisor(req.supervisorId);
      setSelectedAuthorizer(req.authorizerId);
      setSignature(req.requesterSignature || '');
      setFiles(req.files.map(f => ({ name: f.name, type: f.type, url: f.url })));
      
      if (req.billingItems && req.billingItems.length > 0) {
          setBillingItems(req.billingItems);
      } else {
          setBillingItems([{ description: '', billingType: 'Normal', unitCost: 0, quantity: 1, frequency: 1 }]);
      }
      setWhtPercentage(req.withholdingTaxPercentage ? req.withholdingTaxPercentage.toString() : '0');
      setOtherWhtPercentage(req.otherWithholdingTaxPercentage ? req.otherWithholdingTaxPercentage.toString() : '0');
      setPartPaymentPercentage(req.partPaymentPercentage ? req.partPaymentPercentage.toString() : '100');

      const details = req.paymentDetails || '';
      let foundMethod = systemLists.paymentMethods.find(m => details.startsWith(m));
      
      if (!foundMethod) {
          if (details.includes('Mobile Money') || details.includes('Momo')) foundMethod = 'Mobile Money';
          else if (details.includes('Bank')) foundMethod = 'Bank Account';
          else foundMethod = systemLists.paymentMethods[0];
      }

      setPaymentMethod(foundMethod || '');

      if (details.includes('Mobile Money') || details.includes('Momo')) {
          const parts = details.split(':');
          if (parts.length >= 2) {
              const opPart = parts[0].split('-')[1]?.trim();
              if (opPart) setMomoOperator(opPart);
              setMomoNumber(parts[1]?.trim() || '');
          }
      } else if (details.includes('Bank')) {
          const bankMatch = details.match(/Bank:\s*([^,]+)/);
          const nameMatch = details.match(/Name:\s*([^,]+)/);
          const noMatch = details.match(/No:\s*([^,]+)/);
          const branchMatch = details.match(/Branch:\s*([^,]+)/);
          const codeMatch = details.match(/Code:\s*([^,]+)/);
          const swiftMatch = details.match(/SWIFT:\s*([^$]+)/);

          if (bankMatch) setBankName(bankMatch[1].trim());
          if (nameMatch) setAccName(nameMatch[1].trim());
          if (noMatch) setAccNumber(noMatch[1].trim());
          if (branchMatch) setBranchName(branchMatch[1].trim());
          if (codeMatch) setSortCode(codeMatch[1].trim());
          if (swiftMatch) setSwift(swiftMatch[1].trim());
      } else {
          setGenericPaymentDetails(details);
      }

      setIsFormOpen(true);
  };

  const isMomoMethod = (method: string) => {
      const m = method.toLowerCase();
      return m.includes('mobile') || m.includes('momo');
  };

  const isBankMethod = (method: string) => {
      const m = method.toLowerCase();
      return m.includes('bank');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !submissionStatus) return;
    
    // Check if signature is present for submission (not strictly required for draft but good practice to allow upload)
    if (submissionStatus !== RequestStatus.DRAFT && !signature) {
        alert("Please upload your digital signature (PNG format).");
        return;
    }

    let finalPaymentDetails = '';
    if (isMomoMethod(paymentMethod)) {
        finalPaymentDetails = `${paymentMethod} - ${momoOperator}: ${momoNumber}`;
    } else if (isBankMethod(paymentMethod)) {
        finalPaymentDetails = `${paymentMethod} - Bank: ${bankName}, Name: ${accName}, No: ${accNumber}, Branch: ${branchName}, Code: ${sortCode}, SWIFT: ${swift}`;
    } else {
        finalPaymentDetails = `${paymentMethod} - ${genericPaymentDetails}`;
    }
    
    const validBillingItems = billingItems.filter(item => item.description.trim() !== '');

    setLoading(true);
    setTimeout(() => {
      const commonData = {
            vendorName: vendor,
            vendorTin: vendorTin,
            amount: grandTotal, 
            fullRequestedAmount: grossSubTotal, 
            currency,
            billingProject,
            requestSubject,
            description,
            billingItems: validBillingItems,
            withholdingTaxPercentage: parseFloat(whtPercentage),
            otherWithholdingTaxPercentage: parseFloat(otherWhtPercentage),
            partPaymentPercentage: parseFloat(partPaymentPercentage),
            paymentDetails: finalPaymentDetails,
            supervisorId: selectedSupervisor, 
            authorizerId: selectedAuthorizer,
            signOff: user.name, // Still store name for fallback
            requesterSignature: signature, // Store base64 signature
            files: files,
            status: submissionStatus // Pass the intended status
      };

      if (editingRequestId) {
        editRequest(editingRequestId, commonData);
      } else {
        addRequest({
            requesterId: user.id,
            requesterName: user.name,
            department: user.department,
            position: user.position || 'Staff',
            ...commonData
        });
      }

      setLoading(false);
      setIsFormOpen(false);
      resetForm();
    }, 1000);
  };

  const resetForm = () => {
    setVendor('');
    setVendorTin('');
    setAmount('');
    setCurrency(systemLists.currencies[0] || 'GHS');
    setBillingProject('');
    setRequestSubject('');
    setDescription('');
    setSelectedSupervisor('');
    setSelectedAuthorizer('');
    setSignature('');
    setFiles([]);
    setEditingRequestId(null);
    setBillingItems([{ description: '', billingType: 'Normal', unitCost: 0, quantity: 1, frequency: 1 }]);
    setWhtPercentage('0');
    setOtherWhtPercentage('0');
    setPartPaymentPercentage('100');
    setSubmissionStatus(null);
    
    setSubTotalService(0);
    setSubTotalGoods(0);
    setSubTotalNormal(0);
    setTaxServiceAmount(0);
    setTaxGoodsAmount(0);
    setGrossSubTotal(0);
    setGrandTotal(0);
    setOutstandingAmount(0);

    setPaymentMethod(systemLists.paymentMethods[0] || '');
    setMomoOperator(systemLists.momoOperators[0] || '');
    setMomoNumber('');
    setBankName('');
    setAccName('');
    setAccNumber('');
    setBranchName('');
    setSortCode('');
    setSwift('');
    setGenericPaymentDetails('');
  };

  const handleDownload = (file: RequestFile) => {
    const a = document.createElement('a');
    a.href = file.url;
    a.download = file.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handlePrintPdf = () => {
      if (!selectedRequest) return;
      printPaymentRequest(selectedRequest, users, logoUrl);
  };

  const canEdit = (req: PaymentRequest) => {
      return (req.status === RequestStatus.DRAFT) || 
             ((req.editCount < 2) && 
             (req.status === RequestStatus.PENDING_SUPERVISOR || 
              req.status === RequestStatus.REJECTED_BY_SUPERVISOR ||
              req.status === RequestStatus.REJECTED_BY_AUTHORIZER ||
              req.status === RequestStatus.REJECTED_BY_APPROVER));
  };

  const isBalanceRequest = requestSubject.toLowerCase().includes('balance');

  const closeDetails = () => {
    setSelectedRequest(null);
    setSearchParams(params => {
        params.delete('requestId');
        return params;
    });
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Staff Dashboard</h2>
           <p className="text-gray-500 dark:text-gray-400 text-sm">Manage your payment requests</p>
        </div>
        <button 
          onClick={handleOpenNewRequest}
          className="flex items-center justify-center space-x-2 bg-brand-teal hover:bg-[#008f7a] text-white px-4 py-2 rounded-lg transition-colors shadow-sm w-full md:w-auto"
        >
          <PlusCircle size={20} />
          <span>New Request</span>
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <h3 className="font-semibold text-gray-800 dark:text-gray-200">My Requests</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Subject</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Vendor</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {myRequests.length === 0 ? (
                <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-400 dark:text-gray-500">
                        <Clock size={48} className="mx-auto mb-3 opacity-20" />
                        <p>No requests found. Create a new one to get started.</p>
                    </td>
                </tr>
              ) : (
                myRequests.map((req) => (
                    <tr key={req.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{new Date(req.createdAt).toLocaleDateString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{req.requestSubject}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{req.vendorName}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white font-bold">{req.currency} {req.amount.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium 
                            ${req.status === RequestStatus.APPROVED ? 'bg-brand-teal/10 text-brand-teal dark:bg-teal-900/30' : 
                            req.status === RequestStatus.PENDING_AUTHORIZATION ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' :
                            req.status === RequestStatus.PENDING_SUPERVISOR ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                            req.status === RequestStatus.AUTHORIZED ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' :
                            req.status === RequestStatus.DRAFT ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                            'bg-brand-orange/10 text-brand-orange dark:bg-orange-900/30 dark:text-orange-300'}`}>
                            {req.status}
                        </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button 
                            onClick={() => setSelectedRequest(req)}
                            className="text-brand-dark hover:text-brand-teal dark:text-cyan-400 dark:hover:text-cyan-300 inline-flex items-center"
                        >
                            <Eye size={16} className="mr-1" /> View
                        </button>
                        {canEdit(req) && (
                            <button 
                                onClick={() => handleOpenEditRequest(req)}
                                className="text-gray-500 hover:text-brand-teal dark:text-gray-400 dark:hover:text-cyan-300 inline-flex items-center"
                            >
                                <Edit3 size={16} className="mr-1" /> Edit
                            </button>
                        )}
                    </td>
                    </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Request Details Modal */}
      {selectedRequest && !isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50 flex items-center justify-center p-4 backdrop-blur-sm">
             <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-6 border-b dark:border-gray-700">
                    <div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Request Details</h3>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium mt-1
                            ${selectedRequest.status === RequestStatus.APPROVED ? 'bg-brand-teal/10 text-brand-teal dark:bg-teal-900/30' : 
                              selectedRequest.status === RequestStatus.DRAFT ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                              'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'}`}>
                            {selectedRequest.status}
                        </span>
                    </div>
                    <div className="flex items-center space-x-2">
                        {selectedRequest.status === RequestStatus.APPROVED && (selectedRequest.partPaymentPercentage || 100) < 100 && (
                             <button onClick={() => handleRequestBalance(selectedRequest)} className="flex items-center space-x-2 bg-brand-orange text-white px-3 py-2 rounded shadow hover:bg-orange-600 text-sm">
                                <RefreshCw size={16} /><span>Request Balance</span>
                            </button>
                        )}
                        {selectedRequest.status === RequestStatus.APPROVED && (
                            <button onClick={handlePrintPdf} className="flex items-center space-x-2 bg-brand-dark text-white px-3 py-2 rounded shadow hover:bg-[#004d61] text-sm">
                                <Printer size={16} /><span>Download PDF</span>
                            </button>
                        )}
                        <button onClick={closeDetails} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                            <XCircle size={24} />
                        </button>
                    </div>
                </div>
                
                <div className="p-6 space-y-6">
                     <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="col-span-2 md:col-span-1"><label className="block text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">Subject</label><p className="text-gray-900 dark:text-white font-medium text-lg">{selectedRequest.requestSubject}</p></div>
                        <div className="col-span-2 md:col-span-1 text-right"><label className="block text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">Total Amount</label><p className="text-brand-teal font-bold text-2xl">{selectedRequest.currency} {selectedRequest.amount.toLocaleString()}</p></div>
                        <div><label className="block text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">Billing Project</label><p className="text-gray-900 dark:text-white">{selectedRequest.billingProject}</p></div>
                        <div>
                            <label className="block text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">Vendor</label>
                            <p className="text-gray-900 dark:text-white">{selectedRequest.vendorName}</p>
                            {selectedRequest.vendorTin && <p className="text-gray-500 dark:text-gray-400 text-xs mt-1">TIN: {selectedRequest.vendorTin}</p>}
                        </div>
                        <div className="col-span-2"><label className="block text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">Payment Details</label><p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700/50 p-2 rounded border border-gray-100 dark:border-gray-700 font-mono text-xs">{selectedRequest.paymentDetails}</p></div>
                        <div className="col-span-2"><label className="block text-gray-500 dark:text-gray-400 text-xs uppercase font-bold">Full Requested Amount</label><p className="text-gray-900 dark:text-white font-bold">{selectedRequest.currency} {(selectedRequest.fullRequestedAmount || selectedRequest.amount).toLocaleString()}</p></div>
                     </div>

                     {selectedRequest.billingItems && (
                         <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                             <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                                 <thead className="bg-gray-50 dark:bg-gray-700">
                                     <tr>
                                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Item</th>
                                         <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Type</th>
                                         <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Unit Cost</th>
                                         <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Qty</th>
                                         <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Freq</th>
                                         <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Total</th>
                                     </tr>
                                 </thead>
                                 <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                                     {selectedRequest.billingItems.map((item, idx) => (
                                         <tr key={idx}>
                                             <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{item.description}</td>
                                             <td className="px-3 py-2 text-sm text-gray-700 dark:text-gray-300">{item.billingType}</td>
                                             <td className="px-3 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{item.unitCost.toLocaleString()}</td>
                                             <td className="px-3 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{item.quantity}</td>
                                             <td className="px-3 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{item.frequency}</td>
                                             <td className="px-3 py-2 text-sm text-right text-gray-700 dark:text-gray-300">{(item.unitCost * item.quantity * item.frequency).toLocaleString()}</td>
                                         </tr>
                                     ))}
                                     {(() => {
                                         const sService = selectedRequest.billingItems.reduce((acc, i) => (i.billingType === 'Service') ? acc + (i.unitCost * i.quantity * i.frequency) : acc, 0);
                                         const sGoods = selectedRequest.billingItems.reduce((acc, i) => (i.billingType === 'Goods') ? acc + (i.unitCost * i.quantity * i.frequency) : acc, 0);
                                         const sNormal = selectedRequest.billingItems.reduce((acc, i) => (i.billingType === 'Normal' || !i.billingType) ? acc + (i.unitCost * i.quantity * i.frequency) : acc, 0);

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
                                                     <tr className="bg-blue-50/50 dark:bg-blue-900/20">
                                                         <td colSpan={6} className="px-3 py-1 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Sub-Total for Services: {selectedRequest.currency} {sService.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                     </tr>
                                                     <tr className="bg-blue-50/50 dark:bg-blue-900/20">
                                                         <td colSpan={6} className="px-3 py-1 text-right text-xs text-gray-600 dark:text-gray-400">Part Payment of Services ({partPaymentP}%): <span className="font-medium text-gray-900 dark:text-white">{selectedRequest.currency} {pService.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></td>
                                                     </tr>
                                                     <tr className="bg-blue-50/50 dark:bg-blue-900/20">
                                                         <td colSpan={6} className="px-3 py-1 text-right text-xs text-gray-500 dark:text-gray-400">Services WHT ({serviceTaxP}%): <span className="text-red-500 dark:text-red-400">-{selectedRequest.currency} {serviceTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></td>
                                                     </tr>
                                                 </>
                                             )}
                                             {(sGoods > 0 || otherTaxP > 0) && (
                                                 <>
                                                     <tr className="bg-orange-50/50 dark:bg-orange-900/20">
                                                         <td colSpan={6} className="px-3 py-1 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Sub-Total for Goods: {selectedRequest.currency} {sGoods.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                                     </tr>
                                                     <tr className="bg-orange-50/50 dark:bg-orange-900/20">
                                                         <td colSpan={6} className="px-3 py-1 text-right text-xs text-gray-600 dark:text-gray-400">Part Payment of Goods ({partPaymentP}%): <span className="font-medium text-gray-900 dark:text-white">{selectedRequest.currency} {pGoods.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></td>
                                                     </tr>
                                                     <tr className="bg-orange-50/50 dark:bg-orange-900/20">
                                                         <td colSpan={6} className="px-3 py-1 text-right text-xs text-gray-500 dark:text-gray-400">Other WHT ({otherTaxP}%): <span className="text-red-500 dark:text-red-400">-{selectedRequest.currency} {otherTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</span></td>
                                                     </tr>
                                                 </>
                                             )}
                                             {sNormal > 0 && (
                                                 <tr className="bg-gray-50 dark:bg-gray-700/50">
                                                     <td colSpan={6} className="px-3 py-1 text-right text-xs font-medium text-gray-700 dark:text-gray-300">
                                                         Sub-Total for Normal: {selectedRequest.currency} {sNormal.toLocaleString(undefined, {minimumFractionDigits: 2})}
                                                         <br/>
                                                         <span className="text-gray-500 dark:text-gray-400 font-normal">Part Payment of Normal ({partPaymentP}%): {selectedRequest.currency} {pNormal.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                                     </td>
                                                 </tr>
                                             )}
                                             
                                             <tr className="bg-gray-100 dark:bg-gray-700 border-t border-gray-200 dark:border-gray-600">
                                                 <td colSpan={6} className="px-3 py-1 text-right text-xs font-bold text-gray-800 dark:text-gray-200">Gross Sub-Total</td>
                                                 <td className="px-3 py-1 text-right text-xs font-bold text-gray-900 dark:text-white">{selectedRequest.currency} {grossTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                             </tr>
                                             
                                             <tr className="bg-gray-100 dark:bg-gray-700">
                                                 <td colSpan={6} className="px-3 py-1 text-right text-xs font-medium text-gray-700 dark:text-gray-300">Total Part Payment (%)</td>
                                                 <td className="px-3 py-1 text-right text-xs text-gray-500 dark:text-gray-400">{partPaymentP}%</td>
                                             </tr>

                                             <tr className="bg-gray-200 dark:bg-gray-600 font-bold border-t border-gray-300 dark:border-gray-500">
                                                 <td colSpan={6} className="px-3 py-1 text-right text-xs text-gray-900 dark:text-white">Grand Total Due</td>
                                                 <td className="px-3 py-1 text-right text-xs text-brand-teal dark:text-brand-teal">{selectedRequest.currency} {grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                             </tr>

                                             <tr className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                                                 <td colSpan={6} className="px-3 py-1 text-right text-xs font-medium text-gray-500 dark:text-gray-400">{isBal ? 'Initial Payment' : 'Outstanding Payment'}</td>
                                                 <td className="px-3 py-1 text-right text-xs text-gray-500 dark:text-gray-400 font-bold">{selectedRequest.currency} {outstanding.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                             </tr>

                                             <tr className="bg-gray-50 dark:bg-gray-800">
                                                 <td colSpan={6} className="px-3 py-1 text-right text-xs font-medium text-gray-400 dark:text-gray-500">{isBal ? 'Initial WHT Paid' : 'Remaining WHT Amount'}</td>
                                                 <td className="px-3 py-1 text-right text-xs text-gray-400 dark:text-gray-500">{selectedRequest.currency} {totalRemTax.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                             </tr>
                                            </>
                                         );
                                     })()}
                                 </tbody>
                             </table>
                         </div>
                     )}
                     
                     {selectedRequest.remarks && (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 p-3 rounded">
                            <span className="text-red-500 dark:text-red-400 block text-xs font-bold uppercase mb-1">Remarks</span>
                            <p className="text-sm text-gray-800 dark:text-gray-200">{selectedRequest.remarks}</p>
                        </div>
                     )}
                </div>
                <div className="p-4 md:p-6 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex justify-end">
                    <button onClick={closeDetails} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 bg-white dark:bg-gray-800">Close</button>
                </div>
             </div>
        </div>
      )}

      {/* New/Edit Request Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-black bg-opacity-50 flex items-center justify-center p-0 md:p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 md:rounded-xl shadow-xl w-full max-w-4xl h-full md:h-[90vh] flex flex-col animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 md:p-6 border-b dark:border-gray-700 shrink-0">
              <h3 className="text-lg md:text-xl font-bold text-gray-900 dark:text-white">{editingRequestId ? 'Edit Request' : 'New Cash Payment Request'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
                <form id="requestForm" onSubmit={handleSubmit} className="space-y-6">
                    {/* Header Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Billing Project</label>
                             <select required value={billingProject} onChange={e => setBillingProject(e.target.value)}
                                className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white dark:bg-gray-700 dark:text-white">
                                <option value="">Select Project</option>
                                {systemLists.billingProjects.map(bp => <option key={bp} value={bp}>{bp}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Request Subject</label>
                            <input required type="text" className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal dark:bg-gray-700 dark:text-white"
                                value={requestSubject} onChange={e => setRequestSubject(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor Name</label>
                            <input required type="text" className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal dark:bg-gray-700 dark:text-white"
                                value={vendor} onChange={e => setVendor(e.target.value)} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vendor TIN / Ghana Card No.</label>
                            <input type="text" className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal dark:bg-gray-700 dark:text-white"
                                value={vendorTin} onChange={e => setVendorTin(e.target.value)} placeholder="TIN or Card Number" />
                        </div>
                        <div className="flex space-x-2">
                            <div className="w-1/2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Currency</label>
                                <select required value={currency} onChange={e => setCurrency(e.target.value)}
                                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white dark:bg-gray-700 dark:text-white">
                                    {systemLists.currencies.map(curr => <option key={curr} value={curr}>{curr}</option>)}
                                </select>
                            </div>
                            <div className="w-1/2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Requested Amount</label>
                                <input 
                                    readOnly 
                                    disabled
                                    type="text" 
                                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm bg-gray-50 dark:bg-gray-600 text-gray-500 dark:text-gray-300 font-bold"
                                    value={grossSubTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})} 
                                />
                            </div>
                        </div>
                    </div>

                    {/* Payment Details Section */}
                    {/* ... (Payment details section identical to previous) ... */}
                    <div className="bg-gray-50 dark:bg-gray-700/30 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
                         <h4 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase mb-3 flex items-center">
                            <CreditCard size={16} className="mr-2"/> Payment Details
                         </h4>
                         <div className="space-y-4">
                             <div>
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Payment Method</label>
                                <select required value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)}
                                    className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white dark:bg-gray-700 dark:text-white">
                                    {systemLists.paymentMethods.map(m => <option key={m} value={m}>{m}</option>)}
                                </select>
                             </div>
                             {isMomoMethod(paymentMethod) && (
                                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
                                     <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Network Operator</label>
                                        <select required value={momoOperator} onChange={e => setMomoOperator(e.target.value)}
                                            className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white dark:bg-gray-700 dark:text-white">
                                            {systemLists.momoOperators.map(op => <option key={op} value={op}>{op}</option>)}
                                        </select>
                                     </div>
                                     <div>
                                         <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile Number</label>
                                         <input required type="text" className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal dark:bg-gray-700 dark:text-white"
                                             value={momoNumber} onChange={e => setMomoNumber(e.target.value)} placeholder="024xxxxxxx" />
                                     </div>
                                 </div>
                             )}
                             {isBankMethod(paymentMethod) && (
                                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-2">
                                     <div className="md:col-span-1"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bank Name</label><input required type="text" className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm dark:bg-gray-700 dark:text-white" value={bankName} onChange={e => setBankName(e.target.value)} /></div>
                                     <div className="md:col-span-2"><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Name</label><input required type="text" className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm dark:bg-gray-700 dark:text-white" value={accName} onChange={e => setAccName(e.target.value)} /></div>
                                     <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Account Number</label><input required type="text" className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm dark:bg-gray-700 dark:text-white" value={accNumber} onChange={e => setAccNumber(e.target.value)} /></div>
                                     <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Branch Name</label><input required type="text" className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm dark:bg-gray-700 dark:text-white" value={branchName} onChange={e => setBranchName(e.target.value)} /></div>
                                     <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Sort/Branch Code</label><input type="text" className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm dark:bg-gray-700 dark:text-white" value={sortCode} onChange={e => setSortCode(e.target.value)} /></div>
                                     <div><label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">SWIFT Code</label><input type="text" className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm dark:bg-gray-700 dark:text-white" value={swift} onChange={e => setSwift(e.target.value)} /></div>
                                 </div>
                             )}
                             {!isMomoMethod(paymentMethod) && !isBankMethod(paymentMethod) && (
                                 <div className="animate-in fade-in slide-in-from-top-2">
                                     <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Details</label>
                                     <input required type="text" className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm dark:bg-gray-700 dark:text-white" value={genericPaymentDetails} onChange={e => setGenericPaymentDetails(e.target.value)} />
                                 </div>
                             )}
                         </div>
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Description / Memo Content</label>
                        <textarea required className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal dark:bg-gray-700 dark:text-white"
                            rows={3} value={description} onChange={e => setDescription(e.target.value)} />
                    </div>

                    {/* Billing Items Table */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Billing Items</label>
                        <div className="border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden p-2">
                             <div className="overflow-x-auto">
                                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 mb-4 w-full">
                                    <thead className="bg-gray-50 dark:bg-gray-900">
                                        <tr>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase min-w-[150px] whitespace-nowrap">Item</th>
                                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase min-w-[100px] whitespace-nowrap">Type</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase min-w-[80px] whitespace-nowrap">Unit Cost</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase min-w-[60px] whitespace-nowrap">Qty</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase min-w-[60px] whitespace-nowrap">Freq</th>
                                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase min-w-[80px] whitespace-nowrap">Total</th>
                                            <th className="px-3 py-2 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                                        {billingItems.map((item, index) => (
                                            <tr key={index}>
                                                <td className="px-3 py-2"><input type="text" required value={item.description} onChange={(e) => handleBillingItemChange(index, 'description', e.target.value)} className="block w-full border-gray-300 dark:border-gray-600 rounded-md text-sm focus:ring-brand-teal focus:border-brand-teal dark:bg-gray-700 dark:text-white" /></td>
                                                <td className="px-3 py-2">
                                                    <select value={item.billingType || 'Normal'} onChange={(e) => handleBillingItemChange(index, 'billingType', e.target.value)} className="block w-full border-gray-300 dark:border-gray-600 rounded-md text-sm dark:bg-gray-700 dark:text-white">
                                                        <option value="Normal">Normal</option>
                                                        <option value="Service">Service</option>
                                                        <option value="Goods">Goods</option>
                                                    </select>
                                                </td>
                                                <td className="px-3 py-2"><input type="number" required min="0" step="0.01" value={item.unitCost} onChange={(e) => handleBillingItemChange(index, 'unitCost', e.target.value)} className="block w-full border-gray-300 dark:border-gray-600 rounded-md text-sm text-right dark:bg-gray-700 dark:text-white" /></td>
                                                <td className="px-3 py-2"><input type="number" required min="1" value={item.quantity} onChange={(e) => handleBillingItemChange(index, 'quantity', e.target.value)} className="block w-full border-gray-300 dark:border-gray-600 rounded-md text-sm text-right dark:bg-gray-700 dark:text-white" /></td>
                                                <td className="px-3 py-2"><input type="number" required min="1" value={item.frequency} onChange={(e) => handleBillingItemChange(index, 'frequency', e.target.value)} className="block w-full border-gray-300 dark:border-gray-600 rounded-md text-sm text-right dark:bg-gray-700 dark:text-white" /></td>
                                                <td className="px-3 py-2 text-right text-sm font-medium text-gray-900 dark:text-white">{(item.unitCost * item.quantity * item.frequency).toFixed(2)}</td>
                                                <td className="px-3 py-2 text-center"><button type="button" onClick={() => removeBillingItem(index)} className="text-gray-400 hover:text-red-500"><Trash2 size={16} /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                             </div>
                             <button type="button" onClick={addBillingItem} className="flex items-center text-sm text-brand-teal font-medium hover:text-[#008f7a] mb-2"><PlusCircle size={16} className="mr-1"/> Add Item</button>

                             {/* Breakdown Calculation Section */}
                             <div className="flex justify-end mt-4 space-y-2 flex-col items-end border-t border-gray-200 dark:border-gray-700 pt-4">
                                 
                                 {/* Common Part Payment Input */}
                                 <div className="w-full max-w-xs flex justify-between items-center mb-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                     <label className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center">
                                         Total Part Payment (%)
                                         <input type="number" min="0" max="100" step="0.01" value={partPaymentPercentage} onChange={(e) => setPartPaymentPercentage(e.target.value)} className="w-16 ml-2 text-right border-gray-300 dark:border-gray-600 rounded text-sm p-1 h-7 dark:bg-gray-700 dark:text-white" />
                                     </label>
                                     <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">{partPaymentPercentage}%</span>
                                 </div>

                                 {/* Services Group */}
                                 {(subTotalService > 0 || parseFloat(whtPercentage) > 0) && (
                                     <div className="w-full max-w-xs bg-blue-50/50 dark:bg-blue-900/30 p-2 rounded mb-2">
                                         <div className="flex justify-between items-center text-sm mb-1">
                                             <span className="text-gray-700 dark:text-gray-300 font-medium">Sub-Total for Services:</span>
                                             <span className="font-bold text-gray-900 dark:text-white">{currency} {subTotalService.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                         </div>
                                         <div className="flex justify-between items-center text-sm mb-1">
                                             <span className="text-gray-600 dark:text-gray-400 text-xs">Part Payment of Services ({partPaymentPercentage}%):</span>
                                             <span className="font-medium text-gray-800 dark:text-gray-200">{currency} {partServiceAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                         </div>
                                         <div className="flex justify-between items-center">
                                             <label className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                                                 Services WHT (%)
                                                 <input type="number" min="0" max="100" step="0.01" value={whtPercentage} onChange={(e) => setWhtPercentage(e.target.value)} className="w-12 ml-2 text-right border-gray-300 dark:border-gray-600 rounded text-xs p-1 h-6 dark:bg-gray-700 dark:text-white" />
                                             </label>
                                             <span className="text-xs text-red-500 font-medium">- {currency} {taxServiceAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                         </div>
                                     </div>
                                 )}

                                 {/* Goods Group */}
                                 {(subTotalGoods > 0 || parseFloat(otherWhtPercentage) > 0) && (
                                     <div className="w-full max-w-xs bg-orange-50/50 dark:bg-orange-900/30 p-2 rounded mb-2">
                                         <div className="flex justify-between items-center text-sm mb-1">
                                             <span className="text-gray-700 dark:text-gray-300 font-medium">Sub-Total for Goods:</span>
                                             <span className="font-bold text-gray-900 dark:text-white">{currency} {subTotalGoods.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                         </div>
                                         <div className="flex justify-between items-center text-sm mb-1">
                                             <span className="text-gray-600 dark:text-gray-400 text-xs">Part Payment of Goods ({partPaymentPercentage}%):</span>
                                             <span className="font-medium text-gray-800 dark:text-gray-200">{currency} {partGoodsAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                         </div>
                                         <div className="flex justify-between items-center">
                                             <label className="text-xs text-gray-600 dark:text-gray-400 flex items-center">
                                                 Other WHT (%)
                                                 <input type="number" min="0" max="100" step="0.01" value={otherWhtPercentage} onChange={(e) => setOtherWhtPercentage(e.target.value)} className="w-12 ml-2 text-right border-gray-300 dark:border-gray-600 rounded text-xs p-1 h-6 dark:bg-gray-700 dark:text-white" />
                                             </label>
                                             <span className="text-xs text-red-500 font-medium">- {currency} {taxGoodsAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                         </div>
                                     </div>
                                 )}

                                 {/* Normal Group */}
                                 {subTotalNormal > 0 && (
                                     <div className="w-full max-w-xs p-2 mb-2 bg-gray-50 dark:bg-gray-800 rounded">
                                         <div className="flex justify-between items-center text-sm mb-1">
                                             <span className="text-gray-700 dark:text-gray-300 font-medium">Sub-Total for Normal:</span>
                                             <span className="font-bold text-gray-900 dark:text-white">{currency} {subTotalNormal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                         </div>
                                         <div className="flex justify-between items-center text-sm">
                                             <span className="text-gray-600 dark:text-gray-400 text-xs">Part Payment of Normal ({partPaymentPercentage}%):</span>
                                             <span className="font-medium text-gray-800 dark:text-gray-200">{currency} {partNormalAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                         </div>
                                     </div>
                                 )}

                                 {/* Gross Sub-Total Row */}
                                 <div className="w-full max-w-xs flex justify-between items-center border-t border-gray-300 dark:border-gray-600 pt-2 mt-2">
                                     <span className="text-sm font-bold text-gray-800 dark:text-gray-200">Gross Sub-Total:</span>
                                     <span className="text-sm font-bold text-gray-900 dark:text-white">{currency} {grossSubTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                 </div>

                                 {/* Grand Total */}
                                 <div className="w-full max-w-xs flex justify-between items-center border-t border-gray-300 dark:border-gray-600 pt-2 mt-2 bg-gray-100 dark:bg-gray-700 p-2 rounded">
                                     <span className="text-base font-bold text-gray-900 dark:text-white">Grand Total Due:</span>
                                     <span className="text-xl font-bold text-brand-teal">{currency} {grandTotal.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                 </div>

                                 {/* Outstanding Payment Row */}
                                 <div className="w-full max-w-xs flex justify-between items-center mt-1 px-2">
                                     <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{isBalanceRequest ? 'Initial Payment:' : 'Outstanding Payment:'}</span>
                                     <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{currency} {outstandingAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                 </div>

                                 {/* Remaining WHT Row */}
                                 <div className="w-full max-w-xs flex justify-between items-center px-2 pb-2">
                                     <span className="text-xs font-medium text-gray-400 dark:text-gray-500">{isBalanceRequest ? 'Initial WHT Paid:' : 'Remaining WHT Amount:'}</span>
                                     <span className="text-xs font-bold text-gray-400 dark:text-gray-500">{currency} {remainingWhtAmount.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                                 </div>
                             </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Supervisor Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Supervisor</label>
                            <select required className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white dark:bg-gray-700 dark:text-white"
                                value={selectedSupervisor} onChange={e => setSelectedSupervisor(e.target.value)}>
                                <option value="">Select Supervisor...</option>
                                {supervisors.map(sup => <option key={sup.id} value={sup.id}>{sup.name} ({sup.position})</option>)}
                            </select>
                        </div>
                        
                        {/* Authorizer Selection */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Select Authorizer</label>
                            <select required className="block w-full rounded-md border border-gray-300 dark:border-gray-600 px-3 py-2 shadow-sm focus:border-brand-teal focus:ring-1 focus:ring-brand-teal bg-white dark:bg-gray-700 dark:text-white"
                                value={selectedAuthorizer} onChange={e => setSelectedAuthorizer(e.target.value)}>
                                <option value="">Select Authorizer...</option>
                                {authorizers.map(auth => <option key={auth.id} value={auth.id}>{auth.name} ({auth.position})</option>)}
                            </select>
                        </div>
                    </div>

                    {/* File Upload Section */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Attachments</label>
                        <div className="w-full">
                             <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-4 text-center hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                                <input type="file" id="invoiceUpload" className="hidden" accept=".pdf,.jpg,.jpeg,.png" onChange={(e) => handleFileChange(e, 'invoice')} />
                                <label htmlFor="invoiceUpload" className="cursor-pointer flex flex-col items-center">
                                    <Upload className="h-8 w-8 text-gray-400 mb-2" />
                                    <span className="text-sm text-gray-600 dark:text-gray-400">Upload Invoice / Receipt</span>
                                </label>
                             </div>
                        </div>
                        {/* File List */}
                        {files.length > 0 && (
                            <div className="mt-3 space-y-2">
                                {files.map((f, i) => (
                                    <div key={i} className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-2 rounded border border-gray-200 dark:border-gray-600">
                                        <div className="flex items-center space-x-2">
                                            <FileText size={16} className="text-brand-teal"/>
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{f.name}</span>
                                            <span className="text-xs text-gray-400 uppercase">({f.type})</span>
                                        </div>
                                        <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))} className="text-red-400 hover:text-red-600"><X size={16}/></button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Signature Section - Replaced Text Sign Off */}
                    <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-lg border border-yellow-100 dark:border-yellow-900/30">
                        <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-2">Requester's Signature</label>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">Upload your signature as a PNG file with a transparent background.</p>
                        
                        <div className="flex flex-col items-start gap-4">
                            <input 
                                type="file" 
                                id="signatureUpload" 
                                className="hidden" 
                                accept="image/png" 
                                ref={signatureInputRef}
                                onChange={handleSignatureUpload} 
                            />
                            <button 
                                type="button" 
                                onClick={() => signatureInputRef.current?.click()} 
                                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-sm hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                            >
                                <PenTool size={16} className="text-brand-teal" />
                                <span>Upload Signature</span>
                            </button>

                            {signature && (
                                <div className="mt-2 border border-gray-200 dark:border-gray-600 rounded bg-white dark:bg-gray-800 p-2">
                                    <img src={signature} alt="Signature Preview" className="h-16 w-auto object-contain" />
                                    <button 
                                        type="button" 
                                        onClick={() => setSignature('')}
                                        className="text-xs text-red-500 mt-1 hover:underline"
                                    >
                                        Remove Signature
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex justify-between md:justify-end space-x-3 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 md:mr-auto">
                            Cancel
                        </button>
                        
                        <button 
                            type="submit" 
                            disabled={loading}
                            onClick={() => setSubmissionStatus(RequestStatus.DRAFT)}
                            className="flex items-center space-x-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
                        >
                            <Save size={16} />
                            <span>Save as Draft</span>
                        </button>

                        <button 
                            type="submit" 
                            disabled={loading}
                            onClick={() => setSubmissionStatus(RequestStatus.PENDING_SUPERVISOR)}
                            className="flex items-center space-x-2 px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-teal hover:bg-[#008f7a] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-teal disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? 'Processing...' : (editingRequestId ? 'Update Request' : 'Submit Request')}
                        </button>
                    </div>
                </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};