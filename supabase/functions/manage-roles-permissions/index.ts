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
  
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('roles(name)')
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
    await verifySuperAdmin(req, supabaseAdmin) // Solo superadmins pueden acceder

    const url = new URL(req.url);
    const pathSegments = url.pathname.split('/').filter(Boolean);
    const resource = pathSegments[pathSegments.length - 1]; // 'roles' o 'permissions'

    switch (req.method) {
      case 'GET': {
        if (resource === 'roles') {
          const { data: roles, error } = await supabaseAdmin.from('roles').select('*, role_permissions(permissions(id, action))');
          if (error) throw error;
          // Formatear la respuesta para incluir solo las acciones de permiso
          const formattedRoles = roles.map(role => ({
            ...role,
            permissions: role.role_permissions.map((rp: any) => rp.permissions.action)
          }));
          return new Response(JSON.stringify(formattedRoles), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else if (resource === 'permissions') {
          const { data: permissions, error } = await supabaseAdmin.from('permissions').select('*');
          if (error) throw error;
          return new Response(JSON.stringify(permissions), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else {
          return new Response('Not Found', { status: 404, headers: corsHeaders });
        }
      }
      case 'POST': {
        const body = await req.json();
        if (resource === 'roles') {
          const { name, description, permissions: newPermissions = [] } = body;
          const { data: newRole, error: roleError } = await supabaseAdmin.from('roles').insert({ name, description }).select().single();
          if (roleError) throw roleError;

          if (newPermissions.length > 0) {
            const { data: permissionIds, error: permIdError } = await supabaseAdmin.from('permissions').select('id').in('action', newPermissions);
            if (permIdError) throw permIdError;

            const rolePermissionsToInsert = permissionIds.map(p => ({
              role_id: newRole.id,
              permission_id: p.id
            }));
            const { error: rpError } = await supabaseAdmin.from('role_permissions').insert(rolePermissionsToInsert);
            if (rpError) throw rpError;
          }
          return new Response(JSON.stringify(newRole), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else {
          return new Response('Not Found', { status: 404, headers: corsHeaders });
        }
      }
      case 'PUT': {
        const body = await req.json();
        if (resource === 'roles') {
          const { id, name, description, permissions: updatedPermissions = [] } = body;
          const { error: roleError } = await supabaseAdmin.from('roles').update({ name, description }).eq('id', id);
          if (roleError) throw roleError;

          // Actualizar permisos del rol
          await supabaseAdmin.from('role_permissions').delete().eq('role_id', id); // Eliminar todos los permisos existentes
          if (updatedPermissions.length > 0) {
            const { data: permissionIds, error: permIdError } = await supabaseAdmin.from('permissions').select('id').in('action', updatedPermissions);
            if (permIdError) throw permIdError;

            const rolePermissionsToInsert = permissionIds.map(p => ({
              role_id: id,
              permission_id: p.id
            }));
            const { error: rpError } = await supabaseAdmin.from('role_permissions').insert(rolePermissionsToInsert);
            if (rpError) throw rpError;
          }
          return new Response(JSON.stringify({ message: 'Role updated successfully' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else {
          return new Response('Not Found', { status: 404, headers: corsHeaders });
        }
      }
      case 'DELETE': {
        const body = await req.json();
        if (resource === 'roles') {
          const { id } = body;
          // Antes de eliminar el rol, verificar si hay perfiles asociados
          const { count, error: countError } = await supabaseAdmin
            .from('profiles')
            .select('id', { count: 'exact' })
            .eq('role_id', id);

          if (countError) throw countError;

          if (count && count > 0) {
            throw new Error('Cannot delete role: There are users assigned to this role. Please reassign them first.');
          }

          const { error } = await supabaseAdmin.from('roles').delete().eq('id', id);
          if (error) throw error;
          return new Response(JSON.stringify({ message: 'Role deleted successfully' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        } else {
          return new Response('Not Found', { status: 404, headers: corsHeaders });
        }
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