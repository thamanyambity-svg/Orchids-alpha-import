-- Create the avatars bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- Create the project-uploads bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('project-uploads', 'project-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Create the document-uploads bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('document-uploads', 'document-uploads', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public access to avatars
DROP POLICY IF EXISTS "Public Access to Avatars" ON storage.objects;
CREATE POLICY "Public Access to Avatars"
ON storage.objects FOR SELECT
USING ( bucket_id = 'avatars' );

-- Allow authenticated users to upload their own avatar
DROP POLICY IF EXISTS "Users can upload their own avatar" ON storage.objects;
CREATE POLICY "Users can upload their own avatar"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'avatars' );

-- Allow authenticated users to update their own avatar
DROP POLICY IF EXISTS "Users can update their own avatar" ON storage.objects;
CREATE POLICY "Users can update their own avatar"
ON storage.objects FOR UPDATE
TO authenticated
USING ( bucket_id = 'avatars' );

-- Allow public access to project-uploads
DROP POLICY IF EXISTS "Public Access to Project Uploads" ON storage.objects;
CREATE POLICY "Public Access to Project Uploads"
ON storage.objects FOR SELECT
USING ( bucket_id = 'project-uploads' );

-- Allow public access to document-uploads
DROP POLICY IF EXISTS "Public Access to Document Uploads" ON storage.objects;
CREATE POLICY "Public Access to Document Uploads"
ON storage.objects FOR SELECT
USING ( bucket_id = 'document-uploads' );

-- Allow authenticated users to upload documents
DROP POLICY IF EXISTS "Authenticated users can upload documents" ON storage.objects;
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK ( bucket_id = 'document-uploads' );
