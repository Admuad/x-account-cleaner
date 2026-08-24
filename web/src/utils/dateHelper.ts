import { DateFilterConfig } from '@/types';

export function getPresetDateBoundaries(preset: DateFilterConfig['preset']): { startDate?: string; endDate?: string; label: string; description: string } {
  const now = new Date();
  
  switch (preset) {
    case 'before_2026':
      return {
        endDate: '2025-12-31',
        label: 'Before Dec 31, 2025',
        description: 'Purge all historical content posted prior to 2026. Preserves everything created this year.',
      };
    case 'older_1y': {
      const oneYearAgo = new Date(now);
      oneYearAgo.setFullYear(now.getFullYear() - 1);
      const iso = oneYearAgo.toISOString().split('T')[0];
      return {
        endDate: iso,
        label: 'Older than 1 Year',
        description: 'Wipe all tweets older than 365 days. Keep your last 12 months active.',
      };
    }
    case 'older_30d': {
      const thirtyDaysAgo = new Date(now);
      thirtyDaysAgo.setDate(now.getDate() - 30);
      const iso = thirtyDaysAgo.toISOString().split('T')[0];
      return {
        endDate: iso,
        label: 'Keep Recent 30 Days Only',
        description: 'Aggressive sweep keeping only your most recent 30 days of activity.',
      };
    }
    case 'all':
      return {
        label: 'All-Time Clean Slate',
        description: 'Purge entire historical timeline from inception to today (respecting Whitelist).',
      };
    case 'custom':
    default:
      return {
        label: 'Custom Date Window',
        description: 'Specify an exact start and end date range.',
      };
  }
}

export function generateXSearchQuery(handle: string, config: DateFilterConfig): string {
  const cleanHandle = handle.replace('@', '');
  if (!config.enabled || config.preset === 'all') {
    return `from:${cleanHandle}`;
  }

  const { startDate, endDate } = config.preset === 'custom' 
    ? { startDate: config.startDate, endDate: config.endDate }
    : getPresetDateBoundaries(config.preset);

  const parts = [`from:${cleanHandle}`];
  if (startDate) parts.push(`since:${startDate}`);
  if (endDate) parts.push(`until:${endDate}`);

  return parts.join(' ');
}
