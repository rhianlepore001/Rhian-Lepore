import React, { useCallback, useState } from 'react';
import { HelpCircle } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useUI } from '../contexts/UIContext';
import { BugReportMenu } from './BugReportMenu';
import { BugReportModal } from './BugReportModal';
import { capturePageForBugReport, type BugContext } from '../lib/bugReport';

type ReportType = 'bug' | 'idea' | 'question';

const SUPPORT_WHATSAPP_URL = '#';

export const BugReportButton: React.FC = () => {
  const { classes, accent, radius } = useBrutalTheme();
  const { setModalOpen } = useUI();

  const [showMenu, setShowMenu] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [reportType, setReportType] = useState<ReportType>('bug');
  const [capturing, setCapturing] = useState(false);
  const [screenshot, setScreenshot] = useState<string | null>(null);
  const [capturedContext, setCapturedContext] = useState<BugContext | null>(null);

  const closeMenu = useCallback(() => {
    setShowMenu(false);
    setModalOpen(false);
  }, [setModalOpen]);

  const openModal = useCallback(
    (type: ReportType) => {
      // Fecha o menu, espera o paint da tela limpa, fotografa o viewport
      // e só então abre o modal — senão o print sai com o menu na frente.
      setShowMenu(false);
      setReportType(type);
      setCapturing(true);
      void (async () => {
        try {
          const { screenshot: shot, context: ctx } = await capturePageForBugReport();
          setCapturedContext(ctx);
          setScreenshot(shot);
          setModalOpen(true);
          setShowModal(true);
        } finally {
          setCapturing(false);
        }
      })();
    },
    [setModalOpen]
  );

  const handleReportBug = useCallback(() => openModal('bug'), [openModal]);
  const handleSuggestIdea = useCallback(() => openModal('idea'), [openModal]);
  const handleContactSupport = useCallback(() => {
    setShowMenu(false);
    setModalOpen(false);
    if (SUPPORT_WHATSAPP_URL && SUPPORT_WHATSAPP_URL !== '#') {
      window.open(SUPPORT_WHATSAPP_URL, '_blank', 'noopener,noreferrer');
    }
  }, [setModalOpen]);

  const handleToggleMenu = useCallback(() => {
    if (capturing) return;
    setShowMenu((prev) => {
      const next = !prev;
      if (!next) setModalOpen(false);
      return next;
    });
  }, [setModalOpen, capturing]);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setScreenshot(null);
    setCapturedContext(null);
  }, []);

  return (
    <>
      <button
        type="button"
        data-bug-report-chrome
        onClick={handleToggleMenu}
        disabled={capturing}
        aria-label="Ajuda e reportar problema"
        aria-expanded={showMenu}
        aria-haspopup="menu"
        title="Ajuda e reportar problema"
        className={[
          'inline-flex items-center justify-center min-h-[44px] min-w-[44px] w-11 h-11 md:w-10 md:h-10',
          'border border-transparent transition-colors duration-150',
          classes.buttonGhost,
          radius.button,
          capturing ? 'invisible pointer-events-none' : '',
        ].join(' ')}
      >
        <HelpCircle className={`w-5 h-5 md:w-6 md:h-6 ${accent.text}`} aria-hidden="true" />
      </button>

      {showMenu && (
        <BugReportMenu
          onClose={closeMenu}
          onReportBug={handleReportBug}
          onSuggestIdea={handleSuggestIdea}
          onContactSupport={handleContactSupport}
        />
      )}

      {showModal && (
        <BugReportModal
          reportType={reportType}
          onClose={closeModal}
          screenshot={screenshot}
          capturedContext={capturedContext}
        />
      )}
    </>
  );
};
