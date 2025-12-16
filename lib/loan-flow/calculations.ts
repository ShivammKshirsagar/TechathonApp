import { LoanOffer, Tenure } from './types';

/**
 * Calculate EMI using reducing balance method
 * Formula: EMI = P × r × (1 + r)^n / ((1 + r)^n - 1)
 * where P = principal, r = monthly rate, n = number of months
 */
export const calculateEMI = (
  principal: number,
  annualRate: number,
  tenureMonths: number
): number => {
  const monthlyRate = annualRate / 12 / 100;
  const emi = 
    (principal * monthlyRate * Math.pow(1 + monthlyRate, tenureMonths)) /
    (Math.pow(1 + monthlyRate, tenureMonths) - 1);
  
  return Math.round(emi);
};

/**
 * Calculate processing fee (typically 1-2% of loan amount)
 */
export const calculateProcessingFee = (loanAmount: number): number => {
  const feePercentage = 1.5; // 1.5%
  const fee = (loanAmount * feePercentage) / 100;
  const minFee = 1000;
  const maxFee = 10000;
  
  return Math.round(Math.min(Math.max(fee, minFee), maxFee));
};

/**
 * Calculate APR (Annual Percentage Rate)
 * Simplified calculation including processing fee
 */
export const calculateAPR = (
  loanAmount: number,
  interestRate: number,
  tenure: number,
  processingFee: number
): number => {
  const totalInterest = (calculateEMI(loanAmount, interestRate, tenure) * tenure) - loanAmount;
  const totalCost = totalInterest + processingFee;
  const apr = (totalCost / loanAmount / (tenure / 12)) * 100;
  
  return Math.round(apr * 100) / 100;
};

/**
 * Determine interest rate based on credit score and employment type
 */
export const determineInterestRate = (
  creditScore: number,
  employmentType: 'Salaried' | 'Self-Employed'
): number => {
  let baseRate = 12; // Base rate 12%
  
  // Adjust based on credit score
  if (creditScore >= 800) {
    baseRate = 10.5;
  } else if (creditScore >= 750) {
    baseRate = 11;
  } else if (creditScore >= 700) {
    baseRate = 11.5;
  } else if (creditScore >= 650) {
    baseRate = 12.5;
  } else {
    baseRate = 14;
  }
  
  // Add premium for self-employed
  if (employmentType === 'Self-Employed') {
    baseRate += 1;
  }
  
  return baseRate;
};

/**
 * Generate complete loan offer
 */
export const generateLoanOffer = (
  loanAmount: number,
  tenure: Tenure,
  creditScore: number,
  employmentType: 'Salaried' | 'Self-Employed'
): LoanOffer => {
  const interestRate = determineInterestRate(creditScore, employmentType);
  const emi = calculateEMI(loanAmount, interestRate, tenure);
  const processingFee = calculateProcessingFee(loanAmount);
  const totalPayable = emi * tenure;
  const totalInterest = totalPayable - loanAmount;
  const apr = calculateAPR(loanAmount, interestRate, tenure, processingFee);
  
  return {
    amount: loanAmount,
    interestRate,
    emi,
    tenure,
    processingFee,
    apr,
    totalInterest,
    totalPayable
  };
};

/**
 * Format currency for display
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Format number with Indian numbering system
 */
export const formatIndianNumber = (num: number): string => {
  return new Intl.NumberFormat('en-IN').format(num);
};