import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CancellationPolicyText } from '@/components/CancellationPolicyText';

describe('CancellationPolicyText', () => {
  it('mostra a política e "Observações:" só quando há observações', () => {
    const { rerender } = render(<CancellationPolicyText data-testid="p" parts={{ policy: 'Política da casa.', notes: '' }} />);
    expect(screen.getByTestId('p-text')).toHaveTextContent('Política da casa.');
    expect(screen.queryByTestId('p-notes')).not.toBeInTheDocument();
    rerender(<CancellationPolicyText data-testid="p" parts={{ policy: 'Política da casa.', notes: 'Chegue cedo.' }} />);
    expect(screen.getByTestId('p-notes')).toHaveTextContent('Observações: Chegue cedo.');
  });

  it('renderiza texto puro (sem HTML)', () => {
    render(<CancellationPolicyText data-testid="p" parts={{ policy: '<img src=x onerror=alert(1)>', notes: '<script>x</script>' }} />);
    const root = screen.getByTestId('p');
    expect(root.querySelector('img')).toBeNull();
    expect(root.querySelector('script')).toBeNull();
    expect(root).toHaveTextContent('<img src=x onerror=alert(1)>');
  });
});
