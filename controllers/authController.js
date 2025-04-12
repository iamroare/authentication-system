const User = require('../models/User');
const { generateOTP, sendEmailOTP, sendMobileOTP } = require('../utils/otpHelper');
const { successResponse, errorResponse } = require('../utils/responseHandler');
const { generateToken } = require('../config/jwt');

const fs = require('fs');
const path = require('path');

// Helper function to convert image file to base64
const imageToBase64 = (filePath) => {
  // Read the file
  const fileData = fs.readFileSync(filePath);
  // Get the file extension
  const extension = path.extname(filePath).slice(1);
  // Convert to base64
  const base64 = fileData.toString('base64');
  // Return with proper format
  return `data:image/${extension};base64,${base64}`;
};

// Register a new user
exports.register = async (req, res) => {
  try {
    const { email, mobileNumber, password } = req.body;
    
    // Check if required fields are provided
    if (!email || !mobileNumber || !password) {
      return errorResponse(res, 'Email, mobile number, and password are required');
    }
    
    // Check if image file was uploaded
    if (!req.file) {
      return errorResponse(res, 'Profile image is required');
    }
    
    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email }, { mobileNumber }]
    });
    
    if (existingUser) {
      if (existingUser.email === email) {
        return errorResponse(res, 'Email already registered');
      }
      return errorResponse(res, 'Mobile number already registered');
    }
    
    // Convert uploaded image to base64
    const profileImage = imageToBase64(req.file.path);
    
    // Generate OTPs
    const emailOTP = generateOTP();
    const mobileOTP = generateOTP();
    const otpGeneratedAt = new Date();
    
    // Create new user
    const newUser = new User({
      email,
      mobileNumber,
      password,
      profileImage, // Now contains the base64 encoded image
      emailOTP,
      mobileOTP,
      otpGeneratedAt
    });
    
    await newUser.save();
    
    // Delete the uploaded file after conversion to base64
    fs.unlinkSync(req.file.path);
    
    // Send OTPs (in a real app, you'd integrate with actual email/SMS services)
    await sendEmailOTP(email, emailOTP);
    await sendMobileOTP(mobileNumber, mobileOTP);
    
    return successResponse(res, 'User registered successfully', {
      userId: newUser._id,
      email: newUser.email,
      mobileNumber: newUser.mobileNumber,
      emailOTP, // In a production environment, you would not return OTPs
      mobileOTP  // This is just for demonstration purposes
    }, 201);
    
  } catch (error) {
    // If there was an uploaded file, delete it
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkError) {
        console.error('Error deleting file:', unlinkError);
      }
    }
    
    console.error('Registration error:', error);
    return errorResponse(res, 'Registration failed: ' + error.message, 500);
  }
};

// Generate OTP again
exports.generateOTP = async (req, res) => {
  try {
    const { email, mobileNumber } = req.body;
    
    // Check if either email or mobile is provided
    if (!email && !mobileNumber) {
      return errorResponse(res, 'Email or mobile number is required');
    }
    
    // Find user by email or mobile
    const user = await User.findOne({
      $or: [
        { email: email || '' },
        { mobileNumber: mobileNumber || '' }
      ]
    });
    
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    // Generate new OTP and update
    const newOTP = generateOTP();
    const otpGeneratedAt = new Date();
    
    // Update the respective OTP
    if (email) {
      user.emailOTP = newOTP;
      await sendEmailOTP(email, newOTP);
    } else {
      user.mobileOTP = newOTP;
      await sendMobileOTP(mobileNumber, newOTP);
    }
    
    user.otpGeneratedAt = otpGeneratedAt;
    await user.save();
    
    return successResponse(res, 'OTP generated successfully', {
      type: email ? 'email' : 'mobile',
      value: email || mobileNumber,
      otp: newOTP // In a production environment, you would not return the OTP
    });
    
  } catch (error) {
    console.error('OTP generation error:', error);
    return errorResponse(res, 'OTP generation failed', 500);
  }
};

// Verify OTP and login
exports.verifyOTP = async (req, res) => {
  try {
    const { email, mobileNumber, otp } = req.body;
    
    // Check if required fields are provided
    if ((!email && !mobileNumber) || !otp) {
      return errorResponse(res, 'Email/mobile and OTP are required');
    }
    
    // Determine login type
    const loginType = email ? 'email' : 'mobile';
    const loginValue = email || mobileNumber;
    
    // Find user
    const user = await User.findOne({
      $or: [
        { email: email || '' },
        { mobileNumber: mobileNumber || '' }
      ]
    });

    console.log("User ", user);
    
    if (!user) {
      return errorResponse(res, 'User not found', 404);
    }
    
    // Verify OTP
    const otpVerification = user.verifyOTP(loginType, otp);
    
    if (!otpVerification.valid) {
      return errorResponse(res, otpVerification.message);
    }
    
    // Clear OTP after successful verification
    user[`${loginType}OTP`] = null;
    
    // Update login info
    user.loginAttempts += 1;
    user.lastLoginAt = new Date();
    await user.save();
    
    // Generate JWT
    const token = generateToken({
      email: user.email,
      mobileNumber: user.mobileNumber
    });
    
    return successResponse(res, 'Login successful', {
      userId: user._id,
      email: user.email,
      mobileNumber: user.mobileNumber,
      token
    });
    
  } catch (error) {
    console.error('OTP verification error:', error);
    return errorResponse(res, 'OTP verification failed', 500);
  }
};
