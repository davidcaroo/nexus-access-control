import express from 'express';
import pool from '../config/db.js';
import { verifyToken, verifySuperAdmin, verifyAdminOrHR } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../server.js';

const router = express.Router();

// GET /api/employees - Obtener todos los empleados
router.get('/', verifyToken, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [employees] = await connection.execute(
            'SELECT * FROM employees ORDER BY nombre ASC'
        );
        connection.release();
        res.json(employees);
    } catch (error) {
        if (connection) {
            try {
                connection.release();
            } catch (e) {
                console.error('Error releasing connection:', e);
            }
        }
        console.error('Error fetching employees:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message || 'Internal server error' });
    }
});

// GET /api/employees/:id - Obtener empleado por ID
router.get('/:id', verifyToken, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();
        const [employees] = await connection.execute(
            'SELECT * FROM employees WHERE id = ?',
            [req.params.id]
        );
        connection.release();

        if (employees.length === 0) {
            return res.status(404).json({ error: 'Employee not found', message: 'Employee not found' });
        }

        res.json(employees[0]);
    } catch (error) {
        if (connection) {
            try {
                connection.release();
            } catch (e) {
                console.error('Error releasing connection:', e);
            }
        }
        console.error('Error fetching employee:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message || 'Internal server error' });
    }
});

// POST /api/employees - Crear empleado
router.post('/', verifyToken, verifyAdminOrHR, async (req, res) => {
    let connection;
    try {
        const {
            cedula,
            nombre,
            foto,
            cargo,
            departamento,
            horario_entrada,
            horario_salida,
            horario_almuerzo_inicio,
            horario_almuerzo_fin,
            estado,
            fecha_ingreso,
            shift_id
        } = req.body;

        if (!cedula || !nombre) {
            return res.status(400).json({ error: 'Cedula and nombre are required', message: 'Cedula and nombre are required' });
        }

        connection = await pool.getConnection();
        const id = uuidv4();
        const qr_code_url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(cedula)}`;

        await connection.execute(
            `INSERT INTO employees 
       (id, cedula, nombre, foto, cargo, departamento, horario_entrada, horario_salida, horario_almuerzo_inicio, horario_almuerzo_fin, estado, fecha_ingreso, qr_code_url, shift_id) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                cedula,
                nombre,
                foto || null,
                cargo || null,
                departamento || null,
                horario_entrada || '09:00:00',
                horario_salida || '18:00:00',
                horario_almuerzo_inicio || null,
                horario_almuerzo_fin || null,
                estado || 'activo',
                fecha_ingreso || new Date().toISOString().split('T')[0],
                qr_code_url,
                shift_id || null
            ]
        );

        connection.release();
        res.status(201).json({ message: 'Employee created', id });
    } catch (error) {
        if (connection) {
            try {
                connection.release();
            } catch (e) {
                console.error('Error releasing connection:', e);
            }
        }
        console.error('Error creating employee:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Cedula already exists', message: 'Cedula already exists' });
        }
        res.status(500).json({ error: 'Internal server error', message: error.message || 'Internal server error' });
    }
});

// POST /api/employees/bulk - Carga masiva de empleados
router.post('/bulk', verifyToken, verifyAdminOrHR, async (req, res) => {
    const { employees } = req.body || {};

    if (!Array.isArray(employees) || employees.length === 0) {
        return res.status(400).json({ error: 'Invalid payload', message: 'Debe enviar un arreglo de empleados' });
    }

    if (employees.length > 1000) {
        return res.status(400).json({ error: 'Too many records', message: 'El máximo permitido por carga es de 1000 empleados' });
    }

    const today = new Date().toISOString().split('T')[0];
    const invalidEntries = [];
    const normalized = [];

    employees.forEach((emp, index) => {
        const cedula = typeof emp?.cedula === 'string' ? emp.cedula.trim() : String(emp?.cedula || '').trim();
        const nombre = typeof emp?.nombre === 'string' ? emp.nombre.trim() : '';

        if (!cedula || !nombre) {
            invalidEntries.push({ index, cedula: emp?.cedula, reason: 'Faltan cédula o nombre' });
            return;
        }

        normalized.push({
            index,
            cedula,
            nombre,
            foto: emp?.foto || null,
            cargo: emp?.cargo || null,
            departamento: emp?.departamento || null,
            horario_entrada: emp?.horario_entrada || '09:00:00',
            horario_salida: emp?.horario_salida || '18:00:00',
            estado: emp?.estado || 'activo',
            fecha_ingreso: emp?.fecha_ingreso || today
        });
    });

    if (normalized.length === 0) {
        return res.status(400).json({
            error: 'No valid employees',
            message: 'Ningún registro contiene cédula y nombre válidos',
            invalidEntries
        });
    }

    const duplicatesInFile = [];
    const uniqueEmployees = [];
    const seenCedulas = new Set();

    normalized.forEach(emp => {
        if (seenCedulas.has(emp.cedula)) {
            duplicatesInFile.push(emp.cedula);
            return;
        }
        seenCedulas.add(emp.cedula);
        uniqueEmployees.push(emp);
    });

    let connection;
    try {
        connection = await pool.getConnection();
        await connection.beginTransaction();

        let existingCedulas = [];
        if (uniqueEmployees.length > 0) {
            const cedulaValues = uniqueEmployees.map(emp => emp.cedula);
            const placeholders = cedulaValues.map(() => '?').join(', ');
            const [rows] = await connection.query(
                `SELECT cedula FROM employees WHERE cedula IN (${placeholders})`,
                cedulaValues
            );
            existingCedulas = rows.map(row => row.cedula);
        }

        const existingCedulasSet = new Set(existingCedulas);
        const employeesToInsert = uniqueEmployees.filter(emp => !existingCedulasSet.has(emp.cedula));

        if (employeesToInsert.length === 0) {
            await connection.rollback();
            connection.release();
            return res.status(200).json({
                message: 'No se importaron empleados',
                inserted: 0,
                skippedExistingCount: existingCedulas.length,
                skippedExistingCedulas: existingCedulas,
                duplicatesInFileCount: duplicatesInFile.length,
                duplicatesInFile,
                invalidEntriesCount: invalidEntries.length,
                invalidEntries
            });
        }

        const placeholders = employeesToInsert.map(() => '(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').join(', ');
        const values = [];

        employeesToInsert.forEach(emp => {
            const id = uuidv4();
            values.push(
                id,
                emp.cedula,
                emp.nombre,
                emp.foto,
                emp.cargo,
                emp.departamento,
                emp.horario_entrada,
                emp.horario_salida,
                emp.estado,
                emp.fecha_ingreso,
                `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(emp.cedula)}`
            );
        });

        await connection.query(
            `INSERT INTO employees 
            (id, cedula, nombre, foto, cargo, departamento, horario_entrada, horario_salida, estado, fecha_ingreso, qr_code_url)
            VALUES ${placeholders}`,
            values
        );

        await connection.commit();
        connection.release();

        io.emit('employee:updated');

        return res.status(201).json({
            message: 'Carga masiva procesada',
            inserted: employeesToInsert.length,
            skippedExistingCount: existingCedulas.length,
            skippedExistingCedulas: existingCedulas,
            duplicatesInFileCount: duplicatesInFile.length,
            duplicatesInFile,
            invalidEntriesCount: invalidEntries.length,
            invalidEntries
        });
    } catch (error) {
        if (connection) {
            try {
                await connection.rollback();
                connection.release();
            } catch (e) {
                console.error('Error rolling back connection:', e);
            }
        }
        console.error('Error en carga masiva de empleados:', error);
        return res.status(500).json({ error: 'Internal server error', message: error.message || 'Internal server error' });
    }
});

// PATCH /api/employees/:id - Actualizar empleado
router.patch('/:id', verifyToken, verifyAdminOrHR, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const {
            cedula,
            nombre,
            foto,
            cargo,
            departamento,
            horario_entrada,
            horario_salida,
            horario_almuerzo_inicio,
            horario_almuerzo_fin,
            estado,
            shift_id
        } = req.body;

        connection = await pool.getConnection();

        // Verificar que existe
        const [employees] = await connection.execute(
            'SELECT id FROM employees WHERE id = ?',
            [id]
        );

        if (employees.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Employee not found', message: 'Employee not found' });
        }

        const qr_code_url = cedula
            ? `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(cedula)}`
            : undefined;

        const updateFields = [];
        const updateValues = [];

        if (cedula !== undefined) {
            updateFields.push('cedula = ?');
            updateValues.push(cedula);
        }
        if (nombre !== undefined) {
            updateFields.push('nombre = ?');
            updateValues.push(nombre);
        }
        if (foto !== undefined) {
            updateFields.push('foto = ?');
            updateValues.push(foto);
        }
        if (cargo !== undefined) {
            updateFields.push('cargo = ?');
            updateValues.push(cargo);
        }
        if (departamento !== undefined) {
            updateFields.push('departamento = ?');
            updateValues.push(departamento);
        }
        if (horario_entrada !== undefined) {
            updateFields.push('horario_entrada = ?');
            updateValues.push(horario_entrada);
        }
        if (horario_salida !== undefined) {
            updateFields.push('horario_salida = ?');
            updateValues.push(horario_salida);
        }
        if (horario_almuerzo_inicio !== undefined) {
            updateFields.push('horario_almuerzo_inicio = ?');
            // Convertir strings vacíos a null
            updateValues.push(horario_almuerzo_inicio === '' ? null : horario_almuerzo_inicio);
        }
        if (horario_almuerzo_fin !== undefined) {
            updateFields.push('horario_almuerzo_fin = ?');
            // Convertir strings vacíos a null
            updateValues.push(horario_almuerzo_fin === '' ? null : horario_almuerzo_fin);
        }
        if (estado !== undefined) {
            updateFields.push('estado = ?');
            updateValues.push(estado);
        }
        if (shift_id !== undefined) {
            updateFields.push('shift_id = ?');
            // Permitir null o string vacío para quitar el turno
            updateValues.push(shift_id === '' || shift_id === null ? null : shift_id);
        }
        if (qr_code_url) {
            updateFields.push('qr_code_url = ?');
            updateValues.push(qr_code_url);
        }

        if (updateFields.length === 0) {
            connection.release();
            return res.status(400).json({ error: 'No fields to update', message: 'No fields to update' });
        }

        updateValues.push(id);

        await connection.execute(
            `UPDATE employees SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        connection.release();
        res.json({ message: 'Employee updated' });
    } catch (error) {
        if (connection) {
            try {
                connection.release();
            } catch (e) {
                console.error('Error releasing connection:', e);
            }
        }
        console.error('Error updating employee:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Cedula already exists', message: 'Cedula already exists' });
        }
        res.status(500).json({ error: 'Internal server error', message: error.message || 'Internal server error' });
    }
});

// DELETE /api/employees/:id - Eliminar un empleado
router.delete('/:id', verifyToken, verifyAdminOrHR, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;

        connection = await pool.getConnection();

        // Verificar que el empleado existe
        const [employees] = await connection.execute(
            'SELECT id FROM employees WHERE id = ?',
            [id]
        );

        if (employees.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Employee not found', message: 'Employee not found' });
        }

        await connection.execute(
            'DELETE FROM employees WHERE id = ?',
            [id]
        );

        connection.release();
        res.json({ message: 'Employee deleted successfully' });
    } catch (error) {
        if (connection) {
            try {
                connection.release();
            } catch (e) {
                console.error('Error releasing connection:', e);
            }
        }
        console.error('Error deleting employee:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message || 'Internal server error' });
    }
});

// DELETE /api/employees - Eliminar todos los empleados
router.delete('/', verifyToken, verifySuperAdmin, async (req, res) => {
    let connection;
    try {
        connection = await pool.getConnection();

        const [result] = await connection.execute(
            'DELETE FROM employees'
        );

        connection.release();
        res.json({ message: 'All employees deleted successfully', deleted: result.affectedRows });
    } catch (error) {
        if (connection) {
            try {
                connection.release();
            } catch (e) {
                console.error('Error releasing connection:', e);
            }
        }
        console.error('Error deleting all employees:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message || 'Internal server error' });
    }
});

export default router;
