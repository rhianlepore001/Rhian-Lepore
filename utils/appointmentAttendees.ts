export interface AttendeeSelection {
  dependentId: string | null;
  name: string;
  serviceIds: string[];
}

export function buildAttendeeSequence(
  start: Date,
  attendees: AttendeeSelection[],
  services: { id: string; price: number; duration_minutes?: number }[],
) {
  let time = start.getTime();
  return attendees.map(attendee => {
    const selected = attendee.serviceIds.map(id => services.find(service => service.id === id));
    if (!selected.length || selected.some(service => !service)) throw new Error('Selecione os serviços de cada pessoa.');
    const durationMinutes = selected.reduce((sum, service) => sum + (service?.duration_minutes || 30), 0);
    const totalPrice = selected.reduce((sum, service) => sum + (service?.price || 0), 0);
    const appointmentTime = new Date(time);
    time += durationMinutes * 60_000;
    return { ...attendee, appointmentTime, durationMinutes, totalPrice };
  });
}

export function attendeeLabel(appointment: { clientName: string; dependent_id?: string | null; attendee_name?: string | null }): string {
  const name = appointment.attendee_name;
  if (!name || (!appointment.dependent_id && name === appointment.clientName)) return appointment.clientName;
  return appointment.dependent_id
    ? `${name} (dep. de ${appointment.clientName})`
    : `${name} (responsável: ${appointment.clientName})`;
}
