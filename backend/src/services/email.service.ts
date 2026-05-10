import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config();

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null;

export const sendFormInvite = async (toEmails: string[], formTitle: string, formLink: string) => {
  if (!resend) {
    console.warn('Resend API Key is missing. Email skipped.');
    return;
  }

  try {
    await resend.emails.send({
      from: 'FormAI <onboarding@resend.dev>',
      to: toEmails,
      subject: `Invite to fill out: ${formTitle}`,
      html: `
        <h1>You've been invited!</h1>
        <p>Please click the link below to fill out the form: <strong>${formTitle}</strong></p>
        <p><a href="${formLink}">${formLink}</a></p>
        <p>Built with FormAI</p>
      `
    });
  } catch (err) {
    console.error('Failed to send email:', err);
  }
};
