import { Diamond, Mail, Phone, MapPin } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-black/90 text-[var(--color-text)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-6">
          <div>
            <div className="flex items-center mb-4">
            <Diamond className="h-8 w-8 text-[var(--color-golden)] fill-current"/>
            <div className="font-bold text-2xl mx-2 text-white transition-all duration-300 group-hover:[var(--color-accent)]">
            Nuvi<span className="text-[var(--color-golden)]">X</span>
            </div>
            </div>
            <p className="text-[var(--color-text)]">
              Empowering lenders with AI-driven credit risk analysis solutions.
            </p>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><a href="#home" className="text-gray-400 hover:[var(--color-accent)]">Home</a></li>
              <li><a href="#about" className="text-gray-400 hover:[var(--color-accent)]">About Us</a></li>
              <li><a href="#features" className="text-gray-400 hover:[var(--color-accent)]">Features</a></li>
              <li><a href="#testimonials" className="text-gray-400 hover:[var(--color-accent)]">Testimonials</a></li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Us</h3>
            <ul className="space-y-2">
              <li className="flex items-center">
                <Mail className="h-5 w-5 mr-2 text-[var(--color-golden)]" />
                <span className="text-gray-400">nuvix@ac.in</span>
              </li>
              <li className="flex items-center">
                <Phone className="h-5 w-5 mr-2 text-[var(--color-golden)]" />
                <span className="text-gray-400">+91 637006XXXX</span>
              </li>
              <li className="flex items-center">
                <MapPin className="h-5 w-5 mr-2 text-[var(--color-golden)]" />
                <span className="text-gray-400">National Institute of Technology,Rourkela</span>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold mb-4">Legal</h3>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-[var(--color-accent)]">Privacy Policy</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[var(--color-accent)]">Terms of Service</a></li>
              <li><a href="#" className="text-gray-400 hover:text-[var(--color-accent)]">Cookie Policy</a></li>
            </ul>
          </div>
        </div>
      </div>
        <div className="text-center mt-8 mb-4">
          <p className="text-gray-400 text-center">© 2025 NuviX: Credit Risk Analyzer. All rights reserved.</p>
        </div>
    </footer>
  );
};

export default Footer;