import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
}

// Helper para crear un cliente de Supabase con permisos de administrador
const createAdminClient = (): SupabaseClient => createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Helper para verificar si el usuario que realiza la solicitud es un superadministrador
const verifySuperAdmin = async (req: Request, supabaseAdmin: SupabaseClient) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) throw new Error('No authorization header')
  const token = authHeader.replace('Bearer ', '')
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  if (!user) throw new Error('Invalid token')
  
  // Obtener el rol del perfil del usuario, haciendo join con la tabla roles
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('role_id, roles(name)')
    .eq('id', user.id)
    .single()
  
  if (error || !profile || (profile.roles as { name: string } | null)?.name !== 'superadmin') {
    throw new Error('Permission denied. Not a superadmin.')
  }
  return user
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseAdmin = createAdminClient()
    await verifySuperAdmin(req, supabaseAdmin)

    switch (req.method) {
      case 'GET': {
        const { data: { users }, error: usersError } = await supabaseAdmin.auth.admin.listUsers()
        if (usersError) throw usersError
        
        // Obtener perfiles con el nombre del rol
        const { data: profiles, error: profilesError } = await supabaseAdmin.from('profiles').select('*, roles(name)')
        if (profilesError) throw profilesError

        const combinedUsers = users.map(u => {
          const profile = profiles.find(p => p.id === u.id)
          const bannedUntil = u.banned_until || '1970-01-01T00:00:00Z';
          const roleName = (profile?.roles as { name: string } | null)?.name || 'employee'; // Acceso seguro al nombre del rol
          return {
            id: u.id,
            email: u.email,
            full_name: profile?.full_name || '',
            role: roleName,
            created_at: u.created_at,
            is_banned: new Date(bannedUntil) > new Date(),
          }
        })
        return new Response(JSON.stringify(combinedUsers), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      case 'POST': {
        const { email, password, full_name, role } = await req.json()

        // Obtener el role_id basado en el nombre del rol
        const { data: roleData, error: roleError } = await supabaseAdmin
            .from('roles')
            .select('id')
            .eq('name', role)
            .single();
        if (roleError || !roleData) throw new Error('Role not found');
        const roleId = roleData.id;

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { full_name }
        })
        if (error) throw error
        
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ role_id: roleId }) // Actualizar role_id, no 'role'
          .eq('id', data.user.id)
        if (profileError) {
          await supabaseAdmin.auth.admin.deleteUser(data.user.id)
          throw profileError
        }
        return new Response(JSON.stringify(data.user), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      case 'PUT': {
        const { id, full_name, role, email, password, is_banned } = await req.json();

        // --- Profile Update Logic ---
        const profileUpdatePayload: any = {};
        if (typeof full_name !== 'undefined') profileUpdatePayload.full_name = full_name;
        
        if (typeof role !== 'undefined') {
            // Obtener el role_id basado en el nombre del rol
            const { data: roleData, error: roleError } = await supabaseAdmin
                .from('roles')
                .select('id')
                .eq('name', role)
                .single();
            if (roleError || !roleData) throw new Error('Role not found');
            profileUpdatePayload.role_id = roleData.id; // Actualizar role_id, no 'role'
        }

        if (Object.keys(profileUpdatePayload).length > 0) {
            const { error: profileError } = await supabaseAdmin
                .from('profiles')
                .update(profileUpdatePayload)
                .eq('id', id);
            if (profileError) throw profileError;
        }

        // --- Auth Update Logic ---
        const authUpdatePayload: any = {};
        if (email) authUpdatePayload.email = email;
        if (password) authUpdatePayload.password = password;
        if (typeof is_banned !== 'undefined') {
            authUpdatePayload.ban_duration = is_banned ? '36500d' : 'none'; // ~100 years for 'forever'
        }
        // Keep user_metadata in sync with profile name
        if (typeof full_name !== 'undefined') {
            authUpdatePayload.user_metadata = { full_name };
        }

        if (Object.keys(authUpdatePayload).length > 0) {
            const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(id, authUpdatePayload);
            if (authError) throw authError;
        }

        return new Response(JSON.stringify({ message: 'User updated successfully' }), { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        });
      }
      case 'DELETE': {
        const { id } = await req.json()
        const { data, error } = await supabaseAdmin.auth.admin.deleteUser(id)
        if (error) throw error
        return new Response(JSON.stringify({ message: 'User deleted successfully' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
      }
      default:
        return new Response('Method Not Allowed', { status: 405, headers: corsHeaders })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message.includes('Permission denied') ? 403 : 500,
    })
  }
})