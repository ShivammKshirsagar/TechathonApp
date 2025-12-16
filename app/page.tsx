'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useLoanFlow } from '@/lib/hooks/useLoanFlow';
import { useDocumentUpload } from '@/lib/hooks/useDocumentUpload';
import { ConversationStep, Message, EmploymentType } from '@/lib/loan-flow/types';
import { QuickReplyButtons } from '@/components/chat/QuickReplyButtons';
import { OTPInput } from '@/components/chat/OTPInput';
import { LoanOfferCard } from '@/components/chat/LoanOfferCard';
import { DocumentUploadModal } from '@/components/upload/DocumentUploadModal';
import { SanctionLetterModal } from '@/components/sanction/SanctionLetterModal';
import { generateSanctionLetterData, processApproval } from '@/lib/loan-flow/mockServices';

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

  const [userInput, setUserInput] = useState('');
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [showSanctionModal, setShowSanctionModal] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.messages]);

  // Handle user input submission
  const handleSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!userInput.trim() || state.isProcessing) return;

    const input = userInput.trim();
    setUserInput('');

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
              // Generate sanction letter using captured values
              const sanctionLetter = generateSanctionLetterData(fullName, loanOffer);
              dispatch({ type: 'GENERATE_SANCTION_LETTER', payload: sanctionLetter });
              
              // Move to approval success step
              dispatch({ type: 'SET_STEP', payload: ConversationStep.APPROVAL_SUCCESS });
              
              setTimeout(() => {
                addBotMessage("🎊 Congratulations! Your loan has been approved!\n\nYour sanction letter is ready.");
              }, 1000);
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
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-4 shadow-lg">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">XYZ Finance</h1>
            <p className="text-sm text-blue-100">Personal Loan Assistant</p>
          </div>
          {state.currentStep !== ConversationStep.WELCOME && (
            <button
              onClick={() => {
                if (confirm('Are you sure you want to reset the conversation?')) {
                  localStorage.removeItem('loan-flow-state');
                  window.location.reload();
                }
              }}
              className="text-sm text-blue-100 hover:text-white underline"
            >
              Reset
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {state.messages.map((message: Message) => (
            <div
              key={message.id}
              className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xl px-4 py-3 rounded-lg whitespace-pre-line ${
                  message.type === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-800 shadow-md'
                }`}
              >
                {message.content}
              </div>
            </div>
          ))}

          {/* Step-specific content */}
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
              <div className="bg-white px-4 py-3 rounded-lg shadow-md">
                <div className="flex items-center space-x-2">
                  <div className="animate-pulse">⏳</div>
                  <span className="text-gray-600">Processing...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      {[
        ConversationStep.MONTHLY_INCOME,
        ConversationStep.LOAN_AMOUNT,
        ConversationStep.PERSONAL_DETAILS_NAME,
        ConversationStep.PERSONAL_DETAILS_MOBILE,
        ConversationStep.PERSONAL_DETAILS_EMAIL,
        ConversationStep.PERSONAL_DETAILS_PAN,
        ConversationStep.PERSONAL_DETAILS_AADHAAR,
        ConversationStep.DOCUMENT_UPLOAD_PROMPT,
        ConversationStep.AWAITING_UPLOAD_CONFIRMATION
      ].includes(state.currentStep) && (
        <div className="border-t bg-white p-4">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              placeholder="Type your response..."
              disabled={state.isProcessing}
              className="flex-1 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none 
                         focus:border-blue-500 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={state.isProcessing || !userInput.trim()}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold 
                         hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed 
                         transition-colors"
            >
              Send
            </button>
          </form>
        </div>
      )}

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
    </div>
  );
}