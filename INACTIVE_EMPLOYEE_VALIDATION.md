# 🔒 Sistema de Validación de Empleados Inactivos

## 📋 Resumen

El sistema valida automáticamente el estado de los empleados antes de permitir el registro de asistencia. Los empleados con estado `inactivo` **NO PUEDEN** marcar entrada ni salida, independientemente del método (QR, manual, facial).

---

## ✅ Comportamiento del Sistema

### **Empleado ACTIVO**
- ✅ Puede marcar asistencia por QR
- ✅ Puede marcar asistencia manual
- ✅ Su QR funciona normalmente
- ✅ Aparece en reportes de asistencia

### **Empleado INACTIVO**
- ❌ NO puede marcar asistencia por QR
- ❌ NO puede marcar asistencia manual
- ❌ Su QR es rechazado automáticamente
- ⚠️ NO aparece en reportes de asistencia diaria
- 📧 Mensaje mostrado: **"[Nombre] está inactivo. No puede registrar asistencia. Contacte a RR.HH."**

---

## 🔧 Implementación Técnica

### **Backend - Validación en `/api/attendance/record`**

```javascript
// Verificar que el empleado esté ACTIVO
if (employee.estado !== 'activo') {
    return res.status(403).json({ 
        error: 'Employee inactive', 
        success: false,
        message: `${employee.nombre} está inactivo. No puede registrar asistencia. Contacte a RR.HH.`
    });
}
```

**Código de Estado HTTP:** `403 Forbidden`

**Respuesta JSON:**
```json
{
    "error": "Employee inactive",
    "success": false,
    "message": "Juan Pérez está inactivo. No puede registrar asistencia. Contacte a RR.HH."
}
```

### **Frontend - Manejo del Error**

El error se captura en:
1. **AccessTerminal** → Muestra mensaje en pantalla + toast de error
2. **App.tsx** → El error se propaga desde `apiClient`
3. **apiClient.ts** → Extrae el mensaje de error del backend

---

## 📊 Casos de Uso

### **Caso 1: Empleado despedido**
```
Acción: Cambiar estado a "inactivo" en Empleados
Resultado: 
- QR deja de funcionar inmediatamente
- Intentos de acceso son rechazados
- No aparece en reportes diarios
```

### **Caso 2: Suspensión temporal**
```
Acción: Cambiar estado a "inactivo" temporalmente
Resultado:
- Empleado bloqueado durante el período
- Al reactivar, puede volver a marcar normalmente
- Registros históricos se mantienen intactos
```

### **Caso 3: Licencia prolongada**
```
Acción: Marcar como "inactivo" durante licencia
Resultado:
- No puede marcar asistencia por error
- Evita registros no deseados
- Se reactiva al regresar
```

---

## 🧪 Pruebas

### **Prueba 1: Inactivar empleado**
```sql
-- 1. Verificar estado actual
SELECT nombre, cedula, estado FROM employees WHERE cedula = '30303030';

-- 2. Cambiar a inactivo
UPDATE employees SET estado = 'inactivo' WHERE cedula = '30303030';

-- 3. Intentar marcar asistencia (debe fallar)
```

**Resultado esperado:**
```
❌ Error 403
📝 Mensaje: "Andrés Duarte está inactivo. No puede registrar asistencia. Contacte a RR.HH."
```

### **Prueba 2: Reactivar empleado**
```sql
-- 1. Reactivar
UPDATE employees SET estado = 'activo' WHERE cedula = '30303030';

-- 2. Intentar marcar asistencia (debe funcionar)
```

**Resultado esperado:**
```
✅ Registro exitoso
📝 Mensaje: "Andrés Duarte - Entrada de jornada registrada"
```

---

## 🔍 Verificación en Base de Datos

### **Ver empleados inactivos**
```sql
SELECT 
    cedula,
    nombre,
    cargo,
    estado,
    updated_at as fecha_cambio
FROM employees
WHERE estado = 'inactivo'
ORDER BY updated_at DESC;
```

### **Ver intentos de acceso de empleados inactivos**
```sql
-- Esta consulta no devolverá nada porque el sistema
-- rechaza el registro ANTES de guardarlo en la BD
SELECT 
    e.nombre,
    e.estado,
    ar.*
FROM attendance_records ar
JOIN employees e ON ar.employee_id = e.id
WHERE e.estado = 'inactivo'
ORDER BY ar.fecha DESC, ar.hora DESC;
```

---

## ⚙️ Configuración

### **Cambiar estado de empleado**

**Desde la UI:**
1. Ir a **Empleados**
2. Click en **Editar** (lápiz)
3. Cambiar **Estado** a `Inactivo`
4. **Guardar Cambios**

**Desde SQL:**
```sql
-- Inactivar
UPDATE employees SET estado = 'inactivo' WHERE cedula = '[CEDULA]';

-- Reactivar
UPDATE employees SET estado = 'activo' WHERE cedula = '[CEDULA]';
```

---

## 🎯 Mensajes del Sistema

| Situación | Mensaje |
|-----------|---------|
| Empleado no existe | "Empleado no encontrado en el sistema" |
| Empleado inactivo | "[Nombre] está inactivo. No puede registrar asistencia. Contacte a RR.HH." |
| Empleado activo | "[Nombre] - [Contexto] registrada" |

---

## 🛡️ Seguridad

### **Protección implementada:**
- ✅ Validación en backend (no se puede evadir desde frontend)
- ✅ Código HTTP 403 (Forbidden) apropiado
- ✅ Mensaje descriptivo para el usuario
- ✅ Log en servidor para auditoría
- ✅ Sin filtrado de datos sensibles

### **Auditoría:**
Los intentos de acceso de empleados inactivos se registran en el log del servidor:

```
📝 Actualizando empleado: emp-003
🚫 Intento de acceso rechazado: Empleado inactivo
```

---

## 📝 Notas Importantes

1. **Cambios son inmediatos:** Al cambiar el estado a inactivo, el bloqueo es instantáneo
2. **Sin periodo de gracia:** No hay delay, se bloquea en el siguiente intento
3. **Reversible:** Cambiar a activo restaura acceso inmediatamente
4. **Historial intacto:** Los registros antiguos NO se eliminan
5. **Reportes limpios:** Los inactivos no aparecen en reportes diarios

---

## 🔄 Actualizaciones Futuras (Propuestas)

- [ ] Agregar razón de inactivación (despido, suspensión, licencia)
- [ ] Email automático a RR.HH. cuando empleado inactivo intenta acceder
- [ ] Dashboard de intentos de acceso rechazados
- [ ] Historial de cambios de estado (quién, cuándo, por qué)
- [ ] Programar reactivación automática (para suspensiones temporales)

---

**Documentación actualizada:** 19 de Diciembre, 2025
**Estado:** ✅ Implementado y funcionando
