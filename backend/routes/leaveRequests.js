import express from 'express';
import pool from '../config/db.js';
import { verifyToken, verifyAdminOrHR } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../server.js';

const router = express.Router();

// GET /api/leave-requests - Obtener solicitudes
router.get('/', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [requests] = await connection.execute(
            'SELECT * FROM leave_requests ORDER BY requested_at DESC'
        );
        connection.release();
        res.json(requests);
    } catch (error) {
        console.error('Error fetching leave requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/leave-requests - Crear solicitud (con soporte para formulario público)
router.post('/', async (req, res) => {
    let connection;
    try {
        const {
            employee_id,
            cedula,
            employee_name,
            request_type,
            start_date,
            end_date,
            reason
        } = req.body;

        // Si no viene employee_id, buscarlo por cédula
        let finalEmployeeId = employee_id;

        if (!finalEmployeeId && cedula) {
            connection = await pool.getConnection();
            const [employees] = await connection.execute(
                'SELECT id FROM employees WHERE cedula = ?',
                [cedula]
            );
            connection.release();

            if (employees.length === 0) {
                return res.status(404).json({
                    error: 'Employee not found',
                    message: `No se encontró empleado con cédula ${cedula}`
                });
            }
            finalEmployeeId = employees[0].id;
        }

        if (!finalEmployeeId || !request_type || !start_date || !end_date) {
            return res.status(400).json({
                error: 'Missing required fields',
                message: 'Faltan campos requeridos: employee_id/cedula, request_type, start_date, end_date'
            });
        }

        connection = await pool.getConnection();
        const id = uuidv4();

        await connection.execute(
            `INSERT INTO leave_requests 
       (id, employee_id, request_type, start_date, end_date, reason, status) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending')`,
            [id, finalEmployeeId, request_type, start_date, end_date, reason || null]
        );

        connection.release();

        // 🔌 EMITIR EVENTO EN TIEMPO REAL
        io.emit('leave-request:new', {
            id,
            employee_id: finalEmployeeId,
            request_type,
            start_date,
            end_date,
            status: 'pending',
            timestamp: new Date()
        });

        res.status(201).json({ message: 'Leave request created successfully', id });
    } catch (error) {
        if (connection) {
            try {
                connection.release();
            } catch (e) {
                console.error('Error releasing connection:', e);
            }
        }
        console.error('Error creating leave request:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// PATCH /api/leave-requests/:id - Aprobar o rechazar solicitud
router.patch('/:id', verifyToken, verifyAdminOrHR, async (req, res) => {
    let connection;
    try {
        const { id } = req.params;
        const { status, rejection_reason } = req.body;

        if (!status || !['approved', 'rejected'].includes(status)) {
            return res.status(400).json({ error: 'Valid status required', message: 'Valid status required' });
        }

        connection = await pool.getConnection();

        // Actualizar la solicitud
        await connection.execute(
            `UPDATE leave_requests 
       SET status = ?, approved_by = ?, approved_at = ?, rejection_reason = ? 
       WHERE id = ?`,
            [
                status,
                req.user.id,
                new Date().toISOString(),
                rejection_reason || null,
                id
            ]
        );

        connection.release();

        // 🔌 EMITIR EVENTO EN TIEMPO REAL
        io.emit('leave-request:updated', {
            id,
            status,
            approved_by: req.user.id,
            timestamp: new Date()
        });

        res.json({ message: `Leave request ${status}`, status });
    } catch (error) {
        if (connection) {
            try {
                connection.release();
            } catch (e) {
                console.error('Error releasing connection:', e);
            }
        }
        console.error('Error updating leave request:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message || 'Internal server error' });
    }
});

// GET /api/leave-requests/employee/:employeeId - Obtener solicitudes de un empleado
router.get('/employee/:employeeId', async (req, res) => {
    try {
        const { employeeId } = req.params;
        const connection = await pool.getConnection();

        const [requests] = await connection.execute(
            'SELECT * FROM leave_requests WHERE employee_id = ? ORDER BY requested_at DESC',
            [employeeId]
        );

        connection.release();
        res.json(requests);
    } catch (error) {
        console.error('Error fetching employee leave requests:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
