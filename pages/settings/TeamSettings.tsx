import React, { useState } from 'react';
import { Card, Button } from '../../components/ui';
import { SettingsLayout } from '../../components/SettingsLayout';
import { Plus, Users, ShieldCheck, UserCheck } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { useTeamMembers, useDeleteTeamMember } from '../../hooks/useTeam';
import { useQueryClient } from '@tanstack/react-query';
import { TeamMemberCard } from '../../components/TeamMemberCard';
import { TeamMemberForm } from '../../components/TeamMemberForm';

export const TeamSettings: React.FC = () => {
    const { companyId } = useAuth();
    const { accent, colors, isBeauty } = useBrutalTheme();
    const queryClient = useQueryClient();
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const { data: members = [], isLoading: loading } = useTeamMembers();
    const deleteMemberMutation = useDeleteTeamMember();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);

    const cardMembers = members.map(m => ({ ...m, photo_url: m.photo_url ?? null }));

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este profissional?')) return;
        try {
            await deleteMemberMutation.mutateAsync(id);
        } catch (error) {
            console.error('Error deleting member:', error);
            alert('Erro ao excluir.');
        }
    };

    const owners = cardMembers.filter(m => m.is_owner);
    const staff = cardMembers.filter(m => !m.is_owner);

    return (
        <SettingsLayout>
            <div className="w-full space-y-8 pb-20">
                <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-2">
                    <p className={`text-sm ${colors.textMuted} max-w-xl`}>
                        Cadastre o profissional com nome e comissão. Depois, envie o link de convite para ele criar a conta.
                    </p>
                    <Button
                        id="btn-add-team-member"
                        onClick={() => {
                            setEditingMember(null);
                            setIsModalOpen(true);
                        }}
                    >
                        <Plus className="w-5 h-5 mr-1" />
                        Profissional
                    </Button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className={`animate-spin h-10 w-10 border-4 border-t-transparent ${accent.border} rounded-full`}></div>
                    </div>
                ) : cardMembers.length === 0 ? (
                    <Card className="p-12 text-center border-dashed">
                        <div className={`w-20 h-20 ${colors.inputBg} rounded-2xl flex items-center justify-center mx-auto mb-6 border ${colors.border}`}>
                            <UserCheck className="w-10 h-10 text-[var(--color-text-muted)]" />
                        </div>
                        <h3 className={`text-2xl font-heading ${colors.text} uppercase mb-3`}>
                            Comece sua equipe
                        </h3>
                        <p className={`${colors.textMuted} mb-8 max-w-sm mx-auto font-medium`}>
                            Você ainda não cadastrou nenhum profissional. Adicione a si mesmo ou seus colaboradores.
                        </p>
                        <button
                            type="button"
                            onClick={() => setIsModalOpen(true)}
                            className={`px-8 py-4 ${colors.inputBg} hover:bg-white/[0.08] ${colors.text} font-heading uppercase text-sm tracking-widest rounded-2xl transition-all border ${colors.border}`}
                        >
                            Cadastrar Primeiro Perfil
                        </button>
                    </Card>
                ) : (
                    <div className="space-y-12">
                        {owners.length > 0 && (
                            <section className="space-y-4">
                                <div className={`flex items-center gap-2 ${colors.textMuted} font-mono text-xs uppercase tracking-[0.2em] px-1`}>
                                    <ShieldCheck className={`w-4 h-4 ${accent.text}`} />
                                    Proprietários
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {owners.map(member => (
                                        <TeamMemberCard
                                            key={member.id}
                                            member={member}
                                            accentColor={accentColor}
                                            onEdit={(m) => {
                                                setEditingMember(m);
                                                setIsModalOpen(true);
                                            }}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}

                        {staff.length > 0 && (
                            <section className="space-y-4">
                                <div className={`flex items-center gap-2 ${colors.textMuted} font-mono text-xs uppercase tracking-[0.2em] px-1 border-t ${colors.divider} pt-8`}>
                                    <Users className="w-4 h-4" />
                                    Equipe e Colaboradores
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {staff.map(member => (
                                        <TeamMemberCard
                                            key={member.id}
                                            member={member}
                                            accentColor={accentColor}
                                            onEdit={(m) => {
                                                setEditingMember(m);
                                                setIsModalOpen(true);
                                            }}
                                            onDelete={handleDelete}
                                        />
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                )}

                {isModalOpen && (
                    <TeamMemberForm
                        initialData={editingMember}
                        accentColor={accentColor}
                        onClose={() => setIsModalOpen(false)}
                        onSave={() => {
                            queryClient.invalidateQueries({ queryKey: ['team', companyId, 'members'] });
                        }}
                    />
                )}
            </div>
        </SettingsLayout>
    );
};
