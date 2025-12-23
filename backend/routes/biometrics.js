import express from 'express';
const router = express.Router();

// NOTE: These are simple stubs to satisfy frontend calls while a real implementation is added.
// They return basic, safe responses so the UI can work during development.

// GET /api/biometrics/devices - list devices
router.get('/devices', async (req, res) => {
    try {
        // TODO: replace with real DB query
        return res.json([]);
    } catch (err) {
        console.error('biometrics: list devices error', err);
        return res.status(500).json({ error: 'Failed to list devices' });
    }
});

// POST /api/biometrics/devices - create device
router.post('/devices', async (req, res) => {
    try {
        // Accept payload and return created placeholder
        const device = { id: Date.now(), ...req.body };
        return res.status(201).json(device);
    } catch (err) {
        console.error('biometrics: create device error', err);
        return res.status(500).json({ error: 'Failed to create device' });
    }
});

// PATCH /api/biometrics/devices/:id - update device
router.patch('/devices/:id', async (req, res) => {
    try {
        const id = req.params.id;
        // TODO: update DB
        return res.json({ id, ...req.body });
    } catch (err) {
        console.error('biometrics: update device error', err);
        return res.status(500).json({ error: 'Failed to update device' });
    }
});

// DELETE /api/biometrics/devices/:id - delete device
router.delete('/devices/:id', async (req, res) => {
    try {
        const id = req.params.id;
        // TODO: delete from DB
        return res.json({ success: true });
    } catch (err) {
        console.error('biometrics: delete device error', err);
        return res.status(500).json({ error: 'Failed to delete device' });
    }
});

// POST /api/biometrics/devices/:id/test - test connection
router.post('/devices/:id/test', async (req, res) => {
    try {
        // TODO: implement real test logic
        return res.json({ ok: true, message: 'Test executed (stub)' });
    } catch (err) {
        console.error('biometrics: test device error', err);
        return res.status(500).json({ error: 'Failed to test device' });
    }
});

// POST /api/biometrics/devices/:id/sync - trigger sync
router.post('/devices/:id/sync', async (req, res) => {
    try {
        // TODO: enqueue sync job
        return res.json({ ok: true, message: 'Sync scheduled (stub)' });
    } catch (err) {
        console.error('biometrics: sync device error', err);
        return res.status(500).json({ error: 'Failed to sync device' });
    }
});

export default router;
