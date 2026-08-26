'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CursorGlow from '@/components/CursorGlow';

const contactMethods = [
  {
    title: 'Email Us',
    desc: 'Send us an email and we\'ll respond within 24 hours.',
    value: 'hello@putme.in',
    icon: (
      <svg className="w-6 h-6 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    accent: 'blue',
  },
  {
    title: 'Live Chat',
    desc: 'Chat with our support team in real-time.',
    value: 'Available 9am–6pm IST',
    icon: (
      <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    accent: 'purple',
  },
  {
    title: 'Office',
    desc: 'Visit us at our headquarters.',
    value: 'Bangalore, India',
    icon: (
      <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    accent: 'emerald',
  },
];

export default function ContactPage() {
  const [formData, setFormData] = useState({ name: '', email: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        setSubmitted(true);
        setFormData({ name: '', email: '', subject: '', message: '' });
      } else {
        console.error('Failed to submit form');
      }
    } catch (error) {
      console.error('Error submitting form:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-blue-500/30">
      <CursorGlow />
      <Navbar />

      {/* Hero Banner */}
      <section className="relative pt-32 pb-20 px-6 md:px-16 max-w-7xl mx-auto text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-amber-500/5 via-transparent to-transparent pointer-events-none" />
        <h1 className="pixel-font text-5xl md:text-7xl font-bold tracking-tight mb-6 relative z-10">
          Get in <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Touch</span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto relative z-10 font-light">
          We&apos;d love to hear from you. Whether you have a question, feedback, or need support — our team is here to help.
        </p>
      </section>

      {/* Contact Methods */}
      <section className="py-8 px-6 md:px-16 max-w-7xl mx-auto">
        <div className="grid sm:grid-cols-3 gap-6">
          {contactMethods.map((method) => (
            <div
              key={method.title}
              className="group rounded-2xl border border-white/10 bg-zinc-900/50 p-8 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-zinc-800/50 hover:-translate-y-1 text-center"
            >
              <div className={`w-14 h-14 rounded-2xl bg-${method.accent}-500/10 border border-${method.accent}-500/20 flex items-center justify-center mx-auto mb-5`}>
                {method.icon}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">{method.title}</h3>
              <p className="text-zinc-500 text-sm mb-3">{method.desc}</p>
              <p className="text-zinc-300 font-medium">{method.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact Form */}
      <section className="py-16 px-6 md:px-16 max-w-3xl mx-auto">
        <div className="rounded-2xl border border-white/10 bg-zinc-900/50 p-8 md:p-12 backdrop-blur-sm relative">
          <div className="absolute -top-6 -right-6 w-40 h-40 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-6 -left-6 w-48 h-48 bg-orange-500/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative z-10">
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">Send Us a Message</h2>
            <p className="text-zinc-500 mb-8">Fill out the form below and we&apos;ll get back to you as soon as possible.</p>

            {submitted ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-6">
                  <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-white mb-3">Message Sent!</h3>
                <p className="text-zinc-400 max-w-md">Thank you for reaching out. Our team will review your message and get back to you within 24 hours.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-6">
                  <div>
                    <label htmlFor="contact-name" className="block text-sm font-medium text-zinc-300 mb-2">Full Name</label>
                    <input
                      id="contact-name"
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="John Doe"
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-zinc-600 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all"
                    />
                  </div>
                  <div>
                    <label htmlFor="contact-email" className="block text-sm font-medium text-zinc-300 mb-2">Email Address</label>
                    <input
                      id="contact-email"
                      name="email"
                      type="email"
                      required
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="john@company.com"
                      className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-zinc-600 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="contact-subject" className="block text-sm font-medium text-zinc-300 mb-2">Subject</label>
                  <select
                    id="contact-subject"
                    name="subject"
                    required
                    value={formData.subject}
                    onChange={handleChange}
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all appearance-none"
                  >
                    <option value="" className="bg-zinc-900">Select a topic</option>
                    <option value="general" className="bg-zinc-900">General Inquiry</option>
                    <option value="support" className="bg-zinc-900">Technical Support</option>
                    <option value="sales" className="bg-zinc-900">Sales & Pricing</option>
                    <option value="partnership" className="bg-zinc-900">Partnership</option>
                    <option value="feedback" className="bg-zinc-900">Feedback</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="contact-message" className="block text-sm font-medium text-zinc-300 mb-2">Message</label>
                  <textarea
                    id="contact-message"
                    name="message"
                    rows={5}
                    required
                    value={formData.message}
                    onChange={handleChange}
                    placeholder="Tell us more about how we can help..."
                    className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder-zinc-600 outline-none focus:border-amber-400/50 focus:ring-1 focus:ring-amber-400/20 transition-all resize-none"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-black bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:bg-zinc-200 hover:scale-[1.02] hover:shadow-[0_0_30px_rgba(255,255,255,0.5)] active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                >
                  {isSubmitting ? 'Sending...' : 'Send Message'}
                  {!isSubmitting && (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
