import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CursorGlow from '@/components/CursorGlow';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service | Putme.in',
  description: 'Read the Terms of Service for PutMe.in — understand your rights, responsibilities, and the rules that govern use of our platform.',
};

const sections = [
  {
    title: '1. Acceptance of Terms',
    content:
      'By accessing or using the PutMe.in platform ("Service"), you agree to be bound by these Terms of Service ("Terms"). If you do not agree to all of these Terms, you may not access or use the Service. We reserve the right to update these Terms at any time, and your continued use of the Service constitutes acceptance of any modifications.',
  },
  {
    title: '2. Description of Service',
    content:
      'PutMe.in provides a Digital SRE Agent and related infrastructure automation tools designed to help engineering teams scale their operations. The Service includes, but is not limited to, automated monitoring, incident response, deployment pipeline management, and infrastructure optimization capabilities.',
  },
  {
    title: '3. User Accounts',
    content:
      'To access certain features of the Service, you must create an account. You are responsible for maintaining the confidentiality of your login credentials, and you are fully responsible for all activities that occur under your account. You agree to immediately notify PutMe.in of any unauthorized use of your account or any other breach of security.',
  },
  {
    title: '4. Acceptable Use',
    content:
      'You agree not to use the Service for any unlawful purpose or in violation of any applicable regulations. You shall not attempt to gain unauthorized access to any systems, interfere with the proper functioning of the Service, transmit malicious code, or use the Service to process or store data in violation of any third-party rights.',
  },
  {
    title: '5. Intellectual Property',
    content:
      'All content, features, and functionality of the Service — including but not limited to text, graphics, logos, icons, software, and underlying technology — are the exclusive property of PutMe.in Inc. and are protected by international copyright, trademark, and intellectual property laws.',
  },
  {
    title: '6. Data & Privacy',
    content:
      'Your use of the Service is also governed by our Privacy Policy, which describes how we collect, use, and protect your data. By using the Service, you consent to the data practices described in our Privacy Policy.',
  },
  {
    title: '7. Payment & Billing',
    content:
      'Certain features of the Service require a paid subscription. All fees are stated in US Dollars and are non-refundable unless otherwise specified. You authorize PutMe.in to charge your designated payment method for any applicable fees. We may change our pricing at any time with 30 days advance notice.',
  },
  {
    title: '8. Limitation of Liability',
    content:
      'To the maximum extent permitted by law, PutMe.in shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including but not limited to loss of profits, data, or business opportunities, arising out of or in connection with your use of the Service.',
  },
  {
    title: '9. Termination',
    content:
      'We may suspend or terminate your access to the Service at any time, with or without cause, and with or without notice. Upon termination, your right to use the Service ceases immediately. Provisions of these Terms that by their nature should survive termination shall remain in effect.',
  },
  {
    title: '10. Governing Law',
    content:
      'These Terms shall be governed by and construed in accordance with the laws of the State of Delaware, United States, without regard to its conflict of law provisions. Any legal action arising from these Terms shall be filed in the courts located in Delaware.',
  },
];

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-blue-500/30">
      <CursorGlow />
      <Navbar />

      {/* Hero Banner */}
      <section className="relative pt-32 pb-20 px-6 md:px-16 max-w-7xl mx-auto text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-purple-500/5 via-transparent to-transparent pointer-events-none" />
        <h1 className="pixel-font text-5xl md:text-7xl font-bold tracking-tight mb-6 relative z-10">
          Terms of <span className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">Service</span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto relative z-10 font-light">
          Last updated: March 22, 2026
        </p>
      </section>

      {/* Terms Sections */}
      <section className="py-8 px-6 md:px-16 max-w-4xl mx-auto">
        <div className="space-y-8">
          {sections.map((section) => (
            <div
              key={section.title}
              className="group rounded-2xl border border-white/10 bg-zinc-900/50 p-8 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-zinc-800/50"
            >
              <h2 className="text-xl md:text-2xl font-semibold text-white mb-4">{section.title}</h2>
              <p className="text-zinc-400 leading-relaxed text-base">{section.content}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-6 md:px-16 max-w-7xl mx-auto border-t border-white/10 text-center mt-8">
        <p className="text-zinc-400 text-lg mb-6">
          Have questions about our terms? We&apos;re happy to clarify.
        </p>
        <a
          href="/contact"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-black bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:bg-zinc-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
        >
          Contact Us
        </a>
      </section>

      <Footer />
    </div>
  );
}
