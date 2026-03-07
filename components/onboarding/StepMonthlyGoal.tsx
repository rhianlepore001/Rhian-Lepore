import React, { useState, useEffect } from 'react';
import { Loader2, Target, SkipForward } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface StepMonthlyGoalProps {
    onNext: () => void;
    onBack: () => void;
    onSkip: () => void;
    accentColor: string;
}

export const StepMonthlyGoal: React.FC<StepMonthlyGoalProps> = ({ onNext, onBack, onSkip, accentColor }) => {
    const { user, region } = useAuth();
    const [goal, setGoal] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const currencySymbol = region === 'PT' ? '€' : 'R$';
    const isBeauty = accentColor === 'beauty-neon';

    const suggestedGoals = region === 'PT'
        ? [2000, 5000, 10000]
        : [5000, 10000, 20000];

    const handleSubmit = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            const goalValue = parseFloat(goal);
            if (!isNaN(goalValue) && goalValue > 0) {
                await supabase
                    .from('monthly_goals')
                    .upsert({
                        user_id: user.id,
                        month: new Date().toISOString().slice(0, 7),
                        goal_value: goalValue
                    }, { onConflict: 'user_id,month' });
            }

            await supabase.rpc('update_onboarding_step', {
                p_user_id: user.id,
                p_step: 5,
                p_completed: true
            });
            onNext();
        } catch (error) {
            console.error('Error saving goal:', error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleSkip = async () => {
        if (!user) return;
        setSubmitting(true);
        try {
            await supabase.rpc('update_onboarding_step', {
                p_user_id: user.id,
                p_step: 5,
                p_completed: true
            });
            onSkip();
        } catch (error) {
            console.error('Error skipping step:', error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="text-center mb-2">
                <div className={`w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center ${isBeauty ? 'bg-beauty-neon/20' : 'bg-accent-gold/20'}`}>
                    <Target className={`w-8 h-8 ${isBeauty ? 'text-beauty-neon' : 'text-accent-gold'}`} />
                </div>
                <p className="text-neutral-400 text-sm">
                    Definir uma meta ajuda o sistema a te mostrar seu progresso e sugerir ações para alcançar seus objetivos.
                </p>
            </div>

            <div>
                <label className="text-white font-mono text-sm mb-2 block">
                    Quanto você quer faturar este mês?
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 font-mono text-lg">
                        {currencySymbol}
                    </span>
                    <input
                        type="number"
                        value={goal}
                        onChange={e => setGoal(e.target.value)}
                        placeholder="0,00"
                        className={`w-full p-4 pl-14 bg-neutral-800 border border-neutral-700 text-white focus:outline-none text-2xl font-bold font-mono transition-all
                            ${isBeauty ? 'rounded-xl focus:border-beauty-neon focus:shadow-[0_0_10px_rgba(167,139,250,0.2)]' : 'rounded-lg focus:border-accent-gold'}`}
                        autoFocus
                    />
                </div>
            </div>

            <div>
                <p className="text-neutral-500 text-xs mb-2 font-mono">Sugestões rápidas:</p>
                <div className="flex gap-2">
                    {suggestedGoals.map(val => (
                        <button
                            key={val}
                            onClick={() => setGoal(val.toString())}
                            className={`flex-1 py-2 rounded-lg border text-sm font-mono transition-all
                                ${goal === val.toString()
                                    ? isBeauty
                                        ? 'border-beauty-neon bg-beauty-neon/10 text-beauty-neon'
                                        : 'border-accent-gold bg-accent-gold/10 text-accent-gold'
                                    : 'border-neutral-700 text-neutral-400 hover:border-neutral-500'
                                }`}
                        >
                            {currencySymbol} {val.toLocaleString()}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <button
                    onClick={onBack}
                    className="flex-1 py-4 bg-neutral-800 text-white font-bold rounded-lg hover:bg-neutral-700 transition-colors"
                >
                    Voltar
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={submitting || !goal}
                    className={`flex-1 py-4 font-bold rounded-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed
                        ${isBeauty ? 'bg-beauty-neon text-black hover:bg-beauty-neon/90' : 'bg-accent-gold text-black hover:bg-accent-gold/90'}`}
                >
                    {submitting ? <Loader2 className="w-6 h-6 animate-spin" /> : 'Definir Meta'}
                </button>
            </div>

            <button
                onClick={handleSkip}
                disabled={submitting}
                className="w-full py-3 text-neutral-500 hover:text-neutral-300 transition-colors flex items-center justify-center gap-2 text-sm"
            >
                <SkipForward className="w-4 h-4" />
                Pular por agora
            </button>
        </div>
    );
};
