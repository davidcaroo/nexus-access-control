import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { Server } from 'socket.io';
import pool from './config/db.js';
import runMigrations from './migrations.js';

// Import routes
import authRoutes from './routes/auth.js';
import employeeRoutes from './routes/employees.js';
import attendanceRoutes from './routes/attendance.js';
import leaveRequestRoutes from './routes/leaveRequests.js';
import userRoutes from './routes/users.js';
import roleRoutes from './routes/roles.js';
import uploadsRoutes from './routes/uploads.js';
import settingsRoutes from './routes/settings.js';
import biometricsRoutes from './routes/biometrics.js';
import reportsRoutes from './routes/reports.js';
import shiftsRoutes from './routes/shifts.js';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

// Crear servidor HTTP para WebSocket
const httpServer = createServer(app);
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL || 'http://localhost:3000',
        credentials: true
    }
});

// Exportar io para usarlo en rutas
export { io };

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// API Routes (ANTES de servir estáticos)
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leave-requests', leaveRequestRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/api/uploads', uploadsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/biometrics', biometricsRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/shifts', shiftsRoutes);

// Servir carpeta uploads como estática DESPUÉS de las rutas
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Backend is running' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// WebSocket connections
io.on('connection', (socket) => {
    console.log(`✅ Cliente conectado: ${socket.id}`);

    socket.on('disconnect', () => {
        console.log(`❌ Cliente desconectado: ${socket.id}`);
    });
});

const PORT = process.env.PORT || 3001;

// Test database connection before starting
pool.getConnection()
    .then(async connection => {
        connection.release();
        console.log('✅ Database connection successful');

        // Ejecutar migraciones
        try {
            await runMigrations();
        } catch (error) {
            console.error('⚠️ Error en migraciones (continuando):', error.message);
        }

        httpServer.listen(PORT, () => {
            console.log(`✅ Backend running on http://localhost:${PORT}`);
            console.log(`📡 CORS enabled for ${process.env.FRONTEND_URL || 'http://localhost:3000'}`);
            console.log(`🔌 WebSocket listening on ws://localhost:${PORT}`);
        });
    })
    .catch(err => {
        console.error('❌ Database connection failed:', err.message);
        console.error('Please ensure:');
        console.error('  1. MySQL is running on localhost:3306');
        console.error('  2. Database "nexus_access_control" exists');
        console.error('  3. .env file has correct DB credentials');
        process.exit(1);
    });
