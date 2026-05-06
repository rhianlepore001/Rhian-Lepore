import React from 'react';
import { BrutalCard } from '../components/BrutalCard';
import { Construction } from 'lucide-react';
import { useBrutalTheme } from '../hooks/useBrutalTheme';

interface PlaceholderProps {
    title: string;
}

export const Placeholder: React.FC<PlaceholderProps> = ({ title }) => {
    const { accent } = useBrutalTheme();

    return (
        <div className="h-[calc(100vh-10rem)] flex items-center justify-center">
            <BrutalCard className="max-w-md w-full text-center p-10">
                <Construction className={`w-16 h-16 mx-auto mb-6 ${accent.text}`} />
                <h2 className="text-2xl font-heading text-white uppercase mb-4">{title}</h2>
                <p className="text-text-secondary font-mono">
                    Esta funcionalidade está em desenvolvimento e estará disponível em breve.
                </p>
            </BrutalCard>
        </div>
    );
};
