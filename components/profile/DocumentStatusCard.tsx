import { FileText, CheckCircle, AlertCircle, XCircle } from 'lucide-react';

interface Document {
  name: string;
  status: 'verified' | 'pending' | 'missing';
  uploadedDate?: string;
}

interface DocumentStatusCardProps {
  documents: Document[];
}

export default function DocumentStatusCard({ documents }: DocumentStatusCardProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />;
      case 'pending':
        return <AlertCircle className="w-5 h-5 text-orange-600 dark:text-orange-400" />;
      case 'missing':
        return <XCircle className="w-5 h-5 text-red-600 dark:text-red-400" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return (
          <span className="px-2.5 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-xs font-semibold rounded-full">
            ✓ Verified
          </span>
        );
      case 'pending':
        return (
          <span className="px-2.5 py-1 bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-xs font-semibold rounded-full">
            ! Pending
          </span>
        );
      case 'missing':
        return (
          <span className="px-2.5 py-1 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-xs font-semibold rounded-full">
            ✗ Missing
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-6">
        Document Status
      </h3>
      <div className="space-y-4">
        {documents.map((doc, index) => (
          <div
            key={index}
            className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 dark:text-white">{doc.name}</p>
                {doc.uploadedDate && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Uploaded: {doc.uploadedDate}
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {getStatusIcon(doc.status)}
              {getStatusBadge(doc.status)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

