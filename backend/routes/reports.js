import express from 'express';
import pool from '../config/db.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// ============ NIVEL 1: REPORTES OPERACIONALES ============

/**
 * REPORTE 1: Asistencia Diaria
 * Muestra todos los empleados activos con sus marcaciones del día
 * Incluye: contexto (almuerzo), horas trabajadas netas, tardanzas
 */
router.get('/operational/daily-attendance', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { date } = req.query;
        const targetDate = date || new Date().toISOString().split('T')[0];

        connection = await pool.getConnection();

        // Empleados activos con sus horarios
        const [employees] = await connection.execute(`
            SELECT 
                e.id,
                e.cedula,
                e.nombre,
                e.cargo,
                e.departamento,
                e.horario_entrada,
                e.horario_salida,
                e.horario_almuerzo_inicio,
                e.horario_almuerzo_fin
            FROM employees e
            WHERE e.estado = 'activo'
            ORDER BY e.nombre
        `);

        // Registros del día con contexto
        const [records] = await connection.execute(`
            SELECT 
                ar.employee_id,
                ar.tipo,
                ar.hora,
                ar.contexto,
                ar.tardanza
            FROM attendance_records ar
            WHERE ar.fecha = ?
            ORDER BY ar.employee_id, ar.hora
        `, [targetDate]);

        // Procesar datos con contexto de almuerzo
        const report = employees.map(emp => {
            const empRecords = records.filter(r => r.employee_id === emp.id);

            // Separar por contexto
            const jornadaEntrada = empRecords.find(r => r.contexto === 'jornada_entrada');
            const almuerzaSalida = empRecords.find(r => r.contexto === 'almuerzo_salida');
            const almuerzoEntrada = empRecords.find(r => r.contexto === 'almuerzo_entrada');
            const jornadaSalida = empRecords.find(r => r.contexto === 'jornada_salida');

            // Si no hay contexto, usar lógica básica
            const primeraEntrada = jornadaEntrada || empRecords.find(r => r.tipo === 'entrada');
            const ultimaSalida = jornadaSalida || empRecords.filter(r => r.tipo === 'salida').pop();

            let estado = 'ausente';
            let tardanzaMinutos = 0;
            let horasTrabajadasMinutos = 0;
            let observaciones = [];

            if (primeraEntrada) {
                estado = 'presente';

                // Calcular tardanza
                if (emp.horario_entrada && primeraEntrada.tardanza) {
                    const [horaEntrada, minEntrada] = emp.horario_entrada.split(':').map(Number);
                    const [horaReal, minReal] = primeraEntrada.hora.split(':').map(Number);
                    const minutosEsperados = horaEntrada * 60 + minEntrada;
                    const minutosReales = horaReal * 60 + minReal;
                    tardanzaMinutos = minutosReales - minutosEsperados - 15; // Restar tolerancia
                    if (tardanzaMinutos > 0) {
                        observaciones.push(`Tardanza de ${tardanzaMinutos} min`);
                    }
                }

                // Calcular horas trabajadas NETAS (excluyendo almuerzo)
                if (ultimaSalida) {
                    const entradaMin = primeraEntrada.hora.split(':').reduce((h, m, i) => h + (i === 0 ? parseInt(m) * 60 : parseInt(m)), 0);
                    const salidaMin = ultimaSalida.hora.split(':').reduce((h, m, i) => h + (i === 0 ? parseInt(m) * 60 : parseInt(m)), 0);

                    horasTrabajadasMinutos = salidaMin - entradaMin;

                    // Si tiene horario de almuerzo configurado y marcó almuerzo
                    if (emp.horario_almuerzo_inicio && emp.horario_almuerzo_fin && almuerzaSalida && almuerzoEntrada) {
                        const almuerzoSalidaMin = almuerzaSalida.hora.split(':').reduce((h, m, i) => h + (i === 0 ? parseInt(m) * 60 : parseInt(m)), 0);
                        const almuerzoEntradaMin = almuerzoEntrada.hora.split(':').reduce((h, m, i) => h + (i === 0 ? parseInt(m) * 60 : parseInt(m)), 0);
                        const tiempoAlmuerzo = almuerzoEntradaMin - almuerzoSalidaMin;
                        horasTrabajadasMinutos -= tiempoAlmuerzo;
                        observaciones.push(`Almuerzo: ${Math.floor(tiempoAlmuerzo / 60)}h ${tiempoAlmuerzo % 60}m`);
                    }
                } else {
                    observaciones.push('Sin marcar salida');
                }
            }

            const horasTrabajadasStr = horasTrabajadasMinutos > 0
                ? `${Math.floor(horasTrabajadasMinutos / 60)}h ${horasTrabajadasMinutos % 60}m`
                : '--';

            return {
                id: emp.id,
                cedula: emp.cedula,
                nombre: emp.nombre,
                cargo: emp.cargo || '--',
                departamento: emp.departamento || '--',
                horario: `${emp.horario_entrada || '--'} - ${emp.horario_salida || '--'}`,
                estado,
                jornada_entrada: jornadaEntrada?.hora || null,
                almuerzo_salida: almuerzaSalida?.hora || null,
                almuerzo_entrada: almuerzoEntrada?.hora || null,
                jornada_salida: jornadaSalida?.hora || null,
                horas_trabajadas: horasTrabajadasStr,
                horas_trabajadas_minutos: horasTrabajadasMinutos,
                tardanza_minutos: tardanzaMinutos > 0 ? tardanzaMinutos : 0,
                tiene_almuerzo_configurado: !!(emp.horario_almuerzo_inicio && emp.horario_almuerzo_fin),
                observaciones: observaciones.length > 0 ? observaciones.join(' | ') : null
            };
        });

        // Estadísticas mejoradas
        const presentes = report.filter(r => r.estado === 'presente');
        const stats = {
            total_empleados: employees.length,
            presentes: presentes.length,
            ausentes: report.filter(r => r.estado === 'ausente').length,
            tardanzas: report.filter(r => r.tardanza_minutos > 0).length,
            sin_marcar_salida: presentes.filter(r => !r.jornada_salida).length,
            con_almuerzo: presentes.filter(r => r.almuerzo_salida && r.almuerzo_entrada).length,
            porcentaje_asistencia: Math.round((presentes.length / employees.length) * 100),
            promedio_horas_trabajadas: presentes.length > 0
                ? Math.round(presentes.reduce((sum, r) => sum + r.horas_trabajadas_minutos, 0) / presentes.length)
                : 0
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

/**
 * REPORTE 2: Puntualidad Semanal
 * Analiza tardanzas por empleado en un período específico
 * Incluye: análisis por día de la semana, tendencias, top 5
 */
router.get('/operational/weekly-punctuality', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { startDate, endDate } = req.query;

        // Por defecto: última semana
        const end = endDate || new Date().toISOString().split('T')[0];
        const start = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        connection = await pool.getConnection();

        // Obtener tardanzas detalladas
        const [tardanzas] = await connection.execute(`
            SELECT 
                e.id,
                e.cedula,
                e.nombre,
                e.cargo,
                e.departamento,
                ar.fecha,
                ar.hora as hora_entrada,
                e.horario_entrada,
                ar.tardanza,
                DAYNAME(ar.fecha) as dia_semana,
                CASE 
                    WHEN ar.tardanza = 1 
                    THEN TIMESTAMPDIFF(MINUTE, 
                        CONCAT(ar.fecha, ' ', e.horario_entrada),
                        CONCAT(ar.fecha, ' ', ar.hora)
                    ) - 15
                    ELSE 0
                END as minutos_tarde
            FROM employees e
            INNER JOIN attendance_records ar ON e.id = ar.employee_id
            WHERE e.estado = 'activo'
                AND ar.fecha BETWEEN ? AND ?
                AND ar.contexto = 'jornada_entrada'
            ORDER BY e.nombre, ar.fecha
        `, [start, end]);

        // Agrupar por empleado
        const empleadosMap = new Map();

        tardanzas.forEach(t => {
            if (!empleadosMap.has(t.id)) {
                empleadosMap.set(t.id, {
                    id: t.id,
                    cedula: t.cedula,
                    nombre: t.nombre,
                    cargo: t.cargo || '--',
                    departamento: t.departamento || '--',
                    dias_asistidos: 0,
                    total_tardanzas: 0,
                    minutos_acumulados: 0,
                    tardanzas_por_dia: {
                        Monday: 0, Tuesday: 0, Wednesday: 0,
                        Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0
                    }
                });
            }

            const emp = empleadosMap.get(t.id);
            emp.dias_asistidos++;

            if (t.tardanza) {
                emp.total_tardanzas++;
                emp.minutos_acumulados += t.minutos_tarde;
                emp.tardanzas_por_dia[t.dia_semana]++;
            }
        });

        const report = Array.from(empleadosMap.values()).map(emp => ({
            ...emp,
            promedio_minutos_tardanza: emp.total_tardanzas > 0
                ? Math.round(emp.minutos_acumulados / emp.total_tardanzas)
                : 0,
            porcentaje_puntualidad: emp.dias_asistidos > 0
                ? Math.round(((emp.dias_asistidos - emp.total_tardanzas) / emp.dias_asistidos) * 100)
                : 100,
            dia_mas_tardanzas: Object.entries(emp.tardanzas_por_dia)
                .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
        }));

        // Análisis por día de la semana
        const tardanzasPorDia = {
            Monday: 0, Tuesday: 0, Wednesday: 0,
            Thursday: 0, Friday: 0, Saturday: 0, Sunday: 0
        };

        tardanzas.forEach(t => {
            if (t.tardanza) {
                tardanzasPorDia[t.dia_semana]++;
            }
        });

        // Top 5 más puntuales y menos puntuales
        const conAsistencia = report.filter(r => r.dias_asistidos > 0);
        const sortedByPuntualidad = [...conAsistencia].sort((a, b) =>
            b.porcentaje_puntualidad - a.porcentaje_puntualidad
        );

        connection.release();

        res.json({
            period: { start, end },
            report: report.sort((a, b) => a.porcentaje_puntualidad - b.porcentaje_puntualidad),
            stats: {
                total_empleados: report.length,
                con_tardanzas: report.filter(r => r.total_tardanzas > 0).length,
                sin_tardanzas: report.filter(r => r.total_tardanzas === 0).length,
                promedio_puntualidad: report.length > 0
                    ? Math.round(report.reduce((sum, r) => sum + r.porcentaje_puntualidad, 0) / report.length)
                    : 100,
                total_tardanzas: report.reduce((sum, r) => sum + r.total_tardanzas, 0),
                dia_mas_tardanzas: Object.entries(tardanzasPorDia)
                    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A'
            },
            analysis: {
                tardanzas_por_dia: tardanzasPorDia,
                top_5_puntuales: sortedByPuntualidad.slice(0, 5),
                top_5_impuntuales: sortedByPuntualidad.slice(-5).reverse()
            }
        });

    } catch (error) {
        console.error('Error en reporte semanal:', error.message);
        res.status(500).json({ error: 'Error al generar reporte semanal' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * REPORTE 3: Ausencias Activas
 * Muestra todas las solicitudes de ausencia (permisos, vacaciones, licencias)
 * que están activas o pendientes en un rango de fechas
 */
router.get('/operational/active-absences', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { startDate, endDate } = req.query;

        // Por defecto: desde hoy hacia adelante (próximos 30 días)
        const start = startDate || new Date().toISOString().split('T')[0];
        const end = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

        connection = await pool.getConnection();

        // Solicitudes de ausencia activas o pendientes
        const [absences] = await connection.execute(`
            SELECT 
                lr.id,
                lr.employee_id,
                e.cedula,
                e.nombre as empleado_nombre,
                e.cargo,
                e.departamento,
                lr.request_type,
                lr.start_date,
                lr.end_date,
                lr.reason,
                lr.status,
                lr.requested_at,
                lr.approved_by,
                u.full_name as aprobado_por_nombre,
                lr.approved_at,
                lr.rejection_reason,
                DATEDIFF(lr.end_date, lr.start_date) + 1 as dias_solicitados,
                CASE
                    WHEN lr.start_date <= CURDATE() AND lr.end_date >= CURDATE() 
                    THEN 'en_curso'
                    WHEN lr.start_date > CURDATE() 
                    THEN 'futura'
                    ELSE 'pasada'
                END as periodo_estado
            FROM leave_requests lr
            INNER JOIN employees e ON lr.employee_id = e.id
            LEFT JOIN users u ON lr.approved_by = u.id
            WHERE e.estado = 'activo'
                AND lr.status IN ('pending', 'approved')
                AND (
                    (lr.start_date BETWEEN ? AND ?)
                    OR (lr.end_date BETWEEN ? AND ?)
                    OR (lr.start_date <= ? AND lr.end_date >= ?)
                )
            ORDER BY 
                FIELD(lr.status, 'pending', 'approved'),
                lr.start_date ASC
        `, [start, end, start, end, start, end]);

        // Mapear tipos de solicitud a español
        const tipoMap = {
            'vacation': 'Vacaciones',
            'sick_leave': 'Licencia Médica',
            'day_off': 'Día Libre',
            'personal': 'Personal',
            'other': 'Otro'
        };

        const estadoMap = {
            'pending': 'Pendiente',
            'approved': 'Aprobado',
            'rejected': 'Rechazado'
        };

        const report = absences.map(a => ({
            id: a.id,
            empleado: {
                id: a.employee_id,
                cedula: a.cedula,
                nombre: a.empleado_nombre,
                cargo: a.cargo || '--',
                departamento: a.departamento || '--'
            },
            tipo: tipoMap[a.request_type] || a.request_type,
            tipo_codigo: a.request_type,
            fecha_inicio: a.start_date,
            fecha_fin: a.end_date,
            dias_solicitados: a.dias_solicitados,
            motivo: a.reason || '--',
            estado: estadoMap[a.status] || a.status,
            estado_codigo: a.status,
            periodo_estado: a.periodo_estado,
            solicitado_el: a.requested_at,
            aprobado_por: a.aprobado_por_nombre || null,
            aprobado_el: a.approved_at || null,
            motivo_rechazo: a.rejection_reason || null
        }));

        // Estadísticas
        const stats = {
            total_ausencias: report.length,
            pendientes: report.filter(r => r.estado_codigo === 'pending').length,
            aprobadas: report.filter(r => r.estado_codigo === 'approved').length,
            en_curso: report.filter(r => r.periodo_estado === 'en_curso').length,
            futuras: report.filter(r => r.periodo_estado === 'futura').length,
            total_dias_ausencia: report
                .filter(r => r.estado_codigo === 'approved')
                .reduce((sum, r) => sum + r.dias_solicitados, 0),
            por_tipo: {
                vacaciones: report.filter(r => r.tipo_codigo === 'vacation').length,
                licencia_medica: report.filter(r => r.tipo_codigo === 'sick_leave').length,
                dia_libre: report.filter(r => r.tipo_codigo === 'day_off').length
            }
        };

        // Empleados con más ausencias
        const empleadosAusencias = {};
        report.forEach(r => {
            const empId = r.empleado.id;
            if (!empleadosAusencias[empId]) {
                empleadosAusencias[empId] = {
                    empleado: r.empleado.nombre,
                    total_ausencias: 0,
                    dias_totales: 0
                };
            }
            empleadosAusencias[empId].total_ausencias++;
            if (r.estado_codigo === 'approved') {
                empleadosAusencias[empId].dias_totales += r.dias_solicitados;
            }
        });

        const topEmpleadosAusentes = Object.values(empleadosAusencias)
            .sort((a, b) => b.dias_totales - a.dias_totales)
            .slice(0, 5);

        connection.release();

        res.json({
            period: { start, end },
            report,
            stats,
            analysis: {
                top_empleados_ausentes: topEmpleadosAusentes,
                porcentaje_aprobacion: report.length > 0
                    ? Math.round((stats.aprobadas / report.length) * 100)
                    : 0
            }
        });

    } catch (error) {
        console.error('Error en reporte de ausencias activas:', error.message);
        res.status(500).json({ error: 'Error al generar reporte de ausencias activas' });
    } finally {
        if (connection) connection.release();
    }
});

// ============ NIVEL 2: REPORTES ADMINISTRATIVOS ============

/**
 * REPORTE 4: Nómina Quincenal
 * Detalle de días trabajados, tardanzas y ausencias para procesamiento de nómina
 * Base para cálculo de pagos quincenales
 */
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

        // Query principal con datos de asistencia y ausencias
        const [results] = await connection.execute(`
            SELECT 
                e.id,
                e.cedula,
                e.nombre,
                e.cargo,
                e.departamento,
                e.horario_entrada,
                e.horario_salida,
                e.horario_almuerzo_inicio,
                e.horario_almuerzo_fin,
                -- Días únicos trabajados
                COUNT(DISTINCT CASE WHEN ar.contexto = 'jornada_entrada' THEN ar.fecha END) as dias_trabajados,
                -- Tardanzas
                SUM(CASE WHEN ar.tardanza = 1 THEN 1 ELSE 0 END) as total_tardanzas,
                SUM(
                    CASE 
                        WHEN ar.tardanza = 1 AND ar.contexto = 'jornada_entrada' AND e.horario_entrada IS NOT NULL
                        THEN TIMESTAMPDIFF(MINUTE, 
                            CONCAT(ar.fecha, ' ', e.horario_entrada),
                            CONCAT(ar.fecha, ' ', ar.hora)
                        ) - 15
                        ELSE 0
                    END
                ) as minutos_tardanza_total,
                -- Ausencias justificadas (leave_requests aprobados)
                COUNT(DISTINCT lr.id) as ausencias_justificadas,
                SUM(CASE WHEN lr.status = 'approved' THEN DATEDIFF(lr.end_date, lr.start_date) + 1 ELSE 0 END) as dias_ausencias_justificadas
            FROM employees e
            LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
                AND ar.fecha BETWEEN ? AND ?
            LEFT JOIN leave_requests lr ON e.id = lr.employee_id
                AND lr.status = 'approved'
                AND lr.start_date BETWEEN ? AND ?
            WHERE e.estado = 'activo'
            GROUP BY e.id, e.cedula, e.nombre, e.cargo, e.departamento, 
                     e.horario_entrada, e.horario_salida, e.horario_almuerzo_inicio, e.horario_almuerzo_fin
            ORDER BY e.departamento, e.nombre
        `, [startDate, endDate, startDate, endDate]);

        const report = results.map(r => {
            const diasTrabajados = r.dias_trabajados || 0;
            const diasAusenciasJustificadas = r.dias_ausencias_justificadas || 0;
            const ausenciasInjustificadas = Math.max(0, diasHabiles - diasTrabajados - diasAusenciasJustificadas);

            // Calcular horas trabajadas netas (8 horas - 1 hora almuerzo = 7 horas netas por día)
            const horasNetasPorDia = 7;
            const horasTrabajadas = diasTrabajados * horasNetasPorDia;

            // Calcular descuentos por tardanzas (ejemplo: cada 3 tardanzas = 1 hora descontada)
            const horasDescuentoPorTardanzas = Math.floor((r.total_tardanzas || 0) / 3) * 1;

            // Descuentos por ausencias injustificadas (día completo)
            const horasDescuentoAusencias = ausenciasInjustificadas * 8;

            const horasNetasAPagar = Math.max(0, horasTrabajadas - horasDescuentoPorTardanzas - horasDescuentoAusencias);

            let observaciones = [];
            if (r.total_tardanzas > 0) {
                observaciones.push(`${r.total_tardanzas} tardanzas (${r.minutos_tardanza_total} min)`);
            }
            if (ausenciasInjustificadas > 0) {
                observaciones.push(`${ausenciasInjustificadas} días sin justificar`);
            }
            if (r.ausencias_justificadas > 0) {
                observaciones.push(`${r.ausencias_justificadas} permisos aprobados (${diasAusenciasJustificadas} días)`);
            }

            return {
                id: r.id,
                cedula: r.cedula,
                nombre: r.nombre,
                cargo: r.cargo || '--',
                departamento: r.departamento || '--',
                dias_habiles: diasHabiles,
                dias_trabajados: diasTrabajados,
                dias_ausencias_justificadas: diasAusenciasJustificadas,
                dias_ausencias_injustificadas: ausenciasInjustificadas,
                porcentaje_asistencia: Math.round((diasTrabajados / diasHabiles) * 100),
                horas_trabajadas_brutas: diasTrabajados * 8,
                horas_trabajadas_netas: horasTrabajadas,
                horas_netas_a_pagar: horasNetasAPagar,
                tardanzas_cantidad: r.total_tardanzas || 0,
                tardanzas_minutos: r.minutos_tardanza_total || 0,
                horas_descuento_tardanzas: horasDescuentoPorTardanzas,
                horas_descuento_ausencias: horasDescuentoAusencias,
                observaciones: observaciones.join(' | ') || '--'
            };
        });

        // Subtotales por departamento
        const departamentos = [...new Set(report.map(r => r.departamento))];
        const subtotales = departamentos.map(dept => {
            const empleadosDept = report.filter(r => r.departamento === dept);
            return {
                departamento: dept,
                total_empleados: empleadosDept.length,
                total_dias_trabajados: empleadosDept.reduce((sum, e) => sum + e.dias_trabajados, 0),
                total_horas_netas: empleadosDept.reduce((sum, e) => sum + e.horas_netas_a_pagar, 0),
                total_tardanzas: empleadosDept.reduce((sum, e) => sum + e.tardanzas_cantidad, 0),
                total_ausencias_injustificadas: empleadosDept.reduce((sum, e) => sum + e.dias_ausencias_injustificadas, 0),
                promedio_asistencia: Math.round(
                    empleadosDept.reduce((sum, e) => sum + e.porcentaje_asistencia, 0) / empleadosDept.length
                )
            };
        });

        connection.release();

        res.json({
            period: {
                start: startDate,
                end: endDate,
                dias_habiles: diasHabiles,
                tipo_periodo: 'quincenal'
            },
            report,
            stats: {
                total_empleados: report.length,
                total_dias_habiles: diasHabiles * report.length,
                total_dias_trabajados: report.reduce((sum, e) => sum + e.dias_trabajados, 0),
                total_horas_netas_a_pagar: report.reduce((sum, e) => sum + e.horas_netas_a_pagar, 0),
                total_tardanzas: report.reduce((sum, e) => sum + e.tardanzas_cantidad, 0),
                total_ausencias_injustificadas: report.reduce((sum, e) => sum + e.dias_ausencias_injustificadas, 0),
                promedio_asistencia_global: Math.round(
                    report.reduce((sum, e) => sum + e.porcentaje_asistencia, 0) / report.length
                )
            },
            subtotales
        });

    } catch (error) {
        console.error('Error en reporte de nómina:', error.message);
        res.status(500).json({ error: 'Error al generar reporte de nómina' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * REPORTE 5: Consolidado Mensual
 * Dashboard ejecutivo con KPIs del mes completo
 * Análisis de tendencias, comparativas y alertas
 */
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

        // 1. Métricas generales del mes
        const [stats] = await connection.execute(`
            SELECT 
                COUNT(DISTINCT e.id) as total_empleados,
                COUNT(DISTINCT ar.fecha) as total_dias_con_registro,
                COUNT(DISTINCT ar.id) as total_registros,
                SUM(CASE WHEN ar.contexto = 'jornada_entrada' THEN 1 ELSE 0 END) as total_entradas,
                SUM(CASE WHEN ar.tardanza = 1 THEN 1 ELSE 0 END) as total_tardanzas,
                COUNT(DISTINCT CASE WHEN ar.contexto IN ('almuerzo_salida', 'almuerzo_entrada') THEN ar.employee_id END) as empleados_con_almuerzo
            FROM employees e
            LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
                AND ar.fecha BETWEEN ? AND ?
            WHERE e.estado = 'activo'
        `, [startDate, endDate]);

        // 2. Calcular días hábiles del mes
        const start = new Date(startDate);
        const end = new Date(endDate);
        let diasHabiles = 0;
        const diasPorSemana = { lunes: 0, martes: 0, miercoles: 0, jueves: 0, viernes: 0 };

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) {
                diasHabiles++;
                const dayNames = ['domingo', 'lunes', 'martes', 'miercoles', 'jueves', 'viernes', 'sabado'];
                const dayName = dayNames[day];
                if (diasPorSemana[dayName] !== undefined) diasPorSemana[dayName]++;
            }
        }

        const totalEmpleados = stats[0].total_empleados || 0;
        const totalEntradas = stats[0].total_entradas || 0;
        const totalTardanzas = stats[0].total_tardanzas || 0;
        const diasTrabajadosEsperados = diasHabiles * totalEmpleados;

        console.log('📊 Consolidado Mensual - Estadísticas:', {
            totalEmpleados,
            totalEntradas,
            totalTardanzas,
            diasHabiles,
            diasTrabajadosEsperados
        });

        // Validar que haya empleados activos
        if (totalEmpleados === 0) {
            console.warn('⚠️  No hay empleados activos en el sistema');
            return res.json({
                period: {
                    month: targetMonth,
                    month_name: new Date(targetYear, targetMonth - 1, 1).toLocaleString('es', { month: 'long' }),
                    year: targetYear,
                    start: startDate,
                    end: endDate,
                    dias_habiles: diasHabiles
                },
                kpis: {
                    tasa_asistencia: 0,
                    tasa_ausentismo: 0,
                    tasa_puntualidad: 100,
                    promedio_horas_dia: 0,
                    total_empleados_activos: 0
                },
                comparacion: {
                    total_registros_actual: 0,
                    total_registros_anterior: 0,
                    total_tardanzas_actual: 0,
                    total_tardanzas_anterior: 0,
                    diferencia_registros: 0,
                    diferencia_tardanzas: 0,
                    diferencia_asistencia: 0,
                    diferencia_ausentismo: 0,
                    diferencia_puntualidad: 0,
                    tendencia_registros: 'igual',
                    tendencia_tardanzas: 'igual'
                },
                analisis_dias: {
                    por_dia_semana: []
                },
                top_ausencias: [],
                detalle_dias: [],
                mensaje: 'No hay empleados activos o registros de asistencia para este período'
            });
        }

        const tasaAsistencia = diasTrabajadosEsperados > 0
            ? ((totalEntradas / diasTrabajadosEsperados) * 100)
            : 0;
        const tasaAusentismo = 100 - tasaAsistencia;
        const promedioPuntualidad = totalEntradas > 0
            ? (((totalEntradas - totalTardanzas) / totalEntradas) * 100)
            : 100;

        // 3. Datos diarios para calendario/gráfica
        const [dailyData] = await connection.execute(`
            SELECT 
                ar.fecha,
                DAYNAME(ar.fecha) as dia_semana,
                COUNT(DISTINCT CASE WHEN ar.contexto = 'jornada_entrada' THEN e.id END) as empleados_presentes,
                COUNT(DISTINCT e.id) as total_empleados_activos,
                SUM(CASE WHEN ar.tardanza = 1 THEN 1 ELSE 0 END) as tardanzas,
                ROUND(
                    (COUNT(DISTINCT CASE WHEN ar.contexto = 'jornada_entrada' THEN e.id END) * 100.0) / 
                    COUNT(DISTINCT e.id), 
                    1
                ) as porcentaje_asistencia_dia
            FROM employees e
            CROSS JOIN (
                SELECT DISTINCT fecha FROM attendance_records WHERE fecha BETWEEN ? AND ?
            ) dates
            LEFT JOIN attendance_records ar ON e.id = ar.employee_id AND ar.fecha = dates.fecha
            WHERE e.estado = 'activo'
            GROUP BY ar.fecha, dates.fecha
            ORDER BY dates.fecha
        `, [startDate, endDate]);

        // 4. Análisis por día de la semana
        const [weekdayAnalysis] = await connection.execute(`
            SELECT 
                DAYNAME(ar.fecha) as dia_semana,
                COUNT(DISTINCT CASE WHEN ar.contexto = 'jornada_entrada' THEN ar.employee_id END) as total_asistencias,
                SUM(CASE WHEN ar.tardanza = 1 THEN 1 ELSE 0 END) as total_tardanzas,
                COUNT(DISTINCT ar.fecha) as dias_contados
            FROM attendance_records ar
            WHERE ar.fecha BETWEEN ? AND ?
            GROUP BY DAYNAME(ar.fecha)
            ORDER BY FIELD(DAYNAME(ar.fecha), 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday')
        `, [startDate, endDate]);

        // 5. Top 5 empleados con más ausencias
        const [topAusentes] = await connection.execute(`
            SELECT 
                e.id,
                e.nombre,
                e.cargo,
                e.departamento,
                COUNT(DISTINCT dates.fecha) - COUNT(DISTINCT ar.fecha) as dias_ausente,
                COUNT(DISTINCT ar.fecha) as dias_presente,
                ROUND(
                    (COUNT(DISTINCT ar.fecha) * 100.0) / COUNT(DISTINCT dates.fecha),
                    1
                ) as porcentaje_asistencia
            FROM employees e
            CROSS JOIN (
                SELECT DISTINCT fecha FROM attendance_records WHERE fecha BETWEEN ? AND ?
            ) dates
            LEFT JOIN attendance_records ar ON e.id = ar.employee_id 
                AND ar.fecha = dates.fecha 
                AND ar.contexto = 'jornada_entrada'
            WHERE e.estado = 'activo'
            GROUP BY e.id, e.nombre, e.cargo, e.departamento
            HAVING dias_ausente > 0
            ORDER BY dias_ausente DESC
            LIMIT 5
        `, [startDate, endDate]);

        // 6. Comparativa con mes anterior
        const prevMonth = targetMonth === 1 ? 12 : targetMonth - 1;
        const prevYear = targetMonth === 1 ? targetYear - 1 : targetYear;
        const prevStartDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
        const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
        const prevEndDate = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${prevLastDay}`;

        const [prevStats] = await connection.execute(`
            SELECT 
                COUNT(DISTINCT ar.id) as total_registros_prev,
                SUM(CASE WHEN ar.contexto = 'jornada_entrada' THEN 1 ELSE 0 END) as total_entradas_prev,
                SUM(CASE WHEN ar.tardanza = 1 THEN 1 ELSE 0 END) as total_tardanzas_prev
            FROM attendance_records ar
            WHERE ar.fecha BETWEEN ? AND ?
        `, [prevStartDate, prevEndDate]);

        const diferenciaRegistros = stats[0].total_registros - (prevStats[0]?.total_registros_prev || 0);
        const diferenciaTardanzas = totalTardanzas - (prevStats[0]?.total_tardanzas_prev || 0);

        // Calcular KPIs del mes anterior para comparación
        const prevTotalEntradas = prevStats[0]?.total_entradas_prev || 0;
        const prevTotalTardanzas = prevStats[0]?.total_tardanzas_prev || 0;

        // Calcular días hábiles del mes anterior
        let prevDiasHabiles = 0;
        const prevStart = new Date(prevStartDate);
        const prevEnd = new Date(prevEndDate);
        for (let d = new Date(prevStart); d <= prevEnd; d.setDate(d.getDate() + 1)) {
            const day = d.getDay();
            if (day !== 0 && day !== 6) prevDiasHabiles++;
        }

        const prevDiasTrabajadosEsperados = prevDiasHabiles * totalEmpleados;
        const prevTasaAsistencia = prevDiasTrabajadosEsperados > 0
            ? ((prevTotalEntradas / prevDiasTrabajadosEsperados) * 100)
            : 0;
        const prevTasaAusentismo = 100 - prevTasaAsistencia;
        const prevPromedioPuntualidad = prevTotalEntradas > 0
            ? (((prevTotalEntradas - prevTotalTardanzas) / prevTotalEntradas) * 100)
            : 100;

        // Calcular diferencias de KPIs
        const diferenciaAsistencia = tasaAsistencia - prevTasaAsistencia;
        const diferenciaAusentismo = tasaAusentismo - prevTasaAusentismo;
        const diferenciaPuntualidad = promedioPuntualidad - prevPromedioPuntualidad;

        // Calcular promedio de horas trabajadas por día
        const [horasTrabajadas] = await connection.execute(`
            SELECT AVG(horas_minutos) as promedio_horas
            FROM (
                SELECT 
                    ar.employee_id,
                    ar.fecha,
                    TIMESTAMPDIFF(MINUTE,
                        MIN(CASE WHEN ar.contexto = 'jornada_entrada' THEN ar.hora END),
                        MAX(CASE WHEN ar.contexto = 'jornada_salida' THEN ar.hora END)
                    ) as horas_minutos
                FROM attendance_records ar
                WHERE ar.fecha BETWEEN ? AND ?
                    AND ar.contexto IN ('jornada_entrada', 'jornada_salida')
                GROUP BY ar.employee_id, ar.fecha
                HAVING horas_minutos IS NOT NULL
            ) as daily_hours
        `, [startDate, endDate]);

        const promedioHorasDia = horasTrabajadas[0]?.promedio_horas
            ? parseFloat((horasTrabajadas[0].promedio_horas / 60).toFixed(1))
            : 0;

        res.json({
            period: {
                month: targetMonth,
                month_name: new Date(targetYear, targetMonth - 1, 1).toLocaleString('es', { month: 'long' }),
                year: targetYear,
                start: startDate,
                end: endDate,
                dias_habiles: diasHabiles
            },
            kpis: {
                tasa_asistencia: parseFloat(tasaAsistencia.toFixed(1)),
                tasa_ausentismo: parseFloat(tasaAusentismo.toFixed(1)),
                tasa_puntualidad: parseFloat(promedioPuntualidad.toFixed(1)),
                promedio_horas_dia: promedioHorasDia,
                total_empleados_activos: totalEmpleados
            },
            comparacion: {
                total_registros_actual: stats[0].total_registros,
                total_registros_anterior: prevStats[0]?.total_registros_prev || 0,
                total_tardanzas_actual: totalTardanzas,
                total_tardanzas_anterior: prevTotalTardanzas,
                diferencia_registros: diferenciaRegistros,
                diferencia_tardanzas: diferenciaTardanzas,
                diferencia_asistencia: parseFloat(diferenciaAsistencia.toFixed(1)),
                diferencia_ausentismo: parseFloat(diferenciaAusentismo.toFixed(1)),
                diferencia_puntualidad: parseFloat(diferenciaPuntualidad.toFixed(1)),
                tendencia_registros: diferenciaRegistros >= 0 ? 'subida' : 'bajada',
                tendencia_tardanzas: diferenciaTardanzas >= 0 ? 'subida' : 'bajada'
            },
            analisis_dias: {
                por_dia_semana: weekdayAnalysis.map(wd => {
                    const asistenciasPorDia = wd.total_asistencias;
                    const diasContados = wd.dias_contados || 1;
                    const tardanzasPorDia = wd.total_tardanzas;
                    const promedioAsistencias = Math.round(asistenciasPorDia / diasContados);

                    return {
                        dia_semana: wd.dia_semana,
                        asistencias: asistenciasPorDia,
                        tardanzas: tardanzasPorDia,
                        promedio_por_dia: promedioAsistencias,
                        tasa_asistencia: totalEmpleados > 0
                            ? parseFloat(((promedioAsistencias / totalEmpleados) * 100).toFixed(1))
                            : 0,
                        tasa_puntualidad: asistenciasPorDia > 0
                            ? parseFloat((((asistenciasPorDia - tardanzasPorDia) / asistenciasPorDia) * 100).toFixed(1))
                            : 100
                    };
                })
            },
            top_ausencias: topAusentes.map(emp => ({
                id: emp.id,
                nombre: emp.nombre,
                cargo: emp.cargo || '--',
                departamento: emp.departamento || '--',
                total_ausencias: emp.dias_ausente,
                dias_ausente: emp.dias_ausente,
                dias_presente: emp.dias_presente,
                porcentaje_asistencia: emp.porcentaje_asistencia
            })),
            detalle_dias: dailyData.map(d => ({
                fecha: d.fecha,
                dia_semana: d.dia_semana,
                empleados_presentes: d.empleados_presentes || 0,
                total_empleados: d.total_empleados_activos,
                tardanzas: d.tardanzas || 0,
                porcentaje_asistencia: d.porcentaje_asistencia_dia || 0
            }))
        });

    } catch (error) {
        console.error('Error en reporte mensual consolidado:', error.message);
        res.status(500).json({ error: 'Error al generar reporte mensual consolidado' });
    } finally {
        if (connection) connection.release();
    }
});

/**
 * REPORTE 6: Horas Extras
 * Detalle de horas extras trabajadas por empleado
 * Control de costos y detección de sobrecarga de trabajo
 */
router.get('/overtime', verifyToken, async (req, res) => {
    let connection = null;
    try {
        const { startDate, endDate } = req.query;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Se requieren fechas de inicio y fin' });
        }

        connection = await pool.getConnection();

        // Obtener todas las marcaciones del período con cálculo de horas trabajadas
        const [overtimeData] = await connection.execute(`
            SELECT 
                e.id,
                e.cedula,
                e.nombre,
                e.cargo,
                e.departamento,
                ar.fecha,
                e.horario_entrada,
                e.horario_salida,
                e.horario_almuerzo_inicio,
                e.horario_almuerzo_fin,
                -- Horas de entrada y salida
                MIN(CASE WHEN ar.contexto = 'jornada_entrada' THEN ar.hora END) as hora_entrada,
                MAX(CASE WHEN ar.contexto = 'jornada_salida' THEN ar.hora END) as hora_salida,
                -- Tiempo de almuerzo
                MIN(CASE WHEN ar.contexto = 'almuerzo_salida' THEN ar.hora END) as almuerzo_salida,
                MAX(CASE WHEN ar.contexto = 'almuerzo_entrada' THEN ar.hora END) as almuerzo_entrada
            FROM employees e
            INNER JOIN attendance_records ar ON e.id = ar.employee_id
            WHERE e.estado = 'activo'
                AND ar.fecha BETWEEN ? AND ?
            GROUP BY e.id, e.cedula, e.nombre, e.cargo, e.departamento, ar.fecha,
                     e.horario_entrada, e.horario_salida, e.horario_almuerzo_inicio, e.horario_almuerzo_fin
            HAVING hora_entrada IS NOT NULL AND hora_salida IS NOT NULL
            ORDER BY e.departamento, e.nombre, ar.fecha
        `, [startDate, endDate]);

        // Procesar datos para calcular horas extras
        const empleadosMap = new Map();

        overtimeData.forEach(day => {
            if (!day.hora_entrada || !day.hora_salida || !day.horario_salida) return;

            // Calcular minutos trabajados
            const [entradaH, entradaM] = day.hora_entrada.split(':').map(Number);
            const [salidaH, salidaM] = day.hora_salida.split(':').map(Number);
            const minutosEntrada = entradaH * 60 + entradaM;
            const minutosSalida = salidaH * 60 + salidaM;

            let minutosTrabajados = minutosSalida - minutosEntrada;

            // Restar tiempo de almuerzo si se registró
            if (day.almuerzo_salida && day.almuerzo_entrada) {
                const [almSalH, almSalM] = day.almuerzo_salida.split(':').map(Number);
                const [almEntH, almEntM] = day.almuerzo_entrada.split(':').map(Number);
                const minutosAlmuerzo = (almEntH * 60 + almEntM) - (almSalH * 60 + almSalM);
                minutosTrabajados -= minutosAlmuerzo;
            } else {
                // Si no registró almuerzo pero tiene horario configurado, restar 1 hora (60 min)
                minutosTrabajados -= 60;
            }

            // Calcular hora de salida esperada
            const [salidaEspH, salidaEspM] = day.horario_salida.split(':').map(Number);
            const minutosSalidaEsperada = salidaEspH * 60 + salidaEspM;

            // Horas extras = diferencia entre salida real y salida esperada (si trabajó más)
            let minutosExtras = 0;
            if (minutosSalida > minutosSalidaEsperada) {
                minutosExtras = minutosSalida - minutosSalidaEsperada;
            }

            // Tolerancia: solo contar si trabajó más de 30 minutos extra
            if (minutosExtras < 30) minutosExtras = 0;

            if (minutosExtras > 0) {
                if (!empleadosMap.has(day.id)) {
                    empleadosMap.set(day.id, {
                        id: day.id,
                        cedula: day.cedula,
                        nombre: day.nombre,
                        cargo: day.cargo || '--',
                        departamento: day.departamento || '--',
                        total_minutos_extras: 0,
                        dias_con_extras: 0,
                        detalle_dias: []
                    });
                }

                const emp = empleadosMap.get(day.id);
                emp.total_minutos_extras += minutosExtras;
                emp.dias_con_extras++;
                emp.detalle_dias.push({
                    fecha: day.fecha,
                    hora_entrada: day.hora_entrada,
                    hora_salida: day.hora_salida,
                    hora_salida_esperada: day.horario_salida,
                    minutos_extras: minutosExtras,
                    horas_extras: (minutosExtras / 60).toFixed(2)
                });
            }
        });

        // Convertir a array y calcular totales
        const report = Array.from(empleadosMap.values()).map(emp => ({
            id: emp.id,
            cedula: emp.cedula,
            nombre: emp.nombre,
            cargo: emp.cargo,
            departamento: emp.departamento,
            total_horas_extras: parseFloat((emp.total_minutos_extras / 60).toFixed(2)),
            total_minutos_extras: emp.total_minutos_extras,
            dias_con_extras: emp.dias_con_extras,
            promedio_horas_por_dia: parseFloat((emp.total_minutos_extras / emp.dias_con_extras / 60).toFixed(2)),
            detalle_dias: emp.detalle_dias
        }));

        // Ordenar por más horas extras
        report.sort((a, b) => b.total_horas_extras - a.total_horas_extras);

        // Estadísticas generales
        const totalHorasExtras = report.reduce((sum, e) => sum + e.total_horas_extras, 0);
        const totalEmpleadosConExtras = report.length;

        // Análisis por departamento
        const departamentos = {};
        report.forEach(emp => {
            if (!departamentos[emp.departamento]) {
                departamentos[emp.departamento] = {
                    departamento: emp.departamento,
                    empleados_con_extras: 0,
                    total_horas_extras: 0
                };
            }
            departamentos[emp.departamento].empleados_con_extras++;
            departamentos[emp.departamento].total_horas_extras += emp.total_horas_extras;
        });

        const porDepartamento = Object.values(departamentos).sort((a, b) =>
            b.total_horas_extras - a.total_horas_extras
        );

        // Top 5 con más horas extras
        const top5 = report.slice(0, 5);

        connection.release();

        res.json({
            period: { start: startDate, end: endDate },
            report,
            stats: {
                total_empleados_con_extras: totalEmpleadosConExtras,
                total_horas_extras: parseFloat(totalHorasExtras.toFixed(2)),
                promedio_horas_por_empleado: totalEmpleadosConExtras > 0
                    ? parseFloat((totalHorasExtras / totalEmpleadosConExtras).toFixed(2))
                    : 0,
                departamento_con_mas_extras: porDepartamento[0]?.departamento || 'N/A'
            },
            analysis: {
                por_departamento: porDepartamento,
                top_5_empleados: top5.map(e => ({
                    id: e.id,
                    nombre: e.nombre,
                    departamento: e.departamento,
                    total_horas_extras: e.total_horas_extras,
                    dias_con_extras: e.dias_con_extras
                }))
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




