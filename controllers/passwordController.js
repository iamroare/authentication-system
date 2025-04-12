const User = require('../models/User');
const { successResponse, errorResponse } = require('../utils/responseHandler');

// Change password
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword, confirmPassword } = req.body;
    const user = req.user; // From JWT auth middleware
    
    // Check if required fields are provided
    if (!oldPassword || !newPassword || !confirmPassword) {
      return errorResponse(res, 'All fields are required');
    }
    
    // Check if new passwords match
    if (newPassword !== confirmPassword) {
      return errorResponse(res, 'New passwords do not match');
    }
    
    // Verify old password
    const isPasswordMatch = await user.comparePassword(oldPassword);
    
    if (!isPasswordMatch) {
      return errorResponse(res, 'Old password is incorrect');
    }
    
    // Check if new password is same as old
    if (await user.comparePassword(newPassword)) {
      return errorResponse(res, 'Old password not allowed');
    }
    
    // Update password
    user.password = newPassword;
    await user.save();
    
    return successResponse(res, 'Password changed successfully');
    
  } catch (error) {
    console.error('Password change error:', error);
    return errorResponse(res, 'Password change failed', 500);
  }
};

// Verify password
exports.verifyPassword = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if required fields are provided
    if (!email || !password) {
      return errorResponse(res, 'Email and password are required');
    }
    
    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      return successResponse(res, 'Password verification result', { verified: false });
    }
    
    // Verify password
    const isPasswordMatch = await user.comparePassword(password);
    
    return successResponse(res, 'Password verification result', { verified: isPasswordMatch });
    
  } catch (error) {
    console.error('Password verification error:', error);
    return errorResponse(res, 'Password verification failed', 500);
  }
};