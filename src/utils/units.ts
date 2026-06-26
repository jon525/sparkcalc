import { formatNumber } from './format';

export type UnitGroup = 'current' | 'voltage' | 'resistance' | 'power' | 'apparentPower' | 'energy' | 'length' | 'area';

export const unitFactors: Record<UnitGroup, Record<string, number>> = {
  current: { uA: 0.000001, mA: 0.001, A: 1, kA: 1000 },
  voltage: { uV: 0.000001, mV: 0.001, V: 1, kV: 1000, MV: 1000000 },
  resistance: { mohm: 0.001, ohm: 1, kohm: 1000, Mohm: 1000000 },
  power: { mW: 0.001, W: 1, kW: 1000, MW: 1000000 },
  apparentPower: { VA: 1, kVA: 1000, MVA: 1000000 },
  energy: { Wh: 1, kWh: 1000, MWh: 1000000 },
  length: { mm: 0.001, cm: 0.01, m: 1, km: 1000 },
  area: { mm2: 0.000001, cm2: 0.0001, m2: 1 }
};

export const unitLabels: Record<string, string> = {
  uA: 'microamp',
  uV: 'microvolt',
  mohm: 'milliohm',
  ohm: 'ohm',
  kohm: 'kohm',
  Mohm: 'Mohm',
  mm2: 'mm2',
  cm2: 'cm2',
  m2: 'm2'
};

export const convertUnit = (value: number, from: string, to: string, group: UnitGroup): number => {
  const factors = unitFactors[group];
  if (!(from in factors) || !(to in factors)) {
    throw new Error(`Unsupported ${group} conversion from ${from} to ${to}`);
  }
  return (value * factors[from]) / factors[to];
};

export const toBase = (value: number | undefined, unit: string, group: UnitGroup): number | undefined => {
  if (value === undefined) return undefined;
  return convertUnit(value, unit, baseUnit(group), group);
};

export const baseUnit = (group: UnitGroup): string => {
  const bases: Record<UnitGroup, string> = {
    current: 'A',
    voltage: 'V',
    resistance: 'ohm',
    power: 'W',
    apparentPower: 'VA',
    energy: 'Wh',
    length: 'm',
    area: 'm2'
  };
  return bases[group];
};

export const conversionLine = (
  label: string,
  input: number | undefined,
  from: string,
  base: string,
  group: UnitGroup,
  decimals = 4
): string | undefined => {
  if (input === undefined) return undefined;
  const converted = convertUnit(input, from, base, group);
  const fromLabel = unitLabels[from] ?? from;
  const baseLabel = unitLabels[base] ?? base;
  return `${label}: ${formatNumber(input, decimals)} ${fromLabel} = ${formatNumber(converted, decimals)} ${baseLabel}`;
};

export const allConversions = (value: number, group: UnitGroup, fromBase = true, decimals = 4): string[] => {
  const factors = unitFactors[group];
  const base = baseUnit(group);
  return Object.keys(factors).map((unit) => {
    const converted = fromBase ? convertUnit(value, base, unit, group) : value;
    const label = unitLabels[unit] ?? unit;
    return `${formatNumber(converted, decimals)} ${label}`;
  });
};
