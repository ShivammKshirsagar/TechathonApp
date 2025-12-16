import { Tenure, EmploymentType } from './types';

/**
 * Calculate EMI using the formula:
 * EMI = [P x R x (1+R)^N] / [(1+R)^N-1]
 * P = Principal (loan amount)
 * R = Monthly interest rate (annual rate / 12 / 100)
 * N = Tenure in months
 */
export function calculateEMI(
  principal: number,
  annualInterestRate: number,
  tenureMonths: number
): number {
  const monthlyRate = annualInterestRate / 12 / 100;
  const emi =
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  return Math.round(emi);
}

/**
 * Calculate total payable amount
 */
export function calculateTotalPayable(emi: number, tenure: number): number {
  return emi * tenure;
}

/**
 * Calculate processing fee (typically 1-2% of loan amount)
 */
export function calculateProcessingFee(loanAmount: number): number {
  const feePercentage = 1.5;
  return Math.round((loanAmount * feePercentage) / 100);
}

/**
 * Determine interest rate based on employment type, income, and loan amount
 * This is a mock algorithm - replace with actual logic later
 */
export function determineInterestRate(
  employmentType: EmploymentType,
  monthlyIncome: number,
  loanAmount: number
): number {
  let baseRate = 10.5; // Base rate 10.5%

  // Adjust for employment type
  if (employmentType === 'Salaried') {
    baseRate -= 0.5;
  }

  // Adjust for income
  if (monthlyIncome >= 100000) {
    baseRate -= 1.0;
  } else if (monthlyIncome >= 50000) {
    baseRate -= 0.5;
  }

  // Adjust for loan amount (higher amounts get better rates)
  if (loanAmount >= 500000) {
    baseRate -= 0.5;
  }

  return Math.max(8.5, baseRate); // Minimum rate 8.5%
}

/**
 * Mock credit score calculation based on user profile
 */
export function calculateCreditScore(
  monthlyIncome: number,
  loanAmount: number,
  employmentType: EmploymentType
): number {
  let score = 650; // Base score

  // Income factor
  if (monthlyIncome >= 100000) {
    score += 100;
  } else if (monthlyIncome >= 50000) {
    score += 50;
  }

  // Employment type factor
  if (employmentType === 'Salaried') {
    score += 30;
  }

  // Loan to income ratio
  const loanToIncomeRatio = loanAmount / (monthlyIncome * 12);
  if (loanToIncomeRatio < 2) {
    score += 50;
  } else if (loanToIncomeRatio < 3) {
    score += 20;
  }

  return Math.min(850, score); // Max credit score 850
}

/**
 * Determine risk category based on credit score
 */
export function getRiskCategory(creditScore: number): string {
  if (creditScore >= 750) return 'Low Risk';
  if (creditScore >= 650) return 'Medium Risk';
  return 'High Risk';
}

/**
 * Validate PAN format (e.g., ABCDE1234F)
 */
export function validatePAN(pan: string): boolean {
  const panRegex = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
  return panRegex.test(pan.toUpperCase());
}

/**
 * Validate Aadhaar format (12 digits)
 */
export function validateAadhaar(aadhaar: string): boolean {
  const aadhaarRegex = /^[0-9]{12}$/;
  return aadhaarRegex.test(aadhaar.replace(/\s/g, ''));
}

/**
 * Validate mobile number (10 digits)
 */
export function validateMobile(mobile: string): boolean {
  const mobileRegex = /^[6-9][0-9]{9}$/;
  return mobileRegex.test(mobile);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Generate unique reference number for application
 */
export function generateReferenceNumber(): string {
  const prefix = 'XYZ';
  const timestamp = Date.now().toString().slice(-8);
  const random = Math.floor(Math.random() * 1000)
    .toString()
    .padStart(3, '0');
  return `${prefix}${timestamp}${random}`;
}

/**
 * Format date for display (e.g., "15 Dec 2024")
 */
export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format currency for display (e.g., "₹5,00,000")
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Calculate validity date (15 days from now)
 */
export function getValidityDate(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 15);
  return date;
}

/**
 * Generate document hash (mock - for sanction letter)
 */
export function generateDocumentHash(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let hash = '';
  for (let i = 0; i < 16; i++) {
    hash += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return hash;
}