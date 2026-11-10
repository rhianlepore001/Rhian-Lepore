import React, { useSyncExternalStore } from 'react';
import { MessageCircle } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { isWhatsAppUrl } from '../../utils/openWhatsApp';

/**
 * Passo "Abrir WhatsApp" para fluxos que salvam antes de enviar (Novo
 * Atendimento, Remarcar). O Safari do iPhone bloqueia nova aba aberta depois
 * de um `await`; aqui a pessoa toca num link real para o wa.me, que é um gesto
 * do usuário e o iOS entrega direto ao app do WhatsApp.
 *
 * Fica montado na raiz do app, então continua visível quando o modal que pediu
 * o envio já fechou.
 */
export interface WhatsAppHandoff {
  url: string;
  title: string;
  description: string;
  /** Texto que vai no WhatsApp, mostrado antes do toque. */
  message?: string;
}

let current: WhatsAppHandoff | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((listener) => listener());

export function requestWhatsAppHandoff(handoff: WhatsAppHandoff): void {
  if (!isWhatsAppUrl(handoff.url)) return;
  current = handoff;
  emit();
}

export function clearWhatsAppHandoff(): void {
  if (!current) return;
  current = null;
  emit();
}

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
const snapshot = () => current;

export const WhatsAppHandoffHost: React.FC = () => {
  const handoff = useSyncExternalStore(subscribe, snapshot, snapshot);
  const { classes, radius } = useBrutalTheme();
  const base = `inline-flex items-center justify-center gap-2 font-semibold text-sm px-5 h-11 min-h-[44px] w-full sm:w-auto ${radius.button} focus:outline-none focus:ring-2 focus:ring-offset-1 transition-all duration-200 active:scale-[0.97]`;
  return (
    <Modal
      open={!!handoff}
      onClose={clearWhatsAppHandoff}
      title={handoff?.title}
      size="sm"
      footer={
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end w-full">
          <button type="button" className={`${base} ${classes.buttonGhost}`} onClick={clearWhatsAppHandoff}>
            Agora não
          </button>
          {handoff && (
            <a
              href={handoff.url}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="whatsapp-handoff-open"
              className={`${base} ${classes.buttonPrimary}`}
              onClick={clearWhatsAppHandoff}
            >
              <MessageCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              Abrir WhatsApp
            </a>
          )}
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-[var(--color-text-secondary)] whitespace-pre-line">
        {handoff?.description}
      </p>
      {handoff?.message && (
        <div
          data-testid="whatsapp-handoff-message"
          className="mt-4 whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm border border-[var(--color-border)] bg-[var(--color-surface)] p-3 text-sm leading-relaxed text-[var(--color-text)] max-h-48 overflow-y-auto"
        >
          {handoff.message}
        </div>
      )}
    </Modal>
  );
};
