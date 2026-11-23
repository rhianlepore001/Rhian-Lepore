import { afterEach, expect, it } from 'vitest';
import { demoCompanyId } from '../../lib/demo/mode';
import { fetchTeamRoster } from '../../services/team';

afterEach(() => { window.location.hash = ''; });

it('carrega a lista da equipe fictícia pelo mesmo contrato da Agenda e da Fila', async () => {
  window.location.hash = '#/demo/barber';
  const team = await fetchTeamRoster(demoCompanyId());

  expect(team.length).toBeGreaterThan(0);
  for (const member of team) {
    expect(Object.keys(member).sort()).toEqual(['active', 'id', 'name', 'photo_url', 'staff_user_id']);
    expect(member.name).toEqual(expect.any(String));
    expect(member.active).toBe(true);
  }
});
