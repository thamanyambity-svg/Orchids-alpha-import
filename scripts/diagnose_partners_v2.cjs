
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function diagnose() {
    console.log('--- DIAGNOSTIC START ---')

    // 1. Check Countries
    console.log('\n1. Checking Key Countries (JPN, ARE, UAE, CN, CHN, TUR)...')
    const { data: countries } = await supabase
        .from('countries')
        .select('*')
        .in('code', ['JPN', 'ARE', 'UAE', 'CN', 'CHN', 'TUR'])

    if (countries) {
        console.table(countries.map(c => ({
            id: c.id,
            code: c.code,
            name: c.name,
            region: c.region
        })))
    } else {
        console.log("No countries found or error.")
    }

    // 2. Check PARTNER Profiles
    console.log('\n2. Checking PARTNER Profiles...')
    const { data: partners } = await supabase
        .from('profiles')
        .select('id, email, full_name, country_id')
        .eq('role', 'PARTNER')

    console.log(`Found ${partners?.length} partners.`)
    if (partners?.length) {
        for (const p of partners) {
            console.log(`\n- Partner: ${p.email} (${p.full_name})`)
            // Fetch linked country
            if (p.country_id) {
                const { data: c } = await supabase.from('countries').select('*').eq('id', p.country_id).single()
                if (c) {
                    console.log(`  -> Linked Country: ${c.name} (Code: ${c.code}, Region: ${c.region})`)
                } else {
                    console.log(`  -> Linked Country ID ${p.country_id} NOT FOUND in countries table.`)
                }
            } else {
                console.log(`  -> NO LINKED COUNTRY ID`)
            }
        }
    }

    // 3. Check Suppliers
    console.log('\n3. Checking Suppliers Table...')
    const { count: supplierCount } = await supabase.from('suppliers').select('*', { count: 'exact', head: true })
    console.log(`Total Suppliers: ${supplierCount}`)

    const { data: suppliers } = await supabase.from('suppliers').select('id, name, partner_id').limit(5)
    if (suppliers && suppliers.length > 0) {
        console.log("Sample Suppliers:", suppliers)
    }

    console.log('--- DIAGNOSTIC END ---')
}

diagnose()
