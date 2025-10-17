export interface User {
  id: string;
  email: string;
  full_name?: string;
  whatsapp_number?: string;
  usage_count: number;
  is_premium: boolean;
  stripe_customer_id?: string;
  created_at: string;
  updated_at: string;
}

export interface FileRecord {
  id: string;
  user_id: string;
  filename: string;
  file_type: 'video' | 'pdf';
  file_size: number;
  storage_path: string;
  original_url?: string;
  processed_url?: string;
  status: 'uploaded' | 'processing' | 'completed' | 'failed';
  annotations: Annotation[];
  created_at: string;
  updated_at: string;
}

export interface Annotation {
  id: string;
  type: 'text';
  content: string;
  position: {
    x: number;
    y: number;
  };
  timestamp?: number; // For video annotations (in seconds)
  duration?: number; // For video annotations (in seconds)
  page?: number; // For PDF annotations
  style: {
    fontSize: number;
    fontFamily: string;
    color: string;
    fontWeight: 'normal' | 'bold';
    fontStyle: 'normal' | 'italic';
    textAlign: 'left' | 'center' | 'right';
  };
}

export interface Payment {
  id: string;
  user_id: string;
  stripe_payment_intent_id: string;
  amount: number;
  currency: string;
  status: 'pending' | 'succeeded' | 'failed' | 'canceled';
  credits_added: number;
  whatsapp_notification_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface WhatsAppSession {
  id: string;
  phone_number: string;
  user_id?: string;
  otp_code?: string;
  otp_expires_at?: string;
  is_verified: boolean;
  created_at: string;
  updated_at: string;
}