import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, Check, Clock, Loader2, Plus, Search, Send, User, Users, X } from 'lucide-react';
import { CalendarPicker } from '../CalendarPicker';
import { TimeGrid } from '../TimeGrid';
import { PhoneInput } from '../PhoneInput';
import { Checkbox, useToast } from '@/components/ui';
import { useBrutalTheme, type ThemeVariant } from '../../hooks/useBrutalTheme';
import { useSubmitPublicGroupBooking } from '../../hooks/usePublicBooking';
import { fetchAvailableSlots } from '../../services/publicBooking';
import type { PublicBookingRecord } from '../../types/publicBooking';
import { matchesServiceSearch } from '../../utils/serviceSearch';
import { capBookingDuration } from '../../utils/serviceDuration';
import { formatCurrency, type Region } from '../../utils/formatters';
import {
  formatTimeInTimeZone,
  getTodayInTimeZone,
  isZonedSlotInPast,
  zonedDateTimeToIso,
} from '../../utils/businessTimezone';
import {
  groupSlotRequirements,
  intersectSlotLists,
  summarizeGroup,
  validateGroupPeople,
} from '../../utils/groupBooking';
import { getPublicBookingSuccessCopy, type PublicGroupWhatsAppPerson } from '../../utils/publicBookingCopy';
import {
  DEFAULT_BOOKING_LEAD_TIME_MINUTES,
  isLeadTimeViolationError,
  leadTimeEmptySlotsMessageMinutes,
  leadTimeViolationMessageMinutes,
  leadTimeMinutesFromError,
} from '../../utils/bookingLeadTime';
import { isSlotUnavailableError } from '../../utils/supabaseRpc';
import { logger } from '../../utils/Logger';

interface GroupService {
  id: string;
  name: string;
  price: number;
  duration_minutes: number;
  category_id?: string;
  description?: string | null;
}

interface GroupProfessional {
  id: string;
  name: string;
  photo_url?: string | null;
}

interface GroupCategory {
  id: string;
  name: string;
}

interface Person {
  key: string;
  name: string;
  serviceIds: string[];
  professionalId: string;
}

interface Props {
  businessId: string;
  userType?: string | null;
  isBeauty: boolean;
  currencyRegion: Region;
  timezone: string;
  services: GroupService[];
  categories: GroupCategory[];
  professionals: GroupProfessional[];
  isLoggedIn: boolean;
  customerName: string;
  setCustomerName: (value: string) => void;
  customerPhone: string;
  setCustomerPhone: (value: string) => void;
  acceptedPolicy: boolean;
  setAcceptedPolicy: (value: boolean) => void;
  inlinePolicy: React.ReactNode;
  onOpenPolicy: () => void;
  autoConfirm: boolean;
  onBooked: () => Promise<unknown>;
  onOpenClientArea: () => void;
  onExit: () => void;
  buildWhatsAppHref: (input: {
    confirmed: boolean;
    dateLabel: string;
    timeLabel: string;
    people: PublicGroupWhatsAppPerson[];
  }) => string | null;
  maxPeople?: number;
}

type GroupStep = 'people' | 'schedule' | 'confirm' | 'success';

const newPerson = (): Person => ({ key: crypto.randomUUID(), name: '', serviceIds: [], professionalId: '' });

export const PublicGroupBooking: React.FC<Props> = ({
  businessId, userType, isBeauty, currencyRegion, timezone, services, categories, professionals,
  isLoggedIn, customerName, setCustomerName, customerPhone, setCustomerPhone,
  acceptedPolicy, setAcceptedPolicy, inlinePolicy, onOpenPolicy, autoConfirm, onBooked,
  onOpenClientArea, onExit, buildWhatsAppHref, maxPeople = 5,
}) => {
  const themeOverride: ThemeVariant = isBeauty ? 'beauty' : 'barber';
  const { colors, accent, classes, shadow } = useBrutalTheme({ override: themeOverride });
  const { showToast } = useToast();
  const submit = useSubmitPublicGroupBooking();
  const accentTextOnAccent = isBeauty ? 'text-[var(--color-text)]' : 'text-[var(--color-on-accent)]';

  const [step, setStep] = useState<GroupStep>('people');
  const [people, setPeople] = useState<Person[]>(() => [newPerson(), newPerson()]);
  const [activeKey, setActiveKey] = useState<string>(() => '');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [slots, setSlots] = useState<string[]>([]);
  const [leadMinutes, setLeadMinutes] = useState<number | null>(null);
  const [slotsRefresh, setSlotsRefresh] = useState(0);
  const [leadAlert, setLeadAlert] = useState<string | null>(null);
  const [leadAlertKey, setLeadAlertKey] = useState(0);
  const [booked, setBooked] = useState<PublicBookingRecord[]>([]);

  const today = getTodayInTimeZone(timezone);
  const holderLabel = customerName.trim() || 'Você';
  const currentKey = activeKey || people[0].key;
  const activeIndex = Math.max(0, people.findIndex(person => person.key === currentKey));
  const active = people[activeIndex];

  const labelOf = (person: Person, index: number) => (index === 0 ? holderLabel : person.name.trim() || `Pessoa ${index + 1}`);
  const toSelection = (list: Person[]) => list.map((person, index) => ({
    name: index === 0 ? holderLabel : person.name,
    professionalId: person.professionalId,
    serviceIds: person.serviceIds,
  }));

  const summary = useMemo(() => {
    const complete = people.every(person => person.serviceIds.length > 0 && person.professionalId);
    if (!complete) return null;
    const start = new Date(0);
    return summarizeGroup(start, toSelection(people), services);
  }, [people, services, holderLabel]);

  const loads = useMemo(() => (summary
    ? summary.people.map(person => ({ professionalId: person.professionalId, durationMinutes: person.durationMinutes }))
    : []), [summary]);
  const requirements = useMemo(() => groupSlotRequirements(loads), [loads]);
  const requirementsKey = JSON.stringify(requirements);
  const dateStr = selectedDate
    ? `${selectedDate.getFullYear()}-${String(selectedDate.getMonth() + 1).padStart(2, '0')}-${String(selectedDate.getDate()).padStart(2, '0')}`
    : null;

  useEffect(() => {
    if (step !== 'schedule' || !dateStr || requirements.length === 0) return undefined;
    let cancelled = false;
    setSlots([]);
    Promise.all(requirements.map(item => fetchAvailableSlots(businessId, dateStr, item.professionalId, capBookingDuration(item.durationMinutes))))
      .then(results => {
        if (cancelled) return;
        const common = intersectSlotLists(results.map(result => result.slots))
          .filter(slot => !isZonedSlotInPast(dateStr, slot, timezone));
        setSlots(common);
        setLeadMinutes(results[0]?.emptyReason === 'lead_time' ? results[0].leadTimeMinutes : null);
      })
      .catch(() => { if (!cancelled) setSlots([]); });
    return () => { cancelled = true; };
  }, [step, dateStr, requirementsKey, businessId, timezone, slotsRefresh]);

  useEffect(() => {
    if (selectedTime && !slots.includes(selectedTime)) setSelectedTime(null);
  }, [slots, selectedTime]);

  const updatePerson = (key: string, patch: Partial<Person>) => setPeople(rows => rows.map(row => (row.key === key ? { ...row, ...patch } : row)));
  const toggleService = (serviceId: string) => updatePerson(active.key, {
    serviceIds: active.serviceIds.includes(serviceId) ? active.serviceIds.filter(id => id !== serviceId) : [...active.serviceIds, serviceId],
  });
  const addPerson = () => {
    if (people.length >= maxPeople) return;
    const person = newPerson();
    setPeople(rows => [...rows, person]);
    setActiveKey(person.key);
    setSearch('');
    setCategory('all');
  };
  const removePerson = (key: string) => {
    if (people.length <= 2) return;
    setPeople(rows => rows.filter(row => row.key !== key));
    setActiveKey('');
  };

  const peopleError = validateGroupPeople(toSelection(people));
  const visibleServices = services.filter(service => {
    const inCategory = category === 'all' || (category === 'no-category' && !service.category_id) || service.category_id === category;
    return inCategory && matchesServiceSearch(service, search);
  });
  const totalPrice = summary?.totalPrice ?? 0;

  const goSchedule = () => {
    if (peopleError) { showToast(peopleError, 'warning'); return; }
    setStep('schedule');
  };

  const canConfirm = Boolean(selectedDate && selectedTime);
  const canSubmit = canConfirm && acceptedPolicy && customerName.trim() && (isLoggedIn || customerPhone) && !validateGroupPeople(toSelection(people));

  const handleSubmit = async () => {
    if (!canSubmit || !dateStr || !selectedTime || !summary) return;
    if (isZonedSlotInPast(dateStr, selectedTime, timezone)) {
      showToast('Esse horário já passou. Escolha outro horário.', 'warning');
      setStep('schedule');
      return;
    }
    try {
      const rows = await submit.mutateAsync({
        businessId,
        customerName: customerName.trim(),
        customerPhone,
        appointmentTime: zonedDateTimeToIso(dateStr, selectedTime, timezone),
        people: people.map((person, index) => ({
          attendeeName: index === 0 ? null : person.name.trim(),
          professionalId: person.professionalId,
          serviceIds: person.serviceIds,
        })),
      });
      setBooked(rows as PublicBookingRecord[]);
      try { await onBooked(); } catch (sessionError) { logger.warn('Sessão do cliente não criada após agendamento em grupo', sessionError); }
      setStep('success');
    } catch (error) {
      logger.error('Erro ao criar agendamento em grupo', error);
      if (isLeadTimeViolationError(error)) {
        setSelectedTime(null);
        setStep('schedule');
        setSlotsRefresh(key => key + 1);
        setLeadAlert(leadTimeViolationMessageMinutes(leadTimeMinutesFromError(error, leadMinutes ?? DEFAULT_BOOKING_LEAD_TIME_MINUTES)));
        setLeadAlertKey(key => key + 1);
      } else if (isSlotUnavailableError(error)) {
        setSelectedTime(null);
        setStep('schedule');
        setSlotsRefresh(key => key + 1);
        showToast('Esse horário acabou de ser ocupado para uma das pessoas. Nenhum agendamento foi feito. Escolha outro horário.', 'error');
      } else if (String((error as { message?: string })?.message ?? '').includes('invalid_people')) {
        setStep('people');
        showToast('Confira os nomes: cada pessoa precisa de um nome diferente.', 'warning');
      } else {
        showToast('Não foi possível concluir o agendamento agora. Nenhum horário foi reservado. Tente novamente em instantes.', 'error');
      }
    }
  };

  const professionalName = (id?: string | null) => professionals.find(item => item.id === id)?.name ?? '—';
  const serviceNames = (ids: string[]) => ids.map(id => services.find(service => service.id === id)?.name).filter(Boolean).join(' + ');
  const stepIndex = step === 'people' ? 0 : step === 'schedule' ? 1 : 2;
  const stepLabels = ['Pessoas', 'Data e hora', 'Confirmar'];
  const dateLabel = selectedDate?.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }) ?? '';
  const initials = (name: string) => (name || '?').trim().split(/\s+/).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('');

  const successRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (step === 'success') successRef.current?.scrollIntoView?.({ block: 'start' });
  }, [step]);

  if (step === 'success') {
    const first = booked[0];
    const copy = getPublicBookingSuccessCopy({ isBeauty, userType, status: first?.status });
    const whatsappHref = buildWhatsAppHref({
      confirmed: first?.status === 'confirmed',
      dateLabel: first ? new Date(first.appointment_time).toLocaleDateString('pt-BR', { timeZone: timezone }) : '',
      timeLabel: first ? formatTimeInTimeZone(first.appointment_time, timezone) : '',
      people: booked.map(row => ({
        name: row.attendee_name || customerName,
        serviceLabel: serviceNames(row.service_ids),
        professionalName: professionals.find(item => item.id === row.professional_id)?.name ?? null,
        timeLabel: formatTimeInTimeZone(row.appointment_time, timezone),
      })),
    });
    const total = booked.reduce((sum, row) => sum + Number(row.total_price ?? 0), 0);
    return (
      <div ref={successRef} data-testid="group-booking-success" className="max-w-xl mx-auto py-10 px-4 scroll-mt-24 animate-reveal-fragment relative z-10">
        <div className="text-center mb-8">
          <div className={`w-20 h-20 mx-auto mb-5 flex items-center justify-center rounded-full ${accent.bg} ${accentTextOnAccent} ${shadow.elevated}`}>
            <Check className="w-10 h-10 stroke-[3]" />
          </div>
          <h2 data-testid="group-booking-success-title" className={`text-3xl font-black tracking-tight mb-3 ${colors.text}`}>{copy.title}</h2>
          <p className={`text-base leading-relaxed ${colors.textMuted}`}>{copy.subtitle}</p>
        </div>
        <ul className="space-y-3 mb-6" aria-label="Resumo do agendamento">
          {booked.map(row => (
            <li key={row.id} data-testid="group-booking-success-person" className={`p-4 rounded-2xl border ${colors.card} ${colors.border} ${shadow.card}`}>
              <div className="flex justify-between gap-3">
                <p className={`font-bold ${colors.text}`}>{row.attendee_name || customerName}</p>
                <p className={`font-mono font-bold ${accent.text}`}>{formatCurrency(Number(row.total_price), currencyRegion)}</p>
              </div>
              <p className={`text-sm mt-1 ${colors.textSecondary}`}>{serviceNames(row.service_ids)}</p>
              <p className={`text-sm mt-1 ${colors.textMuted}`}>
                {professionalName(row.professional_id)} · {new Date(row.appointment_time).toLocaleDateString('pt-BR', { timeZone: timezone, weekday: 'short', day: '2-digit', month: 'short' })} às {formatTimeInTimeZone(row.appointment_time, timezone)}
              </p>
            </li>
          ))}
        </ul>
        <div className={`flex justify-between p-4 rounded-2xl border mb-8 ${colors.surface} ${colors.border}`}>
          <span className={`font-semibold ${colors.text}`}>Total</span>
          <span data-testid="group-booking-success-total" className={`font-mono font-bold ${accent.text}`}>{formatCurrency(total, currencyRegion)}</span>
        </div>
        <div className="flex flex-col gap-3">
          {whatsappHref && (
            <a href={whatsappHref} target="_blank" rel="noopener noreferrer" className={`flex items-center justify-center gap-3 py-4 px-6 rounded-2xl font-semibold ${accent.bg} ${accentTextOnAccent} ${shadow.elevated}`}>
              <Send className="w-5 h-5" />{copy.whatsappCta}
            </a>
          )}
          <button type="button" onClick={onOpenClientArea} className={`py-4 px-6 min-h-12 ${classes.buttonSecondary}`}>Minha Área de Cliente</button>
          <button type="button" onClick={() => window.location.reload()} className={`py-3 text-sm font-semibold underline underline-offset-4 ${colors.textMuted}`}>Fazer novo agendamento</button>
        </div>
      </div>
    );
  }

  return (
    <div data-testid="group-booking" className="container mx-auto px-3 md:px-6 max-w-4xl relative z-10 pt-4 md:pt-8 pb-40">
      <div className={`sticky top-0 z-[60] w-full border-b ${colors.divider} ${colors.bg}/95 backdrop-blur-md mb-6`}>
        <div className="py-3 flex items-center gap-0">
          {stepLabels.map((label, idx) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1">
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-xs font-black ${idx <= stepIndex ? `${accent.bg} ${accentTextOnAccent}` : `${colors.surface} ${colors.textMuted}`}`}>
                  {idx < stepIndex ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                </div>
                <span className={`text-xs font-semibold ${idx === stepIndex ? accent.text : colors.textMuted}`}>{label}</span>
              </div>
              {idx < stepLabels.length - 1 && <div className={`flex-1 h-px mx-2 ${colors.divider}`} />}
            </React.Fragment>
          ))}
        </div>
      </div>

      {step === 'people' && (
        <div className="space-y-6 animate-reveal-fragment">
          <div>
            <h2 className={`text-2xl font-black tracking-tight mb-1 ${colors.text}`}>Agendar para mais de uma pessoa</h2>
            <p className={`text-sm ${colors.textMuted}`}>Escolha os serviços e o profissional de cada pessoa. Cada uma pode ser atendida por um profissional diferente.</p>
          </div>

          <div role="tablist" aria-label="Pessoas" className="flex gap-2 overflow-x-auto pb-1">
            {people.map((person, index) => {
              const selected = person.key === active.key;
              return (
                <button
                  key={person.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  data-testid={`group-person-tab-${index}`}
                  onClick={() => { setActiveKey(person.key); setSearch(''); setCategory('all'); }}
                  className={`shrink-0 min-h-11 px-4 py-2 rounded-xl border text-sm font-semibold text-left ${selected ? `${accent.bg} ${accentTextOnAccent}` : `${colors.card} ${colors.border} ${colors.text}`}`}
                >
                  <span className="block truncate max-w-[9rem]">{labelOf(person, index)}</span>
                  <span className={`block text-xs font-normal ${selected ? '' : colors.textMuted}`}>
                    {person.serviceIds.length === 0 ? 'Sem serviço' : `${person.serviceIds.length} ${person.serviceIds.length === 1 ? 'serviço' : 'serviços'}`}
                  </span>
                </button>
              );
            })}
            {people.length < maxPeople && (
              <button type="button" onClick={addPerson} data-testid="group-add-person" className={`shrink-0 min-h-11 px-4 rounded-xl border border-dashed text-sm font-semibold flex items-center gap-2 ${colors.border} ${accent.text}`}>
                <Plus className="w-4 h-4" />Adicionar pessoa
              </button>
            )}
          </div>

          <section aria-label={`Atendimento de ${labelOf(active, activeIndex)}`} className={`p-4 rounded-2xl border space-y-5 ${colors.card} ${colors.border}`}>
            {activeIndex > 0 && (
              <div className="space-y-1.5">
                <label htmlFor="group-person-name" className={`${colors.textMuted} text-xs font-semibold uppercase tracking-wide block`}>Nome da pessoa {activeIndex + 1}</label>
                <div className="flex gap-2">
                  <input id="group-person-name" type="text" value={active.name} maxLength={80} onChange={event => updatePerson(active.key, { name: event.target.value })} placeholder="Como devemos chamar?" className={`flex-1 min-w-0 py-3 px-4 ${classes.input}`} />
                  {people.length > 2 && (
                    <button type="button" aria-label={`Remover ${labelOf(active, activeIndex)}`} onClick={() => removePerson(active.key)} className={`min-h-11 min-w-11 flex items-center justify-center rounded-xl border ${colors.border} ${colors.textMuted}`}>
                      <X className="w-5 h-5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-3">
              <h3 className={`text-sm font-bold ${colors.text}`}>Serviços</h3>
              <div className="relative">
                <Search className={`absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 ${colors.textMuted}`} aria-hidden="true" />
                <input type="search" aria-label="Buscar serviço" placeholder="Buscar serviço..." value={search} onChange={event => setSearch(event.target.value)} className={`w-full py-3 pl-10 pr-4 ${classes.input}`} />
              </div>
              {categories.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {[{ id: 'all', name: 'Todos' }, ...categories].map(item => (
                    <button key={item.id} type="button" onClick={() => setCategory(item.id)} aria-pressed={category === item.id}
                      className={`shrink-0 min-h-11 px-4 rounded-xl border text-xs font-black uppercase tracking-wide ${category === item.id ? `${accent.bg} ${accentTextOnAccent}` : `${colors.textMuted} ${colors.border}`}`}>
                      {item.name}
                    </button>
                  ))}
                </div>
              )}
              <ul className="space-y-2" aria-label="Serviços disponíveis">
                {visibleServices.map(service => {
                  const picked = active.serviceIds.includes(service.id);
                  return (
                    <li key={service.id}>
                      <button type="button" aria-pressed={picked} data-testid="group-service" onClick={() => toggleService(service.id)}
                        className={`w-full min-h-14 flex items-center gap-3 px-3.5 py-3 rounded-xl border text-left transition-colors ${picked ? `ring-2 ${accent.ring} ${colors.surface} ${colors.border}` : `${colors.surface} ${colors.border}`}`}>
                        <span className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center ${picked ? `${accent.bg} ${colors.border} ${accentTextOnAccent}` : colors.border}`}>
                          {picked && <Check className="w-4 h-4" />}
                        </span>
                        <span className="flex-1 min-w-0">
                          <span className={`block font-bold leading-snug break-words ${colors.text}`}>{service.name}</span>
                          <span className={`flex items-center gap-1 text-xs mt-0.5 ${colors.textMuted}`}><Clock className="w-3 h-3" />{service.duration_minutes} min</span>
                        </span>
                        <span className={`shrink-0 font-mono font-bold ${accent.text}`}>{formatCurrency(service.price, currencyRegion)}</span>
                      </button>
                    </li>
                  );
                })}
              </ul>
              {visibleServices.length === 0 && <p className={`text-sm text-center py-6 ${colors.textMuted}`}>Nenhum serviço encontrado.</p>}
            </div>

            <div className="space-y-3">
              <h3 className={`text-sm font-bold ${colors.text}`}>Profissional de {labelOf(active, activeIndex)}</h3>
              <div className="grid grid-cols-2 gap-2" role="group" aria-label="Profissional">
                {professionals.map(pro => {
                  const picked = active.professionalId === pro.id;
                  return (
                    <button key={pro.id} type="button" aria-pressed={picked} data-testid="group-professional" onClick={() => updatePerson(active.key, { professionalId: pro.id })}
                      className={`min-h-12 flex items-center gap-2.5 px-2.5 py-2 rounded-xl border text-left ${picked ? `${accent.bg} ${accentTextOnAccent} border-transparent` : `${colors.surface} ${colors.border} ${colors.text}`}`}>
                      {pro.photo_url ? (
                        <img src={pro.photo_url} alt="" width={32} height={32} loading="lazy" className="w-8 h-8 shrink-0 rounded-full object-cover" />
                      ) : (
                        <span aria-hidden="true" className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-xs font-bold ${colors.card}`}>{initials(pro.name)}</span>
                      )}
                      <span className="min-w-0 text-sm font-semibold leading-tight line-clamp-2 break-words">{pro.name}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {people.length >= 2 && (
            <div className={`p-4 rounded-2xl border ${colors.surface} ${colors.border}`}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-semibold uppercase tracking-wide ${colors.textMuted}`}>Resumo</span>
                {summary && <span data-testid="group-total" className={`font-mono font-bold ${accent.text}`}>{formatCurrency(totalPrice, currencyRegion)}</span>}
              </div>
              <ul className="space-y-1.5">
                {people.map((person, index) => (
                  <li key={person.key} className={`text-sm flex justify-between gap-3 ${colors.textSecondary}`}>
                    <span className="min-w-0 truncate">{labelOf(person, index)}</span>
                    <span className={`shrink-0 ${colors.textMuted}`}>{person.professionalId ? professionalName(person.professionalId) : 'Escolha o profissional'}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <button type="button" onClick={onExit} className={`flex items-center gap-2 text-sm font-semibold underline underline-offset-4 ${colors.textMuted}`}>
            <User className="w-4 h-4" />Voltar ao agendamento individual
          </button>
        </div>
      )}

      {step === 'schedule' && (
        <div className="space-y-8 animate-reveal-fragment">
          <div>
            <h2 className={`text-2xl font-black tracking-tight mb-1 ${colors.text}`}>Escolha a data e hora</h2>
            <p className={`text-sm ${colors.textMuted}`}>
              {requirements.length > 1 ? 'Mostramos só os horários em que todos os profissionais estão livres ao mesmo tempo.' : 'Quem for atendido pelo mesmo profissional segue em sequência, um após o outro.'}
            </p>
          </div>
          <div className="max-w-2xl mx-auto">
            <CalendarPicker selectedDate={selectedDate} onDateSelect={date => { setLeadAlert(null); setSelectedDate(date); setSelectedTime(null); }} forceTheme={themeOverride} today={today} />
          </div>
          {selectedDate && (
            <div className="max-w-2xl mx-auto">
              <TimeGrid
                selectedTime={selectedTime}
                onTimeSelect={time => { setLeadAlert(null); setSelectedTime(time); }}
                availableSlots={slots}
                forceTheme={themeOverride}
                emptyMessage={leadMinutes != null ? leadTimeEmptySlotsMessageMinutes(leadMinutes, dateStr === today) : undefined}
                alertMessage={leadAlert}
                alertKey={leadAlertKey}
              />
            </div>
          )}
        </div>
      )}

      {step === 'confirm' && summary && selectedDate && selectedTime && dateStr && (
        <ConfirmStep
          startIso={zonedDateTimeToIso(dateStr, selectedTime, timezone)}
          rows={summarizeGroup(new Date(zonedDateTimeToIso(dateStr, selectedTime, timezone)), toSelection(people), services).people}
          timezone={timezone}
          currencyRegion={currencyRegion}
          professionalName={professionalName}
          serviceNames={serviceNames}
          dateLabel={dateLabel}
          colors={colors}
          accent={accent}
          shadow={shadow}
          classes={classes}
          isLoggedIn={isLoggedIn}
          customerName={customerName}
          setCustomerName={setCustomerName}
          customerPhone={customerPhone}
          setCustomerPhone={setCustomerPhone}
          acceptedPolicy={acceptedPolicy}
          setAcceptedPolicy={setAcceptedPolicy}
          inlinePolicy={inlinePolicy}
          onOpenPolicy={onOpenPolicy}
        />
      )}

      <div className="fixed bottom-0 left-0 right-0 w-full" style={{ zIndex: 'var(--z-modal)' }}>
        <div className={`${colors.bg}/95 backdrop-blur-xl border-t ${colors.divider} px-4 pt-3`} style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}>
          <div className="flex items-center gap-2 md:gap-3 max-w-4xl mx-auto">
            {step !== 'people' && (
              <button type="button" onClick={() => setStep(step === 'confirm' ? 'schedule' : 'people')} className={`px-4 md:px-5 py-3.5 min-h-12 font-semibold text-sm ${classes.buttonSecondary}`}>Voltar</button>
            )}
            {step === 'people' && (
              <button type="button" data-testid="group-next" onClick={goSchedule} disabled={Boolean(peopleError)} className={`flex-1 py-3.5 min-h-12 flex items-center justify-center gap-2 ${classes.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}>
                <Users className="w-5 h-5" /><span className="font-semibold">Escolher data e hora</span><ArrowRight className="w-5 h-5" />
              </button>
            )}
            {step === 'schedule' && (
              <button type="button" data-testid="group-next" onClick={() => setStep('confirm')} disabled={!canConfirm} className={`flex-1 py-3.5 min-h-12 flex items-center justify-center gap-2 ${classes.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}>
                <span className="font-semibold">Continuar</span><ArrowRight className="w-5 h-5" />
              </button>
            )}
            {step === 'confirm' && (
              <button type="button" data-testid="group-submit" onClick={() => { void handleSubmit(); }} disabled={!canSubmit || submit.isPending} className={`flex-1 py-3.5 min-h-12 flex items-center justify-center gap-2 ${classes.buttonPrimary} disabled:opacity-50 disabled:cursor-not-allowed`}>
                {submit.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <><span className="font-semibold">{autoConfirm ? 'Confirmar agendamento' : 'Enviar pedido'}</span><Check className="w-5 h-5" /></>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

interface ConfirmStepProps {
  startIso: string;
  rows: ReturnType<typeof summarizeGroup>['people'];
  timezone: string;
  currencyRegion: Region;
  professionalName: (id?: string | null) => string;
  serviceNames: (ids: string[]) => string;
  dateLabel: string;
  colors: ReturnType<typeof useBrutalTheme>['colors'];
  accent: ReturnType<typeof useBrutalTheme>['accent'];
  shadow: ReturnType<typeof useBrutalTheme>['shadow'];
  classes: ReturnType<typeof useBrutalTheme>['classes'];
  isLoggedIn: boolean;
  customerName: string;
  setCustomerName: (value: string) => void;
  customerPhone: string;
  setCustomerPhone: (value: string) => void;
  acceptedPolicy: boolean;
  setAcceptedPolicy: (value: boolean) => void;
  inlinePolicy: React.ReactNode;
  onOpenPolicy: () => void;
}

const ConfirmStep: React.FC<ConfirmStepProps> = ({
  rows, timezone, currencyRegion, professionalName, serviceNames, dateLabel, colors, accent, shadow, classes,
  isLoggedIn, customerName, setCustomerName, customerPhone, setCustomerPhone, acceptedPolicy, setAcceptedPolicy, inlinePolicy, onOpenPolicy, startIso,
}) => {
  const total = rows.reduce((sum, row) => sum + row.totalPrice, 0);
  return (
    <div className="space-y-6 animate-reveal-fragment max-w-2xl mx-auto w-full">
      <div>
        <h2 className={`text-2xl font-black tracking-tight mb-1 ${colors.text}`}>Confirme o agendamento</h2>
        <p data-testid="group-confirm-date" className={`text-sm capitalize ${colors.textMuted}`}>{dateLabel} · início às {formatTimeInTimeZone(startIso, timezone)}</p>
      </div>

      <ul className="space-y-3" aria-label="Pessoas e atendimentos">
        {rows.map(row => (
          <li key={`${row.name}-${row.professionalId}`} data-testid="group-confirm-person" className={`p-4 rounded-2xl border ${colors.card} ${colors.border} ${shadow.card}`}>
            <div className="flex justify-between gap-3">
              <p className={`font-bold ${colors.text}`}>{row.name}</p>
              <p className={`font-mono font-bold ${accent.text}`}>{formatCurrency(row.totalPrice, currencyRegion)}</p>
            </div>
            <p className={`text-sm mt-1 ${colors.textSecondary}`}>{serviceNames(row.serviceIds)}</p>
            <p className={`text-sm mt-1 ${colors.textMuted}`}>
              {professionalName(row.professionalId)} · {formatTimeInTimeZone(row.startsAt, timezone)} · {row.durationMinutes} min
            </p>
          </li>
        ))}
      </ul>

      <div className={`flex justify-between p-4 rounded-2xl border ${colors.surface} ${colors.border}`}>
        <span className={`font-semibold ${colors.text}`}>Total</span>
        <span data-testid="group-confirm-total" className={`font-mono font-bold ${accent.text}`}>{formatCurrency(total, currencyRegion)}</span>
      </div>

      <div className="space-y-4">
        {isLoggedIn ? (
          <div className={`p-3.5 rounded-xl flex items-center gap-3 border ${colors.surface} ${colors.border}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${accent.bgDim} ${accent.text}`}>
              <User className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <p className={`font-semibold truncate ${colors.text}`}>{customerName}</p>
              <p className={`text-sm ${colors.textMuted}`}>{customerPhone}</p>
            </div>
            <Check className={`w-5 h-5 shrink-0 ${accent.text}`} aria-hidden="true" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            <div className="space-y-1.5">
              <label htmlFor="group-customer-name" className={`${colors.textMuted} text-xs font-semibold uppercase tracking-wide block`}>Seu nome completo</label>
              <input id="group-customer-name" type="text" value={customerName} onChange={event => setCustomerName(event.target.value)} autoComplete="name" placeholder="Como devemos te chamar?" className={`w-full py-3 px-4 ${classes.input}`} />
            </div>
            <div className="space-y-1.5">
              <label className={`${colors.textMuted} text-xs font-semibold uppercase tracking-wide block`}>WhatsApp</label>
              <PhoneInput value={customerPhone} onChange={setCustomerPhone} defaultRegion={currencyRegion as 'BR' | 'PT'} />
            </div>
          </div>
        )}
        {inlinePolicy}
        <Checkbox
          id="group-privacy"
          checked={acceptedPolicy}
          onChange={event => setAcceptedPolicy(event.target.checked)}
          label={
            <>
              Confirmo o compromisso de todos e aceito a{' '}
              <button type="button" onClick={event => { event.preventDefault(); onOpenPolicy(); }} className={`font-semibold underline underline-offset-2 ${accent.text}`}>política de cancelamento</button>.
            </>
          }
        />
      </div>
    </div>
  );
};
