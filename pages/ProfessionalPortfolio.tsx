import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { BrutalCard } from '../components/BrutalCard';
import { BrutalButton } from '../components/BrutalButton';
import { Star, Calendar, Clock, MapPin, Instagram, Scissors, Sparkles, User, ArrowRight } from 'lucide-react';

export const ProfessionalPortfolio: React.FC = () => {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const [professional, setProfessional] = useState<any>(null);
    const [business, setBusiness] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchProfessional = async () => {
            if (!slug) return;

            try {
                // Fetch professional with their business info
                const { data, error } = await supabase
                    .from('team_members')
                    .select('*, profiles:user_id(*)')
                    .eq('slug', slug)
                    .eq('active', true)
                    .single();

                if (error) throw error;

                if (data) {
                    setProfessional(data);
                    setBusiness(data.profiles);
                }
            } catch (error) {
                console.error('Error fetching professional:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchProfessional();
    }, [slug]);

    if (loading) {
        return (
            <div className="min-h-screen bg-neutral-950 flex items-center justify-center">
                <Loader2 className="w-8 h-8 text-white animate-spin" />
            </div>
        );
    }

    if (!professional || !business) {
        return (
            <div className="min-h-screen bg-neutral-950 flex flex-col items-center justify-center text-white">
                <h1 className="text-2xl font-bold mb-4">Profissional não encontrado</h1>
                <BrutalButton onClick={() => navigate('/')}>Voltar</BrutalButton>
            </div>
        );
    }

    const isBeauty = business.user_type === 'beauty';
    const accentColor = isBeauty ? 'beauty-neon' : 'accent-gold';
    const bgClass = isBeauty ? 'bg-beauty-dark' : 'bg-brutal-main';

    return (
        <div className={`min-h-screen ${bgClass} text-white`}>
            {/* Hero Section */}
            <div className="relative h-[60vh] min-h-[500px]">
                {/* Background Image / Gradient */}
                <div className="absolute inset-0 bg-neutral-900">
                    {professional.photo_url ? (
                        <>
                            <img
                                src={professional.photo_url}
                                alt={professional.name}
                                className="w-full h-full object-cover opacity-50 block md:hidden"
                            />
                            <div className="hidden md:block w-full h-full bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-transparent">
                                <img
                                    src={professional.photo_url}
                                    alt={professional.name}
                                    className="absolute right-0 top-0 h-full w-1/2 object-cover opacity-60 mix-blend-overlay"
                                />
                            </div>
                        </>
                    ) : (
                        <div className={`w-full h-full bg-gradient-to-br ${isBeauty ? 'from-purple-900/40' : 'from-yellow-900/20'} to-black`}></div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-950 via-neutral-950/60 to-transparent"></div>
                </div>

                {/* Content */}
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="max-w-4xl w-full px-4 pt-20">
                        <div className="flex flex-col md:flex-row items-center md:items-end gap-8">
                            {/* Profile Photo (Avatar style for mobile, or large for desktop) */}
                            <div className={`relative w-40 h-40 md:w-56 md:h-56 rounded-full border-4 border-${accentColor} shadow-[0_0_30px_rgba(0,0,0,0.5)] overflow-hidden shrink-0`}>
                                {professional.photo_url ? (
                                    <img src={professional.photo_url} alt={professional.name} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full bg-neutral-800 flex items-center justify-center">
                                        <User className="w-20 h-20 text-neutral-500" />
                                    </div>
                                )}
                            </div>

                            <div className="text-center md:text-left flex-1 space-y-4">
                                <div>
                                    <h2 className={`text-lg uppercase tracking-widest font-bold text-${accentColor} mb-2`}>
                                        {professional.role}
                                    </h2>
                                    <h1 className="text-4xl md:text-6xl font-heading uppercase leading-tight">
                                        {professional.name}
                                    </h1>
                                </div>

                                <div className="flex flex-wrap justify-center md:justify-start gap-4 text-sm text-neutral-300">
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                        <MapPin className="w-4 h-4" />
                                        <span>{business.business_name}</span>
                                    </div>
                                    <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                        <Star className={`w-4 h-4 fill-${accentColor} text-${accentColor}`} />
                                        <span>5.0 (Avaliações)</span>
                                    </div>
                                </div>

                                {professional.bio && (
                                    <p className="text-neutral-400 max-w-xl text-lg leading-relaxed">
                                        {professional.bio}
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* CTA Section */}
            <div className="max-w-4xl mx-auto px-4 -mt-10 relative z-20 pb-20">
                <BrutalCard className={`border-t-4 border-${accentColor} p-8 flex flex-col md:flex-row items-center justify-between gap-6`}>
                    <div>
                        <h3 className="text-2xl font-bold uppercase mb-2">Pronto para transformar seu visual?</h3>
                        <p className="text-neutral-400">Agende agora com {professional.name.split(' ')[0]} e garanta seu horário.</p>
                    </div>
                    <BrutalButton
                        onClick={() => navigate(`/book/${business.business_slug}?pro=${professional.id}`)}
                        className={`w-full md:w-auto px-8 py-4 text-lg bg-${accentColor} hover:bg-${accentColor}Hover text-black font-bold whitespace-nowrap`}
                    >
                        <span className="flex items-center gap-2">
                            <Calendar className="w-5 h-5" /> Agendar Horário
                        </span>
                    </BrutalButton>
                </BrutalCard>

                {/* Portfolio / Services Preview could go here */}
                {/* For MVP, we stick to the main CTA */}
            </div>

            {/* Business Footer */}
            <div className="border-t border-neutral-800 bg-black py-12 text-center">
                <p className="text-neutral-500 uppercase tracking-widest text-sm mb-4">Membro da Equipe</p>
                <h3 className="text-2xl font-heading text-white">{business.business_name}</h3>
            </div>
        </div>
    );
};

// Helper for Loader
const Loader2 = ({ className }: { className?: string }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a9 9 0 1 1-6.219-8.56" /></svg>
);
