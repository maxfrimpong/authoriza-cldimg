
import { 
    User, 
    PaymentRequest, 
    ChatMessage, 
    SystemLists,
    Notification
} from '../types';
import { supabase, FUNCTIONS_URL, SUPABASE_ANON } from './supabaseClient';
import { MOCK_USERS, MOCK_REQUESTS, MOCK_MESSAGES, MOCK_SYSTEM_LISTS } from '../context/MockData';

// Helper to safely parse JSON or return default
const safeParse = (val: any, fallback: any) => {
    if (val === null || val === undefined) return fallback;
    if (typeof val === 'object') return val;
    try {
        return JSON.parse(val);
    } catch (e) {
        return fallback;
    }
};

const mapUser = (u: any): User => ({
    id: u.id ? String(u.id) : '',
    name: u.name || '',
    email: u.email || '',
    phoneNumber: u.phone_number || '',
    password: u.password || '',
    department: u.department || '',
    position: u.position || '',
    roles: Array.isArray(u.roles) ? u.roles : safeParse(u.roles, []),
    profilePictureUrl: u.profile_picture_url || ''
});

const mapRequest = (r: any): PaymentRequest => ({
    id: r.id ? String(r.id) : '',
    requesterId: r.requester_id ? String(r.requester_id) : '',
    requesterName: r.requester_name || '',
    department: r.department || '',
    position: r.position || '',
    vendorName: r.vendor_name || '',
    vendorTin: r.vendor_tin || '',
    paymentDetails: r.payment_details || '',
    amount: Number(r.amount) || 0, 
    fullRequestedAmount: Number(r.full_requested_amount) || 0,
    currency: r.currency || 'GHS',
    billingProject: r.billing_project || '',
    requestSubject: r.request_subject || '',
    description: r.description || '',
    billingItems: Array.isArray(r.billing_items) ? r.billing_items : safeParse(r.billing_items, []),
    withholdingTaxPercentage: Number(r.withholding_tax_percentage) || 0,
    otherWithholdingTaxPercentage: Number(r.other_withholding_tax_percentage) || 0,
    partPaymentPercentage: Number(r.part_payment_percentage) || 100,
    files: Array.isArray(r.files) ? r.files : safeParse(r.files, []),
    supervisorId: r.supervisor_id ? String(r.supervisor_id) : '',
    authorizerId: r.authorizer_id ? String(r.authorizer_id) : '',
    approverId: r.approver_id ? String(r.approver_id) : undefined,
    status: r.status || 'Pending Supervisor',
    createdAt: r.created_at || new Date().toISOString(),
    updatedAt: r.updated_at || new Date().toISOString(),
    remarks: r.remarks || '',
    signOff: r.sign_off || '',
    requesterSignature: r.requester_signature || '',
    supervisorSignature: r.supervisor_signature || '',
    authorizerSignature: r.authorizer_signature || '',
    approverSignature: r.approver_signature || '',
    editCount: Number(r.edit_count) || 0
});

const mapMessage = (m: any): ChatMessage => ({
    id: m.id ? String(m.id) : '',
    senderId: m.sender_id ? String(m.sender_id) : '',
    receiverId: m.receiver_id ? String(m.receiver_id) : '',
    content: m.content || '',
    timestamp: m.timestamp || new Date().toISOString(),
    isRead: !!m.is_read
});

const mapNotification = (n: any): Notification => ({
    id: n.id ? String(n.id) : '',
    userId: n.user_id ? String(n.user_id) : '',
    message: n.message || '',
    isRead: !!n.is_read,
    createdAt: n.created_at || new Date().toISOString(),
    type: n.type || 'info',
    metadata: typeof n.metadata === 'object' ? n.metadata : safeParse(n.metadata, {})
});

export const apiLogin = async (email: string, password: string): Promise<User | null> => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('email', email)
            .eq('password', password)
            .limit(1)
            .maybeSingle(); 
        
        if (error) throw error;
        return data ? mapUser(data) : null;
    } catch (err) {
        console.error("Login Failed:", err);
        return null;
    }
};

export const apiGetUsers = async (): Promise<User[]> => {
    try {
        const { data, error } = await supabase.from('users').select('*');
        if (error) throw error;
        return data.length > 0 ? data.map(mapUser) : MOCK_USERS;
    } catch (e) {
        console.error("DB Users fetch failed:", e);
        return MOCK_USERS;
    }
};

export const apiCreateUser = async (user: User): Promise<User> => {
    await supabase.from('users').insert({
        id: user.id,
        name: user.name,
        email: user.email,
        phone_number: user.phoneNumber,
        password: user.password,
        department: user.department,
        position: user.position,
        roles: user.roles,
        profile_picture_url: user.profilePictureUrl
    });
    return user;
};

export const apiUpdateUser = async (id: string, updates: Partial<User>): Promise<User> => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber;
    if (updates.department !== undefined) dbUpdates.department = updates.department;
    if (updates.position !== undefined) dbUpdates.position = updates.position;
    if (updates.roles !== undefined) dbUpdates.roles = updates.roles;
    if (updates.profilePictureUrl !== undefined) dbUpdates.profile_picture_url = updates.profilePictureUrl;
    if (updates.password !== undefined) dbUpdates.password = updates.password;

    const { data, error } = await supabase.from('users').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    return mapUser(data);
};

export const apiDeleteUser = async (id: string): Promise<void> => {
    await supabase.from('users').delete().eq('id', id);
};

export const apiGetRequests = async (): Promise<PaymentRequest[]> => {
    try {
        const { data, error } = await supabase.from('requests').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        return data.map(mapRequest);
    } catch (e) {
        console.error("DB Requests fetch failed:", e);
        return MOCK_REQUESTS;
    }
};

export const apiCreateRequest = async (request: PaymentRequest): Promise<PaymentRequest> => {
    await supabase.from('requests').insert({
        id: request.id,
        requester_id: request.requesterId,
        requester_name: request.requesterName,
        department: request.department,
        position: request.position,
        vendor_name: request.vendorName,
        vendor_tin: request.vendorTin,
        payment_details: request.paymentDetails,
        amount: request.amount,
        full_requested_amount: request.fullRequestedAmount,
        currency: request.currency,
        billing_project: request.billingProject,
        request_subject: request.requestSubject,
        description: request.description,
        billing_items: request.billingItems,
        withholding_tax_percentage: request.withholdingTaxPercentage,
        other_withholding_tax_percentage: request.otherWithholdingTaxPercentage,
        part_payment_percentage: request.partPaymentPercentage,
        files: request.files,
        supervisor_id: request.supervisorId,
        authorizer_id: request.authorizerId,
        status: request.status,
        created_at: request.createdAt,
        updated_at: request.updatedAt,
        sign_off: request.signOff,
        requester_signature: request.requesterSignature,
        edit_count: request.editCount
    });
    return request;
};

export const apiUpdateRequest = async (id: string, updates: Partial<PaymentRequest>): Promise<PaymentRequest> => {
    const dbUpdates: any = { updated_at: new Date().toISOString() };
    if (updates.vendorName !== undefined) dbUpdates.vendor_name = updates.vendorName;
    if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
    if (updates.fullRequestedAmount !== undefined) dbUpdates.full_requested_amount = updates.fullRequestedAmount;
    if (updates.currency !== undefined) dbUpdates.currency = updates.currency;
    if (updates.billingProject !== undefined) dbUpdates.billing_project = updates.billingProject;
    if (updates.requestSubject !== undefined) dbUpdates.request_subject = updates.requestSubject;
    if (updates.description !== undefined) dbUpdates.description = updates.description;
    if (updates.billingItems !== undefined) dbUpdates.billing_items = updates.billingItems;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.remarks !== undefined) dbUpdates.remarks = updates.remarks;
    if (updates.approverId !== undefined) dbUpdates.approver_id = updates.approverId;
    if (updates.editCount !== undefined) dbUpdates.edit_count = updates.editCount;
    if (updates.requesterSignature !== undefined) dbUpdates.requester_signature = updates.requesterSignature;
    if (updates.supervisorSignature !== undefined) dbUpdates.supervisor_signature = updates.supervisorSignature;
    if (updates.authorizerSignature !== undefined) dbUpdates.authorizer_signature = updates.authorizerSignature;
    if (updates.approverSignature !== undefined) dbUpdates.approver_signature = updates.approverSignature;

    const { data, error } = await supabase.from('requests').update(dbUpdates).eq('id', id).select().single();
    if (error) throw error;
    return mapRequest(data);
};

export const apiResetAllRequests = async (): Promise<boolean> => {
    const { error } = await supabase.from('requests').delete().neq('id', '0');
    return !error;
};

export const apiSendEmail = async (to: string, subject: string, html: string) => {
    try {
        await fetch(`${FUNCTIONS_URL}/notify`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_ANON}`,
            },
            body: JSON.stringify({ to, subject, html })
        });
    } catch (e) {
        console.warn("Notification relay failed:", e);
    }
};

export const apiGetMessages = async (): Promise<ChatMessage[]> => {
    const { data, error } = await supabase.from('messages').select('*').order('timestamp', { ascending: true });
    return error ? [] : data.map(mapMessage);
};

export const apiSendMessage = async (message: ChatMessage): Promise<ChatMessage> => {
    await supabase.from('messages').insert({
        id: message.id,
        sender_id: message.senderId,
        receiver_id: message.receiverId,
        content: message.content,
        timestamp: message.timestamp,
        is_read: message.isRead
    });
    return message;
};

export const apiMarkMessagesRead = async (senderId: string, receiverId: string): Promise<void> => {
    await supabase.from('messages').update({ is_read: true }).eq('sender_id', senderId).eq('receiver_id', receiverId);
};

export const apiSubscribeToMessages = (callback: (msg: ChatMessage) => void) => {
    return supabase.channel('public:messages').on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, (payload) => {
        if (payload.new) callback(mapMessage(payload.new));
    }).subscribe();
};

export const apiGetNotifications = async (): Promise<Notification[]> => {
    const { data, error } = await supabase.from('notifications').select('*').order('created_at', { ascending: false });
    return error ? [] : data.map(mapNotification);
};

export const apiCreateNotification = async (notification: Notification): Promise<Notification> => {
    await supabase.from('notifications').insert({
        id: notification.id,
        user_id: notification.userId,
        message: notification.message,
        is_read: notification.isRead,
        created_at: notification.createdAt,
        type: notification.type,
        metadata: notification.metadata
    });
    return notification;
};

export const apiMarkNotificationRead = async (id: string): Promise<void> => {
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
};

export const apiMarkAllNotificationsRead = async (userId: string): Promise<void> => {
    await supabase.from('notifications').update({ is_read: true }).eq('user_id', userId);
};

export const apiSubscribeToNotifications = (callback: (n: Notification) => void) => {
    return supabase.channel('public:notifications').on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, (payload) => {
        if (payload.new) callback(mapNotification(payload.new));
    }).subscribe();
};

export const apiGetSystemLists = async (defaultLists: SystemLists): Promise<SystemLists> => {
    const { data, error } = await supabase.from('system_config').select('data').eq('id', 1).single();
    if (error || !data) return MOCK_SYSTEM_LISTS || defaultLists;
    return (data.data as SystemLists);
};

export const apiUpdateSystemLists = async (lists: SystemLists): Promise<SystemLists> => {
    await supabase.from('system_config').upsert({ id: 1, data: lists });
    return lists;
};
