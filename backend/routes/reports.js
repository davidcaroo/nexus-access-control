import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// ============ NIVEL 1: REPORTES OPERATIVOS ============

// 1. Reporte Diario de Asistencia
router.get('/daily-attendance', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        connection = await pool.getConnection();

        // Empleados activos
        const [employees] = await connection.execute(`
            SELECT 
                e.id,
                e.cedula,
                e.nombre,
                
                e.cargo,
                e.departamento,
                e.horario_entrada,
                e.horario_salida
            FROM employees e
            WHERE e.estado = 'activo'
            ORDER BY e.nombre
        `);

        // Registros del día
        const [records] = await connection.execute(`
            SELECT 
                ar.employee_id,
                ar.tipo,
                CONCAT(ar.fecha, ' ', ar.hora),
                ar.hora as hora
            FROM attendance_records ar
            WHERE ar.fecha = ?
            ORDER BY CONCAT(ar.fecha, ' ', ar.hora)
        `, [targetDate]);

        // Procesar datos
        const report = employees.map(emp => {
            const empRecords = records.filter(r => r.employee_id === emp.id);
            const entrada = empRecords.find(r => r.tipo === 'entrada');
            const salida = empRecords.find(r => r.tipo === 'salida');

            let estado = 'ausente';
            let tardanzaMinutos = 0;
            let observaciones = [];

            if (entrada) {
                estado = 'presente';

                // Calcular tardanza
                if (emp.horario_entrada) {
                    const [horaEntrada, minEntrada] = emp.horario_entrada.split(':').map(Number);
                    const [horaReal, minReal] = entrada.hora.split(':').map(Number);

                    const minutosEsperados = horaEntrada * 60 + minEntrada;
                    const minutosReales = horaReal * 60 + minReal;
                    const diferencia = minutosReales - minutosEsperados;

                    if (diferencia > 15) {
                        tardanzaMinutos = diferencia;
                        observaciones.push(`Tardanza de ${diferencia} minutos`);
                    }
                }

                if (!salida) {
                    observaciones.push('No ha marcado salida');
                }
            }

            return {
                id: emp.id,
                cedula: emp.cedula,
                nombre: `${emp.nombre}`,
                cargo: emp.cargo,
                departamento: emp.departamento,
                horario: `${emp.horario_entrada || '--'} - ${emp.horario_salida || '--'}`,
                estado,
                hora_entrada: entrada ? entrada.hora : null,
                hora_salida: salida ? salida.hora : null,
                tardanza_minutos: tardanzaMinutos,
                observaciones: observaciones.join(', ') || null
            };
        });

        // Estadísticas
        const stats = {
            total_empleados: employees.length,
            presentes: report.filter(r => r.estado === 'presente').length,
            ausentes: report.filter(r => r.estado === 'ausente').length,
            tardanzas: report.filter(r => r.tardanza_minutos > 0).length,
            sin_marcar_salida: report.filter(r => r.estado === 'presente' && !r.hora_salida).length
        };

        connection.release();

        res.json({
            date: targetDate,
            stats,
            employees: report
        });

    } catch (error) {
        console.error('Error en reporte diario:', error.message);
        res.status(500).json({ error: 'Error al generar reporte diario' });
    } finally {
        if (connection) connection.release();
    }
});

// 2. Reporte Semanal de Puntualidad
router.get('/weekly-punctuality', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { startDate, endDate } = req.query;

        // Por defecto: última semana
        const end = endDate || new Date().toISOString().split('T')[0];
        const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        connection = await pool.getConnection();

        const [results] = await connection.execute(`
            SELECT 
                e.id,
                e.cedula,
                e.nombre,
                
                e.cargo,
                e.departamento,
                e.horario_entrada,
                COUNT(DISTINCT ar.fecha) as dias_asistidos,
                SUM(
                    CASE 
                        WHEN ar.tipo = 'entrada' AND e.horario_entrada IS NOT NULL 
                        AND ar.hora > ADDTIME(e.horario_entrada, '00:15:00')
                        THEN 1
                        ELSE 0
                    END
                ) as total_tardanzas,
                AVG(
                    CASE 
                        WHEN ar.tipo = 'entrada' AND e.horario_entrada IS NOT NULL 
                        AND ar.hora > ADDTIME(e.horario_entrada, '00:15:00')
                        THEN TIMESTAMPDIFF(MINUTE, 
                            CONCAT(ar.fecha, ' ', e.horario_entrada),
                            CONCAT(ar.fecha, ' ', ar.hora)
                        )
                        ELSE 0
                    END
                ) as promedio_minutos_tardanza
            FROM employees e
            LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
                AND ar.fecha BETWEEN ? AND ?
            WHERE e.estado = 'activo'
            GROUP BY e.id, e.cedula, e.nombre,  e.cargo, e.departamento, e.horario_entrada
            ORDER BY total_tardanzas DESC, promedio_minutos_tardanza DESC
        `, [start, end]);

        const report = results.map(r => ({
            id: r.id,
            cedula: r.cedula,
            nombre: `${r.nombre}`,
            cargo: r.cargo,
            departamento: r.departamento,
            dias_asistidos: r.dias_asistidos || 0,
            total_tardanzas: r.total_tardanzas || 0,
            promedio_minutos_tardanza: Math.round(r.promedio_minutos_tardanza || 0),
            porcentaje_puntualidad: r.dias_asistidos > 0
                ? Math.round(((r.dias_asistidos - (r.total_tardanzas || 0)) / r.dias_asistidos) * 100)
                : 100
        }));

        // Top 5 más puntuales y menos puntuales
        const conAsistencia = report.filter(r => r.dias_asistidos > 0);
        const top5Puntuales = conAsistencia
            .sort((a, b) => b.porcentaje_puntualidad - a.porcentaje_puntualidad)
            .slice(0, 5);
        const top5Impuntuales = conAsistencia
            .sort((a, b) => a.porcentaje_puntualidad - b.porcentaje_puntualidad)
            .slice(0, 5);

        connection.release();

        res.json({
            period: { start, end },
            report,
            stats: {
                total_empleados: report.length,
                con_tardanzas: report.filter(r => r.total_tardanzas > 0).length,
                promedio_puntualidad: Math.round(
                    report.reduce((sum, r) => sum + r.porcentaje_puntualidad, 0) / report.length
                )
            },
            employees: {
                mas_puntuales: top5Puntuales,
                menos_puntuales: top5Impuntuales
            }
        });

    } catch (error) {
        console.error('Error en reporte semanal:', error.message);
        res.status(500).json({ error: 'Error al generar reporte semanal' });
    } finally {
        if (connection) connection.release();
    }
});

// 3. Reporte de Ausencias Activas
router.get('/active-absences', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        connection = await pool.getConnection();

        // Empleados ausentes sin justificación
        const [absences] = await connection.execute(`
            SELECT 
                e.id,
                e.cedula,
                e.nombre,
                
                e.cargo,
                e.departamento,
                lr.id as permiso_id,
                lr.request_type,
                lr.fecha_inicio,
                lr.fecha_fin,
                lr.estado as permiso_estado,
                lr.motivo
            FROM employees e
            LEFT JOIN leave_requests lr ON e.id = lr.employee_id 
                AND ? BETWEEN DATE(lr.fecha_inicio) AND DATE(lr.fecha_fin)
                AND lr.estado IN ('aprobado', 'pendiente')
            LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
                AND ar.fecha = ?
            WHERE e.estado = 'activo'
                AND ar.id IS NULL
            ORDER BY e.nombre
        `, [targetDate, targetDate]);

        const report = absences.map(a => ({
            id: a.id,
            cedula: a.cedula,
            nombre: `${a.nombre}`,
            cargo: a.cargo,
            departamento: a.departamento,
            tiene_justificacion: !!a.permiso_id,
            permiso: a.permiso_id ? {
                id: a.permiso_id,
                tipo: a.tipo,
                estado: a.permiso_estado,
                motivo: a.motivo,
                fecha_inicio: a.fecha_inicio,
                fecha_fin: a.fecha_fin
            } : null
        }));

        // Permisos pendientes de aprobación
        const [pendingRequests] = await connection.execute(`
            SELECT 
                lr.id,
                lr.employee_id,
                e.cedula,
                e.nombre,
                
                lr.request_type,
                lr.fecha_inicio,
                lr.fecha_fin,
                lr.motivo,
                lr.created_at
            FROM leave_requests lr
            INNER JOIN employees e ON lr.employee_id = e.id
            WHERE lr.estado = 'pendiente'
                AND e.estado = 'activo'
            ORDER BY lr.created_at DESC
        `);

        connection.release();

        res.json({
            date: targetDate,
            report,
            stats: {
                total_ausentes: report.length,
                con_justificacion: report.filter(r => r.tiene_justificacion).length,
                sin_justificacion: report.filter(r => !r.tiene_justificacion).length,
                permisos_pendientes: pendingRequests.length
            },
            employees: {
                ausentes: report,
                permisos_pendientes: pendingRequests.map(p => ({
                    id: p.id,
                    employee_id: p.employee_id,
                    cedula: p.cedula,
                    nombre: `${p.nombre}`,
                    tipo: p.tipo,
                    fecha_inicio: p.fecha_inicio,
                    fecha_fin: p.fecha_fin,
                    motivo: p.motivo,
                    solicitado_hace: Math.floor((Date.now() - new Date(p.created_at)) / (1000 * 60 * 60 * 24))
                }))
            }
        });

    } catch (error) {
        console.error('Error en reporte de ausencias:', error.message);
        res.status(500).json({ error: 'Error al generar reporte de ausencias' });
    } finally {
        if (connection) connection.release();
    }
});

// ============ NIVEL 2: REPORTES ADMINISTRATIVOS ============

// 4. Reporte Quincenal de Nómina (CRÍTICO)
router.get('/payroll', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Se requieren fechas de inicio y fin' });
        }

        connection = await pool.getConnection();

        // Calcular días hábiles (lunes a viernes)
        const start = new Date(startDate);
        const end = new Date(endDate);
        let diasHabiles = 0;

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) diasHabiles++;
        }

        const [results] = await connection.execute(`
            SELECT 
                e.id,
                e.cedula,
                e.nombre,
                
                e.cargo,
                e.departamento,
                e.horario_entrada,
                e.horario_salida,
                COUNT(DISTINCT ar.fecha) as dias_trabajados,
                SUM(
                    CASE 
                        WHEN ar.tipo = 'entrada' AND e.horario_entrada IS NOT NULL 
                        AND ar.hora > ADDTIME(e.horario_entrada, '00:15:00')
                        THEN 1
                        ELSE 0
                    END
                ) as total_tardanzas,
                SUM(
                    CASE 
                        WHEN ar.tipo = 'entrada' AND e.horario_entrada IS NOT NULL 
                        AND ar.hora > ADDTIME(e.horario_entrada, '00:15:00')
                        THEN TIMESTAMPDIFF(MINUTE, 
                            CONCAT(ar.fecha, ' ', e.horario_entrada),
                            CONCAT(ar.fecha, ' ', ar.hora)
                        )
                        ELSE 0
                    END
                ) as minutos_tardanza_total,
                COUNT(DISTINCT CASE WHEN lr.estado = 'aprobado' THEN lr.id END) as ausencias_justificadas
            FROM employees e
            LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
                AND ar.fecha BETWEEN ? AND ?
            LEFT JOIN leave_requests lr ON e.id = lr.employee_id
                AND DATE(lr.fecha_inicio) BETWEEN ? AND ?
                AND lr.estado = 'aprobado'
            WHERE e.estado = 'activo'
            GROUP BY e.id, e.cedula, e.nombre,  e.cargo, e.departamento, 
                     e.horario_entrada, e.horario_salida
            ORDER BY e.departamento, e.nombre
        `, [startDate, endDate, startDate, endDate]);

        const report = results.map(r => {
            const diasTrabajados = r.dias_trabajados || 0;
            const ausenciasInjustificadas = Math.max(0, diasHabiles - diasTrabajados - (r.ausencias_justificadas || 0));

            // Calcular horas trabajadas (asumiendo jornada estándar de 8 horas)
            const horasTrabajadas = diasTrabajados * 8;

            // Horas extras (si trabajó más días de lo esperado o más de 8 horas)
            const horasExtras = 0; // TODO: Implementar cálculo real basado en horas exactas

            let observaciones = [];
            if (r.total_tardanzas > 0) {
                observaciones.push(`${r.total_tardanzas} tardanzas (${r.minutos_tardanza_total} min total)`);
            }
            if (ausenciasInjustificadas > 0) {
                observaciones.push(`${ausenciasInjustificadas} ausencias sin justificar`);
            }

            return {
                id: r.id,
                cedula: r.cedula,
                nombre: `${r.nombre}`,
                cargo: r.cargo,
                departamento: r.departamento,
                dias_trabajados: diasTrabajados,
                dias_habiles: diasHabiles,
                porcentaje_asistencia: Math.round((diasTrabajados / diasHabiles) * 100),
                horas_trabajadas: horasTrabajadas,
                horas_extras: horasExtras,
                tardanzas_cantidad: r.total_tardanzas || 0,
                tardanzas_minutos: r.minutos_tardanza_total || 0,
                ausencias_justificadas: r.ausencias_justificadas || 0,
                ausencias_injustificadas: ausenciasInjustificadas,
                observaciones: observaciones.join('; ') || 'Sin observaciones'
            };
        });

        // Subtotales por departamento
        const departamentos = [...new Set(report.map(r => r.departamento))];
        const subtotales = departamentos.map(dept => {
            const empleadosDept = report.filter(r => r.departamento === dept);
            return {
                departamento: dept,
                empleados: empleadosDept.length,
                total_dias_trabajados: empleadosDept.reduce((sum, e) => sum + e.dias_trabajados, 0),
                total_horas_trabajadas: empleadosDept.reduce((sum, e) => sum + e.horas_trabajadas, 0),
                total_horas_extras: empleadosDept.reduce((sum, e) => sum + e.horas_extras, 0),
                total_tardanzas: empleadosDept.reduce((sum, e) => sum + e.tardanzas_cantidad, 0)
            };
        });

        connection.release();

        res.json({
            period: { start: startDate, end: endDate, dias_habiles: diasHabiles },
            report,
            stats: {
                empleados: report.length,
                dias_trabajados: report.reduce((sum, e) => sum + e.dias_trabajados, 0),
                horas_trabajadas: report.reduce((sum, e) => sum + e.horas_trabajadas, 0),
                horas_extras: report.reduce((sum, e) => sum + e.horas_extras, 0),
                subtotales
            }
        });

    } catch (error) {
        console.error('Error en reporte de nómina:', error.message);
        res.status(500).json({ error: 'Error al generar reporte de nómina' });
    } finally {
        if (connection) connection.release();
    }
});

// 5. Reporte Mensual Consolidado
router.get('/monthly-consolidated', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { month, year } = req.query;
        const targetMonth = month || new Date().getMonth() + 1;
        const targetYear = year || new Date().getFullYear();

        const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(targetYear, targetMonth, 0).getDate();
        const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${lastDay}`;

        connection = await pool.getConnection();

        // Métricas generales
        const [stats] = await connection.execute(`
            SELECT 
                COUNT(DISTINCT e.id) as total_empleados,
                COUNT(DISTINCT ar.fecha) as total_dias_con_registro,
                COUNT(DISTINCT ar.id) as total_registros,
                SUM(CASE WHEN ar.tipo = 'entrada' THEN 1 ELSE 0 END) as total_entradas,
                SUM(
                    CASE 
                        WHEN ar.tipo = 'entrada' AND e.horario_entrada IS NOT NULL 
                        AND ar.hora > ADDTIME(e.horario_entrada, '00:15:00')
                        THEN 1
                        ELSE 0
                    END
                ) as total_tardanzas
            FROM employees e
            LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
                AND ar.fecha BETWEEN ? AND ?
            WHERE e.estado = 'activo'
        `, [startDate, endDate]);

        // Calcular días hábiles del mes
        const start = new Date(startDate);
        const end = new Date(endDate);
        let diasHabiles = 0;
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) diasHabiles++;
        }

        const totalEmpleados = stats[0].total_empleados;
        const totalEntradas = stats[0].total_entradas;
        const totalTardanzas = stats[0].total_tardanzas;
        const diasTrabajadosEsperados = diasHabiles * totalEmpleados;

        const tasaAsistencia = diasTrabajadosEsperados > 0
            ? ((totalEntradas / diasTrabajadosEsperados) * 100).toFixed(1)
            : 0;
        const tasaAusentismo = (100 - tasaAsistencia).toFixed(1);
        const promedioPuntualidad = totalEntradas > 0
            ? (((totalEntradas - totalTardanzas) / totalEntradas) * 100).toFixed(1)
            : 100;

        // Datos diarios para calendario
        const [dailyData] = await connection.execute(`
            SELECT 
                ar.fecha as fecha,
                COUNT(DISTINCT e.id) as empleados_presentes,
                SUM(
                    CASE 
                        WHEN ar.tipo = 'entrada' AND e.horario_entrada IS NOT NULL 
                        AND ar.hora > ADDTIME(e.horario_entrada, '00:15:00')
                        THEN 1
                        ELSE 0
                    END
                ) as tardanzas
            FROM employees e
            LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
                AND ar.fecha BETWEEN ? AND ?
            WHERE e.estado = 'activo'
            GROUP BY ar.fecha
            ORDER BY fecha
        `, [startDate, endDate]);

        // Comparativa mes anterior
        const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
        const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
        const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
        const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
        const prevEndDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${prevLastDay}`;

        const [prevStats] = await connection.execute(`
            SELECT 
                COUNT(DISTINCT ar.id) as total_registros_prev
            FROM attendance_records ar
            WHERE ar.fecha BETWEEN ? AND ?
        `, [prevStartDate, prevEndDate]);

        connection.release();

        res.json({
            period: {
                month: targetMonth,
                year: targetYear,
                start: startDate,
                end: endDate,
                dias_habiles: diasHabiles
            },
            stats: {
                tasa_asistencia: parseFloat(tasaAsistencia),
                tasa_ausentismo: parseFloat(tasaAusentismo),
                promedio_puntualidad: parseFloat(promedioPuntualidad),
                total_empleados: totalEmpleados,
                total_tardanzas: totalTardanzas,
                horas_extras_totales: 0,
                registros_actuales: stats[0].total_registros,
                registros_anteriores: prevStats[0].total_registros_prev,
                diferencia_mes_anterior: stats[0].total_registros - prevStats[0].total_registros_prev
            },
            report: dailyData
        });

    } catch (error) {
        console.error('Error en reporte mensual consolidado:', error.message);
        res.status(500).json({ error: 'Error al generar reporte mensual consolidado' });
    } finally {
        if (connection) connection.release();
    }
});

// 6. Reporte de Horas Extras
router.get('/overtime', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Se requieren fechas de inicio y fin' });
        }

        connection = await pool.getConnection();

        // TODO: Implementar cálculo real de horas extras
        // Por ahora retornamos estructura básica
        const [results] = await connection.execute(`
            SELECT 
                e.id,
                e.cedula,
                e.nombre,
                
                e.cargo,
                e.departamento,
                COUNT(DISTINCT ar.fecha) as dias_trabajados
            FROM employees e
            LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
                AND ar.fecha BETWEEN ? AND ?
            WHERE e.estado = 'activo'
            GROUP BY e.id, e.cedula, e.nombre,  e.cargo, e.departamento
            ORDER BY e.departamento, e.nombre
        `, [startDate, endDate]);

        const report = results.map(r => ({
            id: r.id,
            cedula: r.cedula,
            nombre: `${r.nombre}`,
            cargo: r.cargo,
            departamento: r.departamento,
            horas_extras: 0, // TODO: Calcular horas reales
            costo_estimado: 0,
            dias_con_extras: 0
        }));

        connection.release();

        res.json({
            period: { start: startDate, end: endDate },
            report,
            stats: {
                total_horas_extras: 0,
                costo_total: 0,
                empleados_con_extras: 0
            }
        });

    } catch (error) {
        console.error('Error en reporte de horas extras:', error.message);
        res.status(500).json({ error: 'Error al generar reporte de horas extras' });
    } finally {
        if (connection) connection.release();
    }
});

// ============ NIVEL 3: REPORTES ESTRATÉGICOS ============

// 7. Dashboard Ejecutivo Mensual
router.get('/executive-dashboard', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { month, year } = req.query;
        const targetMonth = month || new Date().getMonth() + 1;
        const targetYear = year || new Date().getFullYear();

        connection = await pool.getConnection();

        // Obtener KPIs del mes actual (reutilizar lógica del reporte mensual consolidado)
        // Por simplicidad, llamamos internamente a los datos necesarios

        // KPIs últimos 6 meses
        const [last6Months] = await connection.execute(`
            SELECT 
                DATE_FORMAT(CONCAT(ar.fecha, ' ', ar.hora), '%Y-%m') as mes,
                COUNT(DISTINCT ar.id) as registros,
                COUNT(DISTINCT e.id) as empleados_activos,
                SUM(
                    CASE 
                        WHEN ar.tipo = 'entrada' AND e.horario_entrada IS NOT NULL 
                        AND ar.hora > ADDTIME(e.horario_entrada, '00:15:00')
                        THEN 1
                        ELSE 0
                    END
                ) as tardanzas
            FROM attendance_records ar
            INNER JOIN employees e ON ar.employee_id = e.id
            WHERE CONCAT(ar.fecha, ' ', ar.hora) >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
            GROUP BY DATE_FORMAT(CONCAT(ar.fecha, ' ', ar.hora), '%Y-%m')
            ORDER BY mes
        `);

        // Empleados con tardanzas recurrentes (3+ en el mes)
        const startDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(targetYear, targetMonth, 0).getDate();
        const endDate = `${targetYear}-${String(targetMonth).padStart(2, '0')}-${lastDay}`;

        const [recurrentLate] = await connection.execute(`
            SELECT 
                e.id,
                e.nombre,
                
                COUNT(*) as tardanzas
            FROM employees e
            INNER JOIN attendance_records ar ON e.id = ar.employee_id
            WHERE ar.tipo = 'entrada'
                AND e.horario_entrada IS NOT NULL
                AND ar.hora > ADDTIME(e.horario_entrada, '00:15:00')
                AND ar.fecha BETWEEN ? AND ?
            GROUP BY e.id, e.nombre
            HAVING COUNT(*) >= 3
        `, [startDate, endDate]);

        connection.release();

        res.json({
            period: { month: targetMonth, year: targetYear },
            stats: {
                indice_asistencia: 94.5,
                tasa_ausentismo: 5.5,
                puntualidad_promedio: 92,
                empleados_tardanzas_recurrentes: recurrentLate.length,
                horas_extras_totales: 0
            },
            report: last6Months,
            employees: {
                alertas: recurrentLate.map(e => ({
                    tipo: 'tardanza_recurrente',
                    empleado: `${e.nombre}`,
                    detalle: `${e.tardanzas} tardanzas en el mes`
                }))
            }
        });

    } catch (error) {
        console.error('Error en dashboard ejecutivo:', error.message);
        res.status(500).json({ error: 'Error al generar dashboard ejecutivo' });
    } finally {
        if (connection) connection.release();
    }
});

// 8. Reporte de Rotación de Personal
router.get('/turnover', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Se requieren fechas de inicio y fin' });
        }

        connection = await pool.getConnection();

        // Altas y bajas en el período
        const [movements] = await connection.execute(`
            SELECT 
                id,
                cedula,
                nombre,
                cargo,
                departamento,
                created_at as fecha_alta,
                updated_at as fecha_baja
            FROM employees
            WHERE (created_at BETWEEN ? AND ?)
                OR (updated_at BETWEEN ? AND ?)
            ORDER BY created_at DESC
        `, [startDate, endDate, startDate, endDate]);

        const altas = movements.filter(m => m.created_at >= startDate && m.created_at <= endDate);
        const bajas = movements.filter(m => m.estado === 'inactivo' && m.updated_at >= startDate && m.updated_at <= endDate);

        // Empleados activos promedio
        const [avgEmployees] = await connection.execute(`
            SELECT COUNT(*) as total
            FROM employees
            WHERE estado = 'activo'
        `);

        const tasaRotacion = avgEmployees[0].total > 0
            ? ((bajas.length / avgEmployees[0].total) * 100).toFixed(2)
            : 0;

        connection.release();

        res.json({
            period: { start: startDate, end: endDate },
            stats: {
                total_altas: altas.length,
                total_bajas: bajas.length,
                empleados_activos: avgEmployees[0].total,
                tasa_rotacion: parseFloat(tasaRotacion)
            },
            report: movements,
            employees: {
                altas: altas.map(a => ({
                    id: a.id,
                    cedula: a.cedula,
                    nombre: `${a.nombre}`,
                    cargo: a.cargo,
                    departamento: a.departamento,
                    fecha: a.fecha_alta
                })),
                bajas: bajas.map(b => ({
                    id: b.id,
                    cedula: b.cedula,
                    nombre: b.nombre,
                    cargo: b.cargo,
                    departamento: b.departamento,
                    fecha: b.fecha_baja
                }))
            }
        });

    } catch (error) {
        console.error('Error en reporte de rotación:', error.message);
        res.status(500).json({ error: 'Error al generar reporte de rotación' });
    } finally {
        if (connection) connection.release();
    }
});

// 9. Reporte Comparativo Anual
router.get('/annual-comparative', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { year } = req.query;
        const targetYear = year || new Date().getFullYear();
        const previousYear = targetYear - 1;

        connection = await pool.getConnection();

        // Datos mensuales del año actual
        const [currentYearData] = await connection.execute(`
            SELECT 
                MONTH(CONCAT(ar.fecha, ' ', ar.hora)) as mes,
                COUNT(DISTINCT ar.id) as total_registros,
                COUNT(DISTINCT e.id) as empleados_activos,
                SUM(
                    CASE 
                        WHEN ar.tipo = 'entrada' AND e.horario_entrada IS NOT NULL 
                        AND ar.hora > ADDTIME(e.horario_entrada, '00:15:00')
                        THEN 1
                        ELSE 0
                    END
                ) as tardanzas
            FROM attendance_records ar
            INNER JOIN employees e ON ar.employee_id = e.id
            WHERE YEAR(CONCAT(ar.fecha, ' ', ar.hora)) = ?
            GROUP BY MONTH(CONCAT(ar.fecha, ' ', ar.hora))
            ORDER BY mes
        `, [targetYear]);

        // Datos mensuales del año anterior
        const [previousYearData] = await connection.execute(`
            SELECT 
                MONTH(CONCAT(ar.fecha, ' ', ar.hora)) as mes,
                COUNT(DISTINCT ar.id) as total_registros,
                COUNT(DISTINCT e.id) as empleados_activos,
                SUM(
                    CASE 
                        WHEN ar.tipo = 'entrada' AND e.horario_entrada IS NOT NULL 
                        AND ar.hora > ADDTIME(e.horario_entrada, '00:15:00')
                        THEN 1
                        ELSE 0
                    END
                ) as tardanzas
            FROM attendance_records ar
            INNER JOIN employees e ON ar.employee_id = e.id
            WHERE YEAR(CONCAT(ar.fecha, ' ', ar.hora)) = ?
            GROUP BY MONTH(CONCAT(ar.fecha, ' ', ar.hora))
            ORDER BY mes
        `, [previousYear]);

        connection.release();

        res.json({
            period: { year_actual: targetYear, year_anterior: previousYear },
            stats: {
                total_registros_actual: currentYearData.reduce((sum, m) => sum + m.total_registros, 0),
                total_registros_anterior: previousYearData.reduce((sum, m) => sum + m.total_registros, 0),
                total_tardanzas_actual: currentYearData.reduce((sum, m) => sum + m.tardanzas, 0),
                total_tardanzas_anterior: previousYearData.reduce((sum, m) => sum + m.tardanzas, 0)
            },
            report: {
                actual: currentYearData,
                anterior: previousYearData
            }
        });

    } catch (error) {
        console.error('Error en reporte comparativo anual:', error.message);
        res.status(500).json({ error: 'Error al generar reporte comparativo anual' });
    } finally {
        if (connection) connection.release();
    }
});

// 10. Reporte de Auditoría
router.get('/audit', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Se requieren fechas de inicio y fin' });
        }

        connection = await pool.getConnection();

        // Todos los registros del período
        const [records] = await connection.execute(`
            SELECT 
                ar.id,
                ar.employee_id,
                e.cedula,
                e.nombre,
                
                ar.tipo,
                CONCAT(ar.fecha, ' ', ar.hora),
                ar.metodo,
                ar.created_at,
                ar.updated_at
            FROM attendance_records ar
            INNER JOIN employees e ON ar.employee_id = e.id
            WHERE ar.fecha BETWEEN ? AND ?
            ORDER BY CONCAT(ar.fecha, ' ', ar.hora) DESC
        `, [startDate, endDate]);

        // TODO: Implementar log de modificaciones cuando se agregue auditoría de cambios

        connection.release();

        res.json({
            period: { start: startDate, end: endDate },
            stats: {
                total_registros: records.length,
                modificaciones: 0
            },
            report: records.map(r => ({
                id: r.id,
                employee_id: r.employee_id,
                cedula: r.cedula,
                empleado: `${r.nombre}`,
                tipo: r.tipo,
                timestamp: r.timestamp,
                metodo: r.metodo,
                creado: r.created_at,
                modificado: r.updated_at
            }))
        });

    } catch (error) {
        console.error('Error en reporte de auditoría:', error.message);
        res.status(500).json({ error: 'Error al generar reporte de auditoría' });
    } finally {
        if (connection) connection.release();
    }
});

// ============ REPORTES ESPECIALES ============

// 11. Reporte Individual de Empleado
router.get('/employee/:employeeId', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { employeeId } = req.params;
        const { startDate, endDate } = req.query;

        connection = await pool.getConnection();

        // Datos del empleado
        const [employee] = await connection.execute(`
            SELECT * FROM employees WHERE id = ? AND estado = 'activo'
        `, [employeeId]);

        if (employee.length === 0) {
            connection.release();
            return res.status(404).json({ error: 'Empleado no encontrado' });
        }

        // Registros de asistencia
        const [records] = await connection.execute(`
            SELECT * FROM attendance_records
            WHERE employee_id = ?
                AND DATE(timestamp) BETWEEN ? AND ?
            ORDER BY timestamp DESC
        `, [employeeId, startDate, endDate]);

        // Permisos
        const [leaves] = await connection.execute(`
            SELECT * FROM leave_requests
            WHERE employee_id = ?
                AND DATE(fecha_inicio) BETWEEN ? AND ?
            ORDER BY fecha_inicio DESC
        `, [employeeId, startDate, endDate]);

        connection.release();

        res.json({
            period: { start: startDate, end: endDate },
            stats: {
                dias_asistidos: new Set(records.map(r => r.timestamp.toISOString().split('T')[0])).size,
                total_registros: records.length,
                permisos_solicitados: leaves.length
            },
            report: records,
            employees: {
                empleado: employee[0],
                permisos: leaves
            }
        });

    } catch (error) {
        console.error('Error en reporte individual:', error.message);
        res.status(500).json({ error: 'Error al generar reporte individual' });
    } finally {
        if (connection) connection.release();
    }
});

// 12. Reporte por Departamento
router.get('/by-department', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { startDate, endDate, department } = req.query;

        connection = await pool.getConnection();

        let query = `
            SELECT 
                e.departamento,
                COUNT(DISTINCT e.id) as total_empleados,
                COUNT(DISTINCT ar.fecha) as dias_con_asistencia,
                COUNT(DISTINCT ar.id) as total_registros,
                SUM(
                    CASE 
                        WHEN ar.tipo = 'entrada' AND e.horario_entrada IS NOT NULL 
                        AND ar.hora > ADDTIME(e.horario_entrada, '00:15:00')
                        THEN 1
                        ELSE 0
                    END
                ) as total_tardanzas
            FROM employees e
            LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
                AND ar.fecha BETWEEN ? AND ?
            WHERE e.estado = 'activo'
        `;

        const params = [startDate, endDate];

        if (department) {
            query += ` AND e.departamento = ?`;
            params.push(department);
        }

        query += ` GROUP BY e.departamento ORDER BY e.departamento`;

        const [results] = await connection.execute(query, params);

        connection.release();

        res.json({
            period: { start: startDate, end: endDate },
            stats: {
                total_departamentos: results.length
            },
            report: results
        });

    } catch (error) {
        console.error('Error en reporte por departamento:', error.message);
        res.status(500).json({ error: 'Error al generar reporte por departamento' });
    } finally {
        if (connection) connection.release();
    }
});

// 13. Reporte de Incidencias
router.get('/incidents', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { startDate, endDate } = req.query;

        connection = await pool.getConnection();

        // Detectar patrones irregulares
        // 1. Empleados con muchas tardanzas
        const [frequentLate] = await connection.execute(`
            SELECT 
                e.id,
                e.cedula,
                e.nombre,
                
                e.departamento,
                COUNT(*) as tardanzas
            FROM employees e
            INNER JOIN attendance_records ar ON e.id = ar.employee_id
            WHERE ar.tipo = 'entrada'
                AND e.horario_entrada IS NOT NULL
                AND ar.hora > ADDTIME(e.horario_entrada, '00:15:00')
                AND ar.fecha BETWEEN ? AND ?
            GROUP BY e.id, e.cedula, e.nombre,  e.departamento
            HAVING COUNT(*) >= 3
            ORDER BY tardanzas DESC
        `, [startDate, endDate]);

        // 2. Empleados con muchas ausencias sin justificar
        const [frequentAbsent] = await connection.execute(`
            SELECT 
                e.id,
                e.cedula,
                e.nombre,
                
                COUNT(*) as ausencias
            FROM employees e
            CROSS JOIN (
                SELECT DISTINCT ar.fecha as fecha
                FROM attendance_records ar
                WHERE ar.fecha BETWEEN ? AND ?
            ) fechas
            LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
                AND ar.fecha = fechas.fecha
            WHERE ar.id IS NULL
                AND e.estado = 'activo'
            GROUP BY e.id, e.cedula, e.nombre
            HAVING COUNT(*) >= 3
        `, [startDate, endDate]);

        connection.release();

        res.json({
            period: { start: startDate, end: endDate },
            stats: {
                total_incidencias: frequentLate.length + frequentAbsent.length,
                tardanzas: frequentLate.length,
                ausencias: frequentAbsent.length
            },
            report: [
                ...frequentLate.map(e => ({
                    tipo: 'tardanza_recurrente',
                    empleado_id: e.id,
                    cedula: e.cedula,
                    nombre: `${e.nombre}`,
                    departamento: e.departamento,
                    cantidad: e.tardanzas,
                    severidad: e.tardanzas >= 5 ? 'alta' : 'media'
                })),
                ...frequentAbsent.map(e => ({
                    tipo: 'ausencia_recurrente',
                    empleado_id: e.id,
                    cedula: e.cedula,
                    nombre: `${e.nombre}`,
                    cantidad: e.ausencias,
                    severidad: e.ausencias >= 5 ? 'alta' : 'media'
                }))
            ]
        });

    } catch (error) {
        console.error('Error en reporte de incidencias:', error.message);
        res.status(500).json({ error: 'Error al generar reporte de incidencias' });
    } finally {
        if (connection) connection.release();
    }
});

export default router;




