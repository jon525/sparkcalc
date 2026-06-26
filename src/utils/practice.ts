import { Difficulty, PracticeQuestion, PracticeTopic } from '../types';
import { currency, formatNumber } from './format';

const pick = <T,>(items: T[]): T => items[Math.floor(Math.random() * items.length)];
const range = (difficulty: Difficulty, easy: number[], medium: number[], hard: number[]) =>
  pick(difficulty === 'Easy' ? easy : difficulty === 'Medium' ? medium : hard);

const toleranceFor = (answer: number, minimum = 0.05, percent = 0.02) => Math.max(minimum, Math.abs(answer) * percent);

const question = (
  topic: PracticeTopic,
  difficulty: Difficulty,
  prompt: string,
  answer: number,
  unit: string,
  hint: string,
  formula: string,
  working: string[],
  tolerance = toleranceFor(answer)
): PracticeQuestion => ({
  topic,
  difficulty,
  prompt,
  answer,
  unit,
  tolerance,
  hint,
  formula,
  working
});

const resistorSet = (difficulty: Difficulty) => {
  const easy = [
    [10, 20],
    [47, 47],
    [100, 100]
  ];
  const medium = [
    [47, 100, 220],
    [100, 220, 330],
    [150, 330]
  ];
  const hard = [
    [120, 330, 680, 1000],
    [220, 470, 1000],
    [82, 180, 390, 820]
  ];
  return pick(difficulty === 'Easy' ? easy : difficulty === 'Medium' ? medium : hard);
};

const joinOhms = (values: number[]) => values.map((value) => `${value} ohm`).join(', ');

export const generatePracticeQuestion = (topic: PracticeTopic, difficulty: Difficulty): PracticeQuestion => {
  if (topic === 'Ohm\'s Law') {
    const voltage = range(difficulty, [6, 12, 24], [24, 48, 120, 230], [230, 400, 415]);
    const current = range(difficulty, [0.5, 1, 2], [2.5, 5, 8], [12, 16, 20]);
    const resistance = range(difficulty, [10, 20, 50], [75, 120, 220], [330, 470, 680]);
    const currentMa = range(difficulty, [20, 50, 100], [150, 250, 500], [750, 1250, 2000]);
    const variants = [
      () => {
        const answer = current * resistance;
        return question(
          topic,
          difficulty,
          `${current} A flows through ${resistance} ohm. What is the voltage?`,
          answer,
          'V',
          'Multiply current by resistance.',
          'V = I x R',
          [`V = ${current} x ${resistance}`, `V = ${formatNumber(answer, 2)} V`]
        );
      },
      () => {
        const answer = voltage / resistance;
        return question(
          topic,
          difficulty,
          `${voltage} V is applied across ${resistance} ohm. What is the current in amps?`,
          answer,
          'A',
          'Divide voltage by resistance.',
          'I = V / R',
          [`I = ${voltage} / ${resistance}`, `I = ${formatNumber(answer, 3)} A`],
          toleranceFor(answer, 0.005)
        );
      },
      () => {
        const answer = voltage / current;
        return question(
          topic,
          difficulty,
          `${voltage} V supplies ${current} A. What is the resistance?`,
          answer,
          'ohm',
          'Divide voltage by current.',
          'R = V / I',
          [`R = ${voltage} / ${current}`, `R = ${formatNumber(answer, 2)} ohm`]
        );
      },
      () => {
        const answer = voltage * current;
        return question(
          topic,
          difficulty,
          `${voltage} V and ${current} A are measured. What is the power?`,
          answer,
          'W',
          'Power is volts times amps.',
          'P = V x I',
          [`P = ${voltage} x ${current}`, `P = ${formatNumber(answer, 2)} W`]
        );
      },
      () => {
        const amps = currentMa / 1000;
        const answer = amps * resistance;
        return question(
          topic,
          difficulty,
          `${currentMa} mA flows through ${resistance} ohm. What is the voltage?`,
          answer,
          'V',
          'Convert mA to A first, then multiply by resistance.',
          'V = I x R',
          [`${currentMa} mA = ${formatNumber(amps, 4)} A`, `V = ${formatNumber(amps, 4)} x ${resistance}`, `V = ${formatNumber(answer, 2)} V`]
        );
      }
    ];
    return pick(variants)();
  }

  if (topic === 'Power') {
    const voltage = range(difficulty, [120, 230], [230, 240], [230, 240, 277]);
    const current = range(difficulty, [2, 4, 6], [8, 10, 12], [15, 20, 25, 32]);
    const pf = difficulty === 'Easy' ? 1 : pick([0.75, 0.8, 0.85, 0.9, 0.95]);
    const power = voltage * current * pf;
    const variants = [
      () =>
        question(
          topic,
          difficulty,
          `Single-phase ${voltage} V, ${current} A, PF ${pf}. What is the power in watts?`,
          power,
          'W',
          'Use volts times amps times power factor.',
          'P = V x I x PF',
          [`P = ${voltage} x ${current} x ${pf}`, `P = ${formatNumber(power, 2)} W`]
        ),
      () =>
        question(
          topic,
          difficulty,
          `A load is ${formatNumber(power, 0)} W at ${voltage} V with PF ${pf}. What current is drawn?`,
          power / (voltage * pf),
          'A',
          'Rearrange the power formula to find current.',
          'I = P / (V x PF)',
          [`I = ${formatNumber(power, 0)} / (${voltage} x ${pf})`, `I = ${formatNumber(power / (voltage * pf), 2)} A`]
        ),
      () =>
        question(
          topic,
          difficulty,
          `${formatNumber(power, 0)} W is supplied at ${current} A with PF ${pf}. What voltage is needed?`,
          power / (current * pf),
          'V',
          'Rearrange the power formula to find voltage.',
          'V = P / (I x PF)',
          [`V = ${formatNumber(power, 0)} / (${current} x ${pf})`, `V = ${formatNumber(power / (current * pf), 2)} V`]
        )
    ];
    if (difficulty !== 'Easy') {
      variants.push(() =>
        question(
          topic,
          difficulty,
          `${formatNumber(power, 0)} W is measured at ${voltage} V and ${current} A. What is the power factor?`,
          power / (voltage * current),
          'PF',
          'Power factor is power divided by volts times amps.',
          'PF = P / (V x I)',
          [`PF = ${formatNumber(power, 0)} / (${voltage} x ${current})`, `PF = ${formatNumber(power / (voltage * current), 2)}`],
          0.03
        )
      );
    }
    return pick(variants)();
  }

  if (topic === 'Three-phase Power') {
    const voltage = range(difficulty, [400, 415], [400, 415, 480], [400, 415, 690]);
    const current = range(difficulty, [5, 10], [12, 16, 20], [25, 32, 40, 63]);
    const pf = difficulty === 'Easy' ? 0.8 : pick([0.75, 0.8, 0.86, 0.9, 0.92]);
    const rootThree = Math.sqrt(3);
    const power = rootThree * voltage * current * pf;
    const variants = [
      () =>
        question(
          topic,
          difficulty,
          `Three-phase ${voltage} V, ${current} A, PF ${pf}. What is the power in watts?`,
          power,
          'W',
          'Remember sqrt(3), about 1.732.',
          'P = sqrt(3) x V x I x PF',
          [`P = 1.732 x ${voltage} x ${current} x ${pf}`, `P = ${formatNumber(power, 2)} W`]
        ),
      () =>
        question(
          topic,
          difficulty,
          `A three-phase load is ${formatNumber(power / 1000, 2)} kW at ${voltage} V and PF ${pf}. What is the line current?`,
          power / (rootThree * voltage * pf),
          'A',
          'Convert kW to W, then rearrange for current.',
          'I = P / (sqrt(3) x V x PF)',
          [`${formatNumber(power / 1000, 2)} kW = ${formatNumber(power, 0)} W`, `I = ${formatNumber(power, 0)} / (1.732 x ${voltage} x ${pf})`, `I = ${formatNumber(current, 2)} A`]
        ),
      () =>
        question(
          topic,
          difficulty,
          `${formatNumber(power / 1000, 2)} kW three-phase at ${current} A and PF ${pf}. What is the line voltage?`,
          power / (rootThree * current * pf),
          'V',
          'Rearrange the three-phase formula to find voltage.',
          'V = P / (sqrt(3) x I x PF)',
          [`V = ${formatNumber(power, 0)} / (1.732 x ${current} x ${pf})`, `V = ${formatNumber(voltage, 2)} V`]
        )
    ];
    return pick(variants)();
  }

  if (topic === 'Series Resistance') {
    const values = resistorSet(difficulty);
    const total = values.reduce((sum, value) => sum + value, 0);
    const missingIndex = Math.floor(Math.random() * values.length);
    const missing = values[missingIndex];
    const knownValues = values.filter((_, index) => index !== missingIndex);
    const variants = [
      () =>
        question(
          topic,
          difficulty,
          `What is the total series resistance for ${joinOhms(values)}?`,
          total,
          'ohm',
          'Series resistors add directly.',
          'Rt = R1 + R2 + R3 ...',
          [`Rt = ${values.join(' + ')}`, `Rt = ${total} ohm`]
        ),
      () =>
        question(
          topic,
          difficulty,
          `A series circuit totals ${total} ohm. Known resistors are ${joinOhms(knownValues)}. What is the missing resistor?`,
          missing,
          'ohm',
          'Subtract the known series resistors from the total.',
          'Missing R = Rt - known resistors',
          [`Missing R = ${total} - (${knownValues.join(' + ')})`, `Missing R = ${missing} ohm`]
        )
    ];
    return pick(variants)();
  }

  if (topic === 'Parallel Resistance') {
    const values = resistorSet(difficulty);
    const reciprocal = values.reduce((sum, value) => sum + 1 / value, 0);
    const total = 1 / reciprocal;
    const variants = [
      () =>
        question(
          topic,
          difficulty,
          `What is the total parallel resistance for ${joinOhms(values)}?`,
          total,
          'ohm',
          'Add the reciprocals, then flip the result.',
          '1/Rt = 1/R1 + 1/R2 + 1/R3 ...',
          [`1/Rt = ${values.map((value) => `1/${value}`).join(' + ')}`, `Rt = ${formatNumber(total, 2)} ohm`],
          toleranceFor(total, 0.1, 0.03)
        ),
      () => {
        const equal = range(difficulty, [50, 100], [100, 200, 330], [470, 1000]);
        const count = difficulty === 'Easy' ? 2 : difficulty === 'Medium' ? 3 : 4;
        const answer = equal / count;
        return question(
          topic,
          difficulty,
          `${count} equal resistors of ${equal} ohm are connected in parallel. What is Rt?`,
          answer,
          'ohm',
          'For equal resistors in parallel, divide one resistor by the number of branches.',
          'Rt = R / number of equal branches',
          [`Rt = ${equal} / ${count}`, `Rt = ${formatNumber(answer, 2)} ohm`],
          toleranceFor(answer, 0.1, 0.03)
        );
      }
    ];
    return pick(variants)();
  }

  if (topic === 'Fault Current') {
    const voltage = range(difficulty, [120, 230], [230, 240], [230, 400, 415]);
    const impedance = range(difficulty, [1, 2], [0.5, 0.8], [0.18, 0.25, 0.35]);
    const current = voltage / impedance;
    const variants = [
      () =>
        question(
          topic,
          difficulty,
          `${voltage} V supply with ${impedance} ohm loop impedance. What is the fault current?`,
          current,
          'A',
          'Divide voltage by impedance.',
          'I = V / Z',
          [`I = ${voltage} / ${impedance}`, `I = ${formatNumber(current, 2)} A`]
        ),
      () =>
        question(
          topic,
          difficulty,
          `A fault current is ${formatNumber(current, 0)} A on a ${voltage} V supply. What is the loop impedance?`,
          voltage / current,
          'ohm',
          'Rearrange the fault current formula to find impedance.',
          'Z = V / I',
          [`Z = ${voltage} / ${formatNumber(current, 0)}`, `Z = ${formatNumber(voltage / current, 3)} ohm`],
          toleranceFor(voltage / current, 0.005)
        )
    ];
    return pick(variants)();
  }

  const power = range(difficulty, [1, 2], [2.4, 3.6], [5, 7.2]);
  const hours = range(difficulty, [2, 5], [6, 8], [12, 24]);
  const price = difficulty === 'Easy' ? 0.3 : pick([0.28, 0.35, 0.42]);
  const kwh = power * hours;
  const cost = kwh * price;
  const variants = [
    () =>
      question(
        topic,
        difficulty,
        `${power} kW for ${hours} hours at $${price}/kWh. What is the cost?`,
        cost,
        '$',
        'Find kWh first, then multiply by the price.',
        'kWh = kW x hours; Cost = kWh x price',
        [`kWh = ${power} x ${hours} = ${formatNumber(kwh, 2)}`, `Cost = ${formatNumber(kwh, 2)} x ${price} = ${currency(cost)}`],
        toleranceFor(cost, 0.02)
      ),
    () =>
      question(
        topic,
        difficulty,
        `${power} kW is used for ${hours} hours. How many kWh are used?`,
        kwh,
        'kWh',
        'Multiply kW by hours.',
        'kWh = kW x hours',
        [`kWh = ${power} x ${hours}`, `kWh = ${formatNumber(kwh, 2)}`]
      ),
    () =>
      question(
        topic,
        difficulty,
        `A ${power} kW load used ${formatNumber(kwh, 2)} kWh. How many hours did it run?`,
        kwh / power,
        'h',
        'Divide energy by power.',
        'hours = kWh / kW',
        [`hours = ${formatNumber(kwh, 2)} / ${power}`, `hours = ${formatNumber(hours, 2)}`]
      )
  ];
  if (difficulty !== 'Easy') {
    variants.push(() =>
      question(
        topic,
        difficulty,
        `${formatNumber(kwh, 2)} kWh cost ${currency(cost)}. What is the price per kWh?`,
        cost / kwh,
        '$/kWh',
        'Divide total cost by energy used.',
        'price = cost / kWh',
        [`price = ${currency(cost)} / ${formatNumber(kwh, 2)}`, `price = $${formatNumber(cost / kwh, 2)}/kWh`],
        0.02
      )
    );
  }
  return pick(variants)();
};
