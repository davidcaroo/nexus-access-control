import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware para verificar permisos de gestión de configuraciones
const checkShiftManagementPermission = async (req, res, next) => {
    try {
        const userId = req.user.id;

        // Verificar si el usuario tiene permisos para gestionar horarios
        const [permissions] = await pool.execute(
            `SELECT p.action
       FROM users u
       JOIN roles r ON u.role_id = r.id
       JOIN role_permissions rp ON r.id = rp.role_id
       JOIN permissions p ON rp.permission_id = p.id
       WHERE u.id = ? AND (p.action LIKE 'employees:%' OR r.name IN ('superadmin', 'admin', 'hr_manager'))`,
            [userId]
        );

        if (permissions.length === 0) {
            return res.status(403).json({ error: 'No tienes permisos para gestionar horarios' });
        }

        next();
    } catch (error) {
        console.error('Error verificando permisos:', error);
        res.status(500).json({ error: 'Error verificando permisos' });
    }
};

// GET /shifts - Listar todos los turnos con sus detalles
router.get('/', verifyToken, async (req, res) => {
    try {
        const { active_only } = req.query;

        let shiftsQuery = `
      SELECT 
        s.id,
        s.nombre,
        s.descripcion,
        s.is_active,
        s.created_at,
        s.updated_at,
        COUNT(DISTINCT e.id) as empleados_count
      FROM shifts s
      LEFT JOIN employees e ON s.id = e.shift_id AND e.estado = 'activo'
    `;

        const params = [];

        if (active_only === 'true') {
            shiftsQuery += ' WHERE s.is_active = TRUE';
        }

        shiftsQuery += ' GROUP BY s.id ORDER BY s.created_at DESC';

        const [shifts] = await pool.execute(shiftsQuery, params);

        // Obtener detalles de cada turno
        for (let shift of shifts) {
            const [details] = await pool.execute(
                `SELECT 
          id,
          day_of_week,
          hora_entrada,
          hora_salida,
          hora_almuerzo_inicio,
          hora_almuerzo_fin,
          es_dia_laboral
        FROM shift_details
        WHERE shift_id = ?
        ORDER BY FIELD(day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')`,
                [shift.id]
            );

            shift.details = details;
        }

        res.json(shifts);
    } catch (error) {
        console.error('Error obteniendo turnos:', error);
        res.status(500).json({ error: 'Error obteniendo turnos' });
    }
});

// GET /shifts/:id - Obtener un turno específico con sus detalles
router.get('/:id', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const [shifts] = await pool.execute(
            `SELECT 
        s.id,
        s.nombre,
        s.descripcion,
        s.is_active,
        s.created_at,
        s.updated_at,
        COUNT(DISTINCT e.id) as empleados_count
      FROM shifts s
      LEFT JOIN employees e ON s.id = e.shift_id AND e.estado = 'activo'
      WHERE s.id = ?
      GROUP BY s.id`,
            [id]
        );

        if (shifts.length === 0) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }

        const shift = shifts[0];

        const [details] = await pool.execute(
            `SELECT 
        id,
        day_of_week,
        hora_entrada,
        hora_salida,
        hora_almuerzo_inicio,
        hora_almuerzo_fin,
        es_dia_laboral
      FROM shift_details
      WHERE shift_id = ?
      ORDER BY FIELD(day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')`,
            [id]
        );

        shift.details = details;

        res.json(shift);
    } catch (error) {
        console.error('Error obteniendo turno:', error);
        res.status(500).json({ error: 'Error obteniendo turno' });
    }
});

// POST /shifts - Crear un nuevo turno
router.post('/', verifyToken, checkShiftManagementPermission, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { nombre, descripcion, details } = req.body;

        // Validaciones
        if (!nombre || !details || details.length === 0) {
            return res.status(400).json({
                error: 'Nombre y detalles de horario son requeridos'
            });
        }

        // Validar que details contenga los 7 días
        const requiredDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
        const providedDays = details.map(d => d.day_of_week);
        const missingDays = requiredDays.filter(day => !providedDays.includes(day));

        if (missingDays.length > 0) {
            return res.status(400).json({
                error: `Faltan los siguientes días: ${missingDays.join(', ')}`
            });
        }

        // Validar horarios lógicos
        for (let detail of details) {
            if (detail.es_dia_laboral) {
                if (!detail.hora_entrada || !detail.hora_salida) {
                    return res.status(400).json({
                        error: `Día laboral ${detail.day_of_week} debe tener hora de entrada y salida`
                    });
                }

                // Validar que hora_salida sea después de hora_entrada
                if (detail.hora_entrada >= detail.hora_salida) {
                    return res.status(400).json({
                        error: `En ${detail.day_of_week}: hora de salida debe ser después de hora de entrada`
                    });
                }

                // Si hay almuerzo, validar que esté dentro del horario laboral
                if (detail.hora_almuerzo_inicio && detail.hora_almuerzo_fin) {
                    // Convertir a minutos para comparación más robusta
                    const parseTime = (time) => {
                        const [hours, minutes] = time.split(':').map(Number);
                        return hours * 60 + minutes;
                    };

                    const entrada = parseTime(detail.hora_entrada);
                    const salida = parseTime(detail.hora_salida);
                    const almuerzoInicio = parseTime(detail.hora_almuerzo_inicio);
                    const almuerzoFin = parseTime(detail.hora_almuerzo_fin);

                    if (almuerzoInicio < entrada || almuerzoFin > salida || almuerzoInicio >= almuerzoFin) {
                        return res.status(400).json({
                            error: `Horario de almuerzo inválido en ${detail.day_of_week}. Debe estar entre ${detail.hora_entrada} y ${detail.hora_salida}`
                        });
                    }
                }
            }
        }

        await connection.beginTransaction();

        const shiftId = uuidv4();

        // Insertar turno
        await connection.execute(
            'INSERT INTO shifts (id, nombre, descripcion, is_active) VALUES (?, ?, ?, TRUE)',
            [shiftId, nombre, descripcion || null]
        );

        // Insertar detalles
        for (let detail of details) {
            const detailId = uuidv4();
            await connection.execute(
                `INSERT INTO shift_details 
        (id, shift_id, day_of_week, hora_entrada, hora_salida, hora_almuerzo_inicio, hora_almuerzo_fin, es_dia_laboral)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                [
                    detailId,
                    shiftId,
                    detail.day_of_week,
                    detail.hora_entrada || null,
                    detail.hora_salida || null,
                    detail.hora_almuerzo_inicio || null,
                    detail.hora_almuerzo_fin || null,
                    detail.es_dia_laboral !== false
                ]
            );
        }

        await connection.commit();

        // Obtener el turno creado con sus detalles
        const [newShift] = await pool.execute(
            'SELECT * FROM shifts WHERE id = ?',
            [shiftId]
        );

        const [newDetails] = await pool.execute(
            `SELECT * FROM shift_details WHERE shift_id = ?
       ORDER BY FIELD(day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')`,
            [shiftId]
        );

        newShift[0].details = newDetails;

        res.status(201).json(newShift[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error creando turno:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un turno con ese nombre' });
        }

        res.status(500).json({ error: 'Error creando turno' });
    } finally {
        connection.release();
    }
});

// PUT /shifts/:id - Actualizar un turno existente
router.put('/:id', verifyToken, checkShiftManagementPermission, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;
        const { nombre, descripcion, is_active, details } = req.body;

        // Verificar que el turno existe
        const [existingShift] = await connection.execute(
            'SELECT id FROM shifts WHERE id = ?',
            [id]
        );

        if (existingShift.length === 0) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }

        // Validar que no se pueda desactivar un turno con empleados activos
        if (is_active === false) {
            const [employeesWithShift] = await connection.execute(
                'SELECT COUNT(*) as count FROM employees WHERE shift_id = ? AND estado = "activo"',
                [id]
            );

            if (employeesWithShift[0].count > 0) {
                return res.status(400).json({
                    error: 'No se puede desactivar un turno con empleados activos asignados'
                });
            }
        }

        await connection.beginTransaction();

        // Actualizar turno
        await connection.execute(
            'UPDATE shifts SET nombre = ?, descripcion = ?, is_active = ? WHERE id = ?',
            [nombre, descripcion || null, is_active !== false, id]
        );

        // Si se proporcionan detalles, actualizarlos
        if (details && details.length > 0) {
            // Eliminar detalles existentes
            await connection.execute('DELETE FROM shift_details WHERE shift_id = ?', [id]);

            // Insertar nuevos detalles
            for (let detail of details) {
                const detailId = uuidv4();
                await connection.execute(
                    `INSERT INTO shift_details 
          (id, shift_id, day_of_week, hora_entrada, hora_salida, hora_almuerzo_inicio, hora_almuerzo_fin, es_dia_laboral)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                    [
                        detailId,
                        id,
                        detail.day_of_week,
                        detail.hora_entrada || null,
                        detail.hora_salida || null,
                        detail.hora_almuerzo_inicio || null,
                        detail.hora_almuerzo_fin || null,
                        detail.es_dia_laboral !== false
                    ]
                );
            }
        }

        await connection.commit();

        // Obtener el turno actualizado
        const [updatedShift] = await pool.execute(
            'SELECT * FROM shifts WHERE id = ?',
            [id]
        );

        const [updatedDetails] = await pool.execute(
            `SELECT * FROM shift_details WHERE shift_id = ?
       ORDER BY FIELD(day_of_week, 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')`,
            [id]
        );

        updatedShift[0].details = updatedDetails;

        res.json(updatedShift[0]);
    } catch (error) {
        await connection.rollback();
        console.error('Error actualizando turno:', error);

        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ error: 'Ya existe un turno con ese nombre' });
        }

        res.status(500).json({ error: 'Error actualizando turno' });
    } finally {
        connection.release();
    }
});

// DELETE /shifts/:id - Eliminar un turno
router.delete('/:id', verifyToken, checkShiftManagementPermission, async (req, res) => {
    const connection = await pool.getConnection();

    try {
        const { id } = req.params;

        // Verificar que el turno existe
        const [existingShift] = await connection.execute(
            'SELECT id FROM shifts WHERE id = ?',
            [id]
        );

        if (existingShift.length === 0) {
            return res.status(404).json({ error: 'Turno no encontrado' });
        }

        // Verificar que no hay empleados con este turno
        const [employeesWithShift] = await connection.execute(
            "SELECT COUNT(*) as count FROM employees WHERE shift_id = ? AND estado = 'activo'",
            [id]
        );

        if (employeesWithShift[0].count > 0) {
            return res.status(400).json({
                error: 'Error al eliminar. El horario tiene empleados activos asignados'
            });
        }

        await connection.beginTransaction();

        // Eliminar detalles (por CASCADE, pero lo hacemos explícito)
        await connection.execute('DELETE FROM shift_details WHERE shift_id = ?', [id]);

        // Eliminar turno
        await connection.execute('DELETE FROM shifts WHERE id = ?', [id]);

        await connection.commit();

        res.json({ message: 'Turno eliminado exitosamente' });
    } catch (error) {
        await connection.rollback();
        console.error('Error eliminando turno:', error);
        res.status(500).json({ error: 'Error eliminando turno' });
    } finally {
        connection.release();
    }
});

// GET /shifts/:id/employees - Obtener empleados asignados a un turno
router.get('/:id/employees', verifyToken, async (req, res) => {
    try {
        const { id } = req.params;

        const [employees] = await pool.execute(
            `SELECT 
        e.id,
        e.cedula,
        e.nombre,
        e.cargo,
        e.departamento,
        e.estado,
        e.fecha_ingreso
      FROM employees e
      WHERE e.shift_id = ?
      ORDER BY e.nombre`,
            [id]
        );

        res.json(employees);
    } catch (error) {
        console.error('Error obteniendo empleados del turno:', error);
        res.status(500).json({ error: 'Error obteniendo empleados del turno' });
    }
});

export default router;
