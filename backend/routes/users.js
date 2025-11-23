import express from 'express';
import pool from '../config/db.js';
import { verifyToken, verifySuperAdmin } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /api/users - Obtener usuarios (solo superadmin)
router.get('/', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [users] = await connection.execute(
            'SELECT u.id, u.email, u.full_name, u.avatar_url, u.is_banned, u.created_at, r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id ORDER BY u.created_at DESC'
        );
        connection.release();
        res.json(users);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/users - Crear usuario (solo superadmin)
router.post('/', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const { email, password, full_name, role_id } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const connection = await pool.getConnection();

        // Verificar si existe
        const [existing] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'User already exists' });
        }

        const userId = uuidv4();
        const passwordHash = await bcrypt.hash(password, 10);

        await connection.execute(
            'INSERT INTO users (id, email, password_hash, full_name, role_id) VALUES (?, ?, ?, ?, ?)',
            [userId, email, passwordHash, full_name, role_id || '5']
        );

        connection.release();
        res.status(201).json({ message: 'User created', id: userId });
    } catch (error) {
        console.error('Error creating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/users/:id - Actualizar usuario
router.patch('/:id', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { full_name, avatar_url, role_id, is_banned } = req.body;

        const connection = await pool.getConnection();

        const updateFields = [];
        const updateValues = [];

        if (full_name !== undefined) {
            updateFields.push('full_name = ?');
            updateValues.push(full_name);
        }
        if (avatar_url !== undefined) {
            updateFields.push('avatar_url = ?');
            updateValues.push(avatar_url);
        }
        if (role_id !== undefined) {
            updateFields.push('role_id = ?');
            updateValues.push(role_id);
        }
        if (is_banned !== undefined) {
            updateFields.push('is_banned = ?');
            updateValues.push(is_banned);
        }

        if (updateFields.length === 0) {
            connection.release();
            return res.status(400).json({ error: 'No fields to update' });
        }

        updateValues.push(id);

        await connection.execute(
            `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`,
            updateValues
        );

        connection.release();
        res.json({ message: 'User updated' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/users/:id - Eliminar usuario
router.delete('/:id', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await pool.getConnection();

        await connection.execute('DELETE FROM users WHERE id = ?', [id]);
        connection.release();

        res.json({ message: 'User deleted' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
