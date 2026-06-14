import fs from "fs";
import path from "path";
import { db } from "../src/db/index.ts";
import { inasuiviUsers, inasuiviProjects } from "../src/db/schema.ts";
import { eq, and } from "drizzle-orm";

// Define DB directory and file path for fallback
const DB_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DB_DIR, "db.json");

// Diagnostic status
export interface DbStatus {
  mode: "cloudsql" | "local";
  connected: boolean;
  message: string;
  url?: string;
  rlsWarning?: boolean;
}

let dbStatus: DbStatus = {
  mode: "local",
  connected: true,
  message: "Utilisation de la base de données locale (Fichier db.json)",
};

// Ensure local fallback file is ready
function ensureLocalDB() {
  if (!fs.existsSync(DB_DIR)) {
    fs.mkdirSync(DB_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({ users: [], projects: [] }, null, 2), "utf-8");
  }
}

// Read from local JSON storage
function readLocalDB() {
  ensureLocalDB();
  try {
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading local db.json:", err);
    return { users: [], projects: [] };
  }
}

// Write to local JSON storage
function writeLocalDB(data: any) {
  ensureLocalDB();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to local db.json:", err);
  }
}

// Initialize database
export async function initDb() {
  const sqlHost = process.env.SQL_HOST;
  const sqlDbName = process.env.SQL_DB_NAME;

  if (!sqlHost || !sqlDbName) {
    dbStatus = {
      mode: "local",
      connected: true,
      message: "Variables d'environnement Cloud SQL manquantes. Chute automatique sur la base de données locale.",
    };
    console.log("[DB INIT] Using Local JSON File DB. Cloud SQL config not set.");
    return;
  }

  try {
    // Simple verification check to see if database connection is available
    const testResult = await db.select({ id: inasuiviUsers.id }).from(inasuiviUsers).limit(1);
    
    dbStatus = {
      mode: "cloudsql",
      connected: true,
      url: sqlHost,
      message: "Connecté avec succès à votre base de données Cloud SQL (PostgreSQL) !",
    };
    console.log("[DB INIT] Connected successfully to Cloud SQL. Checking for local data to migrate...");

    // Perform automated data migration from local db.json if there is data
    try {
      const localData = readLocalDB();
      let localDataModified = false;
      const userIdMap: Record<string, string> = {};

      // 1. Migrate Users to Cloud SQL
      if (localData.users && localData.users.length > 0) {
        console.log(`[MIGRATION] Found ${localData.users.length} local users in db.json. Syncing to Cloud SQL...`);
        for (const u of localData.users) {
          const uEmailNormal = u.email.toLowerCase().trim();

          try {
            await db.insert(inasuiviUsers)
              .values({
                id: u.id,
                email: uEmailNormal,
                passwordHash: u.passwordHash,
                name: u.name || "",
                company: u.company || "",
                role: u.role || "supervisor",
              })
              .onConflictDoUpdate({
                target: inasuiviUsers.id,
                set: {
                  email: uEmailNormal,
                  passwordHash: u.passwordHash,
                  name: u.name || "",
                  company: u.company || "",
                  role: u.role || "supervisor",
                }
              });
            console.log(`[MIGRATION] Synced user: ${uEmailNormal}`);
          } catch (upsertErr: any) {
            console.error(`[MIGRATION] Failed to sync user ${u.email}:`, upsertErr.message);
          }
        }
      }

      // 2. Migrate Projects to Cloud SQL
      if (localData.projects && localData.projects.length > 0) {
        console.log(`[MIGRATION] Found ${localData.projects.length} local projects in db.json. Syncing to Cloud SQL...`);
        for (const p of localData.projects) {
          const {
            id,
            name,
            description,
            clientName,
            contractor,
            supervisor,
            location,
            tvaRate,
            retentionRate,
            contractDate,
            userId,
            createdAt,
            ...restProjectFields
          } = p;

          try {
            await db.insert(inasuiviProjects)
              .values({
                id: id,
                userId: userId,
                name: name,
                description: description || "",
                clientName: clientName || "",
                contractor: contractor || "",
                supervisor: supervisor || "",
                location: location || "",
                tvaRate: String(tvaRate ?? 20),
                retentionRate: String(retentionRate ?? 5),
                contractDate: contractDate || new Date().toISOString().split("T")[0],
                extraData: restProjectFields || {},
              })
              .onConflictDoUpdate({
                target: inasuiviProjects.id,
                set: {
                  userId: userId,
                  name: name,
                  description: description || "",
                  clientName: clientName || "",
                  contractor: contractor || "",
                  supervisor: supervisor || "",
                  location: location || "",
                  tvaRate: String(tvaRate ?? 20),
                  retentionRate: String(retentionRate ?? 5),
                  contractDate: contractDate || new Date().toISOString().split("T")[0],
                  extraData: restProjectFields || {},
                }
              });
            console.log(`[MIGRATION] Synced project: ${p.name}`);
          } catch (upsertErr: any) {
            console.error(`[MIGRATION] Failed to sync project ${p.name}:`, upsertErr.message);
          }
        }
      }
    } catch (migErr: any) {
      console.error("[MIGRATION] Error migrating local data to Cloud SQL:", migErr.message);
    }

  } catch (err: any) {
    dbStatus = {
      mode: "local",
      connected: false,
      url: sqlHost,
      message: `La connexion à Cloud SQL a échoué : ${err.message}. Chute sur la base locale.`,
    };
    console.error("[DB INIT] Error initializing Cloud SQL database, using file mode:", err);
  }
}

// Get diagnostic DB status details
export function getDbStatus(): DbStatus {
  return dbStatus;
}

// Database Actions Interface
export const DB = {
  // --- USERS Operations ---
  async getUsers(): Promise<any[]> {
    let cloudUsers: any[] = [];
    let cloudSuccess = false;

    if (dbStatus.mode === "cloudsql") {
      try {
        const results = await db.select().from(inasuiviUsers);
        cloudUsers = (results || []).map(u => ({
          id: u.id,
          email: u.email,
          passwordHash: u.passwordHash,
          name: u.name,
          company: u.company,
          role: u.role,
          createdAt: u.createdAt,
        }));
        cloudSuccess = true;
      } catch (err: any) {
        console.error("Cloud SQL getUsers failed, falling back to db.json. Error:", err);
      }
    }

    const localUsers = readLocalDB().users || [];

    if (cloudSuccess) {
      const cloudIds = new Set(cloudUsers.map(u => u.id));
      const localOnly = localUsers.filter(u => !cloudIds.has(u.id));
      return [...cloudUsers, ...localOnly];
    } else {
      return localUsers;
    }
  },

  async getUserByEmail(email: string): Promise<any | null> {
    let cloudUser: any | null = null;
    let cloudSuccess = false;

    if (dbStatus.mode === "cloudsql") {
      try {
        const results = await db.select().from(inasuiviUsers).where(eq(inasuiviUsers.email, email.toLowerCase().trim())).limit(1);
        if (results && results.length > 0) {
          const u = results[0];
          cloudUser = {
            id: u.id,
            email: u.email,
            passwordHash: u.passwordHash,
            name: u.name,
            company: u.company,
            role: u.role,
            createdAt: u.createdAt,
          };
        }
        cloudSuccess = true;
      } catch (err: any) {
        console.error("Cloud SQL getUserByEmail failed, falling back to local DB. Error:", err);
      }
    }

    if (cloudSuccess && cloudUser) {
      return cloudUser;
    }

    const dbObj = readLocalDB();
    const localUser = dbObj.users.find((u: any) => u.email.toLowerCase() === email.toLowerCase()) || null;
    if (localUser && dbStatus.mode === "cloudsql" && cloudSuccess && !cloudUser) {
      console.log(`[SYNC BY EMAIL] Background syncing local user ${localUser.email} to cloud...`);
      DB.saveUser(localUser).catch(e => console.warn("Failed background user sync:", e));
    }
    return localUser;
  },

  async getUserById(id: string): Promise<any | null> {
    let cloudUser: any | null = null;
    let cloudSuccess = false;

    if (dbStatus.mode === "cloudsql") {
      try {
        const results = await db.select().from(inasuiviUsers).where(eq(inasuiviUsers.id, id)).limit(1);
        if (results && results.length > 0) {
          const u = results[0];
          cloudUser = {
            id: u.id,
            email: u.email,
            passwordHash: u.passwordHash,
            name: u.name,
            company: u.company,
            role: u.role,
            createdAt: u.createdAt,
          };
        }
        cloudSuccess = true;
      } catch (err: any) {
        console.error("Cloud SQL getUserById failed, falling back to local DB. Error:", err);
      }
    }

    if (cloudSuccess && cloudUser) {
      return cloudUser;
    }

    const dbObj = readLocalDB();
    return dbObj.users.find((u: any) => u.id === id) || null;
  },

  async saveUser(user: any): Promise<void> {
    let savedOnCloud = false;
    let cloudError: any = null;

    if (dbStatus.mode === "cloudsql") {
      try {
        await db.insert(inasuiviUsers)
          .values({
            id: user.id,
            email: user.email.toLowerCase().trim(),
            passwordHash: user.passwordHash,
            name: user.name || "",
            company: user.company || "",
            role: user.role || "supervisor",
          })
          .onConflictDoUpdate({
            target: inasuiviUsers.id,
            set: {
              email: user.email.toLowerCase().trim(),
              passwordHash: user.passwordHash,
              name: user.name || "",
              company: user.company || "",
              role: user.role || "supervisor",
            }
          });
        savedOnCloud = true;
      } catch (err: any) {
        cloudError = err;
        console.error("Cloud SQL saveUser failed, writing to db.json fallback. Error:", err);
      }
    }

    // Always commit to local fallback database file
    const dbObj = readLocalDB();
    const idx = dbObj.users.findIndex((u: any) => u.id === user.id);
    if (idx !== -1) {
      dbObj.users[idx] = user;
    } else {
      dbObj.users.push(user);
    }
    writeLocalDB(dbObj);

    if (dbStatus.mode === "cloudsql" && !savedOnCloud && cloudError) {
      throw new Error(`Erreur d'écriture Cloud SQL: ${cloudError.message}. Enregistré localement.`);
    }
  },

  // --- PROJECTS Operations ---
  async getProjects(userId: string): Promise<any[]> {
    let cloudProjects: any[] = [];
    let cloudSuccess = false;

    if (dbStatus.mode === "cloudsql") {
      try {
        const results = await db.select().from(inasuiviProjects).where(eq(inasuiviProjects.userId, userId));
        cloudProjects = (results || []).map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          clientName: p.clientName,
          contractor: p.contractor,
          supervisor: p.supervisor,
          location: p.location,
          tvaRate: Number(p.tvaRate),
          retentionRate: Number(p.retentionRate),
          contractDate: p.contractDate,
          createdAt: p.createdAt,
          userId: p.userId,
          ...(p.extraData as any || {}),
        }));
        cloudSuccess = true;
      } catch (err: any) {
        console.error("Cloud SQL getProjects failed, falling back to local DB. Error:", err);
      }
    }

    const dbObj = readLocalDB();
    const localProjects = dbObj.projects.filter((p: any) => p.userId === userId) || [];

    if (cloudSuccess) {
      const cloudIds = new Set(cloudProjects.map(p => p.id));
      const localOnly = localProjects.filter(p => !cloudIds.has(p.id));

      if (localOnly.length > 0) {
        console.log(`[GET PROJECTS] Found ${localOnly.length} local-only projects. Triggering background cloud backup sync...`);
        for (const lp of localOnly) {
          DB.saveProject(lp).catch(e => console.warn(`[AUTOMATED BACKGROUND SYNC] Cloud save failed for ${lp.name}:`, e));
        }
      }

      return [...cloudProjects, ...localOnly];
    } else {
      return localProjects;
    }
  },

  async getProjectById(id: string, userId: string): Promise<any | null> {
    let cloudProject: any | null = null;
    let cloudSuccess = false;

    if (dbStatus.mode === "cloudsql") {
      try {
        const results = await db.select().from(inasuiviProjects).where(and(eq(inasuiviProjects.id, id), eq(inasuiviProjects.userId, userId))).limit(1);
        if (results && results.length > 0) {
          const data = results[0];
          cloudProject = {
            id: data.id,
            name: data.name,
            description: data.description,
            clientName: data.clientName,
            contractor: data.contractor,
            supervisor: data.supervisor,
            location: data.location,
            tvaRate: Number(data.tvaRate),
            retentionRate: Number(data.retentionRate),
            contractDate: data.contractDate,
            createdAt: data.createdAt,
            userId: data.userId,
            ...(data.extraData as any || {}),
          };
        }
        cloudSuccess = true;
      } catch (err: any) {
        console.error("Cloud SQL getProjectById failed, falling back to local DB. Error:", err);
      }
    }

    if (cloudSuccess && cloudProject) {
      return cloudProject;
    }

    const dbObj = readLocalDB();
    const localProject = dbObj.projects.find((p: any) => p.id === id && p.userId === userId) || null;
    if (localProject && dbStatus.mode === "cloudsql" && cloudSuccess && !cloudProject) {
      console.log(`[SYNC BY ID] Project found in db.json but not cloud. Synchronizing ${localProject.name}...`);
      DB.saveProject(localProject).catch(e => console.warn("Failed background sync for project ID:", e));
    }
    return localProject;
  },

  async saveProject(project: any): Promise<void> {
    let savedOnCloud = false;
    let cloudError: any = null;

    if (dbStatus.mode === "cloudsql") {
      try {
        const {
          id,
          name,
          description,
          clientName,
          contractor,
          supervisor,
          location,
          tvaRate,
          retentionRate,
          contractDate,
          userId,
          createdAt,
          ...restProjectFields
        } = project;

        await db.insert(inasuiviProjects)
          .values({
            id: id,
            userId: userId,
            name: name,
            description: description || "",
            clientName: clientName || "",
            contractor: contractor || "",
            supervisor: supervisor || "",
            location: location || "",
            tvaRate: String(tvaRate ?? 20),
            retentionRate: String(retentionRate ?? 5),
            contractDate: contractDate || new Date().toISOString().split("T")[0],
            extraData: restProjectFields || {},
          })
          .onConflictDoUpdate({
            target: inasuiviProjects.id,
            set: {
              userId: userId,
              name: name,
              description: description || "",
              clientName: clientName || "",
              contractor: contractor || "",
              supervisor: supervisor || "",
              location: location || "",
              tvaRate: String(tvaRate ?? 20),
              retentionRate: String(retentionRate ?? 5),
              contractDate: contractDate || new Date().toISOString().split("T")[0],
              extraData: restProjectFields || {},
            }
          });
        savedOnCloud = true;
      } catch (err: any) {
        cloudError = err;
        console.error("Cloud SQL saveProject failed, saving locally. Error:", err);
      }
    }

    const dbObj = readLocalDB();
    const idx = dbObj.projects.findIndex((p: any) => p.id === project.id);
    if (idx !== -1) {
      dbObj.projects[idx] = project;
    } else {
      dbObj.projects.push(project);
    }
    writeLocalDB(dbObj);

    if (dbStatus.mode === "cloudsql" && !savedOnCloud && cloudError) {
      throw new Error(`Erreur d'écriture Cloud SQL: ${cloudError.message}. Enregistré localement.`);
    }
  },

  async deleteProject(id: string, userId: string): Promise<boolean> {
    let deletedOnCloud = false;
    if (dbStatus.mode === "cloudsql") {
      try {
        await db.delete(inasuiviProjects).where(and(eq(inasuiviProjects.id, id), eq(inasuiviProjects.userId, userId)));
        deletedOnCloud = true;
      } catch (err: any) {
        console.error("Cloud SQL deleteProject failed. Error:", err);
      }
    }
    const dbObj = readLocalDB();
    const initialLen = dbObj.projects.length;
    dbObj.projects = dbObj.projects.filter((p: any) => !(p.id === id && p.userId === userId));
    const deleted = dbObj.projects.length !== initialLen;
    writeLocalDB(dbObj);
    return deleted || deletedOnCloud;
  },
};
