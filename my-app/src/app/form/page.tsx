"use client";

import React, { useState } from 'react';
import { useRouter } from "next/navigation";
import api from '@/lib/api';

const FinancialForm = () => {
  const initialFormState = {
    name: '',
    age: '',
    income: '',
    existingDebtPayments: '',
    loanAmount: '',
    loanRate: '',
    loanTerm: '',
    hasDependents: false,
    hasMortgage: false,
    loanPurpose: ''
  };

  const [formData, setFormData] = useState(initialFormState);

  const loanPurposeOptions = [
    'Business',
    'Home',
    'Education',
    'Automobile',
    'Others'
  ];

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement | HTMLSelectElement;
    const { name, value } = target;
    const checked = 'checked' in target ? target.checked : false;
    const type = 'type' in target ? target.type : '';
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleReset = () => {
    setFormData(initialFormState);
  };

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError('');
    
    // Validate no negative values
    const numericalFields = ['age', 'income', 'existingDebtPayments', 'loanAmount', 'loanRate', 'loanTerm'];
    const hasNegativeValues = numericalFields.some(field => {
      const value = parseFloat(formData[field]);
      return value < 0;
    });

    if (hasNegativeValues) {
      setError('Please enter positive values for all numerical fields');
      return;
    }

    // Validate required fields
    if (!formData.name || !formData.age || !formData.income || !formData.loanAmount || 
        !formData.loanRate || !formData.loanTerm || !formData.loanPurpose) {
      setError('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Submit to backend API
      const response = await api.post('/loans', {
        name: formData.name,
        age: parseFloat(formData.age),
        income: parseFloat(formData.income),
        existingDebtPayment: parseFloat(formData.existingDebtPayments || 0),
        loanAmount: parseFloat(formData.loanAmount),
        loanRate: parseFloat(formData.loanRate),
        loanTerm: parseFloat(formData.loanTerm),
        hasDependents: formData.hasDependents,
        hasMortgage: formData.hasMortgage,
        loanPurpose: formData.loanPurpose
      });

      // Store application data in sessionStorage to pass to output page
      sessionStorage.setItem('loanApplication', JSON.stringify(response.data));

      // Redirect to output page
      router.push('/output');
    } catch (err: unknown) {
      console.error('Form submission error:', err);
      let errorMessage = 'Failed to submit application. Please try again.';
      if (err && typeof err === 'object' && 'response' in err) {
        const response = (err as { response?: { data?: { error?: string; details?: string } } }).response;
        errorMessage = response?.data?.error || response?.data?.details || errorMessage;
      } else if (err instanceof Error) {
        errorMessage = err.message;
      }
      setError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const router = useRouter();

  return (
    <div className="min-h-screen flex items-center justify-center p-4 relative overflow-hidden bg-[url('/api/placeholder/1920/1080')] bg-cover bg-center before:content-[''] before:absolute before:inset-0 before:bg-[var(--color-text)] before:backdrop-blur-sm">
      {/* Financial icon patterns - subtle background elements */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 text-6xl">$</div>
        <div className="absolute top-20 right-20 text-8xl">%</div>
        <div className="absolute bottom-10 left-1/4 text-7xl">¢</div>
        <div className="absolute top-1/3 right-1/3 text-5xl">€</div>
        <div className="absolute bottom-20 right-40 text-6xl">£</div>
      </div>
      
      {/* Form card */}
      <div className="w-full max-w-2xl bg-white/95 rounded-3xl shadow-2xl overflow-hidden z-10 transition-all duration-300 border border-white/30 hover:shadow-blue-500/20 backdrop-blur-md">
        <div className="p-8">
          <div className="text-center mb-8">
            <div className="mb-4 flex justify-center">
              <div className="w-20 h-2 bg-[var(--color-golden)] rounded-full"></div>
            </div>
            <h1 className="text-3xl font-bold ">
              Financial Information Form
            </h1>
            <p className="mt-3 text-gray-600">Please enter your details below to proceed</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* Personal Information */}
              <div className="group">
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-blue-600 transition-colors">
                  Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-base bg-white/80 text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-400"
                  required
                />
              </div>

              <div className="group">
                <label htmlFor="age" className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-blue-600 transition-colors">
                  Age
                </label>
                <input
                  type="number"
                  name="age"
                  id="age"
                  min="0"
                  value={formData.age}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-base bg-white/80 text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-400"
                  required
                />
              </div>

              {/* Financial Information */}
              <div className="group">
                <label htmlFor="income" className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-blue-600 transition-colors">
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Income ($)
                  </span>
                </label>
                <input
                  type="number"
                  name="income"
                  id="income"
                  min="0"
                  step="0.01"
                  value={formData.income}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-base bg-white/80 text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-400"
                  required
                />
              </div>

              <div className="group">
                <label htmlFor="existingDebtPayments" className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-blue-600 transition-colors">
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20 12H4"></path>
                    </svg>
                    Existing Debt ($/month)
                  </span>
                </label>
                <input
                  type="number"
                  name="existingDebtPayments"
                  id="existingDebtPayments"
                  min="0"
                  step="0.01"
                  value={formData.existingDebtPayments}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-base bg-white/80 text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-400"
                  required
                />
              </div>

              {/* Loan Information */}
              <div className="group">
                <label htmlFor="loanAmount" className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-blue-600 transition-colors">
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2z"></path>
                    </svg>
                    Loan Amount ($)
                  </span>
                </label>
                <input
                  type="number"
                  name="loanAmount"
                  id="loanAmount"
                  min="0"
                  step="0.01"
                  value={formData.loanAmount}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-base bg-white/80 text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-400"
                  required
                />
              </div>

              <div className="group">
                <label htmlFor="loanRate" className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-blue-600 transition-colors">
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z"></path>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z"></path>
                    </svg>
                    Loan Rate (%)
                  </span>
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  name="loanRate"
                  id="loanRate"
                  value={formData.loanRate}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-base bg-white/80 text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-400"
                  required
                />
              </div>

              {/* Loan Term and Purpose */}
              <div className="group">
                <label htmlFor="loanTerm" className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-blue-600 transition-colors">
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    Loan Term (years)
                  </span>
                </label>
                <input
                  type="number"
                  name="loanTerm"
                  id="loanTerm"
                  min="0"
                  value={formData.loanTerm}
                  onChange={handleChange}
                  className="w-full px-4 py-3 text-base bg-white/80 text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-400"
                  required
                />
              </div>

              <div className="group">
                <label htmlFor="loanPurpose" className="block text-sm font-medium text-gray-700 mb-1 group-focus-within:text-blue-600 transition-colors">
                  <span className="inline-flex items-center">
                    <svg className="w-4 h-4 mr-1 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"></path>
                    </svg>
                    Loan Purpose
                  </span>
                </label>
                <div className="relative">
                  <select
                    name="loanPurpose"
                    id="loanPurpose"
                    value={formData.loanPurpose}
                    onChange={handleChange}
                    className="w-full px-4 py-3 text-base bg-white/80 text-gray-800 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 hover:border-blue-400 appearance-none"
                    required
                  >
                    <option value="">Select purpose</option>
                    {loanPurposeOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-700">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                  </div>
                </div>
              </div>

              {/* Checkbox Inputs */}
              <div className="flex items-start sm:col-span-2 bg-blue-50 p-4 rounded-lg transition-colors duration-200 border border-blue-100 hover:border-blue-300">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="hasDependents"
                    id="hasDependents"
                    checked={formData.hasDependents}
                    onChange={handleChange}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 bg-white border-gray-300 rounded transition-colors"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="hasDependents" className="font-medium text-gray-700">
                    Has Dependents
                  </label>
                  <p className="text-gray-500 text-xs mt-1">Individuals relying on financial support</p>
                </div>
              </div>

              <div className="flex items-start sm:col-span-2 bg-blue-50 p-4 rounded-lg transition-colors duration-200 border border-blue-100 hover:border-blue-300">
                <div className="flex items-center h-5">
                  <input
                    type="checkbox"
                    name="hasMortgage"
                    id="hasMortgage"
                    checked={formData.hasMortgage}
                    onChange={handleChange}
                    className="h-5 w-5 text-blue-600 focus:ring-blue-500 bg-white border-gray-300 rounded transition-colors"
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label htmlFor="hasMortgage" className="font-medium text-gray-700">
                    Has Mortgage
                  </label>
                  <p className="text-gray-500 text-xs mt-1">Active mortgage loans secured by real estate</p>
                </div>
              </div>
            </div>

            <div className="mt-8">
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
                <h3 className="text-sm font-semibold text-blue-800 mb-1">Important Notice</h3>
                <p className="text-xs text-blue-700">
                  Your information is secure and will only be used for loan evaluation purposes. We comply with all financial data protection regulations.
                </p>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="flex justify-end pt-4">
              <button
                type="button"
                onClick={handleReset}
                disabled={isSubmitting}
                className="px-6 py-2 mr-4 bg-white text-blue-600 font-medium rounded-lg border border-blue-200 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-200 shadow-lg hover:shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default FinancialForm;