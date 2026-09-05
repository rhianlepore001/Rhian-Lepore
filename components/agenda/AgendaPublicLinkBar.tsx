import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Link as LinkIcon, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { copyTextToClipboard } from '../../utils/clipboard';
import { Button } from '../ui/Button';
import { useToast } from '../ui/Toast';

export interface AgendaPublicLinkBarProps {
  businessSlug: string | null;
  publicBookingEnabled?: boolean;
  isStaff: boolean;
}

export function buildPublicBookingLink(slug: string, origin: string = window.location.origin): string {
  return `${origin}/#/book/${slug}`;
}

export const AgendaPublicLinkBar: React.FC<AgendaPublicLinkBarProps> = ({
  businessSlug,
  publicBookingEnabled = true,
  isStaff,
}) => {
  const { user } = useAuth();
  const { colors, accent } = useBrutalTheme();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  const markBookingStepDone = useCallback(() => {
    if (user?.id) {
      localStorage.setItem(`booking_visited_${user.id}`, 'true');
    }
    window.dispatchEvent(new CustomEvent('setup-step-completed', { detail: { stepId: 'booking' } }));
  }, [user?.id]);

  const handleCopy = useCallback(async () => {
    if (!businessSlug) return;
    const link = buildPublicBookingLink(businessSlug);
    const ok = await copyTextToClipboard(link);
    if (!ok) {
      showToast('Não foi possível copiar o link.', 'error');
      return;
    }
    setCopied(true);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setCopied(false), 2000);
    markBookingStepDone();
    showToast('Link copiado. Cole no WhatsApp para o cliente.', 'success');
  }, [businessSlug, markBookingStepDone, showToast]);

  const goToBookingSettings = () => {
    navigate('/configuracoes/agendamento');
  };

  if (!businessSlug) {
    if (isStaff) return null;
    return (
      <section data-testid="agenda-public-link" className="shrink-0">
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${colors.card} ${colors.border}`}>
          <LinkIcon className={`w-4 h-4 shrink-0 ${accent.text}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className={`${colors.text} font-bold text-sm leading-snug`}>Link de agendamento</p>
            <p className={`${colors.textSecondary} text-xs leading-snug`}>
              Crie o link para o cliente marcar sozinho.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={goToBookingSettings}
            icon={<Settings />}
            className="shrink-0"
            aria-label="Configurar link de agendamento"
          >
            Configurar
          </Button>
        </div>
      </section>
    );
  }

  if (!publicBookingEnabled) {
    if (isStaff) return null;
    return (
      <section data-testid="agenda-public-link" className="shrink-0">
        <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${colors.card} ${colors.border}`}>
          <LinkIcon className={`w-4 h-4 shrink-0 ${accent.text}`} aria-hidden />
          <div className="min-w-0 flex-1">
            <p className={`${colors.text} font-bold text-sm leading-snug`}>Agendamento online desativado</p>
            <p className={`${colors.textSecondary} text-xs leading-snug`}>
              Ative em Ajustes para receber reservas pelo link.
            </p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={goToBookingSettings}
            icon={<Settings />}
            className="shrink-0"
            aria-label="Ativar agendamento online"
          >
            Ativar
          </Button>
        </div>
      </section>
    );
  }

  const publicLink = buildPublicBookingLink(businessSlug);

  return (
    <section data-testid="agenda-public-link" className="shrink-0">
      <div className={`flex items-center gap-2 rounded-xl border px-3 py-2 ${colors.card} ${colors.border}`}>
        <LinkIcon className={`w-4 h-4 shrink-0 ${accent.text}`} aria-hidden />
        <div className="min-w-0 flex-1">
          <p className={`${colors.text} font-bold text-sm leading-snug`}>Link de agendamento</p>
          <p className={`${colors.textMuted} text-xs font-mono truncate`} title={publicLink}>
            /#/book/{businessSlug}
          </p>
        </div>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => { void handleCopy(); }}
          icon={copied ? <Check /> : <Copy />}
          className="shrink-0"
          aria-label={copied ? 'Link copiado' : 'Copiar link de agendamento público'}
        >
          {copied ? 'Copiado!' : 'Copiar'}
        </Button>
      </div>
    </section>
  );
};
