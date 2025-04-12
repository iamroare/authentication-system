const express = require('express');
const router = express.Router();
const passwordController = require('../controllers/passwordController');
const authenticateJWT = require('../middleware/auth');

// Change password (requires authentication)
router.post('/change-password', authenticateJWT, passwordController.changePassword);

// Verify password (no authentication required)
router.post('/verify-password', passwordController.verifyPassword);

module.exports = router;