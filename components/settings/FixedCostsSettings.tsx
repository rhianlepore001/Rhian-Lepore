import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '../ui';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { fixedCostsApi, type ExpenseSuggestion, type FixedCost, type FixedCostInput, type WorkingHours } from '../../services/fixedCosts';
import { BusinessHoursEditor } from '../BusinessHoursEditor';
import { formatCurrency } from '../../utils/formatters';
import { getTodayInTimeZone, resolveBusinessTimezone } from '../../utils/businessTimezone';

type Api = typeof fixedCostsApi;
type Data = Awaited<ReturnType<Api['list']>>;
const emptyData: Data = { costs: [], services: [], materials: [], professionals: [] };

export function FixedCostsSettings({ companyId, region = 'BR', timezone, businessHours, api = fixedCostsApi }: { companyId: string; region?: 'BR' | 'PT'; timezone?: string | null; businessHours?: WorkingHours | null; api?: Api }) {
  const { colors, classes } = useBrutalTheme();
  const today = () => getTodayInTimeZone(resolveBusinessTimezone({ timezone, region }));
  const [data, setData] = useState<Data>(emptyData);
  const [loadState, setLoadState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [suggestions, setSuggestions] = useState<ExpenseSuggestion[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<string | undefined>();
  const [endingSalary, setEndingSalary] = useState(false);
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [professional, setProfessional] = useState('');
  const [start, setStart] = useState(today);
  const [end, setEnd] = useState('');
  const [salary, setSalary] = useState(false);
  const [active, setActive] = useState(true);
  const [materials, setMaterials] = useState<Record<string, string>>({});
  const [lowMargin, setLowMargin] = useState('20');
  const [hoursProfessional, setHoursProfessional] = useState('');
  const [hours, setHours] = useState<WorkingHours>({});

  const reload = useCallback(async () => {
    setLoadState('loading');
    try { const result = await api.list(companyId); setData(result); setLowMargin(String(result.lowMargin ?? 20)); setMaterials(Object.fromEntries(result.materials.map(item => [item.service_id, String(item.amount)]))); setError(''); setLoadState('ready'); }
    catch { setError('Não foi possível carregar os custos. Tente novamente.'); setLoadState('error'); }
  }, [api, companyId]);
  useEffect(() => { void reload(); }, [reload]);

  const clearForm = () => { setEditing(undefined); setEndingSalary(false); setCategory(''); setDescription(''); setAmount(''); setProfessional(''); setStart(today()); setEnd(''); setSalary(false); setActive(true); };
  const edit = (cost: FixedCost) => { setEndingSalary(false); setEditing(cost.id); setCategory(cost.category); setDescription(cost.description); setAmount(String(cost.amount)); setProfessional(cost.professional_id || ''); setStart(cost.start_date); setEnd(cost.end_date || ''); setSalary(cost.is_owner_salary); setActive(cost.active); };
  const newPeriod = (cost: FixedCost) => { edit(cost); setEditing(undefined); setStart(today()); setEnd(''); setActive(!cost.is_owner_salary); setNotice(cost.is_owner_salary && cost.active && (!cost.end_date || cost.end_date >= today()) ? 'A vigência atual continua ativa. Encerre-a antes de iniciar outra.' : ''); };
  const endSalary = (cost: FixedCost) => { edit(cost); setEnd(today()); setNotice(''); setEndingSalary(true); };
  const save = async () => {
    setError(''); setNotice('');
    const value = Number(amount.replace(',', '.'));
    if (!category.trim() || !description.trim() || !amount.trim() || !Number.isFinite(value) || value < 0 || !start || (end && end < start)) { setError('Confira a categoria, descrição, valor e vigência do custo.'); return; }
    if (editing && data.costs.some(cost => cost.id === editing && cost.end_date && cost.end_date < today())) { setError('Esta vigência já foi encerrada. Cadastre uma nova vigência.'); return; }
    if (editing && (!end || end < today())) { setError('Informe uma data de encerramento a partir de hoje.'); return; }
    if (!editing && professional && !data.professionals.some(person => person.id === professional)) { setError('Confira o profissional selecionado.'); return; }
    if (!editing && active && data.costs.some(cost => cost.active && cost.category.toLowerCase() === category.trim().toLowerCase() && cost.description.toLowerCase() === description.trim().toLowerCase() && cost.professional_id === (professional || null) && (!cost.end_date || cost.end_date >= start) && (!end || cost.start_date <= end))) { setError('Já existe um custo igual com vigência sobreposta.'); return; }
    const input: FixedCostInput = { id: editing, company_id: companyId, category: category.trim(), description: description.trim(), amount: value, professional_id: professional || null, start_date: start, end_date: end || null, is_owner_salary: salary, active };
    setBusy(true);
    try { await api.saveCost(input); clearForm(); await reload(); setNotice('Custo mensal salvo.'); }
    catch { setError('Não foi possível salvar o custo. Tente novamente.'); }
    finally { setBusy(false); }
  };
  const suggest = async () => { setBusy(true); setError(''); try { setSuggestions(await api.suggestions(companyId)); } catch { setError('Não foi possível buscar as despesas.'); } finally { setBusy(false); } };
  const saveLimit = async () => {
    const value = Number(lowMargin);
    if (!lowMargin.trim() || !Number.isFinite(value) || value < 0 || value > 100) { setError('Informe um limite entre 0% e 100%.'); return; }
    setBusy(true); setError('');
    try { await api.saveLowMargin(companyId, value); setNotice('Limite de margem salvo.'); }
    catch { setError('Não foi possível salvar o limite.'); }
    finally { setBusy(false); }
  };
  const saveHours = async (selected: WorkingHours | null) => {
    if (!hoursProfessional) return;
    if (selected && Object.values(selected).some(day => day.isOpen && (day.blocks.length === 0 || day.blocks.some(block => !/^([01]\d|2[0-3]):[0-5]\d$/.test(block.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(block.end) || block.end <= block.start) || [...day.blocks].sort((a, b) => a.start.localeCompare(b.start)).some((block, index, blocks) => index > 0 && block.start < blocks[index - 1].end)))) { setError('Confira os horários e evite intervalos sobrepostos.'); return; }
    setBusy(true); setError('');
    try { await api.saveWorkingHours(companyId, hoursProfessional, selected); await reload(); setHours(selected || businessHours || {}); setNotice('Horários salvos.'); }
    catch { setError('Não foi possível salvar os horários.'); }
    finally { setBusy(false); }
  };
  const saveMaterial = async (id: string) => {
    const raw = materials[id] || '', value = Number(raw.replace(',', '.'));
    if (!raw.trim() || !Number.isFinite(value) || value < 0) { setError('Informe um custo de material válido.'); return; }
    setBusy(true); setError('');
    try { await api.saveMaterial(companyId, id, value); setNotice('Custo de material salvo.'); }
    catch { setError('Não foi possível salvar o custo do serviço.'); }
    finally { setBusy(false); }
  };
  if (loadState !== 'ready') return <div className="space-y-3">
    {loadState === 'loading' ? <p role="status">Carregando custos...</p> : <><p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p><Button variant="secondary" onClick={() => void reload()}>Tentar novamente</Button></>}
  </div>;
  return <div className="space-y-5">
    <div><h2 className={`text-lg font-bold ${colors.text}`}>Custos do negócio</h2><p className={`text-sm ${colors.textMuted}`}>Informe os custos mensais e os materiais usados em cada atendimento.</p></div>
    {error && <p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p>}{notice && <p role="status" className="text-sm">{notice}</p>}
    <Card><div className="space-y-4"><h3 className="font-bold">Custos mensais</h3><p className={`text-sm ${colors.textMuted}`}>Cadastre despesas recorrentes. Custos compartilhados serão considerados para o negócio; vincule um profissional quando forem individuais.</p>
      {data.costs.length === 0 && <p className={`text-sm ${colors.textMuted}`}>Nenhum custo mensal informado.</p>}
      {data.costs.map(cost => <div key={cost.id} className={`flex flex-wrap items-center gap-2 border-b pb-2 ${colors.border}`}><span className="flex-1 text-sm">{cost.description} · {cost.category} · {formatCurrency(Number(cost.amount), region)}{!cost.active ? ' · Desativado' : cost.end_date && cost.end_date < today() ? ` · Encerrado em ${cost.end_date.split('-').reverse().join('/')}` : ''}</span><Button variant="ghost" disabled={!!cost.end_date && cost.end_date < today()} onClick={() => edit(cost)}>Editar {cost.description}</Button><Button variant="ghost" onClick={() => newPeriod(cost)}>Nova vigência de {cost.description}</Button>{cost.is_owner_salary && cost.active && cost.start_date <= today() && (!cost.end_date || cost.end_date >= today()) && <Button variant="ghost" onClick={() => endSalary(cost)}>Encerrar pró-labore</Button>}</div>)}
      <Button variant="secondary" disabled={busy} onClick={() => void suggest()}>Sugerir despesas já lançadas</Button>
      {suggestions.length > 0 && <div className="space-y-2"><p className={`text-sm ${colors.textMuted}`}>Escolha uma despesa para preencher o formulário; ela só será adicionada quando você salvar.</p>{suggestions.map(item => <div key={item.id} className="flex flex-wrap items-center gap-2 text-sm"><span>{item.description} · {formatCurrency(item.amount, region)} · {new Date(item.created_at).toLocaleDateString(region === 'PT' ? 'pt-PT' : 'pt-BR', { timeZone: resolveBusinessTimezone({ timezone, region }) })}</span><Button variant="ghost" onClick={() => { setEditing(undefined); setDescription(item.description); setAmount(String(item.amount)); }}>Usar {item.description}</Button></div>)}</div>}
      {editing && <p className={`text-sm ${colors.textMuted}`}>Para preservar o histórico, apenas o fim da vigência pode ser alterado. Para mudar outro dado, encerre este custo e cadastre um novo.</p>}
      {endingSalary && <p className={`text-sm ${colors.textMuted}`}>O encerramento será aplicado ao salvar. O pró-labore será incluído até a data informada.</p>}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className={classes.label}>Categoria<input className={classes.input} disabled={!!editing} value={category} onChange={e => setCategory(e.target.value)} /></label>
        <label className={classes.label}>Descrição<input className={classes.input} disabled={!!editing} value={description} onChange={e => setDescription(e.target.value)} /></label>
        <label className={classes.label}>Custo mensal ({region === 'PT' ? '€' : 'R$'})<input aria-label="Custo mensal" className={classes.input} disabled={!!editing} type="number" min="0" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} /></label>
        <label className={classes.label}>Profissional<select className={classes.input} disabled={!!editing} value={professional} onChange={e => setProfessional(e.target.value)}><option value="">Compartilhado</option>{data.professionals.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
        <label className={classes.label}>Início da vigência<input className={classes.input} disabled={!!editing} type="date" value={start} onChange={e => setStart(e.target.value)} /></label>
        <label className={classes.label}>Fim da vigência (opcional)<input className={classes.input} type="date" value={end} onChange={e => setEnd(e.target.value)} /></label>
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={!!editing} checked={salary} onChange={e => { setSalary(e.target.checked); setActive(!e.target.checked); }} />Este custo é pró-labore do dono</label>
      <label className="flex min-h-11 items-center gap-2 text-sm"><input type="checkbox" disabled={!!editing || !salary} checked={salary && active} onChange={e => setActive(e.target.checked)} />Incluir pró-labore do dono</label>
      <Button disabled={busy} onClick={() => void save()}>Salvar custo mensal</Button>{editing && <Button variant="ghost" onClick={clearForm}>Cancelar edição</Button>}
    </div></Card>
    <Card><div className="space-y-3"><h3 className="font-bold">Margem dos serviços</h3><p className={`text-sm ${colors.textMuted}`}>Serviços com margem positiva até este limite aparecem como “Rende pouco”. O valor inicial pode ser alterado.</p><label className={classes.label}>Limite de margem para Rende pouco (%)<input className={classes.input} type="number" min="0" max="100" step="0.01" value={lowMargin} onChange={e => setLowMargin(e.target.value)} /></label><Button disabled={busy} onClick={() => void saveLimit()}>Salvar limite</Button></div></Card>
    <Card><div className="space-y-3"><h3 className="font-bold">Horários por profissional</h3><p className={`text-sm ${colors.textMuted}`}>Quando não houver horário individual, será usado o horário do negócio.</p><label className={classes.label}>Profissional para horários<select className={classes.input} value={hoursProfessional} onChange={event => { const id = event.target.value; setHoursProfessional(id); setHours(data.professionals.find(person => person.id === id)?.working_hours || businessHours || {}); }}><option value="">Selecione</option>{data.professionals.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>{hoursProfessional && <><BusinessHoursEditor hours={hours} onChange={setHours} /><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void saveHours(hours)}>Salvar horários</Button><Button variant="secondary" disabled={busy} onClick={() => void saveHours(null)}>Usar horário do negócio</Button></div></>}</div></Card>
    <Card><div className="space-y-4"><h3 className="font-bold">Material por serviço</h3><p className={`text-sm ${colors.textMuted}`}>Informe o custo de material por atendimento. Deixe em branco quando ainda não souber.</p>{data.services.length === 0 && <p className={`text-sm ${colors.textMuted}`}>Cadastre serviços para informar seus custos.</p>}{data.services.map(service => <div key={service.id} className="flex flex-wrap items-end gap-2"><label className={`${classes.label} min-w-0 flex-1`}>Custo de material por atendimento: {service.name} ({region === 'PT' ? '€' : 'R$'})<input aria-label={`Custo de material por atendimento: ${service.name}`} className={classes.input} type="number" min="0" step="0.01" value={materials[service.id] ?? ''} onChange={e => setMaterials(current => ({ ...current, [service.id]: e.target.value }))} /></label><Button variant="secondary" disabled={busy} onClick={() => void saveMaterial(service.id)}>Salvar material de {service.name}</Button></div>)}</div></Card>
  </div>;
}
