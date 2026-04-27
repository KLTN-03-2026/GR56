import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './context/AuthContext';
import AppRouter from './router/index.jsx';
import RealtimeToastContainer from './components/RealtimeToast.jsx';

export default function App() {
  return (
    <AuthProvider>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3500,
          style: {
            fontFamily: "'Inter', sans-serif",
            borderRadius: '12px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.12)',
            padding: '12px 16px',
            fontSize: '0.9rem',
          },
          success: {
            iconTheme: {
              primary: '#ff6b35',
              secondary: 'white',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: 'white',
            },
          },
        }}
      />
      <RealtimeToastContainer />
    </AuthProvider>
  );
}
