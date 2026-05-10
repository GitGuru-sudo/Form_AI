import { Request, Response } from 'express';
import Form from '../models/form.model';
import ResponseModel from '../models/response.model';
import { v4 as uuidv4 } from 'uuid';
import logger from '../lib/logger';

export const createForm = async (req: Request, res: Response) => {
  try {
    const { title, description, questions, collectFullName, collectEmail, collectPhone, collectAge, collectDateOfBirth, collectGender } = req.body;
    const clerkUserId = (req as any).auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const shareToken = uuidv4().substring(0, 8);

    const newForm = new Form({
      clerkUserId,
      title,
      description,
      questions,
      shareToken,
      collectFullName,
      collectEmail,
      collectPhone,
      collectAge,
      collectDateOfBirth,
      collectGender
    });

    await newForm.save();
    logger.info('Form created', { formId: newForm._id, title: newForm.title });
    res.status(201).json(newForm);
  } catch (err: any) {
    logger.error('Failed to create form', { error: err.message });
    res.status(500).json({ message: err.message });
  }
};

export const getForms = async (req: Request, res: Response) => {
  try {
    const clerkUserId = (req as any).auth?.userId;
    const forms = await Form.find({ clerkUserId }).sort({ createdAt: -1 });
    
    const formIds = forms.map(f => f._id);
    const responseCounts = await ResponseModel.aggregate([
      { $match: { formId: { $in: formIds } } },
      { $group: { _id: '$formId', count: { $sum: 1 } } }
    ]);
    
    const countMap = new Map(responseCounts.map(r => [r._id.toString(), r.count]));
    
    const formsWithCounts = forms.map(form => ({
      ...form.toObject(),
      responseCount: countMap.get(form._id.toString()) || 0
    }));
    
    res.json(formsWithCounts);
  } catch (err: any) {
    logger.error('Failed to get forms', { error: err.message });
    res.status(500).json({ message: err.message });
  }
};

export const getFormById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clerkUserId = (req as any).auth?.userId;
    const form = await Form.findOne({ _id: id, clerkUserId });

    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    res.json(form);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const updateForm = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clerkUserId = (req as any).auth?.userId;
    
    const updatedForm = await Form.findOneAndUpdate(
      { _id: id, clerkUserId },
      { $set: req.body },
      { new: true }
    );

    if (!updatedForm) {
      return res.status(404).json({ message: 'Form not found' });
    }

    res.json(updatedForm);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const toggleFormStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clerkUserId = (req as any).auth?.userId;

    const form = await Form.findOne({ _id: id, clerkUserId });
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    form.isActive = !form.isActive;
    await form.save();

    res.json(form);
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteForm = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const clerkUserId = (req as any).auth?.userId;

    const deletedForm = await Form.findOneAndDelete({ _id: id, clerkUserId });
    if (!deletedForm) {
      return res.status(404).json({ message: 'Form not found' });
    }

    res.json({ message: 'Form deleted successfully' });
  } catch (err: any) {
    res.status(500).json({ message: err.message });
  }
};
