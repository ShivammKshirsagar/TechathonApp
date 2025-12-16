import { ConversationStep } from './types';

export interface StepConfig {
  step: ConversationStep;
  botMessage: string | ((data?: any) => string);
  inputType: 'buttons' | 'text' | 'number' | 'otp' | 'modal' | 'none';
  options?: string[];
  nextStep?: ConversationStep;
  validateInput?: boolean;
}

export const conversationSteps: Record<ConversationStep, StepConfig> = {
  [ConversationStep.WELCOME]: {
    step: ConversationStep.WELCOME,
    botMessage: "Welcome to XYZ Finance! 👋\n\nI'm here to help you get a personal loan quickly and easily.\n\nLet's get started!",
    inputType: 'none',
    nextStep: ConversationStep.EMPLOYMENT_TYPE
  },

  [ConversationStep.EMPLOYMENT_TYPE]: {
    step: ConversationStep.EMPLOYMENT_TYPE,
    botMessage: "First, let me know your employment type:",
    inputType: 'buttons',
    options: ['Salaried', 'Self-Employed'],
    nextStep: ConversationStep.MONTHLY_INCOME
  },

  [ConversationStep.MONTHLY_INCOME]: {
    step: ConversationStep.MONTHLY_INCOME,
    botMessage: "What is your monthly income? (in ₹)",
    inputType: 'number',
    validateInput: true,
    nextStep: ConversationStep.LOAN_AMOUNT
  },

  [ConversationStep.LOAN_AMOUNT]: {
    step: ConversationStep.LOAN_AMOUNT,
    botMessage: "How much would you like to borrow? (in ₹)",
    inputType: 'number',
    validateInput: true,
    nextStep: ConversationStep.TENURE
  },

  [ConversationStep.TENURE]: {
    step: ConversationStep.TENURE,
    botMessage: "Select your preferred loan tenure:",
    inputType: 'buttons',
    options: ['12 months', '24 months', '36 months', '48 months'],
    nextStep: ConversationStep.PERSONAL_DETAILS_NAME
  },

  [ConversationStep.PERSONAL_DETAILS_NAME]: {
    step: ConversationStep.PERSONAL_DETAILS_NAME,
    botMessage: "Great! Now I need some personal details.\n\nWhat is your full name?",
    inputType: 'text',
    validateInput: true,
    nextStep: ConversationStep.PERSONAL_DETAILS_MOBILE
  },

  [ConversationStep.PERSONAL_DETAILS_MOBILE]: {
    step: ConversationStep.PERSONAL_DETAILS_MOBILE,
    botMessage: "Please enter your mobile number:",
    inputType: 'text',
    validateInput: true,
    nextStep: ConversationStep.OTP_VERIFICATION
  },

  [ConversationStep.OTP_VERIFICATION]: {
    step: ConversationStep.OTP_VERIFICATION,
    botMessage: (mobile?: string) => 
      `We've sent a 6-digit OTP to ${mobile || 'your mobile'}.\n\nPlease enter the OTP to verify:`,
    inputType: 'otp',
    validateInput: true,
    nextStep: ConversationStep.PERSONAL_DETAILS_EMAIL
  },

  [ConversationStep.PERSONAL_DETAILS_EMAIL]: {
    step: ConversationStep.PERSONAL_DETAILS_EMAIL,
    botMessage: "What is your email address?",
    inputType: 'text',
    validateInput: true,
    nextStep: ConversationStep.PERSONAL_DETAILS_PAN
  },

  [ConversationStep.PERSONAL_DETAILS_PAN]: {
    step: ConversationStep.PERSONAL_DETAILS_PAN,
    botMessage: "Please enter your PAN number:",
    inputType: 'text',
    validateInput: true,
    nextStep: ConversationStep.PERSONAL_DETAILS_AADHAAR
  },

  [ConversationStep.PERSONAL_DETAILS_AADHAAR]: {
    step: ConversationStep.PERSONAL_DETAILS_AADHAAR,
    botMessage: "Please enter your Aadhaar number:",
    inputType: 'text',
    validateInput: true,
    nextStep: ConversationStep.KYC_CONSENT
  },

  [ConversationStep.KYC_CONSENT]: {
    step: ConversationStep.KYC_CONSENT,
    botMessage: "Do you consent to KYC verification and credit bureau checks?\n\nThis is required to process your loan application.",
    inputType: 'buttons',
    options: ['Yes, I consent', 'No'],
    nextStep: ConversationStep.CREDIT_EVALUATION
  },

  [ConversationStep.CREDIT_EVALUATION]: {
    step: ConversationStep.CREDIT_EVALUATION,
    botMessage: "Evaluating your credit profile...\n\nThis will just take a moment. ⏳",
    inputType: 'none',
    nextStep: ConversationStep.LOAN_OFFER
  },

  [ConversationStep.LOAN_OFFER]: {
    step: ConversationStep.LOAN_OFFER,
    botMessage: "Great news! Your loan has been pre-approved. 🎉\n\nHere's your personalized offer:",
    inputType: 'buttons',
    options: ['Accept Offer', 'Reject Offer'],
    nextStep: ConversationStep.DOCUMENT_UPLOAD_PROMPT
  },

  [ConversationStep.DOCUMENT_UPLOAD_PROMPT]: {
    step: ConversationStep.DOCUMENT_UPLOAD_PROMPT,
    botMessage: "Excellent! To proceed, please upload the required documents.\n\nType 'upload' when you're ready, or click the button below.",
    inputType: 'buttons',
    options: ['Upload Documents'],
    nextStep: ConversationStep.DOCUMENT_UPLOAD
  },

  [ConversationStep.DOCUMENT_UPLOAD]: {
    step: ConversationStep.DOCUMENT_UPLOAD,
    botMessage: "Please upload all required documents:",
    inputType: 'modal',
    nextStep: ConversationStep.AWAITING_UPLOAD_CONFIRMATION
  },

  [ConversationStep.AWAITING_UPLOAD_CONFIRMATION]: {
    step: ConversationStep.AWAITING_UPLOAD_CONFIRMATION,
    botMessage: "Documents uploaded successfully! ✅\n\nPlease type 'DoneDoneDone' to confirm and proceed with approval.",
    inputType: 'text',
    nextStep: ConversationStep.APPROVAL_PROCESSING
  },

  [ConversationStep.APPROVAL_PROCESSING]: {
    step: ConversationStep.APPROVAL_PROCESSING,
    botMessage: "Processing your application and documents...\n\nVerifying details... ⏳",
    inputType: 'none',
    nextStep: ConversationStep.APPROVAL_SUCCESS
  },

  [ConversationStep.APPROVAL_SUCCESS]: {
    step: ConversationStep.APPROVAL_SUCCESS,
    botMessage: "🎊 Congratulations! Your loan has been approved!\n\nYour sanction letter is ready.",
    inputType: 'buttons',
    options: ['View Sanction Letter', 'Download PDF'],
    nextStep: ConversationStep.COMPLETE
  },

  [ConversationStep.COMPLETE]: {
    step: ConversationStep.COMPLETE,
    botMessage: "Thank you for choosing XYZ Finance!\n\nYour loan will be disbursed within 24 hours.\n\nIs there anything else I can help you with?",
    inputType: 'none'
  }
};

export const getStepConfig = (step: ConversationStep): StepConfig => {
  return conversationSteps[step];
};

export const getNextStep = (currentStep: ConversationStep): ConversationStep | undefined => {
  return conversationSteps[currentStep].nextStep;
};