import { NextApiRequest, NextApiResponse } from 'next';

const notificationTemplates = {
  upgrade_success: (data: any) => 
    `🎉 Congratulations ${data.userName}! Your Multimedia Editor account has been upgraded to Premium. You now have unlimited exports and access to all premium features!`,
  
  export_complete: (data: any) => 
    `✅ Your ${data.fileType} export is ready! Download it from your dashboard: ${data.downloadUrl}`,
  
  export_failed: (data: any) => 
    `❌ Sorry ${data.userName}, your ${data.fileType} export failed. Please try again or contact support.`,
  
  payment_received: (data: any) => 
    `💳 Payment received! Thank you for upgrading to Premium. Your account has been activated with unlimited exports.`,
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { to, type, data } = req.body;

    if (!to || !type) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const template = notificationTemplates[type as keyof typeof notificationTemplates];
    if (!template) {
      return res.status(400).json({ error: 'Invalid notification type' });
    }

    const message = template(data || {});

    // Example implementation with Twilio WhatsApp API
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    if (!accountSid || !authToken || !whatsappNumber) {
      // For demo purposes, just log the message
      console.log(`WhatsApp notification to ${to}: ${message}`);
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
    console.error('Error sending WhatsApp notification:', error);
    res.status(500).json({ error: error.message });
  }
}