-- Script para actualizar permisos de reportes sin perder datos
-- Ejecutar en la base de datos nexus_access_control existente
USE nexus_access_control;

-- 1. Eliminar permisos antiguos de reportes de role_permissions
DELETE FROM role_permissions
WHERE
    permission_id IN (
        SELECT
            id
        FROM
            permissions
        WHERE
            action LIKE 'reports:%'
    );

-- 2. Eliminar permisos antiguos de reportes
DELETE FROM permissions
WHERE
    action LIKE 'reports:%';

-- 3. Insertar nuevos permisos de reportes
INSERT INTO
    permissions (id, action, description, created_at)
VALUES
    ('rep1', 'reports:view', 'Ver reportes', NOW ()),
    (
        'rep2',
        'reports:create',
        'Crear reportes personalizados',
        NOW ()
    ),
    (
        'rep3',
        'reports:export',
        'Exportar reportes',
        NOW ()
    ),
    (
        'rep4',
        'reports:delete',
        'Eliminar reportes',
        NOW ()
    ),
    (
        'rep5',
        'reports:advanced',
        'Acceso a reportes avanzados',
        NOW ()
    );

-- 4. Asignar permisos de reportes a superadmin (role_id = '1')
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT
    '1',
    id
FROM
    permissions
WHERE
    action LIKE 'reports:%';

-- 5. Asignar permisos de reportes a admin (role_id = '2')
-- Admin tiene todos los permisos de reportes
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT
    '2',
    id
FROM
    permissions
WHERE
    action LIKE 'reports:%';

-- 6. Asignar permisos de reportes a hr_manager (role_id = '3')
-- HR Manager: view, create, export, advanced
INSERT INTO
    role_permissions (role_id, permission_id)
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

-- 7. Asignar permisos de reportes a department_head (role_id = '4')
-- Department Head: solo view y export
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT
    '4',
    id
FROM
    permissions
WHERE
    action IN ('reports:view', 'reports:export');

-- 8. Employee (role_id = '5') no tiene permisos de reportes
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