import { CalculationResult } from '../types';
import { formatNumber, formatWithUnit, currency } from './format';
import { allConversions, conversionLine, toBase } from './units';
import { missingTwoInputWarning, validateNumber } from './validation';

type OhmsInputs = {
  voltage?: number;
  voltageUnit: string;
  current?: number;
  currentUnit: string;
  resistance?: number;
  resistanceUnit: string;
  power?: number;
  powerUnit: string;
};

export const calculateOhmsLaw = (inputs: OhmsInputs, decimals = 2): CalculationResult => {
  const v = toBase(inputs.voltage, inputs.voltageUnit, 'voltage');
  const i = toBase(inputs.current, inputs.currentUnit, 'current');
  const r = toBase(inputs.resistance, inputs.resistanceUnit, 'resistance');
  const p = toBase(inputs.power, inputs.powerUnit, 'power');
  const known = [v, i, r, p].filter((value) => value !== undefined).length;
  const warnings = [
    ...missingTwoInputWarning(known),
    ...validateNumber('Voltage', v, { allowZero: true, maxRealistic: 100000 }),
    ...validateNumber('Current', i, { allowZero: true, maxRealistic: 10000 }),
    ...validateNumber('Resistance', r, { allowZero: true, maxRealistic: 100000000 }),
    ...validateNumber('Power', p, { allowZero: true, maxRealistic: 10000000 })
  ];
  if (known < 2) {
    return { answer: 'Enter two known values', formula: 'V = I x R, P = V x I', working: [], conversions: [], warnings };
  }

  let voltage = v;
  let current = i;
  let resistance = r;
  let power = p;
  const working: string[] = [];

  if (voltage === undefined && current !== undefined && resistance !== undefined) {
    // Ohm's Law: voltage equals current multiplied by resistance.
    voltage = current * resistance;
    working.push('V = I x R', `V = ${formatNumber(current, 4)} x ${formatNumber(resistance, 4)}`, `V = ${formatNumber(voltage, decimals)} V`);
  } else if (current === undefined && voltage !== undefined && resistance !== undefined && resistance !== 0) {
    // Ohm's Law rearranged: current equals voltage divided by resistance.
    current = voltage / resistance;
    working.push('I = V / R', `I = ${formatNumber(voltage, 4)} / ${formatNumber(resistance, 4)}`, `I = ${formatNumber(current, decimals)} A`);
  } else if (resistance === undefined && voltage !== undefined && current !== undefined && current !== 0) {
    // Ohm's Law rearranged: resistance equals voltage divided by current.
    resistance = voltage / current;
    working.push('R = V / I', `R = ${formatNumber(voltage, 4)} / ${formatNumber(current, 4)}`, `R = ${formatNumber(resistance, decimals)} ohm`);
  }

  if (power === undefined) {
    if (voltage !== undefined && current !== undefined) {
      // Electrical power in watts equals volts multiplied by amps.
      power = voltage * current;
      working.push('P = V x I', `P = ${formatNumber(voltage, 4)} x ${formatNumber(current, 4)}`, `P = ${formatNumber(power, decimals)} W`);
    } else if (current !== undefined && resistance !== undefined) {
      power = current ** 2 * resistance;
      working.push('P = I^2 x R', `P = ${formatNumber(current, 4)}^2 x ${formatNumber(resistance, 4)}`, `P = ${formatNumber(power, decimals)} W`);
    } else if (voltage !== undefined && resistance !== undefined && resistance !== 0) {
      power = voltage ** 2 / resistance;
      working.push('P = V^2 / R', `P = ${formatNumber(voltage, 4)}^2 / ${formatNumber(resistance, 4)}`, `P = ${formatNumber(power, decimals)} W`);
    }
  }

  if ((resistance === 0 && current === undefined) || (current === 0 && resistance === undefined)) {
    warnings.push('Cannot divide by zero. Check the zero value before trusting the answer.');
  }

  const conversions = [
    conversionLine('Voltage', inputs.voltage, inputs.voltageUnit, 'V', 'voltage'),
    conversionLine('Current', inputs.current, inputs.currentUnit, 'A', 'current'),
    conversionLine('Resistance', inputs.resistance, inputs.resistanceUnit, 'ohm', 'resistance'),
    conversionLine('Power', inputs.power, inputs.powerUnit, 'W', 'power')
  ].filter(Boolean) as string[];

  const answerParts = [
    voltage !== undefined ? formatWithUnit(voltage, 'V', decimals) : undefined,
    current !== undefined ? formatWithUnit(current, 'A', decimals) : undefined,
    resistance !== undefined ? formatWithUnit(resistance, 'ohm', decimals) : undefined,
    power !== undefined ? formatWithUnit(power, 'W', decimals) : undefined
  ].filter(Boolean);

  return {
    answer: answerParts.join(' | '),
    formula: 'V = I x R, I = V / R, R = V / I, P = V x I',
    working,
    conversions,
    warnings,
    values: { voltage: voltage ?? NaN, current: current ?? NaN, resistance: resistance ?? NaN, power: power ?? NaN }
  };
};

type PowerInputs = { solveFor: 'power' | 'voltage' | 'current' | 'pf'; voltage?: number; current?: number; pf?: number; power?: number; powerUnit?: string };

export const calculateSinglePhasePower = (inputs: PowerInputs, decimals = 2): CalculationResult => {
  const powerW = toBase(inputs.power, inputs.powerUnit ?? 'W', 'power');
  const warnings = [
    ...validateNumber('Voltage', inputs.voltage, { required: inputs.solveFor !== 'voltage', maxRealistic: 100000 }),
    ...validateNumber('Current', inputs.current, { required: inputs.solveFor !== 'current', maxRealistic: 10000 }),
    ...validateNumber('Power factor', inputs.pf, { required: inputs.solveFor !== 'pf', maxRealistic: 1 }),
    ...validateNumber('Power', powerW, { required: inputs.solveFor !== 'power', maxRealistic: 10000000 })
  ];
  if (inputs.pf !== undefined && (inputs.pf < 0 || inputs.pf > 1)) warnings.push('Power factor is usually between 0 and 1.');

  let result: number | undefined;
  let answer = '';
  const working: string[] = [];
  if (inputs.solveFor === 'power' && inputs.voltage !== undefined && inputs.current !== undefined && inputs.pf !== undefined) {
    // Single-phase real power equals volts multiplied by amps and power factor.
    result = inputs.voltage * inputs.current * inputs.pf;
    working.push('P = V x I x PF', `P = ${inputs.voltage} x ${inputs.current} x ${inputs.pf}`, `P = ${formatNumber(result, decimals)} W`);
    answer = `${formatWithUnit(result, 'W', decimals)} (${formatWithUnit(result / 1000, 'kW', decimals)})`;
  } else if (inputs.solveFor === 'voltage' && powerW !== undefined && inputs.current !== undefined && inputs.pf !== undefined && inputs.current * inputs.pf !== 0) {
    result = powerW / (inputs.current * inputs.pf);
    working.push('V = P / (I x PF)', `V = ${formatNumber(powerW, 4)} / (${inputs.current} x ${inputs.pf})`, `V = ${formatNumber(result, decimals)} V`);
    answer = formatWithUnit(result, 'V', decimals);
  } else if (inputs.solveFor === 'current' && powerW !== undefined && inputs.voltage !== undefined && inputs.pf !== undefined && inputs.voltage * inputs.pf !== 0) {
    result = powerW / (inputs.voltage * inputs.pf);
    working.push('I = P / (V x PF)', `I = ${formatNumber(powerW, 4)} / (${inputs.voltage} x ${inputs.pf})`, `I = ${formatNumber(result, decimals)} A`);
    answer = formatWithUnit(result, 'A', decimals);
  } else if (inputs.solveFor === 'pf' && powerW !== undefined && inputs.voltage !== undefined && inputs.current !== undefined && inputs.voltage * inputs.current !== 0) {
    result = powerW / (inputs.voltage * inputs.current);
    working.push('PF = P / (V x I)', `PF = ${formatNumber(powerW, 4)} / (${inputs.voltage} x ${inputs.current})`, `PF = ${formatNumber(result, decimals)}`);
    answer = formatNumber(result, decimals);
  } else {
    warnings.push('Add the required values to solve this calculation.');
    answer = 'Waiting for inputs';
  }

  return {
    answer,
    formula: 'P = V x I x PF',
    working,
    conversions: powerW !== undefined ? [`${formatWithUnit(powerW, 'W', decimals)} = ${formatWithUnit(powerW / 1000, 'kW', decimals)}`, `${formatWithUnit(powerW, 'VA', decimals)} = ${formatWithUnit(powerW / 1000, 'kVA', decimals)} when PF is treated as apparent power context`] : [],
    warnings,
    values: { result: result ?? NaN }
  };
};

export const calculateThreePhasePower = (inputs: PowerInputs, decimals = 2): CalculationResult => {
  const rootThree = Math.sqrt(3);
  const powerW = toBase(inputs.power, inputs.powerUnit ?? 'W', 'power');
  const warnings = [
    ...validateNumber('Line voltage', inputs.voltage, { required: inputs.solveFor !== 'voltage', maxRealistic: 100000 }),
    ...validateNumber('Current', inputs.current, { required: inputs.solveFor !== 'current', maxRealistic: 10000 }),
    ...validateNumber('Power factor', inputs.pf, { required: inputs.solveFor !== 'pf', maxRealistic: 1 }),
    ...validateNumber('Power', powerW, { required: inputs.solveFor !== 'power', maxRealistic: 10000000 })
  ];
  if (inputs.pf !== undefined && (inputs.pf < 0 || inputs.pf > 1)) warnings.push('Power factor is usually between 0 and 1.');

  let result: number | undefined;
  let answer = '';
  const working = ['sqrt(3) is approximately 1.732'];
  if (inputs.solveFor === 'power' && inputs.voltage !== undefined && inputs.current !== undefined && inputs.pf !== undefined) {
    // Three-phase real power uses line voltage, line current, power factor, and sqrt(3).
    result = rootThree * inputs.voltage * inputs.current * inputs.pf;
    working.push('P = sqrt(3) x V x I x PF', `P = 1.732 x ${inputs.voltage} x ${inputs.current} x ${inputs.pf}`, `P = ${formatNumber(result, decimals)} W`, `P = ${formatNumber(result / 1000, decimals)} kW`);
    answer = `${formatWithUnit(result, 'W', decimals)} (${formatWithUnit(result / 1000, 'kW', decimals)})`;
  } else if (inputs.solveFor === 'voltage' && powerW !== undefined && inputs.current !== undefined && inputs.pf !== undefined && rootThree * inputs.current * inputs.pf !== 0) {
    result = powerW / (rootThree * inputs.current * inputs.pf);
    working.push('V = P / (sqrt(3) x I x PF)', `V = ${formatNumber(powerW, 4)} / (1.732 x ${inputs.current} x ${inputs.pf})`, `V = ${formatNumber(result, decimals)} V`);
    answer = formatWithUnit(result, 'V', decimals);
  } else if (inputs.solveFor === 'current' && powerW !== undefined && inputs.voltage !== undefined && inputs.pf !== undefined && rootThree * inputs.voltage * inputs.pf !== 0) {
    result = powerW / (rootThree * inputs.voltage * inputs.pf);
    working.push('I = P / (sqrt(3) x V x PF)', `I = ${formatNumber(powerW, 4)} / (1.732 x ${inputs.voltage} x ${inputs.pf})`, `I = ${formatNumber(result, decimals)} A`);
    answer = formatWithUnit(result, 'A', decimals);
  } else if (inputs.solveFor === 'pf' && powerW !== undefined && inputs.voltage !== undefined && inputs.current !== undefined && rootThree * inputs.voltage * inputs.current !== 0) {
    result = powerW / (rootThree * inputs.voltage * inputs.current);
    working.push('PF = P / (sqrt(3) x V x I)', `PF = ${formatNumber(powerW, 4)} / (1.732 x ${inputs.voltage} x ${inputs.current})`, `PF = ${formatNumber(result, decimals)}`);
    answer = formatNumber(result, decimals);
  } else {
    warnings.push('Add the required values to solve this calculation.');
    answer = 'Waiting for inputs';
  }

  return {
    answer,
    formula: 'P = sqrt(3) x V x I x PF',
    working,
    conversions: powerW !== undefined ? [`${formatWithUnit(powerW, 'W', decimals)} = ${formatWithUnit(powerW / 1000, 'kW', decimals)}`] : [],
    warnings,
    values: { result: result ?? NaN }
  };
};

export type ResistorInput = { value?: number; unit: string };

export const calculateResistance = (resistors: ResistorInput[], decimals = 2): CalculationResult => {
  const values = resistors.map((resistor) => toBase(resistor.value, resistor.unit, 'resistance'));
  const warnings = values.flatMap((value, index) => validateNumber(`R${index + 1}`, value, { required: true, allowZero: true, maxRealistic: 100000000 }));
  if (values.some((value) => value === 0)) warnings.push('A 0 ohm parallel resistor represents a short circuit.');
  const usable = values.filter((value): value is number => value !== undefined);
  if (usable.length === 0) return { answer: 'Add resistor values', formula: 'Rt = R1 + R2 ... and 1/Rt = 1/R1 + 1/R2 ...', working: [], conversions: [], warnings };

  // Series resistance is the direct sum of each resistor.
  const series = usable.reduce((sum, value) => sum + value, 0);
  // Parallel resistance is the reciprocal of the sum of each reciprocal.
  const hasShort = usable.includes(0);
  const reciprocalSum = usable.reduce((sum, value) => (value === 0 ? Infinity : sum + 1 / value), 0);
  const parallel = hasShort ? 0 : 1 / reciprocalSum;
  const labels = usable.map((value, index) => `R${index + 1}=${formatNumber(value, decimals)} ohm`);

  return {
    answer: `Series ${formatWithUnit(series, 'ohm', decimals)} | Parallel ${formatWithUnit(parallel, 'ohm', decimals)}`,
    formula: 'Series: Rt = R1 + R2 + R3 ... | Parallel: 1/Rt = 1/R1 + 1/R2 + 1/R3 ...',
    working: [
      `Converted values: ${labels.join(', ')}`,
      `Series Rt = ${usable.map((value) => formatNumber(value, decimals)).join(' + ')} = ${formatNumber(series, decimals)} ohm`,
      hasShort
        ? 'Parallel Rt = 0 ohm because one branch is a short circuit.'
        : `Parallel 1/Rt = ${usable.map((value) => `1/${formatNumber(value, decimals)}`).join(' + ')} = ${formatNumber(reciprocalSum, 4)}`,
      hasShort ? 'Parallel Rt = 0 ohm' : `Parallel Rt = 1 / ${formatNumber(reciprocalSum, 4)} = ${formatNumber(parallel, decimals)} ohm`,
      'Series increases total resistance.',
      'Parallel decreases total resistance.',
      'A short circuit creates a very low-resistance path, so current rises.'
    ],
    conversions: resistors
      .map((resistor, index) => conversionLine(`R${index + 1}`, resistor.value, resistor.unit, 'ohm', 'resistance'))
      .filter(Boolean) as string[],
    warnings,
    values: { series, parallel }
  };
};

export const calculateVoltageDrop = (
  inputs: { supplyVoltage?: number; current?: number; length?: number; method: 'mvam' | 'resistance'; mvam?: number; resistancePerM?: number; phase: 'single' | 'three' },
  decimals = 2
): CalculationResult => {
  const warnings = [
    ...validateNumber('Supply voltage', inputs.supplyVoltage, { required: true, maxRealistic: 100000 }),
    ...validateNumber('Current', inputs.current, { required: true, maxRealistic: 10000 }),
    ...validateNumber('Cable length', inputs.length, { required: true, maxRealistic: 100000 }),
    ...(inputs.method === 'mvam'
      ? validateNumber('mV/A/m value', inputs.mvam, { required: true, maxRealistic: 10000 })
      : validateNumber('Resistance per metre', inputs.resistancePerM, { required: true, maxRealistic: 100 }))
  ];
  let drop: number | undefined;
  const working: string[] = [];
  if (inputs.supplyVoltage && inputs.current !== undefined && inputs.length !== undefined) {
    if (inputs.method === 'mvam' && inputs.mvam !== undefined) {
      // Training voltage drop by table value: millivolts per amp per metre times current and length.
      drop = (inputs.mvam * inputs.current * inputs.length) / 1000;
      working.push('Voltage drop = mV/A/m x current x length / 1000', `VD = ${inputs.mvam} x ${inputs.current} x ${inputs.length} / 1000`, `VD = ${formatNumber(drop, decimals)} V`);
    } else if (inputs.method === 'resistance' && inputs.resistancePerM !== undefined) {
      const phaseFactor = inputs.phase === 'single' ? 2 : Math.sqrt(3);
      const totalResistance = inputs.resistancePerM * inputs.length * phaseFactor;
      // Simple resistance method: voltage drop equals current multiplied by total conductor resistance.
      drop = inputs.current * totalResistance;
      working.push('Voltage drop = current x total resistance', `Total resistance = ${inputs.resistancePerM} x ${inputs.length} x ${formatNumber(phaseFactor, 3)}`, `VD = ${inputs.current} x ${formatNumber(totalResistance, 4)}`, `VD = ${formatNumber(drop, decimals)} V`);
    }
  }
  const percentage = drop !== undefined && inputs.supplyVoltage ? (drop / inputs.supplyVoltage) * 100 : undefined;
  if (percentage !== undefined && percentage > 5) warnings.push('Voltage drop percentage is high for many training examples.');
  return {
    answer: drop !== undefined && percentage !== undefined ? `${formatWithUnit(drop, 'V', decimals)} (${formatNumber(percentage, decimals)}%)` : 'Waiting for inputs',
    formula: inputs.method === 'mvam' ? 'Voltage drop = mV/A/m x current x length / 1000' : 'Voltage drop = current x total resistance',
    working: [...working, 'For real cable sizing, confirm against the current wiring rules and cable tables.'],
    conversions: inputs.mvam !== undefined ? [`${inputs.mvam} mV/A/m is ${formatNumber(inputs.mvam / 1000, 4)} V/A/m`] : [],
    warnings,
    values: { drop: drop ?? NaN, percentage: percentage ?? NaN }
  };
};

export const calculateFaultCurrent = (inputs: { voltage?: number; impedance?: number }, decimals = 2): CalculationResult => {
  const warnings = [
    ...validateNumber('Supply voltage', inputs.voltage, { required: true, maxRealistic: 100000 }),
    ...validateNumber('Fault loop impedance', inputs.impedance, { required: true, allowZero: true, maxRealistic: 10000 })
  ];
  if (inputs.impedance !== undefined && inputs.impedance <= 0.01) warnings.push('Impedance is zero or extremely low. Fault current may be dangerously high.');
  let current: number | undefined;
  const working: string[] = [];
  if (inputs.voltage !== undefined && inputs.impedance !== undefined && inputs.impedance !== 0) {
    // Fault current equals supply voltage divided by loop impedance.
    current = inputs.voltage / inputs.impedance;
    working.push('I = V / Z', `I = ${inputs.voltage} / ${inputs.impedance}`, `I = ${formatNumber(current, decimals)} A`, `I = ${formatNumber(current / 1000, decimals)} kA`);
  }
  return {
    answer: current !== undefined ? `${formatWithUnit(current, 'A', decimals)} (${formatWithUnit(current / 1000, 'kA', decimals)})` : 'Waiting for inputs',
    formula: 'I = V / Z',
    working: [...working, 'Lower impedance means higher fault current.', 'Higher impedance means lower fault current.'],
    conversions: current !== undefined ? allConversions(current, 'current', true, decimals) : [],
    warnings,
    values: { current: current ?? NaN }
  };
};

export const calculateEnergyCost = (inputs: { power?: number; powerUnit: string; hours?: number; price?: number }, decimals = 2): CalculationResult => {
  const powerW = toBase(inputs.power, inputs.powerUnit, 'power');
  const powerKw = powerW !== undefined ? powerW / 1000 : undefined;
  const warnings = [
    ...validateNumber('Power', powerW, { required: true, maxRealistic: 10000000 }),
    ...validateNumber('Hours used', inputs.hours, { required: true, allowZero: true, maxRealistic: 8760 }),
    ...validateNumber('Cost per kWh', inputs.price, { required: true, allowZero: true, maxRealistic: 10 })
  ];
  let kwh: number | undefined;
  let cost: number | undefined;
  const working: string[] = [];
  if (powerKw !== undefined && inputs.hours !== undefined && inputs.price !== undefined) {
    // Energy in kilowatt-hours equals kilowatts multiplied by hours.
    kwh = powerKw * inputs.hours;
    // Estimated cost equals energy used multiplied by price per kilowatt-hour.
    cost = kwh * inputs.price;
    working.push('kWh = kW x hours', `kWh = ${formatNumber(powerKw, 4)} x ${inputs.hours}`, `kWh = ${formatNumber(kwh, decimals)}`, 'Cost = kWh x price', `Cost = ${formatNumber(kwh, decimals)} x ${inputs.price}`, `Cost = ${currency(cost)}`);
  }
  return {
    answer: kwh !== undefined && cost !== undefined ? `${formatNumber(kwh, decimals)} kWh = ${currency(cost)}` : 'Waiting for inputs',
    formula: 'kWh = kW x hours; Cost = kWh x price',
    working,
    conversions: powerW !== undefined ? [`${formatWithUnit(powerW, 'W', decimals)} = ${formatWithUnit(powerKw ?? 0, 'kW', decimals)}`] : [],
    warnings,
    values: { kwh: kwh ?? NaN, cost: cost ?? NaN }
  };
};
