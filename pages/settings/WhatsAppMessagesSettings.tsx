import React, { useState } from 'react';
import { MessageCircle, Pencil } from 'lucide-react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { SettingsSwitch } from '../../components/SettingsSwitch';
import { Button, useToast } from '../../components/ui';
import { WhatsAppTemplateEditorModal } from '../../components/whatsapp/WhatsAppTemplateEditorModal';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useWhatsAppTemplates } from '../../hooks/useWhatsAppTemplates';
import {
  ALWAYS_OFFERED_WHATSAPP_KEYS,
  WHATSAPP_TEMPLATE_GROUPS,
} from '../../utils/whatsappTemplateEditor';
import { type WhatsAppTemplateKey } from '../../utils/whatsappTemplates';

export const WhatsAppMessagesSettings: React.FC = () => {
  const { role } = useAuth();
  const { colors, accent, radius } = useBrutalTheme();
  const { templates, save, saving, isLoading, isError, refetch } =
    useWhatsAppTemplates();
  const { showToast } = useToast();
  const [editing, setEditing] = useState<WhatsAppTemplateKey | null>(null);

  if (role !== 'owner') return null;

  const openEditor = (key: WhatsAppTemplateKey) => setEditing(key);

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
            abre sem texto. No Novo agendamento, a opção aparece sempre, começa
            desligada e você decide a cada atendimento.
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
                  const alwaysOffered = ALWAYS_OFFERED_WHATSAPP_KEYS.has(message.key);
                  const active = alwaysOffered || templates[message.key]?.enabled !== false;
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
                        {!alwaysOffered && <div className="flex items-center gap-2 shrink-0">
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
                        </div>}
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
      <WhatsAppTemplateEditorModal
        key={editing ?? 'fechado'}
        editing={editing}
        onClose={() => setEditing(null)}
      />
    </SettingsLayout>
  );
};
