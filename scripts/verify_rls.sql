-- RLS Verification Script
-- Run this in Supabase SQL Editor to check security status of all tables
SELECT tablename,
    rowsecurity as rls_enabled
FROM pg_tables
    JOIN pg_class ON pg_class.relname = pg_tables.tablename
WHERE schemaname = 'public';
-- Also list policies for each table
SELECT tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename,
    cmd;