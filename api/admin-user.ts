// Vercel serverless function: POST /api/admin-user
// Performs user create / update / delete using the Supabase SERVICE ROLE key,
// which stays server-side. The caller's Supabase session token (Authorization:
// Bearer <access_token>) is verified here:
//   - an ADMIN may manage any user
//   - a non-admin may update only their OWN profile (name, phone, picture) and
//     their own password, and may not change roles or email
//
// Vercel env (Settings -> Environment Variables, server-side, NOT VITE_):
//   SUPABASE_URL                 https://<project>.supabase.co
//   SUPABASE_SERVICE_ROLE_KEY    the service_role key (secret)

import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method Not Allowed' });
    return;
  }
  if (!url || !serviceKey) {
    res.status(500).json({ error: 'Admin not configured (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY missing)' });
    return;
  }

  const admin = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Authenticate the caller from their session token.
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) {
    res.status(401).json({ error: 'Missing authorization token' });
    return;
  }
  const { data: authData, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !authData?.user?.email) {
    res.status(401).json({ error: 'Invalid session' });
    return;
  }
  const { data: caller } = await admin
    .from('users')
    .select('id, email, roles')
    .eq('email', authData.user.email)
    .maybeSingle();
  const callerRoles = Array.isArray(caller?.roles) ? caller!.roles : [];
  const isAdmin = callerRoles.includes('ADMIN');

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  const { action } = body;

  try {
    if (action === 'create') {
      if (!isAdmin) { res.status(403).json({ error: 'Admin only' }); return; }
      const u = body.user || {};
      if (!u.email || !u.password) { res.status(400).json({ error: 'email and password required' }); return; }

      const { data: createdAuth, error: cErr } = await admin.auth.admin.createUser({
        email: u.email,
        password: u.password,
        email_confirm: true,
      });
      if (cErr || !createdAuth?.user) { res.status(400).json({ error: cErr?.message || 'Could not create auth user' }); return; }

      const { data: inserted, error: iErr } = await admin.from('users').insert({
        id: u.id,
        name: u.name,
        email: u.email,
        phone_number: u.phoneNumber,
        department: u.department,
        position: u.position,
        roles: u.roles,
        profile_picture_url: u.profilePictureUrl,
        auth_id: createdAuth.user.id,
      }).select().single();
      if (iErr) {
        // Roll back the auth account so the two stores do not drift.
        await admin.auth.admin.deleteUser(createdAuth.user.id);
        res.status(400).json({ error: iErr.message }); return;
      }
      res.status(200).json({ user: inserted });
      return;
    }

    if (action === 'update') {
      const id = body.id;
      const updates = body.updates || {};
      if (!id) { res.status(400).json({ error: 'id required' }); return; }

      const { data: target } = await admin
        .from('users')
        .select('id, auth_id')
        .eq('id', id)
        .maybeSingle();
      if (!target) { res.status(404).json({ error: 'User not found' }); return; }

      const isSelf = caller?.id === id;
      if (!isAdmin && !isSelf) { res.status(403).json({ error: 'Not allowed' }); return; }

      // Build the column updates. Non-admins may only touch safe profile fields.
      const dbUpdates: any = {};
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.phoneNumber !== undefined) dbUpdates.phone_number = updates.phoneNumber;
      if (updates.profilePictureUrl !== undefined) dbUpdates.profile_picture_url = updates.profilePictureUrl;
      if (isAdmin) {
        if (updates.email !== undefined) dbUpdates.email = updates.email;
        if (updates.department !== undefined) dbUpdates.department = updates.department;
        if (updates.position !== undefined) dbUpdates.position = updates.position;
        if (updates.roles !== undefined) dbUpdates.roles = updates.roles;
      }
      if (Object.keys(dbUpdates).length > 0) {
        const { error: uErr } = await admin.from('users').update(dbUpdates).eq('id', id);
        if (uErr) { res.status(400).json({ error: uErr.message }); return; }
      }

      // Password change (self or admin). Requires the linked auth account.
      if (updates.password) {
        if (!target.auth_id) { res.status(400).json({ error: 'User has no linked auth account (run the auth migration)' }); return; }
        const { error: pErr } = await admin.auth.admin.updateUserById(target.auth_id, { password: updates.password });
        if (pErr) { res.status(400).json({ error: pErr.message }); return; }
        // Keep the auth email in sync when an admin changes it.
        if (isAdmin && updates.email) {
          await admin.auth.admin.updateUserById(target.auth_id, { email: updates.email });
        }
      } else if (isAdmin && updates.email) {
        if (target.auth_id) await admin.auth.admin.updateUserById(target.auth_id, { email: updates.email });
      }

      res.status(200).json({ ok: true });
      return;
    }

    if (action === 'delete') {
      if (!isAdmin) { res.status(403).json({ error: 'Admin only' }); return; }
      const id = body.id;
      if (!id) { res.status(400).json({ error: 'id required' }); return; }

      const { data: target } = await admin
        .from('users')
        .select('id, auth_id')
        .eq('id', id)
        .maybeSingle();

      await admin.from('users').delete().eq('id', id);
      if (target?.auth_id) await admin.auth.admin.deleteUser(target.auth_id);

      res.status(200).json({ ok: true });
      return;
    }

    res.status(400).json({ error: `Unknown action: ${action}` });
  } catch (e: any) {
    res.status(500).json({ error: e?.message || 'admin-user error' });
  }
}
