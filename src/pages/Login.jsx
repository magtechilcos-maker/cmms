import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Wrench, LogIn, ShieldCheck, ArrowLeft } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

export default function Login() {
  const [mechanics, setMechanics] = useState([]);
  const [adminMode, setAdminMode] = useState(false);
  const [name, setName] = useState('');
  const [pin, setPin] = useState('');
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
    setPin('');
    setError('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!name || pin.length < 4) {
      setError('Wybierz nazwisko i podaj 4-cyfrowy PIN.');
      return;
    }
    setLoading(true);
    const { data, error: err } = await supabase.rpc('verify_mechanic_pin', { p_name: name, p_pin: pin });
    setLoading(false);
    if (err || !data || data.length === 0) {
      setError('Nieprawidłowy PIN. Spróbuj ponownie.');
      return;
    }
    if (adminMode && !data[0].is_admin) {
      setError('To konto nie ma uprawnień administratora.');
      return;
    }
    login(data[0]);
    navigate(returnTo, { replace: true });
  };

  return (
    <div className="center-screen">
      <div className="card" style={{ width: '100%', maxWidth: 360 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Wrench size={22} color="var(--steel)" />
            <h1 style={{ fontSize: 18, margin: 0 }}>System przeglądów prewencyjnych dla IL Cosmetics Polska</h1>
          </div>
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
            <span className="field-label">PIN (4 cyfry)</span>
            <input
              className="input"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••"
            />
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
