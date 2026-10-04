import React, { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CommissionScheduleEditor } from '../../components/settings/CommissionScheduleEditor';
import { defaultScheduleDraft, type CommissionScheduleDraft } from '../../utils/commissionSchedule';

function Harness({ initial = defaultScheduleDraft(), fromIso = '2026-10-04' }: {
  initial?: CommissionScheduleDraft;
  fromIso?: string;
}) {
  const [draft, setDraft] = useState(initial);
  return (
    <CommissionScheduleEditor
      draft={draft}
      onChange={setDraft}
      fromIso={fromIso}
      currentEnd="2026-10-05"
      saved={defaultScheduleDraft()}
    />
  );
}

describe('CommissionScheduleEditor', () => {
  it('mostra preview mensal e troca para quinzenal com o aviso de mudança', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.getByTestId('commission-schedule-preview')).toHaveTextContent('Próximos fechamentos: 05/10 e 05/11.');
    await user.click(screen.getByRole('tab', { name: 'Quinzenal' }));
    expect(screen.getByTestId('commission-schedule-preview')).toHaveTextContent(
      'Próximos fechamentos: 05/10 e 20/10. Você paga até 07/10 e 22/10. Lembrete em 03/10, 07/10, 18/10 e 22/10.',
    );
    expect(screen.getByTestId('commission-schedule-change')).toHaveTextContent(
      'A mudança vale a partir do próximo fechamento (20/10). O período atual continua até 05/10.',
    );
  });

  it('semanal usa chips de dia da semana', async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByRole('tab', { name: 'Semanal' }));
    await user.click(screen.getByRole('button', { name: 'Sex' }));
    expect(screen.getByTestId('commission-schedule-preview')).toHaveTextContent('Próximos fechamentos: 09/10 e 16/10.');
  });
});
