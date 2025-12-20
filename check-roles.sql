-- Verificar estructura actual de roles y permisos
USE nexus_access_control;

-- Ver roles existentes
SELECT
    *
FROM
    roles;

-- Ver permisos de reportes actuales
SELECT
    *
FROM
    permissions
WHERE
    action LIKE 'reports:%';

-- Ver asignaciones actuales de reportes
SELECT
    r.id as role_id,
    r.name as rol,
    p.action as permiso
FROM
    role_permissions rp
    JOIN roles r ON rp.role_id = r.id
    JOIN permissions p ON rp.permission_id = p.id
WHERE
    p.action LIKE 'reports:%'
ORDER BY
    r.name,
    p.action;