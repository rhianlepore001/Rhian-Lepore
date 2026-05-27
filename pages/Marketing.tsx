import React from 'react';
import { Rocket, Bell } from 'lucide-react';
import { Card, EmptyState } from '../components/ui';

export const Marketing: React.FC = () => {
    return (
        <div className="flex items-center justify-center min-h-[60vh] px-4">
            <Card variant="accent" className="max-w-sm w-full mx-auto" noPadding>
                <EmptyState
                    icon={Rocket}
                    title="Campanhas de Marketing"
                    description="Estamos preparando ferramentas para te ajudar a chamar clientes de volta e preencher sua agenda."
                    action={
                        <div className="flex items-center justify-center gap-2 text-xs text-neutral-400 font-mono">
                            <Bell className="w-3.5 h-3.5" />
                            <span>Você será avisado quando estiver disponível</span>
                        </div>
                    }
                />
            </Card>
        </div>
    );
};
