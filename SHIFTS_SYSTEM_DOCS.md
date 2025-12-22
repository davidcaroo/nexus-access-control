# Sistema de Gestión de Turnos/Horarios - Nexus

## 📋 Resumen

El sistema de turnos permite gestionar horarios laborales diferenciados por día de la semana para distintos grupos de empleados. Resuelve la necesidad de empresas con horarios variables (ej: lunes-viernes 8-5, sábados 8-12).

---

## 🗄️ Estructura de Base de Datos

### Tabla `shifts` (Catálogo de Turnos)
```sql
id                VARCHAR(36) PK
nombre            VARCHAR(100) UNIQUE    -- "Turno A - Jornada Completa"
descripcion       TEXT                   -- Descripción breve
is_active         BOOLEAN                -- Activo/Inactivo
created_at        DATETIME
updated_at        DATETIME
```

### Tabla `shift_details` (Horarios por Día)
```sql
id                      VARCHAR(36) PK
shift_id                VARCHAR(36) FK → shifts
day_of_week             ENUM('monday',...,'sunday')
hora_entrada            TIME
hora_salida             TIME
hora_almuerzo_inicio    TIME (nullable)
hora_almuerzo_fin       TIME (nullable)
es_dia_laboral          BOOLEAN
created_at              DATETIME
updated_at              DATETIME

UNIQUE KEY (shift_id, day_of_week)
```

### Modificación a `employees`
```sql
shift_id    VARCHAR(36) FK → shifts (nullable)
```

**Lógica:**
- Si `shift_id` es NULL → usar horarios individuales (horario_entrada, horario_salida)
- Si `shift_id` existe → usar horarios del turno según día de la semana

---

## 🎯 Turnos Predefinidos

### Turno A - Jornada Completa (`shift-001`)
- **Lunes a Viernes:** 8:00 AM - 5:00 PM (almuerzo 12:00-1:00 PM)
- **Sábado:** 8:00 AM - 12:00 PM (sin almuerzo)
- **Domingo:** No laboral

### Turno B - Jornada Extendida (`shift-002`)
- **Lunes a Viernes:** 7:00 AM - 6:00 PM (almuerzo 12:00-1:00 PM)
- **Sábado:** 8:00 AM - 4:00 PM (almuerzo 12:00-1:00 PM)
- **Domingo:** No laboral

### Turno Gerencial (`shift-003`)
- **Lunes a Viernes:** 7:00 AM - 5:00 PM (almuerzo 12:00-1:00 PM)
- **Sábado y Domingo:** No laboral

---

## 🔌 API Backend

### Endpoints

#### `GET /api/shifts`
Lista todos los turnos con detalles y conteo de empleados asignados.

**Query params:**
- `active_only=true`: Filtrar solo turnos activos

**Response:**
```json
[
  {
    "id": "shift-001",
    "nombre": "Turno A - Jornada Completa",
    "descripcion": "Lunes a Viernes 8:00-17:00...",
    "is_active": true,
    "empleados_count": 15,
    "details": [
      {
        "day_of_week": "monday",
        "hora_entrada": "08:00:00",
        "hora_salida": "17:00:00",
        "hora_almuerzo_inicio": "12:00:00",
        "hora_almuerzo_fin": "13:00:00",
        "es_dia_laboral": true
      },
      // ... resto de días
    ]
  }
]
```

#### `GET /api/shifts/:id`
Obtener un turno específico con sus detalles.

#### `POST /api/shifts`
Crear un nuevo turno.

**Body:**
```json
{
  "nombre": "Turno Nocturno",
  "descripcion": "Turno de noche 10PM-6AM",
  "details": [
    {
      "day_of_week": "monday",
      "hora_entrada": "22:00:00",
      "hora_salida": "06:00:00",
      "hora_almuerzo_inicio": null,
      "hora_almuerzo_fin": null,
      "es_dia_laboral": true
    },
    // ... 7 días requeridos
  ]
}
```

**Validaciones:**
- Debe incluir los 7 días de la semana
- Días laborales deben tener hora_entrada y hora_salida
- hora_salida > hora_entrada
- Almuerzo debe estar dentro del horario laboral

#### `PUT /api/shifts/:id`
Actualizar un turno existente.

**Restricciones:**
- No se puede desactivar un turno con empleados activos asignados

#### `DELETE /api/shifts/:id`
Eliminar un turno.

**Restricciones:**
- No se puede eliminar un turno con empleados asignados (activos o inactivos)

#### `GET /api/shifts/:id/employees`
Listar empleados asignados a un turno.

---

## 🎨 Frontend

### Página: `/admin/shifts` (ShiftManagement.tsx)

**Componentes:**
1. **Lista de Turnos**: Cards con resumen de horarios y empleados asignados
2. **Formulario Modal**: Crear/Editar turnos con calendario semanal
3. **Calendario Semanal**: Matriz de 7 días con inputs de horario

**Funcionalidades:**
- ✅ Crear nuevo turno con horarios diferenciados por día
- ✅ Editar turnos existentes
- ✅ Desactivar/Eliminar turnos
- ✅ Copiar horarios de un día a todos los días
- ✅ Marcar días como no laborales
- ✅ Ver conteo de empleados asignados
- ✅ Validación de horarios lógicos

### Integración en EmployeeManager

**Formulario de Empleado:**
- Selector de turno (dropdown con turnos activos)
- Si tiene turno → ocultar campos de horario manual
- Si NO tiene turno → mostrar horarios individuales (comportamiento actual)

**Lógica:**
```typescript
if (employee.shift_id) {
  // Usar horarios del turno según día de la semana
  const dayOfWeek = new Date().toLocaleDateString('en', { weekday: 'lowercase' });
  const shiftDetail = shift.details.find(d => d.day_of_week === dayOfWeek);
  return shiftDetail.hora_entrada; // ej: "08:00:00"
} else {
  // Usar horarios individuales
  return employee.horario_entrada;
}
```

---

## 🚀 Migración

### Para Base de Datos Existente

Ejecutar el archivo: `migration-add-shifts.sql`

```bash
mysql -u root -p nexus_access_control < migration-add-shifts.sql
```

**Acciones:**
1. Crea tablas `shifts` y `shift_details`
2. Agrega columna `shift_id` a `employees`
3. Inserta 3 turnos predefinidos con sus detalles (21 registros)
4. Empleados existentes mantienen `shift_id = NULL` (usan horarios individuales)

**Seguridad:**
- Usa `IF NOT EXISTS` para evitar conflictos
- Usa `ON DUPLICATE KEY UPDATE` para inserciones idempotentes
- Agrega índices para performance
- Foreign keys con `ON DELETE SET NULL` para empleados

---

## 📊 Flujo de Uso

### Caso de Uso 1: Configurar Turnos Iniciales

1. Admin va a **Configuración > Horarios** (`/admin/shifts`)
2. Clic en "Crear Turno"
3. Configurar nombre: "Turno A"
4. Para cada día:
   - ✅ Marcar "Día Laboral"
   - Configurar entrada/salida/almuerzo
   - O desmarcarlo para días no laborales
5. Guardar → Turno disponible para asignación

### Caso de Uso 2: Asignar Turno a Empleado

1. Admin va a **Personal** (`/admin/employees`)
2. Crear/Editar empleado
3. En "Turno/Horario" → Seleccionar "Turno A"
4. Los campos de horario manual se ocultan
5. Guardar → Empleado usa horarios del Turno A según día

### Caso de Uso 3: Empleado con Horario Personalizado

1. Crear empleado
2. Dejar "Sin turno asignado"
3. Configurar horarios manuales (8:00-5:00)
4. Guardar → Empleado usa horarios fijos independientes

---

## 🔍 Consultas Útiles

### Ver empleados por turno
```sql
SELECT 
  s.nombre as turno,
  e.nombre as empleado,
  e.departamento
FROM employees e
JOIN shifts s ON e.shift_id = s.id
WHERE s.is_active = TRUE
ORDER BY s.nombre, e.nombre;
```

### Horario de un empleado para hoy
```sql
SELECT 
  e.nombre,
  DAYNAME(CURDATE()) as dia,
  COALESCE(sd.hora_entrada, e.horario_entrada) as entrada,
  COALESCE(sd.hora_salida, e.horario_salida) as salida
FROM employees e
LEFT JOIN shifts s ON e.shift_id = s.id
LEFT JOIN shift_details sd ON s.id = sd.shift_id 
  AND sd.day_of_week = LOWER(DAYNAME(CURDATE()))
WHERE e.id = 'employee-id-aqui';
```

### Turnos más usados
```sql
SELECT 
  s.nombre,
  s.descripcion,
  COUNT(e.id) as total_empleados
FROM shifts s
LEFT JOIN employees e ON s.id = e.shift_id
GROUP BY s.id
ORDER BY total_empleados DESC;
```

---

## ⚙️ Consideraciones Técnicas

### Performance
- Índices en `shift_id`, `day_of_week`
- Query optimizada: 1 JOIN para obtener horario del día actual
- Cache frontend: Lista de turnos se carga una sola vez

### Seguridad
- Middleware `checkShiftManagementPermission`: Solo admin/hr_manager/superadmin
- Validaciones backend: horarios lógicos, días completos
- No permite eliminar turnos con empleados asignados

### Escalabilidad
- Fácil agregar nuevos turnos sin cambios de código
- Soporta horarios nocturnos (22:00-06:00) aunque requiere lógica adicional para cruce de día
- Extensible a horarios rotativos (ej: semanas alternas)

---

## 🎯 Próximas Mejoras (Opcional)

1. **Turnos Rotativos**: Turno A semana 1, Turno B semana 2, etc.
2. **Excepciones por Fecha**: Horarios especiales para días festivos
3. **Historial de Cambios**: Auditoría cuando cambia el turno de un empleado
4. **Notificaciones**: Alertar empleados cuando cambia su turno
5. **Dashboard**: Gráfica de distribución de empleados por turno
6. **Exportar**: Plantilla Excel de turnos y horarios

---

## 📞 Soporte

**Archivos Relacionados:**
- `db-init.sql`: Schema completo con turnos
- `migration-add-shifts.sql`: Migración para DB existente
- `backend/routes/shifts.js`: Endpoints API
- `src/pages/ShiftManagement.tsx`: UI de gestión
- `pages/EmployeeManager.tsx`: Selector de turno

**Verificación Rápida:**
```sql
-- ¿Funcionan los turnos?
SELECT * FROM shifts;
SELECT * FROM shift_details WHERE shift_id = 'shift-001';

-- ¿Empleados con turnos?
SELECT nombre, shift_id FROM employees WHERE shift_id IS NOT NULL;
```
