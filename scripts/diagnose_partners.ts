
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
    console.log('--- DIAGNOSTIC START ---')

    // 1. Check Countries
    console.log('\n1. Checking Key Countries (JPN, ARE, CN, TR)...')
    const { data: countries } = await supabase
        .from('countries')
        .select('*')
        .in('code', ['JPN', 'ARE', 'UAE', 'CN', 'CHN', 'TR', 'TUR'])

    console.table(countries)

    // 2. Check Profiles with role PARTNER
    console.log('\n2. Checking PARTNER Profiles...')
    const { data: partners } = await supabase
        .from('profiles')
        .select('id, email, full_name, country_id')
        .eq('role', 'PARTNER')

    console.log(`Found ${partners?.length} partners.`)
    if (partners?.length) {
        for (const p of partners) {
            console.log(`- Partner: ${p.email} (${p.full_name})`)
            // Fetch linked country
            if (p.country_id) {
                const { data: c } = await supabase.from('countries').select('*').eq('id', p.country_id).single()
                console.log(`  -> Linked Country: ${c?.name} (Code: ${c?.code}, Region: ${c?.region})`)
            } else {
                console.log(`  -> NO LINKED COUNTRY ID`)
            }
        }
    }

    // 3. Check Suppliers
    console.log('\n3. Checking Suppliers...')
    const { count } = await supabase.from('suppliers').select('*', { count: 'exact', head: true })
    console.log(`Total Suppliers: ${count}`)

    console.log('--- DIAGNOSTIC END ---')
}

diagnose()
