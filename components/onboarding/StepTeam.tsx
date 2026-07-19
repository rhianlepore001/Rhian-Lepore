import React, { useState, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TeamMemberCard } from '../TeamMemberCard';
import { TeamMemberForm } from '../TeamMemberForm';

interface StepTeamProps {
    onNext: () => void;
    onBack: () => void;
    accentColor: string;
}

export const StepTeam: React.FC<StepTeamProps> = ({ onNext, onBack, accentColor }) => {
    const { user } = useAuth();
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isOwnerMode, setIsOwnerMode] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);

    useEffect(() => {
        fetchMembers();
    }, [user]);

    const fetchMembers = async () => {
        if (!user) return;
        const { data } = await supabase.from('team_members').select('*').eq('user_id', user.id);
        setMembers(data || []);
        setLoading(false);
    };

    const handleContinue = () => {
        onNext();
    };

    return (
        <div className="space-y-6">
            <div className="bg-[var(--color-card)]/50 rounded-lg p-4 border border-[var(--color-border)]">
                <p className="text-[var(--color-text-muted)] text-sm mb-4">
                    Adicione os profissionais que trabalham com você. Se você também atende clientes, adicione seu perfil de profissional aqui.
                </p>

                {loading ? (
                    <div className="text-center py-4 text-[var(--color-text-muted)]">Carregando...</div>
                ) : members.length === 0 ? (
                    <div className="text-center py-10 px-6 border-2 border-dashed border-[var(--color-border)] rounded-xl bg-black/20">
                        <Users className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-4" />
                        <h4 className="text-[var(--color-text)] font-bold mb-2">Quem fará os atendimentos?</h4>
                        <p className="text-[var(--color-text-muted)] text-sm mb-6 max-w-xs mx-auto">
                            O sistema precisa de pelo menos um profissional para gerar sua agenda e link de agendamento.
                        </p>

                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setIsOwnerMode(true);
                                    setIsModalOpen(true);
                                }}
                                id="wizard-add-team"
                                className={`w-full py-3 px-4 font-bold rounded-lg transition-all flex items-center justify-center gap-2
                                    ${accentColor === 'beauty-neon'
                                        ? 'bg-beauty-neon text-black hover:bg-beauty-neon/90 shadow-[0_0_15px_rgba(167,139,250,0.3)]'
                                        : 'bg-accent-gold text-black hover:bg-accent-gold/90 shadow-[0_4px_0_0_#8a6d2a]'}
                                `}
                            >
                                Sou eu quem atende (Dono + Profissional)
                            </button>

                            <button
                                onClick={() => {
                                    setIsOwnerMode(false);
                                    setIsModalOpen(true);
                                }}
                                className="w-full py-3 px-4 bg-transparent border border-[var(--color-border)] text-[var(--color-text-muted)] font-bold rounded-lg hover:bg-[var(--color-card)] hover:text-[var(--color-text)] transition-colors"
                            >
                                Tenho uma equipe
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {members.map(member => (
                            <TeamMemberCard
                                key={member.id}
                                member={member}
                                onEdit={(member) => {
                                    setEditingMember(member);
                                    setIsModalOpen(true);
                                }}
                                onDelete={async (id) => {
                                    await supabase.from('team_members').delete().eq('id', id);
                                    fetchMembers();
                                }}
                                accentColor={accentColor}
                            />
                        ))}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            id="wizard-add-team"
                            className={accentColor === 'beauty-neon' ? 'w-full py-3 border border-beauty-neon text-beauty-neon font-bold rounded-lg hover:bg-beauty-neon/10 transition-colors flex items-center justify-center gap-2' : 'w-full py-3 border border-accent-gold text-accent-gold font-bold rounded-lg hover:bg-accent-gold/10 transition-colors flex items-center justify-center gap-2'}
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar Outro
                        </button>
                    </div>
                )}
            </div>

            <div className="flex gap-3 pt-4">
                <button
                    onClick={onBack}
                    className="px-5 py-4 text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] font-bold transition-colors text-sm"
                >
                    Voltar
                </button>
                <button
                    onClick={handleContinue}
                    disabled={members.length === 0}
                    className={`flex-1 py-4 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed ${accentColor === 'beauty-neon' ? 'bg-beauty-neon text-black hover:bg-beauty-neon/90' : 'bg-accent-gold text-black hover:bg-accent-gold/90'}`}
                >
                    Continuar
                </button>
            </div>

            {isModalOpen && (
                <TeamMemberForm
                    onClose={() => {
                        setIsModalOpen(false);
                        setIsOwnerMode(false);
                        setEditingMember(null);
                    }}
                    onSave={fetchMembers}
                    accentColor={accentColor}
                    isOwnerForm={isOwnerMode || (editingMember?.is_owner ?? false)}
                    initialData={editingMember}
                />
            )}
        </div>
    );
};
