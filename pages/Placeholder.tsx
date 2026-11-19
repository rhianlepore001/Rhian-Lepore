import React from 'react';
import { Bell } from 'lucide-react';
import { SettingsLayout } from '../components/SettingsLayout';
import { EmptyState } from '../components/ui';

interface PlaceholderProps {
    title: string;
}

export const Placeholder: React.FC<PlaceholderProps> = ({ title }) => (
    <SettingsLayout>
        <EmptyState
            icon={Bell}
            title={title}
            description="Os ajustes de notificações ainda não estão disponíveis. Use o sino no topo do app para ver seus avisos."
        />
    </SettingsLayout>
);
