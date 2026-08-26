import React from 'react';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import CursorGlow from '@/components/CursorGlow';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy Policy | Putme.in',
  description: 'Understand how PutMe.in collects, uses, and protects your personal data. Read our comprehensive Privacy Policy.',
};

const sections = [
  {
    title: '1. Information We Collect',
    items: [
      {
        subtitle: 'Personal Information',
        text: 'When you create an account or contact us, we may collect your name, email address, company name, phone number, and billing information.',
      },
      {
        subtitle: 'Usage Data',
        text: 'We automatically collect information about how you interact with our Service, including IP address, browser type, device information, pages visited, and timestamps.',
      },
      {
        subtitle: 'Infrastructure Data',
        text: 'When you connect your infrastructure, our Digital SRE Agent collects metrics, logs, and configuration data necessary to provide automated monitoring and incident response.',
      },
    ],
  },
  {
    title: '2. How We Use Your Information',
    items: [
      {
        subtitle: 'Service Delivery',
        text: 'To provide, maintain, and improve the PutMe.in platform including automated SRE capabilities, monitoring dashboards, and alert management.',
      },
      {
        subtitle: 'Communication',
        text: 'To send you important updates, security alerts, and marketing communications (with your consent). You can opt out of non-essential communications at any time.',
      },
      {
        subtitle: 'Analytics & Improvement',
        text: 'To understand usage patterns and improve our algorithms, user experience, and overall Service quality.',
      },
    ],
  },
  {
    title: '3. Data Sharing & Disclosure',
    items: [
      {
        subtitle: 'Third-Party Services',
        text: 'We may share data with trusted service providers who assist in operating our platform (e.g., cloud hosting, analytics). These providers are contractually bound to protect your data.',
      },
      {
        subtitle: 'Legal Requirements',
        text: 'We may disclose information when required by law, regulation, or legal process, or to protect the rights, property, or safety of PutMe.in, our users, or the public.',
      },
    ],
  },
  {
    title: '4. Data Security',
    items: [
      {
        subtitle: 'Encryption',
        text: 'All data is encrypted in transit (TLS 1.3) and at rest (AES-256). We implement industry-standard security measures including regular penetration testing and SOC 2 compliance.',
      },
      {
        subtitle: 'Access Controls',
        text: 'Employee access to your data is restricted on a need-to-know basis with multi-factor authentication and audit logging.',
      },
    ],
  },
  {
    title: '5. Your Rights',
    items: [
      {
        subtitle: 'Access & Portability',
        text: 'You have the right to request a copy of all personal data we hold about you in a machine-readable format.',
      },
      {
        subtitle: 'Deletion',
        text: 'You can request deletion of your personal data at any time. We will process your request within 30 days, subject to legal retention requirements.',
      },
      {
        subtitle: 'Correction',
        text: 'You may update or correct your personal information through your account settings or by contacting our support team.',
      },
    ],
  },
  {
    title: '6. Cookies & Tracking',
    items: [
      {
        subtitle: 'Essential Cookies',
        text: 'We use cookies necessary for the functioning of our Service, such as session management and authentication.',
      },
      {
        subtitle: 'Analytics Cookies',
        text: 'With your consent, we use analytics cookies to understand how our Service is used. You can manage cookie preferences through your browser settings.',
      },
    ],
  },
  {
    title: '7. Data Retention',
    items: [
      {
        subtitle: 'Active Accounts',
        text: 'We retain your data for as long as your account is active. Infrastructure metrics are retained for 90 days by default, configurable per your subscription plan.',
      },
      {
        subtitle: 'Deleted Accounts',
        text: 'Upon account deletion, all personal data is purged within 30 days. Anonymized usage statistics may be retained for analytical purposes.',
      },
    ],
  },
];

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden selection:bg-blue-500/30">
      <CursorGlow />
      <Navbar />

      {/* Hero Banner */}
      <section className="relative pt-32 pb-20 px-6 md:px-16 max-w-7xl mx-auto text-center">
        <div className="absolute inset-0 bg-gradient-to-b from-emerald-500/5 via-transparent to-transparent pointer-events-none" />
        <h1 className="pixel-font text-5xl md:text-7xl font-bold tracking-tight mb-6 relative z-10">
          Privacy <span className="bg-gradient-to-r from-emerald-400 to-teal-500 bg-clip-text text-transparent">Policy</span>
        </h1>
        <p className="text-lg md:text-xl text-zinc-400 max-w-2xl mx-auto relative z-10 font-light">
          Last updated: March 22, 2026
        </p>
      </section>

      {/* Privacy Sections */}
      <section className="py-8 px-6 md:px-16 max-w-4xl mx-auto">
        <div className="space-y-10">
          {sections.map((section) => (
            <div key={section.title}>
              <h2 className="text-2xl md:text-3xl font-bold text-white mb-6 flex items-center gap-3">
                <span className="w-1.5 h-8 rounded-full bg-gradient-to-b from-emerald-400 to-teal-500 inline-block" />
                {section.title}
              </h2>
              <div className="space-y-4 pl-5">
                {section.items.map((item) => (
                  <div
                    key={item.subtitle}
                    className="rounded-xl border border-white/10 bg-zinc-900/50 p-6 backdrop-blur-sm transition-all duration-300 hover:border-white/20 hover:bg-zinc-800/50"
                  >
                    <h3 className="text-lg font-semibold text-white mb-2">{item.subtitle}</h3>
                    <p className="text-zinc-400 leading-relaxed">{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Contact CTA */}
      <section className="py-16 px-6 md:px-16 max-w-7xl mx-auto border-t border-white/10 text-center mt-8">
        <p className="text-zinc-400 text-lg mb-6">
          Questions about our privacy practices? Reach out to our team.
        </p>
        <a
          href="/contact"
          className="inline-flex items-center justify-center gap-2 px-8 py-4 text-lg font-semibold text-black bg-white rounded-xl shadow-[0_0_20px_rgba(255,255,255,0.3)] transition-all hover:bg-zinc-200 hover:scale-105 hover:shadow-[0_0_30px_rgba(255,255,255,0.5)]"
        >
          Contact Our Privacy Team
        </a>
      </section>

      <Footer />
    </div>
  );
}
