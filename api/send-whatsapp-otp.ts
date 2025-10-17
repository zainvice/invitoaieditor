import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, message } = req.body;

    if (!to || !message) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Example implementation with Twilio WhatsApp API
    // You can replace this with your preferred WhatsApp API provider
    
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !whatsappNumber) {
      // For demo purposes, just log the message
      console.log(`WhatsApp OTP to ${to}: ${message}`);
      return res.status(200).json({ success: true, demo: true });
    }

    const client = require('twilio')(accountSid, authToken);

    await client.messages.create({
      body: message,
      from: `whatsapp:${whatsappNumber}`,
      to: `whatsapp:${to}`,
    });

    res.status(200).json({ success: true });
  } catch (error: any) {
    console.error('Error sending WhatsApp OTP:', error);
    res.status(500).json({ error: error.message });
  }
}