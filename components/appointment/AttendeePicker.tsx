import React, { useState } from 'react';
import { createDependent } from '@/services/clientDependents';
import { useClientDependents } from '@/hooks/useClientDependents';
import { Button } from '@/components/ui/Button';

interface Props {
  companyId: string;
  clientId: string;
  clientName: string;
  value: string;
  snapshot?: string | null;
  onChange: (id: string, name: string) => void;
  label?: string;
}

export function AttendeePicker({ companyId, clientId, clientName, value, snapshot, onChange, label = 'Para quem?' }: Props) {
  const { dependents, loading, error, reload } = useClientDependents(companyId, clientId);
  const [adding, setAdding] = useState(false);
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const historicalSnapshot = !value && snapshot && snapshot !== clientName;
  const inputClass = 'w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] p-3 text-theme-text';
  if (!clientId) return null;
  const save = async () => {
    setSaving(true);
    setSaveError('');
    try {
      const dependent = await createDependent(companyId, clientId, { name });
      onChange(dependent.id, dependent.name);
      setAdding(false);
      setName('');
      reload();
    } catch {
      setSaveError('Não foi possível adicionar. Confira o nome e se ele já está cadastrado.');
    } finally { setSaving(false); }
  };
  return <div className="space-y-2 my-3 text-theme-text">
    <label className="block text-sm font-bold">{label}
      <select className={inputClass} value={historicalSnapshot ? 'historical' : value} disabled={loading || saving} onChange={event => {
        if (event.target.value === 'new') { setAdding(true); return; }
        const dependent = dependents.find(item => item.id === event.target.value);
        onChange(event.target.value, dependent?.name || clientName);
      }}>
        {historicalSnapshot && <option value="historical">{snapshot} (histórico)</option>}
        <option value="">{clientName} (titular)</option>
        {value && !dependents.some(item => item.id === value) && <option value={value}>{snapshot || 'Dependente arquivado'} (histórico)</option>}
        {dependents.map(item => <option key={item.id} value={item.id}>{item.name}{item.nickname ? ` (${item.nickname})` : ''}</option>)}
        <option value="new">Novo dependente</option>
      </select>
    </label>
    {error && <div role="alert" className="text-sm">{error} <button type="button" onClick={reload}>Recarregar</button></div>}
    {adding && <div className="space-y-2">
      <label className="block text-sm">Nome do dependente<input className={inputClass} value={name} maxLength={80} onChange={event => setName(event.target.value)} /></label>
      <div className="flex gap-2"><Button size="sm" disabled={saving || !name.trim()} onClick={() => void save()}>Adicionar dependente</Button><Button size="sm" variant="ghost" onClick={() => setAdding(false)}>Cancelar</Button></div>
      {saveError && <p role="alert">{saveError}</p>}
    </div>}
  </div>;
}
