import React from 'react';
import { INTERVAL_LABELS, fmtDate, fmtDateTime, qrUrl } from '../lib/status';

function PrintSheet({ children }) {
  return (
    <div className="print-only" style={{ padding: 32, fontFamily: 'Inter, sans-serif', color: '#111' }}>
      {children}
    </div>
  );
}

const Row = ({ label, value }) => (
  <tr>
    <td style={{ padding: '6px 12px 6px 0', fontSize: 12, color: '#666', width: 200 }}>{label}</td>
    <td style={{ padding: '6px 0', fontSize: 14, fontWeight: 600 }}>{value}</td>
  </tr>
);
const Th = ({ children }) => <th style={{ padding: '6px 8px', fontSize: 11 }}>{children}</th>;
const Td = ({ children, colSpan }) => <td colSpan={colSpan} style={{ padding: '6px 8px' }}>{children}</td>;
const Sign = ({ label }) => (
  <div style={{ flex: 1 }}>
    <div style={{ borderBottom: '1px solid #333', height: 40 }} />
    <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{label}</div>
  </div>
);

export function InspectionReport({ machine, inspection }) {
  return (
    <PrintSheet>
      <div style={{ borderBottom: '2px solid #111', paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: '#555' }}>RAPORT Z PRZEGLĄDU TECHNICZNEGO</div>
        <h1 style={{ fontSize: 24, margin: '4px 0 0', fontFamily: 'Space Grotesk, sans-serif' }}>{machine.name}</h1>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <tbody>
          <Row label="Kod urządzenia" value={machine.id} />
          <Row label="Lokalizacja" value={machine.location || '—'} />
          <Row label="Częstotliwość przeglądów" value={INTERVAL_LABELS[machine.interval_type] + (machine.interval_type === 'custom' ? ` (${machine.custom_days} dni)` : '')} />
          <Row label="Data przeglądu" value={fmtDateTime(inspection.date)} />
          <Row label="Wykonał" value={inspection.technician_name} />
          <Row label="Wynik" value={inspection.result === 'ok' ? 'Maszyna sprawna' : 'Stwierdzono usterkę'} />
        </tbody>
      </table>
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>UWAGI</div>
        <div style={{ minHeight: 60, border: '1px solid #ccc', borderRadius: 6, padding: 10, fontSize: 13 }}>{inspection.notes || '—'}</div>
      </div>
      <div style={{ display: 'flex', gap: 40, marginTop: 60 }}>
        <Sign label="Podpis wykonującego" />
        <Sign label="Podpis odbierającego" />
      </div>
      <div style={{ marginTop: 30, fontSize: 10, color: '#888' }}>Wygenerowano automatycznie · {fmtDateTime(new Date().toISOString())}</div>
    </PrintSheet>
  );
}

export function PeriodReport({ machines, inspections, from, to }) {
  const rows = inspections
    .filter((i) => (!from || i.date >= from) && (!to || i.date <= to + 'T23:59:59'))
    .sort((a, b) => (a.date < b.date ? 1 : -1));
  const machineById = Object.fromEntries(machines.map((m) => [m.id, m]));
  return (
    <PrintSheet>
      <div style={{ borderBottom: '2px solid #111', paddingBottom: 12, marginBottom: 20 }}>
        <div style={{ fontSize: 11, letterSpacing: 1, color: '#555' }}>RAPORT ZBIORCZY Z PRZEGLĄDÓW</div>
        <h1 style={{ fontSize: 22, margin: '4px 0 0', fontFamily: 'Space Grotesk, sans-serif' }}>
          {from || to ? `Okres: ${from ? fmtDate(from) : '...'} – ${to ? fmtDate(to) : '...'}` : 'Pełna historia'}
        </h1>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #111', textAlign: 'left' }}>
            <Th>Data</Th><Th>Maszyna</Th><Th>Lokalizacja</Th><Th>Wykonał</Th><Th>Wynik</Th><Th>Uwagi</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const m = machineById[r.machine_id];
            return (
              <tr key={r.id} style={{ borderBottom: '1px solid #ddd' }}>
                <Td>{fmtDate(r.date)}</Td>
                <Td>{m ? m.name : r.machine_id}</Td>
                <Td>{m ? m.location : '—'}</Td>
                <Td>{r.technician_name}</Td>
                <Td>{r.result === 'ok' ? 'Sprawna' : 'Usterka'}</Td>
                <Td>{r.notes || '—'}</Td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><Td colSpan={6}>Brak przeglądów w wybranym okresie.</Td></tr>}
        </tbody>
      </table>
      <div style={{ marginTop: 30, fontSize: 10, color: '#888' }}>Wygenerowano automatycznie · {fmtDateTime(new Date().toISOString())} · liczba pozycji: {rows.length}</div>
    </PrintSheet>
  );
}

export function QrSheet({ machines, siteUrl }) {
  return (
    <PrintSheet>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }}>
        {machines.map((m) => (
          <div key={m.id} style={{ border: '1px solid #999', borderRadius: 8, padding: 12, textAlign: 'center', pageBreakInside: 'avoid' }}>
            <img src={qrUrl(`${siteUrl}/m/${m.id}`, 180)} alt={m.id} style={{ width: '100%', maxWidth: 150, margin: '0 auto' }} />
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6 }}>{m.name}</div>
            <div style={{ fontSize: 11, color: '#555' }}>{m.location || ''}</div>
            <div style={{ fontFamily: 'monospace', fontSize: 11, marginTop: 4 }}>{m.id}</div>
          </div>
        ))}
      </div>
    </PrintSheet>
  );
}
