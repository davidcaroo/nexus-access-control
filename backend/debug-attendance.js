import pool from './config/db.js';

async function checkAttendanceRecords() {
    try {
        const connection = await pool.getConnection();
        const [records] = await connection.execute(
            `SELECT id, employee_id, fecha, hora, tipo, tardanza FROM attendance_records 
       ORDER BY created_at DESC LIMIT 10`
        );
        connection.release();

        console.log('=== REGISTROS DE ASISTENCIA ===');
        console.log(JSON.stringify(records, null, 2));

        if (records.length > 0) {
            console.log('\n=== ANÁLISIS ===');
            console.log(`Total registros: ${records.length}`);
            console.log(`Primer registro fecha: ${records[0].fecha} (tipo: ${typeof records[0].fecha})`);
            console.log(`Hoy debería ser: 2025-11-22`);
        }

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkAttendanceRecords();
