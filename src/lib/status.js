export const INTERVAL_LABELS = {
  weekly: 'co tydzień',
  monthly: 'co miesiąc',
  custom: 'niestandardowy',
};

export function intervalDays(m) {
  if (m.interval_type === 'weekly') return 7;
  if (m.interval_type === 'monthly') return 30;
  return Number(m.custom_days) || 30;
}

export function computeStatus(machine, nowTs = Date.now()) {
  const days = intervalDays(machine);
  if (!machine.last_inspection_date) {
    const dueDate = new Date(machine.created_at);
    return { status: 'never', dueDate, daysLeft: Math.ceil((dueDate.getTime() - nowTs) / 86400000) };
  }
  const last = new Date(machine.last_inspection_date);
  const dueDate = new Date(last.getTime() + days * 86400000);
  const daysLeft = Math.ceil((dueDate.getTime() - nowTs) / 86400000);
  const soonThreshold = days <= 7 ? 1 : 3;
  let status = 'ok';
  if (daysLeft < 0) status = 'overdue';
  else if (daysLeft <= soonThreshold) status = 'soon';
  return { status, dueDate, daysLeft };
}

export const STATUS_META = {
  ok: { label: 'W terminie', className: 'badge-ok' },
  soon: { label: 'Zbliża się termin', className: 'badge-soon' },
  overdue: { label: 'Przeterminowany', className: 'badge-over' },
  never: { label: 'Brak przeglądu', className: 'badge-never' },
};

export function fmtDate(input) {
  if (!input) return '—';
  const d = new Date(input);
  return d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export function fmtDateTime(input) {
  if (!input) return '—';
  const d = new Date(input);
  return (
    d.toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', year: 'numeric' }) +
    ', ' +
    d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })
  );
}

export function isDueToday(machine) {
  const { status } = computeStatus(machine);
  return status === 'overdue' || status === 'soon' || status === 'never';
}

export function uid(prefix) {
  return `${prefix}-${Math.random().toString(36).slice(2, 6)}${Date.now().toString(36).slice(-4)}`.toUpperCase();
}

export function qrUrl(text, size = 220) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(text)}`;
}

// Własna lista (checklist_items) nadpisuje szablon, jeśli niepusta.
// W przeciwnym razie używane są punkty z przypisanego szablonu.
export function resolveChecklist(machine, templates) {
  if (machine.checklist_items && machine.checklist_items.length > 0) return machine.checklist_items;
  const tpl = templates?.find((t) => t.id === machine.checklist_template_id);
  return tpl?.items || [];
}
