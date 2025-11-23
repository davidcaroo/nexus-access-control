# 🎯 DISEÑO DEL MÓDULO DE HORAS EXTRA

## 📋 Resumen Ejecutivo
El módulo de Horas Extra es el **módulo crítico** del sistema NEXUS. Su propósito es mostrar a cada empleado que haya trabajado más allá de su horario programado, con desglose detallado por día.

---

## 1️⃣ VISTA PRINCIPAL (Listado de Empleados con Horas Extra)

### 📊 Información a Mostrar en la Tabla Principal

#### Por Empleado (Fila):
```
┌─────────────────────────────────────────────────────────────────────┐
│ [FOTO] NOMBRE        │ CARGO              │ DPTO        │ HORAS EXTRA │
├─────────────────────────────────────────────────────────────────────┤
│ [🖼️]  Juan Pérez      │ Desarrollador      │ Tecnología  │ 15h 30m    │
│ [🖼️]  María García    │ Gerente de Ventas  │ Ventas      │ 8h 45m     │
│ [🖼️]  Carlos López    │ Analista           │ IT          │ 22h 15m    │
└─────────────────────────────────────────────────────────────────────┘
```

#### Columnas:
1. **Foto + Nombre**: Imagen del empleado (circular, w-10 h-10) + nombre en bold
2. **Cargo**: Su posición en la empresa (ej: Desarrollador, Gerente)
3. **Departamento**: Su área (ej: Tecnología, Ventas, RRHH)
4. **Horas Extra Acumuladas**: Total en formato "Xh Ym" en color azul (text-blue-600)
5. **Botón de Acción**: Icono de ojo (Eye) para ver detalles

#### Filtros (Arriba):
- **Desde**: Date input (Primer día del mes actual por defecto)
- **Hasta**: Date input (Hoy por defecto)
- **Botón Cargar**: Recalcular horas extra para el rango

#### Mostrar si no hay datos:
- Icono de reloj (Clock)
- Mensaje: "No se encontraron horas extra para el período seleccionado"

---

## 2️⃣ MODAL DE DETALLES (Al hacer clic en "Ver Detalles")

### 📌 Encabezado del Modal
```
┌─────────────────────────────────────────────────┐
│ Detalle de Horas Extra: Juan Pérez         [X] │
└─────────────────────────────────────────────────┘
```

### 👤 Información del Empleado
```
┌─────────────────────────────────────────────────┐
│ [FOTO]  Juan Pérez                              │
│         Desarrollador - Tecnología              │
│         Horario de Salida Programado: 18:00     │
└─────────────────────────────────────────────────┘
```

**Elementos:**
- Foto circular (w-16 h-16)
- Nombre en XL bold
- Cargo - Departamento (gris)
- Horario de salida programado (gris, más pequeño)

### 📅 Tabla de Detalles Diarios
```
┌────────────┬──────────┬────────────┬─────────────┬──────────────────┐
│ FECHA      │ ENTRADA  │ SALIDA REA │ SALIDA PROG │ HORAS EXTRA/DÍA  │
├────────────┼──────────┼────────────┼─────────────┼──────────────────┤
│ 2025-11-20 │ 08:15    │ 20:45      │ 18:00       │ 2h 45m           │
│ 2025-11-21 │ 08:00    │ 19:30      │ 18:00       │ 1h 30m           │
│ 2025-11-22 │ 08:30    │ 21:00      │ 18:00       │ 2h 30m           │
└────────────┴──────────┴────────────┴─────────────┴──────────────────┘
```

**Columnas:**
1. **Fecha**: Formato ISO (2025-11-20)
2. **Hora Entrada**: Primera entrada del día (08:15)
3. **Hora Salida Real**: Última salida del día (20:45)
4. **Hora Salida Programada**: Según contrato (18:00)
5. **Horas Extra del Día**: Diferencia en "Xh Ym" (azul bold)

---

## 3️⃣ LÓGICA DE CÁLCULO DE HORAS EXTRA

### ⚙️ Algoritmo:

```javascript
Para cada empleado en el rango de fechas:
  totalOvertimeMinutes = 0
  
  Para cada día en el rango:
    - Obtener PRIMERA entrada del día
    - Obtener ÚLTIMA salida del día
    
    Si existe salida actual Y salida programada:
      diffMinutes = (horaLlegadaReal - horaProgramada) * 60
      
      Si diffMinutes > 0:
        totalOvertimeMinutes += diffMinutes
        Guardar en dailyDetails {
          fecha,
          horaEntrada,
          horaSalidaReal,
          horaProgramada,
          dailyOvertimeMinutes
        }
  
  Si totalOvertimeMinutes > 0:
    Agregar empleado a resultados (ordenado por mayor a menor)
```

### 📊 Ejemplo:
- **Horario Programado**: 18:00
- **Salida Real**: 20:45
- **Cálculo**: 20:45 - 18:00 = 2 horas 45 minutos = 165 minutos
- **Resultado**: 2h 45m

---

## 4️⃣ FUENTES DE DATOS

### 📌 Tabla: `employees`
```sql
SELECT 
  id,
  nombre,
  foto,
  cargo,
  departamento,
  horario_entrada,
  horario_salida  -- ← CRÍTICO para cálculo
FROM employees
WHERE estado = 'activo'
```

### 📌 Tabla: `attendance_records`
```sql
SELECT 
  id,
  employee_id,
  fecha,           -- YYYY-MM-DD
  hora,            -- HH:mm:ss
  tipo,            -- 'entrada' | 'salida'
  metodo,          -- 'qr' | 'manual' | 'facial'
  tardanza
FROM attendance_records
WHERE fecha >= ? AND fecha <= ?
ORDER BY employee_id, fecha, hora
```

### ⚡ Operación:
1. Obtener todos los `employees` activos
2. Obtener todos los `attendance_records` en el rango de fechas
3. Agrupar registros por empleado y fecha
4. Calcular horas extra usando la lógica anterior
5. Retornar lista ordenada por mayor horas extra

---

## 5️⃣ ENDPOINT BACKEND (A CREAR)

### 🔌 GET `/api/overtime/summary`

**Query Parameters:**
- `startDate`: ISO date (YYYY-MM-DD)
- `endDate`: ISO date (YYYY-MM-DD)

**Response:**
```json
[
  {
    "employeeId": "emp_123",
    "nombre": "Juan Pérez",
    "foto": "https://...",
    "cargo": "Desarrollador",
    "departamento": "Tecnología",
    "totalOvertimeMinutes": 990,
    "totalOvertimeFormatted": "16h 30m",
    "dailyDetails": [
      {
        "fecha": "2025-11-20",
        "horaEntrada": "08:15",
        "horaSalidaReal": "20:45",
        "horaProgramada": "18:00",
        "overtimeMinutes": 165
      }
    ]
  }
]
```

---

## 6️⃣ CASOS ESPECIALES

### ⚠️ Cómo manejar:

**Caso 1: Empleado sin salida registrada**
- ❌ No contar como hora extra (aún está trabajando o falta registro)

**Caso 2: Salida antes de lo programado**
- ✅ No contar (solo contamos si sale DESPUÉS)
- Mostrar como "-" en el detalle

**Caso 3: Múltiples entradas/salidas en un día**
- ✅ Primera entrada + Última salida (para flex schedules)

**Caso 4: Día sin registro**
- ✅ No aparecer en el detalle (ni entrada ni salida)

**Caso 5: Horario_salida NULL en employee**
- ⚠️ No calcular horas extra para ese empleado (no sabemos cuándo debe salir)

---

## 7️⃣ VALIDACIONES EN FRONTEND

1. ✅ Rango de fechas válido (inicio ≤ fin)
2. ✅ Al menos un empleado con horas extra en el rango
3. ✅ Formato de hora válido (HH:mm:ss)
4. ✅ No mostrar empleados sin horas extra
5. ✅ Redondear minutos correctamente

---

## 8️⃣ ESTADO ACTUAL Y TODO

### ✅ IMPLEMENTADO:
- [x] Vista principal con tabla de empleados
- [x] Modal de detalles diarios
- [x] Cálculo de horas extra (lógica en frontend)
- [x] Filtros por rango de fechas
- [x] Ordenamiento por mayor a menor
- [x] Formato "Xh Ym" para minutos

### ⏳ PENDIENTE:
- [ ] Verificar que la lógica de cálculo sea correcta con datos reales
- [ ] Considerar crear endpoint backend `/api/overtime/summary`
- [ ] Agregar paginación si hay muchos empleados
- [ ] Exportar a CSV/PDF con detalles
- [ ] Histórico de horas extra (acumuladas a lo largo del mes)
- [ ] Alertas si un empleado supera limite de horas extra/mes

---

## 9️⃣ VISUAL MOCKUP

```
┌─────────────────────────────────────────────────────────────────────┐
│ NEXUS - Reporte de Horas Extra                                      │
│ Consulte las horas extra acumuladas por el personal en un rango...  │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ Desde: [01/11/2025] 📅  Hasta: [23/11/2025] 📅  [Cargar]           │
│                                                                       │
├─────────────────────────────────────────────────────────────────────┤
│                                                                       │
│ EMPLEADO           │ CARGO              │ DPTO       │ H.EXTRA│[👁️]  │
│─────────────────────────────────────────────────────────────────── │
│ [🖼️] Juan Pérez     │ Desarrollador      │ Tecnología │ 15h 30m│[👁️]  │
│ [🖼️] Carlos López   │ Analista           │ IT         │ 12h 15m│[👁️]  │
│ [🖼️] María García   │ Gerente            │ Ventas     │  8h 45m│[👁️]  │
│                                                                       │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 🔟 PREGUNTAS FINALES PARA CONFIRMAR

1. ¿Se cuenta como hora extra solo si sale DESPUÉS de lo programado? ✅ SÍ
2. ¿Primera entrada + Última salida del día? ✅ SÍ
3. ¿El formato debe ser "Xh Ym"? ✅ SÍ
4. ¿Mostrar solo empleados con horas extra? ✅ SÍ
5. ¿Ordenar de mayor a menor? ✅ SÍ
6. ¿Modal con detalles por día? ✅ SÍ
7. ¿Filtro por rango de fechas? ✅ SÍ

---

## 📝 PRÓXIMOS PASOS

1. ✅ **Validar estructura actual del componente**
2. ⏳ **Probar con datos reales de BD**
3. ⏳ **Ajustar cálculos si es necesario**
4. ⏳ **Mejorar UI si es necesario**
5. ⏳ **Agregar funcionalidades extras (PDF, CSV, etc.)**
