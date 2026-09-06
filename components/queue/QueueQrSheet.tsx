import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Button, Modal, useToast } from '@/components/ui';
import { Link } from 'react-router-dom';
import { queueJoinUrl } from '@/utils/queueQr';
import type { QueueMode } from '@/types/queue';

interface TeamOption {
  id: string;
  name: string;
}

interface QueueQrSheetProps {
  open: boolean;
  slug: string | null;
  mode: QueueMode;
  teamMembers: TeamOption[];
  onClose: () => void;
}

async function toQrDataUrl(url: string): Promise<string> {
  return QRCode.toDataURL(url, {
    width: 720,
    margin: 1,
    color: { dark: '#111111', light: '#FFFFFF' },
  });
}

export const QueueQrSheet: React.FC<QueueQrSheetProps> = ({
  open,
  slug,
  mode,
  teamMembers,
  onClose,
}) => {
  const { showToast } = useToast();
  const [images, setImages] = useState<Array<{ label: string; url: string; src: string }>>([]);

  useEffect(() => {
    if (!open || !slug) {
      setImages([]);
      return;
    }
    const origin = window.location.origin;
    const targets = mode === 'per_professional'
      ? teamMembers.map((member) => ({
        label: member.name,
        url: queueJoinUrl(origin, slug, member.id),
      }))
      : [{ label: 'Fila da casa', url: queueJoinUrl(origin, slug) }];

    let active = true;
    Promise.all(targets.map(async (target) => ({
      ...target,
      src: await toQrDataUrl(target.url),
    }))).then((rows) => {
      if (active) setImages(rows);
    }).catch(() => {
      if (active) showToast('Não foi possível gerar o QR.', 'error');
    });
    return () => {
      active = false;
    };
  }, [mode, open, showToast, slug, teamMembers]);

  const download = (src: string, label: string) => {
    const link = document.createElement('a');
    link.href = src;
    link.download = `fila-${slug ?? 'casa'}-${label.toLowerCase().replace(/\s+/g, '-')}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal open={open} onClose={onClose} title="QR da fila" size="md">
      {!slug ? (
        <div className="space-y-3">
          <p className="text-sm text-theme-textSecondary">
            Crie o link público da casa para gerar o QR da fila.
          </p>
          <Link
            to="/configuracoes/agendamento"
            className="inline-flex items-center justify-center min-h-[44px] px-4 rounded-xl bg-[var(--color-accent)] text-[var(--color-on-accent)] font-semibold"
          >
            Criar slug
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {images.map((image) => (
            <div key={image.url} className="space-y-2">
              <p className="font-semibold text-theme-text">{image.label}</p>
              <div className="bg-white p-3 rounded-2xl flex justify-center">
                <img src={image.src} alt={`QR ${image.label}`} className="w-48 h-48" />
              </div>
              <p className="text-xs font-mono break-all text-theme-textSecondary">{image.url}</p>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" className="min-h-[44px]" onClick={() => download(image.src, image.label)}>
                  Baixar
                </Button>
                <Button variant="ghost" className="min-h-[44px]" onClick={() => window.print()}>
                  Imprimir
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
};
