"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function RiskAssessment() {
  const router = useRouter();
  const [riskData, setRiskData] = useState<{
    creditScore: number | null;
    defaultStatus: number | null;
    defaultProbability: number | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get loan application data from sessionStorage
    const loanApplicationStr = sessionStorage.getItem('loanApplication');
    
    if (!loanApplicationStr) {
      setError('No loan application data found. Please submit a loan application first.');
      setLoading(false);
      return;
    }

    try {
      const loanApplication = JSON.parse(loanApplicationStr);
      
      // Check if predictions are available
      if (loanApplication.creditScore !== undefined && loanApplication.defaultStatus !== undefined) {
        setRiskData({
          creditScore: loanApplication.creditScore,
          defaultStatus: loanApplication.defaultStatus,
          defaultProbability: loanApplication.defaultProbability || null
        });
      } else {
        setError('Prediction data not available. The ML models may not have processed the application yet.');
      }
    } catch (err) {
      setError('Failed to parse loan application data.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-text)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-white">Loading predictions...</p>
        </div>
      </div>
    );
  }

  if (error || !riskData) {
    return (
      <div className="min-h-screen bg-[var(--color-text)] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold text-red-600 mb-4">Error</h2>
          <p className="text-gray-700 mb-6">{error || 'Unable to load prediction data'}</p>
          <button
            onClick={() => router.push('/form')}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Go Back to Form
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--color-text)] relative">
        {/* Financial icon patterns - subtle background elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl">$</div>
        <div className="absolute top-20 right-20 text-8xl">%</div>
        <div className="absolute bottom-10 left-1/4 text-7xl">¢</div>
        <div className="absolute top-1/3 right-1/3 text-5xl">€</div>
        <div className="absolute bottom-20 right-40 text-6xl">£</div>
      </div>
      <div className="max-w-4xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl tracking-tight">
            Risk Assessment
          </h1>
          <p className="mt-3 text-xl text-gray-600">
            ML-powered risk prediction
          </p>
          <div className="mt-4 h-1 w-24 bg-indigo-600 mx-auto rounded-full"></div>
        </div>

        {/* Results Grid */}
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Credit Score Card */}
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-xl transform hover:scale-[1.02]">
            <div className="px-8 py-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Credit Score</h3>
              <div className="flex flex-col items-center">
                <div className="text-6xl font-bold text-indigo-600 bg-indigo-50 w-40 h-40 rounded-full flex items-center justify-center mb-4">
                  {riskData.creditScore !== null ? riskData.creditScore.toFixed(2) : 'N/A'}
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Predicted credit score
                </div>
              </div>
            </div>
          </div>

          {/* Default Status Card */}
          <div className={`bg-white overflow-hidden shadow-lg rounded-xl border-t-4 transition-all duration-300 hover:shadow-xl transform hover:scale-[1.02] ${
            riskData.defaultStatus === 0 ? 'border-green-500' : 'border-red-500'
          }`}>
            <div className="px-8 py-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Default Status</h3>
              <div className="flex flex-col items-center">
                <div className={`text-6xl font-bold mb-4 w-40 h-40 rounded-full flex items-center justify-center ${
                  riskData.defaultStatus === 0 
                    ? 'text-green-600 bg-green-50' 
                    : 'text-red-600 bg-red-50'
                }`}>
                  {riskData.defaultStatus}
                </div>
                <span className={`px-6 py-2 text-base font-medium rounded-full ${
                  riskData.defaultStatus === 0 
                    ? 'bg-green-100 text-green-800' 
                    : 'bg-red-100 text-red-800'
                }`}>
                  {riskData.defaultStatus === 0 ? 'Non-Default' : 'Default'}
                </span>
                {riskData.defaultProbability !== null && (
                  <div className="mt-4 text-sm text-gray-600">
                    Probability: {(riskData.defaultProbability * 100).toFixed(2)}%
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Image Display Section */}
        <div className="mt-10 bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-xl">
          <div className="px-8 py-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-6">Risk Explanation</h3>
            <div className="relative h-80 w-full bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
              <Image 
                src="/explanable-image.jpg" // Use the imported image
                alt="Risk explanation visualization"
                layout="fill"
                objectFit="contain"
                quality={100}
                className="p-4"
              />
            </div>
            <div className="mt-4 text-sm text-gray-600 italic text-center">
              <p>Visualization showing key factors contributing to the risk assessment.</p>
            </div>
          </div>
        </div>

        {/* Footer Note */}
        <div className="mt-10 text-center text-sm text-gray-500 border-t border-gray-200 pt-6">
          <p>Assessment performed on {new Date().toLocaleDateString()}</p>
        </div>
      </div>
      <button
      className="fixed bottom-6 right-6 bg-[var(--color-golden)] text-black px-4 py-3 rounded-full shadow-lg hover:scale-105 transition-transform duration-300"
      onClick={() => router.push('/guide')}
    >
      💬 Chat
    </button>
    </div>
  );
}