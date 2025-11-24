import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();// POST /api/auth/register - Registrar nuevo usuario
router.post('/register', async (req, res) => {
    try {
        const { email, password, full_name } = req.body;

        if (!email || !password || !full_name) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const connection = await pool.getConnection();

        // Verificar si usuario existe
        const [existing] = await connection.execute(
            'SELECT id FROM users WHERE email = ?',
            [email]
        );

        if (existing.length > 0) {
            connection.release();
            return res.status(400).json({ error: 'User already exists' });
        }

        // Crear usuario con rol de employee por defecto
        const userId = uuidv4();
        const passwordHash = await bcrypt.hash(password, 10);
        const roleId = '5'; // employee role

        await connection.execute(
            'INSERT INTO users (id, email, password_hash, full_name, role_id) VALUES (?, ?, ?, ?, ?)',
            [userId, email, passwordHash, full_name, roleId]
        );

        connection.release();

        return res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error registering user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/login - Iniciar sesión
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password required' });
        }

        const connection = await pool.getConnection();

        const [users] = await connection.execute(
            'SELECT u.*, r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.email = ?',
            [email]
        );

        if (users.length === 0) {
            connection.release();
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        const user = users[0];

        // Verificar si está bloqueado
        if (user.is_banned) {
            connection.release();
            return res.status(403).json({ message: 'User is banned' });
        }

        // Verificar contraseña
        const passwordMatch = await bcrypt.compare(password, user.password_hash);
        if (!passwordMatch) {
            connection.release();
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Verificar que el usuario tenga un rol asignado
        if (!user.role || user.role === null) {
            connection.release();
            return res.status(403).json({ message: 'Access denied. User has no role assigned.' });
        }

        // Generar tokens
        const accessToken = jwt.sign(
            { id: user.id, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
        );

        const refreshToken = jwt.sign(
            { id: user.id },
            process.env.JWT_REFRESH_SECRET,
            { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
        );

        // Guardar refresh token en base de datos
        const sessionId = uuidv4();
        const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        await connection.execute(
            'INSERT INTO sessions (id, user_id, refresh_token, expires_at) VALUES (?, ?, ?, ?)',
            [sessionId, user.id, refreshToken, expiresAt]
        );

        connection.release();

        res.json({
            accessToken,
            refreshToken,
            user: {
                id: user.id,
                email: user.email,
                full_name: user.full_name,
                role: user.role,
                avatar_url: user.avatar_url
            }
        });
    } catch (error) {
        console.error('Error logging in:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/refresh - Renovar token
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({ error: 'Refresh token required' });
        }

        try {
            const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);
            const connection = await pool.getConnection();

            // Verificar que el refresh token es válido
            const [sessions] = await connection.execute(
                'SELECT * FROM sessions WHERE user_id = ? AND refresh_token = ? AND expires_at > NOW()',
                [decoded.id, refreshToken]
            );

            if (sessions.length === 0) {
                connection.release();
                return res.status(401).json({ error: 'Invalid refresh token' });
            }

            // Obtener usuario actualizado
            const [users] = await connection.execute(
                'SELECT u.*, r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
                [decoded.id]
            );

            connection.release();

            if (users.length === 0) {
                return res.status(404).json({ error: 'User not found' });
            }

            const user = users[0];

            const newAccessToken = jwt.sign(
                { id: user.id, email: user.email, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            res.json({ accessToken: newAccessToken });
        } catch (error) {
            console.error('Token verification error:', error);
            return res.status(401).json({ error: 'Invalid refresh token' });
        }
    } catch (error) {
        console.error('Error refreshing token:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/auth/me - Obtener usuario actual
router.get('/me', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();

        const [users] = await connection.execute(
            'SELECT u.*, r.name as role FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE u.id = ?',
            [req.user.id]
        );

        connection.release();

        if (users.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        const user = users[0];
        res.json({
            id: user.id,
            email: user.email,
            full_name: user.full_name,
            role: user.role,
            avatar_url: user.avatar_url
        });
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});// GET /api/auth/me/permissions - Obtener permisos del usuario actual
router.get('/me/permissions', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();

        // Obtener permisos del usuario basado en su rol
        const [permissions] = await connection.execute(
            `SELECT p.action FROM permissions p
             INNER JOIN role_permissions rp ON p.id = rp.permission_id
             INNER JOIN users u ON u.role_id = rp.role_id
             WHERE u.id = ?`,
            [req.user.id]
        );

        connection.release();

        const permissionsList = permissions.map(p => p.action);
        res.json({ permissions: permissionsList });
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/auth/logout - Cerrar sesión
router.post('/logout', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();

        // Eliminar todas las sesiones del usuario (invalidar todos los refresh tokens)
        await connection.execute(
            'DELETE FROM sessions WHERE user_id = ?',
            [req.user.id]
        );
        connection.release();

        res.json({ message: 'Logged out successfully' });
    } catch (error) {
        console.error('Error logging out:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/auth/me/avatar - Actualizar avatar (base64 o URL)
router.patch('/me/avatar', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { avatar_url } = req.body;

        if (!avatar_url) {
            return res.status(400).json({ message: 'Avatar URL is required' });
        }

        connection = await pool.getConnection();

        // Actualizar avatar (puede ser base64 o URL)
        await connection.execute(
            'UPDATE users SET avatar_url = ?, updated_at = NOW() WHERE id = ?',
            [avatar_url, req.user.id]
        );

        res.json({ message: 'Avatar updated successfully' });
    } catch (error) {
        console.error('Error updating avatar:', error.message);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    } finally {
        if (connection) {
            try {
                connection.release();
            } catch (releaseError) {
                console.error('Error releasing connection:', releaseError.message);
            }
        }
    }
});

// PATCH /api/auth/me/profile - Actualizar el perfil del usuario actual (nombre y avatar)
router.patch('/me/profile', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { full_name, avatar_url } = req.body;

        if (!full_name && !avatar_url) {
            return res.status(400).json({ message: 'At least one field is required' });
        }

        connection = await pool.getConnection();

        const updateFields = [];
        const updateValues = [];

        if (full_name) {
            updateFields.push('full_name = ?');
            updateValues.push(full_name);
        }
        if (avatar_url) {
            updateFields.push('avatar_url = ?');
            updateValues.push(avatar_url);
        }

        updateValues.push(req.user.id);

        await connection.execute(
            `UPDATE users SET ${updateFields.join(', ')}, updated_at = NOW() WHERE id = ?`,
            updateValues
        );

        res.json({ message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Error updating profile:', error.message);
        res.status(500).json({ error: 'Internal server error', details: error.message });
    } finally {
        // Asegurar que la conexión se libera siempre
        if (connection) {
            try {
                connection.release();
            } catch (releaseError) {
                console.error('Error releasing connection:', releaseError.message);
            }
        }
    }
});

export default router;
