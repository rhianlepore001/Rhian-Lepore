import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useUI } from '@/contexts/UIContext';
import { BrutalCard } from '@/components/BrutalCard';
import { BrutalButton } from '@/components/BrutalButton';
import { logger } from '@/utils/Logger';

interface PageItem {
  id: string;
  [key: string]: unknown;
}

export const PageName: React.FC = () => {
  const { user, userType, companyId } = useAuth();
  const { isMobile } = useUI();
  const isBeauty = userType === 'beauty';

  const [items, setItems] = useState<PageItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchItems = useCallback(async () => {
    if (!companyId) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('tabela')
        .select('*')
        .eq('company_id', companyId);

      if (error) throw error;
      setItems(data ?? []);
    } catch (err) {
      logger.error('PageName.fetchItems', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  if (loading) {
    return <div className="flex items-center justify-center min-h-[50vh]">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <BrutalCard title="Título" action={<BrutalButton onClick={fetchItems}>Atualizar</BrutalButton>}>
        {items.length === 0 ? (
          <p className={isBeauty ? 'text-gray-500' : 'text-gray-400'}>Nenhum item encontrado.</p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>{item.id}</li>
            ))}
          </ul>
        )}
      </BrutalCard>
    </div>
  );
};
