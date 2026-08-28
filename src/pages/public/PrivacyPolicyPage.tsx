import { Link } from 'react-router';
import { ArrowLeft } from 'lucide-react';
import logo from '@/assets/menukit-logo.svg';

export function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white p-8 md:p-12 rounded-2xl shadow-sm border border-slate-200">
        <div className="mb-8 flex items-center justify-between">
          <Link to="/" className="text-slate-500 hover:text-primary transition-colors flex items-center font-semibold">
            <ArrowLeft size={20} className="mr-2" /> Back
          </Link>
          <img src={logo} alt="MenuKit Logo" className="w-8 h-8" />
        </div>
        
        <h1 className="text-3xl md:text-4xl font-bold font-heading mb-8 text-slate-900">Privacy Policy</h1>
        
        <div className="prose prose-slate max-w-none text-sm md:text-base text-slate-600 space-y-8">
          <p className="text-lg text-slate-700 font-medium leading-relaxed">
            At MenuKit, your privacy is of paramount importance to us. This comprehensive Privacy Policy outlines the types of personal information that is received, collected, stored, and utilized when you interact with our platform, website, and mobile applications. By accessing or using the MenuKit service, you expressly consent to the collection, use, and disclosure of your personal data in accordance with this Privacy Policy.
          </p>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">1. Information We Collect</h2>
            <p className="leading-relaxed">
              When you register for an account, place an order, or interact with our digital menus, we may collect various forms of personally identifiable information. This includes, but is not limited to, your full name, email address, phone number, delivery address, and payment processing details. Furthermore, we automatically collect certain technical data when you navigate our platform, such as your IP address, browser type, operating system, device identifiers, and browsing behavior. This information is crucial for us to ensure a seamless and personalized user experience across all your devices.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">2. How We Use Your Information</h2>
            <p className="leading-relaxed">
              The data we collect serves multiple operational and strategic purposes. Primarily, your information is used to process transactions, manage your account, and deliver the specific services you have requested, such as order fulfillment and digital menu access. Beyond transactional requirements, we utilize your data to enhance and optimize the MenuKit platform, diagnose technical issues, analyze usage trends, and develop new features. Additionally, we may use your contact information to communicate important service updates, security alerts, and promotional materials, provided you have opted in to receive such communications. 
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">3. Data Sharing and Third-Party Disclosure</h2>
            <p className="leading-relaxed">
              MenuKit is committed to safeguarding your personal information. We do not sell, trade, or rent your personally identifiable information to external third parties for marketing purposes. However, to operate our services effectively, we may share your data with trusted third-party service providers who assist us in website hosting, payment processing, data analytics, and customer support. These partners are strictly bound by confidentiality agreements and are permitted to use your information solely to provide the services we have contracted them for. We may also disclose your information if required by law, to enforce our terms of service, or to protect the rights, property, or safety of MenuKit, our users, or the general public.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">4. Security Measures and Data Retention</h2>
            <p className="leading-relaxed">
              We employ industry-standard security protocols, including encryption and secure socket layer (SSL) technology, to protect your personal information against unauthorized access, alteration, disclosure, or destruction. Despite our rigorous security efforts, no method of transmission over the Internet or electronic storage is entirely secure; therefore, we cannot guarantee absolute security. We retain your personal data only for as long as necessary to fulfill the purposes outlined in this Privacy Policy, comply with legal obligations, resolve disputes, and enforce our agreements. Once your information is no longer needed, it is securely deleted or anonymized.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-800 mb-4">5. User Rights and Choices</h2>
            <p className="leading-relaxed">
              Depending on your jurisdiction, you may have specific rights regarding your personal data. These rights may include the ability to access, correct, update, or request the deletion of your personal information held by MenuKit. You also have the right to opt-out of receiving promotional communications from us by following the unsubscribe instructions included in those emails. If you wish to exercise any of these rights, please contact our support team. We will respond to your request within a reasonable timeframe and in compliance with applicable data protection laws.
            </p>
          </section>
          
          <div className="pt-8 border-t border-slate-200">
            <p className="text-sm font-bold text-slate-500">
              Last updated: August 19, 2026
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
