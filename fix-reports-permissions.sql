-- Script corregido para asignar permisos de reportes a roles existentes
USE nexus_access_control;

-- Primero, crear el rol hr_manager si no existe
INSERT IGNORE INTO roles (id, name, description, created_at)
VALUES
    (
        '3',
        'hr_manager',
        'Gerente de Recursos Humanos',
        NOW ()
    );

-- Asignar permisos de reportes a hr_manager (role_id = '3')
-- HR Manager: view, create, export, advanced
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT
    '3',
    id
FROM
    permissions
WHERE
    action IN (
        'reports:view',
        'reports:create',
        'reports:export',
        'reports:advanced'
    );

-- Asignar permisos de reportes a department_head (role_id = '4')
-- Department Head: solo view y export
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT
    '4',
    id
FROM
    permissions
WHERE
    action IN ('reports:view', 'reports:export');

-- Verificar los cambios
SELECT
    r.name as rol,
    p.action as permiso,
    p.description as descripcion
FROM
    role_permissions rp
    JOIN roles r ON rp.role_id = r.id
    JOIN permissions p ON rp.permission_id = p.id
WHERE
    p.action LIKE 'reports:%'
ORDER BY
    r.name,
    p.action;