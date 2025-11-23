import express from 'express';
import pool from '../config/db.js';
import { verifyToken, verifyAdminOrHR } from '../middleware/auth.js';
import { v4 as uuidv4 } from 'uuid';
import { io } from '../server.js';

const router = express.Router();

// GET /api/attendance - Obtener registros de asistencia
router.get('/', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();
        const [records] = await connection.execute(
            'SELECT * FROM attendance_records ORDER BY created_at DESC LIMIT 1000'
        );
        connection.release();
        res.json(records);
    } catch (error) {
        console.error('Error fetching attendance records:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /api/attendance/record - Registrar asistencia (con validación de duplicados)
router.post('/record', verifyToken, async (req, res) => {
    let connection;
    try {
        const { cedula, metodo, tipo } = req.body;

        if (!cedula || !metodo) {
            return res.status(400).json({ error: 'Cedula and metodo are required' });
        }

        connection = await pool.getConnection();

        // Obtener empleado
        const [employees] = await connection.execute(
            'SELECT * FROM employees WHERE cedula = ?',
            [cedula]
        );

        if (employees.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Employee not found', success: false });
        }

        const employee = employees[0];
        const now = new Date();
        const fecha = now.toISOString().split('T')[0];
        const hora = now.toTimeString().split(' ')[0];

        // Verificar setting de múltiples entradas/salidas
        const [settingsResult] = await connection.execute(
            'SELECT value FROM settings WHERE `key` = ?',
            ['allow_multiple_attendance']
        );
        const allowMultiple = settingsResult.length > 0 && settingsResult[0].value === 'true';

        // Obtener registros del día para determinar el tipo automáticamente
        const [todayRecords] = await connection.execute(
            'SELECT tipo FROM attendance_records WHERE employee_id = ? AND fecha = ? ORDER BY hora ASC',
            [employee.id, fecha]
        );

        let recordType = tipo || 'entrada';

        // LÓGICA CON CONFIGURACIÓN:
        // - Si NO permite múltiples: máximo 1 entrada + 1 salida
        // - Si permite múltiples: Opción A (Ciclo alternado: Entrada → Salida → Entrada → Salida...)

        if (!allowMultiple) {
            // MODO ESTRICTO: Solo 1 entrada y 1 salida por día
            if (todayRecords.length === 0) {
                recordType = 'entrada';
            } else if (todayRecords.length === 1) {
                const firstRecord = todayRecords[0].tipo;
                if (firstRecord === 'entrada') {
                    recordType = 'salida';
                } else {
                    connection.release();
                    return res.status(400).json({
                        error: 'Invalid sequence',
                        success: false,
                        message: `${employee.nombre} no puede marcar otra salida. La jornada debe comenzar con entrada.`
                    });
                }
            } else {
                // Ya tiene 2 registros (entrada + salida): jornada completada
                connection.release();
                return res.status(400).json({
                    error: 'Daily limit reached',
                    success: false,
                    message: `${employee.nombre} ya completó su jornada hoy (1 entrada + 1 salida). No puede marcar más.`
                });
            }
        } else {
            // MODO FLEXIBLE: Permite múltiples jornadas (Opción A - Ciclo alternado)
            if (todayRecords.length === 0) {
                recordType = 'entrada';
            } else {
                const lastRecord = todayRecords[todayRecords.length - 1].tipo;
                if (lastRecord === 'entrada') {
                    // Último fue entrada → próximo DEBE ser salida
                    recordType = 'salida';
                } else {
                    // Último fue salida → próximo es entrada (nueva jornada)
                    recordType = 'entrada';
                }
            }
        }


        // Determinar si es tardanza (solo para entradas)
        let tardanza = false;
        if (recordType === 'entrada') {
            const [horaStr] = hora.split(':');
            const [horaEntradaStr] = employee.horario_entrada.split(':');
            const horaEntradaNum = parseInt(horaEntradaStr);
            const horaActualNum = parseInt(horaStr);

            // Tardanza si llega después de la hora + 15 min de tolerancia
            if (horaActualNum * 60 + parseInt(hora.split(':')[1]) >
                horaEntradaNum * 60 + 15) {
                tardanza = true;
            }
        }

        // Registrar asistencia
        await connection.execute(
            'INSERT INTO attendance_records (employee_id, tipo, fecha, hora, metodo, tardanza) VALUES (?, ?, ?, ?, ?, ?)',
            [employee.id, recordType, fecha, hora, metodo, tardanza]
        );

        connection.release();

        // 🔌 EMITIR EVENTO EN TIEMPO REAL
        io.emit('attendance:new', {
            employee_id: employee.id,
            employee_name: employee.nombre,
            tipo: recordType,
            fecha,
            hora,
            metodo,
            tardanza,
            timestamp: new Date()
        });

        res.status(201).json({
            success: true,
            message: `${employee.nombre} - ${recordType === 'entrada' ? 'Entrada registrada' : 'Salida registrada'}${tardanza ? ' (Tardanza)' : ''}`,
            employee
        });
    } catch (error) {
        console.error('Error recording attendance:', error);
        res.status(500).json({ error: 'Internal server error', success: false });
    }
});

// GET /api/attendance/date/:date - Obtener registros por fecha
router.get('/date/:date', verifyToken, async (req, res) => {
    try {
        const { date } = req.params;
        const connection = await pool.getConnection();

        const [records] = await connection.execute(
            'SELECT * FROM attendance_records WHERE fecha = ? ORDER BY hora ASC',
            [date]
        );

        connection.release();
        res.json(records);
    } catch (error) {
        console.error('Error fetching attendance by date:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// DELETE /api/attendance - Eliminar todos los registros (solo superadmin)
router.delete('/', verifyToken, async (req, res) => {
    try {
        if (req.user.role !== 'superadmin') {
            return res.status(403).json({ error: 'Only superadmins can delete all records' });
        }

        const connection = await pool.getConnection();
        await connection.execute('DELETE FROM attendance_records');
        connection.release();

        res.json({ message: 'All attendance records deleted' });
    } catch (error) {
        console.error('Error deleting attendance records:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/attendance/journeys - Obtener jornadas completas (entrada + salida agrupadas)
router.get('/journeys', verifyToken, async (req, res) => {
    try {
        const connection = await pool.getConnection();

        // Obtener todos los registros agrupados por fecha y empleado
        const [records] = await connection.execute(
            `SELECT 
                employee_id,
                fecha,
                MAX(CASE WHEN tipo = 'entrada' THEN hora END) as hora_entrada,
                MAX(CASE WHEN tipo = 'salida' THEN hora END) as hora_salida,
                MAX(CASE WHEN tipo = 'entrada' THEN tardanza END) as tardanza_entrada,
                MAX(metodo) as metodo
            FROM attendance_records
            GROUP BY employee_id, fecha
            ORDER BY fecha DESC, employee_id ASC`
        );

        connection.release();

        // Procesar jornadas para calcular horas trabajadas y extras
        const journeys = records.map(j => {
            let horas_trabajadas = 0;
            let horas_extra = 0;

            if (j.hora_entrada && j.hora_salida) {
                // Calcular horas trabajadas
                try {
                    const [hE, mE] = j.hora_entrada.split(':').map(Number);
                    const [hS, mS] = j.hora_salida.split(':').map(Number);
                    const minutosEntrada = hE * 60 + mE;
                    const minutosSalida = hS * 60 + mS;
                    const minutosTrabajados = minutosSalida - minutosEntrada;
                    horas_trabajadas = Math.round(minutosTrabajados / 60 * 100) / 100;

                    // Obtener horario teórico del empleado (necesitaría BD)
                    // Por ahora, asumimos 9 horas de 8:00 a 17:00
                    const horasTeoricas = 9;
                    if (horas_trabajadas > horasTeoricas) {
                        horas_extra = horas_trabajadas - horasTeoricas;
                    }
                } catch (e) {
                    console.error('Error calculating hours:', e);
                }
            }

            return {
                employee_id: j.employee_id,
                fecha: j.fecha,
                hora_entrada: j.hora_entrada || 'N/A',
                hora_salida: j.hora_salida || 'Pendiente',
                horas_trabajadas,
                horas_extra,
                tardanza: j.tardanza_entrada ? 'Sí' : 'No',
                metodo: j.metodo || 'manual'
            };
        });

        res.json(journeys);
    } catch (error) {
        console.error('Error fetching journeys:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/attendance/daily - Reporte diario de asistencia
router.get('/daily', verifyToken, async (req, res) => {
    try {
        const { date } = req.query;
        const reportDate = date || new Date().toISOString().split('T')[0];

        const connection = await pool.getConnection();

        // Obtener todos los empleados activos
        const [employees] = await connection.execute(
            'SELECT id, nombre, horario_entrada, horario_salida FROM employees WHERE estado = "activo" ORDER BY nombre ASC'
        );

        // Obtener registros de asistencia del día
        const [records] = await connection.execute(
            `SELECT ar.id, ar.employee_id, ar.fecha, ar.hora, ar.tipo, ar.tardanza, ar.metodo
             FROM attendance_records ar
             WHERE ar.fecha = ?
             ORDER BY ar.employee_id ASC, ar.hora ASC`,
            [reportDate]
        );

        connection.release();

        // Agrupar registros por empleado
        const recordsByEmployee = {};
        for (const record of records) {
            if (!recordsByEmployee[record.employee_id]) {
                recordsByEmployee[record.employee_id] = [];
            }
            recordsByEmployee[record.employee_id].push(record);
        }

        // Construir reporte diario
        const dailyReport = [];
        for (const employee of employees) {
            const employeeRecords = recordsByEmployee[employee.id] || [];
            const entrada = employeeRecords.find(r => r.tipo === 'entrada');
            const salida = employeeRecords.find(r => r.tipo === 'salida');

            const horaEntrada = entrada ? entrada.hora : null;
            const horaSalida = salida ? salida.hora : null;
            const metodo = entrada ? entrada.metodo : null;
            const esTardanza = entrada ? entrada.tardanza : false;

            // Calcular minutos de tardanza
            let minutosTardanza = 0;
            if (esTardanza && horaEntrada && employee.horario_entrada) {
                const [hE, mE] = horaEntrada.split(':').map(Number);
                const [hConf, mConf] = employee.horario_entrada.split(':').map(Number);
                const minutosEntrada = hE * 60 + mE;
                const minutosConfigAdo = hConf * 60 + mConf;
                const diferenciaMinutos = minutosEntrada - minutosConfigAdo;
                if (diferenciaMinutos > 15) {
                    minutosTardanza = diferenciaMinutos - 15;
                }
            }

            const estado = horaEntrada ? 'Presente' : 'Ausente';

            dailyReport.push({
                empleado_id: employee.id,
                empleado: employee.nombre,
                horaEntrada: horaEntrada || '-',
                horaSalida: horaSalida || '-',
                metodo: metodo ? metodo.toUpperCase() : '-',
                tardanza: esTardanza ? minutosTardanza : 0,
                esTardanza: esTardanza,
                estado: estado
            });
        }

        res.json(dailyReport);
    } catch (error) {
        console.error('Error fetching daily attendance report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/attendance/tardanzas - Reporte de tardanzas por rango de fechas
router.get('/tardanzas', verifyToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        const connection = await pool.getConnection();

        // Obtener todos los empleados activos
        const [employees] = await connection.execute(
            'SELECT id, nombre, horario_entrada FROM employees WHERE estado = "activo" ORDER BY nombre ASC'
        );

        // Obtener registros de tardanza en el rango de fechas
        const [records] = await connection.execute(
            `SELECT ar.id, ar.employee_id, ar.fecha, ar.hora, ar.tardanza, ar.tipo
             FROM attendance_records ar
             WHERE ar.fecha BETWEEN ? AND ? AND ar.tipo = 'entrada'
             ORDER BY ar.fecha DESC, ar.employee_id ASC`,
            [startDate, endDate]
        );

        connection.release();

        // Procesar registros de tardanza
        const tardanzasReport = [];
        const empleadoTardanzas = {}; // Para contar veces por empleado

        for (const record of records) {
            if (record.tardanza) {
                const employee = employees.find(e => e.id === record.employee_id);
                if (employee) {
                    // Calcular minutos de tardanza
                    const [hE, mE] = record.hora.split(':').map(Number);
                    const [hConf, mConf] = employee.horario_entrada.split(':').map(Number);
                    const minutosEntrada = hE * 60 + mE;
                    const minutosConfigAdo = hConf * 60 + mConf;
                    const diferenciaMinutos = minutosEntrada - minutosConfigAdo;
                    const minutosTardanza = diferenciaMinutos > 15 ? diferenciaMinutos - 15 : 0;

                    tardanzasReport.push({
                        empleado_id: employee.id,
                        empleado: employee.nombre,
                        fecha: record.fecha,
                        horaReal: record.hora,
                        horaPlaneada: employee.horario_entrada,
                        minutosTarde: minutosTardanza
                    });

                    // Contar tardanzas por empleado
                    if (!empleadoTardanzas[employee.id]) {
                        empleadoTardanzas[employee.id] = {
                            nombre: employee.nombre,
                            totalVeces: 0,
                            totalMinutos: 0,
                            registros: []
                        };
                    }
                    empleadoTardanzas[employee.id].totalVeces++;
                    empleadoTardanzas[employee.id].totalMinutos += minutosTardanza;
                    empleadoTardanzas[employee.id].registros.push(tardanzasReport[tardanzasReport.length - 1]);
                }
            }
        }

        // Convertir a array y calcular promedio
        const empleadoTardanzasArray = Object.values(empleadoTardanzas).map(e => ({
            ...e,
            promedioMinutos: Math.round(e.totalMinutos / e.totalVeces)
        }));

        res.json({
            detalle: tardanzasReport,
            resumen: empleadoTardanzasArray.sort((a, b) => b.totalVeces - a.totalVeces)
        });
    } catch (error) {
        console.error('Error fetching tardanzas report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// GET /api/attendance/report - Reporte de asistencia con rango de fechas
router.get('/report', verifyToken, async (req, res) => {
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'startDate and endDate are required' });
        }

        const connection = await pool.getConnection();

        // Obtener todos los empleados activos con su horario
        const [employees] = await connection.execute(
            'SELECT id, nombre, horario_entrada, horario_salida FROM employees WHERE estado = "activo" ORDER BY nombre ASC'
        );

        // Obtener todos los registros de asistencia en el rango de fechas
        const [records] = await connection.execute(
            `SELECT ar.id, ar.employee_id, ar.fecha, ar.hora, ar.tipo, ar.tardanza
             FROM attendance_records ar
             WHERE ar.fecha BETWEEN ? AND ?
             ORDER BY ar.fecha ASC, ar.employee_id ASC, ar.hora ASC`,
            [startDate, endDate]
        );

        connection.release();

        // Agrupar registros por empleado y fecha
        const recordsByEmployeeDate = {};
        for (const record of records) {
            const key = `${record.employee_id}_${record.fecha}`;
            if (!recordsByEmployeeDate[key]) {
                recordsByEmployeeDate[key] = [];
            }
            recordsByEmployeeDate[key].push(record);
        }

        // Construir reporte
        const report = [];
        const startD = new Date(startDate);
        const endD = new Date(endDate);

        for (const employee of employees) {
            // Iterar sobre cada fecha en el rango
            for (let d = new Date(startD); d <= endD; d.setDate(d.getDate() + 1)) {
                const currentDate = d.toISOString().split('T')[0];
                const dayRecords = recordsByEmployeeDate[`${employee.id}_${currentDate}`] || [];

                // Obtener entrada y salida
                const entrada = dayRecords.find(r => r.tipo === 'entrada');
                const salida = dayRecords.find(r => r.tipo === 'salida');

                const horaEntrada = entrada ? entrada.hora : null;
                const horaSalida = salida ? salida.hora : null;
                const esTardanza = entrada ? entrada.tardanza : false;

                // Calcular horas trabajadas
                let horasTrabajadas = 'No asistió';
                if (horaEntrada && horaSalida) {
                    const [hE, mE] = horaEntrada.split(':').map(Number);
                    const [hS, mS] = horaSalida.split(':').map(Number);
                    const minutosEntrada = hE * 60 + mE;
                    const minutosSalida = hS * 60 + mS;
                    const minutosTrabajados = minutosSalida - minutosEntrada;
                    const horas = Math.floor(minutosTrabajados / 60);
                    const minutos = minutosTrabajados % 60;
                    horasTrabajadas = `${horas}h ${minutos}m`;
                }

                // Calcular minutos de tardanza si aplica
                let minutosTardanza = 0;
                if (esTardanza && horaEntrada && employee.horario_entrada) {
                    const [hE, mE] = horaEntrada.split(':').map(Number);
                    const [hConf, mConf] = employee.horario_entrada.split(':').map(Number);
                    const minutosEntrada = hE * 60 + mE;
                    const minutosConfigAdo = hConf * 60 + mConf;
                    const diferenciaMinutos = minutosEntrada - minutosConfigAdo;
                    // Tardanza es la diferencia después de 15 min de tolerancia
                    if (diferenciaMinutos > 15) {
                        minutosTardanza = diferenciaMinutos - 15;
                    }
                }

                report.push({
                    fecha: currentDate,
                    empleado: employee.nombre,
                    empleado_id: employee.id,
                    horaEntrada: horaEntrada || 'No asistió',
                    horaSalida: horaSalida || 'No asistió',
                    horasTrabajadas,
                    tardanza: minutosTardanza,
                    asistio: horaEntrada ? true : false
                });
            }
        }

        res.json(report);
    } catch (error) {
        console.error('Error fetching attendance report:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});// DELETE /api/attendance/all - Eliminar todos los registros (solo superadmin)
router.delete('/all', verifyToken, async (req, res) => {
    try {
        // Verificar que sea superadmin
        const connection = await pool.getConnection();
        const [users] = await connection.execute(
            'SELECT u.role_id FROM users u WHERE u.id = ?',
            [req.user.id]
        );
        connection.release();

        if (users.length === 0 || users[0].role_id !== '1') {
            return res.status(403).json({ error: 'Only superadmins can delete all records' });
        }

        const conn = await pool.getConnection();
        await conn.execute('DELETE FROM attendance_records');
        conn.release();

        res.json({ message: 'All attendance records deleted' });
    } catch (error) {
        console.error('Error deleting attendance records:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;
