import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (req) => {
  try {
    // Create admin client using service role key
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('Starting seed process...')

    // Create organization first
    const { data: org, error: orgError } = await supabaseAdmin
      .from('organizations')
      .insert({
        name: 'Aurora Advisors',
        slug: 'aurora',
        brand_primary: '#6366f1',
        brand_secondary: '#8b5cf6'
      })
      .select()
      .single()

    if (orgError) {
      console.error('Error creating organization:', orgError)
      throw orgError
    }

    console.log('Created organization:', org)

    // Create users using admin auth API
    const users = [
      { email: 'sophia@aurora.test', password: 'lovable123', name: 'Sophia System', role: 'SYSTEM_ADMIN' as const },
      { email: 'mark@aurora.test', password: 'lovable123', name: 'Mark Manager', role: 'MANAGER' as const },
      { email: 'eli@aurora.test', password: 'lovable123', name: 'Eli Employee', role: 'EMPLOYEE' as const }
    ]

    for (const userData of users) {
      // Create auth user
      const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        user_metadata: { name: userData.name },
        email_confirm: true
      })

      if (authError) {
        console.error(`Error creating user ${userData.email}:`, authError)
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
        .insert({
          org_id: org.id,
          user_id: authUser.user.id,
          role: userData.role
        })

      if (membershipError) {
        console.error(`Error creating membership for ${userData.email}:`, membershipError)
      } else {
        console.log(`Created membership for ${userData.email} with role ${userData.role}`)
      }
    }

    // Create sample clients
    const clients = [
      {
        org_id: org.id,
        name: 'TechCorp Inc.',
        contact_name: 'John Smith',
        email: 'john@techcorp.com',
        phone: '+1234567890',
        country: 'United States',
        industry: 'Technology',
        fiscal_year_end: 'December 31'
      },
      {
        org_id: org.id,
        name: 'Global Manufacturing Ltd.',
        contact_name: 'Sarah Johnson',
        email: 'sarah@globalmanuf.com',
        phone: '+1987654321',
        country: 'Canada',
        industry: 'Manufacturing',
        fiscal_year_end: 'March 31'
      }
    ]

    const { data: createdClients, error: clientsError } = await supabaseAdmin
      .from('clients')
      .insert(clients)
      .select()

    if (clientsError) {
      console.error('Error creating clients:', clientsError)
    } else {
      console.log('Created clients:', createdClients)
    }

    // Create sample engagements
    if (createdClients && createdClients.length > 0) {
      const engagements = [
        {
          org_id: org.id,
          client_id: createdClients[0].id,
          title: 'Annual Audit 2024',
          description: 'Comprehensive financial audit for fiscal year 2024',
          status: 'active',
          start_date: '2024-01-01',
          end_date: '2024-04-30',
          budget: 50000.00
        },
        {
          org_id: org.id,
          client_id: createdClients[1].id,
          title: 'Tax Advisory Services',
          description: 'Quarterly tax planning and compliance review',
          status: 'active',
          start_date: '2024-02-01',
          end_date: '2024-12-31',
          budget: 25000.00
        }
      ]

      const { data: createdEngagements, error: engagementsError } = await supabaseAdmin
        .from('engagements')
        .insert(engagements)
        .select()

      if (engagementsError) {
        console.error('Error creating engagements:', engagementsError)
      } else {
        console.log('Created engagements:', createdEngagements)

        // Get user IDs for task assignment
        const { data: orgUsers } = await supabaseAdmin
          .from('memberships')
          .select('user_id')
          .eq('org_id', org.id)

        if (orgUsers && createdEngagements.length > 0) {
          // Create sample tasks
          const tasks = [
            {
              org_id: org.id,
              engagement_id: createdEngagements[0].id,
              title: 'Review financial statements',
              description: 'Analyze balance sheet and income statement for accuracy',
              status: 'in_progress',
              priority: 'high',
              assigned_to: orgUsers[1]?.user_id,
              due_date: '2024-02-15'
            },
            {
              org_id: org.id,
              engagement_id: createdEngagements[0].id,
              title: 'Test internal controls',
              description: 'Evaluate effectiveness of internal control systems',
              status: 'pending',
              priority: 'medium',
              assigned_to: orgUsers[2]?.user_id,
              due_date: '2024-03-01'
            }
          ]

          const { error: tasksError } = await supabaseAdmin
            .from('tasks')
            .insert(tasks)

          if (tasksError) {
            console.error('Error creating tasks:', tasksError)
          } else {
            console.log('Created sample tasks')
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Seed data created successfully',
        organization: org
      }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Seed error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    )
  }
})