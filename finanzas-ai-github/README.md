# FinanzasAI 💰

Personal finance tracker with AI-powered categorization. Automatically syncs with your bank emails and extracts transactions from PDF statements.

## Features

- 🔐 Google OAuth authentication
- 📧 Gmail integration for transaction notifications
- 📄 PDF bank statement parsing with AI classification
- 🤖 AI-powered transaction categorization (Claude)
- 📊 Dashboard with spending insights
- 🇨🇴 Supports Colombian banks (Bancolombia, Nubank)

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Supabase (Auth, PostgreSQL, Edge Functions)
- **AI**: Claude API (Anthropic)
- **Hosting**: Vercel

## Setup

### Prerequisites

- Node.js 18+
- Supabase account
- Google Cloud Console project (for Gmail API)
- Anthropic API key

### Environment Variables

Create a `.env` file:

```env
VITE_SUPABASE_URL=your-supabase-url
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### Local Development

```bash
npm install
npm run dev
```

### Deploy to Vercel

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy!

## License

Private - All rights reserved
