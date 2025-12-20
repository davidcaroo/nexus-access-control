-- Asignar todos los permisos necesarios al rol hr_manager
USE nexus_access_control;

-- Limpiar permisos actuales de hr_manager para reasignar correctamente
DELETE FROM role_permissions
WHERE
    role_id = '3';

-- Asignar permisos de empleados (CRUD completo)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT
    '3',
    id
FROM
    permissions
WHERE
    action LIKE 'employees:%';

-- Asignar permisos de asistencia (completo)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT
    '3',
    id
FROM
    permissions
WHERE
    action LIKE 'attendance:%';

-- Asignar permisos de ausencias/leave requests (completo)
INSERT IGNORE INTO role_permissions (role_id, permission_id)
SELECT
    '3',
    id
FROM
    permissions
WHERE
    action LIKE 'leave_requests:%';

-- Asignar permisos de reportes (view, create, export, advanced - NO delete)
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

-- Verificar permisos de hr_manager
SELECT
    p.action as permiso,
    p.description as descripcion
FROM
    role_permissions rp
    JOIN permissions p ON rp.permission_id = p.id
WHERE
    rp.role_id = '3'
ORDER BY
    p.action;