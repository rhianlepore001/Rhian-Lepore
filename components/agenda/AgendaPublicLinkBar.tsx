import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Copy, Link as LinkIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
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
      <Button
        variant="secondary"
        icon={<LinkIcon />}
        onClick={goToBookingSettings}
        className="flex-1 md:flex-none"
        data-testid="agenda-public-link"
        aria-label="Configurar link de agendamento"
      >
        <span className="hidden md:inline">Configurar link</span>
      </Button>
    );
  }

  if (!publicBookingEnabled) {
    if (isStaff) return null;
    return (
      <Button
        variant="secondary"
        icon={<LinkIcon />}
        onClick={goToBookingSettings}
        className="flex-1 md:flex-none"
        data-testid="agenda-public-link"
        aria-label="Ativar agendamento online"
      >
        <span className="hidden md:inline">Ativar link</span>
      </Button>
    );
  }

  return (
    <Button
      variant="secondary"
      icon={copied ? <Check /> : <Copy />}
      onClick={() => { void handleCopy(); }}
      className="flex-1 md:flex-none"
      data-testid="agenda-public-link"
      aria-label={copied ? 'Link copiado' : 'Copiar link de agendamento público'}
    >
      <span className="hidden md:inline">{copied ? 'Copiado!' : 'Copiar link'}</span>
    </Button>
  );
};
