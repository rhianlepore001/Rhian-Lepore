import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Users } from 'lucide-react';
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
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchMembers();
    }, [user]);

    const fetchMembers = async () => {
        if (!user) return;
        const { data } = await supabase.from('team_members').select('*').eq('user_id', user.id);
        setMembers(data || []);
        setLoading(false);
    };

    const handleContinue = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            await supabase.rpc('update_onboarding_step', {
                p_user_id: user.id,
                p_step: 4
            });
            onNext();
        } catch (error) {
            console.error('Error updating step:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="bg-neutral-800/50 rounded-lg p-4 border border-neutral-800">
                <p className="text-neutral-400 text-sm mb-4">
                    Adicione os profissionais que trabalham com você. Se for só você, adicione seu próprio perfil!
                </p>

                {loading ? (
                    <div className="text-center py-4 text-neutral-500">Carregando...</div>
                ) : members.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed border-neutral-700 rounded-lg">
                        <Users className="w-8 h-8 text-neutral-600 mx-auto mb-2" />
                        <p className="text-neutral-500 mb-4">Nenhum profissional adicionado</p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className={`px-4 py-2 bg-${accentColor} text-black font-bold rounded-lg hover:bg-${accentColor}/90`}
                        >
                            Adicionar Profissional
                        </button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {members.map(member => (
                            <TeamMemberCard
                                key={member.id}
                                member={member}
                                onEdit={() => { }} // Edit disabled in onboarding for simplicity
                                onDelete={async (id) => {
                                    await supabase.from('team_members').delete().eq('id', id);
                                    fetchMembers();
                                }}
                                accentColor={accentColor}
                            />
                        ))}
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className={`w-full py-3 border border-${accentColor} text-${accentColor} font-bold rounded-lg hover:bg-${accentColor}/10 transition-colors flex items-center justify-center gap-2`}
                        >
                            <Plus className="w-4 h-4" />
                            Adicionar Outro
                        </button>
                    </div>
                )}
            </div>

            <div className="flex gap-4 pt-4">
                <button
                    onClick={onBack}
                    className="flex-1 py-4 bg-neutral-800 text-white font-bold rounded-lg hover:bg-neutral-700 transition-colors"
                >
                    Voltar
                </button>
                <button
                    onClick={handleContinue}
                    disabled={submitting || members.length === 0}
                    className={`flex-1 py-4 bg-${accentColor} text-black font-bold rounded-lg hover:bg-${accentColor}/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Continuar'}
                </button>
            </div>

            {isModalOpen && (
                <TeamMemberForm
                    onClose={() => setIsModalOpen(false)}
                    onSave={fetchMembers}
                    accentColor={accentColor}
                />
            )}
        </div>
    );
};
