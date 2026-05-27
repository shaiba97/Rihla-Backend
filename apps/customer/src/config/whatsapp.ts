import * as fs from 'fs';
import * as path from 'path';

const PHONE_NUMBER_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const ACCESS_TOKEN = process.env.WHATSAPP_ACCESS_TOKEN || '';
const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${PHONE_NUMBER_ID}/messages`;

export async function sendWhatsAppMessage(
  to: string,
  message: string,
): Promise<void> {
  if (!PHONE_NUMBER_ID || PHONE_NUMBER_ID === 'your_phone_number_id_here') {
    console.warn('⚠️ WhatsApp Cloud API not configured. Message logged:');
    console.log(`  To: ${to}`);
    console.log(`  Message: ${message}`);
    return;
  }

  let number = to
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^0-9+]/g, '');
  if (number.startsWith('+')) {
    number = number.slice(1);
  }

  const response = await fetch(WHATSAPP_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: number,
      type: 'text',
      text: { body: message },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error (${response.status}): ${error}`);
  }

  console.log(`✅ WhatsApp text sent to +${number}`);
}

export async function sendWhatsAppDocument(
  to: string,
  message: string,
  filePath: string,
  filename: string,
): Promise<void> {
  if (!PHONE_NUMBER_ID || PHONE_NUMBER_ID === 'your_phone_number_id_here') {
    console.warn('⚠️ WhatsApp Cloud API not configured. Document send logged:');
    console.log(`  To: ${to}`);
    console.log(`  Message: ${message}`);
    console.log(`  File: ${filePath}`);
    return;
  }

  let number = to
    .trim()
    .replace(/\s+/g, '')
    .replace(/[^0-9+]/g, '');
  if (number.startsWith('+')) {
    number = number.slice(1);
  }

  const absolutePath = path.resolve(filePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Ticket file not found: ${absolutePath}`);
  }

  const fileBuffer = fs.readFileSync(absolutePath);
  const base64Data = fileBuffer.toString('base64');

  const caption = message;

  const response = await fetch(WHATSAPP_API_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: number,
      type: 'document',
      document: {
        filename: filename,
        caption: caption,
        data: base64Data,
      },
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`WhatsApp API error (${response.status}): ${error}`);
  }

  console.log(`✅ WhatsApp document sent to +${number}: ${filename}`);
}
