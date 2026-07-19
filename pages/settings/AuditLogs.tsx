import React, { useCallback, useEffect, useState } from 'react';
import {
  ShieldAlert, RefreshCw, Plus, Cpu, User, Wrench,
  ChevronDown, ChevronUp, Image as ImageIcon, Loader2, AlertCircle,
  CheckCircle2, Clock, RotateCcw, Trash2, Eraser,
} from 'lucide-react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { AddAuditEntryModal } from '../../components/AddAuditEntryModal';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useToast } from '../../components/ui';
import { supabase } from '../../lib/supabase';
import {
  listAuditEntries,
  getBugScreenshotUrl,
  updateAuditStatus,
  deleteAuditEntry,
  deleteResolvedAuditEntries,
  statusGroup,
  type AuditEntry,
  type AuditSource,
  type AuditStatusGroup,
} from '../../lib/bugReport';

type SourceFilter = 'all' | AuditSource;
type LevelFilter = 'all' | 1 | 2 | 3 | 4 | 5;
type StatusFilter = 'all' | AuditStatusGroup;

const SOURCE_META: Record<AuditSource, { label: string; icon: React.ElementType }> = {
  auto: { label: 'Automático', icon: Cpu },
  user: { label: 'Usuário', icon: User },
  admin: { label: 'Adm', icon: Wrench },
};

const SOURCE_TABS: Array<{ value: SourceFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'auto', label: '🤖 Automático' },
  { value: 'user', label: '🙋 Usuário' },
  { value: 'admin', label: '🛠️ Adm' },
];

const STATUS_TABS: Array<{ value: StatusFilter; label: string }> = [
  { value: 'all', label: 'Todos' },
  { value: 'open', label: 'Aberto' },
  { value: 'progress', label: '🟡 Em andamento' },
  { value: 'done', label: '🟢 Resolvido' },
];

interface StatusMeta {
  label: string;
  badge: string;
  stripe: string;
  icon: React.ElementType;
}

/** Cor/etiqueta por estado: verde resolvido, amarelo em andamento, neutro aberto. */
function statusMeta(group: AuditStatusGroup): StatusMeta {
  switch (group) {
    case 'done':
      return {
        label: 'Resolvido',
        badge: 'bg-[var(--color-success-bg)] text-[var(--color-success)] border-[var(--color-success-border)]',
        stripe: 'border-l-4 border-l-[var(--color-success)]',
        icon: CheckCircle2,
      };
    case 'progress':
      return {
        label: 'Em andamento',
        badge: 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]',
        stripe: 'border-l-4 border-l-[var(--color-warning)]',
        icon: Clock,
      };
    default:
      return {
        label: 'Aberto',
        badge: 'bg-[var(--color-card-hover)] text-theme-textSecondary border-[var(--color-divider)]',
        stripe: '',
        icon: AlertCircle,
      };
  }
}

/** Cor da etiqueta de gravidade (1 leve → 5 crítico). */
function levelClasses(level: number | null): string {
  switch (level) {
    case 5: return 'bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger-border)]';
    case 4: return 'bg-orange-500/10 text-orange-500 border-orange-500/20';
    case 3: return 'bg-[var(--color-warning-bg)] text-[var(--color-warning)] border-[var(--color-warning-border)]';
    case 2: return 'bg-[var(--color-warning-bg)] text-yellow-600 border-[var(--color-warning-border)]/20';
    case 1: return 'bg-[var(--color-info-bg)] text-[var(--color-info)] border-[var(--color-info-border)]';
    default: return 'bg-[var(--color-card-hover)] text-theme-textSecondary border-[var(--color-divider)]';
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const AuditLogs: React.FC = () => {
  const { colors, accent, radius, classes } = useBrutalTheme();
  const { showToast } = useToast();

  const [entries, setEntries] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('all');
  const [levelFilter, setLevelFilter] = useState<LevelFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [shots, setShots] = useState<Record<string, string | null>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [pendingClear, setPendingClear] = useState(false);
  const [clearing, setClearing] = useState(false);

  const resolvedCount = entries.filter((e) => statusGroup(e.status) === 'done').length;

  const loadEntries = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    const { entries: data, error } = await listAuditEntries({
      supabase,
      source: sourceFilter === 'all' ? undefined : sourceFilter,
      level: levelFilter === 'all' ? undefined : levelFilter,
      status: statusFilter === 'all' ? undefined : statusFilter,
      limit: 100,
    });
    if (error) setErrorMsg(error);
    setEntries(data);
    setLoading(false);
  }, [sourceFilter, levelFilter, statusFilter]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const toggleExpand = useCallback(async (entry: AuditEntry) => {
    const next = expandedId === entry.id ? null : entry.id;
    setExpandedId(next);
    if (next && entry.screenshot_url && shots[entry.id] === undefined) {
      const url = await getBugScreenshotUrl(supabase, entry.screenshot_url);
      setShots((prev) => ({ ...prev, [entry.id]: url }));
    }
  }, [expandedId, shots]);

  const handleSetStatus = useCallback(async (entry: AuditEntry, status: 'new' | 'in_progress' | 'fixed') => {
    setBusyId(entry.id);
    const { error } = await updateAuditStatus(supabase, entry.id, status);
    setBusyId(null);
    if (error) {
      showToast(error, 'error');
      return;
    }
    showToast(
      status === 'fixed' ? 'Marcado como resolvido.' : status === 'in_progress' ? 'Marcado como em andamento.' : 'Reaberto.',
      'success'
    );
    loadEntries();
  }, [showToast, loadEntries]);

  const handleDelete = useCallback(async (entry: AuditEntry) => {
    setBusyId(entry.id);
    const { error } = await deleteAuditEntry(supabase, entry.id, entry.screenshot_url);
    setBusyId(null);
    setPendingDeleteId(null);
    if (error) {
      showToast(error, 'error');
      return;
    }
    showToast('Problema removido.', 'success');
    loadEntries();
  }, [showToast, loadEntries]);

  const handleClearResolved = useCallback(async () => {
    setClearing(true);
    const { count, error } = await deleteResolvedAuditEntries(supabase);
    setClearing(false);
    setPendingClear(false);
    if (error) {
      showToast(error, 'error');
      return;
    }
    showToast(count > 0 ? `${count} resolvido(s) apagado(s).` : 'Nenhum resolvido para limpar.', 'success');
    loadEntries();
  }, [showToast, loadEntries]);

  const actionBtn = 'inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md text-xs font-medium border transition-colors disabled:opacity-40';

  return (
    <SettingsLayout>
      <div className="space-y-5">
        {/* Cabeçalho */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className={`text-xl md:text-2xl font-bold tracking-tight flex items-center gap-2 ${colors.text}`}>
              <ShieldAlert className={`w-6 h-6 ${accent.text}`} />
              Auditoria
            </h1>
            <p className={`text-xs md:text-sm mt-1 ${colors.textMuted}`}>
              Erros automáticos, problemas reportados e os que você registra manualmente — tudo num lugar só.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadEntries}
              className={[classes.buttonSecondary, 'inline-flex items-center justify-center px-3 py-2'].join(' ')}
              aria-label="Atualizar"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={() => setShowAdd(true)}
              className={[classes.buttonPrimary, 'inline-flex items-center gap-2 px-3 py-2 text-sm'].join(' ')}
            >
              <Plus className="w-4 h-4" /> Adicionar problema
            </button>
          </div>
        </div>

        {/* Limpar resolvidos */}
        {resolvedCount > 0 && (
          pendingClear ? (
            <div className={`flex flex-wrap items-center gap-2 p-2.5 ${radius.card} ${colors.card} ${colors.border} border`}>
              <span className={`text-xs ${colors.textSecondary}`}>Apagar os {resolvedCount} resolvido(s) de forma permanente?</span>
              <div className="flex gap-2 ml-auto">
                <button onClick={handleClearResolved} disabled={clearing} className={`${actionBtn} bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger-border)]`}>
                  {clearing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Sim, apagar
                </button>
                <button onClick={() => setPendingClear(false)} disabled={clearing} className={`${actionBtn} ${colors.border} ${colors.textSecondary}`}>
                  Cancelar
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setPendingClear(true)}
              className={`${actionBtn} ${colors.border} ${colors.textSecondary} hover:bg-[var(--color-card-hover)]`}
            >
              <Eraser className="w-3.5 h-3.5" /> Limpar resolvidos ({resolvedCount})
            </button>
          )
        )}

        {/* Filtros: origem */}
        <div className="flex flex-wrap items-center gap-2">
          {SOURCE_TABS.map((tab) => {
            const active = sourceFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setSourceFilter(tab.value)}
                className={[
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  active ? `${accent.bg} ${accent.border} text-[var(--color-bg)]` : `${colors.card} ${colors.border} ${colors.textSecondary} hover:bg-[var(--color-card-hover)]`,
                ].join(' ')}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Filtros: estado + gravidade */}
        <div className="flex flex-wrap items-center gap-2">
          {STATUS_TABS.map((tab) => {
            const active = statusFilter === tab.value;
            return (
              <button
                key={tab.value}
                onClick={() => setStatusFilter(tab.value)}
                className={[
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                  active ? `${accent.bg} ${accent.border} text-[var(--color-bg)]` : `${colors.card} ${colors.border} ${colors.textSecondary} hover:bg-[var(--color-card-hover)]`,
                ].join(' ')}
              >
                {tab.label}
              </button>
            );
          })}
          <span className={`mx-1 ${colors.textMuted}`}>·</span>
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value === 'all' ? 'all' : Number(e.target.value) as LevelFilter)}
            className={[classes.input, 'w-auto py-1.5 text-xs'].join(' ')}
            aria-label="Filtrar por gravidade"
          >
            <option value="all">Todas as gravidades</option>
            <option value="5">Nível 5 — Crítico</option>
            <option value="4">Nível 4 — Fluxo interrompido</option>
            <option value="3">Nível 3 — Erro de dados</option>
            <option value="2">Nível 2 — Componente quebrado</option>
            <option value="1">Nível 1 — Cosmético</option>
          </select>
        </div>

        {/* Estado de erro */}
        {errorMsg && (
          <div className={`flex items-start gap-2 p-3 ${radius.card} ${classes.error}`}>
            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
            <span>Não consegui carregar a auditoria: {errorMsg}</span>
          </div>
        )}

        {/* Lista */}
        {loading ? (
          <div className={`flex items-center justify-center gap-2 py-16 ${colors.textMuted}`}>
            <Loader2 className="w-5 h-5 animate-spin" /> Carregando…
          </div>
        ) : entries.length === 0 ? (
          <div className={`flex flex-col items-center justify-center gap-2 py-16 text-center ${colors.textMuted}`}>
            <ShieldAlert className="w-10 h-10 opacity-40" />
            <p className="text-sm">Nenhum problema registrado por aqui. 🎉</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {entries.map((entry) => {
              const SourceIcon = SOURCE_META[entry.source].icon;
              const group = statusGroup(entry.status);
              const sMeta = statusMeta(group);
              const StatusIcon = sMeta.icon;
              const expanded = expandedId === entry.id;
              const shot = shots[entry.id];
              const busy = busyId === entry.id;
              return (
                <li key={entry.id} className={[colors.card, colors.border, 'border', radius.card, 'overflow-hidden', sMeta.stripe].join(' ')}>
                  <button
                    onClick={() => toggleExpand(entry)}
                    className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[var(--color-card-hover)] transition-colors"
                    aria-expanded={expanded}
                  >
                    <span className={`inline-flex items-center justify-center w-9 h-9 shrink-0 rounded-lg ${colors.surface} ${colors.textSecondary}`}>
                      <SourceIcon className="w-4 h-4" />
                    </span>
                    <span className="flex-1 min-w-0">
                      <span className="flex items-center gap-2 flex-wrap">
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-xs font-bold border ${sMeta.badge}`}>
                          <StatusIcon className="w-3 h-3" /> {sMeta.label}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded-md text-xs font-bold border ${levelClasses(entry.level)}`}>
                          {entry.level ? `N${entry.level}` : '—'}
                        </span>
                        <span className={`text-xs uppercase tracking-wide ${colors.textMuted}`}>
                          {SOURCE_META[entry.source].label}
                        </span>
                        {entry.occurrences && entry.occurrences > 1 && (
                          <span className={`text-xs ${colors.textMuted}`}>×{entry.occurrences}</span>
                        )}
                        {entry.screenshot_url && <ImageIcon className={`w-3 h-3 ${colors.textMuted}`} />}
                      </span>
                      <span className={`block text-sm font-medium truncate mt-0.5 ${colors.text}`}>{entry.title}</span>
                      <span className={`block text-xs truncate ${colors.textMuted}`}>
                        {entry.category ?? 'other'} · {entry.context?.route || '—'} · {formatDate(entry.last_seen_at ?? entry.created_at)}
                      </span>
                    </span>
                    <span className={`shrink-0 ${colors.textMuted}`}>
                      {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </span>
                  </button>

                  {expanded && (
                    <div className={`px-4 pb-4 pt-1 border-t ${colors.divider} space-y-3`}>
                      {entry.description && (
                        <p className={`text-xs whitespace-pre-wrap break-words ${colors.textSecondary}`}>{entry.description}</p>
                      )}

                      {entry.context && (
                        <dl className={`grid grid-cols-2 gap-y-1.5 gap-x-3 ${colors.textMuted}`}>
                          <Ctx label="Rota" value={entry.context.route || '—'} />
                          <Ctx label="Tela" value={`${entry.context.viewportWidth}×${entry.context.viewportHeight}`} />
                          <Ctx label="Tema" value={`${entry.context.theme ?? '—'}/${entry.context.mode ?? '—'}`} />
                          <Ctx label="Quando" value={formatDate(entry.created_at)} />
                        </dl>
                      )}

                      {entry.context?.consoleErrors && entry.context.consoleErrors.length > 0 && (
                        <pre className={`text-xs font-mono whitespace-pre-wrap break-words p-2 ${radius.input} ${colors.surface} ${colors.textMuted} max-h-40 overflow-auto`}>
                          {entry.context.consoleErrors.join('\n')}
                        </pre>
                      )}

                      {entry.triage_summary && (
                        <div className={`text-xs p-2 ${radius.input} ${accent.bgDim} ${colors.textSecondary}`}>
                          <strong className={accent.text}>Triagem:</strong> {entry.triage_summary}
                        </div>
                      )}

                      {entry.screenshot_url && (
                        shot === undefined ? (
                          <div className={`flex items-center gap-2 text-xs ${colors.textMuted}`}>
                            <Loader2 className="w-4 h-4 animate-spin" /> Carregando imagem…
                          </div>
                        ) : shot ? (
                          <a href={shot} target="_blank" rel="noopener noreferrer" className="block">
                            <img src={shot} alt="Imagem do problema" className={`w-full max-h-72 object-contain ${radius.input} border ${colors.border} bg-[var(--color-bg)]/20`} />
                          </a>
                        ) : (
                          <span className={`text-xs ${colors.textMuted}`}>Não consegui carregar a imagem.</span>
                        )
                      )}

                      {/* Ações */}
                      <div className={`flex flex-wrap items-center gap-2 pt-1`}>
                        {group !== 'progress' && group !== 'done' && (
                          <button onClick={() => handleSetStatus(entry, 'in_progress')} disabled={busy} className={`${actionBtn} ${colors.border} text-[var(--color-warning)]`}>
                            <Clock className="w-3.5 h-3.5" /> Em andamento
                          </button>
                        )}
                        {group !== 'done' && (
                          <button onClick={() => handleSetStatus(entry, 'fixed')} disabled={busy} className={`${actionBtn} border-[var(--color-success-border)] text-[var(--color-success)] bg-[var(--color-success-bg)]`}>
                            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Resolver
                          </button>
                        )}
                        {group !== 'open' && (
                          <button onClick={() => handleSetStatus(entry, 'new')} disabled={busy} className={`${actionBtn} ${colors.border} ${colors.textSecondary}`}>
                            <RotateCcw className="w-3.5 h-3.5" /> Reabrir
                          </button>
                        )}

                        {pendingDeleteId === entry.id ? (
                          <span className="flex items-center gap-2 ml-auto">
                            <span className={`text-xs ${colors.textMuted}`}>Apagar?</span>
                            <button onClick={() => handleDelete(entry)} disabled={busy} className={`${actionBtn} bg-[var(--color-danger-bg)] text-[var(--color-danger)] border-[var(--color-danger-border)]`}>
                              {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />} Sim
                            </button>
                            <button onClick={() => setPendingDeleteId(null)} disabled={busy} className={`${actionBtn} ${colors.border} ${colors.textSecondary}`}>
                              Não
                            </button>
                          </span>
                        ) : (
                          <button onClick={() => setPendingDeleteId(entry.id)} disabled={busy} className={`${actionBtn} ml-auto ${colors.border} text-[var(--color-danger)]`}>
                            <Trash2 className="w-3.5 h-3.5" /> Remover
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {showAdd && (
        <AddAuditEntryModal
          onClose={() => setShowAdd(false)}
          onCreated={loadEntries}
        />
      )}
    </SettingsLayout>
  );
};

const Ctx: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="min-w-0">
    <dt className="text-xs uppercase tracking-wide opacity-70">{label}</dt>
    <dd className="text-xs font-mono break-words">{value}</dd>
  </div>
);
