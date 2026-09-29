import { describe, it, expect } from 'vitest';
import { resolveStaffLink, accessRemovedMessage } from '@/utils/staffAccess';

describe('resolveStaffLink (S-06: colaborador sem vínculo vivo)', () => {
    it('vínculo vivo encontrado → linked com o id do cadastro', () => {
        expect(resolveStaffLink({ memberId: 'tm-1', memberError: null })).toEqual({ status: 'linked', memberId: 'tm-1' });
    });

    it('religado pelo relink_staff_if_unbound → linked', () => {
        expect(resolveStaffLink({ memberId: null, memberError: null, relinkedId: 'tm-2', relinkError: null }))
            .toEqual({ status: 'linked', memberId: 'tm-2' });
    });

    it('sem vínculo e relink sem resultado → removed', () => {
        expect(resolveStaffLink({ memberId: null, memberError: null, relinkedId: null, relinkError: null }))
            .toEqual({ status: 'removed', memberId: null });
    });

    it('erro de rede na busca do vínculo → unknown (não tranca quem pode ter acesso)', () => {
        expect(resolveStaffLink({ memberId: null, memberError: { message: 'Failed to fetch' } }))
            .toEqual({ status: 'unknown', memberId: null });
    });

    it('cadastro pelo convite em andamento e ainda sem vínculo → unknown (não desloga no meio do cadastro)', () => {
        expect(resolveStaffLink({ memberId: null, memberError: null, relinkedId: null, relinkError: null, inviteSignupInProgress: true }))
            .toEqual({ status: 'unknown', memberId: null });
    });

    it('cadastro em andamento não esconde um vínculo que já existe', () => {
        expect(resolveStaffLink({ memberId: 'tm-1', memberError: null, inviteSignupInProgress: true }))
            .toEqual({ status: 'linked', memberId: 'tm-1' });
    });

    it('erro no relink → unknown', () => {
        expect(resolveStaffLink({ memberId: null, memberError: null, relinkedId: null, relinkError: { message: 'timeout' } }))
            .toEqual({ status: 'unknown', memberId: null });
    });
});

describe('accessRemovedMessage', () => {
    it('usa o nome da empresa (texto exato de E2.3)', () => {
        expect(accessRemovedMessage('Moderna Barbearia')).toBe('Seu acesso a Moderna Barbearia foi removido. Fale com o dono.');
    });

    it('sem nome cadastrado: texto neutro, sem "undefined"', () => {
        expect(accessRemovedMessage(null)).toBe('Seu acesso foi removido. Fale com o dono.');
        expect(accessRemovedMessage('   ')).toBe('Seu acesso foi removido. Fale com o dono.');
    });
});
