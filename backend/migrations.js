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

        // Migración 3: Crear tabla password_reset_tokens
        try {
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS password_reset_tokens (
                    id VARCHAR(36) PRIMARY KEY,
                    user_id VARCHAR(36) NOT NULL,
                    token VARCHAR(255) NOT NULL UNIQUE,
                    expires_at TIMESTAMP NOT NULL,
                    used BOOLEAN DEFAULT FALSE,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                    INDEX idx_token (token),
                    INDEX idx_expires (expires_at),
                    INDEX idx_user_id (user_id)
                )
            `);
        } catch (e) {
            if (!e.message.includes('already exists')) {
                throw e;
            }
        }

        // Migración 4: Crear tabla password_reset_attempts para rate limiting
        try {
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS password_reset_attempts (
                    id VARCHAR(36) PRIMARY KEY,
                    ip VARCHAR(45) NOT NULL,
                    email VARCHAR(255),
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    INDEX idx_ip_time (ip, created_at),
                    INDEX idx_email_time (email, created_at)
                )
            `);
        } catch (e) {
            if (!e.message.includes('already exists')) {
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
