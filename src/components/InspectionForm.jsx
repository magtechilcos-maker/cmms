import React, { useState } from 'react';
import { CheckCircle2, AlertTriangle } from 'lucide-react';
import Modal from './Modal';

export default function InspectionForm({ machine, mechanic, onSave, onClose, saving }) {
  const [result, setResult] = useState('ok');
  const [notes, setNotes] = useState('');

  const submit = () => {
    onSave({
      machine_id: machine.id,
      mechanic_id: mechanic.id,
      technician_name: mechanic.name,
      result,
      notes: notes.trim(),
      date: new Date().toISOString(),
    });
  };

  return (
    <Modal title={`Rejestracja przeglądu — ${machine.name}`} onClose={onClose}>
      <p className="text-sm text-muted" style={{ marginTop: -6, marginBottom: 16 }}>
        Wykonujący: <strong style={{ color: 'var(--ink)' }}>{mechanic.name}</strong>
      </p>
      <label className="field">
        <span className="field-label">Wynik przeglądu</span>
        <div className="grid-choice">
          <button
            type="button"
            onClick={() => setResult('ok')}
            className={`choice-btn ${result === 'ok' ? 'active-ok' : ''}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <CheckCircle2 size={16} /> Sprawna
          </button>
          <button
            type="button"
            onClick={() => setResult('issue')}
            className={`choice-btn ${result === 'issue' ? 'active-over' : ''}`}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            <AlertTriangle size={16} /> Usterka
          </button>
        </div>
      </label>
      <label className="field">
        <span className="field-label">Uwagi</span>
        <textarea
          className="input"
          style={{ minHeight: 90, resize: 'vertical' }}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="np. zaplanowano do wymiany, oczekiwanie na części, wymieniono filtr..."
        />
      </label>
      <p className="text-sm text-muted" style={{ marginTop: -8 }}>
        Szczegółową listę kontrolną z kratkami do zaznaczenia znajdziesz na wydrukowanym raporcie po zapisaniu.
      </p>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
        <button className="btn btn-ghost" onClick={onClose}>Anuluj</button>
        <button className="btn btn-primary" onClick={submit} disabled={saving}>
          {saving ? 'Zapisywanie…' : 'Zapisz przegląd'}
        </button>
      </div>
    </Modal>
  );
}
