import React, { useState, useEffect } from 'react';
import { useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import ReelMark from '../../components/ReelMark';
import { User, Lock, Eye, EyeOff, LogIn, Loader2, GitBranch, ShieldCheck, Layers } from 'lucide-react';

export const LoginPage = () => {
  const { login, authError, setAuthError, isAuthenticated, loading } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  useEffect(() => {
    document.title = 'Rainbow Packages | Sign In';
  }, []);

  if (!loading && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setAuthError('');
    setSubmitting(true);

    try {
      const loggedUser = await login(username, password);
      setSubmitting(false);

      if (loggedUser?.must_change_password) {
        navigate('/change-password', { replace: true });
      } else {
        navigate('/dashboard', { replace: true });
      }
    } catch (err) {
      setSubmitting(false);
      setLocalError(err.message || 'Login failed. Please check credentials.');
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Brand Panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-50 border-r border-gray-200 relative flex-col justify-between p-12 overflow-hidden">
        <svg
          className="absolute -right-28 -bottom-28 w-[440px] h-[440px] text-brand-blue/5 pointer-events-none"
          viewBox="0 0 40 40"
          fill="none"
        >
          <circle cx="20" cy="20" r="17" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="20" cy="20" r="12" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="20" cy="20" r="7" stroke="currentColor" strokeWidth="0.8" />
          <path
            d="M20 1V6M39 20H34M20 39V34M1 20H6M32.5 7.5L29 11M32.5 32.5L29 29M7.5 32.5L11 29M7.5 7.5L11 11"
            stroke="currentColor"
            strokeWidth="0.8"
          />
        </svg>

        <div className="flex items-center gap-3 relative">
          <ReelMark size={36} />
          <span className="text-xl font-bold tracking-tight" style={{ color: '#0F172A', fontFamily: 'var(--font-family-display)' }}>
            Rainbow Packages
          </span>
        </div>

        <div className="max-w-md relative">
          <h1 className="text-4xl font-extrabold leading-tight mb-4" style={{ color: '#0F172A', fontFamily: 'var(--font-family-display)' }}>
            Every reel, tracked from purchase to the last kilogram.
          </h1>
          <p className="text-base leading-relaxed mb-10" style={{ color: '#475569' }}>
            The reel inventory and approval workspace for the shop floor, the supervisor's desk, and the owner's office.
          </p>

          <div className="space-y-6">
            <Feature icon={<GitBranch size={18} />} title="A full audit trail" text="Every creation and usage entry is logged, confirmed, and reversible." />
            <Feature icon={<ShieldCheck size={18} />} title="Three-step approval" text="Operators log it, supervisors confirm it — nothing gets lost." />
            <Feature icon={<Layers size={18} />} title="A live stock picture" text="See exactly what's full, in use, or finished, at a glance." />
          </div>
        </div>

        <p className="text-xs relative font-medium" style={{ color: '#94A3B8' }}>© {new Date().getFullYear()} Rainbow Packages — internal use only</p>
      </div>

      {/* Sign-in form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-2.5 mb-10 justify-center">
            <ReelMark size={28} />
            <span className="text-lg font-semibold" style={{ fontFamily: 'var(--font-family-display)' }}>Rainbow Packages</span>
          </div>

          <h2 className="text-2xl font-semibold text-gray-900 mb-1" style={{ fontFamily: 'var(--font-family-display)' }}>
            Sign In
          </h2>
          <p className="text-gray-500 mb-8 text-sm">Enter credentials to access your workspace.</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">Username</label>
              <div className="relative">
                <User size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  type="text"
                  autoComplete="username"
                  className="w-full border border-gray-300 rounded-xl pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-shadow"
                  placeholder="e.g. admin"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">Password</label>
              </div>
              <div className="relative">
                <Lock size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  required
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className="w-full border border-gray-300 rounded-xl pl-11 pr-11 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent transition-shadow"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {(localError || authError) && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl p-3 animate-fade-in">
                {localError || authError}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="w-full bg-brand-blue hover:bg-brand-blue-dark disabled:opacity-70 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 transition-colors mt-2 text-sm shadow-sm"
            >
              {submitting ? <Loader2 size={18} className="animate-spin" /> : <LogIn size={18} />}
              {submitting ? 'Authenticating…' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

const Feature = ({ icon, title, text }) => (
  <div className="flex gap-3.5 items-start">
    <div className="bg-brand-blue/10 p-2.5 rounded-xl border border-brand-blue/20 text-brand-blue shrink-0">{icon}</div>
    <div>
      <p className="font-bold text-sm mb-0.5" style={{ color: '#0F172A' }}>{title}</p>
      <p className="text-xs leading-relaxed" style={{ color: '#475569' }}>{text}</p>
    </div>
  </div>
);

export default LoginPage;
