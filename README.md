# NEXUS Access Control

**Sistema Integral de Gestión de Personal, Control de Asistencia y Horarios**

Solución empresarial completa que combina escaneo QR, autenticación JWT segura y análisis en tiempo real. Diseñado con arquitectura moderna: frontend React con TypeScript y backend Node.js/Express con MySQL para control eficiente de personal.

## 🎯 Características Principales

### Gestión de Asistencia
- Escaneo QR para registro automático de entrada/salida
- Registro manual de asistencia
- Detección automática de tardanzas comparando con horarios
- Dashboard en tiempo real con estadísticas de asistencia
- Histórico completo de registros

### Gestión de Empleados
- CRUD completo con búsqueda y filtrado avanzado
- Foto de perfil con preview inmediato
- Campos: cédula, nombre, cargo, departamento, horarios
- Generación automática de códigos QR por empleado
- Estados: activo/inactivo

### Gestión de Permisos y Ausencias
- Solicitudes de ausencia: vacaciones, licencia médica, días libres
- Flujo de aprobación: pendiente → aprobado/rechazado
- Formulario público para empleados (sin autenticación requerida)
- Validación de rangos de fechas
- Motivos de rechazo documentados

### Control de Usuarios y Roles
- Gestión de usuarios del sistema con roles granulares
- Roles: superadmin, admin, hr_manager, department_head, employee
- Sistema de permisos basado en acciones específicas
- Bloqueo/desbloqueo de usuarios
- Solo superadmins pueden acceder

### Reportes y Análisis
- Dashboard con estadísticas en tiempo real
- Reporte de horas extra detallado con filtrado por fechas
- Gráficos interactivos de asistencia y productividad
- Total de personal, presentes, ausentes, tardanzas

## 🏗️ Arquitectura Técnica

### Frontend
- **React 18.2** con TypeScript para tipado estático
- **Vite** como build tool (desarrollo rápido, bundling optimizado)
- **Tailwind CSS** para estilos responsivos
- **React Router v7** para enrutamiento SPA
- **Recharts** para visualización de datos
- **React Hot Toast** para notificaciones en tiempo real

### Backend
- **Node.js/Express.js** con TypeScript support
- **MySQL 8.0** con pool de conexiones (20 conexiones concurrentes)
- **JWT (jsonwebtoken)** para autenticación sin estado
- **Socket.io** para comunicación en tiempo real
- **Multer** para manejo de uploads
- **CORS** configurado para frontend

### Integraciones
- **Google Gemini AI** para análisis automático de documentos de identidad
- **html5-qrcode** para escaneo QR en navegador
- **Lucide React** para iconografía consistente

## 📁 Estructura del Proyecto

```
nexus-access-control/
├── backend/                    # Backend Express.js
│   ├── config/
│   │   └── db.js              # Pool MySQL con 20 conexiones
│   ├── middleware/
│   │   └── auth.js            # Verificación JWT
│   ├── routes/
│   │   ├── auth.js            # Autenticación y perfil
│   │   ├── employees.js       # CRUD empleados
│   │   ├── attendance.js      # Registros de asistencia
│   │   ├── leaveRequests.js   # Solicitudes de ausencia
│   │   ├── users.js           # Gestión de usuarios
│   │   ├── roles.js           # Roles y permisos
│   │   └── settings.js        # Configuración
│   ├── migrations.js          # Migraciones automáticas (silent mode)
│   └── server.js              # Entrada principal con WebSocket
├── pages/                      # Páginas principales (admin)
│   ├── Dashboard.tsx          # Panel de control
│   ├── AccessTerminal.tsx     # Terminal de escaneo QR
│   ├── EmployeeManager.tsx    # Gestión de empleados
│   ├── Reports.tsx            # Reportes generales
│   ├── OvertimeReport.tsx     # Reporte de horas extra
│   └── Login.tsx              # Autenticación
├── src/
│   ├── pages/
│   │   ├── UserManagement.tsx           # Gestión de usuarios
│   │   ├── RolePermissionManagement.tsx # Roles y permisos
│   │   ├── LeaveRequestsManagement.tsx  # Admin de ausencias
│   │   ├── Settings.tsx                 # Configuración
│   │   └── PublicLeaveRequest.tsx       # Formulario público
│   ├── components/
│   │   ├── QRScanner.tsx      # Lector QR con cámara
│   │   ├── ProtectedRoute.tsx # Rutas protegidas
│   │   ├── ToastProvider.tsx  # Notificaciones globales
│   │   └── ConfirmationModal.tsx
│   ├── context/
│   │   ├── PermissionsContext.tsx # Control de permisos
│   │   └── SidebarContext.tsx     # Estado sidebar
│   ├── hooks/
│   │   └── useSocket.ts       # Hook para WebSocket
│   └── services/
│       ├── apiClient.ts       # Cliente HTTP centralizado
│       └── geminiService.ts   # Integración Gemini AI
├── components/                 # Componentes globales
├── App.tsx                     # Componente raíz
├── types.ts                    # Definiciones TypeScript
└── package.json
```

## 🔐 Sistema de Seguridad

- **Autenticación JWT**: Tokens sin estado, seguros y escalables
- **Autorización basada en roles**: Verificación de permisos granulares
- **Hash de contraseñas**: bcryptjs para almacenamiento seguro
- **Rutas protegidas**: ProtectedRoute component con verificación de roles
- **CORS configurado**: Solo frontend autorizado
- **Middleware de autenticación**: Validación en todas las rutas

## 🚀 Instalación y Configuración

### Requisitos Previos
- Node.js 18+ y npm/pnpm
- MySQL 8.0+
- API Key de Google Gemini (opcional, para análisis de documentos)

### Setup Frontend

```bash
# Instalar dependencias
pnpm install

# Configurar variables de entorno (.env.local)
VITE_API_BASE_URL=http://localhost:3001
VITE_GEMINI_API_KEY=your-gemini-api-key

# Desarrollo
pnpm run dev
# http://localhost:3000

# Build producción
pnpm run build
```

### Setup Backend

```bash
# Instalar dependencias
cd backend
npm install

# Configurar variables (.env)
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=nexus_db
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=3001

# Iniciar servidor
npm start
# http://localhost:3001
```

### Inicializar Base de Datos

```bash
# 1. Crear database
mysql -u root -p < db-init.sql

# 2. El backend ejecuta migraciones automáticamente al iniciar
# - Migración 1: Altera avatar_url a LONGTEXT para imágenes base64
# - Migración 2: Configura max_allowed_packet a 256MB
```

## 📊 Modelos de Datos Principales

### User (Autenticación JWT)
```typescript
id: string (UUID)
email: string (único)
full_name: string
role: RoleName
avatar_url?: string (LONGTEXT base64)
```

### Employee
```typescript
id: string (UUID)
cedula: string (único)
nombre: string
foto: string (base64)
cargo: string
departamento: string
horario_entrada: string (HH:mm)
horario_salida: string (HH:mm)
estado: 'activo' | 'inactivo'
fecha_ingreso: string (ISO Date)
```

### AttendanceRecord
```typescript
id: number (autoincrement)
employee_id: string (FK)
tipo: 'entrada' | 'salida'
fecha: string (YYYY-MM-DD)
hora: string (HH:mm:ss)
metodo: 'qr' | 'manual'
tardanza: boolean
```

### LeaveRequest
```typescript
id: string (UUID)
employee_id: string (FK)
request_type: 'vacation' | 'sick_leave' | 'day_off'
start_date: string (YYYY-MM-DD)
end_date: string (YYYY-MM-DD)
status: 'pending' | 'approved' | 'rejected'
requested_at: string (ISO Timestamp)
approved_by?: string (FK User)
rejection_reason?: string
```

## 🔗 Rutas API Principales

### Autenticación
- `POST /api/auth/login` - Login con email/contraseña
- `POST /api/auth/register` - Registro de usuario
- `GET /api/auth/me` - Obtener usuario autenticado
- `PATCH /api/auth/me/profile` - Actualizar perfil + avatar

### Empleados
- `GET /api/employees` - Listar todos
- `POST /api/employees` - Crear nuevo
- `PATCH /api/employees/:id` - Actualizar
- `DELETE /api/employees/:id` - Eliminar

### Asistencia
- `GET /api/attendance` - Registros con filtros
- `POST /api/attendance/checkin` - Registrar entrada/salida
- `POST /api/attendance/manual` - Registro manual

### Solicitudes de Ausencia
- `GET /api/leave-requests` - Listar solicitudes
- `POST /api/leave-requests` - Crear solicitud (pública)
- `PATCH /api/leave-requests/:id/approve` - Aprobar
- `PATCH /api/leave-requests/:id/reject` - Rechazar

### Usuarios y Roles
- `GET /api/users` - Listar usuarios (superadmin)
- `POST /api/users` - Crear usuario
- `PATCH /api/users/:id` - Actualizar (bloqueo/desbloqueo)
- `GET /api/roles` - Listar roles disponibles
- `POST /api/roles` - Crear rol personalizado

## 🧪 Tipos y Interfaces TypeScript

Todas las entidades están tipadas en `types.ts`:
- `User` - Usuario autenticado
- `Employee` - Información de empleado
- `AttendanceRecord` - Registro de asistencia
- `LeaveRequest` - Solicitud de ausencia
- `Role` - Definición de rol
- `Permission` - Definición de permiso
- `RoleName` - Tipo unión de roles válidos

## 📡 Comunicación en Tiempo Real

Socket.io para actualizaciones en vivo:
- Nuevos registros de asistencia
- Cambios en solicitudes de ausencia
- Notificaciones de usuarios conectados

## 🎯 Flujos de Negocio Clave

### Registro de Asistencia
```
Escaneo QR/Entrada Manual → Registro en BD → Detección de tardanza
→ WebSocket notifica → Dashboard actualiza en tiempo real
```

### Solicitud de Ausencia
```
Empleado crea solicitud (pública) → Estado: Pendiente
→ HR/Manager aprueba/rechaza → Empleado notificado
```

### Gestión de Permisos
```
SuperAdmin crea roles/permisos → Admin asigna a usuarios
→ Sistema verifica en PermissionsContext → UI muestra/oculta funciones
```

## ✅ Estado del Proyecto

- ✅ Autenticación con JWT
- ✅ Control de asistencia QR/manual
- ✅ Gestión completa de empleados
- ✅ Solicitudes de ausencia con flujo de aprobación
- ✅ Sistema de roles y permisos granular
- ✅ Gestión de usuarios del sistema
- ✅ Reportes de horas extra
- ✅ Dashboard en tiempo real
- ✅ Socket.io para actualizaciones en vivo
- ✅ Avatar upload con soporte base64 (LONGTEXT)
- ✅ Integraciones con Google Gemini AI
- ✅ Migraciones automáticas (silent mode)
- ✅ Pool de conexiones MySQL (20 conexiones)

## 🚀 Mejoras Futuras

- 📱 Aplicación móvil nativa
- 🎯 Reconocimiento facial para acceso
- 🔔 Notificaciones por email/SMS
- 📈 Dashboards avanzados con BI
- 🌍 Soporte multi-idioma (i18n)
- 📊 Análisis predictivo de asistencia

## 📝 Variables de Entorno

### Frontend (.env.local)
```
VITE_API_BASE_URL=http://localhost:3001
VITE_GEMINI_API_KEY=your-api-key
```

### Backend (.env)
```
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=nexus_db
JWT_SECRET=your-secret-key
FRONTEND_URL=http://localhost:3000
NODE_ENV=development
PORT=3001
```

## 📦 Dependencias Clave

**Frontend:**
- react@18.2.0, react-dom@18.2.0
- typescript@~5.8.2
- tailwindcss (v3), react-router-dom@7.9.6
- recharts@3.4.1, react-hot-toast@2.6.0
- @google/genai@1.30.0, html5-qrcode@2.3.8
- lucide-react@0.554.0

**Backend:**
- express@4.18.2, cors@2.8.5
- mysql2@3.6.5, jsonwebtoken@9.0.2
- bcryptjs@2.4.3, socket.io@4.8.1
- multer@1.4.5, express-validator@7.0.0

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el repositorio
2. Crea una rama (`git checkout -b feature/NuevaFeature`)
3. Commit cambios (`git commit -m 'Add NuevaFeature'`)
4. Push (`git push origin feature/NuevaFeature`)
5. Abre un Pull Request

## 📄 Licencia

MIT License - ver LICENSE para detalles

## 🔗 Recursos

- [React Docs](https://react.dev)
- [Express.js](https://expressjs.com)
- [MySQL Documentation](https://dev.mysql.com/doc)
- [Tailwind CSS](https://tailwindcss.com)
- [Vite](https://vitejs.dev)

---

**Desarrollado con ❤️ usando React, TypeScript, Express.js y MySQL**
