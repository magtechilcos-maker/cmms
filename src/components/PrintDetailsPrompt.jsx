import React, { useState } from 'react';
import Modal from './Modal';

export default function PrintDetailsPrompt({ defaultDocNumber, onConfirm, onCancel }) {
  const [docNumber, setDocNumber] = useState(defaultDocNumber || '');
  const [approvalDate, setApprovalDate] = useState(new Date().toISOString().slice(0, 10));

  return (
    <Modal title="Dane do nagłówka wydruku" onClose={onCancel}>
      <p className="text-sm text-muted" style={{ marginTop: -6, marginBottom: 16 }}>
        Te dwie wartości trafią do nagłówka wydrukowanego dokumentu — możesz je dowolnie zmienić przed każdym drukiem.
      </p>
      <label className="field">
        <span className="field-label">Nr dokumentu</span>
        <input className="input" value={docNumber} onChange={(e) => setDocNumber(e.target.value)} autoFocus />
      </label>
      <label className="field">
        <span className="field-label">Data zatwierdzenia</span>
        <input type="date" className="input" value={approvalDate} onChange={(e) => setApprovalDate(e.target.value)} />
      </label>
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
        <button className="btn btn-ghost" onClick={onCancel}>Anuluj</button>
        <button className="btn btn-primary" onClick={() => onConfirm(docNumber, approvalDate)}>Drukuj</button>
      </div>
    </Modal>
  );
}
