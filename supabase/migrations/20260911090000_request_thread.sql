-- ============================================================================
-- Discussion par demande : client, partenaire affecté, administration
-- ============================================================================
-- Un message de discussion n'a pas de destinataire unique : il s'adresse à
-- tous les participants de la demande. Les messages sont lus et écrits par la
-- route /api/requests/<id>/messages, qui vérifie la participation ; les
-- fichiers joints sont dans l'espace privé `documents`, sous
-- requests/<demande>/chat/, et ne s'ouvrent que par /api/files.
-- ============================================================================

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachments JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.messages
  ALTER COLUMN recipient_id DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_messages_request_created
  ON public.messages (request_id, created_at);

-- Photos, vidéos, notes vocales et PDF dans la discussion. 50 Mo : limite de
-- l'offre actuelle de l'hébergement de fichiers.
UPDATE storage.buckets
SET
  file_size_limit = 52428800,
  allowed_mime_types = ARRAY[
    'application/pdf',
    'image/jpeg', 'image/png', 'image/webp', 'image/gif',
    'video/mp4', 'video/quicktime', 'video/webm',
    'audio/mpeg', 'audio/mp4', 'audio/x-m4a', 'audio/aac',
    'audio/webm', 'audio/ogg', 'audio/wav'
  ]
WHERE id = 'documents';

NOTIFY pgrst, 'reload schema';
