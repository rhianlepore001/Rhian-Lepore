# AgenX — Padrões de Componentes

## BrutalCard

```tsx
import { BrutalCard } from '@/components/BrutalCard';

// Uso básico
<BrutalCard title="Título do Card" className="brutal-card-enhanced">
  {/* conteúdo */}
</BrutalCard>

// Sem padding
<BrutalCard noPadding className="gold-accent-border">
  <div className="p-4">conteúdo com padding manual</div>
</BrutalCard>
```

## BrutalButton

```tsx
import { BrutalButton } from '@/components/BrutalButton';

<BrutalButton variant="primary" size="md">Ação Principal</BrutalButton>
<BrutalButton variant="ghost" size="sm">Ação Secundária</BrutalButton>
// variants: primary | secondary | ghost | danger
// sizes: sm | md | lg
```

## Skeleton Loading

```tsx
import { Skeleton } from '@/components/SkeletonLoader';

{loading ? (
  <div className="space-y-3">
    <Skeleton className="h-12 w-full" />
    <Skeleton className="h-12 w-full opacity-60" />
    <Skeleton className="h-12 w-full opacity-30" />
  </div>
) : (
  <ActualContent />
)}
```

## Toast / Alert

```tsx
const { addAlert } = useAlerts();

// Sucesso
addAlert({ type: 'success', text: 'Agendamento criado com sucesso!' });

// Erro
addAlert({ type: 'error', text: 'Erro ao salvar. Tente novamente.' });

// Aviso
addAlert({ type: 'warning', text: 'Dados incompletos.' });
```

## Modal Padrão

```tsx
import { Modal } from '@/components/Modal';

<Modal
  isOpen={isOpen}
  onClose={() => setIsOpen(false)}
  title="Título do Modal"
>
  {/* conteúdo */}
</Modal>
```

## Empty State com CTA

```tsx
// Padrão obrigatório — nunca usar só texto
<div className="p-8 text-center space-y-3">
  <p className="text-text-secondary text-sm">
    Nenhum agendamento ainda.
  </p>
  <p className="text-xs text-text-secondary">
    Compartilhe seu link para receber agendamentos:
  </p>
  <BrutalButton variant="ghost" size="sm" onClick={copyLink}>
    Copiar link →
  </BrutalButton>
</div>
```

## Componente com Dual Theme — Template Completo

```tsx
import React from 'react';
import { useAuth } from '@/contexts/AuthContext';

interface MyComponentProps {
  isBeauty: boolean;
  // ... outras props
}

export const MyComponent: React.FC<MyComponentProps> = ({ isBeauty }) => {
  const { companyId } = useAuth();
  const { addAlert } = useAlerts();

  // Tema
  const accentText  = isBeauty ? 'text-beauty-neon' : 'text-accent-gold';
  const accentBg    = isBeauty ? 'bg-beauty-neon'   : 'bg-accent-gold';

  // Loading
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  // Fetch
  useEffect(() => {
    const fetchData = async () => {
      try {
        const { data, error } = await supabase
          .from('appointments')
          .select('*')
          .eq('company_id', companyId); // OBRIGATÓRIO

        if (error) throw error;
        setData(data || []);
      } catch (err) {
        logger.error('Erro ao buscar dados', err);
        addAlert({ type: 'error', text: 'Erro ao carregar dados.' });
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [companyId]);

  return (
    <div className="bg-neutral-900 border border-white/10 rounded-xl p-4">
      {loading ? (
        <Skeleton className="h-12 w-full" />
      ) : data.length === 0 ? (
        <EmptyState />  // sempre com CTA
      ) : (
        <DataList data={data} accentText={accentText} />
      )}
    </div>
  );
};
```

## Animações de Entrada

```tsx
// Padrão usado no Dashboard
className="animate-in fade-in slide-in-from-bottom-4 duration-500 delay-100"
className="animate-in fade-in slide-in-from-top-2 duration-700"
```

## InfoButton (Tooltip)

```tsx
import { InfoButton } from '@/components/HelpButtons';

<div className="flex items-center gap-2">
  <span>Título da Seção</span>
  <InfoButton text="Explicação simples para o usuário." />
</div>
```
