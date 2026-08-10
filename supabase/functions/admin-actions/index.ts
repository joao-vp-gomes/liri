// supabase/functions/admin-actions/index.ts


import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'


const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {

    if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

    try {

        const { action, payload } = await req.json()

        const supabase = createClient(
            Deno.env.get('SUPABASE_URL')!,
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
        )

        const authHeader = req.headers.get('Authorization')
        const token = authHeader?.replace('Bearer ', '') ?? ''
        const { data: { user } } = await supabase.auth.getUser(token)
        const { data: userData } = await supabase.from('users').select('role').eq('id', user?.id).single()
        if (userData?.role !== 'admin') return new Response('Forbidden', { status: 403, headers: corsHeaders })

        switch (action) {

            case 'delete-user': {
                await supabase.auth.admin.deleteUser(payload.uid)
                await supabase.from('users').delete().eq('id', payload.uid)
                return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

            case 'create-user': {
                const { data, error } = await supabase.auth.admin.createUser({
                    email: payload.email + '@liri.com',
                    password: payload.password,
                    email_confirm: true
                })
                if (error || !data.user) return new Response(JSON.stringify({ ok: false }), { status: 400, headers: corsHeaders })
                await supabase.from('users').insert({
                    id: data.user.id,
                    role: 'member',
                    name: payload.name,
                    image: payload.image ?? 1,
                    characters: []
                })
                return new Response(JSON.stringify({ ok: true }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
            }

        }

        return new Response('Unknown action', { status: 400, headers: corsHeaders })

    } 
    catch (e) {
        console.log('CRASH:', String(e))
        return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: corsHeaders })
    }

});