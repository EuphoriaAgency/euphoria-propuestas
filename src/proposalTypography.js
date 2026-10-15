export const TYPOGRAPHY_PRESETS = [
  { value: 'editorial', label: 'Combinación · Fraunces / Inter', heading: "'Fraunces', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
  { value: 'clinical', label: 'Combinación · Manrope / Inter', heading: "'Manrope', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
  { value: 'gastronomy', label: 'Combinación · DM Serif / DM Sans', heading: "'DM Serif Display', Georgia, serif", body: "'DM Sans', system-ui, sans-serif" },
  { value: 'modern', label: 'Combinación · Outfit / DM Sans', heading: "'Outfit', system-ui, sans-serif", body: "'DM Sans', system-ui, sans-serif" },
  { value: 'classic', label: 'Combinación · DM Serif / Inter', heading: "'DM Serif Display', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
  { value: 'impact', label: 'Combinación · Bebas Neue / Manrope', heading: "'Bebas Neue', 'Manrope', sans-serif", body: "'Manrope', system-ui, sans-serif" },
  { value: 'atelier', label: 'Editorial fina · Cormorant / Manrope', heading: "'Cormorant Garamond', Georgia, serif", body: "'Manrope', system-ui, sans-serif" },
  { value: 'heritage', label: 'Sobria · Libre Baskerville / Inter', heading: "'Libre Baskerville', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
  { value: 'maison', label: 'Clásica · Playfair / DM Sans', heading: "'Playfair Display', Georgia, serif", body: "'DM Sans', system-ui, sans-serif" },
  { value: 'journal', label: 'Cálida · Lora / Jost', heading: "'Lora', Georgia, serif", body: "'Jost', system-ui, sans-serif" },
  { value: 'studio', label: 'Estudio · Space Grotesk / Inter', heading: "'Space Grotesk', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
  { value: 'future', label: 'Precisa · Sora / Manrope', heading: "'Sora', system-ui, sans-serif", body: "'Manrope', system-ui, sans-serif" },
  { value: 'essential', label: 'Minimalista · Plus Jakarta / Inter', heading: "'Plus Jakarta Sans', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
  { value: 'portrait', label: 'Retrato · Cormorant / Jost', heading: "'Cormorant Garamond', Georgia, serif", body: "'Jost', system-ui, sans-serif" },
  { value: 'single-inter', label: 'Una fuente · Inter', heading: "'Inter', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
  { value: 'single-manrope', label: 'Una fuente · Manrope', heading: "'Manrope', system-ui, sans-serif", body: "'Manrope', system-ui, sans-serif" },
  { value: 'single-outfit', label: 'Una fuente · Outfit', heading: "'Outfit', system-ui, sans-serif", body: "'Outfit', system-ui, sans-serif" },
  { value: 'single-dm-sans', label: 'Una fuente · DM Sans', heading: "'DM Sans', system-ui, sans-serif", body: "'DM Sans', system-ui, sans-serif" },
  { value: 'single-space', label: 'Una fuente · Space Grotesk', heading: "'Space Grotesk', system-ui, sans-serif", body: "'Space Grotesk', system-ui, sans-serif" },
  { value: 'single-sora', label: 'Una fuente · Sora', heading: "'Sora', system-ui, sans-serif", body: "'Sora', system-ui, sans-serif" },
  { value: 'single-jakarta', label: 'Una fuente · Plus Jakarta Sans', heading: "'Plus Jakarta Sans', system-ui, sans-serif", body: "'Plus Jakarta Sans', system-ui, sans-serif" },
  { value: 'single-jost', label: 'Una fuente · Jost', heading: "'Jost', system-ui, sans-serif", body: "'Jost', system-ui, sans-serif" }
];

export function typographyVariables(preset = 'editorial') {
  const selected = TYPOGRAPHY_PRESETS.find(item => item.value === preset) || TYPOGRAPHY_PRESETS[0];
  return {
    '--proposal-heading-font': selected.heading,
    '--proposal-body-font': selected.body
  };
}
