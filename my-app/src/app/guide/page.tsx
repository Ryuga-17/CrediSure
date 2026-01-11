import Chatbot from '@/components/Chatbot';
import ProtectedRoute from '@/components/protectedRoute';

export default function Dashboard() {
  return (
    <ProtectedRoute>
        <Chatbot />
    </ProtectedRoute>
  );
}