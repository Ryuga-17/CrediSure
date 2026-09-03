"use client"

import ProtectedRoute from '@/components/protectedRoute';
import { useRouter } from "next/navigation";
import { useEffect, useState } from 'react';
import api from '@/lib/api';

type LoanApplication = {
  _id: string;
  loanAmount: number;
  status: 'pending' | 'approved' | 'rejected';
  creditScore?: number;
};

export default function Dashboard() {
  const router = useRouter();
  const [applications, setApplications] = useState<LoanApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadApplications = async () => {
      try {
        const { data } = await api.get<LoanApplication[]>('/loans');
        setApplications(data);
      } catch (err) {
        console.error(err);
        setError('Could not load your applications.');
      } finally {
        setLoading(false);
      }
    };
    loadApplications();
  }, []);

  const pendingCount = applications.filter((a) => a.status === 'pending').length;
  const approvedCount = applications.filter((a) => a.status === 'approved').length;
  const rejectedCount = applications.filter((a) => a.status === 'rejected').length;
  const totalRequested = applications.reduce((sum, a) => sum + (a.loanAmount || 0), 0);

  const scored = applications.filter((a) => typeof a.creditScore === 'number');
  const averageRiskScore = scored.length > 0
    ? scored.reduce((sum, a) => sum + (a.creditScore || 0), 0) / scored.length
    : null;

  const tiles = [
    { label: 'Your Applications', value: applications.length },
    { label: 'Pending', value: pendingCount },
    { label: 'Approved', value: approvedCount },
    { label: 'Rejected', value: rejectedCount },
    {
      label: 'Average Credit Score',
      value: averageRiskScore !== null ? averageRiskScore.toFixed(0) : '—',
    },
    { label: 'Total Requested', value: `$${totalRequested.toLocaleString()}` },
  ];

  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--color-background)] text-white p-8">
        <h1 className="text-3xl font-bold mb-8 overflow-hidden">Your Loan Applications</h1>

        {loading && <p className="text-slate-300">Loading your applications...</p>}
        {error && <p className="text-red-400">{error}</p>}

        {!loading && !error && applications.length === 0 && (
          <p className="text-slate-300 mb-8">
            You haven&apos;t submitted any loan applications yet.
          </p>
        )}

        {!loading && !error && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tiles.map((tile) => (
              <div
                key={tile.label}
                className="bg-gray-800 rounded-lg shadow-lg p-6 transition duration-300 hover:bg-gray-700"
              >
                <div className="text-white font-bold mb-2">{tile.label}</div>
                <div className="text-4xl font-bold text-[var(--color-golden)] mb-2 overflow-hidden">
                  {tile.value}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-center mt-8">
          <a
            href="/form"
            className="mt-6 inline-block bg-[var(--color-golden)] text-[var(--color-background)] px-6 py-3 rounded-lg text-lg font-semibold shadow-md transition-all duration-300
            hover:bg-[var(--color-muted-gold)] hover:shadow-lg hover:scale-105 hover:text-black">
            Let&apos;s Analyze
          </a>
        </div>
      </div>
      <button
        className="fixed bottom-6 right-6 bg-[var(--color-golden)] text-black px-4 py-3 rounded-full shadow-lg hover:scale-105 transition-transform duration-300"
        onClick={() => router.push('/guide')}
      >
        💬 Chat
      </button>
    </ProtectedRoute>
  );
}
