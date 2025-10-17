# Multimedia Editor - Full-Stack Web Application

A comprehensive multimedia editing platform with WhatsApp integration, built with React, Supabase, and modern web technologies.

## 🚀 Features

### 🔐 Authentication & User Management
- Email/password authentication via Supabase Auth
- WhatsApp-based OTP login integration
- User profiles with usage tracking
- Premium subscription management

### 📹 Video Editor
- Upload videos (MP4, MOV, AVI) up to 100MB
- Real-time video preview with controls
- Add text annotations at specific timestamps
- Customizable text styling (font, size, color, position)
- Export videos with overlaid text using FFmpeg.wasm
- Original quality preservation

### 📄 PDF Editor
- Upload PDF files up to 100MB
- Page-by-page PDF viewing with zoom controls
- Click-to-place text annotations
- Multi-page annotation support
- Export annotated PDFs with original quality
- PDF.js integration for rendering

### 🧾 Usage Limits & Payments
- 3 free exports per user
- Stripe integration for premium upgrades
- Usage tracking and limits enforcement
- Premium users get unlimited exports

### 📱 WhatsApp Integration
- WhatsApp OTP-based authentication
- Payment confirmation notifications
- Export completion alerts
- Upgrade success messages

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **ShadCN UI** for component library
- **React Router** for navigation
- **React Query** for state management

### Backend & Services
- **Supabase** for database, authentication, and storage
- **Stripe** for payment processing
- **FFmpeg.wasm** for video processing
- **PDF.js** for PDF rendering
- **Twilio** (optional) for WhatsApp API

### Key Libraries
- `@ffmpeg/ffmpeg` - Client-side video processing
- `pdfjs-dist` - PDF rendering and manipulation
- `@stripe/stripe-js` - Payment processing
- `jspdf` & `html2canvas` - PDF generation
- `@supabase/supabase-js` - Supabase client

## 📦 Installation & Setup

### Prerequisites
- Node.js 18+ and npm
- Supabase account
- Stripe account
- (Optional) Twilio account for WhatsApp

### 1. Clone and Install
```bash
git clone <repository-url>
cd multimedia-editor
npm install
```

### 2. Environment Setup
Create a `.env` file based on `.env.example`:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_SECRET_KEY=your_stripe_secret_key

# WhatsApp API Configuration (Optional - Twilio example)
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=your_twilio_whatsapp_number

# App Configuration
VITE_APP_URL=http://localhost:5173
VITE_MAX_FREE_EXPORTS=3
VITE_PREMIUM_PRICE=999
```

### 3. Supabase Setup

#### Database Schema
Run the SQL commands from `supabase-schema.sql` in your Supabase SQL editor to create:
- User profiles table
- Files table
- Payments table
- WhatsApp sessions table
- Row Level Security policies
- Storage buckets

#### Storage Buckets
Create two storage buckets in Supabase:
1. `user-files` - for original uploads
2. `processed-files` - for exported files

Set appropriate policies for authenticated users.

### 4. Stripe Setup
1. Create a Stripe account
2. Get your publishable and secret keys
3. Set up webhooks for payment confirmations (optional)
4. Configure payment methods and currencies

### 5. WhatsApp Integration (Optional)
For WhatsApp functionality, you can use:
- **Twilio WhatsApp API** (recommended for production)
- **WhatsApp Business API** (for enterprise)
- **Third-party services** like MessageBird, etc.

Update the API endpoints in `/api/` folder according to your chosen provider.

## 🚀 Development

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## 📁 Project Structure

```
src/
├── components/
│   ├── auth/           # Authentication components
│   ├── dashboard/      # Dashboard and file management
│   ├── editor/         # Video and PDF editors
│   ├── layout/         # Header and layout components
│   ├── payment/        # Stripe integration
│   └── ui/            # Reusable UI components
├── hooks/             # Custom React hooks
├── lib/               # Utilities and configurations
├── types/             # TypeScript type definitions
└── main.tsx          # Application entry point

api/                   # Backend API endpoints
├── create-payment-intent.ts
├── send-whatsapp-otp.ts
└── send-whatsapp-notification.ts

public/               # Static assets
supabase-schema.sql   # Database schema
```

## 🔧 Configuration

### Video Processing
- Maximum file size: 100MB
- Supported formats: MP4, MOV, AVI
- Processing: Client-side with FFmpeg.wasm
- Output: H.264 encoded MP4

### PDF Processing
- Maximum file size: 100MB
- Rendering: PDF.js for display
- Export: jsPDF with html2canvas for annotations
- Quality: Original resolution maintained

### Usage Limits
- Free users: 3 exports total
- Premium users: Unlimited exports
- File storage: Persistent in Supabase Storage

## 🚀 Deployment

### Recommended Platforms
- **Vercel** (recommended for React apps)
- **Netlify**
- **Railway**
- **Heroku**

### Deployment Steps
1. Build the project: `npm run build`
2. Deploy the `dist` folder to your chosen platform
3. Set up environment variables
4. Configure API endpoints (if using serverless functions)

### Vercel Deployment
```bash
npm install -g vercel
vercel --prod
```

### Environment Variables
Ensure all environment variables are set in your deployment platform.

## 🔐 Security Considerations

- Row Level Security (RLS) enabled on all Supabase tables
- File upload size limits enforced
- User authentication required for all operations
- Stripe webhook verification (recommended)
- Input validation and sanitization

## 📊 Admin Features

### Database Monitoring
Monitor user activity through Supabase dashboard:
- User registrations and activity
- File uploads and processing status
- Payment transactions
- Usage statistics

### Analytics Queries
```sql
-- Active users in last 30 days
SELECT COUNT(DISTINCT user_id) FROM files 
WHERE created_at > NOW() - INTERVAL '30 days';

-- Premium conversion rate
SELECT 
  COUNT(CASE WHEN is_premium THEN 1 END) * 100.0 / COUNT(*) as conversion_rate
FROM profiles;

-- Popular file types
SELECT file_type, COUNT(*) FROM files GROUP BY file_type;
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Check the documentation
- Contact support team

## 🔄 Updates & Changelog

### Version 1.0.0
- Initial release with core features
- Video and PDF editing capabilities
- WhatsApp integration
- Stripe payment processing
- Responsive design

---

Built with ❤️ using React, Supabase, and modern web technologies.

## Original Lovable Project

This project was initially created with [Lovable](https://lovable.dev/projects/ace593a2-08ce-40e2-804a-f040ce6a70ab).

### Technologies Used
- Vite
- TypeScript
- React
- shadcn-ui
- Tailwind CSS
- Supabase
- Stripe
- FFmpeg.wasm
- PDF.js