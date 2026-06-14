import React, { useState, useEffect } from "react";
import { User, Project, COUNTRIES } from "./types";
import { api, getToken } from "./lib/api";
import AuthScreen from "./components/AuthScreen";
import Navbar from "./components/Navbar";
import ProjectList from "./components/ProjectList";
import ContractUpload from "./components/ContractUpload";
import CreateProjectManual from "./components/CreateProjectManual";
import CreateProjectBim from "./components/CreateProjectBim";
import ProjectDetail from "./components/ProjectDetail";
import { HardHat, Trash2, ShieldAlert, Globe } from "lucide-react";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'upload_ia' | 'create_manual' | 'create_bim' | 'detail'>("list");
  const [errorHeader, setErrorHeader] = useState<string | null>(null);
  const [deleteConfirmProjectId, setDeleteConfirmProjectId] = useState<string | null>(null);

  // Pre-selection of Country / Payer
  const [showPreSelectCountryModal, setShowPreSelectCountryModal] = useState(false);
  const [preSelectCountryNextView, setPreSelectCountryNextView] = useState<'upload_ia' | 'create_manual' | 'create_bim' | null>(null);
  const [selectedCountryCode, setSelectedCountryCode] = useState<'DZ' | 'FR' | 'MA' | 'TN' | 'CI' | 'SN' | 'EG' | 'LY' | 'MR' | 'ES' | 'IT' | 'BE' | 'DE' | 'CH' | 'US'>('DZ');

  // Authenticate user on mount if token is stored, or auto-login with demo account otherwise
  useEffect(() => {
    async function restoreSession() {
      const token = getToken();
      if (token) {
        try {
          const fetchedUser = await api.auth.getMe();
          setUser(fetchedUser);
          
          // If we are online, trigger sync before listing projects
          if (navigator.onLine) {
            try {
              await api.projects.syncOfflineProjects();
            } catch (syncErr) {
              console.warn("Initial background sync failed:", syncErr);
            }
          }

          // Load projects immediately once authenticated
          const fetchedProjects = await api.projects.list();
          setProjects(fetchedProjects);
          setLoading(false);
          return;
        } catch (err) {
          console.warn("Session expired or server offline:", err);
          // Token is invalid, remove it
          localStorage.removeItem("chantier_ai_token");
        }
      }

      setLoading(false);
    }
    restoreSession();
  }, []);

  // Automatic offline/online sync listener
  useEffect(() => {
    if (!user) return;

    const handleOnline = async () => {
      console.log("[OFFLINE SYNC] Device came back online, synchronizing offline projects...");
      try {
        const res = await api.projects.syncOfflineProjects();
        if (res.syncedCount > 0) {
          setErrorHeader(`✓ ${res.syncedCount} chantier(s) créé(s) hors-ligne synchronisé(s) automatiquement sur Supabase Cloud !`);
          setTimeout(() => setErrorHeader(null), 8000);
          await loadProjects();
        }
      } catch (err) {
        console.error("Auto back-online sync failed:", err);
      }
    };

    window.addEventListener("online", handleOnline);
    return () => {
      window.removeEventListener("online", handleOnline);
    };
  }, [user]);

  const loadProjects = async () => {
    try {
      const list = await api.projects.list();
      setProjects(list);
    } catch (err: any) {
      setErrorHeader("Erreur lors de l'actualisation des chantiers: " + err.message);
    }
  };

  const handleAuthSuccess = async (authenticatedUser: User) => {
    setUser(authenticatedUser);
    setLoading(true);
    await loadProjects();
    setView("list");
    setLoading(false);
  };

  const handleLogout = async () => {
    setLoading(true);
    await api.auth.logout();
    setUser(null);
    setProjects([]);
    setCurrentProjectId(null);
    setView("list");
    setLoading(false);
  };

  const handleDeleteProject = async (id: string) => {
    try {
      setLoading(true);
      await api.projects.delete(id);
      await loadProjects();
      if (currentProjectId === id) {
        setCurrentProjectId(null);
        setView("list");
      }
    } catch (err: any) {
      setErrorHeader("Erreur de suppression du chantier: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = async () => {
    await loadProjects();
    setView("list");
  };

  const selectedProject = projects.find((p) => p.id === currentProjectId);

  // Loading Screen
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4">
        <div className="bg-slate-900 text-amber-500 p-4 rounded-full shadow-lg relative">
          <HardHat className="w-10 h-10 animate-bounce" />
          <div className="absolute inset-0 border-4 border-amber-500 rounded-full border-t-transparent animate-spin p-5"></div>
        </div>
        <div className="text-center">
          <h3 className="font-sans font-bold text-slate-800 text-base">inaSuivi AI</h3>
          <p className="text-xs text-slate-500 mt-1">Sécurisation du bureau de conduite des travaux...</p>
        </div>
      </div>
    );
  }

  // Not logged in view
  if (!user) {
    return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
  }

  return (
    <div className="min-h-screen bg-slate-50/50 text-slate-900 flex flex-col">
      <Navbar user={user} onLogout={handleLogout} />

      {user?.dbStatus?.rlsWarning && (
        <div className="bg-amber-50 border-b border-amber-200 text-slate-900 p-5 flex flex-col md:flex-row items-start gap-4 text-xs w-full no-print shadow-sm">
          <ShieldAlert className="w-6 h-6 text-amber-600 mt-0.5 shrink-0" />
          <div className="leading-relaxed flex-1">
            <span className="font-bold text-slate-950 uppercase tracking-wide block mb-1 text-sm">
              Configuration Supabase Requise : Désactivation de la Sécurité des Lignes (RLS)
            </span>
            <p className="text-slate-700 mb-3">
              Supabase a bloqué l'écriture de vos comptes et projets (erreur RLS). C'est pour cela que les utilisateurs créés ne s'enregistrent pas sur votre base Cloud. Pour résoudre cela en 2 secondes, copiez-collez la commande suivante dans l'onglet <strong>SQL Editor</strong> de votre tableau de bord Supabase, puis cliquez sur <strong>Run</strong> :
            </p>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-900 p-2.5 rounded-lg border border-slate-800 font-mono text-amber-400 select-all my-2 overflow-x-auto text-[11px]">
              <span className="flex-1 whitespace-nowrap min-w-0">
                ALTER TABLE inasuivi_users DISABLE ROW LEVEL SECURITY; ALTER TABLE inasuivi_projects DISABLE ROW LEVEL SECURITY;
              </span>
              <button 
                onClick={(e) => {
                  try {
                    navigator.clipboard.writeText("ALTER TABLE inasuivi_users DISABLE ROW LEVEL SECURITY; ALTER TABLE inasuivi_projects DISABLE ROW LEVEL SECURITY;");
                    const btn = e.currentTarget;
                    const orig = btn.innerText;
                    btn.innerText = "Copié ! ✅";
                    setTimeout(() => { btn.innerText = orig; }, 3000);
                  } catch (err) {
                    alert("Sélectionnez le texte et faites Ctrl+C.");
                  }
                }} 
                className="bg-slate-800 hover:bg-slate-700 active:bg-slate-600 px-3 py-1 rounded text-white font-sans font-bold cursor-pointer transition-colors text-[10px] shrink-0"
              >
                Copier le SQL
              </button>
            </div>
            <p className="text-[11px] text-slate-500 mt-2">
              💡 <em>Alternative Pro:</em> Vous pouvez également renseigner votre <strong>Service Role Key</strong> (clé secrète commençant par `ey...`) dans l'environnement AI Studio à la place de la clé `anon` pour contourner automatiquement la sécurité RLS.
            </p>
          </div>
        </div>
      )}

      {errorHeader && (
        <div className="bg-red-50 border-b border-red-200 text-red-700 p-3 text-center text-xs font-medium no-print">
          {errorHeader}
          <button onClick={() => setErrorHeader(null)} className="ml-2 font-bold underline">Fermer</button>
        </div>
      )}

      {/* Main View Router */}
      <main className="flex-1 pb-16">
        {view === "list" && (
          <ProjectList
            projects={projects}
            currentUser={user}
            onSelectProject={(id) => {
              setCurrentProjectId(id);
              setView("detail");
            }}
            onUploadClick={() => {
              setPreSelectCountryNextView("upload_ia");
              setShowPreSelectCountryModal(true);
            }}
            onCreateManualClick={() => {
              setPreSelectCountryNextView("create_manual");
              setShowPreSelectCountryModal(true);
            }}
            onCreateBimClick={() => {
              setPreSelectCountryNextView("create_bim");
              setShowPreSelectCountryModal(true);
            }}
            onDeleteProject={(id) => setDeleteConfirmProjectId(id)}
          />
        )}

        {view === "upload_ia" && (
          <ContractUpload
            onProjectCreated={handleProjectCreated}
            onCancel={() => setView("list")}
            countryCode={selectedCountryCode}
          />
        )}

        {view === "create_manual" && (
          <CreateProjectManual
            onProjectCreated={handleProjectCreated}
            onCancel={() => setView("list")}
            countryCode={selectedCountryCode}
          />
        )}

        {view === "create_bim" && (
          <CreateProjectBim
            onProjectCreated={handleProjectCreated}
            onCancel={() => setView("list")}
            countryCode={selectedCountryCode}
          />
        )}

        {view === "detail" && selectedProject && (
          <ProjectDetail
            project={selectedProject}
            currentUser={user}
            onBack={() => setView("list")}
            onProjectUpdated={(updatedProject) => {
              // Replace project entry in states
              setProjects(projects.map((p) => (p.id === updatedProject.id ? updatedProject : p)));
            }}
          />
        )}
      </main>

      {/* CUSTOM CONFIRMATION MODAL FOR DELETING PROJECT */}
      {showPreSelectCountryModal && (
        <div id="pre-select-country-modal" className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden transform transition-all p-6 sm:p-8 space-y-6">
            <div className="text-center space-y-2">
              <div className="mx-auto w-12 h-12 bg-amber-50 rounded-full flex items-center justify-center text-amber-500">
                <Globe className="w-6 h-6 animate-pulse" />
              </div>
              <h3 className="font-sans font-extrabold text-slate-900 text-xl tracking-tight">
                Sélectionnez le Pays & Normes de Marché
              </h3>
              <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
                Configurez le pays de destination pour que l'intelligence artificielle calibre ses calculs, les devises de devis, la locale monétaire et les grilles fiscales associées.
              </p>
            </div>

            <div className="space-y-4">
              <label htmlFor="country-select" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Pays de destination :
              </label>
              <div className="relative">
                <select
                  id="country-select"
                  value={selectedCountryCode}
                  onChange={(e) => setSelectedCountryCode(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer appearance-none"
                >
                  {Object.values(COUNTRIES).map((country) => (
                    <option key={country.code} value={country.code}>
                      {country.flag} {country.name} ({country.currency})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>

              {/* Dynamic summary of the selected country */}
              {(() => {
                const country = COUNTRIES[selectedCountryCode];
                if (!country) return null;
                return (
                  <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 flex items-center gap-4 transition-all animate-fade-in">
                    <span className="text-4xl shadow-sm">{country.flag}</span>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-slate-800 tracking-tight font-sans">
                        {country.name}
                      </h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500">
                        <span>
                          <strong>Devise :</strong> {country.currency}
                        </span>
                        <span>
                          <strong>TVA par défaut :</strong> {country.defaultTva}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="flex justify-end gap-2.5 font-medium text-xs pt-4 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowPreSelectCountryModal(false);
                  setPreSelectCountryNextView(null);
                }}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
              >
                Annuler
              </button>
              <button
                onClick={() => {
                  setShowPreSelectCountryModal(false);
                  if (preSelectCountryNextView) {
                    setView(preSelectCountryNextView);
                  }
                }}
                className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 active:bg-slate-950 text-white rounded-lg transition-colors font-bold text-xs cursor-pointer"
              >
                Confirmer
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirmProjectId && (() => {
        const projectToDelete = projects.find((p) => p.id === deleteConfirmProjectId);
        if (!projectToDelete) return null;
        return (
          <div className="fixed inset-0 bg-slate-900/65 backdrop-blur-xs flex items-center justify-center p-4 z-55 no-print">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden transform transition-all p-6 space-y-4">
              <div className="flex items-center gap-3 text-rose-600">
                <div className="p-2 bg-rose-50 rounded-full">
                  <Trash2 className="w-6 h-6 text-rose-600" />
                </div>
                <h4 className="font-sans font-bold text-slate-900 text-base">Supprimer le projet ?</h4>
              </div>
              <p className="text-slate-600 text-xs leading-relaxed">
                Êtes-vous absolument sûr de vouloir supprimer définitivement le projet <strong>{projectToDelete.name}</strong> ?
              </p>
              <p className="text-slate-500 text-[10px] leading-relaxed bg-amber-50 text-amber-900 p-2.5 rounded-lg border border-amber-100">
                <strong>Attention :</strong> Cette action est irréversible. Toutes les situations de travaux associées à ce projet seront également supprimées définitivement de la base de données.
              </p>
              <div className="flex justify-end gap-2.5 font-medium text-xs pt-2 border-t border-slate-100">
                <button
                  onClick={() => setDeleteConfirmProjectId(null)}
                  className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer text-xs font-semibold"
                >
                  Annuler
                </button>
                <button
                  onClick={async () => {
                    const idToDelete = deleteConfirmProjectId;
                    setDeleteConfirmProjectId(null);
                    await handleDeleteProject(idToDelete);
                  }}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors cursor-pointer text-xs font-bold"
                >
                  Confirm Suppression
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      <footer className="bg-white border-t border-slate-100 py-6 text-center text-xs text-slate-400 font-sans mt-auto no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <p>© {new Date().getFullYear()} inaSuivi AI - Logiciel Professionnel d'Analyse de Marchés & Comptes Rendus Financiers.</p>
        </div>
      </footer>
    </div>
  );
}
