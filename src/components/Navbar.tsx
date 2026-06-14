import { User } from "../types";
import { HardHat, LogOut, Briefcase, UserCheck2 } from "lucide-react";

interface NavbarProps {
  user: User;
  onLogout: () => void;
}

export default function Navbar({ user, onLogout }: NavbarProps) {
  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "architect":
        return "Architecte / MŒ";
      case "supervisor":
        return "Conducteur de Travaux / Superviseur";
      case "client":
        return "Maître d'Ouvrage";
      default:
        return "Superviseur";
    }
  };

  return (
    <nav className="bg-slate-900 text-white shadow-lg border-b border-slate-800 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 text-slate-950 p-1.5 rounded-lg font-bold flex items-center justify-center">
              <HardHat className="w-5 h-5" />
            </div>
            <div className="flex flex-col">
              <span className="font-sans font-bold text-base tracking-tight leading-none flex items-center gap-2">
                inaSuivi <span className="text-amber-400">AI</span>
                {user.dbStatus?.mode === "supabase" && (
                  <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[9px] font-extrabold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 leading-none tracking-wide animate-pulse">
                    Cloud Actif
                  </span>
                )}
              </span>
              <span className="text-[10px] text-slate-400 font-sans tracking-wide">
                SYSTEME DE CONTRAT & SITUATION DE TRAVAUX
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-6">
            <div className="hidden md:flex items-center gap-3 border-r border-slate-800 pr-5">
              <div className="text-right">
                <div className="text-sm font-semibold flex items-center gap-1.5 text-slate-100">
                  <UserCheck2 className="w-3.5 h-3.5 text-amber-400" />
                  {user.name || "Collaborateur"}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center gap-1 justify-end font-mono">
                  <Briefcase className="w-2.5 h-2.5" />
                  {user.company || "Cabinet indépendant"} • {getRoleLabel(user.role)}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onLogout}
                className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-xs font-medium border border-slate-750 transition-colors cursor-pointer"
                title="Se déconnecter"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Déconnexion</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
