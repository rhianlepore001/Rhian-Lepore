import React, { useState, useEffect } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { Plus, Users } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TeamMemberCard } from '../../components/TeamMemberCard';
import { TeamMemberForm } from '../../components/TeamMemberForm';

export const TeamSettings: React.FC = () => {
    const { user, userType } = useAuth();
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);

    const isBeauty = userType === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';

    useEffect(() => {
        fetchMembers();
    }, [user]);

    const fetchMembers = async () => {
        if (!user) return;
        try {
            const { data } = await supabase
                .from('team_members')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            setMembers(data || []);
        } catch (error) {
            console.error('Error fetching members:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este profissional?')) return;

        try {
            await supabase.from('team_members').delete().eq('id', id);
            fetchMembers();
        } catch (error) {
            console.error('Error deleting member:', error);
            alert('Erro ao excluir.');
        }
    };

    return (
        <SettingsLayout>
            <div className="max-w-4xl">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl md:text-3xl font-heading text-white uppercase mb-2">
                            Gestão de Equipe
                        </h1>
                        <p className="text-neutral-400">
                            Gerencie os profissionais que atendem no seu negócio
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingMember(null);
                            setIsModalOpen(true);
                        }}
                        className={`flex items-center gap-2 px-4 py-2 bg-${accentColor} text-black font-bold rounded-lg hover:bg-${accentColor}/90 transition-colors`}
                    >
                        <Plus className="w-5 h-5" />
                        <span className="hidden md:inline">Novo Profissional</span>
                    </button>
                </div>

                {loading ? (
                    <div className="text-white">Carregando...</div>
                ) : members.length === 0 ? (
                    <div className="bg-neutral-900 border border-neutral-800 rounded-lg p-12 text-center">
                        <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-neutral-500" />
                        </div>
                        <h3 className="text-white font-bold text-lg mb-2">
                            Sua equipe está vazia
                        </h3>
                        <p className="text-neutral-400 mb-6 max-w-md mx-auto">
                            Adicione profissionais para que seus clientes possam escolher com quem querem agendar.
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className={`px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-bold rounded-lg transition-colors border border-neutral-700`}
                        >
                            Adicionar Primeiro Profissional
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {members.map(member => (
                            <TeamMemberCard
                                key={member.id}
                                member={member}
                                onEdit={(m) => {
                                    setEditingMember(m);
                                    setIsModalOpen(true);
                                }}
                                onDelete={handleDelete}
                                accentColor={accentColor}
                            />
                        ))}
                    </div>
                )}

                {isModalOpen && (
                    <TeamMemberForm
                        member={editingMember}
                        onClose={() => setIsModalOpen(false)}
                        onSave={fetchMembers}
                        accentColor={accentColor}
                    />
                )}
            </div>
        </SettingsLayout>
    );
};
