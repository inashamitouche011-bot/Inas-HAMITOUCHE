import { Project, User, OCRResult, WorkSituation, WorkItem, AuditLog } from "../types";

const API_BASE = "/api";

// LocalStorage Token Keys
const TOKEN_KEY = "chantier_ai_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// Global API Fetch wrapper with automatic bearer token inject
async function fetchAPI<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    let errMsg = "Une erreur est survenue";
    try {
      const errData = await response.json();
      errMsg = errData.error || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  return response.json() as Promise<T>;
}

export const api = {
  // Auth Operations
  auth: {
    async register(data: { email: string; passwordHash: string; name: string; company: string; role: string }) {
      const res = await fetchAPI<{ user: User; token: string }>("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          email: data.email,
          password: data.passwordHash, // hashed locally or passed
          name: data.name,
          company: data.company,
          role: data.role,
        }),
      });
      setToken(res.token);
      return res.user;
    },

    async login(email: string, passwordHash: string) {
      const res = await fetchAPI<{ user: User; token: string }>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password: passwordHash }),
      });
      setToken(res.token);
      return res.user;
    },

    async loginDemo() {
      const res = await fetchAPI<{ user: User; token: string }>("/auth/demo", {
        method: "POST",
      });
      setToken(res.token);
      return res.user;
    },

    async getMe(): Promise<User> {
      return fetchAPI<User>("/auth/me");
    },

    async getDbStatus(): Promise<{ mode: "supabase" | "local"; connected: boolean; message: string; url?: string; rlsWarning?: boolean }> {
      return fetchAPI<{ mode: "supabase" | "local"; connected: boolean; message: string; url?: string; rlsWarning?: boolean }>("/db-status");
    },

    async logout() {
      try {
        await fetchAPI<{ success: boolean }>("/auth/logout", { method: "POST" });
      } catch (e) {
        // Safe to ignore on logout
      }
      removeToken();
    },

    async resetPasswordRequest(email: string): Promise<{ success: boolean; needsVerification: boolean; companyHint?: string; nameHint?: string }> {
      return fetchAPI("/auth/reset-password-request", {
        method: "POST",
        body: JSON.stringify({ email }),
      });
    },

    async resetPasswordVerify(data: { email: string; verificationValue?: string; newPassword?: string }): Promise<{ success: boolean; message: string }> {
      return fetchAPI("/auth/reset-password-verify", {
        method: "POST",
        body: JSON.stringify(data),
      });
    },
  },

  // Projects CRUD
  projects: {
    async list(): Promise<Project[]> {
      let remoteList: Project[] = [];
      try {
        remoteList = await fetchAPI<Project[]>("/projects");
        localStorage.setItem("inasuivi_projects_cache", JSON.stringify(remoteList));
      } catch (err) {
        console.warn("API request to list projects failed. Loading from local cache...", err);
        const cached = localStorage.getItem("inasuivi_projects_cache");
        if (cached) {
          try {
            remoteList = JSON.parse(cached);
          } catch {
            // ignore
          }
        }
      }

      // Merge with pending offline creations
      const pendingStr = localStorage.getItem("inasuivi_offline_projects");
      if (pendingStr) {
        try {
          const pending = JSON.parse(pendingStr) as Project[];
          // Filter out any pending project that has already been successfully synced (by ID)
          const localOnly = pending.filter(p => !remoteList.some(r => r.id === p.id));
          return [...localOnly, ...remoteList];
        } catch {
          // ignore
        }
      }
      return remoteList;
    },

    async get(id: string): Promise<Project> {
      try {
        const proj = await fetchAPI<Project>(`/projects/${id}`);
        return proj;
      } catch (err) {
        console.warn(`Failed to fetch project ${id} from API, checking fallback...`, err);
        // Look in cache
        const cachedStr = localStorage.getItem("inasuivi_projects_cache");
        if (cachedStr) {
          try {
            const cachedList = JSON.parse(cachedStr) as Project[];
            const found = cachedList.find(p => p.id === id);
            if (found) return found;
          } catch {
            // ignore
          }
        }
        // Check offline queue
        const pendingStr = localStorage.getItem("inasuivi_offline_projects");
        if (pendingStr) {
          try {
            const pendingList = JSON.parse(pendingStr) as Project[];
            const found = pendingList.find(p => p.id === id);
            if (found) return found;
          } catch {
            // ignore
          }
        }
        throw err;
      }
    },

    async create(project: Partial<Project>): Promise<Project> {
      try {
        const created = await fetchAPI<Project>("/projects", {
          method: "POST",
          body: JSON.stringify(project),
        });
        return created;
      } catch (err: any) {
        console.warn("Failed to create project remotely (network issue). Saving to offline queue...", err);
        // Create a local representation
        const offlineId = "offline_" + Math.random().toString(36).substring(2, 11);
        const offlineProject: Project = {
          id: project.id || offlineId,
          name: project.name || "Nouveau Projet (Hors-ligne)",
          description: project.description || "Créé hors-ligne lors d'une coupure réseau.",
          clientName: project.clientName || "",
          contractor: project.contractor || "",
          supervisor: project.supervisor || "",
          location: project.location || "",
          tvaRate: project.tvaRate ?? 20,
          retentionRate: project.retentionRate ?? 5,
          contractDate: project.contractDate || new Date().toISOString().split("T")[0],
          workItems: project.workItems || [],
          situations: project.situations || [],
          createdAt: project.createdAt || new Date().toISOString(),
          userId: project.userId || "offline-user",
          isOfflinePending: true,
        };

        const pendingStr = localStorage.getItem("inasuivi_offline_projects");
        let pending: Project[] = [];
        if (pendingStr) {
          try {
            pending = JSON.parse(pendingStr);
          } catch {
            // ignore
          }
        }
        pending.push(offlineProject);
        localStorage.setItem("inasuivi_offline_projects", JSON.stringify(pending));

        // Update inasuivi_projects_cache too
        const cachedStr = localStorage.getItem("inasuivi_projects_cache");
        let cached: Project[] = [];
        if (cachedStr) {
          try {
            cached = JSON.parse(cachedStr);
          } catch {
            // ignore
          }
        }
        localStorage.setItem("inasuivi_projects_cache", JSON.stringify([offlineProject, ...cached]));

        return offlineProject;
      }
    },

    async update(id: string, project: Partial<Project>): Promise<Project> {
      try {
        const updated = await fetchAPI<Project>(`/projects/${id}`, {
          method: "PUT",
          body: JSON.stringify(project),
        });
        return updated;
      } catch (err) {
        console.warn(`Failed to update project ${id} remotely. Updating in offline cache...`, err);
        // If it's a pending project or cached project, we can update it in local storage to keep user changes safe while offline!
        const pendingStr = localStorage.getItem("inasuivi_offline_projects");
        if (pendingStr) {
          try {
            const pending = JSON.parse(pendingStr) as Project[];
            const idx = pending.findIndex(p => p.id === id);
            if (idx !== -1) {
              pending[idx] = { ...pending[idx], ...project } as Project;
              localStorage.setItem("inasuivi_offline_projects", JSON.stringify(pending));
              return pending[idx];
            }
          } catch {
            // ignore
          }
        }

        // Also update the general projects cache
        const cachedStr = localStorage.getItem("inasuivi_projects_cache");
        if (cachedStr) {
          try {
            const cached = JSON.parse(cachedStr) as Project[];
            const idx = cached.findIndex(p => p.id === id);
            if (idx !== -1) {
              cached[idx] = { ...cached[idx], ...project } as Project;
              localStorage.setItem("inasuivi_projects_cache", JSON.stringify(cached));
              return cached[idx];
            }
          } catch {
            // ignore
          }
        }
        throw err;
      }
    },

    async delete(id: string): Promise<{ success: boolean }> {
      try {
        const res = await fetchAPI<{ success: boolean }>(`/projects/${id}`, {
          method: "DELETE",
        });
        return res;
      } catch (err) {
        console.warn(`Failed to delete project ${id} remotely. Removing from local storage fallback...`, err);
        // Also remove from pending offline creations immediately
        const pendingStr = localStorage.getItem("inasuivi_offline_projects");
        if (pendingStr) {
          try {
            const pending = JSON.parse(pendingStr) as Project[];
            const filtered = pending.filter(p => p.id !== id);
            localStorage.setItem("inasuivi_offline_projects", JSON.stringify(filtered));
          } catch {
            // ignore
          }
        }

        // Also remove from cached list immediately
        const cachedStr = localStorage.getItem("inasuivi_projects_cache");
        if (cachedStr) {
          try {
            const cached = JSON.parse(cachedStr) as Project[];
            const filtered = cached.filter(p => p.id !== id);
            localStorage.setItem("inasuivi_projects_cache", JSON.stringify(filtered));
          } catch {
            // ignore
          }
        }
        return { success: true };
      }
    },

    // PDF OCR and breakdown extraction via Gemini API
    async extract(pdfBase64: string, fileType: string, countryCode?: string): Promise<OCRResult> {
      return fetchAPI<OCRResult>("/projects/extract", {
        method: "POST",
        body: JSON.stringify({ pdfBase64, fileType, countryCode }),
      });
    },

    // PDF/Image blueprint plan breakdown estimation via Gemini API
    async generateByPlan(
      pdfBase64: string | null,
      fileType: string | null,
      countryCode: string,
      floor: string,
      description: string,
      plans?: Array<{ base64: string; fileType: string; name: string }>,
      catalog?: { base64: string; fileType: string; name: string } | null,
      numFloors?: number,
      foundationType?: string,
      floorHeight?: number
    ): Promise<OCRResult & { bimElements?: Array<{ element: string; calculation: string; quantity: number; unit: string }> }> {
      return fetchAPI<OCRResult & { bimElements?: Array<{ element: string; calculation: string; quantity: number; unit: string }> }>("/projects/generate-by-plan", {
        method: "POST",
        body: JSON.stringify({ pdfBase64, fileType, countryCode, floor, description, plans, catalog, numFloors, foundationType, floorHeight }),
      });
    },

    // Extract situation progress from uploaded progress sheet via Gemini API
    async extractSituationProgress(projectId: string, pdfBase64: string, fileType: string): Promise<{ success: boolean; progressItems: Array<{ id: string; progressPercentage: number; extractedQuantity?: number }> }> {
      return fetchAPI<{ success: boolean; progressItems: Array<{ id: string; progressPercentage: number; extractedQuantity?: number }> }>(`/projects/${projectId}/situations-extract`, {
        method: "POST",
        body: JSON.stringify({ pdfBase64, fileType }),
      });
    },

    async syncOfflineProjects(): Promise<{ success: boolean; syncedCount: number }> {
      const pendingStr = localStorage.getItem("inasuivi_offline_projects");
      if (!pendingStr) return { success: true, syncedCount: 0 };

      try {
        const pending = JSON.parse(pendingStr) as Project[];
        if (pending.length === 0) return { success: true, syncedCount: 0 };

        console.log(`[OFFLINE SYNC] Found ${pending.length} offline projects to sync.`);
        let syncedCount = 0;
        const remaining: Project[] = [];

        for (const op of pending) {
          try {
            // Strip client-side temporary fields from body
            const { isOfflinePending, id, ...cleanProj } = op as any;

            // Make the post
            await fetchAPI<Project>("/projects", {
              method: "POST",
              body: JSON.stringify(cleanProj),
            });
            syncedCount++;
          } catch (err) {
            console.error(`[OFFLINE SYNC] Sync failed for project: ${op.name}`, err);
            remaining.push(op); // keep for retry
          }
        }

        if (remaining.length > 0) {
          localStorage.setItem("inasuivi_offline_projects", JSON.stringify(remaining));
        } else {
          localStorage.removeItem("inasuivi_offline_projects");
        }

        return { success: true, syncedCount };
      } catch (err) {
        console.error("[OFFLINE SYNC] Parsing queue failed:", err);
        return { success: false, syncedCount: 0 };
      }
    },

    // Situations de travaux managers
    async createSituation(projectId: string, data: { comment?: string; date?: string; lotFilter?: string }): Promise<WorkSituation> {
      return fetchAPI<WorkSituation>(`/projects/${projectId}/situations`, {
        method: "POST",
        body: JSON.stringify(data),
      });
    },

    async updateSituation(
      projectId: string,
      situationId: string,
      data: { 
        itemsProgress?: Record<string, number>; 
        status?: 'draft' | 'approved' | 'paid'; 
        comment?: string; 
        date?: string;
        overrides?: Record<string, any>;
        lotFilter?: string;
      }
    ): Promise<WorkSituation> {
      return fetchAPI<WorkSituation>(`/projects/${projectId}/situations/${situationId}`, {
        method: "PUT",
        body: JSON.stringify(data),
      });
    },

    async deleteSituation(projectId: string, situationId: string): Promise<{ success: boolean; situations: WorkSituation[]; auditLogs?: AuditLog[] }> {
      return fetchAPI<{ success: boolean; situations: WorkSituation[]; auditLogs?: AuditLog[] }>(`/projects/${projectId}/situations/${situationId}`, {
        method: "DELETE",
      });
    },

    // Planning proposer
    async proposePlanning(projectId: string, startDate: string, endDate: string): Promise<Project> {
      return fetchAPI<Project>(`/projects/${projectId}/propose-planning`, {
        method: "POST",
        body: JSON.stringify({ startDate, endDate }),
      });
    },

    // Planning file uploader & analyzer
    async analyzePlanningFile(projectId: string, pdfBase64: string, fileType: string, fileName: string): Promise<Project> {
      return fetchAPI<Project>(`/projects/${projectId}/analyze-planning-file`, {
        method: "POST",
        body: JSON.stringify({ pdfBase64, fileType, fileName }),
      });
    },

    // Audit logs evaluations (Risks, Advantages, Recommendations)
    async evaluateProjectOpinion(
      projectId: string, 
      pdfBase64: string, 
      fileType: string, 
      fileName: string, 
      docType: 'pv' | 'journal'
    ): Promise<{ project: Project; opinion: any }> {
      return fetchAPI<{ project: Project; opinion: any }>(`/projects/${projectId}/evaluate-opinion`, {
        method: "POST",
        body: JSON.stringify({ pdfBase64, fileType, fileName, docType }),
      });
    },

    // Send planning delay email alerts
    async notifyDelay(
      projectId: string,
      recipients: string[],
      subject: string,
      htmlMessage: string,
      textMessage?: string
    ): Promise<{ success: boolean; status: string; info: string; project: Project }> {
      return fetchAPI<{ success: boolean; status: string; info: string; project: Project }>(`/projects/${projectId}/notify-delay`, {
        method: "POST",
        body: JSON.stringify({ recipients, subject, htmlMessage, textMessage }),
      });
    },
  },
};
