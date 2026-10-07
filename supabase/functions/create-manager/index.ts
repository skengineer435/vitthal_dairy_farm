// Edge Function: admin-only user management (create manager, reset password, activate/deactivate).
// Uses the service role key that Supabase injects automatically. Never expose that key in the frontend.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}
const json = (b: unknown, status = 200) => new Response(JSON.stringify(b), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  try {
    const url = Deno.env.get('SUPABASE_URL')!
    const admin = createClient(url, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    const { data: u } = await admin.auth.getUser(token)
    if (!u.user) return json({ error: 'Not signed in' }, 401)
    const { data: me } = await admin.from('profiles').select('role,active').eq('id', u.user.id).maybeSingle()
    if (!me || me.role !== 'admin' || !me.active) return json({ error: 'Admin only' }, 403)

    const body = await req.json()
    if (body.action === 'create') {
      const { email, password, full_name, phone } = body
      if (!email || !password || String(password).length < 6) return json({ error: 'Email and password (min 6 chars) required' }, 400)
      const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true })
      if (error) return json({ error: error.message }, 400)
      const { error: pe } = await admin.from('profiles').insert({ id: data.user!.id, email, full_name: full_name || '', phone: phone || null, role: 'manager', active: true, created_by: u.user.id })
      if (pe) return json({ error: pe.message }, 400)
      return json({ ok: true, id: data.user!.id })
    }
    if (body.action === 'reset_password') {
      const { error } = await admin.auth.admin.updateUserById(body.id, { password: body.password })
      if (error) return json({ error: error.message }, 400)
      return json({ ok: true })
    }
    if (body.action === 'set_active') {
      if (body.id === u.user.id) return json({ error: 'You cannot deactivate yourself' }, 400)
      await admin.from('profiles').update({ active: !!body.active }).eq('id', body.id)
      await admin.auth.admin.updateUserById(body.id, { ban_duration: body.active ? 'none' : '876000h' })
      return json({ ok: true })
    }
    return json({ error: 'Unknown action' }, 400)
  } catch (e) {
    return json({ error: String((e as Error).message || e) }, 500)
  }
})
