/**
 * Shared types for Suivi de Chantier AI.
 */

export interface WorkItem {
  id: string; // generated
  code: string; // e.g. "1.1", "1.2"
  designation: string; // e.g., "Terrassement"
  unit: string; // e.g., "m³", "u", "m²"
  quantity: number;
  unitPrice: number;
  totalPrice: number; // calculated quantity * unitPrice
  lot?: string; // custom lot category
}

export interface WorkSituation {
  id: string;
  number: number; // 1, 2, 3...
  date: string; // YYYY-MM-DD
  status: 'draft' | 'approved' | 'paid';
  itemsProgress: Record<string, number>; // workItemId -> progress percentage (0 - 100)
  comment?: string;
  lotFilter?: string;
  createdAt: string;
  overrides?: Record<string, {
    designation?: string;
    unit?: string;
    quantityMarket?: number;
    unitPrice?: number;
    qtyPrecedente?: number;
    qtyMois?: number;
    qtyMoisRaw?: string;
    qtyCumulee?: number;
    progressPercent?: number;
    montantPrecedent?: number;
    montantMois?: number;
    montantCumule?: number;
  }>;
}

export interface ProjectDocument {
  id: string; // generated
  name: string;
  type: 'pv' | 'journal' | 'metre' | 'planning' | 'plan'; // added planning and plan
  fileName: string;
  fileType: string;
  date: string;
  base64: string; // The base64-encoded document
  uploadedAt: string;
}

export interface AuditLog {
  id: string;
  userName: string;
  userEmail: string;
  date: string;
  action: string;
  situationNumber?: number;
  situationId?: string;
}

export interface SentEmail {
  id: string;
  date: string;
  recipients: string[];
  subject: string;
  body: string;
  status: 'sent' | 'simulated';
}

export interface PlanningTask {
  name: string;
  targetStartDate: string;
  targetEndDate: string;
  progress: number; // planned progress %
  associatedLot?: string;
  notes?: string;
}

export interface ExpertOpinion {
  id: string;
  date: string;
  sourceDocName: string;
  globalVerdict: string;
  risks: string[]; // Risques et contraintes
  advantages: string[]; // Avantages et forces
  recommendations: string[]; // Actions requises
  fullAnalysisText: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  clientName: string; // Maître d'ouvrage
  clientEmail?: string;
  contractor: string; // Entreprise titulaire
  contractorEmail?: string;
  supervisor: string; // Maître d'œuvre / Inspecteur
  supervisorEmail?: string;
  location: string;
  countryCode?: 'DZ' | 'FR' | 'MA' | 'TN' | 'CI' | 'SN' | 'EG' | 'LY' | 'MR' | 'ES' | 'IT' | 'BE' | 'DE' | 'CH' | 'US'; // Extended list
  tvaRate: number; // e.g. 20 for 20%
  retentionRate: number; // e.g. 5 for 5%
  contractDate: string;
  workItems: WorkItem[];
  situations: WorkSituation[];
  documents?: ProjectDocument[];
  auditLogs?: AuditLog[];
  sentEmails?: SentEmail[];
  createdAt: string;
  userId: string;
  isOfflinePending?: boolean;
  
  // Custom added features for Planning & Expert evaluation
  planningStartDate?: string;
  planningEndDate?: string;
  planningTasks?: PlanningTask[];
  expertOpinions?: ExpertOpinion[];
  photos?: ChantierPhoto[];
}

export interface ChantierPhoto {
  id: string;
  url: string;
  fileName: string;
  uploadedAt: string;
  caption?: string;
  situationNumber?: number;
  userName?: string;
}

export interface User {
  id: string;
  email: string;
  name?: string;
  company?: string;
  role?: 'architect' | 'supervisor' | 'client';
  dbStatus?: {
    mode: "supabase" | "local";
    connected: boolean;
    message: string;
    url?: string;
  };
}

export interface OCRResult {
  success: boolean;
  workItems: Array<{
    code: string;
    designation: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    lot?: string;
  }>;
  metadata?: {
    contractor?: string;
    clientName?: string;
    location?: string;
    name?: string;
  };
}

export interface CountryConfig {
  code: 'DZ' | 'FR' | 'MA' | 'TN' | 'CI' | 'SN' | 'EG' | 'LY' | 'MR' | 'ES' | 'IT' | 'BE' | 'DE' | 'CH' | 'US';
  name: string;
  currency: string;
  locale: string;
  flag: string;
  defaultTva: number;
  availableTvas: number[];
}

export const COUNTRIES: Record<CountryConfig['code'], CountryConfig> = {
  DZ: { code: 'DZ', name: "Algérie", currency: "DA", locale: "fr-DZ", flag: "🇩🇿", defaultTva: 19, availableTvas: [19, 9, 0] },
  FR: { code: 'FR', name: "France", currency: "€", locale: "fr-FR", flag: "🇫🇷", defaultTva: 20, availableTvas: [20, 10, 5.5, 2.1, 0] },
  MA: { code: 'MA', name: "Maroc", currency: "DH", locale: "fr-MA", flag: "🇲🇦", defaultTva: 20, availableTvas: [20, 14, 10, 7, 0] },
  TN: { code: 'TN', name: "Tunisie", currency: "DT", locale: "fr-TN", flag: "🇹🇳", defaultTva: 19, availableTvas: [19, 13, 7, 0] },
  CI: { code: 'CI', name: "Côte d'Ivoire", currency: "FCFA", locale: "fr-CI", flag: "🇨🇮", defaultTva: 18, availableTvas: [18, 9, 0] },
  SN: { code: 'SN', name: "Sénégal", currency: "FCFA", locale: "fr-SN", flag: "🇸🇳", defaultTva: 18, availableTvas: [18, 10, 0] },
  EG: { code: 'EG', name: "Égypte", currency: "EGP", locale: "ar-EG", flag: "🇪🇬", defaultTva: 14, availableTvas: [14, 5, 0] },
  LY: { code: 'LY', name: "Libye", currency: "LYD", locale: "ar-LY", flag: "🇱🇾", defaultTva: 0, availableTvas: [0] },
  MR: { code: 'MR', name: "Mauritanie", currency: "MRU", locale: "fr-MR", flag: "🇲🇷", defaultTva: 16, availableTvas: [16, 0] },
  ES: { code: 'ES', name: "Espagne", currency: "€", locale: "es-ES", flag: "🇪🇸", defaultTva: 21, availableTvas: [21, 10, 4, 0] },
  IT: { code: 'IT', name: "Italie", currency: "€", locale: "it-IT", flag: "🇮🇹", defaultTva: 22, availableTvas: [22, 10, 5, 4, 0] },
  BE: { code: 'BE', name: "Belgique", currency: "€", locale: "fr-BE", flag: "🇧🇪", defaultTva: 21, availableTvas: [21, 12, 6, 0] },
  DE: { code: 'DE', name: "Allemagne", currency: "€", locale: "de-DE", flag: "🇩🇪", defaultTva: 19, availableTvas: [19, 7, 0] },
  CH: { code: 'CH', name: "Suisse", currency: "CHF", locale: "fr-CH", flag: "🇨🇭", defaultTva: 8.1, availableTvas: [8.1, 3.8, 2.6, 0] },
  US: { code: 'US', name: "États-Unis", currency: "$", locale: "en-US", flag: "🇺🇸", defaultTva: 0, availableTvas: [0, 5, 7, 8.25, 10] },
};
