export const TYPOGRAPHY_PRESETS = [
  { value: 'editorial', label: 'Combinación · Fraunces / Inter', heading: "'Fraunces', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
  { value: 'clinical', label: 'Combinación · Manrope / Inter', heading: "'Manrope', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
  { value: 'gastronomy', label: 'Combinación · DM Serif / DM Sans', heading: "'DM Serif Display', Georgia, serif", body: "'DM Sans', system-ui, sans-serif" },
  { value: 'modern', label: 'Combinación · Outfit / DM Sans', heading: "'Outfit', system-ui, sans-serif", body: "'DM Sans', system-ui, sans-serif" },
  { value: 'classic', label: 'Combinación · DM Serif / Inter', heading: "'DM Serif Display', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
  { value: 'impact', label: 'Combinación · Bebas Neue / Manrope', heading: "'Bebas Neue', 'Manrope', sans-serif", body: "'Manrope', system-ui, sans-serif" },
  { value: 'single-inter', label: 'Una fuente · Inter', heading: "'Inter', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
  { value: 'single-manrope', label: 'Una fuente · Manrope', heading: "'Manrope', system-ui, sans-serif", body: "'Manrope', system-ui, sans-serif" },
  { value: 'single-outfit', label: 'Una fuente · Outfit', heading: "'Outfit', system-ui, sans-serif", body: "'Outfit', system-ui, sans-serif" },
  { value: 'single-dm-sans', label: 'Una fuente · DM Sans', heading: "'DM Sans', system-ui, sans-serif", body: "'DM Sans', system-ui, sans-serif" }
];

export function typographyVariables(preset = 'editorial') {
  const selected = TYPOGRAPHY_PRESETS.find(item => item.value === preset) || TYPOGRAPHY_PRESETS[0];
  return {
    '--proposal-heading-font': selected.heading,
    '--proposal-body-font': selected.body
  };
}
