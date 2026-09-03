"use client"

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function RiskAssessment() {
  const router = useRouter();
  const [riskData, setRiskData] = useState<{
    creditScore: string | null;
    defaultStatus: number | null;
    defaultProbability: number | null;
    riskBucket?: string | null;
    explanationSummary?: Array<{ feature: string; impact: number; direction: string }> | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Get loan application data from sessionStorage
    const loanApplicationStr = sessionStorage.getItem('loanApplication');

    if (!loanApplicationStr) {
      // sessionStorage is a browser-only API: it can't be read in a useState
      // lazy initializer (that also runs during Next.js's server render of
      // this "use client" component), so this has to stay effect-driven
      // rather than moved to initial state the way Chatbot.tsx's welcome
      // message was.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setError('No loan application data found. Please submit a loan application first.');
      setLoading(false);
      return;
    }

    try {
      const loanApplication = JSON.parse(loanApplicationStr);
      
      // Check if predictions are available
      const creditScore = loanApplication.creditScore ?? loanApplication.credit_score ?? null;
      const defaultStatus = loanApplication.defaultStatus ?? loanApplication.default_status ?? null;
      const defaultProbability = loanApplication.defaultProbability ?? loanApplication.probability_of_default ?? null;
      const riskBucket = loanApplication.riskBucket ?? loanApplication.risk_bucket ?? null;
      const explanationSummary = loanApplication.explanationSummary ?? loanApplication.explanation_summary ?? [];

      if (creditScore !== null && defaultStatus !== null) {
        setRiskData({
          creditScore,
          defaultStatus,
          defaultProbability: defaultProbability || null,
          riskBucket,
          explanationSummary
        });
      } else if (loanApplication.predictionError) {
        // The API records the application even when scoring fails, and tells us why.
        setError(`Scoring failed: ${loanApplication.predictionError}. Your application was saved and can be re-scored.`);
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

  const riskBucketColor = (bucket?: string | null) => {
    if (!bucket) return 'bg-gray-100 text-gray-800';
    if (bucket === 'Low Risk') return 'bg-green-100 text-green-800';
    if (bucket === 'Medium Risk') return 'bg-yellow-100 text-yellow-800';
    if (bucket === 'High Risk') return 'bg-red-100 text-red-800';
    return 'bg-gray-100 text-gray-800';
  };

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
                  {riskData.creditScore !== null ? riskData.creditScore : 'N/A'}
                </div>
                <div className="mt-2 text-sm text-gray-500">
                  Predicted credit score
                </div>
              </div>
            </div>
          </div>

          {/* Default Risk Card */}
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border-t-4 border-indigo-500 transition-all duration-300 hover:shadow-xl transform hover:scale-[1.02]">
            <div className="px-8 py-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Default Risk</h3>
              <div className="flex flex-col items-center">
                <div className="text-5xl font-bold mb-4 w-40 h-40 rounded-full flex items-center justify-center text-indigo-600 bg-indigo-50">
                  {riskData.defaultProbability !== null
                    ? `${(riskData.defaultProbability * 100).toFixed(1)}%`
                    : 'N/A'}
                </div>
                <span className={`px-6 py-2 text-base font-medium rounded-full ${riskBucketColor(riskData.riskBucket)}`}>
                  {riskData.riskBucket || 'Risk bucket unavailable'}
                </span>
                <div className="mt-4 text-sm text-gray-600">
                  {riskData.defaultStatus === 0 ? 'Predicted Non-Default' : 'Predicted Default'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Explainability Section */}
        <div className="mt-10 grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-xl">
            <div className="px-8 py-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Top Risk Drivers</h3>
              <ul className="space-y-3">
                {(riskData.explanationSummary || []).length === 0 && (
                  <li className="text-sm text-gray-600">No explanation available for this prediction.</li>
                )}
                {(riskData.explanationSummary || []).map((item, idx) => (
                  <li key={`${item.feature}-${idx}`} className="flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-700">{item.feature}</span>
                    <span className={`${item.direction === 'increases' ? 'text-red-600' : 'text-green-600'}`}>
                      {item.direction === 'increases' ? '↑' : '↓'} {Math.abs(item.impact).toFixed(4)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          <div className="bg-white overflow-hidden shadow-lg rounded-xl border border-gray-200 transition-all duration-300 hover:shadow-xl">
            <div className="px-8 py-6">
              <h3 className="text-xl font-semibold text-gray-900 mb-6">Risk Explanation</h3>
              <div className="relative h-80 w-full bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                <Image 
                  src="/explanable-image.jpg"
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