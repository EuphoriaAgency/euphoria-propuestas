import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import {
  ArrowLeft,
  Copy,
  ExternalLink,
  Eye,
  FilePlus2,
  ChevronDown,
  Download,
  Film,
  Image as ImageIcon,
  Loader2,
  LogOut,
  Plus,
  Save,
  Trash2,
  UploadCloud
} from 'lucide-react';
import './styles.css';
import './mediaPresentation.css';
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
import { createVideoPoster, videoFirstFrameUrl } from './videoPoster';
import { getEmbed } from './mediaEmbed';
import { coverMediaLayout, editorialReferenceRows } from './proposalMediaLayout';
import { validatePublication } from './proposalValidation';
import { resolveProposalPeriod } from './proposalPeriod';
import { isVideoPiece, preserveVideoScripts, scriptedVideoEntries } from './proposalScripts';
import { CONTENT_COUNTS, buildProductionCalendarExport, countProposalPieces, generateProposalCalendar, rearrangeProposalCalendar } from './proposalCalendar';
import { createProposalCalendarPng } from './proposalCalendarImage';
import { TYPOGRAPHY_PRESETS, typographyVariables } from './proposalTypography';
import { visibleProposalReferences } from './proposalReferences';

const emptyPillar = { label: '', title: '', text: '' };
const emptyReference = { pillar: '', title: '', handle: '', url: '', posterUrl: '', note: '' };
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

function readableAccentOnPaper(hex) {
  let color = normalizeHexColor(hex);
  const paper = 0.84;
  for (let attempt = 0; attempt < 8; attempt++) {
    const channels = [1, 3, 5].map(start => parseInt(color.slice(start, start + 2), 16) / 255);
    const luminance = channels.reduce((sum, value, index) => sum +
      (value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4) * [0.2126, 0.7152, 0.0722][index], 0);
    if ((paper + 0.05) / (luminance + 0.05) >= 4.5) break;
    color = `#${channels.map(value => Math.round(value * 255 * 0.82).toString(16).padStart(2, '0')).join('')}`;
  }
  return color;
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
    '--proposal-primary-ink': readableAccentOnPaper(accent),
    '--proposal-secondary': accentDark,
    '--proposal-secondary-ink': readableAccentOnPaper(accentDark),
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
                  <p>{item.heroEyebrow || item.vertical || 'Propuesta'} · {item.showCalendar === false ? 'Solo producción · videos y guiones' : (() => { const period = resolveProposalPeriod(item); return period.start && period.end ? `${period.start} → ${period.end}` : 'Calendario pendiente'; })()}</p>
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
      <a className="admin-brand" href="/admin"><strong>EUPHORIA<span>.</span></strong><small>PROPUESTAS</small></a>
      <div className="row gap">
        <a className="plain-link" href="/admin">Panel</a>
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
  const [openSection, setOpenSection] = useState('cover');
  const [selectedReference, setSelectedReference] = useState(0);
  const [selectedPillar, setSelectedPillar] = useState(0);
  const [selectedStep, setSelectedStep] = useState(0);
  const [selectedPiece, setSelectedPiece] = useState(0);
  const [pieceFilter, setPieceFilter] = useState('all');

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

  function updateReferenceMedia(index, url, posterUrl = '') {
    setProposal(prev => ({
      ...prev,
      references: prev.references.map((item, i) => i === index ? { ...item, url, posterUrl } : item)
    }));
  }

  function updateCoverMedia(field, url, posterUrl = '') {
    setProposal(prev => ({ ...prev, [field]: url, [field.replace('Url', 'PosterUrl')]: posterUrl }));
  }

  function addArray(name, item) {
    setProposal(prev => ({ ...prev, [name]: [...prev[name], item] }));
  }

  function removeArray(name, index) {
    setProposal(prev => ({ ...prev, [name]: prev[name].filter((_, i) => i !== index) }));
  }

  function addSelected(name, item, section, select) {
    select(proposal[name].length);
    setOpenSection(section);
    addArray(name, { ...item });
  }

  function removeSelected(name, index, select) {
    select(Math.max(0, Math.min(index, proposal[name].length - 2)));
    removeArray(name, index);
  }

  function updateTypographyPreset(value) {
    setProposal(prev => ({ ...prev, typographyPreset: value, sectionTypography: {} }));
  }

  function planCalendar(action) {
    try {
      const result = action === 'generate'
        ? generateProposalCalendar(proposal)
        : rearrangeProposalCalendar(proposal, Math.floor(Math.random() * 1_000_000) + 1);
      setProposal(prev => ({ ...prev, monthPlan: result.items }));
      setCalendarMessage(action === 'generate'
        ? result.added ? `${result.added} piezas agregadas. Revisa temas y fechas antes de guardar.` : 'Las cantidades ya están cubiertas. No se modificó ninguna pieza.'
        : result.changedDateCount ? `${result.changedDateCount} días nuevos en esta variación. Los temas y guiones permanecen en sus piezas.`
          : result.changed ? 'Se alternaron piezas; no quedan días libres para mover publicaciones a otras fechas.'
            : 'Este periodo no permite otra distribución con las mismas piezas.');
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

  const accordion = (key, summary) => ({
    summary,
    expanded: openSection === key,
    onToggle: () => setOpenSection(current => current === key ? null : key)
  });
  const activeReference = Math.min(selectedReference, proposal.references.length - 1);
  const activePillar = Math.min(selectedPillar, proposal.pillars.length - 1);
  const activeStep = Math.min(selectedStep, proposal.steps.length - 1);
  const pieceEntries = proposal.monthPlan.map((item, index) => ({ item, index }))
    .filter(({ item }) => pieceFilter === 'all' || (pieceFilter === 'video' ? isVideoPiece(item) : !isVideoPiece(item)));
  const activePiece = pieceEntries.find(({ index }) => index === selectedPiece)?.index ?? pieceEntries[0]?.index ?? -1;
  const selectedPlanItem = activePiece >= 0 ? proposal.monthPlan[activePiece] : null;
  const videoCount = proposal.monthPlan.filter(isVideoPiece).length;
  const scriptCount = proposal.monthPlan.filter(item => isVideoPiece(item) && item.scriptText?.trim()).length;
  const coverVisualCount = [proposal.heroMediaUrl, proposal.heroMediaBackUrl, proposal.heroMediaFrontUrl].filter(Boolean).length;
  const dateSummary = proposal.periodStart && proposal.periodEnd ? `${proposal.periodStart} – ${proposal.periodEnd}` : 'Sin fechas';
  const productionOnly = proposal.showCalendar === false;
  const usedVideoNumbers = new Set(proposal.monthPlan.filter(isVideoPiece)
    .map(item => Number(String(item.piece || '').match(/\b(?:reel|video)\s*(\d+)\b/i)?.[1])).filter(Boolean));
  const nextVideoNumber = Array.from({ length: proposal.monthPlan.length + 1 }, (_, index) => index + 1)
    .find(number => !usedVideoNumbers.has(number));

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

          <div className="editor-context">
            <span>PROPUESTA · PANEL INTERNO</span>
            <h1>{proposal.clientName || 'Nueva propuesta'}</h1>
          </div>

          <EditorSection title="Portada y estilo" {...accordion('cover', `${proposal.clientName || 'Sin cliente'} · ${proposal.heroEyebrow || 'Sin etiqueta'} · ${coverVisualCount} visuales`)}>
            <Input label="Nombre del cliente" value={proposal.clientName} onChange={v => updateField('clientName', v)} />
            <Input label="Etiqueta de portada" value={proposal.heroEyebrow} onChange={v => updateField('heroEyebrow', v)} hint="Escribe «Ciclo 2 · noviembre» o el texto que quieras. No se agregan fechas automáticamente." />
            <SelectField label="Contenido de la propuesta" value={productionOnly ? 'production' : 'calendar'} onChange={v => updateField('showCalendar', v === 'calendar')} options={[{ value: 'calendar', label: 'Con calendario editorial' }, { value: 'production', label: 'Solo producción · videos y guiones' }]} />
            <p className="typography-help">Solo producción muestra los videos con su desarrollo, sin fechas ni calendario. Puedes cambiar de formato sin perder las piezas guardadas.</p>
            <SelectField label="Paleta de acento" value={proposal.themePreset || 'wine'} onChange={v => updateField('themePreset', v)} options={PALETTE_OPTIONS.map(item => ({ value: item.value, label: item.label }))} />
            <TypographySelect value={proposal.typographyPreset || 'editorial'} onChange={updateTypographyPreset} />
              <p className="typography-help">Una fuente para todo, o una combinación para títulos y texto. Este ajuste cambia la propuesta completa.</p>
            {proposal.themePreset === 'custom' && (
              <>
                <ColorField label="Color principal" value={proposal.customAccent || '#8b1628'} onChange={v => updateField('customAccent', v)} />
                <ColorField label="Segundo color" value={proposal.customAccentDark || proposal.customAccent || '#5f1421'} onChange={v => updateField('customAccentDark', v)} />
                <p className="typography-help">El primero destaca videos; el segundo distingue estáticos, detalles y secciones del documento.</p>
              </>
            )}
            <CoverMediaEditor
              proposal={proposal}
              onChange={updateCoverMedia}
              onPosterChange={updateField}
              activeUpload={activeUpload}
              setActiveUpload={setActiveUpload}
              storageUnavailable={storageCheck?.state === 'missing'}
            />
            <details className="editor-extra">
              <summary>Más opciones de portada</summary>
              <div className="field-grid">
                <SelectField label="Tipo de propuesta" value={proposal.proposalType || 'monthly'} onChange={v => updateField('proposalType', v)} options={[{ value: 'monthly', label: 'Ciclo mensual' }, { value: 'initial', label: 'Primera propuesta · estrategia completa' }]} />
                <Input label="Nombre en portada, si es distinto" value={proposal.clientDisplayName} onChange={v => updateField('clientDisplayName', v)} />
                <Input label="Vertical / giro" value={proposal.vertical} onChange={v => updateField('vertical', v)} />
                <Input label="Ciudad" value={proposal.city} onChange={v => updateField('city', v)} />
                <Textarea label="Frase de portada (opcional)" value={proposal.positioning} onChange={v => updateField('positioning', v)} />
              </div>
            </details>
          </EditorSection>

          <EditorSection title={proposal.proposalType === 'initial' ? 'Enfoque inicial' : 'Enfoque del mes'} {...accordion('strategy', proposal.strategyTitle || 'Sin enfoque')} hint="Esta sección aparece en la vista previa cuando escribes un título o una explicación.">
            <Input label="Título del enfoque" value={proposal.strategyTitle} onChange={v => updateField('strategyTitle', v)} />
            <Textarea label="Qué haremos y por qué" value={proposal.strategyText} onChange={v => updateField('strategyText', v)} />
            {proposal.proposalType === 'initial' && <>
              <Textarea label="Texto de Autoridad" value={proposal.diagnosisText} onChange={v => updateField('diagnosisText', v)} />
              <Textarea label="Texto de Confianza" value={proposal.audienceNeeds} onChange={v => updateField('audienceNeeds', v)} />
              <Textarea label="Texto de Agenda" value={proposal.agendaText || ''} onChange={v => updateField('agendaText', v)} />
            </>}
          </EditorSection>

          {proposal.proposalType === 'initial' && <>
            <EditorSection title="02 · Sistema de contenido" {...accordion('system', proposal.systemTitle || 'Sin título')}>
              <Input label="Título visible al cliente" value={proposal.systemTitle || ''} onChange={v => updateField('systemTitle', v)} />
              <Textarea label="Descripción" value={proposal.creativeApproach} onChange={v => updateField('creativeApproach', v)} />
            </EditorSection>

            <ArraySection title="02 · Pilares de contenido" {...accordion('pillars', `${proposal.pillars.length} pilares`)} add={() => addSelected('pillars', emptyPillar, 'pillars', setSelectedPillar)}>
              <CompactItemList items={proposal.pillars} selectedIndex={activePillar} onSelect={setSelectedPillar} labelFor={(item, i) => item.title || `Pilar ${i + 1}`} metaFor={item => item.label} disabled={Boolean(activeUpload)} />
              {activePillar >= 0 && <div className="compact-detail array-card">
                <div className="array-head"><b>Pilar {activePillar + 1}</b><button type="button" aria-label="Eliminar pilar" onClick={() => removeSelected('pillars', activePillar, setSelectedPillar)}><Trash2 size={15} /></button></div>
                <Input label="Etiqueta" value={proposal.pillars[activePillar].label} onChange={v => updateArray('pillars', activePillar, 'label', v)} />
                <Input label="Título" value={proposal.pillars[activePillar].title} onChange={v => updateArray('pillars', activePillar, 'title', v)} />
                <Textarea label="Descripción" value={proposal.pillars[activePillar].text} onChange={v => updateArray('pillars', activePillar, 'text', v)} />
              </div>}
            </ArraySection>
          </>}

          {!productionOnly && <ArraySection
            title="Calendario editorial"
            {...accordion('calendar', `${dateSummary} · ${proposal.monthPlan.length} piezas`)}
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
          </ArraySection>}

          <ArraySection
            title={productionOnly ? 'Videos y guiones' : 'Piezas y guiones'}
            {...accordion('scripts', productionOnly ? `${videoCount} videos · ${scriptCount} guiones escritos` : `${proposal.monthPlan.length} piezas · ${scriptCount} guiones escritos`)}
            add={() => {
              setPieceFilter('all');
              addSelected('monthPlan', productionOnly ? { ...emptyPlan, piece: `Reel ${nextVideoNumber}`, type: 'Reel' } : emptyPlan, 'scripts', setSelectedPiece);
            }}
            hint={productionOnly ? 'Agrega cada video con número, tema y guion o secuencia visual. No necesitas fechas; los posts guardados no aparecen en el enlace del cliente.' : 'Edita fecha, número y tema en la misma ficha. Los videos incluyen su guion o secuencia visual; los posts solo necesitan tema.'}
            options={<Input label="Título visible de guiones" value={proposal.scriptsTitle || ''} onChange={v => updateField('scriptsTitle', v)} />}
          >
            <div className="script-editor-list">
              {proposal.monthPlan.length === 0 && <p className="muted">{productionOnly ? 'Agrega el primer video para comenzar.' : 'Genera el calendario o agrega una pieza para comenzar.'}</p>}
              {proposal.monthPlan.length > 0 && pieceEntries.length === 0 && <p className="muted">No hay piezas de este tipo.</p>}
              {proposal.monthPlan.length > 0 && <div className="compact-filter-row" role="group" aria-label="Filtrar piezas">
                {[['all', 'Todas', proposal.monthPlan.length], ['video', 'Videos', videoCount], ['static', 'Estáticos', proposal.monthPlan.length - videoCount]].map(([key, label, count]) =>
                  <button type="button" key={key} className={pieceFilter === key ? 'is-active' : ''} onClick={() => setPieceFilter(key)}>{label} <span>{count}</span></button>
                )}
              </div>}
              <CompactItemList items={pieceEntries} selectedIndex={activePiece} onSelect={setSelectedPiece} getIndex={entry => entry.index} labelFor={({ item }, i) => item.piece || `Pieza ${pieceEntries[i].index + 1}`} metaFor={({ item }) => `${productionOnly ? '' : `${item.date || 'Sin fecha'} · `}${item.topic || 'Sin tema'}${isVideoPiece(item) ? item.scriptText?.trim() ? ' · Guion listo' : ' · Guion pendiente' : ''}`} disabled={Boolean(activeUpload)} />
              {selectedPlanItem && <article className="script-editor-card compact-detail" key={activePiece}>
                  <div className="script-editor-head">
                    <b>{selectedPlanItem.piece || `Pieza ${activePiece + 1}`}</b>
                    <button type="button" className="mini-trash" aria-label={`Quitar ${selectedPlanItem.piece || `pieza ${activePiece + 1}`}`} onClick={() => removeSelected('monthPlan', activePiece, setSelectedPiece)}><Trash2 size={15} /></button>
                  </div>
                  {!productionOnly && <Input label="Fecha de publicación" type="date" value={selectedPlanItem.date || ''} onChange={v => updateArray('monthPlan', activePiece, 'date', v)} />}
                  <Input label={productionOnly ? 'Número del video (Reel 1…)' : 'Pieza (Reel 1, Post 1…)'} value={selectedPlanItem.piece} onChange={v => { setPieceFilter('all'); updateArray('monthPlan', activePiece, 'piece', v); }} />
                  <Input label="Título / tema" wide={!isVideoPiece(selectedPlanItem)} value={selectedPlanItem.topic || ''} onChange={v => updateArray('monthPlan', activePiece, 'topic', v)} />
                  {isVideoPiece(selectedPlanItem) && <>
                    <SelectField label="Formato del video" value={selectedPlanItem.scriptMode || 'voice'} onChange={v => updateArray('monthPlan', activePiece, 'scriptMode', v)} options={[{ value: 'voice', label: 'Con voz · guion hablado' }, { value: 'visual', label: 'Sin voz · secuencia visual' }]} />
                    <Textarea label={selectedPlanItem.scriptMode === 'visual' ? 'Secuencia visual y textos en pantalla' : 'Guion o estructura del video'} value={selectedPlanItem.scriptText || ''} onChange={v => updateArray('monthPlan', activePiece, 'scriptText', v)} rows={7} maxLength={8000} hint={selectedPlanItem.scriptMode === 'visual' ? 'Describe los planos, acciones, textos y cierre.' : 'Puedes separar apertura, desarrollo y cierre en párrafos.'} />
                  </>}
                </article>
              }
            </div>
          </ArraySection>

          {proposal.proposalType === 'initial' && <>
            <EditorSection title="Siguiente movimiento" {...accordion('next', proposal.stepsTitle || 'Sin título')}>
              <Input label="Título visible al cliente" value={proposal.stepsTitle || ''} onChange={v => updateField('stepsTitle', v)} />
            </EditorSection>
            <ArraySection title="Pasos" {...accordion('steps', `${proposal.steps.length} pasos`)} add={() => addSelected('steps', emptyStep, 'steps', setSelectedStep)}>
              <CompactItemList items={proposal.steps} selectedIndex={activeStep} onSelect={setSelectedStep} labelFor={(item, i) => item.title || `Paso ${i + 1}`} metaFor={item => item.text} disabled={Boolean(activeUpload)} />
              {activeStep >= 0 && <div className="compact-detail array-card">
                <div className="array-head"><b>Paso {activeStep + 1}</b><button type="button" aria-label="Eliminar paso" onClick={() => removeSelected('steps', activeStep, setSelectedStep)}><Trash2 size={15} /></button></div>
                <Input label="Título" value={proposal.steps[activeStep].title} onChange={v => updateArray('steps', activeStep, 'title', v)} />
                <Textarea label="Descripción" value={proposal.steps[activeStep].text} onChange={v => updateArray('steps', activeStep, 'text', v)} />
              </div>}
            </ArraySection>
          </>}

          <ArraySection
            title="Referencias (opcional)"
            {...accordion('references', `${proposal.references.length} referencias`)}
            add={() => addSelected('references', emptyReference, 'references', setSelectedReference)}
            disableAdd={Boolean(activeUpload)}
            hint="Aparecen al final de la propuesta cuando agregas una referencia con título o enlace."
            options={<>
              <Input label="Título de la sección" value={proposal.visualTitle || ''} onChange={v => updateField('visualTitle', v)} />
              <Textarea label="Introducción (opcional)" value={proposal.visualIntro || ''} onChange={v => updateField('visualIntro', v)} />
            </>}
          >
            <CompactItemList items={proposal.references} selectedIndex={activeReference} onSelect={setSelectedReference} labelFor={(item, i) => item.title || `Referencia ${i + 1}`} metaFor={item => item.url ? 'Archivo o enlace agregado' : 'Sin visual'} imageFor={item => item.posterUrl || (getEmbed(item.url).type === 'image' ? getEmbed(item.url).src : '')} disabled={Boolean(activeUpload)} />
            {activeReference >= 0 && <div className="compact-detail array-card">
                <div className="array-head"><b>Referencia {activeReference + 1}</b><button type="button" aria-label="Eliminar referencia" disabled={Boolean(activeUpload)} onClick={() => removeSelected('references', activeReference, setSelectedReference)}><Trash2 size={15} /></button></div>
                <Input label="Título" value={proposal.references[activeReference].title} onChange={v => updateArray('references', activeReference, 'title', v)} />
                <Input label="URL de imagen/video" value={proposal.references[activeReference].url} onChange={v => updateReferenceMedia(activeReference, v)} hint="YouTube/Vimeo se reproducen aquí; Dropbox/Drive se abren por enlace." />
                <MediaUploader
                  label="Subir imagen/video de referencia"
                  proposalId={proposal.id || proposal.slug}
                  uploadKey={`reference-${activeReference}`}
                  activeUpload={activeUpload}
                  setActiveUpload={setActiveUpload}
                  storageUnavailable={storageCheck?.state === 'missing'}
                  onUploaded={(url, posterUrl) => updateReferenceMedia(activeReference, url, posterUrl)}
                />
                {getEmbed(proposal.references[activeReference].url).type === 'video' && <div className="poster-editor">
                  <small>Vista previa del video en celular. Las subidas nuevas la crean automáticamente.</small>
                  <Input label="URL de miniatura (opcional)" value={proposal.references[activeReference].posterUrl || ''} onChange={v => updateArray('references', activeReference, 'posterUrl', v)} />
                  <MediaUploader label="Subir miniatura de este video" imageOnly proposalId={proposal.id || proposal.slug} uploadKey={`reference-poster-${activeReference}`}
                    activeUpload={activeUpload} setActiveUpload={setActiveUpload} storageUnavailable={storageCheck?.state === 'missing'}
                    onUploaded={url => updateArray('references', activeReference, 'posterUrl', url)} />
                </div>}
                <details className="item-options">
                  <summary>Contexto de la referencia (opcional)</summary>
                  <Input label="Categoría" value={proposal.references[activeReference].pillar} onChange={v => updateArray('references', activeReference, 'pillar', v)} />
                  <Textarea label="Qué nos gusta" value={proposal.references[activeReference].note} onChange={v => updateArray('references', activeReference, 'note', v)} />
                </details>
              </div>}
          </ArraySection>
        </section>

        <aside className="preview-panel">
          <p className="preview-explain">Vista previa · las secciones se muestran cuando agregas contenido.</p>
          <ProposalPage proposal={proposal} compact />
        </aside>
      </main>
    </div>
  );
}

function AccordionHeader({ title, summary, expanded, onToggle, add, disableAdd }) {
  return <div className="editor-accordion-head">
    <button type="button" className="editor-accordion-toggle" aria-expanded={expanded} onClick={onToggle}>
      <span className="editor-accordion-title">{title}</span>
      <span className="editor-accordion-summary">{summary}</span>
      <ChevronDown size={18} className={expanded ? 'is-open' : ''} aria-hidden="true" />
    </button>
    {add && <button className="btn btn-secondary small-btn editor-add" type="button" onClick={add} disabled={disableAdd}><Plus size={15} /> Agregar</button>}
  </div>;
}

function EditorSection({ title, children, hint, summary, expanded, onToggle }) {
  return <section className={`editor-section editor-accordion${expanded ? ' is-open' : ''}`}>
    <AccordionHeader title={title} summary={summary} expanded={expanded} onToggle={onToggle} />
    <div className="editor-accordion-body" hidden={!expanded}>
      {hint && <p className="editor-hint">{hint}</p>}
      <div className="field-grid">{children}</div>
    </div>
  </section>;
}

function ArraySection({ title, children, add, disableAdd = false, hint, options, summary, expanded, onToggle }) {
  return (
    <section className={`editor-section editor-accordion${expanded ? ' is-open' : ''}`}>
      <AccordionHeader title={title} summary={summary} expanded={expanded} onToggle={onToggle} add={add} disableAdd={disableAdd} />
      <div className="editor-accordion-body" hidden={!expanded}>
      {hint && <p className="editor-hint">{hint}</p>}
      {options && <details className="item-options section-options"><summary>Cambiar título y opciones</summary><div className="field-grid">{options}</div></details>}
      <div className="array-stack">{children}</div>
      </div>
    </section>
  );
}

function TypographySelect({ value, onChange }) {
  return <SelectField
    label="Tipografía de toda la propuesta"
    value={value}
    onChange={onChange}
    options={TYPOGRAPHY_PRESETS}
  />;
}

function CompactItemList({ items, selectedIndex, onSelect, labelFor, metaFor, imageFor, getIndex = (_, index) => index, disabled = false }) {
  const listRef = useRef(null);
  useEffect(() => {
    const list = listRef.current;
    const selected = list?.querySelector('[aria-pressed="true"]');
    if (!selected) return;
    const top = selected.offsetTop - list.offsetTop;
    if (top < list.scrollTop) list.scrollTop = top;
    else if (top + selected.offsetHeight > list.scrollTop + list.clientHeight) {
      list.scrollTop = top + selected.offsetHeight - list.clientHeight;
    }
  }, [selectedIndex, items.length]);
  if (!items.length) return null;
  return <div ref={listRef} className="compact-item-list" role="group" aria-label="Elementos de esta sección">
    {items.map((item, position) => {
      const index = getIndex(item, position);
      const image = imageFor?.(item);
      return <button type="button" key={index} className={`compact-item${selectedIndex === index ? ' is-selected' : ''}`} onClick={() => onSelect(index)} disabled={disabled} aria-pressed={selectedIndex === index}>
        {image ? <img className="compact-item-thumb" src={image} alt="" loading="lazy" /> : <span className="compact-item-marker" aria-hidden="true">{imageFor ? <Film size={16} /> : position + 1}</span>}
        <span className="compact-item-copy"><strong>{labelFor(item, position)}</strong><small>{metaFor?.(item, position)}</small></span>
        <ChevronDown size={15} className="compact-item-chevron" aria-hidden="true" />
      </button>;
    })}
  </div>;
}

function CoverMediaEditor({ proposal, onChange, onPosterChange, activeUpload, setActiveUpload, storageUnavailable }) {
  const [selected, setSelected] = useState('heroMediaUrl');
  const visuals = [
    { field: 'heroMediaUrl', posterField: 'heroMediaPosterUrl', key: 'cover-main', label: 'Visual principal', hint: 'También puedes pegar un enlace de YouTube o Vimeo.' },
    { field: 'heroMediaBackUrl', posterField: 'heroMediaBackPosterUrl', key: 'cover-left', label: 'Visual izquierdo', hint: 'Si lo dejas vacío, usa la referencia visual 2.' },
    { field: 'heroMediaFrontUrl', posterField: 'heroMediaFrontPosterUrl', key: 'cover-right', label: 'Visual derecho', hint: 'Si lo dejas vacío, usa la referencia visual 3.' }
  ];
  return <div className="cover-media-editor">
    <strong className="cover-media-heading">Visuales de portada · imagen al centro</strong>
    <div className="cover-media-strip" role="group" aria-label="Visuales de portada">
      {visuals.map(visual => {
        const embed = getEmbed(proposal[visual.field]);
        return <button type="button" key={visual.field} className={`cover-media-tile${selected === visual.field ? ' is-selected' : ''}`} onClick={() => setSelected(visual.field)} disabled={Boolean(activeUpload)} aria-pressed={selected === visual.field}>
          <span className="cover-media-thumb">{proposal[visual.posterField] || embed.type === 'image' ? <img src={proposal[visual.posterField] || embed.src} alt="" loading="lazy" /> : embed.type === 'empty' ? <ImageIcon size={22} /> : <Film size={22} />}</span>
          <span>{visual.label}</span>
          <small>{proposal[visual.field] ? 'Visual agregado' : proposal.references?.length ? 'Usa referencia' : 'Sin visual'}</small>
        </button>;
      })}
    </div>
    {visuals.map(visual => <div key={visual.field} className="cover-media-fields" hidden={selected !== visual.field}>
      <Input label={`URL de ${visual.label.toLowerCase()}`} value={proposal[visual.field] || ''} onChange={v => onChange(visual.field, v)} hint={visual.hint} />
      <MediaUploader
        label={`Subir ${visual.label.toLowerCase()}`}
        proposalId={proposal.id || proposal.slug}
        uploadKey={visual.key}
        activeUpload={activeUpload}
        setActiveUpload={setActiveUpload}
        storageUnavailable={storageUnavailable}
        onUploaded={(url, posterUrl) => onChange(visual.field, url, posterUrl)}
      />
      {getEmbed(proposal[visual.field]).type === 'video' && <div className="poster-editor">
        <small>Vista previa para celulares. Las subidas nuevas la crean automáticamente.</small>
        <Input label="URL de miniatura (opcional)" value={proposal[visual.posterField] || ''} onChange={v => onPosterChange(visual.posterField, v)} />
        <MediaUploader label="Subir miniatura de este video" imageOnly proposalId={proposal.id || proposal.slug}
          uploadKey={`${visual.key}-poster`} activeUpload={activeUpload} setActiveUpload={setActiveUpload}
          storageUnavailable={storageUnavailable} onUploaded={url => onPosterChange(visual.posterField, url)} />
      </div>}
    </div>)}
  </div>;
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


function MediaUploader({ label = 'Subir archivo', proposalId, onUploaded, uploadKey, activeUpload, setActiveUpload, storageUnavailable = false, imageOnly = false }) {
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
    if (imageOnly && !/^image\//.test(file.type)) { setMessage('Elige una imagen JPG, PNG o WebP para la miniatura.'); return; }
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
      const isVideo = !imageOnly && /^video\//.test(file.type);
      const posterPromise = isVideo ? createVideoPoster(file) : Promise.resolve(null);
      const url = await uploadProposalMedia(file, proposalId || 'propuesta', (percent, snapshot) => {
        setProgress(percent);
        setBytesTransferred(snapshot.bytesTransferred);
      }, task => { taskRef.current = task; });
      const posterFile = await posterPromise;
      let posterUrl = '';
      if (posterFile) {
        posterUrl = await uploadProposalMedia(posterFile, proposalId || 'propuesta', () => {}, task => { taskRef.current = task; }).catch(() => '');
      }
      onUploaded(url, posterUrl);
      setMessage(isVideo && !posterUrl
        ? 'Video subido sin miniatura. Puedes subir una imagen en el campo de vista previa. Guarda la propuesta.'
        : file.name.toLowerCase().endsWith('.mov')
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
        <small>{storageUnavailable ? 'Activa Storage arriba o pega una URL en el campo anterior.' : imageOnly ? 'Imagen JPG, PNG o WebP hasta 20 MB.' : 'Un archivo a la vez · video hasta 500 MB. MP4 H.264/WebM se reproducen aquí; MOV se abre como archivo.'}</small>
        <input type="file" accept={imageOnly ? 'image/jpeg,image/png,image/webp' : 'image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime,.mov'} disabled={uploading || blocked || storageUnavailable} onChange={e => { const file = e.target.files?.[0]; e.target.value = ''; handleFile(file); }} />
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

function Input({ label, value, onChange, hint, type = 'text', min, max, wide = false }) {
  return <label className={`field${wide ? ' wide' : ''}`}><span>{label}</span><input type={type} min={min} max={max} value={value ?? ''} onChange={e => onChange(e.target.value)} />{hint && <small>{hint}</small>}</label>;
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
  const references = visibleProposalReferences(proposal.references);
  const themeVars = getThemeVars(proposal.themePreset, proposal.customAccent, proposal.customAccentDark);
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
  const showScripts = scriptedVideos.length > 0;
  const showCalendar = proposal.showCalendar !== false && primaryPlan.length > 0;
  const showSteps = !isMonthly && primarySteps.length > 0;
  let sectionCount = 0;
  const introNumber = showIntro ? ++sectionCount : null;
  const systemNumber = showSystem ? ++sectionCount : null;
  const scriptsNumber = showScripts ? ++sectionCount : null;
  const stepsNumber = showSteps ? ++sectionCount : null;
  const calendarNumber = showCalendar ? ++sectionCount : null;
  const visualNumber = showVisuals ? ++sectionCount : null;
  const cover = coverMediaLayout(proposal, references);
  const referenceRows = editorialReferenceRows(references);

  return (
    <div className={`${compact ? 'proposal-page luxe-page compact-preview' : 'proposal-page luxe-page'}${proposal.themePreset === 'custom' && themeVars['--lux-red'] !== themeVars['--proposal-secondary'] ? ' dual-accent' : ''}`} style={{ ...themeVars, ...typographyVariables(proposal.typographyPreset) }}>
      <header className="luxe-hero">
        <div className="luxe-glow luxe-glow-one" />
        <div className="luxe-glow luxe-glow-two" />
        <div className="wrap luxe-nav">
          <div className="luxe-brand-pair">
            <div className="brand-mark light">Euphoria<span>.</span></div>
            {proposal.vertical && <div className="luxe-nav-meta">{proposal.vertical}</div>}
          </div>
        </div>

        <div className="wrap luxe-hero-grid">
          <div className="luxe-hero-copy">
            {proposal.heroEyebrow?.trim() && <div className="luxe-chip">{proposal.heroEyebrow}</div>}
            <h1>{proposal.clientDisplayName || proposal.clientName}</h1>
            <p>{proposal.positioning}</p>
          </div>

          {cover.center && <div className="luxe-cover-stage" aria-label="Visuales de portada de la propuesta">
            <div className="luxe-cover-gallery">
              <div className={`luxe-cover-slot is-left${cover.left ? '' : ' is-empty'}`}>
                {cover.left && <VideoMockup refItem={cover.left} inCover />}
              </div>
              <div className={`luxe-cover-slot is-main${getEmbed(cover.center.url).type === 'image' ? ' is-image' : ''}`}>
                <VideoMockup refItem={cover.center} inCover />
              </div>
              <div className={`luxe-cover-slot is-right${cover.right ? '' : ' is-empty'}`}>
                {cover.right && <VideoMockup refItem={cover.right} inCover />}
              </div>
            </div>
            <MediaCarousel items={cover.items} inCover />
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

        {showScripts && <section className="luxe-section luxe-scripts-section">
          <div className="wrap">
            <div className="luxe-kicker">{String(scriptsNumber).padStart(2, '0')} · {proposal.showCalendar === false ? 'Videos y guiones' : 'Guiones del ciclo'}</div>
            <h2>{proposal.showCalendar === false && (!proposal.scriptsTitle || proposal.scriptsTitle === 'Cada pieza, una idea clara.') ? 'Videos y su desarrollo' : proposal.scriptsTitle || 'Cada pieza, una idea clara.'}</h2>
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
                      {proposal.showCalendar !== false && formatScriptDate(item.date) && <span className="luxe-script-date">Se publica {formatScriptDate(item.date)}</span>}
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

        {showCalendar && <section className="luxe-section luxe-calendar-section">
          <div className="wrap">
            <div className="luxe-kicker">{String(calendarNumber).padStart(2, '0')} · Calendario de contenido</div>
            <CalendarImageDownload proposal={proposal} themeVars={themeVars} />
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
          <div className="wrap luxe-reference-desktop">
            {referenceRows.map((row, index) => <div className={`luxe-reference-row count-${row.length}${index === 0 && getEmbed(row[0].url).type === 'image' ? ' has-featured' : ''}`} key={`${index}-${row[0]?.url}`}>
              {row.map((ref, i) => <ReferenceArticle refItem={ref} featured={index === 0 && i === 0 && getEmbed(ref.url).type === 'image'} key={`${i}-${ref.url}`} />)}
            </div>)}
          </div>
          <div className="wrap luxe-reference-mobile"><MediaCarousel items={references} /></div>
        </section>}
      </main>
    </div>
  );
}

function CalendarImageDownload({ proposal, themeVars }) {
  const [working, setWorking] = useState(false);
  const [error, setError] = useState('');

  async function downloadCalendar() {
    if (working) return;
    setWorking(true);
    setError('');
    try {
      const { blob, filename } = await createProposalCalendarPng(proposal, {
        primary: themeVars['--lux-red'], secondary: themeVars['--proposal-secondary']
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
    } catch (cause) {
      setError(cause.message || 'No se pudo descargar el calendario. Inténtalo de nuevo.');
    } finally {
      setWorking(false);
    }
  }

  return (
    <div className="luxe-calendar-download">
      <div>
        <span>Tu calendario para llevar</span>
        <strong>Descarga la propuesta de calendario de contenido</strong>
        <p>Una imagen con todas las fechas y piezas del ciclo para consultarla cuando quieras.</p>
      </div>
      <button type="button" onClick={downloadCalendar} disabled={working}>
        <Download size={18} aria-hidden="true" /> {working ? 'Preparando imagen…' : 'Descargar calendario PNG'}
      </button>
      {error && <p className="luxe-calendar-download-error" role="alert">{error}</p>}
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
  const poster = getEmbed(safe.posterUrl).type === 'image' ? safe.posterUrl : undefined;
  const [playbackError, setPlaybackError] = useState(false);
  const [imageRatio, setImageRatio] = useState(null);
  useEffect(() => { setPlaybackError(false); setImageRatio(null); }, [safe.url]);
  return (
    <div className={`luxe-video-frame luxe-media-frame is-${embed.type}`} style={imageRatio ? { '--media-ratio': imageRatio } : undefined}>
      <div className="luxe-video-body">
        {embed.type === 'image' && <img src={embed.src} alt={inCover ? 'Visual de portada' : safe.title || label || 'Referencia visual'} onLoad={event => {
          const { naturalWidth, naturalHeight } = event.currentTarget;
          if (naturalWidth && naturalHeight) setImageRatio(naturalWidth / naturalHeight);
        }} />}
        {embed.type === 'video' && !playbackError && <video src={poster ? embed.src : videoFirstFrameUrl(embed.src)} poster={poster} preload="metadata" playsInline controls
          onLoadedMetadata={event => {
            const { videoWidth, videoHeight } = event.currentTarget;
            if (videoWidth && videoHeight) setImageRatio(videoWidth / videoHeight);
          }} onError={() => setPlaybackError(true)} />}
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

function ReferenceCaption({ refItem }) {
  const type = getEmbed(refItem.url).type;
  const format = type === 'image' ? 'Imagen' : type === 'video' || type === 'iframe' ? 'Reel / video' : 'Referencia';
  return <div className="luxe-reference-copy">
    <span>{format}{refItem.pillar ? ` · ${refItem.pillar}` : ''}</span>
    {refItem.title && <h3>{refItem.title}</h3>}
    {refItem.note && <p>{refItem.note}</p>}
  </div>;
}

function ReferenceArticle({ refItem, featured = false }) {
  return <article className={`luxe-reference is-${getEmbed(refItem.url).type}${featured ? ' is-featured' : ''}`}>
    <VideoMockup refItem={refItem} label={refItem.pillar || 'Referencia visual'} />
    <ReferenceCaption refItem={refItem} />
  </article>;
}

function MediaCarousel({ items, inCover = false }) {
  const [selected, setSelected] = useState(0);
  const touchStart = useRef(null);
  const activeIndex = Math.min(selected, items.length - 1);
  const active = items[activeIndex];
  if (!active) return null;
  const move = delta => setSelected(index => Math.min(items.length - 1, Math.max(0, index + delta)));
  return <div className={`luxe-media-carousel${inCover ? ' is-cover' : ' is-references'}`}
    onTouchStart={event => { touchStart.current = event.touches[0]?.clientX ?? null; }}
    onTouchEnd={event => {
      if (touchStart.current === null) return;
      const delta = event.changedTouches[0]?.clientX - touchStart.current;
      touchStart.current = null;
      if (Math.abs(delta) > 45) move(delta < 0 ? 1 : -1);
    }}>
    <div className="luxe-carousel-current">
      <VideoMockup key={active.url} refItem={active} inCover={inCover} />
      {!inCover && <ReferenceCaption refItem={active} />}
    </div>
    {items.length > 1 && <div className="luxe-carousel-navigation">
      {!inCover && <span aria-live="polite">{activeIndex + 1} / {items.length}</span>}
      <div className="luxe-carousel-thumbs" role="group" aria-label={inCover ? 'Visuales de portada' : 'Referencias visuales'}>
        {items.map((item, index) => {
          const embed = getEmbed(item.url);
          return <button type="button" key={`${index}-${item.url}`} className={index === activeIndex ? 'is-active' : ''}
            aria-label={`Mostrar ${inCover ? 'visual de portada' : 'referencia'} ${index + 1}${item.title ? `: ${item.title}` : ''}`}
            aria-pressed={index === activeIndex} onClick={() => setSelected(index)}>
            {embed.type === 'image' || getEmbed(item.posterUrl).type === 'image'
              ? <img src={getEmbed(item.posterUrl).type === 'image' ? item.posterUrl : embed.src} alt="" loading="lazy" />
              : embed.type === 'video' ? <video src={videoFirstFrameUrl(embed.src)} preload="metadata" muted playsInline aria-hidden="true" />
                : embed.type === 'link' ? <ExternalLink size={20} aria-hidden="true" /> : <Film size={20} aria-hidden="true" />}
          </button>;
        })}
      </div>
    </div>}
  </div>;
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
