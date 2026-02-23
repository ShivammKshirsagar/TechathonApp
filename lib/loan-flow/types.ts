export enum ConversationStep {
  WELCOME = 'welcome',
  EMPLOYMENT_TYPE = 'employment_type',
  MONTHLY_INCOME = 'monthly_income',
  LOAN_AMOUNT = 'loan_amount',
  TENURE = 'tenure',
  PERSONAL_DETAILS_NAME = 'personal_details_name',
  PERSONAL_DETAILS_MOBILE = 'personal_details_mobile',
  OTP_VERIFICATION = 'otp_verification',
  PERSONAL_DETAILS_EMAIL = 'personal_details_email',
  PERSONAL_DETAILS_PAN = 'personal_details_pan',
  PERSONAL_DETAILS_AADHAAR = 'personal_details_aadhaar',
  KYC_CONSENT = 'kyc_consent',
  CREDIT_EVALUATION = 'credit_evaluation',
  LOAN_OFFER = 'loan_offer',
  DOCUMENT_UPLOAD_PROMPT = 'document_upload_prompt',
  DOCUMENT_UPLOAD = 'document_upload',
  AWAITING_UPLOAD_CONFIRMATION = 'awaiting_upload_confirmation',
  APPROVAL_PROCESSING = 'approval_processing',
  APPROVAL_SUCCESS = 'approval_success',
  COMPLETE = 'complete'
}

export type EmploymentType = 'Salaried' | 'Self-Employed';
export type Tenure = 12 | 24 | 36 | 48;
export type DocumentUploadStatus = 'pending' | 'uploading' | 'uploaded' | 'error';
export type ApprovalStatus = 'pending' | 'approved' | 'rejected';
export type CreditStatus = 'pending' | 'evaluating' | 'approved' | 'rejected';

export interface PersonalDetails {
  fullName?: string;
  mobile?: string;
  email?: string;
  pan?: string;
  aadhaar?: string;
}

export interface DocumentFile {
  file?: File;
  status: DocumentUploadStatus;
  progress: number;
  url?: string;
  uploadedAt?: string;
  base64?: string; // For localStorage persistence
  fileName?: string;
  fileSize?: number;
}

export interface DocumentsState {
  salarySlip: DocumentFile;
  bankStatement: DocumentFile;
  addressProof: DocumentFile;
  selfie: DocumentFile;
}

export interface CreditEvaluation {
  status: CreditStatus;
  score?: number;
  evaluatedAt?: string;
}

export interface LoanOffer {
  amount: number;
  interestRate: number;
  emi: number;
  tenure: number;
  processingFee: number;
  apr: number;
  totalInterest: number;
  totalPayable: number;
}

export interface SanctionLetter {
  referenceNumber: string;
  referenceNo?: string;
  generatedAt: string;
  date?: string;
  validUntil: string;
  documentHash: string;
  applicantName: string;
  loanDetails: LoanOffer;
}

export interface Message {
  id: string;
  type: 'bot' | 'user';
  content: string;
  timestamp: string;
  metadata?: {
    step?: ConversationStep;
    options?: string[];
    requiresInput?: boolean;
    inputType?: 'text' | 'number' | 'otp' | 'buttons';
  };
}

export interface LoanFlowState {
  // Step tracking
  currentStep: ConversationStep;
  stepHistory: ConversationStep[];
  
  // Collected data
  collectedData: {
    employmentType?: EmploymentType;
    monthlyIncome?: number;
    loanAmount?: number;
    tenure?: Tenure;
    personalDetails: PersonalDetails;
    kycConsent?: boolean;
    otpVerified?: boolean;
  };
  
  // Credit evaluation
  creditEvaluation?: CreditEvaluation;
  
  // Loan offer
  loanOffer?: LoanOffer;
  offerAccepted?: boolean;
  
  // Document upload
  documents: DocumentsState;
  documentsComplete: boolean;
  uploadConfirmationReceived: boolean;
  
  // Approval
  approvalStatus?: ApprovalStatus;
  sanctionLetter?: SanctionLetter;
  
  // Chat history
  messages: Message[];
  
  // UI state
  isProcessing: boolean;
  error?: string;
}

// Reducer Actions
export type LoanFlowAction =
  | { type: 'SET_STEP'; payload: ConversationStep }
  | { type: 'GO_BACK' }
  | { type: 'ADD_MESSAGE'; payload: Message }
  | { type: 'SET_EMPLOYMENT_TYPE'; payload: EmploymentType }
  | { type: 'SET_MONTHLY_INCOME'; payload: number }
  | { type: 'SET_LOAN_AMOUNT'; payload: number }
  | { type: 'SET_TENURE'; payload: Tenure }
  | { type: 'SET_PERSONAL_DETAIL'; payload: { field: keyof PersonalDetails; value: string } }
  | { type: 'SET_OTP_VERIFIED'; payload: boolean }
  | { type: 'SET_KYC_CONSENT'; payload: boolean }
  | { type: 'START_CREDIT_EVALUATION' }
  | { type: 'SET_CREDIT_EVALUATION'; payload: CreditEvaluation }
  | { type: 'SET_LOAN_OFFER'; payload: LoanOffer }
  | { type: 'SET_OFFER_ACCEPTED'; payload: boolean }
  | { type: 'UPLOAD_DOCUMENT'; payload: { docType: keyof DocumentsState; file: DocumentFile } }
  | { type: 'UPDATE_DOCUMENT_PROGRESS'; payload: { docType: keyof DocumentsState; progress: number } }
  | { type: 'SET_DOCUMENT_STATUS'; payload: { docType: keyof DocumentsState; status: DocumentUploadStatus } }
  | { type: 'SET_DOCUMENTS_COMPLETE'; payload: boolean }
  | { type: 'SET_UPLOAD_CONFIRMATION'; payload: boolean }
  | { type: 'START_APPROVAL_PROCESSING' }
  | { type: 'SET_APPROVAL_STATUS'; payload: ApprovalStatus }
  | { type: 'GENERATE_SANCTION_LETTER'; payload: SanctionLetter }
  | { type: 'SET_PROCESSING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | undefined }
  | { type: 'RESET_FLOW' }
  | { type: 'LOAD_STATE'; payload: LoanFlowState }
  | { type: 'CLEAR_MESSAGES' };

// Initial document state
export const initialDocumentState: DocumentFile = {
  status: 'pending',
  progress: 0
};

// Initial state
export const initialLoanFlowState: LoanFlowState = {
  currentStep: ConversationStep.WELCOME,
  stepHistory: [],
  collectedData: {
    personalDetails: {}
  },
  documents: {
    salarySlip: { ...initialDocumentState },
    bankStatement: { ...initialDocumentState },
    addressProof: { ...initialDocumentState },
    selfie: { ...initialDocumentState }
  },
  documentsComplete: false,
  uploadConfirmationReceived: false,
  messages: [],
  isProcessing: false
};
