# Spec: Ajustes (Settings) Redesign

## Objetivo

Elevar a experiência de Ajustes de nota 4/10 para 9/10. Simplificar formulários longos com cards temáticos, substituir seletores confusos por toggle switches e construir um editor de horários visual e intuitivo.

---

## Scope

### In
- `pages/settings/GeneralSettings.tsx` — perfil, logo, cover, endereço.
- `pages/settings/ServiceSettings.tsx` — serviços e categorias.
- `pages/settings/TeamSettings.tsx` — equipe e comissões.
- `pages/settings/FinancialSettings.tsx` — configurações financeiras.
- `pages/settings/PublicBookingSettings.tsx` — configurações do booking.
- `components/BusinessHoursEditor.tsx` — editor de horários.
- `components/BrandIdentitySection.tsx` — upload de logo/cover.
- `components/SettingsLayout.tsx` — layout das configurações.

### Out
- Backend / Supabase (manter mutations existentes).
- Lógica de comissões e pagamentos.

---

## Technical Approach

1. **Cards Temáticos por Seção**
   - Agrupar campos em cards com título contextual e ícone (Lucide).
   - Ex: "Identidade Visual" (palette + imagem), "Horários de Funcionamento" (relogio), "Contato" (phone).
   - Cada card com `BrutalCard` atualizado (glass sutil, radius `rounded-2xl`).

2. **Toggle Switches**
   - Substituir checkboxes genéricos por toggles customizados:
     - Track: `w-11 h-6 rounded-full bg-neutral-700`.
     - Thumb: `w-5 h-5 rounded-full bg-white` com transição `translate-x`.
     - Ativo: cor do tema (`accent-gold` ou `beauty-neon`).
   - Usar para flags como `enable_upsells`, `enable_professional_selection`, `machine_fee_enabled`.

3. **Construtor de Horários Visual**
   - Redesenhar `BusinessHoursEditor` para um grid visual:
     - Cada dia da semana como uma linha.
     - Toggle para abrir/fechar o dia.
     - Blocos de horário com input de time lado a lado (`09:00 — 18:00`).
     - Botão "+" para adicionar blocos (ex: manhã e tarde).
     - Visualização compacta em mobile (accordion por dia).

4. **Upload de Fotos Clara**
   - `ImageUploadZone`: área de drop com preview imediato, botão de remover, limite de 10MB.
   - Indicador de progresso (opcional) e estado de erro.
   - Manter lógica de upload para buckets `logos` e `covers`.

5. **Formulários**
   - Inputs com focus ring do tema (gold/lavanda).
   - Labels em `font-sans text-xs uppercase tracking-wider`.
   - `SaveFooter` fixo no mobile (sticky bottom) para facilitar salvar.

---

## Component List

| Componente | Descrição |
|------------|-----------|
| `SettingsSectionCard` | Card temático com ícone, título e formulário |
| `ToggleSwitch` | Toggle customizado com animação e tema |
| `VisualHoursBuilder` | Grid/accordion de horários por dia |
| `ImageUploadZone` | Dropzone de imagem com preview e remoção |
| `SettingsSaveBar` | Barra fixa de salvar para mobile |

---

## Data Requirements

- `profiles` (business_name, phone, address, logo, cover).
- `business_settings` (hours, policy, flags).
- `services`, `service_categories`, `team_members`.
- Nenhuma mudança no schema.

---

## Acceptance Criteria

- [ ] Settings renderizam sem scroll excessivo em mobile (cards colapsáveis/accordion).
- [ ] Toggle switches animam suavemente e refletem estado real.
- [ ] Editor de horários permite adicionar/remover blocos sem confusão.
- [ ] Upload de logo/cover mostra preview imediato e respeita limite de 10MB.
- [ ] Testes existentes (`FinancialSettings.test.tsx`) passam.
- [ ] `npm run typecheck` e `npm run lint` limpos.
- [ ] Dark/Light ok para ambos os temas.

---

## Estimativa

**Tamanho:** L (1 sprint)  
**Justificativa:** Muitas páginas de settings e componentes de formulário complexos. Requer atenção especial à UX mobile.
