import React, { useState, useEffect } from "react";
import { api } from "../lib/api";
import { User } from "../types";
import { 
  Building2, 
  UserSquare2, 
  Eye, 
  EyeOff, 
  Lock, 
  Mail, 
  HardHat, 
  Briefcase, 
  ArrowLeft, 
  CheckCircle2, 
  KeyRound,
  Database,
  Cpu
} from "lucide-react";

interface AuthScreenProps {
  onAuthSuccess: (user: User) => void;
}

export default function AuthScreen({ onAuthSuccess }: AuthScreenProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  
  // Database status state
  const [dbStatus, setDbStatus] = useState<{ mode: "supabase" | "local"; connected: boolean; message: string; url?: string; rlsWarning?: boolean } | null>(null);

  // Isolated Login states to avoid autofill bugs and crossings
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");

  // Isolated Register states
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerCompany, setRegisterCompany] = useState("");
  const [registerRole, setRegisterRole] = useState<'architect' | 'supervisor' | 'client'>("supervisor");

  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Forgot password specific states
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1); // 1 = enter email, 2 = challenge & change password, 3 = success
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotVerification, setForgotVerification] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [forgotNeedsVerify, setForgotNeedsVerify] = useState(false);
  const [forgotCompanyHint, setForgotCompanyHint] = useState("");
  const [forgotNameHint, setForgotNameHint] = useState("");
  const [forgotMessage, setForgotMessage] = useState("");

  // Load database status once
  useEffect(() => {
    async function loadStatus() {
      try {
        const status = await api.auth.getDbStatus();
        setDbStatus(status);
      } catch (err) {
        console.warn("Failed to fetch database engine status:", err);
      }
    }
    loadStatus();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        const cleanEmail = loginEmail.trim();
        const cleanPassword = loginPassword;
        if (!cleanEmail || !cleanPassword) {
          setError("Veuillez saisir votre e-mail et mot de passe.");
          setLoading(false);
          return;
        }
        const user = await api.auth.login(cleanEmail, cleanPassword);
        onAuthSuccess(user);
      } else {
        const cleanEmail = registerEmail.trim();
        const cleanPassword = registerPassword;
        const cleanName = registerName.trim();
        const cleanCompany = registerCompany.trim();
        if (!cleanEmail || !cleanPassword || !cleanName || !cleanCompany) {
          setError("Veuillez remplir tous les champs requis.");
          setLoading(false);
          return;
        }
        const user = await api.auth.register({
          email: cleanEmail,
          passwordHash: cleanPassword, // The server performs SHA256 hashing natively
          name: cleanName,
          company: cleanCompany,
          role: registerRole,
        });
        onAuthSuccess(user);
      }
    } catch (err: any) {
      setError(err.message || "Identifiants incorrects ou erreur de serveur.");
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const user = await api.auth.loginDemo();
      onAuthSuccess(user);
    } catch (err: any) {
      setError(err.message || "Erreur de connexion au compte démo.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim();
    if (!cleanEmail) {
      setError("Veuillez saisir votre adresse email.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.resetPasswordRequest(cleanEmail);
      if (res.success) {
        setForgotNeedsVerify(res.needsVerification);
        setForgotCompanyHint(res.companyHint || "");
        setForgotNameHint(res.nameHint || "");
        setForgotStep(2);
      }
    } catch (err: any) {
      setError(err.message || "Impossible de trouver votre compte.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanEmail = forgotEmail.trim();
    const cleanVerification = forgotVerification.trim();
    if (forgotNeedsVerify && !cleanVerification) {
      setError("La réponse de vérification est obligatoire.");
      return;
    }
    if (!forgotNewPassword) {
      setError("Le nouveau mot de passe est obligatoire.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.auth.resetPasswordVerify({
        email: cleanEmail,
        verificationValue: cleanVerification,
        newPassword: forgotNewPassword,
      });
      if (res.success) {
        setForgotMessage(res.message);
        setForgotStep(3);
      }
    } catch (err: any) {
      setError(err.message || "Échec de la réinitialisation.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 left-4 flex items-center gap-2">
        <div className="bg-amber-500 text-slate-900 p-2 rounded-lg font-bold flex items-center justify-center shadow-md">
          <HardHat className="w-6 h-6" />
        </div>
        <span className="font-sans font-bold text-slate-800 text-lg tracking-tight">
          inaSuivi <span className="text-amber-500">AI</span>
        </span>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="bg-slate-900 text-amber-400 p-4 rounded-full shadow-lg">
            {isForgotPassword ? (
              <KeyRound className="w-10 h-10" />
            ) : (
              <Building2 className="w-10 h-10" />
            )}
          </div>
        </div>
        <h2 className="mt-6 text-center text-3xl font-sans font-bold tracking-tight text-slate-900">
          {isForgotPassword 
            ? "Mot de passe oublié" 
            : isLogin 
              ? "Accéder à votre espace" 
              : "Créer un compte professionnel"}
        </h2>
        <p className="mt-2 text-center text-sm text-slate-600">
          {isForgotPassword 
            ? "Suivez les étapes sécurisées pour modifier votre mot de passe"
            : "Suivi de Chantier & Situations de Travaux Intelligentes"
          }
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 shadow-xl rounded-2xl border border-slate-100 sm:px-10">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          {isForgotPassword ? (
            <div>
              {forgotStep === 1 && (
                <form onSubmit={handleForgotRequest} className="space-y-5">
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Saisissez l'adresse e-mail associée à votre compte inaSuivi. Nous vérifierons sa présence dans la base de données.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Adresse email du compte
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-5 h-5" />
                      </div>
                      <input
                        type="email"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="nom@exemple.com"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsForgotPassword(false);
                        setError(null);
                      }}
                      className="flex-1 flex justify-center items-center gap-1 py-2 px-3 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
                    >
                      <ArrowLeft className="w-4 h-4" /> Retour
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 flex justify-center py-2 px-3 border border-transparent rounded-lg shadow-md text-sm font-semibold text-slate-900 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? "Vérification..." : "Vérifier l'email"}
                    </button>
                  </div>
                </form>
              )}

              {forgotStep === 2 && (
                <form onSubmit={handleForgotVerify} className="space-y-5">
                  <div className="bg-emerald-50 border border-emerald-100 p-3 rounded-lg text-[11px] text-emerald-800 leading-relaxed">
                    ✓ Compte e-mail identifié avec succès.
                  </div>

                  {forgotNeedsVerify && (
                    <div className="space-y-3 p-3.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                        Validation d'identité requise
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Par mesure de sécurité, veuillez confirmer l'une des deux informations associées à votre profil :
                      </p>

                      {forgotCompanyHint && (
                        <div>
                          <label className="block text-[11.5px] font-medium text-slate-700 mb-1">
                            Nom de l'entreprise (Indice: <code className="bg-amber-100 px-1 font-mono text-slate-950 font-semibold">{forgotCompanyHint}</code>)
                          </label>
                          <input
                            type="text"
                            value={forgotVerification}
                            onChange={(e) => setForgotVerification(e.target.value)}
                            placeholder="Saisissez le nom exact"
                            className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                          />
                        </div>
                      )}

                      {!forgotCompanyHint && forgotNameHint && (
                        <div>
                          <label className="block text-[11.5px] font-medium text-slate-700 mb-1">
                            Nom complet (Indice: <code className="bg-amber-100 px-1 font-mono text-slate-950 font-semibold">{forgotNameHint}</code>)
                          </label>
                          <input
                            type="text"
                            value={forgotVerification}
                            onChange={(e) => setForgotVerification(e.target.value)}
                            placeholder="Saisissez votre nom"
                            className="block w-full px-3 py-1.5 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 text-xs"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Nouveau mot de passe
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-5 h-5" />
                      </div>
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        value={forgotNewPassword}
                        onChange={(e) => setForgotNewPassword(e.target.value)}
                        placeholder="Saisissez votre nouveau mot de passe"
                        className="block w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-5 h-5" /> : <Eye className="h-5 h-5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => setForgotStep(1)}
                      className="flex-1 flex justify-center items-center gap-1 py-2 px-3 border border-slate-200 rounded-lg text-sm font-semibold text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
                    >
                      Retour
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="flex-1 flex justify-center py-2 px-3 border border-transparent rounded-lg shadow-md text-sm font-semibold text-slate-900 bg-amber-500 hover:bg-amber-600 disabled:opacity-60 cursor-pointer"
                    >
                      {loading ? "Mise à jour..." : "Réinitialiser"}
                    </button>
                  </div>
                </form>
              )}

              {forgotStep === 3 && (
                <div className="text-center space-y-4">
                  <div className="flex justify-center">
                    <CheckCircle2 className="w-16 h-16 text-emerald-500" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900">Mot de passe réinitialisé !</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {forgotMessage || "Votre mot de passe a bien été enregistré. Vous pouvez dès maintenant vous connecter."}
                  </p>
                  <button
                    onClick={() => {
                      setIsForgotPassword(false);
                      setForgotStep(1);
                      setForgotEmail("");
                      setForgotVerification("");
                      setForgotNewPassword("");
                      setError(null);
                    }}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-slate-900 bg-amber-500 hover:bg-amber-600 cursor-pointer"
                  >
                    Retourner à la connexion
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div>
              {isLogin ? (
                <form id="login-form" key="login-form" className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="login-email" className="block text-sm font-medium text-slate-700 mb-1">
                      Adresse email
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-5 h-5" />
                      </div>
                      <input
                        key="login-email-input"
                        id="login-email"
                        name="email"
                        autoComplete="username"
                        type="email"
                        required
                        value={loginEmail}
                        onChange={(e) => setLoginEmail(e.target.value)}
                        placeholder="nom@exemple.com"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <label htmlFor="login-password" className="block text-sm font-medium text-slate-700">
                        Mot de passe
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setIsForgotPassword(true);
                          setForgotStep(1);
                          setError(null);
                          setForgotEmail(loginEmail); // pull current login email if entered
                        }}
                        className="text-xs font-semibold text-amber-600 hover:text-amber-700 focus:outline-none cursor-pointer"
                      >
                        Mot de passe oublié ?
                      </button>
                    </div>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-5 h-5" />
                      </div>
                      <input
                        key="login-password-input"
                        id="login-password"
                        name="password"
                        autoComplete="current-password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={loginPassword}
                        onChange={(e) => setLoginPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-5 h-5" /> : <Eye className="h-5 h-5 animate-pulse" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-slate-900 bg-amber-500 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors disabled:opacity-60 cursor-pointer font-sans"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <span className="animate-spin text-slate-900">⏳</span> Connexion...
                      </div>
                    ) : (
                      "Se connecter"
                    )}
                  </button>
                </form>
              ) : (
                <form id="register-form" key="register-form" className="space-y-4" onSubmit={handleSubmit}>
                  <div>
                    <label htmlFor="register-name" className="block text-sm font-medium text-slate-700 mb-1">
                      Nom complet
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <UserSquare2 className="h-5 h-5" />
                      </div>
                      <input
                        key="register-name-input"
                        id="register-name"
                        name="name"
                        autoComplete="name"
                        type="text"
                        required
                        value={registerName}
                        onChange={(e) => setRegisterName(e.target.value)}
                        placeholder="Jean Demas"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="register-company" className="block text-sm font-medium text-slate-700 mb-1">
                      Entreprise / Cabinet d'Architecture
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Briefcase className="h-5 h-5" />
                      </div>
                      <input
                        key="register-company-input"
                        id="register-company"
                        name="company"
                        autoComplete="organization"
                        type="text"
                        required
                        value={registerCompany}
                        onChange={(e) => setRegisterCompany(e.target.value)}
                        placeholder="SARL BatiSuivi"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="register-role" className="block text-sm font-medium text-slate-700 mb-1">
                      Votre Rôle Professionnel
                    </label>
                    <select
                      id="register-role"
                      value={registerRole}
                      onChange={(e: any) => setRegisterRole(e.target.value)}
                      className="block w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm bg-white"
                    >
                      <option value="architect">Architecte / Maître d'Œuvre (MŒ)</option>
                      <option value="supervisor">Superviseur de Chantier / Conducteur</option>
                      <option value="client">Maître d'Ouvrage (MCO / Client)</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="register-email" className="block text-sm font-medium text-slate-700 mb-1">
                      Adresse email
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Mail className="h-5 h-5" />
                      </div>
                      <input
                        key="register-email-input"
                        id="register-email"
                        name="email"
                        autoComplete="email"
                        type="email"
                        required
                        value={registerEmail}
                        onChange={(e) => setRegisterEmail(e.target.value)}
                        placeholder="architecte@chantier.fr"
                        className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="register-password" className="block text-sm font-medium text-slate-700 mb-1">
                      Mot de passe
                    </label>
                    <div className="relative rounded-md shadow-sm">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                        <Lock className="h-5 h-5" />
                      </div>
                      <input
                        key="register-password-input"
                        id="register-password"
                        name="new-password"
                        autoComplete="new-password"
                        type={showPassword ? "text" : "password"}
                        required
                        value={registerPassword}
                        onChange={(e) => setRegisterPassword(e.target.value)}
                        placeholder="••••••••"
                        className="block w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none"
                      >
                        {showPassword ? <EyeOff className="h-5 h-5" /> : <Eye className="h-5 h-5 animate-pulse" />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-lg shadow-md text-sm font-semibold text-slate-900 bg-amber-500 hover:bg-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 transition-colors disabled:opacity-60 cursor-pointer font-sans"
                  >
                    {loading ? (
                      <div className="flex items-center gap-2">
                        <span className="animate-spin text-slate-900">⏳</span> Inscription...
                      </div>
                    ) : (
                      "Créer mon compte"
                    )}
                  </button>
                </form>
              )}
            </div>
          )}

          {!isForgotPassword && (
            <div className="mt-6 border-t border-slate-100 pt-6">
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setError(null);
                }}
                className="w-full text-center text-sm font-semibold text-slate-800 hover:text-slate-950 focus:outline-none cursor-pointer"
              >
                {isLogin
                  ? "Nouveau sur inaSuivi ? Créer un compte professionnel"
                  : "Vous avez déjà un compte ? Connectez-vous"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
