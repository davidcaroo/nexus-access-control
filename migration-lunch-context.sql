-- Migración: Sistema de Control de Almuerzo y Contexto de Asistencia
-- Fecha: 2025-12-19
-- Descripción: Agrega campos para horarios de almuerzo por empleado y contexto de registros
USE nexus_access_control;

-- 1. Agregar campos de horario de almuerzo a la tabla employees
ALTER TABLE employees
ADD COLUMN horario_almuerzo_inicio TIME NULL DEFAULT NULL COMMENT 'Hora de inicio del almuerzo/break (opcional)',
ADD COLUMN horario_almuerzo_fin TIME NULL DEFAULT NULL COMMENT 'Hora de fin del almuerzo/break (opcional)';

-- 2. Agregar campo contexto a attendance_records
ALTER TABLE attendance_records
ADD COLUMN contexto ENUM (
    'jornada_entrada', -- Primera entrada del día (inicio de jornada)
    'almuerzo_salida', -- Salida temporal para almuerzo/break
    'almuerzo_entrada', -- Regreso de almuerzo/break
    'jornada_salida', -- Salida definitiva (fin de jornada)
    'otro' -- Para casos especiales
) NULL DEFAULT NULL COMMENT 'Contexto del registro de asistencia';

-- 3. Actualizar registros existentes con contexto basado en lógica simple
-- (Primera entrada = jornada_entrada, última salida = jornada_salida)
UPDATE attendance_records ar
SET
    contexto = CASE
        WHEN tipo = 'entrada'
        AND (
            SELECT
                COUNT(*)
            FROM
                attendance_records ar2
            WHERE
                ar2.employee_id = ar.employee_id
                AND ar2.fecha = ar.fecha
                AND ar2.tipo = 'entrada'
                AND ar2.hora < ar.hora
        ) = 0 THEN 'jornada_entrada'
        WHEN tipo = 'salida'
        AND (
            SELECT
                COUNT(*)
            FROM
                attendance_records ar2
            WHERE
                ar2.employee_id = ar.employee_id
                AND ar2.fecha = ar.fecha
                AND ar2.tipo = 'salida'
                AND ar2.hora > ar.hora
        ) = 0 THEN 'jornada_salida'
        WHEN tipo = 'salida' THEN 'almuerzo_salida'
        WHEN tipo = 'entrada' THEN 'almuerzo_entrada'
        ELSE 'otro'
    END
WHERE
    contexto IS NULL;

-- 4. Agregar índice para mejorar consultas de contexto
CREATE INDEX idx_contexto ON attendance_records (contexto);

-- 5. Verificar los cambios
SELECT
    'Tabla employees - Nuevos campos' as verificacion,
    COUNT(*) as total_empleados
FROM
    employees;

SELECT
    'Tabla attendance_records - Campo contexto' as verificacion,
    contexto,
    COUNT(*) as total_registros
FROM
    attendance_records
GROUP BY
    contexto;

-- 6. Mostrar ejemplo de empleado con horarios completos
SELECT
    nombre,
    horario_entrada,
    horario_almuerzo_inicio,
    horario_almuerzo_fin,
    horario_salida
FROM
    employees
LIMIT
    5;