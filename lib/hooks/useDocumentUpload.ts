import { useCallback } from 'react';
import { DocumentsState, DocumentFile, LoanFlowAction } from '../loan-flow/types';
import { validateFile } from '../loan-flow/validators';
import { uploadFile } from '../loan-flow/mockServices';

type DocumentType = keyof DocumentsState;

interface UseDocumentUploadProps {
  documents: DocumentsState;
  dispatch: React.Dispatch<LoanFlowAction>;
}

export const useDocumentUpload = ({ documents, dispatch }: UseDocumentUploadProps) => {
  
  // Check if all documents are uploaded
  const areAllDocumentsUploaded = useCallback((): boolean => {
    return Object.values(documents).every(doc => doc.status === 'uploaded');
  }, [documents]);

  // Handle file selection
  const handleFileSelect = useCallback(async (
    docType: DocumentType,
    file: File
  ): Promise<boolean> => {
    // Validate file
    const validation = validateFile(file);
    if (!validation.isValid) {
      dispatch({ 
        type: 'SET_ERROR', 
        payload: validation.error 
      });
      return false;
    }

    // Set initial upload state
    const documentFile: DocumentFile = {
      file,
      status: 'uploading',
      progress: 0,
      fileName: file.name,
      fileSize: file.size
    };

    dispatch({
      type: 'UPLOAD_DOCUMENT',
      payload: { docType, file: documentFile }
    });

    try {
      // Upload file with progress tracking
      const { url, base64 } = await uploadFile(file, docType, (progress) => {
        dispatch({
          type: 'UPDATE_DOCUMENT_PROGRESS',
          payload: { docType, progress }
        });
      });

      // Update document with uploaded URL and base64
      dispatch({
        type: 'UPLOAD_DOCUMENT',
        payload: {
          docType,
          file: {
            ...documentFile,
            status: 'uploaded',
            progress: 100,
            url,
            base64,
            uploadedAt: new Date().toISOString()
          }
        }
      });

      return true;
    } catch (error) {
      dispatch({
        type: 'SET_DOCUMENT_STATUS',
        payload: { docType, status: 'error' }
      });
      dispatch({
        type: 'SET_ERROR',
        payload: 'Upload failed. Please try again.'
      });
      return false;
    }
  }, [dispatch]);

  // Remove uploaded document
  const removeDocument = useCallback((docType: DocumentType) => {
    dispatch({
      type: 'UPLOAD_DOCUMENT',
      payload: {
        docType,
        file: {
          status: 'pending',
          progress: 0
        }
      }
    });
  }, [dispatch]);

  // Get document by type
  const getDocument = useCallback((docType: DocumentType): DocumentFile => {
    return documents[docType];
  }, [documents]);

  // Get upload progress summary
  const getUploadSummary = useCallback(() => {
    const total = 4;
    const uploaded = Object.values(documents).filter(
      doc => doc.status === 'uploaded'
    ).length;
    const uploading = Object.values(documents).filter(
      doc => doc.status === 'uploading'
    ).length;
    
    return {
      total,
      uploaded,
      uploading,
      pending: total - uploaded - uploading,
      isComplete: uploaded === total,
      percentage: Math.round((uploaded / total) * 100)
    };
  }, [documents]);

  return {
    handleFileSelect,
    removeDocument,
    getDocument,
    areAllDocumentsUploaded,
    getUploadSummary
  };
};
