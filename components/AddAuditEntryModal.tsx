import React, { useCallback, useEffect, useRef, useState } from 'react';
import FocusTrap from 'focus-trap-react';
import { createPortal } from 'react-dom';
import { ImagePlus, X, Trash2 } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import { useToast } from './ui';
import { Button } from './ui/Button';
import { supabase } from '../lib/supabase';
import {
  captureContext,
  createBugReport,
  uploadBugImageFile,
  type BugCategory,
} from '../lib/bugReport';

interface AddAuditEntryModalProps {
  onClose: () => void;
  /** Chamado após criar com sucesso, para o pai recarregar a lista. */
  onCreated: () => void;
}

/** Gravidade 1-5 (mesma taxonomia do agente de triagem). */
const LEVELS: Array<{ value: number; label: string; hint: string }> = [
  { value: 1, label: '1', hint: 'Cosmético' },
  { value: 2, label: '2', hint: 'Componente quebrado' },
  { value: 3, label: '3', hint: 'Erro de dados/banco' },
  { value: 4, label: '4', hint: 'Fluxo interrompido' },
  { value: 5, label: '5', hint: 'Crítico' },
];

const CATEGORIES: Array<{ value: BugCategory; label: string }> = [
  { value: 'other', label: 'Outro' },
  { value: 'agenda', label: 'Agenda' },
  { value: 'finance', label: 'Financeiro' },
  { value: 'clients', label: 'Clientes' },
  { value: 'queue', label: 'Fila' },
  { value: 'settings', label: 'Configurações' },
  { value: 'login', label: 'Login/Cadastro' },
  { value: 'modal', label: 'Modal' },
];

export const AddAuditEntryModal: React.FC<AddAuditEntryModalProps> = ({ onClose, onCreated }) => {
  const { classes, colors, accent, radius } = useBrutalTheme();
  const { user, companyId } = useAuth();
  const { setModalOpen } = useUI();
  const { showToast } = useToast();

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [level, setLevel] = useState<number>(3);
  const [category, setCategory] = useState<BugCategory>('other');
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setModalOpen(true);
    return () => setModalOpen(false);
  }, [setModalOpen]);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose, submitting]);

  const handlePickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const picked = e.target.files?.[0] ?? null;
    if (picked && !picked.type.startsWith('image/')) {
      showToast('Selecione um arquivo de imagem (foto ou print).', 'error');
      return;
    }
    setFile(picked);
  };

  const handleSubmit = useCallback(async () => {
    if (!user || !companyId) {
      showToast('Sessão expirada. Faça login novamente.', 'error');
      return;
    }
    if (!title.trim() && !description.trim()) {
      showToast('Escreva ao menos um título ou uma descrição.', 'error');
      return;
    }
    setSubmitting(true);

    let screenshotPath: string | null = null;
    if (file) {
      const uploaded = await uploadBugImageFile({ supabase, companyId, userId: user.id, file });
      screenshotPath = uploaded.path;
      if (uploaded.error) {
        showToast('Não consegui subir a imagem, mas vou registrar o problema mesmo assim.', 'warning');
      }
    }

    // Título vira a 1ª linha da descrição (buildTitle usa isso); juntamos os dois.
    const fullDescription = [title.trim(), description.trim()].filter(Boolean).join('\n');

    const result = await createBugReport({
      supabase,
      companyId,
      userId: user.id,
      type: 'bug',
      description: fullDescription || null,
      context: captureContext(),
      screenshotPath,
      mode: 'advanced',
      isDev: true,
      level,
      category,
    });

    setSubmitting(false);
    if (result.error) {
      showToast(result.error, 'error');
      return;
    }
    showToast('Problema adicionado à auditoria.', 'success');
    onCreated();
    onClose();
  }, [user, companyId, title, description, file, level, category, showToast, onCreated, onClose]);

  const content = (
    <div className="fixed inset-0 z-[var(--z-modal)] flex items-end md:items-center justify-center p-0 md:p-4">
      <div className={`absolute inset-0 ${classes.modalOverlay}`} onClick={submitting ? undefined : onClose} aria-hidden="true" />
      <FocusTrap
        focusTrapOptions={{
          escapeDeactivates: false,
          allowOutsideClick: true,
          initialFocus: false,
          fallbackFocus: '[data-add-audit-dialog]',
        }}
      >
        <div
          data-add-audit-dialog
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-audit-title"
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
            <h2 id="add-audit-title" className={`text-base md:text-lg font-bold tracking-tight ${colors.text}`}>
              Adicionar problema
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
            {/* Imagem (PC/mobile) */}
            <div>
              <span className={`block mb-2 ${classes.label}`}>Imagem do problema (opcional)</span>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePickFile}
                disabled={submitting}
                className="sr-only"
                aria-label="Selecionar imagem"
              />
              {preview ? (
                <div className={['relative overflow-hidden border', colors.border, radius.card].join(' ')}>
                  <img src={preview} alt="Pré-visualização" className="w-full max-h-64 object-contain bg-[var(--color-bg)]/20" />
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    disabled={submitting}
                    className="absolute top-2 right-2 inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs bg-[var(--color-danger-bg)] text-[var(--color-danger)] border border-[var(--color-danger-border)]"
                  >
                    <Trash2 className="w-3.5 h-3.5" /> Remover
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={submitting}
                  className={[
                    'w-full aspect-video flex flex-col items-center justify-center gap-2 border border-dashed',
                    colors.border,
                    radius.card,
                    colors.card,
                    'hover:bg-[var(--color-card-hover)] transition-colors',
                    colors.textMuted,
                  ].join(' ')}
                >
                  <ImagePlus className="w-7 h-7" aria-hidden="true" />
                  <span className="text-xs">Toque para anexar uma foto ou print (galeria/arquivos)</span>
                </button>
              )}
            </div>

            {/* Título */}
            <div>
              <label htmlFor="audit-title" className={`block mb-2 ${classes.label}`}>Título</label>
              <input
                id="audit-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={90}
                placeholder="Resumo curto do problema"
                disabled={submitting}
                className={classes.input}
              />
            </div>

            {/* Descrição */}
            <div>
              <label htmlFor="audit-description" className={`block mb-2 ${classes.label}`}>Descrição</label>
              <textarea
                id="audit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                maxLength={2000}
                rows={4}
                placeholder="O que acontece, onde, e o que era esperado."
                disabled={submitting}
                className={[classes.input, 'min-h-[100px] resize-y'].join(' ')}
              />
            </div>

            {/* Gravidade */}
            <div>
              <span className={`block mb-2 ${classes.label}`}>Gravidade</span>
              <div className="grid grid-cols-5 gap-2">
                {LEVELS.map((lv) => {
                  const active = level === lv.value;
                  return (
                    <button
                      key={lv.value}
                      type="button"
                      onClick={() => setLevel(lv.value)}
                      disabled={submitting}
                      title={lv.hint}
                      aria-pressed={active}
                      className={[
                        'flex flex-col items-center justify-center gap-0.5 py-2 rounded-lg border text-center transition-colors',
                        active ? `${accent.bg} ${accent.border} text-[var(--color-bg)]` : `${colors.card} ${colors.border} ${colors.textSecondary} hover:bg-[var(--color-card-hover)]`,
                      ].join(' ')}
                    >
                      <span className="text-sm font-bold">{lv.label}</span>
                      <span className="text-xs leading-tight px-0.5">{lv.hint}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Área */}
            <div>
              <label htmlFor="audit-category" className={`block mb-2 ${classes.label}`}>Área</label>
              <select
                id="audit-category"
                value={category}
                onChange={(e) => setCategory(e.target.value as BugCategory)}
                disabled={submitting}
                className={classes.input}
              >
                {CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className={`shrink-0 px-5 md:px-6 py-4 border-t ${colors.divider} flex flex-col-reverse sm:flex-row gap-2 sm:justify-end`}>
            <Button variant="ghost" onClick={onClose} disabled={submitting}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={handleSubmit} loading={submitting} disabled={submitting} className="sm:order-last order-first">
              Adicionar
            </Button>
          </div>
        </div>
      </FocusTrap>
    </div>
  );

  if (typeof document === 'undefined') return null;
  return createPortal(content, document.body);
};
