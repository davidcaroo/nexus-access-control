import mysql from 'mysql2/promise';

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'nexus_access_control',
    waitForConnections: true
});

(async () => {
    try {
        console.log('🔍 Verificando datos en la base de datos...\n');

        // Total registros diciembre 2025
        const [rows1] = await pool.execute(
            'SELECT COUNT(*) as total FROM attendance_records WHERE fecha >= "2025-12-01" AND fecha <= "2025-12-31"'
        );
        console.log('📅 Total registros diciembre 2025:', rows1[0].total);

        // Total empleados activos
        const [rows2] = await pool.execute(
            'SELECT COUNT(*) as total FROM employees WHERE estado = "activo"'
        );
        console.log('👥 Total empleados activos:', rows2[0].total);

        // Muestra de registros recientes
        const [rows3] = await pool.execute(
            'SELECT DATE(fecha) as fecha, COUNT(*) as registros FROM attendance_records GROUP BY DATE(fecha) ORDER BY fecha DESC LIMIT 10'
        );
        console.log('\n📊 Últimos 10 días con registros:');
        rows3.forEach(r => console.log(`  ${r.fecha}: ${r.registros} registros`));

        // Verificar estructura de attendance_records
        const [rows4] = await pool.execute(
            'SELECT * FROM attendance_records LIMIT 1'
        );
        if (rows4.length > 0) {
            console.log('\n🔧 Estructura de attendance_records:');
            console.log('Columnas:', Object.keys(rows4[0]).join(', '));
        } else {
            console.log('\n⚠️  No hay registros en attendance_records');
        }

        await pool.end();
    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
})();
