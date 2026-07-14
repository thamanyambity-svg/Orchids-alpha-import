
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const supabase = createClient(supabaseUrl, supabaseKey)

async function checkSchema() {
    console.log('--- SCHEMA CHECK START ---')

    // 1. Check Supplier Columns
    console.log('\n1. Checking Supplier Columns...')
    const { data: supplier } = await supabase.from('suppliers').select('*').limit(1)
    if (supplier && supplier.length > 0) {
        console.log('Supplier Keys:', Object.keys(supplier[0]))
    } else {
        console.log('No suppliers found to check keys.')
    }

    // 2. Check Transactions Table existence
    console.log('\n2. Checking Transactions Table...')
    const { data: tx, error } = await supabase.from('transactions').select('*').limit(1)
    if (error) {
        console.log('Error checking transactions:', error.message)
    } else {
        console.log('Transactions table exists. Row count example:', tx.length)
    }

    console.log('--- SCHEMA CHECK END ---')
}

checkSchema()
