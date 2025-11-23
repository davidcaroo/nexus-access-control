# 🚀 NEXUS Access Control - Backend Express.js

Backend completamente funcional para la migración de Supabase a MySQL + XAMPP.

---

## 🎯 Inicio Rápido (5 minutos)

```bash
# 1. Instalar dependencias
npm install

# 2. Crear archivo .env (copiar de .env.example)
cp .env.example .env

# Editar .env y cambiar JWT_SECRET y JWT_REFRESH_SECRET

# 3. Iniciar servidor
npm start

# ✅ Debe mostrar:
# ✅ Database connection successful
# ✅ Backend running on http://localhost:3001
```

---

## 📋 Estructura

```
backend/
├── package.json              # Dependencias
├── server.js                 # Servidor principal
├── .env.example              # Variables de entorno
├── config/
│   └── db.js                 # Conexión MySQL
├── middleware/
│   └── auth.js               # JWT + Roles
└── routes/
    ├── auth.js               # Autenticación (5 endpoints)
    ├── employees.js          # Empleados (5 endpoints)
    ├── attendance.js         # Asistencia (4 endpoints)
    ├── leaveRequests.js      # Solicitudes (4 endpoints)
    ├── users.js              # Usuarios (4 endpoints)
    └── roles.js              # Roles/Permisos (4 endpoints)
```

---

## 🔐 Autenticación

### Endpoints de Auth

```bash
POST /api/auth/register      # Registrar usuario
POST /api/auth/login         # Iniciar sesión → accessToken + refreshToken
POST /api/auth/refresh       # Renovar token expirado
GET  /api/auth/me            # Usuario actual (requiere token)
POST /api/auth/logout        # Cerrar sesión
```

### JWT Token
```javascript
// Guardarlo en localStorage
localStorage.setItem('accessToken', token);

// Usarlo en headers
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 👥 Endpoints Disponibles

### Empleados (5)
```
GET    /api/employees              # Listar todos
GET    /api/employees/:id          # Obtener uno
POST   /api/employees              # Crear (admin+)
PATCH  /api/employees/:id          # Actualizar (admin+)
DELETE /api/employees/:id          # Eliminar (superadmin)
```

### Asistencia (4)
```
POST   /api/attendance/record      # Registrar entrada/salida
GET    /api/attendance             # Listar registros
GET    /api/attendance/date/:date  # Por fecha
DELETE /api/attendance             # Eliminar todos (superadmin)
```

### Solicitudes (4)
```
POST   /api/leave-requests         # Crear solicitud
GET    /api/leave-requests         # Listar todas
PATCH  /api/leave-requests/:id     # Aprobar/Rechazar (admin+)
GET    /api/leave-requests/employee/:id # Por empleado
```

### Usuarios (4)
```
GET    /api/users                  # Listar (superadmin)
POST   /api/users                  # Crear (superadmin)
PATCH  /api/users/:id              # Editar (superadmin)
DELETE /api/users/:id              # Eliminar (superadmin)
```

### Roles (4)
```
GET    /api/roles                  # Listar roles
POST   /api/roles                  # Crear rol (superadmin)
DELETE /api/roles/:id              # Eliminar rol (superadmin)
GET    /api/roles/permissions      # Listar permisos
```

---

## 🧪 Testing

### Con curl
```bash
# Health check
curl http://localhost:3001/health

# Login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"123456"}'

# Listar empleados (con token)
curl http://localhost:3001/api/employees \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Con Postman
1. Crear colección
2. Importar endpoints
3. Usar {{base_url}} = http://localhost:3001/api
4. Guardar {{token}} de login

---

## 🔑 Variables de Entorno

```env
# Server
PORT=3001
NODE_ENV=development

# MySQL
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=
DB_NAME=nexus_access_control

# JWT
JWT_SECRET=tu-clave-super-secreta-minimo-32-caracteres
JWT_EXPIRES_IN=7d
JWT_REFRESH_SECRET=otra-clave-diferente-minimo-32-caracteres
JWT_REFRESH_EXPIRES_IN=30d

# CORS
FRONTEND_URL=http://localhost:3000

# Gemini (opcional)
GEMINI_API_KEY=tu-clave-gemini
```

---

## 🛡️ Middleware de Seguridad

### verifyToken
Valida que el JWT sea válido:
```javascript
@verifyToken
GET /api/employees
```

### verifySuperAdmin
Solo superadmins:
```javascript
@verifyToken @verifySuperAdmin
DELETE /api/users/:id
```

### verifyAdminOrHR
Admin, HR o Superadmin:
```javascript
@verifyToken @verifyAdminOrHR
POST /api/employees
```

---

## 📊 Roles y Permisos

### Roles Incluidos
- **superadmin** - Control total
- **admin** - Administración del sistema
- **hr_manager** - Gestión de RRHH
- **department_head** - Jefe de depto
- **employee** - Empleado regular

### Permisos Incluidos
```
employees:create/read/update/delete
attendance:record/view/delete
leave_requests:create/view/approve/reject
users:create/read/update/delete/ban
roles:manage
permissions:manage
```

---

## 🚨 Manejo de Errores

Todos los errores devuelven JSON:

```json
{
  "error": "Mensaje descriptivo del error"
}
```

### Códigos HTTP
- **200** OK
- **201** Created
- **400** Bad Request
- **401** Unauthorized
- **403** Forbidden
- **404** Not Found
- **500** Internal Server Error

---

## 🔄 Flujo de Autenticación

```
Usuario escribe email/password
        ↓
POST /api/auth/login
        ↓
Verifica contraseña (bcrypt)
        ↓
Genera accessToken (7 días)
Genera refreshToken (30 días)
        ↓
Devuelve ambos tokens
        ↓
Frontend guarda en localStorage
        ↓
Cada request incluye:
Authorization: Bearer <accessToken>
```

---

## ♻️ Renovación de Token

```javascript
// Si accessToken expira
POST /api/auth/refresh
{
  "refreshToken": "..."
}
        ↓
Genera nuevo accessToken
        ↓
Frontend actualiza localStorage
        ↓
Usuario continúa usando app
```

---

## 🎯 Casos de Uso

### Registro de Empleado

```bash
# 1. Admin crea empleado
POST /api/employees
{
  "cedula": "1234567890",
  "nombre": "Juan Pérez",
  "cargo": "Developer",
  "departamento": "IT"
}
```

### Registro de Asistencia

```bash
# 1. Empleado escanea QR
POST /api/attendance/record
{
  "cedula": "1234567890",
  "metodo": "qr",
  "tipo": "entrada"
}

# 2. Sistema detecta tardanza automáticamente
# 3. Registra en BD
# 4. Dashboard actualiza en tiempo real
```

### Solicitud de Ausencia

```bash
# 1. Empleado crea solicitud
POST /api/leave-requests
{
  "employee_id": "...",
  "request_type": "vacation",
  "start_date": "2024-12-01",
  "end_date": "2024-12-10",
  "reason": "Vacaciones"
}

# 2. HR revisa en dashboard
# 3. HR aprueba/rechaza
PATCH /api/leave-requests/:id
{
  "status": "approved"
}
```

---

## 🔍 Debugging

### Ver logs
```bash
# Terminal con npm start muestra:
✅ Database connection successful
✅ Backend running on http://localhost:3001

# Si hay error:
❌ Database connection failed: ...
```

### Verificar conexión MySQL
```bash
mysql -u root -h localhost
SHOW DATABASES;
SELECT * FROM users;
```

### Verificar endpoint
```bash
curl http://localhost:3001/health
# {"status":"OK","message":"Backend is running"}
```

---

## 📈 Monitoreo

### Health Check
```bash
GET /health
```

### Logs Estructurados
Cada operación importante se loguea:
```
[2024-11-22 10:30:45] POST /api/auth/login → 200 OK
[2024-11-22 10:31:12] POST /api/employees → 201 Created
[2024-11-22 10:32:00] PATCH /api/employees/:id → 200 OK
```

---

## 🚀 Deployment (Futuro)

### Opciones
1. **Heroku** - Fácil (free tier)
2. **Railway** - Bueno (free tier)
3. **Render** - Bueno (free tier)
4. **AWS EC2** - Escalable (pago)
5. **DigitalOcean** - Barato ($5/mes)

### Pasos Básicos
```bash
# 1. Build production
npm run build

# 2. Cambiar variables de entorno
NODE_ENV=production
DB_HOST=tu-bd-remota
JWT_SECRET=super-secreto

# 3. Iniciar
npm start
```

---

## 📚 Documentación Completa

- `QUICK_START.md` - 5 minutos
- `MIGRATION_GUIDE.md` - Todo sobre backend
- `API_EXAMPLES.md` - 25+ ejemplos
- `00_COMIENZA_AQUI.md` - Punto de entrada

---

## 🤝 Contributing

Para modificar backend:
1. Crea rama: `git checkout -b feature/nombre`
2. Edita código en `routes/` o `middleware/`
3. Prueba: `npm start`
4. Commit: `git commit -m "Descripción"`
5. Push: `git push origin feature/nombre`

---

## ✨ Características

✅ Autenticación JWT con refresh tokens  
✅ CRUD completo para todos los recursos  
✅ Validación de roles y permisos  
✅ Manejo de errores robusto  
✅ CORS configurado  
✅ Pool de conexiones MySQL  
✅ Timestamps automáticos  
✅ Soft delete ready  

---

## 🎉 Listo para Usar

Todo está configurado y listo. Solo necesitas:

```bash
npm install
npm start
# ✅ Servidor corriendo en http://localhost:3001
```

---

**Backend para NEXUS Access Control**  
Versión 1.0 - Production Ready  
Noviembre 22, 2025
