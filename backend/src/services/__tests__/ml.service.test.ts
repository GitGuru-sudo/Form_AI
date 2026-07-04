import { describe, it, expect } from 'vitest';
import { ruleBasedFallback } from '../ml.service';

describe('ml.service fallback', () => {
  it('returns the requested number of questions', () => {
    const form = ruleBasedFallback('customer feedback survey', 5);
    expect(form.questions).toHaveLength(5);
  });

  it('handles a large count gracefully without crashing', () => {
    const form = ruleBasedFallback('anything', 99);
    expect(form.questions.length).toBe(99);
    for (const q of form.questions) {
      expect(typeof q.questionText).toBe('string');
      expect(q.questionText.trim().length).toBeGreaterThan(0);
    }
  });

  it('produces a non-empty title and well-formed questions', () => {
    const form = ruleBasedFallback('event RSVP', 3);
    expect(form.title.trim().length).toBeGreaterThan(0);
    for (const q of form.questions) {
      expect(typeof q.questionText).toBe('string');
      expect(q.questionText.trim().length).toBeGreaterThan(0);
    }
  });
});
