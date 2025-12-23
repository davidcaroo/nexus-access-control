-- Migración: Agregar permisos del módulo de turnos/horarios
-- Fecha: 2025-12-22
-- Insertar permisos para el módulo de turnos
INSERT INTO
    permissions (id, action, description, created_at)
VALUES
    (
        's1',
        'shifts:create',
        'Crear turnos/horarios',
        NOW ()
    ),
    (
        's2',
        'shifts:read',
        'Ver turnos/horarios',
        NOW ()
    ),
    (
        's3',
        'shifts:update',
        'Editar turnos/horarios',
        NOW ()
    ),
    (
        's4',
        'shifts:delete',
        'Eliminar turnos/horarios',
        NOW ()
    ),
    (
        's5',
        'shifts:manage',
        'Gestión completa de turnos',
        NOW ()
    ) ON DUPLICATE KEY
UPDATE action =
VALUES
    (action),
    description =
VALUES
    (description);

-- Asignar permisos de turnos a hr_manager (role_id = 3)
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT
    '3',
    id
FROM
    permissions
WHERE
    action LIKE 'shifts:%' ON DUPLICATE KEY
UPDATE role_id = role_id;

-- Asignar permisos de turnos a admin (role_id = 2) - aunque ya tiene todos por defecto
INSERT INTO
    role_permissions (role_id, permission_id)
SELECT
    '2',
    id
FROM
    permissions
WHERE
    action LIKE 'shifts:%' ON DUPLICATE KEY
UPDATE role_id = role_id;

-- Verificar que se insertaron correctamente
SELECT
    'Permisos creados:' as status;

SELECT
    *
FROM
    permissions
WHERE
    action LIKE 'shifts:%';

SELECT
    'Permisos asignados a hr_manager:' as status;

SELECT
    r.name,
    p.action,
    p.description
FROM
    role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    JOIN permissions p ON p.id = rp.permission_id
WHERE
    r.id = 3
    AND p.action LIKE 'shifts:%';

SELECT
    'Permisos asignados a admin:' as status;

SELECT
    r.name,
    p.action,
    p.description
FROM
    role_permissions rp
    JOIN roles r ON r.id = rp.role_id
    JOIN permissions p ON p.id = rp.permission_id
WHERE
    r.id = 2
    AND p.action LIKE 'shifts:%';