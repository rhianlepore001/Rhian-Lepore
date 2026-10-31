import { describe, expect, it, vi } from 'vitest';
const state = vi.hoisted(() => ({ from:vi.fn() }));
vi.mock('../../lib/supabase', () => ({ supabase: { from:state.from } }));
import { fetchClientAdditionalPhones } from '../../services/clientAdditionalPhones';

describe('telefones adicionais', () => {
  it('busca os telefones somente no cadastro da empresa', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data:{ additional_phones:['+551133334444'] }, error:null });
    const eqCompany = vi.fn().mockReturnValue({ maybeSingle });
    const eqClient = vi.fn().mockReturnValue({ eq:eqCompany });
    state.from.mockReturnValue({ select:vi.fn().mockReturnValue({ eq:eqClient }) });
    expect(await fetchClientAdditionalPhones('empresa-ficticia','cliente-ficticio')).toEqual(['+551133334444']);
    expect(eqClient).toHaveBeenCalledWith('id','cliente-ficticio');
    expect(eqCompany).toHaveBeenCalledWith('user_id','empresa-ficticia');
  });
});
