import express from 'express';
import pool from '../config/db.js';
import { verifyToken, verifySuperAdmin, verifyAdminOrHR } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

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
            estado,
            fecha_ingreso
        } = req.body;

        if (!cedula || !nombre) {
            return res.status(400).json({ error: 'Cedula and nombre are required', message: 'Cedula and nombre are required' });
        }

        connection = await pool.getConnection();
        const id = uuidv4();
        const qr_code_url = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(cedula)}`;

        await connection.execute(
            `INSERT INTO employees 
       (id, cedula, nombre, foto, cargo, departamento, horario_entrada, horario_salida, estado, fecha_ingreso, qr_code_url) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                id,
                cedula,
                nombre,
                foto || null,
                cargo || null,
                departamento || null,
                horario_entrada || '09:00:00',
                horario_salida || '18:00:00',
                estado || 'activo',
                fecha_ingreso || new Date().toISOString().split('T')[0],
                qr_code_url
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
            estado
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
        if (estado !== undefined) {
            updateFields.push('estado = ?');
            updateValues.push(estado);
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
router.delete('/:id', verifyToken, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const userId = req.user.id;

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

        // Obtener el rol del usuario
        const [userRole] = await connection.execute(
            'SELECT role_id FROM user_roles WHERE user_id = ?',
            [userId]
        );

        const [role] = await connection.execute(
            'SELECT name FROM roles WHERE id = ?',
            [userRole[0]?.role_id]
        );

        const userRoleName = role[0]?.name;

        // Superadmin puede eliminar cualquier empleado
        // Admin y HR pueden eliminar empleados
        if (userRoleName !== 'superadmin' && userRoleName !== 'admin' && userRoleName !== 'hr_manager') {
            connection.release();
            return res.status(403).json({ error: 'Forbidden', message: 'No tienes permisos para eliminar empleados' });
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
router.delete('/', verifyToken, async (req, res) => {
    let connection;
    try {
        const userId = req.user.id;

        connection = await pool.getConnection();

        // Obtener el rol del usuario
        const [userRole] = await connection.execute(
            'SELECT role_id FROM user_roles WHERE user_id = ?',
            [userId]
        );

        const [role] = await connection.execute(
            'SELECT name FROM roles WHERE id = ?',
            [userRole[0]?.role_id]
        );

        const userRoleName = role[0]?.name;

        // Solo superadmin puede eliminar todos los empleados
        if (userRoleName !== 'superadmin') {
            connection.release();
            return res.status(403).json({ error: 'Forbidden', message: 'Solo superadmins pueden eliminar todos los empleados' });
        }

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
