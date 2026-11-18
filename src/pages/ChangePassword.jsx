import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { KeyRound, Eye, EyeOff } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';

const MIN_LENGTH = 4;

export default function ChangePassword() {
  const { mechanic, login, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const forced = !!mechanic?.must_change_password;
  const returnTo = location.state?.returnTo || '/dashboard';

  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!mechanic) navigate('/login', { replace: true, state: { returnTo: '/change-password' } });
  }, [mechanic, navigate]);

  if (!mechanic) return null;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!oldPassword) return setError('Wpisz obecne hasło.');
    if (newPassword.length < MIN_LENGTH) return setError(`Nowe hasło musi mieć co najmniej ${MIN_LENGTH} znaków.`);
    if (newPassword !== repeat) return setError('Nowe hasła nie są takie same.');
    if (newPassword === oldPassword) return setError('Nowe hasło musi różnić się od obecnego.');

    setLoading(true);
    const { data, error: err } = await supabase.rpc('change_password', {
      p_name: mechanic.name,
      p_old: oldPassword,
      p_new: newPassword,
    });
    setLoading(false);

    if (err) {
      const msg = err.message || '';
      if (msg.includes('ACCOUNT_LOCKED')) setError('Konto zostało tymczasowo zablokowane po zbyt wielu błędnych próbach. Spróbuj ponownie za 10 minut.');
      else if (msg.includes('PASSWORD_TOO_SHORT')) setError(`Nowe hasło musi mieć co najmniej ${MIN_LENGTH} znaków.`);
      else if (msg.includes('PASSWORD_UNCHANGED')) setError('Nowe hasło musi różnić się od obecnego.');
      else setError('Nie udało się zmienić hasła. Sprawdź połączenie z internetem i spróbuj ponownie.');
      return;
    }
    if (data !== true) {
      setError('Obecne hasło jest nieprawidłowe.');
      return;
    }
    login({ ...mechanic, must_change_password: false });
    navigate(returnTo, { replace: true });
  };

  const inputType = show ? 'text' : 'password';

  return (
    <div className="center-screen">
      <div className="card" style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <KeyRound size={22} color="var(--steel)" />
          <h1 style={{ fontSize: 20, margin: 0 }}>Zmiana hasła</h1>
        </div>
        <p className="text-sm text-muted" style={{ marginTop: 4 }}>
          {forced
            ? 'Twoje obecne hasło jest tymczasowe. Ustaw własne hasło, aby przejść dalej.'
            : `Zalogowany jako ${mechanic.name}.`}
        </p>
        <p className="text-sm" style={{ background: 'var(--soon-soft)', color: 'var(--soon)', padding: '8px 10px', borderRadius: 8 }}>
          Ustaw hasło, którego nie używasz w innych systemach. To prosty system wewnętrzny, więc osobne hasło chroni Twoje pozostałe konta.
        </p>

        <form onSubmit={submit}>
          <label className="field">
            <span className="field-label">{forced ? 'Hasło tymczasowe (obecne)' : 'Obecne hasło'}</span>
            <input className="input" type={inputType} autoComplete="current-password" value={oldPassword} onChange={(e) => setOldPassword(e.target.value)} autoFocus />
          </label>
          <label className="field">
            <span className="field-label">Nowe hasło (min. {MIN_LENGTH} znaków)</span>
            <input className="input" type={inputType} autoComplete="new-password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">Powtórz nowe hasło</span>
            <input className="input" type={inputType} autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--ink-soft)', marginBottom: 14, cursor: 'pointer' }}>
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} />
            {show ? <EyeOff size={15} /> : <Eye size={15} />} Pokaż hasła
          </label>
          {error && <p className="text-sm" style={{ color: 'var(--over)' }}>{error}</p>}
          <button className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Zapisywanie…' : 'Zapisz nowe hasło'}
          </button>
        </form>

        <button
          type="button"
          className="btn btn-ghost btn-block"
          style={{ marginTop: 10 }}
          onClick={() => {
            if (forced) { logout(); navigate('/login', { replace: true }); }
            else navigate(returnTo, { replace: true });
          }}
        >
          {forced ? 'Wyloguj' : 'Anuluj'}
        </button>
      </div>
    </div>
  );
}
