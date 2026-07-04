import { Request, Response } from 'express';
import * as mlService from '../services/ml.service';
import logger from '../lib/logger';

export const generateForm = async (req: Request, res: Response) => {
  const startedAt = Date.now();

  try {
    const { prompt, questionCount } = req.body;
    if (!prompt) {
      return res.status(400).json({ message: 'Prompt is required' });
    }

    let count = 5;
    if (questionCount !== undefined && questionCount !== null) {
      const parsed = parseInt(questionCount, 10);
      if (isNaN(parsed) || parsed < 1 || parsed > 10) {
        return res.status(400).json({ message: 'questionCount must be a positive integer between 1 and 10' });
      }
      count = parsed;
    }

    logger.info('ML generate request received', {
      questionCount: count,
      promptLength: prompt.length
    });

    const generatedForm = await mlService.generateForm(prompt, count);
    logger.info('ML generate request completed', {
      durationMs: Date.now() - startedAt,
      hasQuestions: Array.isArray(generatedForm?.questions),
      questionCount: generatedForm?.questions?.length
    });
    res.json(generatedForm);
  } catch (err: any) {
    logger.error('ML generate request failed', {
      durationMs: Date.now() - startedAt,
      error: err.message
    });
    res.status(500).json({ message: err.message });
  }
};
