import pool from './config/db.js';

const runMigrations = async () => {
    try {
        const connection = await pool.getConnection();

        // Migración 1: Cambiar avatar_url a LONGTEXT para almacenar base64 grande
        try {
            await connection.execute(`
                ALTER TABLE users MODIFY COLUMN avatar_url LONGTEXT
            `);
        } catch (e) {
            if (!e.message.includes('Duplicate key')) {
                throw e;
            }
        }

        // Migración 2: Aumentar max_allowed_packet
        try {
            await connection.execute(`SET GLOBAL max_allowed_packet = 268435456`); // 256MB
        } catch (e) {
            if (e.message.includes('Access denied')) {
                // Silenciosamente ignorar si no hay permisos
            } else {
                throw e;
            }
        }

        connection.release();
    } catch (error) {
        console.error('❌ Error en migración:', error.message);
        throw error;
    }
};

export default runMigrations;
