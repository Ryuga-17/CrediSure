
import './global.css';
import Footer from '@/components/Footer';
import { AuthProvider } from '@/app/context/AuthContext';
import Navbar from '@/components/Navbar';

export const metadata = {
  title: 'CrediSure',
  description: 'Your personal credit risk analyzer',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen">
        {/* AuthProvider wraps the Navbar too, so it can reflect the real session. */}
        <AuthProvider>
          <Navbar />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}