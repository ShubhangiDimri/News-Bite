const express = require('express');
const router = express.Router();
const authMiddleware = require('../middlewares/authMiddleware');
const isAdmin = require('../middlewares/isAdmin');
const adminController = require('../controllers/adminController');

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(isAdmin);

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
