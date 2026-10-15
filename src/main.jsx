import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Eye,
  FilePlus2,
  Loader2,
  LogOut,
  Plus,
  Save,
  Trash2,
  UploadCloud
} from 'lucide-react';
import './styles.css';
import { auth, firebaseReady } from './firebase';
import { createBlankProposal, defaultProposal, normalizeProposal } from './defaultProposal';
import {
  createProposal,
  deleteProposal,
  duplicateProposal,
  getProposalById,
  getPublicProposal,
  listProposals,
  updateProposal
} from './proposalService';
import { checkProposalStorage, uploadProposalMedia } from './mediaService';
import { getEmbed } from './mediaEmbed';
import { validatePublication } from './proposalValidation';
import { resolveProposalPeriod } from './proposalPeriod';
import { preserveVideoScripts, scriptedVideoEntries, videoPlanEntries } from './proposalScripts';
import { CONTENT_COUNTS, buildProductionCalendarExport, countProposalPieces, generateProposalCalendar, rearrangeProposalCalendar } from './proposalCalendar';

const emptyPillar = { label: '', title: '', text: '' };
const emptyReference = { pillar: '', title: '', handle: '', url: '', note: '' };
const emptyDeliverable = { label: '', value: '' };
const emptyPlan = { date: '', piece: '', type: '', pillar: '', topic: '', objective: '', status: '' };
const emptyStep = { title: '', text: '' };
const PALETTE_OPTIONS = [
  { value: 'wine', label: 'Euphoria vino', accent: '#8b1628', accentDark: '#5f1421', glow: 'rgba(139,22,40,.28)', glowSoft: 'rgba(139,22,40,.12)' },
  { value: 'black', label: 'Negro premium', accent: '#111111', accentDark: '#050505', glow: 'rgba(255,255,255,.10)', glowSoft: 'rgba(0,0,0,.14)' },
  { value: 'pink', label: 'Rosa', accent: '#db2777', accentDark: '#9d174d', glow: 'rgba(219,39,119,.30)', glowSoft: 'rgba(219,39,119,.13)' },
  { value: 'rose', label: 'Rosa suave', accent: '#e11d48', accentDark: '#9f1239', glow: 'rgba(225,29,72,.28)', glowSoft: 'rgba(225,29,72,.12)' },
  { value: 'orange', label: 'Naranja', accent: '#ea580c', accentDark: '#9a3412', glow: 'rgba(234,88,12,.30)', glowSoft: 'rgba(234,88,12,.13)' },
  { value: 'amber', label: 'Dorado', accent: '#a16207', accentDark: '#854d0e', glow: 'rgba(161,98,7,.28)', glowSoft: 'rgba(161,98,7,.12)' },
  { value: 'green', label: 'Verde', accent: '#16a34a', accentDark: '#166534', glow: 'rgba(22,163,74,.28)', glowSoft: 'rgba(22,163,74,.12)' },
  { value: 'emerald', label: 'Esmeralda', accent: '#0f766e', accentDark: '#115e59', glow: 'rgba(15,118,110,.28)', glowSoft: 'rgba(15,118,110,.12)' },
  { value: 'blue', label: 'Azul profundo', accent: '#2563eb', accentDark: '#1e3a8a', glow: 'rgba(37,99,235,.30)', glowSoft: 'rgba(37,99,235,.13)' },
  { value: 'cyan', label: 'Azul cielo', accent: '#0284c7', accentDark: '#075985', glow: 'rgba(2,132,199,.28)', glowSoft: 'rgba(2,132,199,.12)' },
  { value: 'purple', label: 'Morado', accent: '#7c3aed', accentDark: '#5b21b6', glow: 'rgba(124,58,237,.30)', glowSoft: 'rgba(124,58,237,.13)' },
  { value: 'fuchsia', label: 'Fucsia', accent: '#c026d3', accentDark: '#86198f', glow: 'rgba(192,38,211,.30)', glowSoft: 'rgba(192,38,211,.13)' },
  { value: 'custom', label: 'Color personalizado', accent: '#8b1628', accentDark: '#5f1421', glow: 'rgba(139,22,40,.28)', glowSoft: 'rgba(139,22,40,.12)' }
];

function getPalette(option) {
  return PALETTE_OPTIONS.find(item => item.value === option) || PALETTE_OPTIONS[0];
}

function normalizeHexColor(value = '', fallback = '#8b1628') {
  const raw = String(value || '').trim();
  const withHash = raw.startsWith('#') ? raw : `#${raw}`;
  return /^#[0-9a-fA-F]{6}$/.test(withHash) ? withHash.toLowerCase() : fallback;
}

function hexToRgba(hex = '#8b1628', alpha = 0.28, fallback = '#8b1628') {
  const normalized = normalizeHexColor(hex, fallback);
  const clean = normalized.replace('#', '');
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

function contrastTextFor(hex) {
  const color = normalizeHexColor(hex);
  const channels = [1, 3, 5].map(start => {
    const value = parseInt(color.slice(start, start + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  const luminance = channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  const darkTextLuminance = 0.005605;
  return 1.05 / (luminance + 0.05) >= (luminance + 0.05) / (darkTextLuminance + 0.05) ? '#fff' : '#111';
}

function getThemeVars(themePreset, customAccent = '#8b1628', customAccentDark = '') {
  const base = getPalette(themePreset);
  const isCustom = themePreset === 'custom';
  const accent = isCustom ? normalizeHexColor(customAccent, base.accent) : base.accent;
  const accentDark = isCustom ? normalizeHexColor(customAccentDark || customAccent, base.accentDark) : base.accentDark;
  const glow = isCustom ? hexToRgba(accent, 0.30, base.accent) : base.glow;
  const glowSoft = isCustom ? hexToRgba(accent, 0.13, base.accent) : (base.glowSoft || base.glow);
  const darkGlow = isCustom ? hexToRgba(accentDark, 0.32, base.accentDark) : hexToRgba(base.accentDark, 0.32, base.accentDark);
  return {
    '--red': accent,
    '--red-deep': accentDark,
    '--gold': accent,
    '--lux-red': accent,
    '--lux-red-deep': accentDark,
    '--calendar-video-text': contrastTextFor(accent),
    '--accent-shadow': hexToRgba(accent, 0.24, base.accent),
    '--accent-dark-shadow': hexToRgba(accentDark, 0.22, base.accentDark),
    '--hero-glow': glow,
    '--hero-glow-soft': glowSoft,
    '--hero-dark-glow': darkGlow
  };
}

function parseLocalDate(value) {
  if (!value) return null;
  const [year, month, day] = String(value).split('-').map(Number);
  if (!year || !month || !day) return null;
  return new Date(year, month - 1, day);
}

function formatMonthShort(date) {
  return new Intl.DateTimeFormat('es-MX', { month: 'short' }).format(date).replace('.', '').toUpperCase();
}

function formatDateRange(dates = []) {
  if (!dates.length) return 'Vista editorial del primer ciclo mensual';
  const formatter = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' });
  const sorted = [...dates].sort((a, b) => a - b);
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  if (first.toDateString() === last.toDateString()) return formatter.format(first);
  return `${formatter.format(first)} al ${formatter.format(last)}`;
}

function countPublicationDays(items = []) {
  const days = new Set(
    items
      .map(item => item?.date)
      .filter(Boolean)
      .map(value => normalizeDateValue(value))
      .filter(Boolean)
  );
  return days.size;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function normalizeKey(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

function normalizeDateValue(value) {
  if (!value) return '';
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  const raw = String(value).trim();
  if (!raw) return '';
  const iso = raw.match(/(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
  if (iso) return `${iso[1]}-${String(iso[2]).padStart(2, '0')}-${String(iso[3]).padStart(2, '0')}`;
  const latam = raw.match(/(\d{1,2})[-/](\d{1,2})[-/](20\d{2})/);
  if (latam) return `${latam[3]}-${String(latam[2]).padStart(2, '0')}-${String(latam[1]).padStart(2, '0')}`;
  return '';
}

function pickField(item, keys = []) {
  if (!item || typeof item !== 'object') return '';
  const normalized = Object.fromEntries(Object.entries(item).map(([key, value]) => [normalizeKey(key), value]));
  for (const key of keys) {
    const value = normalized[normalizeKey(key)];
    if (value !== undefined && value !== null && String(value).trim() !== '') return String(value).trim();
  }
  return '';
}

function findCalendarArray(data) {
  if (Array.isArray(data)) return data;
  if (!data || typeof data !== 'object') return [];
  const candidates = ['monthPlan', 'calendar', 'calendario', 'calendarItems', 'items', 'events', 'posts', 'publications', 'content', 'pieces', 'piezas'];
  for (const key of candidates) {
    if (Array.isArray(data[key])) return data[key];
  }
  for (const value of Object.values(data)) {
    if (Array.isArray(value) && value.some(item => item && typeof item === 'object')) return value;
  }
  return [];
}

function parseCSVRows(raw = '') {
  const lines = raw.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const delimiter = raw.includes('\t') ? '\t' : ',';
  const split = (line) => line.split(delimiter).map(cell => cell.trim().replace(/^"|"$/g, ''));
  const headers = split(lines[0]);
  return lines.slice(1).map(line => {
    const cells = split(line);
    return Object.fromEntries(headers.map((header, index) => [header, cells[index] || '']));
  });
}

function deliverableLabelForType(type = '') {
  const clean = normalizeKey(type);
  if (clean.includes('reel') || clean.includes('video')) return 'Reels mensuales';
  if (clean.includes('foto') || clean.includes('photo')) return 'Fotos profesionales';
  if (clean.includes('post')) return 'Posts variados';
  if (clean.includes('carrusel') || clean.includes('carousel')) return 'Carruseles';
  if (clean.includes('promo') || clean.includes('ugc')) return 'Promocional / UGC';
  return type || 'Piezas';
}

function deliverablesFromTotals(totals = {}, items = []) {
  const byType = totals.byType || items.reduce((acc, item) => {
    const type = item.type || item.piece || 'Pieza';
    acc[type] = (acc[type] || 0) + 1;
    return acc;
  }, {});
  return Object.entries(byType).map(([type, value]) => ({
    label: deliverableLabelForType(type),
    value: String(value)
  }));
}

function normalizeEuphoriaOSExport(data = {}) {
  const rows = Array.isArray(data.items) ? data.items : [];
  const items = rows.map((item, index) => {
    const type = pickField(item, ['type', 'tipo', 'contentType']) || pickField(item, ['piece', 'pieza']) || 'Pieza';
    return {
      date: normalizeDateValue(pickField(item, ['date', 'fecha', 'dueDate', 'publishDate', 'publicationDate'])),
      piece: pickField(item, ['piece', 'pieza']) || `${type} ${index + 1}`,
      type,
      pillar: pickField(item, ['pillar', 'pilar', 'contentPillar', 'category', 'categoria']),
      topic: pickField(item, ['title', 'titulo', 'topic', 'tema', 'name', 'nombre']) || `${type} ${index + 1}`,
      objective: pickField(item, ['objective', 'objetivo', 'goal', 'meta', 'purpose', 'proposito']),
      status: pickField(item, ['status', 'estado'])
    };
  }).filter(item => item.date || item.piece || item.topic);

  return {
    source: 'Euphoria OS',
    client: data.client || null,
    period: data.period || null,
    totals: data.totals || null,
    deliverables: deliverablesFromTotals(data.totals || {}, items),
    items
  };
}

function normalizeGenericCalendarRows(rows = []) {
  const items = rows
    .map((item, index) => {
      const type = pickField(item, ['type', 'tipo', 'format', 'formato', 'contentType']);
      return {
        date: normalizeDateValue(pickField(item, ['date', 'fecha', 'fechaPublicacion', 'publishDate', 'publicationDate', 'scheduledDate', 'start', 'startDate', 'day'])),
        piece: pickField(item, ['piece', 'pieza', 'format', 'formato']) || (type ? `${type} ${index + 1}` : `Pieza ${index + 1}`),
        type,
        pillar: pickField(item, ['pillar', 'pilar', 'category', 'categoria', 'contentPillar', 'linea', 'lineaContenido']),
        topic: pickField(item, ['topic', 'tema', 'subject', 'asunto', 'title', 'titulo', 'idea', 'concept', 'concepto', 'caption', 'copy', 'name', 'nombre']),
        objective: pickField(item, ['objective', 'objetivo', 'goal', 'meta', 'purpose', 'proposito', 'description', 'descripcion']),
        status: pickField(item, ['status', 'estado'])
      };
    })
    .filter(item => item.date || item.piece || item.topic || item.objective);

  return {
    source: 'Importación manual',
    client: null,
    period: null,
    totals: null,
    deliverables: deliverablesFromTotals({}, items),
    items
  };
}

function normalizeCalendarImport(raw = '') {
  const value = String(raw || '').trim();
  if (!value) return { items: [], deliverables: [], source: '' };
  try {
    const parsed = JSON.parse(value);
    if (parsed?.schemaVersion === 'euphoria_calendar_export_v1' || parsed?.source === 'Euphoria OS') {
      return normalizeEuphoriaOSExport(parsed);
    }
    return normalizeGenericCalendarRows(findCalendarArray(parsed));
  } catch {
    return normalizeGenericCalendarRows(parseCSVRows(value));
  }
}

function App() {
  const path = window.location.pathname;
  if (path === '/demo' && !firebaseReady) return <ProposalPage proposal={defaultProposal} />;
  if (path.startsWith('/p/')) return <PublicProposal slug={path.replace('/p/', '').replace(/\/$/, '')} />;
  if (path.startsWith('/admin/edit/')) return <AdminGate><ProposalEditor id={path.replace('/admin/edit/', '').replace(/\/$/, '')} /></AdminGate>;
  if (path.startsWith('/admin')) return <AdminGate><Dashboard /></AdminGate>;
  return <Home />;
}

function Home() {
  return (
    <div className="home-shell">
      <div className="home-card">
        <div className="brand-mark">Euphoria<span>.</span></div>
        <p className="eyebrow-red">Propuestas de contenido</p>
        <h1>Tu propuesta de Euphoria</h1>
        <p>Abre el enlace personalizado que te compartimos para consultar tu propuesta.</p>
        <div className="home-actions">
          <a className="plain-link" href="/admin">Acceso al equipo</a>
          {!firebaseReady && <a className="btn btn-ghost" href="/demo">Ver ejemplo</a>}
        </div>
      </div>
    </div>
  );
}

function AdminGate({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!firebaseReady);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!firebaseReady) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setReady(true);
    });
    return unsub;
  }, []);

  if (!ready) return <LoadingScreen label="Cargando acceso" />;
  if (!firebaseReady) return <DemoNotice>{children}</DemoNotice>;
  if (user) return <>{children}</>;

  async function submit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError('No se pudo iniciar sesión. Revisa email, contraseña y que Auth esté habilitado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-shell">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark">Euphoria<span>.</span></div>
        <h1>Acceso interno</h1>
        <p>Inicia sesión para crear, editar y publicar propuestas.</p>
        <label>Email<input value={email} onChange={e => setEmail(e.target.value)} type="email" required /></label>
        <label>Contraseña<input value={password} onChange={e => setPassword(e.target.value)} type="password" required /></label>
        {error && <div className="error-box">{error}</div>}
        <button className="btn btn-primary full" disabled={loading}>{loading ? <Loader2 className="spin" size={16} /> : null} Entrar</button>
      </form>
    </div>
  );
}

function DemoNotice({ children }) {
  return (
    <>
      <div className="demo-banner">
        Modo demo local: todavía no hay Firebase conectado. Puedes probar el flujo en este navegador, pero para URLs públicas reales hay que configurar Firebase.
      </div>
      {children}
    </>
  );
}

function LoadingScreen({ label }) {
  return <div className="loading"><Loader2 className="spin" /> {label}...</div>;
}

function Dashboard() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function refresh() {
    setLoading(true);
    setError('');
    try {
      setItems(await listProposals());
    } catch {
      setError('No se pudieron cargar las propuestas. Revisa tu acceso y la conexión con Firebase.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { refresh(); }, []);

  async function createNew() {
    try {
      const id = await createProposal(createBlankProposal());
      window.location.href = `/admin/edit/${id}`;
    } catch {
      setError('No se pudo crear la propuesta. Revisa los permisos de Firebase.');
    }
  }

  async function seedExample() {
    const exists = items.some(i => i.slug === 'dra-mabel-limon');
    if (exists) return;
    try {
      await createProposal(defaultProposal);
      await refresh();
    } catch {
      setError('No se pudo cargar el ejemplo. Revisa los permisos de Firebase.');
    }
  }

  async function duplicate(item) {
    try {
      const id = await duplicateProposal(item);
      window.location.href = `/admin/edit/${id}`;
    } catch {
      setError('No se pudo duplicar la propuesta.');
    }
  }

  async function remove(id) {
    const ok = confirm('¿Seguro que quieres eliminar esta propuesta?');
    if (!ok) return;
    try {
      await deleteProposal(id);
      await refresh();
    } catch {
      setError('No se pudo eliminar la propuesta. Revisa tu acceso a Firebase.');
    }
  }

  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="admin-main">
        <div className="admin-title-row">
          <div>
            <p className="eyebrow-red">Panel interno</p>
            <h1>Propuestas</h1>
            <p className="muted">Crea propuestas, duplica plantillas y publica una URL única para cada cliente.</p>
          </div>
          <div className="row gap">
            <button className="btn btn-secondary" onClick={seedExample}>Cargar ejemplo Mabel</button>
            <button className="btn btn-primary" onClick={createNew}><FilePlus2 size={16} /> Nueva propuesta</button>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}
        {loading ? <LoadingScreen label="Cargando propuestas" /> : (
          <div className="proposal-list">
            {items.length === 0 && <div className="empty-state">No hay propuestas todavía. Crea una nueva o carga el ejemplo de la Dra. Mabel.</div>}
            {items.map(item => (
              <article className="proposal-row" key={item.id}>
                <div>
                  <div className="proposal-status">{item.status === 'published' ? 'Publicada' : 'Borrador'}</div>
                  <h3>{item.clientName || 'Sin nombre'}</h3>
                  <p>{item.heroEyebrow || item.vertical || 'Propuesta'} · {(() => { const period = resolveProposalPeriod(item); return period.start && period.end ? `${period.start} → ${period.end}` : 'Calendario pendiente'; })()}</p>
                </div>
                <div className="row gap wrap-row">
                  <a className="icon-btn" title="Editar" href={`/admin/edit/${item.id}`}><Save size={17} /> Editar</a>
                  {item.status === 'published' && <a className="icon-btn" title="Abrir enlace público" href={`/p/${item.id}`} target="_blank" rel="noreferrer"><ExternalLink size={17} /> Ver</a>}
                  <button className="icon-btn" onClick={() => duplicate(item)}><Copy size={17} /> Duplicar</button>
                  <button className="icon-btn danger" onClick={() => remove(item.id)}><Trash2 size={17} /> Eliminar</button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function AdminHeader() {
  return (
    <header className="admin-header">
      <a className="brand-mark small" href="/admin">Euphoria<span>.</span></a>
      <div className="row gap">
        <a className="plain-link" href="/" target="_blank">Inicio</a>
        {firebaseReady && <button className="plain-link" onClick={() => signOut(auth)}><LogOut size={15} /> Salir</button>}
      </div>
    </header>
  );
}

function ProposalEditor({ id }) {
  const [proposal, setProposal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [loadError, setLoadError] = useState('');
  const [activeUpload, setActiveUpload] = useState(null);
  const [storageCheck, setStorageCheck] = useState(null);
  const [calendarMessage, setCalendarMessage] = useState('');

  useEffect(() => {
    getProposalById(id).then((data) => {
      if (!data) {
        setLoadError('No encontramos esta propuesta. Vuelve al panel y ábrela desde la lista.');
      } else {
        setProposal(normalizeProposal(data));
      }
    }).catch(() => setLoadError('No se pudo abrir la propuesta. Revisa tu acceso a Firebase.'));
  }, [id]);

  async function refreshStorageCheck() {
    setStorageCheck({ state: 'checking' });
    setStorageCheck(await checkProposalStorage());
  }

  useEffect(() => { refreshStorageCheck(); }, []);

  function updateField(field, value) {
    setProposal(prev => ({ ...prev, [field]: value }));
  }

  function updateArray(name, index, field, value) {
    setProposal(prev => ({
      ...prev,
      [name]: prev[name].map((item, i) => i === index ? { ...item, [field]: value } : item)
    }));
  }

  function addArray(name, item) {
    setProposal(prev => ({ ...prev, [name]: [...prev[name], item] }));
  }

  function removeArray(name, index) {
    setProposal(prev => ({ ...prev, [name]: prev[name].filter((_, i) => i !== index) }));
  }

  function planCalendar(action) {
    try {
      const result = action === 'generate'
        ? generateProposalCalendar(proposal)
        : rearrangeProposalCalendar(proposal, Math.floor(Math.random() * 1_000_000) + 1);
      setProposal(prev => ({ ...prev, monthPlan: result.items }));
      setCalendarMessage(action === 'generate'
        ? result.added ? `${result.added} piezas agregadas. Revisa temas y fechas antes de guardar.` : 'Las cantidades ya están cubiertas. No se modificó ninguna pieza.'
        : result.changed ? 'Fechas reacomodadas. Los títulos y guiones permanecen en sus piezas.' : 'No hay otros días disponibles en este periodo.');
    } catch (error) {
      setCalendarMessage(error.message);
    }
  }

  function exportToProduction() {
    try {
      const data = buildProductionCalendarExport({ ...proposal, id });
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      const name = String(proposal.clientName).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_|_$/g, '') || 'cliente';
      link.href = url;
      link.download = `propuesta_a_produccion_${name}_${data.period.startDate}_${data.period.endDate}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      setCalendarMessage(`Archivo de ${data.items.length} piezas descargado. Impórtalo en el ciclo de este cliente en Euphoria Producción.`);
    } catch (error) {
      setCalendarMessage(error.message);
    }
  }

  async function save(status = proposal.status) {
    if (status === 'published') {
      const error = validatePublication(proposal);
      if (error) {
        setMessage(error);
        return;
      }
    }
    setSaving(true);
    setMessage('');
    const payload = { ...proposal, status };
    delete payload.id;
    try {
      await updateProposal(id, payload);
      setProposal(prev => ({ ...prev, ...payload }));
      setMessage(status === 'published' ? 'Cambios publicados.' : 'Cambios guardados.');
    } catch (err) {
      setMessage('Error al guardar. Revisa Firebase o conexión.');
    } finally {
      setSaving(false);
    }
  }

  if (loadError) return <div className="not-found"><h1>{loadError}</h1><a href="/admin">Volver al panel</a></div>;
  if (!proposal) return <LoadingScreen label="Abriendo editor" />;

  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="editor-layout">
        <section className="editor-panel">
          <div className="editor-topbar">
            <a className="plain-link" href="/admin"><ArrowLeft size={16} /> Volver</a>
            <div className="row gap">
              {proposal.status === 'published' && <a className="btn btn-secondary" href={`/p/${id}`} target="_blank" rel="noreferrer"><Eye size={16} /> Ver enlace</a>}
              <button className="btn btn-secondary" disabled={saving || Boolean(activeUpload)} onClick={() => save()}><Save size={16} /> Guardar</button>
              <button className="btn btn-primary" disabled={saving || Boolean(activeUpload)} onClick={() => save('published')}>{saving ? <Loader2 className="spin" size={16} /> : null} {proposal.status === 'published' ? 'Actualizar publicación' : 'Publicar'}</button>
            </div>
          </div>
          {activeUpload && <div className="editor-upload-notice">Espera a que termine o cancela la subida antes de guardar.</div>}
          {message && <div className="save-message">{message}</div>}
          {storageCheck?.state === 'missing' && <div className="editor-storage-notice">
            <strong>Las cargas de archivos todavía no funcionan.</strong>
            <p>{storageCheck.message} Puedes seguir con enlaces de YouTube, Vimeo o Dropbox.</p>
            <a href="https://console.firebase.google.com/project/propuestas-euphoria/storage" target="_blank" rel="noreferrer">Abrir Storage del proyecto</a>
            <button type="button" onClick={refreshStorageCheck}>Volver a comprobar</button>
          </div>}

          <EditorSection title="Portada y estilo">
            <Input label="Nombre del cliente" value={proposal.clientName} onChange={v => updateField('clientName', v)} />
            <Input label="Etiqueta de portada" value={proposal.heroEyebrow} onChange={v => updateField('heroEyebrow', v)} hint="Escribe «Ciclo 2 · noviembre» o el texto que quieras. No se agregan fechas automáticamente." />
            <SelectField label="Paleta de acento" value={proposal.themePreset || 'wine'} onChange={v => updateField('themePreset', v)} options={PALETTE_OPTIONS.map(item => ({ value: item.value, label: item.label }))} />
            {proposal.themePreset === 'custom' && (
              <>
                <ColorField label="Color principal" value={proposal.customAccent || '#8b1628'} onChange={v => updateField('customAccent', v)} />
                <ColorField label="Color oscuro" value={proposal.customAccentDark || proposal.customAccent || '#5f1421'} onChange={v => updateField('customAccentDark', v)} />
              </>
            )}
            <div className="hero-media-admin-grid single">
              <div className="hero-media-admin-card featured">
                <h4>Visual principal de portada (opcional)</h4>
                <Input label="URL de imagen/video" value={proposal.heroMediaUrl || ''} onChange={v => updateField('heroMediaUrl', v)} hint="También puedes pegar un enlace de YouTube o Vimeo." />
                <MediaUploader
                  label="Subir visual principal"
                  proposalId={proposal.id || proposal.slug}
                  uploadKey="cover-main"
                  activeUpload={activeUpload}
                  setActiveUpload={setActiveUpload}
                  storageUnavailable={storageCheck?.state === 'missing'}
                  onUploaded={url => updateField('heroMediaUrl', url)}
                />
              </div>
            </div>
            <details className="editor-extra">
              <summary>Más opciones de portada</summary>
              <div className="field-grid">
                <SelectField label="Tipo de propuesta" value={proposal.proposalType || 'monthly'} onChange={v => updateField('proposalType', v)} options={[{ value: 'monthly', label: 'Ciclo mensual' }, { value: 'initial', label: 'Primera propuesta · estrategia completa' }]} />
                <Input label="Nombre en portada, si es distinto" value={proposal.clientDisplayName} onChange={v => updateField('clientDisplayName', v)} />
                <Input label="Vertical / giro" value={proposal.vertical} onChange={v => updateField('vertical', v)} />
                <Input label="Ciudad" value={proposal.city} onChange={v => updateField('city', v)} />
                <Textarea label="Frase de portada (opcional)" value={proposal.positioning} onChange={v => updateField('positioning', v)} />
              </div>
              <div className="hero-media-admin-grid side">
                <div className="hero-media-admin-card">
                <h4>Visual izquierdo (opcional)</h4>
                <Input label="URL de imagen/video" value={proposal.heroMediaBackUrl || ''} onChange={v => updateField('heroMediaBackUrl', v)} hint="Se muestra atrás/izquierda. Si lo dejas vacío, usa la referencia visual 2." />
                <MediaUploader
                  label="Subir visual izquierdo"
                  proposalId={proposal.id || proposal.slug}
                  uploadKey="cover-left"
                  activeUpload={activeUpload}
                  setActiveUpload={setActiveUpload}
                  storageUnavailable={storageCheck?.state === 'missing'}
                  onUploaded={url => updateField('heroMediaBackUrl', url)}
                />
              </div>
              <div className="hero-media-admin-card">
                <h4>Visual derecho (opcional)</h4>
                <Input label="URL de imagen/video" value={proposal.heroMediaFrontUrl || ''} onChange={v => updateField('heroMediaFrontUrl', v)} hint="Se muestra atrás/derecha. Si lo dejas vacío, usa la referencia visual 3." />
                <MediaUploader
                  label="Subir visual derecho"
                  proposalId={proposal.id || proposal.slug}
                  uploadKey="cover-right"
                  activeUpload={activeUpload}
                  setActiveUpload={setActiveUpload}
                  storageUnavailable={storageCheck?.state === 'missing'}
                  onUploaded={url => updateField('heroMediaFrontUrl', url)}
                />
              </div>
            </div>
            </details>
          </EditorSection>

          <EditorSection title={proposal.proposalType === 'initial' ? 'Enfoque inicial' : 'Enfoque del mes'} hint="Esta sección aparece en la vista previa cuando escribes un título o una explicación.">
            <Input label="Título del enfoque" value={proposal.strategyTitle} onChange={v => updateField('strategyTitle', v)} />
            <Textarea label="Qué haremos y por qué" value={proposal.strategyText} onChange={v => updateField('strategyText', v)} />
            {proposal.proposalType === 'initial' && <>
              <Textarea label="Texto de Autoridad" value={proposal.diagnosisText} onChange={v => updateField('diagnosisText', v)} />
              <Textarea label="Texto de Confianza" value={proposal.audienceNeeds} onChange={v => updateField('audienceNeeds', v)} />
              <Textarea label="Texto de Agenda" value={proposal.agendaText || ''} onChange={v => updateField('agendaText', v)} />
            </>}
          </EditorSection>

          {proposal.proposalType === 'initial' && <>
            <EditorSection title="02 · Sistema de contenido">
              <Input label="Título visible al cliente" value={proposal.systemTitle || ''} onChange={v => updateField('systemTitle', v)} />
              <Textarea label="Descripción" value={proposal.creativeApproach} onChange={v => updateField('creativeApproach', v)} />
            </EditorSection>

            <ArraySection title="02 · Pilares de contenido" items={proposal.pillars} add={() => addArray('pillars', emptyPillar)}>
            {proposal.pillars.map((item, i) => (
              <div className="array-card" key={i}>
                <div className="array-head"><b>Pilar {i + 1}</b><button onClick={() => removeArray('pillars', i)}><Trash2 size={15} /></button></div>
                <Input label="Etiqueta" value={item.label} onChange={v => updateArray('pillars', i, 'label', v)} />
                <Input label="Título" value={item.title} onChange={v => updateArray('pillars', i, 'title', v)} />
                <Textarea label="Descripción" value={item.text} onChange={v => updateArray('pillars', i, 'text', v)} />
              </div>
            ))}
            </ArraySection>
          </>}

          <ArraySection
            title="Referencias (opcional)"
            add={() => addArray('references', emptyReference)}
            hint="Aparecen en la vista previa cuando agregas una referencia con título o enlace."
            options={<>
              <Input label="Título de la sección" value={proposal.visualTitle || ''} onChange={v => updateField('visualTitle', v)} />
              <Textarea label="Introducción (opcional)" value={proposal.visualIntro || ''} onChange={v => updateField('visualIntro', v)} />
            </>}
          >
            {proposal.references.map((item, i) => (
              <div className="array-card" key={i}>
                <div className="array-head"><b>Referencia {i + 1}</b><button onClick={() => removeArray('references', i)}><Trash2 size={15} /></button></div>
                <Input label="Título" value={item.title} onChange={v => updateArray('references', i, 'title', v)} />
                <Input label="URL de imagen/video" value={item.url} onChange={v => updateArray('references', i, 'url', v)} hint="YouTube/Vimeo se reproducen aquí; Dropbox/Drive se abren por enlace." />
                <MediaUploader
                  label="Subir imagen/video de referencia"
                  proposalId={proposal.id || proposal.slug}
                  uploadKey={`reference-${i}`}
                  activeUpload={activeUpload}
                  setActiveUpload={setActiveUpload}
                  storageUnavailable={storageCheck?.state === 'missing'}
                  onUploaded={url => updateArray('references', i, 'url', url)}
                />
                <details className="item-options">
                  <summary>Contexto de la referencia (opcional)</summary>
                  <Input label="Categoría" value={item.pillar} onChange={v => updateArray('references', i, 'pillar', v)} />
                  <Textarea label="Qué nos gusta" value={item.note} onChange={v => updateArray('references', i, 'note', v)} />
                </details>
              </div>
            ))}
          </ArraySection>

          <ArraySection
            title="Qué incluye"
            add={() => addArray('deliverables', emptyDeliverable)}
            hint="Aparece en la vista previa cuando agregas un entregable."
            options={<Input label="Título de la sección" value={proposal.deliverablesTitle || ''} onChange={v => updateField('deliverablesTitle', v)} />}
          >
            {proposal.deliverables.map((item, i) => (
              <div className="two-col array-line" key={i}>
                <Input label="Entregable" value={item.label} onChange={v => updateArray('deliverables', i, 'label', v)} />
                <Input label="Cantidad / detalle" value={item.value} onChange={v => updateArray('deliverables', i, 'value', v)} />
                <button className="mini-trash" onClick={() => removeArray('deliverables', i)}><Trash2 size={15} /></button>
              </div>
            ))}
          </ArraySection>

          <ArraySection
            title="Calendario editorial"
            add={() => addArray('monthPlan', emptyPlan)}
            hint="Define las cantidades y el periodo. Genera el primer calendario aquí; después podrás mover fechas o editar cada pieza."
            options={<>
              <Input label="Título de la sección" value={proposal.calendarTitle || ''} onChange={v => updateField('calendarTitle', v)} />
              <Textarea label="Introducción (opcional)" value={proposal.calendarIntro || ''} onChange={v => updateField('calendarIntro', v)} />
            </>}
          >
            <div className="calendar-planner-panel">
              <div className="calendar-planner-range">
                <Input label="Inicio del calendario" type="date" value={proposal.periodStart || resolveProposalPeriod(proposal).start} onChange={v => updateField('periodStart', v)} />
                <Input label="Fin del calendario" type="date" value={proposal.periodEnd || resolveProposalPeriod(proposal).end} onChange={v => updateField('periodEnd', v)} />
              </div>
              <div className="calendar-planner-counts">
                {CONTENT_COUNTS.map(([key, label]) => <Input key={key} label={label} type="number" min="0" max="400" value={proposal.contentCounts?.[key] ?? 0} onChange={v => updateField('contentCounts', { ...proposal.contentCounts, [key]: v })} />)}
              </div>
              <div className="calendar-planner-actions">
                <button type="button" className="btn btn-primary" onClick={() => planCalendar('generate')}>Generar calendario</button>
                <button type="button" className="btn btn-secondary" onClick={() => planCalendar('rearrange')}>Reacomodar fechas</button>
                <button type="button" className="btn btn-secondary" onClick={exportToProduction}>Exportar a Producción</button>
              </div>
              {calendarMessage && <p className="calendar-planner-message" role="status">{calendarMessage}</p>}
              <p className="muted">Cada pieza conserva su tema y guion al cambiar de día. El archivo solo crea el calendario inicial en Producción; allí podrás editarlo después.</p>
            </div>
            <details className="item-options calendar-import">
              <summary>Importar JSON de Euphoria OS</summary>
              <CalendarImporter
                onImport={(result) => {
                  const items = Array.isArray(result) ? result : result.items;
                  const next = { monthPlan: items || [] };
                  if (result?.source) next.calendarImportSource = result.source;
                  if (result?.period) next.calendarImportPeriod = result.period;
                  setProposal(prev => {
                    const monthPlan = preserveVideoScripts(prev.monthPlan, next.monthPlan);
                    return { ...prev, ...next, monthPlan, contentCounts: countProposalPieces(monthPlan) };
                  });
                }}
                existingCount={(proposal.monthPlan || []).length}
              />
            </details>
            {proposal.monthPlan.map((item, i) => (
              <div className="array-card" key={i}>
                <div className="array-head"><b>Pieza del calendario {i + 1}</b><button onClick={() => removeArray('monthPlan', i)}><Trash2 size={15} /></button></div>
                <Input label="Fecha de publicación" type="date" value={item.date || ''} onChange={v => updateArray('monthPlan', i, 'date', v)} />
                <Input label="Pieza (Reel 1, Post 1…)" value={item.piece} onChange={v => updateArray('monthPlan', i, 'piece', v)} />
                <Input label="Tema" value={item.topic} onChange={v => updateArray('monthPlan', i, 'topic', v)} />
                <details className="item-options">
                  <summary>Detalles de esta pieza (opcional)</summary>
                  <Input label="Tipo" value={item.type || ''} onChange={v => updateArray('monthPlan', i, 'type', v)} />
                  <Input label="Categoría" value={item.pillar} onChange={v => updateArray('monthPlan', i, 'pillar', v)} />
                  <Input label="Objetivo" value={item.objective} onChange={v => updateArray('monthPlan', i, 'objective', v)} />
                </details>
              </div>
            ))}
          </ArraySection>

          <EditorSection title="Guiones y estructuras" hint="Usa los videos del calendario. El título y la fecha son los mismos en ambas secciones; solo se mostrará al cliente una pieza cuando agregues su guion o secuencia visual.">
            <Input label="Título visible de la sección" value={proposal.scriptsTitle || ''} onChange={v => updateField('scriptsTitle', v)} />
            <div className="script-editor-list">
              {videoPlanEntries(proposal.monthPlan).length === 0 && <p className="muted">Primero agrega al calendario una pieza llamada Reel o Video (también acepta UGC y Clip).</p>}
              {videoPlanEntries(proposal.monthPlan).map(item => (
                <article className="script-editor-card" key={item.index}>
                  <div className="script-editor-head"><b>{item.piece || `Video ${item.index + 1}`}</b><span>{item.date || 'Sin fecha'}</span></div>
                  <Input label="Título / tema" value={item.topic || ''} onChange={v => updateArray('monthPlan', item.index, 'topic', v)} />
                  <SelectField label="Formato" value={item.scriptMode || 'voice'} onChange={v => updateArray('monthPlan', item.index, 'scriptMode', v)} options={[{ value: 'voice', label: 'Con voz · guion hablado' }, { value: 'visual', label: 'Sin voz · secuencia visual' }]} />
                  <Textarea label={item.scriptMode === 'visual' ? 'Secuencia visual y textos en pantalla' : 'Guion o estructura del video'} value={item.scriptText || ''} onChange={v => updateArray('monthPlan', item.index, 'scriptText', v)} rows={7} maxLength={8000} hint={item.scriptMode === 'visual' ? 'Describe los planos, acciones, textos y cierre.' : 'Puedes separar apertura, desarrollo y cierre en párrafos.'} />
                </article>
              ))}
            </div>
          </EditorSection>

          {proposal.proposalType === 'initial' && <>
            <EditorSection title="Siguiente movimiento">
              <Input label="Título visible al cliente" value={proposal.stepsTitle || ''} onChange={v => updateField('stepsTitle', v)} />
            </EditorSection>
            <ArraySection title="Pasos" items={proposal.steps} add={() => addArray('steps', emptyStep)}>
            {proposal.steps.map((item, i) => (
              <div className="array-card" key={i}>
                <div className="array-head"><b>Paso {i + 1}</b><button onClick={() => removeArray('steps', i)}><Trash2 size={15} /></button></div>
                <Input label="Título" value={item.title} onChange={v => updateArray('steps', i, 'title', v)} />
                <Textarea label="Descripción" value={item.text} onChange={v => updateArray('steps', i, 'text', v)} />
              </div>
            ))}
            </ArraySection>
          </>}

          <details className="editor-section editor-optional">
            <summary>Cierre (opcional)</summary>
            <div className="field-grid">
              <Input label="Título final" value={proposal.ctaTitle} onChange={v => updateField('ctaTitle', v)} />
              <Textarea label="Texto final" value={proposal.ctaText} onChange={v => updateField('ctaText', v)} />
            </div>
          </details>
        </section>

        <aside className="preview-panel">
          <p className="preview-explain">Vista previa · las secciones se muestran cuando agregas contenido.</p>
          <ProposalPage proposal={proposal} compact />
        </aside>
      </main>
    </div>
  );
}

function EditorSection({ title, children, hint }) {
  return <section className="editor-section"><h2>{title}</h2>{hint && <p className="editor-hint">{hint}</p>}<div className="field-grid">{children}</div></section>;
}

function ArraySection({ title, children, add, hint, options }) {
  return (
    <section className="editor-section">
      <div className="section-row"><h2>{title}</h2><button className="btn btn-secondary small-btn" onClick={add}><Plus size={15} /> Agregar</button></div>
      {hint && <p className="editor-hint">{hint}</p>}
      {options && <details className="item-options section-options"><summary>Cambiar título y opciones</summary><div className="field-grid">{options}</div></details>}
      <div className="array-stack">{children}</div>
    </section>
  );
}

function CalendarImporter({ onImport, existingCount = 0 }) {
  const [raw, setRaw] = useState('');
  const [message, setMessage] = useState('');
  const [summary, setSummary] = useState(null);

  const applyImport = (content, origin = 'texto') => {
    const result = normalizeCalendarImport(content);
    if (!result.items.length) {
      setMessage('No pude leer piezas. Sube el JSON exportado desde Euphoria OS o pega CSV/JSON con fechas.');
      setSummary(null);
      return;
    }
    onImport(result);
    setSummary(result);
    const clientName = result.client?.name ? ` de ${result.client.name}` : '';
    setMessage(`Importadas ${result.items.length} piezas${clientName} desde ${origin}. Revisa y guarda la propuesta.`);
  };

  const importRaw = () => applyImport(raw, 'texto pegado');

  const readFile = async (file) => {
    if (!file) return;
    const text = await file.text();
    setRaw(text);
    applyImport(text, file.name || 'archivo');
  };

  return (
    <div className="import-box">
      <p>
        Sube el JSON descargado desde Euphoria OS con el botón <b>Exportar para propuesta</b>. La propuesta tomará fechas reales y piezas del calendario sin capturarlo a mano. Los entregables del paquete se mantienen editables aparte.
      </p>
      <div className="import-actions">
        <label className="file-import">
          Subir JSON de Euphoria OS
          <input type="file" accept=".json,.csv,.txt,application/json,text/csv,text/plain" onChange={e => readFile(e.target.files?.[0])} />
        </label>
        <button className="btn btn-secondary" type="button" onClick={importRaw}>Importar texto pegado</button>
        <span>{existingCount || 0} piezas actuales</span>
      </div>
      <textarea
        className="import-textarea"
        value={raw}
        onChange={e => setRaw(e.target.value)}
        rows={7}
        placeholder={'También puedes pegar el JSON aquí. Ejemplo mínimo:\n{"schemaVersion":"euphoria_calendar_export_v1","items":[{"date":"2026-06-20","piece":"Reel 1","type":"Reel","title":"Tema del reel"}]}' }
      />
      {summary && (
        <div className="import-summary">
          <strong>Import listo</strong>
          <span>{summary.items.length} piezas importadas</span>
          <span>{countPublicationDays(summary.items)} días de publicación</span>
          {summary.period?.startDate && <span>{summary.period.startDate} → {summary.period.endDate}</span>}
        </div>
      )}
      {message && <small className="import-message">{message}</small>}
    </div>
  );
}


function MediaUploader({ label = 'Subir archivo', proposalId, onUploaded, uploadKey, activeUpload, setActiveUpload, storageUnavailable = false }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [bytesTransferred, setBytesTransferred] = useState(0);
  const [fileBytes, setFileBytes] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [message, setMessage] = useState('');
  const taskRef = useRef(null);
  const startedAt = useRef(0);

  useEffect(() => {
    if (!uploading) return;
    const interval = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    return () => clearInterval(interval);
  }, [uploading]);

  useEffect(() => () => {
    taskRef.current?.cancel();
    setActiveUpload(current => current === uploadKey ? null : current);
  }, [uploadKey, setActiveUpload]);

  async function handleFile(file) {
    if (!file) return;
    if (activeUpload && activeUpload !== uploadKey) {
      setMessage('Termina o cancela la otra subida antes de elegir un archivo.');
      return;
    }
    setActiveUpload(uploadKey);
    setUploading(true);
    setProgress(0);
    setBytesTransferred(0);
    setFileBytes(file.size);
    setElapsed(0);
    startedAt.current = Date.now();
    setMessage('');
    try {
      const url = await uploadProposalMedia(file, proposalId || 'propuesta', (percent, snapshot) => {
        setProgress(percent);
        setBytesTransferred(snapshot.bytesTransferred);
      }, task => { taskRef.current = task; });
      onUploaded(url);
      setMessage(file.name.toLowerCase().endsWith('.mov')
        ? 'MOV subido como archivo. Se abre por enlace; para reproducir dentro de la propuesta usa MP4 H.264. Guarda la propuesta.'
        : 'Archivo subido. Guarda la propuesta para conservarlo.');
    } catch (err) {
      const errors = {
        'storage/unauthorized': 'Firebase rechazó la subida por permisos de Storage. Revisa la cuenta y las reglas.',
        'storage/unauthenticated': 'La sesión caducó. Vuelve a iniciar sesión y prueba de nuevo.',
        'storage/bucket-not-found': err?.message || 'El bucket de Firebase Storage no existe para esta aplicación.',
        'storage/quota-exceeded': 'El bucket de Storage alcanzó su cuota.',
        'storage/retry-limit-exceeded': 'Firebase agotó el tiempo de reintentos. Revisa la conexión o los permisos de Storage.',
        'storage/stalled': err?.message,
        'storage/canceled': 'Subida cancelada.'
      };
      setMessage(`${errors[err?.code] || err?.message || 'No se pudo subir el archivo.'}${err?.code ? ` (${err.code})` : ''}`);
    } finally {
      taskRef.current = null;
      setUploading(false);
      setActiveUpload(current => current === uploadKey ? null : current);
    }
  }

  const blocked = Boolean(activeUpload && activeUpload !== uploadKey);
  const sizeText = bytes => bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

  return (
    <div className="field media-upload-field">
      <span>{label}</span>
      <label className="media-upload-box">
        <UploadCloud size={16} />
        <strong>{uploading ? progress === 100 ? 'Finalizando…' : `Subiendo ${progress}%` : storageUnavailable ? 'Storage pendiente' : blocked ? 'Espera la otra subida' : 'Seleccionar archivo'}</strong>
        <small>{storageUnavailable ? 'Activa Storage arriba o pega una URL en el campo anterior.' : 'Un archivo a la vez · video hasta 500 MB. MP4 H.264/WebM se reproducen aquí; MOV se abre como archivo.'}</small>
        <input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mov" disabled={uploading || blocked || storageUnavailable} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; handleFile(file); }} />
      </label>
      {uploading && <>
        <div className="upload-progress"><progress value={progress} max="100" aria-label="Progreso de subida" /><button type="button" onClick={() => taskRef.current?.cancel()}>Cancelar</button></div>
        <small role="status">{sizeText(bytesTransferred)} de {sizeText(fileBytes)} · {elapsed} s</small>
        {bytesTransferred === 0 && elapsed >= 15 && <small className="upload-warning">Aún no se transfieren datos. Si sigue así, se cancelará a los 90 s y mostrará el error.</small>}
      </>}
      {message && <small role="status">{message}</small>}
    </div>
  );
}

function Input({ label, value, onChange, hint, type = 'text', min, max }) {
  return <label className="field"><span>{label}</span><input type={type} min={min} max={max} value={value ?? ''} onChange={e => onChange(e.target.value)} />{hint && <small>{hint}</small>}</label>;
}

function ColorField({ label, value, onChange }) {
  const safeColor = normalizeHexColor(value, '#8b1628');
  return (
    <label className="field color-field">
      <span>{label}</span>
      <div className="color-row">
        <input type="color" value={safeColor} onChange={e => onChange(e.target.value)} />
        <input
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          onBlur={e => onChange(normalizeHexColor(e.target.value, safeColor))}
          placeholder="#8b1628"
        />
      </div>
    </label>
  );
}

function SelectField({ label, value, onChange, options = [] }) {
  return (
    <label className="field">
      <span>{label}</span>
      <select value={value || ''} onChange={e => onChange(e.target.value)}>
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function Textarea({ label, value, onChange, rows = 4, maxLength, hint }) {
  return <label className="field wide"><span>{label}</span><textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={rows} maxLength={maxLength} />{hint && <small>{hint}</small>}</label>;
}

function PublicProposal({ slug }) {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setLoading(true);
    setFailed(false);
    getPublicProposal(slug)
      .then(data => setProposal(data ? normalizeProposal(data) : null))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    if (!proposal) return;
    document.title = `Euphoria · Propuesta para ${proposal.clientDisplayName || proposal.clientName || 'ti'}`;
    return () => { document.title = 'Euphoria · Propuestas'; };
  }, [proposal]);

  if (loading) return <LoadingScreen label="Cargando propuesta" />;
  if (!proposal) {
    return <div className="not-found"><h1>Propuesta no disponible</h1><p>{failed ? 'No pudimos cargar el enlace. Inténtalo de nuevo en unos minutos.' : 'Revisa el enlace o pide la versión publicada a Euphoria.'}</p></div>;
  }
  return <ProposalPage proposal={proposal} />;
}

function trimText(text = '', max = 150) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}...`;
}

function formatScriptDate(value) {
  const date = parseLocalDate(value);
  return date && !Number.isNaN(date.getTime())
    ? new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'long' }).format(date)
    : '';
}

function ProposalPage({ proposal, compact = false }) {
  proposal = normalizeProposal(proposal);
  const period = resolveProposalPeriod(proposal);
  const isMonthly = proposal.proposalType === 'monthly';
  const references = (proposal.references || []).filter(ref => ref?.url || ref?.title || ref?.note).slice(0, 3);
  const themeVars = getThemeVars(proposal.themePreset, proposal.customAccent, proposal.customAccentDark);
  const primaryDeliverables = (proposal.deliverables || []).filter(d => d?.label || d?.value).slice(0, 6);
  const primarySteps = (proposal.steps || [])
    .filter(s => s?.title || s?.text)
    .filter(s => !/calendario/i.test(`${s?.title || ''} ${s?.text || ''}`))
    .slice(0, 4);
  const primaryPlan = (proposal.monthPlan || []).filter(row => row?.topic || row?.piece);
  const scriptedVideos = scriptedVideoEntries(proposal.monthPlan || []);
  const pillars = (proposal.pillars || []).filter(p => p?.title || p?.text).slice(0, 3);
  const showIntro = Boolean(proposal.strategyTitle || proposal.strategyText || (!isMonthly && (proposal.diagnosisText || proposal.audienceNeeds || proposal.agendaText)));
  const showSystem = !isMonthly && Boolean(proposal.creativeApproach || pillars.length);
  const showVisuals = references.length > 0;
  const showScope = isMonthly && primaryDeliverables.length > 0;
  const showScripts = scriptedVideos.length > 0;
  const showCalendar = primaryPlan.length > 0;
  const showSteps = !isMonthly && primarySteps.length > 0;
  let sectionCount = 0;
  const introNumber = showIntro ? ++sectionCount : null;
  const systemNumber = showSystem ? ++sectionCount : null;
  const visualNumber = showVisuals ? ++sectionCount : null;
  const scopeNumber = showScope ? ++sectionCount : null;
  const scriptsNumber = showScripts ? ++sectionCount : null;
  const calendarNumber = showCalendar ? ++sectionCount : null;
  const stepsNumber = showSteps ? ++sectionCount : null;
  const heroBackItem = proposal.heroMediaBackUrl
    ? { url: proposal.heroMediaBackUrl, title: 'Hero visual izquierdo' }
    : references[1];
  const heroMainItem = proposal.heroMediaUrl
    ? { url: proposal.heroMediaUrl, title: 'Hero visual principal' }
    : references[0];
  const heroFrontItem = proposal.heroMediaFrontUrl
    ? { url: proposal.heroMediaFrontUrl, title: 'Hero visual derecho' }
    : references[2];
  const heroCenter = [heroMainItem, heroBackItem, heroFrontItem].find(item => item?.url);
  const heroLeft = heroBackItem?.url && heroBackItem !== heroCenter ? heroBackItem : null;
  const heroRight = heroFrontItem?.url && heroFrontItem !== heroCenter ? heroFrontItem : null;

  return (
    <div className={compact ? 'proposal-page luxe-page compact-preview' : 'proposal-page luxe-page'} style={themeVars}>
      <header className="luxe-hero">
        <div className="luxe-glow luxe-glow-one" />
        <div className="luxe-glow luxe-glow-two" />
        <div className="wrap luxe-nav">
          <div className="brand-mark light">Euphoria<span>.</span></div>
          <div className="luxe-nav-meta">{proposal.vertical}</div>
        </div>

        <div className="wrap luxe-hero-grid">
          <div className="luxe-hero-copy">
            {proposal.heroEyebrow?.trim() && <div className="luxe-chip">{proposal.heroEyebrow}</div>}
            <h1>{proposal.clientDisplayName || proposal.clientName}</h1>
            <p>{proposal.positioning}</p>
          </div>

          {heroCenter && <div className="luxe-phone-stage" aria-label="Visuales de portada de la propuesta">
            {heroLeft && <div className="luxe-phone luxe-phone-back"><VideoMockup refItem={heroLeft} inCover /></div>}
            <div className="luxe-phone luxe-phone-main"><VideoMockup refItem={heroCenter} inCover /></div>
            {heroRight && <div className="luxe-phone luxe-phone-front"><VideoMockup refItem={heroRight} inCover /></div>}
          </div>}
        </div>

        <div className="wrap luxe-hero-footer">
          <span>{proposal.clientName}</span>
          <span>{proposal.city}</span>
          <span>{period.start?.slice(0, 4) || new Date().getFullYear()}</span>
        </div>
      </header>

      <main className="luxe-main">
        {showIntro && <section className="luxe-section luxe-intro">
          <div className="wrap luxe-intro-grid">
            <div>
              <div className="luxe-kicker">{String(introNumber).padStart(2, '0')} · {isMonthly ? 'Enfoque del ciclo' : 'En una frase'}</div>
              {proposal.strategyTitle && <h2>{proposal.strategyTitle}</h2>}
            </div>
            <div className="luxe-intro-copy">
              {proposal.strategyText && <p>{proposal.strategyText}</p>}
              {!isMonthly && (proposal.diagnosisText || proposal.audienceNeeds || proposal.agendaText) && <div className="luxe-proof-grid">
                {proposal.diagnosisText && <LuxeMetric title="Autoridad" text={proposal.diagnosisText} />}
                {proposal.audienceNeeds && <LuxeMetric title="Confianza" text={proposal.audienceNeeds} />}
                {proposal.agendaText && <LuxeMetric title="Agenda" text={proposal.agendaText} />}
              </div>}
            </div>
          </div>
        </section>}

        {showSystem && <section className="luxe-section luxe-system">
          <div className="wrap">
            <div className="luxe-section-head">
              <div>
                <div className="luxe-kicker">{String(systemNumber).padStart(2, '0')} · Sistema de contenido</div>
                <h2>{proposal.systemTitle || 'Sistema de contenido'}</h2>
              </div>
              {proposal.creativeApproach && <p>{proposal.creativeApproach}</p>}
            </div>
            <div className="luxe-pillar-stack">
              {pillars.map((p, i) => (
                <article className="luxe-pillar-row" key={i}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <small>{p.label}</small>
                  <h3>{p.title}</h3>
                  <p>{p.text}</p>
                </article>
              ))}
            </div>
          </div>
        </section>}

        {showVisuals && <section className="luxe-section luxe-visuals">
          <div className={`wrap luxe-visuals-head ${proposal.visualIntro ? '' : 'is-single'}`}>
            <div>
              <div className="luxe-kicker">{String(visualNumber).padStart(2, '0')} · Referencias visuales</div>
              <h2>{proposal.visualTitle || 'Referencias visuales'}</h2>
            </div>
            {proposal.visualIntro && <p>{proposal.visualIntro}</p>}
          </div>
          <div className="wrap luxe-reference-grid" style={{ '--reference-count': references.length }}>
            {references.map((ref, i) => (
              <article className="luxe-reference" key={i}>
                <VideoMockup refItem={ref} label={ref.pillar || `Referencia ${i + 1}`} />
                <div>
                  <span>{ref.pillar}</span>
                  <h3>{ref.title}</h3>
                  <p>{ref.note}</p>
                </div>
              </article>
            ))}
          </div>
        </section>}

        {showScope && <section className="luxe-section luxe-scope">
          <div className="wrap">
            <div className="luxe-kicker">{String(scopeNumber).padStart(2, '0')} · Alcance</div>
            <h2>{proposal.deliverablesTitle || 'Alcance del ciclo'}</h2>
            <div className="luxe-scope-grid">
              {primaryDeliverables.map((item, i) => <div className="luxe-scope-item" key={i}><strong>{item.value}</strong><span>{item.label}</span></div>)}
            </div>
          </div>
        </section>}

        {showScripts && <section className="luxe-section luxe-scripts-section">
          <div className="wrap">
            <div className="luxe-kicker">{String(scriptsNumber).padStart(2, '0')} · Guiones del ciclo</div>
            <h2>{proposal.scriptsTitle || 'Cada pieza, una idea clara.'}</h2>
            <div className="luxe-script-list">
              {scriptedVideos.map((item, index) => (
                <details className="luxe-script-item" key={`${item.piece}-${item.index}`}>
                  <summary>
                    <span className="luxe-script-number">{String(index + 1).padStart(2, '0')}</span>
                    <span className="luxe-script-copy">
                      <span className="luxe-script-piece">{item.piece || `Video ${index + 1}`}</span>
                      <strong>{item.topic || item.piece || `Video ${index + 1}`}</strong>
                      <span className="luxe-script-preview">{trimText(item.scriptText, 115)}</span>
                    </span>
                    <span className="luxe-script-side">
                      <span className="luxe-script-mode">{item.scriptMode === 'visual' ? 'Sin voz' : 'Con voz'}</span>
                      {formatScriptDate(item.date) && <span className="luxe-script-date">Se publica {formatScriptDate(item.date)}</span>}
                    </span>
                    <span className="luxe-script-toggle" aria-hidden="true">+</span>
                  </summary>
                  <div className="luxe-script-body">
                    <span>{item.scriptMode === 'visual' ? 'Secuencia visual' : 'Guion / estructura'}</span>
                    <p>{item.scriptText}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>}

        {showCalendar && <section className="luxe-section luxe-calendar-section">
          <div className="wrap">
            <div className={`luxe-calendar-head ${proposal.calendarIntro ? '' : 'is-single'}`}>
              <div>
                <div className="luxe-kicker">{String(calendarNumber).padStart(2, '0')} · Calendario editorial</div>
                <h2>{proposal.calendarTitle || 'Calendario del ciclo'}</h2>
              </div>
              {proposal.calendarIntro && <p>{proposal.calendarIntro}</p>}
            </div>
            <LuxeCalendarPreview plan={primaryPlan} clientName={proposal.clientName} deliverables={primaryDeliverables} periodStart={period.start} periodEnd={period.end} />
          </div>
        </section>}

        {showSteps && <section className="luxe-section luxe-launch luxe-launch-steps-only">
          <div className="wrap luxe-steps-center">
            <div className="luxe-steps-card">
              <div className="luxe-kicker">{String(stepsNumber).padStart(2, '0')} · Arranque</div>
              <h3>{proposal.stepsTitle || 'Siguiente movimiento'}</h3>
              {primarySteps.map((s, i) => (
                <div className="luxe-step" key={i}>
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <div>
                    <strong>{s.title}</strong>
                    <p>{s.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>}
      </main>

      {(proposal.ctaTitle || proposal.ctaText) && <footer className="luxe-close">
        <div className="wrap">
          <span className="luxe-kicker">Cierre</span>
          {proposal.ctaTitle && <h2>{proposal.ctaTitle}</h2>}
          {proposal.ctaText && <p>{proposal.ctaText}</p>}
          <div className="luxe-close-foot">Euphoria Agency · {proposal.city}</div>
        </div>
      </footer>}
    </div>
  );
}

function LuxeCalendarPreview({ plan = [], clientName = '', deliverables = [], periodStart = '', periodEnd = '' }) {
  const weekdayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const filled = (plan || []).filter(item => item?.piece || item?.topic || item?.date);
  const datedItems = filled
    .map((item, index) => ({ ...item, index, parsedDate: parseLocalDate(item.date) }))
    .filter(item => item.parsedDate);

  const hasRealDates = datedItems.length > 0;
  const anchorDate = parseLocalDate(periodStart) || (hasRealDates
    ? new Date(Math.min(...datedItems.map(item => item.parsedDate.getTime())))
    : new Date());
  const firstDay = addDays(anchorDate, -anchorDate.getDay());

  const datedKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  const placements = new Map();

  function addPlacement(key, item) {
    const current = placements.get(key) || [];
    placements.set(key, [...current, item]);
  }

  if (hasRealDates) {
    datedItems.forEach((item) => addPlacement(datedKey(item.parsedDate), item));
  } else {
    const totalDays = 28;
    const step = Math.max(2, Math.floor(totalDays / (filled.length + 1 || 1)));
    filled.forEach((item, index) => {
      const date = addDays(anchorDate, 1 + index * step);
      addPlacement(datedKey(date), { ...item, parsedDate: date });
    });
  }

  const lastDate = parseLocalDate(periodEnd) || (datedItems.length
    ? new Date(Math.max(...datedItems.map(item => item.parsedDate.getTime())))
    : addDays(anchorDate, 34));
  const daysToShow = Math.min(56, Math.max(35, Math.ceil((Math.max(lastDate, firstDay) - firstDay + 86400000) / 604800000) * 7));
  const cells = Array.from({ length: daysToShow }, (_, index) => {
    const date = addDays(firstDay, index);
    const key = datedKey(date);
    return { date, key, items: placements.get(key) || [] };
  });

  function toneFor(item = {}) {
    for (const value of [item.type, item.piece]) {
      const kind = String(value || '').toLowerCase();
      if (/reel|video|vídeo|ugc|clip|promocional/.test(kind)) return 'video';
      if (/post|carrusel|carousel|foto|photo|imagen|gráfico|grafico|estátic|estatic|static/.test(kind)) return 'static';
    }
    return 'other';
  }

  return (
    <div className="luxe-calendar-card">
      <div className="luxe-calendar-top">
        <div>
          <span>Calendario del cliente</span>
          <strong>{clientName || 'Cliente'}</strong>
          <p>{periodStart && periodEnd ? formatDateRange([parseLocalDate(periodStart), parseLocalDate(periodEnd)]) : hasRealDates ? formatDateRange(datedItems.map(item => item.parsedDate)) : 'Agrega fechas para mostrar el calendario real.'}</p>
        </div>
        <div className="luxe-calendar-meta luxe-calendar-meta-simple">
          <div className="luxe-calendar-stat">
            <strong>{hasRealDates ? countPublicationDays(filled) : filled.length}</strong>
            <span>{(hasRealDates ? countPublicationDays(filled) : filled.length) === 1 ? 'día de publicación' : 'días de publicación'}</span>
          </div>
        </div>
      </div>

      <div className="luxe-calendar-grid">
        {weekdayLabels.map((label) => <div className="luxe-calendar-weekday" key={label}>{label}</div>)}
        {cells.map((cell) => (
          <div className="luxe-calendar-cell" key={cell.key}>
            <div className="luxe-calendar-date">
              <strong>{cell.date.getDate()}</strong>
              <span>{formatMonthShort(cell.date)}</span>
            </div>
            {cell.items.slice(0, 2).map((item, itemIndex) => (
              <div className={`luxe-calendar-chip tone-${toneFor(item)}`} key={`${cell.key}-${itemIndex}`}>
                <b>{item.piece || item.type || 'Pieza'}</b>
                <small>{item.topic || item.objective || ''}</small>
              </div>
            ))}
            {cell.items.length > 2 && <div className="luxe-calendar-more">+{cell.items.length - 2} más</div>}
          </div>
        ))}
      </div>
    </div>
  );
}

function LuxeMetric({ title, text }) {
  return (
    <div className="luxe-metric">
      <strong>{title}</strong>
      <p>{text}</p>
    </div>
  );
}

function VideoMockup({ refItem, label, inCover = false }) {
  const safe = refItem || {};
  const embed = getEmbed(safe.url);
  const [playbackError, setPlaybackError] = useState(false);
  useEffect(() => setPlaybackError(false), [safe.url]);
  return (
    <div className="luxe-video-frame">
      <div className="luxe-video-top"><span /> <span /> <span /></div>
      <div className="luxe-video-body">
        {embed.type === 'image' && <img src={safe.url} alt={inCover ? 'Visual de portada' : safe.title || label || 'Referencia visual'} />}
        {embed.type === 'video' && !playbackError && <video src={embed.src} preload="none" playsInline controls onError={() => setPlaybackError(true)} />}
        {embed.type === 'iframe' && <iframe src={embed.src} title={inCover ? 'Visual de portada' : safe.title || label || 'Referencia visual'} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />}
        {(embed.type === 'link' || embed.type === 'empty' || playbackError) && (
          <div className={`luxe-video-placeholder${inCover ? ' is-cover' : ''}`}>
            {!inCover && <small>{label || 'Referencia visual'}</small>}
            {embed.src ? <a href={embed.src} target="_blank" rel="noreferrer" aria-label={inCover ? 'Abrir visual de portada' : undefined}>{inCover ? <ExternalLink size={20} aria-hidden="true" /> : playbackError ? 'No se puede reproducir aquí · abrir archivo' : 'Abrir referencia'}</a> : !inCover && <strong>Referencia visual</strong>}
          </div>
        )}
      </div>
    </div>
  );
}

function ProposalSection({ num, label, title, alt = false, children }) {
  return (
    <section className={`section ${alt ? 'alt' : ''}`}>
      <div className="wrap">
        <div className="section-num">{num} — {label}</div>
        <h2>{title}</h2>
        {children}
      </div>
    </section>
  );
}

function ReferenceCard({ refItem }) {
  const embed = getEmbed(refItem.url);
  return (
    <div className="reference-card">
      <div className="reel">
        {embed.type === 'image' && <img src={refItem.url} alt={refItem.title || 'Referencia visual'} />}
        {embed.type === 'video' && <video src={refItem.url} muted loop playsInline controls />}
        {embed.type === 'iframe' && <iframe src={embed.src} title={refItem.title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />}
        {embed.type === 'link' && <div className="reel-empty"><span>Video de referencia</span>{refItem.url ? <a href={refItem.url} target="_blank" rel="noreferrer">Abrir referencia</a> : <small>Agrega link en el editor</small>}</div>}
      </div>
      <h3>{refItem.title}</h3>
      <p>{refItem.note}</p>
    </div>
  );
}

createRoot(document.getElementById('root')).render(<App />);
