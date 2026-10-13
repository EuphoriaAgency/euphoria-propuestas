const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;
const validDay = value => {
  if (!ISO_DAY.test(String(value || ''))) return false;
  const time = Date.parse(`${value}T00:00:00Z`);
  return !Number.isNaN(time) && new Date(time).toISOString().slice(0, 10) === value;
};

export { validDay };

export function resolveProposalPeriod(proposal = {}) {
  const dates = (proposal.monthPlan || [])
    .map(item => item?.date)
    .filter(validDay)
    .sort();
  const imported = proposal.calendarImportPeriod || {};
  const importStillMatches = dates.some(day => validDay(imported.startDate) && validDay(imported.endDate) && day >= imported.startDate && day <= imported.endDate);
  return {
    start: (validDay(proposal.periodStart) && proposal.periodStart) || (importStillMatches && imported.startDate) || dates[0] || '',
    end: (validDay(proposal.periodEnd) && proposal.periodEnd) || (importStillMatches && imported.endDate) || dates.at(-1) || ''
  };
}
