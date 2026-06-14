import React, { useState, useRef } from "react";
import { api } from "../lib/api";
import { OCRResult, WorkItem, COUNTRIES } from "../types";
import { FileDown, FileUp, Sparkles, Check, AlertCircle, Trash2, Plus, Edit3, Loader2, Cloud } from "lucide-react";
import GoogleDrivePicker from "./GoogleDrivePicker";

interface ContractUploadProps {
  onProjectCreated: () => void;
  onCancel: () => void;
  countryCode: 'DZ' | 'FR' | 'MA' | 'TN' | 'CI' | 'SN' | 'EG' | 'LY' | 'MR' | 'ES' | 'IT' | 'BE' | 'DE' | 'CH' | 'US';
}

export default function ContractUpload({ onProjectCreated, onCancel, countryCode }: ContractUploadProps) {
  const [mode, setMode] = useState<'extract' | 'generate_plan'>('extract');
  const [showDrivePicker, setShowDrivePicker] = useState(false);
  const [floor, setFloor] = useState("Rez-de-chaussée");
  const [description, setDescription] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressMsg, setProgressMsg] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Extracted data state
  const [extractedData, setExtractedData] = useState<OCRResult | null>(null);
  const [projectName, setProjectName] = useState("");
  const [clientName, setClientName] = useState("");
  const [contractor, setContractor] = useState("");
  const [location, setLocation] = useState("");
  const [tvaRate, setTvaRate] = useState(() => COUNTRIES[countryCode]?.defaultTva ?? 20);
  const [retentionRate, setRetentionRate] = useState(5);
  const [workItems, setWorkItems] = useState<Omit<WorkItem, "id">[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      const isExcel = droppedFile.name.endsWith(".xlsx") || droppedFile.name.endsWith(".xls") || droppedFile.name.endsWith(".csv") || droppedFile.type.includes("excel") || droppedFile.type.includes("sheet");
      if (droppedFile.type === "application/pdf" || droppedFile.type.startsWith("image/") || isExcel) {
        setFile(droppedFile);
        setError(null);
      } else {
        setError("Veuillez déposer un fichier PDF, une image scannée, ou une feuille Excel.");
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setError(null);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  // Base64 converter helper
  const convertToBase64 = (fileObj: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileObj);
      reader.onload = () => {
        // format is: "data:application/pdf;base64,....." -> we extract the base64 payload part
        const resultStr = reader.result as string;
        const base64Content = resultStr.split(",")[1];
        resolve(base64Content);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  // Parse the contract PDF / Scanned image or Generate by plan & description
  const handleParseContract = async () => {
    if (mode === "extract" && !file) {
      setError("Veuillez sélectionner un document de devis physique (PDF, Excel ou Image).");
      return;
    }

    if (mode === "generate_plan" && !description.trim()) {
      setError("Veuillez renseigner un descriptif technique détaillé des travaux à estimer.");
      return;
    }

    setLoading(true);
    setError(null);
    setExtractedData(null);

    // Dynamic loading status messages designed to entertain and inform
    const messages = mode === "extract" ? [
      "Initialisation du moteur OCR intelligent...",
      "Chargement du document dans Gemini 3.5-Flash...",
      "Analyse de la structure des pages et détection des grilles...",
      "Sécurisation des lignes et détection automatique des codes de travaux...",
      "Extraction des désignations, quantités et prix unitaires...",
      "Recalcul automatique du montant total initial...",
      "Identification du maître d'ouvrage, de l'entreprise et de la localisation...",
      "Correction orthographique et finalisation du JSON de chantier...",
    ] : [
      "Analyse en cours du plan d'architecture du niveau...",
      "Lecture des cotes, surfaces et épaisseurs de murs...",
      "Intégration du descriptif technique détaillé...",
      "Estimation quantitative pièce par pièce pour l'étage : " + floor + "...",
      "Vérification des ratios professionnels du bâtiment...",
      "Déduction des prix unitaires professionnels (PU HT)...",
      "Génération du dossier de Devis Quantitatif Estimatif...",
      "Précision et équilibrage des lots et totaux...",
    ];

    let msgIdx = 0;
    setProgressMsg(messages[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % messages.length;
      setProgressMsg(messages[msgIdx]);
    }, 4000);

    try {
      let b64: string | null = null;
      let fType: string | null = null;
      if (file) {
        b64 = await convertToBase64(file);
        fType = file.type;
      }

      let res: OCRResult;
      if (mode === "extract") {
        res = await api.projects.extract(b64!, fType!, countryCode);
      } else {
        res = await api.projects.generateByPlan(b64, fType, countryCode, floor, description);
      }

      clearInterval(interval);
      setExtractedData(res);

      // Map metadata outputs to local values
      setProjectName(res.metadata?.name || (mode === "extract" ? file!.name.replace(/\.[^/.]+$/, "") : `Estimation Devis - ${floor}`));
      setClientName(res.metadata?.clientName || "Maître d'Ouvrage Estimé");
      setContractor(res.metadata?.contractor || "Entreprise Estimée");
      setLocation(res.metadata?.location || "Chantier d'estimation");
      const mappedItems = (res.workItems || []).map((item: any) => ({
        ...item,
        lot: item.lot || "Lot Général",
      }));
      setWorkItems(mappedItems);
    } catch (err: any) {
      clearInterval(interval);
      setError(err.message || "Impossible d'analyser le document ou de générer le devis. Vérifiez que la taille est raisonnable ou peaufinez le descriptif.");
    } finally {
      setLoading(false);
    }
  };

  // Editable fields handlers
  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...workItems];
    let typedValue = value;

    if (field === "quantity" || field === "unitPrice") {
      typedValue = parseFloat(value) || 0;
    }

    updated[index] = {
      ...updated[index],
      [field]: typedValue,
    };

    // Auto update total price on quantity or unitPrice change
    if (field === "quantity" || field === "unitPrice") {
      updated[index].totalPrice = Number((updated[index].quantity * updated[index].unitPrice).toFixed(2));
    }

    setWorkItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setWorkItems(workItems.filter((_, idx) => idx !== index));
  };

  const handleAddItem = () => {
    const lastLot = workItems.length > 0 ? (workItems[workItems.length - 1] as any).lot : "Lot Général";
    setWorkItems([
      ...workItems,
      {
        code: `${workItems.length + 1}`,
        designation: "Nouveau poste de travaux",
        unit: "m³",
        quantity: 1,
        unitPrice: 0,
        totalPrice: 0,
        lot: lastLot || "Lot Général",
      },
    ]);
  };

  // Create the project in database
  const handleCreateProject = async () => {
    if (!projectName.trim()) {
      setError("Le nom de projet est requis.");
      return;
    }

    setLoading(true);
    try {
      // Map temporary items to final objects
      const itemsWithIds = workItems.map((item) => ({
        ...item,
        id: "item_" + Math.random().toString(36).substring(2, 9),
      }));

      await api.projects.create({
        name: projectName,
        description: mode === "extract" 
          ? `Créé par IA le ${new Date().toLocaleDateString("fr-FR")} à partir de ${file?.name || "contrat"}`
          : `Généré à partir de plans et descriptifs techniques pour le niveau : ${floor} (${new Date().toLocaleDateString("fr-FR")})`,
        clientName,
        contractor,
        supervisor: "", // Let user set this or default
        location,
        tvaRate,
        retentionRate,
        countryCode,
        contractDate: new Date().toISOString().split("T")[0],
        workItems: itemsWithIds,
      });

      onProjectCreated();
    } catch (err: any) {
      setError(err.message || "Erreur de création de projet");
    } finally {
      setLoading(false);
    }
  };

  // Calc metrics of current tables
  const totalMarketHT = workItems.reduce((acc, curr) => acc + (curr.totalPrice || 0), 0);
  const totalTVA = (totalMarketHT * tvaRate) / 100;
  const totalMarketTTC = totalMarketHT + totalTVA;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden p-6 sm:p-8 max-w-6xl mx-auto my-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-sans font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500/20" />
            Analyseur Intelligent de Contrat (PDF / Desc. Travaux)
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Déposez vos mémoires techniques, devis d'architecte ou contrats physiques scannés. L'IA lit les devis et en extrait les lignes quantitatives.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="mt-3 sm:mt-0 px-4 py-2 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Retour aux projets
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-2.5 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div>
            <span className="font-semibold">Erreur de traitement :</span> {error}
          </div>
        </div>
      )}

      {!extractedData && (
        <div className="flex flex-col sm:flex-row border-b border-slate-150 mb-6 gap-3 sm:gap-6">
          <button
            onClick={() => {
              setMode('extract');
              setError(null);
            }}
            className={`pb-3 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              mode === 'extract'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📂 Importateur de Devis Existant (PDF / Excel / Image)
          </button>
          <button
            onClick={() => {
              setMode('generate_plan');
              setError(null);
            }}
            className={`pb-3 text-xs sm:text-sm font-semibold transition-all border-b-2 cursor-pointer ${
              mode === 'generate_plan'
                ? 'border-amber-500 text-amber-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📐 Générateur de Devis par Plan & Descriptif (par Étage)
          </button>
        </div>
      )}

      {!extractedData ? (
        <div className="space-y-6">
          {mode === "generate_plan" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50/60 p-5 rounded-xl border border-slate-100">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Étage / Niveau de l'estimation
                  </label>
                  <input
                    type="text"
                    value={floor}
                    onChange={(e) => setFloor(e.target.value)}
                    placeholder="Ex: Rez-de-chaussée, R+1, Sous-sol..."
                    className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {["Plan de fondation", "Sous-sol", "Rez-de-chaussée", "1er Étage", "2ème Étage", "Étage courant", "Toiture-terrasse"].map((item) => (
                      <button
                        type="button"
                        key={item}
                        onClick={() => setFloor(item)}
                        className={`px-2 py-1 text-[11px] font-medium rounded border transition-all cursor-pointer ${
                          floor === item
                            ? "bg-amber-100 border-amber-300 text-amber-800"
                            : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                        }`}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                    Descriptif technique détaillé & Spécifications
                  </label>
                  <textarea
                    rows={6}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Exemple : Gros œuvre béton armé dosé à 350kg/m³, murs extérieurs en brique creuse 15cm double paroi, plancher corps creux 16+4, revêtement carrelage grès cérame pour salon/chambres, peinture vinylique blanche. Spécifier toutes exigences de matériaux ou de prestation..."
                    className="w-full bg-white px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                  />
                  <p className="text-[10px] text-slate-500 leading-normal">
                    Plus votre descriptif est complet, plus le devis estimatif quantitatif calculé par l'IA sera précis vis-à-vis des composants.
                  </p>
                </div>
              </div>

              <div className="flex flex-col justify-between space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block mb-2">
                    Plan / Dessin architectural de l'étage (PNG, JPG, PDF - Optionnel)
                  </label>
                  <div
                    className={`border border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all cursor-pointer min-h-[160px] ${
                      dragActive
                        ? "border-amber-500 bg-amber-50/50"
                        : file
                        ? "border-emerald-500 bg-emerald-50/10"
                        : "border-slate-200 hover:border-amber-400 hover:bg-slate-50/30"
                    }`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    onClick={triggerFileInput}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelect}
                      accept="application/pdf,image/*"
                      className="hidden"
                    />

                    {file ? (
                      <div className="text-center">
                        <span className="text-emerald-500 font-bold block mb-1">✓ Plan joint</span>
                        <span className="text-[11px] font-semibold text-slate-700 block max-w-[200px] truncate mx-auto">{file.name}</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFile(null);
                          }}
                          className="mt-2 text-[10px] font-semibold text-red-600 hover:underline cursor-pointer"
                        >
                          Retirer
                        </button>
                      </div>
                    ) : (
                      <div className="text-center">
                        <FileUp className="w-6 h-6 text-slate-400 mx-auto mb-2" />
                        <span className="text-[11px] font-sans font-medium text-slate-600 block">
                          Glissez-déposez le plan (PDF ou Image) ou cliquez
                        </span>
                        <span className="text-[9px] text-slate-400 block mt-0.5">
                          L'IA mesurera et estimera les cotes
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="bg-amber-50/80 border border-amber-100 rounded-xl p-3.5 space-y-1">
                  <h5 className="text-xs font-bold text-amber-800 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Estimation Intelligente par Niveau
                  </h5>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    Le modèle de vision de Gemini analyse les structures murales, les portes/fenêtres et les cotes géométriques du plan, calcule les surfaces et volumes du niveau d'habitation, puis intègre votre descriptif pour dresser le devis estimatif quantitatif correspondant.
                  </p>
                </div>
              </div>
            </div>
          )}

          {mode === "extract" && (
            <div
              className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all cursor-pointer ${
                dragActive
                  ? "border-amber-500 bg-amber-50/50"
                  : file
                  ? "border-emerald-500 bg-emerald-50/10"
                  : "border-slate-200 hover:border-amber-400 hover:bg-slate-50/30"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={triggerFileInput}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept="application/pdf,image/*,.xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                className="hidden"
              />

              {file ? (
                <div className="text-center">
                  <div className="bg-emerald-100 text-emerald-600 p-4 rounded-full mx-auto w-fit mb-3">
                    <span className="text-xl font-bold">✓</span>
                  </div>
                  <h4 className="font-sans font-semibold text-slate-800 text-base">{file.name}</h4>
                  <p className="text-xs text-slate-500 mt-1">
                    {(file.size / (1024 * 1024)).toFixed(2)} Mo • Fichier prêt à être extrait par l'IA
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                    }}
                    className="mt-4 text-xs font-semibold text-red-600 hover:text-red-800 focus:outline-none underline cursor-pointer"
                  >
                    Remplacer le fichier
                  </button>
                </div>
              ) : (
                <div className="text-center">
                  <div className="bg-amber-100 text-amber-700 p-4 rounded-full mx-auto w-fit mb-3">
                    <FileUp className="w-10 h-10" />
                  </div>
                  <p className="font-sans text-sm font-semibold text-slate-800">
                    Faites glisser-déposer votre document ou cliquez pour parcourir
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Types de fichiers acceptés : PDF, JPG, PNG scannés, Excel. Taille max : 20 Mo
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowDrivePicker(true);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-900 border border-slate-800 hover:bg-slate-800 text-white rounded-lg text-xs font-bold shadow-md transition-colors cursor-pointer"
                    >
                      <Cloud className="w-4 h-4 text-amber-400" />
                      Saisir depuis Google Drive
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {((mode === "extract" && file) || mode === "generate_plan") && !loading && (
            <div className="flex justify-center">
              <button
                onClick={handleParseContract}
                className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-600 text-slate-900 font-semibold rounded-xl shadow-md transition-all scale-100 active:scale-95 cursor-pointer text-sm font-sans"
              >
                <Sparkles className="w-4 h-4 text-slate-950 fill-slate-950/20" />
                {mode === "extract" ? "Lancer l'extraction automatique par IA" : "Générer le Devis Quantitatif Estimatif ✨"}
              </button>
            </div>
          )}

          {loading && (
            <div className="bg-amber-50/50 border border-amber-100 rounded-xl p-8 text-center space-y-4 max-w-md mx-auto">
              <div className="relative w-12 h-12 mx-auto">
                <div className="absolute top-0 left-0 w-full h-full border-4 border-amber-200 rounded-full"></div>
                <div className="absolute top-0 left-0 w-full h-full border-4 border-amber-500 border-t-transparent animate-spin rounded-full"></div>
              </div>
              <h4 className="font-sans font-bold text-slate-800 text-base">Traitement IA en cours...</h4>
              <p className="text-xs text-amber-800 font-medium px-3 leading-relaxed min-h-[36px] animate-pulse">
                {progressMsg}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-8">
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-2.5 text-sm">
            <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold text-emerald-950">Extraction réussie !</span> L'intelligence artificielle a détecté <span className="font-bold">{workItems.length} postes</span> de travaux et des métadonnées correspondantes. Examinez et modifiez-les ci-dessous avant d'enregistrer le devis contractuel.
            </div>
          </div>

          {/* Metadata forms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 bg-slate-50 p-5 rounded-xl border border-slate-100">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Nom descriptif du projet
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Maître d'Ouvrage (Client)
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Entreprise Titulaire (Contractor)
              </label>
              <input
                type="text"
                value={contractor}
                onChange={(e) => setContractor(e.target.value)}
                className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Localisation du chantier
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Taux de TVA (%)
              </label>
              <input
                type="number"
                value={tvaRate}
                onChange={(e) => setTvaRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-600 uppercase tracking-wider">
                Retenue de garantie (%)
              </label>
              <input
                type="number"
                value={retentionRate}
                onChange={(e) => setRetentionRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Extracted WorkItems list with live edit capacity */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-700">
                Postes de travaux de base
              </h3>
              <button
                onClick={handleAddItem}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-lg font-medium transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Ajouter une ligne
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-100 rounded-xl shadow-sm">
              <table className="w-full border-collapse text-left text-xs bg-white">
                <thead className="bg-slate-950 text-slate-200 uppercase tracking-wider font-mono text-[10px]">
                  <tr>
                    <th className="py-3 px-4 w-16">Code</th>
                    <th className="py-3 px-4 w-44">Lot de travaux</th>
                    <th className="py-3 px-4">Désignation des travaux</th>
                    <th className="py-3 px-4 w-16">Unité</th>
                    <th className="py-3 px-4 w-24 text-right">Quantité</th>
                    <th className="py-3 px-4 w-32 text-right">P.U. Unitaire (HT)</th>
                    <th className="py-3 px-4 w-40 text-right font-semibold text-amber-400">Total (HT)</th>
                    <th className="py-3 px-4 w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-150">
                  {workItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.code}
                          onChange={(e) => handleItemChange(idx, "code", e.target.value)}
                          className="w-full px-1.5 py-1 text-center bg-slate-50 border border-transparent rounded focus:bg-white focus:border-amber-400 focus:outline-none font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={(item as any).lot || ""}
                          onChange={(e) => handleItemChange(idx, "lot", e.target.value)}
                          placeholder="Ex: Lot 1 : Terrassement"
                          className="w-full px-1.5 py-1 bg-slate-50 border border-transparent rounded focus:bg-white focus:border-amber-400 focus:outline-none font-semibold text-slate-800"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.designation}
                          onChange={(e) => handleItemChange(idx, "designation", e.target.value)}
                          className="w-full px-1.5 py-1 bg-slate-50 border border-transparent rounded focus:bg-white focus:border-amber-400 focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) => handleItemChange(idx, "unit", e.target.value)}
                          className="w-full px-1.5 py-1 text-center bg-slate-50 border border-transparent rounded focus:bg-white focus:border-amber-400 focus:outline-none font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                          className="w-full px-1.5 py-1 text-right bg-slate-50 border border-transparent rounded focus:bg-white focus:border-amber-400 focus:outline-none font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-3">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => handleItemChange(idx, "unitPrice", e.target.value)}
                          className="w-full px-1.5 py-1 text-right bg-slate-50 border border-transparent rounded focus:bg-white focus:border-amber-400 focus:outline-none font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold font-mono text-slate-800">
                        {item.totalPrice.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => handleRemoveItem(idx)}
                          className="text-slate-400 hover:text-red-500 hover:bg-slate-150 p-1 rounded-md transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {workItems.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400">
                        Aucun poste de travaux détecté. Cliquez sur 'Ajouter une ligne' pour débuter manuellement.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Dynamic calculations section under correction table */}
          <div className="flex flex-col items-end gap-1.5 bg-slate-50 border border-slate-100 p-5 rounded-xl font-mono text-xs text-slate-600 ml-auto max-w-sm">
            <div className="flex justify-between w-full">
              <span>Marché Total (HT) :</span>
              <span className="font-bold text-slate-800">
                {totalMarketHT.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA
              </span>
            </div>
            <div className="flex justify-between w-full text-slate-500">
              <span>TVA ({tvaRate}%) :</span>
              <span>
                {totalTVA.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA
              </span>
            </div>
            <div className="flex justify-between w-full border-t border-slate-200 pt-1.5 text-sm">
              <span className="font-semibold text-slate-800">Budget TTC du Marché :</span>
              <span className="font-bold text-slate-900">
                {totalMarketTTC.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA
              </span>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t border-slate-100 pt-5">
            <button
              onClick={() => {
                setExtractedData(null);
                setFile(null);
              }}
              className="px-5 py-2.5 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
              disabled={loading}
            >
              Recommencer
            </button>
            <button
              onClick={handleCreateProject}
              className="px-6 py-2.5 text-sm font-semibold bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow-md transition-all scale-100 active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-50"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Envoi sur Supabase...</span>
                </>
              ) : (
                "Créer le chantier et sauvegarder"
              )}
            </button>
          </div>
        </div>
      )}

      {showDrivePicker && (
        <GoogleDrivePicker
          onClose={() => setShowDrivePicker(false)}
          onFileSelected={(f) => {
            setFile(f);
            setError(null);
          }}
          allowedExtensions={['.pdf', '.xlsx', '.xls', '.csv', '.png', '.jpg', '.jpeg']}
        />
      )}
    </div>
  );
}
