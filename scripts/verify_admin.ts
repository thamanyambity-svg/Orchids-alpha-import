
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function verifyAdmin() {
    const email = 'alpha.ambity@aonosekehouseinvestmentdrc.site'
    console.log(`Verifying user: ${email}...`)

    // Check Auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers()
    if (error) {
        console.error('Error listing users:', error)
        return
    }

    const user = users.find(u => u.email === email)

    if (!user) {
        console.error('❌ User NOT found in Auth!')
    } else {
        console.log(`✅ User found in Auth. ID: ${user.id}`)
        console.log(`   Confirmed: ${user.email_confirmed_at ? 'YES' : 'NO'}`)
        console.log(`   Last Sign In: ${user.last_sign_in_at}`)

        // Check Profile
        const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single()

        if (profileError) {
            console.error('❌ Profile fetch error:', profileError.message)
        } else {
            console.log(`✅ Profile found. Role: ${profile.role}`)
            if (profile.role !== 'ADMIN') {
                console.error('⚠️ WARNING: Profile role is NOT Admin!')
            }
        }
    }
}

verifyAdmin()
