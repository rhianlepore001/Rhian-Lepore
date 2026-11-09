import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PublicBusinessHeader } from '../../components/PublicBusinessHeader';

vi.mock('../../contexts/ThemeContext', () => ({ useTheme: () => ({ mode: 'dark', toggleMode: vi.fn() }) }));
vi.mock('../../contexts/AuthContext', () => ({ useAuth: () => ({ userType: 'barber' }) }));

describe('PublicBusinessHeader — nota pública', () => {
  it('sem avaliações não mostra a nota 4.9 nem "0 avaliações"', () => {
    render(<PublicBusinessHeader businessName="Barbearia Fictícia" googleRating={4.9} totalReviews={0} />);
    expect(screen.queryByText('4.9')).not.toBeInTheDocument();
    expect(screen.queryByText(/avaliaç/i)).not.toBeInTheDocument();
  });
  it('com avaliações reais mostra nota e contagem', () => {
    render(<PublicBusinessHeader businessName="Barbearia Fictícia" googleRating={4.8} totalReviews={23} />);
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('23 avaliações')).toBeInTheDocument();
  });
});
