const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const adminMiddleware = require('../middlewares/adminMiddleware');
const adminController = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

// User management routes
router.get('/users', adminController.getAllUsers);
router.get('/users/:username/activity', adminController.getUserActivity);
router.post('/users/:id/suspend', adminController.suspendUser);
router.post('/users/:id/unsuspend', adminController.unsuspendUser);
router.post('/users/:id/softDelete', adminController.softDeleteUser);
router.delete('/users/:id', adminController.permanentDeleteUser);

// Statistics routes
router.get('/stats/registrations', adminController.registrationStats);

module.exports = router;
