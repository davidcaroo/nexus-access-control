import mysql from 'mysql2/promise';

(async () => {
    const connection = await mysql.createConnection({
        host: 'localhost',
        user: 'root',
        password: '',
        database: 'nexus_access_control'
    });

    console.log('\n=== 1. PERMISOS DE SHIFTS EN LA TABLA permissions ===');
    const [perms] = await connection.query('SELECT * FROM permissions WHERE action LIKE "shifts:%"');
    console.table(perms);

    console.log('\n=== 2. USUARIO TEST - ROL ASIGNADO ===');
    const [testUser] = await connection.query('SELECT u.id, u.email, u.role_id, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.email LIKE "%test%"');

    if (testUser.length > 0) {
        const roleId = testUser[0].role_id;

        console.log('\n=== 3. PERMISOS ASIGNADOS AL ROL DEL USUARIO TEST ===');
        const [rolePerms] = await connection.query(`
      SELECT p.action, p.description 
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ? AND p.action LIKE "shifts:%"
    `, [roleId]);
        console.table(rolePerms);

        if (rolePerms.length === 0) {
            console.log('\n⚠️ EL ROL NO TIENE PERMISOS DE SHIFTS ASIGNADOS');
            console.log('Ejecutando asignación de permisos...\n');

            await connection.query(`
        INSERT INTO role_permissions (role_id, permission_id)
        SELECT ?, id FROM permissions WHERE action LIKE "shifts:%"
        ON DUPLICATE KEY UPDATE role_id = role_id
      `, [roleId]);

            console.log('✅ Permisos asignados. Verificando...\n');
            const [newPerms] = await connection.query(`
        SELECT p.action, p.description 
        FROM role_permissions rp
        JOIN permissions p ON rp.permission_id = p.id
        WHERE rp.role_id = ? AND p.action LIKE "shifts:%"
      `, [roleId]);
            console.table(newPerms);
        }
    }

    await connection.end();
    console.log('\n✅ Verificación completa');
})();
