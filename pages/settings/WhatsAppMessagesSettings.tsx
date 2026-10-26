import React, { useRef, useState } from 'react';
import { MessageCircle, Pencil, RotateCcw, Send } from 'lucide-react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { SettingsSwitch } from '../../components/SettingsSwitch';
import { Button, ConfirmModal, Modal, useToast } from '../../components/ui';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useProfileFields } from '../../hooks/useSettings';
import { useWhatsAppTemplates } from '../../hooks/useWhatsAppTemplates';
import {
  WHATSAPP_TEMPLATE_GROUPS,
  validateWhatsAppTemplate,
  whatsAppPreviewVars,
} from '../../utils/whatsappTemplateEditor';
import {
  buildWhatsAppLink,
  renderTemplate,
  TEMPLATE_ALLOWED_KEYS,
  WHATSAPP_TEMPLATES,
  type WhatsAppTemplateKey,
  type WhatsAppVariable,
} from '../../utils/whatsappTemplates';

export const WhatsAppMessagesSettings: React.FC = () => {
  const { businessName, region, role } = useAuth();
  const { colors, accent, radius, theme, classes } = useBrutalTheme();
  const { data: profile } = useProfileFields();
  const { templates, save, restore, saving, isLoading, isError, refetch } =
    useWhatsAppTemplates();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<WhatsAppTemplateKey | null>(null);
  const [body, setBody] = useState('');
  const [confirmRestore, setConfirmRestore] = useState(false);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const error = editing ? validateWhatsAppTemplate(editing, body) : null;
  const editorTitle = WHATSAPP_TEMPLATE_GROUPS.flatMap(
    (group) => group.messages,
  ).find((message) => message.key === editing)?.title;
  const preview = editing
    ? renderTemplate(
        body,
        whatsAppPreviewVars(businessName || 'Seu negócio', region, editing),
        TEMPLATE_ALLOWED_KEYS[editing],
      )
    : '';

  if (role !== 'owner') return null;

  const openEditor = (key: WhatsAppTemplateKey) => {
    setBody(templates[key]?.body ?? WHATSAPP_TEMPLATES[key][theme]);
    setEditing(key);
  };

  const insertVariable = (variable: WhatsAppVariable) => {
    const input = textarea.current;
    const start = input?.selectionStart ?? body.length;
    const end = input?.selectionEnd ?? body.length;
    const chip = `{${variable}}`;
    setBody(body.slice(0, start) + chip + body.slice(end));
    requestAnimationFrame(() => {
      input?.focus();
      input?.setSelectionRange(start + chip.length, start + chip.length);
    });
  };

  const persist = async (
    key: WhatsAppTemplateKey,
    enabled: boolean,
    nextBody: string | null,
  ) => {
    try {
      await save({ message_key: key, enabled, body: nextBody });
      showToast('Mensagem salva.', 'success');
      return true;
    } catch {
      showToast(
        'Não foi possível salvar a mensagem. Tente novamente.',
        'error',
      );
      return false;
    }
  };

  return (
    <SettingsLayout>
      <div className={`space-y-8 ${colors.text}`}>
        <header className="space-y-2">
          <div
            className={`inline-flex items-center gap-2 text-sm font-semibold ${accent.text}`}
          >
            <MessageCircle className="w-5 h-5" />
            Comunicação com seus clientes
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">
            Mensagens do WhatsApp
          </h1>
          <p
            className={`max-w-2xl text-sm leading-relaxed ${colors.textSecondary}`}
          >
            Deixe cada mensagem com o jeito do seu negócio. Escolha quando
            enviar e personalize o texto que aparece no WhatsApp.
          </p>
          <p className={`text-sm ${colors.textMuted}`}>
            O envio continua sendo feito por você. Desativar confirmações e
            remarcações oculta a opção de envio; nos demais contatos, o WhatsApp
            abre sem texto.
          </p>
        </header>
        {isLoading && <p role="status">Carregando suas mensagens…</p>}
        {isError && (
          <div role="alert" className="space-y-2">
            <p>Não foi possível carregar suas mensagens.</p>
            <Button onClick={() => void refetch()}>Tentar novamente</Button>
          </div>
        )}
        {!isLoading &&
          !isError &&
          WHATSAPP_TEMPLATE_GROUPS.map((group) => (
            <section
              key={group.title}
              aria-label={group.title}
              className="space-y-3"
            >
              <h2 className="text-lg font-semibold">{group.title}</h2>
              <div className="grid gap-3 xl:grid-cols-2">
                {group.messages.map((message) => {
                  const active = templates[message.key]?.enabled !== false;
                  return (
                    <article
                      key={message.key}
                      aria-label={message.title}
                      className={`border ${colors.border} ${colors.card} ${radius.card} p-5 flex flex-col gap-4`}
                    >
                      <div className="flex justify-between items-start gap-4">
                        <div>
                          <h3 className="font-semibold">{message.title}</h3>
                          <p
                            className={`text-sm leading-relaxed mt-1 ${colors.textSecondary}`}
                          >
                            {message.summary}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`text-xs ${colors.textSecondary}`}>
                            Ativa
                          </span>
                          <SettingsSwitch
                            id={`active-${message.key}`}
                            ariaLabel={`Ativa: ${message.title}`}
                            checked={active}
                            onChange={(enabled) => {
                              if (!saving)
                                void persist(
                                  message.key,
                                  enabled,
                                  templates[message.key]?.body ?? null,
                                );
                            }}
                          />
                        </div>
                      </div>
                      <div className="flex justify-between items-center gap-3 mt-auto">
                        <span className={`text-xs ${colors.textMuted}`}>
                          {active
                            ? templates[message.key]?.body == null
                              ? 'Texto padrão'
                              : 'Texto personalizado'
                            : 'Desativada'}
                        </span>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => openEditor(message.key)}
                        >
                          <Pencil className="w-4 h-4" />
                          Editar
                          <span className="sr-only"> {message.title}</span>
                        </Button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
      </div>
      <Modal
        open={editing !== null}
        onClose={() => {
          if (!saving) setEditing(null);
        }}
        title={editorTitle}
        subtitle="Personalize a mensagem"
        size="2xl"
        preventClose={saving}
        footer={
          <div className="flex flex-col-reverse sm:flex-row justify-between gap-3 w-full">
            <Button
              variant="ghost"
              disabled={saving}
              onClick={() => setConfirmRestore(true)}
            >
              <RotateCcw className="w-4 h-4" />
              Restaurar padrão
            </Button>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="secondary"
                disabled={!!error || saving}
                onClick={() => {
                  if (!profile?.phone?.replace(/\D/g, '')) {
                    showToast(
                      'Cadastre seu WhatsApp em Ajustes > Geral para testar a mensagem.',
                      'info',
                    );
                    return;
                  }
                  window.open(
                    buildWhatsAppLink(
                      profile.phone,
                      region === 'PT' ? 'PT' : 'BR',
                      preview,
                    ),
                    '_blank',
                    'noopener,noreferrer',
                  );
                }}
              >
                <Send className="w-4 h-4" />
                Testar no meu WhatsApp
              </Button>
              <Button
                disabled={!!error || saving}
                loading={saving}
                onClick={async () => {
                  if (
                    editing &&
                    !error &&
                    (await persist(
                      editing,
                      templates[editing]?.enabled ?? true,
                      body,
                    ))
                  )
                    setEditing(null);
                }}
              >
                Salvar
              </Button>
            </div>
          </div>
        }
      >
        {editing && (
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <label
                htmlFor="whatsapp-message-body"
                className="text-sm font-semibold"
              >
                Texto da mensagem
              </label>
              <textarea
                id="whatsapp-message-body"
                ref={textarea}
                rows={10}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                aria-invalid={!!error}
                aria-describedby={
                  error ? 'whatsapp-body-error' : 'whatsapp-body-help'
                }
                className={`${classes.input} w-full min-h-[220px] resize-y p-3 text-sm`}
              />
              <div
                className={`flex justify-between gap-3 text-xs ${colors.textSecondary}`}
              >
                <span id="whatsapp-body-help">Use *negrito* e _itálico_.</span>
                <span aria-live="polite">{Array.from(body).length}/1000</span>
              </div>
              {error && (
                <p
                  id="whatsapp-body-error"
                  role="alert"
                  className="text-sm text-[var(--color-danger)]"
                >
                  {error}
                </p>
              )}
              <p className={`text-sm ${colors.textSecondary}`}>
                Toque para inserir uma informação:
              </p>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_ALLOWED_KEYS[editing].map((variable) => (
                  <button
                    type="button"
                    key={variable}
                    onClick={() => insertVariable(variable)}
                    className={`min-h-[44px] px-3 py-2 text-xs border ${accent.border} ${accent.text} ${radius.badge}`}
                  >{`{${variable}}`}</button>
                ))}
              </div>
            </div>
            <div className="space-y-3">
              <h3 className="text-sm font-semibold">Pré-visualização</h3>
              <div
                className={`p-4 ${radius.card} bg-[var(--color-surface)] min-h-[240px]`}
              >
                <p className={`text-xs mb-4 ${colors.textMuted}`}>
                  {businessName || 'Seu negócio'} · Exemplo
                </p>
                <div
                  data-testid="whatsapp-preview"
                  className={`whitespace-pre-wrap break-words rounded-2xl rounded-tr-sm border ${accent.border} ${accent.bgDim} p-4 text-sm leading-relaxed ${colors.text}`}
                >
                  {preview}
                </div>
              </div>
              <p className={`text-xs ${colors.textMuted}`}>
                Os nomes, datas e valores acima são exemplos. No envio, usamos
                os dados do atendimento.
              </p>
            </div>
          </div>
        )}
      </Modal>
      <ConfirmModal
        open={confirmRestore}
        title="Restaurar mensagem padrão?"
        message="Seu texto personalizado será substituído pelo texto padrão do seu negócio. A opção Ativa será mantida."
        confirmLabel="Restaurar padrão"
        loading={saving}
        onCancel={() => setConfirmRestore(false)}
        onConfirm={async () => {
          if (!editing) return;
          try {
            await restore(editing);
            setBody(WHATSAPP_TEMPLATES[editing][theme]);
            setConfirmRestore(false);
            showToast('Mensagem padrão restaurada.', 'success');
          } catch {
            showToast('Não foi possível restaurar. Tente novamente.', 'error');
          }
        }}
      />
    </SettingsLayout>
  );
};
