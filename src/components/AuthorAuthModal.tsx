import { useState, type FormEvent } from 'react';
import { X, Lock } from 'lucide-react';
import { loginAuthor } from '../api';
import type { AuthorProfile } from '../types';

interface AuthorAuthModalProps {
  open: boolean;
  onClose: () => void;
  onAuthenticated: (author: AuthorProfile) => void;
}

export function AuthorAuthModal({ open, onClose, onAuthenticated }: AuthorAuthModalProps) {
  const [email, setEmail] = useState('');
  const [passcode, setPasscode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const { author } = await loginAuthor(email, passcode);
      setPasscode('');
      onAuthenticated(author);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-[2px] p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="author-signin-title"
    >
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-lg shadow-xl p-6 sm:p-8">
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <div className="flex items-center gap-2 text-xs font-medium text-blue-900 mb-1">
              <Lock className="w-3.5 h-3.5" strokeWidth={1.75} />
              <span>Author-Only Publishing Access</span>
            </div>
            <h2
              id="author-signin-title"
              className="font-editorial text-2xl font-semibold text-slate-900"
            >
              Editorial Desk Sign In
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close sign-in dialog"
            className="p-2 text-slate-500 hover:text-slate-900 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label htmlFor="author-email" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Editorial Email
            </label>
            <input
              id="author-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
              placeholder="editor@chambersgazette.co.uk"
            />
          </div>

          <div>
            <label htmlFor="author-passcode" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Author Passcode
            </label>
            <input
              id="author-passcode"
              type="password"
              required
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="w-full px-3.5 py-2.5 text-sm text-slate-900 bg-white border border-slate-300 rounded-md focus:outline-none focus:border-blue-900 focus:ring-1 focus:ring-blue-900"
              placeholder="Enter editorial passcode"
            />
          </div>

         

          {error && (
            <div
              role="alert"
              className="text-xs font-medium text-red-800 bg-red-50 border border-red-200 rounded-md px-3 py-2"
            >
              {error}
            </div>
          )}

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:text-slate-900 border border-slate-300 rounded-md hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-xs font-semibold text-white bg-blue-900 hover:bg-blue-950 disabled:opacity-60 rounded-md transition-colors cursor-pointer whitespace-nowrap"
            >
              {submitting ? 'Verifying...' : 'Sign In to Desk'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
