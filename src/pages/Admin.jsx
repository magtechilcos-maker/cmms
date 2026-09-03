import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Printer, Wrench, Users, FileText, QrCode, LogOut, ShieldCheck } from 'lucide-react';
import { supabase, SITE_URL } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import Modal from '../components/Modal';
import { computeStatus, STATUS_META, INTERVAL_LABELS, fmtDate, uid, qrUrl } from '../lib/status';
import { PeriodReport, QrSheet } from '../components/PrintReports';

export default function Admin() {
  const { mechanic, logout } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('machines');
  const [machines, setMachines] = useState([]);
  const [mechanics, setMechanics] = useState([]);
  const [inspections, setInspections] = useState([]);
  const [loading, setLoading] = useState(true);

  const [machineForm, setMachineForm] = useState(null); // {} for new, object for edit, null closed
  const [mechanicForm, setMechanicForm] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null); // {type:'machine'|'mechanic', item}
  const [printJob, setPrintJob] = useState(null);

  useEffect(() => {
    if (!mechanic) {
      navigate('/login', { state: { returnTo: '/admin' } });
      return;
    }
    if (!mechanic.is_admin) {
      navigate('/dashboard', { replace: true, state: { deniedAdmin: true } });
    }
  }, [mechanic, navigate]);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: m }, { data: mech }, { data: insp }] = await Promise.all([
      supabase.from('machines').select('*').order('name'),
      supabase.from('mechanics_public').select('*').order('name'),
      supabase.from('inspections').select('*'),
    ]);
    setMachines(m || []);
    setMechanics(mech || []);
    setInspections(insp || []);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (mechanic?.is_admin) load();
  }, [mechanic, load]);

  if (!mechanic || !mechanic.is_admin) return null;

  useEffect(() => {
    if (printJob) {
      const t = setTimeout(() => window.print(), 150);
      const after = () => setPrintJob(null);
      window.addEventListener('afterprint', after);
      return () => { clearTimeout(t); window.removeEventListener('afterprint', after); };
    }
  }, [printJob]);

  const saveMachine = async (m) => {
    const isNew = !machines.some((x) => x.id === m.id);
    const { error } = isNew
      ? await supabase.from('machines').insert(m)
      : await supabase.from('machines').update(m).eq('id', m.id);
    if (error) { alert('Błąd zapisu: ' + error.message); return; }
    setMachineForm(null);
    load();
  };

  const deleteMachine = async (m) => {
    await supabase.from('machines').delete().eq('id', m.id);
    setConfirmDelete(null);
    load();
  };

  const saveMechanic = async ({ id, name, pin, is_admin }) => {
    const { error } = await supabase.rpc('upsert_mechanic', { p_name: name, p_pin: pin || null, p_id: id || null, p_is_admin: is_admin });
    if (error) { alert('Błąd zapisu: ' + error.message); return; }
    setMechanicForm(null);
    load();
  };

  const deleteMechanic = async (m) => {
    await supabase.rpc('delete_mechanic', { p_id: m.id });
    setConfirmDelete(null);
    load();
  };

  return (
    <div className="page">
      {printJob?.type === 'period' && <PeriodReport machines={machines} inspections={inspections} from={printJob.from} to={printJob.to} />}
      {printJob?.type === 'qrsheet' && <QrSheet machines={printJob.machines} siteUrl={SITE_URL} />}

      <div className="topbar">
        <div className="brand"><Wrench size={20} /> Panel administratora</div>
        <button className="btn btn-ghost" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', border: 'none' }} onClick={() => { logout(); navigate('/login'); }}>
          <LogOut size={16} /> {mechanic.name}
        </button>
      </div>

      <div className="container-wide">
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          <TabBtn active={tab === 'machines'} onClick={() => setTab('machines')} icon={Wrench} label="Maszyny" />
          <TabBtn active={tab === 'mechanics'} onClick={() => setTab('mechanics')} icon={Users} label="Mechanicy" />
          <TabBtn active={tab === 'reports'} onClick={() => setTab('reports')} icon={FileText} label="Raporty i etykiety" />
        </div>

        {loading ? <p className="text-muted">Wczytywanie…</p> : (
          <>
            {tab === 'machines' && (
              <MachinesTab
                machines={machines}
                mechanics={mechanics}
                onAdd={() => setMachineForm({})}
                onEdit={setMachineForm}
                onDelete={(m) => setConfirmDelete({ type: 'machine', item: m })}
              />
            )}
            {tab === 'mechanics' && (
              <MechanicsTab
                mechanics={mechanics}
                machines={machines}
                onAdd={() => setMechanicForm({})}
                onEdit={setMechanicForm}
                onDelete={(m) => setConfirmDelete({ type: 'mechanic', item: m })}
              />
            )}
            {tab === 'reports' && (
              <ReportsTab
                machines={machines}
                onPrintPeriod={(from, to) => setPrintJob({ type: 'period', from, to })}
                onPrintQr={(list) => setPrintJob({ type: 'qrsheet', machines: list })}
              />
            )}
          </>
        )}
      </div>

      {machineForm && (
        <MachineFormModal
          initial={machineForm.id ? machineForm : null}
          mechanics={mechanics}
          onSave={saveMachine}
          onClose={() => setMachineForm(null)}
        />
      )}
      {mechanicForm && (
        <MechanicFormModal
          initial={mechanicForm.id ? mechanicForm : null}
          onSave={saveMechanic}
          onClose={() => setMechanicForm(null)}
        />
      )}
      {confirmDelete && (
        <Modal title={confirmDelete.type === 'machine' ? 'Usuń maszynę' : 'Usuń mechanika'} onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-muted" style={{ marginBottom: 18 }}>
            Czy na pewno chcesz usunąć „{confirmDelete.item.name}”? Tej operacji nie można cofnąć.
          </p>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Anuluj</button>
            <button
              className="btn btn-danger"
              onClick={() => confirmDelete.type === 'machine' ? deleteMachine(confirmDelete.item) : deleteMechanic(confirmDelete.item)}
            >
              Usuń
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}

function TabBtn({ active, onClick, icon: Icon, label }) {
  return (
    <button className={active ? 'btn btn-primary' : 'btn btn-ghost'} onClick={onClick}>
      <Icon size={16} /> {label}
    </button>
  );
}

/* ---------------- Machines tab ---------------- */

function MachinesTab({ machines, mechanics, onAdd, onEdit, onDelete }) {
  const mechanicById = Object.fromEntries(mechanics.map((m) => [m.id, m.name]));
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Maszyny i linie ({machines.length})</h2>
        <button className="btn btn-primary" onClick={onAdd}><Plus size={16} /> Dodaj maszynę</button>
      </div>
      {machines.length === 0 && <p className="text-muted">Brak maszyn. Dodaj pierwszą.</p>}
      {machines.map((m) => {
        const { status, dueDate } = computeStatus(m);
        const meta = STATUS_META[status];
        return (
          <div className="row" key={m.id}>
            <div className="row-main" style={{ cursor: 'default' }}>
              <div className="row-title">{m.name}{m.sequence_number ? ` (${m.sequence_number})` : ''}</div>
              <div className="row-sub">
                {m.location || 'Brak lokalizacji'} · {INTERVAL_LABELS[m.interval_type]} · termin: {fmtDate(dueDate)} · mechanik: {mechanicById[m.assigned_mechanic_id] || 'nieprzypisany'}
                {m.serial_number && <> · nr seryjny: {m.serial_number}</>}
              </div>
            </div>
            <span className={`badge ${meta.className}`}>{meta.label}</span>
            <button className="btn btn-subtle" onClick={() => onEdit(m)}><Pencil size={16} /></button>
            <button className="btn btn-danger" onClick={() => onDelete(m)}><Trash2 size={16} /></button>
          </div>
        );
      })}
    </div>
  );
}

function MachineFormModal({ initial, mechanics, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '');
  const [location, setLocation] = useState(initial?.location || '');
  const [serialNumber, setSerialNumber] = useState(initial?.serial_number || '');
  const [sequenceNumber, setSequenceNumber] = useState(initial?.sequence_number || '');
  const [intervalType, setIntervalType] = useState(initial?.interval_type || 'monthly');
  const [customDays, setCustomDays] = useState(initial?.custom_days || 14);
  const [assignedMechanicId, setAssignedMechanicId] = useState(initial?.assigned_mechanic_id || '');

  const submit = () => {
    if (!name.trim()) return;
    onSave({
      id: initial?.id || uid('MASZ'),
      name: name.trim(),
      location: location.trim(),
      serial_number: serialNumber.trim(),
      sequence_number: sequenceNumber.trim(),
      interval_type: intervalType,
      custom_days: intervalType === 'custom' ? Number(customDays) : null,
      assigned_mechanic_id: assignedMechanicId || null,
      created_at: initial?.created_at || new Date().toISOString(),
    });
  };

  return (
    <Modal title={initial ? 'Edytuj maszynę / linię' : 'Nowa maszyna / linia'} onClose={onClose}>
      <label className="field">
        <span className="field-label">Nazwa</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Prasa hydrauliczna P-3" autoFocus />
      </label>
      <label className="field">
        <span className="field-label">Lokalizacja / linia produkcyjna</span>
        <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="np. Hala A, Linia 2" />
      </label>
      <div style={{ display: 'flex', gap: 10 }}>
        <label className="field" style={{ flex: 1 }}>
          <span className="field-label">Nr porządkowy</span>
          <input className="input" value={sequenceNumber} onChange={(e) => setSequenceNumber(e.target.value)} placeholder="np. D1, Z1" />
        </label>
        <label className="field" style={{ flex: 1 }}>
          <span className="field-label">Nr seryjny</span>
          <input className="input" value={serialNumber} onChange={(e) => setSerialNumber(e.target.value)} placeholder="np. SN-2024-0817" />
        </label>
      </div>
      <label className="field">
        <span className="field-label">Częstotliwość przeglądu</span>
        <div className="grid-choice">
          {['weekly', 'monthly', 'custom'].map((t) => (
            <button key={t} type="button" className={`choice-btn ${intervalType === t ? 'active' : ''}`} onClick={() => setIntervalType(t)}>
              {t === 'weekly' ? 'Co tydzień' : t === 'monthly' ? 'Co miesiąc' : 'Inna'}
            </button>
          ))}
        </div>
      </label>
      {intervalType === 'custom' && (
        <label className="field">
          <span className="field-label">Liczba dni pomiędzy przeglądami</span>
          <input type="number" min="1" className="input" value={customDays} onChange={(e) => setCustomDays(e.target.value)} />
        </label>
      )}
      <label className="field">
        <span className="field-label">Przypisany mechanik</span>
        <select className="input" value={assignedMechanicId} onChange={(e) => setAssignedMechanicId(e.target.value)}>
          <option value="">— nieprzypisany —</option>
          {mechanics.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
        </select>
      </label>
      {initial && <p className="text-sm text-muted" style={{ marginBottom: 14 }}>Kod urządzenia: <strong style={{ fontFamily: 'monospace' }}>{initial.id}</strong></p>}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Anuluj</button>
        <button className="btn btn-primary" onClick={submit}>{initial ? 'Zapisz zmiany' : 'Dodaj maszynę'}</button>
      </div>
    </Modal>
  );
}

/* ---------------- Mechanics tab ---------------- */

function MechanicsTab({ mechanics, machines, onAdd, onEdit, onDelete }) {
  const countByMechanic = machines.reduce((acc, m) => {
    if (m.assigned_mechanic_id) acc[m.assigned_mechanic_id] = (acc[m.assigned_mechanic_id] || 0) + 1;
    return acc;
  }, {});
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
        <h2 style={{ fontSize: 18, margin: 0 }}>Mechanicy ({mechanics.length})</h2>
        <button className="btn btn-primary" onClick={onAdd}><Plus size={16} /> Dodaj mechanika</button>
      </div>
      {mechanics.length === 0 && <p className="text-muted">Brak mechaników. Dodaj pierwszego, aby mogli się logować.</p>}
      {mechanics.map((m) => (
        <div className="row" key={m.id}>
          <div className="row-main" style={{ cursor: 'default' }}>
            <div className="row-title">
              {m.name}
              {m.is_admin && (
                <span className="badge badge-never" style={{ marginLeft: 8, fontSize: 11, padding: '3px 8px' }}>
                  <ShieldCheck size={12} /> admin
                </span>
              )}
            </div>
            <div className="row-sub">Przypisanych maszyn: {countByMechanic[m.id] || 0}</div>
          </div>
          <button className="btn btn-subtle" onClick={() => onEdit(m)}><Pencil size={16} /></button>
          <button className="btn btn-danger" onClick={() => onDelete(m)}><Trash2 size={16} /></button>
        </div>
      ))}
    </div>
  );
}

function MechanicFormModal({ initial, onSave, onClose }) {
  const [name, setName] = useState(initial?.name || '');
  const [pin, setPin] = useState('');
  const [isAdmin, setIsAdmin] = useState(initial?.is_admin || false);

  const submit = () => {
    if (!name.trim()) return;
    if (!initial && pin.length !== 4) { alert('Podaj 4-cyfrowy PIN.'); return; }
    if (pin && pin.length !== 4) { alert('PIN musi mieć 4 cyfry.'); return; }
    onSave({ id: initial?.id, name: name.trim(), pin: pin || null, is_admin: isAdmin });
  };

  return (
    <Modal title={initial ? 'Edytuj mechanika' : 'Nowy mechanik'} onClose={onClose}>
      <label className="field">
        <span className="field-label">Imię i nazwisko</span>
        <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="np. Jan Kowalski" autoFocus />
      </label>
      <label className="field">
        <span className="field-label">{initial ? 'Nowy PIN (zostaw puste, aby nie zmieniać)' : 'PIN (4 cyfry)'}</span>
        <input className="input" inputMode="numeric" maxLength={4} value={pin} onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))} placeholder="••••" />
      </label>
      <label className="field" style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
        <input type="checkbox" checked={isAdmin} onChange={(e) => setIsAdmin(e.target.checked)} style={{ width: 16, height: 16 }} />
        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>Uprawnienia administratora (dostęp do panelu /admin)</span>
      </label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Anuluj</button>
        <button className="btn btn-primary" onClick={submit}>{initial ? 'Zapisz zmiany' : 'Dodaj mechanika'}</button>
      </div>
    </Modal>
  );
}

/* ---------------- Reports tab ---------------- */

function ReportsTab({ machines, onPrintPeriod, onPrintQr }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  return (
    <div style={{ display: 'grid', gap: 20, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <FileText size={18} color="var(--steel)" />
          <h3 style={{ fontSize: 16, margin: 0 }}>Raport zbiorczy</h3>
        </div>
        <p className="text-sm text-muted">Wybierz zakres dat i wydrukuj listę wszystkich przeglądów.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <label className="field" style={{ flex: 1 }}>
            <span className="field-label">Od</span>
            <input type="date" className="input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </label>
          <label className="field" style={{ flex: 1 }}>
            <span className="field-label">Do</span>
            <input type="date" className="input" value={to} onChange={(e) => setTo(e.target.value)} />
          </label>
        </div>
        <button className="btn btn-primary" onClick={() => onPrintPeriod(from, to)}><Printer size={16} /> Drukuj raport</button>
      </div>

      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <QrCode size={18} color="var(--steel)" />
          <h3 style={{ fontSize: 16, margin: 0 }}>Etykiety QR</h3>
        </div>
        <p className="text-sm text-muted">Wydrukuj arkusz kodów QR dla wszystkich maszyn — do naklejenia na urządzeniach. Zeskanowanie dowolnym telefonem otworzy stronę statusu.</p>
        <button className="btn btn-subtle" disabled={machines.length === 0} onClick={() => onPrintQr(machines)}>
          <Printer size={16} /> Drukuj {machines.length} kodów QR
        </button>
      </div>
    </div>
  );
}
