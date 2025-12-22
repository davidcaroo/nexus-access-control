-- Migración para agregar sistema de turnos/horarios
-- Fecha: 2025-12-22
-- Descripción: Agregar tablas shifts y shift_details, y columna shift_id en employees
USE nexus_access_control;

-- 1. Crear tabla de turnos
CREATE TABLE
    IF NOT EXISTS shifts (
        id VARCHAR(36) PRIMARY KEY,
        nombre VARCHAR(100) NOT NULL UNIQUE,
        descripcion TEXT,
        is_active BOOLEAN DEFAULT TRUE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_nombre (nombre),
        INDEX idx_is_active (is_active)
    ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci;

-- 2. Crear tabla de detalles de horario por día
CREATE TABLE
    IF NOT EXISTS shift_details (
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

-- 3. Agregar columna shift_id a employees (si no existe)
ALTER TABLE employees
ADD COLUMN IF NOT EXISTS shift_id VARCHAR(36) NULL AFTER departamento,
ADD CONSTRAINT fk_employees_shift FOREIGN KEY (shift_id) REFERENCES shifts (id) ON DELETE SET NULL,
ADD INDEX idx_shift_id (shift_id);

-- 4. Insertar turnos de ejemplo
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
    ) ON DUPLICATE KEY
UPDATE nombre = nombre;

-- 5. Detalles de Turno A: Jornada Completa
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
    ) ON DUPLICATE KEY
UPDATE hora_entrada = hora_entrada;

-- 6. Detalles de Turno B: Jornada Extendida
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
    ) ON DUPLICATE KEY
UPDATE hora_entrada = hora_entrada;

-- 7. Detalles de Turno Gerencial: Solo Lunes a Viernes
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
    ) ON DUPLICATE KEY
UPDATE hora_entrada = hora_entrada;

-- Verificación
SELECT
    'Migración completada exitosamente' as status;

SELECT
    COUNT(*) as total_shifts
FROM
    shifts;

SELECT
    COUNT(*) as total_shift_details
FROM
    shift_details;