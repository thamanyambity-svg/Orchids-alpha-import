import pg from 'pg'
import { readFileSync, readdirSync } from 'fs'
const ref='qmlkdefuraglbhwdywyc'
const c=new pg.Client({host:'aws-0-eu-west-1.pooler.supabase.com',port:5432,user:`postgres.${ref}`,password:process.env.DBPW,database:'postgres',ssl:{rejectUnauthorized:false}})
await c.connect()
// live fixup for already-created tables
await c.query('alter table public.tracking_events add column if not exists order_id uuid references public.orders(id) on delete cascade')
const dir='supabase/migrations'
const files=readdirSync(dir).filter(f=>f.endsWith('.sql')).sort()
let applied=0
for(const f of files){
  const sql=readFileSync(dir+'/'+f,'utf8')
  try{ await c.query(sql); console.log('✅',f); applied++ }
  catch(e){ console.log('❌ STOP at',f,'\n   ',e.message); await c.end(); process.exit(2) }
}
const r=await c.query("select count(*)::int n from information_schema.tables where table_schema='public'")
console.log('--- applied',applied,'/',files.length,'| public tables:',r.rows[0].n)
await c.end()
