import React, { useCallback, useEffect, useState } from 'react';
import { Bug } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { BugAnnotateModal } from './BugAnnotateModal';
import { captureScreenshot, captureContext, type BugContext } from '../lib/bugReport';

/**
 * Botão flutuante de reporte avançado — visível SÓ para o admin/dev.
 * Captura a tela limpa (escondendo o próprio botão antes do print) e abre a
 * tela de marcação. Atalho: Ctrl+Shift+B.
 */
export const DevBugButton: React.FC = () => {
  const { isDev } = useAuth();

  const [capturing, setCapturing] = useState(false);
  const [showAnnotate, setShowAnnotate] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturedContext, setCapturedContext] = useState<BugContext | null>(null);

  const startCapture = useCallback(() => {
    if (capturing || showAnnotate) return;
    // Esconde o botão (capturing → não renderiza) e espera 2 frames pra
    // garantir que ele saiu da tela antes de fotografar.
    setCapturing(true);
    requestAnimationFrame(() => {
      requestAnimationFrame(async () => {
        const ctx = captureContext();
        const shot = await captureScreenshot();
        setCapturedContext(ctx);
        setScreenshot(shot);
        setCapturing(false);
        setShowAnnotate(true);
      });
    });
  }, [capturing, showAnnotate]);

  useEffect(() => {
    if (!isDev) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && (e.key === 'B' || e.key === 'b')) {
        e.preventDefault();
        startCapture();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isDev, startCapture]);

  const closeAnnotate = useCallback(() => {
    setShowAnnotate(false);
    setScreenshot(null);
    setCapturedContext(null);
  }, []);

  if (!isDev) return null;

  return (
    <>
      {!capturing && !showAnnotate && (
        <button
          type="button"
          onClick={startCapture}
          aria-label="Reporte do admin (marcar e comentar) — Ctrl+Shift+B"
          title="Reporte do admin (Ctrl+Shift+B)"
          className={[
            'fixed bottom-20 right-4 md:bottom-6 md:right-6 z-[var(--z-modal)]',
            'inline-flex items-center justify-center w-12 h-12 rounded-full',
            'bg-red-600 text-white shadow-lg shadow-red-600/30',
            'hover:bg-red-500 active:scale-95 transition-all duration-150',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400',
          ].join(' ')}
        >
          <Bug className="w-5 h-5" aria-hidden="true" />
        </button>
      )}

      {/* Durante a captura não renderizamos nada no canto — senão o spinner
          apareceria dentro do próprio print. */}

      {showAnnotate && (
        <BugAnnotateModal
          onClose={closeAnnotate}
          screenshot={screenshot}
          capturedContext={capturedContext}
        />
      )}
    </>
  );
};
