import { ApprovalStatus, CreditEvaluation, LoanOffer, SanctionLetter } from './types';

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Mask sensitive information
 */
export const maskMobile = (mobile: string): string => {
  return `******${mobile.slice(-4)}`;
};

export const maskPAN = (pan: string): string => {
  return `${pan.slice(0, 2)}****${pan.slice(-2)}`;
};

export const maskAadhaar = (aadhaar: string): string => {
  return `****-****-${aadhaar.slice(-4)}`;
};

/**
 * Verify OTP (mock implementation)
 */
export const verifyOTP = async (otp: string): Promise<boolean> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  // Mock: Accept any 6-digit OTP
  return /^\d{6}$/.test(otp);
};

/**
 * Perform credit evaluation (mock implementation)
 */
export const performCreditEvaluation = async (
  pan: string,
  aadhaar: string,
  monthlyIncome: number
): Promise<CreditEvaluation> => {
  // Simulate API call delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock credit evaluation logic
  // In a real scenario, this would call a credit bureau API
  const baseScore = 600;
  const incomeMultiplier = Math.min(monthlyIncome / 50000, 2); // Cap at 2x
  const score = Math.min(850, Math.round(baseScore + (incomeMultiplier * 100)));
  
  return {
    status: score >= 650 ? 'approved' : 'rejected',
    score,
    evaluatedAt: new Date().toISOString()
  };
};

/**
 * Process approval after document upload (mock implementation)
 */
export const processApproval = async (): Promise<ApprovalStatus> => {
  // Simulate processing delay
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Mock: Always approve for demo purposes
  // In production, this would verify documents and perform final checks
  return 'approved';
};

/**
 * Generate sanction letter data
 */
export const generateSanctionLetterData = (
  applicantName: string,
  loanOffer: LoanOffer
): SanctionLetter => {
  const now = new Date();
  const validUntil = new Date(now);
  validUntil.setDate(validUntil.getDate() + 30); // Valid for 30 days
  
  // Generate reference number
  const referenceNumber = `SL-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
  
  // Generate document hash (mock)
  const documentHash = btoa(`${referenceNumber}-${applicantName}-${now.toISOString()}`).substring(0, 32);
  
  return {
    referenceNumber,
    generatedAt: now.toISOString(),
    validUntil: validUntil.toISOString(),
    documentHash,
    applicantName,
    loanDetails: loanOffer
  };
};

/**
 * Upload file (mock implementation)
 */
export const uploadFile = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<{ url: string; base64: string }> => {
  return new Promise((resolve, reject) => {
    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      if (onProgress) {
        onProgress(Math.min(progress, 100));
      }
      
      if (progress >= 100) {
        clearInterval(interval);
        
        // Convert file to base64
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result as string;
          // Generate mock URL
          const url = URL.createObjectURL(file);
          
          resolve({ url, base64 });
        };
        reader.onerror = () => {
          reject(new Error('Failed to read file'));
        };
        reader.readAsDataURL(file);
      }
    }, 200);
  });
};