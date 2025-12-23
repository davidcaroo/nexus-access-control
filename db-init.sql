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
        avatar_url LONGTEXT,
        role_id VARCHAR(36),
        is_banned BOOLEAN DEFAULT FALSE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (role_id) REFERENCES roles (id) ON DELETE SET NULL,
        INDEX idx_email (email)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Tabla de catálogo de turnos/horarios
CREATE TABLE
    shifts (
        id VARCHAR(36) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_nombre (nombre),
        INDEX idx_is_active (is_active)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- Tabla de detalles de horario por día de la semana
CREATE TABLE
    shift_details (
        id VARCHAR(36) PRIMARY KEY,
        shift_id VARCHAR(36) NOT NULL,
        day_of_week ENUM (
            'monday',
            'tuesday',
            'wednesday',
            'thursday',
            'friday',
            'saturday',
            'sunday'
        ) NOT NULL,
        hora_entrada TIME NULL,
        hora_salida TIME NULL,
        hora_almuerzo_inicio TIME NULL,
        hora_almuerzo_fin TIME NULL,
        es_dia_laboral BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE CASCADE,
        UNIQUE KEY unique_shift_day (shift_id, day_of_week),
        INDEX idx_shift_id (shift_id),
        INDEX idx_day_of_week (day_of_week)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

CREATE TABLE
    employees (
        id VARCHAR(36) PRIMARY KEY,
        cedula VARCHAR(50) NOT NULL UNIQUE,
        nombre VARCHAR(255) NOT NULL,
        foto VARCHAR(512),
        cargo VARCHAR(150),
        departamento VARCHAR(150),
        shift_id VARCHAR(36) NULL,
        horario_entrada TIME NOT NULL DEFAULT '09:00:00',
        horario_salida TIME NOT NULL DEFAULT '18:00:00',
        horario_almuerzo_inicio TIME NULL DEFAULT NULL,
        horario_almuerzo_fin TIME NULL DEFAULT NULL,
        estado ENUM ('activo', 'inactivo') NOT NULL DEFAULT 'activo',
        fecha_ingreso DATE NOT NULL,
        qr_code_url VARCHAR(512),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE SET NULL,
        INDEX idx_cedula (cedula),
        INDEX idx_estado (estado),
        INDEX idx_shift_id (shift_id)
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
        contexto ENUM (
            'jornada_entrada',
            'almuerzo_salida',
            'almuerzo_entrada',
            'jornada_salida',
            'otro'
        ) NULL DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees (id) ON DELETE CASCADE,
        INDEX idx_employee (employee_id),
        INDEX idx_fecha (fecha),
        INDEX idx_contexto (contexto)
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
    ),
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
    ),
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
    );

INSERT INTO
    role_permissions
SELECT
    '1',
    id
FROM
    permissions;

-- Role 2: admin - Todos los permisos excepto gestión de roles y permisos
INSERT INTO
    role_permissions
SELECT
    '2',
    id
FROM
    permissions
WHERE
    action NOT IN ('roles:manage', 'permissions:manage');

-- Role 3: hr_manager - Gestión de empleados, ausencias, reportes administrativos/estratégicos y turnos
INSERT INTO
    role_permissions
SELECT
    '3',
    id
FROM
    permissions
WHERE
    action LIKE 'employees:%'
    OR action LIKE 'leave_requests:%'
    OR action LIKE 'attendance:%'
    OR action LIKE 'shifts:%'
    OR action IN (
        'reports:view',
        'reports:create',
        'reports:export',
        'reports:advanced'
    );

-- Role 4: department_head - Lectura de empleados, asistencia, aprobación de ausencias y reportes operativos
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
        'leave_requests:approve',
        'reports:view',
        'reports:export'
    );

-- Role 5: employee - Solo crear ausencias y registrar asistencia
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

-- Insertar turnos de ejemplo
INSERT INTO
    shifts (id, nombre, descripcion, is_active, created_at)
VALUES
    (
        'shift-001',
        'Turno A - Jornada Completa',
        'Lunes a Viernes 8:00-17:00, Sábado 8:00-12:00',
        TRUE,
        NOW ()
    ),
    (
        'shift-002',
        'Turno B - Jornada Extendida',
        'Lunes a Viernes 7:00-18:00, Sábado 8:00-16:00',
        TRUE,
        NOW ()
    ),
    (
        'shift-003',
        'Turno Gerencial',
        'Lunes a Viernes 7:00-17:00 (sin sábado)',
        TRUE,
        NOW ()
    );

-- Detalles de Turno A: Jornada Completa
INSERT INTO
    shift_details (
        id,
        shift_id,
        day_of_week,
        hora_entrada,
        hora_salida,
        hora_almuerzo_inicio,
        hora_almuerzo_fin,
        es_dia_laboral
    )
VALUES
    (
        'shift-001-mon',
        'shift-001',
        'monday',
        '08:00:00',
        '17:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-001-tue',
        'shift-001',
        'tuesday',
        '08:00:00',
        '17:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-001-wed',
        'shift-001',
        'wednesday',
        '08:00:00',
        '17:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-001-thu',
        'shift-001',
        'thursday',
        '08:00:00',
        '17:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-001-fri',
        'shift-001',
        'friday',
        '08:00:00',
        '17:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-001-sat',
        'shift-001',
        'saturday',
        '08:00:00',
        '12:00:00',
        NULL,
        NULL,
        TRUE
    ),
    (
        'shift-001-sun',
        'shift-001',
        'sunday',
        NULL,
        NULL,
        NULL,
        NULL,
        FALSE
    );

-- Detalles de Turno B: Jornada Extendida
INSERT INTO
    shift_details (
        id,
        shift_id,
        day_of_week,
        hora_entrada,
        hora_salida,
        hora_almuerzo_inicio,
        hora_almuerzo_fin,
        es_dia_laboral
    )
VALUES
    (
        'shift-002-mon',
        'shift-002',
        'monday',
        '07:00:00',
        '18:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-002-tue',
        'shift-002',
        'tuesday',
        '07:00:00',
        '18:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-002-wed',
        'shift-002',
        'wednesday',
        '07:00:00',
        '18:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-002-thu',
        'shift-002',
        'thursday',
        '07:00:00',
        '18:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-002-fri',
        'shift-002',
        'friday',
        '07:00:00',
        '18:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-002-sat',
        'shift-002',
        'saturday',
        '08:00:00',
        '16:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-002-sun',
        'shift-002',
        'sunday',
        NULL,
        NULL,
        NULL,
        NULL,
        FALSE
    );

-- Detalles de Turno Gerencial: Solo Lunes a Viernes
INSERT INTO
    shift_details (
        id,
        shift_id,
        day_of_week,
        hora_entrada,
        hora_salida,
        hora_almuerzo_inicio,
        hora_almuerzo_fin,
        es_dia_laboral
    )
VALUES
    (
        'shift-003-mon',
        'shift-003',
        'monday',
        '07:00:00',
        '17:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-003-tue',
        'shift-003',
        'tuesday',
        '07:00:00',
        '17:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-003-wed',
        'shift-003',
        'wednesday',
        '07:00:00',
        '17:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-003-thu',
        'shift-003',
        'thursday',
        '07:00:00',
        '17:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-003-fri',
        'shift-003',
        'friday',
        '07:00:00',
        '17:00:00',
        '12:00:00',
        '13:00:00',
        TRUE
    ),
    (
        'shift-003-sat',
        'shift-003',
        'saturday',
        NULL,
        NULL,
        NULL,
        NULL,
        FALSE
    ),
    (
        'shift-003-sun',
        'shift-003',
        'sunday',
        NULL,
        NULL,
        NULL,
        NULL,
        FALSE
    );