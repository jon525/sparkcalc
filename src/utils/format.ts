export const formatNumber = (value: number, decimals = 2): string => {
  if (!Number.isFinite(value)) return 'n/a';
  const fixed = value.toFixed(decimals);
  return fixed.replace(/\.?0+$/, '');
};

export const formatWithUnit = (value: number, unit: string, decimals = 2): string =>
  `${formatNumber(value, decimals)} ${unit}`;

export const currency = (value: number): string =>
  new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value);
