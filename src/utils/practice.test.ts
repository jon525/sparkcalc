import { describe, expect, it } from 'vitest';
import { Difficulty, PracticeTopic } from '../types';
import { generatePracticeQuestion } from './practice';

describe('practice question generator', () => {
  it('creates usable questions across topics and difficulties', () => {
    const topics: PracticeTopic[] = [
      'Ohm\'s Law',
      'Power',
      'Three-phase Power',
      'Series Resistance',
      'Parallel Resistance',
      'Fault Current',
      'Energy Cost'
    ];
    const difficulties: Difficulty[] = ['Easy', 'Medium', 'Hard'];

    for (const topic of topics) {
      for (const difficulty of difficulties) {
        for (let i = 0; i < 8; i += 1) {
          const question = generatePracticeQuestion(topic, difficulty);
          expect(question.topic).toBe(topic);
          expect(question.difficulty).toBe(difficulty);
          expect(question.prompt.length).toBeGreaterThan(10);
          expect(Number.isFinite(question.answer)).toBe(true);
          expect(question.tolerance).toBeGreaterThan(0);
          expect(question.working.length).toBeGreaterThan(0);
        }
      }
    }
  });
});
