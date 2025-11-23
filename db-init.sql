DROP DATABASE IF EXISTS nexus_access_control;

CREATE DATABASE nexus_access_control CHARACTER
SET
    utf8mb4 COLLATE utf8mb4_unicode_ci;

USE nexus_access_control;

CREATE TABLE
    roles (
        id VARCHAR(36) PRIMARY KEY,
        name VARCHAR(100) NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    permissions (
        id VARCHAR(36) PRIMARY KEY,
        action VARCHAR(255) NOT NULL UNIQUE,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    role_permissions (
        role_id VARCHAR(36) NOT NULL,
        permission_id VARCHAR(36) NOT NULL,
        PRIMARY KEY (role_id, permission_id),
        FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE CASCADE,
        FOREIGN KEY (permission_id) REFERENCES permissions (id) ON DELETE CASCADE
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    users (
        id VARCHAR(36) PRIMARY KEY,
        email VARCHAR(255) NOT NULL UNIQUE,
        password_hash VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        avatar_url VARCHAR(512),
        role_id VARCHAR(36),
        is_banned BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE SET NULL,
        INDEX idx_email (email)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    employees (
        id VARCHAR(36) PRIMARY KEY,
        cedula VARCHAR(50) NOT NULL UNIQUE,
        nombre VARCHAR(255) NOT NULL,
        foto VARCHAR(512),
        cargo VARCHAR(150),
        departamento VARCHAR(150),
        horario_entrada TIME NOT NULL DEFAULT '09:00:00',
        horario_salida TIME NOT NULL DEFAULT '18:00:00',
        estado ENUM ('activo', 'inactivo') NOT NULL DEFAULT 'activo',
        fecha_ingreso DATE NOT NULL,
        qr_code_url VARCHAR(512),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_cedula (cedula),
        INDEX idx_estado (estado)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    attendance_records (
        id BIGINT AUTO_INCREMENT PRIMARY KEY,
        employee_id VARCHAR(36) NOT NULL,
        tipo ENUM ('entrada', 'salida') NOT NULL,
        fecha DATE NOT NULL,
        hora TIME NOT NULL,
        metodo ENUM ('qr', 'manual', 'facial') DEFAULT 'manual',
        tardanza BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
        INDEX idx_employee (employee_id),
        INDEX idx_fecha (fecha)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    leave_requests (
        id VARCHAR(36) PRIMARY KEY,
        employee_id VARCHAR(36) NOT NULL,
        request_type ENUM ('vacation', 'sick_leave', 'day_off') NOT NULL,
        start_date DATE NOT NULL,
        end_date DATE NOT NULL,
        reason TEXT,
        status ENUM ('pending', 'approved', 'rejected') NOT NULL DEFAULT 'pending',
        requested_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        approved_by VARCHAR(36) NULL,
        approved_at DATETIME,
        rejection_reason TEXT,
        FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
        FOREIGN KEY (approved_by) REFERENCES users (id) ON DELETE SET NULL,
        INDEX idx_status (status)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    sessions (
        id VARCHAR(36) PRIMARY KEY,
        user_id VARCHAR(36) NOT NULL,
        refresh_token VARCHAR(512) NOT NULL UNIQUE,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
        INDEX idx_user (user_id)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

INSERT INTO
    roles (id, name, description, created_at)
VALUES
    (
        '1',
        'superadmin',
        'Administrador supremo',
        NOW ()
    ),
    ('2', 'admin', 'Administrador del sistema', NOW ()),
    (
        '3',
        'hr_manager',
        'Gerente de Recursos Humanos',
        NOW ()
    ),
    (
        '4',
        'department_head',
        'Jefe de Departamento',
        NOW ()
    ),
    ('5', 'employee', 'Empleado regular', NOW ());

INSERT INTO
    permissions (id, action, description, created_at)
VALUES
    (
        'e1',
        'employees:create',
        'Crear empleados',
        NOW ()
    ),
    ('e2', 'employees:read', 'Ver empleados', NOW ()),
    (
        'e3',
        'employees:update',
        'Editar empleados',
        NOW ()
    ),
    (
        'e4',
        'employees:delete',
        'Eliminar empleados',
        NOW ()
    ),
    (
        'a1',
        'attendance:record',
        'Registrar asistencia',
        NOW ()
    ),
    (
        'a2',
        'attendance:view',
        'Ver registros de asistencia',
        NOW ()
    ),
    (
        'a3',
        'attendance:delete',
        'Eliminar registros de asistencia',
        NOW ()
    ),
    (
        'l1',
        'leave_requests:create',
        'Crear solicitudes de ausencia',
        NOW ()
    ),
    (
        'l2',
        'leave_requests:view',
        'Ver solicitudes de ausencia',
        NOW ()
    ),
    (
        'l3',
        'leave_requests:approve',
        'Aprobar solicitudes',
        NOW ()
    ),
    (
        'l4',
        'leave_requests:reject',
        'Rechazar solicitudes',
        NOW ()
    ),
    ('u1', 'users:create', 'Crear usuarios', NOW ()),
    ('u2', 'users:read', 'Ver usuarios', NOW ()),
    ('u3', 'users:update', 'Editar usuarios', NOW ()),
    ('u4', 'users:delete', 'Eliminar usuarios', NOW ()),
    ('u5', 'users:ban', 'Bloquear usuarios', NOW ()),
    ('r1', 'roles:manage', 'Gestionar roles', NOW ()),
    (
        'p1',
        'permissions:manage',
        'Gestionar permisos',
        NOW ()
    );

INSERT INTO
    role_permissions
SELECT
    '1',
    id
FROM
    permissions;

INSERT INTO
    role_permissions
SELECT
    '2',
    id
FROM
    permissions
WHERE
    action NOT IN ('roles:manage', 'permissions:manage');

INSERT INTO
    role_permissions
SELECT
    '3',
    id
FROM
    permissions
WHERE
    action LIKE 'employees:%'
    OR action LIKE 'leave_requests:%';

INSERT INTO
    role_permissions
SELECT
    '4',
    id
FROM
    permissions
WHERE
    action IN (
        'employees:read',
        'attendance:view',
        'leave_requests:view',
        'leave_requests:approve'
    );

INSERT INTO
    role_permissions
SELECT
    '5',
    id
FROM
    permissions
WHERE
    action IN ('leave_requests:create', 'attendance:record');

INSERT INTO
    users (
        id,
        email,
        password_hash,
        full_name,
        avatar_url,
        role_id,
        is_banned,
        created_at,
        updated_at
    )
VALUES
    (
        '550e8400-e29b-41d4-a716-446655440000',
        'admin@test.com',
        '$2a$10$YOvVSZH6cZJxHXyZu0dYz.G4dRJSZoEqE4U8hNqnF1B5z.F5sSzPy',
        'Admin User',
        NULL,
        '1',
        FALSE,
        NOW (),
        NOW ()
    );

-- Tabla de configuraciones del sistema
CREATE TABLE
    settings (
        id VARCHAR(36) PRIMARY KEY,
        `key` VARCHAR(100) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_key (`key`)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Insertar configuraciones por defecto
INSERT INTO
    settings (id, `key`, value, description)
VALUES
    (
        '1',
        'allow_multiple_attendance',
        'false',
        'Permitir múltiples entradas/salidas el mismo día por empleado'
    ),
    (
        '2',
        'attendance_tolerance_minutes',
        '15',
        'Minutos de tolerancia para entrada sin marcar tardanza'
    );