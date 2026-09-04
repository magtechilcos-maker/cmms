import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CheckCircle2, Wrench, LogIn, Printer } from 'lucide-react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../AuthContext';
import { computeStatus, STATUS_META, INTERVAL_LABELS, fmtDate, fmtDateTime, resolveChecklist } from '../lib/status';
import InspectionForm from '../components/InspectionForm';
import PrintDetailsPrompt from '../components/PrintDetailsPrompt';
import { InspectionReport, BlankChecklistSheet } from '../components/PrintReports';

export default function MachineStatus() {
  const { machineId } = useParams();
  const { mechanic } = useAuth();
  const navigate = useNavigate();
  const [machine, setMachine] = useState(null);
  const [template, setTemplate] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [inspecting, setInspecting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pendingPrint, setPendingPrint] = useState(null); // {kind:'inspection'|'checklist', inspection?}
  const [printJob, setPrintJob] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: m } = await supabase.from('machines').select('*').eq('id', machineId).maybeSingle();
    if (!m) { setNotFound(true); setLoading(false); return; }
    setMachine(m);
    if (m.checklist_template_id) {
      const { data: tpl } = await supabase.from('checklist_templates').select('*').eq('id', m.checklist_template_id).maybeSingle();
      setTemplate(tpl || null);
    } else {
      setTemplate(null);
    }
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
    setPendingPrint({ kind: 'inspection', inspection: rec });
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
      {printJob?.type === 'inspection' && <InspectionReport machine={printJob.machine} inspection={printJob.inspection} docNumber={printJob.docNumber} approvalDate={printJob.approvalDate} />}
      {printJob?.type === 'checklist' && <BlankChecklistSheet machine={printJob.machine} docNumber={printJob.docNumber} approvalDate={printJob.approvalDate} />}

      <div className="topbar">
        <div className="brand"><Wrench size={20} /> System przeglądów prewencyjnych dla IL Cosmetics Polska</div>
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
          <button className="btn btn-subtle" style={{ marginTop: 10, marginLeft: 8 }} onClick={() => setPendingPrint({ kind: 'checklist' })}>
            <Printer size={16} /> Drukuj kartę kontrolną
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

      {pendingPrint && (
        <PrintDetailsPrompt
          defaultDocNumber={pendingPrint.kind === 'inspection' ? `${machine.id}-${pendingPrint.inspection.date.slice(0, 10).replace(/-/g, '')}` : `${machine.id}-KARTA`}
          onCancel={() => setPendingPrint(null)}
          onConfirm={(docNumber, approvalDate) => {
            const effectiveChecklist = resolveChecklist(machine, template ? [template] : []);
            if (pendingPrint.kind === 'inspection') {
              setPrintJob({
                type: 'inspection',
                machine: { ...machine, last_inspection_date: pendingPrint.inspection.date, checklist_items: effectiveChecklist },
                inspection: pendingPrint.inspection,
                docNumber,
                approvalDate,
              });
            } else {
              setPrintJob({ type: 'checklist', machine: { ...machine, checklist_items: effectiveChecklist }, docNumber, approvalDate });
            }
            setPendingPrint(null);
          }}
        />
      )}
    </div>
  );
}
