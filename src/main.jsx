import React, { useEffect, useState } from 'react';
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
import { defaultProposal } from './defaultProposal';
import {
  createProposal,
  deleteProposal,
  duplicateProposal,
  getProposalById,
  getProposalBySlug,
  listProposals,
  updateProposal
} from './proposalService';
import { uploadProposalMedia } from './mediaService';

const cleanSlug = (value) => String(value || '')
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '')
  .slice(0, 80);

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
        <p className="eyebrow-red">Sistema de propuestas</p>
        <h1>Propuestas web premium, editables y listas para compartir.</h1>
        <p>Panel interno para crear propuestas comerciales con estrategia, entregables, referencias visuales y URL pública por cliente.</p>
        <div className="home-actions">
          <a className="btn btn-primary" href="/admin">Entrar al panel</a>
          <a className="btn btn-ghost" href="/p/dra-mabel-limon">Ver ejemplo público</a>
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

  async function refresh() {
    setLoading(true);
    setItems(await listProposals());
    setLoading(false);
  }

  useEffect(() => { refresh(); }, []);

  async function createNew() {
    const id = await createProposal({ ...defaultProposal, slug: cleanSlug(defaultProposal.clientName) });
    window.location.href = `/admin/edit/${id}`;
  }

  async function seedExample() {
    const exists = items.some(i => i.slug === 'dra-mabel-limon');
    if (exists) return;
    await createProposal(defaultProposal);
    await refresh();
  }

  async function duplicate(item) {
    const id = await duplicateProposal(item);
    window.location.href = `/admin/edit/${id}`;
  }

  async function remove(id) {
    const ok = confirm('¿Seguro que quieres eliminar esta propuesta?');
    if (!ok) return;
    await deleteProposal(id);
    await refresh();
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

        {loading ? <LoadingScreen label="Cargando propuestas" /> : (
          <div className="proposal-list">
            {items.length === 0 && <div className="empty-state">No hay propuestas todavía. Crea una nueva o carga el ejemplo de la Dra. Mabel.</div>}
            {items.map(item => (
              <article className="proposal-row" key={item.id}>
                <div>
                  <div className="proposal-status">{item.status === 'published' ? 'Publicada' : 'Borrador'}</div>
                  <h3>{item.clientName || 'Sin nombre'}</h3>
                  <p>{item.vertical || 'Sin vertical'} · /p/{item.slug}</p>
                </div>
                <div className="row gap wrap-row">
                  <a className="icon-btn" title="Editar" href={`/admin/edit/${item.id}`}><Save size={17} /> Editar</a>
                  <a className="icon-btn" title="Ver pública" href={`/p/${item.slug}`} target="_blank"><ExternalLink size={17} /> Ver</a>
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

  useEffect(() => {
    getProposalById(id).then((data) => {
      if (!data) {
        setProposal({ ...defaultProposal, slug: cleanSlug(defaultProposal.clientName) });
      } else {
        setProposal(normalizeProposal(data));
      }
    });
  }, [id]);

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

  async function save(status = proposal.status) {
    setSaving(true);
    setMessage('');
    const payload = { ...proposal, status, slug: cleanSlug(proposal.slug || proposal.clientName) };
    delete payload.id;
    try {
      await updateProposal(id, payload);
      setProposal(prev => ({ ...prev, ...payload }));
      setMessage(status === 'published' ? 'Propuesta publicada.' : 'Cambios guardados.');
    } catch (err) {
      setMessage('Error al guardar. Revisa Firebase o conexión.');
    } finally {
      setSaving(false);
    }
  }

  if (!proposal) return <LoadingScreen label="Abriendo editor" />;

  return (
    <div className="admin-shell">
      <AdminHeader />
      <main className="editor-layout">
        <section className="editor-panel">
          <div className="editor-topbar">
            <a className="plain-link" href="/admin"><ArrowLeft size={16} /> Volver</a>
            <div className="row gap">
              <a className="btn btn-secondary" href={`/p/${proposal.slug}`} target="_blank"><Eye size={16} /> Vista pública</a>
              <button className="btn btn-secondary" disabled={saving} onClick={() => save('draft')}><Save size={16} /> Guardar</button>
              <button className="btn btn-primary" disabled={saving} onClick={() => save('published')}>{saving ? <Loader2 className="spin" size={16} /> : null} Publicar</button>
            </div>
          </div>
          {message && <div className="save-message">{message}</div>}

          <EditorSection title="Portada y estilo">
            <Input label="Nombre del cliente" value={proposal.clientName} onChange={v => updateField('clientName', v)} />
            <Input label="Nombre visual en portada" value={proposal.clientDisplayName} onChange={v => updateField('clientDisplayName', v)} />
            <Input label="URL pública / enlace" value={proposal.slug} onChange={v => updateField('slug', cleanSlug(v))} hint={`Cambia la liga pública. Guarda y abre: /p/${proposal.slug}`} />
            <Input label="Vertical / giro" value={proposal.vertical} onChange={v => updateField('vertical', v)} />
            <Input label="Ciudad" value={proposal.city} onChange={v => updateField('city', v)} />
            <SelectField label="Paleta de acento" value={proposal.themePreset || 'wine'} onChange={v => updateField('themePreset', v)} options={PALETTE_OPTIONS.map(item => ({ value: item.value, label: item.label }))} />
            {proposal.themePreset === 'custom' && (
              <>
                <ColorField label="Color principal" value={proposal.customAccent || '#8b1628'} onChange={v => updateField('customAccent', v)} />
                <ColorField label="Color oscuro" value={proposal.customAccentDark || proposal.customAccent || '#5f1421'} onChange={v => updateField('customAccentDark', v)} />
              </>
            )}
            <Input label="Etiqueta superior" value={proposal.heroEyebrow} onChange={v => updateField('heroEyebrow', v)} />
            <Textarea label="Frase de posicionamiento" value={proposal.positioning} onChange={v => updateField('positioning', v)} />
            <div className="hero-media-admin-grid">
              <div className="hero-media-admin-card">
                <h4>Visual hero izquierdo</h4>
                <Input label="URL de imagen/video" value={proposal.heroMediaBackUrl || ''} onChange={v => updateField('heroMediaBackUrl', v)} hint="Se muestra atrás/izquierda. Si lo dejas vacío, usa la referencia visual 2." />
                <Input label="@ / etiqueta" value={proposal.heroMediaBackHandle || ''} onChange={v => updateField('heroMediaBackHandle', v)} />
                <MediaUploader
                  label="Subir visual izquierdo"
                  proposalId={proposal.id || proposal.slug}
                  onUploaded={url => updateField('heroMediaBackUrl', url)}
                />
              </div>

              <div className="hero-media-admin-card featured">
                <h4>Visual hero principal</h4>
                <Input label="URL de imagen/video" value={proposal.heroMediaUrl || ''} onChange={v => updateField('heroMediaUrl', v)} hint="Se muestra al centro. Usa MP4/WebM, JPG/PNG/WebP, YouTube o Vimeo." />
                <Input label="@ / etiqueta" value={proposal.heroMediaHandle || ''} onChange={v => updateField('heroMediaHandle', v)} />
                <MediaUploader
                  label="Subir visual principal"
                  proposalId={proposal.id || proposal.slug}
                  onUploaded={url => updateField('heroMediaUrl', url)}
                />
              </div>

              <div className="hero-media-admin-card">
                <h4>Visual hero derecho</h4>
                <Input label="URL de imagen/video" value={proposal.heroMediaFrontUrl || ''} onChange={v => updateField('heroMediaFrontUrl', v)} hint="Se muestra atrás/derecha. Si lo dejas vacío, usa la referencia visual 3." />
                <Input label="@ / etiqueta" value={proposal.heroMediaFrontHandle || ''} onChange={v => updateField('heroMediaFrontHandle', v)} />
                <MediaUploader
                  label="Subir visual derecho"
                  proposalId={proposal.id || proposal.slug}
                  onUploaded={url => updateField('heroMediaFrontUrl', url)}
                />
              </div>
            </div>
          </EditorSection>

          <EditorSection title="01 · En una frase">
            <Input label="Título principal" value={proposal.strategyTitle} onChange={v => updateField('strategyTitle', v)} />
            <Textarea label="Texto principal" value={proposal.strategyText} onChange={v => updateField('strategyText', v)} />
            <Textarea label="Texto de Autoridad" value={proposal.diagnosisText} onChange={v => updateField('diagnosisText', v)} />
            <Textarea label="Texto de Confianza" value={proposal.audienceNeeds} onChange={v => updateField('audienceNeeds', v)} />
            <Textarea label="Texto de Agenda" value={proposal.agendaText || ''} onChange={v => updateField('agendaText', v)} />
          </EditorSection>

          <EditorSection title="02 · Sistema de contenido">
            <Textarea label="Texto lateral de la sección" value={proposal.creativeApproach} onChange={v => updateField('creativeApproach', v)} />
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

          <ArraySection title="03 · Dirección visual" items={proposal.references} add={() => addArray('references', emptyReference)}>
            {proposal.references.map((item, i) => (
              <div className="array-card" key={i}>
                <div className="array-head"><b>Referencia {i + 1}</b><button onClick={() => removeArray('references', i)}><Trash2 size={15} /></button></div>
                <Input label="Pilar relacionado" value={item.pillar} onChange={v => updateArray('references', i, 'pillar', v)} />
                <Input label="Título" value={item.title} onChange={v => updateArray('references', i, 'title', v)} />
                <Input label="@ referencia" value={item.handle} onChange={v => updateArray('references', i, 'handle', v)} />
                <Input label="URL de imagen/video" value={item.url} onChange={v => updateArray('references', i, 'url', v)} hint="Puede ser imagen JPG/PNG/WebP, MP4/WebM, YouTube o Vimeo. Instagram/TikTok quedan como link externo si no permiten embeber." />
                <MediaUploader
                  label="Subir imagen/video de referencia"
                  proposalId={proposal.id || proposal.slug}
                  onUploaded={url => updateArray('references', i, 'url', url)}
                />
                <Textarea label="Qué nos gusta de esta referencia" value={item.note} onChange={v => updateArray('references', i, 'note', v)} />
              </div>
            ))}
          </ArraySection>

          <ArraySection title="04 · Entregables del paquete" items={proposal.deliverables} add={() => addArray('deliverables', emptyDeliverable)}>
            {proposal.deliverables.map((item, i) => (
              <div className="two-col array-line" key={i}>
                <Input label="Entregable" value={item.label} onChange={v => updateArray('deliverables', i, 'label', v)} />
                <Input label="Cantidad / detalle" value={item.value} onChange={v => updateArray('deliverables', i, 'value', v)} />
                <button className="mini-trash" onClick={() => removeArray('deliverables', i)}><Trash2 size={15} /></button>
              </div>
            ))}
          </ArraySection>

          <EditorSection title="04 · Importar calendario desde Euphoria OS">
            <CalendarImporter
              onImport={(result) => {
                const items = Array.isArray(result) ? result : result.items;
                const next = { monthPlan: items || [] };
                if (result?.source) next.calendarImportSource = result.source;
                if (result?.period) next.calendarImportPeriod = result.period;
                setProposal(prev => ({ ...prev, ...next }));
              }}
              existingCount={(proposal.monthPlan || []).length}
            />
          </EditorSection>

          <ArraySection title="04 · Calendario editorial" items={proposal.monthPlan} add={() => addArray('monthPlan', emptyPlan)} hint="Puedes llenar piezas manualmente o importarlas desde Euphoria OS. Si una pieza tiene fecha, se coloca en ese día real del calendario.">
            {proposal.monthPlan.map((item, i) => (
              <div className="array-card" key={i}>
                <div className="array-head"><b>Pieza del calendario {i + 1}</b><button onClick={() => removeArray('monthPlan', i)}><Trash2 size={15} /></button></div>
                <Input label="Fecha de publicación" type="date" value={item.date || ''} onChange={v => updateArray('monthPlan', i, 'date', v)} />
                <Input label="Pieza" value={item.piece} onChange={v => updateArray('monthPlan', i, 'piece', v)} />
                <Input label="Tipo" value={item.type || ''} onChange={v => updateArray('monthPlan', i, 'type', v)} />
                <Input label="Pilar" value={item.pillar} onChange={v => updateArray('monthPlan', i, 'pillar', v)} />
                <Input label="Tema" value={item.topic} onChange={v => updateArray('monthPlan', i, 'topic', v)} />
                <Input label="Objetivo" value={item.objective} onChange={v => updateArray('monthPlan', i, 'objective', v)} />
              </div>
            ))}
          </ArraySection>

          <ArraySection title="05 · Siguiente movimiento" items={proposal.steps} add={() => addArray('steps', emptyStep)}>
            {proposal.steps.map((item, i) => (
              <div className="array-card" key={i}>
                <div className="array-head"><b>Paso {i + 1}</b><button onClick={() => removeArray('steps', i)}><Trash2 size={15} /></button></div>
                <Input label="Título" value={item.title} onChange={v => updateArray('steps', i, 'title', v)} />
                <Textarea label="Descripción" value={item.text} onChange={v => updateArray('steps', i, 'text', v)} />
              </div>
            ))}
          </ArraySection>

          <EditorSection title="06 · Cierre y CTA">
            <Input label="Título final" value={proposal.ctaTitle} onChange={v => updateField('ctaTitle', v)} />
            <Textarea label="Texto final" value={proposal.ctaText} onChange={v => updateField('ctaText', v)} />
            <Input label="Link de WhatsApp" value={proposal.whatsappUrl} onChange={v => updateField('whatsappUrl', v)} />
          </EditorSection>
        </section>

        <aside className="preview-panel">
          <ProposalPage proposal={proposal} compact />
        </aside>
      </main>
    </div>
  );
}

function normalizeProposal(data) {
  return {
    ...defaultProposal,
    ...data,
    pillars: data.pillars?.length ? data.pillars : defaultProposal.pillars,
    references: data.references?.length ? data.references : defaultProposal.references,
    deliverables: data.deliverables?.length ? data.deliverables : defaultProposal.deliverables,
    monthPlan: data.monthPlan?.length ? data.monthPlan : defaultProposal.monthPlan,
    steps: data.steps?.length ? data.steps : defaultProposal.steps
  };
}

function EditorSection({ title, children }) {
  return <section className="editor-section"><h2>{title}</h2><div className="field-grid">{children}</div></section>;
}

function ArraySection({ title, children, add }) {
  return (
    <section className="editor-section">
      <div className="section-row"><h2>{title}</h2><button className="btn btn-secondary small-btn" onClick={add}><Plus size={15} /> Agregar</button></div>
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


function MediaUploader({ label = 'Subir archivo', proposalId, onUploaded }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState('');

  async function handleFile(file) {
    if (!file) return;
    setUploading(true);
    setMessage('');
    try {
      const url = await uploadProposalMedia(file, proposalId || 'propuesta');
      onUploaded(url);
      setMessage('Archivo subido. Guarda la propuesta para conservarlo.');
    } catch (err) {
      setMessage(err?.message || 'No se pudo subir. Pega una URL pública del archivo.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <label className="field media-upload-field">
      <span>{label}</span>
      <div className="media-upload-box">
        <UploadCloud size={16} />
        <strong>{uploading ? 'Subiendo…' : 'Seleccionar archivo'}</strong>
        <small>Imágenes o videos. Para archivos pesados, mejor usa YouTube/Vimeo/Drive y pega el link.</small>
        <input type="file" accept="image/*,video/mp4,video/webm,video/quicktime" disabled={uploading} onChange={e => handleFile(e.target.files?.[0])} />
      </div>
      {message && <small>{message}</small>}
    </label>
  );
}

function Input({ label, value, onChange, hint, type = 'text' }) {
  return <label className="field"><span>{label}</span><input type={type} value={value || ''} onChange={e => onChange(e.target.value)} />{hint && <small>{hint}</small>}</label>;
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

function Textarea({ label, value, onChange }) {
  return <label className="field wide"><span>{label}</span><textarea value={value || ''} onChange={e => onChange(e.target.value)} rows={4} /></label>;
}

function PublicProposal({ slug }) {
  const [proposal, setProposal] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProposalBySlug(slug).then((data) => {
      setProposal(data ? normalizeProposal(data) : null);
      setLoading(false);
    });
  }, [slug]);

  if (loading) return <LoadingScreen label="Cargando propuesta" />;
  if (!proposal) {
    if (slug === 'dra-mabel-limon' && !firebaseReady) return <ProposalPage proposal={defaultProposal} />;
    return <div className="not-found"><h1>Propuesta no encontrada</h1><p>Revisa que el link esté escrito correctamente.</p><a href="/admin">Ir al panel</a></div>;
  }
  return <ProposalPage proposal={proposal} />;
}

function trimText(text = '', max = 150) {
  const clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/\s+\S*$/, '')}...`;
}

function ProposalPage({ proposal, compact = false }) {
  const references = (proposal.references || []).filter(Boolean).slice(0, 3);
  const themeVars = getThemeVars(proposal.themePreset, proposal.customAccent, proposal.customAccentDark);
  const primaryDeliverables = (proposal.deliverables || []).filter(d => d?.label || d?.value).slice(0, 6);
  const primarySteps = (proposal.steps || [])
    .filter(s => s?.title || s?.text)
    .filter(s => !/calendario/i.test(`${s?.title || ''} ${s?.text || ''}`))
    .slice(0, 4);
  const primaryPlan = (proposal.monthPlan || []).filter(row => row?.topic || row?.piece);
  const pillars = (proposal.pillars || []).slice(0, 3);
  const heroBackItem = proposal.heroMediaBackUrl
    ? { url: proposal.heroMediaBackUrl, handle: proposal.heroMediaBackHandle || references[1]?.handle, title: 'Hero visual izquierdo' }
    : references[1];
  const heroMainItem = proposal.heroMediaUrl
    ? { url: proposal.heroMediaUrl, handle: proposal.heroMediaHandle || references[0]?.handle, title: 'Hero visual principal' }
    : references[0];
  const heroFrontItem = proposal.heroMediaFrontUrl
    ? { url: proposal.heroMediaFrontUrl, handle: proposal.heroMediaFrontHandle || references[2]?.handle, title: 'Hero visual derecho' }
    : references[2];

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
            <div className="luxe-chip">{proposal.heroEyebrow || 'Estrategia digital · 2026'}</div>
            <h1>{proposal.clientDisplayName || proposal.clientName}</h1>
            <p>{proposal.positioning}</p>
            <div className="luxe-hero-actions">
              {proposal.whatsappUrl && <a className="luxe-btn" href={proposal.whatsappUrl} target="_blank" rel="noreferrer">Confirmar propuesta</a>}
              <span>Preparado por Euphoria Agency</span>
            </div>
          </div>

          <div className="luxe-phone-stage" aria-label="Referencias visuales de la propuesta">
            <div className="luxe-phone luxe-phone-back"><VideoMockup refItem={heroBackItem} label="Promocional" /></div>
            <div className="luxe-phone luxe-phone-main"><VideoMockup refItem={heroMainItem} label="Educativo" /></div>
            <div className="luxe-phone luxe-phone-front"><VideoMockup refItem={heroFrontItem} label="Conexión" /></div>
          </div>
        </div>

        <div className="wrap luxe-hero-footer">
          <span>{proposal.clientName}</span>
          <span>{proposal.city}</span>
          <span>{new Date().getFullYear()}</span>
        </div>
      </header>

      <main className="luxe-main">
        <section className="luxe-section luxe-intro">
          <div className="wrap luxe-intro-grid">
            <div>
              <div className="luxe-kicker">01 · En una frase</div>
              <h2>{proposal.strategyTitle || 'Contenido con dirección comercial.'}</h2>
            </div>
            <div className="luxe-intro-copy">
              <p>{proposal.strategyText}</p>
              <div className="luxe-proof-grid">
                <LuxeMetric title="Autoridad" text={proposal.diagnosisText} />
                <LuxeMetric title="Confianza" text={proposal.audienceNeeds} />
                <LuxeMetric title="Agenda" text={proposal.agendaText || 'Cada pieza se diseña para mover al paciente de interés a valoración.'} />
              </div>
            </div>
          </div>
        </section>

        <section className="luxe-section luxe-system">
          <div className="wrap">
            <div className="luxe-section-head">
              <div>
                <div className="luxe-kicker">02 · Sistema de contenido</div>
                <h2>Menos piezas sueltas. Más intención.</h2>
              </div>
              <p>{proposal.creativeApproach}</p>
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
        </section>

        <section className="luxe-section luxe-visuals">
          <div className="wrap luxe-visuals-head">
            <div>
              <div className="luxe-kicker">03 · Dirección visual</div>
              <h2>La propuesta se entiende viendo.</h2>
            </div>
            <p>Las referencias viven dentro de la propuesta para que el cliente visualice ritmo, encuadre, tono y estilo sin abrir links aparte.</p>
          </div>
          <div className="wrap luxe-reference-grid">
            {references.length ? references.map((ref, i) => (
              <article className="luxe-reference" key={i}>
                <VideoMockup refItem={ref} label={ref.pillar || `Referencia ${i + 1}`} />
                <div>
                  <span>{ref.pillar}</span>
                  <h3>{ref.title}</h3>
                  <p>{ref.note}</p>
                </div>
              </article>
            )) : <div className="empty-state">Agrega referencias visuales desde el editor.</div>}
          </div>
        </section>

        <section className="luxe-section luxe-calendar-section">
          <div className="wrap">
            <div className="luxe-calendar-head">
              <div>
                <div className="luxe-kicker">04 · Calendario editorial</div>
                <h2>Así se verá la ejecución.</h2>
              </div>
              <p>El contenido no solo se produce: se organiza con ritmo, intención comercial y consistencia mensual.</p>
            </div>
            <LuxeCalendarPreview plan={primaryPlan} clientName={proposal.clientName} deliverables={primaryDeliverables} />
          </div>
        </section>

        <section className="luxe-section luxe-launch luxe-launch-steps-only">
          <div className="wrap luxe-steps-center">
            <div className="luxe-steps-card">
              <div className="luxe-kicker">05 · Arranque</div>
              <h3>Siguiente movimiento</h3>
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
        </section>
      </main>

      <footer className="luxe-close">
        <div className="wrap">
          <span className="luxe-kicker">Cierre</span>
          <h2>{proposal.ctaTitle || '¿Lista para empezar?'}</h2>
          <p>{proposal.ctaText}</p>
          {proposal.whatsappUrl && <a className="luxe-btn" href={proposal.whatsappUrl} target="_blank" rel="noreferrer">Confirmar por WhatsApp</a>}
          <div className="luxe-close-foot">Euphoria Agency · {proposal.city}</div>
        </div>
      </footer>
    </div>
  );
}

function LuxeCalendarPreview({ plan = [], clientName = '', deliverables = [] }) {
  const weekdayLabels = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  const filled = (plan || []).filter(item => item?.piece || item?.topic || item?.date);
  const datedItems = filled
    .map((item, index) => ({ ...item, index, parsedDate: parseLocalDate(item.date) }))
    .filter(item => item.parsedDate);

  const hasRealDates = datedItems.length > 0;
  const anchorDate = hasRealDates
    ? new Date(Math.min(...datedItems.map(item => item.parsedDate.getTime())))
    : new Date(2026, 5, 1);
  const firstDay = hasRealDates
    ? addDays(anchorDate, -anchorDate.getDay())
    : addDays(anchorDate, -anchorDate.getDay());

  const datedKey = (date) => date.toISOString().slice(0, 10);
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

  const cells = Array.from({ length: 35 }, (_, index) => {
    const date = addDays(firstDay, index);
    const key = datedKey(date);
    return { date, key, items: placements.get(key) || [] };
  });

  function toneFor(item = {}) {
    const text = `${item?.pillar || ''} ${item?.piece || ''} ${item?.type || ''}`.toLowerCase();
    if (text.includes('promo')) return 'accent';
    if (text.includes('foto') || text.includes('photo') || text.includes('brand')) return 'soft';
    if (text.includes('post') || text.includes('carrusel')) return 'neutral';
    return 'dark';
  }

  return (
    <div className="luxe-calendar-card">
      <div className="luxe-calendar-top">
        <div>
          <span>Calendario del cliente</span>
          <strong>{clientName || 'Cliente'}</strong>
          <p>{hasRealDates ? formatDateRange(datedItems.map(item => item.parsedDate)) : 'Vista editorial de ejemplo. Agrega fechas para mostrar el calendario real.'}</p>
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

function VideoMockup({ refItem, label }) {
  const safe = refItem || {};
  const embed = getEmbed(safe.url);
  return (
    <div className="luxe-video-frame">
      <div className="luxe-video-top"><span /> <span /> <span /></div>
      <div className="luxe-video-body">
        {embed.type === 'image' && <img src={safe.url} alt={safe.title || label || 'Referencia visual'} />}
        {embed.type === 'video' && <video src={safe.url} muted loop playsInline controls />}
        {embed.type === 'iframe' && <iframe src={embed.src} title={safe.title || label} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen />}
        {embed.type === 'link' && (
          <div className="luxe-video-placeholder">
            <small>{label || 'Referencia visual'}</small>
            {safe.url ? <a href={safe.url} target="_blank" rel="noreferrer">Abrir referencia</a> : <strong>Referencia visual</strong>}
          </div>
        )}
      </div>
      <div className="luxe-video-caption">
        <span>{safe.handle || '@referencia'}</span>
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
        {refItem.handle && <span className="reel-credit">{refItem.handle}</span>}
      </div>
      <h3>{refItem.title}</h3>
      <p>{refItem.note}</p>
    </div>
  );
}

function getEmbed(url = '') {
  if (!url) return { type: 'link' };
  const clean = url.trim();
  if (/\.(jpg|jpeg|png|webp|gif|avif)(\?.*)?$/i.test(clean)) return { type: 'image' };
  if (/^data:image\//i.test(clean)) return { type: 'image' };
  if (/\.(mp4|webm|mov)(\?.*)?$/i.test(clean)) return { type: 'video' };
  if (/^data:video\//i.test(clean)) return { type: 'video' };
  const yt = clean.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/)([\w-]+)/);
  if (yt) return { type: 'iframe', src: `https://www.youtube.com/embed/${yt[1]}` };
  const vimeo = clean.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return { type: 'iframe', src: `https://player.vimeo.com/video/${vimeo[1]}` };
  return { type: 'link' };
}

createRoot(document.getElementById('root')).render(<App />);
