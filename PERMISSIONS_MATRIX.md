# 🔐 MATRIZ DE PERMISOS - SISTEMA NEXUS (ACTUAL)

## 📊 Resumen de Permisos Configurables

El sistema NEXUS tiene **6 módulos principales** con permisos específicos según la BD real.

**Total de permisos: 19**

---

## 📋 MÓDULOS Y PERMISOS DISPONIBLES (ORGANIZADOS POR COLUMNAS)

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ PERMISOS DISPONIBLES POR MÓDULO - PARA UI DE ROLES                           │
├──────────────────────────────────────────────────────────────────────────────┤
│                                                                                │
│ ┌─ EMPLEADOS ─────────────┐  ┌─ ASISTENCIA ────────────┐  ┌─ USUARIOS ────┐ │
│ │ ☐ Crear empleados       │  │ ☐ Registrar asistencia  │  │ ☐ Ver usuarios│ │
│ │ ☐ Ver empleados         │  │ ☐ Ver asistencia        │  │ ☐ Crear user  │ │
│ │ ☐ Editar empleados      │  │ ☐ Eliminar asistencia   │  │ ☐ Editar user │ │
│ │ ☐ Eliminar empleados    │  │                         │  │ ☐ Eliminar usr│ │
│ └─────────────────────────┘  └─────────────────────────┘  │ ☐ Bloquear usr│ │
│                                                              └────────────────┘
│ ┌─ SOLICITUDES DE AUSENCIA ────────────┐  ┌─ PERMISOS ────────────────────┐ │
│ │ ☐ Crear solicitudes                  │  │ ☐ Gestionar permisos          │ │
│ │ ☐ Ver solicitudes                    │  │ ☐ Gestionar roles             │ │
│ │ ☐ Aprobar solicitudes                │  └────────────────────────────────┘ │
│ │ ☐ Rechazar solicitudes               │                                      │
│ └──────────────────────────────────────┘                                      │
│                                                                                │
└──────────────────────────────────────────────────────────────────────────────┘
```

---

## 📋 LISTADO COMPLETO DE PERMISOS REALES (19 TOTAL)

### 👥 **EMPLEADOS** (4 permisos)
| # | Permiso | Código |
|---|---------|--------|
| 1 | Crear empleados | `employees:create` |
| 2 | Ver empleados | `employees:read` |
| 3 | Editar empleados | `employees:update` |
| 4 | Eliminar empleados | `employees:delete` |

---

### 🚪 **ASISTENCIA / TERMINAL DE ACCESO** (3 permisos)
| # | Permiso | Código |
|---|---------|--------|
| 1 | Registrar asistencia | `attendance:record` |
| 2 | Ver registros de asistencia | `attendance:view` |
| 3 | Eliminar registros de asistencia | `attendance:delete` |

**NOTA:** El método `facial` en la BD es solo un tipo de registro, no un permiso separado.

---

### 🏥 **SOLICITUDES DE AUSENCIA** (4 permisos)
| # | Permiso | Código |
|---|---------|--------|
| 1 | Crear solicitudes | `leave_requests:create` |
| 2 | Ver solicitudes | `leave_requests:view` |
| 3 | Aprobar solicitudes | `leave_requests:approve` |
| 4 | Rechazar solicitudes | `leave_requests:reject` |

---

### 👤 **USUARIOS DEL SISTEMA** (5 permisos)
| # | Permiso | Código |
|---|---------|--------|
| 1 | Ver usuarios | `users:read` |
| 2 | Crear usuarios | `users:create` |
| 3 | Editar usuarios | `users:update` |
| 4 | Eliminar usuarios | `users:delete` |
| 5 | Bloquear usuarios | `users:ban` |

---

### 🔐 **ROLES Y PERMISOS** (2 permisos)
| # | Permiso | Código |
|---|---------|--------|
| 1 | Gestionar roles | `roles:manage` |
| 2 | Gestionar permisos | `permissions:manage` |

---

### 📊 **REPORTES/HORAS EXTRA**
**Status:** ⏳ No tiene permisos específicos aún (se pueden crear si es necesario)

---

## 🎯 DISTRIBUCIÓN ACTUAL

| Módulo | Permisos |
|--------|----------|
| Empleados | 4 |
| Asistencia | 3 |
| Solicitudes de Ausencia | 4 |
| Usuarios | 5 |
| Roles y Permisos | 2 |
| **TOTAL** | **19** |

---

## 🔗 ESTRUCTURA DE PERMISO

Cada permiso sigue el formato: `módulo:acción`

**Ejemplos:**
- `employees:create` → Crear empleado
- `reports:export` → Exportar reporte
- `permissions:manage` → Gestionar permisos
- `dashboard:view` → Ver dashboard

---

## 💡 RECOMENDACIONES

1. **Granularidad**: Los permisos están diseñados con granularidad media. Podemos crear aún más permisos si es necesario.

2. **Flexible**: El sistema permite asignar cualquier combinación de permisos a cada rol.

3. **Escalable**: Nuevos permisos pueden agregarse sin modificar la estructura existente.

4. **Seguridad**: El superadmin tiene acceso total, pero puede limitarse según políticas de empresa.

---

## 📝 PRÓXIMOS PASOS

1. ✅ Implementar todos estos permisos en la BD
2. ✅ Crear interfaz para gestionar permisos
3. ✅ Validar permisos en cada endpoint del backend
4. ✅ Agregar checks de permisos en frontend
5. ✅ Auditar acceso basado en roles y permisos
