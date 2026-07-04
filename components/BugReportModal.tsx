import React, { useCallback, useEffect, useRef, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { createPortal } from 'react-dom';
import { Loader2, X, Camera } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useToast } from './ui';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import { ScreenshotAnnotator, type ScreenshotAnnotatorRef } from './ScreenshotAnnotator';
import {
  captureScreenshot,
  captureContext,
  inferType,
  createBugReport,
  uploadBugScreenshot,
  type BugContext,
} from '../lib/bugReport';

interface BugReportModalProps {
  reportType: 'bug' | 'idea' | 'question';
  onClose: () => void;
  /** Print capturado ANTES do modal abrir (sem o modal/menu na frente). */
  screenshot?: string | null;
  /** Contexto técnico capturado no mesmo instante do print. */
  capturedContext?: BugContext | null;
}

const TITLES: Record<'bug' | 'idea' | 'question', string> = {
  bug: 'Reportar problema',
  idea: 'Sugerir melhoria',
  question: 'Falar com suporte',
};

const PLACEHOLDERS: Record<'bug' | 'idea' | 'question', string> = {
  bug: 'Descreva o que aconteceu (opcional): o que você fez, o que esperava e o que ocorreu de errado.',
  idea: 'Descreva sua ideia de melhoria (opcional): qual problema ela resolve e como imaginaria funcionar.',
  question: 'Escreva sua dúvida (opcional) e enviaremos junto com o print da tela.',
};

export const BugReportModal: React.FC<BugReportModalProps> = ({
  reportType,
  onClose,
  screenshot: screenshotProp,
  capturedContext,
}) => {
  const { classes, colors, accent, radius } = useBrutalTheme();
  const { user, companyId } = useAuth();
  const { setModalOpen } = useUI();
  const { showToast } = useToast();

  // Quando o pai já capturou o print por fora (fluxo correto), usamos o que veio
  // por prop e NÃO recapturamos — evita fotografar o próprio modal na frente.
  const preCaptured = capturedContext !== undefined;
  const [screenshot, setScreenshot] = useState<string | null>(screenshotProp ?? null);
  const [capturing, setCapturing] = useState(!preCaptured);
  const [context, setContext] = useState<BugContext | null>(capturedContext ?? null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const annotatorRef = useRef<ScreenshotAnnotatorRef>(null);

  useEffect(() => {
    setModalOpen(true);
    let active = true;
    if (!preCaptured) {
      (async () => {
        setContext(captureContext());
        const shot = await captureScreenshot();
        if (active) {
          setScreenshot(shot);
          setCapturing(false);
        }
      })();
    }
    return () => {
      active = false;
      setModalOpen(false);
    };
  }, [setModalOpen, preCaptured]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, submitting]);

  const handleSubmit = useCallback(async () => {
    if (!user || !companyId) {
      showToast('Sessão expirada. Faça login novamente para enviar.', 'error');
      return;
    }
    setSubmitting(true);

    const annotatedScreenshot = annotatorRef.current?.getAnnotatedDataUrl() ?? screenshot;

    let screenshotPath: string | null = null;
    if (annotatedScreenshot) {
      const uploaded = await uploadBugScreenshot({
        supabase,
        companyId,
        userId: user.id,
        dataUrl: annotatedScreenshot,
      });
      screenshotPath = uploaded.path;
      if (uploaded.error) {
        showToast('Não foi possível enviar o print, mas vamos registrar o report mesmo assim.', 'warning');
      }
    }
    const result = await createBugReport({
      supabase,
      companyId,
      userId: user.id,
      type: inferType(reportType),
      description: description.trim() || null,
      context: context ?? captureContext(),
      screenshotPath,
    });
    setSubmitting(false);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast('Report enviado com sucesso. Obrigado pelo feedback!', 'success');
    onClose();
  }, [user, companyId, screenshot, reportType, description, context, showToast, onClose]);

  const okContext = context ?? captureContext();
  const contextRows: Array<{ label: string; value: string }> = [
    { label: 'Rota', value: okContext.route || okContext.pathname || '—' },
    { label: 'Tela', value: `${okContext.viewportWidth}×${okContext.viewportHeight}px` },
    { label: 'Tema', value: `${okContext.theme ?? '—'} / ${okContext.mode ?? '—'}` },
    { label: 'Idioma', value: okContext.language || '—' },
    { label: 'Horário', value: okContext.timestamp },
    { label: 'Navegador', value: okContext.userAgent.slice(0, 80) || '—' },
  ];

  const content = (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end md:items-center justify-center p-0 md:p-4">
      <div className={`absolute inset-0 ${classes.modalOverlay}`} onClick={submitting ? undefined : onClose} aria-hidden="true" />
      <FocusTrap
        focusTrapOptions={{
          escapeDeactivates: false,
          allowOutsideClick: true,
          initialFocus: false,
          fallbackFocus: '[data-bug-report-dialog]',
        }}
      >
        <div
          data-bug-report-dialog
          role="dialog"
          aria-modal="true"
          aria-labelledby="bug-report-title"
          tabIndex={-1}
          className={[
            'relative w-full md:max-w-lg flex flex-col max-h-[92dvh] md:max-h-[88vh]',
            classes.modalContainer,
            'rounded-t-2xl md:rounded-2xl',
            'animate-in slide-in-from-bottom-full md:slide-in-from-bottom-0 md:fade-in md:zoom-in-95 duration-300',
            'focus:outline-none',
          ].join(' ')}
        >
          <div className={`${classes.modalHeader} shrink-0`}>
            <h2 id="bug-report-title" className={`text-base md:text-lg font-bold tracking-tight ${colors.text}`}>
              {TITLES[reportType]}
            </h2>
            <button
              type="button"
              onClick={submitting ? undefined : onClose}
              disabled={submitting}
              className={[
                'p-1.5 rounded-lg transition-colors duration-150',
                colors.textMuted,
                'hover:bg-[var(--color-card-hover)]',
                'min-h-[44px] min-w-[44px] md:min-h-[36px] md:min-w-[36px]',
                'inline-flex items-center justify-center',
              ].join(' ')}
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 md:p-6 space-y-5">
            <div>
              <span className={`block mb-2 ${classes.label}`}>Print da tela</span>
              <div
                className={[
                  'w-full aspect-video flex items-center justify-center overflow-hidden border',
                  colors.border,
                  radius.card,
                  colors.card,
                ].join(' ')}
              >
                {capturing ? (
                  <span className={`inline-flex items-center gap-2 text-sm ${colors.textMuted}`}>
                    <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
                    Capturando tela…
                  </span>
                ) : screenshot ? (
                  <ScreenshotAnnotator
                    ref={annotatorRef}
                    imageUrl={screenshot}
                    disabled={submitting}
                    className="w-full"
                  />
                ) : (
                  <span className={`inline-flex flex-col items-center gap-2 text-xs ${colors.textMuted}`}>
                    <Camera className="w-6 h-6" aria-hidden="true" />
                    Não foi possível capturar a tela.
                  </span>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="bug-report-description" className={`block mb-2 ${classes.label}`}>
                Descrição (opcional)
              </label>
              <textarea
                id="bug-report-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder={PLACEHOLDERS[reportType]}
                disabled={submitting}
                className={[classes.input, 'min-h-[120px] resize-y'].join(' ')}
              />
            </div>

            <div>
              <span className={`block mb-2 ${classes.label}`}>Contexto técnico (anexado automaticamente)</span>
              <dl className={[radius.card, colors.card, colors.border, 'border', 'p-4 grid grid-cols-2 gap-y-2 gap-x-3'].join(' ')}>
                {contextRows.map((row) => (
                  <div key={row.label} className="min-w-0 col-span-2 sm:col-span-1">
                    <dt className={`text-xs uppercase tracking-wide ${colors.textMuted}`}>{row.label}</dt>
                    <dd className={`text-xs font-mono break-words ${colors.textSecondary}`}>{row.value}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>

          <div className={`shrink-0 px-5 md:px-6 py-4 border-t ${colors.divider} flex flex-col-reverse sm:flex-row gap-2 sm:justify-end`}>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting} disabled={submitting} className="sm:order-last order-first">
              Enviar
            </Button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};