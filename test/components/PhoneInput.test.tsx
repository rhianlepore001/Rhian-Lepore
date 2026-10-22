import React, { useState } from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { PhoneInput } from '@/components/PhoneInput';

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ userType: 'barber' }),
}));

function ControlledPhone({ initialRegion = 'PT' }: { initialRegion?: 'BR' | 'PT' }) {
  const [region, setRegion] = useState<'BR' | 'PT'>(initialRegion);
  const [phone, setPhone] = useState('');
  return (
    <>
      <PhoneInput id="phone" value={phone} onChange={setPhone} region={region} onRegionChange={setRegion} />
      <output data-testid="phone-value">{phone}</output>
      <output data-testid="phone-region">{region}</output>
    </>
  );
}

describe('PhoneInput', () => {
  it('emits E.164 and formats nine Portuguese digits', async () => {
    render(<ControlledPhone />);
    const input = screen.getByLabelText('Selecionar país').parentElement?.querySelector('input');
    expect(input).toHaveAttribute('id', 'phone');
    await userEvent.type(input!, '912345678');
    expect(screen.getByTestId('phone-value')).toHaveTextContent('+351912345678');
    expect(input).toHaveValue('912 345 678');
  });

  it('re-codes when the new country accepts the national digits and clears when it does not', async () => {
    const user = userEvent.setup();
    render(<ControlledPhone initialRegion="BR" />);
    const input = screen.getByLabelText('Selecionar país').parentElement?.querySelector('input');
    await user.type(input!, '11987654321');
    await user.click(screen.getByLabelText('Selecionar país'));
    await user.click(screen.getByRole('button', { name: 'Selecionar PT' }));
    expect(screen.getByTestId('phone-region')).toHaveTextContent('PT');
    expect(screen.getByTestId('phone-value')).toHaveTextContent('');

    await user.type(input!, '912345678');
    await user.click(screen.getByLabelText('Selecionar país'));
    await user.click(screen.getByRole('button', { name: 'Selecionar BR' }));
    expect(screen.getByTestId('phone-region')).toHaveTextContent('BR');
    expect(screen.getByTestId('phone-value')).toHaveTextContent('+55912345678');
  });

  it('keeps the existing Brazilian mask', () => {
    const handleChange = vi.fn();
    render(<PhoneInput value="+5511987654321" onChange={handleChange} region="BR" />);
    expect(screen.getByRole('textbox')).toHaveValue('(11) 98765-4321');
  });

  it('emits the same E.164 value for a Brazilian mobile number', async () => {
    render(<ControlledPhone initialRegion="BR" />);
    const input = screen.getByLabelText('Selecionar país').parentElement?.querySelector('input');
    await userEvent.type(input!, '11987654321');
    expect(screen.getByTestId('phone-value')).toHaveTextContent('+5511987654321');
    expect(input).toHaveValue('(11) 98765-4321');
  });
});
