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
  try {
    const response = await fetch('/api/loan/verify-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ otp })
    });
    const data = await response.json();
    return Boolean(data.valid);
  } catch {
    return /^\d{6}$/.test(otp);
  }
};

/**
 * Perform credit evaluation (mock implementation)
 */
export const performCreditEvaluation = async (
  pan: string,
  aadhaar: string,
  monthlyIncome: number
): Promise<CreditEvaluation> => {
  try {
    const response = await fetch('/api/loan/credit-evaluate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pan, aadhaar, monthly_income: monthlyIncome })
    });
    const data = await response.json();
    return {
      status: data.status,
      score: data.score,
      evaluatedAt: data.evaluated_at || new Date().toISOString()
    };
  } catch {
    const baseScore = 600;
    const incomeMultiplier = Math.min(monthlyIncome / 50000, 2);
    const score = Math.min(850, Math.round(baseScore + (incomeMultiplier * 100)));
    return {
      status: score >= 650 ? 'approved' : 'rejected',
      score,
      evaluatedAt: new Date().toISOString()
    };
  }
};

/**
 * Process approval after document upload (mock implementation)
 */
export const processApproval = async (): Promise<ApprovalStatus> => {
  try {
    const response = await fetch('/api/loan/process-approval', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({})
    });
    const data = await response.json();
    return data.status === 'approved' ? 'approved' : 'rejected';
  } catch {
    return 'approved';
  }
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
  docType?: string,
  onProgress?: (progress: number) => void
): Promise<{ url: string; base64: string }> => {
  if (onProgress) {
    onProgress(10);
  }

  const formData = new FormData();
  formData.append('file', file);
  if (docType) {
    formData.append('doc_type', docType);
  }

  try {
    const response = await fetch('/api/loan/upload', {
      method: 'POST',
      body: formData
    });
    const data = await response.json();

    if (onProgress) {
      onProgress(100);
    }

    const base64 = data.base64 ? `data:${file.type};base64,${data.base64}` : '';
    return { url: data.url || '', base64 };
  } catch (error) {
    if (onProgress) {
      onProgress(100);
    }
    throw error;
  }
};
