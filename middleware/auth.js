const { verifyToken } = require('../config/jwt');
const { errorResponse } = require('../utils/responseHandler');
const User = require('../models/User');

const authenticateJWT = async (req, res, next) => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return errorResponse(res, 'Access denied. No token provided', 401);
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Check if user exists
    const user = await User.findOne({ 
      email: decoded.email,
      mobileNumber: decoded.mobileNumber
    });
    
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    // Attach user to request
    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 'Invalid token', 401);
  }
};

module.exports = authenticateJWT;