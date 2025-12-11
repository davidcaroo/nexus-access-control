import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

interface ExportOptions {
  title: string;
  subtitle?: string;
  data: any;
  filename: string;
}

class ExportService {
  /**
   * Exporta datos a PDF
   */
  exportToPDF(options: ExportOptions) {
    const { title, subtitle, data, filename } = options;
    const doc = new jsPDF();

    // Título del documento
    doc.setFontSize(18);
    doc.setFont('helvetica', 'bold');
    doc.text(title, 14, 22);

    if (subtitle) {
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100);
      doc.text(subtitle, 14, 30);
    }

    let startY = subtitle ? 38 : 30;

    // Si hay estadísticas o métricas, mostrarlas primero
    if (data.estadisticas) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0);
      doc.text('Estadísticas', 14, startY);
      
      const statsArray = Object.entries(data.estadisticas).map(([key, value]) => [
        key.replace(/_/g, ' ').toUpperCase(),
        String(value)
      ]);

      autoTable(doc, {
        startY: startY + 5,
        head: [['Métrica', 'Valor']],
        body: statsArray,
        theme: 'grid',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14, right: 14 }
      });

      startY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Si hay métricas
    if (data.metricas) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Métricas', 14, startY);
      
      const metricsArray = Object.entries(data.metricas).map(([key, value]) => {
        let displayValue = String(value);
        if (typeof value === 'number' && (key.includes('tasa') || key.includes('promedio'))) {
          displayValue = `${value.toFixed(1)}%`;
        }
        return [key.replace(/_/g, ' ').toUpperCase(), displayValue];
      });

      autoTable(doc, {
        startY: startY + 5,
        head: [['Métrica', 'Valor']],
        body: metricsArray,
        theme: 'grid',
        headStyles: { fillColor: [99, 102, 241] },
        margin: { left: 14, right: 14 }
      });

      startY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Si hay KPIs
    if (data.kpis) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('KPIs', 14, startY);
      
      const kpisArray = Object.entries(data.kpis).map(([key, value]) => {
        let displayValue = String(value);
        if (typeof value === 'number' && (key.includes('tasa') || key.includes('promedio') || key.includes('indice'))) {
          displayValue = `${value.toFixed(1)}%`;
        }
        return [key.replace(/_/g, ' ').toUpperCase(), displayValue];
      });

      autoTable(doc, {
        startY: startY + 5,
        head: [['KPI', 'Valor']],
        body: kpisArray,
        theme: 'grid',
        headStyles: { fillColor: [139, 92, 246] },
        margin: { left: 14, right: 14 }
      });

      startY = (doc as any).lastAutoTable.finalY + 10;
    }

    // Si hay un reporte con datos tabulares
    if (data.report && Array.isArray(data.report) && data.report.length > 0) {
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text('Detalle del Reporte', 14, startY);

      const headers = Object.keys(data.report[0]).map(key => 
        key.replace(/_/g, ' ').toUpperCase()
      );
      const rows = data.report.map((row: any) => 
        Object.values(row).map(val => {
          if (typeof val === 'object' && val !== null) {
            return JSON.stringify(val);
          }
          return String(val);
        })
      );

      autoTable(doc, {
        startY: startY + 5,
        head: [headers],
        body: rows,
        theme: 'striped',
        headStyles: { fillColor: [59, 130, 246] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8 }
      });
    }

    // Si hay empleados presentes/ausentes
    if (data.empleados_presentes) {
      if ((doc as any).lastAutoTable?.finalY) {
        startY = (doc as any).lastAutoTable.finalY + 10;
      }
      
      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.text(`Empleados Presentes (${data.empleados_presentes.length})`, 14, startY);

      const presentRows = data.empleados_presentes.map((emp: any) => [
        emp.cedula || '',
        emp.nombre || '',
        emp.cargo || '',
        emp.departamento || '',
        emp.hora_entrada || '',
        emp.minutos_tarde > 0 ? `${emp.minutos_tarde} min` : 'A tiempo'
      ]);

      autoTable(doc, {
        startY: startY + 5,
        head: [['Cédula', 'Nombre', 'Cargo', 'Departamento', 'Entrada', 'Estado']],
        body: presentRows,
        theme: 'grid',
        headStyles: { fillColor: [34, 197, 94] },
        margin: { left: 14, right: 14 },
        styles: { fontSize: 8 }
      });

      if (data.empleados_ausentes && data.empleados_ausentes.length > 0) {
        startY = (doc as any).lastAutoTable.finalY + 10;
        
        doc.setFontSize(12);
        doc.text(`Empleados Ausentes (${data.empleados_ausentes.length})`, 14, startY);

        const absentRows = data.empleados_ausentes.map((emp: any) => [
          emp.cedula || '',
          emp.nombre || '',
          emp.cargo || '',
          emp.departamento || ''
        ]);

        autoTable(doc, {
          startY: startY + 5,
          head: [['Cédula', 'Nombre', 'Cargo', 'Departamento']],
          body: absentRows,
          theme: 'grid',
          headStyles: { fillColor: [239, 68, 68] },
          margin: { left: 14, right: 14 },
          styles: { fontSize: 8 }
        });
      }
    }

    // Footer con fecha de generación
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(
        `Generado el ${new Date().toLocaleString('es')} - Página ${i} de ${pageCount}`,
        14,
        doc.internal.pageSize.height - 10
      );
    }

    doc.save(`${filename}.pdf`);
  }

  /**
   * Exporta datos a Excel
   */
  exportToExcel(options: ExportOptions) {
    const { title, data, filename } = options;
    const wb = XLSX.utils.book_new();

    // Crear hoja con estadísticas si existen
    if (data.estadisticas) {
      const statsData = Object.entries(data.estadisticas).map(([key, value]) => ({
        Métrica: key.replace(/_/g, ' ').toUpperCase(),
        Valor: value
      }));
      const ws = XLSX.utils.json_to_sheet(statsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Estadísticas');
    }

    // Crear hoja con métricas si existen
    if (data.metricas) {
      const metricsData = Object.entries(data.metricas).map(([key, value]) => {
        let displayValue: any = value;
        if (typeof value === 'number' && (key.includes('tasa') || key.includes('promedio'))) {
          displayValue = `${value.toFixed(1)}%`;
        }
        return {
          Métrica: key.replace(/_/g, ' ').toUpperCase(),
          Valor: displayValue
        };
      });
      const ws = XLSX.utils.json_to_sheet(metricsData);
      XLSX.utils.book_append_sheet(wb, ws, 'Métricas');
    }

    // Crear hoja con KPIs si existen
    if (data.kpis) {
      const kpisData = Object.entries(data.kpis).map(([key, value]) => {
        let displayValue: any = value;
        if (typeof value === 'number' && (key.includes('tasa') || key.includes('promedio') || key.includes('indice'))) {
          displayValue = `${value.toFixed(1)}%`;
        }
        return {
          KPI: key.replace(/_/g, ' ').toUpperCase(),
          Valor: displayValue
        };
      });
      const ws = XLSX.utils.json_to_sheet(kpisData);
      XLSX.utils.book_append_sheet(wb, ws, 'KPIs');
    }

    // Crear hoja principal con el reporte
    if (data.report && Array.isArray(data.report) && data.report.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data.report);
      XLSX.utils.book_append_sheet(wb, ws, 'Reporte');
    }

    // Empleados presentes
    if (data.empleados_presentes && Array.isArray(data.empleados_presentes)) {
      const presentData = data.empleados_presentes.map((emp: any) => ({
        Cédula: emp.cedula || '',
        Nombre: emp.nombre || '',
        Cargo: emp.cargo || '',
        Departamento: emp.departamento || '',
        Entrada: emp.hora_entrada || '',
        'Minutos Tarde': emp.minutos_tarde || 0
      }));
      const ws = XLSX.utils.json_to_sheet(presentData);
      XLSX.utils.book_append_sheet(wb, ws, 'Presentes');
    }

    // Empleados ausentes
    if (data.empleados_ausentes && Array.isArray(data.empleados_ausentes)) {
      const absentData = data.empleados_ausentes.map((emp: any) => ({
        Cédula: emp.cedula || '',
        Nombre: emp.nombre || '',
        Cargo: emp.cargo || '',
        Departamento: emp.departamento || ''
      }));
      const ws = XLSX.utils.json_to_sheet(absentData);
      XLSX.utils.book_append_sheet(wb, ws, 'Ausentes');
    }

    // Más puntuales / Menos puntuales
    if (data.mas_puntuales && Array.isArray(data.mas_puntuales)) {
      const ws = XLSX.utils.json_to_sheet(data.mas_puntuales);
      XLSX.utils.book_append_sheet(wb, ws, 'Más Puntuales');
    }

    if (data.menos_puntuales && Array.isArray(data.menos_puntuales)) {
      const ws = XLSX.utils.json_to_sheet(data.menos_puntuales);
      XLSX.utils.book_append_sheet(wb, ws, 'Menos Puntuales');
    }

    // Departamentos
    if (data.departamentos && Array.isArray(data.departamentos)) {
      const ws = XLSX.utils.json_to_sheet(data.departamentos);
      XLSX.utils.book_append_sheet(wb, ws, 'Por Departamento');
    }

    // Incidencias
    if (data.incidencias) {
      if (data.incidencias.tardanzas_recurrentes) {
        const ws = XLSX.utils.json_to_sheet(data.incidencias.tardanzas_recurrentes);
        XLSX.utils.book_append_sheet(wb, ws, 'Tardanzas Recurrentes');
      }
      if (data.incidencias.ausencias_recurrentes) {
        const ws = XLSX.utils.json_to_sheet(data.incidencias.ausencias_recurrentes);
        XLSX.utils.book_append_sheet(wb, ws, 'Ausencias Recurrentes');
      }
    }

    // Generar archivo
    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/octet-stream' });
    saveAs(blob, `${filename}.xlsx`);
  }

  /**
   * Exporta datos a CSV
   */
  exportToCSV(options: ExportOptions) {
    const { data, filename } = options;
    
    let csvContent = '';

    // Si hay un array de datos como reporte principal
    if (data.report && Array.isArray(data.report) && data.report.length > 0) {
      const ws = XLSX.utils.json_to_sheet(data.report);
      csvContent = XLSX.utils.sheet_to_csv(ws);
    } 
    // Si hay empleados presentes
    else if (data.empleados_presentes) {
      const allEmployees = [
        ...data.empleados_presentes.map((emp: any) => ({
          ...emp,
          estado: 'Presente'
        })),
        ...(data.empleados_ausentes || []).map((emp: any) => ({
          ...emp,
          estado: 'Ausente'
        }))
      ];
      const ws = XLSX.utils.json_to_sheet(allEmployees);
      csvContent = XLSX.utils.sheet_to_csv(ws);
    }
    // Fallback: convertir todo el objeto a CSV
    else {
      const ws = XLSX.utils.json_to_sheet([data]);
      csvContent = XLSX.utils.sheet_to_csv(ws);
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, `${filename}.csv`);
  }
}

export const exportService = new ExportService();
