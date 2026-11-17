import React, { useCallback, useEffect, useState } from 'react';
import { Button, Card } from '../ui';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { fixedCostsApi, type ExpenseSuggestion, type FixedCost, type FixedCostInput, type WorkingHours } from '../../services/fixedCosts';
import { BusinessHoursEditor } from '../BusinessHoursEditor';
import { formatCurrency } from '../../utils/formatters';
import { getTodayInTimeZone, resolveBusinessTimezone } from '../../utils/businessTimezone';
import { allServicesHaveMaterialDecision, firstPendingBlock, hasOpenBusinessHours, setupProgress, setupProgressLabel, wizardBlockFromLocation, WIZARD_BLOCK_HASH, type SetupBlockId } from '../../utils/hourlyResultsSetup';
import { CHAIR_HOUR_COST_EXAMPLE, CHAIR_HOUR_COST_FORMULA } from '../../utils/chairHourFormulaCopy';
import { ServiceCostCalculator } from './ServiceCostCalculator';
import type { MaterialCostLine } from '../../utils/serviceMaterialCost';

type Api = typeof fixedCostsApi & {
  saveMaterialLines?: (companyId: string, serviceId: string, lines: MaterialCostLine[], total: number) => Promise<void>;
  updateMaterialPrice?: (companyId: string, materialId: string, price: number) => Promise<void>;
};
type Data = Awaited<ReturnType<Api['list']>>;
const emptyData: Data = { costs: [], services: [], materials: [], professionals: [], lowMargin: 20, lowMarginSaved: false, catalog: [], uses: [] };

function CatalogPriceRow({ item, currency, busy, inputClass, onSave }: { item: { id: string; name: string; package_price: number }; currency: string; busy: boolean; inputClass: string; onSave: (id: string, price: number) => void }) {
  const [price, setPrice] = useState(String(item.package_price));
  useEffect(() => { setPrice(String(item.package_price)); }, [item.package_price]);
  return (
    <li className="flex flex-wrap items-end gap-2 rounded-xl border border-[var(--color-border)] p-3">
      <p className="min-w-0 flex-1 text-sm font-semibold text-theme-text">{item.name}</p>
      <label className="block space-y-1.5 text-sm font-semibold text-theme-text">
        <span>Preço da embalagem ({currency})</span>
        <input aria-label={`Preço de ${item.name}`} className={`${inputClass} tabular-nums`} inputMode="decimal" min="0" step="0.01" type="number" value={price} onChange={(event) => setPrice(event.target.value)} />
      </label>
      <Button disabled={busy} onClick={() => onSave(item.id, Number(price.replace(',', '.')))}>Salvar preço</Button>
    </li>
  );
}

function materialStatus(amount: number | undefined): 'missing' | 'none' | 'saved' {
  if (amount == null) return 'missing';
  if (amount === 0) return 'none';
  return 'saved';
}

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
  const [lowMargin, setLowMargin] = useState('20');
  const [hoursProfessional, setHoursProfessional] = useState('');
  const [hours, setHours] = useState<WorkingHours>({});
  const [costFormOpen, setCostFormOpen] = useState(false);
  const [openBlock, setOpenBlock] = useState<SetupBlockId | null>(null);
  const [blockTouched, setBlockTouched] = useState(false);
  const [openService, setOpenService] = useState<string | null>(null);

  const reload = useCallback(async (silent = false) => {
    if (!silent) setLoadState('loading');
    try { const result = await api.list(companyId); setData(result); setLowMargin(String(result.lowMargin ?? 20)); setError(''); setLoadState('ready'); }
    catch { setError('Não foi possível carregar os custos. Tente novamente.'); setLoadState('error'); }
  }, [api, companyId]);
  useEffect(() => { void reload(); }, [reload]);
  useEffect(() => {
    const apply = (scroll: boolean) => {
      const target = wizardBlockFromLocation(window.location.hash);
      if (!target) return;
      setBlockTouched(true);
      setOpenBlock(target);
      if (!scroll) return;
      const node = document.getElementById(WIZARD_BLOCK_HASH[target]);
      if (node && typeof node.scrollIntoView === 'function') node.scrollIntoView({ block: 'start' });
    };
    apply(loadState === 'ready');
    const onHash = () => apply(true);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, [loadState]);

  const clearForm = () => { setEditing(undefined); setEndingSalary(false); setCostFormOpen(false); setCategory(''); setDescription(''); setAmount(''); setProfessional(''); setStart(today()); setEnd(''); setSalary(false); setActive(true); };
  const edit = (cost: FixedCost) => { setEndingSalary(false); setCostFormOpen(true); setEditing(cost.id); setCategory(cost.category); setDescription(cost.description); setAmount(String(cost.amount)); setProfessional(cost.professional_id || ''); setStart(cost.start_date); setEnd(cost.end_date || ''); setSalary(cost.is_owner_salary); setActive(cost.active); open('costs', true); };
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
    try { await api.saveCost(input); clearForm(); setBlockTouched(true); setOpenBlock('costs'); await reload(true); setNotice('Conta salva.'); }
    catch { setError('Não foi possível salvar o custo. Tente novamente.'); }
    finally { setBusy(false); }
  };
  const suggest = async () => { setBusy(true); setError(''); try { setSuggestions(await api.suggestions(companyId)); } catch { setError('Não foi possível buscar as despesas.'); } finally { setBusy(false); } };
  const saveLimit = async () => {
    const value = Number(lowMargin);
    if (!lowMargin.trim() || !Number.isFinite(value) || value < 0 || value > 100) { setError('Informe um limite entre 0% e 100%.'); return; }
    setBusy(true); setError('');
    try { await api.saveLowMargin(companyId, value); setBlockTouched(true); setOpenBlock('margin'); await reload(true); setNotice('Limite salvo.'); }
    catch { setError('Não foi possível salvar o limite.'); }
    finally { setBusy(false); }
  };
  const saveHours = async (selected: WorkingHours | null) => {
    if (!hoursProfessional) return;
    if (selected && Object.values(selected).some(day => day.isOpen && (day.blocks.length === 0 || day.blocks.some(block => !/^([01]\d|2[0-3]):[0-5]\d$/.test(block.start) || !/^([01]\d|2[0-3]):[0-5]\d$/.test(block.end) || block.end <= block.start) || [...day.blocks].sort((a, b) => a.start.localeCompare(b.start)).some((block, index, blocks) => index > 0 && block.start < blocks[index - 1].end)))) { setError('Confira os horários e evite intervalos sobrepostos.'); return; }
    setBusy(true); setError('');
    try { await api.saveWorkingHours(companyId, hoursProfessional, selected); setBlockTouched(true); setOpenBlock('hours'); await reload(true); setHours(selected || businessHours || {}); setNotice('Salvo. Vale a partir de amanhã.'); }
    catch { setError('Não foi possível salvar os horários.'); }
    finally { setBusy(false); }
  };
  const saveMaterial = async (id: string, value: number, lines: MaterialCostLine[] = []) => {
    if (!Number.isFinite(value) || value < 0) { setError('Informe um custo de material válido.'); return; }
    setBusy(true); setError('');
    try {
      if (api.saveMaterialLines) await api.saveMaterialLines(companyId, id, lines, value);
      else await api.saveMaterial(companyId, id, value);
      setNotice(value === 0 ? `Salvo: ${data.services.find((item) => item.id === id)?.name ?? 'serviço'} não usa material.` : 'Material salvo.');
      setBlockTouched(true);
      setOpenBlock('materials');
      await reload(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não foi possível salvar o custo do serviço.');
    }
    finally { setBusy(false); }
  };
  const saveCatalogPrice = async (materialId: string, price: number) => {
    if (!api.updateMaterialPrice) return;
    setBusy(true); setError('');
    try { await api.updateMaterialPrice(companyId, materialId, price); setNotice('Preço atualizado. Os serviços que usam este material foram recalculados.'); await reload(true); }
    catch { setError('Não foi possível atualizar o preço do material.'); }
    finally { setBusy(false); }
  };
  const currency = region === 'PT' ? '€' : 'R$';
  const isPast = (cost: FixedCost) => !!cost.end_date && cost.end_date < today();
  const field = 'block space-y-1.5 text-sm font-semibold text-theme-text';
  const hint = 'text-sm text-theme-textSecondary';
  const progress = setupProgress({
    hasActiveCost: data.costs.some((cost) => cost.active && (!cost.end_date || cost.end_date >= today())),
    hasOpenHours: hasOpenBusinessHours(businessHours) || data.professionals.some((person) => hasOpenBusinessHours(person.working_hours)),
    hasMaterial: allServicesHaveMaterialDecision(data.services, data.materials),
    marginSaved: !!data.lowMarginSaved,
  });
  const pending = firstPendingBlock(progress.blocks);
  const activeBlock = blockTouched ? openBlock : pending;
  function open(id: SetupBlockId, force = false) {
    const alreadyOpen = (blockTouched ? openBlock : pending) === id;
    setBlockTouched(true);
    setOpenBlock(alreadyOpen && !force ? null : id);
  }
  if (loadState !== 'ready') return <div className="space-y-3">
    {loadState === 'loading'
      ? <div role="status" aria-label="Carregando custos" className="space-y-3">{['h-16', 'h-40', 'h-24'].map(height => <div key={height} className={`${height} animate-pulse rounded-xl bg-[var(--color-card-hover)] motion-reduce:animate-none`} />)}<span className="sr-only">Carregando custos...</span></div>
      : <><p role="alert" className="text-sm text-[var(--color-danger)]">{error}</p><Button variant="secondary" onClick={() => void reload()}>Tentar novamente</Button></>}
  </div>;

  const blockToggle = (id: SetupBlockId, title: string, done: boolean) => (
    <button type="button" aria-expanded={activeBlock === id} onClick={() => open(id)} className="flex min-h-12 w-full flex-wrap items-center gap-2 text-left">
      <h3 className="text-base font-bold text-theme-text">{title}</h3>
      <span className="rounded-full border border-[var(--color-border-strong)] px-2 py-0.5 text-xs font-semibold text-theme-text">{done ? 'Feito' : 'Falta'}</span>
      <span aria-hidden="true" className="ml-auto text-theme-textSecondary">{activeBlock === id ? '▾' : '▸'}</span>
    </button>
  );

  return <div className="space-y-5">
    <div className="space-y-2">
      <h2 className={`text-lg font-bold ${colors.text}`}>Contas, horários e material</h2>
      <p className="text-sm font-semibold tabular-nums text-theme-text">{setupProgressLabel(progress.configured, progress.total)}</p>
      <div aria-hidden="true" className="h-2 overflow-hidden rounded-full bg-[var(--color-border-strong)]">
        <div className="h-full bg-[var(--color-accent)]" style={{ width: `${(progress.configured / progress.total) * 100}%` }} />
      </div>
      <a href="/#/resultados-por-hora" className="inline-flex min-h-11 items-center text-sm font-semibold text-[var(--color-accent)]">Ver resultados por hora</a>
      <p className="text-sm leading-relaxed text-theme-text">{CHAIR_HOUR_COST_FORMULA}</p>
      <p className={hint}>{CHAIR_HOUR_COST_EXAMPLE}</p>
    </div>
    <div aria-live="polite" className="space-y-2">
      {error && <p role="alert" className="rounded-xl border border-[var(--color-danger-border)] bg-[var(--color-danger-bg)] p-3 text-sm text-theme-text">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-[var(--color-success-border)] bg-[var(--color-success-bg)] p-3 text-sm text-theme-text">{notice}</p>}
    </div>

    <Card><div id="contas" className="space-y-4 scroll-mt-24">
      {blockToggle('costs', '1. Contas do mês', progress.blocks.costs)}
      <p className={hint}>Aluguel, luz, internet: o que você paga todo mês, com ou sem cliente.</p>
      <p className={hint}>Ex.: aluguel 2.000 ÷ 160 h abertas = 12,50 por hora aberta.</p>
      {activeBlock !== 'costs' && data.costs.length > 0 && (
        <p className={hint}>{data.costs.length === 1 ? '1 conta' : `${data.costs.length} contas`} · toque para ver</p>
      )}
      {activeBlock === 'costs' && <>
      {data.costs.length === 0
        ? <p className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-3 text-sm text-theme-textSecondary">Nenhuma conta informada ainda. Comece pelo aluguel.</p>
        : <ul className="divide-y divide-[var(--color-border)] rounded-xl border border-[var(--color-border)]">
          {data.costs.map(cost => <li key={cost.id} className="space-y-2 p-3">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3">
              <p className="min-w-0 text-sm font-semibold text-theme-text">{cost.description}</p>
              <p className="text-base font-bold tabular-nums text-theme-text">{formatCurrency(Number(cost.amount), region)}</p>
            </div>
            <p className="text-xs text-theme-textSecondary">{cost.category}{cost.is_owner_salary ? ' · retirada do dono' : ''}{!cost.active ? ' · Desativado' : isPast(cost) ? ` · Encerrado em ${cost.end_date!.split('-').reverse().join('/')}` : ` · desde ${cost.start_date.split('-').reverse().join('/')}`}</p>
            <div className="flex flex-wrap gap-2">
              <Button variant="ghost" size="sm" disabled={isPast(cost)} onClick={() => edit(cost)}>Editar<span className="sr-only"> {cost.description}</span></Button>
              <Button variant="ghost" size="sm" onClick={() => newPeriod(cost)}>Novo valor a partir de…<span className="sr-only"> {cost.description}</span></Button>
              {cost.is_owner_salary && cost.active && cost.start_date <= today() && (!cost.end_date || cost.end_date >= today()) && <Button variant="ghost" size="sm" onClick={() => endSalary(cost)}>Encerrar pró-labore</Button>}
            </div>
          </li>)}
        </ul>}
      <Button variant="secondary" disabled={busy} onClick={() => void suggest()}>Usar despesas que já lancei</Button>
      {suggestions.length > 0 && <div className="space-y-2"><p className={hint}>Toque em uma despesa para preencher o formulário. Ela só entra quando você salvar.</p>{suggestions.map(item => <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm"><span className="tabular-nums">{item.description} · {formatCurrency(item.amount, region)} · {new Date(item.created_at).toLocaleDateString(region === 'PT' ? 'pt-PT' : 'pt-BR', { timeZone: resolveBusinessTimezone({ timezone, region }) })}</span><Button variant="ghost" size="sm" onClick={() => { setEditing(undefined); setCostFormOpen(true); setDescription(item.description); setAmount(String(item.amount)); }}>Usar<span className="sr-only"> {item.description}</span></Button></div>)}</div>}

      {(data.costs.length === 0 || !!editing || endingSalary || costFormOpen) && (
      <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
        <p className="text-sm font-semibold text-[var(--color-accent)]">{editing ? 'Encerrar conta' : data.costs.length > 0 ? 'Adicionar outra conta' : 'Adicionar conta'}</p>
        {editing && <p className={hint}>Para não mudar meses passados, aqui só dá para escolher quando a conta termina. Para outro valor, use “Novo valor a partir de…”.</p>}
        {endingSalary && <p className={hint}>O encerramento será aplicado ao salvar. O pró-labore será incluído até a data informada.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
          <label className={field}><span>Categoria</span><input className={classes.input} disabled={!!editing} placeholder="Ex.: Aluguel" value={category} onChange={e => setCategory(e.target.value)} /></label>
          <label className={field}><span>Descrição</span><input className={classes.input} disabled={!!editing} placeholder="Ex.: Aluguel do ponto" value={description} onChange={e => setDescription(e.target.value)} /></label>
          <label className={field}><span>Custo mensal ({currency})</span><input aria-label="Custo mensal" className={`${classes.input} tabular-nums`} disabled={!!editing} type="number" min="0" step="0.01" inputMode="decimal" placeholder="ex.: 2000" value={amount} onChange={e => setAmount(e.target.value)} /></label>
          <label className={field}><span>Profissional</span><select className={classes.input} disabled={!!editing} value={professional} onChange={e => setProfessional(e.target.value)}><option value="">Todos (conta do negócio)</option>{data.professionals.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
          <label className={field}><span>Começa em (dd/mm/aaaa)</span><input className={classes.input} disabled={!!editing} type="date" lang="pt-BR" value={start} onChange={e => setStart(e.target.value)} /></label>
          <label className={field}><span>Termina em (opcional, dd/mm/aaaa)</span><input className={classes.input} type="date" lang="pt-BR" value={end} onChange={e => setEnd(e.target.value)} /></label>
        </div>
        <div className="space-y-1 rounded-xl bg-[var(--color-surface)] p-3">
          <label className="flex min-h-11 items-center gap-3 text-sm text-theme-text"><input className="h-5 w-5 shrink-0 accent-[var(--color-accent)]" type="checkbox" disabled={!!editing} checked={salary} onChange={e => { setSalary(e.target.checked); setActive(!e.target.checked); }} />Este custo é a minha retirada (pró-labore)</label>
          {salary && <label className="flex min-h-11 items-center gap-3 text-sm text-theme-text"><input className="h-5 w-5 shrink-0 accent-[var(--color-accent)]" type="checkbox" disabled={!!editing} checked={active} onChange={e => setActive(e.target.checked)} />Incluir essa retirada no custo da hora</label>}
          <p className="text-xs text-theme-textSecondary">Retirada do dono. Vem desligada: só entra no custo da hora se você marcar a segunda caixa.</p>
        </div>
        <div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void save()}>Salvar custo mensal</Button>{editing && <Button variant="ghost" onClick={clearForm}>Cancelar edição</Button>}</div>
      </div>
      )}
      </>}
    </div></Card>

    <Card><div id="horarios" className="space-y-3 scroll-mt-24">
      {blockToggle('hours', '2. Horários da equipe', progress.blocks.hours)}
      <p className={hint}>Sem horário não dá para medir hora vazia. Sem jornada própria, vale o horário do negócio.</p>
      <p className={hint}>Ex.: Ana trabalha 8 h por dia, 20 dias = 160 h abertas no mês. Hora vazia ainda carrega as contas.</p>
      {activeBlock === 'hours' && <>
      {progress.blocks.hours && <p className={hint}>Horários: expediente do negócio já conta. Escolha um profissional só se a jornada dele for diferente.</p>}
      <label className={field}><span>Profissional para horários</span><select className={classes.input} value={hoursProfessional} onChange={event => { const id = event.target.value; setHoursProfessional(id); setHours(data.professionals.find(person => person.id === id)?.working_hours || businessHours || {}); }}><option value="">Selecione</option>{data.professionals.map(person => <option key={person.id} value={person.id}>{person.name}</option>)}</select></label>
      {hoursProfessional && <><BusinessHoursEditor hours={hours} onChange={setHours} /><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void saveHours(hours)}>Salvar horários</Button><Button variant="secondary" disabled={busy} onClick={() => void saveHours(null)}>Usar horário do negócio</Button></div></>}
      </>}
    </div></Card>

    <Card><div id="materiais" className="space-y-4 scroll-mt-24">
      {blockToggle('materials', '3. Materiais', progress.blocks.materials)}
      <p className={hint}>Quanto de material cada atendimento gasta.</p>
      <p className={hint}>Ex.: tinta 30,00 ÷ 10 aplicações = 3,00 por aplicação.</p>
      {activeBlock !== 'materials' && data.services.length > 0 && (
        <p className={hint}>{data.services.length === 1 ? '1 serviço' : `${data.services.length} serviços`} · toque para ver</p>
      )}
      {activeBlock === 'materials' && (data.catalog ?? []).length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-semibold text-theme-text">Materiais reutilizáveis. Mudar o preço recalcula os serviços que usam esse material.</p>
          <ul className="space-y-2">
            {(data.catalog ?? []).map((item) => (
              <CatalogPriceRow key={item.id} item={item} currency={currency} busy={busy} inputClass={classes.input} onSave={(id, price) => { void saveCatalogPrice(id, price); }} />
            ))}
          </ul>
        </div>
      )}
      {activeBlock === 'materials' && data.services.length === 0 && (
        <p className="rounded-xl border border-dashed border-[var(--color-border-strong)] p-3 text-sm text-theme-textSecondary">
          Cadastre serviços para informar o material.{' '}
          <a href="/#/configuracoes/servicos" className="inline-flex min-h-11 items-center font-semibold text-[var(--color-accent)]">Cadastrar serviço</a>
        </p>
      )}
      {activeBlock === 'materials' && data.services.length > 0 && <ul className="space-y-3">{data.services.map(service => {
        const saved = data.materials.find((item) => item.service_id === service.id)?.amount;
        const status = materialStatus(saved);
        const expanded = activeBlock === 'materials' && openService === service.id;
        const initialLines = (data.uses ?? [])
          .filter((use) => use.service_id === service.id)
          .map((use): MaterialCostLine | null => {
            const material = (data.catalog ?? []).find((item) => item.id === use.material_id);
            if (!material) return null;
            return {
              name: material.name,
              mode: material.yield_mode,
              packagePrice: material.package_price,
              yieldCount: material.yield_count,
              packageQty: material.package_qty,
              qtyPerService: use.qty_per_service,
            };
          })
          .filter((line): line is MaterialCostLine => line != null);
        return (
          <li key={service.id} className="rounded-xl border border-[var(--color-border)] p-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold text-theme-text">{service.name}</h3>
              <span className="text-sm text-theme-textSecondary">
                {status === 'missing' ? 'Não informado' : status === 'none' ? 'Não usa material' : `${formatCurrency(Number(saved), region)} por atendimento`}
              </span>
              {status === 'missing' && (
                <Button variant="ghost" size="sm" onClick={() => { void saveMaterial(service.id, 0, []); }}>Não usa material</Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setBlockTouched(true); setOpenBlock('materials'); setOpenService(expanded ? null : service.id); }}>{expanded ? 'Recolher' : status === 'none' ? `Alterar ${service.name}` : `Configurar ${service.name}`}</Button>
            </div>
            {expanded && (
              <div className="pt-3">
                <ServiceCostCalculator
                  serviceId={service.id}
                  serviceName={service.name}
                  currency={currency}
                  savedAmount={saved ?? null}
                  initialLines={initialLines}
                  persistLines={!!api.saveMaterialLines}
                  busy={busy}
                  onSave={(id, value, lines) => { void saveMaterial(id, value, lines); }}
                />
              </div>
            )}
          </li>
        );
      })}</ul>}
    </div></Card>

    <Card><div id="margem" className="space-y-3 scroll-mt-24">
      {blockToggle('margin', '4. Quanto precisa sobrar', progress.blocks.margin)}
      <p className={hint}>Para que serve: avisar “Sobra pouco” quando o preço paga a hora, mas sobra menos do que você escolheu. O valor inicial pode ser alterado.{data.lowMarginSaved ? '' : ' Sugerimos 20. Toque em Salvar limite para confirmar.'}</p>
      <p className={hint}>Ex.: avisar se a hora sobrar menos de 20% do que ela rende.</p>
      {activeBlock === 'margin' && <>
      <label className={field}><span>Avisar “Sobra pouco” quando sobrar até (%) do que a hora rende</span><input className={`${classes.input} tabular-nums`} type="number" min="0" max="100" step="0.01" inputMode="decimal" value={lowMargin} onChange={e => setLowMargin(e.target.value)} /></label>
      <Button disabled={busy} onClick={() => void saveLimit()}>Salvar limite</Button>
      </>}
    </div></Card>
  </div>;
}
