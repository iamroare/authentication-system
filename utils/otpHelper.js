const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// In a real application, integrate with email and SMS services
const sendEmailOTP = async (email, otp) => {
  // This would be replaced with actual email sending logic
  console.log(`Email OTP ${otp} sent to ${email}`);
  return true;
};

const sendMobileOTP = async (mobileNumber, otp) => {
  // This would be replaced with actual SMS sending logic
  console.log(`Mobile OTP ${otp} sent to ${mobileNumber}`);
  return true;
};

module.exports = {
  generateOTP,
  sendEmailOTP,
  sendMobileOTP,
};
