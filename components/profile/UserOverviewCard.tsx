import { User, Phone, Mail, MapPin, CheckCircle, Clock } from 'lucide-react';

interface UserOverviewProps {
  name: string;
  customerId: string;
  phone: string;
  email: string;
  city: string;
  kycStatus: 'Verified' | 'Pending';
  lastUpdated: string;
}

export default function UserOverviewCard({
  name,
  customerId,
  phone,
  email,
  city,
  kycStatus,
  lastUpdated
}: UserOverviewProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Profile Avatar */}
        <div className="flex-shrink-0">
          <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-teal-500 rounded-full flex items-center justify-center">
            <User className="w-12 h-12 text-white" />
          </div>
        </div>

        {/* User Details */}
        <div className="flex-1 space-y-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
              {name}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Customer ID: {customerId}
            </p>
          </div>

          {/* Contact Info Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Phone className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Phone</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{phone}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <Mail className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{email}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">City</p>
                <p className="text-sm font-semibold text-gray-900 dark:text-white">{city}</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                kycStatus === 'Verified' 
                  ? 'bg-green-50 dark:bg-green-900/30' 
                  : 'bg-orange-50 dark:bg-orange-900/30'
              }`}>
                {kycStatus === 'Verified' ? (
                  <CheckCircle className="w-5 h-5 text-green-600 dark:text-green-400" />
                ) : (
                  <Clock className="w-5 h-5 text-orange-600 dark:text-orange-400" />
                )}
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400">KYC Status</p>
                <span className={`text-sm font-semibold ${
                  kycStatus === 'Verified' 
                    ? 'text-green-600 dark:text-green-400' 
                    : 'text-orange-600 dark:text-orange-400'
                }`}>
                  {kycStatus}
                </span>
              </div>
            </div>
          </div>

          {/* Last Updated */}
          <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Last updated: {lastUpdated}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}