import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from '@/components/ErrorBoundary';

vi.mock('@/lib/autoBugCapture', () => ({
  captureRenderError: vi.fn(),
}));

function Boom(): React.ReactElement {
  throw new Error('chunk boom');
}

describe('ErrorBoundary', () => {
  it('renderiza o fallback sem AuthProvider', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(
      <ErrorBoundary>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText('Sistema Interrompido')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /recarregar página/i })).toBeInTheDocument();
    spy.mockRestore();
  });
});
