import { countProposalPieces } from './proposalCalendar.js';

export const defaultProposal = {
  status: 'draft',
  proposalType: 'initial',
  cycleNumber: 1,
  slug: 'dra-mabel-limon',
  clientName: 'Dra. Mabel Limón',
  clientDisplayName: 'Dra. Mabel Limón',
  vertical: 'Medicina estética',
  city: 'Hermosillo, Sonora',
  themePreset: 'wine',
  customAccent: '#8b1628',
  customAccentDark: '#5f1421',
  heroEyebrow: 'Estrategia digital · 2026',
  positioning: 'Posicionarte como la médica estética de referencia en Hermosillo: criterio médico, naturalidad y confianza.',
  heroMediaBackUrl: '',
  heroMediaBackHandle: '@referencia_promocional',
  heroMediaUrl: '',
  heroMediaHandle: '@dra.referencia',
  heroMediaFrontUrl: '',
  heroMediaFrontHandle: '@referencia_conexion',
  diagnosisTitle: 'Oportunidad detectada',
  diagnosisText: 'Existe una oportunidad clara de fortalecer la percepción de autoridad médica, explicar mejor los tratamientos y convertir el contenido en una herramienta para generar confianza antes de que el paciente agende una valoración.',
  strategyTitle: 'El objetivo no es cambiar tu rostro, es comunicar belleza con criterio médico.',
  strategyText: 'La estrategia se enfoca en posicionarte como una médica estética confiable, profesional y con un enfoque natural en Hermosillo. Trabajaremos contenido educativo para resolver dudas, contenido promocional para impulsar valoraciones y contenido de conexión para humanizar la marca sin perder profesionalismo.',
  audienceText: 'Mujeres y hombres de Hermosillo, aproximadamente de 25 a 55 años, que buscan verse mejor y cuidar su piel sin someterse a procedimientos invasivos ni resultados exagerados.',
  audienceLookingFor: 'Tratamientos como bótox, ácido hialurónico, skinboosters, bioestimuladores y peelings. Resultados elegantes y naturales, no un cambio drástico.',
  audienceNeeds: 'Seguridad, información y confianza antes de agendar. Valoran la naturalidad, la atención personalizada y el criterio médico.',
  agendaText: 'Cada pieza se diseña para mover al paciente de interés a valoración.',
  creativeApproach: 'La línea creativa será médica, estética, clara y cercana. No se basará en tendencias vacías: cada pieza debe reforzar confianza, autoridad y deseo de agendar una valoración.',
  systemTitle: 'Menos piezas sueltas. Más intención.',
  visualTitle: 'La propuesta se entiende viendo.',
  visualIntro: 'Las referencias viven dentro de la propuesta para que el cliente visualice ritmo, encuadre, tono y estilo sin abrir links aparte.',
  scriptsTitle: 'Cada pieza, una idea clara.',
  calendarTitle: 'Así se verá la ejecución.',
  calendarIntro: 'El contenido no solo se produce: se organiza con ritmo, intención comercial y consistencia mensual.',
  deliverablesTitle: 'Alcance de este ciclo',
  stepsTitle: 'Siguiente movimiento',
  pillars: [
    {
      label: 'Educativo / Informativo',
      title: 'Resolver dudas y generar confianza',
      text: 'Comunica medicina estética de forma clara, profesional y fácil de entender. Explica tratamientos, cuidados, diferencias y objetivos para construir autoridad médica.'
    },
    {
      label: 'Promocional',
      title: 'Impulsar valoraciones y agenda',
      text: 'Presenta tratamientos y servicios con beneficios claros, llamados a la acción y enfoque profesional. El objetivo es convertir interés en mensajes y valoraciones.'
    },
    {
      label: 'Conexión / Humanización',
      title: 'Conectar sin perder profesionalismo',
      text: 'Humaniza a la doctora y hace el contenido más cercano y compartible, cuidando una imagen estética, seria y confiable.'
    }
  ],
  references: [
    {
      pillar: 'Educativo / Informativo',
      title: 'Explicación clara cara a cámara',
      handle: '@dra.referencia',
      url: '',
      note: 'Nos gusta el ritmo, el hook inicial y la manera simple de explicar un tratamiento sin hacerlo sentir frío o técnico.'
    },
    {
      pillar: 'Promocional',
      title: 'Tratamiento + beneficio + CTA',
      handle: '@referencia_estetica',
      url: '',
      note: 'Funciona porque muestra el procedimiento de forma estética y cierra con una invitación clara a valoración.'
    },
    {
      pillar: 'Conexión / Humanización',
      title: 'Cercanía profesional',
      handle: '@referencia_medica',
      url: '',
      note: 'Nos gusta porque acerca a la doctora a la audiencia sin caer en humor forzado ni perder autoridad.'
    }
  ],
  deliverables: [
    { label: 'Reels mensuales', value: '8' },
    { label: 'Promocional / UGC', value: '1' },
    { label: 'Fotos profesionales', value: '8' },
    { label: 'Posts variados', value: '4' },
    { label: 'Sesiones de producción', value: '2' },
    { label: 'Gestión de publicaciones', value: 'Incluida' }
  ],
  monthPlan: [
    { date: '2026-06-05', piece: 'Reel 1', pillar: 'Educativo', topic: '¿Cuándo considerar bótox?', objective: 'Resolver dudas frecuentes' },
    { date: '2026-06-09', piece: 'Reel 2', pillar: 'Promocional', topic: 'Valoración facial personalizada', objective: 'Generar mensajes' },
    { date: '2026-06-12', piece: 'Foto 1', pillar: 'Branding', topic: 'Retrato profesional en consultorio', objective: 'Construir confianza visual' },
    { date: '2026-06-17', piece: 'Post 1', pillar: 'Educativo', topic: 'Mitos del ácido hialurónico', objective: 'Aumentar autoridad' }
  ],
  contentCounts: { reels: 2, posts: 1, photos: 1, ugc: 0, promocional: 0 },
  steps: [
    { title: 'Aprobación de estrategia', text: 'Validamos pilares, tono y objetivos de los primeros 30 días.' },
    { title: 'Sesión de producción', text: 'Agendamos el día de grabación en estudio o consultorio.' },
    { title: 'Calendario de contenido', text: 'Entregamos el plan mensual con fechas de publicación por pilar.' },
    { title: 'Publicación y medición', text: 'Producimos, publicamos y revisamos resultados cada mes.' }
  ],
  ctaTitle: '¿Lista para empezar?',
  ctaText: 'Cuando nos des luz verde, arrancamos con la planeación y producción del primer mes.'
};

// El ejemplo anterior se conserva solo para la acción explícita «Cargar ejemplo».
// Una propuesta nueva nunca debe heredar datos, piezas o referencias de otra clienta.
export function createBlankProposal() {
  return {
    ...defaultProposal,
    proposalType: 'monthly',
    cycleNumber: 1,
    slug: '',
    clientName: '',
    clientDisplayName: '',
    vertical: '',
    city: '',
    themePreset: 'black',
    periodStart: '',
    periodEnd: '',
    heroEyebrow: '',
    positioning: '',
    heroMediaBackUrl: '',
    heroMediaBackHandle: '',
    heroMediaUrl: '',
    heroMediaHandle: '',
    heroMediaFrontUrl: '',
    heroMediaFrontHandle: '',
    diagnosisTitle: '',
    diagnosisText: '',
    strategyTitle: '',
    strategyText: '',
    audienceText: '',
    audienceLookingFor: '',
    audienceNeeds: '',
    agendaText: '',
    creativeApproach: '',
    systemTitle: '',
    visualTitle: 'Referencias del ciclo',
    visualIntro: '',
    scriptsTitle: 'Cada pieza, una idea clara.',
    calendarTitle: 'Calendario del ciclo',
    calendarIntro: '',
    deliverablesTitle: 'Alcance del ciclo',
    stepsTitle: '',
    pillars: [],
    references: [],
    deliverables: [],
    monthPlan: [],
    contentCounts: { reels: 0, posts: 0, photos: 0, ugc: 0, promocional: 0 },
    steps: [],
    ctaTitle: '',
    ctaText: ''
  };
}

export function normalizeProposal(data = {}) {
  const isInitial = data.proposalType === 'initial' || (!data.proposalType &&
    Boolean(data.pillars?.length || data.steps?.length || data.creativeApproach));
  const empty = createBlankProposal();
  const headings = isInitial ? {
    systemTitle: defaultProposal.systemTitle,
    visualTitle: defaultProposal.visualTitle,
    visualIntro: defaultProposal.visualIntro,
    calendarTitle: defaultProposal.calendarTitle,
    calendarIntro: defaultProposal.calendarIntro,
    stepsTitle: defaultProposal.stepsTitle
  } : {};
  return {
    ...empty,
    ...headings,
    ...data,
    proposalType: isInitial ? 'initial' : 'monthly',
    pillars: Array.isArray(data.pillars) ? data.pillars : empty.pillars,
    references: Array.isArray(data.references) ? data.references : empty.references,
    deliverables: Array.isArray(data.deliverables) ? data.deliverables : empty.deliverables,
    monthPlan: Array.isArray(data.monthPlan) ? data.monthPlan : empty.monthPlan,
    contentCounts: data.contentCounts && typeof data.contentCounts === 'object' ? { ...empty.contentCounts, ...data.contentCounts }
      : countProposalPieces(Array.isArray(data.monthPlan) ? data.monthPlan : []),
    steps: Array.isArray(data.steps) ? data.steps : empty.steps
  };
}

export function createNextCycleProposal(proposal) {
  const copy = {
    ...proposal,
    proposalType: 'monthly',
    cycleNumber: (Number(proposal.cycleNumber) || 1) + 1,
    slug: '',
    periodStart: '',
    periodEnd: '',
    heroEyebrow: '',
    positioning: '',
    heroMediaBackUrl: '',
    heroMediaBackHandle: '',
    heroMediaUrl: '',
    heroMediaHandle: '',
    heroMediaFrontUrl: '',
    heroMediaFrontHandle: '',
    strategyTitle: '',
    strategyText: '',
    diagnosisText: '',
    audienceNeeds: '',
    agendaText: '',
    creativeApproach: '',
    pillars: [],
    references: [],
    steps: [],
    visualTitle: 'Referencias del ciclo',
    visualIntro: '',
    scriptsTitle: 'Cada pieza, una idea clara.',
    calendarTitle: 'Calendario del ciclo',
    calendarIntro: '',
    deliverablesTitle: 'Alcance del ciclo',
    ctaTitle: '',
    ctaText: '',
    monthPlan: [],
    contentCounts: { reels: 0, posts: 0, photos: 0, ugc: 0, promocional: 0 },
    status: 'draft'
  };
  delete copy.id;
  return copy;
}
