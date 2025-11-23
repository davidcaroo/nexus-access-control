import express from 'express';
import pool from '../config/db.js';
import { verifyToken, verifySuperAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /api/settings - Obtener todas las configuraciones
router.get('/', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [settings] = await connection.execute(
            'SELECT * FROM settings ORDER BY `key` ASC'
        );
        connection.release();

        // Convertir a objeto key-value
        const settingsObj = {};
        settings.forEach(s => {
            settingsObj[s.key] = s.value === 'true' ? true : s.value === 'false' ? false : s.value;
        });

        res.json(settingsObj);
    } catch (error) {
        console.error('Error fetching settings:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/settings/:key - Obtener configuración específica
router.get('/:key', verifyToken, async (req, res) => {
    try {
        const { key } = req.params;
        const connection = await pool.getConnection();
        const [settings] = await connection.execute(
            'SELECT * FROM settings WHERE `key` = ?',
            [key]
        );
        connection.release();

        if (settings.length === 0) {
            return res.status(404).json({ error: 'Setting not found' });
        }

        const setting = settings[0];
        res.json({
            key: setting.key,
            value: setting.value === 'true' ? true : setting.value === 'false' ? false : setting.value,
            description: setting.description
        });
    } catch (error) {
        console.error('Error fetching setting:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// PATCH /api/settings/:key - Actualizar configuración (solo superadmin)
router.patch('/:key', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const { key } = req.params;
        const { value } = req.body;

        if (value === undefined) {
            return res.status(400).json({ error: 'Value is required' });
        }

        const connection = await pool.getConnection();

        // Verificar que la setting existe
        const [existing] = await connection.execute(
            'SELECT * FROM settings WHERE `key` = ?',
            [key]
        );

        if (existing.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Setting not found' });
        }

        // Actualizar
        const valueStr = typeof value === 'boolean' ? value.toString() : String(value);
        await connection.execute(
            'UPDATE settings SET value = ?, updated_at = NOW() WHERE `key` = ?',
            [valueStr, key]
        );

        connection.release();
        res.json({
            message: 'Setting updated successfully',
            key,
            value: value
        });
    } catch (error) {
        console.error('Error updating setting:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
