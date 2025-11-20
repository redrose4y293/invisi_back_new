import sgMail from '@sendgrid/mail';
import { config } from '../config/env.js';

if (config.sendgrid.apiKey) {
  sgMail.setApiKey(config.sendgrid.apiKey);
}

export const sendEmail = async ({ to, subject, text, html }) => {
  if (!config.sendgrid.apiKey) return; // skip in dev without key
  const msg = { to, from: config.sendgrid.fromEmail, subject, text, html };
  await sgMail.send(msg);
};
