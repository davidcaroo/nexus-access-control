# Sistema de Control de Almuerzo y Contexto de Asistencia

## 📋 Resumen

Este sistema permite gestionar horarios de almuerzo personalizados por empleado y detectar automáticamente el contexto de cada registro de asistencia (entrada de jornada, salida a almuerzo, regreso de almuerzo, salida de jornada).

---

## 🎯 Casos de Uso

### Caso 1: Empleado SIN horario de almuerzo configurado
**Ejemplo:** Juan trabaja de 8am a 5pm sin break

**Configuración del empleado:**
- Horario de entrada: 08:00
- Horario de salida: 17:00
- Horario de almuerzo inicio: `NULL`
- Horario de almuerzo fin: `NULL`

**Comportamiento:**
- **Primera marca del día** (cualquier hora) → `jornada_entrada`
- **Cualquier salida** → `jornada_salida`
- Si `allow_multiple_attendance = false`: solo permite 1 entrada + 1 salida
- Si `allow_multiple_attendance = true`: permite múltiples ciclos

---

### Caso 2: Empleado CON horario de almuerzo configurado
**Ejemplo:** María trabaja de 7am a 6pm, almuerza de 12pm a 1pm

**Configuración del empleado:**
- Horario de entrada: 07:00
- Horario de salida: 18:00
- Horario de almuerzo inicio: 12:00
- Horario de almuerzo fin: 13:00

**Marcaciones:**

| Hora  | Acción | Contexto Detectado | Descripción |
|-------|--------|--------------------|-------------|
| 7:05am | Marca entrada | `jornada_entrada` | Primera entrada del día |
| 12:10pm | Marca salida | `almuerzo_salida` | Salida cercana a horario de almuerzo (±30 min) |
| 1:00pm | Marca entrada | `almuerzo_entrada` | Regreso cercano a fin de almuerzo (±30 min) |
| 6:15pm | Marca salida | `jornada_salida` | Salida definitiva (fin de jornada) |

---

### Caso 3: Diferentes horarios de almuerzo por empleado
**Empleado A:** Almuerzo de 12pm a 1pm
**Empleado B:** Almuerzo de 12pm a 2pm
**Empleado C:** Sin horario de almuerzo (horario corrido)

✅ **El sistema maneja automáticamente cada caso**

---

## 🔧 Configuración

### 1. Base de Datos

#### Tabla `employees` - Nuevos campos:
```sql
horario_almuerzo_inicio TIME NULL DEFAULT NULL  -- Inicio del almuerzo (opcional)
horario_almuerzo_fin TIME NULL DEFAULT NULL     -- Fin del almuerzo (opcional)
```

#### Tabla `attendance_records` - Nuevo campo:
```sql
contexto ENUM(
    'jornada_entrada',    -- Primera entrada del día
    'almuerzo_salida',    -- Salida temporal para almuerzo
    'almuerzo_entrada',   -- Regreso de almuerzo
    'jornada_salida',     -- Salida definitiva
    'otro'                -- Casos especiales
) NULL DEFAULT NULL
```

### 2. Configuración del Sistema

**Setting existente:** `allow_multiple_attendance`
- `false`: Solo 1 entrada + 1 salida por día
- `true`: Permite múltiples ciclos (necesario para horarios con almuerzo)

**Recomendación:** Habilitar `allow_multiple_attendance = true` si hay empleados con horarios de almuerzo

---

## 🤖 Lógica de Detección Automática

### Algoritmo de detección de contexto:

```javascript
function detectarContexto(employee, recordType, hora, recordCount) {
    // Si no tiene horario de almuerzo → lógica simple
    if (!employee.horario_almuerzo_inicio) {
        if (recordType === 'entrada') {
            return recordCount === 0 ? 'jornada_entrada' : 'almuerzo_entrada';
        } else {
            return 'jornada_salida';
        }
    }

    // Si tiene horario de almuerzo → detección inteligente
    const toleranciaMinutos = 30; // ±30 minutos

    if (recordType === 'entrada') {
        if (recordCount === 0) return 'jornada_entrada';
        if (hora cercana a horario_almuerzo_fin) return 'almuerzo_entrada';
        return 'almuerzo_entrada';
    } else {
        if (hora cercana a horario_almuerzo_inicio) return 'almuerzo_salida';
        return 'jornada_salida';
    }
}
```

### Tolerancia:
- **±30 minutos** alrededor del horario de almuerzo configurado
- Ejemplo: Si almuerzo es 12:00-13:00
  - Salida entre 11:30-12:30 → `almuerzo_salida`
  - Entrada entre 12:30-13:30 → `almuerzo_entrada`

---

## 📊 Cálculos de Horas

### Horas Trabajadas (Netas):
```
Tiempo total = (almuerzo_salida - jornada_entrada) + (jornada_salida - almuerzo_entrada)
```

**Ejemplo:**
- Entrada: 7:00am
- Salida almuerzo: 12:00pm (5 horas trabajadas)
- Entrada almuerzo: 1:00pm
- Salida jornada: 6:00pm (5 horas trabajadas)
- **Total: 10 horas trabajadas** (se excluye 1 hora de almuerzo)

### Horas Extras:
```
Horas extras = Horas trabajadas - Jornada esperada
Jornada esperada = horario_salida - horario_entrada - tiempo_almuerzo
```

### Tardanza:
- Solo aplica a `jornada_entrada` (primera entrada del día)
- Se calcula con tolerancia desde `settings.attendance_tolerance_minutes` (default: 15 min)
- **NO** aplica a `almuerzo_entrada` (regreso de almuerzo)

---

## 🖥️ Interfaz de Usuario

### Formulario de Empleado
Nuevos campos en "Editar Empleado":
- **Inicio Almuerzo (Opcional):** Campo de tiempo (HH:MM)
- **Fin Almuerzo (Opcional):** Campo de tiempo (HH:MM)

**Nota:** Si estos campos quedan vacíos, el empleado se considera con horario corrido (sin break)

### Mensajes al marcar asistencia:
- `"Entrada de jornada registrada"`
- `"Salida a almuerzo registrada"`
- `"Regreso de almuerzo registrado"`
- `"Salida de jornada registrada"`

---

## 📱 Ejemplos Prácticos

### Ejemplo 1: Jornada Completa con Almuerzo
```
Empleado: Carlos
Horario: 8am-5pm, Almuerzo: 12pm-1pm

08:00 → Entrada jornada
12:05 → Salida almuerzo  (dentro de tolerancia)
13:10 → Entrada almuerzo (dentro de tolerancia)
17:15 → Salida jornada

Horas trabajadas: 8h 10min (9h 15min - 1h 5min de almuerzo)
Horas extras: 10min
Tardanza: No
```

### Ejemplo 2: Empleado sin Break
```
Empleado: Ana
Horario: 9am-6pm (sin almuerzo configurado)

09:05 → Entrada jornada
18:00 → Salida jornada

Horas trabajadas: 8h 55min
Horas extras: 0
Tardanza: No (dentro de tolerancia de 15 min)
```

### Ejemplo 3: Múltiples Salidas/Entradas
```
Empleado: Luis (con almuerzo configurado)

08:00 → Entrada jornada
10:30 → Salida almuerzo  (detección automática)
11:00 → Entrada almuerzo
12:00 → Salida almuerzo  (dentro de horario configurado)
13:00 → Entrada almuerzo
17:00 → Salida jornada

Contextos detectados automáticamente según hora y horario configurado
```

---

## ⚙️ Migración de Datos Existentes

Para actualizar una base de datos existente, ejecutar:
```bash
mysql -u root nexus_access_control < migration-lunch-context.sql
```

Este script:
1. ✅ Agrega campos de almuerzo a `employees`
2. ✅ Agrega campo `contexto` a `attendance_records`
3. ✅ Actualiza registros existentes con contexto básico
4. ✅ Crea índices para mejorar rendimiento

---

## 🚀 Despliegue

### Pasos para activar el sistema:

1. **Ejecutar migración SQL**
   ```bash
   mysql -u root nexus_access_control < migration-lunch-context.sql
   ```

2. **Reiniciar servidor backend**
   ```bash
   cd backend
   node server.js
   ```

3. **Habilitar múltiples entradas/salidas** (si hay empleados con almuerzo)
   - Ir a Settings → Permitir múltiples entradas/salidas → Activar

4. **Configurar horarios de almuerzo por empleado**
   - Ir a Empleados → Editar → Llenar campos opcionales de almuerzo

---

## ❓ Preguntas Frecuentes

**Q: ¿Qué pasa si un empleado almuerza a diferente hora cada día?**
A: El sistema usa tolerancia de ±30 min. Si varía mucho, dejar los campos de almuerzo vacíos (horario corrido).

**Q: ¿Puedo cambiar la tolerancia de 30 minutos?**
A: Sí, editar el valor en `backend/routes/attendance.js` línea 18: `const toleranciaMinutos = 30;`

**Q: ¿Los empleados antiguos necesitan configuración?**
A: No, si no tienen horario de almuerzo configurado (NULL), funcionan como antes.

**Q: ¿Afecta los cálculos de reportes actuales?**
A: Los reportes necesitarán actualización para usar el nuevo campo `contexto` y calcular horas netas correctamente.

---

## 📝 Próximos Pasos

- [ ] Actualizar reportes para mostrar contexto y calcular horas netas
- [ ] Agregar dashboard para visualizar patrones de almuerzo
- [ ] Permitir configurar tolerancia desde settings
- [ ] Agregar validación: horario_almuerzo_fin > horario_almuerzo_inicio

---

**Documentación actualizada:** 19 de Diciembre, 2025
**Versión del sistema:** 2.0
