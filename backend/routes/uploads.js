import express from 'express';
import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { verifyToken } from '../middleware/auth.js';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = express.Router();
const uploadsDir = path.join(__dirname, '../uploads');

// Asegurar que la carpeta de uploads existe
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// POST /api/uploads/image - Subir imagen (base64)
router.post('/image', verifyToken, async (req, res) => {
    try {
        const { image, type = 'employee' } = req.body;

        if (!image) {
            return res.status(400).json({ error: 'Image is required', message: 'Image is required' });
        }

        // Validar que sea base64
        if (!image.startsWith('data:image/')) {
            return res.status(400).json({ error: 'Invalid image format', message: 'Invalid image format' });
        }

        // Extraer tipo MIME y datos
        const matches = image.match(/^data:image\/(\w+);base64,(.+)$/);
        if (!matches) {
            return res.status(400).json({ error: 'Invalid base64 format', message: 'Invalid base64 format' });
        }

        const [, extension, base64Data] = matches;
        const filename = `${type}_${uuidv4()}.${extension}`;
        const filepath = path.join(uploadsDir, filename);

        // Convertir base64 a buffer
        const buffer = Buffer.from(base64Data, 'base64');

        // Limitar tamaño a 10MB
        if (buffer.length > 10 * 1024 * 1024) {
            return res.status(400).json({ error: 'File too large', message: 'File too large (max 10MB)' });
        }

        // Guardar archivo
        fs.writeFileSync(filepath, buffer);

        res.json({
            message: 'Image uploaded successfully',
            filename,
            url: `/api/uploads/${filename}`
        });
    } catch (error) {
        console.error('Error uploading image:', error);
        res.status(500).json({ error: 'Internal server error', message: error.message });
    }
});

// GET /api/uploads/:filename - Obtener imagen
router.get('/:filename', (req, res) => {
    try {
        const { filename } = req.params;

        // Validar que no intenten acceder a archivos fuera de uploads
        if (filename.includes('..')) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const filepath = path.join(uploadsDir, filename);

        // Verificar que el archivo existe
        if (!fs.existsSync(filepath)) {
            return res.status(404).json({ error: 'File not found' });
        }

        // Servir archivo
        res.sendFile(filepath);
    } catch (error) {
        console.error('Error serving image:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

export default router;