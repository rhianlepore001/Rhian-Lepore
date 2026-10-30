import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AuthProvider } from '../../contexts/AuthContext';
import { ImportDataWizard } from '../../components/ImportDataWizard';
import { supabase } from '../../lib/supabase';

function LocalImportHarness() {
  const [id, setId] = useState('');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const login = async () => {
    const result = await supabase.auth.signInWithPassword({ email, password });
    if (result.error || !result.data.user) { setError('Falha ao entrar no ambiente de teste.'); return; }
    setId(result.data.user.id);
  };
  return <AuthProvider><main>{id ? <ImportDataWizard companyId={id} userId={id} region="BR" /> : <div>
    <label>E-mail de teste<input value={email} onChange={event => setEmail(event.target.value)} /></label>
    <label>Senha de teste<input type="password" value={password} onChange={event => setPassword(event.target.value)} /></label>
    <button onClick={() => void login()}>Entrar no teste</button>{error && <p role="alert">{error}</p>}
  </div>}</main></AuthProvider>;
}

const url = new URL(import.meta.env.VITE_SUPABASE_URL);
if (!['localhost', '127.0.0.1'].includes(url.hostname) || url.protocol !== 'http:') throw new Error('O teste exige Supabase local.');
createRoot(document.getElementById('root')!).render(<LocalImportHarness />);
