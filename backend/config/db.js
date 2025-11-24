import mysql from 'mysql2/promise';
import dotenv from 'dotenv';

dotenv.config();

const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'nexus_access_control',
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 20,  // Aumentado de 10 a 20
    queueLimit: 0,
    timezone: '+00:00',
    charset: 'utf8mb4'
});

export default pool;
