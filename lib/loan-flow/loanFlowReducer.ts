import { LoanFlowState, LoanFlowAction, initialLoanFlowState, ConversationStep } from './types';

export const loanFlowReducer = (
  state: LoanFlowState,
  action: LoanFlowAction
): LoanFlowState => {
  switch (action.type) {
    case 'SET_STEP': {
      const newStepHistory = [...state.stepHistory];
      if (state.currentStep !== action.payload) {
        newStepHistory.push(state.currentStep);
      }
      return {
        ...state,
        currentStep: action.payload,
        stepHistory: newStepHistory,
        error: undefined
      };
    }

    case 'GO_BACK': {
      if (state.stepHistory.length === 0) return state;
      
      const newHistory = [...state.stepHistory];
      const previousStep = newHistory.pop()!;
      
      return {
        ...state,
        currentStep: previousStep,
        stepHistory: newHistory,
        error: undefined
      };
    }

    case 'ADD_MESSAGE':
      return {
        ...state,
        messages: [...state.messages, action.payload]
      };

    case 'SET_EMPLOYMENT_TYPE':
      return {
        ...state,
        collectedData: {
          ...state.collectedData,
          employmentType: action.payload
        }
      };

    case 'SET_MONTHLY_INCOME':
      return {
        ...state,
        collectedData: {
          ...state.collectedData,
          monthlyIncome: action.payload
        }
      };

    case 'SET_LOAN_AMOUNT':
      return {
        ...state,
        collectedData: {
          ...state.collectedData,
          loanAmount: action.payload
        }
      };

    case 'SET_TENURE':
      return {
        ...state,
        collectedData: {
          ...state.collectedData,
          tenure: action.payload
        }
      };

    case 'SET_PERSONAL_DETAIL':
      return {
        ...state,
        collectedData: {
          ...state.collectedData,
          personalDetails: {
            ...state.collectedData.personalDetails,
            [action.payload.field]: action.payload.value
          }
        }
      };

    case 'SET_OTP_VERIFIED':
      return {
        ...state,
        collectedData: {
          ...state.collectedData,
          otpVerified: action.payload
        }
      };

    case 'SET_KYC_CONSENT':
      return {
        ...state,
        collectedData: {
          ...state.collectedData,
          kycConsent: action.payload
        }
      };

    case 'START_CREDIT_EVALUATION':
      return {
        ...state,
        isProcessing: true,
        creditEvaluation: {
          status: 'evaluating'
        }
      };

    case 'SET_CREDIT_EVALUATION':
      return {
        ...state,
        isProcessing: false,
        creditEvaluation: action.payload
      };

    case 'SET_LOAN_OFFER':
      return {
        ...state,
        loanOffer: action.payload
      };

    case 'SET_OFFER_ACCEPTED':
      return {
        ...state,
        offerAccepted: action.payload
      };

    case 'UPLOAD_DOCUMENT':
      return {
        ...state,
        documents: {
          ...state.documents,
          [action.payload.docType]: action.payload.file
        }
      };

    case 'UPDATE_DOCUMENT_PROGRESS':
      return {
        ...state,
        documents: {
          ...state.documents,
          [action.payload.docType]: {
            ...state.documents[action.payload.docType],
            progress: action.payload.progress,
            status: action.payload.progress === 100 ? 'uploaded' : 'uploading'
          }
        }
      };

    case 'SET_DOCUMENT_STATUS':
      return {
        ...state,
        documents: {
          ...state.documents,
          [action.payload.docType]: {
            ...state.documents[action.payload.docType],
            status: action.payload.status
          }
        }
      };

    case 'SET_DOCUMENTS_COMPLETE':
      return {
        ...state,
        documentsComplete: action.payload
      };

    case 'SET_UPLOAD_CONFIRMATION':
      return {
        ...state,
        uploadConfirmationReceived: action.payload
      };

    case 'START_APPROVAL_PROCESSING':
      return {
        ...state,
        isProcessing: true,
        approvalStatus: 'pending'
      };

    case 'SET_APPROVAL_STATUS':
      return {
        ...state,
        isProcessing: false,
        approvalStatus: action.payload
      };

    case 'GENERATE_SANCTION_LETTER':
      return {
        ...state,
        sanctionLetter: action.payload
      };

    case 'SET_PROCESSING':
      return {
        ...state,
        isProcessing: action.payload
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
        isProcessing: false
      };

    case 'RESET_FLOW':
      return {
        ...initialLoanFlowState,
        messages: []
      };

    case 'LOAD_STATE':
      return action.payload;

    default:
      return state;
  }
};