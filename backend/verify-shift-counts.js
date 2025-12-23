import mysql from 'mysql2/promise';

(async () => {
    const conn = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'nexus_access_control'
    });

    console.log('\n=== EMPLEADOS CON TURNO ASIGNADO ===');
    const [emps] = await conn.query('SELECT id, nombre, cedula, shift_id, estado FROM employees LIMIT 10');
    console.table(emps);

    console.log('\n=== CONTEO DE EMPLEADOS POR TURNO ===');
    const [counts] = await conn.query(`
    SELECT 
      s.id, 
      s.nombre, 
      COUNT(e.id) as empleados_activos,
      COUNT(CASE WHEN e.estado = 'activo' THEN 1 END) as solo_activos
    FROM shifts s
    LEFT JOIN employees e ON s.id = e.shift_id
    GROUP BY s.id
  `);
    console.table(counts);

    console.log('\n=== QUERY QUE USA EL BACKEND ===');
    const [backendQuery] = await conn.query(`
    SELECT 
      s.id,
      s.nombre,
      s.descripcion,
      s.is_active,
      s.created_at,
      s.updated_at,
      COUNT(DISTINCT e.id) as empleados_count
    FROM shifts s
    LEFT JOIN employees e ON s.id = e.shift_id AND e.estado = 'activo'
    GROUP BY s.id
    ORDER BY s.created_at DESC
  `);
    console.table(backendQuery);

    await conn.end();
    console.log('\n✅ Verificación completa');
})();
