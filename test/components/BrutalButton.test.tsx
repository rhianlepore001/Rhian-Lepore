import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BrutalButton } from '../../components/BrutalButton';

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: () => ({ userType: 'barber' }),
}));

describe('BrutalButton Component', () => {
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

    it('mostra spinner SVG quando loading=true', () => {
        const { container } = render(<BrutalButton loading>Carregando</BrutalButton>);
        expect(container.querySelector('svg.animate-spin')).toBeInTheDocument();
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
        expect(button.className).toContain('red');
    });

    it('size sm aplica classes menores', () => {
        const { container } = render(<BrutalButton size="sm">Pequeno</BrutalButton>);
        const button = container.firstChild as HTMLElement;
        expect(button.className).toContain('h-9');
    });

    it('size lg aplica classes maiores', () => {
        const { container } = render(<BrutalButton size="lg">Grande</BrutalButton>);
        const button = container.firstChild as HTMLElement;
        expect(button.className).toContain('h-15');
    });
});
