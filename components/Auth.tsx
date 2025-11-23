
import React, { useState } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Input } from './ui/Form';
import { BotIcon, AlertTriangleIcon, CopyIcon, HelpCircleIcon, CheckCircleIcon, XIcon, UsersIcon } from './Icons';
import { 
  loginWithGoogle, 
  loginWithEmail, 
  registerWithEmail
} from '../services/authService';

interface AuthProps {
  onLogin: (user: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'signup'>('login');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showDomainHelp, setShowDomainHelp] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [copied, setCopied] = useState(false);
  const [errorAction, setErrorAction] = useState<{ label: string, action: () => void } | null>(null);

  // Auth State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleAuthError = (err: any) => {
      console.error("Auth Error:", err);
      setErrorAction(null);
      setShowDomainHelp(false);
      
      const errorCode = err.code;
      const errorMessage = err.message || '';

      // Helper to detect error codes even if they are buried in the message string
      const isError = (code: string) => {
          return errorCode === code || errorMessage.includes(`(${code})`) || errorMessage.includes(code);
      };
      
      if (isError('auth/unauthorized-domain') || errorMessage.includes('unauthorized-domain') || errorMessage.includes('authorized domain')) {
        setError(`Domain Not Authorized`);
        setShowDomainHelp(true);
      } else if (
          isError('auth/invalid-credential') || 
          isError('auth/user-not-found') || 
          isError('auth/wrong-password')
      ) {
        setError("We couldn't find an account with that email/password.");
        // If the user is trying to login but fails, suggest signing up
        if (view === 'login') {
             setErrorAction({
                label: "Create a new account",
                action: () => {
                    setError(null);
                    setErrorAction(null);
                    setView('signup');
                }
            });
        }
      } else if (isError('auth/email-already-in-use')) {
        setError("This email address is already registered.");
        setErrorAction({
            label: "Log in instead",
            action: () => {
                setError(null);
                setErrorAction(null);
                setView('login');
            }
        });
      } else if (isError('auth/weak-password')) {
        setError("Password should be at least 6 characters.");
      } else if (isError('auth/popup-closed-by-user')) {
        setError("Sign-in cancelled.");
      } else if (isError('auth/invalid-email')) {
        setError("Please enter a valid email address.");
      } else {
        // Clean up raw Firebase error messages for display
        const cleanMessage = errorMessage
            .replace('Firebase: ', '')
            .replace('Error (', '')
            .replace(').', '');
            
        setError(cleanMessage || "Authentication failed.");
      }
      setIsLoading(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setErrorAction(null);
    setShowDomainHelp(false);
    setIsLoading(true);

    try {
      let result;
      if (view === 'signup') {
        result = await registerWithEmail(email, password);
      } else {
        result = await loginWithEmail(email, password);
      }
      if (result.user) {
        onLogin({
            email: result.user.email,
            uid: result.user.uid,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL
        });
      }
    } catch (err: any) {
      handleAuthError(err);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setErrorAction(null);
    setShowDomainHelp(false);
    setIsLoading(true);
    try {
      const result = await loginWithGoogle();
      if (result.user) {
          onLogin({
            email: result.user.email,
            uid: result.user.uid,
            displayName: result.user.displayName,
            photoURL: result.user.photoURL
        });
      }
    } catch (err: any) {
      handleAuthError(err);
    }
  };

  const handleGuestLogin = () => {
      setIsLoading(true);
      // Simulate a small network delay for better UX
      setTimeout(() => {
        onLogin({
            email: 'guest@demo.com',
            uid: 'guest-user',
            displayName: 'Guest User',
            photoURL: null
        });
      }, 600);
  };

  const handleDevBypass = () => {
    onLogin({
      email: 'dev@example.com',
      uid: 'dev-user-123',
      displayName: 'Dev User',
      photoURL: null
    });
  };

  const copyDomain = () => {
      navigator.clipboard.writeText(window.location.hostname);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-purple-500/10 blur-[100px] pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        <Card className="bg-white/90 backdrop-blur-xl border-slate-200 shadow-2xl">
          <Card.Header className="text-center relative">
            <button 
                onClick={() => setShowHelpModal(true)}
                className="absolute right-6 top-6 text-slate-400 hover:text-indigo-600 transition-colors"
                title="Configuration Help"
            >
                <HelpCircleIcon className="w-5 h-5" />
            </button>

            <div className="flex justify-center items-center mb-6">
                <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mb-2 ring-1 ring-indigo-100">
                    <BotIcon className="w-8 h-8 text-indigo-600"/>
                </div>
            </div>
            <Card.Title className="text-2xl font-bold text-slate-900">
                {view === 'login' ? 'Welcome Back' : 'Create Account'}
            </Card.Title>
            <p className="text-slate-500 text-sm mt-2">
                {view === 'login' ? 'Sign in to access your AI Agent' : 'Get started with your autonomous social manager'}
            </p>
          </Card.Header>
          <Card.Content>
            <div className="space-y-5">
                
                {error && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-sm animate-fade-in">
                        <p className="text-red-600 font-bold flex items-center gap-2 mb-1">
                            <AlertTriangleIcon className="w-4 h-4" />
                            {error}
                        </p>
                        
                        {errorAction && (
                             <button 
                                onClick={errorAction.action}
                                className="mt-2 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 px-3 py-1.5 rounded transition-colors w-full md:w-auto"
                             >
                                {errorAction.label}
                             </button>
                        )}

                        {showDomainHelp && (
                            <div className="mt-3 pt-3 border-t border-red-200">
                                <p className="text-slate-600 text-xs mb-3 leading-relaxed">
                                    <strong>Why?</strong> Google Sign-In requires this specific preview domain to be whitelisted in the Firebase project settings. Since this is a dynamic preview URL, it is blocked.
                                </p>
                                
                                <div className="flex flex-col gap-2">
                                    <label className="text-[10px] uppercase tracking-wider font-bold text-slate-500">Blocked Domain</label>
                                    <div className="flex items-center gap-2 bg-slate-100 p-2 rounded border border-slate-200">
                                        <code className="text-xs text-indigo-600 flex-1 truncate font-mono px-1">{window.location.hostname}</code>
                                        <button onClick={copyDomain} className="text-slate-400 hover:text-slate-600 p-1 rounded hover:bg-slate-200 transition-colors" title="Copy Domain">
                                            {copied ? <CheckCircleIcon className="w-4 h-4 text-emerald-500" /> : <CopyIcon className="w-4 h-4" />}
                                        </button>
                                    </div>
                                </div>

                                <div className="mt-4">
                                    <Button onClick={handleDevBypass} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white border-none h-9 text-xs font-semibold uppercase tracking-wide shadow-md">
                                        Enable Dev Mode (Bypass Auth)
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="space-y-3">
                    <Button 
                        onClick={handleGoogleLogin} 
                        disabled={isLoading}
                        className="w-full bg-white !text-black hover:bg-slate-50 border border-slate-300 hover:scale-[1.01] transition-all flex items-center justify-center gap-3 font-semibold h-11 shadow-sm"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                        </svg>
                        {view === 'login' ? 'Continue with Google' : 'Sign up with Google'}
                    </Button>
                    
                    <Button 
                        onClick={handleGuestLogin} 
                        disabled={isLoading}
                        className="w-full bg-indigo-600 text-white hover:bg-indigo-700 hover:scale-[1.01] transition-all flex items-center justify-center gap-3 font-semibold h-11 shadow-md"
                    >
                        <UsersIcon className="w-5 h-5" />
                        Continue as Guest (Mock)
                    </Button>
                </div>

                <div className="relative flex items-center py-2">
                    <div className="flex-grow border-t border-slate-200"></div>
                    <span className="flex-shrink-0 mx-4 text-slate-400 text-xs font-medium uppercase tracking-wider">Or with email</span>
                    <div className="flex-grow border-t border-slate-200"></div>
                </div>

                <form onSubmit={handleAuth} className="space-y-4">
                    <Input 
                        label="Email Address" 
                        type="email" 
                        value={email} 
                        onChange={(e) => setEmail(e.target.value)} 
                        required 
                        placeholder="you@example.com"
                        className="bg-slate-50 border-slate-300 focus:border-indigo-500"
                    />
                    <Input 
                        label="Password" 
                        type="password" 
                        value={password} 
                        onChange={(e) => setPassword(e.target.value)} 
                        required 
                        placeholder="••••••••"
                        minLength={6}
                        className="bg-slate-50 border-slate-300 focus:border-indigo-500"
                    />
                    
                    <Button type="submit" className="w-full h-11" disabled={isLoading}>
                        {isLoading ? 'Processing...' : (view === 'login' ? 'Sign In' : 'Create Account')}
                    </Button>
                </form>

                <div className="text-center text-sm text-slate-500 mt-4">
                    {view === 'login' ? (
                        <p>Don't have an account? <button onClick={() => { setError(null); setView('signup'); }} className="text-indigo-600 hover:text-indigo-500 font-medium hover:underline">Sign up</button></p>
                    ) : (
                        <p>Already have an account? <button onClick={() => { setError(null); setView('login'); }} className="text-indigo-600 hover:text-indigo-500 font-medium hover:underline">Log in</button></p>
                    )}
                </div>
            </div>
          </Card.Content>
        </Card>

        {/* Setup Help Modal */}
        {showHelpModal && (
            <div className="absolute inset-0 z-20 bg-slate-900/50 backdrop-blur-sm rounded-xl flex items-center justify-center p-4 animate-fade-in">
                <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-2xl">
                    <div className="flex justify-between items-start mb-6">
                        <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                            <BotIcon className="w-5 h-5 text-indigo-600" />
                            Auth Configuration
                        </h3>
                        <button onClick={() => setShowHelpModal(false)} className="text-slate-400 hover:text-slate-600">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    
                    <div className="space-y-6 overflow-y-auto flex-1 custom-scrollbar max-h-[300px]">
                        <div>
                            <h4 className="text-sm font-semibold text-indigo-600 mb-2">1. Domain Authorization (Advanced)</h4>
                            <p className="text-xs text-slate-600 mb-2">
                                Google Sign-In fails on preview environments because the domain (e.g. <code>{window.location.hostname}</code>) is not whitelisted in the Firebase project settings. This is a security feature.
                            </p>
                        </div>

                        <div>
                            <h4 className="text-sm font-semibold text-emerald-600 mb-2">2. Email/Password</h4>
                            <p className="text-xs text-slate-600">
                                You can create a real account using Email and Password, as this method is less restrictive than Google Sign-In regarding domain names.
                            </p>
                        </div>
                    </div>

                    <Button onClick={() => setShowHelpModal(false)} className="mt-6 w-full bg-slate-100 text-slate-800 hover:bg-slate-200 border border-slate-200">
                        Close Help
                    </Button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
};
