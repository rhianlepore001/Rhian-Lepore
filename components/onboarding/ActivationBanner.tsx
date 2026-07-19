import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Rocket, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export function ActivationBanner() {
  const [show, setShow] = useState(false);
  const { user } = useAuth();

  useEffect(() => {
    const handleSystemActivated = () => {
      setShow(true);
      
      // Auto-hide after 8 seconds
      const t = setTimeout(() => {
        setShow(false);
      }, 8000);
      
      return () => clearTimeout(t);
    };

    window.addEventListener('system-activated', handleSystemActivated);
    return () => window.removeEventListener('system-activated', handleSystemActivated);
  }, []);

  if (!show) return null;

  return createPortal(
    <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[10000] w-full max-w-md px-4 pointer-events-none">
      <div className="bg-[var(--color-success-bg)] border border-[var(--color-success-border)] backdrop-blur-md bg-[var(--color-card)] rounded-2xl shadow-2xl p-4 flex items-start gap-4 animate-in slide-in-from-top-10 fade-in duration-500 pointer-events-auto">
        <button 
          onClick={() => setShow(false)}
          className="absolute top-2 right-2 p-1.5 rounded-full hover:bg-[var(--color-card-hover)] text-[var(--color-text)]/50 hover:text-[var(--color-text)] transition-colors"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="bg-gradient-to-br from-green-400 to-green-600 w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 shadow-lg shadow-green-500/20">
          <Rocket className="w-5 h-5 text-[var(--color-text)] animate-bounce" />
        </div>

        <div className="flex-1 pr-4">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-heading font-bold text-[var(--color-text)] text-base">
              Sistema Ativado! 🎉
            </h3>
            <CheckCircle2 className="w-4 h-4 text-[var(--color-success)]" />
          </div>
          <p className="text-sm text-[var(--color-text-secondary)] leading-relaxed">
            Sua barbearia está oficialmente online. Você completou as configurações iniciais e está pronto para decolar!
          </p>
        </div>
      </div>
    </div>,
    document.body
  );
}
