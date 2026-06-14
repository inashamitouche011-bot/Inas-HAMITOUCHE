-- =========================================================================
--             SCRIPT D'INITIALISATION POUR INASUIVI AI
-- =========================================================================
-- Copiez et collez ce script dans l'éditeur SQL de votre tableau de bord Supabase.
-- Ce script crée automatiquement les tables requises avec le support JSONB
-- pour préserver la structure exacte et flexible de vos données de chantier.
-- =========================================================================

-- 1. Table des utilisateurs (inasuivi_users)
CREATE TABLE IF NOT EXISTS inasuivi_users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  company TEXT,
  role TEXT DEFAULT 'supervisor',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Créez des index pour accélérer la recherche par email
CREATE INDEX IF NOT EXISTS idx_inasuivi_users_email ON inasuivi_users(email);

-- 2. Table des projets de chantier (inasuivi_projects)
CREATE TABLE IF NOT EXISTS inasuivi_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT REFERENCES inasuivi_users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  contractor TEXT,
  supervisor TEXT,
  location TEXT,
  tva_rate NUMERIC DEFAULT 20,
  retention_rate NUMERIC DEFAULT 5,
  contract_date DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  -- Données flexibles (workItems, situations, planningTasks, expertOpinions, auditLogs, etc.)
  extra_data JSONB DEFAULT '{}'::jsonb NOT NULL
);

-- Créez un index pour les performances de requête par utilisateur
CREATE INDEX IF NOT EXISTS idx_inasuivi_projects_user_id ON inasuivi_projects(user_id);

-- Desactivez la securite des lignes (RLS) pour autoriser l'ecriture avec vos cles publiques/anon
ALTER TABLE inasuivi_users DISABLE ROW LEVEL SECURITY;
ALTER TABLE inasuivi_projects DISABLE ROW LEVEL SECURITY;

-- 3. Table de l'historique des situations financières générées (historique_situations)
CREATE TABLE IF NOT EXISTS historique_situations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projet_id TEXT NOT NULL,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Table des PV de réunions (pv_reunions)
CREATE TABLE IF NOT EXISTS pv_reunions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  projet_id TEXT NOT NULL,
  url TEXT NOT NULL,
  filename TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Désactivez la sécurité RLS sur ces tables pour autoriser la saisie libre sur le terrain
ALTER TABLE historique_situations DISABLE ROW LEVEL SECURITY;
ALTER TABLE pv_reunions DISABLE ROW LEVEL SECURITY;

-- Créez les index de performance
CREATE INDEX IF NOT EXISTS idx_historique_situations_projet ON historique_situations(projet_id);
CREATE INDEX IF NOT EXISTS idx_pv_reunions_projet ON pv_reunions(projet_id);

-- Enregistrement des buckets de stockage requis dans Supabase
INSERT INTO storage.buckets (id, name, public) 
VALUES ('situations-generees', 'situations-generees', true) 
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public) 
VALUES ('pv-reunions', 'pv-reunions', true) 
ON CONFLICT (id) DO NOTHING;


-- =========================================================================
--  Optionnel : Vous pouvez tester votre connexion après avoir défini les variables.
--  L'application est configurée pour fonctionner automatiquement en mode
--  Local/Fichier si ces tables sont absentes ou pendant que vous les configurez.
-- =========================================================================
