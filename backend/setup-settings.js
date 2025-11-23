import pool from './config/db.js';

async function createSettingsTable() {
    try {
        const connection = await pool.getConnection();

        // Crear tabla
        await connection.execute(`
      CREATE TABLE IF NOT EXISTS settings (
        id VARCHAR(36) PRIMARY KEY,
        \`key\` VARCHAR(100) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_key (\`key\`)
      ) ENGINE = InnoDB DEFAULT CHARSET = utf8mb4 COLLATE = utf8mb4_unicode_ci
    `);

        // Insertar configuraciones por defecto
        await connection.execute(
            `INSERT IGNORE INTO settings (id, \`key\`, value, description) VALUES (?, ?, ?, ?)`,
            ['1', 'allow_multiple_attendance', 'false', 'Permitir múltiples entradas/salidas el mismo día por empleado']
        );

        await connection.execute(
            `INSERT IGNORE INTO settings (id, \`key\`, value, description) VALUES (?, ?, ?, ?)`,
            ['2', 'attendance_tolerance_minutes', '15', 'Minutos de tolerancia para entrada sin marcar tardanza']
        );

        connection.release();
        console.log('✅ Tabla settings creada exitosamente');
        process.exit(0);
    } catch (error) {
        console.error('❌ Error creando tabla:', error);
        process.exit(1);
    }
}

createSettingsTable();
