
export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateMobile = (mobile: string): ValidationResult => {
  const cleaned = mobile.replace(/\D/g, '');
  
  if (cleaned.length !== 10) {
    return { isValid: false, error: 'Mobile number must be 10 digits' };
  }
  
  if (!cleaned.startsWith('6') && !cleaned.startsWith('7') && !cleaned.startsWith('8') && !cleaned.startsWith('9')) {
    return { isValid: false, error: 'Mobile number must start with 6, 7, 8, or 9' };
  }
  
  return { isValid: true };
};

export const validateEmail = (email: string): ValidationResult => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

export const validatePAN = (pan: string): ValidationResult => {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  const upperPan = pan.toUpperCase();
  
  if (!panRegex.test(upperPan)) {
    return { isValid: false, error: 'PAN must be in format: ABCDE1234F' };
  }
  
  return { isValid: true };
};

export const validateAadhaar = (aadhaar: string): ValidationResult => {
  const cleaned = aadhaar.replace(/\D/g, '');
  
  if (cleaned.length !== 12) {
    return { isValid: false, error: 'Aadhaar must be 12 digits' };
  }
  
  return { isValid: true };
};

export const validateOTP = (otp: string): ValidationResult => {
  const cleaned = otp.replace(/\D/g, '');
  
  if (cleaned.length !== 6) {
    return { isValid: false, error: 'OTP must be 6 digits' };
  }
  
  return { isValid: true };
};

export const validateMonthlyIncome = (income: number): ValidationResult => {
  if (income < 10000) {
    return { isValid: false, error: 'Minimum monthly income should be ₹10,000' };
  }
  
  if (income > 10000000) {
    return { isValid: false, error: 'Please enter a valid income amount' };
  }
  
  return { isValid: true };
};

export const validateLoanAmount = (amount: number, monthlyIncome?: number): ValidationResult => {
  if (amount < 10000) {
    return { isValid: false, error: 'Minimum loan amount is ₹10,000' };
  }
  
  if (amount > 5000000) {
    return { isValid: false, error: 'Maximum loan amount is ₹50,00,000' };
  }
  
  // Optional: Check loan-to-income ratio
  if (monthlyIncome && amount > monthlyIncome * 60) {
    return { isValid: false, error: 'Loan amount too high for your income' };
  }
  
  return { isValid: true };
};

export const validateFullName = (name: string): ValidationResult => {
  if (name.trim().length < 3) {
    return { isValid: false, error: 'Name must be at least 3 characters' };
  }
  
  if (!/^[a-zA-Z\s]+$/.test(name)) {
    return { isValid: false, error: 'Name should only contain letters' };
  }
  
  return { isValid: true };
};

export const validateFile = (file: File, maxSizeMB: number = 5): ValidationResult => {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  
  if (file.size > maxSizeBytes) {
    return { isValid: false, error: `File size must be less than ${maxSizeMB}MB` };
  }
  
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
  if (!allowedTypes.includes(file.type)) {
    return { isValid: false, error: 'Only JPG, PNG, and PDF files are allowed' };
  }
  
  return { isValid: true };
};