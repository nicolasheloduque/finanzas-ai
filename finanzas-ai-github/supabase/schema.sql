-- =====================================================
-- FINANZAS AI - Database Schema
-- Ejecutar este script en Supabase SQL Editor
-- =====================================================

-- Tabla para guardar tokens de Google
CREATE TABLE IF NOT EXISTS user_tokens (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  google_access_token TEXT,
  google_refresh_token TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de transacciones
CREATE TABLE IF NOT EXISTS transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  merchant VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'otros',
  subcategory VARCHAR(100),
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  bank VARCHAR(50) NOT NULL DEFAULT 'other',
  type VARCHAR(20) NOT NULL DEFAULT 'expense',
  raw_email_id VARCHAR(255),
  raw_content TEXT,
  ai_categorized BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla de insights
CREATE TABLE IF NOT EXISTS insights (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  content TEXT NOT NULL,
  priority VARCHAR(20) DEFAULT 'medium',
  amount_impact DECIMAL(12,2),
  action_url TEXT,
  dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para mejor rendimiento
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date DESC);
CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category);
CREATE INDEX IF NOT EXISTS idx_insights_user_id ON insights(user_id);
CREATE INDEX IF NOT EXISTS idx_insights_dismissed ON insights(dismissed);

-- Row Level Security (RLS) - MUY IMPORTANTE para seguridad
ALTER TABLE user_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE insights ENABLE ROW LEVEL SECURITY;

-- Políticas de seguridad: cada usuario solo ve sus propios datos
CREATE POLICY "Users can view own tokens" ON user_tokens
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own tokens" ON user_tokens
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own tokens" ON user_tokens
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own transactions" ON transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own transactions" ON transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own transactions" ON transactions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own transactions" ON transactions
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own insights" ON insights
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own insights" ON insights
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own insights" ON insights
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own insights" ON insights
  FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- NOTA: Después de ejecutar esto, necesitas configurar
-- Google OAuth en Supabase Dashboard:
-- Authentication > Providers > Google
-- =====================================================
