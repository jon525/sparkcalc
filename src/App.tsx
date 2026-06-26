import { ReactNode, useEffect, useMemo, useState } from 'react';
import {
  calculateEnergyCost,
  calculateFaultCurrent,
  calculateOhmsLaw,
  calculateResistance,
  calculateSinglePhasePower,
  calculateThreePhasePower,
  calculateVoltageDrop,
  ResistorInput
} from './utils/calculations';
import { formatNumber } from './utils/format';
import { convertUnit, unitFactors, unitLabels, UnitGroup } from './utils/units';
import { numberOrUndefined } from './utils/validation';
import {
  clearAllData,
  clearSavedCalculations,
  defaultSettings,
  deleteSavedCalculation,
  clearPracticeMistakes,
  loadPracticeMistakes,
  loadPracticeScore,
  loadTopicProgress,
  loadSavedCalculations,
  loadSettings,
  savePracticeMistake,
  saveCalculation,
  savePracticeScore,
  saveTopicProgress,
  saveSettings,
  setLastCalculator
} from './utils/storage';
import { CalculationResult, DecimalPlaces, Difficulty, PracticeMistake, PracticeQuestion, PracticeTopic, SavedCalculation, Settings, TopicProgress } from './types';
import { generatePracticeQuestion } from './utils/practice';

type Page = 'home' | 'calculators' | 'formulas' | 'examples' | 'practice' | 'saved' | 'settings';
type BeforeInstallPromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }> };

const calculatorTabs = [
  'Ohm\'s Law',
  'Power',
  'Series / Parallel',
  'Three-Phase',
  'Voltage Drop',
  'Fault Current',
  'Energy Cost',
  'Unit Converter'
] as const;

type CalculatorTab = (typeof calculatorTabs)[number];

const formulaCards = [
  {
    section: 'Ohm\'s Law',
    formula: 'V = I x R',
    meaning: 'V is voltage, I is current, R is resistance.',
    example: '0.02 A x 500 ohm = 10 V'
  },
  {
    section: 'Power',
    formula: 'P = V x I x PF',
    meaning: 'P is power in watts, V is voltage, I is current, PF is power factor.',
    example: '230 V x 10 A x 1 = 2300 W'
  },
  {
    section: 'Three-phase power',
    formula: 'P = sqrt(3) x V x I x PF',
    meaning: 'Use line voltage, line current, and power factor.',
    example: '1.732 x 400 V x 10 A x 0.8 = 5542.4 W'
  },
  {
    section: 'Energy',
    formula: 'kWh = kW x hours',
    meaning: 'Energy use is power in kilowatts over time.',
    example: '2 kW x 5 h = 10 kWh'
  },
  {
    section: 'Resistance',
    formula: 'Series Rt = R1 + R2; Parallel 1/Rt = 1/R1 + 1/R2',
    meaning: 'Series adds resistance. Parallel adds conductance paths.',
    example: '100 ohm and 100 ohm in parallel = 50 ohm'
  },
  {
    section: 'Fault current',
    formula: 'I = V / Z',
    meaning: 'I is fault current, V is voltage, Z is loop impedance.',
    example: '230 V / 0.5 ohm = 460 A'
  },
  {
    section: 'Voltage drop',
    formula: 'VD = mV/A/m x I x L / 1000',
    meaning: 'Voltage drop estimate from current, length, and cable drop value.',
    example: '18 x 10 A x 20 m / 1000 = 3.6 V'
  }
];

const workedExamples = [
  {
    title: 'Ohm\'s Law: find voltage',
    scenario: 'A 20 mA control circuit passes through a 500 ohm resistor.',
    formula: 'V = I x R',
    steps: ['20 mA = 0.02 A', 'V = 0.02 x 500', 'V = 10 V'],
    takeaway: 'Convert mA to A before using Ohm\'s Law.'
  },
  {
    title: 'Single-phase power',
    scenario: 'A 230 V load draws 8 A at PF 1.0.',
    formula: 'P = V x I x PF',
    steps: ['P = 230 x 8 x 1', 'P = 1840 W', 'P = 1.84 kW'],
    takeaway: 'For many simple resistive loads, PF is close to 1.'
  },
  {
    title: 'Three-phase power',
    scenario: 'A 400 V three-phase load draws 10 A at PF 0.8.',
    formula: 'P = sqrt(3) x V x I x PF',
    steps: ['sqrt(3) = 1.732', 'P = 1.732 x 400 x 10 x 0.8', 'P = 5542.4 W', 'P = 5.54 kW'],
    takeaway: 'Use line voltage and line current for this training formula.'
  },
  {
    title: 'Voltage drop using mV/A/m',
    scenario: 'A circuit uses 18 mV/A/m cable value, 10 A load, and 20 m length.',
    formula: 'VD = mV/A/m x I x L / 1000',
    steps: ['VD = 18 x 10 x 20 / 1000', 'VD = 3.6 V', 'Percent = 3.6 / 230 x 100 = 1.57%'],
    takeaway: 'Real cable sizing still needs current wiring rules and cable tables.'
  },
  {
    title: 'Fault current',
    scenario: 'A 230 V supply has 0.5 ohm loop impedance.',
    formula: 'I = V / Z',
    steps: ['I = 230 / 0.5', 'I = 460 A', 'I = 0.46 kA'],
    takeaway: 'Lower loop impedance means higher fault current.'
  },
  {
    title: 'Energy cost',
    scenario: 'A 2 kW heater runs for 5 hours at $0.35/kWh.',
    formula: 'kWh = kW x hours; Cost = kWh x price',
    steps: ['kWh = 2 x 5', 'kWh = 10', 'Cost = 10 x 0.35', 'Cost = $3.50'],
    takeaway: 'Energy bills charge for energy over time, not just power.'
  }
];

const navItems: { page: Page; label: string; icon: string }[] = [
  { page: 'home', label: 'Home', icon: 'H' },
  { page: 'calculators', label: 'Calc', icon: '+' },
  { page: 'formulas', label: 'Sheet', icon: '=' },
  { page: 'practice', label: 'Quiz', icon: '?' },
  { page: 'saved', label: 'Saved', icon: '*' },
  { page: 'settings', label: 'Setup', icon: 'S' }
];

function App() {
  const [page, setPage] = useState<Page>('home');
  const [activeCalculator, setActiveCalculator] = useState<CalculatorTab>('Ohm\'s Law');
  const [settings, setSettings] = useState<Settings>(() => loadSettings());
  const [saved, setSaved] = useState<SavedCalculation[]>(() => loadSavedCalculations());
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isStandalone, setIsStandalone] = useState(() => window.matchMedia('(display-mode: standalone)').matches);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    saveSettings(settings);
  }, [settings]);

  useEffect(() => {
    const handleBeforeInstall = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const media = window.matchMedia('(display-mode: standalone)');
    const handleDisplayMode = () => setIsStandalone(media.matches);
    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    media.addEventListener('change', handleDisplayMode);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      media.removeEventListener('change', handleDisplayMode);
    };
  }, []);

  const openCalculator = (calculator: CalculatorTab) => {
    setActiveCalculator(calculator);
    setLastCalculator(calculator);
    setPage('calculators');
  };

  const handleSave = (calculator: string, inputs: Record<string, string | number>, answer: string) => {
    if (!answer || answer === 'Waiting for inputs' || answer.startsWith('Enter')) return;
    setSaved(saveCalculation({ calculator, inputs, answer }));
  };

  const clearSaved = () => {
    clearSavedCalculations();
    setSaved([]);
  };

  const updateSettings = (next: Settings) => setSettings(next);

  const installApp = async () => {
    if (!installPrompt) return;
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  };

  return (
    <div className="app-shell">
      {page !== 'home' && (
        <header className="topbar">
          <div>
            <p className="eyebrow">SparkCalc</p>
            <h1>{pageLabel(page)}</h1>
          </div>
          <div className="bolt" aria-hidden="true">S</div>
        </header>
      )}

      <main>
        {page === 'home' && <HomePage openCalculator={openCalculator} goPractice={() => setPage('practice')} goExamples={() => setPage('examples')} />}
        {page === 'calculators' && (
          <CalculatorsPage
            active={activeCalculator}
            setActive={(tab) => {
              setActiveCalculator(tab);
              setLastCalculator(tab);
            }}
            settings={settings}
            save={handleSave}
          />
        )}
        {page === 'formulas' && <FormulaSheet />}
        {page === 'examples' && <WorkedExamplesPage />}
        {page === 'practice' && <PracticePage decimals={settings.decimals} />}
        {page === 'saved' && <SavedPage saved={saved} deleteOne={(id) => setSaved(deleteSavedCalculation(id))} clearAll={clearSaved} />}
        {page === 'settings' && (
          <SettingsPage
            settings={settings}
            update={updateSettings}
            canInstall={Boolean(installPrompt)}
            isStandalone={isStandalone}
            installApp={installApp}
            clearAll={() => {
              clearAllData();
              setSettings(defaultSettings);
              setSaved([]);
            }}
          />
        )}
      </main>

      <nav className="bottom-nav" aria-label="Main navigation">
        {navItems.map((item) => (
          <button key={item.page} className={page === item.page ? 'active' : ''} onClick={() => setPage(item.page)} aria-label={pageLabel(item.page)}>
            <span className="nav-symbol" aria-hidden="true">{item.icon}</span>
            <span className="nav-label">{item.label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const pageLabel = (page: Page) =>
  ({
    home: 'Home',
    calculators: 'Calculators',
    formulas: 'Formula Sheet',
    examples: 'Worked Examples',
    practice: 'Practice Questions',
    saved: 'Saved Calculations',
    settings: 'Settings'
  })[page];

function HomePage({ openCalculator, goPractice, goExamples }: { openCalculator: (calculator: CalculatorTab) => void; goPractice: () => void; goExamples: () => void }) {
  const quickLinks: { label: string; tab?: CalculatorTab; action?: () => void }[] = [
    { label: 'Ohm\'s Law', tab: 'Ohm\'s Law' },
    { label: 'Power', tab: 'Power' },
    { label: 'Series / Parallel Resistance', tab: 'Series / Parallel' },
    { label: 'Three-Phase Power', tab: 'Three-Phase' },
    { label: 'Voltage Drop', tab: 'Voltage Drop' },
    { label: 'Fault Current', tab: 'Fault Current' },
    { label: 'Energy Cost', tab: 'Energy Cost' },
    { label: 'Unit Converter', tab: 'Unit Converter' },
    { label: 'Worked Examples', action: goExamples },
    { label: 'Practice Questions', action: goPractice }
  ];
  return (
    <section className="page-stack">
      <div className="quick-grid">
        {quickLinks.map((link) => (
          <button key={link.label} className="quick-card" onClick={() => (link.tab ? openCalculator(link.tab) : link.action?.())}>
            <span>{link.label}</span>
            <b>Open</b>
          </button>
        ))}
      </div>
    </section>
  );
}

function CalculatorsPage({
  active,
  setActive,
  settings,
  save
}: {
  active: CalculatorTab;
  setActive: (tab: CalculatorTab) => void;
  settings: Settings;
  save: (calculator: string, inputs: Record<string, string | number>, answer: string) => void;
}) {
  return (
    <section className="page-stack">
      <div className="tab-strip" role="tablist" aria-label="Calculator choices">
        {calculatorTabs.map((tab) => (
          <button key={tab} className={active === tab ? 'active' : ''} onClick={() => setActive(tab)}>
            {tab}
          </button>
        ))}
      </div>
      {active === 'Ohm\'s Law' && <OhmsCalculator decimals={settings.decimals} save={save} />}
      {active === 'Power' && <PowerCalculator decimals={settings.decimals} voltage={settings.defaultSingleVoltage} save={save} />}
      {active === 'Series / Parallel' && <ResistanceCalculator decimals={settings.decimals} save={save} />}
      {active === 'Three-Phase' && <ThreePhaseCalculator decimals={settings.decimals} voltage={settings.defaultThreeVoltage} save={save} />}
      {active === 'Voltage Drop' && <VoltageDropCalculator decimals={settings.decimals} save={save} />}
      {active === 'Fault Current' && <FaultCurrentCalculator decimals={settings.decimals} save={save} />}
      {active === 'Energy Cost' && <EnergyCostCalculator decimals={settings.decimals} save={save} />}
      {active === 'Unit Converter' && <UnitConverter decimals={settings.decimals} />}
    </section>
  );
}

function OhmsCalculator({ decimals, save }: CalcProps) {
  const [voltage, setVoltage] = useState('');
  const [voltageUnit, setVoltageUnit] = useState('V');
  const [current, setCurrent] = useState('20');
  const [currentUnit, setCurrentUnit] = useState('mA');
  const [resistance, setResistance] = useState('500');
  const [resistanceUnit, setResistanceUnit] = useState('ohm');
  const [power, setPower] = useState('');
  const [powerUnit, setPowerUnit] = useState('W');
  const result = calculateOhmsLaw(
    {
      voltage: numberOrUndefined(voltage),
      voltageUnit,
      current: numberOrUndefined(current),
      currentUnit,
      resistance: numberOrUndefined(resistance),
      resistanceUnit,
      power: numberOrUndefined(power),
      powerUnit
    },
    decimals
  );
  const inputs = { voltage, voltageUnit, current, currentUnit, resistance, resistanceUnit, power, powerUnit };
  const reset = () => {
    setVoltage('');
    setVoltageUnit('V');
    setCurrent('20');
    setCurrentUnit('mA');
    setResistance('500');
    setResistanceUnit('ohm');
    setPower('');
    setPowerUnit('W');
  };
  return (
    <CalculatorCard title="Ohm's Law" onReset={reset} onSave={() => save('Ohm\'s Law', inputs, result.answer)}>
      <Field label="Voltage" value={voltage} setValue={setVoltage} unit={voltageUnit} setUnit={setVoltageUnit} units={['mV', 'V', 'kV']} />
      <Field label="Current" value={current} setValue={setCurrent} unit={currentUnit} setUnit={setCurrentUnit} units={['mA', 'A']} />
      <Field label="Resistance" value={resistance} setValue={setResistance} unit={resistanceUnit} setUnit={setResistanceUnit} units={['ohm', 'kohm', 'Mohm']} />
      <Field label="Power" value={power} setValue={setPower} unit={powerUnit} setUnit={setPowerUnit} units={['W', 'kW']} />
      <ResultPanel result={result} />
    </CalculatorCard>
  );
}

type CalcProps = {
  decimals: DecimalPlaces;
  voltage?: number;
  save: (calculator: string, inputs: Record<string, string | number>, answer: string) => void;
};

function PowerCalculator({ decimals, voltage: defaultVoltage = 230, save }: CalcProps) {
  const [solveFor, setSolveFor] = useState<'power' | 'voltage' | 'current' | 'pf'>('power');
  const [voltage, setVoltage] = useState(String(defaultVoltage));
  const [current, setCurrent] = useState('10');
  const [pf, setPf] = useState('1');
  const [power, setPower] = useState('');
  const [powerUnit, setPowerUnit] = useState('W');
  const result = calculateSinglePhasePower({ solveFor, voltage: numberOrUndefined(voltage), current: numberOrUndefined(current), pf: numberOrUndefined(pf), power: numberOrUndefined(power), powerUnit }, decimals);
  const inputs = { solveFor, voltage, current, pf, power, powerUnit };
  const reset = () => {
    setSolveFor('power');
    setVoltage(String(defaultVoltage));
    setCurrent('10');
    setPf('1');
    setPower('');
    setPowerUnit('W');
  };
  return (
    <CalculatorCard title="Single-Phase Power" onReset={reset} onSave={() => save('Power', inputs, result.answer)}>
      <Segment label="Solve for" value={solveFor} setValue={setSolveFor} options={[['power', 'Power'], ['voltage', 'Voltage'], ['current', 'Current'], ['pf', 'PF']]} />
      {solveFor !== 'voltage' && <Field label="Voltage" value={voltage} setValue={setVoltage} unit="V" units={['V']} />}
      {solveFor !== 'current' && <Field label="Current" value={current} setValue={setCurrent} unit="A" units={['A']} />}
      {solveFor !== 'pf' && <Field label="Power factor" value={pf} setValue={setPf} unit="PF" units={['PF']} />}
      {solveFor !== 'power' && <Field label="Power" value={power} setValue={setPower} unit={powerUnit} setUnit={setPowerUnit} units={['W', 'kW']} />}
      <ResultPanel result={result} />
    </CalculatorCard>
  );
}

function ThreePhaseCalculator({ decimals, voltage: defaultVoltage = 400, save }: CalcProps) {
  const [solveFor, setSolveFor] = useState<'power' | 'voltage' | 'current' | 'pf'>('power');
  const [voltage, setVoltage] = useState(String(defaultVoltage));
  const [current, setCurrent] = useState('10');
  const [pf, setPf] = useState('0.8');
  const [power, setPower] = useState('');
  const [powerUnit, setPowerUnit] = useState('W');
  const result = calculateThreePhasePower({ solveFor, voltage: numberOrUndefined(voltage), current: numberOrUndefined(current), pf: numberOrUndefined(pf), power: numberOrUndefined(power), powerUnit }, decimals);
  const inputs = { solveFor, voltage, current, pf, power, powerUnit };
  const reset = () => {
    setSolveFor('power');
    setVoltage(String(defaultVoltage));
    setCurrent('10');
    setPf('0.8');
    setPower('');
    setPowerUnit('W');
  };
  return (
    <CalculatorCard title="Three-Phase Power" onReset={reset} onSave={() => save('Three-Phase Power', inputs, result.answer)}>
      <Segment label="Solve for" value={solveFor} setValue={setSolveFor} options={[['power', 'Power'], ['voltage', 'Voltage'], ['current', 'Current'], ['pf', 'PF']]} />
      {solveFor !== 'voltage' && <Field label="Line voltage" value={voltage} setValue={setVoltage} unit="V" units={['V']} />}
      {solveFor !== 'current' && <Field label="Current" value={current} setValue={setCurrent} unit="A" units={['A']} />}
      {solveFor !== 'pf' && <Field label="Power factor" value={pf} setValue={setPf} unit="PF" units={['PF']} />}
      {solveFor !== 'power' && <Field label="Power" value={power} setValue={setPower} unit={powerUnit} setUnit={setPowerUnit} units={['W', 'kW']} />}
      <ResultPanel result={result} />
    </CalculatorCard>
  );
}

function ResistanceCalculator({ decimals, save }: CalcProps) {
  const [resistors, setResistors] = useState<ResistorInput[]>([
    { value: 100, unit: 'ohm' },
    { value: 100, unit: 'ohm' }
  ]);
  const result = calculateResistance(resistors, decimals);
  const setOne = (index: number, patch: Partial<ResistorInput>) =>
    setResistors((current) => current.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  const inputs = Object.fromEntries(resistors.map((resistor, index) => [`R${index + 1}`, `${resistor.value ?? ''} ${resistor.unit}`]));
  const reset = () => setResistors([{ value: 100, unit: 'ohm' }, { value: 100, unit: 'ohm' }]);
  return (
    <CalculatorCard title="Series / Parallel Resistance" onReset={reset} onSave={() => save('Series / Parallel Resistance', inputs, result.answer)}>
      {resistors.map((resistor, index) => (
        <div className="row-field" key={index}>
          <Field
            label={`R${index + 1}`}
            value={resistor.value?.toString() ?? ''}
            setValue={(value) => setOne(index, { value: numberOrUndefined(value) })}
            unit={resistor.unit}
            setUnit={(unit) => setOne(index, { unit })}
            units={['ohm', 'kohm', 'Mohm']}
          />
          <button className="icon-button" aria-label={`Remove R${index + 1}`} onClick={() => setResistors((items) => items.filter((_, i) => i !== index))}>
            -
          </button>
        </div>
      ))}
      <button className="secondary-action" onClick={() => setResistors((items) => [...items, { value: undefined, unit: 'ohm' }])}>Add resistor</button>
      <ResultPanel result={result} />
    </CalculatorCard>
  );
}

function VoltageDropCalculator({ decimals, save }: CalcProps) {
  const [supplyVoltage, setSupplyVoltage] = useState('230');
  const [current, setCurrent] = useState('20');
  const [length, setLength] = useState('30');
  const [method, setMethod] = useState<'mvam' | 'resistance'>('mvam');
  const [mvam, setMvam] = useState('18');
  const [resistancePerM, setResistancePerM] = useState('0.0012');
  const [phase, setPhase] = useState<'single' | 'three'>('single');
  const result = calculateVoltageDrop(
    {
      supplyVoltage: numberOrUndefined(supplyVoltage),
      current: numberOrUndefined(current),
      length: numberOrUndefined(length),
      method,
      mvam: numberOrUndefined(mvam),
      resistancePerM: numberOrUndefined(resistancePerM),
      phase
    },
    decimals
  );
  const inputs = { supplyVoltage, current, length, method, mvam, resistancePerM, phase };
  const reset = () => {
    setSupplyVoltage('230');
    setCurrent('20');
    setLength('30');
    setMethod('mvam');
    setMvam('18');
    setResistancePerM('0.0012');
    setPhase('single');
  };
  return (
    <CalculatorCard title="Voltage Drop" onReset={reset} onSave={() => save('Voltage Drop', inputs, result.answer)}>
      <Segment label="Method" value={method} setValue={setMethod} options={[['mvam', 'mV/A/m'], ['resistance', 'ohm per metre']]} />
      <Segment label="Phase" value={phase} setValue={setPhase} options={[['single', 'Single'], ['three', 'Three']]} />
      <Field label="Supply voltage" value={supplyVoltage} setValue={setSupplyVoltage} unit="V" units={['V']} />
      <Field label="Current" value={current} setValue={setCurrent} unit="A" units={['A']} />
      <Field label="Cable length" value={length} setValue={setLength} unit="m" units={['m']} />
      {method === 'mvam' ? (
        <Field label="Voltage drop value" value={mvam} setValue={setMvam} unit="mV/A/m" units={['mV/A/m']} />
      ) : (
        <Field label="Resistance per metre" value={resistancePerM} setValue={setResistancePerM} unit="ohm/m" units={['ohm/m']} />
      )}
      <details className="help-details">
        <summary>Method examples</summary>
        <div className="example-mini">
          <p><b>mV/A/m:</b> Use when a cable table gives a voltage-drop value. Example: 18 x 10 A x 20 m / 1000 = 3.6 V.</p>
          <p><b>Resistance method:</b> Use a simple conductor resistance estimate. Single-phase uses the out-and-back path; three-phase uses sqrt(3).</p>
        </div>
      </details>
      <p className="note">For real cable sizing, confirm against the current wiring rules and cable tables.</p>
      <ResultPanel result={result} />
    </CalculatorCard>
  );
}

function FaultCurrentCalculator({ decimals, save }: CalcProps) {
  const [voltage, setVoltage] = useState('230');
  const [impedance, setImpedance] = useState('0.5');
  const result = calculateFaultCurrent({ voltage: numberOrUndefined(voltage), impedance: numberOrUndefined(impedance) }, decimals);
  const reset = () => {
    setVoltage('230');
    setImpedance('0.5');
  };
  return (
    <CalculatorCard title="Fault Current" onReset={reset} onSave={() => save('Fault Current', { voltage, impedance }, result.answer)}>
      <Field label="Supply voltage" value={voltage} setValue={setVoltage} unit="V" units={['V']} />
      <Field label="Fault loop impedance" value={impedance} setValue={setImpedance} unit="ohm" units={['ohm']} />
      <ResultPanel result={result} />
    </CalculatorCard>
  );
}

function EnergyCostCalculator({ decimals, save }: CalcProps) {
  const [power, setPower] = useState('2');
  const [powerUnit, setPowerUnit] = useState('kW');
  const [hours, setHours] = useState('5');
  const [price, setPrice] = useState('0.35');
  const result = calculateEnergyCost({ power: numberOrUndefined(power), powerUnit, hours: numberOrUndefined(hours), price: numberOrUndefined(price) }, decimals);
  const reset = () => {
    setPower('2');
    setPowerUnit('kW');
    setHours('5');
    setPrice('0.35');
  };
  return (
    <CalculatorCard title="Energy Cost" onReset={reset} onSave={() => save('Energy Cost', { power, powerUnit, hours, price }, result.answer)}>
      <Field label="Power" value={power} setValue={setPower} unit={powerUnit} setUnit={setPowerUnit} units={['W', 'kW']} />
      <Field label="Hours used" value={hours} setValue={setHours} unit="h" units={['h']} />
      <Field label="Cost per kWh" value={price} setValue={setPrice} unit="$" units={['$']} />
      <ResultPanel result={result} />
    </CalculatorCard>
  );
}

function UnitConverter({ decimals }: { decimals: DecimalPlaces }) {
  const [group, setGroup] = useState<UnitGroup>('current');
  const units = Object.keys(unitFactors[group]);
  const [value, setValue] = useState('1000');
  const [from, setFrom] = useState(units[0]);
  const [to, setTo] = useState(units[1] ?? units[0]);
  const quickConversions: { label: string; group: UnitGroup; from: string; to: string; value: string }[] = [
    { label: 'mA to A', group: 'current', from: 'mA', to: 'A', value: '1000' },
    { label: 'A to mA', group: 'current', from: 'A', to: 'mA', value: '1' },
    { label: 'kW to W', group: 'power', from: 'kW', to: 'W', value: '1' },
    { label: 'W to kW', group: 'power', from: 'W', to: 'kW', value: '1000' },
    { label: 'kWh to Wh', group: 'energy', from: 'kWh', to: 'Wh', value: '1' },
    { label: 'kohm to ohm', group: 'resistance', from: 'kohm', to: 'ohm', value: '1' },
    { label: 'mm to m', group: 'length', from: 'mm', to: 'm', value: '1000' },
    { label: 'mm2 to m2', group: 'area', from: 'mm2', to: 'm2', value: '2.5' }
  ];

  useEffect(() => {
    const nextUnits = Object.keys(unitFactors[group]);
    if (!nextUnits.includes(from)) setFrom(nextUnits[0]);
    if (!nextUnits.includes(to)) setTo(nextUnits[1] ?? nextUnits[0]);
  }, [group, from, to]);

  const reset = () => {
    setGroup('current');
    setValue('1000');
    setFrom('uA');
    setTo('mA');
  };

  const applyQuickConversion = (conversion: { group: UnitGroup; from: string; to: string; value: string }) => {
    setGroup(conversion.group);
    setValue(conversion.value);
    setFrom(conversion.from);
    setTo(conversion.to);
  };

  const amount = numberOrUndefined(value);
  const converted = amount !== undefined ? convertUnit(amount, from, to, group) : undefined;
  const result: CalculationResult = {
    answer: converted !== undefined ? `${formatNumber(converted, decimals)} ${unitLabels[to] ?? to}` : 'Waiting for input',
    formula: 'Convert to base unit, then convert to the selected output unit.',
    working: amount !== undefined ? [`${amount} ${unitLabels[from] ?? from} -> base ${group}`, `Result = ${formatNumber(converted ?? 0, decimals)} ${unitLabels[to] ?? to}`] : [],
    conversions: group === 'area' ? ['Cable area labels such as mm2 describe conductor cross-sectional area, not an automatic cable size selection.'] : [],
    warnings: amount !== undefined && amount < 0 ? ['Negative conversion values are unusual for this training context.'] : []
  };
  return (
    <CalculatorCard title="Unit Converter" onReset={reset}>
      <div className="chip-row" aria-label="Quick conversions">
        {quickConversions.map((conversion) => (
          <button className="unit-chip" key={conversion.label} onClick={() => applyQuickConversion(conversion)}>
            {conversion.label}
          </button>
        ))}
      </div>
      <label className="field-label">Conversion type</label>
      <select className="large-select" value={group} onChange={(event) => setGroup(event.target.value as UnitGroup)}>
        <option value="current">uA, mA, A, kA</option>
        <option value="voltage">uV, mV, V, kV, MV</option>
        <option value="resistance">milliohm, ohm, kohm, Mohm</option>
        <option value="power">mW, W, kW, MW</option>
        <option value="apparentPower">VA, kVA, MVA</option>
        <option value="energy">Wh, kWh, MWh</option>
        <option value="length">mm, cm, m, km</option>
        <option value="area">mm2, cm2, m2</option>
      </select>
      <Field label="Value" value={value} setValue={setValue} unit={from} setUnit={setFrom} units={units} />
      <label className="field-label">To unit</label>
      <select className="large-select" value={to} onChange={(event) => setTo(event.target.value)}>
        {units.map((unit) => (
          <option value={unit} key={unit}>{unitLabels[unit] ?? unit}</option>
        ))}
      </select>
      <p className="note">Cable area labels such as mm2 are for unit conversion only. SparkCalc does not size cable from standards.</p>
      <ResultPanel result={result} />
    </CalculatorCard>
  );
}

function FormulaSheet() {
  const [query, setQuery] = useState('');
  const filtered = formulaCards.filter((card) => `${card.section} ${card.formula} ${card.meaning}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <section className="page-stack">
      <input className="search" aria-label="Search formulas" placeholder="Search formulas" value={query} onChange={(event) => setQuery(event.target.value)} />
      {filtered.map((card) => (
        <article className="info-card" key={card.section}>
          <h2>{card.section}</h2>
          <p className="formula-line">{card.formula}</p>
          <p>{card.meaning}</p>
          <p><b>Example:</b> {card.example}</p>
        </article>
      ))}
    </section>
  );
}

function WorkedExamplesPage() {
  return (
    <section className="page-stack">
      {workedExamples.map((example) => (
        <article className="info-card" key={example.title}>
          <h2>{example.title}</h2>
          <p>{example.scenario}</p>
          <p className="formula-line">{example.formula}</p>
          <ul className="working-list">
            {example.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ul>
          <p className="note">{example.takeaway}</p>
        </article>
      ))}
    </section>
  );
}

function PracticePage({ decimals }: { decimals: DecimalPlaces }) {
  const topics: PracticeTopic[] = ['Ohm\'s Law', 'Power', 'Three-phase Power', 'Series Resistance', 'Parallel Resistance', 'Fault Current', 'Energy Cost'];
  const [topic, setTopic] = useState<PracticeTopic>('Ohm\'s Law');
  const [difficulty, setDifficulty] = useState<Difficulty>('Easy');
  const [question, setQuestion] = useState<PracticeQuestion>(() => generatePracticeQuestion('Ohm\'s Law', 'Easy'));
  const [answer, setAnswer] = useState('');
  const [feedback, setFeedback] = useState('');
  const [showHint, setShowHint] = useState(false);
  const [showFormula, setShowFormula] = useState(false);
  const [showWorking, setShowWorking] = useState(false);
  const [score, setScore] = useState(() => loadPracticeScore());
  const [progress, setProgress] = useState<TopicProgress>(() => loadTopicProgress());
  const [mistakes, setMistakes] = useState<PracticeMistake[]>(() => loadPracticeMistakes());

  const newQuestion = () => {
    setQuestion(generatePracticeQuestion(topic, difficulty));
    setAnswer('');
    setFeedback('');
    setShowHint(false);
    setShowFormula(false);
    setShowWorking(false);
  };

  useEffect(() => {
    setQuestion(generatePracticeQuestion(topic, difficulty));
  }, [topic, difficulty]);

  const check = () => {
    const value = numberOrUndefined(answer);
    if (value === undefined) {
      setFeedback('Enter an answer first.');
      return;
    }
    const correct = Math.abs(value - question.answer) <= question.tolerance;
    const next = correct
      ? { correct: score.correct + 1, incorrect: score.incorrect, streak: score.streak + 1 }
      : { correct: score.correct, incorrect: score.incorrect + 1, streak: 0 };
    const nextProgress = {
      ...progress,
      [question.topic]: {
        correct: progress[question.topic].correct + (correct ? 1 : 0),
        incorrect: progress[question.topic].incorrect + (correct ? 0 : 1)
      }
    };
    setScore(next);
    setProgress(nextProgress);
    savePracticeScore(next);
    saveTopicProgress(nextProgress);
    if (!correct) {
      setMistakes(
        savePracticeMistake({
          topic: question.topic,
          difficulty: question.difficulty,
          prompt: question.prompt,
          givenAnswer: answer,
          expectedAnswer: question.answer,
          unit: question.unit,
          formula: question.formula,
          working: question.working
        })
      );
    }
    setFeedback(correct ? 'Correct.' : `Not quite. Expected about ${formatNumber(question.answer, decimals)} ${question.unit}.`);
  };

  const topicProgress = progress[topic];
  const topicAttempts = topicProgress.correct + topicProgress.incorrect;
  const topicPercent = topicAttempts > 0 ? (topicProgress.correct / topicAttempts) * 100 : 0;

  return (
    <section className="page-stack">
      <div className="info-card">
        <label className="field-label">Topic</label>
        <select className="large-select" value={topic} onChange={(event) => setTopic(event.target.value as PracticeTopic)}>
          {topics.map((item) => <option key={item}>{item}</option>)}
        </select>
        <Segment label="Difficulty" value={difficulty} setValue={setDifficulty} options={[['Easy', 'Easy'], ['Medium', 'Medium'], ['Hard', 'Hard']]} />
      </div>
      <article className="calculator-card">
        <h2>{question.topic}</h2>
        <p className="question">{question.prompt}</p>
        <p className="answer-guidance">Answer in {question.unit}. Rounding within about +/- {formatNumber(question.tolerance, decimals)} {question.unit} is accepted.</p>
        <Field label={`Answer (${question.unit})`} value={answer} setValue={setAnswer} unit={question.unit} units={[question.unit]} />
        <div className="button-grid">
          <button className="primary-action" onClick={check}>Check Answer</button>
          <button className="secondary-action" onClick={() => setShowHint((value) => !value)}>Show Hint</button>
          <button className="secondary-action" onClick={() => setShowFormula((value) => !value)}>Show Formula</button>
          <button className="secondary-action" onClick={() => setShowWorking((value) => !value)}>Show Full Working</button>
          <button className="secondary-action" onClick={newQuestion}>New Question</button>
        </div>
        {feedback && <p className="feedback">{feedback}</p>}
        {showHint && <p className="note">{question.hint}</p>}
        {showFormula && <p className="formula-line">{question.formula}</p>}
        {showWorking && <ul className="working-list">{question.working.map((line) => <li key={line}>{line}</li>)}</ul>}
      </article>
      <div className="score-row">
        <span>Correct <b>{score.correct}</b></span>
        <span>Incorrect <b>{score.incorrect}</b></span>
        <span>Streak <b>{score.streak}</b></span>
      </div>
      <article className="info-card">
        <h2>Topic progress</h2>
        <p className="answer-text">{topicAttempts ? `${formatNumber(topicPercent, 0)}% correct` : 'No attempts yet'}</p>
        <div className="progress-meter" aria-label={`${topic} progress`}>
          <span style={{ width: `${Math.min(100, topicPercent)}%` }} />
        </div>
        <p className="note">{topicProgress.correct} correct and {topicProgress.incorrect} incorrect for {topic}.</p>
      </article>
      <article className="info-card">
        <div className="card-heading">
          <h2>Recent mistakes</h2>
          {mistakes.length > 0 && (
            <button
              className="delete-button"
              onClick={() => {
                clearPracticeMistakes();
                setMistakes([]);
              }}
            >
              Clear
            </button>
          )}
        </div>
        {mistakes.length === 0 ? (
          <p>No mistakes saved yet.</p>
        ) : (
          <div className="mistake-list">
            {mistakes.slice(0, 5).map((mistake) => (
              <details key={mistake.id}>
                <summary>{mistake.topic}: {formatNumber(mistake.expectedAnswer, decimals)} {mistake.unit}</summary>
                <p>{mistake.prompt}</p>
                <p className="note">Your answer: {mistake.givenAnswer || '-'} {mistake.unit}</p>
                <p className="formula-line">{mistake.formula}</p>
                <ul className="working-list">
                  {mistake.working.map((line) => (
                    <li key={line}>{line}</li>
                  ))}
                </ul>
              </details>
            ))}
          </div>
        )}
      </article>
    </section>
  );
}

function SavedPage({ saved, deleteOne, clearAll }: { saved: SavedCalculation[]; deleteOne: (id: string) => void; clearAll: () => void }) {
  const [filter, setFilter] = useState('All');
  const calculatorTypes = ['All', ...Array.from(new Set(saved.map((entry) => entry.calculator)))];
  const filteredSaved = filter === 'All' ? saved : saved.filter((entry) => entry.calculator === filter);
  return (
    <section className="page-stack">
      {saved.length > 0 && (
        <article className="info-card filter-card">
          <label className="field-label" htmlFor="saved-filter">Filter saved calculations</label>
          <select id="saved-filter" className="large-select" value={filter} onChange={(event) => setFilter(event.target.value)}>
            {calculatorTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </article>
      )}
      {saved.length > 0 && <button className="danger-action" onClick={clearAll}>Clear all saved calculations</button>}
      {saved.length === 0 && <article className="info-card"><h2>No saved calculations yet</h2><p>Save useful working from any calculator and it will appear here.</p></article>}
      {saved.length > 0 && filteredSaved.length === 0 && <article className="info-card"><h2>No matches</h2><p>Try a different calculator filter.</p></article>}
      {filteredSaved.map((entry) => (
        <article className="info-card" key={entry.id}>
          <div className="card-heading">
            <h2>{entry.calculator}</h2>
            <button className="delete-button" aria-label={`Delete ${entry.calculator}`} onClick={() => deleteOne(entry.id)}>Delete</button>
          </div>
          <p className="answer-text">{entry.answer}</p>
          <p className="saved-date">{new Date(entry.createdAt).toLocaleString()}</p>
          <details>
            <summary>View inputs</summary>
            <dl className="saved-inputs">
              {Object.entries(entry.inputs).map(([key, value]) => (
                <div key={key}>
                  <dt>{friendlyInputName(key)}</dt>
                  <dd>{String(value || '-')}</dd>
                </div>
              ))}
            </dl>
          </details>
        </article>
      ))}
    </section>
  );
}

const friendlyInputName = (key: string) =>
  key
    .replace(/Unit$/, ' unit')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/^./, (letter) => letter.toUpperCase());

function SettingsPage({
  settings,
  update,
  clearAll,
  canInstall,
  isStandalone,
  installApp
}: {
  settings: Settings;
  update: (settings: Settings) => void;
  clearAll: () => void;
  canInstall: boolean;
  isStandalone: boolean;
  installApp: () => void;
}) {
  return (
    <section className="page-stack">
      <article className="info-card">
        <Segment label="Theme" value={settings.theme} setValue={(theme) => update({ ...settings, theme })} options={[['system', 'System'], ['light', 'Light'], ['dark', 'Dark']]} />
        <Segment label="Decimal places" value={String(settings.decimals)} setValue={(value) => update({ ...settings, decimals: Number(value) as DecimalPlaces })} options={[['2', '2'], ['3', '3'], ['4', '4']]} />
        <Field label="Default single-phase voltage" value={String(settings.defaultSingleVoltage)} setValue={(value) => update({ ...settings, defaultSingleVoltage: numberOrUndefined(value) ?? 230 })} unit="V" units={['V']} />
        <Field label="Default three-phase voltage" value={String(settings.defaultThreeVoltage)} setValue={(value) => update({ ...settings, defaultThreeVoltage: numberOrUndefined(value) ?? 400 })} unit="V" units={['V']} />
        <div className="install-box">
          <h2>Install app</h2>
          {isStandalone ? (
            <p className="note">SparkCalc is already running as an installed app.</p>
          ) : canInstall ? (
            <button className="primary-action" onClick={installApp}>Install SparkCalc</button>
          ) : (
            <p className="note">Use your browser menu to add SparkCalc to the home screen when install is available.</p>
          )}
        </div>
        <button className="danger-action" onClick={clearAll}>Clear all saved data</button>
      </article>
    </section>
  );
}

function CalculatorCard({ title, children, onSave, onReset }: { title: string; children: ReactNode; onSave?: () => void; onReset?: () => void }) {
  return (
    <article className="calculator-card">
      <div className="card-heading">
        <h2>{title}</h2>
        <div className="card-actions">
          {onReset && <button className="secondary-action compact-action" onClick={onReset}>Reset</button>}
          {onSave && <button className="save-button" onClick={onSave}>Save calculation</button>}
        </div>
      </div>
      {children}
    </article>
  );
}

function Field({
  label,
  value,
  setValue,
  unit,
  setUnit,
  units
}: {
  label: string;
  value: string;
  setValue: (value: string) => void;
  unit: string;
  setUnit?: (unit: string) => void;
  units: string[];
}) {
  const id = useMemo(() => label.toLowerCase().replace(/[^a-z0-9]+/g, '-'), [label]);
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <div className="input-row">
        <input id={id} type="number" inputMode="decimal" enterKeyHint="done" autoComplete="off" value={value} onChange={(event) => setValue(event.target.value)} />
        {setUnit && units.length > 1 ? (
          <select aria-label={`${label} unit`} value={unit} onChange={(event) => setUnit(event.target.value)}>
            {units.map((item) => (
              <option key={item} value={item}>{unitLabels[item] ?? item}</option>
            ))}
          </select>
        ) : (
          <span className="unit-pill" aria-label={`${label} unit`}>{unitLabels[unit] ?? unit}</span>
        )}
      </div>
    </div>
  );
}

function Segment<T extends string>({
  label,
  value,
  setValue,
  options
}: {
  label: string;
  value: T;
  setValue: (value: T) => void;
  options: [T, string][];
}) {
  return (
    <div className="segment-block">
      <span className="field-label">{label}</span>
      <div className="segment">
        {options.map(([option, text]) => (
          <button key={option} className={value === option ? 'active' : ''} onClick={() => setValue(option)}>
            {text}
          </button>
        ))}
      </div>
    </div>
  );
}

function ResultPanel({ result }: { result: CalculationResult }) {
  const [copyStatus, setCopyStatus] = useState('');
  const copyWorking = async () => {
    const text = [
      `Answer: ${result.answer}`,
      `Formula: ${result.formula}`,
      'Working:',
      ...result.working.map((line) => `- ${line}`),
      result.conversions.length ? 'Conversions:' : '',
      ...result.conversions.map((line) => `- ${line}`)
    ].filter(Boolean).join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus('Copied.');
    } catch {
      setCopyStatus('Copy failed.');
    }
  };
  return (
    <div className="result-panel">
      <div className="answer-box">
        <span>Answer</span>
        <strong>{result.answer}</strong>
      </div>
      <button className="secondary-action" onClick={copyWorking}>Copy working</button>
      {copyStatus && <p className="feedback">{copyStatus}</p>}
      <section>
        <h3>Formula used</h3>
        <p className="formula-line">{result.formula}</p>
      </section>
      <section>
        <h3>Step-by-step working</h3>
        {result.working.length > 0 ? <ul className="working-list">{result.working.map((line) => <li key={line}>{line}</li>)}</ul> : <p>Add inputs to show working.</p>}
      </section>
      <section>
        <h3>Unit conversions</h3>
        {result.conversions.length > 0 ? <ul className="working-list">{result.conversions.map((line) => <li key={line}>{line}</li>)}</ul> : <p>No conversions needed yet.</p>}
      </section>
      <section>
        <h3>Warnings</h3>
        {result.warnings.length > 0 ? <ul className="warning-list">{result.warnings.map((line) => <li key={line}>{line}</li>)}</ul> : <p>No warnings.</p>}
      </section>
    </div>
  );
}

export default App;
