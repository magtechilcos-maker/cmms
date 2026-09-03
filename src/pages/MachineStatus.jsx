import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Wrench, LogIn } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { computeStatus, STATUS_META, INTERVAL_LABELS, fmtDate, fmtDateTime } from '../lib/status';
import InspectionForm from '../components/InspectionForm';
import { InspectionReport } from '../components/PrintReports';

export default function MachineStatus() {
  const { machineId } = useParams();
  const { mechanic } = useAuth();
  const navigate = useNavigate();
  const [machine, setMachine] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [printJob, setPrintJob] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: m } = await supabase.from('machines').select('*').eq('id', machineId).maybeSingle();
    if (!m) { setNotFound(true); setLoading(false); return; }
    setMachine(m);
    const { data: h } = await supabase
      .from('inspections')
      .select('*')
      .eq('machine_id', machineId)
      .order('date', { ascending: false })
      .limit(15);
    setHistory(h || []);
    setLoading(false);
  }, [machineId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (printJob) {
      const t = setTimeout(() => window.print(), 150);
      const after = () => setPrintJob(null);
      window.addEventListener('afterprint', after);
      return () => { clearTimeout(t); window.removeEventListener('afterprint', after); };
    }
  }, [printJob]);

  const startInspection = () => {
    if (!mechanic) {
      navigate('/login', { state: { returnTo: `/m/${machineId}` } });
      return;
    }
    setInspecting(true);
  };

  const saveInspection = async (rec) => {
    setSaving(true);
    const { error } = await supabase.from('inspections').insert(rec);
    setSaving(false);
    if (error) { alert('Błąd zapisu: ' + error.message); return; }
    setInspecting(false);
    await load();
    setPrintJob({ machine: { ...machine, last_inspection_date: rec.date }, inspection: rec });
  };

  if (loading) return <div className="center-screen text-muted">Wczytywanie…</div>;
  if (notFound) {
    return (
      <div className="center-screen">
        <div className="card" style={{ textAlign: 'center', maxWidth: 360 }}>
          <p>Nie znaleziono urządzenia o kodzie <strong>{machineId}</strong>.</p>
        </div>
      </div>
    );
  }

  const { status, dueDate, daysLeft } = computeStatus(machine);
  const meta = STATUS_META[status];

  return (
    <div className="page">
      {printJob && <InspectionReport machine={printJob.machine} inspection={printJob.inspection} />}

      <div className="topbar">
        <div className="brand"><Wrench size={20} /> CMMS Przeglądy</div>
        {!mechanic && (
          <button className="btn btn-ghost" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', border: 'none' }} onClick={() => navigate('/login', { state: { returnTo: `/m/${machineId}` } })}>
            <LogIn size={16} /> Zaloguj
          </button>
        )}
      </div>

      <div className="container">
        <div className="card" style={{ marginBottom: 20 }}>
          <div className="text-sm text-muted" style={{ marginBottom: 4 }}>
            {machine.location || 'Brak lokalizacji'} · <span style={{ fontFamily: 'monospace' }}>{machine.id}</span>
          </div>
          <h1 style={{ fontSize: 22, margin: '0 0 6px' }}>
            {machine.name}{machine.sequence_number ? ` (${machine.sequence_number})` : ''}
          </h1>
          {machine.serial_number && (
            <div className="text-sm text-muted" style={{ marginBottom: 10 }}>Nr seryjny: {machine.serial_number}</div>
          )}
          <span className={`badge ${meta.className}`} style={{ fontSize: 14, padding: '8px 14px' }}>{meta.label}</span>
          <p className="text-sm text-muted" style={{ marginTop: 10 }}>
            {status === 'overdue'
              ? `Przegląd zaległy o ${Math.abs(daysLeft)} dni (termin: ${fmtDate(dueDate)})`
              : status === 'never'
                ? 'Ta maszyna nie miała jeszcze zarejestrowanego przeglądu.'
                : `Następny termin: ${fmtDate(dueDate)} (${INTERVAL_LABELS[machine.interval_type]})`}
          </p>
          <button className="btn btn-primary" style={{ marginTop: 10 }} onClick={startInspection}>
            <CheckCircle2 size={16} /> Zarejestruj przegląd
          </button>
        </div>

        <h2 style={{ fontSize: 16, marginBottom: 10 }}>Historia przeglądów</h2>
        {history.length === 0 && <p className="text-muted text-sm">Brak zarejestrowanych przeglądów.</p>}
        {history.map((h) => (
          <div key={h.id} className="row" style={{ alignItems: 'flex-start' }}>
            <div className="row-main">
              <div className="row-title" style={{ fontSize: 14 }}>{fmtDateTime(h.date)} — {h.technician_name}</div>
              {h.notes && <div className="row-sub">{h.notes}</div>}
            </div>
            <span className={`badge ${h.result === 'ok' ? 'badge-ok' : 'badge-over'}`}>
              {h.result === 'ok' ? 'Sprawna' : 'Usterka'}
            </span>
          </div>
        ))}
      </div>

      {inspecting && mechanic && (
        <InspectionForm
          machine={machine}
          mechanic={mechanic}
          saving={saving}
          onSave={saveInspection}
          onClose={() => setInspecting(false)}
        />
      )}
    </div>
  );
}
