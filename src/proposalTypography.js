export const TYPOGRAPHY_PRESETS = [
  { value: 'editorial', label: 'Editorial · Fraunces + Inter', heading: "'Fraunces', Georgia, serif", body: "'Inter', system-ui, sans-serif" },
  { value: 'clinical', label: 'Sobria · Manrope + Inter', heading: "'Manrope', system-ui, sans-serif", body: "'Inter', system-ui, sans-serif" },
  { value: 'gastronomy', label: 'Gastronomía · DM Serif + DM Sans', heading: "'DM Serif Display', Georgia, serif", body: "'DM Sans', system-ui, sans-serif" },
  { value: 'modern', label: 'Moderna · Outfit + DM Sans', heading: "'Outfit', system-ui, sans-serif", body: "'DM Sans', system-ui, sans-serif" }
];

export function typographyVariables(preset = 'editorial') {
  const selected = TYPOGRAPHY_PRESETS.find(item => item.value === preset) || TYPOGRAPHY_PRESETS[0];
  return {
    '--proposal-heading-font': selected.heading,
    '--proposal-body-font': selected.body
  };
}

export function sectionTypographyVariables(proposal, section) {
  const preset = proposal?.sectionTypography?.[section];
  return preset && preset !== 'inherit' ? typographyVariables(preset) : {};
}
