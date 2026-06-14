import React, { useState, useEffect } from "react";
import { 
  initGoogleAuth, 
  googleSignIn, 
  logoutGoogle, 
  getAccessToken 
} from "../lib/googleAuth";
import { 
  listDriveFiles, 
  downloadDriveFile, 
  GoogleDriveFile 
} from "../lib/googleDriveService";
import { 
  FolderOpen, 
  FileText, 
  FileSpreadsheet, 
  Image as ImageIcon, 
  Search, 
  LogOut, 
  RefreshCw, 
  Cloud, 
  Download, 
  Loader2, 
  Check, 
  X,
  AlertTriangle
} from "lucide-react";
import { User as FirebaseUser } from "firebase/auth";

interface GoogleDrivePickerProps {
  onFileSelected: (file: File) => void;
  onClose?: () => void;
  allowedExtensions?: string[]; // e.g. ['.pdf', '.xlsx', '.xls', '.csv', '.png', '.jpg']
}

export default function GoogleDrivePicker({ onFileSelected, onClose, allowedExtensions }: GoogleDrivePickerProps) {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [downloadingFileId, setDownloadingFileId] = useState<string | null>(null);
  const [files, setFiles] = useState<GoogleDriveFile[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState<'all' | 'pdf' | 'excel' | 'image'>('all');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Initialize Auth state
  useEffect(() => {
    const unsubscribe = initGoogleAuth(
      (currentUser, currentToken) => {
        setUser(currentUser);
        setToken(currentToken);
        setLoadingAuth(false);
        fetchFiles(currentToken);
      },
      () => {
        setUser(null);
        setToken(null);
        setLoadingAuth(false);
      }
    );

    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Fetch files from Google Drive
  const fetchFiles = async (accessToken: string) => {
    setLoadingFiles(true);
    setError(null);
    try {
      const driveFiles = await listDriveFiles(accessToken);
      setFiles(driveFiles);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur lors du chargement des fichiers Google Drive.");
    } finally {
      setLoadingFiles(false);
    }
  };

  const handleLogin = async () => {
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        setUser(result.user);
        setToken(result.accessToken);
        fetchFiles(result.accessToken);
      }
    } catch (err: any) {
      setError("La connexion a échoué. Veuillez autoriser les fenêtres pop-up.");
    }
  };

  const handleLogout = async () => {
    try {
      await logoutGoogle();
      setUser(null);
      setToken(null);
      setFiles([]);
    } catch (err: any) {
      setError("Erreur lors de la déconnexion.");
    }
  };

  const handleSelectFile = async (driveFile: GoogleDriveFile) => {
    if (!token) return;
    setDownloadingFileId(driveFile.id);
    setError(null);
    try {
      const fileObj = await downloadDriveFile(
        token,
        driveFile.id,
        driveFile.name,
        driveFile.mimeType
      );
      setSuccessMsg(`Fichier "${driveFile.name}" importé avec succès !`);
      setTimeout(() => {
        onFileSelected(fileObj);
        if (onClose) onClose();
      }, 1000);
    } catch (err: any) {
      setError(`Erreur d'importation : ${err.message}`);
    } finally {
      setDownloadingFileId(null);
    }
  };

  // Filter files by tab and search query
  const filteredFiles = files.filter(f => {
    const matchesSearch = f.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    const isPdf = f.mimeType === 'application/pdf' || f.name.endsWith('.pdf');
    const isExcel = f.mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
                    f.mimeType === 'application/vnd.ms-excel' || 
                    f.name.endsWith('.xlsx') || f.name.endsWith('.xls') || f.name.endsWith('.csv');
    const isImg = f.mimeType.startsWith('image/');

    if (activeTab === 'pdf') return matchesSearch && isPdf;
    if (activeTab === 'excel') return matchesSearch && isExcel;
    if (activeTab === 'image') return matchesSearch && isImg;

    // Filter based on allowedExtensions list if supplied
    if (allowedExtensions && allowedExtensions.length > 0) {
      const ext = f.name.substring(f.name.lastIndexOf('.')).toLowerCase();
      return matchesSearch && allowedExtensions.includes(ext);
    }

    return matchesSearch;
  });

  const getFileIcon = (mimeType: string, name: string) => {
    if (mimeType === 'application/pdf' || name.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    }
    if (mimeType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
        mimeType === 'application/vnd.ms-excel' || 
        name.endsWith('.xlsx') || name.endsWith('.xls')) {
      return <FileSpreadsheet className="w-5 h-5 text-emerald-500" />;
    }
    if (mimeType.startsWith('image/')) {
      return <ImageIcon className="w-5 h-5 text-blue-500" />;
    }
    return <FolderOpen className="w-5 h-5 text-slate-500" />;
  };

  const getFormatSize = (sizeStr?: string) => {
    if (!sizeStr) return "Inconnu";
    const size = parseInt(sizeStr);
    if (isNaN(size)) return "Inconnu";
    if (size < 1024) return size + " B";
    if (size < 1048576) return (size / 1024).toFixed(1) + " Ko";
    return (size / 1048576).toFixed(1) + " Mo";
  };

  return (
    <div className="bg-slate-900/10 backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-2xl w-full overflow-hidden flex flex-col max-h-[85vh] animate-fade-in">
        
        {/* Header */}
        <div className="bg-slate-900 p-5 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Cloud className="w-5 h-5 text-amber-500 animate-pulse" />
            <h3 className="font-sans font-bold text-base tracking-tight text-white flex items-center gap-1.5">
              Serveur de fichiers <span className="text-amber-400">Google Drive</span>
            </h3>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Inner Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-3.5 rounded-xl text-xs flex items-center gap-2.5">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {loadingAuth ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-500">
              <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
              <span className="text-xs">Chargement du service d'accès Google...</span>
            </div>
          ) : !user ? (
            /* Google Connection Request */
            <div className="text-center py-10 px-4 space-y-5">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto text-amber-500 border border-slate-100">
                <Cloud className="w-8 h-8" />
              </div>
              <div className="space-y-1">
                <h4 className="font-bold text-slate-800 text-sm">Authentification Google Requise</h4>
                <p className="text-slate-500 text-xs max-w-sm mx-auto leading-relaxed">
                  Pour importer vos métrés, plans BIM ou modèles d'estimations directement depuis Google Drive, connectez votre compte de manière sécurisée.
                </p>
              </div>

              <div className="flex justify-center pt-2">
                <button
                  onClick={handleLogin}
                  className="gsi-material-button inline-flex items-center justify-center border border-slate-250 bg-white hover:bg-slate-50 text-slate-700 px-5 py-2.5 rounded-xl shadow-md font-sans text-xs font-bold transition-all cursor-pointer"
                >
                  <div className="gsi-material-button-state"></div>
                  <div className="gsi-material-button-content-wrapper flex items-center gap-3">
                    <div className="gsi-material-button-icon shrink-0">
                      <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" style={{ display: 'block', width: 18, height: 18 }}>
                        <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                        <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                        <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                        <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      </svg>
                    </div>
                    <span className="font-semibold text-slate-800 text-xs">Se connecter avec Google</span>
                  </div>
                </button>
              </div>
            </div>
          ) : (
            /* Listing drive files */
            <>
              {/* Account details & Disconnect */}
              <div className="bg-slate-50 rounded-xl p-3 flex items-center justify-between border border-slate-100 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></div>
                  <span className="text-slate-600 font-medium">Session active :</span>
                  <span className="text-slate-800 font-bold">{user.email}</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center gap-1 px-2 py-1 text-[11px] text-slate-500 hover:text-red-600 rounded hover:bg-red-50 transition-colors cursor-pointer"
                  title="Déconnexion temporaire Google Drive"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Déconnexion</span>
                </button>
              </div>

              {/* Search & Refresh */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Rechercher des devis, PDF, Excel dans Drive..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-800 transition-all focus:outline-none focus:ring-2 focus:ring-amber-500/10 focus:border-amber-500 font-medium"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      Effacer
                    </button>
                  )}
                </div>
                <button 
                  onClick={() => fetchFiles(token!)}
                  disabled={loadingFiles}
                  className="p-2.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-50 border border-slate-200 rounded-xl text-slate-600 transition-colors cursor-pointer"
                  title="Actualiser les fichiers"
                >
                  <RefreshCw className={`w-4 h-4 ${loadingFiles ? 'animate-spin text-amber-500' : ''}`} />
                </button>
              </div>

              {/* Categorization tabs */}
              <div className="flex items-center gap-1.5 border-b border-slate-100 pb-1 font-sans text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <button
                  onClick={() => setActiveTab('all')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${activeTab === 'all' ? 'bg-slate-900 text-white' : 'hover:bg-slate-50 hover:text-slate-800'}`}
                >
                  Tous
                </button>
                <button
                  onClick={() => setActiveTab('pdf')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${activeTab === 'pdf' ? 'bg-red-50 text-red-700 border border-red-100' : 'hover:bg-slate-50 hover:text-slate-800'}`}
                >
                  Document PDF
                </button>
                <button
                  onClick={() => setActiveTab('excel')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${activeTab === 'excel' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'hover:bg-slate-50 hover:text-slate-800'}`}
                >
                  Feuille Excel
                </button>
                <button
                  onClick={() => setActiveTab('image')}
                  className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${activeTab === 'image' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'hover:bg-slate-50 hover:text-slate-800'}`}
                >
                  Images / Plans
                </button>
              </div>

              {/* File list */}
              {loadingFiles ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
                  <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
                  <span className="text-xs">Chargement de votre Drive Google...</span>
                </div>
              ) : filteredFiles.length === 0 ? (
                <div className="text-center py-16 border-2 border-dashed border-slate-100 rounded-2xl">
                  <FolderOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-600">Aucun fichier trouvé</p>
                  <p className="text-[10px] text-slate-400 max-w-xs mx-auto mt-1 leading-relaxed">
                    Ajoutez des devis PDF, des fichiers et métres Excel dans votre Google Drive pour qu'ils s'affichent ici.
                  </p>
                </div>
              ) : (
                <div className="space-y-1.5 max-h-[350px] overflow-y-auto pr-1">
                  {filteredFiles.map((f) => (
                    <div 
                      key={f.id}
                      className="group border border-slate-100 rounded-xl p-3 hover:bg-amber-500/5 hover:border-amber-500/20 flex items-center justify-between gap-4 transition-all"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 bg-slate-50 group-hover:bg-white rounded-lg shrink-0 border border-slate-100 transition-colors">
                          {getFileIcon(f.mimeType, f.name)}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-800 text-xs truncate max-w-[300px] sm:max-w-[360px] group-hover:text-amber-600 font-sans tracking-tight">
                            {f.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-400 font-mono">
                            <span>{getFormatSize(f.size)}</span>
                            <span>•</span>
                            <span>Modifié le {f.createdTime ? new Date(f.createdTime).toLocaleDateString("fr-DZ") : 'Inconnu'}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleSelectFile(f)}
                        disabled={downloadingFileId !== null}
                        className="px-3 py-1.5 bg-slate-900 border border-slate-800 hover:bg-amber-500 hover:border-amber-600 hover:text-slate-950 text-white rounded-lg transition-all text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-40"
                      >
                        {downloadingFileId === f.id ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span className="hidden sm:inline">Importation...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Importer</span>
                          </>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}

        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-100 p-4 flex justify-end gap-2 text-xs font-semibold">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
