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
// const fs = require('fs');
// const User = require('../models/User');
// const { errorResponse, successResponse } = require('../utils/response');
// const { generateOTP, imageToBase64, sendEmailOTP, sendMobileOTP } = require('../utils/helpers');

exports.register = async (req, res) => {
  try {
    const {
      email,
      mobile_number,
      password,
      username,
      profession,
      company_name,
      address_line_1,
      country,
      state,
      city,
      subscription_plan,
      newsletter
    } = req.body;

    // Check mandatory fields
    if (!email || !mobile_number || !password || !username) {
      return errorResponse(res, 'Email, mobile number, password, and username are required');
    }

    if (!req.file) {
      return errorResponse(res, 'Profile image is required');
    }

    // Check for existing user
    const existingUser = await User.findOne({
      $or: [{ email }, { mobile_number }]
    });

    if (existingUser) {
      if (existingUser.email === email) {
        return errorResponse(res, 'Email already registered');
      }
      return errorResponse(res, 'Mobile number already registered');
    }

    // Convert image to base64
    const profile_image = imageToBase64(req.file.path);

    // Generate OTPs
    const email_otp = generateOTP();
    const mobile_otp = generateOTP();
    const otp_generated_at = new Date();

    // Create user
    const newUser = new User({
      email,
      mobile_number,
      password,
      username,
      profile_image,
      profession,
      company_name,
      address_line_1,
      country,
      state,
      city,
      subscription_plan,
      newsletter,
      email_otp,
      mobile_otp,
      otp_generated_at
    });

    await newUser.save();

    // Cleanup image file
    fs.unlinkSync(req.file.path);

    // Send OTPs
    // await sendEmailOTP(email, email_otp);
    // await sendMobileOTP(mobile_number, mobile_otp);

    return successResponse(res, 'User registered successfully', {
      user_id: newUser._id,
      email: newUser.email,
      mobile_number: newUser.mobile_number
    }, 201);

  } catch (error) {
    if (req.file) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (unlinkErr) {
        console.error('Error deleting file:', unlinkErr);
      }
    }

    console.error('Registration error:', error);
    return errorResponse(res, 'Registration failed: ' + error.message, 500);
  }
};


// const jwt = require('jsonwebtoken');
// const User = require('../models/User'); // Adjust path as needed
// const { errorResponse, successResponse } = require('../utils/responseHandler'); // Replace with your actual handler path

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if both fields are provided
    if (!email || !password) {
      return errorResponse(res, 'Email and password are required');
    }

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return errorResponse(res, 'Invalid email or password');
    }

    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return errorResponse(res, 'Invalid email or password');
    }

    // Update last login time
    user.last_login_at = new Date();
    await user.save();

    // Generate JWT
    const tokenPayload = {
      user_id: user._id,
      email: user.email,
      mobile_number: user.mobile_number,
    };

    // const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, {
    //   expiresIn: '7d',
    // });

    const token = generateToken(tokenPayload);

    return successResponse(res, 'Login successful', {
      token,
      user: {
        user_id: user._id,
        email: user.email,
        mobile_number: user.mobile_number,
        profile_image: user.profile_image,
        subscription_plan: user.subscription_plan
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return errorResponse(res, 'Login failed: ' + error.message, 500);
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
