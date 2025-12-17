import { useReducer, useEffect, useCallback, useState } from 'react';
import { loanFlowReducer } from '../loan-flow/loanFlowReducer';
import { 
  initialLoanFlowState, 
  LoanFlowState, 
  ConversationStep,
  Message,
  EmploymentType,
  Tenure,
  PersonalDetails
} from '../loan-flow/types';
import { 
  validateMobile, 
  validateEmail, 
  validatePAN, 
  validateAadhaar,
  validateOTP,
  validateMonthlyIncome,
  validateLoanAmount,
  validateFullName
} from '../loan-flow/validators';
import { generateLoanOffer } from '../loan-flow/calculations';
import { 
  verifyOTP, 
  performCreditEvaluation,
  generateSanctionLetterData,
  processApproval
} from '../loan-flow/mockServices';
import { getNextStep } from '../loan-flow/conversationSteps';

const STORAGE_KEY = 'loan-flow-state';

export const useLoanFlow = () => {
  const [state, dispatch] = useReducer(loanFlowReducer, initialLoanFlowState);
  const [isInitialized, setIsInitialized] = useState(false);

  // Load state from localStorage on mount
  useEffect(() => {
    if (isInitialized) return;
    
    const initializeFlow = () => {
      // First, clear any existing messages
      dispatch({ type: 'CLEAR_MESSAGES' });
      
      // Set the initial step
      dispatch({ 
        type: 'SET_STEP', 
        payload: ConversationStep.EMPLOYMENT_TYPE 
      });
      
      // Add welcome message with a unique ID based on timestamp
      setTimeout(() => {
        const welcomeMessage: Message = {
          id: `welcome-${Date.now()}`,
          type: 'bot',
          content: "Welcome to XYZ Finance! 👋\n\nI'm here to help you get a personal loan quickly and easily.\n\nLet's get started!",
          timestamp: new Date().toISOString()
        };
        
        dispatch({ type: 'ADD_MESSAGE', payload: welcomeMessage });
        
        // Add employment message after a delay
        setTimeout(() => {
          const employmentMessage: Message = {
            id: `employment-${Date.now()}`,
            type: 'bot',
            content: "First, let me know your employment type:",
            timestamp: new Date().toISOString()
          };
          
          dispatch({ type: 'ADD_MESSAGE', payload: employmentMessage });
        }, 500);
      }, 0);
    };
    
    try {
      // Clear any existing state to prevent duplicates
      localStorage.removeItem(STORAGE_KEY);
      
      // Always initialize a fresh flow
      initializeFlow();
      
      setIsInitialized(true);
    } catch (error) {
      console.error('Failed to load state:', error);
      // Initialize as new user if there's an error
      initializeFlow();
      setIsInitialized(true);
    }
  }, [isInitialized, dispatch]);

  // Save state to localStorage whenever it changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      console.error('Failed to save state:', error);
    }
  }, [state]);

  // Add message to chat with duplicate prevention
  const addMessage = useCallback((message: Message) => {
    // Prevent adding duplicate messages with the same content within 2 seconds
    const isDuplicate = state.messages.some(
      msg => msg.content === message.content && 
             Date.now() - new Date(msg.timestamp).getTime() < 2000
    );
    
    if (!isDuplicate) {
      dispatch({ type: 'ADD_MESSAGE', payload: message });
    }
  }, [state.messages]);

  const addBotMessage = useCallback((content: string, metadata?: Message['metadata']) => {
    const message: Message = {
      id: `bot-${Date.now()}`,
      type: 'bot',
      content,
      timestamp: new Date().toISOString(),
      metadata
    };
    addMessage(message);
  }, [addMessage]);

  const addUserMessage = useCallback((content: string) => {
    const message: Message = {
      id: `user-${Date.now()}`,
      type: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    addMessage(message);
  }, [addMessage]);

  // Step navigation
  const moveToNextStep = useCallback(() => {
    const nextStep = getNextStep(state.currentStep);
    if (nextStep) {
      dispatch({ type: 'SET_STEP', payload: nextStep });
    }
  }, [state.currentStep]);

  const goBack = useCallback(() => {
    dispatch({ type: 'GO_BACK' });
  }, []);

  // Handle employment type
  const handleEmploymentType = useCallback(async (type: EmploymentType) => {
    dispatch({ type: 'SET_EMPLOYMENT_TYPE', payload: type });
    addUserMessage(type);
    moveToNextStep();
    setTimeout(() => {
      addBotMessage("What is your monthly income? (in ₹)");
    }, 500);
  }, [addUserMessage, moveToNextStep, addBotMessage]);

  // Handle monthly income
  const handleMonthlyIncome = useCallback(async (income: string) => {
    const incomeNum = parseFloat(income);
    const validation = validateMonthlyIncome(incomeNum);
    
    if (!validation.isValid) {
      dispatch({ type: 'SET_ERROR', payload: validation.error });
      return false;
    }

    dispatch({ type: 'SET_MONTHLY_INCOME', payload: incomeNum });
    addUserMessage(`₹${incomeNum.toLocaleString('en-IN')}`);
    moveToNextStep();
    const maxLoanAmount = incomeNum * 12; // 12x monthly income as max loan
    setTimeout(() => {
      addBotMessage(`How much would you like to borrow? (in ₹)\n\n*Maximum loan amount: ₹${maxLoanAmount.toLocaleString('en-IN')} (12x your monthly income)*`);
    }, 500);
    return true;
  }, [addUserMessage, moveToNextStep, addBotMessage]);

  // Handle loan amount
  const handleLoanAmount = useCallback(async (amount: string) => {
    const amountNum = parseFloat(amount);
    const validation = validateLoanAmount(amountNum, state.collectedData.monthlyIncome);
    
    if (!validation.isValid) {
      dispatch({ type: 'SET_ERROR', payload: validation.error });
      return false;
    }

    dispatch({ type: 'SET_LOAN_AMOUNT', payload: amountNum });
    addUserMessage(`₹${amountNum.toLocaleString('en-IN')}`);
    moveToNextStep();
    setTimeout(() => {
      addBotMessage("Select your preferred loan tenure:");
    }, 500);
    return true;
  }, [state.collectedData.monthlyIncome, addUserMessage, moveToNextStep, addBotMessage]);

  // Handle tenure
  const handleTenure = useCallback(async (tenure: string) => {
    const tenureNum = parseInt(tenure.split(' ')[0]) as Tenure;
    dispatch({ type: 'SET_TENURE', payload: tenureNum });
    addUserMessage(`${tenureNum} months`);
    moveToNextStep();
    setTimeout(() => {
      addBotMessage("Great! Now I need some personal details.\n\nWhat is your full name?");
    }, 500);
  }, [addUserMessage, moveToNextStep, addBotMessage]);

  // Handle personal details
  const handlePersonalDetail = useCallback(async (field: keyof PersonalDetails, value: string) => {
    let validation: { isValid: boolean; error?: string };
    
    switch (field) {
      case 'fullName':
        validation = validateFullName(value);
        break;
      case 'mobile':
        validation = validateMobile(value);
        break;
      case 'email':
        validation = validateEmail(value);
        break;
      case 'pan':
        validation = validatePAN(value);
        break;
      case 'aadhaar':
        validation = validateAadhaar(value);
        break;
      default:
        validation = { isValid: true };
        break;
    }

    if (!validation.isValid) {
      dispatch({ type: 'SET_ERROR', payload: validation.error });
      return false;
    }

    dispatch({ type: 'SET_PERSONAL_DETAIL', payload: { field, value } });
    addUserMessage(value);
    
    // Special handling for mobile - trigger OTP
    if (field === 'mobile') {
      moveToNextStep();
      setTimeout(() => {
        addBotMessage(`We've sent a 6-digit OTP to ${value}.\n\nPlease enter the OTP to verify:`);
      }, 500);
    } else {
      moveToNextStep();
      
      // Add appropriate next message
      setTimeout(() => {
        if (field === 'fullName') {
          addBotMessage("Please enter your mobile number:");
        } else if (field === 'email') {
          addBotMessage("Please enter your PAN number:");
        } else if (field === 'pan') {
          addBotMessage("Please enter your Aadhaar number:");
        } else if (field === 'aadhaar') {
          addBotMessage("Do you consent to KYC verification and credit bureau checks?\n\nThis is required to process your loan application.");
        }
      }, 500);
    }
    
    return true;
  }, [addUserMessage, moveToNextStep, addBotMessage]);

  // Handle OTP verification
  const handleOTPVerification = useCallback(async (otp: string) => {
    const validation = validateOTP(otp);
    
    if (!validation.isValid) {
      dispatch({ type: 'SET_ERROR', payload: validation.error });
      return false;
    }

    dispatch({ type: 'SET_PROCESSING', payload: true });
    
    const isValid = await verifyOTP(otp);
    
    if (!isValid) {
      dispatch({ type: 'SET_ERROR', payload: 'Invalid OTP. Please try again.' });
      dispatch({ type: 'SET_PROCESSING', payload: false });
      return false;
    }

    dispatch({ type: 'SET_OTP_VERIFIED', payload: true });
    dispatch({ type: 'SET_PROCESSING', payload: false });
    addUserMessage(otp);
    addBotMessage("✅ Mobile verified successfully!");
    moveToNextStep();
    
    setTimeout(() => {
      addBotMessage("What is your email address?");
    }, 1000);
    
    return true;
  }, [addUserMessage, addBotMessage, moveToNextStep]);

  // Handle KYC consent
  const handleKYCConsent = useCallback(async (consent: boolean) => {
    if (!consent) {
      addUserMessage("No");
      addBotMessage("We're sorry, but KYC consent is mandatory to process your loan application.\n\nPlease reach out if you change your mind!");
      return;
    }

    dispatch({ type: 'SET_KYC_CONSENT', payload: true });
    addUserMessage("Yes, I consent");
    
    // Capture current state values before async operations
    const pan = state.collectedData.personalDetails.pan!;
    const aadhaar = state.collectedData.personalDetails.aadhaar!;
    const monthlyIncome = state.collectedData.monthlyIncome!;
    const loanAmount = state.collectedData.loanAmount!;
    const tenure = state.collectedData.tenure!;
    const employmentType = state.collectedData.employmentType!;
    
    // Move to credit evaluation step first
    dispatch({ type: 'SET_STEP', payload: ConversationStep.CREDIT_EVALUATION });
    
    // Start credit evaluation
    setTimeout(async () => {
      addBotMessage("Evaluating your credit profile...\n\nThis will just take a moment. ⏳");
      dispatch({ type: 'START_CREDIT_EVALUATION' });
      
      const evaluation = await performCreditEvaluation(pan, aadhaar, monthlyIncome);
      
      dispatch({ type: 'SET_CREDIT_EVALUATION', payload: evaluation });
      
      if (evaluation.status === 'approved' && evaluation.score) {
        // Generate loan offer using captured values
        const offer = generateLoanOffer(loanAmount, tenure, evaluation.score, employmentType);
        
        // Set loan offer and move to LOAN_OFFER step
        dispatch({ type: 'SET_LOAN_OFFER', payload: offer });
        dispatch({ type: 'SET_STEP', payload: ConversationStep.LOAN_OFFER });
        
        setTimeout(() => {
          addBotMessage("Great news! Your loan has been pre-approved. 🎉\n\nHere's your personalized offer:");
        }, 1000);
      } else {
        addBotMessage("We're sorry, but we couldn't approve your loan at this time based on your credit profile.\n\nPlease feel free to reapply after improving your credit score.");
      }
    }, 1000);
  }, [state.collectedData, addUserMessage, addBotMessage, dispatch]);

  // Handle offer response
  const handleOfferResponse = useCallback((accepted: boolean) => {
    dispatch({ type: 'SET_OFFER_ACCEPTED', payload: accepted });
    
    if (!accepted) {
      addUserMessage("Reject Offer");
      addBotMessage("We understand. Thank you for considering XYZ Finance.\n\nFeel free to reach out if you change your mind!");
      return;
    }

    addUserMessage("Accept Offer");
    
    // Move to document upload prompt step
    dispatch({ type: 'SET_STEP', payload: ConversationStep.DOCUMENT_UPLOAD_PROMPT });
    
    setTimeout(() => {
      addBotMessage("Excellent! To proceed, please upload the required documents.\n\nType 'upload' when you're ready, or click the button below.");
    }, 500);
  }, [addUserMessage, addBotMessage, dispatch]);

  // Reset flow
  const resetFlow = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'RESET_FLOW' });
  }, []);

  return {
    state,
    dispatch,
    addBotMessage,
    addUserMessage,
    moveToNextStep,
    goBack,
    handleEmploymentType,
    handleMonthlyIncome,
    handleLoanAmount,
    handleTenure,
    handlePersonalDetail,
    handleOTPVerification,
    handleKYCConsent,
    handleOfferResponse,
    resetFlow
  };
};