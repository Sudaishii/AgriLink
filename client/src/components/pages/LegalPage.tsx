import React from 'react';
import { useLocation } from 'react-router-dom';

const LegalPage: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    if (!location.hash) {
      window.scrollTo({ top: 0, behavior: 'auto' });
      return;
    }
    const id = location.hash.replace('#', '');
    const target = document.getElementById(id);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [location.hash]);

  return (
    <div className="min-h-screen bg-[#F8FAFB] pt-20 pb-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-[#d9e8c8] bg-white shadow-sm p-8 md:p-12">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-[#5ba409]">Legal</p>
          <h1 className="mt-3 text-3xl md:text-4xl font-black tracking-tight text-slate-900">Terms & Agreement and Privacy Policy</h1>
          <p className="mt-4 text-sm text-slate-600 leading-relaxed">
            Please read these terms carefully before using AgriLink. By continuing to use the platform, you acknowledge and accept the policies below.
          </p>
        </section>

        <section id="terms" className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm p-8 md:p-12">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Terms & Agreement</h2>
          <p className="mt-4 text-sm text-slate-700 leading-relaxed">
            By creating an account and using AgriLink, you agree to provide accurate information and use the system responsibly.
            Farmers must ensure that all crop listings are truthful, while buyers must conduct transactions in good faith.
            All accounts and listings are subject to verification by barangay officials.
          </p>
          <p className="mt-4 text-sm text-slate-700 leading-relaxed">
            AgriLink only serves as a platform connecting farmers and buyers and is not responsible for transaction outcomes.
            Any misuse, fraudulent activity, or unauthorized access may result in account suspension or removal.
          </p>
        </section>

        <section id="privacy" className="mt-6 rounded-3xl border border-slate-200 bg-white shadow-sm p-8 md:p-12">
          <h2 className="text-2xl font-black tracking-tight text-slate-900">Privacy Policy</h2>
          <p className="mt-4 text-sm text-slate-700 leading-relaxed">
            AgriLink collects basic personal and crop information to manage your account, support transactions, and verify listings.
            Your data is kept secure and will only be accessed by authorized personnel, such as barangay officials for verification purposes.
          </p>
          <p className="mt-4 text-sm text-slate-700 leading-relaxed">
            We do not share your information with third parties without your consent, unless required by law.
            By using the system, you agree to the collection and use of your data as described.
          </p>
        </section>
      </div>
    </div>
  );
};

export default LegalPage;
