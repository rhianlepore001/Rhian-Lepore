import { afterEach, expect, it } from 'vitest';
import { createDemoClient } from '../../lib/demo/client';
import { fetchStaffUnpaidCommissions } from '../../services/dashboard';

afterEach(() => { window.location.hash = ''; });

it('mantém o resumo de comissões disponível na demonstração local', async () => {
  window.location.hash = '#/demo/barber';
  const { data: records } = await createDemoClient().from('finance_records').select('*');
  const professionalId = records.find(row => row.type === 'revenue' && row.commission_value > 0)?.professional_id;

  expect(professionalId).toEqual(expect.any(String));
  await expect(fetchStaffUnpaidCommissions(professionalId)).resolves.toBeGreaterThan(0);
});
