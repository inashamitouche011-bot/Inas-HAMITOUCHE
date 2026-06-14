import React from "react";
import { Project, User, COUNTRIES } from "../types";
import { 
  FolderGit2, 
  Calendar, 
  MapPin, 
  Sparkles, 
  Plus, 
  Trash2, 
  Milestone, 
  ArrowRight, 
  Layers, 
  FileDown
} from "lucide-react";

interface ProjectListProps {
  projects: Project[];
  currentUser?: User;
  onSelectProject: (id: string) => void;
  onUploadClick: () => void;
  onCreateManualClick: () => void;
  onCreateBimClick: () => void;
  onDeleteProject: (id: string) => void;
}

export default function ProjectList({
  projects,
  currentUser,
  onSelectProject,
  onUploadClick,
  onCreateManualClick,
  onCreateBimClick,
  onDeleteProject,
}: ProjectListProps) {
  // Stats
  const totalProjects = projects.length;
  const totalBudgetHT = projects.reduce((total, proj) => {
    return total + proj.workItems.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
  }, 0);

  // Helper to format currency
  const formatCurrency = (val: number) => {
    return val.toLocaleString("fr-DZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) + " DA";
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Intro section */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-sans font-bold text-slate-900 tracking-tight">
            Vos Chantiers de Construction
          </h1>
          <p className="text-slate-500 font-sans mt-1 text-sm">
            Pilotez les attachements, quantitatifs et situations de paiement mensuelles de vos chantiers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={onCreateBimClick}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-md transition-all scale-100 active:scale-95 text-xs cursor-pointer"
          >
            <Layers className="w-3.5 h-3.5" />
            BIM & Devis par Plan
          </button>
          <button
            onClick={onUploadClick}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-semibold rounded-lg shadow-md transition-all scale-100 active:scale-95 text-xs cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 fill-amber-400/20" />
            Nouveau Projet par IA
          </button>
          <button
            onClick={onCreateManualClick}
            className="flex items-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold rounded-lg shadow-md transition-all scale-100 active:scale-95 text-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Création Manuelle
          </button>
        </div>
      </div>

      {/* Professional Dashboard Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex items-center gap-4">
          <div className="bg-amber-100 text-amber-700 p-3 rounded-lg">
            <Layers className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">
              Projets surveillés
            </span>
            <span className="font-sans font-bold text-2xl text-slate-900">{totalProjects}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex items-center gap-4">
          <div className="bg-emerald-100 text-emerald-700 p-3 rounded-lg">
            <Milestone className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">
              Marché Global Géré (HT)
            </span>
            <span className="font-sans font-bold text-2xl text-slate-900">{formatCurrency(totalBudgetHT)}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 p-5 rounded-xl shadow-sm flex items-center gap-4 sm:col-span-2 lg:col-span-1">
          <div className="bg-indigo-100 text-indigo-700 p-3 rounded-lg">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-slate-500 block uppercase tracking-wider font-semibold">
              Espace de Travail
            </span>
            <span className="font-sans font-semibold text-lg text-slate-800">Local & Supabase Ready</span>
          </div>
        </div>
      </div>

      {/* Projects Grid List */}
      <div className="space-y-4">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          Chantiers Actifs
        </h3>

        {projects.length === 0 ? (
          <div className="bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400 max-w-lg mx-auto shadow-sm">
            <div className="bg-slate-50 text-slate-400 p-4 rounded-full w-fit mx-auto mb-4">
              <FolderGit2 className="w-10 h-10" />
            </div>
            <h4 className="font-sans font-bold text-slate-700 text-base">Aucun chantier crée</h4>
            <p className="text-xs text-slate-500 mt-2 mb-6">
              Pour commencer, téléchargez un contrat de travaux PDF, laissez l'IA estimer le devis d'après vos plans de niveau, ou saisissez-le manuellement !
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                onClick={onCreateBimClick}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-slate-800 text-white hover:text-amber-400 font-semibold rounded-lg shadow-md transition-all scale-100 active:scale-95 text-xs cursor-pointer"
              >
                <Layers className="w-3.5 h-3.5" />
                Estimer par plan (BIM/Devis)
              </button>
              <button
                onClick={onUploadClick}
                className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-semibold rounded-lg shadow-md transition-all scale-100 active:scale-95 text-xs cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 fill-amber-400/20" />
                Dépôt de devis / PDF par IA
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => {
              const itemsCount = project.workItems?.length || 0;
              const sitCount = project.situations?.length || 0;
              const projectBudget = project.workItems?.reduce((ac, cu) => ac + (cu.totalPrice || 0), 0) || 0;

              // Total approved progress estimation
              let avgProgress = 0;
              if (project.situations && project.situations.length > 0) {
                // Find latest situation
                const latest = [...project.situations].reduce((prev, current) => {
                  return (prev.number > current.number) ? prev : current;
                });
                
                // Calculate average or weighted progress
                const totalCompleted = Object.entries(latest.itemsProgress).reduce((acc, [itemId, progressPercent]) => {
                  const item = project.workItems.find(i => i.id === itemId);
                  if (item) {
                    return acc + (item.totalPrice * progressPercent) / 100;
                  }
                  return acc;
                }, 0);
                avgProgress = projectBudget > 0 ? (totalCompleted / projectBudget) * 100 : 0;
              }

              return (
                <div
                  key={project.id}
                  className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all flex flex-col group"
                >
                  <div className="bg-slate-900 p-5 text-white relative">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteProject(project.id);
                      }}
                      className="absolute top-4 right-4 text-slate-400 hover:text-red-400 p-1 rounded-md bg-slate-800 hover:bg-slate-750 border border-slate-750 transition-colors cursor-pointer"
                      title="Supprimer le projet"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    <h4 className="font-sans font-bold text-base line-clamp-1 pr-6 tracking-tight text-white/95 group-hover:text-amber-400 transition-colors flex items-center gap-1.5">
                      <span className="text-lg">{(COUNTRIES[project.countryCode || 'DZ'] || COUNTRIES.DZ).flag}</span>
                      <span className="truncate">{project.name}</span>
                    </h4>
                    <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1.5 font-sans">
                      <MapPin className="w-3 h-3 text-amber-400" />
                      {project.location || "Localisation non précisée"}
                    </p>

                    {project.isOfflinePending && (
                      <div className="mt-2.5">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase tracking-wider animate-pulse">
                          ⌛ Hors-ligne (Synchro Automatique)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed italic">
                      {project.description || "Pas de description additionnelle de travaux."}
                    </p>

                    <div className="grid grid-cols-2 gap-3 text-xs border-y border-slate-50 py-3.5">
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          Architecte / MOE
                        </span>
                        <span className="font-sans font-semibold text-slate-800 truncate block">
                          {project.supervisor || "Non assigné"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                          Maître d'Ouvrage
                        </span>
                        <span className="font-sans font-semibold text-slate-800 truncate block">
                          {project.clientName || "Non spécifié"}
                        </span>
                      </div>
                    </div>

                    {/* Progress indicator */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-slate-500 font-sans">Avancement Global cumulé</span>
                        <span className="font-bold text-slate-900">{avgProgress.toFixed(1)}%</span>
                      </div>
                      <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(avgProgress, 100)}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <div className="font-mono">
                        <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-sans">
                          Montant Marché (HT)
                        </span>
                        <span className="font-bold text-sm text-slate-800">
                          {(() => {
                            const cConfig = COUNTRIES[project.countryCode || 'DZ'] || COUNTRIES.DZ;
                            return projectBudget.toLocaleString(cConfig.locale, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2
                            }) + " " + cConfig.currency;
                          })()}
                        </span>
                      </div>

                      <button
                        onClick={() => onSelectProject(project.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-semibold tracking-tight transition-colors cursor-pointer"
                      >
                        Ouvrir
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="bg-slate-50 px-5 py-2.5 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3 h-3 text-slate-450" />
                      {itemsCount} Postes de travaux
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-450" />
                      {sitCount} Situations mensuelles
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
