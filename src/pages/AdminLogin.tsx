import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { useAppData } from '../context/AppDataContext';
import { Lock, Eye, EyeOff, AlertTriangle } from 'lucide-react';
import { isConfigValid } from '../firebase';

export default function AdminLogin() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const { login, data, showNotification, isAdmin, isAuthReady } = useAppData();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (isAuthReady && isAdmin) {
      navigate('/admin');
    }
  }, [isAuthReady, isAdmin, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const success = await login();
    if (success) {
      navigate('/admin');
    } else {
      // The error message is now handled by the context's showNotification
      // but we can also set a local error for more persistent feedback
      setError('Login failed. If the popup closed immediately, ensure this domain is authorized in your Firebase Console.');
    }
  };

  return (
    <div className="min-h-[90vh] flex items-center justify-center px-6 pt-20 relative overflow-hidden">
      {/* Background Elements */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[var(--color-primary)]/10 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[var(--color-primary)]/5 rounded-full blur-[100px]" />
      </div>

      <motion.div 
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-md bg-zinc-900/80 backdrop-blur-xl border border-zinc-800/50 rounded-3xl p-8 md:p-10 shadow-2xl relative z-10 glow-effect"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent rounded-3xl pointer-events-none"></div>
        
        <div className="flex justify-center mb-8 relative z-10">
          <motion.div 
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
            className="w-16 h-16 bg-zinc-950 border border-zinc-800 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(0,0,0,0.5)]"
            style={{ boxShadow: `0 0 20px ${data.theme.primaryColor}40` }}
          >
            <Lock className="w-8 h-8" style={{ color: data.theme.primaryColor }} />
          </motion.div>
        </div>
        
        <motion.h1 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="text-3xl font-bold text-center mb-8 tracking-tight relative z-10"
        >
          Admin Portal
        </motion.h1>
        
        {!isConfigValid && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="bg-amber-500/10 border border-amber-500/30 text-amber-400 p-4 rounded-2xl mb-8 flex flex-col items-center gap-3 text-center relative z-10"
          >
            <AlertTriangle className="w-8 h-8" />
            <div className="text-sm">
              <p className="font-bold mb-1">Firebase Configuration Missing</p>
              <p>Please set the <strong>VITE_FIREBASE_*</strong> secrets in the AI Studio Settings menu to enable login.</p>
            </div>
          </motion.div>
        )}

        {error && (
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-red-500/10 border border-red-500/30 text-red-400 p-4 rounded-2xl mb-8 text-sm text-center relative z-10"
          >
            {error}
          </motion.div>
        )}

        <div className="space-y-8 relative z-10">
          <p className="text-sm text-zinc-400 text-center leading-relaxed">
            Access to the secure admin dashboard is restricted. 
            Please authenticate using your authorized Google account.
          </p>
          
          <motion.button 
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleLogin}
            disabled={!isConfigValid}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 disabled:bg-zinc-800 disabled:text-zinc-500 disabled:border-zinc-700 disabled:cursor-not-allowed text-zinc-950 font-bold py-4 rounded-2xl transition-all duration-300 shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Authenticate with Google
          </motion.button>

          <div className="pt-8 border-t border-zinc-800/50">
            <p className="text-xs text-zinc-500 text-center mb-6 uppercase tracking-widest font-semibold">
              Authorized Identity <br />
              <span className="text-zinc-300 font-mono mt-2 block lowercase tracking-normal">francisestologa@gmail.com</span>
            </p>

            <div className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-5 text-xs text-zinc-500">
              <p className="font-bold text-zinc-400 mb-3 flex items-center gap-2 uppercase tracking-wider">
                <AlertTriangle className="w-4 h-4" /> System Diagnostics
              </p>
              <ul className="list-disc pl-4 space-y-2 leading-relaxed">
                <li>Verify domain authorization in <strong>Firebase Console &gt; Authentication &gt; Settings &gt; Authorized domains</strong>.</li>
                <li className="flex items-center gap-2 flex-wrap">Current Origin: <code className="bg-zinc-900 px-2 py-1 rounded-md text-zinc-300 font-mono text-[10px]">{window.location.hostname}</code></li>
                <li>Monitor browser console for detailed security logs.</li>
              </ul>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
