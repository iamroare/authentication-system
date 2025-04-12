const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please provide a valid email address']
  },
  mobileNumber: {
    type: String,
    required: [true, 'Mobile number is required'],
    unique: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters long']
  },
  profileImage: {
    type: String, // Stored as Base64
    required: [true, 'Profile image is required']
  },
  emailOTP: {
    type: String,
    default: null
  },
  mobileOTP: {
    type: String,
    default: null
  },
  otpGeneratedAt: {
    type: Date,
    default: null
  },
  loginAttempts: {
    type: Number,
    default: 0
  },
  lastLoginAt: {
    type: Date,
    default: null
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp before saving
userSchema.pre('save', function(next) {
  this.updatedAt = new Date();
  next();
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Only hash the password if it's modified (or new)
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to verify OTP
userSchema.methods.verifyOTP = function(type, otp) {
  // Check if OTP matches and is not expired (5 minutes)
  const otpField = type === 'email' ? 'emailOTP' : 'mobileOTP';
  const currentTime = new Date();
  const otpTime = this.otpGeneratedAt;
  
  if (!otpTime) {
    return { valid: false, message: 'OTP not generated' };
  }
  
  // Calculate difference in minutes
  const diffInMinutes = Math.floor((currentTime - otpTime) / (1000 * 60));
  
  if (diffInMinutes > parseInt(process.env.OTP_EXPIRY, 10)) {
    return { valid: false, message: 'OTP expired' };
  }
  
  if (this[otpField] !== otp) {
    return { valid: false, message: 'Invalid OTP' };
  }
  
  return { valid: true, message: 'OTP verified successfully' };
};

const User = mongoose.model('User', userSchema);

module.exports = User;