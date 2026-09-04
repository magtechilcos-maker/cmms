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
  <div style={{ flex: 1, maxWidth: 260 }}>
    <div style={{ borderBottom: '1px solid #333', height: 40 }} />
    <div style={{ fontSize: 11, color: '#666', marginTop: 4 }}>{label}</div>
  </div>
);

// Nagłówek raportu: logo | tytuł dokumentu | nr dokumentu + data zatwierdzenia (bez opisów)
function ReportHeader({ title, docNumber, approvalDate }) {
  const cellBorder = '1px solid #333';
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 22, tableLayout: 'fixed' }}>
      <tbody>
        <tr>
          <td rowSpan={2} style={{ border: cellBorder, width: '18%', height: 64, textAlign: 'center', verticalAlign: 'middle', padding: 6 }}>
            <img src="/logo.png" alt="IL Cosmetics Group" style={{ maxWidth: '100%', maxHeight: 48, objectFit: 'contain' }} />
          </td>
          <td rowSpan={2} style={{ border: cellBorder, textAlign: 'center', verticalAlign: 'middle', fontSize: 19, fontWeight: 700, fontFamily: 'Space Grotesk, sans-serif', padding: '0 10px' }}>
            {title}
          </td>
          <td style={{ border: cellBorder, width: '18%', textAlign: 'center', verticalAlign: 'middle', fontSize: 12, padding: '4px 6px' }}>
            {docNumber || '\u00A0'}
          </td>
        </tr>
        <tr>
          <td style={{ border: cellBorder, textAlign: 'center', verticalAlign: 'middle', fontSize: 12, padding: '4px 6px' }}>
            {approvalDate ? fmtDate(approvalDate) : '\u00A0'}
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function InspectionReport({ machine, inspection, docNumber, approvalDate }) {
  const checklist = machine.checklist_items || [];
  return (
    <PrintSheet>
      <ReportHeader title="Raport z przeglądu technicznego" docNumber={docNumber} approvalDate={approvalDate} />

      <h2 style={{ fontSize: 16, margin: '0 0 10px', fontFamily: 'Space Grotesk, sans-serif' }}>
        {machine.name}{machine.sequence_number ? ` (${machine.sequence_number})` : ''}
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <tbody>
          <Row label="Kod urządzenia" value={machine.id} />
          <Row label="Nr porządkowy" value={machine.sequence_number || '—'} />
          <Row label="Nr seryjny" value={machine.serial_number || '—'} />
          <Row label="Lokalizacja" value={machine.location || '—'} />
          <Row label="Częstotliwość przeglądów" value={INTERVAL_LABELS[machine.interval_type] + (machine.interval_type === 'custom' ? ` (${machine.custom_days} dni)` : '')} />
          <Row label="Data przeglądu" value={fmtDateTime(inspection.date)} />
          <Row label="Wykonał" value={inspection.technician_name} />
        </tbody>
      </table>

      <ChecklistTable items={checklist} />

      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>UWAGI OGÓLNE</div>
        <div style={{ minHeight: 60, border: '1px solid #ccc', borderRadius: 6, padding: 10, fontSize: 13 }}>{inspection.notes || '—'}</div>
      </div>

      <OverallResultBox />

      <div style={{ display: 'flex', marginTop: 40 }}>
        <Sign label="Podpis wykonującego" />
      </div>
      <div style={{ marginTop: 20, fontSize: 10, color: '#888' }}>Wygenerowano automatycznie · {fmtDateTime(new Date().toISOString())}</div>
    </PrintSheet>
  );
}

// Wynik ogólny — puste kratki do ręcznego zaznaczenia na dole raportu
function OverallResultBox() {
  const box = { display: 'inline-block', width: 20, height: 20, border: '1.5px solid #333', borderRadius: 3, marginRight: 8, verticalAlign: 'middle' };
  return (
    <div style={{ marginBottom: 10, border: '1px solid #333', borderRadius: 6, padding: '12px 16px' }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 10 }}>WYNIK OGÓLNY</div>
      <div style={{ display: 'flex', gap: 36 }}>
        <span style={{ fontSize: 14 }}><span style={box} />Sprawna</span>
        <span style={{ fontSize: 14 }}><span style={box} />Niesprawna</span>
      </div>
    </div>
  );
}

// Lista kontrolna: punkty po lewej (z pustą kratką ✓/✗), uwagi do konkretnego punktu po prawej
function ChecklistTable({ items }) {
  if (!items || items.length === 0) return null;
  const box = { display: 'inline-block', width: 16, height: 16, border: '1.5px solid #333', borderRadius: 3, marginRight: 8, verticalAlign: 'middle', flexShrink: 0 };
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>LISTA KONTROLNA</div>
      <div style={{ fontSize: 10, color: '#888', marginBottom: 8 }}>Zaznacz ręcznie ✓ lub ✗ przy każdym punkcie; w razie potrzeby dopisz uwagę.</div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #111', textAlign: 'left' }}>
            <th style={{ padding: '6px 8px', width: '58%' }}>Punkt kontrolny</th>
            <th style={{ padding: '6px 8px' }}>Uwagi</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} style={{ borderBottom: '1px solid #eee' }}>
              <td style={{ padding: '9px 8px', verticalAlign: 'top' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <span style={box} />
                  <span>{item}</span>
                </div>
              </td>
              <td style={{ padding: '9px 8px', borderLeft: '1px solid #eee', height: 30 }}>&nbsp;</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Pusta karta kontrolna do wydrukowania PRZED przeglądem — do zabrania na obchód
export function BlankChecklistSheet({ machine, docNumber, approvalDate }) {
  const checklist = machine.checklist_items || [];
  return (
    <PrintSheet>
      <ReportHeader title="Karta kontrolna przeglądu" docNumber={docNumber} approvalDate={approvalDate} />

      <h2 style={{ fontSize: 16, margin: '0 0 10px', fontFamily: 'Space Grotesk, sans-serif' }}>
        {machine.name}{machine.sequence_number ? ` (${machine.sequence_number})` : ''}
      </h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 20 }}>
        <tbody>
          <Row label="Kod urządzenia" value={machine.id} />
          <Row label="Nr seryjny" value={machine.serial_number || '—'} />
          <Row label="Lokalizacja" value={machine.location || '—'} />
          <Row label="Data przeglądu" value="…………………………" />
          <Row label="Wykonał" value="…………………………" />
        </tbody>
      </table>
      {checklist.length > 0 ? (
        <ChecklistTable items={checklist} />
      ) : (
        <p style={{ fontSize: 12, color: '#888', marginBottom: 20 }}>
          Ta maszyna nie ma jeszcze zdefiniowanej listy kontrolnej — dodaj punkty (lub przypisz szablon) w panelu administratora.
        </p>
      )}
      <div style={{ marginBottom: 24 }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 6 }}>UWAGI OGÓLNE</div>
        <div style={{ minHeight: 70, border: '1px solid #ccc', borderRadius: 6, padding: 10 }} />
      </div>

      <OverallResultBox />

      <div style={{ display: 'flex', marginTop: 30 }}>
        <Sign label="Podpis wykonującego" />
      </div>
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
      <ReportHeader title="Raport zbiorczy z przeglądów" docNumber="" approvalDate="" />
      <p style={{ fontSize: 13, color: '#555', marginTop: -10, marginBottom: 16 }}>
        {from || to ? `Okres: ${from ? fmtDate(from) : '...'} – ${to ? fmtDate(to) : '...'}` : 'Pełna historia'}
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
        <thead>
          <tr style={{ borderBottom: '1px solid #111', textAlign: 'left' }}>
            <Th>Data</Th><Th>Maszyna</Th><Th>Nr porządkowy</Th><Th>Lokalizacja</Th><Th>Wykonał</Th><Th>Wynik</Th><Th>Uwagi</Th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const m = machineById[r.machine_id];
            return (
              <tr key={r.id} style={{ borderBottom: '1px solid #ddd' }}>
                <Td>{fmtDate(r.date)}</Td>
                <Td>{m ? m.name : r.machine_id}</Td>
                <Td>{m ? (m.sequence_number || '—') : '—'}</Td>
                <Td>{m ? m.location : '—'}</Td>
                <Td>{r.technician_name}</Td>
                <Td>{r.result === 'ok' ? 'Sprawna' : 'Usterka'}</Td>
                <Td>{r.notes || '—'}</Td>
              </tr>
            );
          })}
          {rows.length === 0 && <tr><Td colSpan={7}>Brak przeglądów w wybranym okresie.</Td></tr>}
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
            <div style={{ fontWeight: 700, fontSize: 13, marginTop: 6 }}>
              {m.name}{m.sequence_number ? ` (${m.sequence_number})` : ''}
            </div>
            <div style={{ fontSize: 11, color: '#555' }}>{m.location || ''}</div>
            {m.serial_number && <div style={{ fontSize: 10, color: '#777' }}>SN: {m.serial_number}</div>}
            <div style={{ fontFamily: 'monospace', fontSize: 11, marginTop: 4 }}>{m.id}</div>
          </div>
        ))}
      </div>
    </PrintSheet>
  );
}
