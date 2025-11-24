import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { Resend } from 'resend';
import crypto from 'crypto';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Inicializar cliente Resend
const resend = new Resend(process.env.RESEND_API_KEY);
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

// ============ PASSWORD RECOVERY ENDPOINTS ============

// POST /api/auth/forgot-password - Solicitar reset de contraseña
router.post('/forgot-password', async (req, res) => {
    let connection = null;
    try {
        const { email } = req.body;
        const clientIp = req.ip || req.connection.remoteAddress || 'unknown';

        // Validar email
        if (!email || !email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({ message: 'Invalid email format' });
        }

        connection = await pool.getConnection();

        // Rate limiting: máximo 3 intentos por hora desde la misma IP
        const [attempts] = await connection.execute(
            `SELECT COUNT(*) as count FROM password_reset_attempts 
             WHERE ip = ? AND created_at > DATE_SUB(NOW(), INTERVAL 1 HOUR)`,
            [clientIp]
        );

        if (attempts[0].count >= 3) {
            connection.release();
            // Respuesta silenciosa para no revelar rate limiting
            return res.status(429).json({
                message: 'Si el correo existe, recibirás un enlace para restaurar tu contraseña en tu bandeja de entrada en los próximos minutos.'
            });
        }

        // Verificar si el usuario existe
        const [users] = await connection.execute(
            'SELECT id, is_banned FROM users WHERE email = ?',
            [email]
        );

        // Siempre registrar el intento
        const attemptId = uuidv4();
        await connection.execute(
            `INSERT INTO password_reset_attempts (id, ip, email, created_at) VALUES (?, ?, ?, NOW())`,
            [attemptId, clientIp, email]
        );

        // Respuesta silenciosa - no revelar si el email existe
        if (users.length === 0) {
            connection.release();
            return res.status(200).json({
                message: 'Si el correo existe, recibirás un enlace para restaurar tu contraseña en tu bandeja de entrada en los próximos minutos.'
            });
        }

        const user = users[0];

        // No permitir reset para usuarios bloqueados
        if (user.is_banned) {
            connection.release();
            return res.status(200).json({
                message: 'Si el correo existe, recibirás un enlace para restaurar tu contraseña en tu bandeja de entrada en los próximos minutos.'
            });
        }

        // Invalidar tokens anteriores
        await connection.execute(
            `UPDATE password_reset_tokens SET used = TRUE WHERE user_id = ? AND used = FALSE`,
            [user.id]
        );

        // Generar token único
        const resetToken = crypto.randomUUID();
        const tokenId = uuidv4();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutos

        await connection.execute(
            `INSERT INTO password_reset_tokens (id, user_id, token, expires_at, used) 
             VALUES (?, ?, ?, ?, FALSE)`,
            [tokenId, user.id, resetToken, expiresAt]
        );

        // Construir link de reseteo
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;

        // Enviar email con Resend
        const emailHtml = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; color: white; text-align: center; border-radius: 8px 8px 0 0;">
                    <h1 style="margin: 0; font-size: 28px;">Restaurar Contraseña</h1>
                </div>
                <div style="padding: 30px; background: #f9fafb; border-radius: 0 0 8px 8px;">
                    <p style="margin: 0 0 20px 0; color: #374151; font-size: 16px;">Hola,</p>
                    <p style="margin: 0 0 20px 0; color: #374151; line-height: 1.6;">Recibiste esta solicitud para restaurar tu contraseña. Si no solicitaste esto, puedes ignorar este email de forma segura.</p>
                    <p style="margin: 0 0 20px 0; color: #374151; line-height: 1.6;">Este enlace expira en <strong>15 minutos</strong>.</p>
                    
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetLink}" style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; font-weight: 600; font-size: 16px;">Restaurar Contraseña</a>
                    </div>

                    <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 14px; line-height: 1.6;">O copia y pega este enlace en tu navegador:</p>
                    <p style="margin: 10px 0 20px 0; color: #667eea; font-size: 13px; word-break: break-all; background: #fff; padding: 10px; border-left: 3px solid #667eea;">${resetLink}</p>

                    <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 20px;">
                        <p style="margin: 0; color: #9ca3af; font-size: 12px; text-align: center;">© Nexus Access Control. Todos los derechos reservados.</p>
                    </div>
                </div>
            </div>
        `;

        try {
            await resend.emails.send({
                from: process.env.RESEND_FROM_EMAIL || 'noreply@nexusaccess.com',
                to: email,
                subject: 'Restaurar tu contraseña - Nexus Access Control',
                html: emailHtml
            });
        } catch (emailError) {
            console.error('Error enviando email:', emailError);
            // No revelar error de email al cliente
        }

        connection.release();

        return res.status(200).json({
            message: 'Si el correo existe, recibirás un enlace para restaurar tu contraseña en tu bandeja de entrada en los próximos minutos.'
        });

    } catch (error) {
        console.error('Error en forgot-password:', error.message);
        res.status(500).json({
            message: 'Si el correo existe, recibirás un enlace para restaurar tu contraseña en tu bandeja de entrada en los próximos minutos.'
        });
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

// GET /api/auth/validate-token/:token - Validar token de restauración
router.get('/validate-token/:token', async (req, res) => {
    let connection = null;
    try {
        const { token } = req.params;

        if (!token) {
            return res.status(400).json({ valid: false, message: 'Token is required' });
        }

        connection = await pool.getConnection();

        const [tokens] = await connection.execute(
            `SELECT id, user_id, expires_at, used FROM password_reset_tokens 
             WHERE token = ?`,
            [token]
        );

        if (tokens.length === 0) {
            connection.release();
            return res.status(404).json({ valid: false, message: 'Token not found' });
        }

        const resetToken = tokens[0];

        // Verificar que no esté usado
        if (resetToken.used) {
            connection.release();
            return res.status(400).json({ valid: false, message: 'Token has already been used' });
        }

        // Verificar que no haya expirado
        if (new Date(resetToken.expires_at) < new Date()) {
            connection.release();
            return res.status(400).json({ valid: false, message: 'Token has expired' });
        }

        connection.release();

        return res.status(200).json({
            valid: true,
            message: 'Token is valid'
        });

    } catch (error) {
        console.error('Error validating token:', error.message);
        res.status(500).json({ valid: false, message: 'Internal server error' });
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

// POST /api/auth/reset-password - Restaurar contraseña
router.post('/reset-password', async (req, res) => {
    let connection = null;
    try {
        const { token, password } = req.body;

        if (!token || !password) {
            return res.status(400).json({ message: 'Token and password are required' });
        }

        // Validar contraseña (mínimo 8 caracteres)
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long' });
        }

        connection = await pool.getConnection();

        const [tokens] = await connection.execute(
            `SELECT id, user_id, expires_at, used FROM password_reset_tokens 
             WHERE token = ?`,
            [token]
        );

        if (tokens.length === 0) {
            connection.release();
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const resetToken = tokens[0];

        // Verificar que no esté usado
        if (resetToken.used) {
            connection.release();
            return res.status(400).json({ message: 'Token has already been used' });
        }

        // Verificar que no haya expirado
        if (new Date(resetToken.expires_at) < new Date()) {
            connection.release();
            return res.status(400).json({ message: 'Token has expired' });
        }

        // Hash de la nueva contraseña
        const passwordHash = await bcrypt.hash(password, 10);

        // Actualizar contraseña del usuario
        await connection.execute(
            `UPDATE users SET password_hash = ?, updated_at = NOW() WHERE id = ?`,
            [passwordHash, resetToken.user_id]
        );

        // Marcar token como usado
        await connection.execute(
            `UPDATE password_reset_tokens SET used = TRUE WHERE id = ?`,
            [resetToken.id]
        );

        // Invalidar todas las sesiones del usuario (logout de todos los dispositivos)
        await connection.execute(
            `DELETE FROM sessions WHERE user_id = ?`,
            [resetToken.user_id]
        );

        connection.release();

        return res.status(200).json({
            message: 'Password reset successfully. Please login with your new password.'
        });

    } catch (error) {
        console.error('Error resetting password:', error.message);
        res.status(500).json({ message: 'Internal server error' });
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

export default router;
