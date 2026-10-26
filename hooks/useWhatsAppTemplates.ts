import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import {
  fetchPublicWhatsAppTemplates,
  fetchWhatsAppTemplates,
  saveWhatsAppTemplate,
} from '../services/whatsappTemplates';
import {
  renderWhatsAppTemplate,
  type TemplateVariant,
  type WhatsAppTemplateKey,
  type WhatsAppTemplateOverride,
  type WhatsAppTemplateOverrides,
  type WhatsAppTemplateVars,
  type WhatsAppTheme,
} from '../utils/whatsappTemplates';

export function useWhatsAppTemplates(publicSlug?: string) {
  const { companyId, role } = useAuth();
  const queryClient = useQueryClient();
  const isPublic = publicSlug !== undefined;
  const queryKey = [
    'whatsapp-templates',
    isPublic ? 'public' : 'tenant',
    isPublic ? publicSlug : companyId,
  ];
  const query = useQuery({
    queryKey,
    queryFn: () =>
      isPublic
        ? fetchPublicWhatsAppTemplates(publicSlug!)
        : fetchWhatsAppTemplates(companyId!),
    enabled: isPublic ? !!publicSlug : !!companyId,
    staleTime: 60_000,
  });
  const templates: WhatsAppTemplateOverrides = useMemo(
    () =>
      Object.fromEntries(
        (query.data ?? []).map((row) => [row.message_key, row]),
      ),
    [query.data],
  );
  const mutation = useMutation({
    mutationFn: (template: WhatsAppTemplateOverride) => {
      if (isPublic || !companyId || role !== 'owner')
        throw new Error('Só o gestor pode salvar mensagens.');
      return saveWhatsAppTemplate(companyId, template);
    },
    onSuccess: (saved) => {
      queryClient.setQueryData<WhatsAppTemplateOverride[]>(
        queryKey,
        (previous) => [
          ...(previous ?? []).filter(
            (row) => row.message_key !== saved.message_key,
          ),
          saved,
        ],
      );
      void queryClient.invalidateQueries({
        queryKey: ['whatsapp-templates', 'public'],
      });
    },
  });
  return {
    ...query,
    templates,
    save: mutation.mutateAsync,
    saving: mutation.isPending,
    restore: (key: WhatsAppTemplateKey) =>
      mutation.mutateAsync({
        message_key: key,
        enabled: templates[key]?.enabled ?? true,
        body: null,
      }),
    isEnabled: (key: WhatsAppTemplateKey) => templates[key]?.enabled !== false,
    render: (
      key: WhatsAppTemplateKey,
      theme: WhatsAppTheme,
      vars: WhatsAppTemplateVars,
      variant?: TemplateVariant,
    ) => renderWhatsAppTemplate(key, theme, vars, variant, templates[key]),
  };
}
