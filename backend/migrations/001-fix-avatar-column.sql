-- Migración: Cambiar avatar_url de VARCHAR(512) a LONGTEXT
-- Razón: Las imágenes en base64 pueden ser muy grandes (MB) y no caben en VARCHAR(512)
ALTER TABLE nexus_access_control.users MODIFY COLUMN avatar_url LONGTEXT;