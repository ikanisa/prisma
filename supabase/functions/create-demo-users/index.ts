import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const allowDemoBootstrap = Deno.env.get('ALLOW_DEMO_BOOTSTRAP') === 'true'

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!allowDemoBootstrap) {
      return new Response(
        JSON.stringify({ success: false, error: 'Demo bootstrap disabled' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const authHeader = req.headers.get('authorization')
    if (!authHeader || !authHeader.toLowerCase().startsWith('bearer ')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing bearer token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const accessToken = authHeader.split(' ')[1]

    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const {
      data: { user: caller },
      error: callerError,
    } = await supabaseAdmin.auth.getUser(accessToken)

    if (callerError || !caller) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid access token' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    console.log('Creating demo users...')

    // Get Aurora Advisors organization
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .select('id')
      .eq('slug', 'aurora')
      .single()

    if (orgError || !org) {
      throw new Error('Aurora organization not found')
    }

    console.log('Found organization:', org.id)

    // Demo users to create
    const demoUsers = [
      { email: 'sophia@aurora.test', name: 'Sophia System', role: 'SYSTEM_ADMIN' as const },
      { email: 'mark@aurora.test', name: 'Mark Manager', role: 'MANAGER' as const },
      { email: 'eli@aurora.test', name: 'Eli Employee', role: 'EMPLOYEE' as const }
    ]

    const { data: callerProfile } = await supabaseAdmin
      .from('users')
      .select('is_system_admin')
      .eq('id', caller.id)
      .maybeSingle()

    const { data: orgMembership } = await supabaseAdmin
      .from('memberships')
      .select('role')
      .eq('org_id', org.id)
      .eq('user_id', caller.id)
      .maybeSingle()

    const callerIsSystemAdmin = callerProfile?.is_system_admin === true || orgMembership?.role === 'SYSTEM_ADMIN'

    if (!callerIsSystemAdmin) {
      return new Response(
        JSON.stringify({ success: false, error: 'Insufficient permissions' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      )
    }

    const results = []

    for (const userData of demoUsers) {
      // Check if user already exists
      const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(userData.email)
      if (existingUser?.user) {
        console.log(`User ${userData.email} already exists, skipping...`)
        results.push({ email: userData.email, status: 'already_exists' })
        continue
      }

      // Create auth user
      const password = crypto.randomUUID()
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password,
        user_metadata: { name: userData.name },
        email_confirm: true
      })

      if (authError) {
        console.error(`Error creating user ${userData.email}:`, authError)
        results.push({ email: userData.email, status: 'error', error: authError.message })
        continue
      }

      console.log(`Created auth user: ${userData.email}`)

      // Update user profile if system admin
      if (userData.role === 'SYSTEM_ADMIN') {
        const { error: updateError } = await supabaseAdmin
          .from('users')
          .update({ is_system_admin: true })
          .eq('id', authUser.user.id)

        if (updateError) {
          console.error(`Error updating system admin status:`, updateError)
        }
      }

      // Create membership
      const { error: membershipError } = await supabaseAdmin
        .from('memberships')
        .upsert({
          org_id: org.id,
          user_id: authUser.user.id,
          role: userData.role
        }, { onConflict: 'org_id,user_id' })

      if (membershipError) {
        console.error(`Error creating membership for ${userData.email}:`, membershipError)
        results.push({ email: userData.email, status: 'membership_error', error: membershipError.message })
      } else {
        console.log(`Created membership for ${userData.email} with role ${userData.role}`)
        results.push({
          email: userData.email,
          status: 'created',
          role: userData.role,
          temporaryPassword: password,
        })
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Demo users processing completed',
        results: results
      }),
      { 
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Create demo users error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders,
          'Content-Type': 'application/json' 
        }
      }
    )
  }
})
