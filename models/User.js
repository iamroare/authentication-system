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
  mobile_number: {
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
  profile_image: {
    type: String, // Can store URL or base64 string
    required: [true, 'Profile image is required']
  },
  username: {
    type: String,
    required: [true, 'Username is required'],
    trim: true
  },
  profession: {
    type: String,
    trim: true
  },
  company_name: {
    type: String,
    trim: true
  },
  address_line_1: {
    type: String,
    trim: true
  },
  country: {
    type: String,
    trim: true
  },
  state: {
    type: String,
    trim: true
  },
  city: {
    type: String,
    trim: true
  },
  subscription_plan: {
    type: String,
    enum: ['Free', 'Basic', 'Premium','basic'],
    default: 'Free'
  },
  newsletter: {
    type: Boolean,
    default: false
  },
  email_otp: {
    type: String,
    default: null
  },
  mobile_otp: {
    type: String,
    default: null
  },
  otp_generated_at: {
    type: Date,
    default: null
  },
  login_attempts: {
    type: Number,
    default: 0
  },
  last_login_at: {
    type: Date,
    default: null
  },
  created_at: {
    type: Date,
    default: Date.now
  },
  updated_at: {
    type: Date,
    default: Date.now
  }
});

// Update timestamp before saving
userSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

// Hash password before saving
userSchema.pre('save', async function (next) {
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
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to verify OTP
userSchema.methods.verifyOTP = function (type, otp) {
  const otpField = type === 'email' ? 'email_otp' : 'mobile_otp';
  const currentTime = new Date();
  const otpTime = this.otp_generated_at;

  if (!otpTime) {
    return { valid: false, message: 'OTP not generated' };
  }

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
