import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrutalButton } from '../../components/BrutalButton';

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ userType: 'barber' }),
}));

beforeEach(() => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
});

describe('BrutalButton (wrapper @deprecated)', () => {
    it('renderiza com texto', () => {
        render(<BrutalButton>Clique aqui</BrutalButton>);
        expect(screen.getByRole('button', { name: 'Clique aqui' })).toBeInTheDocument();
    });

    it('chama onClick ao ser clicado', async () => {
        const onClick = vi.fn();
        render(<BrutalButton onClick={onClick}>Clique</BrutalButton>);
        await userEvent.click(screen.getByRole('button'));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('fica desabilitado quando disabled=true', () => {
        render(<BrutalButton disabled>Desabilitado</BrutalButton>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('nao dispara onClick quando desabilitado', async () => {
        const onClick = vi.fn();
        render(
            <BrutalButton disabled onClick={onClick}>
                Desabilitado
            </BrutalButton>
        );
        await userEvent.click(screen.getByRole('button'));
        expect(onClick).not.toHaveBeenCalled();
    });

    it('mostra spinner SVG quando loading=true e marca aria-busy', () => {
        const { container } = render(<BrutalButton loading>Carregando</BrutalButton>);
        expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
        expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    });

    it('fica desabilitado quando loading=true', () => {
        render(<BrutalButton loading>Carregando</BrutalButton>);
        expect(screen.getByRole('button')).toBeDisabled();
    });

    it('suporta aria-label para acessibilidade', () => {
        render(<BrutalButton aria-label="Configuracoes">X</BrutalButton>);
        expect(screen.getByRole('button', { name: 'Configuracoes' })).toBeInTheDocument();
    });

    it('aplica w-full quando fullWidth=true', () => {
        const { container } = render(<BrutalButton fullWidth>Botao Largo</BrutalButton>);
        const button = container.firstChild as HTMLElement;
        expect(button.className).toContain('w-full');
    });

    it('renderiza icone quando fornecido', () => {
        render(
            <BrutalButton icon={<span data-testid="icone">*</span>}>
                Com Icone
            </BrutalButton>
        );
        expect(screen.getByTestId('icone')).toBeInTheDocument();
        expect(screen.getByText('Com Icone')).toBeInTheDocument();
    });

    it('aplica classe de danger variant', () => {
        const { container } = render(<BrutalButton variant="danger">Perigo</BrutalButton>);
        const button = container.firstChild as HTMLElement;
        expect(button.className).toContain('danger');
    });

    it('size sm atende touch min 44px no mobile (WCAG 2.5.8)', () => {
        const { container } = render(<BrutalButton size="sm">Pequeno</BrutalButton>);
        const button = container.firstChild as HTMLElement;
        expect(button.className).toContain('min-h-[44px]');
    });

    it('size lg aplica classes maiores', () => {
        const { container } = render(<BrutalButton size="lg">Grande</BrutalButton>);
        const button = container.firstChild as HTMLElement;
        expect(button.className).toContain('h-[52px]');
    });

    it('emite aviso de deprecação no dev', () => {
        const warn = vi.spyOn(console, 'warn');
        render(<BrutalButton>X</BrutalButton>);
        expect(warn).toHaveBeenCalled();
        expect(warn.mock.calls.some((args) => String(args[0]).includes('deprecated'))).toBe(true);
    });
});
