'use client';

import React, { useState } from 'react';
import { useLoanFlow } from '@/lib/hooks/useLoanFlow';
import { useDocumentUpload } from '@/lib/hooks/useDocumentUpload';
import { ConversationStep, Message, EmploymentType } from '@/lib/loan-flow/types';
import AppShell from '@/components/layout/AppShell';
import ChatLayout from '@/components/chat/ChatLayout';
import ChatBubble from '@/components/chat/ChatBubble';
import CustomerSummaryCard from '@/components/summary/CustomerSummaryCard';
import { QuickReplyButtons } from '@/components/chat/QuickReplyButtons';
import { OTPInput } from '@/components/chat/OTPInput';
import { LoanOfferCard } from '@/components/chat/LoanOfferCard';
import { DocumentUploadModal } from '@/components/upload/DocumentUploadModal';
import { SanctionLetterModal } from '@/components/sanction/SanctionLetterModal';
import { generateSanctionLetterData, processApproval } from '@/lib/loan-flow/mockServices';
import { conversationSteps } from '@/lib/loan-flow/conversationSteps';

export default function HomePage() {
  const {
    state,
    dispatch,
    addBotMessage,
    addUserMessage,
    moveToNextStep,
    handleEmploymentType,
    handleMonthlyIncome,
    handleLoanAmount,
    handleTenure,
    handlePersonalDetail,
    handleOTPVerification,
    handleKYCConsent,
    handleOfferResponse,
  } = useLoanFlow();

  const documentUpload = useDocumentUpload({
    documents: state.documents,
    dispatch
  });

  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showSanctionModal, setShowSanctionModal] = useState(false);

  // Handle user input from chat message input
  const handleUserInput = async (rawInput: string) => {
    const input = rawInput.trim();
    if (!input || state.isProcessing) return;

    // Route input based on current step
    switch (state.currentStep) {
      case ConversationStep.MONTHLY_INCOME:
        await handleMonthlyIncome(input);
        break;

      case ConversationStep.LOAN_AMOUNT:
        await handleLoanAmount(input);
        break;

      case ConversationStep.PERSONAL_DETAILS_NAME:
        await handlePersonalDetail('fullName', input);
        break;

      case ConversationStep.PERSONAL_DETAILS_MOBILE:
        await handlePersonalDetail('mobile', input);
        break;

      case ConversationStep.PERSONAL_DETAILS_EMAIL:
        await handlePersonalDetail('email', input);
        break;

      case ConversationStep.PERSONAL_DETAILS_PAN:
        await handlePersonalDetail('pan', input);
        break;

      case ConversationStep.PERSONAL_DETAILS_AADHAAR:
        await handlePersonalDetail('aadhaar', input);
        break;

      case ConversationStep.DOCUMENT_UPLOAD_PROMPT:
        if (input.toLowerCase() === 'upload') {
          setShowDocumentModal(true);
          addUserMessage(input);
        }
        break;

      case ConversationStep.AWAITING_UPLOAD_CONFIRMATION:
        if (input === 'DoneDoneDone') {
          addUserMessage(input);
          dispatch({ type: 'SET_UPLOAD_CONFIRMATION', payload: true });

          // Capture state values before async operations
          const fullName = state.collectedData.personalDetails.fullName!;
          const loanOffer = state.loanOffer!;

          // Move to approval processing step
          dispatch({ type: 'SET_STEP', payload: ConversationStep.APPROVAL_PROCESSING });

          // Start approval processing
          setTimeout(async () => {
            addBotMessage("Processing your application and documents...\n\nVerifying details... ⏳");
            dispatch({ type: 'START_APPROVAL_PROCESSING' });

            const approval = await processApproval();
            dispatch({ type: 'SET_APPROVAL_STATUS', payload: approval });

            if (approval === 'approved') {
              // Acknowledgement after successful verification of salary slip and EMI check
              addBotMessage(
                'Great! Your salary slip has been analysed and your Loan EMI does not exceed 50% of your monthly salary!'
              );

              // Generate sanction letter using captured values
              const sanctionLetter = generateSanctionLetterData(fullName, loanOffer);
              dispatch({ type: 'GENERATE_SANCTION_LETTER', payload: sanctionLetter });

              // Move to approval success step
              dispatch({ type: 'SET_STEP', payload: ConversationStep.APPROVAL_SUCCESS });

              // Get the approval success message from conversationSteps
              const approvalSuccessMessage = conversationSteps[ConversationStep.APPROVAL_SUCCESS].botMessage;
              const message = typeof approvalSuccessMessage === 'function' 
                ? approvalSuccessMessage() 
                : approvalSuccessMessage;
                
              addBotMessage(message);
            }
          }, 1000);
        } else {
          addBotMessage("Please type 'DoneDoneDone' exactly to confirm document upload.");
        }
        break;

      default:
        addUserMessage(input);
    }
  };

  // Render current step UI
  const renderStepContent = () => {
    const lastMessage = state.messages[state.messages.length - 1];

    switch (state.currentStep) {
      case ConversationStep.EMPLOYMENT_TYPE:
        return (
          <QuickReplyButtons
            options={['Salaried', 'Self-Employed']}
            onSelect={(value) => handleEmploymentType(value as EmploymentType)}
            disabled={state.isProcessing}
          />
        );

      case ConversationStep.TENURE:
        return (
          <QuickReplyButtons
            options={['12 months', '24 months', '36 months', '48 months']}
            onSelect={handleTenure}
            disabled={state.isProcessing}
          />
        );

      case ConversationStep.OTP_VERIFICATION:
        return (
          <OTPInput
            onComplete={handleOTPVerification}
            disabled={state.isProcessing}
          />
        );

      case ConversationStep.KYC_CONSENT:
        return (
          <QuickReplyButtons
            options={['Yes, I consent', 'No']}
            onSelect={(value) => handleKYCConsent(value === 'Yes, I consent')}
            disabled={state.isProcessing}
          />
        );

      case ConversationStep.LOAN_OFFER:
        if (state.loanOffer) {
          return (
            <LoanOfferCard
              offer={state.loanOffer}
              onAccept={() => handleOfferResponse(true)}
              onReject={() => handleOfferResponse(false)}
              disabled={state.isProcessing}
            />
          );
        } else if (state.isProcessing) {
          return (
            <div className="flex justify-center my-4">
              <div className="bg-white px-4 py-3 rounded-lg shadow-md">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">⏳</div>
                  <span className="text-gray-600">Generating your loan offer...</span>
                </div>
              </div>
            </div>
          );
        }
        break;

      case ConversationStep.DOCUMENT_UPLOAD_PROMPT:
        return (
          <QuickReplyButtons
            options={['Upload Documents']}
            onSelect={() => setShowDocumentModal(true)}
            disabled={state.isProcessing}
          />
        );

      case ConversationStep.APPROVAL_SUCCESS:
        return (
          <QuickReplyButtons
            options={['View Sanction Letter', 'Download PDF']}
            onSelect={(option) => {
              if (option === 'View Sanction Letter' || option === 'Download PDF') {
                setShowSanctionModal(true);
              }
            }}
            disabled={state.isProcessing}
          />
        );
    }

    return null;
  };

  // Handle document modal completion
  const handleDocumentUploadComplete = () => {
    setShowDocumentModal(false);
    addBotMessage("Documents uploaded successfully! ✅\n\nPlease type 'DoneDoneDone' to confirm and proceed with approval.");
    dispatch({ type: 'SET_STEP', payload: ConversationStep.AWAITING_UPLOAD_CONFIRMATION });
  };

  return (
    <AppShell>
      <ChatLayout
        sidebar={<CustomerSummaryCard />}
        onSendMessage={handleUserInput}
        isLoading={state.isProcessing}
      >
        {/* Chat messages */}
        {state.messages.map((message: Message) => (
          <ChatBubble
            key={message.id}
            message={message.content}
            sender={message.type === 'user' ? 'user' : 'agent'}
            agentName="Master Agent"
          />
        ))}

        {/* Step-specific content */}
        <div className="mt-4 space-y-4">
          {renderStepContent()}

          {/* Error message */}
          {state.error && (
            <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg">
              ❌ {state.error}
            </div>
          )}

          {/* Processing indicator */}
          {state.isProcessing && (
            <div className="flex justify-start">
              <div className="bg-white dark:bg-gray-800 px-4 py-3 rounded-lg shadow-md">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">⏳</div>
                  <span className="text-gray-600 dark:text-gray-300">Processing...</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </ChatLayout>

      {/* Document Upload Modal */}
      <DocumentUploadModal
        isOpen={showDocumentModal}
        onClose={() => setShowDocumentModal(false)}
        documents={state.documents}
        onFileSelect={documentUpload.handleFileSelect}
        onRemove={documentUpload.removeDocument}
        canProceed={documentUpload.areAllDocumentsUploaded()}
        onProceed={handleDocumentUploadComplete}
      />

      {/* Sanction Letter Modal */}
      {state.sanctionLetter && (
        <SanctionLetterModal
          isOpen={showSanctionModal}
          onClose={() => setShowSanctionModal(false)}
          sanctionLetter={state.sanctionLetter}
        />
      )}
    </AppShell>
  );
}