
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables
dotenv.config({ path: path.resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local')
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixPartners() {
    console.log('Starting Partner Data Rationalization...')

    // 1. Definition of Transformations
    const updates = [
        {
            old_email: 'partner.uae@test.com',
            new_email: 'achignon.pdg.maarmala.uae@aonosekehouseinvestmentdrc.site',
            new_name: 'MAARMALA (UAE)',
            phone: '+971 50 120 1719',
            city: 'Dubaï',
            country: 'Émirats Arabes Unis'
        },
        {
            old_email: 'partner.japan@test.com',
            new_email: 'assanimususa.pdg.pam.congo.japon@aonosekehouseinvestmentdrc.site',
            new_name: 'PAM CONGO JAPAN',
            phone: '+81 90 8326 7671',
            city: 'Tokyo',
            country: 'Japon'
        },
        {
            old_email: 'partner.china@test.com',
            new_email: 'shanghai.logistics@alpha-import.com',
            new_name: 'Shanghai Logistics (CN)',
            city: 'Shanghai',
            country: 'Chine'
        },
        {
            old_email: 'partner.turkey@test.com',
            new_email: 'istanbul.freight@alpha-import.com',
            new_name: 'Istanbul Freight (TR)',
            city: 'Istanbul',
            country: 'Turquie'
        },
        {
            old_email: 'partner.thailand@test.com',
            new_email: 'bangkok.trade@alpha-import.com',
            new_name: 'Bangkok Trade (TH)',
            city: 'Bangkok',
            country: 'Thaïlande'
        }
    ]

    for (const update of updates) {
        console.log(`Processing ${update.old_email}...`)

        // Find the user by old email (Test Account)
        const { data: users, error: findError } = await supabase
            .from('profiles')
            .select('*')
            .eq('email', update.old_email)

        if (findError) {
            console.error(`Error finding ${update.old_email}:`, findError)
            continue
        }

        if (!users || users.length === 0) {
            console.log(`User ${update.old_email} not found. Checking if already migrated...`)

            // Check if already migrated
            const { data: migrated } = await supabase.from('profiles').select('*').eq('email', update.new_email).single()
            if (migrated) {
                console.log(`-> Already migrated to ${update.new_email}. Ensuring role is PARTNER.`)
                await supabase.from('profiles').update({ role: 'PARTNER' }).eq('id', migrated.id)
                await ensurePartnerProfile(migrated.id)
            }
            continue
        }

        const user = users[0]

        // Update Profile (Name, Email, Role, Phone, City)
        // Note: Changing email in 'profiles' doesn't change auth.users email, but for display purposes in Admin (which reads profiles) it works.
        // Ideally we update auth.users too, but that requires admin API. We will stick to profiles for "Dashboard Logic".
        const { error: updateError } = await supabase
            .from('profiles')
            .update({
                full_name: update.new_name,
                email: update.new_email, // Updating profile email
                phone: update.phone || user.phone,
                city: update.city,
                role: 'PARTNER' // PROMOTE TO PARTNER
            })
            .eq('id', user.id)

        if (updateError) {
            console.error(`Error updating profile for ${user.id}:`, updateError)
        } else {
            console.log(`-> Converted ${update.old_email} to ${update.new_name} (PARTNER)`)
            await ensurePartnerProfile(user.id)
        }
    }

    console.log('Partner Data Rationalization Complete.')
}

async function ensurePartnerProfile(userId: string) {
    // Check if partner_profile exists
    const { data, error } = await supabase
        .from('partner_profiles')
        .select('*')
        .eq('user_id', userId)
        .single()

    if (!data) {
        console.log(`Creating partner_profile for ${userId}...`)
        const { error: insertError } = await supabase
            .from('partner_profiles')
            .insert({
                user_id: userId,
                company_name: 'Official Partner',
                contract_status: 'ACTIVE',
                performance_score: 5.0,
                total_orders_handled: 0
            })
        if (insertError) console.error('Error creating partner details:', insertError)
    } else {
        // Ensure status is active
        await supabase
            .from('partner_profiles')
            .update({ contract_status: 'ACTIVE' })
            .eq('user_id', userId)
    }
}

fixPartners()
