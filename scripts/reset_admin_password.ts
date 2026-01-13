
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
)

async function resetAdminPassword() {
    const email = 'alpha.ambity@aonosekehouseinvestmentdrc.site'
    const newPassword = 'Ambity1984.'

    console.log(`Resetting password for: ${email}...`)

    const { data: user, error } = await supabase.auth.admin.updateUserById(
        'e1f4d0ca-ed45-4b2e-87fb-1002dc8b3de6', // ID found in previous step
        { password: newPassword, email_confirm: true }
    )

    if (error) {
        console.error('❌ Error resetting password:', error.message)

        // Fallback: try finding by email if ID changed (unlikely but safe)
        const { data: { users } } = await supabase.auth.admin.listUsers()
        const foundUser = users.find(u => u.email === email)
        if (foundUser) {
            console.log(`Found user ID via email: ${foundUser.id}. Retrying...`)
            const { error: retryError } = await supabase.auth.admin.updateUserById(
                foundUser.id,
                { password: newPassword, email_confirm: true }
            )
            if (retryError) console.error('❌ Retry failed:', retryError.message)
            else console.log('✅ Password reset successful (retry).')
        } else {
            console.error('❌ User not found by email.')
        }

    } else {
        console.log('✅ Password reset successful.')
        console.log(`   User: ${user.user.email}`)
        console.log(`   Role: ${user.user.role}`)
    }
}

resetAdminPassword()
