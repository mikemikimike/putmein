'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function WaitlistPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    reason: '',
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const nextStep = () => {
    setError('');
    if (step === 1 && !formData.name) {
      setError('Please enter your name.');
      return;
    }
    if (step === 2 && (!formData.email || !formData.phone)) {
      setError('Please enter both your email and phone number.');
      return;
    }
    setStep((prev) => prev + 1);
  };

  const prevStep = () => {
    setStep((prev) => prev - 1);
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.reason) {
      setError('Please tell us why you want this product.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/waitlist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error('Failed to join the waitlist. Please try again.');
      }

      setSuccess(true);
      setTimeout(() => {
        router.push('/');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-black text-white flex flex-col items-center pt-32 pb-16 px-6 sm:px-8 shadow-[0_0_100px_rgba(30,30,30,0.8)] relative overflow-hidden">
      {/* Background glow similar to other pages */}
      <div className="absolute top-[50px] left-1/2 -translate-x-1/2 w-[90vw] md:w-[70vw] h-[70vw] bg-[radial-gradient(circle,rgba(60,60,60,0.15)_0%,rgba(0,0,0,0)_60%)] pointer-events-none z-0"></div>

      <Link href="/" className="absolute top-10 left-6 sm:left-12 z-20 text-zinc-400 hover:text-white transition-colors flex gap-2 items-center text-sm font-medium">
        &larr; Back to Home
      </Link>

      <div className="relative z-10 max-w-lg w-full">
        <div className="text-center mb-10">
          <h1 className="pixel-font text-3xl md:text-5xl font-bold mb-4 tracking-tight drop-shadow-md">
            Join the Waitlist
          </h1>
          <p className="text-zinc-400 text-lg">
            Secure your spot for early access and a 50% lifetime discount.
          </p>
        </div>

        {success ? (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-10 text-center animate-pulse">
            <h2 className="text-2xl font-semibold text-green-400 mb-3">You&apos;re on the list!</h2>
            <p className="text-zinc-300">Thank you for joining. We&apos;ll be in touch soon.</p>
            <p className="text-zinc-500 text-sm mt-6">Redirecting to homepage...</p>
          </div>
        ) : (
          <form className="bg-zinc-900/80 backdrop-blur-md border border-white/10 rounded-3xl p-8 shadow-2xl" onSubmit={handleSubmit}>
            {/* Context Step Info */}
            <div className="flex items-center justify-between mb-8 opacity-70">
              <span className={`text-sm ${step >= 1 ? 'text-white' : 'text-zinc-500'}`}>1. Info</span>
              <div className="h-[1px] flex-1 mx-4 bg-zinc-700">
                <div className={`h-full bg-white transition-all`} style={{ width: step >= 2 ? '100%' : '0%' }}></div>
              </div>
              <span className={`text-sm ${step >= 2 ? 'text-white' : 'text-zinc-500'}`}>2. Contact</span>
              <div className="h-[1px] flex-1 mx-4 bg-zinc-700">
                <div className={`h-full bg-white transition-all`} style={{ width: step >= 3 ? '100%' : '0%' }}></div>
              </div>
              <span className={`text-sm ${step >= 3 ? 'text-white' : 'text-zinc-500'}`}>3. Details</span>
            </div>

            {error && <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">{error}</div>}

            <div className="min-h-[220px]">
              {step === 1 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-xl font-medium text-white mb-2">What is your name?</h3>
                  <div className="space-y-2">
                    <label htmlFor="name" className="text-sm text-zinc-400">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="w-full bg-zinc-800/50 border border-zinc-700 focus:border-white rounded-xl px-5 py-3 text-white placeholder:text-zinc-500 outline-none transition-all focus:ring-2 focus:ring-white/20"
                    />
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-xl font-medium text-white mb-2">How can we reach you?</h3>
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm text-zinc-400">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      name="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@example.com"
                      className="w-full bg-zinc-800/50 border border-zinc-700 focus:border-white rounded-xl px-5 py-3 text-white placeholder:text-zinc-500 outline-none transition-all focus:ring-2 focus:ring-white/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="phone" className="text-sm text-zinc-400">Phone Number</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+1 (555) 000-0000"
                      className="w-full bg-zinc-800/50 border border-zinc-700 focus:border-white rounded-xl px-5 py-3 text-white placeholder:text-zinc-500 outline-none transition-all focus:ring-2 focus:ring-white/20"
                    />
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <h3 className="text-xl font-medium text-white mb-2">Tell us more</h3>
                  <div className="space-y-2">
                    <label htmlFor="reason" className="text-sm text-zinc-400">Why do you want this product?</label>
                    <textarea
                      id="reason"
                      name="reason"
                      rows={5}
                      value={formData.reason}
                      onChange={handleChange}
                      placeholder="I am looking for an automated SRE solution to scale my team..."
                      className="w-full bg-zinc-800/50 border border-zinc-700 focus:border-white rounded-xl px-5 py-3 text-white placeholder:text-zinc-500 outline-none transition-all focus:ring-2 focus:ring-white/20 resize-none"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-4 mt-8 pt-6 border-t border-white/5">
              {step > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  className="flex-1 py-3.5 px-6 rounded-xl border border-zinc-700 text-zinc-300 font-medium hover:bg-zinc-800 transition-all focus:outline-none"
                >
                  Back
                </button>
              )}
              
              {step < 3 ? (
                <button
                  type="button"
                  onClick={nextStep}
                  className="flex-[2] py-3.5 px-6 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 hover:scale-[1.02] shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all focus:outline-none"
                >
                  Continue
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-[2] py-3.5 px-6 rounded-xl bg-white text-black font-semibold hover:bg-zinc-200 hover:scale-[1.02] shadow-[0_0_15px_rgba(255,255,255,0.2)] transition-all focus:outline-none disabled:opacity-50 disabled:hover:scale-100 disabled:cursor-not-allowed"
                >
                  {loading ? 'Submitting...' : 'Join Waitlist'}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
