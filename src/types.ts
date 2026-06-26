export type ThemeMode = 'light' | 'dark' | 'system';
export type DecimalPlaces = 2 | 3 | 4;

export type Settings = {
  theme: ThemeMode;
  decimals: DecimalPlaces;
  defaultSingleVoltage: number;
  defaultThreeVoltage: number;
};

export type CalculationResult = {
  answer: string;
  formula: string;
  working: string[];
  conversions: string[];
  warnings: string[];
  values?: Record<string, number>;
};

export type SavedCalculation = {
  id: string;
  calculator: string;
  inputs: Record<string, string | number>;
  answer: string;
  createdAt: string;
};

export type PracticeTopic =
  | 'Ohm\'s Law'
  | 'Power'
  | 'Three-phase Power'
  | 'Series Resistance'
  | 'Parallel Resistance'
  | 'Fault Current'
  | 'Energy Cost';

export type Difficulty = 'Easy' | 'Medium' | 'Hard';

export type PracticeQuestion = {
  topic: PracticeTopic;
  difficulty: Difficulty;
  prompt: string;
  answer: number;
  unit: string;
  tolerance: number;
  hint: string;
  formula: string;
  working: string[];
};

export type TopicProgress = Record<PracticeTopic, { correct: number; incorrect: number }>;

export type PracticeMistake = {
  id: string;
  topic: PracticeTopic;
  difficulty: Difficulty;
  prompt: string;
  givenAnswer: string;
  expectedAnswer: number;
  unit: string;
  formula: string;
  working: string[];
  createdAt: string;
};
