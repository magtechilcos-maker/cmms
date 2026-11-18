import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Wrench, LogIn, ShieldCheck, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function Login() {
  const [mechanics, setMechanics] = useState([]);
  const [adminMode, setAdminMode] = useState(false);
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = location.state?.returnTo || (adminMode ? '/admin' : '/dashboard');

  useEffect(() => {
    supabase
      .from('mechanics_public')
      .select('id,name,is_admin')
      .order('name')
      .then(({ data }) => setMechanics(data || []));
  }, []);

  const visibleMechanics = mechanics.filter((m) => (adminMode ? m.is_admin : !m.is_admin));

  const toggleMode = () => {
    setAdminMode((v) => !v);
    setName('');
    setPassword('');
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || !password) {
      setError('Wybierz nazwisko i wpisz hasło.');
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.rpc('verify_mechanic_password', { p_name: name, p_password: password });
    setLoading(false);
    if (err) {
      setError(
        err.message?.includes('ACCOUNT_LOCKED')
          ? 'Konto zostało tymczasowo zablokowane po zbyt wielu błędnych próbach. Spróbuj ponownie za 10 minut.'
          : 'Nie udało się zalogować. Sprawdź połączenie z internetem i spróbuj ponownie.'
      );
      return;
    }
    if (!data || data.length === 0) {
      setError('Nieprawidłowe hasło.');
      return;
    }
    if (adminMode && !data[0].is_admin) {
      setError('To konto nie ma uprawnień administratora.');
      return;
    }
    login(data[0]);
    if (data[0].must_change_password) {
      navigate('/change-password', { replace: true, state: { returnTo } });
    } else {
      navigate(returnTo, { replace: true });
    }
  };

  return (
    <div className="center-screen">
      <div className="card" style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <Wrench size={22} color="var(--steel)" />
          <h1 style={{ fontSize: 18, margin: 0 }}>System przeglądów prewencyjnych dla IL Cosmetics Polska</h1>
        </div>

        <button
          type="button"
          onClick={toggleMode}
          className="btn btn-ghost"
          style={{ width: '100%', marginTop: 12, marginBottom: 4, justifyContent: 'center' }}
        >
          {adminMode ? <><ArrowLeft size={15} /> Wróć do logowania pracownika</> : <><ShieldCheck size={15} /> Zaloguj jako admin</>}
        </button>

        <p className="text-sm text-muted" style={{ marginTop: 8 }}>
          {adminMode ? 'Logowanie administratora — dostęp do panelu zarządzania.' : 'Zaloguj się, aby zobaczyć swoje zadania na dziś.'}
        </p>

        <form onSubmit={submit}>
          <label className="field">
            <span className="field-label">{adminMode ? 'Administrator' : 'Twoje imię i nazwisko'}</span>
            <select className="input" value={name} onChange={(e) => setName(e.target.value)}>
              <option value="">— wybierz —</option>
              {visibleMechanics.map((m) => (
                <option key={m.id} value={m.name}>{m.name}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">Hasło</span>
            <div style={{ position: 'relative' }}>
              <input
                className="input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                title={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                style={{ position: 'absolute', right: 8, top: 8, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--ink-soft)' }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </label>
          {error && <p className="text-sm" style={{ color: 'var(--over)' }}>{error}</p>}
          <button className="btn btn-primary btn-block" disabled={loading}>
            <LogIn size={16} /> {loading ? 'Sprawdzanie…' : 'Zaloguj się'}
          </button>
        </form>

        {visibleMechanics.length === 0 && (
          <p className="text-sm text-muted" style={{ marginTop: 14 }}>
            {adminMode
              ? 'Brak jeszcze żadnego administratora — ustaw pierwszego w SQL Editor (patrz README).'
              : 'Brak jeszcze żadnych mechaników w systemie — dodaj ich w panelu administratora.'}
          </p>
        )}
      </div>
    </div>
  );
}
