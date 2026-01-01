
import React, { useState, useEffect } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { Plus, Users, ShieldCheck, UserCheck } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { TeamMemberCard } from '../../components/TeamMemberCard';
import { TeamMemberForm } from '../../components/TeamMemberForm';
import { BrutalCard } from '../../components/BrutalCard';

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
                .order('is_owner', { ascending: false })
                .order('name', { ascending: true });

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
            const { error } = await supabase.from('team_members').delete().eq('id', id);
            if (error) throw error;
            fetchMembers();
        } catch (error) {
            console.error('Error deleting member:', error);
            alert('Erro ao excluir.');
        }
    };

    const owners = members.filter(m => m.is_owner);
    const staff = members.filter(m => !m.is_owner);

    return (
        <SettingsLayout>
            <div className="max-w-5xl space-y-8 pb-20">
                {/* Header Section */}
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className={`p-2 rounded-lg bg-${accentColor}/10 border border-${accentColor}/20`}>
                                <Users className={`w-6 h-6 text-${accentColor}`} />
                            </div>
                            <h1 className="text-3xl md:text-4xl font-heading text-white uppercase tracking-tight">
                                Gestão de Equipe
                            </h1>
                        </div>
                        <p className="text-neutral-400 max-w-lg">
                            Configure os profissionais, defina comissões e gerencie quem atende seus clientes.
                        </p>
                    </div>

                    <button
                        onClick={() => {
                            setEditingMember(null);
                            setIsModalOpen(true);
                        }}
                        className={`
                            group flex items-center justify-center gap-2 px-6 py-4 font-heading uppercase text-sm tracking-widest transition-all
                            ${isBeauty
                                ? 'bg-beauty-neon text-black hover:shadow-[0_0_20px_rgba(235,166,240,0.4)]'
                                : 'bg-accent-gold text-black hover:shadow-[0_0_20px_rgba(196,160,111,0.4)]'}
                            rounded-xl active:scale-95
                        `}
                    >
                        <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" />
                        Novo Profissional
                    </button>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className={`animate-spin h-10 w-10 border-4 border-t-transparent border-${accentColor} rounded-full`}></div>
                    </div>
                ) : members.length === 0 ? (
                    <BrutalCard className="p-12 text-center border-dashed">
                        <div className="w-20 h-20 bg-neutral-800/50 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-neutral-700">
                            <UserCheck className="w-10 h-10 text-neutral-500" />
                        </div>
                        <h3 className="text-2xl font-heading text-white uppercase mb-3">
                            Comece sua equipe
                        </h3>
                        <p className="text-neutral-400 mb-8 max-w-sm mx-auto font-medium">
                            Você ainda não cadastrou nenhum profissional. Adicione a si mesmo ou seus colaboradores.
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className={`px-8 py-4 bg-neutral-800 hover:bg-neutral-700 text-white font-heading uppercase text-sm tracking-widest rounded-xl transition-all border-2 border-neutral-700`}
                        >
                            Cadastrar Primeiro Perfil
                        </button>
                    </BrutalCard>
                ) : (
                    <div className="space-y-12">
                        {/* Owners Section */}
                        {owners.length > 0 && (
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-neutral-500 font-mono text-xs uppercase tracking-[0.2em] px-1">
                                    <ShieldCheck className={`w-4 h-4 text-${accentColor}`} />
                                    Proprietários
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {owners.map(member => (
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
                            </section>
                        )}

                        {/* Staff Section */}
                        {staff.length > 0 && (
                            <section className="space-y-4">
                                <div className="flex items-center gap-2 text-neutral-500 font-mono text-xs uppercase tracking-[0.2em] px-1 border-t border-neutral-800 pt-8">
                                    <Users className="w-4 h-4" />
                                    Equipe e Colaboradores
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {staff.map(member => (
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
                            </section>
                        )}
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
