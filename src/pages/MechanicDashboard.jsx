import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { LogOut, CheckCircle2, ListChecks } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { computeStatus, STATUS_META, INTERVAL_LABELS, fmtDate, resolveChecklist } from '../lib/status';
import InspectionForm from '../components/InspectionForm';
import PrintDetailsPrompt from '../components/PrintDetailsPrompt';
import { InspectionReport } from '../components/PrintReports';

export default function MechanicDashboard() {
  const { mechanic, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [machines, setMachines] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [inspecting, setInspecting] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pendingPrint, setPendingPrint] = useState(null);
  const [printJob, setPrintJob] = useState(null);

  const load = useCallback(async () => {
    if (!mechanic) return;
    setLoading(true);
    const [{ data }, { data: tpl }] = await Promise.all([
      supabase.from('machines').select('*').eq('assigned_mechanic_id', mechanic.id),
      supabase.from('checklist_templates').select('*'),
    ]);
    setMachines(data || []);
    setTemplates(tpl || []);
    setLoading(false);
  }, [mechanic]);

  useEffect(() => {
    if (!mechanic) {
      navigate('/login', { state: { returnTo: '/dashboard' } });
      return;
    }
    load();
  }, [mechanic, navigate, load]);

  useEffect(() => {
    if (printJob) {
      const t = setTimeout(() => window.print(), 150);
      const after = () => setPrintJob(null);
      window.addEventListener('afterprint', after);
      return () => { clearTimeout(t); window.removeEventListener('afterprint', after); };
    }
  }, [printJob]);

  const saveInspection = async (rec) => {
    setSaving(true);
    const { error } = await supabase.from('inspections').insert(rec);
    setSaving(false);
    if (error) { alert('Błąd zapisu: ' + error.message); return; }
    const machine = inspecting;
    setInspecting(null);
    await load();
    setPendingPrint({ machine, inspection: rec });
  };

  if (!mechanic) return null;

  const today = machines
    .filter((m) => ['overdue', 'soon', 'never'].includes(computeStatus(m).status))
    .sort((a, b) => computeStatus(a).daysLeft - computeStatus(b).daysLeft);
  const upcoming = machines
    .filter((m) => computeStatus(m).status === 'ok')
    .sort((a, b) => computeStatus(a).daysLeft - computeStatus(b).daysLeft);

  return (
    <div className="page">
      {printJob && <InspectionReport machine={printJob.machine} inspection={printJob.inspection} docNumber={printJob.docNumber} approvalDate={printJob.approvalDate} />}

      <div className="topbar">
        <div className="brand"><ListChecks size={20} /> Moje zadania</div>
        <button className="btn btn-ghost" style={{ background: 'rgba(255,255,255,.1)', color: '#fff', border: 'none' }} onClick={() => { logout(); navigate('/login'); }}>
          <LogOut size={16} /> {mechanic.name}
        </button>
      </div>

      <div className="container">
        <h1 style={{ fontSize: 22, marginBottom: 4 }}>Cześć, {mechanic.name.split(' ')[0]}</h1>
        <p className="text-muted" style={{ marginTop: 0, marginBottom: 20 }}>{new Date().toLocaleDateString('pl-PL', { weekday: 'long', day: 'numeric', month: 'long' })}</p>

        {location.state?.deniedAdmin && (
          <div className="card" style={{ marginBottom: 20, background: 'var(--over-soft)', color: 'var(--over)', border: 'none' }}>
            Nie masz uprawnień administratora — poproś kierownika o dostęp, jeśli potrzebujesz panelu /admin.
          </div>
        )}

        {loading && <p className="text-muted">Wczytywanie…</p>}

        {!loading && (
          <>
            <h2 style={{ fontSize: 16, marginBottom: 10 }}>Do zrobienia dziś ({today.length})</h2>
            {today.length === 0 && (
              <div className="card" style={{ marginBottom: 24, textAlign: 'center', color: 'var(--ink-soft)' }}>
                <CheckCircle2 size={24} style={{ marginBottom: 6 }} />
                <p style={{ margin: 0 }}>Brak zaległych przeglądów. Wszystko na dziś zrobione.</p>
              </div>
            )}
            {today.map((m) => (
              <MachineTaskRow key={m.id} machine={m} onInspect={() => setInspecting(m)} />
            ))}

            {upcoming.length > 0 && (
              <>
                <h2 style={{ fontSize: 16, margin: '24px 0 10px' }}>Nadchodzące ({upcoming.length})</h2>
                {upcoming.map((m) => (
                  <MachineTaskRow key={m.id} machine={m} onInspect={() => setInspecting(m)} muted />
                ))}
              </>
            )}

            {machines.length === 0 && (
              <div className="card" style={{ textAlign: 'center', color: 'var(--ink-soft)' }}>
                <p style={{ margin: 0 }}>Nie masz jeszcze przypisanych żadnych maszyn. Skontaktuj się z kierownikiem.</p>
              </div>
            )}
          </>
        )}
      </div>

      {inspecting && (
        <InspectionForm
          machine={inspecting}
          mechanic={mechanic}
          saving={saving}
          onSave={saveInspection}
          onClose={() => setInspecting(null)}
        />
      )}

      {pendingPrint && (
        <PrintDetailsPrompt
          defaultDocNumber={`${pendingPrint.machine.id}-${pendingPrint.inspection.date.slice(0, 10).replace(/-/g, '')}`}
          onCancel={() => setPendingPrint(null)}
          onConfirm={(docNumber, approvalDate) => {
            const { machine, inspection: rec } = pendingPrint;
            setPendingPrint(null);
            setPrintJob({
              machine: { ...machine, last_inspection_date: rec.date, checklist_items: resolveChecklist(machine, templates) },
              inspection: rec,
              docNumber,
              approvalDate,
            });
          }}
        />
      )}
    </div>
  );
}

function MachineTaskRow({ machine, onInspect, muted }) {
  const { status, dueDate } = computeStatus(machine);
  const meta = STATUS_META[status];
  return (
    <div className="row" style={muted ? { opacity: 0.75 } : undefined}>
      <div className="row-main" style={{ cursor: 'default' }}>
        <div className="row-title">{machine.name}{machine.sequence_number ? ` (${machine.sequence_number})` : ''}</div>
        <div className="row-sub">
          {machine.location || 'Brak lokalizacji'} · {INTERVAL_LABELS[machine.interval_type]} · termin: {fmtDate(dueDate)}
        </div>
      </div>
      <span className={`badge ${meta.className}`}>{meta.label}</span>
      <button className="btn btn-subtle" onClick={onInspect}><CheckCircle2 size={16} /> Zrobione</button>
    </div>
  );
}
