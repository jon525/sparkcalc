import { PracticeMistake, PracticeTopic, SavedCalculation, Settings, TopicProgress } from '../types';

const SAVED_KEY = 'sparkcalc.saved';
const SETTINGS_KEY = 'sparkcalc.settings';
const LAST_KEY = 'sparkcalc.lastCalculator';
const SCORE_KEY = 'sparkcalc.practiceScore';
const PROGRESS_KEY = 'sparkcalc.topicProgress';
const MISTAKES_KEY = 'sparkcalc.practiceMistakes';

export const defaultSettings: Settings = {
  theme: 'system',
  decimals: 2,
  defaultSingleVoltage: 230,
  defaultThreeVoltage: 400
};

export const loadSavedCalculations = (): SavedCalculation[] => {
  try {
    return JSON.parse(localStorage.getItem(SAVED_KEY) ?? '[]') as SavedCalculation[];
  } catch {
    return [];
  }
};

export const saveCalculation = (entry: Omit<SavedCalculation, 'id' | 'createdAt'>): SavedCalculation[] => {
  const next: SavedCalculation = {
    ...entry,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  const saved = [next, ...loadSavedCalculations()];
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  return saved;
};

export const deleteSavedCalculation = (id: string): SavedCalculation[] => {
  const saved = loadSavedCalculations().filter((entry) => entry.id !== id);
  localStorage.setItem(SAVED_KEY, JSON.stringify(saved));
  return saved;
};

export const clearSavedCalculations = (): void => {
  localStorage.removeItem(SAVED_KEY);
};

export const loadSettings = (): Settings => {
  try {
    return { ...defaultSettings, ...(JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Partial<Settings>) };
  } catch {
    return defaultSettings;
  }
};

export const saveSettings = (settings: Settings): void => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
};

export const setLastCalculator = (id: string): void => localStorage.setItem(LAST_KEY, id);
export const getLastCalculator = (): string | null => localStorage.getItem(LAST_KEY);

export const loadPracticeScore = () => {
  try {
    return JSON.parse(localStorage.getItem(SCORE_KEY) ?? '{"correct":0,"incorrect":0,"streak":0}') as {
      correct: number;
      incorrect: number;
      streak: number;
    };
  } catch {
    return { correct: 0, incorrect: 0, streak: 0 };
  }
};

export const savePracticeScore = (score: { correct: number; incorrect: number; streak: number }) => {
  localStorage.setItem(SCORE_KEY, JSON.stringify(score));
};

const practiceTopics: PracticeTopic[] = [
  'Ohm\'s Law',
  'Power',
  'Three-phase Power',
  'Series Resistance',
  'Parallel Resistance',
  'Fault Current',
  'Energy Cost'
];

export const emptyTopicProgress = (): TopicProgress =>
  Object.fromEntries(practiceTopics.map((topic) => [topic, { correct: 0, incorrect: 0 }])) as TopicProgress;

export const loadTopicProgress = (): TopicProgress => {
  try {
    return { ...emptyTopicProgress(), ...(JSON.parse(localStorage.getItem(PROGRESS_KEY) ?? '{}') as Partial<TopicProgress>) };
  } catch {
    return emptyTopicProgress();
  }
};

export const saveTopicProgress = (progress: TopicProgress): void => {
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(progress));
};

export const loadPracticeMistakes = (): PracticeMistake[] => {
  try {
    return JSON.parse(localStorage.getItem(MISTAKES_KEY) ?? '[]') as PracticeMistake[];
  } catch {
    return [];
  }
};

export const savePracticeMistake = (mistake: Omit<PracticeMistake, 'id' | 'createdAt'>): PracticeMistake[] => {
  const next: PracticeMistake = {
    ...mistake,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString()
  };
  const mistakes = [next, ...loadPracticeMistakes()].slice(0, 20);
  localStorage.setItem(MISTAKES_KEY, JSON.stringify(mistakes));
  return mistakes;
};

export const clearPracticeMistakes = (): void => {
  localStorage.removeItem(MISTAKES_KEY);
};

export const clearAllData = (): void => {
  localStorage.removeItem(SAVED_KEY);
  localStorage.removeItem(SETTINGS_KEY);
  localStorage.removeItem(LAST_KEY);
  localStorage.removeItem(SCORE_KEY);
  localStorage.removeItem(PROGRESS_KEY);
  localStorage.removeItem(MISTAKES_KEY);
};
