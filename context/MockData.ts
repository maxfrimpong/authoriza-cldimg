
import { Role, User, PaymentRequest, ChatMessage } from "../types";

export const MOCK_USERS: User[] = [
  { 
    id: 'u6', 
    name: 'System Admin', 
    email: 'admin@org.com', 
    password: 'password123', 
    roles: [Role.ADMIN], 
    department: 'Administration', 
    position: 'System Administrator',
    phoneNumber: '+233000000000'
  }
];

export const MOCK_REQUESTS: PaymentRequest[] = [];

export const MOCK_MESSAGES: ChatMessage[] = [];

// Fallback for Mock API if preview mode needs it
export const MOCK_SYSTEM_LISTS: any = {
    currencies: ['GHS', 'USD', 'EUR', 'GBP'],
    billingProjects: [
      "Skills Hub", "Adwuma Pa", "PASEWAY", "Africa Youth Partnership", 
      "YES-PACT", "Get Into", "Youth Excel", "Youth on Board", 
      "YOTA Main", "YOTA USD", "YOTA GBP", "AYP 2", "GYEOS"
    ],
    paymentMethods: ['Mobile Money', 'Bank Account'],
    momoOperators: ['MTN Momo', 'Telecel Cash', 'AT Cash'],
    departments: [
      "Finance", "Projects", "Operations & Logistics", "Digital Engagement", 
      "IT", "Skills Hub", "Get Into Employment", "HR & Admin"
    ],
    positions: [
      "Executive Director", "Skills & Innovation Manager", "Project Manager", 
      "Project Associate", "Project Officer", "Finance Manager", "Finance Officer", 
      "Finance Associate", "Digital Engagement Manager", "Digital Engagement Analyst", 
      "Digital Engagement Associate", "IT Manager", "IT Officer", "IT Associate", 
      "Operations Manager", "Operations Support Officer", "Driver", "Senior Driver", 
      "Security", "Senior Housekeeper", "Housekeeper", "Senior Security Officer", 
      "Security Officer", "Intern"
    ],
    roles: ["ADMIN", "STAFF", "AUTHORIZER", "APPROVER", "AUDITOR", "SUPERVISOR"],
    logoUrl: "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMzgwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDUsIDUpIHNjYWxlKDAuOSkiPgogICAgPHBhdGggZD0iTTI1IDE4IEMgMjIgMjAgMTkgMjMgMTggMjYgTCA1IDE5IEMgOCAxNCAxMiA5IDE3IDYgTCAyNSAxOCBaIiBmaWxsPSIjRkE0NTE1Ii8+CiAgICA8cGF0aCBkPSJNMzggMTMgQyAzNCAxNCAzMCAxNSAyNyAxOCBMIDIwIDYgQyAyNSAyIDMwIC0wIDM2IC0xIEwgMzggMTMgWiIgZmlsbD0iI0ZBNDUxNSIvPgogICAgPHBhdGggZD0iTTUxIDE1IEMgNDggMTMgNDUgMTIgNDEgMTIgViAtMiBDIDQ3IC0yIDUzIC0wIDU4IDIgTCA1IDE5IiBmaWxsPSIjRkZDNjU4Ii8+CiAgICA8cGF0aCBkPSJNNjMgMjIgQyA2MSAxOSA1OCAxNyA1NSAxNSBMIDYxIDIgQyA2NyA1IDcxIDkgNzUgMTQgTCA2MyAyMiBaIiBmaWxsPSIjRkZDNjU4Ii8+CiAgICA8cGF0aCBkPSJNNjggMzQgQyA2NyAzMCA2NiAyNyA2MyAyNCBMIDc1IDE2IEMgNzkgMjEgODIgMjYgODMgMzIgTCA2OCAzNCBaIiBmaWxsPSIjRkZDNjU4Ii8+CiAgICA8cGF0aCBkPSJNNjYgNDcgQyA2NyA0NCA2NyA0MCA2NiAzNiBMIDgxIDMzIEMgODIgMzkgODIgNDUgODEgNTEgTCA2NiA0NyBaIiBmaWxsPSIjMDBBODhGIi8+CiAgICA8cGF0aCBkPSJNNTcgNTggQyA1OSA1NSA2MSA1MSA2MSA0OCBMIDc2IDUwIEMgNzUgNTYgNzMgNjIgNjkgNjcgTCA1NyA1OCBaIiBmaWxsPSIjMDBBODhGIi8+CiAgICA8cGF0aCBkPSJNNDQgNjQgQyA0NyA2MyA1MCA2MSA1MiA1OCBMIDY0IDY2IEMgNjAgNzEgNTYgNzMgNTEgNzcgTCA0NCA2NCBaIiBmaWxsPSIjMDBBODhGIi8+CiAgICA8cGF0aCBkPSJNMzAgNjQgQyAzMyA2NSAzNyA2NSA0MCA2NCBMIDQ0IDc4IEMgMzggODAgMzMgODAgMjggNzggTCAzMCA2NCBaIiBmaWxsPSIjMDA2NjgwIi8+CiAgICA8cGF0aCBkPSJNMTkgNTggQyAyMiA2MCAyNSA2MSAyOCA2MiBMIDI1IDc3IEMgMTkgNzUgMTQgNzMgOSA2OSBMIDE5IDU4IFoiIGZpbGw9IiMwMDY2ODAiLz4KICAgIDxwYXRoIGQ9Ik0xMyA0NyBDIDE0IDUwIDE2IDUzIDE4IDU2IEwgOSA2NyBDIDUgNjMgMiA1OSAwIDUzIEwgMTMgNDcgWiIgZmlsbD0iIzAwNjY4MCIvPgogICAgPHBhdGggZD0iTTEzIDM2IEMgMTIgNDAgMTIgNDQgMTMgNDcgTCAtMSA1MCBDIC0yIDQ0IC0yIDM4IC0xIDMyIEwgMTMgMzYgWiIgZmlsbD0iIzAwNjY4MCIvPgogIDwvZz4KICA8dGV4dCB4PSIxMDAiIHk9IjU4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZvbnQtc2l6ZT01NiIgZmlsbD0iIzAwNjY4MCI+WU9UQTwvdGV4dD4KICA8bGluZSB4MT0iMjY1IiB5MT0iMTAiIHgyPSIyNjUiIHkyPSI3MCIgc3Ryb2tlPSIjMDA2NjgwIiBzdHJva2Utd2lkdGg9IjIiLz4KICA8ZyB0cmFuc2Zvcm09InRyYW5NsYXRlKDI4MCwgMjUpIj4KICAgICAgPHRleHQgeT0iMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTMiIGZpbGw9IiMwMDY2ODAiPllvdXRoIE9wcG9ydHVuaXR5PC90ZXh0PgogICAgICA8dGV4dCB5PSIxNiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTMiIGZpbGw9IiMwMDY2ODAiPiZhbXA7IFRyYW5zZm9ybWF0aW9uPC90ZXh0PgogICAgICA8dGV4dCB5PSIzMiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTMiIGZpbGw9IiMwMDY2ODAiPmluIEFmcmljYTwvdGV4dD4KICA8L2c+Cjwvc3ZnPg==",
    copyrightText: "&copy; 2025 SendREQ. All rights reserved. <span class=\"font-semibold\">YOTA - Youth Opportunity and Transformation in Africa</span>.",
    showDemoCredentials: true
};
