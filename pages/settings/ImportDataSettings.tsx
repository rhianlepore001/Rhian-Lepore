import React from 'react';
import { SettingsLayout } from '../../components/SettingsLayout';
import { ImportDataWizard } from '../../components/ImportDataWizard';
import { useAuth } from '../../contexts/AuthContext';

export const ImportDataSettings: React.FC = () => {
  const { user, companyId, region } = useAuth();
  if (!user || !companyId) return null;
  return <SettingsLayout><div className="max-w-4xl mx-auto p-4 sm:p-6"><ImportDataWizard companyId={companyId} userId={user.id} region={region} /></div></SettingsLayout>;
};
