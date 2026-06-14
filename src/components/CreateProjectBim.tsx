import React, { useState } from "react";
import { api } from "../lib/api";
import { WorkItem, COUNTRIES } from "../types";
import * as XLSX from "xlsx";
import { 
  AlertCircle, 
  Plus, 
  Trash2, 
  HardHat, 
  CircleDollarSign, 
  Loader2, 
  FileUp, 
  Sparkles, 
  Building2, 
  Table, 
  Layers, 
  Save, 
  Undo,
  MapPin,
  CheckCircle2,
  FileText,
  Printer,
  FileSpreadsheet
} from "lucide-react";

interface CreateProjectBimProps {
  onProjectCreated: () => void;
  onCancel: () => void;
  countryCode: 'DZ' | 'FR' | 'MA' | 'TN' | 'CI' | 'SN' | 'EG' | 'LY' | 'MR' | 'ES' | 'IT' | 'BE' | 'DE' | 'CH' | 'US';
}

export default function CreateProjectBim({ onProjectCreated, onCancel, countryCode }: CreateProjectBimProps) {
  // 1. Core Project Metadata
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [contractor, setContractor] = useState("");
  const [contractorEmail, setContractorEmail] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [location, setLocation] = useState("");
  const [tvaRate, setTvaRate] = useState(() => COUNTRIES[countryCode]?.defaultTva ?? 19);
  const [retentionRate, setRetentionRate] = useState(5);

  // 2. Construction params (BIM Simulation)
  const [bimNumFloors, setBimNumFloors] = useState<number>(1);
  const [bimFoundationType, setBimFoundationType] = useState<string>("Semelles filantes");
  const [bimFloorHeight, setBimFloorHeight] = useState<number>(2.80);
  const [bimMarketTier, setBimMarketTier] = useState<"haut" | "moyen" | "bas">("moyen");
  const [bimDescription, setBimDescription] = useState<string>(
    "Gros œuvre et sections du catalogue fournis. Calculer les prix unitaires en 'Fourniture et Pose' selon les spécifications de ces plans d'architecture."
  );

  // 3. File attachments
  const [bimPlansFiles, setBimPlansFiles] = useState<{ name: string; base64: string; fileType: string }[]>([]);
  const [bimCatalogFile, setBimCatalogFile] = useState<{ name: string; base64: string; fileType: string } | null>(null);

  // UI Drag state
  const [isDraggingPlans, setIsDraggingPlans] = useState(false);
  const [isDraggingCatalog, setIsDraggingCatalog] = useState(false);

  // 4. Wizard states
  const [wizardStep, setWizardStep] = useState<"parameters" | "preview">("parameters");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 5. Results
  const [bimResult, setBimResult] = useState<{
    success: boolean;
    metadata?: any;
    bimElements?: Array<{ element: string; calculation: string; quantity: number; unit: string }>;
    workItems?: Array<{ code: string; designation: string; unit: string; quantity: number; unitPrice: number; totalPrice: number; lot: string }>;
  } | null>(null);

  // Conversion helpers
  const convertFileToBimFormat = (file: any): Promise<{ base64: string; fileType: string; name: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const resultStr = reader.result as string;
        const commaIdx = resultStr.indexOf(",");
        const base64Content = commaIdx !== -1 ? resultStr.substring(commaIdx + 1) : resultStr;
        resolve({
          base64: base64Content,
          fileType: file.type,
          name: file.name
        });
      };
      reader.onerror = error => reject(error);
    });
  };

  const handleBimPlanSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setError(null);
    const files = Array.from(e.target.files);
    try {
      const base64Files = await Promise.all(files.map(f => convertFileToBimFormat(f)));
      setBimPlansFiles(prev => [...prev, ...base64Files]);
    } catch (err) {
      setError("Erreur lors de la lecture d'un plan d'architecture.");
    }
  };

  const handleBimCatalogSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setError(null);
    const file = e.target.files[0];
    try {
      const base64File = await convertFileToBimFormat(file);
      setBimCatalogFile(base64File);
    } catch (err) {
      setError("Erreur lors de la lecture du catalogue.");
    }
  };

  const handleBimPlansDrop = async (filesList: FileList) => {
    setError(null);
    const files = Array.from(filesList);
    try {
      const base64Files = await Promise.all(files.map(f => convertFileToBimFormat(f)));
      setBimPlansFiles(prev => [...prev, ...base64Files]);
    } catch (err) {
      setError("Erreur lors de la lecture des plans d'architecture glissés.");
    }
  };

  const handleBimCatalogDrop = async (filesList: FileList) => {
    if (filesList.length === 0) return;
    setError(null);
    const file = filesList[0];
    try {
      const base64File = await convertFileToBimFormat(file);
      setBimCatalogFile(base64File);
    } catch (err) {
      setError("Erreur lors de la lecture du catalogue glissé.");
    }
  };

  // Generate quantitative evaluation (DQE) via model
  const handleGenerateBimEstimate = async () => {
    if (!name.trim()) {
      setError("Veuillez saisir le nom de l'ouvrage pour identifier le projet.");
      return;
    }
    if (bimPlansFiles.length === 0) {
      setError("Veuillez glisser ou téléverser au moins un plan d'architecture.");
      return;
    }

    setLoading(true);
    setError(null);
    setBimResult(null);

    try {
      const firstPlan = bimPlansFiles[0];
      const restPlans = bimPlansFiles;

      let enhancedDescription = bimDescription || "Projet résidentiel standard.";
      if (bimMarketTier === "haut") {
        enhancedDescription += "\n\n⚠️ CONSIGNES DE PRIX CRITIQUES : Veuillez calculer et ajuster tous les prix unitaires en utilisant STRICTEMENT le barème professionnel le plus HAUT (haut standing, haut de gamme, prestations hautement qualitatives) actuellement pratiqué sur le marché algérien actuel.";
      } else if (bimMarketTier === "bas") {
        enhancedDescription += "\n\n⚠️ CONSIGNES DE PRIX CRITIQUES : Veuillez calculer et ajuster tous les prix unitaires en utilisant STRICTEMENT le barème professionnel le plus BAS (économique, entrée de gamme, tarifs serrés au maximum) actuellement pratiqué sur le marché algérien actuel.";
      } else {
        enhancedDescription += "\n\n⚠️ CONSIGNES DE PRIX CRITIQUES : Veuillez calculer et ajuster tous les prix unitaires en utilisant le barème professionnel MOYEN (standard de qualité courante, moyenne du marché) actuellement pratiqué sur le marché algérien actuel.";
      }

      const res = await api.projects.generateByPlan(
        firstPlan.base64,
        firstPlan.fileType,
        countryCode,
        "Toutes",
        enhancedDescription,
        restPlans,
        bimCatalogFile,
        bimNumFloors,
        bimFoundationType,
        bimFloorHeight
      );

      if (res.success) {
        setBimResult(res);
        setWizardStep("preview");
      } else {
        setError("L'IA n'a pas pu structurer correctement les données d'estimation BIM d'après ces documents.");
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Erreur de traitement de l'intelligence artificielle.");
    } finally {
      setLoading(false);
    }
  };

  // Persists the newly created project in Supabase or locally
  const handleCreateProjectReady = async () => {
    if (!bimResult || !bimResult.workItems) return;
    setLoading(true);
    setError(null);
    try {
      // Create work items
      const finalItems: WorkItem[] = bimResult.workItems.map((item, idx) => {
        const qty = item.quantity || 0;
        const pu = item.unitPrice || 0;
        return {
          id: `item_bim_${idx}_${Date.now()}_` + Math.random().toString(36).substring(2, 6),
          code: item.code || `${idx + 1}`,
          designation: item.designation,
          unit: item.unit || "u",
          quantity: qty,
          unitPrice: pu,
          totalPrice: Number((qty * pu).toFixed(2)),
          lot: item.lot || "02. Gros Œuvre"
        };
      });

      const finalDesc = bimResult.metadata?.description || `Suivi du projet de construction d'une structure de ${bimNumFloors} étage(s) (H.S.P de ${bimFloorHeight}m) reposant sur fondations de type : ${bimFoundationType}.\n\nInstructions techniques : ${description || bimDescription}`;

      await api.projects.create({
        name,
        description: finalDesc,
        clientName: clientName || "À renseigner",
        clientEmail: clientEmail || "",
        contractor: contractor || "À renseigner",
        contractorEmail: contractorEmail || "",
        supervisor: supervisor || "À renseigner",
        supervisorEmail: supervisorEmail || "",
        location: location || "Algérie",
        tvaRate,
        retentionRate,
        countryCode,
        workItems: finalItems,
      });

      onProjectCreated();
    } catch (err: any) {
      console.error(err);
      setError("Échec de la création définitive du projet : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!bimResult || !bimResult.workItems) return;
    const data: any[][] = [
      ["DEVIS ESTIMATIF ET QUANTITATIF IA (BIM & PLANS 2D) - EXPORT DIRECT INASUIVI"],
      [],
      ["Nom du Projet / Ouvrage :", name],
      ["Localisation :", location || "Algérie"],
      ["Maître d'Ouvrage (Client) :", clientName || "À renseigner"],
      ["Cabinet d'Architecture :", supervisor || "À renseigner"],
      ["Entreprise de Travaux :", contractor || "À renseigner"],
      ["Type de fondations :", bimFoundationType],
      ["Nombre d'étages :", bimNumFloors],
      ["Hauteur Sous Plafond :", `${bimFloorHeight} m`],
      ["Taux TVA :", `${tvaRate} %`],
      [],
      ["Code", "Lot", "Désignation claire du Poste de Travaux", "Unité", "Quantité", "Prix Unitaire (DA)", "Montant Total HT (DA)"]
    ];

    bimResult.workItems.forEach((item) => {
      data.push([
        item.code,
        item.lot || "Gros Œuvre",
        item.designation,
        item.unit || "u",
        item.quantity,
        item.unitPrice,
        item.quantity * item.unitPrice
      ]);
    });

    const totalHT = bimResult.workItems.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);
    const montTva = (totalHT * tvaRate) / 100;
    const totalTTC = totalHT + montTva;

    data.push([]);
    data.push(["", "", "", "", "", "TOTAL GÉNÉRAL HT :", totalHT]);
    data.push(["", "", "", "", "", `TVA (${tvaRate}%) :`, montTva]);
    data.push(["", "", "", "", "", "TOTAL GÉNÉRAL TTC :", totalTTC]);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Devis Estimatif BIM");

    const cleanName = name.replace(/[^a-z0-9]/gi, "_");
    XLSX.writeFile(workbook, `inaSuivi_Devis_BIM_${cleanName || "Chantier"}.xlsx`);
  };

  const handlePrint = () => {
    window.print();
  };

  const totalMarketHT = bimResult?.workItems?.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0) || 0;
  const config = COUNTRIES[countryCode] || COUNTRIES.DZ;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden p-6 sm:p-8 max-w-5xl mx-auto my-6 print:border-none print:shadow-none print:p-0 print:my-0 print:max-w-full print:bg-white text-slate-900 flex flex-col">
      <div className="border-b border-slate-100 pb-5 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 no-print">
        <div>
          <h2 className="text-xl font-sans font-bold text-slate-900 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-500" />
            Nouveau Projet par BIM & Devis 2D
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Générez intelligemment un devis descriptif estimatif complet d'après vos croquis, plans d'architecture de niveaux, et sections de catalogue.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer self-start"
        >
          Annuler
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-2.5 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500 mt-0.5" />
          <div className="flex-1">
            <span className="font-bold">Une erreur est survenue :</span>
            <p className="mt-1 text-xs">{error}</p>
          </div>
        </div>
      )}

      {wizardStep === "parameters" ? (
        <div className="space-y-6">
          {/* Section 1: Informations Administratives */}
          <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              1. Informations Générales & Administratives
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">
                  Nom du Chantiers / Ouvrage *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="EX: Villa R+2 Hydra Alger, Projet R+5 Bab Ezzouar"
                  className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">
                  Commune / Adresse de l'Ouvrage
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="Ex: Hydra, Alger / Oran / Constantine"
                  className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">
                  Maître d'Ouvrage (Client)
                </label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="SCI El Bahdja"
                  className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">
                  Cabinet d'Architecture / Maître d'Œuvre
                </label>
                <input
                  type="text"
                  value={supervisor}
                  onChange={(e) => setSupervisor(e.target.value)}
                  placeholder="Bureau d'Études Archit-DZ"
                  className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 block">
                  Entreprise Générale Titulaire
                </label>
                <input
                  type="text"
                  value={contractor}
                  onChange={(e) => setContractor(e.target.value)}
                  placeholder="Société de Travaux Batiment Spacieux"
                  className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">
                    Retenue Garantie (%)
                  </label>
                  <input
                    type="number"
                    value={retentionRate}
                    onChange={(e) => setRetentionRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-600 block">
                    Taux TVA (%)
                  </label>
                  <input
                    type="number"
                    value={tvaRate}
                    onChange={(e) => setTvaRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Paramètres Techniques du Bâtiment */}
          <div className="bg-slate-50/50 p-5 rounded-xl border border-slate-100 space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 font-mono flex items-center gap-2 mb-3">
              <span className="w-2 h-2 rounded-full bg-amber-500"></span>
              2. Simulation BIM - Paramètres Structurels
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-650">Nombre de Niveaux / Étages</label>
                <div className="flex items-center gap-2 mt-1">
                  <button
                    type="button"
                    onClick={() => setBimNumFloors(prev => Math.max(1, prev - 1))}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-95"
                  >
                    -
                  </button>
                  <span className="w-12 text-center font-sans font-bold text-slate-900 text-sm">{bimNumFloors} S/Sol ou Étages</span>
                  <button
                    type="button"
                    onClick={() => setBimNumFloors(prev => prev + 1)}
                    className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-700 hover:bg-slate-100 cursor-pointer active:scale-95"
                  >
                    +
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-650 block">Hauteur sous Plafond (m)</label>
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  value={bimFloorHeight}
                  onChange={(e) => setBimFloorHeight(parseFloat(e.target.value) || 2.80)}
                  className="w-full bg-white mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-650 block">Type de Fondations</label>
                <select
                  value={bimFoundationType}
                  onChange={(e) => setBimFoundationType(e.target.value)}
                  className="w-full bg-white mt-1 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans"
                >
                  <option value="Semelles filantes">Semelles filantes en B.A</option>
                  <option value="Radier général">Radier général structurel</option>
                  <option value="Semelles isolées">Semelles isolées sous poteaux</option>
                  <option value="Plots & Longrines">Plots brevetés & Longrines de chaînage</option>
                  <option value="Pieux profonds">Pieux profonds liaisonnés</option>
                </select>
              </div>
            </div>

            {/* Choix du barème du marché algérien */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Barème Des Prix Unitaires Réels (Marché Algérien)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setBimMarketTier("bas")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    bimMarketTier === "bas"
                      ? "border-amber-500 bg-amber-50/20 ring-1 ring-amber-500 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-xs font-bold text-slate-900">Barème Économique (Bas)</span>
                  <span className="block text-[10px] text-slate-500 mt-1">Matériaux simples, coûts de main-d'œuvre réduits, entrée de gamme.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBimMarketTier("moyen")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    bimMarketTier === "moyen"
                      ? "border-amber-500 bg-amber-50/20 ring-1 ring-amber-500 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-xs font-bold text-slate-900">Barème Standard (Moyen)</span>
                  <span className="block text-[10px] text-slate-500 mt-1">Prix représentatifs de la moyenne nationale des artisans qualifiés en Algérie.</span>
                </button>

                <button
                  type="button"
                  onClick={() => setBimMarketTier("haut")}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    bimMarketTier === "haut"
                      ? "border-amber-500 bg-amber-50/20 ring-1 ring-amber-500 shadow-xs"
                      : "border-slate-200 bg-white hover:bg-slate-50"
                  }`}
                >
                  <span className="block text-xs font-bold text-slate-900">Barème Haut Standing (Haut)</span>
                  <span className="block text-[10px] text-slate-500 mt-1">Prestations de standing supérieur, matériaux certifiés de premier choix.</span>
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-650 block">Consignes techniques de l'IA (TVA & Devises incl.)</label>
              <textarea
                value={bimDescription}
                onChange={(e) => setBimDescription(e.target.value)}
                rows={3}
                placeholder="Indiquez à l'IA si vous souhaitez cibler uniquement le gros œuvre, un lot plomberie précis, des matériaux particuliers..."
                className="w-full bg-white mt-1 px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
            </div>
          </div>

          {/* Section 3: Pièces Jointes & Plans */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* DROPZONE DE PLANS */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Plans d'Architecture & Tois (PDF, PNG, JPG) *
              </label>

              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all min-h-[170px] flex flex-col justify-center relative ${
                  isDraggingPlans 
                    ? "border-amber-500 bg-amber-50/50" 
                    : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-amber-500"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingPlans(true);
                }}
                onDragLeave={() => {
                  setIsDraggingPlans(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingPlans(false);
                  if (e.dataTransfer.files) {
                    handleBimPlansDrop(e.dataTransfer.files);
                  }
                }}
              >
                <input
                  type="file"
                  multiple
                  accept=".pdf,image/*"
                  onChange={handleBimPlanSelection}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2 text-center pointer-events-none">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${isDraggingPlans ? "bg-amber-100 text-amber-700" : "bg-amber-50 text-amber-600"}`}>
                    <FileUp className="w-5 h-5 animate-bounce" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">
                      Glissez vos plans d'architecture
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Fichiers plans RDC, étages, façades PDF ou Images
                    </span>
                  </div>
                </div>
              </div>

              {/* Plans list */}
              {bimPlansFiles.length > 0 && (
                <div className="mt-3 bg-white border border-slate-100 rounded-lg divide-y divide-slate-50 shadow-xs max-h-48 overflow-y-auto">
                  {bimPlansFiles.map((pf, idx) => (
                    <div key={idx} className="p-2.5 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <FileText className="w-3.5 h-3.5 text-amber-500" />
                        <span className="font-semibold text-slate-700 truncate max-w-sm">{pf.name}</span>
                      </div>
                      <button
                        onClick={() => setBimPlansFiles(prev => prev.filter((_, i) => i !== idx))}
                        className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* DROPZONE CATALOGUE */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                Bordereau de prix de base ou Catalogue d'Articles (Optionnel)
              </label>

              <div 
                className={`border-2 border-dashed rounded-xl p-6 text-center transition-all min-h-[170px] flex flex-col justify-center relative ${
                  isDraggingCatalog 
                    ? "border-emerald-500 bg-emerald-50/50" 
                    : "border-slate-200 bg-slate-50/50 hover:bg-white hover:border-emerald-500"
                }`}
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDraggingCatalog(true);
                }}
                onDragLeave={() => {
                  setIsDraggingCatalog(false);
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDraggingCatalog(false);
                  if (e.dataTransfer.files) {
                    handleBimCatalogDrop(e.dataTransfer.files);
                  }
                }}
              >
                <input
                  type="file"
                  accept=".xlsx,.xls,.pdf"
                  onChange={handleBimCatalogSelection}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <div className="space-y-2 text-center pointer-events-none">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${isDraggingCatalog ? "bg-emerald-100 text-emerald-700" : "bg-emerald-50 text-emerald-600"}`}>
                    <FileUp className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-slate-700 block">
                      Glissez votre catalogue officiel / Lot
                    </span>
                    <span className="text-[10px] text-slate-400 block mt-0.5">
                      Fichier d'articles Excel (.xlsx, .xls) ou PDF du marché
                    </span>
                  </div>
                </div>
              </div>

              {/* Catalog indicator */}
              {bimCatalogFile && (
                <div className="p-2.5 bg-emerald-50/50 border border-emerald-100 rounded-lg flex items-center justify-between text-xs mt-3">
                  <div className="flex items-center gap-2">
                    <Table className="w-4 h-4 text-emerald-600" />
                    <div>
                      <span className="font-bold text-emerald-950 block truncate max-w-sm">{bimCatalogFile.name}</span>
                      <span className="text-[10px] text-emerald-650 font-medium">Bordereau chargé avec succès !</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setBimCatalogFile(null)}
                    className="text-emerald-500 hover:text-red-500 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-100 flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-5 py-2.5 text-sm border border-slate-200 text-slate-650 font-semibold rounded-lg hover:bg-slate-50 transition-colors"
              disabled={loading}
            >
              Annuler
            </button>
            <button
              onClick={handleGenerateBimEstimate}
              className="px-6 py-2.5 text-sm font-bold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyse & calcul par l'IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Générer Devis & Métrés</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : (
        /* Preview generated work items and metrics before creating */
        <div className="space-y-6 animate-fade-in">
          {/* En-tête d'impression uniquement */}
          <div className="hidden print:block border-b-2 border-slate-900 pb-4 mb-6">
            <h1 className="text-2xl font-sans font-bold text-slate-900 uppercase">
              Devis Descriptif & Estimatif de l'Ouvrage
            </h1>
            <p className="text-xs text-slate-500 mt-1">Généré via l'analyse assistée par IA (BIM & Plans 2D)</p>
            
            <div className="grid grid-cols-2 gap-4 mt-6 text-xs text-slate-700">
              <div>
                <span className="font-bold block">Chantier / Projet : <span className="font-normal">{name}</span></span>
                <span className="font-bold block">Localisation : <span className="font-normal">{location || "Algérie"}</span></span>
              </div>
              <div>
                <span className="font-bold block">Maître d'Ouvrage : <span className="font-normal">{clientName || "À renseigner"}</span></span>
                <span className="font-bold block">Cabinet d'Architecture : <span className="font-normal">{supervisor || "À renseigner"}</span></span>
                <span className="font-bold block">Entreprise Générale : <span className="font-normal">{contractor || "À renseigner"}</span></span>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-dashed border-slate-200 text-[10px] text-slate-600">
              <span>Nombre de niveaux : <strong>{bimNumFloors}</strong></span>
              <span>Hauteur s/ plafond (m) : <strong>{bimFloorHeight}</strong></span>
              <span>Type de fondations : <strong>{bimFoundationType}</strong></span>
              <span>Barème de prix : <strong className="uppercase">{bimMarketTier === "bas" ? "Économique (Bas)" : bimMarketTier === "haut" ? "Haut standing (Haut)" : "Standard (Moyen)"}</strong></span>
            </div>
          </div>

          <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 flex items-start gap-4 no-print">
            <div className="bg-emerald-100 text-emerald-700 p-2.5 rounded-lg shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-sans font-bold text-emerald-900 text-sm">Calcul de l'estimation BIM Réussi !</h3>
              <p className="text-emerald-750 text-xs mt-1 leading-relaxed">
                Notre intelligence artificielle a analysé {bimPlansFiles.length} plan(s) et couplé vos spécifications avec la nomenclature {bimCatalogFile ? `officielle issue de "${bimCatalogFile.name}"` : "standard du bâtiment"}. Les prix unitaires calculés sont basés sur le barème <strong>{bimMarketTier === "bas" ? "ÉCONOMIQUE (BAS)" : bimMarketTier === "haut" ? "HAUT STANDING (HAUT)" : "STANDARD (MOYEN)"}</strong> pour le marché {config.name}.
              </p>
            </div>
          </div>

          {/* Actions d'export rapides (Excel & Impression) */}
          <div className="bg-slate-50 border border-slate-150 p-4 rounded-xl flex flex-col sm:flex-row gap-4 items-center justify-between no-print">
            <div>
              <h4 className="text-xs font-bold text-slate-800">Sauvegarde & Options de partage</h4>
              <p className="text-[10px] text-slate-500 mt-0.5">Exporter ce chiffrage théorique ou enregistrez-le définitivement sur l'application.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2.0">
              <button
                type="button"
                onClick={exportToExcel}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <FileSpreadsheet className="w-4 h-4" />
                <span>Exporter vers Excel (.xlsx)</span>
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer / Export PDF</span>
              </button>
            </div>
          </div>

          {/* Table display of simulated work items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Aperçu du Devis Estimatif IA ("Fourniture & Pose")
              </h3>
              <span className="text-xs text-slate-400 font-mono">
                {bimResult?.workItems?.length || 0} articles modélisés
              </span>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full border-collapse text-left text-xs bg-white">
                <thead className="bg-slate-900 text-slate-100 font-mono text-[9px] uppercase tracking-wider">
                  <tr>
                    <th className="py-2 px-3 w-16 text-center">Code</th>
                    <th className="py-2 px-3">Lot / Catégorie</th>
                    <th className="py-2 px-3 w-1/2">Désignation technique générée</th>
                    <th className="py-2 px-3 text-center w-16">Unité</th>
                    <th className="py-2 px-3 text-right w-24">Quantité</th>
                    <th className="py-2 px-3 text-right w-32 font-medium">Prix Unitaire</th>
                    <th className="py-2 px-3 text-right w-32 text-amber-400 font-semibold">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-sans">
                  {bimResult?.workItems?.map((item, idx) => {
                    const price = item.quantity * item.unitPrice;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-2 px-3 font-mono text-center text-slate-500">{item.code || `${idx+1}`}</td>
                        <td className="py-2 px-3 font-semibold text-slate-800 shrink-0">{item.lot || "Gros Œuvre"}</td>
                        <td className="py-2 px-3 font-medium text-slate-700 leading-relaxed">{item.designation}</td>
                        <td className="py-2 px-3 font-mono text-center text-slate-500">{item.unit || "m³"}</td>
                        <td className="py-2 px-3 font-mono text-right font-bold text-slate-800">
                          {item.quantity.toLocaleString(config.locale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })}
                        </td>
                        <td className="py-2 px-3 font-mono text-right text-slate-600">
                          {item.unitPrice.toLocaleString(config.locale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} {config.currency}
                        </td>
                        <td className="py-2 px-4 font-mono text-right font-bold text-slate-900 bg-slate-50/30">
                          {price.toLocaleString(config.locale, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2
                          })} {config.currency}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Project Cost footer summary */}
          <div className="bg-slate-950 p-6 rounded-xl flex flex-col sm:flex-row items-center justify-between text-white gap-4">
            <div className="space-y-1 text-center sm:text-left">
              <span className="text-[10px] text-slate-400 block uppercase tracking-wider font-semibold">
                Budget prévisionnel global du nouveau chantier
              </span>
              <span className="font-mono text-2xl font-bold tracking-tight text-amber-400">
                {totalMarketHT.toLocaleString(config.locale, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2
                })} {config.currency} <span className="text-xs text-white">HT</span>
              </span>
            </div>

            <div className="flex gap-2 w-full sm:w-auto no-print">
              <button
                type="button"
                onClick={() => setWizardStep("parameters")}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-semibold select-none cursor-pointer transition-colors"
                disabled={loading}
              >
                <Undo className="w-3.5 h-3.5" /> Réajuster
              </button>
              <button
                type="button"
                onClick={handleCreateProjectReady}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow-md cursor-pointer transition-colors"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Création...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" /> Enregistrer le Projet
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
