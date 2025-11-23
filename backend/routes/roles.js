import express from 'express';
import pool from '../config/db.js';
import { verifyToken, verifySuperAdmin } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// GET /api/roles - Obtener roles
router.get('/', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [roles] = await connection.execute('SELECT * FROM roles ORDER BY name ASC');

        // Para cada rol, obtener sus permisos
        const rolesWithPermissions = await Promise.all(
            roles.map(async (role) => {
                const [permissions] = await connection.execute(
                    `SELECT p.* FROM permissions p 
           INNER JOIN role_permissions rp ON p.id = rp.permission_id 
           WHERE rp.role_id = ?`,
                    [role.id]
                );
                return {
                    ...role,
                    permissions: permissions.map(p => p.action)
                };
            })
        );

        connection.release();
        res.json(rolesWithPermissions);
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/roles - Crear rol
router.post('/', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const { name, description, permissions } = req.body;

        if (!name) {
            return res.status(400).json({ error: 'Role name is required' });
        }

        const connection = await pool.getConnection();
        const roleId = uuidv4();

        await connection.execute(
            'INSERT INTO roles (id, name, description) VALUES (?, ?, ?)',
            [roleId, name, description || null]
        );

        // Asignar permisos
        if (permissions && permissions.length > 0) {
            for (const permissionId of permissions) {
                await connection.execute(
                    'INSERT INTO role_permissions (role_id, permission_id) VALUES (?, ?)',
                    [roleId, permissionId]
                );
            }
        }

        connection.release();
        res.status(201).json({ message: 'Role created', id: roleId });
    } catch (error) {
        console.error('Error creating role:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Role already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/roles/:id - Eliminar rol
router.delete('/:id', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const connection = await pool.getConnection();

        await connection.execute('DELETE FROM role_permissions WHERE role_id = ?', [id]);
        await connection.execute('DELETE FROM roles WHERE id = ?', [id]);

        connection.release();
        res.json({ message: 'Role deleted' });
    } catch (error) {
        console.error('Error deleting role:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/permissions - Obtener permisos
router.get('/permissions', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [permissions] = await connection.execute('SELECT * FROM permissions ORDER BY action ASC');
        connection.release();
        res.json(permissions);
    } catch (error) {
        console.error('Error fetching permissions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/permissions - Crear permiso
router.post('/permissions', verifyToken, verifySuperAdmin, async (req, res) => {
    try {
        const { action, description } = req.body;

        if (!action) {
            return res.status(400).json({ error: 'Action is required' });
        }

        const connection = await pool.getConnection();
        const permissionId = uuidv4();

        await connection.execute(
            'INSERT INTO permissions (id, action, description) VALUES (?, ?, ?)',
            [permissionId, action, description || null]
        );

        connection.release();
        res.status(201).json({ message: 'Permission created', id: permissionId });
    } catch (error) {
        console.error('Error creating permission:', error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({ error: 'Permission already exists' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
