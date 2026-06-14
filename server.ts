import express from "express";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import * as dotenv from "dotenv";
import * as XLSX from "xlsx";
import nodemailer from "nodemailer";
import { DB, initDb, getDbStatus } from "./server/db";

// Load environment variables
dotenv.config();

const app = express();
const PORT = 3000;

// Set up JSON parsing with generous limit for PDF uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Simple SHA256 hashing
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// Seed function to assert demo user & project are always created
async function seedDB() {
  try {
    const demoEmail = "demo@batigest.fr";
    let demoUser = await DB.getUserByEmail(demoEmail);
    
    if (!demoUser) {
      demoUser = {
        id: "demo-user-id",
        email: demoEmail,
        passwordHash: hashPassword("demo1234"),
        name: "Jean Conducteur (Démo)",
        company: "BatiGest Entreprise de Démo",
        role: "supervisor",
        createdAt: new Date().toISOString(),
      };
      await DB.saveUser(demoUser);
    }
    
    // Ensure we have the demo project
    const demoProject = await DB.getProjectById("demo-project-id", "demo-user-id");
    if (!demoProject) {
      const newDemoProject = {
        id: "demo-project-id",
        name: "Résidence Les Pins - Lot Gros Œuvre",
        description: "Chantier témoin de démonstration pour BatiGest AI.",
        clientName: "Promoteur Riviera Habitat",
        contractor: "Sud Bâtiment SAS",
        supervisor: "Bureau d'Études Azur",
        location: "Marseille, France",
        tvaRate: 20,
        retentionRate: 5,
        contractDate: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
        userId: "demo-user-id",
        workItems: [
          {
            id: "item-1",
            code: "1.1",
            designation: "Terrassements généraux & Fouilles en pleine masse",
            unit: "m³",
            quantity: 250,
            unitPrice: 45,
            totalPrice: 11250,
          },
          {
            id: "item-2",
            code: "1.2",
            designation: "Fondations profondes par micropieux forcés",
            unit: "ml",
            quantity: 120,
            unitPrice: 165,
            totalPrice: 19800,
          },
          {
            id: "item-3",
            code: "2.1",
            designation: "Dalle béton armé coulée sur terre-plein (ép. 20cm)",
            unit: "m²",
            quantity: 450,
            unitPrice: 55,
            totalPrice: 24750,
          },
          {
            id: "item-4",
            code: "2.2",
            designation: "Voiles béton armé extérieurs banchés",
            unit: "m²",
            quantity: 320,
            unitPrice: 95,
            totalPrice: 30400,
          },
          {
            id: "item-5",
            code: "3.1",
            designation: "Poutres structurales et poteaux préfabriqués",
            unit: "u",
            quantity: 18,
            unitPrice: 450,
            totalPrice: 8100,
          }
        ],
        situations: [
          {
            id: "demo-sit-1",
            number: 1,
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            status: "paid",
            comment: "Situation N°1 de terrassement terminée, fondations en cours d'achèvement.",
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            itemsProgress: {
              "item-1": 100,
              "item-2": 80,
              "item-3": 0,
              "item-4": 0,
              "item-5": 0,
            }
          },
          {
            id: "demo-sit-2",
            number: 2,
            date: new Date().toISOString().split("T")[0],
            status: "draft",
            comment: "Situation N°2 : Gros œuvre en cours de déploiement.",
            createdAt: new Date().toISOString(),
            itemsProgress: {
              "item-1": 100,
              "item-2": 100,
              "item-3": 60,
              "item-4": 15,
              "item-5": 0,
            }
          }
        ]
      };
      await DB.saveProject(newDemoProject);
    }
  } catch (err) {
    console.error("Error seeding setup:", err);
  }
}

// Token helper mapping to simple users
const activeSessions: Record<string, string> = {}; // token -> userId

// Secure Cryptographic Stateless Sessions for high-reliability persistence across restarts
const JWT_SECRET = process.env.JWT_SECRET || "default_inasuivi_secret_key_1234_secure_aes256";

function generateToken(userId: string): string {
  try {
    const payload = JSON.stringify({ userId, createdAt: Date.now() });
    // Use standard AES-256-CBC with fixed key and IV based on secret padding
    const paddedSecret = Buffer.alloc(32, JWT_SECRET);
    const iv = Buffer.alloc(16, JWT_SECRET.slice(0, 16));
    const cipher = crypto.createCipheriv("aes-256-cbc", paddedSecret, iv);
    let encrypted = cipher.update(payload, "utf8", "hex");
    encrypted += cipher.final("hex");
    return encrypted;
  } catch (e) {
    // Fallback if encryption fails, generate standard random hex
    return crypto.randomBytes(32).toString("hex");
  }
}

function verifyToken(token: string): string | null {
  // If present in memory cache, return immediately
  const cached = activeSessions[token];
  if (cached) return cached;

  try {
    const paddedSecret = Buffer.alloc(32, JWT_SECRET);
    const iv = Buffer.alloc(16, JWT_SECRET.slice(0, 16));
    const decipher = crypto.createDecipheriv("aes-256-cbc", paddedSecret, iv);
    let decrypted = decipher.update(token, "hex", "utf8");
    decrypted += decipher.final("utf8");
    
    const parsed = JSON.parse(decrypted);
    // Expiration check: 30 days
    if (Date.now() - parsed.createdAt > 30 * 24 * 60 * 60 * 1000) {
      return null;
    }
    
    // Auto-warm memory cache with recovered session
    activeSessions[token] = parsed.userId;
    return parsed.userId;
  } catch (e) {
    return null;
  }
}

// Authentication Middleware (Support Async Database Call)
async function authenticateToken(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Authentification requise" });
  }

  const userId = verifyToken(token);
  if (!userId) {
    return res.status(403).json({ error: "Session expirée ou invalide" });
  }

  try {
    const user = await DB.getUserById(userId);
    if (!user) {
      return res.status(403).json({ error: "Utilisateur non trouvé" });
    }

    (req as any).user = user;
    next();
  } catch (err: any) {
    console.error("Auth middleware db error:", err);
    return res.status(500).json({ error: "Erreur serveur d'authentification database" });
  }
}

// Initialize Gemini Client Lazily
let aiClient: GoogleGenAI | null = null;

function getAiClient(): GoogleGenAI {
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (!geminiApiKey) {
    throw new Error("Clé API Gemini non configurée sur le serveur. Veuillez configurer GEMINI_API_KEY dans le panneau des Secrets de l'AI Studio.");
  }
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: geminiApiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// Helper to handle Gemini API requests with automatic exponential backoff retries and model fallbacks (resilient to 503 Service Unavailable)
async function callGeminiWithRetry(params: { model?: string; contents: any; config?: any }): Promise<any> {
  const client = getAiClient();
  const initialModel = params.model || "gemini-3.5-flash";
  // Fallback sequence in case the primary selected model is unavailable or overloaded
  const modelsToTry = Array.from(new Set([initialModel, "gemini-3.5-flash", "gemini-3.1-flash-lite"]));
  
  let lastError: any = null;

  for (const model of modelsToTry) {
    let retries = 3;
    let delay = 1000; // 1 second base delay

    while (retries >= 0) {
      try {
        console.log(`[Gemini Request] Sending request to model: ${model} (Retries remaining for this model: ${retries})`);
        const response = await client.models.generateContent({
          model,
          contents: params.contents,
          config: params.config,
        });
        return response;
      } catch (err: any) {
        lastError = err;
        const errMsg = err?.message || String(err);
        const isTransient = 
          errMsg.includes("503") || 
          errMsg.includes("UNAVAILABLE") || 
          errMsg.includes("500") || 
          errMsg.includes("resource exhausted") || 
          errMsg.includes("429") ||
          errMsg.includes("high demand") ||
          errMsg.includes("overloaded");

        if (isTransient && retries > 0) {
          console.warn(`[Gemini Warning] Transient error with ${model}: ${errMsg}. Retrying in ${delay}ms...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
          delay *= 2; // exponential backoff
          retries--;
        } else {
          console.warn(`[Gemini Warning] Model ${model} failed permanently or had non-transient error: ${errMsg}. Trying fallback model if available.`);
          break; // move on to the next model in modelsToTry
        }
      }
    }
  }

  throw lastError || new Error("Failed to generate content with all available Gemini models");
}

// ==========================================
// API ROUTES
// ==========================================

// DB status endpoint for user assurance
app.get("/api/db-status", (req, res) => {
  res.json(getDbStatus());
});

// Authentication Endpoints
app.post("/api/auth/register", async (req, res) => {
  const { email, password, name, company, role } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }

  const cleanEmail = email.trim().toLowerCase();

  try {
    const existingUser = await DB.getUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ error: "Cet email est déjà utilisé" });
    }

    const newUser = {
      id: crypto.randomUUID(),
      email: cleanEmail,
      passwordHash: hashPassword(password),
      name: name ? name.trim() : "",
      company: company ? company.trim() : "",
      role: role || "supervisor",
      createdAt: new Date().toISOString(),
    };

    await DB.saveUser(newUser);

    const token = generateToken(newUser.id);
    activeSessions[token] = newUser.id;

    const { passwordHash, ...userResponse } = newUser;
    res.status(201).json({ user: { ...userResponse, dbStatus: getDbStatus() }, token });
  } catch (err: any) {
    console.error("Register endpoint error:", err);
    res.status(500).json({ error: "Erreur lors de l'inscription: " + err.message });
  }
});

app.post("/api/auth/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }

  const cleanEmail = email.trim();

  try {
    const user = await DB.getUserByEmail(cleanEmail);
    if (!user || user.passwordHash !== hashPassword(password)) {
      return res.status(401).json({ error: "Identifiants invalides" });
    }

    const token = generateToken(user.id);
    activeSessions[token] = user.id;

    const { passwordHash, ...userResponse } = user;
    res.json({ user: { ...userResponse, dbStatus: getDbStatus() }, token });
  } catch (err: any) {
    console.error("Login endpoint error:", err);
    res.status(500).json({ error: "Erreur lors de la connexion: " + err.message });
  }
});

app.post("/api/auth/demo", async (req, res) => {
  try {
    const demoEmail = "demo@batigest.fr";
    let demoUser = await DB.getUserByEmail(demoEmail);
    
    if (!demoUser) {
      demoUser = {
        id: "demo-user-id",
        email: demoEmail,
        passwordHash: hashPassword("demo1234"),
        name: "Jean Conducteur (Démo)",
        company: "BatiGest Entreprise de Démo",
        role: "supervisor",
        createdAt: new Date().toISOString(),
      };
      await DB.saveUser(demoUser);
      
      // Create an initial high-quality demo project so they can see full functionality
      const demoProject = {
        id: "demo-project-id",
        name: "Résidence Les Pins - Lot Gros Œuvre",
        description: "Chantier témoin de démonstration pour BatiGest AI.",
        clientName: "Promoteur Riviera Habitat",
        contractor: "Sud Bâtiment SAS",
        supervisor: "Bureau d'Études Azur",
        location: "Marseille, France",
        tvaRate: 20,
        retentionRate: 5,
        contractDate: new Date().toISOString().split("T")[0],
        createdAt: new Date().toISOString(),
        userId: demoUser.id,
        workItems: [
          {
            id: "item-1",
            code: "1.1",
            designation: "Terrassements généraux & Fouilles en pleine masse",
            unit: "m³",
            quantity: 250,
            unitPrice: 45,
            totalPrice: 11250,
          },
          {
            id: "item-2",
            code: "1.2",
            designation: "Fondations profondes par micropieux forcés",
            unit: "ml",
            quantity: 120,
            unitPrice: 165,
            totalPrice: 19800,
          },
          {
            id: "item-3",
            code: "2.1",
            designation: "Dalle béton armé coulée sur terre-plein (ép. 20cm)",
            unit: "m²",
            quantity: 450,
            unitPrice: 55,
            totalPrice: 24750,
          },
          {
            id: "item-4",
            code: "2.2",
            designation: "Voiles béton armé extérieurs banchés",
            unit: "m²",
            quantity: 320,
            unitPrice: 95,
            totalPrice: 30400,
          },
          {
            id: "item-5",
            code: "3.1",
            designation: "Poutres structurales et poteaux préfabriqués",
            unit: "u",
            quantity: 18,
            unitPrice: 450,
            totalPrice: 8100,
          }
        ],
        situations: [
          {
            id: "demo-sit-1",
            number: 1,
            date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
            status: "paid",
            comment: "Situation N°1 de terrassement terminée, fondations en cours d'achèvement.",
            createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
            itemsProgress: {
              "item-1": 100,
              "item-2": 80,
              "item-3": 0,
              "item-4": 0,
              "item-5": 0,
            }
          },
          {
            id: "demo-sit-2",
            number: 2,
            date: new Date().toISOString().split("T")[0],
            status: "draft",
            comment: "Situation N°2 : Gros œuvre en cours de déploiement.",
            createdAt: new Date().toISOString(),
            itemsProgress: {
              "item-1": 100,
              "item-2": 100,
              "item-3": 60,
              "item-4": 15,
              "item-5": 0,
            }
          }
        ]
      };
      
      await DB.saveProject(demoProject);
    }
    
    const token = generateToken(demoUser.id);
    activeSessions[token] = demoUser.id;
    
    const { passwordHash: _, ...demoUserResponse } = demoUser;
    res.json({ user: { ...demoUserResponse, dbStatus: getDbStatus() }, token });
  } catch (err: any) {
    console.error("Demo endpoint error:", err);
    res.status(500).json({ error: "Erreur lors de la connexion démo: " + err.message });
  }
});

app.get("/api/auth/me", authenticateToken, (req, res) => {
  const user = (req as any).user;
  const { passwordHash, ...userResponse } = user;
  res.json({ ...userResponse, dbStatus: getDbStatus() });
});

app.post("/api/auth/logout", (req, res) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token) {
    delete activeSessions[token];
  }
  res.json({ success: true });
});

app.post("/api/auth/reset-password-request", async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ error: "Adresse email requise" });
  }

  const cleanEmail = email.trim();

  try {
    const user = await DB.getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ error: "Aucun compte trouvé avec cette adresse email." });
    }

    const needsCompanyVerify = !!(user.company && user.company.trim());
    const needsNameVerify = !!(user.name && user.name.trim());

    res.json({
      success: true,
      needsVerification: needsCompanyVerify || needsNameVerify,
      companyHint: needsCompanyVerify ? `${user.company.slice(0, 3)}...` : undefined,
      nameHint: needsNameVerify ? `${user.name.slice(0, 3)}...` : undefined,
    });
  } catch (err: any) {
    console.error("Password reset request error:", err);
    res.status(500).json({ error: "Erreur serveur : " + err.message });
  }
});

app.post("/api/auth/reset-password-verify", async (req, res) => {
  const { email, verificationValue, newPassword } = req.body;
  if (!email || !newPassword) {
    return res.status(400).json({ error: "Données requises manquantes" });
  }

  const cleanEmail = email.trim();

  try {
    const user = await DB.getUserByEmail(cleanEmail);
    if (!user) {
      return res.status(404).json({ error: "Utilisateur non trouvé" });
    }

    const dbCompany = (user.company || "").trim().toLowerCase();
    const dbName = (user.name || "").trim().toLowerCase();

    if (dbCompany || dbName) {
      if (!verificationValue) {
        return res.status(400).json({ error: "Veuillez saisir l'information de sécurité demandée pour vérifier votre identité." });
      }
      const val = verificationValue.trim().toLowerCase();
      const matchCompany = dbCompany && val === dbCompany;
      const matchName = dbName && val === dbName;

      if (!matchCompany && !matchName) {
        return res.status(400).json({ error: "La réponse de sécurité est incorrecte." });
      }
    }

    // Set and save new password
    user.passwordHash = hashPassword(newPassword);
    await DB.saveUser(user);

    res.json({ success: true, message: "Votre mot de passe a été réinitialisé avec succès !" });
  } catch (err: any) {
    console.error("Password reset verify error:", err);
    res.status(500).json({ error: "Erreur serveur de réinitialisation: " + err.message });
  }
});

// Projects Endpoints
app.get("/api/projects", authenticateToken, async (req, res) => {
  const user = (req as any).user;
  try {
    const userProjects = await DB.getProjects(user.id);
    res.json(userProjects);
  } catch (err: any) {
    res.status(500).json({ error: "Erreur de chargement des chantiers : " + err.message });
  }
});

app.get("/api/projects/:id", authenticateToken, async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  try {
    const project = await DB.getProjectById(id, user.id);
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }
    res.json(project);
  } catch (err: any) {
    res.status(500).json({ error: "Erreur lors de l'accès au projet : " + err.message });
  }
});

app.post("/api/projects", authenticateToken, async (req, res) => {
  const user = (req as any).user;
  const { name, description, clientName, contractor, supervisor, location, tvaRate, retentionRate, contractDate, workItems, countryCode } = req.body;

  if (!name) {
    return res.status(400).json({ error: "Le nom du projet est requis" });
  }

  try {
    const newProject = {
      id: crypto.randomUUID(),
      name,
      description: description || "",
      clientName: clientName || "",
      contractor: contractor || "",
      supervisor: supervisor || "",
      location: location || "",
      countryCode: countryCode || "DZ",
      tvaRate: typeof tvaRate === "number" ? tvaRate : 20,
      retentionRate: typeof retentionRate === "number" ? retentionRate : 5,
      contractDate: contractDate || new Date().toISOString().split("T")[0],
      workItems: workItems || [],
      situations: [],
      createdAt: new Date().toISOString(),
      userId: user.id,
    };

    await DB.saveProject(newProject);
    res.status(201).json(newProject);
  } catch (err: any) {
    res.status(500).json({ error: "Erreur lors de la création du projet : " + err.message });
  }
});

app.put("/api/projects/:id", authenticateToken, async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;

  try {
    const existing = await DB.getProjectById(id, user.id);
    if (!existing) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    const updated = {
      ...existing,
      ...req.body,
      id: existing.id, // preserve ID
      userId: existing.userId, // preserve user ownership
    };

    await DB.saveProject(updated);
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Erreur d'édition du chantier : " + err.message });
  }
});

app.delete("/api/projects/:id", authenticateToken, async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  try {
    const deleted = await DB.deleteProject(id, user.id);
    if (!deleted) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur de suppression du projet : " + err.message });
  }
});

// Construction Contract PDF automatic work items parsing via Gemini
app.post("/api/projects/extract", authenticateToken, async (req, res) => {
  const { pdfBase64, fileType, countryCode } = req.body;

  if (!pdfBase64) {
    return res.status(400).json({ error: "Fichier PDF/Image encodé en Base64 requis" });
  }

  let aiClient;
  try {
    aiClient = getAiClient();
  } catch (err: any) {
    return res.status(503).json({ error: err.message });
  }

  const mime = fileType || "application/pdf";

  let countryGuideline = "";
  if (countryCode) {
    const countriesInfo: Record<string, { name: string; currency: string; tva: string }> = {
      DZ: { name: "Algérie", currency: "Dinars Algériens (DA)", tva: "19%" },
      FR: { name: "France", currency: "Euros (€)", tva: "20%" },
      MA: { name: "Maroc", currency: "Dirhams Marocains (DH)", tva: "20%" },
      TN: { name: "Tunisie", currency: "Dinars Tunisiens (DT)", tva: "19%" },
      CI: { name: "Côte d'Ivoire", currency: "Francs CFA (FCFA)", tva: "18%" },
      SN: { name: "Sénégal", currency: "Francs CFA (FCFA)", tva: "18%" },
      EG: { name: "Égypte", currency: "Livres Égyptiennes (EGP)", tva: "14%" },
      LY: { name: "Libye", currency: "Dinars Libyens (LYD)", tva: "0%" },
      MR: { name: "Mauritanie", currency: "Ouguiyas Mauritaniens (MRU)", tva: "16%" },
      ES: { name: "Espagne", currency: "Euros (€)", tva: "21%" },
      IT: { name: "Italie", currency: "Euros (€)", tva: "22%" },
      BE: { name: "Belgique", currency: "Euros (€)", tva: "21%" },
      DE: { name: "Allemagne", currency: "Euros (€)", tva: "19%" },
      CH: { name: "Suisse", currency: "Francs Suisses (CHF)", tva: "8.1%" },
      US: { name: "États-Unis", currency: "Dollars Américains ($)", tva: "0%" },
    };
    const info = countriesInfo[countryCode];
    if (info) {
      countryGuideline = `\\nContexte de Marché de Destination obligatoire : Le chantier ciblé est basé sur les normes, la législation et les stipulations de la ${info.name}. Vous devez adapter l'extraction des structures de coûts à ce marché. Toutes les valeurs financières du document physique, les prix de base et les sous-totaux de lots (parfois sous-entendus) doivent être lus et mis en relation avec la devise de ce pays : ${info.currency}. Appliquez le taux d'imposition standard de TVA de ${info.tva} pour ce marché dans vos calculs.`;
    }
  }

  try {
    const prompt = `Vous êtes un ingénieur en bâtiment et métreur professionnel expert en suivi de chantier.${countryGuideline}
Analysez le document fourni (contrat de travaux, devis d'architecte, devis estimatif quantitatif DQE, ou feuille Excel) avec une rigueur absolue. Vous devez extraire CHAQUE POSTE DE TRAVAIL (ligne de devis) sans aucune exception.

Pour chaque poste présent dans le document, extrayez impérativement :
- Le code ou numéro du poste (par exemple "1.1", "2.1.3", "A.1"). S'il est absent du document, générez un code ordonné séquentiel comme "1", "2", "3".
- La désignation / description textuelle complète et claire du poste de travaux.
- L'unité de mesure physique (par exemple "m³", "m²", "ml", "u", "Ens", "kg").
- La quantité contractuelle (nombre décimal exact lu dans le document).
- Le prix unitaire HT (nombre décimal exact lu dans le document).
- Le prix total HT. ATTENTION : Validez que le prix total HT extrait est strictement égal à [quantité * prix unitaire]. Si le document présente un total arrondi ou légèrement différent, mettez la valeur lue ou recalculée exacte pour préserver la cohérence mathématique.
- Le nom ou numéro du LOT auquel appartient cette ligne (par exemple "Lot 1: Terrassement", "Lot 2: Électricité", "Gros Œuvre"). Si cette colonne est absente ou si ce n'est pas précisé pour une ligne, laissez ce champ vide ou déduisez-le intelligemment du contexte immédiat. Le champ 'lot' n'est pas obligatoire pour la validation de la ligne, la priorité absolue est de n'omettre aucune ligne de travaux.

Essayez également de détecter les métadonnées globales du contrat s'ils apparaissent :
- Nom de l'entreprise titulaire du marché (contractor)
- Nom du client ou maître d'ouvrage (clientName)
- Localisation du chantier (location)
- Nom descriptif suggéré pour le projet (name)

CONSIGNES DE SÉCURITÉ ET RIGUEUR :
1. NE SAUTEZ AUCUN POSTE. Lisez chaque ligne du tableau, y compris les cellules scannées ou manuscrites. La somme totale du marché extrait doit correspondre parfaitement au montant global réel du devis physique.
2. Si le document contient des lignes de "Sous-totaux" ou "Totaux de lots", IGNOREZ-LES (ne les extrayez pas comme des postes de travaux individuels) pour éviter de doubler les calculs du budget global.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mime,
            data: pdfBase64,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            success: { type: Type.BOOLEAN },
            metadata: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                contractor: { type: Type.STRING },
                clientName: { type: Type.STRING },
                location: { type: Type.STRING },
              },
            },
            workItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING },
                  designation: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER },
                  totalPrice: { type: Type.NUMBER },
                  lot: { type: Type.STRING },
                },
                required: ["code", "designation", "unit", "quantity", "unitPrice", "totalPrice"],
              },
            },
          },
          required: ["success", "workItems"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Aucune réponse générée par l'IA");
    }

    const parsed = JSON.parse(resultText.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error("Gemini OCR extraction error:", error);
    res.status(500).json({ error: "Erreur lors de l'extraction par l'IA : " + error.message });
  }
});

// Generate quantitative estimate DQE from architectural plans & detailed technical specifications collectively (global)
app.post("/api/projects/generate-by-plan", authenticateToken, async (req, res) => {
  const { pdfBase64, fileType, countryCode, floor, description, plans, catalog, numFloors, foundationType, floorHeight } = req.body;

  let aiClient;
  try {
    aiClient = getAiClient();
  } catch (err: any) {
    return res.status(503).json({ error: err.message });
  }

  let countryGuideline = "";
  if (countryCode) {
    const countriesInfo: Record<string, { name: string; currency: string; tva: string }> = {
      DZ: { name: "Algérie", currency: "Dinars Algériens (DA)", tva: "19%" },
      FR: { name: "France", currency: "Euros (€)", tva: "20%" },
      MA: { name: "Maroc", currency: "Dirhams Marocains (DH)", tva: "20%" },
      TN: { name: "Tunisie", currency: "Dinars Tunisiens (DT)", tva: "19%" },
      CI: { name: "Côte d'Ivoire", currency: "Francs CFA (FCFA)", tva: "18%" },
      SN: { name: "Sénégal", currency: "Francs CFA (FCFA)", tva: "18%" },
      EG: { name: "Égypte", currency: "Livres Égyptiennes (EGP)", tva: "14%" },
      LY: { name: "Libye", currency: "Dinars Libyens (LYD)", tva: "0%" },
      MR: { name: "Mauritanie", currency: "Ouguiyas Mauritaniens (MRU)", tva: "16%" },
      ES: { name: "Espagne", currency: "Euros (€)", tva: "21%" },
      IT: { name: "Italie", currency: "Euros (€)", tva: "22%" },
      BE: { name: "Belgique", currency: "Euros (€)", tva: "21%" },
      DE: { name: "Allemagne", currency: "Euros (€)", tva: "19%" },
      CH: { name: "Suisse", currency: "Francs Suisses (CHF)", tva: "8.1%" },
      US: { name: "États-Unis", currency: "Dollars Américains ($)", tva: "0%" },
    };
    const info = countriesInfo[countryCode];
    if (info) {
      let extraDZ = "";
      if (countryCode === "DZ") {
        extraDZ = ` DE PLUS, POUR LE MARCHÉ ALGÉRIEN, LES PRIX UNITAIRES (P.U) DOIVENT OBLIGATOIREMENT ÊTRE CALCULÉS EN "FOURNITURE ET POSE" COMPLÈTE (incluant la matière première de marque/qualité premium, sa livraison et sa pose réglementaire par des professionnels qualifiés). Alignez impérativement les prix sur la tranche la PLUS HAUTE du marché algérien de haut standing (ex. Béton armé fourni-posé entre 28 000 DA et 38 000 DA le m³ selon l'élément, maçonneries double paroi brique de premier choix avec isolation incluse, revêtements italiens haut de gamme, etc.).`;
      }
      countryGuideline = `\nContexte de Marché de Destination obligatoire : Le chantier ciblé est basé sur les normes, la législation de la construction et les stipulations de la ${info.name}. Devises en ${info.currency}. Appliquez le taux d'imposition standard de TVA de ${info.tva} pour ce marché dans vos calculs. Les prix unitaires doivent correspondre aux tarifs de "Fourniture et Pose" (l'achat du matériel et son installation compris).${extraDZ}`;
    }
  }

  const floorsCount = Number(numFloors) || 1;
  const heightFloor = Number(floorHeight) || 2.8;
  const fType = foundationType || "Semelles filantes";

  const bimGuideline = `
========================================
DIRECTIVES STRCTES DE SIMULATION BIM (Building Information Modeling) ET CALCULS :
Vous devez agir comme un micro-système BIM virtuel de calcul de métrés. En exploitant les plans 2D fournis, vous devez générer un "jumeau numérique de données" en vous basant sur les paramètres obligatoires suivants de l'utilisateur :
- Nombre d'étages : ${floorsCount} étage(s)
- Type de fondation choisi : "${fType}"
- Hauteur de chaque étage : ${heightFloor} mètres

RÈGLES DE CALCUL PHYSIQUES À APPLIQUER :
1. FONDATIONS & TERRASSEMENT (Lot Gros Œuvre) :
   Adaptez impérativement les postes de fondations à la typologie "${fType}" choisie :
   - Si "Vide sanitaire" : Prévoyez des semelles de fondations superficielles, un mur de soubassement (périphérie, hauteur 0.80m) et une dalle portée en béton armé (m²) constituant le plancher bas du rez-de-chaussée.
   - Si "Semelles filantes" : Prévoyez l'excavation en tranchée, le coulage d'un béton de propreté et la réalisation de semelles béton armé filantes continues sous les murs porteurs identifiés sur vos plans.
   - Si "Radier" : Prévoyez un calcul surfacique. Le volume total cumulé de béton de fondation doit correspondre à (Surface de l'emprise au sol du projet) x (Épaisseur d'environ 0.30 m à 0.35 m) = volume total en m³.
   - Si "Pieux" : Prévoyez des forages de pieux verticaux en béton armé (en ml), des têtes de pieux et des longrines de liaisonnement en réseau horizontal.
2. ÉLÉVATIONS VERTICALES CUMULÉES (Murs, Cloisons, Métre de finitions) :
   - Multipliez de manière rigoureuse et cumulative toutes les structures verticales détectées (murs extérieurs, cloisonnement, ferraillage vertical, enduits intérieurs et extérieurs, peinture murale, isolation périphérique) par le nombre d'étages (${floorsCount}).
   - Calculez la surface de ces murs : (Longueur linéaire déduite du plan) x (Hauteur d'étage de ${heightFloor}m) x (Nombre d'étages de ${floorsCount}) = Surface cumulée de finition/cloisons en m².
   - Convertissez ces surfaces en métrés de matériaux correspondants :
     * Volume de béton pour voiles ou poteaux d'élévation, ou mètres carrés de briques et parpaings pour le lot Maçonnerie.
     * Mètres carrés d'enduits de dégrossissage ciment et de peinture pour les finitions.
3. STRUCTURES HORIZONTALES (Dalles de compression) :
   - Multipliez la surface et le volume de béton des planchers intermédiaires et dalles de compression par le nombre d'étages (${floorsCount}).
4. MAPPAGE DES POSTES :
   Associez et raccordez impérativement chacun de ces éléments mesurés (Dalle, Murs, Fondations) au bon lot et au bon article extrait de votre catalogue d'utilisateur (si fourni).

Pour assurer une transparence totale de ces métrés, vous devez obligatoirement documenter la détection de ces caractéristiques dans le tableau "bimElements" du format de réponse JSON ci-dessous (indiquez l'élément, la formule de calcul littérale, la quantité calculée BIM et l'unité).
========================================`;

  let catalogGuideline = "";
  let catalogTextContent = "";
  let isCatalogExcel = false;

  if (catalog && catalog.base64) {
    const mime = catalog.fileType || "";
    isCatalogExcel =
      mime.includes("excel") ||
      mime.includes("sheet") ||
      mime.includes("csv") ||
      mime.includes("spreadsheet") ||
      catalog.base64.startsWith("UEsDB") || // ZIP-based XML format (.xlsx)
      catalog.base64.startsWith("0M8R4") || // OLE format (.xls)
      catalog.base64.startsWith("77u/Mj") || // CSV with UTF-8 BOM
      catalog.base64.startsWith("Y29kZ") ||
      catalog.base64.startsWith("S2V5") ||
      (catalog.name && (catalog.name.endsWith(".xlsx") || catalog.name.endsWith(".xls") || catalog.name.endsWith(".csv")));

    if (isCatalogExcel) {
      try {
        const workbook = XLSX.read(catalog.base64, { type: "base64" });
        workbook.SheetNames.forEach((sheetName: string) => {
          const sheet = workbook.Sheets[sheetName];
          const csvText = XLSX.utils.sheet_to_csv(sheet);
          if (csvText.trim()) {
            catalogTextContent += `--- FEUILLE DU CATALOGUE: ${sheetName} ---\n${csvText}\n\n`;
          }
        });
      } catch (err: any) {
        console.error("Erreur lors de l'analyse Excel du catalogue d'articles :", err);
      }
    }

    catalogGuideline = `\nATTENTION EXTRÊME : Un document de lots ou catalogue d'articles ("${catalog.name || 'catalogue.xlsx'}") a été téléversé par l'utilisateur.
Vos instructions fondamentales et prioritaires pour ce catalogue sont :
1. Vous devez analyser TRÈS RIGOUREUSEMENT ce document (nous vous l'avons extrait sous forme textuelle ci-dessous ou joint en document).
2. Utilisez STRICTEMENT et UNIQUEMENT les codes de postes, les désignations exactes des articles, les unités de mesures et la structure des lots de travaux qui s'y trouvent.
3. Ne proposez aucun article fictif ou par défaut qui ne soit pas mentionné à l'intérieur de ce document.
4. Pour CHAQUE article ou désignation présente dans cette section importée, proposez l'estimation quantitative requise correspondante issue de vos calculs basés sur les plans, ainsi que le prix unitaire cohérent. Les lignes finales du tableau JSON "workItems" doivent être formées par ces articles précis du catalogue.`;
  } else {
    catalogGuideline = `\nDirectives de structuration générale (aucun fichier de catalogue fourni) :
- Ventilez le devis en plusieurs Lots généraux de construction cohérents (ex: "01. Terrassement & Fondations", "02. Gros Œuvre, Béton & Structure", "03. Maçonnerie & Cloisonnement", "04. Enduits, Isolation & Étanchéité", "05. Revêtements de Sols & de Murs", "06. Plomberie, Sanitaire & Gaz", "07. Électricité, Câblage & Éclairage", "08. Peintures, Vitrerie & Faux-plafonds").
- Ne sautez aucune étape. Générez pour l'ensemble du projet un ensemble complet d'au moins 12 à 30 postes de travaux détaillés pour que le devis global de l'ensemble du projet soit exhaustif.
- Pour chaque poste, attribuez un code ordonné et logique, décrivez précisément la désignation technique, l'unité réglementaire, calculez les quantités et suggérez un prix unitaire juste.`;
  }

  const prompt = `Vous êtes un ingénieur en bâtiment, métreur et métreur-concepteur professionnel expert en estimations de chantiers.${countryGuideline}
Votre mission de haute précision est de générer un Devis Quantitatif Estimatif (DQE) GLOBAL, réaliste, cohérent et basé sur un modèle de calcul BIM calibré pour l'ENSEMBLE du projet de la construction.

Vous devez analyser collectivement :
1. Les différents plans d'architecture, coupes ou structures fournis ci-joint. Lisez les cotes, intégrez la totalité des niveaux représentés (fondations, rez-de-chaussée, étages, terrasse), déterminez mentalement les volumes globaux, les surfaces du bâtiment entier, et estimez le linéaire global de maçonnerie, le cubage cumulé de béton armé requis, les surfaces d'enduits et de revêtements à l'échelle du projet complet.
2. Le document de catalogue d'articles/lots téléversé par l'utilisateur (le cas échéant) ainsi que le descriptif technique additionnel fourni ci-dessous :
"${description || 'Gros œuvre en béton armé, maçonnerie séparative, revêtements céramiques, électricité encastrée et plomberie sanitaire standard.'}"

${bimGuideline}

Directives d'estimation : ${catalogGuideline}

Pour chaque poste de travaux généré dans la liste du DQE :
- Attribuez un code ordonné et logique (Ex: "1.1", "1.2", "2.1"...).
- Décrivez précisément la désignation technique.
- Choisissez l'unité réglementaire du bâtiment ("m³" pour béton/fouilles, "m²" pour cloisons/enduits/revêtements, "ml" pour plinthes/canalisations, "u" pour portes/prises, "Ens" ou "kg" pour le ferraillage).
- Quantifiez fidèlement à l'échelle globale du bâtiment (en cumulant tous les niveaux et espaces des plans analysés) en veillant à la parfaite cohérence avec les simulations de calculs du micro-BIM.
- Suggérez un prix unitaire (P.U. HT) juste par rapport aux barèmes réels du pays concerné.
- Calculez le prix total HT (strictement égal à quantité * prix unitaire).

Veuillez structurer la sortie au format JSON avec le schéma spécifié ci-dessous.`;

  try {
    const contents: any[] = [];
    
    // Append multiple plans if given, otherwise fallback to pdfBase64
    if (plans && Array.isArray(plans) && plans.length > 0) {
      plans.forEach((p: any) => {
        if (p.base64) {
          contents.push({
            inlineData: {
              mimeType: p.fileType || "image/png",
              data: p.base64,
            },
          });
        }
      });
    } else if (pdfBase64) {
      const mime = fileType || "application/pdf";
      contents.push({
        inlineData: {
          mimeType: mime,
          data: pdfBase64,
        },
      });
    }

    // Append custom catalog file if attached
    if (catalog && catalog.base64) {
      if (isCatalogExcel && catalogTextContent.trim()) {
        contents.push({
          text: `Voici les feuilles et le contenu tabulaire au format CSV extraits du tableur de bordereau/catalogue d'articles téléversé :\n\n${catalogTextContent.trim()}`,
        });
      } else {
        const mime = catalog.fileType || "application/pdf";
        contents.push({
          inlineData: {
            mimeType: mime,
            data: catalog.base64,
          },
        });
      }
    }

    contents.push({
      text: prompt,
    });

    const response = await callGeminiWithRetry({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            success: { type: Type.BOOLEAN },
            metadata: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                contractor: { type: Type.STRING },
                clientName: { type: Type.STRING },
                location: { type: Type.STRING },
                numFloors: { type: Type.NUMBER },
                foundationType: { type: Type.STRING },
                floorHeight: { type: Type.NUMBER },
                description: { type: Type.STRING },
              },
            },
            bimElements: {
              type: Type.ARRAY,
              description: "Le tableau récapitulatif des métrés physiques détaillés avec calculs BIM sous-jacents",
              items: {
                type: Type.OBJECT,
                properties: {
                  element: { type: Type.STRING, description: "Nom de l'élément de métré (ex: Fondations, Dalle RDC, Murs R+1, etc.)" },
                  calculation: { type: Type.STRING, description: "La description explicite de la formule mathématique exploitée" },
                  quantity: { type: Type.NUMBER, description: "Quantité calculée" },
                  unit: { type: Type.STRING, description: "Unité (m², m³, ml, kg, u)" },
                },
                required: ["element", "calculation", "quantity", "unit"],
              },
            },
            workItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  code: { type: Type.STRING },
                  designation: { type: Type.STRING },
                  unit: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER },
                  totalPrice: { type: Type.NUMBER },
                  lot: { type: Type.STRING },
                },
                required: ["code", "designation", "unit", "quantity", "unitPrice", "totalPrice"],
              },
            },
          },
          required: ["success", "workItems", "bimElements"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Aucune réponse générée par l'IA");
    }

    const parsed = JSON.parse(resultText.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error("Gemini plan generator error:", error);
    res.status(500).json({ error: "Erreur lors de la génération de devis par l'IA : " + error.message });
  }
});

// Extract situation progress percentages from uploaded PDF / Scanned progress report via Gemini
app.post("/api/projects/:id/situations-extract", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { pdfBase64, fileType } = req.body;
  const user = (req as any).user;

  if (!pdfBase64) {
    return res.status(400).json({ error: "Fichier PDF/Image encodé en Base64 requis" });
  }

  let aiClient;
  try {
    aiClient = getAiClient();
  } catch (err: any) {
    return res.status(503).json({ error: err.message });
  }

  try {
    const project = await DB.getProjectById(id, user.id);
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    const mime = fileType || "application/pdf";

    const workItemsPrompt = project.workItems.map((item: any) => ({
      id: item.id,
      code: item.code,
      designation: item.designation,
      unit: item.unit,
      quantity: item.quantity,
    }));

    const prompt = `Vous êtes un métreur professionnel et ingénieur de travaux spécialisé en calcul de métrés et de situations de travaux de chantiers du BTP.
On vous fournit la liste des postes contractuels de référence du marché d'un projet, au format JSON :
${JSON.stringify(workItemsPrompt, null, 2)}

Analysez le document fourni (cela peut être un PDF d'avancement, une photo, ou un carnet de métrés au format CSV/Tableur Excel). Ce document contient les taux d'avancement réels (ou les quantités cumulées exécutées, ou les avancements par ligne) pour ce chantier.
Faites correspondre les lignes d'avancement ou de calculs du document avec les postes contractuels du JSON ci-dessus :
- Identifiez chaque poste à l'aide de sa désignation (ou de ses correspondances sémantiques ou mots-clés) ou de son code (ex: "1.1", "2.1", etc.). Pas besoin de correspondance parfaite, utilisez toute correspondance sémantique raisonnable.
- Extrayez le pourcentage d'avancement CUMULÉ réel (un nombre décimal entre 0.0 et 100.0).
- Extrayez ou déterminez la QUANTITÉ EXACTE cumulée (ou du mois selon le contexte) lue directement de manière textuelle dans le document pour ce poste, sans aucune altération de décimale ni de valeur. Mettez-la dans la propriété "extractedQuantity". Cette valeur doit être la copie exacte du nombre de quantité inscrit sur le métré ou l'état de situation (par exemple : si le document indique 15000, extrayez exactement 15000). Ne la modifiez pas et n'appliquez pas d'arrondis flous de pourcentages dessus pour préserver la parfaite fidélité physique du document.
- Si le document montre uniquement une quantité cumulée réalisée (valeur numérique sous forme de métré exécuté ou quantité cumulée), calculez le pourcentage d'avancement cumulé en faisant : (quantité cumulée réalisée / quantité contractuelle globale du poste du JSON) * 105.
- Si le document montre uniquement un montant HT cumulé réalisé, divisez ce montant par le montant contractuel total du poste (quantité * prix unitaire) pour obtenir le pourcentage (de 0 à 100).
- TRÈS IMPORTANT : Si un poste contractuel de référence N'EST PAS mentionné ou n'apparaît nulle part dans le document d'avancement, NE L'INCLUEZ PAS du tout dans le tableau "progressItems" de votre retour. Ne renvoyez que les postes que vous avez détectés avec un avancement ou une quantité explicite ou implicite dans le rapport fourni. Cela évite d'écraser par erreur à 0% le travail déjà enregistré lors des situations passées.

Retournez EXCLUSIVEMENT un objet JSON avec la propriété "success": true et la liste "progressItems" contenant pour chaque ID de poste contractuel son pourcentage d'avancement cumulé ainsi évalué plus la quantité exacte copiée de manière textuelle.`;

    // Detect if this is an Excel/CSV spreadsheet format to do server-side text extraction
    const isExcel =
      mime.includes("excel") ||
      mime.includes("sheet") ||
      mime.includes("csv") ||
      mime.includes("spreadsheet") ||
      pdfBase64.startsWith("UEsDB") || // ZIP-based XML format (.xlsx)
      pdfBase64.startsWith("0M8R4") || // OLE format (.xls)
      pdfBase64.startsWith("77u/Mj") || // CSV with UTF-8 BOM
      pdfBase64.startsWith("Y29kZ") ||
      pdfBase64.startsWith("S2V5");

    let contents: any[] = [];
    if (isExcel) {
      try {
        const workbook = XLSX.read(pdfBase64, { type: "base64" });
        let combinedCsvText = "";
        workbook.SheetNames.forEach((sheetName: string) => {
          const sheet = workbook.Sheets[sheetName];
          const csvText = XLSX.utils.sheet_to_csv(sheet);
          if (csvText.trim()) {
            combinedCsvText += `--- FEUILLE EXCEL: ${sheetName} ---\n${csvText}\n\n`;
          }
        });

        if (combinedCsvText.trim()) {
          contents = [
            {
              text: `Voici les feuilles et le contenu tabulaire au format CSV extraits du tableur de métrés / avancement de chantier de l'utilisateur :\n\n${combinedCsvText.trim()}`,
            },
            {
              text: prompt,
            },
          ];
        } else {
          throw new Error("Tableur local vide");
        }
      } catch (err: any) {
        console.warn("Server Excel parsing failed, using standard Gemini document scan: ", err);
        contents = []; // Reset if empty to fallback to normal pdf
      }
    }

    // Default fallback to direct PDF/Image document processing
    if (contents.length === 0) {
      contents = [
        {
          inlineData: {
            mimeType: mime,
            data: pdfBase64,
          },
        },
        {
          text: prompt,
        },
      ];
    }

    const response = await callGeminiWithRetry({
      model: "gemini-3.5-flash",
      contents,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            success: { type: Type.BOOLEAN },
            progressItems: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  progressPercentage: { type: Type.NUMBER },
                  extractedQuantity: { type: Type.NUMBER },
                },
                required: ["id", "progressPercentage"],
              },
            },
          },
          required: ["success", "progressItems"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Aucune réponse générée par l'IA");
    }

    const parsed = JSON.parse(resultText.trim());
    res.json(parsed);
  } catch (error: any) {
    console.error("Gemini situation progress extraction error:", error);
    res.status(500).json({ error: "Erreur lors de l'extraction par l'IA : " + error.message });
  }
});

// Propose a logical, optimized planning schedule based on work items within a start and end date
app.post("/api/projects/:id/propose-planning", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { startDate, endDate } = req.body;
  const user = (req as any).user;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "Les dates de début et de fin des travaux sont requises." });
  }

  let aiClient;
  try {
    aiClient = getAiClient();
  } catch (err: any) {
    return res.status(503).json({ error: err.message });
  }

  try {
    const project = await DB.getProjectById(id, user.id);
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    const itemsSummary = project.workItems.map((item: any) => ({
      code: item.code,
      designation: item.designation,
      totalPrice: item.totalPrice,
      lot: item.lot || "Général",
    }));

    const prompt = `Vous êtes un ingénieur de planification de chantiers senior (Expert CPM / Primavera / MS Project). 
On vous confie un projet de construction nommé "${project.name}" (${project.description || "Suivi de chantier BT"}), localisé à ${project.location || "non précisé"}.
Les dates contractuelles souhaitées pour les travaux sont :
- Date de début : ${startDate}
- Date de fin : ${endDate}

Voici la liste des lignes de prix contractuels (Postes de travaux de base) à planifier :
${JSON.stringify(itemsSummary, null, 2)}

Votre mission est de proposer un planning macro-chronologique cohérent pour ce chantier.
Consignes :
1. Créez entre 4 et 7 tâches d'avancement (ou phases) cohérentes. Regroupez intelligemment les lignes de prix ci-dessus en tâches logiques (ex: terrassement/infrastructure, gros œuvre banché, finitions, etc.).
2. Pour chaque tâche, calculez ou estimez des dates de début ('targetStartDate') et de fin ('targetEndDate') cohérentes et réalistes, qui s'inscrivent STRICTEMENT à l'intérieur de la période contractuelle générale [${startDate} à ${endDate}].
3. Établissez des relations de dépendance : par exemple, le terrassement précède les fondations, la dalles précède les voiles, etc. Les dates des tâches dépendantes DOIVENT se chevaucher de manière réaliste ou se succéder logiquement.
4. Renseignez la progression attendue ('progress') théorique entre 0 et 100 de façon progressive pour la phase (mettez 0 comme progression initiale).
5. Renseignez le lot ('associatedLot') ou groupe de travaux à associer.
6. Renseignez des remarques pertinentes ('notes') en français.

Retournez une réponse au format JSON contenant la liste ordonnée des phases/tâches calculées.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            planningTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  targetStartDate: { type: Type.STRING },
                  targetEndDate: { type: Type.STRING },
                  progress: { type: Type.NUMBER },
                  associatedLot: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ["name", "targetStartDate", "targetEndDate", "progress", "associatedLot"],
              },
            },
          },
          required: ["planningTasks"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("Impossible de générer la proposition de planning par l'IA.");
    }

    const parsedData = JSON.parse(resultText.trim());
    const planningTasks = parsedData.planningTasks;

    // Save proposed planning back to the database
    project.planningStartDate = startDate;
    project.planningEndDate = endDate;
    project.planningTasks = planningTasks;

    // Log the audit action
    const log = {
      id: "log-" + Date.now(),
      userName: user.name || user.email,
      userEmail: user.email,
      date: new Date().toISOString(),
      action: `Génération d'une proposition planning ia (${startDate} au ${endDate})`
    };
    if (!project.auditLogs) project.auditLogs = [];
    project.auditLogs.push(log);

    await DB.saveProject(project);
    res.json(project);
  } catch (error: any) {
    console.error("Propose planning error:", error);
    res.status(500).json({ error: "Erreur lors de la génération du planning par l'IA : " + error.message });
  }
});

// Analyze uploaded Gantt or planning sheet (PDF/Excel) to extract target timelines
app.post("/api/projects/:id/analyze-planning-file", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { pdfBase64, fileType, fileName } = req.body;
  const user = (req as any).user;

  if (!pdfBase64) {
    return res.status(400).json({ error: "Fichier de planning requis (Base64)" });
  }

  let aiClient;
  try {
    aiClient = getAiClient();
  } catch (err: any) {
    return res.status(503).json({ error: err.message });
  }

  try {
    const project = await DB.getProjectById(id, user.id);
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    const mime = fileType || "application/pdf";

    const prompt = `Vous êtes un ingénieur de planification BTP.
Analysez le document de planning ou diagramme de Gantt téléchargé (PDF ou Image).
Extrayez la liste des tâches importantes, leurs dates de début et de fin, ainsi que l'avancement théorique contractuel défini pour le chantier.
Remplissez le schéma JSON avec soin. Pour les dates au format YYYY-MM-DD, si l'année est indéterminée, utilisez l'année 2026.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mime,
            data: pdfBase64,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            planningStartDate: { type: Type.STRING },
            planningEndDate: { type: Type.STRING },
            planningTasks: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  targetStartDate: { type: Type.STRING },
                  targetEndDate: { type: Type.STRING },
                  progress: { type: Type.NUMBER },
                  associatedLot: { type: Type.STRING },
                  notes: { type: Type.STRING },
                },
                required: ["name", "targetStartDate", "targetEndDate", "progress"],
              },
            },
          },
          required: ["planningTasks"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("L'IA n'a pas pu lire le document de planning.");
    }

    const { planningStartDate, planningEndDate, planningTasks } = JSON.parse(resultText.trim());

    // Store in documents tracking structure
    const newDoc = {
      id: "doc-" + Date.now(),
      name: fileName || "Planning importé par IA",
      type: "planning" as const,
      fileName: fileName || "planning.pdf",
      fileType: mime,
      date: new Date().toISOString().split("T")[0],
      base64: pdfBase64,
      uploadedAt: new Date().toISOString(),
    };

    if (!project.documents) project.documents = [];
    project.documents.push(newDoc);

    // Save parsed tasks to direct planning config
    project.planningTasks = planningTasks;
    if (planningStartDate) project.planningStartDate = planningStartDate;
    if (planningEndDate) project.planningEndDate = planningEndDate;

    // Log tracking
    const log = {
      id: "log-" + Date.now(),
      userName: user.name || user.email,
      userEmail: user.email,
      date: new Date().toISOString(),
      action: `Importation planning ia [${newDoc.name}]`
    };
    if (!project.auditLogs) project.auditLogs = [];
    project.auditLogs.push(log);

    await DB.saveProject(project);
    res.json(project);
  } catch (error: any) {
    console.error("Analyze planning file error:", error);
    res.status(500).json({ error: "Erreur d'analyse IA du fichier planning : " + error.message });
  }
});

// Evaluate expert opinion, risks and advantages from site reports, diaries or meeting minutes (PV)
app.post("/api/projects/:id/evaluate-opinion", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { pdfBase64, fileType, fileName, docType } = req.body;
  const user = (req as any).user;

  if (!pdfBase64) {
    return res.status(400).json({ error: "Document requis pour l'analyse (Base64)" });
  }

  let aiClient;
  try {
    aiClient = getAiClient();
  } catch (err: any) {
    return res.status(503).json({ error: err.message });
  }

  try {
    const project = await DB.getProjectById(id, user.id);
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    const mime = fileType || "application/pdf";
    const labelDocType = docType === 'pv' ? "Procès-verbal de Chantier / Réunion" : "Journal de Chantier";

    const itemsBrief = project.workItems.map((it: any) => {
      let currentProgress = 0;
      if (project.situations && project.situations.length > 0) {
        const sorted = [...project.situations].sort((a: any, b: any) => b.number - a.number);
        currentProgress = sorted[0].itemsProgress[it.id] || 0;
      }
      return {
        code: it.code,
        designation: it.designation,
        totalPrice: it.totalPrice,
        currentProgress: `${currentProgress}%`,
      };
    });

    const prompt = `Vous êtes un Directeur de Projet de BTP Senior et Inspecteur/Auditeur Technique d'ouvrages expéerimenté.
On vous présente un document nommé "${fileName || 'Rapport'}" (Type : ${labelDocType}) extrait du chantier actuel.
Pour vous aider à formuler un diagnostic ultra-personnalisé, voici l'état financier de nos postes de travaux contractuels :
${JSON.stringify(itemsBrief, null, 2)}

Analysez ce document (${labelDocType}) en profondeur pour formuler :
1. RISQUES, MENACES ET RETARDS CONSTATÉS (risks) : Indiquez les anomalies, risques techniques, faiblesses, intempéries, retards d'équipes ou non-conformités relevés.
2. AVANTAGES, FORCES ET LEVIERS RELEVÉS (advantages) : Indiquez les forces, conformités validées, essais concluants, optimisations réussies, matériel ou équipe adéquate relevés.
3. COMMENTAIRE / COMMENTAIRE GLOBAL (globalVerdict) : Analyse synthétique en français de la santé générale de ce projet à ce stade.
4. ACTIONS ET RECOMMANDATIONS (recommendations) : Liste ordonnée de recommandations prioritaires (conseils d'ingénieurs).
5. COMMENTAIRE DÉTAILLÉ SOUHAITÉ (fullAnalysisText) : Analyse textuelle rédigée complète.`;

    const response = await callGeminiWithRetry({
      model: "gemini-3.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: mime,
            data: pdfBase64,
          },
        },
        {
          text: prompt,
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            globalVerdict: { type: Type.STRING },
            risks: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            advantages: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            recommendations: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            fullAnalysisText: { type: Type.STRING },
          },
          required: ["globalVerdict", "risks", "advantages", "recommendations", "fullAnalysisText"],
        },
      },
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("L'IA n'a pas pu générer d'avis d'expert.");
    }

    const { globalVerdict, risks, advantages, recommendations, fullAnalysisText } = JSON.parse(resultText.trim());

    // Save as standard tracking document
    const newDoc = {
      id: "doc-" + Date.now(),
      name: fileName || `Evaluation - ${labelDocType}`,
      type: docType,
      fileName: fileName || "document.pdf",
      fileType: mime,
      date: new Date().toISOString().split("T")[0],
      base64: pdfBase64,
      uploadedAt: new Date().toISOString(),
    };

    if (!project.documents) project.documents = [];
    project.documents.push(newDoc);

    const opinion = {
      id: "opinion-" + Date.now(),
      date: new Date().toISOString().split("T")[0],
      sourceDocName: fileName || `Document d'audit`,
      globalVerdict,
      risks,
      advantages,
      recommendations,
      fullAnalysisText,
    };

    if (!project.expertOpinions) project.expertOpinions = [];
    project.expertOpinions.unshift(opinion); // Prepends so the latest analysis is displayed first

    const log = {
      id: "log-" + Date.now(),
      userName: user.name || user.email,
      userEmail: user.email,
      date: new Date().toISOString(),
      action: `Audit IA diagnostic du rapport [${newDoc.name}]`
    };
    if (!project.auditLogs) project.auditLogs = [];
    project.auditLogs.push(log);

    await DB.saveProject(project);

    res.json({ project, opinion });
  } catch (error: any) {
    console.error("Evaluate project opinion error:", error);
    res.status(500).json({ error: "Erreur lors de l'audit IA du document : " + error.message });
  }
});

// Endpoint for Delay Notifications & Email Alerts
app.post("/api/projects/:id/notify-delay", authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { recipients, subject, htmlMessage, textMessage } = req.body;
  const user = (req as any).user;

  if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
    return res.status(400).json({ error: "Au moins un destinataire est requis." });
  }

  try {
    const project = await DB.getProjectById(id, user.id);
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    let emailStatus: "sent" | "simulated" = "simulated";
    let infoMsg = "";

    const hasSmtpConfig = process.env.SMTP_HOST && process.env.SMTP_USER;

    if (hasSmtpConfig) {
      try {
        const transporter = nodemailer.createTransport({
          host: process.env.SMTP_HOST,
          port: Number(process.env.SMTP_PORT) || 587,
          secure: process.env.SMTP_SECURE === "true",
          auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
          },
        });

        await transporter.sendMail({
          from: process.env.SMTP_FROM || `"inaSuivi AI" <${process.env.SMTP_USER}>`,
          to: recipients.join(", "),
          subject: subject || `Alerte de Retard de Chantier - ${project.name}`,
          text: textMessage || htmlMessage?.replace(/<[^>]*>/g, "") || "Alerte de retard sur vos phases de travaux.",
          html: htmlMessage || `<p>${textMessage}</p>`,
        });

        emailStatus = "sent";
        infoMsg = "L'email a été envoyé avec succès via la configuration SMTP.";
      } catch (smtpErr: any) {
        console.error("Erreur d'envoi SMTP, basculement en mode simulé :", smtpErr);
        infoMsg = `Erreur SMTP (${smtpErr.message}). L'email a été simulé et enregistré localement.`;
        emailStatus = "simulated";
      }
    } else {
      infoMsg = "Aucun SMTP configuré (.env). L'email a été simulé et enregistré localement pour démonstration.";
      emailStatus = "simulated";
    }

    // Save logged email to project's history
    const sentEmailItem = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      date: new Date().toISOString(),
      recipients,
      subject: subject || `Alerte de Retard de Chantier - ${project.name}`,
      body: htmlMessage || textMessage || "Aucun contenu",
      status: emailStatus,
    };

    if (!project.sentEmails) project.sentEmails = [];
    project.sentEmails.push(sentEmailItem);

    // Also add to audit logs
    const log = {
      id: crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2),
      userName: user.name || user.email,
      userEmail: user.email,
      date: new Date().toISOString(),
      action: `Envoi d'alerte email (${emailStatus}): ${subject || "Rapport de Retard"} à [${recipients.join(", ")}]`
    };

    if (!project.auditLogs) project.auditLogs = [];
    project.auditLogs.push(log);

    await DB.saveProject(project);

    res.json({ 
      success: true, 
      status: emailStatus, 
      info: infoMsg,
      project 
    });

  } catch (error: any) {
    console.error("Notify delay email error:", error);
    res.status(500).json({ error: "Erreur lors de l'envoi de l'alerte email : " + error.message });
  }
});

// Operations for Work Situations
app.post("/api/projects/:id/situations", authenticateToken, async (req, res) => {
  const user = (req as any).user;
  const { id } = req.params;
  const { comment, date, lotFilter } = req.body;

  try {
    const project = await DB.getProjectById(id, user.id);
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    const nextNum = (project.situations || []).length + 1;

    // Key-value of itemID => 0 progress initially or match previous
    const itemsProgress: Record<string, number> = {};
    project.workItems.forEach((item: any) => {
      let lastProgress = 0;
      if (project.situations && project.situations.length > 0) {
        const sorted = [...project.situations].sort((a: any, b: any) => b.number - a.number);
        lastProgress = (sorted[0].itemsProgress && sorted[0].itemsProgress[item.id]) || 0;
      }
      itemsProgress[item.id] = lastProgress;
    });

    const newSituation = {
      id: crypto.randomUUID(),
      number: nextNum,
      date: date || new Date().toISOString().split("T")[0],
      status: "draft" as const,
      itemsProgress,
      comment: comment || "",
      lotFilter: lotFilter || "All",
      createdAt: new Date().toISOString(),
    };

    project.situations = project.situations || [];
    project.situations.push(newSituation);

    await DB.saveProject(project);
    res.status(201).json(newSituation);
  } catch (err: any) {
    res.status(500).json({ error: "Erreur lors de la création de la situation : " + err.message });
  }
});

app.put("/api/projects/:id/situations/:sitId", authenticateToken, async (req, res) => {
  const user = (req as any).user;
  const { id, sitId } = req.params;
  const { itemsProgress, status, comment, date, overrides, lotFilter } = req.body;

  try {
    const project = await DB.getProjectById(id, user.id);
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    const situationIdx = project.situations.findIndex((s: any) => s.id === sitId);
    if (situationIdx === -1) {
      return res.status(404).json({ error: "Situation non trouvée" });
    }

    const existing = project.situations[situationIdx];
    project.situations[situationIdx] = {
      ...existing,
      ...(itemsProgress ? { itemsProgress } : {}),
      ...(status ? { status } : {}),
      ...(comment !== undefined ? { comment } : {}),
      ...(date ? { date } : {}),
      ...(overrides ? { overrides } : {}),
      ...(lotFilter !== undefined ? { lotFilter } : {}),
    };

    await DB.saveProject(project);
    res.json(project.situations[situationIdx]);
  } catch (err: any) {
    res.status(500).json({ error: "Erreur lors de la mise à jour de la situation : " + err.message });
  }
});

app.delete("/api/projects/:id/situations/:sitId", authenticateToken, async (req, res) => {
  const user = (req as any).user;
  const { id, sitId } = req.params;

  try {
    const project = await DB.getProjectById(id, user.id);
    if (!project) {
      return res.status(404).json({ error: "Projet non trouvé" });
    }

    const initialLen = project.situations.length;
    const targetSit = project.situations.find((s: any) => s.id === sitId);
    if (!targetSit) {
      return res.status(404).json({ error: "Situation non trouvée" });
    }
    const targetNum = targetSit.number;

    project.situations = project.situations.filter((s: any) => s.id !== sitId);

    // Map old situation numbers to their new numbers after renumbering
    const numMapping = new Map<number, number>();
    
    // Renumber remaining situations to keep them sequential
    project.situations.sort((a: any, b: any) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    project.situations.forEach((s: any, idx: number) => {
      const oldNum = s.number;
      const newNum = idx + 1;
      numMapping.set(oldNum, newNum);
      s.number = newNum;
    });

    // Also remove audit logs for this situation and update others!
    if (project.auditLogs) {
      // 1. Remove deleted logs
      project.auditLogs = project.auditLogs.filter((log: any) => {
        if (log.situationId) {
          return log.situationId !== sitId;
        }
        return log.situationNumber !== targetNum;
      });

      // 2. Renumber remaining logs to stay in sync with their shifted situation numbers!
      project.auditLogs.forEach((log: any) => {
        if (log.situationId) {
          const matchingSit = project.situations.find((s: any) => s.id === log.situationId);
          if (matchingSit) {
            log.situationNumber = matchingSit.number;
          }
        } else if (log.situationNumber !== undefined && log.situationNumber !== null) {
          const newNum = numMapping.get(log.situationNumber);
          if (newNum !== undefined) {
            log.situationNumber = newNum;
          }
        }
      });
    }

    await DB.saveProject(project);
    res.json({ success: true, situations: project.situations, auditLogs: project.auditLogs });
  } catch (err: any) {
    res.status(500).json({ error: "Erreur de suppression de la situation : " + err.message });
  }
});

// ==========================================
// VITE DEV OR PRODUCTION STATIC SERVING
// ==========================================

async function startServer() {
  // Initialize unified database controller (Pings Supabase tables or defaults to Local Mode)
  await initDb();
  
  // Seed the database with Jean Conducteur & "Résidence Les Pins" demo project if needed
  await seedDB();

  // Detect production mode with a self-correcting robust heuristic.
  // We check if we are executing a TypeScript file (dev server via tsx/ts-node)
  const isTsExecution = process.argv[1] && (process.argv[1].endsWith(".ts") || process.argv[1].endsWith(".tsx") || process.argv.includes("tsx"));
  const hasIndexHtmlInDist = fs.existsSync(path.join(process.cwd(), "dist", "index.html"));
  
  // Production is only true if we are NOT executing a .ts file directly, AND either we are executing a compiled .cjs bundle OR dist index.html exists
  const isProduction = !isTsExecution && (process.env.NODE_ENV === "production" || (typeof __filename !== "undefined" && __filename.endsWith(".cjs")) || hasIndexHtmlInDist);
  
  console.log(`[Suivi de Chantier AI Engine] isProduction: ${isProduction}, isTsExecution: ${isTsExecution}, hasIndexHtmlInDist: ${hasIndexHtmlInDist}`);
  
  let distPath = path.join(process.cwd(), "dist");
  if (typeof __dirname !== "undefined" && fs.existsSync(path.join(__dirname, "index.html"))) {
    distPath = __dirname;
  }

  if (!isProduction) {
    // Development Mode
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production Mode
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Suivi de Chantier AI Engine] listening on port ${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
});
