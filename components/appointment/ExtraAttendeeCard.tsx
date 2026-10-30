import React, { useState } from 'react';
import { Check } from 'lucide-react';
import { Button } from '../ui/Button';
import { AttendeePicker } from './AttendeePicker';
import { ServiceSearchBar } from './ServiceSearchBar';
import { CategoryFilter } from './CategoryFilter';
import { ServiceList } from './ServiceList';
import { formatCurrency } from '../../utils/formatters';
import type { AttendeeSelection } from '../../utils/appointmentAttendees';
import type { Service } from './types';

export type ExtraAttendee = AttendeeSelection & { key: string };

interface TeamMember {
  id: string;
  name?: string;
  full_name?: string;
}

interface Props {
  index: number;
  person: ExtraAttendee;
  companyId: string;
  clientId: string;
  clientName: string;
  services: Service[];
  categories: Array<{ id: string; name: string }>;
  teamMembers: TeamMember[];
  holderProfessionalName?: string;
  isBeauty: boolean;
  accentColor: string;
  currencyRegion: 'BR' | 'PT';
  onChange: (patch: Partial<ExtraAttendee>) => void;
  onRemove: () => void;
}

const selectClass = 'w-full rounded-lg border border-[var(--color-input-border)] bg-[var(--color-input-bg)] p-3 text-theme-text';

export const ExtraAttendeeCard: React.FC<Props> = ({
  index, person, companyId, clientId, clientName, services, categories, teamMembers,
  holderProfessionalName, isBeauty, accentColor, currencyRegion, onChange, onRemove,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');
  const chosen = services.filter(service => person.serviceIds.includes(service.id));
  const total = chosen.reduce((sum, service) => sum + service.price, 0);
  const label = person.name || `Pessoa ${index + 2}`;
  const toggleService = (id: string) => onChange({
    serviceIds: person.serviceIds.includes(id) ? person.serviceIds.filter(item => item !== id) : [...person.serviceIds, id],
  });

  return (
    <section data-testid="extra-attendee-card" aria-label={`Atendimento de ${label}`} className="p-4 border border-[var(--color-divider)] rounded-xl space-y-4 bg-theme-card">
      <div className="flex items-center justify-between gap-3">
        <h3 className="font-bold text-theme-text">Pessoa {index + 2}</h3>
        <span className={`text-xs font-mono ${accentColor}`}>
          {chosen.length === 0 ? 'Nenhum serviço escolhido' : `${chosen.length} ${chosen.length === 1 ? 'serviço' : 'serviços'} · ${formatCurrency(total, currencyRegion)}`}
        </span>
      </div>

      <AttendeePicker
        companyId={companyId}
        clientId={clientId}
        clientName={clientName}
        value={person.dependentId || ''}
        snapshot={person.name}
        label="Para quem?"
        onChange={(id, name) => onChange({ dependentId: id || null, name })}
      />

      <div>
        <h4 className="text-sm font-bold text-theme-text mb-2">Serviços de {label}</h4>
        <ServiceSearchBar searchQuery={searchQuery} setSearchQuery={setSearchQuery} isBeauty={isBeauty} />
        <CategoryFilter categories={categories} activeCategory={activeCategory} setActiveCategory={setActiveCategory} accentColor={accentColor} isBeauty={isBeauty} />
        <ServiceList
          services={services}
          selectedServiceIds={person.serviceIds}
          toggleService={toggleService}
          isBeauty={isBeauty}
          currencyRegion={currencyRegion}
          searchQuery={searchQuery}
          activeCategory={activeCategory}
          categories={categories}
          setSearchQuery={setSearchQuery}
          isCustomService={false}
          setIsCustomService={() => undefined}
          customServiceName=""
          setCustomServiceName={() => undefined}
          customServicePrice=""
          setCustomServicePrice={() => undefined}
          currencySymbol={currencyRegion === 'PT' ? '€' : 'R$'}
          allowCustomService={false}
        />
      </div>

      <label className="block text-sm font-bold text-theme-text">
        Profissional de {label}
        <select
          data-testid="extra-attendee-professional"
          className={`${selectClass} mt-1 font-normal`}
          value={person.professionalId ?? ''}
          onChange={event => onChange({ professionalId: event.target.value || undefined })}
        >
          <option value="">{holderProfessionalName ? `Mesmo profissional da pessoa 1 (${holderProfessionalName})` : 'Mesmo profissional da pessoa 1'}</option>
          {teamMembers.map(member => <option key={member.id} value={member.id}>{member.name || member.full_name}</option>)}
        </select>
      </label>
      <p className="text-xs text-theme-textSecondary flex items-center gap-1.5">
        <Check className="w-3.5 h-3.5" aria-hidden="true" />
        Com o mesmo profissional, o atendimento segue em sequência. Com profissionais diferentes, acontece ao mesmo tempo.
      </p>

      <Button size="sm" variant="ghost" onClick={onRemove}>Remover pessoa</Button>
    </section>
  );
};
