import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'DELETE, OPTIONS', // Solo DELETE y OPTIONS para esta función
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

    switch (req.method) {
      case 'DELETE': {
        // Eliminar todos los registros de la tabla attendance_records
        const { error } = await supabaseAdmin.from('attendance_records').delete().neq('id', 0); // .neq('id', 0) es una condición siempre verdadera para DELETE ALL
        if (error) throw error;
        return new Response(JSON.stringify({ message: 'Todos los registros de asistencia eliminados correctamente.' }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
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