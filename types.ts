
export enum Role {
  ADMIN = 'ADMIN',
  STAFF = 'STAFF',
  SUPERVISOR = 'SUPERVISOR', // New Role
  AUTHORIZER = 'AUTHORIZER',
  APPROVER = 'APPROVER', // Executive Director
  AUDITOR = 'AUDITOR' // External or Internal Auditor
}

export enum RequestStatus {
  DRAFT = 'Draft', // New Status
  PENDING_SUPERVISOR = 'Pending Supervisor', // New Status
  REJECTED_BY_SUPERVISOR = 'Rejected (Supervisor)', // New Status
  PENDING_AUTHORIZATION = 'Pending Authorization',
  AUTHORIZED = 'Authorized',
  FROZEN = 'Frozen',
  REJECTED_BY_AUTHORIZER = 'Rejected (Auth)',
  APPROVED = 'Approved',
  REJECTED_BY_APPROVER = 'Rejected (ED)'
}

export interface User {
  id: string;
  name: string;
  email: string;
  phoneNumber?: string; // New field for SMS
  password?: string;
  roles: string[]; // Changed from Role[] to string[] to support dynamic roles
  department: string;
  position?: string;
  profilePictureUrl?: string;
}

export interface RequestFile {
  name: string;
  type: 'memo' | 'invoice' | 'other';
  url: string; // Mock URL
}

export interface BillingItem {
  description: string;
  billingType: 'Service' | 'Goods' | 'Normal'; // Changed from Stationery to Goods
  unitCost: number;
  quantity: number;
  frequency: number;
}

export interface PaymentRequest {
  id: string;
  requesterId: string;
  requesterName: string;
  department: string;
  position: string;
  vendorName: string;
  vendorTin?: string; // New field for Vendor TIN / Ghana Card
  paymentDetails: string;
  amount: number; // This represents the Grand Total Due (Actual Payment)
  fullRequestedAmount?: number; // This represents the Gross Sub-Total before Part Payment
  currency: string; // Changed from enum to string to support dynamic lists
  billingProject: string; // New field
  requestSubject: string; // New field
  description: string;
  billingItems?: BillingItem[]; // New field for line items
  withholdingTaxPercentage?: number; // New field for tax calculation
  otherWithholdingTaxPercentage?: number; // New field for Goods/Stationery tax
  partPaymentPercentage?: number; // New field for partial payment
  files: RequestFile[];
  supervisorId: string; // New Field
  authorizerId: string;
  approverId?: string; // ID of the Executive Director who approved it
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  remarks?: string; // For rejection/freezing notes
  signOff: string; // Requester's name signature (Kept for legacy/fallback name display)
  
  // Signature Images (Base64)
  requesterSignature?: string;
  supervisorSignature?: string;
  authorizerSignature?: string;
  approverSignature?: string;

  editCount: number; // Track number of edits
}

export interface Notification {
  id: string;
  userId: string;
  message: string;
  isRead: boolean;
  createdAt: string;
  type: 'info' | 'success' | 'error' | 'warning';
  metadata?: { requestId?: string };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  content: string;
  timestamp: string;
  isRead: boolean;
}

export interface SystemLists {
  currencies: string[];
  billingProjects: string[];
  paymentMethods: string[];
  momoOperators: string[];
  departments: string[];
  positions: string[];
  roles: string[];
  financeNotifyEmails?: string[]; // Recipients cc'd on final approval (fallback: Finance Manager)
  logoUrl?: string;
  copyrightText?: string;
  showDemoCredentials?: boolean;
  notificationSound?: string; // New field for custom sound
}

export interface AuthContextType {
  user: User | null;
  activeRole: string | null; // Changed from Role to string
  users: User[];
  requests: PaymentRequest[];
  notifications: Notification[];
  messages: ChatMessage[];
  logoUrl: string;
  copyrightText: string;
  onlineUserIds: string[];
  systemLists: SystemLists;
  showDemoCredentials: boolean;
  theme: 'light' | 'dark'; // New theme state
  login: (email: string, password: string) => boolean;
  logout: () => void;
  switchRole: (role: string) => void;
  addRequest: (req: Omit<PaymentRequest, 'id' | 'createdAt' | 'updatedAt' | 'status' | 'editCount'>) => void;
  editRequest: (id: string, updatedData: Partial<PaymentRequest>) => void;
  updateRequestStatus: (id: string, status: RequestStatus, remarks?: string, signature?: string) => void;
  addUser: (userData: Omit<User, 'id'>) => void;
  editUser: (id: string, userData: Partial<User>) => void;
  deleteUser: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  sendMessage: (receiverId: string, content: string) => void;
  markChatAsRead: (senderId: string) => void;
  updateLogo: (url: string) => void;
  updateCopyrightText: (text: string) => void;
  updateSystemList: (listName: keyof Omit<SystemLists, 'logoUrl' | 'copyrightText' | 'showDemoCredentials' | 'notificationSound'>, newList: string[]) => void;
  updateNotificationSound: (base64Sound: string) => void; // New function
  toggleDemoCredentials: (show: boolean) => void;
  toggleTheme: () => void; // New toggle function
  resetSystemData: () => Promise<void>; // New reset function
}
