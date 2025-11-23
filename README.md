<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# NEXUS Access Control - Sistema Integral de Control de Personal

**NEXUS Access Control** es una solución empresarial completa para la gestión integral de personal, control de asistencia y cumplimiento de horarios. Combina tecnologías modernas como escaneo QR, IA (Google Gemini), autenticación segura y análisis de datos en tiempo real.

## 📋 Descripción General

NEXUS es un sistema diseñado para empresas que necesitan:
- **Control de Asistencia**: Registrar entrada/salida mediante QR o manualmente
- **Gestión de Empleados**: Administrar información, cargos y departamentos
- **Control de Permisos**: Sistema de permisos y solicitudes de ausencia (vacaciones, incapacidades, días libres)
- **Gestión de Usuarios**: Crear, editar y administrar usuarios del sistema
- **Control de Roles y Permisos**: Sistema granular de permisos basado en roles
- **Reportes**: Análisis de horas extra, asistencia y productividad
- **IA Integrada**: Análisis automático de documentos de identidad con Google Gemini

## 🏗️ Arquitectura del Proyecto

### Stack Tecnológico

**Frontend:**
- **React 18.2** - Framework UI
- **TypeScript** - Tipado estático
- **Tailwind CSS** - Estilos
- **React Router v7** - Enrutamiento
- **Vite** - Build tool

**Backend & Base de Datos:**
- **Supabase** - PostgreSQL + Autenticación + Edge Functions
- **Supabase Auth UI** - Interfaz de autenticación

**Integraciones & Librerías:**
- **Google Gemini AI** (@google/genai) - Análisis de documentos de identidad
- **html5-qrcode** - Escaneo QR en navegador
- **Recharts** - Visualización de datos
- **React Hot Toast** - Notificaciones
- **Lucide React** - Iconografía
- **html5-qrcode** - Generación y lectura de códigos QR

## 📁 Estructura del Proyecto

```
nexus-access-control/
├── pages/                           # Páginas principales (admin)
│   ├── Login.tsx                    # Autenticación con Supabase Auth UI
│   ├── Dashboard.tsx                # Panel de control con estadísticas
│   ├── AccessTerminal.tsx           # Terminal de acceso (escaneo QR/manual)
│   ├── EmployeeManager.tsx          # Gestión de empleados
│   ├── Reports.tsx                  # Reportes generales
│   └── OvertimeReport.tsx           # Reporte de horas extra
├── src/
│   ├── pages/                       # Páginas avanzadas
│   │   ├── UserManagement.tsx       # Gestión de usuarios del sistema
│   │   ├── RolePermissionManagement.tsx # Gestión de roles y permisos
│   │   ├── LeaveRequestsManagement.tsx  # Administración de solicitudes de ausencia
│   │   ├── Settings.tsx             # Configuración del sistema
│   │   └── PublicLeaveRequest.tsx   # Formulario público para solicitar permisos
│   ├── components/                  # Componentes reutilizables
│   │   ├── QRScanner.tsx            # Lector QR con acceso a cámara
│   │   ├── ProtectedRoute.tsx       # Rutas protegidas por autenticación
│   │   ├── ConfirmationModal.tsx    # Modal de confirmación genérica
│   │   ├── OvertimeDetailModal.tsx  # Detalles de horas extra
│   │   └── ToastProvider.tsx        # Proveedor de notificaciones
│   ├── context/                     # Context API
│   │   ├── PermissionsContext.tsx   # Control de permisos
│   │   └── SidebarContext.tsx       # Estado del sidebar
│   └── integrations/
│       └── supabase/
│           └── client.ts             # Cliente Supabase
├── components/                      # Componentes generales
│   ├── Layout.tsx                   # Layout principal
│   ├── Sidebar.tsx                  # Navegación lateral
│   ├── UIComponents.tsx             # Componentes UI reutilizables
│   └── ManualAttendanceModal.tsx    # Modal para registro manual
├── services/
│   └── geminiService.ts             # Servicio de análisis de IA (Gemini)
├── supabase/functions/              # Edge Functions (backend serverless)
│   ├── manage-attendance/           # Funciones de asistencia
│   ├── manage-users/                # Funciones de usuarios
│   └── manage-roles-permissions/    # Funciones de roles y permisos
├── App.tsx                          # Componente raíz con contexto global
├── types.ts                         # Definiciones de tipos TypeScript
├── vite.config.ts                   # Configuración de Vite
└── package.json                     # Dependencias del proyecto
```

## 🎯 Características Principales

### 1. **Autenticación y Autorización**
- Autenticación basada en email/contraseña con Supabase Auth
- Sistema de roles: `superadmin`, `admin`, `hr_manager`, `department_head`, `employee`
- Control granular de permisos mediante acciones específicas
- Rutas protegidas con verificación de autenticación
- Sesión persistente

### 2. **Control de Asistencia**
- **Escaneo QR**: Registra automáticamente entrada/salida
- **Registro Manual**: Permite ingreso manual de asistencia
- **Terminal de Acceso**: Interfaz dedicada para registros en tiempo real
- **Detección de Tardanza**: Identifica automáticamente si la entrada es tardía
- Registro de método usado: QR, manual o facial

### 3. **Gestión de Empleados**
- CRUD completo de empleados
- Campos: cédula, nombre, cargo, departamento, horarios, estado
- **Integración con Gemini AI**: Análisis automático de cédulas/documentos
- Generación automática de códigos QR por empleado
- Foto de perfil por empleado
- Búsqueda y filtrado

### 4. **Solicitudes de Ausencia**
- Tipos de solicitudes: Vacaciones, Baja por Enfermedad, Día Libre
- Flujo: Solicitud → Pendiente → Aprobación/Rechazo
- Rango de fechas seleccionable
- Sistema de motivos y razones de rechazo
- Acceso público para empleados (sin autenticación requerida)

### 5. **Gestión de Usuarios del Sistema**
- Creación, edición y eliminación de usuarios
- Asignación de roles
- Bloqueo/desbloqueo de usuarios
- Vista de fecha de creación
- Solo superadmins pueden acceder

### 6. **Gestión de Roles y Permisos**
- Crear roles personalizados
- Asignar permisos específicos a roles
- Permisos basados en acciones (ej: `employees:create`, `employees:edit`)
- CRUD de roles y permisos
- Relaciones M:N (muchos-a-muchos) entre roles y permisos

### 7. **Reportes y Análisis**
- **Dashboard**: Estadísticas en tiempo real
  - Total de personal
  - Presentes hoy
  - Ausentes
  - Tardanzas
  - Gráficos de estado actual
- **Reporte de Horas Extra**: Análisis de sobretiempo por empleado
  - Detalle diario de horas extra
  - Filtrado por rango de fechas
  - Modal con detalles completos

### 8. **Integración con Google Gemini AI**
- Análisis automático de documentos de identidad
- Extracción de nombre, cédula y descripción
- Asistencia en creación de empleados

## 🔄 Flujos de Negocio

### Registro de Asistencia
```
Empleado escanea QR o entrada manual
  ↓
Sistema registra entrada/salida
  ↓
Detecta si es tardanza comparando con horario
  ↓
Guarda en attendance_records
  ↓
Dashboard actualiza en tiempo real
```

### Solicitud de Ausencia
```
Empleado crea solicitud (pública)
  ↓
Estado: Pendiente
  ↓
HR/Manager revisa y aprueba/rechaza
  ↓
Se registra la decisión con fecha y motivo
  ↓
Empleado notificado
```

### Gestión de Permisos
```
SuperAdmin crea roles con permisos específicos
  ↓
Admin asigna roles a usuarios
  ↓
Sistema verifica permisos en PermissionsContext
  ↓
UI muestra/oculta botones según permisos
```

## 🗄️ Modelos de Datos Principales

### User (Autenticación)
```typescript
- id: string (UUID)
- email: string
- full_name: string
- role: string (role name)
- avatar_url?: string
```

### Employee
```typescript
- id: string (UUID)
- cedula: string (Cédula única)
- nombre: string
- foto: string
- cargo: string
- departamento: string
- horario_entrada: string (HH:mm)
- horario_salida: string (HH:mm)
- estado: 'activo' | 'inactivo'
- fecha_ingreso: string (ISO Date)
- qr_code_url?: string
```

### AttendanceRecord
```typescript
- id: number
- employee_id: string (FK)
- tipo: 'entrada' | 'salida'
- fecha: string (YYYY-MM-DD)
- hora: string (HH:mm:ss)
- metodo: 'qr' | 'manual' | 'facial'
- tardanza: boolean
```

### LeaveRequest
```typescript
- id: string (UUID)
- employee_id: string (FK)
- request_type: 'vacation' | 'sick_leave' | 'day_off'
- start_date: string (YYYY-MM-DD)
- end_date: string (YYYY-MM-DD)
- reason?: string
- status: 'pending' | 'approved' | 'rejected'
- requested_at: string (ISO Timestamp)
- approved_by?: string (FK User)
- approved_at?: string (ISO Timestamp)
- rejection_reason?: string
```

### Role & Permission
```typescript
Role:
- id: string (UUID)
- name: RoleName ('superadmin' | 'admin' | 'hr_manager' | ...)
- description: string
- created_at: string (ISO Timestamp)
- permissions: string[] (Array de acciones)

Permission:
- id: string (UUID)
- action: string (ej: 'employees:create')
- description: string
- created_at: string (ISO Timestamp)
```

## 🚀 Funciones Edge (Backend Serverless)

### `/manage-attendance`
- **DELETE**: Elimina todos los registros de asistencia (solo superadmin)

### `/manage-users`
- **GET**: Obtiene lista de usuarios (solo superadmin)
- **POST**: Crea nuevo usuario
- **PATCH**: Actualiza usuario (bloqueo/desbloqueo)
- **DELETE**: Elimina usuario

### `/manage-roles-permissions`
- **GET /roles**: Obtiene roles disponibles
- **POST /roles**: Crea nuevo rol
- **PATCH /roles**: Actualiza rol
- **DELETE /roles**: Elimina rol
- **GET /permissions**: Obtiene permisos disponibles
- **POST /permissions**: Crea nuevo permiso
- **DELETE /permissions**: Elimina permiso

## 🔐 Sistema de Seguridad

- **Autenticación**: Supabase Auth (JWT)
- **Autorización**: Verificación de roles y permisos en Edge Functions
- **RLS (Row Level Security)**: Políticas en Supabase
- **Protección de rutas**: ProtectedRoute component
- **Validación de tokens**: En todas las Edge Functions

## ⚙️ Instalación y Configuración

### Requisitos Previos
- Node.js 16+ y npm/pnpm
- Cuenta de Supabase
- API Key de Google Gemini
- Base de datos PostgreSQL (a través de Supabase)

### Pasos de Instalación

1. **Clonar el repositorio:**
   ```bash
   git clone <repo-url>
   cd nexus-access-control
   ```

2. **Instalar dependencias:**
   ```bash
   pnpm install
   # o
   npm install
   ```

3. **Configurar variables de entorno:**
   Crear archivo `.env.local` en la raíz del proyecto:
   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key
   GEMINI_API_KEY=your-gemini-api-key
   ```

4. **Ejecutar en desarrollo:**
   ```bash
   pnpm run dev
   # o
   npm run dev
   ```
   La aplicación estará disponible en `http://localhost:3000`

5. **Construir para producción:**
   ```bash
   pnpm run build
   # o
   npm run build
   ```

6. **Preview de producción:**
   ```bash
   pnpm run preview
   # o
   npm run preview
   ```

## 🌐 Rutas Principales

### Rutas Públicas
- `/login` - Página de autenticación
- `/leave-request` - Formulario de solicitud de ausencia (público)

### Rutas Protegidas (Requieren Autenticación)
- `/admin/dashboard` - Panel de control principal
- `/admin/access-terminal` - Terminal de acceso/escaneo
- `/admin/employees` - Gestión de empleados
- `/admin/reports` - Reportes generales
- `/admin/overtime` - Reporte de horas extra
- `/admin/users` - Gestión de usuarios (superadmin)
- `/admin/roles` - Gestión de roles y permisos (superadmin)
- `/admin/leave-requests` - Gestión de solicitudes (admin/hr)
- `/admin/settings` - Configuración del sistema (admin)

## 🎨 Interfaz de Usuario

- **Responsive Design**: Funciona en desktop, tablet y móvil
- **Temas**: Interfaz profesional con Tailwind CSS
- **Iconografía**: Lucide React para iconos consistentes
- **Notificaciones**: React Hot Toast para feedback del usuario
- **Gráficos**: Recharts para visualización de datos
- **Modales**: Componentes reutilizables para confirmaciones y detalles

## 📊 Estadísticas y Métricas

El Dashboard proporciona en tiempo real:
- Total de personal registrado
- Presentes hoy con porcentaje de asistencia
- Cantidad de ausentes
- Número de tardanzas
- Gráfico de estado actual (En Sitio vs Salieron)
- Información de presencia por hora

## 🔄 Contextos Globales

### AppContext
Gestiona:
- Estado de autenticación
- Lista de empleados
- Registros de asistencia
- Solicitudes de ausencia
- Usuarios del sistema
- Funciones de CRUD para todos los recursos
- Estados de carga

### PermissionsContext
Gestiona:
- Permisos del usuario actual
- Función `can(action)` para validar acciones
- Carga de permisos desde la base de datos

### SidebarContext
Gestiona:
- Estado colapsado/expandido del sidebar
- Responsividad en móvil

## 🧪 Variables de Entorno

```env
# Supabase
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-public-anon-key

# Google Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# Vite
VITE_APP_NAME=NEXUS Access Control
```

## 📦 Dependencias Principales

```json
{
  "@google/genai": "^1.30.0",
  "@supabase/auth-ui-react": "^0.4.7",
  "@supabase/supabase-js": "^2.84.0",
  "@yudiel/react-qr-scanner": "^2.0.4",
  "html5-qrcode": "^2.3.8",
  "lucide-react": "^0.554.0",
  "react": "^18.2.0",
  "react-dom": "^18.2.0",
  "react-hot-toast": "^2.6.0",
  "react-router-dom": "^7.9.6",
  "recharts": "^3.4.1"
}
```

## 🚀 Estado del Proyecto

### ✅ Implementado
- ✅ Autenticación con Supabase Auth
- ✅ Control de asistencia QR/Manual
- ✅ Gestión completa de empleados
- ✅ Sistema de roles y permisos granular
- ✅ Gestión de usuarios del sistema
- ✅ Solicitudes de ausencia con flujo de aprobación
- ✅ Reportes de horas extra
- ✅ Dashboard con estadísticas en tiempo real
- ✅ Integración con Google Gemini AI
- ✅ Edge Functions de Supabase
- ✅ Contextos globales de estado
- ✅ Rutas protegidas
- ✅ UI responsiva

### 🔄 En Desarrollo/Mejoras Futuras
- 📋 Reporte de asistencia mensual detallado
- 📱 Aplicación móvil nativa
- 🎯 Predicción de asistencia con ML
- 🔔 Notificaciones por email/SMS
- 📈 Dashboards avanzados con BI
- 🌍 Múltiples idiomas (i18n)
- 🖼️ Reconocimiento facial para acceso

## 📝 Notas Importantes

- El sistema usa **Supabase** como backend único (autenticación + base de datos + funciones serverless)
- Los **Edge Functions** se despliegan en Supabase y manejan toda la lógica crítica del backend
- La **IA de Gemini** se integra para análisis automático de documentos
- El proyecto está tipado completamente con **TypeScript**
- Se utiliza **Tailwind CSS** para un diseño consistente y moderno

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 🔗 Enlaces Útiles

- [Documentación de Supabase](https://supabase.com/docs)
- [Documentación de React](https://react.dev)
- [Documentación de Vite](https://vitejs.dev)
- [Google Gemini API](https://ai.google.dev)
- [Tailwind CSS](https://tailwindcss.com)

---

**Desarrollado con ❤️ usando React, TypeScript y Supabase**
