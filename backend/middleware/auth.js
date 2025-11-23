import jwt from 'jsonwebtoken';

export const verifyToken = (req, res, next) => {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Invalid or expired token' });
    }
};

export const verifySuperAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    if (req.user.role !== 'superadmin') {
        return res.status(403).json({ error: 'Only superadmins can perform this action' });
    }

    next();
};

export const verifyAdminOrHR = (req, res, next) => {
    if (!req.user) {
        return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!['superadmin', 'admin', 'hr_manager'].includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
};
