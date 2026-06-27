import React, { useCallback, useEffect, useRef, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { createPortal } from 'react-dom';
import { Loader2, X, Camera, Undo2, Trash2, MousePointerSquareDashed } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useToast } from './ui';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import {
  captureContext,
  createBugReport,
  uploadBugScreenshot,
  type BugContext,
} from '../lib/bugReport';

interface BugAnnotateModalProps {
  onClose: () => void;
  /** Print capturado ANTES desta tela abrir (sem o botão/modal na frente). */
  screenshot: string | null;
  /** Contexto técnico capturado no mesmo instante do print. */
  capturedContext: BugContext | null;
}

/** Retângulo em frações (0..1) relativas à imagem — independente do tamanho exibido. */
interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

const RECT_COLOR = '#ef4444';
const MIN_SIZE = 0.01; // ignora cliques sem arrasto

function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** "Queima" os retângulos dentro da imagem, gerando um novo PNG. */
function burnAnnotations(dataUrl: string, rects: ReadonlyArray<Rect>): Promise<string> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(img, 0, 0);
      ctx.lineWidth = Math.max(3, Math.round(img.naturalWidth * 0.004));
      ctx.strokeStyle = RECT_COLOR;
      for (const r of rects) {
        ctx.strokeRect(
          r.x * img.naturalWidth,
          r.y * img.naturalHeight,
          r.w * img.naturalWidth,
          r.h * img.naturalHeight
        );
      }
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

export const BugAnnotateModal: React.FC<BugAnnotateModalProps> = ({
  onClose,
  screenshot,
  capturedContext,
}) => {
  const { classes, colors, radius } = useBrutalTheme();
  const { user, companyId } = useAuth();
  const { setModalOpen } = useUI();
  const { showToast } = useToast();

  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  const [rects, setRects] = useState<Rect[]>([]);
  const [drawing, setDrawing] = useState<Rect | null>(null);
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setModalOpen(true);
    return () => setModalOpen(false);
  }, [setModalOpen]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, submitting]);

  const fractionFromEvent = useCallback((e: React.PointerEvent) => {
    const el = wrapperRef.current;
    if (!el) return { x: 0, y: 0 };
    const r = el.getBoundingClientRect();
    return {
      x: clamp01((e.clientX - r.left) / r.width),
      y: clamp01((e.clientY - r.top) / r.height),
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!screenshot || submitting) return;
      (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
      const p = fractionFromEvent(e);
      startRef.current = p;
      setDrawing({ x: p.x, y: p.y, w: 0, h: 0 });
    },
    [screenshot, submitting, fractionFromEvent]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!startRef.current) return;
      const p = fractionFromEvent(e);
      const s = startRef.current;
      setDrawing({
        x: Math.min(s.x, p.x),
        y: Math.min(s.y, p.y),
        w: Math.abs(p.x - s.x),
        h: Math.abs(p.y - s.y),
      });
    },
    [fractionFromEvent]
  );

  const handlePointerUp = useCallback(() => {
    if (drawing && drawing.w > MIN_SIZE && drawing.h > MIN_SIZE) {
      setRects((prev) => [...prev, drawing]);
    }
    startRef.current = null;
    setDrawing(null);
  }, [drawing]);

  const undoLast = useCallback(() => setRects((prev) => prev.slice(0, -1)), []);
  const clearAll = useCallback(() => setRects([]), []);

  const handleSubmit = useCallback(async () => {
    if (!user || !companyId) {
      showToast('Sessão expirada. Faça login novamente para enviar.', 'error');
      return;
    }
    setSubmitting(true);
    let finalShot = screenshot;
    if (screenshot && rects.length > 0) {
      finalShot = await burnAnnotations(screenshot, rects);
    }
    let screenshotPath: string | null = null;
    if (finalShot) {
      const uploaded = await uploadBugScreenshot({
        supabase,
        companyId,
        userId: user.id,
        dataUrl: finalShot,
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
      type: 'bug',
      description: description.trim() || null,
      context: capturedContext ?? captureContext(),
      screenshotPath,
      mode: 'advanced',
      isDev: true,
    });
    setSubmitting(false);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast('Report do admin enviado com as marcações. Valeu!', 'success');
    onClose();
  }, [user, companyId, screenshot, rects, description, capturedContext, showToast, onClose]);

  const renderRect = (r: Rect, key: string, dashed = false) => (
    <div
      key={key}
      className="absolute pointer-events-none"
      style={{
        left: `${r.x * 100}%`,
        top: `${r.y * 100}%`,
        width: `${r.w * 100}%`,
        height: `${r.h * 100}%`,
        border: `2px ${dashed ? 'dashed' : 'solid'} ${RECT_COLOR}`,
        boxShadow: '0 0 0 1px rgba(0,0,0,0.25)',
      }}
    />
  );

  const content = (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end md:items-center justify-center p-0 md:p-4">
      <div className={`absolute inset-0 ${classes.modalOverlay}`} onClick={submitting ? undefined : onClose} aria-hidden="true" />
      <FocusTrap
        focusTrapOptions={{
          escapeDeactivates: false,
          allowOutsideClick: true,
          initialFocus: false,
          fallbackFocus: '[data-bug-annotate-dialog]',
        }}
      >
        <div
          data-bug-annotate-dialog
          role="dialog"
          aria-modal="true"
          aria-labelledby="bug-annotate-title"
          tabIndex={-1}
          className={[
            'relative w-full md:max-w-2xl flex flex-col max-h-[94dvh] md:max-h-[90vh]',
            classes.modalContainer,
            'rounded-t-2xl md:rounded-2xl',
            'animate-in slide-in-from-bottom-full md:slide-in-from-bottom-0 md:fade-in md:zoom-in-95 duration-300',
            'focus:outline-none',
          ].join(' ')}
        >
          <div className={`${classes.modalHeader} shrink-0`}>
            <h2 id="bug-annotate-title" className={`text-base md:text-lg font-bold tracking-tight ${colors.text}`}>
              Reporte do admin · marcar e comentar
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
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <span className={`inline-flex items-center gap-2 text-xs ${colors.textMuted}`}>
                <MousePointerSquareDashed className="w-4 h-4" aria-hidden="true" />
                Arraste sobre o print para marcar a área do problema.
              </span>
              <div className="flex gap-2">
                <Button variant="ghost" size="sm" onClick={undoLast} disabled={rects.length === 0 || submitting} icon={<Undo2 className="w-4 h-4" />}>
                  Desfazer
                </Button>
                <Button variant="ghost" size="sm" onClick={clearAll} disabled={rects.length === 0 || submitting} icon={<Trash2 className="w-4 h-4" />}>
                  Limpar
                </Button>
              </div>
            </div>

            <div
              ref={wrapperRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={[
                'relative w-full overflow-hidden select-none border',
                colors.border,
                radius.card,
                colors.card,
                screenshot ? 'cursor-crosshair touch-none' : '',
                'flex items-center justify-center min-h-[180px]',
              ].join(' ')}
            >
              {screenshot ? (
                <>
                  <img
                    src={screenshot}
                    alt="Print da tela para marcação"
                    className="w-full h-auto block pointer-events-none"
                    draggable={false}
                  />
                  {rects.map((r, i) => renderRect(r, `rect-${i}`))}
                  {drawing && renderRect(drawing, 'drawing', true)}
                </>
              ) : (
                <span className={`inline-flex flex-col items-center gap-2 text-xs p-8 ${colors.textMuted}`}>
                  <Camera className="w-6 h-6" aria-hidden="true" />
                  Não foi possível capturar a tela. Você ainda pode enviar o comentário.
                </span>
              )}
            </div>

            <div>
              <label htmlFor="bug-annotate-description" className={`block mb-2 ${classes.label}`}>
                Comentário
              </label>
              <textarea
                id="bug-annotate-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Descreva o que está errado nas áreas marcadas."
                disabled={submitting}
                className={[classes.input, 'min-h-[100px] resize-y'].join(' ')}
              />
            </div>
          </div>

          <div className={`shrink-0 px-5 md:px-6 py-4 border-t ${colors.divider} flex flex-col-reverse sm:flex-row gap-2 sm:justify-between sm:items-center`}>
            <span className={`text-xs ${colors.textMuted}`}>
              {rects.length > 0 ? `${rects.length} marcação(ões)` : 'Nenhuma marcação'}
            </span>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <Button variant="ghost" onClick={onClose} disabled={submitting}>
                Cancelar
              </Button>
              <Button variant="primary" onClick={handleSubmit} loading={submitting} disabled={submitting} className="sm:order-last order-first">
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Enviar report'}
              </Button>
            </div>
          </div>
        </div>
      </FocusTrap>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};
