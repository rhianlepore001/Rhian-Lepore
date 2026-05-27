import React, { useState, useEffect } from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { Plus, Users, ShieldCheck, UserCheck, Link as LinkIcon, Copy, CheckCircle2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { useBrutalTheme } from '../../hooks/useBrutalTheme';
import { TeamMemberCard } from '../../components/TeamMemberCard';
import { TeamMemberForm } from '../../components/TeamMemberForm';
import { BrutalCard } from '../../components/BrutalCard';
import { BrutalButton } from '../../components/BrutalButton';

export const TeamSettings: React.FC = () => {
    const { user } = useAuth();
    const { accent, colors, isBeauty } = useBrutalTheme();
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const [members, setMembers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<any>(null);
    const [copiedLink, setCopiedLink] = useState(false);

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
            const { error } = await supabase.from('team_members').delete().eq('id', id).eq('user_id', user.id);
            if (error) throw error;
            fetchMembers();
        } catch (error) {
            console.error('Error deleting member:', error);
            alert('Erro ao excluir.');
        }
    };

    const owners = members.filter(m => m.is_owner);
    const staff = members.filter(m => !m.is_owner);

    const handleCopyInviteLink = async () => {
        const inviteLink = `${window.location.origin}/#/register?company=${user?.id}`;

        if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            try {
                await navigator.share({
                    title: 'Convite para Equipe - AgendiX',
                    text: 'Cadastre-se na nossa equipe e gerencie sua agenda:',
                    url: inviteLink
                });
                return;
            } catch (error) {
                // fallback
            }
        }

        try {
            if (navigator.clipboard && window.isSecureContext) {
                await navigator.clipboard.writeText(inviteLink);
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
            } else {
                throw new Error('Clipboard API unavailable');
            }
        } catch (err) {
            try {
                const textArea = document.createElement("textarea");
                textArea.value = inviteLink;
                textArea.style.position = "fixed";
                textArea.style.left = "-9999px";
                textArea.style.top = "0";
                document.body.appendChild(textArea);
                textArea.focus();
                textArea.select();
                const successful = document.execCommand('copy');
                document.body.removeChild(textArea);

                if (successful) {
                    setCopiedLink(true);
                    setTimeout(() => setCopiedLink(false), 2000);
                }
            } catch (fallbackErr) {
                console.error('Fallback copy failed', fallbackErr);
            }
        }
    };

    return (
        <SettingsLayout>
            <div className="max-w-5xl space-y-8 pb-20">
                <div className="flex justify-end mb-6">
                    <BrutalButton
                        id="btn-add-team-member"
                        onClick={() => {
                            setEditingMember(null);
                            setIsModalOpen(true);
                        }}
                    >
                        <Plus className="w-5 h-5 mr-1" />
                        Profissional
                    </BrutalButton>
                </div>

                <BrutalCard className={`${colors.border}`}>
                    <div className="flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
                        <div className="space-y-2">
                            <div className="flex items-center gap-2">
                                <Users className={`w-5 h-5 ${accent.text}`} />
                                <h3 className={`text-lg font-heading uppercase ${colors.text}`}>Convide sua Equipe</h3>
                            </div>
                            <p className={`text-sm ${colors.textMuted} max-w-xl`}>
                                Envie este link exclusivo para seus funcionários. Eles poderão criar a própria conta (e-mail e senha) e acessarão apenas a própria agenda e comissões.
                            </p>
                        </div>
                        <div className="w-full md:w-auto flex-shrink-0">
                            <button
                                type="button"
                                onClick={handleCopyInviteLink}
                                className={`
                                    w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-2xl font-mono text-sm uppercase transition-all
                                    ${copiedLink
                                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                        : `${colors.inputBg} hover:bg-white/[0.08] ${colors.text} ${colors.border} hover:${accent.border}`
                                    }
                                `}
                            >
                                {copiedLink ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4" />
                                        <span>Link Copiado!</span>
                                    </>
                                ) : (
                                    <>
                                        <LinkIcon className="w-4 h-4" />
                                        <span>Copiar Link de Convite</span>
                                        <Copy className="w-3 h-3 ml-1 opacity-50" />
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </BrutalCard>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <div className={`animate-spin h-10 w-10 border-4 border-t-transparent ${accent.border} rounded-full`}></div>
                    </div>
                ) : members.length === 0 ? (
                    <BrutalCard className="p-12 text-center border-dashed">
                        <div className={`w-20 h-20 ${colors.inputBg} rounded-2xl flex items-center justify-center mx-auto mb-6 border ${colors.border}`}>
                            <UserCheck className="w-10 h-10 text-neutral-500" />
                        </div>
                        <h3 className={`text-2xl font-heading ${colors.text} uppercase mb-3`}>
                            Comece sua equipe
                        </h3>
                        <p className={`${colors.textMuted} mb-8 max-w-sm mx-auto font-medium`}>
                            Você ainda não cadastrou nenhum profissional. Adicione a si mesmo ou seus colaboradores.
                        </p>
                        <button
                            onClick={() => setIsModalOpen(true)}
                            className={`px-8 py-4 ${colors.inputBg} hover:bg-white/[0.08] ${colors.text} font-heading uppercase text-sm tracking-widest rounded-2xl transition-all border ${colors.border}`}
                        >
                            Cadastrar Primeiro Perfil
                        </button>
                    </BrutalCard>
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
                        onSave={fetchMembers}
                    />
                )}
            </div>
        </SettingsLayout>
    );
};



