-- Script de prueba: Validación de empleados inactivos
-- Fecha: 2025-12-19
-- Descripción: Prueba el comportamiento del sistema con empleados inactivos
USE nexus_access_control;

-- 1. Ver el estado actual de todos los empleados
SELECT
    cedula,
    nombre,
    estado,
    cargo,
    departamento
FROM
    employees
ORDER BY
    nombre;

-- 2. Cambiar un empleado a inactivo (para pruebas)
-- Descomenta la siguiente línea para hacer la prueba:
-- UPDATE employees SET estado = 'inactivo' WHERE cedula = '30303030';
-- 3. Verificar el cambio
SELECT
    cedula,
    nombre,
    estado,
    CASE
        WHEN estado = 'activo' THEN '✅ Puede marcar asistencia'
        WHEN estado = 'inactivo' THEN '🚫 NO puede marcar asistencia'
    END as permiso_acceso
FROM
    employees
WHERE
    cedula = '30303030';

-- 4. Ver últimos registros de asistencia
SELECT
    ar.fecha,
    ar.hora,
    ar.tipo,
    ar.contexto,
    e.nombre,
    e.estado
FROM
    attendance_records ar
    JOIN employees e ON ar.employee_id = e.id
ORDER BY
    ar.fecha DESC,
    ar.hora DESC
LIMIT
    10;

-- 5. Reactivar empleado (si se desea)
-- Descomenta la siguiente línea para reactivar:
-- UPDATE employees SET estado = 'activo' WHERE cedula = '30303030';