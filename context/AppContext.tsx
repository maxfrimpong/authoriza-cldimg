import React, { createContext, useContext, useState, ReactNode, useEffect, useRef } from 'react';
import { User, PaymentRequest, RequestStatus, Role, AuthContextType, Notification as AppNotification, ChatMessage, SystemLists } from '../types';
import { 
    apiLogin, 
    apiGetUsers, 
    apiCreateUser, 
    apiUpdateUser, 
    apiDeleteUser,
    apiGetRequests,
    apiCreateRequest,
    apiUpdateRequest,
    apiGetMessages,
    apiSendMessage,
    apiMarkMessagesRead,
    apiGetSystemLists,
    apiUpdateSystemLists,
    apiSubscribeToMessages,
    apiGetNotifications,
    apiCreateNotification,
    apiMarkNotificationRead,
    apiMarkAllNotificationsRead,
    apiSubscribeToNotifications,
    apiSendEmail,
    apiResetAllRequests
} from '../services/api';
import { supabase } from '../services/supabaseClient';
import { buildStageEmail } from '../services/emailTemplates';
import toast from 'react-hot-toast';

const AppContext = createContext<AuthContextType | undefined>(undefined);

// Public URL used for the "Open SendREQ" buttons in emails. Falls back to the
// running origin (hash router) so links work without extra configuration.
const APP_URL: string =
  import.meta.env.VITE_APP_URL ||
  (typeof window !== 'undefined' ? `${window.location.origin}/#/` : '');

const DEFAULT_COPYRIGHT = `&copy; ${new Date().getFullYear()} SendREQ. Custom developed for <span class="font-semibold">YOTA - Youth Opportunity and Transformation in Africa</span>.`;

const DEFAULT_LOGO = "data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMzgwIDgwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDUsIDUpIHNjYWxlKDAuOSkiPgogICAgPHBhdGggZD0iTTI1IDE4IEMgMjIgMjAgMTkgMjMgMTggMjYgTCA1IDE5IEMgOCAxNCAxMiA5IDE3IDYgTCAyNSAxOCBaIiBmaWxsPSIjRkE0NTE1Ii8+CiAgICA8cGF0aCBkPSJNMzggMTMgQyAzNCAxNCAzMCAxNSAyNyAxOCBMIDIwIDYgQyAyNSAyIDMwIC0wIDM2IC0xIEwgMzggMTMgWiIgZmlsbD0iI0ZBNDUxNSIvPgogICAgPHBhdGggZD0iTTUxIDE1IEMgNDggMTMgNDUgMTIgNDEgMTIgViAtMiBDIDQ3IC0yIDUzIC0wIDU4IDIgTCA1IDE5IiBmaWxsPSIjRkZDNjU4Ii8+CiAgICA8cGF0aCBkPSJNNjMgMjIgQyA2MSAxOSA1OCAxNyA1NSAxNSBMIDYxIDIgQyA2NyA1IDcxIDkgNzUgMTQgTCA2MyAyMiBaIiBmaWxsPSIjRkZDNjU4Ii8+CiAgICA8cGF0aCBkPSJNNjggMzQgQyA2NyAzMCA2NiAyNyA2MyAyNCBMIDc1IDE2IEMgNzkgMjEgODIgMjYgODMgMzIgTCA2OCAzNCBaIiBmaWxsPSIjRkZDNjU4Ii8+CiAgICA8cGF0aCBkPSJNNTYgNDcgQyA2NyA0NCA2NyA0MCA2NiAzNiBMIDgxIDMzIEMgODIgMzkgODIgNDUgODEgNTEgTCA2NiA0NyBaIiBmaWxsPSIjMDBBODhGIi8+CiAgICA8cGF0aCBkPSJNNTcgNTggQyA1OSA1NSA2MSA1MSA2MSA0OCBMIDc2IDUwIEMgNzUgNTYgNzMgNjIgNjkgNjcgTCA1NyA1OCBaIiBmaWxsPSIjMDBBODhGIi8+CiAgICA8cGF0aCBkPSJNNDQgNjQgQyA0NyA2MyA1MCA2MSA1MiA1OCBMIDY0IDY2IEMgNjAgNzEgNTYgNzMgNTEgNzcgTCA0NCA2NCBaIiBmaWxsPSIjMDBBODhGIi8+CiAgICA8cGF0aCBkPSJNMzAgNjQgQyAzMyA2NSAzNyA2NSA0MCA2NCBMIDQ0IDc4IEMgMzggODAgMzMgODAgMjggNzggTCAzMCA2NCBaIiBmaWxsPSIjMDA2NjgwIi8+CiAgICA8cGF0aCBkPSJNMTkgNTggQyAyMiA2MCAyNSA2MSAyOCA2MiBMIDI1IDc3IEMgMTkgNzUgMTQgNzMgOSA2OSBMIDE5IDU4IFoiIGZpbGw9IiMwMDY2ODAiLz4KICAgIDxwYXRoID0iTTEzIDQ3IEMgMTQgNTAgMTYgNTMgMTggNTYgTCA5IDY3IEMgNSA2MyAyIDU5IDAgNTMgTCAxMyA0NyBaIiBmaWxsPSIjMDA2NjgwIi8+CiAgICA8cGF0aCBkPSJNMTMgMzY IEMgMTIgNDAgMTIgNDQgMTMgNDcgTCAtMSA1MCBDIC0yIDQ0IC0yIDM4IC0xIDMyIEwgMTMgMzYgWiIgZmlsbD0iIzAwNjY4MCIvPgogIDwvZz4KICA8dGV4dCB4PSIxMDAiIHk9IjU4IiBmb250LWZhbWlseT0ic2Fucy1zZXJpZiIgZm9udC13ZWlnaHQ9ImJvbGQiIGZvbnQtc2l6ZT0IjU2IiBmaWxsPSIjMDA2NjgwIj5ZT1RBPC90ZXh0PgogIDxsaW5lIHgxPSIyNjUiIHkxPSIxMCIgeDI9IjI2NSIgeTI9IjcwIiBzdHJva2U9IiMwMDY2ODAiIHN0cm9rZS13aWR0aD0iMiIvPgogIDxnIHRyYW5zZm9ybT0idHJhbnNsYXRlKDI4MCwgMjUpIj4KICAgICAgPHRleHQgeT0iMCIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTMiIGZpbGw9IiMwMDY2ODAiPllvdXRoIE9wcG9ydHVuaXR5PC90ZXh0PgogICAgICA8dGV4dCB5PSIxNiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTMiIGZpbGw9IiMwMDY2ODAiPiZhbXA7IFRyYW5zZm9ybWF0aW9uPC90ZXh0PgogICAgICA8dGV4dCB5PSIzMiIgZm9udC1mYW1pbHk9InNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTMiIGZpbGw9IiMwMDY2ODAiPmluIEFmcmljYTwvdGV4dD4KICA8L2c+Cjwvc3ZnPg==";

const DEFAULT_NOTIFICATION_SOUND = "data:audio/wav;base64,UklGRl9vT1dKVRAAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU..."; 

const DEFAULT_LISTS: SystemLists = {
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
  roles: [
    Role.ADMIN, Role.STAFF, Role.SUPERVISOR, Role.AUTHORIZER, Role.APPROVER, Role.AUDITOR
  ],
  logoUrl: DEFAULT_LOGO,
  copyrightText: DEFAULT_COPYRIGHT,
  showDemoCredentials: true,
  notificationSound: DEFAULT_NOTIFICATION_SOUND
};

/**
 * Safely sets an item in localStorage, handling QuotaExceededError gracefully.
 */
const safeSetItem = (key: string, value: string) => {
    try {
        localStorage.setItem(key, value);
    } catch (e) {
        if (e instanceof DOMException && (
            e.code === 22 || 
            e.code === 1014 || 
            e.name === 'QuotaExceededError' || 
            e.name === 'NS_ERROR_DOM_QUOTA_REACHED')
        ) {
            console.warn(`Storage quota exceeded for key "${key}". Clearing cache to prevent failure.`);
            localStorage.removeItem(key);
        } else {
            console.error(`Error saving to localStorage: ${e}`);
        }
    }
};

export const AppProvider = ({ children }: { children?: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeRole, setActiveRole] = useState<string | null>(null);
  
  const [requests, setRequests] = useState<PaymentRequest[]>(() => {
      const cached = localStorage.getItem('sendreq_requests_cache');
      return cached ? JSON.parse(cached) : [];
  });
  const [users, setUsers] = useState<User[]>(() => {
      const cached = localStorage.getItem('sendreq_users_cache');
      return cached ? JSON.parse(cached) : [];
  });
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [systemLists, setSystemLists] = useState<SystemLists>(() => {
      const cached = localStorage.getItem('sendreq_system_lists_cache');
      return cached ? JSON.parse(cached) : DEFAULT_LISTS;
  });
  
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [logoUrl, setLogoUrl] = useState<string>(() => {
      const cached = localStorage.getItem('sendreq_logo');
      return cached || DEFAULT_LOGO;
  });
  const [copyrightText, setCopyrightText] = useState<string>(() => {
      const cached = localStorage.getItem('sendreq_copyright');
      return cached || DEFAULT_COPYRIGHT;
  });
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([]);
  const [showDemoCredentials, setShowDemoCredentials] = useState<boolean>(true);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const subscriptionRef = useRef<any | null>(null);
  const notifSubscriptionRef = useRef<any | null>(null);

  useEffect(() => {
    if ('Notification' in window && window.Notification.permission === 'default') {
        window.Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
      audioRef.current = new Audio(systemLists.notificationSound || DEFAULT_NOTIFICATION_SOUND);
      audioRef.current.volume = 0.8;
  }, [systemLists.notificationSound]);

  const playNotificationSound = () => {
    if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(e => console.log("Audio play failed:", e));
    }
  };

  const sendPushNotification = (title: string, body: string) => {
      if ('Notification' in window && window.Notification.permission === 'granted') {
          try {
              new window.Notification(title, { body, icon: '/vite.svg' }); 
          } catch (e) {
              console.log("Push notification failed:", e);
          }
      }
  };

  useEffect(() => {
      const storedTheme = localStorage.getItem('sendreq_theme');
      if (storedTheme === 'dark' || (!storedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
          setTheme('dark');
          document.documentElement.classList.add('dark');
      } else {
          setTheme('light');
          document.documentElement.classList.remove('dark');
      }
  }, []);

  const toggleTheme = () => {
      setTheme(prev => {
          const newTheme = prev === 'light' ? 'dark' : 'light';
          localStorage.setItem('sendreq_theme', newTheme);
          if (newTheme === 'dark') {
              document.documentElement.classList.add('dark');
          } else {
              document.documentElement.classList.remove('dark');
          }
          return newTheme;
      });
  };

  const loadUserData = async () => {
      const currentUserId = localStorage.getItem('sendreq_user_id');
      if (!currentUserId) return;

      const fetchRequests = async () => {
          try {
              const reqs = await apiGetRequests();
              setRequests(reqs);
              safeSetItem('sendreq_requests_cache', JSON.stringify(reqs));
          } catch (err) {
              console.error("Requests sync failed", err);
          }
      };

      const fetchMessages = async () => {
          try {
              const msgs = await apiGetMessages();
              setMessages(msgs);
          } catch (err) {
              console.error("Messages sync failed", err);
          }
      };

      const fetchNotifications = async () => {
          try {
              const notes = await apiGetNotifications();
              setNotifications(notes);
          } catch (err) {
              console.error("Notifications sync failed", err);
          }
      };

      await Promise.allSettled([fetchRequests(), fetchMessages(), fetchNotifications()]);
  };

  useEffect(() => {
    const initData = async () => {
        try {
            const storedDemoShow = localStorage.getItem('sendreq_show_demo');
            if (storedDemoShow !== null) setShowDemoCredentials(JSON.parse(storedDemoShow));

            const storedUserId = localStorage.getItem('sendreq_user_id');
            const cachedUsersStr = localStorage.getItem('sendreq_users_cache');
            
            if (storedUserId && cachedUsersStr) {
                const cachedUsersArr = JSON.parse(cachedUsersStr);
                const found = cachedUsersArr.find((u: any) => u.id === storedUserId);
                if (found) {
                    setUser(found);
                    setActiveRole(found.roles[0]);
                    loadUserData();
                }
            }

            setIsLoading(false);

            const [fetchedUsers, fetchedLists] = await Promise.all([
                apiGetUsers(),
                apiGetSystemLists(DEFAULT_LISTS)
            ]);

            setUsers(fetchedUsers);
            safeSetItem('sendreq_users_cache', JSON.stringify(fetchedUsers));
            
            setSystemLists(fetchedLists);
            safeSetItem('sendreq_system_lists_cache', JSON.stringify(fetchedLists));
            
            if (fetchedLists.logoUrl) setLogoUrl(fetchedLists.logoUrl);
            if (fetchedLists.copyrightText) setCopyrightText(fetchedLists.copyrightText);
            if (fetchedLists.showDemoCredentials !== undefined) setShowDemoCredentials(fetchedLists.showDemoCredentials);

            if (storedUserId) {
                const found = fetchedUsers.find(u => u.id === storedUserId);
                if (found) {
                    setUser(found);
                    if (!activeRole && found.roles.length > 0) setActiveRole(found.roles[0]);
                }
            }

            subscriptionRef.current = apiSubscribeToMessages((payload) => {
                setMessages(prev => {
                    const index = prev.findIndex(m => m.id === payload.id);
                    if (index !== -1) {
                        const newArr = [...prev];
                        newArr[index] = payload;
                        return newArr;
                    } else {
                        if (payload.senderId !== localStorage.getItem('sendreq_user_id')) {
                            playNotificationSound();
                            const sender = fetchedUsers.find(u => u.id === payload.senderId);
                            toast(`New message from ${sender ? sender.name : 'Teammate'}`);
                        }
                        return [...prev, payload];
                    }
                });
            });

            notifSubscriptionRef.current = apiSubscribeToNotifications((payload) => {
                 setNotifications(prev => {
                     const index = prev.findIndex(n => n.id === payload.id);
                     if (index !== -1) {
                         const newArr = [...prev];
                         newArr[index] = payload;
                         return newArr;
                     } else {
                         const currentUserId = localStorage.getItem('sendreq_user_id');
                         if (payload.userId === currentUserId) {
                             playNotificationSound();
                             if (payload.type === 'success') toast.success(payload.message);
                             else if (payload.type === 'error') toast.error(payload.message);
                             else toast(payload.message, { icon: '🔔' });
                         }
                         return [payload, ...prev];
                     }
                 });
            });

        } catch (error) {
            console.error("Initialization error:", error);
            setIsLoading(false);
        }
    };

    initData();

    return () => {
        if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
        if (notifSubscriptionRef.current) notifSubscriptionRef.current.unsubscribe();
    };
  }, []);

  // Presence Tracking Effect
  useEffect(() => {
    if (!user) {
        setOnlineUserIds([]);
        return;
    }

    const channel = supabase.channel('online-users', {
        config: {
            presence: {
                key: user.id,
            },
        },
    });

    channel
        .on('presence', { event: 'sync' }, () => {
            const state = channel.presenceState();
            // Presence state keys are the user IDs we set in the key config above
            setOnlineUserIds(Object.keys(state));
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({ online_at: new Date().toISOString() });
            }
        });

    return () => {
        channel.unsubscribe();
    };
  }, [user?.id]);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
        const foundUser = await apiLogin(email, password);
        if (foundUser) {
            setUser(foundUser);
            setActiveRole(foundUser.roles.length > 0 ? foundUser.roles[0] : Role.STAFF);
            localStorage.setItem('sendreq_user_id', foundUser.id);
            loadUserData();
            return true;
        }
        return false;
    } catch (e) {
        console.error(e);
        return false;
    }
  };

  const logout = () => {
    setUser(null);
    setActiveRole(null);
    localStorage.removeItem('sendreq_user_id');
    localStorage.removeItem('sendreq_requests_cache');
    setRequests([]);
    setMessages([]);
    setNotifications([]);
  };

  const switchRole = (role: string) => {
    if (user && user.roles.includes(role)) setActiveRole(role);
  };

  const createNotification = async (userId: string, message: string, type: 'info' | 'success' | 'error' | 'warning' = 'info', metadata?: { requestId?: string }) => {
    const newNote: AppNotification = {
      id: `n${Date.now()}-${Math.random()}`,
      userId,
      message,
      type,
      isRead: false,
      createdAt: new Date().toISOString(),
      metadata
    };
    setNotifications(prev => [newNote, ...prev]);
    try {
        await apiCreateNotification(newNote);
    } catch (e) {
        console.error("Notification sync failed", e);
    }
  };

  const getUserEmail = (userId: string) => users.find(u => u.id === userId)?.email;

  const addRequest = async (reqData: any) => {
    const status = reqData.status || RequestStatus.PENDING_SUPERVISOR;
    const newRequest: PaymentRequest = {
      id: `r${Date.now()}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: status,
      editCount: 0,
      ...reqData
    };
    setRequests(prev => {
        const next = [newRequest, ...prev];
        safeSetItem('sendreq_requests_cache', JSON.stringify(next));
        return next;
    });
    try {
        await apiCreateRequest(newRequest);
        if (status !== RequestStatus.DRAFT && reqData.supervisorId) {
            const supervisor = users.find(u => u.id === reqData.supervisorId);
            const msg = `New payment request of ${newRequest.currency} ${newRequest.amount.toLocaleString()} for ${newRequest.vendorName} by ${reqData.requesterName} requires your confirmation.`;
            await createNotification(reqData.supervisorId, msg, 'info', { requestId: newRequest.id });
            if (supervisor?.email) {
                const tpl = buildStageEmail({ status: RequestStatus.PENDING_SUPERVISOR, audience: 'actor', recipientName: supervisor.name, request: newRequest, appUrl: APP_URL });
                if (tpl) apiSendEmail(supervisor.email, tpl.subject, tpl.html);
            }
        } else if (status === RequestStatus.DRAFT) {
            toast.success("Request saved as Draft.");
        }
    } catch (error) {
        console.error("Create request failed:", error);
    }
  };

  const editRequest = async (id: string, updatedData: Partial<PaymentRequest>) => {
    const originalRequest = requests.find(r => r.id === id);
    if (!originalRequest) return;
    const isDraft = originalRequest.status === RequestStatus.DRAFT;
    const updates = {
          ...updatedData,
          editCount: isDraft ? 0 : (originalRequest.editCount + 1),
          updatedAt: new Date().toISOString()
    };
    setRequests(prev => {
        const next = prev.map(req => req.id === id ? { ...req, ...updates } : req);
        safeSetItem('sendreq_requests_cache', JSON.stringify(next));
        return next;
    });
    try {
        await apiUpdateRequest(id, updates);
        toast.success(isDraft ? "Request updated." : "Draft updated.");
        
        // Notify supervisor if it's no longer a draft
        if (updates.status === RequestStatus.PENDING_SUPERVISOR && updates.supervisorId) {
            const msg = `Resubmitted request of ${originalRequest.currency} ${originalRequest.amount.toLocaleString()} for ${originalRequest.vendorName} requires your review.`;
            await createNotification(updates.supervisorId, msg, 'info', { requestId: id });
        }
    } catch (error) {
        console.error("Edit request failed:", error);
    }
  };

  const updateRequestStatus = async (id: string, status: RequestStatus, remarks?: string, signature?: string) => {
    const targetRequest = requests.find(r => r.id === id);
    if (!targetRequest) return;
    const updates: Partial<PaymentRequest> = {
          status,
          approverId: status === RequestStatus.APPROVED && user ? user.id : targetRequest.approverId,
          remarks: remarks || targetRequest.remarks,
          updatedAt: new Date().toISOString()
    };
    if (signature) {
        if (status === RequestStatus.PENDING_AUTHORIZATION) updates.supervisorSignature = signature;
        else if (status === RequestStatus.AUTHORIZED) updates.authorizerSignature = signature;
        else if (status === RequestStatus.APPROVED) updates.approverSignature = signature;
    }
    setRequests(prev => {
        const next = prev.map(req => req.id === id ? { ...req, ...updates } : req);
        safeSetItem('sendreq_requests_cache', JSON.stringify(next));
        return next;
    });
    try {
        await apiUpdateRequest(id, updates);
        
        const updatedRequest = { ...targetRequest, ...updates } as PaymentRequest;

        // In-app notification + templated email for the requester
        const requester = users.find(u => u.id === targetRequest.requesterId);
        let requesterMsg = `Your request of ${targetRequest.currency} ${targetRequest.amount.toLocaleString()} for ${targetRequest.vendorName} status changed to: ${status}`;
        if (remarks && (status.includes('Rejected') || status === RequestStatus.FROZEN)) {
            requesterMsg += `. Reason: ${remarks}`;
        }
        await createNotification(targetRequest.requesterId, requesterMsg, status === RequestStatus.APPROVED ? 'success' : (status.includes('Rejected') ? 'error' : 'info'), { requestId: id });
        if (requester?.email) {
            const tpl = buildStageEmail({ status, audience: 'requester', recipientName: requester.name, request: updatedRequest, appUrl: APP_URL, reason: remarks });
            if (tpl) apiSendEmail(requester.email, tpl.subject, tpl.html);
        }

        // In-app notification + templated email for the next actor in line
        if (status === RequestStatus.PENDING_AUTHORIZATION && targetRequest.authorizerId) {
            const authorizer = users.find(u => u.id === targetRequest.authorizerId);
            const msg = `New authorized payment of ${targetRequest.currency} ${targetRequest.amount.toLocaleString()} for ${targetRequest.vendorName} requires your authorization.`;
            await createNotification(targetRequest.authorizerId, msg, 'info', { requestId: id });
            if (authorizer?.email) {
                const tpl = buildStageEmail({ status, audience: 'actor', recipientName: authorizer.name, request: updatedRequest, appUrl: APP_URL });
                if (tpl) apiSendEmail(authorizer.email, tpl.subject, tpl.html);
            }
        } else if (status === RequestStatus.AUTHORIZED) {
            // Notify all Approvers (EDs)
            const eds = users.filter(u => u.roles.includes(Role.APPROVER));
            const msg = `Authorized payment of ${targetRequest.currency} ${targetRequest.amount.toLocaleString()} for ${targetRequest.vendorName} is pending your final approval.`;
            for (const ed of eds) {
                await createNotification(ed.id, msg, 'info', { requestId: id });
                if (ed.email) {
                    const tpl = buildStageEmail({ status, audience: 'actor', recipientName: ed.name, request: updatedRequest, appUrl: APP_URL });
                    if (tpl) apiSendEmail(ed.email, tpl.subject, tpl.html);
                }
            }
        }

    } catch (error) {
        console.error("Status update failed:", error);
    }
  };

  const addUser = async (userData: Omit<User, 'id'>) => {
    const newUser: User = { ...userData, id: `u${Date.now()}` };
    setUsers(prev => [...prev, newUser]);
    await apiCreateUser(newUser);
  };

  const editUser = async (id: string, userData: Partial<User>) => {
    setUsers(prev => prev.map(u => u.id === id ? { ...u, ...userData } : u));
    await apiUpdateUser(id, userData);
  };

  const deleteUser = async (id: string) => {
    setUsers(prev => prev.filter(u => u.id !== id));
    await apiDeleteUser(id);
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    await apiMarkNotificationRead(id);
  };

  const markAllAsRead = async () => {
    if (!user) return;
    setNotifications(prev => prev.map(n => n.userId === user.id ? { ...n, isRead: true } : n));
    await apiMarkAllNotificationsRead(user.id);
  };

  const sendMessage = async (receiverId: string, content: string) => {
    if (!user) return;
    const newMessage: ChatMessage = {
      id: `m${Date.now()}`,
      senderId: user.id,
      receiverId,
      content,
      timestamp: new Date().toISOString(),
      isRead: false
    };
    setMessages(prev => [...prev, newMessage]);
    await apiSendMessage(newMessage);
  };

  const markChatAsRead = async (senderId: string) => {
    if (!user) return;
    setMessages(prev => prev.map(msg => 
      (msg.senderId === senderId && msg.receiverId === user.id && !msg.isRead)
        ? { ...msg, isRead: true }
        : msg
    ));
    await apiMarkMessagesRead(senderId, user.id);
  };

  const updateLogo = async (url: string) => {
      setLogoUrl(url);
      safeSetItem('sendreq_logo', url);
      await apiUpdateSystemLists({ ...systemLists, logoUrl: url });
  };

  const updateCopyrightText = async (text: string) => {
      setCopyrightText(text);
      safeSetItem('sendreq_copyright', text);
      await apiUpdateSystemLists({ ...systemLists, copyrightText: text });
  };

  const updateNotificationSound = async (base64Sound: string) => {
      const updatedLists = { ...systemLists, notificationSound: base64Sound };
      setSystemLists(updatedLists);
      await apiUpdateSystemLists(updatedLists);
  };

  const updateSystemList = async (listName: keyof Omit<SystemLists, 'logoUrl' | 'copyrightText' | 'showDemoCredentials' | 'notificationSound'>, newList: string[]) => {
      const updatedLists = { ...systemLists, [listName]: newList };
      setSystemLists(updatedLists);
      safeSetItem('sendreq_system_lists_cache', JSON.stringify(updatedLists));
  };

  const toggleDemoCredentials = async (show: boolean) => {
      setShowDemoCredentials(show);
      safeSetItem('sendreq_show_demo', JSON.stringify(show));
      await apiUpdateSystemLists({ ...systemLists, showDemoCredentials: show });
  };

  const resetSystemData = async () => {
    if (!user || !user.roles.includes(Role.ADMIN)) return;
    setIsLoading(true);
    try {
        const success = await apiResetAllRequests();
        if (success) {
            setRequests([]);
            localStorage.removeItem('sendreq_requests_cache');
            toast.success("All request data reset.");
        }
    } catch (e) {
        console.error(e);
    } finally {
        setIsLoading(false);
    }
  };

  if (isLoading && !user) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center bg-white dark:bg-gray-900 transition-colors">
              <div className="w-16 h-16 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin mb-4"></div>
              <p className="text-brand-dark dark:text-brand-teal font-medium animate-pulse">Initializing SendREQ...</p>
          </div>
      );
  }

  return (
    <AppContext.Provider value={{ 
      user, activeRole, users, requests, notifications, messages, logoUrl, copyrightText, onlineUserIds, systemLists, showDemoCredentials, theme,
      login: (email, password) => login(email, password) as any,
      logout, switchRole, addRequest, editRequest, updateRequestStatus, addUser, editUser, deleteUser,
      markAsRead, markAllAsRead, sendMessage, markChatAsRead, updateLogo, updateCopyrightText, updateSystemList, 
      updateNotificationSound, toggleDemoCredentials, toggleTheme, resetSystemData
    }}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
};