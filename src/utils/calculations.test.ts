import { describe, expect, it } from 'vitest';
import {
  calculateEnergyCost,
  calculateFaultCurrent,
  calculateOhmsLaw,
  calculateResistance,
  calculateSinglePhasePower,
  calculateThreePhasePower
} from './calculations';
import { convertUnit } from './units';

describe('electrical calculations', () => {
  it('calculates Ohm\'s Law values from current and resistance', () => {
    const result = calculateOhmsLaw({
      voltageUnit: 'V',
      current: 20,
      currentUnit: 'mA',
      resistance: 500,
      resistanceUnit: 'ohm',
      powerUnit: 'W'
    });
    expect(result.values?.voltage).toBeCloseTo(10);
    expect(result.values?.power).toBeCloseTo(0.2);
  });

  it('calculates single-phase power', () => {
    const result = calculateSinglePhasePower({ solveFor: 'power', voltage: 230, current: 10, pf: 1 });
    expect(result.values?.result).toBeCloseTo(2300);
  });

  it('calculates three-phase power', () => {
    const result = calculateThreePhasePower({ solveFor: 'power', voltage: 400, current: 10, pf: 0.8 });
    expect(result.values?.result).toBeCloseTo(5542.56, 1);
  });

  it('calculates series and parallel resistance', () => {
    const result = calculateResistance([
      { value: 100, unit: 'ohm' },
      { value: 100, unit: 'ohm' }
    ]);
    expect(result.values?.series).toBeCloseTo(200);
    expect(result.values?.parallel).toBeCloseTo(50);
  });

  it('calculates fault current', () => {
    const result = calculateFaultCurrent({ voltage: 230, impedance: 0.5 });
    expect(result.values?.current).toBeCloseTo(460);
  });

  it('calculates energy cost', () => {
    const result = calculateEnergyCost({ power: 2, powerUnit: 'kW', hours: 5, price: 0.35 });
    expect(result.values?.kwh).toBeCloseTo(10);
    expect(result.values?.cost).toBeCloseTo(3.5);
  });

  it('converts units', () => {
    expect(convertUnit(20, 'mA', 'A', 'current')).toBeCloseTo(0.02);
    expect(convertUnit(2500, 'uA', 'mA', 'current')).toBeCloseTo(2.5);
    expect(convertUnit(500, 'mohm', 'ohm', 'resistance')).toBeCloseTo(0.5);
    expect(convertUnit(1.5, 'kW', 'W', 'power')).toBeCloseTo(1500);
    expect(convertUnit(2, 'MW', 'kW', 'power')).toBeCloseTo(2000);
    expect(convertUnit(2, 'Mohm', 'ohm', 'resistance')).toBeCloseTo(2000000);
    expect(convertUnit(3, 'km', 'm', 'length')).toBeCloseTo(3000);
    expect(convertUnit(2.5, 'mm2', 'm2', 'area')).toBeCloseTo(0.0000025);
  });
});
