import React, { useState } from 'react';
import { Card, Button } from '@/components/ui';
import { useClientDependents } from '@/hooks/useClientDependents';
import { createDependent, updateDependent, type ClientDependent } from '@/services/clientDependents';

export function ClientDependentsSection({ companyId, clientId, canManage }: { companyId: string; clientId: string; canManage: boolean }) {
  const { dependents, loading, error, reload } = useClientDependents(companyId, clientId);
  const [editing, setEditing] = useState<ClientDependent | null>(null);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [nickname, setNickname] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const begin = (item: ClientDependent | null) => {
    setEditing(item); setName(item?.name || ''); setNickname(item?.nickname || ''); setNotes(item?.notes || ''); setOpen(true); setSaveError('');
  };
  const save = async (archive = false) => {
    setSaving(true); setSaveError('');
    try {
      if (editing) await updateDependent(companyId, clientId, editing.id, { name, nickname, notes, is_active: !archive });
      else await createDependent(companyId, clientId, { name, nickname, notes });
      setOpen(false); reload();
    } catch { setSaveError('Não foi possível salvar. Confira os campos e se o nome já está cadastrado.'); }
    finally { setSaving(false); }
  };
  const inputClass = 'w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] p-3 text-theme-text';
  return <Card title="Dependentes" action={<Button size="sm" onClick={() => begin(null)}>Adicionar</Button>}>
    <p className="text-sm text-theme-text-secondary mb-3">O telefone, o WhatsApp e a cobrança continuam no titular. Cada pessoa atendida conta como uma visita.</p>
    {loading && <p role="status">Carregando dependentes…</p>}
    {error && <p role="alert">{error} <button type="button" onClick={reload}>Recarregar</button></p>}
    {!loading && !error && !dependents.length && <p className="text-sm text-theme-text-secondary">Nenhum dependente cadastrado.</p>}
    <ul className="space-y-3">{dependents.map(item => <li key={item.id} className="flex items-start justify-between gap-3 text-theme-text">
      <div className="min-w-0 break-words"><p className="font-bold">{item.name}{item.nickname ? ` (${item.nickname})` : ''}</p>{item.notes && <p className="text-sm whitespace-pre-wrap">{item.notes}</p>}</div>
      {canManage && <Button size="sm" variant="ghost" onClick={() => begin(item)}>Editar</Button>}
    </li>)}</ul>
    {open && <form className="space-y-3 mt-4 text-theme-text" onSubmit={event => { event.preventDefault(); void save(); }}>
      <label className="block text-sm">Nome<input required maxLength={80} className={inputClass} value={name} onChange={event => setName(event.target.value)} /></label>
      <label className="block text-sm">Apelido (opcional)<input maxLength={40} className={inputClass} value={nickname} onChange={event => setNickname(event.target.value)} /></label>
      <label className="block text-sm">Observações<textarea maxLength={500} className={inputClass} value={notes} onChange={event => setNotes(event.target.value)} /></label>
      {saveError && <p role="alert">{saveError}</p>}
      <div className="flex flex-wrap gap-2"><Button type="submit" size="sm" disabled={saving || !name.trim()}>Salvar dependente</Button><Button size="sm" variant="ghost" disabled={saving} onClick={() => setOpen(false)}>Cancelar</Button>{editing && <Button size="sm" variant="ghost" disabled={saving} onClick={() => void save(true)}>Remover dependente</Button>}</div>
    </form>}
  </Card>;
}
