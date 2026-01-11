"use client"

import ProtectedRoute from '@/components/protectedRoute';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';
import { useRouter } from "next/navigation";
import React from 'react';

export default function Dashboard() {
  const router = useRouter();
  return (
    <ProtectedRoute>
      <div className="min-h-screen bg-[var(--color-background)] text-white p-8">
      <h1 className="text-3xl font-bold mb-8 overflow-hidden">Credit Risk Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Active Applications */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 transition duration-300 hover:bg-gray-700">
          <div className="flex items-center text-white font-bold mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
            </svg>
            <span>Active Applications</span>
          </div>
          <div className="text-4xl font-bold text-[var(--color-golden)] mb-2 overflow-hidden">42</div>
          <div className="flex items-center text-green-400">
            <ArrowUpIcon className="h-4 w-4 mr-1" />
            <span>12% from last week</span>
          </div>
        </div>

        {/* Portfolio Value */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 transition duration-300 hover:bg-gray-700">
          <div className="flex items-center text-white font-bold mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
            </svg>
            <span>Portfolio Value</span>
          </div>
          <div className="text-4xl font-bold text-[var(--color-golden)] mb-2 overflow-hidden">$12.4M</div>
          <div className="flex items-center text-green-400">
            <ArrowUpIcon className="h-4 w-4 mr-1" />
            <span>3.2% from last month</span>
          </div>
        </div>

        {/* At-Risk Loans */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 transition duration-300 hover:bg-gray-700">
          <div className="flex items-center text-white font-bold mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>At-Risk Loans</span>
          </div>
          <div className="text-4xl font-bold text-[var(--color-golden)] mb-2 overflow-hidden">15</div>
          <div className="flex items-center text-red-400">
            <ArrowDownIcon className="h-4 w-4 mr-1" />
            <span>5% from last month</span>
          </div>
        </div>

        {/* Average Risk Score */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 transition duration-300 hover:bg-gray-700">
          <div className="flex items-center text-white font-bold mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <span>Average Risk Score</span>
          </div>
          <div className="text-4xl font-bold text-[var(--color-golden)] mb-2 overflow-hidden">72.4</div>
          <div className="flex items-center text-green-400">
            <ArrowUpIcon className="h-4 w-4 mr-1" />
            <span>1.8 points from last quarter</span>
          </div>
        </div>

        {/* Total Loans Given - New */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 transition duration-300 hover:bg-gray-700">
          <div className="flex items-center text-white font-bold mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
              <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
            </svg>
            <span>Total Loans Given</span>
          </div>
          <div className="text-4xl font-bold text-[var(--color-golden)] mb-2 overflow-hidden">178</div>
          <div className="flex items-center text-green-400">
            <ArrowUpIcon className="h-4 w-4 mr-1" />
            <span>7.2% from last quarter</span>
          </div>
        </div>

        {/* Successfully Paid Loans - New */}
        <div className="bg-gray-800 rounded-lg shadow-lg p-6 transition duration-300 hover:bg-gray-700">
          <div className="flex items-center text-white font-bold mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span>Successfully Paid Loans</span>
          </div>
          <div className="text-4xl font-bold text-[var(--color-golden)] mb-2 overflow-hidden">142</div>
          <div className="flex items-center text-green-400">
            <ArrowUpIcon className="h-4 w-4 mr-1" />
            <span>79.8% success rate</span>
          </div>
        </div>
      </div> 
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

    
