import React, { useState, useEffect } from "react";
import { Project, WorkItem, WorkSituation, User, AuditLog, PlanningTask, COUNTRIES, CountryConfig } from "../types";
import { api } from "../lib/api";
import { supabase } from "../lib/supabaseClient";
import * as XLSX from "xlsx";
import { getAccessToken, googleSignIn } from "../lib/googleAuth";
import { uploadFileToDrive } from "../lib/googleDriveService";
import {
  ArrowLeft,
  Calendar,
  Layers,
  FileSpreadsheet,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  Award,
  CircleDollarSign,
  AlertCircle,
  Clock,
  Printer,
  ChevronRight,
  UserCheck2,
  HardHat,
  Percent,
  Calculator,
  Save,
  CheckCircle2,
  Sparkles,
  FileUp,
  Loader2,
  FileText,
  BookOpen,
  ClipboardList,
  Download,
  Filter,
  CheckSquare,
  Eye,
  Settings,
  ArrowUpDown,
  Camera,
  Image,
  Cloud,
  ExternalLink,
  Lock,
  History,
  Mail,
  Send,
  Map,
  Check,
  Square,
  PlusCircle,
  HelpCircle
} from "lucide-react";

const standardConstructionLots = [
  {
    name: "01. Terrassement & Fondations",
    items: [
      { code: "1.1", designation: "Fouilles en rigoles et excavations", unit: "m³", defaultUnitPrice: 450, defQty: 50 },
      { code: "1.2", designation: "Semelles filantes ou isolées en béton armé", unit: "m³", defaultUnitPrice: 18000, defQty: 10 },
      { code: "1.3", designation: "Béton de propreté dosé à 150 kg/m³", unit: "m³", defaultUnitPrice: 9000, defQty: 5 },
      { code: "1.4", designation: "Remblai compacté autour des fondations", unit: "m³", defaultUnitPrice: 600, defQty: 30 }
    ]
  },
  {
    name: "02. Gros Œuvre, Béton & Structure",
    items: [
      { code: "2.1", designation: "Plancher en corps creux (hourdis 16+4) pour dalles", unit: "m²", defaultUnitPrice: 4500, defQty: 120 },
      { code: "2.2", designation: "Dalle de compression en béton armé armé de treillis", unit: "m³", defaultUnitPrice: 16000, defQty: 15 },
      { code: "2.3", designation: "Poteaux et poutres de chainage en béton armé", unit: "m³", defaultUnitPrice: 24000, defQty: 8 },
      { code: "2.4", designation: "Ferraillage en acier haute adhérence", unit: "kg", defaultUnitPrice: 180, defQty: 1200 }
    ]
  },
  {
    name: "03. Maçonnerie & Cloisonnement",
    items: [
      { code: "3.1", designation: "Murs extérieurs en briques creuses de 15cm double paroi", unit: "m²", defaultUnitPrice: 2200, defQty: 250 },
      { code: "3.2", designation: "Cloisons intérieures séparatives de briques de 10cm", unit: "m²", defaultUnitPrice: 1500, defQty: 180 },
      { code: "3.3", designation: "Linteaux en béton coulé sur place", unit: "ml", defaultUnitPrice: 1200, defQty: 40 }
    ]
  },
  {
    name: "04. Enduits, Isolation & Étanchéité",
    items: [
      { code: "4.1", designation: "Enduits intérieurs au mortier ciment frotassé", unit: "m²", defaultUnitPrice: 850, defQty: 600 },
      { code: "4.2", designation: "Enduits extérieurs étanches au mortier bâtard", unit: "m²", defaultUnitPrice: 1200, defQty: 350 },
      { code: "4.3", designation: "Étanchéité multicouche des terrasses ou dalles humides", unit: "m²", defaultUnitPrice: 1500, defQty: 120 }
    ]
  },
  {
    name: "05. Revêtements de Sols & de Murs",
    items: [
      { code: "5.1", designation: "Carreau grès cérame pour salon et chambres", unit: "m²", defaultUnitPrice: 3200, defQty: 120 },
      { code: "5.2", designation: "Faïence murale céramique de salle d'eau/cuisine", unit: "m²", defaultUnitPrice: 2800, defQty: 45 },
      { code: "5.3", designation: "Pose de plinthes assorties en bordure", unit: "ml", defaultUnitPrice: 400, defQty: 160 }
    ]
  },
  {
    name: "06. Plomberie, Sanitaire & Gaz",
    items: [
      { code: "6.1", designation: "Réseau d'alimentation eau froide/chaude en PEX multicouche", unit: "Ens", defaultUnitPrice: 45000, defQty: 1 },
      { code: "6.2", designation: "Réseau d'évacuation PVC Ø 110 et Ø 40 pour sanitaires", unit: "Ens", defaultUnitPrice: 35000, defQty: 1 },
      { code: "6.3", designation: "Fourniture et pose de cuvette WC et vasque de lavabo", unit: "u", defaultUnitPrice: 18000, defQty: 2 }
    ]
  },
  {
    name: "07. Électricité, Câblage & Éclairage",
    items: [
      { code: "7.1", designation: "Fourniture et raccordement de coffret électrique général calibré", unit: "u", defaultUnitPrice: 12000, defQty: 1 },
      { code: "7.2", designation: "Câblage en tube orange type ICTA et conducteurs de terre", unit: "Ens", defaultUnitPrice: 65000, defQty: 1 },
      { code: "7.3", designation: "Pose d'interrupteurs et de prises de courant encastrées", unit: "u", defaultUnitPrice: 850, defQty: 35 }
    ]
  },
  {
    name: "08. Peintures, Vitrerie & Faux-plafonds",
    items: [
      { code: "8.1", designation: "Peinture murale acrylique mate double couche avec enduit de lissage", unit: "m²", defaultUnitPrice: 650, defQty: 600 },
      { code: "8.2", designation: "Faux plafond suspendu en plaques de plâtre BA13 de type standard", unit: "m²", defaultUnitPrice: 2500, defQty: 120 }
    ]
  }
];

interface ProjectDetailProps {
  project: Project;
  currentUser?: User | null;
  onBack: () => void;
  onProjectUpdated: (updated: Project) => void;
}



export default function ProjectDetail({ project, currentUser, onBack, onProjectUpdated }: ProjectDetailProps) {
  const [activeTab, setActiveTab] = useState<string>("situations");
  const [selectedSitId, setSelectedSitId] = useState<string>(
    project.situations && project.situations.length > 0
      ? [...project.situations].sort((a, b) => b.number - a.number)[0].id
      : ""
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New situation form state
  const [newSitComment, setNewSitComment] = useState("");
  const [newSitDate, setNewSitDate] = useState(new Date().toISOString().split("T")[0]);
  const [showNewSitModal, setShowNewSitModal] = useState(false);
  const [newSitLotFilter, setNewSitLotFilter] = useState<string>("All");
  const [selectedDocIdForNewSit, setSelectedDocIdForNewSit] = useState<string>("");

  // Edit current situation progress items
  const [editProgress, setEditProgress] = useState<Record<string, number>>({});
  const [editWorkItems, setEditWorkItems] = useState<Record<string, { code: string; designation: string; unit: string; quantity: number; unitPrice: number; lot: string }>>({});
  const [editOverrides, setEditOverrides] = useState<Record<string, any>>({});
  const [isEditingProgress, setIsEditingProgress] = useState(false);
  const [showDeleteSituationConfirm, setShowDeleteSituationConfirm] = useState(false);

  // Custom safe modal states for deleting docs and photos in iFrame
  const [docToDelete, setDocToDelete] = useState<{ id: string; name: string } | null>(null);
  const [photoToDelete, setPhotoToDelete] = useState<string | null>(null);

  // States for documents tracking (PV, Journal, Métre, Plan)
  const [uploadingDocType, setUploadingDocType] = useState<"pv" | "journal" | "metre" | "plan" | null>(null);
  const [docNameInput, setDocNameInput] = useState<string>("");
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // AI upload & analysis states
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiProgressMsg, setAiProgressMsg] = useState("");

  // States for lot filtering & mass updating
  const [selectedLotFilter, setSelectedLotFilter] = useState<string>("All");
  const [massPercentVal, setMassPercentVal] = useState<string>("");
  const [showPrintIframeModal, setShowPrintIframeModal] = useState(false);

  // Requirement 2: Situation Status Filtering State
  const [situationStatusFilter, setSituationStatusFilter] = useState<'all' | 'draft' | 'approved' | 'paid'>('all');

  // Photo Tracking states
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoCaption, setPhotoCaption] = useState("");

  // Document history states and loading
  const [historySituations, setHistorySituations] = useState<{ id: string; projet_id: string; url: string; filename: string; created_at: string }[]>([]);
  const [historyPVs, setHistoryPVs] = useState<{ id: string; projet_id: string; url: string; filename: string; created_at: string }[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [archiveSubTab, setArchiveSubTab] = useState<'sits' | 'pvs'>('sits');

  const handleSituationStatusFilterChange = (status: 'all' | 'draft' | 'approved' | 'paid') => {
    setSituationStatusFilter(status);
    const matchedSits = (project.situations || [])
      .filter((s) => status === "all" || s.status === status)
      .sort((a, b) => b.number - a.number);
    if (matchedSits.length > 0) {
      setSelectedSitId(matchedSits[0].id);
    } else {
      setSelectedSitId("");
    }
  };

  // Requirement 3: Add Lot State
  const [showAddLotModal, setShowAddLotModal] = useState(false);
  const [addLotName, setAddLotName] = useState("");
  const [addLotFile, setAddLotFile] = useState<File | null>(null);
  const [addLotFileType, setAddLotFileType] = useState<"excel" | "pdf_ia">("excel");
  const [addLotLoading, setAddLotLoading] = useState(false);
  const [addLotError, setAddLotError] = useState<string | null>(null);
  const [addLotSuccess, setAddLotSuccess] = useState<string | null>(null);
  const [addLotParsedItems, setAddLotParsedItems] = useState<Omit<WorkItem, "id">[]>([]);

  // Delay email notification states
  const [delayEmailRecipients, setDelayEmailRecipients] = useState<string[]>([]);
  const [delayEmailSubject, setDelayEmailSubject] = useState("");
  const [delayEmailManual, setDelayEmailManual] = useState("");
  const [delayEmailLoading, setDelayEmailLoading] = useState(false);
  const [delayEmailSuccess, setDelayEmailSuccess] = useState<string | null>(null);
  const [delayEmailError, setDelayEmailError] = useState<string | null>(null);

  const [inlineClientEmail, setInlineClientEmail] = useState(project.clientEmail || "");
  const [inlineSupervisorEmail, setInlineSupervisorEmail] = useState(project.supervisorEmail || "");
  const [inlineContractorEmail, setInlineContractorEmail] = useState(project.contractorEmail || "");
  const [isSavingStakeholders, setIsSavingStakeholders] = useState(false);

  // States for dynamic planning-situation integration
  const [selectedPlanningSitId, setSelectedPlanningSitId] = useState<string>("latest_approved");
  const [planningComparisonMode, setPlanningComparisonMode] = useState<"static" | "dynamic">("dynamic");

  // NEW: States for Visionneuse de Plans, BIM & Générateur de Devis IA
  const [selectedPlanForViewer, setSelectedPlanForViewer] = useState<any | null>(null);
  const [selectedPlanForEstimateId, setSelectedPlanForEstimateId] = useState<string>("");
  const [bimNumFloors, setBimNumFloors] = useState<number>(1);
  const [bimFoundationType, setBimFoundationType] = useState<string>("Semelles filantes");
  const [bimFloorHeight, setBimFloorHeight] = useState<number>(2.80);
  const [bimPlansFiles, setBimPlansFiles] = useState<{ name: string; base64: string; fileType: string }[]>([]);
  const [bimCatalogFile, setBimCatalogFile] = useState<{ name: string; base64: string; fileType: string } | null>(null);
  const [bimDescription, setBimDescription] = useState<string>("Gros œuvre et sections du catalogue fournis. Calculer tous les prix unitaires en 'Fourniture et Pose' selon le barème professionnel le plus haut du marché algérien actuel.");
  const [bimGenerating, setBimGenerating] = useState<boolean>(false);
  const [bimError, setBimError] = useState<string | null>(null);
  const [bimResult, setBimResult] = useState<{ success: boolean; metadata?: any; bimElements?: Array<{ element: string; calculation: string; quantity: number; unit: string }>; workItems?: Array<{ code: string; designation: string; unit: string; quantity: number; unitPrice: number; totalPrice: number; lot: string }> } | null>(null);
  const [bimStep, setBimStep] = useState<"params_input" | "devis_preview">("params_input");
  const [isDraggingPlans, setIsDraggingPlans] = useState<boolean>(false);
  const [isDraggingCatalog, setIsDraggingCatalog] = useState<boolean>(false);

  // Country & Market choice states and formatters
  const [showCountryModal, setShowCountryModal] = useState(false);

  const getCountryConfig = (): CountryConfig => {
    const code = project.countryCode || 'DZ';
    return COUNTRIES[code] || COUNTRIES.DZ;
  };

  const formatCurrency = (amount: number, minimumFractionDigits = 2, maximumFractionDigits = 2) => {
    const config = getCountryConfig();
    const formatted = amount.toLocaleString(config.locale, {
      minimumFractionDigits,
      maximumFractionDigits
    });
    return `${formatted} ${config.currency}`;
  };

  const formatNumber = (num: number, minDec = 2, maxDec = 2) => {
    const config = getCountryConfig();
    return num.toLocaleString(config.locale, {
      minimumFractionDigits: minDec,
      maximumFractionDigits: maxDec
    });
  };

  const formatQty = (q: number) => {
    const config = getCountryConfig();
    return q.toLocaleString(config.locale, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 4
    });
  };

  const formatDate = (dateString: string | Date, options?: Intl.DateTimeFormatOptions) => {
    const config = getCountryConfig();
    try {
      return new Date(dateString).toLocaleDateString(config.locale, options);
    } catch {
      return String(dateString);
    }
  };

  const formatDateTime = (dateString: string | Date) => {
    const config = getCountryConfig();
    try {
      return new Date(dateString).toLocaleString(config.locale);
    } catch {
      return String(dateString);
    }
  };

  // Convert File object to raw base64 string for BIM API calls
  const convertFileToBimFormat = (file: any): Promise<{ base64: string; fileType: string; name: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const resultString = reader.result as string;
        const commaIdx = resultString.indexOf(",");
        const base64 = resultString.substring(commaIdx + 1);
        resolve({
          base64,
          fileType: file.type,
          name: file.name
        });
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleBimPlanSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setBimError(null);
    const files = Array.from(e.target.files);
    try {
      const base64Files = await Promise.all(files.map(f => convertFileToBimFormat(f)));
      setBimPlansFiles(prev => [...prev, ...base64Files]);
    } catch (err) {
      setBimError("Erreur lors de la lecture d'un plan d'architecture.");
    }
  };

  const handleBimCatalogSelection = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setBimError(null);
    const file = e.target.files[0];
    try {
      const base64File = await convertFileToBimFormat(file);
      setBimCatalogFile(base64File);
    } catch (err) {
      setBimError("Erreur lors de la lecture du catalogue.");
    }
  };

  const handleBimPlansDrop = async (filesList: FileList) => {
    setBimError(null);
    const files = Array.from(filesList);
    try {
      const base64Files = await Promise.all(files.map(f => convertFileToBimFormat(f)));
      setBimPlansFiles(prev => [...prev, ...base64Files]);
    } catch (err) {
      setBimError("Erreur lors de la lecture des plans d'architecture glissés.");
    }
  };

  const handleBimCatalogDrop = async (filesList: FileList) => {
    if (filesList.length === 0) return;
    setBimError(null);
    const file = filesList[0];
    try {
      const base64File = await convertFileToBimFormat(file);
      setBimCatalogFile(base64File);
    } catch (err) {
      setBimError("Erreur lors de la lecture du catalogue glissé.");
    }
  };

  const handleGenerateBimEstimate = async () => {
    if (bimPlansFiles.length === 0) {
      setBimError("Veuillez téléverser au moins un document ou plan de chantier pour lancer l'estimation.");
      return;
    }
    setBimGenerating(true);
    setBimError(null);
    setBimResult(null);

    try {
      const firstPlan = bimPlansFiles[0];
      const restPlans = bimPlansFiles; // Send all plans to process collective floor measurements

      const res = await api.projects.generateByPlan(
        firstPlan.base64,
        firstPlan.fileType,
        project.countryCode || "DZ",
        "Toutes", // floor description placeholder
        bimDescription || "Projet résidentiel standard.",
        restPlans,
        bimCatalogFile,
        bimNumFloors,
        bimFoundationType,
        bimFloorHeight
      );

      if (res.success) {
        setBimResult(res);
        setBimStep("devis_preview");
      } else {
        setBimError("L'IA n'a pas pu structurer correctement les données d'estimation BIM.");
      }
    } catch (err: any) {
      console.error(err);
      setBimError(err.message || "Erreur lors de l'envoi de la requête de traitement globale.");
    } finally {
      setBimGenerating(false);
    }
  };

  const handleApplyBimEstimate = async () => {
    if (!bimResult || !bimResult.workItems) return;
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      // Map generated items under standard database ids
      const newWorkItems = bimResult.workItems.map((item, idx) => ({
        id: `item_bim_${idx}_${Date.now()}`,
        code: item.code || `${idx + 1}`,
        designation: item.designation,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lot: item.lot || "02. Gros Œuvre"
      }));

      // In accordance with RULE[AGENTS_md], calculations dynamically call getRowValues() on client render,
      // and here we persist the new initial market state.
      const finalDesc = bimResult.metadata?.description || `Suivi de construction d'une structure de ${bimNumFloors} étage(s) (H.S.P de ${bimFloorHeight}m) reposant sur fondations de type : ${bimFoundationType}.\n\nRecommandations techniques : ${bimDescription}`;

      const updatedProject = {
        ...project,
        workItems: newWorkItems,
        description: finalDesc,
        // Save foundation parameters as properties or description metadata if we want 
      };

      await api.projects.update(project.id, updatedProject);
      onProjectUpdated(updatedProject);
      setSuccessMsg(`Le devis calculé par simulation BIM a été couplé avec succès ! ${newWorkItems.length} postes de travaux ont remplacé et enrichi l'historique contractuel.`);
      setActiveTab("contract"); // Back to the primary table
    } catch (err: any) {
      console.error(err);
      setBimError("Échec de la persistance finale du devis importé : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectCountryAndMarket = async (code: 'DZ' | 'FR' | 'MA' | 'TN' | 'CI' | 'SN' | 'EG' | 'LY' | 'MR' | 'ES' | 'IT' | 'BE' | 'DE' | 'CH' | 'US', adjustTva: boolean) => {
    setLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const config = COUNTRIES[code];
      const updatePayload: any = { countryCode: code };
      if (adjustTva) {
        updatePayload.tvaRate = config.defaultTva;
      }
      const updated = await api.projects.update(project.id, updatePayload);
      onProjectUpdated(updated);
      setSuccessMsg(`Chantier basculé avec succès sur le marché : ${config.name} (${config.flag})`);
      setShowCountryModal(false);
    } catch (err: any) {
      setError("Erreur de modification du pays du marché : " + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Synchronize on project prop change
  useEffect(() => {
    setInlineClientEmail(project.clientEmail || "");
    setInlineSupervisorEmail(project.supervisorEmail || "");
    setInlineContractorEmail(project.contractorEmail || "");
  }, [project.clientEmail, project.supervisorEmail, project.contractorEmail]);

  // Initialize email recipients when the project or stakeholder changes
  useEffect(() => {
    const list: string[] = [];
    if (project.clientEmail) list.push(project.clientEmail);
    if (project.supervisorEmail) list.push(project.supervisorEmail);
    if (project.contractorEmail) list.push(project.contractorEmail);
    if (currentUser?.email && !list.includes(currentUser.email)) {
      list.push(currentUser.email);
    }
    setDelayEmailRecipients(list);
    setDelayEmailSubject(`🚨 [Alerte Retard] Chantier : ${project.name}`);
  }, [project.clientEmail, project.supervisorEmail, project.contractorEmail, currentUser]);

  const handleSendDelayEmail = async () => {
    if (delayEmailRecipients.length === 0) {
      setDelayEmailError("Veuillez sélectionner ou saisir au moins un destinataire.");
      return;
    }
    setDelayEmailLoading(true);
    setDelayEmailError(null);
    setDelayEmailSuccess(null);

    // Calculate delayed tasks
    const sitDate = getPlanningSituationDate();
    const delayedTasksList = (project.planningTasks || []).filter(task => {
      const actualProgress = getLotProgress(task.associatedLot || "");
      const targetProgress = getExpectedProgressAtDate(task, sitDate);
      return actualProgress < targetProgress;
    });

    const delayedHtml = delayedTasksList.map(task => {
      const actual = getLotProgress(task.associatedLot || "");
      const target = getExpectedProgressAtDate(task, sitDate);
      const diff = actual - target;
      return `
        <tr style="border-bottom: 1px solid #e1e8ed;">
          <td style="padding: 10px; font-weight: bold; color: #2d3748; text-align: left;">${task.associatedLot || "Général"}</td>
          <td style="padding: 10px; color: #4a5568; text-align: left;">${task.name}</td>
          <td style="padding: 10px; font-family: monospace; color: #e53e3e; font-weight: bold; text-align: center;">${actual}%</td>
          <td style="padding: 10px; font-family: monospace; color: #4a5568; text-align: center;">${target}%</td>
          <td style="padding: 10px; font-family: monospace; color: #e53e3e; font-weight: bold; text-align: center;">${diff}%</td>
          <td style="padding: 10px; color: #718096; font-size: 11px; text-align: center;">${task.targetEndDate}</td>
        </tr>
      `;
    }).join("");

    const fullHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 650px; margin: 0 auto; padding: 25px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #f7fafc;">
        <div style="background-color: #1a202c; padding: 20px; border-radius: 12px 12px 0 0; text-align: center; color: #f6ad55; border-bottom: 4px solid #f6ad55;">
          <h2 style="margin: 0; font-size: 22px; font-weight: bold; letter-spacing: -0.5px;">🚨 ALERTE RETARD DE CHANTIER - inaSuivi AI</h2>
        </div>
        <div style="padding: 24px; background-color: #ffffff; border-radius: 0 0 12px 12px; border: 1px solid #edf2f7; border-top: none; color: #2d3748; line-height: 1.6;">
          <p style="font-size: 15px; margin-top: 0;">Bonjour,</p>
          <p style="font-size: 14px;">Nous vous informons qu'une analyse d'avancement a identifié des <strong>écarts d'avancement critiques (retards)</strong> sur le chantier <strong>"${project.name}"</strong> par rapport au chronogramme cible officiel.</p>
          
          <div style="background-color: #fffaf0; border-left: 4px solid #dd6b20; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0 0 6px 0; font-weight: bold; color: #dd6b20; font-size: 14px;">📋 Informations du projet :</p>
            <p style="margin: 3px 0; font-size: 13px; color: #4a5568;"><strong>Localisation :</strong> ${project.location || "Non précisé"}</p>
            <p style="margin: 3px 0; font-size: 13px; color: #4a5568;"><strong>Client :</strong> ${project.clientName || "Non précisé"}</p>
            <p style="margin: 3px 0; font-size: 13px; color: #4a5568;"><strong>Rapport d'arrêté :</strong> Situations de travaux évaluées au ${sitDate ? new Date(sitDate).toLocaleDateString("fr-DZ") : "Dernière date approuvée"}</p>
            <p style="margin: 3px 0; font-size: 13px; color: #4a5568;"><strong>Généré le :</strong> ${new Date().toLocaleDateString("fr-DZ")} à ${new Date().toLocaleTimeString("fr-DZ")}</p>
          </div>

          <h3 style="color: #2d3748; border-bottom: 2px solid #e2e8f0; padding-bottom: 8px; margin-top: 30px; font-size: 16px; font-weight: bold;">⚠️ Liste des Lots et Phases en Retard constaté :</h3>
          <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px; margin: 15px 0;">
            <thead>
              <tr style="background-color: #edf2f7; border-bottom: 2px solid #cbd5e0; color: #4a5568; font-weight: bold;">
                <th style="padding: 10px; text-align: left;">Lot d'ouvrage</th>
                <th style="padding: 10px; text-align: left;">Description de la phase</th>
                <th style="padding: 10px; text-align: center;">Réel</th>
                <th style="padding: 10px; text-align: center;">Cible</th>
                <th style="padding: 10px; text-align: center;">Écart</th>
                <th style="padding: 10px; text-align: center;">Date de Fin</th>
              </tr>
            </thead>
            <tbody>
              ${delayedHtml}
            </tbody>
          </table>

          <p style="margin-top: 30px; font-size: 12px; color: #718096; line-height: 1.6; border-top: 1px solid #edf2f7; padding-top: 20px;">
            Cet email automatisé a été configuré et transmis via le moteur d'ingénierie <strong>inaSuivi AI</strong>. Pour toute question ou correction d'avancement, veuillez vous rapprocher de l'inspecteur ou de la direction des travaux.
          </p>
        </div>
        <div style="text-align: center; font-size: 11px; color: #a0aec0; margin-top: 20px;">
          © ${new Date().getFullYear()} inaSuivi AI • Suivi de Chantier & Situations de Travaux Intelligentes.
        </div>
      </div>
    `;

    try {
      const res = await api.projects.notifyDelay(
        project.id,
        delayEmailRecipients,
        delayEmailSubject || `🚨 [Alerte Retard] Chantier : ${project.name}`,
        fullHtml,
        `Alerte de Retard - Chantier : ${project.name}. Les lots suivants sont en retard (évaluation basée sur l'arrêté de situation du ${sitDate ? new Date(sitDate).toLocaleDateString("fr-DZ") : ""}) :\n` + 
        delayedTasksList.map(t => {
          const act = getLotProgress(t.associatedLot || "");
          const targ = getExpectedProgressAtDate(t, sitDate);
          return `- ${t.associatedLot || "Général"} / ${t.name} (Réel: ${act}% vs Cible: ${targ}%)`;
        }).join("\n")
      );

      if (res.success) {
        setDelayEmailSuccess(res.info || "Notification envoyée avec succès.");
        onProjectUpdated(res.project);
      } else {
        setDelayEmailError("Une erreur s'est produite lors de l'envoi de l'e-mail.");
      }
    } catch (err: any) {
      setDelayEmailError(err.message || "Impossible de transmettre l'alerte email.");
    } finally {
      setDelayEmailLoading(false);
    }
  };

  const handleSaveStakeholderEmails = async () => {
    setIsSavingStakeholders(true);
    setDelayEmailError(null);
    setDelayEmailSuccess(null);
    try {
      const updated = await api.projects.update(project.id, {
        clientEmail: inlineClientEmail,
        supervisorEmail: inlineSupervisorEmail,
        contractorEmail: inlineContractorEmail,
      });
      onProjectUpdated(updated);
      setDelayEmailSuccess("Adresses de contact des intervenants enregistrées avec succès !");
    } catch (err: any) {
      setDelayEmailError("Erreur d'enregistrement : " + err.message);
    } finally {
      setIsSavingStakeholders(false);
    }
  };

  // Planning & Retards state and handlers
  const [newPlanningStartDate, setNewPlanningStartDate] = useState(project.planningStartDate || "2026-06-01");
  const [newPlanningEndDate, setNewPlanningEndDate] = useState(project.planningEndDate || "2026-12-01");
  const [planningProposeLoading, setPlanningProposeLoading] = useState(false);
  const [planningFile, setPlanningFile] = useState<File | null>(null);
  const [planningFileLoading, setPlanningFileLoading] = useState(false);

  // Diagnostic states and handlers  
  const [opinionDocType, setOpinionDocType] = useState<'pv' | 'journal'>('pv');
  const [opinionFile, setOpinionFile] = useState<File | null>(null);
  const [opinionFileLoading, setOpinionFileLoading] = useState(false);
  const [opinionError, setOpinionError] = useState<string | null>(null);
  const [selectedOpinion, setSelectedOpinion] = useState<any | null>(null);

  const handleProposePlanning = async () => {
    if (!newPlanningStartDate || !newPlanningEndDate) return;
    setPlanningProposeLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const updated = await api.projects.proposePlanning(project.id, newPlanningStartDate, newPlanningEndDate);
      onProjectUpdated(updated);
      setSuccessMsg("Planning théorique proposé par l'IA avec succès à partir de vos de de début et de fin pour ce chantier.");
    } catch (err: any) {
      setError(err.message || "Erreur de génération du planning");
    } finally {
      setPlanningProposeLoading(false);
    }
  };

  const handleUploadPlanningFile = async () => {
    if (!planningFile) return;
    setPlanningFileLoading(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const base64Str = await convertFileToBase64(planningFile);
      const pureBase64 = base64Str.split(",")[1] || base64Str;
      const updated = await api.projects.analyzePlanningFile(project.id, pureBase64, planningFile.type, planningFile.name);
      onProjectUpdated(updated);
      setSuccessMsg("Planning extrait par l'IA avec succès à partir du document importé.");
      setPlanningFile(null);
    } catch (err: any) {
      setError(err.message || "Erreur d'analyse du fichier de planning");
    } finally {
      setPlanningFileLoading(false);
    }
  };

  const handleEvaluateOpinion = async () => {
    if (!opinionFile) return;
    setOpinionFileLoading(true);
    setOpinionError(null);
    setError(null);
    setSuccessMsg(null);
    try {
      const base64Str = await convertFileToBase64(opinionFile);
      const pureBase64 = base64Str.split(",")[1] || base64Str;
      const res = await api.projects.evaluateProjectOpinion(
        project.id,
        pureBase64,
        opinionFile.type,
        opinionFile.name,
        opinionDocType
      );
      onProjectUpdated(res.project);
      setSuccessMsg(`Diagnostic IA effectué avec succès à partir du document. Retrouvez l'avis d'expert ci-dessous.`);
      setOpinionFile(null);
    } catch (err: any) {
      setOpinionError(err.message || "Erreur lors de l'évaluation IA");
    } finally {
      setOpinionFileLoading(false);
    }
  };

  const getLotProgress = (lotName: string, customSitId?: string) => {
    const lotItems = project.workItems.filter(item => getLotName(item) === lotName);
    if (lotItems.length === 0) return 0;
    
    let targetSituation = null;
    const allSituations = project.situations || [];
    
    // Default or specified situation ID
    const sitIdToUse = customSitId || selectedPlanningSitId;
    
    if (sitIdToUse === "latest_approved") {
      // Find the latest approved/paid situation
      const approvedSits = allSituations.filter(s => s.status === "approved" || s.status === "paid");
      targetSituation = approvedSits.length > 0
        ? [...approvedSits].sort((a, b) => b.number - a.number)[0]
        : null;
      
      // Fallback: If no approved situation yet, use the latest draft/submitted situation so the screen isn't empty
      if (!targetSituation && allSituations.length > 0) {
        targetSituation = [...allSituations].sort((a, b) => b.number - a.number)[0];
      }
    } else if (sitIdToUse === "latest_any") {
      targetSituation = allSituations.length > 0
        ? [...allSituations].sort((a, b) => b.number - a.number)[0]
        : null;
    } else {
      targetSituation = allSituations.find(s => s.id === sitIdToUse) || null;
    }
    
    if (!targetSituation) return 0;
    
    let totalContractVal = 0;
    let totalExecutedVal = 0;
    
    lotItems.forEach(item => {
      const itemProgress = targetSituation.itemsProgress[item.id] ?? 0;
      const itemTotalContract = item.quantity * item.unitPrice;
      totalContractVal += itemTotalContract;
      totalExecutedVal += itemTotalContract * (itemProgress / 100);
    });
    
    if (totalContractVal === 0) return 0;
    return Math.round((totalExecutedVal / totalContractVal) * 100);
  };

  // Get the date of the selected reference situation to calculate target checkpoints
  const getPlanningSituationDate = (): string | null => {
    const allSituations = project.situations || [];
    const sitIdToUse = selectedPlanningSitId;
    
    let targetSituation = null;
    if (sitIdToUse === "latest_approved") {
      const approvedSits = allSituations.filter(s => s.status === "approved" || s.status === "paid");
      targetSituation = approvedSits.length > 0
        ? [...approvedSits].sort((a, b) => b.number - a.number)[0]
        : null;
    } else if (sitIdToUse === "latest_any") {
      targetSituation = allSituations.length > 0
        ? [...allSituations].sort((a, b) => b.number - a.number)[0]
        : null;
    } else {
      targetSituation = allSituations.find(s => s.id === sitIdToUse) || null;
    }
    
    return targetSituation ? targetSituation.date : null;
  };

  // Dynamically calculate expected target progress on the selected situation's date
  const getExpectedProgressAtDate = (task: PlanningTask, refDateString: string | null): number => {
    if (!refDateString || planningComparisonMode === "static") {
      return task.progress; // fallback to the overall phase target
    }
    
    try {
      const start = new Date(task.targetStartDate).getTime();
      const end = new Date(task.targetEndDate).getTime();
      const ref = new Date(refDateString).getTime();
      
      if (isNaN(start) || isNaN(end) || isNaN(ref)) {
        return task.progress;
      }
      
      if (ref < start) return 0;
      if (ref > end) return 100;
      
      const totalDuration = end - start;
      if (totalDuration <= 0) return 100;
      
      const elapsed = ref - start;
      const ratio = elapsed / totalDuration;
      return Math.min(100, Math.max(0, Math.round(ratio * 100)));
    } catch {
      return task.progress;
    }
  };

  // Convert File to Base64 (needed for AI API)
  const convertFileToBase64 = (fileObj: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(fileObj);
      reader.onload = () => {
        const resultStr = reader.result as string;
        const base64Content = resultStr.split(",")[1];
        resolve(base64Content);
      };
      reader.onerror = (err) => reject(err);
    });
  };

  const handleUploadAndParseLot = async () => {
    if (!addLotFile) {
      setAddLotError("Veuillez sélectionner un fichier.");
      return;
    }
    if (!addLotName.trim()) {
      setAddLotError("Veuillez renseigner le nom du nouveau Lot.");
      return;
    }

    setAddLotLoading(true);
    setAddLotError(null);
    setAddLotSuccess(null);
    setAddLotParsedItems([]);

    if (addLotFileType === "excel") {
      // Direct Excel Client-side Parser
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target?.result as ArrayBuffer);
          const workbook = XLSX.read(data, { type: "array" });
          const firstSheet = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheet];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          if (!jsonData || jsonData.length === 0) {
            setAddLotError("La première feuille du document Excel est vide.");
            setAddLotLoading(false);
            return;
          }

          let codeCol = 0;
          let descCol = 1;
          let unitCol = 2;
          let qtyCol = 3;
          let priceCol = 4;
          
          // Heuristic scan columns
          const scanLimit = Math.min(15, jsonData.length);
          for (let r = 0; r < scanLimit; r++) {
            const row = jsonData[r];
            if (!row) continue;
            row.forEach((cell, idx) => {
              if (typeof cell === "string") {
                const low = cell.toLowerCase();
                if (low.includes("code") || low.includes("poste") || low.includes("n°")) codeCol = idx;
                else if (low.includes("design") || low.includes("désign") || low.includes("travaux") || low.includes("libel")) descCol = idx;
                else if (low.includes("unit") || low.includes("unite") || low.includes("unité")) unitCol = idx;
                else if (low.includes("quant") || low.includes("qte") || low.includes("qté")) qtyCol = idx;
                else if (low.includes("prix") || low.includes("p.u") || low.includes("pu")) priceCol = idx;
              }
            });
          }

          const parsedItems: Omit<WorkItem, "id">[] = [];
          for (let r = 0; r < jsonData.length; r++) {
            const row = jsonData[r];
            if (!row || row.length < 2) continue;
            
            const rawDesc = String(row[descCol] || "").trim();
            if (!rawDesc) continue;

            // Skip headers
            const descLow = rawDesc.toLowerCase();
            if (descLow.includes("design") || descLow.includes("travaux") || descLow.includes("libel") || descLow.includes("description") || descLow.includes("total")) {
              continue;
            }

            const codeVal = String(row[codeCol] || `${parsedItems.length + 1}`).trim();
            const unitVal = String(row[unitCol] || "u").trim();
            
            const rawQty = String(row[qtyCol] || "0").replace(/[^0-9.,]/g, "").replace(",", ".");
            const qtyVal = parseFloat(rawQty) || 0;

            const rawPrice = String(row[priceCol] || "0").replace(/[^0-9.,]/g, "").replace(",", ".");
            const priceVal = parseFloat(rawPrice) || 0;

            if (rawDesc && (qtyVal > 0 || priceVal > 0)) {
              parsedItems.push({
                code: codeVal,
                designation: rawDesc,
                unit: unitVal,
                quantity: qtyVal,
                unitPrice: priceVal,
                totalPrice: Number((qtyVal * priceVal).toFixed(2)),
                lot: addLotName.trim(),
              });
            }
          }

          if (parsedItems.length === 0) {
            setAddLotError("Aucun poste de travaux lisible n'a été extrait de ce fichier Excel. Veuillez vérifier son architecture.");
          } else {
            setAddLotParsedItems(parsedItems);
            setAddLotSuccess(`✓ ${parsedItems.length} postes de travaux ont été correctement pré-importés !`);
          }
        } catch (err: any) {
          setAddLotError("Impossible de lire la feuille Excel : " + (err.message || err));
        } finally {
          setAddLotLoading(false);
        }
      };
      reader.onerror = () => {
        setAddLotError("Erreur physique lors de la lecture du fichier Excel.");
        setAddLotLoading(false);
      };
      reader.readAsArrayBuffer(addLotFile);

    } else {
      // PDF / Image via AI Gemini Call
      try {
        const b64 = await convertFileToBase64(addLotFile);
        const res = await api.projects.extract(b64, addLotFile.type);

        if (!res.success || !res.workItems || res.workItems.length === 0) {
          throw new Error("L'IA Gemini n'a reconnu aucun poste de travail structuré.");
        }

        const mapped = res.workItems.map((item) => ({
          code: item.code || "",
          designation: item.designation || "",
          unit: item.unit || "u",
          quantity: typeof item.quantity === "number" ? item.quantity : 1,
          unitPrice: typeof item.unitPrice === "number" ? item.unitPrice : 0,
          totalPrice: typeof item.totalPrice === "number" ? item.totalPrice : 0,
          lot: addLotName.trim(),
        }));

        setAddLotParsedItems(mapped);
        setAddLotSuccess(`✓ ${mapped.length} postes de travaux ont été détectés et formatés par l'IA Gemini !`);
      } catch (err: any) {
        setAddLotError("Erreur d'extraction par l'IA Gemini : " + (err.message || err));
      } finally {
        setAddLotLoading(false);
      }
    }
  };

  const handleSaveImportedLot = async () => {
    if (addLotParsedItems.length === 0) return;
    
    setAddLotLoading(true);
    try {
      const itemsWithIds: WorkItem[] = addLotParsedItems.map((item) => ({
        ...item,
        id: "item_" + Math.random().toString(36).substring(2, 9),
      }));

      // Combine existing with new items
      const updatedWorkItems = [
        ...(project.workItems || []),
        ...itemsWithIds,
      ];

      // Call API to persist
      const updatedProject = await api.projects.update(project.id, {
        workItems: updatedWorkItems,
      });

      // Update local parent state
      onProjectUpdated(updatedProject);

      // Reset & close
      setShowAddLotModal(false);
      setAddLotName("");
      setAddLotFile(null);
      setAddLotParsedItems([]);
      setAddLotSuccess(null);
      setAddLotError(null);

      setSuccessMsg(`✓ Le lot "${addLotName}" a été correctement importé, enregistré et sauvegardé en base de données !`);
      setTimeout(() => setSuccessMsg(null), 6000);
    } catch (err: any) {
      setAddLotError("Erreur lors de la sauvegarde du lot en base de données: " + (err.message || err));
    } finally {
      setAddLotLoading(false);
    }
  };

  // Excel File direct merger state (Combiner de Métrés & Attachements)
  const [showExcelMerger, setShowExcelMerger] = useState(false);
  const [excelSheets, setExcelSheets] = useState<string[]>([]);
  const [selectedExcelSheet, setSelectedExcelSheet] = useState<string>("");
  const [excelRows, setExcelRows] = useState<any[][]>([]);
  const [excelHeaders, setExcelHeaders] = useState<string[]>([]);
  const [excelHeaderRowIdx, setExcelHeaderRowIdx] = useState<number>(0);
  const [excelCodeColIdx, setExcelCodeColIdx] = useState<number>(-1);
  const [excelValColIdx, setExcelValColIdx] = useState<number>(-1);
  const [excelMatchBy, setExcelMatchBy] = useState<"code" | "designation">("code");
  const [excelMergeMode, setExcelMergeMode] = useState<"progress" | "qtyMois" | "qtyCumule">("qtyCumule");
  const [excelParseError, setExcelParseError] = useState<string | null>(null);
  const [excelMergeStats, setExcelMergeStats] = useState<{ matched: number; total: number } | null>(null);

  // Parse a local selected Excel file using SheetJS
  const parseSelectedExcelFile = (fileInput: File) => {
    setExcelParseError(null);
    setExcelMergeStats(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        
        setExcelSheets(workbook.SheetNames);
        if (workbook.SheetNames.length > 0) {
          const firstSheet = workbook.SheetNames[0];
          setSelectedExcelSheet(firstSheet);
          loadExcelSheetRows(workbook, firstSheet);
        }
      } catch (err: any) {
        setExcelParseError("Impossible de lire ce fichier Excel : " + (err.message || err));
      }
    };
    reader.onerror = () => {
      setExcelParseError("Erreur physique de lecture du fichier.");
    };
    reader.readAsArrayBuffer(fileInput);
  };

  // Convert workbook sheet to JSON matrix rows
  const loadExcelSheetRows = (workbook: XLSX.WorkBook, sheetName: string) => {
    try {
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
      if (!jsonData || jsonData.length === 0) {
        setExcelParseError("La feuille sélectionnée est vide.");
        return;
      }
      
      setExcelRows(jsonData);
      
      // Auto-detect header row by scanning first 20 rows
      let guessedHeaderIdx = 0;
      let maxMatches = 0;
      const keywords = ["code", "designation", "travaux", "unite", "quantite", "quantité", "qte", "cumul", "mois", "avancement", "%", "poste"];
      
      const scanLimit = Math.min(20, jsonData.length);
      for (let r = 0; r < scanLimit; r++) {
        const row = jsonData[r];
        if (!Array.isArray(row)) continue;
        let mt = 0;
        row.forEach((cell) => {
          if (typeof cell === "string") {
            const cellWords = cell.toLowerCase();
            keywords.forEach((kw) => {
              if (cellWords.includes(kw)) mt++;
            });
          }
        });
        if (mt > maxMatches) {
          maxMatches = mt;
          guessedHeaderIdx = r;
        }
      }
      
      setExcelHeaderRowIdx(guessedHeaderIdx);
      const headerRow = jsonData[guessedHeaderIdx] || [];
      const headersStr = headerRow.map((h, i) => (h !== undefined ? String(h).trim() : `Colonne ${i + 1}`));
      setExcelHeaders(headersStr);
      
      // Automatically map columns
      let codeIdx = -1;
      let valIdx = -1;
      
      for (let i = 0; i < headerRow.length; i++) {
        const valStr = String(headerRow[i] || "").toLowerCase();
        if (codeIdx === -1 && (valStr.includes("code") || valStr.includes("n°") || valStr.includes("num") || valStr.includes("poste") || valStr.includes("article"))) {
          codeIdx = i;
        }
        if (valIdx === -1 && (valStr.includes("avancement") || valStr.includes("%") || valStr.includes("cumul") || valStr.includes("quantite") || valStr.includes("quantité") || valStr.includes("qte") || valStr.includes("mois"))) {
          valIdx = i;
        }
      }
      
      setExcelCodeColIdx(codeIdx !== -1 ? codeIdx : 0);
      setExcelValColIdx(valIdx !== -1 ? valIdx : (headerRow.length > 2 ? 3 : 1));
    } catch (err: any) {
      setExcelParseError("Erreur d'analyse de l'onglet : " + err.message);
    }
  };

  // Parse direct spreadsheet from base64 string
  const parseDocumentBase64Excel = (base64Str: string) => {
    setExcelParseError(null);
    setExcelMergeStats(null);
    try {
      const binaryString = window.atob(base64Str);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const workbook = XLSX.read(bytes.buffer, { type: "array" });
      setExcelSheets(workbook.SheetNames);
      if (workbook.SheetNames.length > 0) {
        const firstSheet = workbook.SheetNames[0];
        setSelectedExcelSheet(firstSheet);
        loadExcelSheetRows(workbook, firstSheet);
      }
    } catch (err: any) {
      setExcelParseError("Impossible de décoder et lire le document Excel : " + (err.message || err));
    }
  };

  // Run the merging algorithm between Excel rows and Market lines
  const runExcelMerge = () => {
    if (excelRows.length === 0 || !currentSituation) return;
    
    // Create new states keeping existing edits
    const newProgress = { ...editProgress };
    const newOverrides = { ...editOverrides };
    
    let matchedCount = 0;
    const dataRowStart = excelHeaderRowIdx + 1;
    
    for (let r = dataRowStart; r < excelRows.length; r++) {
      const row = excelRows[r];
      if (!Array.isArray(row) || row.length === 0) continue;
      
      const codeVal = String(row[excelCodeColIdx] || "").trim();
      const rawCellVal = row[excelValColIdx];
      
      if (!codeVal) continue;
      
      let cellNumericVal = parseFloat(String(rawCellVal || "0").replace(/[^\d.,-]/g, "").replace(",", ".")) || 0;
      
      // Look up corresponding workItem in project
      const item = project.workItems.find((wi) => {
        if (excelMatchBy === "code") {
          const cleanWI = String(wi.code || "").trim().toLowerCase().replace(/[\s.-]/g, "");
          const cleanRowCode = codeVal.toLowerCase().replace(/[\s.-]/g, "");
          return cleanWI === cleanRowCode || cleanWI.includes(cleanRowCode) || cleanRowCode.includes(cleanWI);
        } else {
          const cleanWI = wi.designation.trim().toLowerCase();
          const cleanRowDesig = codeVal.trim().toLowerCase();
          return cleanWI.includes(cleanRowDesig) || cleanRowDesig.includes(cleanWI);
        }
      });
      
      if (item) {
        matchedCount++;
        const qtyMarket = item.quantity;
        const uPrice = item.unitPrice;
        
        // Find previous quantity/progress
        const prevPercent = previousApprovedSituation?.itemsProgress[item.id] ?? 0;
        const qPrev = qtyMarket * (prevPercent / 100);
        
        let targetPercent = 0;
        let qtyMois = 0;
        let qtyCumulee = 0;
        
        if (excelMergeMode === "progress") {
          let val = cellNumericVal;
          // Auto-scale decimal fraction (e.g., 0.65 -> 65%)
          if (val > 0 && val <= 1 && !excelRows.some(row => parseFloat(String(row[excelValColIdx])) > 1)) {
            val = val * 100;
          }
          targetPercent = Math.max(0, val);
          qtyCumulee = qtyMarket * (targetPercent / 100);
          qtyMois = qtyCumulee - qPrev;
        } else if (excelMergeMode === "qtyCumule") {
          qtyCumulee = Math.max(0, cellNumericVal);
          targetPercent = qtyMarket > 0 ? (qtyCumulee / qtyMarket) * 100 : 0;
          qtyMois = qtyCumulee - qPrev;
        } else if (excelMergeMode === "qtyMois") {
          qtyMois = cellNumericVal;
          qtyCumulee = qPrev + qtyMois;
          targetPercent = qtyMarket > 0 ? (qtyCumulee / qtyMarket) * 100 : 0;
        }
        
        targetPercent = Math.max(0, Math.round(targetPercent * 10000) / 10000);
        newProgress[item.id] = targetPercent;
        
        const computedQtyAvenant = qtyMois > qtyMarket ? (qtyMois - qtyMarket) : 0;

        // Populate overrides to match our cell calculation formulas
        newOverrides[item.id] = {
          ...(newOverrides[item.id] || currentSituation.overrides?.[item.id] || {}),
          qtyPrecedente: computedQtyAvenant,
          qtyMois: Number(qtyMois.toFixed(4)),
          qtyMoisRaw: String(qtyMois),
          qtyCumulee: Number(qtyCumulee.toFixed(4)),
          progressPercent: Number(targetPercent.toFixed(4)),
          montantPrecedent: Number((qPrev * uPrice).toFixed(2)),
          montantMois: Number((qtyMois * uPrice).toFixed(2)),
          montantCumule: Number((qtyCumulee * uPrice).toFixed(2)),
        };
      }
    }
    
    setEditProgress(newProgress);
    setEditOverrides(newOverrides);
    setIsEditingProgress(true);
    setExcelMergeStats({ matched: matchedCount, total: project.workItems.length });
    
    setSuccessMsg(`✓ Fusion réussie ! ${matchedCount} postes du marché ont été couplés avec le carnet de métrés. Les taux et cumulés ont été recalculés. Pensez à enregistrer.`);
    setTimeout(() => setSuccessMsg(null), 8500);
  };

  // Helper to retrieve active field values (merged with unsaved user changes)
  const getActiveItemValues = (item: WorkItem) => {
    if (isEditingProgress && editWorkItems[item.id]) {
      const ed = editWorkItems[item.id];
      return {
        code: ed.code,
        designation: ed.designation,
        unit: ed.unit,
        quantity: ed.quantity,
        unitPrice: ed.unitPrice,
        totalPrice: ed.quantity * ed.unitPrice,
        lot: ed.lot,
      };
    }
    return {
      code: item.code,
      designation: item.designation,
      unit: item.unit,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      totalPrice: item.totalPrice,
      lot: item.lot || "",
    };
  };

  const handleWorkItemFieldChange = (itemId: string, field: string, value: any) => {
    setEditWorkItems((prev) => {
      const existing = prev[itemId] || {
        code: "",
        designation: "",
        unit: "",
        quantity: 0,
        unitPrice: 0,
        lot: "",
      };
      return {
        ...prev,
        [itemId]: {
          ...existing,
          [field]: value,
        },
      };
    });
  };

  // Handles custom cell overrides and reactive updates for all situation fields
  const handleSituationFieldChange = (itemId: string, field: string, value: any) => {
    setEditOverrides((prev) => {
      const existing = prev[itemId] || currentSituation?.overrides?.[itemId] || {};
      const activeVal = getActiveItemValues(project.workItems.find(i => i.id === itemId) || project.workItems[0]);
      
      const qMarketRaw = field === "quantityMarket" ? value : (existing.quantityMarket !== undefined ? existing.quantityMarket : activeVal.quantity);
      const qMarket = typeof qMarketRaw === "string" ? (parseFloat(qMarketRaw) || 0) : qMarketRaw;
      
      const qtyAvenantRaw = field === "qtyPrecedente" ? value : (existing.qtyPrecedente !== undefined ? existing.qtyPrecedente : 0);
      const qtyAvenant = typeof qtyAvenantRaw === "string" ? (parseFloat(qtyAvenantRaw) || 0) : qtyAvenantRaw;
      
      const updatedItem = {
        ...existing,
        [field]: value === "" ? undefined : value,
      };
      
      let nextProg = editProgress[itemId] !== undefined
        ? editProgress[itemId]
        : (currentSituation?.itemsProgress?.[itemId] ?? 100);

      if (field === "quantityMarket") {
        updatedItem.quantityMarket = value;
        updatedItem.qtyMoisRaw = undefined;
        // Recalculate quantity of month and progress percent based on qMarket + qtyAvenant
        const computedQtyMois = qMarket + qtyAvenant;
        nextProg = qMarket > 0 ? parseFloat(((computedQtyMois / qMarket) * 100).toFixed(4)) : 100;
        updatedItem.progressPercent = nextProg;
      } else if (field === "unitPrice") {
        updatedItem.unitPrice = value;
      } else if (field === "qtyPrecedente") {
        updatedItem.qtyPrecedente = value;
        updatedItem.qtyMoisRaw = undefined;
        // Recalculate quantity of month and progress percent based on qMarket + qtyAvenant
        const computedQtyMois = qMarket + qtyAvenant;
        nextProg = qMarket > 0 ? parseFloat(((computedQtyMois / qMarket) * 100).toFixed(4)) : 100;
        updatedItem.progressPercent = nextProg;
      } else if (field === "progressPercent") {
        updatedItem.progressPercent = value;
        nextProg = value;
        updatedItem.qtyMoisRaw = undefined;
      } else if (field === "qtyMois") {
        updatedItem.qtyMoisRaw = value;
        const enteredVal = parseFloat(value) || 0;
        nextProg = qMarket > 0 ? parseFloat(((enteredVal / qMarket) * 100).toFixed(4)) : 0;
        updatedItem.progressPercent = nextProg;
      }

      // Check cumulative and monthly quantities to auto-calculate avenant
      let liveQtyMois = qMarket * (nextProg / 100);
      if (updatedItem.qtyMoisRaw !== undefined && updatedItem.qtyMoisRaw !== "") {
        liveQtyMois = typeof updatedItem.qtyMoisRaw === "string" ? (parseFloat(updatedItem.qtyMoisRaw) || 0) : updatedItem.qtyMoisRaw;
      }

      if (liveQtyMois > qMarket) {
        updatedItem.qtyPrecedente = liveQtyMois - qMarket;
      } else {
        updatedItem.qtyPrecedente = 0;
      }

      setEditProgress((prevProg) => ({
        ...prevProg,
        [itemId]: nextProg,
      }));
      
      return {
        ...prev,
        [itemId]: updatedItem,
      };
    });
  };

  // Auto-calculated fields
  const getSelectedSituationObj = (): WorkSituation | undefined => {
    if (!project.situations || project.situations.length === 0) return undefined;
    const found = project.situations.find((s) => s.id === selectedSitId);
    if (found) return found;
    // Robust fallback: select latest situation
    const sorted = [...project.situations].sort((a, b) => b.number - a.number);
    return sorted[0];
  };

  const currentSituation = getSelectedSituationObj();

  useEffect(() => {
    if (project.situations && project.situations.length > 0) {
      if (!selectedSitId) {
        const sorted = [...project.situations].sort((a, b) => b.number - a.number);
        setSelectedSitId(sorted[0].id);
      } else {
        const sit = project.situations.find(s => s.id === selectedSitId);
        if (sit) {
          setSelectedLotFilter(sit.lotFilter || "All");
        }
      }
    } else {
      setSelectedSitId("");
    }
  }, [selectedSitId, project.situations]);

  const fetchDocumentHistory = async () => {
    if (!supabase) {
      // Offline fallback: load from local storage
      try {
        const cachedSits = localStorage.getItem(`inasuivi_hist_sits_${project.id}`);
        const cachedPVs = localStorage.getItem(`inasuivi_hist_pvs_${project.id}`);
        if (cachedSits) setHistorySituations(JSON.parse(cachedSits));
        if (cachedPVs) setHistoryPVs(JSON.parse(cachedPVs));
      } catch (e) {
        console.warn("Error reading local documents cache:", e);
      }
      return;
    }

    setHistoryLoading(true);
    try {
      const { data: sits, error: sitsErr } = await supabase
        .from("historique_situations")
        .select("*")
        .eq("projet_id", project.id)
        .order("created_at", { ascending: false });

      if (sitsErr) throw sitsErr;
      if (sits) {
        setHistorySituations(sits);
        try {
          localStorage.setItem(`inasuivi_hist_sits_${project.id}`, JSON.stringify(sits));
        } catch {}
      }

      const { data: pvs, error: pvsErr } = await supabase
        .from("pv_reunions")
        .select("*")
        .eq("projet_id", project.id)
        .order("created_at", { ascending: false });

      if (pvsErr) throw pvsErr;
      if (pvs) {
        setHistoryPVs(pvs);
        try {
          localStorage.setItem(`inasuivi_hist_pvs_${project.id}`, JSON.stringify(pvs));
        } catch {}
      }
    } catch (err: any) {
      console.warn("Failed to fetch custom document histories from Supabase, loading fallback...", err);
      try {
        const cachedSits = localStorage.getItem(`inasuivi_hist_sits_${project.id}`);
        const cachedPVs = localStorage.getItem(`inasuivi_hist_pvs_${project.id}`);
        if (cachedSits) setHistorySituations(JSON.parse(cachedSits));
        if (cachedPVs) setHistoryPVs(JSON.parse(cachedPVs));
      } catch {}
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchDocumentHistory();
  }, [project.id]);

  // Find previous approved situation relative to selected situation number
  const getPreviousApprovedSituation = (curNum: number): WorkSituation | undefined => {
    if (!project.situations) return undefined;
    const approvedSits = project.situations
      .filter((s) => s.status === "approved" || s.status === "paid")
      .filter((s) => s.number < curNum)
      .sort((a, b) => b.number - a.number);
    return approvedSits[0];
  };

  const previousApprovedSituation = currentSituation
    ? getPreviousApprovedSituation(currentSituation.number)
    : undefined;

  // Init local edit state
  const startEditingProgress = () => {
    if (!currentSituation) return;
    setEditProgress({ ...currentSituation.itemsProgress });
    setEditOverrides(currentSituation.overrides || {});
    const dict: Record<string, { code: string; designation: string; unit: string; quantity: number; unitPrice: number; lot: string }> = {};
    project.workItems.forEach((item) => {
      dict[item.id] = {
        code: item.code,
        designation: item.designation,
        unit: item.unit,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lot: item.lot || "",
      };
    });
    setEditWorkItems(dict);
    setIsEditingProgress(true);
    setSuccessMsg(null);
    setError(null);
  };

  // Convert document to base64 and extract situation progress
  const handleSituationFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !currentSituation) return;
    const file = e.target.files[0];

    setAiLoading(true);
    setAiError(null);
    setSuccessMsg(null);
    setError(null);

    // Entertaining loading milestones
    const statuses = [
      "Lecture du fichier...",
      "Conversion du document...",
      "Transmission à Gemini 3.5-Flash...",
      "OCR et détection des lignes...",
      "Comparaison avec le marché...",
      "Calcul des taux cumulés...",
      "Finalisation des saisies..."
    ];

    let currentStatusIdx = 0;
    setAiProgressMsg(statuses[0]);
    const progressInterval = setInterval(() => {
      currentStatusIdx = (currentStatusIdx + 1) % statuses.length;
      setAiProgressMsg(statuses[currentStatusIdx]);
    }, 2500);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const resultStr = reader.result as string;
        const b64 = resultStr.split(",")[1];

        const res = await api.projects.extractSituationProgress(project.id, b64, file.type);
        clearInterval(progressInterval);

        if (res && res.progressItems && res.progressItems.length > 0) {
          // Map array into a Records dictionary
          const newProgress: Record<string, number> = { ...currentSituation.itemsProgress };
          const newOverrides = { ...(currentSituation.overrides || {}) };
          const initialWorkItems: Record<string, any> = {};
          project.workItems.forEach((item) => {
            initialWorkItems[item.id] = {
              ...item,
              qtyMoisRaw: "",
            };
          });
          let matchCount = 0;

          res.progressItems.forEach((pItem) => {
            const item = project.workItems.find((wi) => wi.id === pItem.id);
            if (item) {
              const clampedVal = Math.max(0, Math.round(pItem.progressPercentage * 100) / 100);
              newProgress[pItem.id] = clampedVal;
              matchCount++;

              if (pItem.extractedQuantity !== undefined && pItem.extractedQuantity !== null) {
                const qMarket = item.quantity;
                const computedQtyAvenant = pItem.extractedQuantity > qMarket ? (pItem.extractedQuantity - qMarket) : 0;
                newOverrides[pItem.id] = {
                  ...(newOverrides[pItem.id] || {}),
                  qtyMois: pItem.extractedQuantity,
                  qtyMoisRaw: String(pItem.extractedQuantity),
                  progressPercent: clampedVal,
                  qtyPrecedente: computedQtyAvenant,
                  qtyCumulee: pItem.extractedQuantity,
                };
              } else {
                if (newOverrides[pItem.id]) {
                  newOverrides[pItem.id].qtyMoisRaw = undefined;
                  newOverrides[pItem.id].qtyMois = undefined;
                }
              }
            }
          });

          setEditProgress(newProgress);
          setEditWorkItems(initialWorkItems);
          setEditOverrides(newOverrides);
          setIsEditingProgress(true); // Automatically enter editing mode
          setSuccessMsg(`✓ Saisi instantané réussie ! L'IA a analysé le document et complété ${matchCount} postes de travaux avec succès. Veuillez vérifier puis enregistrer.`);
          setTimeout(() => setSuccessMsg(null), 8500);
        } else {
          setAiError("L'IA n'a repéré aucun poste correspondant aux postes contractuels du chantier.");
        }
      } catch (err: any) {
        clearInterval(progressInterval);
        console.error("AI situation progress extraction error:", err);
        setAiError(err.message || "Une erreur est survenue lors de l'extraction par l'IA.");
      } finally {
        setAiLoading(false);
        setAiProgressMsg("");
        e.target.value = ""; // enables re-uploading the same file
      }
    };

    reader.onerror = () => {
      clearInterval(progressInterval);
      setAiError("Échec de la lecture physique du document.");
      setAiLoading(false);
      setAiProgressMsg("");
    };
  };

  const handleProgressChange = (itemId: string, percentVal: number) => {
    const clamped = Math.max(0, Math.min(100, percentVal));
    setEditProgress((prev) => ({
      ...prev,
      [itemId]: clamped,
    }));
  };

  // -------------------------------------------------------------
  // LOT MANAGEMENT HELPERS
  // -------------------------------------------------------------

  const getLotName = (itemOrCode: any): string => {
    if (!itemOrCode) return "Lot Général";
    if (typeof itemOrCode === "object") {
      if (itemOrCode.lot && itemOrCode.lot.trim()) {
        return itemOrCode.lot.trim();
      }
      return getLotName(itemOrCode.code);
    }
    const clean = String(itemOrCode).trim();
    const firstChar = clean.charAt(0);
    if (firstChar === "1") return "Lot 1 : Terrassement & Gros Œuvres";
    if (firstChar === "2") return "Lot 2 : Infrastructures & Maçonneries";
    if (firstChar === "3") return "Lot 3 : Boiseries & Menuiseries Métalliques";
    if (firstChar === "4") return "Lot 4 : Électricité & Télécoms";
    if (firstChar === "5") return "Lot 5 : Plomberie, Sanitaire & CVC";
    if (firstChar === "6") return "Lot 6 : Revêtements de Sols & Faïences";
    if (firstChar === "7") return "Lot 7 : Peintures & Aménagements de Finition";
    return `Lot ${firstChar} : Divers & Corps d'État Secondaires`;
  };

  const handleMassSetLotProgress = (percentage: number) => {
    if (!currentSituation) return;
    const targetPercent = Math.max(0, Math.min(100, percentage));
    
    // Create copy of the progress edit state
    const newProgress = { ...(isEditingProgress ? editProgress : currentSituation.itemsProgress) };
    
    let appliedCount = 0;
    project.workItems.forEach((item) => {
      const match = selectedLotFilter === "All" || getLotName(item) === selectedLotFilter;
      if (match) {
        newProgress[item.id] = targetPercent;
        appliedCount++;
      }
    });

    setEditProgress(newProgress);
    setIsEditingProgress(true); // Automatically open the edit session
    setSuccessMsg(`✓ Saisie groupée réussie ! ${appliedCount} postes du lot "${selectedLotFilter === "All" ? "Tous les lots" : selectedLotFilter}" définis à ${targetPercent}%.`);
    setTimeout(() => setSuccessMsg(null), 6000);
  };

  // -------------------------------------------------------------
  // ATTACHMENT / DOCUMENT TRACKING HELPERS (PV, JOURNAL, METRE ASSETS)
  // -------------------------------------------------------------

  const handleAddDocFile = async (type: "pv" | "journal" | "metre" | "plan", e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0]) return;
    const file = e.target.files[0];
    
    setIsUploading(true);
    setError(null);
    setSuccessMsg(null);
    
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      try {
        const resultStr = reader.result as string;
        const b64 = resultStr.split(",")[1];
        
        let customLabel = docNameInput.trim();
        if (!customLabel) {
          const typeLabels = {
            pv: "PV de Chantier",
            journal: "Journal de Chantier",
            metre: "Carnet de Métré",
            plan: "Plan de l'ouvrage"
          };
          customLabel = `${typeLabels[type]} - ${file.name.replace(/\.[^/.]+$/, "")}`;
        }
        
        const newDoc = {
          id: "doc-" + Date.now(),
          name: customLabel,
          type,
          fileName: file.name,
          fileType: file.type,
          date: new Date().toISOString().split("T")[0],
          base64: b64,
          uploadedAt: new Date().toISOString()
        };
        
        const updatedProject = {
          ...project,
          documents: [...(project.documents || []), newDoc]
        };
        
        // Save using general project API first (to keep documents synchronized)
        const res = await api.projects.update(project.id, updatedProject);
        onProjectUpdated(res);

        // If it's a PV of meeting and supabase is set up, upload to Storage and write to 'pv_reunions'
        if (type === "pv") {
          if (supabase) {
            setSuccessMsg("Document attaché localement. Téléversement du PV sur Supabase Cloud...");
            const fileExt = file.name.split('.').pop() || "pdf";
            const storagePath = `${project.id}/PV_${Date.now()}.${fileExt}`;

            // 1. Storage upload
            const { error: uploadErr } = await supabase.storage
              .from('pv-reunions')
              .upload(storagePath, file, {
                cacheControl: '3600',
                upsert: false
              });

            if (uploadErr) {
              throw new Error(`Erreur Supabase Storage lors du téléversement du PV : ${uploadErr.message}`);
            }

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
              .from('pv-reunions')
              .getPublicUrl(storagePath);

            // 3. Database SQL insert
            const { error: insertErr } = await supabase
              .from('pv_reunions')
              .insert({
                projet_id: project.id,
                url: publicUrl,
                filename: customLabel
              });

            if (insertErr) {
              throw new Error(`Erreur SQL lors de l'enregistrement du PV : ${insertErr.message}`);
            }

            setSuccessMsg(`✓ PV de réunion "${customLabel}" importé et archivé en ligne avec succès !`);
            
            // Auto refresh the history lists
            await fetchDocumentHistory();
          } else {
            // Offline/Local mode fallback: write metadata to local storage cache
            try {
              const offlinePVItem = {
                id: "offline-pv-" + Date.now(),
                projet_id: project.id,
                url: "#",
                filename: customLabel,
                created_at: new Date().toISOString()
              };

              const cachedPVsStr = localStorage.getItem(`inasuivi_hist_pvs_${project.id}`);
              let cachedPVs = [];
              if (cachedPVsStr) cachedPVs = JSON.parse(cachedPVsStr);
              cachedPVs.unshift(offlinePVItem);
              localStorage.setItem(`inasuivi_hist_pvs_${project.id}`, JSON.stringify(cachedPVs));
              setHistoryPVs(cachedPVs);

              setSuccessMsg(`✓ PV de Réunion "${customLabel}" enregistré hors-ligne (mise en cache locale).`);
            } catch (cacheErr) {
              console.error("Local caching failed for PV metadata", cacheErr);
            }
          }
        } else {
          setSuccessMsg(`✓ Document "${newDoc.name}" enregistré et attaché avec succès !`);
        }
        
        setDocNameInput("");
        setUploadingDocType(null);
        setTimeout(() => setSuccessMsg(null), 5500);
      } catch (err: any) {
        console.error("Error in handleAddDocFile complex flow:", err);
        setError(err.message || "Erreur lors de l'enregistrement du document");
      } finally {
        setIsUploading(false);
        e.target.value = "";
      }
    };
    
    reader.onerror = () => {
      setError("Erreur physique de conversion du document.");
      setIsUploading(false);
    };
  };

  const handleDeleteDoc = (docId: string, docName: string) => {
    setDocToDelete({ id: docId, name: docName });
  };

  const confirmDeleteDoc = async () => {
    if (!docToDelete) return;
    const { id: docId, name: docName } = docToDelete;
    setDocToDelete(null);
    setLoading(true);
    try {
      const updatedDocs = (project.documents || []).filter((d: any) => d.id !== docId);
      const updatedProject = {
        ...project,
        documents: updatedDocs
      };
      
      const res = await api.projects.update(project.id, updatedProject);
      onProjectUpdated(res);
      
      // Reset plan preview or estimate ID if the deleted document was active
      if (selectedPlanForViewer?.id === docId) {
        setSelectedPlanForViewer(null);
      }
      if (selectedPlanForEstimateId === docId) {
        setSelectedPlanForEstimateId("");
      }

      setSuccessMsg(`✓ "${docName}" a été correctement retiré du projet.`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Erreur lors de la suppression du document");
    } finally {
      setLoading(false);
    }
  };

  const handleUploadChantierPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!supabase) {
      setError("Le client Supabase n'est pas initialisé. Veuillez vérifier vos variables d'environnement VITE_SUPABASE_URL et VITE_SUPABASE_ANON_KEY.");
      return;
    }

    setPhotoUploading(true);
    setError(null);
    setSuccessMsg(null);

    try {
      // 1. Définir le chemin de fichier unique sur Supabase Storage
      const fileExt = file.name.split('.').pop() || "jpg";
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 11)}.${fileExt}`;
      const filePath = `${project.id}/${fileName}`;

      // 2. Upload sur la table 'photos-chantiers'
      const { data, error: uploadErr } = await supabase.storage
        .from('photos-chantiers')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadErr) {
        throw uploadErr;
      }

      // 3. Récupérer l'URL publique de la photo
      const { data: { publicUrl } } = supabase.storage
        .from('photos-chantiers')
        .getPublicUrl(filePath);

      // 4. Enregistrer l'URL dans la base de données (champ project.photos)
      const newPhoto = {
        id: "photo-" + Date.now() + "-" + Math.random().toString(36).substring(2, 5),
        url: publicUrl,
        fileName: file.name,
        uploadedAt: new Date().toISOString(),
        caption: photoCaption.trim() || `Photo d'avancement - Situation N°${currentSituation?.number || 1}`,
        situationNumber: currentSituation?.number || 1,
        userName: currentUser?.name || currentUser?.email || "Superviseur"
      };

      const currentPhotos = project.photos || [];
      const updatedProject = {
        ...project,
        photos: [...currentPhotos, newPhoto]
      };

      const res = await api.projects.update(project.id, updatedProject);
      onProjectUpdated(res);
      setPhotoCaption("");
      setSuccessMsg("✓ Photo de chantier envoyée sur Supabase Storage et historisée avec succès !");
      setTimeout(() => setSuccessMsg(null), 5000);
    } catch (err: any) {
      console.error("Error uploading to supabase:", err);
      setError(`Échec du téléversement de la photo : ${err.message || err}`);
    } finally {
      setPhotoUploading(false);
      e.target.value = "";
    }
  };

  const handleDeleteChantierPhoto = (photoId: string) => {
    setPhotoToDelete(photoId);
  };

  const confirmDeletePhoto = async () => {
    if (!photoToDelete) return;
    const photoId = photoToDelete;
    setPhotoToDelete(null);
    setLoading(true);
    try {
      const updatedPhotos = (project.photos || []).filter((p) => p.id !== photoId);
      const updatedProject = {
        ...project,
        photos: updatedPhotos
      };

      const res = await api.projects.update(project.id, updatedProject);
      onProjectUpdated(res);
      setSuccessMsg("✓ Photo supprimée de l'historique.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Erreur de suppression de la photo");
    } finally {
      setLoading(false);
    }
  };

  const handleAISituationGeneration = async (doc: any) => {
    if (!currentSituation) {
      setError("Veuillez d'abord sélectionner ou créer une situation active avant de lancer la génération.");
      return;
    }
    
    setAiLoading(true);
    setAiError(null);
    setSuccessMsg(null);
    setAiProgressMsg(`Analyse cognitive de "${doc.name}" en cours via Gemini 3.5...`);
    
    try {
      const res = await api.projects.extractSituationProgress(project.id, doc.base64, doc.fileType);
      if (res && res.progressItems && res.progressItems.length > 0) {
        const newProgress = { ...currentSituation.itemsProgress };
        const newOverrides = { ...(currentSituation.overrides || {}) };
        const initialWorkItems: Record<string, any> = {};
        project.workItems.forEach((item) => {
          initialWorkItems[item.id] = {
            ...item,
            qtyMoisRaw: "",
          };
        });
        let matchCount = 0;
        
        res.progressItems.forEach((pItem: any) => {
          const item = project.workItems.find((wi) => wi.id === pItem.id);
          if (item) {
            const clampedVal = Math.max(0, Math.round(pItem.progressPercentage * 100) / 100);
            newProgress[pItem.id] = clampedVal;
            matchCount++;

            if (pItem.extractedQuantity !== undefined && pItem.extractedQuantity !== null) {
              const qMarket = item.quantity;
              const computedQtyAvenant = pItem.extractedQuantity > qMarket ? (pItem.extractedQuantity - qMarket) : 0;
              newOverrides[pItem.id] = {
                ...(newOverrides[pItem.id] || {}),
                qtyMois: pItem.extractedQuantity,
                qtyMoisRaw: String(pItem.extractedQuantity),
                progressPercent: clampedVal,
                qtyPrecedente: computedQtyAvenant,
                qtyCumulee: pItem.extractedQuantity,
              };
            } else {
              if (newOverrides[pItem.id]) {
                newOverrides[pItem.id].qtyMoisRaw = undefined;
                newOverrides[pItem.id].qtyMois = undefined;
              }
            }
          }
        });
        
        setEditProgress(newProgress);
        setEditWorkItems(initialWorkItems);
        setEditOverrides(newOverrides);
        setIsEditingProgress(true); // Automatically enter editing mode
        setSuccessMsg(`✓ Génération réussie ! L'IA inaSuivi a scanné "${doc.name}" et complété ${matchCount} postes correspondants sur la situation.`);
        setTimeout(() => setSuccessMsg(null), 9000);
      } else {
        setAiError(`Aucune information exploitable sur l'avancement n'a été repérée par l'IA dans "${doc.name}".`);
      }
    } catch (err: any) {
      setAiError(err.message || "Erreur de transmission automatique");
    } finally {
      setAiLoading(false);
      setAiProgressMsg("");
    }
  };

  // Save the progress edits to database
  const saveProgressEdits = async () => {
    if (!currentSituation) return;
    setLoading(true);
    setError(null);
    try {
      // Calculate changes for Audit Log
      const changes: string[] = [];
      project.workItems.forEach((item) => {
        const oldValue = currentSituation.itemsProgress[item.id] ?? 0;
        const newValue = editProgress[item.id] ?? 0;
        if (oldValue !== newValue) {
          changes.push(`Poste ${item.code} (${item.designation}) modifié de ${oldValue}% à ${newValue}%`);
        }
      });

      const updatedSit = await api.projects.updateSituation(project.id, currentSituation.id, {
        itemsProgress: editProgress,
        overrides: editOverrides,
      });

      let updatedProject = {
        ...project,
        situations: project.situations.map((s) => (s.id === currentSituation.id ? updatedSit : s)),
      };

      const overrideKeys = Object.keys(editOverrides || {});
      if (overrideKeys.length > 0) {
        changes.push(`Saisie manuelle personnalisée de l'avancement (% ou quantités) pour ${overrideKeys.length} postes.`);
      }

      if (changes.length > 0) {
        const userName = currentUser?.name || currentUser?.email || "Jean Conducteur (Démo)";
        const userEmail = currentUser?.email || "demo@batigest.fr";
        const newLogs: AuditLog[] = changes.map((desc) => ({
          id: "audit-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
          userName,
          userEmail,
          date: new Date().toLocaleString("fr-FR"),
          action: desc,
          situationNumber: currentSituation.number,
          situationId: currentSituation.id
        }));
        
        updatedProject.auditLogs = [...newLogs, ...(project.auditLogs || [])];
        
        // Save to database
        updatedProject = await api.projects.update(project.id, updatedProject);
      }

      onProjectUpdated(updatedProject);
      setIsEditingProgress(false);
      setSuccessMsg("L'état d'avancement a été sauvegardé avec succès.");
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Impossible d'enregistrer l'avancement");
    } finally {
      setLoading(false);
    }
  };

  // Create next situation
  const handleCreateSituation = async () => {
    setLoading(true);
    setError(null);
    try {
      let nextSit = await api.projects.createSituation(project.id, {
        comment: newSitComment,
        date: newSitDate,
        lotFilter: newSitLotFilter,
      });

      let updatedProject = {
        ...project,
        situations: [...(project.situations || []), nextSit],
      };

      // If document analysis is requested on creation
      if (selectedDocIdForNewSit) {
        const doc = (project.documents || []).find((d) => d.id === selectedDocIdForNewSit);
        if (doc) {
          try {
            setAiLoading(true);
            setAiProgressMsg(`Analyse de "${doc.name}" par l'IA...`);
            const aiRes = await api.projects.extractSituationProgress(project.id, doc.base64, doc.fileType);
            if (aiRes && aiRes.progressItems && aiRes.progressItems.length > 0) {
              const itemsProgress = { ...nextSit.itemsProgress };
              const overrides = { ...(nextSit.overrides || {}) };
              let count = 0;
              aiRes.progressItems.forEach((pItem: any) => {
                const item = project.workItems.find((wi) => wi.id === pItem.id);
                if (item) {
                  const clampedVal = Math.max(0, Math.round(pItem.progressPercentage * 100) / 100);
                  itemsProgress[pItem.id] = clampedVal;
                  count++;

                  if (pItem.extractedQuantity !== undefined && pItem.extractedQuantity !== null) {
                    const qMarket = item.quantity;
                    const computedQtyAvenant = pItem.extractedQuantity > qMarket ? (pItem.extractedQuantity - qMarket) : 0;
                    overrides[pItem.id] = {
                      ...(overrides[pItem.id] || {}),
                      qtyMois: pItem.extractedQuantity,
                      qtyMoisRaw: String(pItem.extractedQuantity),
                      progressPercent: clampedVal,
                      qtyPrecedente: computedQtyAvenant,
                      qtyCumulee: pItem.extractedQuantity,
                    };
                  }
                }
              });
              
              const updatedSit = await api.projects.updateSituation(project.id, nextSit.id, {
                itemsProgress,
                overrides,
              });
              
              nextSit = updatedSit;
              
              // Add persistent Audit Trail logs for AI injection!
              const userName = currentUser?.name || currentUser?.email || "Jean Conducteur (Démo)";
              const userEmail = currentUser?.email || "demo@batigest.fr";
              const newLogs: AuditLog[] = [
                {
                  id: "audit-ai-" + Date.now(),
                  userName,
                  userEmail,
                  date: new Date().toLocaleString("fr-FR"),
                  action: `Création de situation & extraction IA ✨ depuis "${doc.name}" pour ${count} postes de travaux d'avancement.`,
                  situationNumber: nextSit.number,
                  situationId: nextSit.id
                }
              ];
              
              updatedProject = {
                ...project,
                situations: project.situations.map((s) => s.id === nextSit.id ? nextSit : s).concat(project.situations.some(s => s.id === nextSit.id) ? [] : [nextSit]),
                auditLogs: [...newLogs, ...(project.auditLogs || [])]
              };
              
              // Persist update in project on server DB as well!
              updatedProject = await api.projects.update(project.id, updatedProject);
            }
          } catch (docErr: any) {
            console.error("Auto AI extraction error on creation:", docErr);
            setError(`Situation créée, mais échec de l'extraction par l'IA: ${docErr.message || docErr}`);
          } finally {
            setAiLoading(false);
            setAiProgressMsg("");
          }
        }
      }

      if (!selectedDocIdForNewSit) {
        // Persist update in project on server DB as well to ensure total consistency!
        updatedProject = await api.projects.update(project.id, updatedProject);
      }

      onProjectUpdated(updatedProject);
      setSelectedSitId(nextSit.id);
      setSituationStatusFilter("all"); // Ensure newly created situation is visible immediately
      setIsEditingProgress(false);
      setEditProgress({});
      setEditOverrides({});
      setEditWorkItems({});
      setShowNewSitModal(false);
      setNewSitComment("");
      setSelectedDocIdForNewSit("");
      setSuccessMsg(`Situation N°${nextSit.number} initialisée avec succès !`);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Erreur de création de situation");
    } finally {
      setLoading(false);
    }
  };

  // Approve or pay current situation
  const updateSituationStatus = async (newStatus: "draft" | "approved" | "paid") => {
    if (!currentSituation) return;
    setLoading(true);
    setError(null);
    try {
      const updateData: any = { status: newStatus };
      
      // Auto-save the in-progress edits for the selected lot or all items alongside the status update
      if (isEditingProgress) {
        updateData.itemsProgress = editProgress;
        updateData.overrides = editOverrides;
      }

      const updatedSit = await api.projects.updateSituation(project.id, currentSituation.id, updateData);

      let updatedProject = {
        ...project,
        situations: project.situations.map((s) => (s.id === currentSituation.id ? updatedSit : s)),
      };

      if (isEditingProgress) {
        const changes: string[] = [];
        project.workItems.forEach((item) => {
          const oldValue = currentSituation.itemsProgress[item.id] ?? 0;
          const newValue = editProgress[item.id] ?? 0;
          if (oldValue !== newValue) {
            changes.push(`Poste ${item.code} (${item.designation}) modifié de ${oldValue}% à ${newValue}%`);
          }
        });

        const overrideKeys = Object.keys(editOverrides || {});
        if (overrideKeys.length > 0) {
          changes.push(`Saisie manuelle personnalisée de l'avancement (% ou quantités) pour ${overrideKeys.length} postes.`);
        }

        if (changes.length > 0) {
          const userName = currentUser?.name || currentUser?.email || "Jean Conducteur (Démo)";
          const userEmail = currentUser?.email || "demo@batigest.fr";
          const newLogs: AuditLog[] = changes.map((desc) => ({
            id: "audit-" + Date.now() + "-" + Math.random().toString(36).substring(2, 6),
            userName,
            userEmail,
            date: new Date().toLocaleString("fr-FR"),
            action: desc,
            situationNumber: currentSituation.number
          }));
          
          updatedProject.auditLogs = [...newLogs, ...(project.auditLogs || [])];
        }

        setIsEditingProgress(false);
      }

      // Persist the audit logs or other project attributes updated
      updatedProject = await api.projects.update(project.id, updatedProject);

      onProjectUpdated(updatedProject);
      setSuccessMsg(
        newStatus === "approved"
          ? "La situation a été approuvée et enregistrée avec succès !"
          : `Statut mis à jour : ${newStatus === "paid" ? "Payé" : "Brouillon"}`
      );
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.message || "Erreur lors du changement de statut");
    } finally {
      setLoading(false);
    }
  };

  // Delete current situation
  const handleDeleteSituation = async () => {
    if (!currentSituation) return;

    setLoading(true);
    setError(null);
    try {
      const sitNum = currentSituation.number;
      const res = await api.projects.deleteSituation(project.id, currentSituation.id);
      
      const updatedProject = {
        ...project,
        situations: res.situations,
        auditLogs: res.auditLogs || (project.auditLogs || []).filter((log) => log.situationNumber !== sitNum),
      };
      onProjectUpdated(updatedProject);

      // Select next situation, or blank
      const sorted = [...res.situations].sort((a, b) => b.number - a.number);
      setSelectedSitId(sorted.length > 0 ? sorted[0].id : "");
      setSuccessMsg("Situation supprimée avec succès (ainsi que les journaux d'audit associés).");
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err: any) {
      setError(err.message || "Erreur de suppression");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    const inIframe = (() => {
      try {
        return window.self !== window.top;
      } catch (e) {
        return true;
      }
    })();

    if (inIframe) {
      setShowPrintIframeModal(true);
    } else {
      try {
        window.print();
      } catch (err) {
        setShowPrintIframeModal(true);
      }
    }
  };

  const exportContractToExcel = () => {
    const data: any[][] = [
      ["BATIGEST AI - DÉTAIL DU MARCHÉ DE BASE"],
      [],
      ["Nom du Chantier :", project.name],
      ["Client (Maître d'Ouvrage) :", project.clientName],
      ["Entreprise Titulaire :", project.contractor || "N/A"],
      ["Cabinet de Contrôle (MŒ) :", project.supervisor],
      ["Localisation :", project.location],
      ["Date du Contrat :", project.contractDate || ""],
      [],
      ["Code", "Désignation claire du Lot / Poste", "Unité", "Quantité Contractuelle", "Prix Unitaire HT (DA)", "Montant Total Marché HT (DA)"]
    ];

    project.workItems?.forEach((item) => {
      data.push([
        item.code,
        item.designation,
        item.unit,
        item.quantity,
        item.unitPrice,
        item.totalPrice
      ]);
    });

    data.push([]);
    data.push(["", "", "", "", "TOTAL GÉNÉRAL HORS TAXES :", totalContractHT]);

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Marché Initial");

    // Dynamic clean filename
    const cleanName = project.name.replace(/[^a-z0-9]/gi, "_");
    XLSX.writeFile(workbook, `inaSuivi_Marche_${cleanName}.xlsx`);
  };

  const exportSituationToExcel = async () => {
    if (!currentSituation) return;

    const data: any[][] = [
      [`SITUATION DE TRAVAUX COMPTABLE N°${currentSituation.number}`],
      [],
      ["Désignation Chantier :", project.name],
      ["Localisation :", project.location],
      ["Client (Maître d'Ouvrage) :", project.clientName],
      ["Entreprise Titulaire :", project.contractor || "N/A"],
      ["Cabinet de Contrôle :", project.supervisor],
      ["Date de Clôture :", new Date(currentSituation.date).toLocaleDateString("fr-FR")],
      ["Statut de la situation :", currentSituation.status === "draft" ? "Brouillon" : currentSituation.status === "approved" ? "Approuvé" : "Payé"]
    ];

    if (selectedLotFilter !== "All") {
      data.push(["Lot Sélectionné :", selectedLotFilter]);
    }
    data.push([]);

    data.push([
      "Code", 
      "Désignation", 
      "Unité", 
      "Qté Marché", 
      "Qté Avenant", 
      "Qté Mois", 
      "Qté Cum.", 
      "Avanc. %", 
      "P.U. HT (DA)", 
      "Montant Précédent (DA)", 
      "Montant Mois (DA)", 
      "Montant Cum. (DA)",
      "Montant Reste (DA)"
    ]);

    const filteredItems = (project.workItems || []).filter(
      (item) => selectedLotFilter === "All" || getLotName(item) === selectedLotFilter
    );

    filteredItems.forEach((item) => {
      const row = getRowValues(item);

      data.push([
        item.code,
        row.designation,
        row.unit,
        row.quantityMarket,
        row.qtyAvenant,
        row.qtyMois,
        row.qtyCumulee,
        row.progressPercent,
        row.unitPrice,
        row.montantPrecedent,
        row.montantMois,
        row.montantCumule,
        row.reste
      ]);
    });

    data.push([]);
    data.push(["RÉCAPITULATIF FINANCIER DE LA SITUATION"]);
    data.push(["Désignation de la ligne", "Montant (DA)"]);
    data.push(["Marché de base global initial HT :", totalContractHT]);
    data.push(["Montant total Avenant HT :", totalAvenantHT]);
    data.push(["Cumul des travaux terminés HT :", currentCumulHT]);
    data.push(["Reste à réaliser global HT :", totalContractHT - currentCumulHT]);
    data.push([`Retenue de garantie cumulée (${projectRetentionRate}%) :`, -currentRetentionAmount]);
    data.push(["Net accompli cumulé HT (Montant Net de la Période) :", totalPaidNetHT]);
    data.push([`TVA applicable sur la période (${projectTvaRate}%) :`, periodTva]);
    data.push(["MONTANT TOTAL NET À PAYER TTC SUR LA PÉRIODE :", periodPayableTTC]);

    // Create workbook and sheet
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Situation N°${currentSituation.number}`);

    const cleanName = project.name.replace(/[^a-z0-9]/gi, "_");
    const filename = `inaSuivi_Situation_${currentSituation.number}_${cleanName}.xlsx`;
    
    // Save locally
    XLSX.writeFile(workbook, filename);

    // If Supabase client is available, upload to storage situations-generees and save to SQL
    if (supabase) {
      setLoading(true);
      setError(null);
      setSuccessMsg("Génération du document en cours... Archivage immédiat sur Supabase Cloud...");
      try {
        const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const excelFile = new File([blob], filename, { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        const filePath = `${project.id}/Situation_${currentSituation.number}_${Date.now()}.xlsx`;

        // 1. Upload file to Supabase Storage bucket 'situations-generees'
        const { error: uploadErr } = await supabase.storage
          .from('situations-generees')
          .upload(filePath, excelFile, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadErr) {
          throw new Error(`Erreur Supabase Storage: ${uploadErr.message}`);
        }

        // 2. Get Public URL
        const { data: { publicUrl } } = supabase.storage
          .from('situations-generees')
          .getPublicUrl(filePath);

        // 3. Insert immediately into table 'historique_situations'
        const { error: insertErr } = await supabase
          .from('historique_situations')
          .insert({
            projet_id: project.id,
            url: publicUrl,
            filename: filename
          });

        if (insertErr) {
          throw new Error(`Erreur SQL Insert historique_situations: ${insertErr.message}`);
        }

        setSuccessMsg(`✓ La Situation financière N°${currentSituation.number} a été téléchargée et archivée avec succès dans l'historique sur Supabase !`);
        setTimeout(() => setSuccessMsg(null), 5000);
        
        // Refresh document history list
        await fetchDocumentHistory();
      } catch (err: any) {
        console.error("Failed to archive situation on Supabase:", err);
        setError(`Échec de l'archivage automatique en ligne : ${err.message || err}. Le fichier Excel a tout de même été téléchargé localement.`);
      } finally {
        setLoading(false);
      }
    } else {
      // Offline fallback: save metadata to local storage
      try {
        const offlineId = "offline-sit-" + Date.now();
        const offlineHistItem = {
          id: offlineId,
          projet_id: project.id,
          url: "#", // placeholder for offline
          filename: filename,
          created_at: new Date().toISOString()
        };

        const cachedSitsStr = localStorage.getItem(`inasuivi_hist_sits_${project.id}`);
        let cachedSits = [];
        if (cachedSitsStr) cachedSits = JSON.parse(cachedSitsStr);
        cachedSits.unshift(offlineHistItem);
        localStorage.setItem(`inasuivi_hist_sits_${project.id}`, JSON.stringify(cachedSits));
        setHistorySituations(cachedSits);
        
        setSuccessMsg(`✓ Situation initialisée (Hors-ligne). Fichier téléchargé et enregistré dans le cache local.`);
        setTimeout(() => setSuccessMsg(null), 5000);
      } catch (cacheErr) {
        console.error("Local caching failed for situation metadata", cacheErr);
      }
    }
  };

  const exportSituationToGoogleDrive = async () => {
    if (!currentSituation) return;
    
    // Check if token exists
    let activeToken = await getAccessToken();
    if (!activeToken) {
      setSuccessMsg("Connexion à Google Drive requise... Veuillez accepter la popup d'autorisation Google.");
      try {
        const result = await googleSignIn();
        if (result) {
          activeToken = result.accessToken;
          setSuccessMsg("✓ Connexion Google réussie ! Traitement et transfert de la Situation...");
        } else {
          setError("Impossible de s'authentifier auprès de Google.");
          return;
        }
      } catch (err: any) {
        setError("Erreur de connexion Google Drive : " + (err.message || err));
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg("Génération de l'export Excel et transfert en cours vers Google Drive...");
      
      const data: any[][] = [
        [`SITUATION DE TRAVAUX COMPTABLE N°${currentSituation.number}`],
        [],
        ["Désignation Chantier :", project.name],
        ["Localisation :", project.location],
        ["Client (Maître d'Ouvrage) :", project.clientName],
        ["Entreprise Titulaire :", project.contractor || "N/A"],
        ["Cabinet de Contrôle :", project.supervisor],
        ["Date de Clôture :", new Date(currentSituation.date).toLocaleDateString("fr-FR")],
        ["Statut de la situation :", currentSituation.status === "draft" ? "Brouillon" : currentSituation.status === "approved" ? "Approuvé" : "Payé"]
      ];

      if (selectedLotFilter !== "All") {
        data.push(["Lot Sélectionné :", selectedLotFilter]);
      }
      data.push([]);

      data.push([
        "Code", 
        "Désignation", 
        "Unité", 
        "Qté Marché", 
        "Qté Avenant", 
        "Qté Mois", 
        "Qté Cum.", 
        "Avanc. %", 
        "P.U. HT (DA)", 
        "Montant Précédent (DA)", 
        "Montant Mois (DA)", 
        "Montant Cum. (DA)",
        "Montant Reste (DA)"
      ]);

      const filteredItems = (project.workItems || []).filter(
        (item) => selectedLotFilter === "All" || getLotName(item) === selectedLotFilter
      );

      filteredItems.forEach((item) => {
        const row = getRowValues(item);
        data.push([
          item.code,
          row.designation,
          row.unit,
          row.quantityMarket,
          row.qtyAvenant,
          row.qtyMois,
          row.qtyCumulee,
          row.progressPercent,
          row.unitPrice,
          row.montantPrecedent,
          row.montantMois,
          row.montantCumule,
          row.reste
        ]);
      });

      data.push([]);
      data.push(["RÉCAPITULATIF FINANCIER DE LA SITUATION"]);
      data.push(["Désignation de la ligne", "Montant (DA)"]);
      data.push(["Marché de base global initial HT :", totalContractHT]);
      data.push(["Montant total Avenant HT :", totalAvenantHT]);
      data.push(["Cumul des travaux terminés HT :", currentCumulHT]);
      data.push(["Reste à réaliser global HT :", totalContractHT - currentCumulHT]);
      data.push([`Retenue de garantie cumulée (${projectRetentionRate}%) :`, -currentRetentionAmount]);
      data.push(["Net accompli cumulé HT (Montant Net de la Période) :", totalPaidNetHT]);
      data.push([`TVA applicable sur la période (${projectTvaRate}%) :`, periodTva]);
      data.push(["MONTANT TOTAL NET À PAYER TTC SUR LA PÉRIODE :", periodPayableTTC]);

      const worksheet = XLSX.utils.aoa_to_sheet(data);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Situation N°${currentSituation.number}`);

      const cleanName = project.name.replace(/[^a-z0-9]/gi, "_");
      const filename = `inaSuivi_Situation_${currentSituation.number}_${cleanName}.xlsx`;

      const out = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

      // Transfer to drive root
      const driveResult = await uploadFileToDrive(activeToken, blob, filename, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      
      setSuccessMsg(`✓ Document Excel "${filename}" sauvegardé avec succès dans votre Google Drive ! (ID: ${driveResult.id})`);
      setTimeout(() => setSuccessMsg(null), 7000);
    } catch (err: any) {
      console.error(err);
      setError("Sauvegarde Google Drive échouée: " + (err.message || err));
    } finally {
      setLoading(false);
    }
  };

  const exportFinancialsToExcel = () => {
    const data: any[][] = [
      ["BILAN FINANCIER GLOBAL DU CHANTIER"],
      [],
      ["Nom du Chantier :", project.name],
      ["Client (Maître d'Ouvrage) :", project.clientName],
      ["Entreprise Titulaire :", project.contractor || "N/A"],
      ["Superviseur :", project.supervisor],
      ["Localisation :", project.location],
      [],
      ["MÉTRIQUES DE SYNTHÈSE GLOBAL"],
      ["Indicateur Clé", "Valeur (DA)"],
      ["Marché Global Contractuel Initial HT", totalContractHT],
      ["Montant Total Avenant HT", totalAvenantHT],
      ["Consommé d'Avancement Réalisé HT", currentCumulHT],
      ["Reste à Réaliser Global HT", totalContractHT - currentCumulHT],
      ["Compte Séquestre - Retenue de Garantie Cumulée RG", currentRetentionAmount],
      ["Net Total Payé/Certifié Cumulé HT", totalPaidNetHT],
      [],
      ["CHRONOLOGIE ET HISTORIQUE DES SITUATIONS MENSUELLES"],
      ["Numéro de Situation", "Date d'Arrêté", "Statut Comptable", "Montant Certifié Cumulé HT (DA)", "Montant Net de la Période HT (DA)"]
    ];

    const sortedSits = [...(project.situations || [])].sort((a, b) => a.number - b.number);
    sortedSits.forEach((sit, index) => {
      const sitAmount = project.workItems.reduce((acc, item) => {
        const progress = sit.itemsProgress[item.id] ?? 0;
        return acc + (item.totalPrice * progress) / 100;
      }, 0);

      const prevSit = index > 0 ? sortedSits[index - 1] : null;
      const prevSitAmount = prevSit
        ? project.workItems.reduce((acc, item) => {
            const progress = prevSit.itemsProgress[item.id] ?? 0;
            return acc + (item.totalPrice * progress) / 100;
          }, 0)
        : 0;

      const periodAmountHT = sitAmount - prevSitAmount;

      data.push([
        `Situation N°${sit.number}`,
        new Date(sit.date).toLocaleDateString("fr-FR"),
        sit.status === "draft" ? "Brouillon" : sit.status === "approved" ? "Approuvé" : "Payé",
        sitAmount,
        periodAmountHT
      ]);
    });

    const worksheet = XLSX.utils.aoa_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Bilan Financier");

    const cleanName = project.name.replace(/[^a-z0-9]/gi, "_");
    XLSX.writeFile(workbook, `inaSuivi_Bilan_Financier_${cleanName}.xlsx`);
  };

  // MATH CALCULATIONS FOR RENDER
  const projectTvaRate = project.tvaRate ?? 20;
  const projectRetentionRate = project.retentionRate ?? 5;

  // Helper to retrieve exact situation row values, handling manual overrides reactive edits
  const getRowValues = (item: WorkItem) => {
    const activeVal = getActiveItemValues(item);
    
    // Default fallback base variables
    const qtyMarket = activeVal.quantity;
    const unitPrice = activeVal.unitPrice;
    
    // Base defaults for situation
    const prevProgressPercent = previousApprovedSituation
      ? previousApprovedSituation.itemsProgress[item.id] ?? 0
      : 0;
    
    const qtyPrecedenteDefault = previousApprovedSituation
      ? (qtyMarket * (prevProgressPercent / 100))
      : 0;
    
    // In edit mode vs view mode:
    const isEdit = isEditingProgress;
    
    // Get stored overrides from DB or current in-progress overrides of component
    const itemOverride = isEdit
      ? editOverrides[item.id] || currentSituation?.overrides?.[item.id] || {}
      : currentSituation?.overrides?.[item.id] || {};
       
    const designation = itemOverride.designation ?? activeVal.designation;
    const unit = itemOverride.unit ?? activeVal.unit;
    
    // Retain potential string representations for active entries to prevent jittery editing
    const quantityMarketRaw = itemOverride.quantityMarket !== undefined ? itemOverride.quantityMarket : qtyMarket;
    const itemUnitPriceRaw = itemOverride.unitPrice !== undefined ? itemOverride.unitPrice : unitPrice;
    const qtyAvenantRaw = itemOverride.qtyPrecedente !== undefined ? itemOverride.qtyPrecedente : 0;
    const qtyMoisRaw = itemOverride.qtyMoisRaw; // stored from direct qtyMois edits

    const progressPercentRaw = isEdit
      ? (editProgress[item.id] !== undefined ? editProgress[item.id] : (currentSituation?.itemsProgress?.[item.id] ?? 100))
      : (currentSituation?.itemsProgress?.[item.id] ?? 100);

    // Convert raw input values to Floats for calculation
    const quantityMarket = typeof quantityMarketRaw === "string" ? (parseFloat(quantityMarketRaw) || 0) : quantityMarketRaw;
    const itemUnitPrice = typeof itemUnitPriceRaw === "string" ? (parseFloat(itemUnitPriceRaw) || 0) : itemUnitPriceRaw;
    const qtyAvenant = typeof qtyAvenantRaw === "string" ? (parseFloat(qtyAvenantRaw) || 0) : qtyAvenantRaw;
    const progressPercent = typeof progressPercentRaw === "string" ? (parseFloat(progressPercentRaw) || 0) : progressPercentRaw;

    // CALCULATIONS:
    // "LA QTE DU MOIS ET LA QTE CUMMULER SE COMPORTE SELON LE POUCENTAGE ET LA QTE DU MARCHE CONTRAT/AVENANT"
    let qtyMois = quantityMarket * (progressPercent / 100);
    if (qtyMoisRaw !== undefined && qtyMoisRaw !== "") {
      qtyMois = typeof qtyMoisRaw === "string" ? (parseFloat(qtyMoisRaw) || 0) : qtyMoisRaw;
    }
    const qtyCumulee = qtyMois;

    // Auto-calculate avenant quantity if quantity of the month & cumulative quantity exceed the market quantity
    const computedQtyAvenant = qtyMois > quantityMarket ? (qtyMois - quantityMarket) : 0;

    // "MONTIONER LE MONTANT DE MARCHE SUR LA CASE MONTANT PRECEDENT"
    const montantPrecedent = quantityMarket * itemUnitPrice;

    // "LE MONTANT DU MOIS C'EST LE MONTANT DES TRAVAUX EXCUTES PAS LE MONTANT DU MARCHE"
    const montantMois = qtyMois * itemUnitPrice;

    // "LE MONTANT CUMULE C'EST LE MONTANT DU MOIS"
    const montantCumule = montantMois;

    const reste = (quantityMarket * itemUnitPrice) - montantCumule;
    
    return {
      designation,
      unit,
      quantityMarket,
      quantityMarketRaw,
      unitPrice: itemUnitPrice,
      unitPriceRaw: itemUnitPriceRaw,
      qtyPrecedente: computedQtyAvenant,
      qtyAvenant: computedQtyAvenant,
      qtyAvenantRaw: computedQtyAvenant,
      qtyMois,
      qtyMoisRaw,
      qtyCumulee,
      progressPercent,
      progressPercentRaw,
      montantPrecedent,
      montantMois,
      montantCumule,
      reste,
      hasSupplementary: computedQtyAvenant > 0,
      qtySupplementaire: computedQtyAvenant,
      displayQtyMois: qtyMois,
      displayMontantMois: montantMois,
    };
  };

  // Compute stats for current situation dynamically from rows
  const totals = (() => {
    let contractHT = 0;
    let precedentHT = 0;
    let moisHT = 0;
    let cumuleHT = 0;
    let resteHT = 0;
    let avenantHT = 0;

    project.workItems
      .filter((item) => selectedLotFilter === "All" || getLotName(item) === selectedLotFilter)
      .forEach((item) => {
        const row = getRowValues(item);
        const contractVal = row.quantityMarket * row.unitPrice;
        const precedentVal = row.montantPrecedent;
        const moisVal = row.montantMois;
        const cumuleVal = row.montantCumule;
        const resteVal = row.reste;
        const avenantVal = row.qtyAvenant * row.unitPrice;

        contractHT += contractVal;
        precedentHT += precedentVal;
        moisHT += moisVal;
        cumuleHT += cumuleVal;
        resteHT += resteVal;
        avenantHT += avenantVal;
      });

    const retentionAmount = (cumuleHT * projectRetentionRate) / 100;
    const periodPayableHT = cumuleHT - retentionAmount;
    const periodTva = (periodPayableHT * projectTvaRate) / 100;
    const periodPayableTTC = periodPayableHT + periodTva;

    return {
      contractHT,
      precedentHT,
      moisHT,
      cumuleHT,
      resteHT,
      avenantHT,
      retentionAmount,
      periodPayableHT,
      periodTva,
      periodPayableTTC,
    };
  })();

  const totalContractHT = totals.contractHT;
  const totalAvenantHT = totals.avenantHT;
  const currentCumulHT = totals.cumuleHT;
  const previousCumulHT = totals.precedentHT;
  const periodHT = totals.moisHT;
  const currentRetentionAmount = totals.retentionAmount;
  const periodPayableHT = totals.periodPayableHT;
  const periodTva = totals.periodTva;
  const periodPayableTTC = totals.periodPayableTTC;
  const totalPaidNetHT = currentCumulHT - currentRetentionAmount;
  const previousRetentionAmount = (previousCumulHT * projectRetentionRate) / 100;
  const previousNetHT = previousCumulHT - previousRetentionAmount;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Header Area */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-5 mb-6 no-print">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            title="Revenir aux chantiers"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center flex-wrap gap-2">
              <span className="text-xs font-semibold bg-amber-150 text-amber-800 px-2 py-0.5 rounded-full font-sans uppercase">
                Chantier actif
              </span>
              <span className="text-xs text-slate-500 font-mono">ID: {project.id.substring(0, 8)}</span>
              <button
                type="button"
                onClick={() => setShowCountryModal(true)}
                className="inline-flex items-center gap-1 bg-slate-100 hover:bg-amber-100 border border-slate-200 hover:border-amber-300 text-slate-700 hover:text-amber-950 px-2 py-0.5 rounded-full font-sans text-xs font-bold font-medium transition-all cursor-pointer"
                title="Changer le pays du marché et sa devise"
              >
                <span>{getCountryConfig().flag} {getCountryConfig().name} ({getCountryConfig().currency})</span>
                <Settings className="w-3 h-3 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <h1 className="text-xl sm:text-2xl font-sans font-bold text-slate-900 tracking-tight mt-0.5">
              {project.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {currentSituation && (
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              Imprimer / Exporter PDF
            </button>
          )}

          <button
            onClick={() => setShowNewSitModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg text-xs font-bold shadow transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouvelle Situation
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 p-3 rounded-xl text-sm font-medium flex items-center gap-2 no-print">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          {successMsg}
        </div>
      )}

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm font-medium flex items-center gap-2 no-print">
          <AlertCircle className="w-4 h-4 text-red-500" />
          {error}
        </div>
      )}

      {/* Tabs list */}
      <div className="flex border-b border-slate-100 gap-6 mb-6 no-print">
        <button
          onClick={() => {
            setActiveTab("situations");
            setIsEditingProgress(false);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "situations"
              ? "border-amber-500 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Situations & Progressions
        </button>
        <button
          onClick={() => {
            setActiveTab("contract");
            setIsEditingProgress(false);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "contract"
              ? "border-amber-500 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Devis Contractuel (Marché)
        </button>
        <button
          onClick={() => {
            setActiveTab("financials");
            setIsEditingProgress(false);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "financials"
              ? "border-amber-500 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Tableau Financier Global
        </button>
        <button
          onClick={() => {
            setActiveTab("audit");
            setIsEditingProgress(false);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer ${
            activeTab === "audit"
              ? "border-amber-500 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Journal d'Audit
        </button>
        <button
          onClick={() => {
            setActiveTab("planning");
            setIsEditingProgress(false);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "planning"
              ? "border-amber-500 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Planning & Retards
        </button>
        <button
          onClick={() => {
            setActiveTab("opinion");
            setIsEditingProgress(false);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "opinion"
              ? "border-amber-500 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Diagnostic Expert & Avis IA
        </button>
        <button
          onClick={() => {
            setActiveTab("plans_devis");
            setIsEditingProgress(false);
          }}
          className={`pb-3 text-sm font-semibold border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "plans_devis"
              ? "border-amber-500 text-slate-900"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          🗺️ BIM & Devis par Plan 2D
        </button>
      </div>

      {/* TAB 1: DESCRIPTIF CONTRACTUEL DE BASE */}
      {activeTab === "contract" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-sans font-bold text-slate-900 text-base">Marché Initial</h3>
              <p className="text-xs text-slate-500">
                Liste exhaustive de tous les postes de travaux contractuels extraits de vos documents originaux.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setShowAddLotModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer border border-indigo-550"
              >
                <Plus className="w-3.5 h-3.5 text-indigo-200" /> Ajouter / Importer un Lot (Excel / PDF)
              </button>
              <button
                onClick={exportContractToExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer border border-emerald-500"
              >
                <FileSpreadsheet className="w-3.5 h-3.5" /> Exporter sous Excel (.xlsx)
              </button>
            </div>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full border-collapse text-left text-xs">
              <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-mono text-[10px]">
                <tr>
                  <th className="py-3 px-4 w-20 text-center">Code</th>
                  <th className="py-3 px-4">Poste / Désignation</th>
                  <th className="py-3 px-4 w-20 text-center">Unité</th>
                  <th className="py-3 px-4 w-28 text-right">Quantité Initiale</th>
                  <th className="py-3 px-4 w-32 text-right">Prix Unitaire (HT)</th>
                  <th className="py-3 px-4 w-40 text-right">Marché Global (HT)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(() => {
                  if (!project.workItems || project.workItems.length === 0) {
                    return (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-slate-400">
                          Aucun poste enregistré sur ce marché.
                        </td>
                      </tr>
                    );
                  }

                  // Group by lot
                  const groups: { [lot: string]: typeof project.workItems } = {};
                  project.workItems.forEach((item) => {
                    const lName = getLotName(item);
                    if (!groups[lName]) groups[lName] = [];
                    groups[lName].push(item);
                  });

                  return Object.keys(groups).sort().map((lotName) => {
                    const items = groups[lotName];
                    const lotTotalHT = items.reduce((acc, it) => acc + (it.totalPrice || 0), 0);

                    return (
                      <React.Fragment key={lotName}>
                        {/* Lot Group Header Row */}
                        <tr className="bg-slate-150/60 border-y border-slate-205">
                          <td colSpan={6} className="py-2.5 px-4 font-bold text-slate-900 text-xs font-sans tracking-tight text-left bg-slate-100">
                            📂 {lotName}
                          </td>
                        </tr>

                        {/* Lot Items */}
                        {items.map((item) => (
                          <tr key={item.id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-mono font-bold text-slate-800 text-center">{item.code}</td>
                            <td className="py-3 px-4 text-slate-900 font-medium">{item.designation}</td>
                            <td className="py-3 px-4 text-center font-mono text-slate-600 bg-slate-50/40">{item.unit}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-800">
                              {formatQty(item.quantity)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono text-slate-800">
                              {formatCurrency(item.unitPrice)}
                            </td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-950 bg-slate-50/20">
                              {formatCurrency(item.totalPrice)}
                            </td>
                          </tr>
                        ))}

                        {/* Lot Subtotal */}
                        <tr className="bg-amber-500/5 font-sans border-b border-slate-200">
                          <td colSpan={5} className="py-2.5 px-4 text-right font-semibold text-xs text-slate-600 uppercase">
                            Sous-Total {lotName} (HT)
                          </td>
                          <td className="py-2.5 px-4 text-right font-mono font-extrabold text-xs text-amber-950 bg-amber-500/10">
                            {formatCurrency(lotTotalHT)}
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col items-end gap-1 border-t border-slate-100 pt-4 pr-4">
            <span className="text-xs text-slate-500 font-sans uppercase font-medium">Marché de base (HT)</span>
            <span className="font-mono font-bold text-lg text-slate-900">
              {formatCurrency(totalContractHT)}
            </span>
          </div>
        </div>
      )}

      {/* TAB 2: SITUATIONS DE TRAVAUX (Progress and valuation monthly estimator) */}
      {activeTab === "situations" && (
        <div className="space-y-6">
          {/* Situation selector banner */}
          <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4 no-print border border-slate-800">
            <div className="space-y-1">
              <span className="text-[10px] text-amber-400 uppercase tracking-wider font-mono block">
                Suivi de situation comptable
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={selectedSitId}
                  onChange={(e) => {
                    setSelectedSitId(e.target.value);
                    setIsEditingProgress(false);
                  }}
                  className="bg-slate-800 border border-slate-700 text-white font-sans font-bold px-3 py-1.5 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="">-- Choisir une Situation ({situationStatusFilter === "all" ? "Toutes" : situationStatusFilter === "draft" ? "Brouillons" : situationStatusFilter === "approved" ? "Approuvées" : "Payées"}) --</option>
                  {(project.situations || [])
                    .filter((s) => situationStatusFilter === "all" || s.status === situationStatusFilter)
                    .sort((a, b) => b.number - a.number)
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        Situation N°{s.number} ({s.status === "draft" ? "Brouillon" : s.status === "approved" ? "Approuvée" : "Payée"} - {new Date(s.date).toLocaleDateString("fr-FR")})
                      </option>
                    ))}
                </select>

                <div className="flex items-center gap-1.5 pl-2 border-l border-slate-850">
                  <span className="text-[10px] text-slate-400 font-bold uppercase hidden lg:inline tracking-wider">
                    Filtre Statut :
                  </span>
                  <button
                    type="button"
                    onClick={() => handleSituationStatusFilterChange("all")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      situationStatusFilter === "all"
                        ? "bg-amber-550 text-slate-950 font-extrabold"
                        : "bg-slate-800 text-slate-350 hover:bg-slate-750"
                    }`}
                    title="Afficher toutes les situations"
                  >
                    Toutes
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSituationStatusFilterChange("draft")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      situationStatusFilter === "draft"
                        ? "bg-slate-300 text-slate-950 font-extrabold"
                        : "bg-slate-800 text-slate-350 hover:bg-slate-750"
                    }`}
                    title="Filtrer par Brouillons uniquement"
                  >
                    Brouillons
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSituationStatusFilterChange("approved")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      situationStatusFilter === "approved"
                        ? "bg-amber-400 text-slate-950 font-extrabold"
                        : "bg-slate-800 text-slate-350 hover:bg-slate-750"
                    }`}
                    title="Filtrer par Approuvées uniquement"
                  >
                    Approuvées
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSituationStatusFilterChange("paid")}
                    className={`px-2.5 py-1 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                      situationStatusFilter === "paid"
                        ? "bg-emerald-500 text-white font-extrabold"
                        : "bg-slate-800 text-slate-350 hover:bg-slate-750"
                    }`}
                    title="Filtrer par Payées uniquement"
                  >
                    Payées
                  </button>
                </div>

                {currentSituation && (
                  <span
                    className={`text-[10px] font-sans font-semibold px-2.1 py-0.5 rounded-full uppercase ${
                      currentSituation.status === "draft"
                        ? "bg-slate-800 text-slate-355 border border-slate-700"
                        : currentSituation.status === "approved"
                        ? "bg-amber-500 text-slate-950 font-bold"
                        : "bg-emerald-500 text-white font-bold"
                    }`}
                  >
                    {currentSituation.status === "draft"
                      ? "Brouillon"
                      : currentSituation.status === "approved"
                      ? "Approuvée (MŒ)"
                      : "Payée"}
                  </span>
                )}
              </div>
            </div>

            {currentSituation && (
              <div className="flex flex-wrap items-center gap-2">
                {currentSituation.status === "draft" ? (
                  <>
                    {!isEditingProgress ? (
                      <button
                        onClick={startEditingProgress}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg transition-all cursor-pointer"
                      >
                        Saisir progression %
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={saveProgressEdits}
                          className="flex items-center gap-1 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
                          disabled={loading}
                        >
                          <Save className="w-3.5 h-3.5" /> Enregistrer %
                        </button>
                        <button
                          onClick={() => setIsEditingProgress(false)}
                          className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-755 text-slate-300 text-xs rounded-lg transition-all cursor-pointer"
                        >
                          Annuler
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => updateSituationStatus("approved")}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Approuver la situation
                    </button>
                  </>
                ) : currentSituation.status === "approved" ? (
                  <>
                    <button
                      onClick={() => updateSituationStatus("paid")}
                      className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Enregistrer le Virement
                    </button>
                    <button
                      onClick={() => updateSituationStatus("draft")}
                      className="px-3 py-1.5 border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs rounded-lg transition-colors cursor-pointer"
                    >
                      Repasser en brouillon
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => updateSituationStatus("approved")}
                    className="px-3.5 py-1.5 border border-slate-700 bg-slate-800 hover:bg-slate-750 text-slate-300 hover:text-white text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    Marquer non payée
                  </button>
                )}

                <button
                  onClick={exportSituationToExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer border border-emerald-500"
                  title="Télécharger la Situation Excel (.xlsx)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" /> Exporter sous Excel (.xlsx)
                </button>

                <button
                  onClick={exportSituationToGoogleDrive}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-lg transition-all border border-slate-800 cursor-pointer"
                  title="Enregistrer la situation sur Google Drive"
                >
                  <Cloud className="w-3.5 h-3.5 text-amber-400" /> Sauvegarder sur Google Drive
                </button>

                <button
                  onClick={() => setShowDeleteSituationConfirm(true)}
                  className="p-1.5 bg-slate-805 text-slate-400 hover:text-red-400 rounded-lg hover:bg-slate-800 border border-slate-750 transition-colors cursor-pointer"
                  title="Supprimer la situation"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          {!currentSituation ? (
            <div className="bg-white rounded-xl border border-slate-100 p-12 text-center text-slate-400 shadow-sm max-w-md mx-auto no-print">
              <div className="bg-slate-50 text-slate-400 p-3 rounded-full w-fit mx-auto mb-3">
                <Clock className="w-10 h-10" />
              </div>
              <h4 className="font-sans font-bold text-slate-700 text-base">Aucune situation mensuelle</h4>
              <p className="text-xs text-slate-500 mt-2 mb-6">
                Pour débuter la facturation mensuelle de vos entreprises et de votre cabinet, initialisez une Situation N°1.
              </p>
              <button
                onClick={() => setShowNewSitModal(true)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-lg shadow cursor-pointer"
              >
                Initialiser Situation N°1
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {/* AUTOMATED FILL & EXCEL MERGER PANEL */}
              {currentSituation.status === "draft" && (
                <div className="bg-gradient-to-r from-teal-500/5 via-slate-50/50 to-emerald-500/5 border border-slate-200 rounded-xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-5 no-print">
                  <div className="space-y-1 flex-1">
                    <h4 className="text-xs font-sans font-bold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
                      <Sparkles className="w-4 h-4 text-emerald-555 shrink-0" />
                      Remplissage automatique (Attachements & Carnets de Métrés)
                    </h4>
                    <p className="text-[11px] text-slate-500 max-w-2xl leading-relaxed">
                      Complétez cette situation en un clic. Choisissez entre <strong>l'Assistant intelligent (IA)</strong> pour extraire d'un contrat, PV ou photo d'état d'avancement, ou **la Fusion déterministe Excel** pour lire et mapper directement vos fichiers d'attachements chiffrés.
                    </p>
                    {aiError && (
                      <p className="text-[11px] text-red-650 font-semibold flex items-center gap-1 bg-red-50 p-1.5 px-2.5 rounded-lg border border-red-100 w-fit">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                        {aiError}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                    {/* OPTION 1: ASSISTANT IA */}
                    <input
                      type="file"
                      id="situation-ai-file-upload"
                      className="hidden"
                      accept="application/pdf,image/*,.xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                      onChange={handleSituationFileUpload}
                      disabled={aiLoading}
                    />
                    <label
                      htmlFor="situation-ai-file-upload"
                      className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer border ${
                        aiLoading
                          ? "bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed animate-pulse"
                          : "bg-slate-950 text-amber-400 hover:text-amber-300 hover:bg-slate-900 border-slate-800"
                      }`}
                      title="Utiliser l'IA Gemini pour interpréter les documents non structurés."
                    >
                      {aiLoading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" />
                          {aiProgressMsg || "Analyse IA..."}
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                          Saisie IA (PDF / Image)
                        </>
                      )}
                    </label>

                    {/* OPTION 2: FUSION EXCEL DETE */}
                    <button
                      onClick={() => setShowExcelMerger(true)}
                      className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm border border-emerald-500 cursor-pointer"
                      title="Associer directement et de manière 100% exacte un tableur Excel de métrés."
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-100" />
                      Fusionner Tableur Excel (Métrés)
                    </button>
                  </div>
                </div>
              )}

              {/* Situation Comments banner and description */}
              {currentSituation.comment && (
                <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 text-xs font-sans text-slate-750 leading-relaxed italic no-print">
                  <span className="font-bold block uppercase tracking-wider text-[9px] text-slate-500 not-italic">
                    Observations de situation :
                  </span>
                  "{currentSituation.comment}"
                </div>
              )}

              {/* PHOTOS DE CHANTIER (SUIVI VISUEL) */}
              <div className="bg-white border border-slate-150 rounded-2xl p-5 space-y-4 shadow-2xs no-print">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Camera className="w-4 h-4 text-amber-500" />
                      PHOTOS DE SUIVI DE CHANTIER
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Téléversez ou prenez des clichés réels de l'avancement physique des travaux pour cette situation.
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      placeholder="Légende (ex: Coulage de dalle)"
                      value={photoCaption}
                      onChange={(e) => setPhotoCaption(e.target.value)}
                      className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 w-full md:w-56"
                      disabled={photoUploading}
                    />
                    
                    <input
                      type="file"
                      id="chantier-photo-upload"
                      className="hidden"
                      accept="image/*"
                      capture="environment"
                      onChange={handleUploadChantierPhoto}
                      disabled={photoUploading}
                    />
                    
                    <label
                      htmlFor="chantier-photo-upload"
                      className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold text-slate-950 bg-amber-500 hover:bg-amber-600 cursor-pointer shadow-sm transition-all border border-amber-400/20 ${
                        photoUploading ? "opacity-50 cursor-not-allowed" : ""
                      }`}
                    >
                      {photoUploading ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          Envoi...
                        </>
                      ) : (
                        <>
                          <Camera className="w-3.5 h-3.5" />
                          Prendre une photo
                        </>
                      )}
                    </label>
                  </div>
                </div>

                {project.photos && project.photos.filter(p => p.situationNumber === currentSituation.number).length > 0 ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {project.photos
                      .filter(p => p.situationNumber === currentSituation.number)
                      .map((p) => (
                        <div key={p.id} className="relative group border border-slate-150 rounded-xl overflow-hidden shadow-2xs">
                          <a href={p.url} target="_blank" rel="noopener noreferrer" className="block relative">
                            <img
                              src={p.url}
                              alt={p.caption || "Photo de chantier"}
                              referrerPolicy="no-referrer"
                              className="w-full h-32 object-cover hover:scale-105 transition-transform duration-200"
                            />
                          </a>
                          
                          <div className="p-2 bg-slate-50 border-t border-slate-100 hover:bg-slate-100 transition-colors">
                            <p className="text-[10px] font-bold text-slate-800 line-clamp-1">{p.caption || "Avancement de chantier"}</p>
                            <div className="flex items-center justify-between mt-1 text-[9px] text-slate-400 font-mono">
                              <span>Situation N°{p.situationNumber}</span>
                              <span>{p.uploadedAt ? new Date(p.uploadedAt).toLocaleDateString('fr-DZ') : "N/A"}</span>
                            </div>
                          </div>

                          <button
                            onClick={() => handleDeleteChantierPhoto(p.id)}
                            className="absolute top-1.5 right-1.5 p-1 bg-red-600 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-150 cursor-pointer shadow-md"
                            title="Supprimer la photo"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="text-center p-6 border border-dashed border-slate-200 bg-slate-50/50 rounded-2xl text-slate-400 text-xs italic">
                    Aucune photo d'avancement physique archivée pour la situation N°{currentSituation.number}.
                  </div>
                )}
              </div>

              {/* DOCUMENT SECTION - PV, JOURNAL, METRE REPOSITORY */}
              <div className="bg-slate-50 border border-slate-200/85 rounded-2xl p-5 space-y-5 no-print">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-200 pb-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-widest flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-500" />
                      DOCUMENTS DE CHANTIER (PV, JOURNAL & MÉTRÉS)
                    </h3>
                    <p className="text-[11px] text-slate-550 mt-0.5">
                      Associez vos rapports officiels, journaux de bord et carnets métriques. Générez votre état d'avancement par IA à partir de chaque document.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {uploadingDocType ? (
                      <div className="flex items-center gap-1.5 bg-white border border-slate-200 p-1.5 rounded-lg text-[11px] shadow-xs">
                        <input
                          type="text"
                          placeholder="Titre (ex: PV No 4)"
                          value={docNameInput}
                          onChange={(e) => setDocNameInput(e.target.value)}
                          className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-slate-800 font-medium text-[11px] focus:outline-none w-32"
                          disabled={isUploading}
                        />
                        <input
                          type="file"
                          id="new-doc-file-input"
                          className="hidden"
                          accept="image/*,application/pdf,.xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                          onChange={(e) => handleAddDocFile(uploadingDocType, e)}
                          disabled={isUploading}
                        />
                        <label
                          htmlFor="new-doc-file-input"
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded cursor-pointer transition-colors text-[10px]"
                        >
                          {isUploading ? "Lecture..." : "Sélectionner"}
                        </label>
                        <button
                          onClick={() => {
                            setUploadingDocType(null);
                            setDocNameInput("");
                          }}
                          className="text-[11px] text-slate-400 hover:text-slate-600 px-1 font-medium"
                          disabled={isUploading}
                        >
                          Annuler
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-400 font-semibold mr-1">Attacher :</span>
                        <button
                          onClick={() => setUploadingDocType("pv")}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10.5px] font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3 h-3 text-amber-500" />
                          PV de Chantier
                        </button>
                        <button
                          onClick={() => setUploadingDocType("journal")}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10.5px] font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3 h-3 text-amber-500" />
                          Journal de Bord
                        </button>
                        <button
                          onClick={() => setUploadingDocType("metre")}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[10.5px] font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3 h-3 text-amber-500" />
                          Métrés
                        </button>
                        <button
                          onClick={() => setUploadingDocType("plan")}
                          className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-indigo-700 text-[10.5px] font-bold rounded-lg transition-colors cursor-pointer shadow-2xs"
                        >
                          <Plus className="w-3 h-3 text-indigo-500" />
                          Plans de l'Ouvrage
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* QUICK DOWNLOAD ACTIONS BAR FOR CONSTRUCTIONS DIRECTORS */}
                <div className="bg-amber-50/40 border border-amber-200/50 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
                  <div className="flex items-center gap-1.5 font-bold text-slate-800">
                    <Download className="w-4 h-4 text-amber-500 shrink-0" />
                    <span>Accès rapide de téléchargement :</span>
                  </div>
                  
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* PV download */}
                    {(() => {
                      const pvs = (project.documents || []).filter(d => d.type === "pv");
                      if (pvs.length > 0) {
                        const latest = [...pvs].sort((a,b) => b.id.localeCompare(a.id))[0];
                        return (
                          <a
                            href={`data:${latest.fileType || 'application/octet-stream'};base64,${latest.base64}`}
                            download={latest.fileName}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-[11px] font-extrabold shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
                            title={`Télécharger le PV de Réunion le plus récent: ${latest.name}`}
                          >
                            <FileText className="w-3.5 h-3.5" />
                            Télécharger PV Chantiers ({latest.name})
                          </a>
                        );
                      }
                      return (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-[11px] font-bold cursor-not-allowed">
                          <FileText className="w-3.5 h-3.5" />
                          Aucun PV disponible
                        </span>
                      );
                    })()}

                    {/* Metres download */}
                    {(() => {
                      const metres = (project.documents || []).filter(d => d.type === "metre");
                      if (metres.length > 0) {
                        const latest = [...metres].sort((a,b) => b.id.localeCompare(a.id))[0];
                        return (
                          <a
                            href={`data:${latest.fileType || 'application/octet-stream'};base64,${latest.base64}`}
                            download={latest.fileName}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[11px] font-extrabold shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
                            title={`Télécharger le Carnet de Métré le plus récent: ${latest.name}`}
                          >
                            <ClipboardList className="w-3.5 h-3.5" />
                            Télécharger Métrés ({latest.name})
                          </a>
                        );
                      }
                      return (
                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-400 border border-slate-200 rounded-lg text-[11px] font-bold cursor-not-allowed">
                          <ClipboardList className="w-3.5 h-3.5" />
                          Aucun Métré disponible
                        </span>
                      );
                    })()}
                  </div>
                </div>

                {/* THE 3-COLUMN REPOSITORY GRID (PV, JOURNAL, METRE) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  
                  {/* COLUMN 1: PV DE CHANTIER (MINUTES) */}
                  <div className="bg-white border border-slate-150 rounded-xl p-3.5 space-y-3 shadow-3xs flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 bg-sky-50 text-sky-600 rounded-md">
                            <FileText className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">PV de Réunion</span>
                        </div>
                        <span className="text-[9px] font-mono bg-sky-100/50 text-sky-700 px-1.5 py-0.5 rounded-full font-bold">
                          {(project.documents || []).filter(d => d.type === "pv").length} fichier(s)
                        </span>
                      </div>

                      <div className="space-y-1.5 divide-y divide-slate-50 max-h-40 overflow-y-auto">
                        {(project.documents || []).filter(d => d.type === "pv").map((doc) => (
                          <div key={doc.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-1 text-[11px]">
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-slate-800 block truncate" title={doc.name}>
                                {doc.name}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono block">
                                {doc.date} | {doc.fileName.substring(doc.fileName.lastIndexOf('.') + 1).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleAISituationGeneration(doc)}
                                className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded"
                                title="Générer l'Etat d'Avancement par IA ✨"
                                disabled={aiLoading}
                              >
                                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> : <Sparkles className="w-3.5 h-3.5" />}
                              </button>
                              <a
                                href={`data:${doc.fileType || 'application/octet-stream'};base64,${doc.base64}`}
                                download={doc.fileName}
                                className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded"
                                title="Télécharger le fichier"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => setSelectedDocForPreview(doc)}
                                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded"
                                title="Aperçu rapide"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDoc(doc.id, doc.name)}
                                className="p-1 text-slate-350 hover:text-red-500 hover:bg-red-50 rounded"
                                title="Détacher le document"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {(project.documents || []).filter(d => d.type === "pv").length === 0 && (
                          <div className="text-center py-5 text-slate-400 text-[10px] italic">
                            Aucun PV attaché. Enregistrez des réunions à analyser.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 2: JOURNAL DE CHANTIER (DAILY LOGS) */}
                  <div className="bg-white border border-slate-150 rounded-xl p-3.5 space-y-3 shadow-3xs flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 bg-amber-50 text-amber-700 rounded-md">
                            <BookOpen className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Journal de Bord</span>
                        </div>
                        <span className="text-[9px] font-mono bg-amber-100/50 text-amber-700 px-1.5 py-0.5 rounded-full font-bold">
                          {(project.documents || []).filter(d => d.type === "journal").length} fichier(s)
                        </span>
                      </div>

                      <div className="space-y-1.5 divide-y divide-slate-50 max-h-40 overflow-y-auto">
                        {(project.documents || []).filter(d => d.type === "journal").map((doc) => (
                          <div key={doc.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-1 text-[11px]">
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-slate-800 block truncate" title={doc.name}>
                                {doc.name}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono block">
                                {doc.date} | {doc.fileName.substring(doc.fileName.lastIndexOf('.') + 1).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleAISituationGeneration(doc)}
                                className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded"
                                title="Générer l'Etat d'Avancement par IA ✨"
                                disabled={aiLoading}
                              >
                                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> : <Sparkles className="w-3.5 h-3.5" />}
                              </button>
                              <a
                                href={`data:${doc.fileType || 'application/octet-stream'};base64,${doc.base64}`}
                                download={doc.fileName}
                                className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded"
                                title="Télécharger le fichier"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => setSelectedDocForPreview(doc)}
                                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded"
                                title="Aperçu rapide"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDoc(doc.id, doc.name)}
                                className="p-1 text-slate-350 hover:text-red-500 hover:bg-red-50 rounded"
                                title="Supprimer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {(project.documents || []).filter(d => d.type === "journal").length === 0 && (
                          <div className="text-center py-5 text-slate-400 text-[10px] italic">
                            Aucun journal attaché. PDF ou image acceptés pour l'analyse IA.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* COLUMN 3: CARNET DE METRES (QUANTITIES) */}
                  <div className="bg-white border border-slate-150 rounded-xl p-3.5 space-y-3 shadow-3xs flex flex-col justify-between">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <div className="p-1 bg-emerald-50 text-emerald-700 rounded-md">
                            <ClipboardList className="w-4 h-4" />
                          </div>
                          <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider">Carnet de Métrés</span>
                        </div>
                        <span className="text-[9px] font-mono bg-emerald-100/50 text-emerald-800 px-1.5 py-0.5 rounded-full font-bold">
                          {(project.documents || []).filter(d => d.type === "metre").length} fichier(s)
                        </span>
                      </div>

                      <div className="space-y-1.5 divide-y divide-slate-50 max-h-40 overflow-y-auto">
                        {(project.documents || []).filter(d => d.type === "metre").map((doc) => (
                          <div key={doc.id} className="pt-1.5 first:pt-0 flex items-center justify-between gap-1 text-[11px]">
                            <div className="min-w-0 flex-1">
                              <span className="font-semibold text-slate-800 block truncate" title={doc.name}>
                                {doc.name}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono block">
                                {doc.date} | {doc.fileName.substring(doc.fileName.lastIndexOf('.') + 1).toUpperCase()}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleAISituationGeneration(doc)}
                                className="p-1 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded"
                                title="Générer l'Etat d'Avancement à partir des métrés par IA ✨"
                                disabled={aiLoading}
                              >
                                {aiLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-500" /> : <Sparkles className="w-3.5 h-3.5" />}
                              </button>
                              <a
                                href={`data:${doc.fileType || 'application/octet-stream'};base64,${doc.base64}`}
                                download={doc.fileName}
                                className="p-1 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded"
                                title="Télécharger le fichier"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => setSelectedDocForPreview(doc)}
                                className="p-1 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded"
                                title="Aperçu rapide"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteDoc(doc.id, doc.name)}
                                className="p-1 text-slate-350 hover:text-red-500 hover:bg-red-50 rounded"
                                title="Détacher"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                        {(project.documents || []).filter(d => d.type === "metre").length === 0 && (
                          <div className="text-center py-5 text-slate-400 text-[10px] italic">
                            Aucun métré attaché. Format Excel ou PDF accepté pour l'analyse.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

              {/* CLOUD DOCUMENT ARCHIVE HISTORY CARD (SUPABASE STORAGE INTEGRATION) */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 no-print text-white shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl -z-0 pointer-events-none"></div>
                
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-800 pb-4 relative z-10">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/25">
                      <History className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-widest flex items-center gap-2 text-amber-400">
                        📦 Historique & Archives Cloud Supabase
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 font-sans">
                        Retrouvez et téléchargez l'historique officiel de vos situations financières et PV de réunion stockés de manière sécurisée.
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1.5 p-1 bg-slate-950/60 rounded-xl border border-slate-800/80 shrink-0">
                    <button
                      onClick={() => setArchiveSubTab("sits")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        archiveSubTab === "sits"
                          ? "bg-amber-500 text-slate-950 font-extrabold shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      Situations ({historySituations.length})
                    </button>
                    <button
                      onClick={() => setArchiveSubTab("pvs")}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        archiveSubTab === "pvs"
                          ? "bg-amber-500 text-slate-950 font-extrabold shadow-sm"
                          : "text-slate-400 hover:text-white"
                      }`}
                    >
                      PV de Chantier ({historyPVs.length})
                    </button>
                  </div>
                </div>

                {historyLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-3 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin text-amber-500" />
                    <span className="text-xs font-medium font-mono">Synchronisation avec Supabase Cloud en cours...</span>
                  </div>
                ) : (
                  <div className="relative z-10">
                    {archiveSubTab === "sits" ? (
                      <div className="space-y-2">
                        {historySituations.length === 0 ? (
                          <div className="text-center py-10 bg-slate-950/20 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs italic">
                            Aucune situation financière archivée en ligne pour le moment.<br />
                            Générez-en une en cliquant sur le bouton <strong>"Télécharger la Situation Excel"</strong> ci-dessus !
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto pr-1">
                            {historySituations.map((item) => (
                              <div
                                key={item.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-950/45 border border-slate-800/70 rounded-xl hover:border-slate-700 hover:bg-slate-950/70 transition-all font-sans"
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg shrink-0 mt-0.5 font-mono text-[10px] uppercase font-bold">
                                    XLSX
                                  </div>
                                  <div className="min-w-0">
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-bold text-slate-100 text-xs hover:text-amber-400 hover:underline block truncate"
                                      title={item.filename}
                                    >
                                      {item.filename}
                                    </a>
                                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                      Sauvegardé le : {new Date(item.created_at).toLocaleDateString("fr-DZ", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20 tracking-wider">
                                    <Lock className="w-2.5 h-2.5" />
                                    CLOUD SÉCURISÉ
                                  </span>
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                                    title="Ouvrir dans un onglet"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.url);
                                      setSuccessMsg("✓ URL sécurisée du document copiée dans le presse-papiers !");
                                      setTimeout(() => setSuccessMsg(null), 3000);
                                    }}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] rounded-lg transition-colors font-bold cursor-pointer"
                                    title="Copier le lien d'accès direct"
                                  >
                                    Copiable
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {historyPVs.length === 0 ? (
                          <div className="text-center py-10 bg-slate-950/20 border border-dashed border-slate-800 rounded-xl text-slate-500 text-xs italic">
                            Aucun procès-verbal de chantier (PV) archivé en ligne.<br />
                            Attachez un document de type <strong>"PV de Chantier"</strong> ci-dessus pour l'y retrouver !
                          </div>
                        ) : (
                          <div className="grid grid-cols-1 gap-2.5 max-h-80 overflow-y-auto pr-1">
                            {historyPVs.map((item) => (
                              <div
                                key={item.id}
                                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-slate-950/45 border border-slate-800/70 rounded-xl hover:border-slate-700 hover:bg-slate-950/70 transition-all font-sans"
                              >
                                <div className="flex items-start gap-2.5 min-w-0">
                                  <div className="p-1.5 bg-sky-500/10 text-sky-400 rounded-lg shrink-0 mt-0.5 font-mono text-[10px] uppercase font-bold">
                                    PV
                                  </div>
                                  <div className="min-w-0">
                                    <a
                                      href={item.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="font-bold text-slate-100 text-xs hover:text-amber-400 hover:underline block truncate"
                                      title={item.filename}
                                    >
                                      {item.filename}
                                    </a>
                                    <span className="text-[10px] text-slate-500 font-mono block mt-0.5">
                                      Archivé le : {new Date(item.created_at).toLocaleDateString("fr-DZ", {
                                        year: "numeric",
                                        month: "long",
                                        day: "numeric",
                                        hour: "2-digit",
                                        minute: "2-digit"
                                      })}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                                  <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20 tracking-wider">
                                    <Cloud className="w-2.5 h-2.5" />
                                    SUPABASE STORAGE
                                  </span>
                                  <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg transition-colors"
                                    title="Télécharger depuis Supabase"
                                  >
                                    <Download className="w-3.5 h-3.5" />
                                  </a>
                                  <button
                                    onClick={() => {
                                      navigator.clipboard.writeText(item.url);
                                      setSuccessMsg("✓ URL du PV copiée avec succès !");
                                      setTimeout(() => setSuccessMsg(null), 3000);
                                    }}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] rounded-lg transition-colors font-bold cursor-pointer"
                                    title="Copier le lien"
                                  >
                                    Lien
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* PRINT AREA: THE OFFICIAL STATE REPORT DQE */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-4 sm:p-6 space-y-6 relative print:border-none print:shadow-none print:p-0">
                {/* Print Invoice/Document Banner */}
                <div className="hidden print:flex items-center justify-between border-b-2 border-slate-900 pb-4 mb-4">
                  <div className="flex items-center gap-2">
                    <div className="bg-slate-950 text-white p-1 rounded font-bold">🛠</div>
                    <div className="flex flex-col">
                      <span className="font-sans font-bold text-sm tracking-tight leading-none text-slate-900">
                        inaSuivi AI Systems
                      </span>
                      <span className="text-[8px] text-slate-550 font-sans tracking-tight">
                        SUIVI DE CHANTIER AUTOMATISÉ
                      </span>
                    </div>
                  </div>
                  <div className="text-right font-mono text-[9px] text-slate-500">
                    <div>Date d'impression : {new Date().toLocaleDateString("fr-FR")}</div>
                    <div>Généré via inaSuivi AI</div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between gap-4 border-b border-rose-100 pb-4 print:grid print:grid-cols-2">
                  <div className="space-y-1">
                    <h2 className="font-sans font-bold text-lg text-slate-950 print:text-base">
                      SITUATION DE TRAVAUX N°{currentSituation.number}
                    </h2>
                    <div className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 print:hidden" />
                      Période arrêtée au :{" "}
                      <span className="font-semibold text-slate-800">
                        {new Date(currentSituation.date).toLocaleDateString("fr-FR")}
                      </span>
                    </div>
                    <div className="hidden print:block text-xs font-mono text-slate-600 pt-1.5 space-y-0.5">
                      <div><span className="font-sans font-semibold">Localisation :</span> {project.location}</div>
                      <div><span className="font-sans font-semibold">Marché initial HT :</span> {formatCurrency(totalContractHT)}</div>
                    </div>
                  </div>

                  <div className="sm:text-right space-y-1 text-xs text-slate-600">
                    <div>
                      Maître d'Ouvrage : <span className="font-semibold text-slate-900">{project.clientName}</span>
                    </div>
                    <div>
                      Entreprise titulaire :{" "}
                      <span className="font-semibold text-slate-900">{project.contractor || "Non assignée"}</span>
                    </div>
                    <div>
                      Cabinet de contrôle : <span className="font-semibold text-slate-900">{project.supervisor}</span>
                    </div>
                  </div>
                </div>

                {/* INTERACTIVE LOT FILTER AND MASS LOT STATUS (no-print) */}
                <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 no-print select-none mb-1">
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="bg-amber-100 text-amber-900 p-2 rounded-lg">
                        <Filter className="w-4 h-4 text-amber-700" />
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider font-sans">
                          Filtrer l'état de situation par Lot
                        </span>
                        <select
                          value={selectedLotFilter}
                          onChange={(e) => {
                            setSelectedLotFilter(e.target.value);
                          }}
                          className="bg-white border border-slate-250 text-slate-850 text-xs font-bold py-1 px-2.5 rounded-md focus:ring-1 focus:ring-amber-500 max-w-md focus:outline-none"
                        >
                          <option value="All">✦ Tous les lots du marché ✦</option>
                          {Array.from(new Set(project.workItems.map((item) => getLotName(item))))
                            .sort()
                            .map((lot) => (
                              <option key={lot} value={lot}>
                                {lot}
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    {/* Integrated Situation status filter */}
                    <div className="border-l border-slate-200 pl-4 flex flex-col justify-center">
                      <span className="text-[10px] text-slate-500 font-bold uppercase block tracking-wider font-sans">
                        Filtrer par Statut de Situation
                      </span>
                      <div className="flex items-center gap-1 mt-1">
                        <button
                          type="button"
                          onClick={() => handleSituationStatusFilterChange("all")}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            situationStatusFilter === "all"
                              ? "bg-amber-500 text-slate-950 font-extrabold"
                              : "bg-white border border-slate-250 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          Toutes
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSituationStatusFilterChange("draft")}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            situationStatusFilter === "draft"
                              ? "bg-slate-600 text-white font-extrabold"
                              : "bg-white border border-slate-250 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          Brouillons
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSituationStatusFilterChange("approved")}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            situationStatusFilter === "approved"
                              ? "bg-amber-400 text-slate-950 font-extrabold"
                              : "bg-white border border-slate-250 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          Approuvées
                        </button>
                        <button
                          type="button"
                          onClick={() => handleSituationStatusFilterChange("paid")}
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold transition-all cursor-pointer ${
                            situationStatusFilter === "paid"
                              ? "bg-emerald-600 text-white font-extrabold"
                              : "bg-white border border-slate-250 text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          Payées
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Mass operations on the selected lot */}
                  {currentSituation.status === "draft" && (
                    <div className="flex flex-wrap items-center gap-2 border-l border-slate-200 pl-0 md:pl-4">
                      <span className="text-[10px] text-slate-500 font-bold uppercase hidden md:inline tracking-wider">
                        Saisie groupée du Lot :
                      </span>
                      
                      <button
                        onClick={() => handleMassSetLotProgress(100)}
                        className="flex items-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-3xs"
                        title="Met à 100% tous les éléments du lot sélectionné"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        Tout à 100%
                      </button>

                      <button
                        onClick={() => handleMassSetLotProgress(0)}
                        className="flex items-center gap-1 bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase px-3 py-1.5 rounded-lg transition-colors cursor-pointer shadow-3xs"
                        title="Remet à 0% tous les éléments du lot sélectionné"
                      >
                        Remettre à 0%
                      </button>

                      <div className="flex items-center gap-1 border border-slate-200 bg-white rounded-lg p-1">
                        <input
                          type="number"
                          placeholder="Ex: 50"
                          value={massPercentVal}
                          onChange={(e) => setMassPercentVal(e.target.value)}
                          className="w-12 text-center text-[11px] font-bold focus:outline-none border-b border-transparent focus:border-amber-400"
                          min="0"
                          max="100"
                        />
                        <button
                          onClick={() => {
                            const val = parseFloat(massPercentVal);
                            if (!isNaN(val)) {
                              handleMassSetLotProgress(val);
                            }
                          }}
                          className="bg-slate-900 hover:bg-slate-800 text-white text-[9.5px] font-bold uppercase px-2 py-1 rounded"
                        >
                          Appliquer %
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                {/* THE COMPLETE BREAKDOWN MATRIX TABLE */}
                <div className="overflow-x-auto border border-slate-100 rounded-xl print:border-slate-300">
                  <table className="w-full border-collapse text-[10px] leading-tight print:text-[8.5px]">
                    <thead className="bg-slate-950 text-slate-200 uppercase tracking-tight font-mono text-[7.5px]">
                      <tr>
                        <th className="py-2 px-1 text-center border border-slate-800 font-bold whitespace-nowrap bg-slate-950 text-slate-200" style={{ width: "3%" }}>Code</th>
                        <th className="py-2 px-1.5 border border-slate-800 font-bold bg-slate-950 text-slate-200" style={{ width: "15%" }}>Désignation</th>
                        <th className="py-2 px-1 text-center border border-slate-800 font-bold whitespace-nowrap bg-slate-950 text-slate-100" style={{ width: "3%" }}>Unité</th>
                        <th className="py-2 px-1 text-right border border-slate-800 font-bold bg-slate-950 text-slate-100" style={{ width: "6%" }}>Qté Marché</th>
                        <th className="py-2 px-1 text-right border border-slate-800 font-bold bg-slate-950 text-slate-100" style={{ width: "8%" }}>Qté Avenant</th>
                        <th className="py-2 px-1 text-right border border-slate-850 font-bold bg-slate-800 text-amber-300" style={{ width: "8%" }}>Qté Mois</th>
                        <th className="py-2 px-1 text-right border border-slate-800 font-bold bg-slate-950 text-slate-100" style={{ width: "6%" }}>Qté Cum.</th>
                        <th className="py-2 px-1 text-center border border-slate-800 font-bold bg-slate-950 text-slate-105" style={{ width: "5%" }}>Avanc. %</th>
                        <th className="py-2 px-1 text-right border border-slate-800 font-bold bg-slate-950 text-slate-100" style={{ width: "7%" }}>P.U. HT (DA)</th>
                        <th className="py-2 px-1 text-right border border-slate-800 font-bold bg-slate-950 text-slate-100" style={{ width: "9%" }}>Montant Préc.</th>
                        <th className="py-2 px-1 text-right border border-slate-800 font-bold bg-slate-950 text-slate-100" style={{ width: "9%" }}>Montant Mois</th>
                        <th className="py-2 px-1 text-right border border-slate-800 font-bold bg-slate-950 text-slate-100" style={{ width: "9%" }}>Montant Cum.</th>
                        <th className="py-2 px-1 text-right border border-slate-800 font-bold bg-rose-955 text-rose-200" style={{ width: "9%" }}>Montant Reste</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-150 print:divide-slate-300">
                      {(() => {
                        const filtered = project.workItems.filter(
                          (item) => selectedLotFilter === "All" || getLotName(item) === selectedLotFilter
                        );

                        if (filtered.length === 0) {
                          return (
                            <tr>
                              <td colSpan={13} className="py-8 text-center text-slate-400 font-sans italic text-xs">
                                Aucun poste de travail ne correspond au lot sélectionné "{selectedLotFilter}".
                              </td>
                            </tr>
                          );
                        }

                        // Group by lot
                        const groups: { [lot: string]: typeof project.workItems } = {};
                        filtered.forEach((item) => {
                          const lName = getLotName(item);
                          if (!groups[lName]) groups[lName] = [];
                          groups[lName].push(item);
                        });

                        return Object.keys(groups).sort().map((lotName) => {
                          const items = groups[lotName];

                          // Compute totals for this lot
                          let totalPrevueHT = 0;
                          let totalPrecedentHT = 0;
                          let totalMoisHT = 0;
                          let totalCumuleHT = 0;
                          let totalResteHT = 0;

                          const renderedItems = items.map((item) => {
                            const row = getRowValues(item);

                            totalPrevueHT += row.quantityMarket * row.unitPrice;
                            totalPrecedentHT += row.montantPrecedent;
                            totalMoisHT += row.montantMois;
                            totalCumuleHT += row.montantCumule;
                            totalResteHT += row.reste;

                            return (
                              <tr key={item.id} className="hover:bg-slate-50/40 transition-colors">
                                {/* 1. CODE */}
                                <td className="py-2 px-1 font-mono font-bold text-slate-705 text-center border border-slate-100 print:border-slate-300 bg-slate-50/50">
                                  {item.code}
                                </td>
                                
                                {/* 2. DESIGNATION */}
                                <td className="py-1 px-1.5 border border-slate-100 print:border-slate-300">
                                  {isEditingProgress ? (
                                    <textarea
                                      rows={2}
                                      value={row.designation}
                                      onChange={(e) => handleSituationFieldChange(item.id, "designation", e.target.value)}
                                      className="w-full bg-white border border-amber-300 rounded px-1 py-0.5 text-[9.5px] text-slate-950 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500 max-h-16"
                                    />
                                  ) : (
                                    <div className="font-semibold text-slate-900 break-words leading-snug" title={row.designation}>
                                      {row.designation}
                                    </div>
                                  )}
                                </td>

                                {/* 3. UNITE */}
                                <td className="py-1 px-1 text-center font-mono text-slate-500 border border-slate-100 print:border-slate-300">
                                  {isEditingProgress ? (
                                    <input
                                      type="text"
                                      value={row.unit}
                                      onChange={(e) => handleSituationFieldChange(item.id, "unit", e.target.value)}
                                      className="w-10 text-center bg-white border border-amber-300 rounded py-0.5 text-[9.5px] text-slate-950 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 text-center"
                                    />
                                  ) : (
                                    row.unit
                                  )}
                                </td>

                                 {/* 4. QUANTITE DU MARCHE */}
                                <td className="py-1 px-1 text-right font-mono text-slate-705 border border-slate-100 print:border-slate-300 bg-slate-50/10">
                                  {isEditingProgress ? (
                                    <input
                                      type="number"
                                      step="any"
                                      value={row.quantityMarketRaw !== undefined ? row.quantityMarketRaw : ""}
                                      onChange={(e) => handleSituationFieldChange(item.id, "quantityMarket", e.target.value)}
                                      className="w-12 text-right bg-white border border-amber-300 rounded py-0.5 pr-1 text-[9.5px] text-slate-950 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                  ) : (
                                    row.quantityMarket.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                  )}
                                </td>

                                {/* 5. QUANTITE AVENANT */}
                                <td className="py-1 px-1 text-right font-mono text-slate-700 font-semibold border border-slate-100 print:border-slate-300 bg-amber-500/5">
                                  {isEditingProgress ? (
                                    <input
                                      type="number"
                                      step="any"
                                      value={row.qtyAvenantRaw !== undefined ? row.qtyAvenantRaw : ""}
                                      onChange={(e) => handleSituationFieldChange(item.id, "qtyPrecedente", e.target.value)}
                                      className="w-12 text-right bg-white border border-amber-300 rounded py-0.5 pr-1 text-[9.5px] text-slate-950 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold"
                                      title="Qté de l'avenant"
                                    />
                                  ) : (
                                    row.qtyAvenant.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                  )}
                                </td>

                                {/* 6. QUANTITE DU MOIS */}
                                <td className="py-1 px-1 border-x border-slate-150 bg-slate-50/10 print:border-slate-300 font-mono text-right font-bold text-slate-900">
                                  {isEditingProgress ? (
                                    <input
                                      type="number"
                                      step="any"
                                      value={row.qtyMoisRaw !== undefined ? row.qtyMoisRaw : (row.qtyMois !== 0 ? parseFloat(row.qtyMois.toFixed(4)) : "0")}
                                      onChange={(e) => handleSituationFieldChange(item.id, "qtyMois", e.target.value)}
                                      className="w-14 text-right bg-white border border-amber-350 rounded py-0.5 pr-1 text-[9.5px] text-slate-950 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 font-bold font-mono"
                                      title="Qté de la situation"
                                    />
                                  ) : (
                                    row.qtyMois.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                                  )}
                                </td>

                                {/* 7. QUANTITE CUMULEE */}
                                <td className="py-1 px-1 text-right font-mono text-slate-900 font-extrabold border border-slate-100 print:border-slate-300 bg-emerald-50/15">
                                  {row.qtyCumulee.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </td>

                                {/* 8. POURCENTAGE D'AVANCEMENT */}
                                <td className="py-1 px-1 text-center font-mono border border-slate-100 print:border-slate-300">
                                  {isEditingProgress ? (
                                    <input
                                      type="number"
                                      min="0"
                                      max="100"
                                      step="any"
                                      value={row.progressPercentRaw !== undefined ? row.progressPercentRaw : ""}
                                      onChange={(e) => handleSituationFieldChange(item.id, "progressPercent", e.target.value)}
                                      className="w-12 text-center bg-white border border-amber-350 rounded py-0.5 text-[9.5px] text-slate-950 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                                    />
                                  ) : (
                                    <span className="text-[9.5px] bg-indigo-50 text-indigo-805 font-mono font-bold px-1 py-0.5 rounded">
                                      {row.progressPercent.toFixed(2)}%
                                    </span>
                                  )}
                                </td>

                                {/* 9. PRIX UNITAIRE HT */}
                                <td className="py-1 px-1 text-right font-mono text-slate-705 border border-slate-100 print:border-slate-300 bg-slate-50/5">
                                  {isEditingProgress ? (
                                    <input
                                      type="number"
                                      step="any"
                                      value={row.unitPriceRaw !== undefined ? row.unitPriceRaw : ""}
                                      onChange={(e) => handleSituationFieldChange(item.id, "unitPrice", e.target.value)}
                                      className="w-14 text-right bg-white border border-amber-300 rounded py-0.5 pr-1 text-[9.5px] text-slate-950 font-mono focus:outline-none focus:ring-1 focus:ring-amber-500"
                                    />
                                  ) : (
                                    formatNumber(row.unitPrice)
                                  )}
                                </td>

                                {/* 10. MONTANT PRECEDENT */}
                                <td className="py-1 px-1 text-right font-mono text-slate-650 border border-slate-100 print:border-slate-300 bg-slate-50/30">
                                  {formatNumber(row.montantPrecedent)}
                                </td>

                                {/* 11. MONTANT DU MOIS */}
                                <td className="py-1 px-1 border border-slate-100 print:border-slate-300 bg-amber-500/5 font-mono">
                                  <div className="flex flex-col items-end px-1">
                                    <span className={row.hasSupplementary ? "text-amber-800 font-extrabold text-[10px]" : "text-slate-900 font-bold"}>
                                      {formatNumber(row.montantMois)}
                                    </span>
                                    {row.hasSupplementary ? (
                                      <span className="text-[7px] font-extrabold text-amber-700 bg-amber-50/90 rounded px-1 print:text-[6px] tracking-tight uppercase border border-amber-100">
                                        Avenant
                                      </span>
                                    ) : (
                                      <span className="text-[7px] font-bold text-slate-500 bg-slate-50 rounded px-1 print:text-[6px] tracking-tight uppercase border border-slate-100">
                                        Marché
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* 12. MONTANT CUMULE */}
                                <td className="py-1 px-1 text-right font-mono font-extrabold text-emerald-955 border border-slate-100 print:border-slate-300 bg-emerald-50/10">
                                  {formatNumber(row.montantCumule)}
                                </td>

                                {/* 13. MONTANT QUI RESTE */}
                                <td className="py-1 px-1 text-right font-mono text-rose-955 font-extrabold border border-slate-100 print:border-slate-300 bg-rose-50/10">
                                  {formatNumber(row.reste)}
                                </td>
                              </tr>
                            );
                          });

                          return (
                            <React.Fragment key={lotName}>
                              {/* Lot Group Header row */}
                              <tr className="bg-slate-200/70 border-y-2 border-slate-300 print:bg-slate-100">
                                <td colSpan={13} className="py-2 px-3 font-sans font-bold text-[11px] print:text-[10px] text-slate-900 text-left bg-slate-100 border border-slate-200 print:border-slate-300">
                                  📁 {lotName}
                                </td>
                              </tr>

                              {renderedItems}

                              {/* Lot Sub-Total row */}
                              <tr className="bg-amber-500/5 font-sans border-b-2 border-slate-200 print:border-slate-350 font-semibold text-[10px] print:text-[9.5px]">
                                <td colSpan={9} className="py-2 px-3 text-right font-bold text-slate-600 uppercase border border-slate-100 print:border-slate-300">
                                  Sous-Total {lotName} (HT)
                                </td>
                                <td className="py-2 px-2 text-right font-mono text-slate-705 bg-slate-50/30 border border-slate-100 print:border-slate-300">
                                  {formatNumber(totalPrecedentHT)}
                                </td>
                                <td className="py-2 px-2 text-right font-mono text-slate-900 bg-amber-500/10 border border-slate-100 print:border-slate-300 font-bold">
                                  {formatNumber(totalMoisHT)}
                                </td>
                                <td className="py-2 px-2 text-right font-mono text-emerald-950 bg-emerald-50/10 border border-slate-100 print:border-slate-300 font-extrabold">
                                  {formatNumber(totalCumuleHT)}
                                </td>
                                <td className="py-2 px-2 text-right font-mono text-rose-955 bg-rose-50/15 border border-slate-100 print:border-slate-300 font-bold">
                                  {formatNumber(totalResteHT)}
                                </td>
                              </tr>
                            </React.Fragment>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>

                {/* THE PROFESSIONAL SITUATION BILLING AND DEDUCTIONS BOX */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-4 border-t border-slate-200">
                  <div className="text-xs text-slate-500 font-sans space-y-1 my-auto print:text-[9px]">
                    <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-1">
                      Certificat de paiement architecte
                    </h4>
                    <p>Le taux d'avancement est vérifié sur site contradictoirement.</p>
                    <p>
                      Une retenue légale de garantie de <span className="font-semibold">{projectRetentionRate}%</span> est
                      déduite sur chaque certificat HT, restituée à la réception définitive ou cautionnée.
                    </p>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 p-4 bg-slate-50 rounded-xl font-mono text-xs text-slate-650 tracking-tight border border-slate-150 print:bg-white print:border-slate-300 print:text-[9px]">
                    <div className="flex justify-between w-full">
                      <span>Marché initial total HT (corrigé) :</span>
                      <span>
                        {formatCurrency(totalContractHT)}
                      </span>
                    </div>

                    <div className="flex justify-between w-full text-slate-500">
                      <span>Montant Avenant HT :</span>
                      <span>
                        {formatCurrency(totalAvenantHT)}
                      </span>
                    </div>

                    <div className="flex justify-between w-full text-slate-900 border-t border-slate-200/60 pt-1.5">
                      <span>Cumul des travaux terminés HT :</span>
                      <span className="font-bold">
                        {formatCurrency(currentCumulHT)}
                      </span>
                    </div>

                    <div className="flex justify-between w-full text-rose-850 font-bold bg-rose-50/50 px-2 py-1 rounded-lg border border-rose-100/60 transition-all">
                      <span>Reste à réaliser sur le marché HT :</span>
                      <span className="text-rose-900">
                        {formatCurrency(totals.resteHT)}
                      </span>
                    </div>

                    <div className="flex justify-between w-full text-slate-500">
                      <span>Retenue de garantie cumulée ({projectRetentionRate}%) :</span>
                      <span>
                        - {formatCurrency(currentRetentionAmount)}
                      </span>
                    </div>

                    <div className="flex justify-between w-full text-slate-800 font-semibold border-b border-dashed border-slate-200 pb-1.5">
                      <span>Net accompli cumulé HT :</span>
                      <span>
                        {formatCurrency(totalPaidNetHT)}
                      </span>
                    </div>

                    {/* Period payable Net */}
                    <div className="flex justify-between w-full text-indigo-950 font-bold border-t border-slate-200 pt-1.5 text-xs">
                      <span>Montant Net Période HT :</span>
                      <span>
                        {formatCurrency(periodPayableHT)}
                      </span>
                    </div>

                    <div className="flex justify-between w-full text-slate-500 text-[10px]">
                      <span>TVA applicable ({projectTvaRate}%) :</span>
                      <span>
                        {formatCurrency(periodTva)}
                      </span>
                    </div>

                    {/* GRAND DILIGENCED PERIOD AMOUNT DUE TTC */}
                    <div className="flex justify-between w-full text-slate-950 font-bold border-t border-double border-slate-300 pt-2 text-sm bg-amber-100/50 p-1 rounded print:bg-slate-100">
                      <span>A PAYER TTC SUR LA PERIODE :</span>
                      <span className="text-slate-900 text-base font-extrabold">
                        {formatCurrency(periodPayableTTC)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Signatures Area for architects and supervisors at bottom of page print */}
                <div className="hidden print:grid grid-cols-2 gap-10 pt-16 text-center text-[10px] font-sans">
                  <div className="space-y-12">
                    <p className="font-semibold text-slate-800">L'entreprise titulaire du marché</p>
                    <div className="border-t border-slate-300 w-2/3 mx-auto pt-1 font-mono text-[8px] text-slate-400">
                      Lu et approuvé, le __/__/20__
                    </div>
                  </div>
                  <div className="space-y-12">
                    <p className="font-semibold text-slate-800">Le Maître d'Œuvre (Architecte)</p>
                    <div className="border-t border-slate-300 w-2/3 mx-auto pt-1 font-mono text-[8px] text-slate-400">
                      Visé pour conformité, le __/__/20__
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: ANALYTICS TABLE AND BUDGET PROGRESS STATUS CHARTS */}
      {activeTab === "financials" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h3 className="font-sans font-bold text-slate-900 text-base">Bilan Financier Global</h3>
              <p className="text-xs text-slate-500">
                Suivi consolidé de l'avancement global, de la rentrée financière et des garanties de retenue retenues.
              </p>
            </div>
            <button
              onClick={exportFinancialsToExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-sm cursor-pointer border border-emerald-500 self-start sm:self-center"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" /> Exporter le Bilan (.xlsx)
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Project Progress Gauge */}
            <div className="border border-slate-100 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Consommation du Budget Initial
              </h4>

              <div className="flex items-center gap-6 py-4">
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#f1f5f9"
                      strokeWidth="10"
                      fill="transparent"
                    />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      stroke="#f59e0b"
                      strokeWidth="10"
                      fill="transparent"
                      strokeDasharray={`${2 * Math.PI * 40}`}
                      strokeDashoffset={`${2 * Math.PI * 40 * (1 - Math.min(Math.max(currentCumulHT / (totalContractHT || 1), 0), 1))}`}
                    />
                  </svg>
                  <div className="absolute text-center">
                    <span className="font-sans font-extrabold text-base text-slate-900">
                      {totalContractHT > 0 ? ((currentCumulHT / totalContractHT) * 100).toFixed(1) : "0"}%
                    </span>
                    <span className="text-[9px] text-slate-500 block">Accompli</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs text-slate-650 font-mono">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-full"></span>
                    <span>Consommé : {formatCurrency(currentCumulHT)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-slate-100 rounded-full"></span>
                    <span>Marché global : {formatCurrency(totalContractHT)}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-2 font-bold text-slate-800 border-t border-slate-100">
                    <span>Reste à réaliser : {formatCurrency(totalContractHT - currentCumulHT)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Retention and VAT balance card */}
            <div className="border border-slate-100 rounded-xl p-5 space-y-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Garanties et provisions d'encaissement (TVA)
              </h4>

              <div className="space-y-4">
                <div className="p-3 bg-amber-50 rounded-lg space-y-1">
                  <span className="text-[10px] text-amber-800 uppercase tracking-wider font-semibold">
                    Retenue de garantie cumulée ({projectRetentionRate}%) :
                  </span>
                  <div className="font-mono text-slate-900 font-bold text-base">
                    {formatCurrency(currentRetentionAmount)}
                  </div>
                  <p className="text-[10px] text-slate-500 font-sans">
                    Somme conservée sur le compte séquestre pour garantir les parfaites finitions.
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-lg space-y-1">
                  <span className="text-[10px] text-slate-705 uppercase tracking-wider font-semibold">
                    Provision Financière TTC du Chantier :
                  </span>
                  <div className="font-mono text-slate-900 font-bold text-base">
                    {formatCurrency(totalContractHT + (totalContractHT * projectTvaRate) / 100)}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Historical situation timeline checklist */}
          <div className="space-y-3">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Chronologie des Situations Mensuelles Approuvées
            </h4>

            <div className="border border-slate-100 rounded-xl overflow-hidden">
              <div className="bg-slate-950 py-2.5 px-4 font-mono text-[9px] text-slate-400 uppercase tracking-wider flex justify-between">
                <span>Numéro de situation / Date</span>
                <span>Statut de validité</span>
              </div>
              <div className="divide-y divide-slate-100">
                {(project.situations || [])
                  .sort((a, b) => a.number - b.number)
                  .map((sit) => {
                    const sitAmount = project.workItems.reduce((acc, item) => {
                      const progress = sit.itemsProgress[item.id] ?? 0;
                      return acc + (item.totalPrice * progress) / 100;
                    }, 0);

                    return (
                      <div key={sit.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div>
                          <div className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                            Situation Mensuelle N°{sit.number}
                            <span className="font-sans font-normal text-[10px] text-xs text-slate-500">
                              (du {new Date(sit.date).toLocaleDateString("fr-FR")})
                            </span>
                          </div>
                          <div className="text-[10px] font-mono text-slate-500 mt-1">
                            Montant atteint : {formatCurrency(sitAmount)} HT (
                            {totalContractHT > 0 ? ((sitAmount / totalContractHT)*100).toFixed(0) : "0"}% du marché)
                          </div>
                        </div>

                        <span
                          className={`text-[9px] font-mono font-bold px-2.5 py-1.1 rounded-full uppercase ${
                            sit.status === "draft"
                              ? "bg-slate-100 text-slate-600"
                              : sit.status === "approved"
                              ? "bg-amber-100 text-amber-850"
                              : "bg-emerald-150 text-emerald-800"
                          }`}
                        >
                          {sit.status === "draft" ? "Brouillon" : sit.status === "approved" ? "Approuvé" : "Payé"}
                        </span>
                      </div>
                    );
                  })}
                {(!project.situations || project.situations.length === 0) && (
                  <div className="p-6 text-center text-slate-400 text-xs">
                    Aucune situation enregistrée pour le moment.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: JOURNAL D'AUDIT (AUDIT LOGS) */}
      {activeTab === "audit" && (
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-150 pb-4">
            <div>
              <h3 className="font-sans font-bold text-slate-900 text-base flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" />
                Journal d'Audit & Historique des Modifications
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Visualisez la traçabilité complète de toutes les modifications apportées à l'avancement des chantiers.
              </p>
            </div>
          </div>

          {/* Table list of logs */}
          <div className="overflow-x-auto border border-slate-150 rounded-xl shadow-2xs">
            <table className="w-full text-left text-xs text-slate-650 font-sans">
              <thead className="bg-slate-900 text-slate-150 font-mono text-[9px] uppercase tracking-wider border-b border-slate-200">
                <tr>
                  <th className="p-3.5 pl-4">SITUATION</th>
                  <th className="p-3.5">UTILISATEUR</th>
                  <th className="p-3.5">DATE / HEURE</th>
                  <th className="p-3.5 pr-4">DÉSIGNATION DE LA MODIFICATION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-150 bg-white">
                {project.auditLogs && project.auditLogs.length > 0 ? (
                  project.auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="p-3.5 pl-4 align-middle font-bold text-slate-900 font-mono">
                        {log.situationNumber ? `Situation N°${log.situationNumber}` : "N/A"}
                      </td>
                      <td className="p-3.5 align-middle">
                        <div className="font-bold text-slate-800">{log.userName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{log.userEmail}</div>
                      </td>
                      <td className="p-3.5 align-middle text-slate-500 font-mono text-[11px] whitespace-nowrap">
                        {log.date}
                      </td>
                      <td className="p-3.5 pr-4 align-middle font-medium text-amber-800 font-mono text-[10.5px] leading-relaxed">
                        {log.action}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="p-12 text-center text-slate-450 text-xs italic">
                      Aucune modification enregistrée dans le journal d'audit pour le moment. Modifiez vos avancements et cliquez sur "Enregistrer" pour commencer à tracer.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* HISTORIQUE DE PHOTOS DE CHANTIER */}
          <div className="border-t border-slate-100 pt-6 mt-6 space-y-4">
            <div>
              <h4 className="font-sans font-bold text-slate-800 text-sm flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-500" />
                Galerie de Suivi Visuel (Historique des Photos)
              </h4>
              <p className="text-xs text-slate-500">
                Retrouvez l'historique complet de toutes les photographies et d'images d'avancements téléversées sur le chantier.
              </p>
            </div>

            {project.photos && project.photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {project.photos
                  .slice()
                  .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime())
                  .map((photo) => (
                    <div key={photo.id} className="relative group border border-slate-150 rounded-xl overflow-hidden shadow-2xs hover:shadow-xs transition-shadow">
                      <a href={photo.url} target="_blank" rel="noopener noreferrer" className="block relative">
                        <img
                          src={photo.url}
                          alt={photo.caption || "Photo historique"}
                          referrerPolicy="no-referrer"
                          className="w-full h-36 object-cover hover:scale-105 transition-transform duration-250 cursor-zoom-in"
                        />
                      </a>
                      
                      <div className="p-3 bg-slate-50/70 border-t border-slate-100 dark:bg-slate-950/5 hover:bg-slate-100/80 transition-colors">
                        <span className="font-mono text-[9px] bg-slate-250/60 text-slate-700 px-1.5 py-0.5 rounded-sm font-semibold inline-block mb-1">
                          SITUATION N°{photo.situationNumber || "N/A"}
                        </span>
                        <p className="text-[10.5px] font-bold text-slate-800 leading-tight line-clamp-2 mt-0.5" title={photo.caption}>
                          {photo.caption || "Cliché sans titre"}
                        </p>
                        <div className="mt-2 flex flex-col gap-0.5 text-[9px] text-slate-400 font-mono leading-none">
                          <span className="truncate">Par : <strong className="text-amber-800 font-medium">{photo.userName || "Admin"}</strong></span>
                          <span>Le : {photo.uploadedAt ? new Date(photo.uploadedAt).toLocaleString('fr-DZ') : "N/A"}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleDeleteChantierPhoto(photo.id)}
                        className="absolute top-2 right-2 p-1.5 bg-red-650 hover:bg-red-700 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shadow-md"
                        title="Supprimer définitivement"
                      >
                        <Trash2 className="w-3" />
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center p-8 border border-dashed border-slate-250 rounded-xl bg-slate-50 text-slate-400 text-xs italic">
                Aucun cliché d'avancement physique n'a encore été téléversé pour ce chantier. Allez dans l'onglet des situations pour en ajouter.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 5: PLANNING & RETARDS */}
      {activeTab === "planning" && (
        <div className="space-y-6">
          {/* Top Wizard / Baseline selector */}
          <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-100 pb-4">
              <div>
                <h3 className="font-sans font-bold text-slate-900 text-base flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-amber-500" />
                  Générateur de Planning & Suivi des Écarts de Retard
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Déterminez un planning cible et détectez automatiquement les retards physiques de chantier par rapprochement avec vos situations.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Option A: Generate schedule based on start/end dates */}
              <div className="border border-slate-150 rounded-xl p-5 bg-slate-50/50 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center font-mono">1</span>
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Proposition de planning par dates</h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Saisissez les dates contractuelles estimées pour les travaux. Gemini structurera chronologiquement les postes du marché en phases logiques et en établira les dépendances.
                </p>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Début des Travaux</label>
                    <input
                      type="date"
                      value={newPlanningStartDate}
                      onChange={(e) => setNewPlanningStartDate(e.target.value)}
                      className="w-full bg-white px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 font-medium"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-600 uppercase">Fin des Travaux</label>
                    <input
                      type="date"
                      value={newPlanningEndDate}
                      onChange={(e) => setNewPlanningEndDate(e.target.value)}
                      className="w-full bg-white px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 font-medium"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleProposePlanning}
                  disabled={planningProposeLoading || !newPlanningStartDate || !newPlanningEndDate}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all disabled:opacity-50"
                >
                  {planningProposeLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Planification par IA en cours...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                      Proposer un planning par IA
                    </>
                  )}
                </button>
              </div>

              {/* Option B: Upload planning file */}
              <div className="border border-slate-150 rounded-xl p-5 bg-slate-50/50 space-y-4">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-amber-500 text-slate-950 font-bold text-xs flex items-center justify-center font-mono">2</span>
                  <h4 className="text-xs font-bold uppercase text-slate-700 tracking-wider">Extraire depuis un planning existant</h4>
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Téléversez un fichier de planning de travaux (diagramme de Gantt PDF, tableau contractuel existant ou capture d'écran de calendrier de chantier).
                </p>
                
                {/* File Uploader */}
                <div className="space-y-2">
                  <input
                    type="file"
                    id="planning-uploader"
                    accept=".pdf,image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => setPlanningFile(e.target.files ? e.target.files[0] : null)}
                  />
                  <div
                    onClick={() => document.getElementById("planning-uploader")?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-amber-400 bg-white hover:bg-slate-50/50 cursor-pointer p-3 rounded-lg flex flex-col items-center justify-center text-center transition-all"
                  >
                    <FileUp className="w-5 h-5 text-slate-400 mb-1" />
                    <span className="text-[11px] font-semibold text-slate-700">
                      {planningFile ? planningFile.name : "Sélectionner ou glisser le planning (PDF/Image)"}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">PDF ou Image jusqu'à 10 Mo</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {planningFile && (
                    <button
                      type="button"
                      onClick={() => setPlanningFile(null)}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 hover:text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleUploadPlanningFile}
                    disabled={planningFileLoading || !planningFile}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 rounded-lg text-xs font-bold transition-all cursor-pointer"
                  >
                    {planningFileLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Lecture IA du document Gantt...
                      </>
                    ) : (
                      <>
                        <Download className="w-3.5 h-3.5" />
                        Extraire & Enregistrer
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Timeline and Delay Evaluation display */}
          {/* Timeline and Delay Evaluation display */}
          {project.planningTasks && project.planningTasks.length > 0 ? (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <h4 className="font-sans font-bold text-slate-900 text-sm">Chronogramme d'avancement & Analyse d'alerte de retard</h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Dates cibles : <strong className="font-mono text-slate-700">{project.planningStartDate}</strong> au <strong className="font-mono text-slate-700">{project.planningEndDate}</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const u = { ...project, planningTasks: [] };
                    onProjectUpdated(u as any);
                  }}
                  className="px-3 py-1 text-slate-500 hover:text-red-650 hover:bg-red-50 text-[11px] font-semibold border border-slate-200 hover:border-red-200 rounded-lg cursor-pointer transition-colors font-sans"
                >
                  Effacer le planning actuel
                </button>
              </div>

              {/* LIAISON AVEC LES SITUATIONS (Interactive Controls Panel) */}
              <div className="bg-amber-50/50 border border-amber-150 rounded-xl p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <div className="bg-amber-400 text-slate-950 p-1 rounded font-bold text-xs uppercase tracking-wider font-mono">
                    Liaison Métier
                  </div>
                  <h5 className="text-xs font-bold text-slate-900 font-sans uppercase">
                    Liaison du Chronogramme avec les Situations Approuvées
                  </h5>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Select reference situation */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Situation de Référence pour l'Avancement Réel :
                    </label>
                    <select
                      value={selectedPlanningSitId}
                      onChange={(e) => setSelectedPlanningSitId(e.target.value)}
                      className="w-full bg-white border border-slate-200 text-slate-800 text-xs rounded-lg px-3 py-2 font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                    >
                      <option value="latest_approved">🏆 Dernière situation approuvée ou payée (Recommandé)</option>
                      <option value="latest_any">⚡ Dernière situation créée (tous statuts confondus)</option>
                      {(() => {
                        const approvedSits = (project.situations || []).filter(s => s.status === "approved" || s.status === "paid");
                        const draftSits = (project.situations || []).filter(s => s.status === "draft");
                        
                        return (
                          <>
                            {approvedSits.length > 0 && (
                              <optgroup label="Situations approuvées / payées (Officielles)">
                                {approvedSits.map(s => (
                                  <option key={s.id} value={s.id}>
                                    Situation N°{s.number} (du {new Date(s.date).toLocaleDateString("fr-DZ")}) — {s.status === "paid" ? "Payée" : "Approuvée"}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                            {draftSits.length > 0 && (
                              <optgroup label="Brouillons de situations (Non officiel)">
                                {draftSits.map(s => (
                                  <option key={s.id} value={s.id}>
                                    Situation N°{s.number} (du {new Date(s.date).toLocaleDateString("fr-DZ")}) — Brouillon
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </>
                        );
                      })()}
                    </select>
                  </div>

                  {/* Settings: Static vs Dynamic target checkpoints */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                      Alerte de Délaissement de Phase (Retard) :
                    </label>
                    <div className="flex bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setPlanningComparisonMode("dynamic")}
                        className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                          planningComparisonMode === "dynamic" 
                            ? "bg-white text-slate-900 shadow-3xs" 
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Dynamique à la date de situation
                      </button>
                      <button
                        type="button"
                        onClick={() => setPlanningComparisonMode("static")}
                        className={`flex-1 py-1.5 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                          planningComparisonMode === "static" 
                            ? "bg-white text-slate-900 shadow-3xs" 
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        Statique (Objectif final de la phase)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Banner summarizing currently selected situation information */}
                {(() => {
                  const refDate = getPlanningSituationDate();
                  const allSituations = project.situations || [];
                  const sitIdToUse = selectedPlanningSitId;
                  
                  let chosenSit = null;
                  if (sitIdToUse === "latest_approved") {
                    const approvedSits = allSituations.filter(s => s.status === "approved" || s.status === "paid");
                    chosenSit = approvedSits.length > 0 ? [...approvedSits].sort((a, b) => b.number - a.number)[0] : null;
                  } else if (sitIdToUse === "latest_any") {
                    chosenSit = allSituations.length > 0 ? [...allSituations].sort((a, b) => b.number - a.number)[0] : null;
                  } else {
                    chosenSit = allSituations.find(s => s.id === sitIdToUse) || null;
                  }

                  const formattedDate = refDate 
                    ? new Date(refDate).toLocaleDateString("fr-DZ", { day: 'numeric', month: 'long', year: 'numeric' })
                    : null;

                  return (
                    <div className="text-[11px] text-slate-650 leading-relaxed bg-white/70 p-3 rounded-lg border border-slate-100 space-y-1">
                      <div>
                        {chosenSit ? (
                          <>
                            📈 Analyse basée sur la <strong className="text-slate-900">Situation N°{chosenSit.number}</strong> (date d'arrêté au : <strong className="text-amber-800">{formattedDate}</strong>). Statut actuel : <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold uppercase font-sans ${
                              chosenSit.status === "approved" ? "bg-emerald-100 text-emerald-800" :
                              chosenSit.status === "paid" ? "bg-blue-100 text-blue-800" : "bg-slate-200 text-slate-600"
                            }`}>{chosenSit.status === "approved" ? "Approuvée" : chosenSit.status === "paid" ? "Payée" : "Brouillon / En cours"}</span>
                          </>
                        ) : (
                          <>
                            ⚠️ <strong className="text-red-700">Aucune situation validée trouvée.</strong> Créez ou approuvez une situation de travaux pour bénéficier du rapprochement interactif de planification des tâches.
                          </>
                        )}
                      </div>
                      {planningComparisonMode === "dynamic" && refDate && (
                        <div className="text-[10px] text-slate-400 italic">
                          💡 En mode <strong className="font-sans font-semibold">Dynamique</strong>, l'application recalcule l'avancement théorique attendu au <strong className="font-mono">{new Date(refDate).toLocaleDateString("fr-FR")}</strong> pour chaque lot (proportionnellement aux dates de la tâche). Si l'avancement réel cumulé de la situation est inférieur à cette cible, l'alerte retard est déclenchée.
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* Gantt / list of tasks with comparison */}
              <div className="overflow-x-auto border border-slate-150 rounded-xl shadow-3xs">
                <table className="w-full text-left text-xs text-slate-650 font-sans">
                  <thead className="bg-slate-950 text-slate-200 font-mono text-[9px] uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="p-3 pl-4">Lot ou Phase</th>
                      <th className="p-3">Désignation de la Tâche</th>
                      <th className="p-3">Début Cible</th>
                      <th className="p-3">Fin Cible</th>
                      <th className="p-3 text-center">Prog. Attendue (Cible)</th>
                      <th className="p-3 text-center">Prog. Réelle Situation</th>
                      <th className="p-2 pr-4">Alerte / Statut d'écart</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-150 bg-white">
                    {project.planningTasks.map((task, idx) => {
                      const computedActual = getLotProgress(task.associatedLot || "");
                      const sitDate = getPlanningSituationDate();
                      const computedTarget = getExpectedProgressAtDate(task, sitDate);
                      const gap = computedActual - computedTarget;
                      const hasDelay = gap < 0;
                      const isCriticalDelay = gap <= -15;

                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                          <td className="p-3 pl-4 font-bold text-slate-800 font-mono text-[11px]">
                            {task.associatedLot || "Général"}
                          </td>
                          <td className="p-3">
                            <div className="font-bold text-slate-900 text-xs">{task.name}</div>
                            {task.notes && <div className="text-[10px] text-slate-400 leading-relaxed mt-0.5">{task.notes}</div>}
                          </td>
                          <td className="p-3 font-mono text-[11px] whitespace-nowrap text-slate-500">{task.targetStartDate}</td>
                          <td className="p-3 font-mono text-[11px] whitespace-nowrap text-slate-500">{task.targetEndDate}</td>
                          <td className="p-3 font-mono text-[11px] font-bold text-indigo-700 bg-indigo-50/30 text-center">
                            <div>{computedTarget}%</div>
                            {planningComparisonMode === "dynamic" && (
                              <div className="text-[9px] text-indigo-400 font-normal">cible finale : {task.progress}%</div>
                            )}
                          </td>
                          <td className="p-3 font-mono text-[11px] font-bold text-slate-800 text-center">
                            {computedActual}%
                          </td>
                          <td className="p-3 pr-4 align-middle whitespace-nowrap">
                            {hasDelay ? (
                              <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                isCriticalDelay 
                                  ? "bg-rose-50 text-rose-850 animate-pulse border border-rose-150" 
                                  : "bg-amber-50 text-amber-800 border border-amber-150"
                              }`}>
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {isCriticalDelay ? "RETARD CRITIQUE" : "RETARD"} ({gap}%)
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-150 text-[10px] font-bold">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                                CONFORME (+{gap}%)
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Graphical timeline representation */}
              <div className="p-5 border border-slate-100 bg-slate-50/40 rounded-xl space-y-4">
                <h5 className="text-[11px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-slate-400" />
                  Illustration graphique de l'avancement physique comparé
                </h5>
                <div className="space-y-4">
                  {project.planningTasks.map((task, idx) => {
                    const actualProgress = getLotProgress(task.associatedLot || "");
                    const sitDate = getPlanningSituationDate();
                    const targetProgress = getExpectedProgressAtDate(task, sitDate);
                    const isDelayed = actualProgress < targetProgress;

                    return (
                      <div key={idx} className="space-y-1">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="font-bold text-slate-800 truncate max-w-xs">{task.name}</span>
                          <span className="font-mono text-slate-400">
                            Cible: <strong className="text-indigo-650">{targetProgress}%</strong> | Réel: <strong className={isDelayed ? "text-red-600" : "text-emerald-700"}>{actualProgress}%</strong>
                          </span>
                        </div>
                        {/* Stacked bar gauge */}
                        <div className="h-2.5 w-full bg-slate-200 rounded-full overflow-hidden relative">
                          {/* target progress bar */}
                          <div 
                            className="absolute top-0 bottom-0 left-0 bg-indigo-250 opacity-40 transition-all duration-500"
                            style={{ width: `${targetProgress}%` }}
                          />
                          {/* actual progress bar */}
                          <div 
                            className={`absolute top-0 bottom-0 left-0 transition-all duration-500 ${isDelayed ? "bg-rose-500" : "bg-emerald-500"}`}
                            style={{ width: `${actualProgress}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Alert & Email Notification Panel */}
              {(() => {
                const sitDate = getPlanningSituationDate();
                const delayedLots = (project.planningTasks || []).filter(task => {
                  const actualProgress = getLotProgress(task.associatedLot || "");
                  const targetProgress = getExpectedProgressAtDate(task, sitDate);
                  return actualProgress < targetProgress;
                });

                if (delayedLots.length === 0) {
                  return (
                    <div className="bg-emerald-50 border border-emerald-150 rounded-xl p-4 flex items-center gap-3 text-emerald-850">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div className="text-xs">
                        <strong className="font-sans font-bold">Conformité nominale :</strong> Aucun retard n'a été détecté par rapport au planning cible lors de la dernière situation ! Tous les lots avancent conformément au chronogramme officiel.
                      </div>
                    </div>
                  );
                }

                return (
                  <div id="delay-email-sender-panel" className="bg-slate-50 border border-slate-150 rounded-xl p-5 space-y-5">
                    <div className="flex items-start gap-3">
                      <div className="bg-rose-50 border border-rose-100 p-2 rounded-lg text-rose-600 shrink-0">
                        <Mail className="w-5 h-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <h5 className="text-xs font-bold text-slate-900 uppercase tracking-wide flex items-center gap-1.5">
                          Informer par e-mail sur les lots en retard
                        </h5>
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                          L'application a identifié des lots en retard physique par rapport à la planification prévisionnelle. Vous pouvez transmettre une mise en demeure ou une notification d'expert formelle par e-mail en renseignant les contacts ci-dessous.
                        </p>
                      </div>
                    </div>

                    {delayEmailSuccess && (
                      <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 p-3.5 rounded-xl text-xs font-semibold">
                        {delayEmailSuccess}
                      </div>
                    )}

                    {delayEmailError && (
                      <div className="bg-rose-50 border border-rose-250 text-rose-800 p-3.5 rounded-xl text-xs font-semibold">
                        {delayEmailError}
                      </div>
                    )}

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pt-2">
                      {/* Column 1: Contacts configuration */}
                      <div className="space-y-4">
                        <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Destinataires (Sélectionnez ou ajustez les e-mails)
                        </h6>

                        <div className="space-y-3 bg-white p-4 border border-slate-100 rounded-xl">
                          {/* Client row */}
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={project.clientEmail ? delayEmailRecipients.includes(project.clientEmail) : false}
                                  disabled={!project.clientEmail}
                                  onChange={() => {
                                    if (!project.clientEmail) return;
                                    if (delayEmailRecipients.includes(project.clientEmail)) {
                                      setDelayEmailRecipients(delayEmailRecipients.filter(r => r !== project.clientEmail));
                                    } else {
                                      setDelayEmailRecipients([...delayEmailRecipients, project.clientEmail]);
                                    }
                                  }}
                                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                />
                                <span className="truncate max-w-[200px]">Client : <strong className="text-slate-900">{project.clientName}</strong></span>
                              </label>
                            </div>
                            <input
                              type="email"
                              placeholder="client@email.com (Saisir pour enregistrer)"
                              value={inlineClientEmail}
                              onChange={(e) => setInlineClientEmail(e.target.value)}
                              className="w-full bg-slate-50/50 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                            />
                          </div>

                          {/* Supervisor row */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-50">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={project.supervisorEmail ? delayEmailRecipients.includes(project.supervisorEmail) : false}
                                  disabled={!project.supervisorEmail}
                                  onChange={() => {
                                    if (!project.supervisorEmail) return;
                                    if (delayEmailRecipients.includes(project.supervisorEmail)) {
                                      setDelayEmailRecipients(delayEmailRecipients.filter(r => r !== project.supervisorEmail));
                                    } else {
                                      setDelayEmailRecipients([...delayEmailRecipients, project.supervisorEmail]);
                                    }
                                  }}
                                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                />
                                <span className="truncate max-w-[200px]">MŒ / Cabinet : <strong className="text-slate-900">{project.supervisor}</strong></span>
                              </label>
                            </div>
                            <input
                              type="email"
                              placeholder="moe@email.com (Saisir pour enregistrer)"
                              value={inlineSupervisorEmail}
                              onChange={(e) => setInlineSupervisorEmail(e.target.value)}
                              className="w-full bg-slate-50/50 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                            />
                          </div>

                          {/* Contractor row */}
                          <div className="space-y-1.5 pt-2 border-t border-slate-50">
                            <div className="flex items-center justify-between">
                              <label className="flex items-center gap-2 text-xs font-bold text-slate-700">
                                <input
                                  type="checkbox"
                                  checked={project.contractorEmail ? delayEmailRecipients.includes(project.contractorEmail) : false}
                                  disabled={!project.contractorEmail}
                                  onChange={() => {
                                    if (!project.contractorEmail) return;
                                    if (delayEmailRecipients.includes(project.contractorEmail)) {
                                      setDelayEmailRecipients(delayEmailRecipients.filter(r => r !== project.contractorEmail));
                                    } else {
                                      setDelayEmailRecipients([...delayEmailRecipients, project.contractorEmail]);
                                    }
                                  }}
                                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500 cursor-pointer"
                                />
                                <span className="truncate max-w-[200px]">Entreprise : <strong className="text-slate-900">{project.contractor}</strong></span>
                              </label>
                            </div>
                            <input
                              type="email"
                              placeholder="contact@entreprise.com (Saisir pour enregistrer)"
                              value={inlineContractorEmail}
                              onChange={(e) => setInlineContractorEmail(e.target.value)}
                              className="w-full bg-slate-50/50 px-2.5 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 focus:bg-white"
                            />
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex justify-end">
                            <button
                              type="button"
                              onClick={handleSaveStakeholderEmails}
                              disabled={isSavingStakeholders}
                              className="px-3 py-1 bg-slate-100 hover:bg-slate-250 text-slate-800 font-sans text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                            >
                              {isSavingStakeholders ? "Enregistrement..." : "Enregistrer les E-mails sur le projet"}
                            </button>
                          </div>
                        </div>

                        {/* Manual recipient addition */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">
                            Saisir une adresse e-mail supplémentaire
                          </label>
                          <div className="flex gap-2">
                            <input
                              type="email"
                              value={delayEmailManual}
                              onChange={(e) => setDelayEmailManual(e.target.value)}
                              placeholder="bureau-detudes@chantier.dz"
                              className="flex-1 bg-white px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (!delayEmailManual || !delayEmailManual.includes("@")) {
                                  alert("Veuillez saisir une adresse e-mail valide.");
                                  return;
                                }
                                if (delayEmailRecipients.includes(delayEmailManual)) {
                                  setDelayEmailManual("");
                                  return;
                                }
                                setDelayEmailRecipients([...delayEmailRecipients, delayEmailManual]);
                                setDelayEmailManual("");
                              }}
                              className="px-3 bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-bold rounded-lg cursor-pointer transition-all"
                            >
                              Ajouter
                            </button>
                          </div>
                          {delayEmailRecipients.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-2">
                              {delayEmailRecipients.map((recipient) => (
                                <span key={recipient} className="inline-flex items-center gap-1 bg-slate-200/80 text-slate-800 font-mono text-[9px] px-2 py-0.5 rounded-md font-medium">
                                  {recipient}
                                  <button
                                    type="button"
                                    onClick={() => setDelayEmailRecipients(delayEmailRecipients.filter(r => r !== recipient))}
                                    className="text-slate-500 hover:text-red-650 font-bold ml-1 cursor-pointer"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Column 2: Subject & Content Preview */}
                      <div className="space-y-4">
                        <h6 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Sujet & Aperçu des lots signalés
                        </h6>

                        <div className="space-y-1.5">
                          <label className="text-[10px] font-bold text-slate-500 uppercase">Sujet de l'E-mail</label>
                          <input
                            type="text"
                            value={delayEmailSubject}
                            onChange={(e) => setDelayEmailSubject(e.target.value)}
                            placeholder="🚨 [Alerte Retard] Suivi de Chantier"
                            className="w-full bg-white px-3 py-1.5 text-xs border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-rose-500"
                          />
                        </div>

                        <div className="bg-white border border-slate-150 p-4 rounded-xl space-y-3">
                          <div className="flex items-center gap-2 border-b border-slate-50 pb-2">
                            <div className="w-1.5 h-1.5 bg-rose-600 rounded-full" />
                            <span className="text-[10px] font-bold text-rose-700 tracking-wider uppercase">
                              Synthèse des retards de chantier :
                            </span>
                          </div>
                          <div className="max-h-40 overflow-y-auto space-y-2">
                            {delayedLots.map((task, idx) => {
                              const actual = getLotProgress(task.associatedLot || "");
                              const gap = actual - task.progress;
                              return (
                                <div key={idx} className="flex justify-between items-center text-[11px] border-b border-dashed border-slate-50 pb-1.5">
                                  <div>
                                    <div className="font-bold text-slate-850 font-sans">{task.associatedLot || "Général"}</div>
                                    <div className="text-[10px] text-slate-400 font-medium">{task.name}</div>
                                  </div>
                                  <span className="font-mono text-rose-600 font-bold">
                                    {actual}% Réel / Cible {task.progress}% ({gap}%)
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed pt-2 border-t border-slate-50">
                            Cette alerte intègre une mise en page claire (da, client, maître d'ouvrage/maître d'œuvre, taux nominaux et dates de fin) qui sera envoyée par e-mail afin de sommer les intervenants de rattraper les dérives de planification.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={handleSendDelayEmail}
                          disabled={delayEmailLoading || delayEmailRecipients.length === 0}
                          className="w-full py-2.5 bg-rose-650 hover:bg-rose-700 text-white font-sans text-xs font-bold rounded-xl cursor-pointer transition-colors shadow-2xs shadow-rose-200 flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:shadow-none disabled:cursor-not-allowed"
                        >
                          {delayEmailLoading ? (
                            <>
                              <Loader2 className="w-4 h-4 animate-spin" />
                              Envoi de l'alerte par e-mail en cours...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4" />
                              Envoyer l'alerte e-mail aux intervenants
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Sent Email History Logs inside the project */}
                    {project.sentEmails && project.sentEmails.length > 0 && (
                      <div className="pt-4 border-t border-slate-200 mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <h6 className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                            Historique des e-mails d'alerte envoyés
                          </h6>
                          <div className="text-[10px] font-bold text-emerald-700">
                            {project.sentEmails.length} alerte(s) notifiée(s)
                          </div>
                        </div>
                        <div className="space-y-2 max-h-32 overflow-y-auto font-mono text-[10px]">
                          {project.sentEmails.map((email, eIdx) => (
                            <div key={email.id || eIdx} className="bg-white border border-slate-150 p-2.5 rounded-lg flex items-start justify-between gap-4">
                              <div className="space-y-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-400">{new Date(email.date).toLocaleString("fr-DZ")}</span>
                                  <span className="font-sans font-bold text-slate-800 truncate max-w-xs">{email.subject}</span>
                                </div>
                                <div className="text-[11px] text-slate-500">Destinataires : <span className="text-slate-700">{email.recipients.join(", ")}</span></div>
                              </div>
                              <span className={`px-2 py-0.5 rounded-full font-bold text-[9px] uppercase ${
                                email.status === "sent" ? "bg-emerald-50 text-emerald-700 border border-emerald-150" : "bg-blue-50 text-blue-700 border border-blue-150"
                              }`}>
                                {email.status === "sent" ? "Envoyé SMTP" : "Simulé"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          ) : (
            <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-12 text-center text-slate-450 space-y-3">
              <Calendar className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-sans font-bold text-slate-800 text-sm">Aucun planning cible configuré</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                Afin de pouvoir détecter les éventuels retards sur les lots physiques de travaux, veuillez proposer un planning avec l'IA en renseignant des dates ou téléservez un document de planification.
              </p>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: DIAGNOSTIC & AVIS EXPERT IA */}
      {activeTab === "opinion" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left controller: Analyse uploader */}
            <div className="lg:col-span-1 bg-white border border-slate-100 rounded-2xl shadow-sm p-5 space-y-5">
              <div>
                <h3 className="font-sans font-bold text-slate-900 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Auditer un rapport de chantier
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Soumettez un procès-verbal de chantier (PV), journal de chantier ou compte rendu de réunion. L'IA établira un diagnostic d'expert avec constat des risques et points forts.
                </p>
              </div>

              {opinionError && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-xs font-semibold">
                  {opinionError}
                </div>
              )}

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Type de document</label>
                  <div className="flex bg-slate-100 p-1 rounded-lg gap-1">
                    <button
                      type="button"
                      onClick={() => setOpinionDocType('pv')}
                      className={`flex-1 text-center py-1 text-[10px] sm:text-xs font-bold rounded-md cursor-pointer transition-all ${
                        opinionDocType === 'pv' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      PV de Réunion
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpinionDocType('journal')}
                      className={`flex-1 text-center py-1 text-[10px] sm:text-xs font-bold rounded-md cursor-pointer transition-all ${
                        opinionDocType === 'journal' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-500 hover:text-slate-700'
                      }`}
                    >
                      Journal Chantier
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Fichier joint</label>
                  <input
                    type="file"
                    id="opinion-uploader"
                    accept=".pdf,image/*,application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      setOpinionFile(e.target.files ? e.target.files[0] : null);
                      setOpinionError(null);
                    }}
                  />
                  <div
                    onClick={() => document.getElementById("opinion-uploader")?.click()}
                    className="border-2 border-dashed border-slate-200 hover:border-amber-400 bg-white hover:bg-slate-50/50 cursor-pointer p-4 rounded-lg flex flex-col items-center justify-center text-center transition-all"
                  >
                    <FileText className="w-6 h-6 text-slate-400 mb-1" />
                    <span className="text-[11.5px] font-semibold text-slate-700">
                      {opinionFile ? opinionFile.name : "Sélectionner le rapport"}
                    </span>
                    <span className="text-[9px] text-slate-400 mt-0.5">PDF, Rapport Scanné ou Photo</span>
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  {opinionFile && (
                    <button
                      type="button"
                      onClick={() => setOpinionFile(null)}
                      className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs font-semibold rounded-lg cursor-pointer"
                    >
                      Annuler
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleEvaluateOpinion}
                    disabled={opinionFileLoading || !opinionFile}
                    className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white rounded-lg text-xs font-semibold cursor-pointer transition-all shadow"
                  >
                    {opinionFileLoading ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Expertise IA en cours...
                      </>
                    ) : (
                      <>
                        <Award className="w-3.5 h-3.5 text-amber-400" />
                        Lancer l'Analyse Expert
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Right container: Expert Opinions feed */}
            <div className="lg:col-span-2 space-y-4">
              {project.expertOpinions && project.expertOpinions.length > 0 ? (
                (() => {
                  const currentOp = selectedOpinion || project.expertOpinions[0];
                  return (
                    <div className="space-y-5">
                      {/* Analysis History Select Slider */}
                      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm flex items-center justify-between gap-4 no-print">
                        <span className="text-xs font-bold text-slate-500">Sélectionner un Diagnostic :</span>
                        <select
                          value={currentOp.id}
                          onChange={(e) => {
                            const found = project.expertOpinions?.find(o => o.id === e.target.value);
                            if (found) setSelectedOpinion(found);
                          }}
                          className="px-3 py-1.5 text-xs font-bold text-slate-950 bg-white border border-slate-200 rounded-lg"
                        >
                          {project.expertOpinions.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.date} - Basé sur : {o.sourceDocName}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Main Expert Sheet */}
                      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 gap-4 no-print">
                          <div>
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-950 font-bold rounded text-[10px] uppercase font-mono tracking-wider">
                              Rapport d'Audit Technique IA
                            </span>
                            <h4 className="font-sans font-bold text-slate-950 text-base mt-1">
                              Avis Expert formulé le {currentOp.date}
                            </h4>
                            <p className="text-[11px] text-slate-400">
                              Document source : {currentOp.sourceDocName}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => window.print()}
                            className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            Imprimer ce rapport
                          </button>
                        </div>

                        {/* Global Verdict Frame */}
                        <div className="p-4 bg-gradient-to-r from-slate-900 to-slate-850 text-slate-100 rounded-xl space-y-2 shadow-sm">
                          <span className="text-[10px] font-bold text-amber-400 uppercase tracking-widest font-mono">
                            Verdict Synthétique & Avis Global
                          </span>
                          <p className="text-xs font-medium leading-relaxed font-sans">{currentOp.globalVerdict}</p>
                        </div>

                        {/* Double Column: Risks vs. Advantages */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                          {/* Risks Card - Deep Red style */}
                          <div className="border border-red-100 rounded-xl bg-rose-50/30 p-4 space-y-3">
                            <span className="text-[10.5px] text-red-850 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-red-100 pb-2">
                              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
                              Risques & Anomalies Détectés
                            </span>
                            <ul className="space-y-2">
                              {currentOp.risks.map((risk: string, ridx: number) => (
                                <li key={ridx} className="text-xs text-red-900 flex gap-2 leading-relaxed font-sans">
                                  <span className="text-rose-500 shrink-0 font-bold">•</span>
                                  <span>{risk}</span>
                                </li>
                              ))}
                              {currentOp.risks.length === 0 && (
                                <li className="text-xs text-slate-400 italic font-sans">Aucun risque notable identifié.</li>
                              )}
                            </ul>
                          </div>

                          {/* Advantages - Deep teal/emerald style */}
                          <div className="border border-emerald-100 rounded-xl bg-emerald-50/10 p-4 space-y-3">
                            <span className="text-[10.5px] text-emerald-850 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-emerald-100 pb-2">
                              <Award className="w-4 h-4 text-emerald-600 shrink-0" />
                              Points Forts & Avantages Relevés
                            </span>
                            <ul className="space-y-2">
                              {currentOp.advantages.map((adv: string, aidx: number) => (
                                <li key={aidx} className="text-xs text-emerald-950 flex gap-2 leading-relaxed font-sans">
                                  <span className="text-emerald-500 shrink-0 font-bold">•</span>
                                  <span>{adv}</span>
                                </li>
                              ))}
                              {currentOp.advantages.length === 0 && (
                                <li className="text-xs text-slate-400 italic font-sans">Aucun point fort spécifique extrait.</li>
                              )}
                            </ul>
                          </div>
                        </div>

                        {/* Recommendations */}
                        <div className="border border-slate-150 rounded-xl bg-white p-4 space-y-3 shadow-3xs">
                          <span className="text-[10.5px] text-slate-800 font-bold uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2 font-mono">
                            <ClipboardList className="w-4 h-4 text-amber-500 shrink-0" />
                            Plan d'Action IA & Recommandations Pratiques
                          </span>
                          <ol className="space-y-2.5">
                            {currentOp.recommendations.map((rec: string, ridx: number) => (
                              <li key={ridx} className="text-xs text-slate-700 font-sans leading-relaxed flex gap-3">
                                <span className="w-5 h-5 rounded bg-amber-100 text-amber-950 font-bold text-[10px] flex items-center justify-center shrink-0">
                                  {ridx + 1}
                                </span>
                                <span className="pt-0.5">{rec}</span>
                              </li>
                            ))}
                          </ol>
                        </div>

                        {/* Collapsible raw details text */}
                        <div className="border border-slate-100 rounded-lg p-4 bg-slate-50/40 no-print">
                          <details className="group">
                            <summary className="text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer flex items-center justify-between">
                              <span>Consulter l'analyse complète d'audit détaillée</span>
                              <ChevronRight className="w-4 h-4 transform group-open:rotate-90 transition-transform text-slate-400" />
                            </summary>
                            <p className="mt-3 text-xs text-slate-500 whitespace-pre-line leading-relaxed border-t border-slate-150 pt-3 font-sans">
                              {currentOp.fullAnalysisText}
                            </p>
                          </details>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-12 text-center text-slate-450 space-y-3">
                  <BookOpen className="w-12 h-12 text-slate-300 mx-auto" />
                  <h4 className="font-sans font-bold text-slate-800 text-sm">Aucun audit de chantier disponible</h4>
                  <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
                    Téléversez le journal de chantier ou le compte rendu de réunion (PV) à gauche afin de commander un audit IA et diagnostiquer les risques et points d'appui.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB: BIM PLANS & DEVIS GENERATION */}
      {activeTab === "plans_devis" && (
        <div className="space-y-6">
          <div className="bg-slate-900 rounded-2xl p-6 text-white text-left relative overflow-hidden shadow-md">
            <div className="absolute right-0 top-0 opacity-10 pointer-events-none transform translate-x-12 -translate-y-6">
              <Layers className="w-96 h-96" />
            </div>
            <div className="relative z-10 space-y-2">
              <span className="px-2.5 py-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-500/30 font-mono inline-block">
                Modélisation Virtuelle BIM & Analyse Spatiale
              </span>
              <h2 className="text-xl font-sans font-bold tracking-tight">Générateur de Devis BIM par Plans 2D</h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Combinez vos plans d'architecture 2D et vos critères structurels pour générer un jumeau numérique de données. Le système calcule automatiquement les volumes de béton armé, les surfaces d'élévation, les finitions et adapte le second œuvre de manière cumulative.
              </p>
            </div>
          </div>

          {bimStep === "params_input" ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-left">
              {/* PANNEAU GAUCHE : PARAMÈTRES BIM & IMPORT BORDEREAU */}
              <div className="lg:col-span-7 bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-6">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                  <Calculator className="w-5 h-5 text-amber-500" />
                  <h3 className="font-sans font-bold text-slate-900 text-sm">Paramètres Structurels du Projet</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* NOMBRE D'ÉTAGES */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <Layers className="w-3.5 h-3.5 text-slate-450" />
                      Nombre d'étages
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={bimNumFloors}
                      onChange={(e) => setBimNumFloors(Math.max(1, parseInt(e.target.value) || 1))}
                      className="w-full bg-white px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 font-bold focus:border-amber-500"
                    />
                    <p className="text-[10px] text-slate-400">Excluant les fondations</p>
                  </div>

                  {/* TYPE DE FONDATIONS */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-slate-450" />
                      Type de fondations
                    </label>
                    <select
                      value={bimFoundationType}
                      onChange={(e) => setBimFoundationType(e.target.value)}
                      className="w-full bg-white px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 font-bold focus:border-amber-500"
                    >
                      <option value="Vide sanitaire">Vide sanitaire</option>
                      <option value="Semelles filantes">Semelles filantes</option>
                      <option value="Radier">Radier</option>
                      <option value="Pieux">Pieux</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Détermine le terrassement</p>
                  </div>

                  {/* HAUTEUR D'ÉTAGE */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-slate-450" />
                      Hauteur d'étage (m)
                    </label>
                    <input
                      type="number"
                      step={0.1}
                      min={1.5}
                      max={6.0}
                      value={bimFloorHeight}
                      onChange={(e) => setBimFloorHeight(Math.max(1.5, parseFloat(e.target.value) || 2.8))}
                      className="w-full bg-white px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 font-bold focus:border-amber-500"
                    />
                    <p className="text-[10px] text-slate-400">Hauteur libre sous dalles</p>
                  </div>
                </div>

                {/* IMPORT CATALOGUE D'ARTICLES OPTIONNEL */}
                <div className="bg-slate-50/60 rounded-xl p-4 border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                      <div>
                        <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider font-mono">Bordereau / Catalogue d'Articles (Optionnel)</span>
                        <p className="text-[10px] text-slate-500">Lier le devis à vos propres codes de postes & prix unitaires</p>
                      </div>
                    </div>
                    {bimCatalogFile && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-bold rounded-full text-[9px] font-mono">
                        Chargé
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3">
                    <div 
                      className={`flex-1 border-2 border-dashed rounded-lg p-3 text-center cursor-pointer transition-all ${
                        isDraggingCatalog 
                          ? "border-emerald-500 bg-emerald-50/50" 
                          : "border-slate-200 bg-white hover:bg-slate-100/50 hover:border-slate-300"
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
                      <label className="cursor-pointer block w-full h-full">
                        <input
                          type="file"
                          accept=".xlsx,.xls,.pdf"
                          onChange={handleBimCatalogSelection}
                          className="hidden"
                        />
                        <div className="flex flex-col items-center gap-1">
                          <FileUp className={`w-5 h-5 mx-auto ${isDraggingCatalog ? "text-emerald-500 focus:scale-110" : "text-slate-400"}`} />
                          <span className="text-xs font-semibold text-slate-600">
                            {bimCatalogFile ? bimCatalogFile.name : "Glisser ou téléverser votre fichier de lots / bordereau"}
                          </span>
                          <span className="text-[10px] text-slate-400">PDF, Excel .xlsx / .xls</span>
                        </div>
                      </label>
                    </div>
                    {bimCatalogFile && (
                      <button
                        onClick={() => setBimCatalogFile(null)}
                        className="p-2 text-rose-500 hover:bg-rose-50 rounded-lg border border-rose-100 cursor-pointer"
                        title="Retirer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* DESCRIPTIF ADDITIONNEL */}
                <div className="space-y-2">
                  <label className="text-[11px] font-semibold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-450" />
                    Spécifications Générales Rédactionnelles (Optionnel)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ex: Structure béton armé, maçonnerie en briques creuses de 15cm, enduits intérieurs au plâtre, faïences italiennes, appareillage électrique Legrand..."
                    value={bimDescription}
                    onChange={(e) => setBimDescription(e.target.value)}
                    className="w-full text-xs border border-slate-200 rounded-lg p-3 focus:border-amber-500 placeholder-slate-450 text-slate-800 font-sans"
                  />
                </div>
              </div>

              {/* PANNEAU DROIT : CHARGEMENT DES PLANS ET BOUTON D'ACTION */}
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-6 space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <Image className="w-5 h-5 text-blue-500" />
                    <h3 className="font-sans font-bold text-slate-900 text-sm">Plans d'Architecture Obligatoires</h3>
                  </div>

                  {/* DROPZONE DE PLANS */}
                  <div 
                    className={`border-2 border-dashed rounded-xl p-6 text-center transition-all relative ${
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
                      accept="image/*,application/pdf"
                      onChange={handleBimPlanSelection}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="space-y-2 text-center pointer-events-none">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mx-auto ${isDraggingPlans ? "bg-amber-100 text-amber-700" : "bg-amber-50 text-amber-600"}`}>
                        <FileUp className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-700">Sélectionnez vos plans 2D</p>
                        <p className="text-[10px] text-slate-450 mt-1">Glissez-déposez un ou plusieurs fichiers de plans d'architecture (PDF, PNG, JPG)</p>
                      </div>
                    </div>
                  </div>

                  {/* LISTE DES PLANS CHARGÉS */}
                  {bimPlansFiles.length > 0 && (
                    <div className="space-y-2 text-left">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
                        Documents chargés ({bimPlansFiles.length}) :
                      </span>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-100 rounded-lg p-2 bg-slate-50/30">
                        {bimPlansFiles.map((pf, idx) => (
                          <div key={idx} className="flex items-center justify-between text-xs bg-white border border-slate-100 rounded-md p-2">
                            <div className="flex items-center gap-2 text-slate-700 font-sans font-medium truncate max-w-[80%]">
                              <FileText className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                              <span className="truncate">{pf.name}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setBimPlansFiles(prev => prev.filter((_, pidx) => pidx !== idx));
                              }}
                              className="text-slate-450 hover:text-rose-500 p-1 rounded hover:bg-slate-100 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {bimError && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl flex items-start gap-2 text-left">
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-500 mt-0.5" />
                      <span>{bimError}</span>
                    </div>
                  )}

                  {/* BOUTON DE RECHERCHE IA / ESTIMATION */}
                  <button
                    onClick={handleGenerateBimEstimate}
                    disabled={bimGenerating || bimPlansFiles.length === 0}
                    className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-200 disabled:text-slate-400 text-slate-950 font-bold rounded-xl text-xs flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer border border-amber-400/20"
                  >
                    {bimGenerating ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
                        <span>Simulation BIM en cours... Génération du jumeau numérique...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-slate-950" />
                        <span>Lancer la Simulation BIM & Générer le Devis</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : (
            // ÉTAPE 2 : PRÉVISUALISATION ET RACCORDEMENT BIM AU DQE CONTRACTUEL
            <div className="space-y-6 text-left">
              {/* ALERTE DESCRIPITF */}
              <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-sans font-bold text-slate-900">Jumeau Numérique Généré de Données</h4>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      Les calculs ci-après se fondent sur la combinaison de vos plans d'architecture du projet et vos variables structurelles saisies.
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => setBimStep("params_input")}
                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-all cursor-pointer border border-slate-150"
                  >
                    Ajuster les Paramètres
                  </button>
                  <button
                    onClick={handleApplyBimEstimate}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-all cursor-pointer border border-indigo-500"
                  >
                    <Plus className="w-4 h-4 text-indigo-250" /> Injecter au Devis Contractuel
                  </button>
                </div>
              </div>

              {/* GRILLE RECAP CARACTERISTIQUES */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white border border-slate-100 rounded-xl p-4 text-center space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Nombre d'étages</span>
                  <span className="text-xs font-sans font-extrabold text-slate-800 block">{bimNumFloors} Niveau(x)</span>
                </div>
                <div className="bg-white border border-slate-100 rounded-xl p-4 text-center space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Type de fondation</span>
                  <span className="text-xs font-sans font-extrabold text-slate-800 block">{bimFoundationType}</span>
                </div>
                <div className="bg-white border border-slate-100 rounded-xl p-4 text-center space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Hauteur de l'étage</span>
                  <span className="text-xs font-sans font-extrabold text-slate-800 block">{bimFloorHeight.toFixed(2)} mètres</span>
                </div>
                <div className="bg-white border border-slate-100 rounded-xl p-4 text-center space-y-1">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider block">Marché Ciblé</span>
                  <span className="text-xs font-sans font-extrabold text-slate-800 block">
                    {getCountryConfig().name} ({getCountryConfig().currency})
                  </span>
                </div>
              </div>

              {/* SECTION BIM : TABLEAU RÉCAPITULATIF DES MÉTRÉS PHYSIQUES */}
              <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-rose-50 pb-3">
                  <Layers className="w-5 h-5 text-indigo-500" />
                  <div>
                    <h3 className="font-sans font-bold text-slate-950 text-xs uppercase tracking-wider font-mono">1. Récapitulatif BIM des Métrés Physiques Déduits</h3>
                    <p className="text-[10.5px] text-slate-400">Rapprochement spatial et transposition logique à partir des dimensions d'élévation lues sur plan.</p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-slate-900 text-slate-200 uppercase tracking-widest font-mono text-[9px]">
                      <tr>
                        <th className="py-2.5 px-4 w-[25%] font-bold">Élément de calcul constructif</th>
                        <th className="py-2.5 px-4 w-[45%] font-bold">Mécanisme et Formule de calcul</th>
                        <th className="py-2.5 px-4 text-right font-bold w-[15%]">Quantité Physique</th>
                        <th className="py-2.5 px-4 text-center font-bold w-[15%]">Unité</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                      {bimResult?.bimElements && bimResult.bimElements.length > 0 ? (
                        bimResult.bimElements.map((el, bIndex) => (
                          <tr key={bIndex} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-bold text-slate-900">{el.element}</td>
                            <td className="py-3 px-4 text-slate-500 italic font-mono text-[10.5px]">{el.calculation}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatNumber(el.quantity, 2, 2)}</td>
                            <td className="py-3 px-4 text-center font-bold text-slate-500 font-mono">{el.unit}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 font-sans">
                            Aucune information de structure BIM n'a pu être extraite.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* SECTION ESTIMATE DQE : TABLEAU DU DEVIS CONCORDANT */}
              <div className="bg-white border border-slate-150 rounded-2xl shadow-sm overflow-hidden p-6 space-y-4">
                <div className="flex items-center gap-2 border-b border-rose-50 pb-3">
                  <CircleDollarSign className="w-5 h-5 text-emerald-500" />
                  <div>
                    <h3 className="font-sans font-bold text-slate-950 text-xs uppercase tracking-wider font-mono">2. Devis Quantitatif Estimatif Concordant</h3>
                    <p className="text-[10.5px] text-slate-400">Valorisation financière ajustée au barème BTP local et rattachée à votre nomenclature officielle.</p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-100 rounded-xl">
                  <table className="w-full border-collapse text-left text-xs">
                    <thead className="bg-slate-950 text-slate-200 uppercase tracking-widest font-mono text-[9px]">
                      <tr>
                        <th className="py-2.5 px-4 w-16 text-center font-bold">Code</th>
                        <th className="py-2.5 px-4 font-bold">Désignation technique de l'Article</th>
                        <th className="py-2.5 px-4 w-16 text-center font-bold">Unité</th>
                        <th className="py-2.5 px-4 text-right w-24 font-bold">Quantité</th>
                        <th className="py-2.5 px-4 text-right w-28 font-bold">P.U. HT</th>
                        <th className="py-2.5 px-4 text-right w-36 font-bold">Montant Total HT</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans text-slate-700">
                      {bimResult?.workItems && bimResult.workItems.length > 0 ? (
                        bimResult.workItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                            <td className="py-3 px-4 font-bold font-mono text-center text-slate-500">{item.code}</td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-900 leading-normal">{item.designation}</div>
                              <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 inline-block mt-1 font-mono">
                                {item.lot || "Sans Lot"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-center font-bold text-slate-500 font-mono">{item.unit}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-900">{formatNumber(item.quantity, 2, 2)}</td>
                            <td className="py-3 px-4 text-right font-mono text-slate-650">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">{formatCurrency(item.totalPrice)}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-slate-400 font-sans">
                            Aucun poste de devis concordant généré.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* RECAPITULATIF FINANCIER GLOBAL DU DEVIS */}
                {bimResult?.workItems && bimResult.workItems.length > 0 && (
                  <div className="border border-slate-100 bg-slate-50/40 rounded-xl p-4 mt-4 space-y-2.5 max-w-sm ml-auto text-xs font-sans">
                    <div className="flex justify-between text-slate-600 font-semibold font-sans">
                      <span>Total Marché Initial HT :</span>
                      <span className="font-mono text-slate-900 font-bold">
                        {formatCurrency(bimResult.workItems.reduce((acc, el) => acc + (Number(el.totalPrice) || 0), 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-500 font-sans">
                      <span>TVA ({project.tvaRate}% inclus par défaut) :</span>
                      <span className="font-mono">
                        {formatCurrency(
                          bimResult.workItems.reduce((acc, el) => acc + (Number(el.totalPrice) || 0), 0) * (Number(project.tvaRate) / 100)
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-200 pt-2 text-sm font-extrabold text-slate-900 font-sans">
                      <span>Montant Total Estimé TTC :</span>
                      <span className="font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                        {formatCurrency(
                          bimResult.workItems.reduce((acc, el) => acc + (Number(el.totalPrice) || 0), 0) * (1 + (Number(project.tvaRate) / 100))
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* RÈDACTION DU DESCRIPTIF TECHNIQUE FINAL */}
              {bimResult?.metadata?.description && (
                <div className="bg-amber-50/30 border border-amber-100 rounded-2xl p-6 space-y-3 text-left">
                  <span className="text-[10px] font-bold text-amber-800 font-mono uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-4 h-4 text-amber-500 shrink-0" /> Descriptif Technique Final Explicitement Rédigé
                  </span>
                  <div className="text-xs text-slate-700 leading-relaxed font-sans whitespace-pre-wrap">
                    {bimResult.metadata.description}
                  </div>
                </div>
              )}

              {/* CONTROLES SOCLES INFERIEURS */}
              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setBimStep("params_input")}
                  className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs shadow-sm transition-all cursor-pointer border border-slate-150"
                >
                  Retour / Ajuster les Variables
                </button>
                <button
                  type="button"
                  onClick={handleApplyBimEstimate}
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-md transition-all cursor-pointer border border-indigo-500"
                >
                  <Plus className="w-4 h-4 text-indigo-200" />
                  Fusionner et Appliquer au Projet acté
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* NEW SITUATION MODAL POPUP DIALOG */}
      {showNewSitModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 animate-fade-in no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scale-up">
            <div>
              <h3 className="text-base font-sans font-bold text-slate-900 flex items-center gap-2">
                <Calculator className="w-5 h-5 text-amber-500" />
                Initialiser une Nouvelle Situation
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                La situation reprendra par défaut les taux d'avancement certifiés de la dernière clôture.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  Numéro de Situation
                </label>
                <input
                  type="text"
                  disabled
                  value={`Situation N°${(project.situations || []).length + 1}`}
                  className="w-full bg-slate-55 bg-indigo-50/20 px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-800 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  Date de Clôture / Arrêté
                </label>
                <input
                  type="date"
                  value={newSitDate}
                  onChange={(e) => setNewSitDate(e.target.value)}
                  className="w-full bg-white px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-950 font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600">
                  Lot / Corps d'état concerné
                </label>
                <select
                  value={newSitLotFilter}
                  onChange={(e) => setNewSitLotFilter(e.target.value)}
                  className="w-full bg-white px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                >
                  <option value="All">✦ Tous les lots du marché ✦</option>
                  {Array.from(new Set(project.workItems.map((item) => getLotName(item))))
                    .sort()
                    .map((lot) => (
                      <option key={lot} value={lot}>
                        {lot}
                      </option>
                    ))}
                </select>
                <p className="text-[9px] text-slate-400 leading-normal">
                  La situation de travaux calculera et mémorisera les avancements et montants exclusivement pour le lot choisi (ou pour l'ensemble).
                </p>
              </div>

              <div className="space-y-1 block">
                <label className="text-xs font-semibold text-slate-600">
                  Notes / Remarques de Chantier (Optionnel)
                </label>
                <textarea
                  value={newSitComment}
                  onChange={(e) => setNewSitComment(e.target.value)}
                  placeholder="Ex: Avancement conforme au planning initial du terrassement."
                  rows={2}
                  className="w-full bg-white px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500"
                ></textarea>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-500 animate-pulse" />
                  Créer et extraire depuis un document (IA Optionnelle)
                </label>
                <select
                  value={selectedDocIdForNewSit}
                  onChange={(e) => setSelectedDocIdForNewSit(e.target.value)}
                  className="w-full bg-white px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 font-semibold"
                >
                  <option value="">-- Reprendre les taux contractuels précédents --</option>
                  {(project.documents || []).map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      {doc.type === "pv" ? "📄" : doc.type === "journal" ? "📓" : "📐"} {doc.name.substring(0, 38)}...
                    </option>
                  ))}
                </select>
                <p className="text-[9px] text-slate-400 leading-normal">
                  Le système créera la situation active puis extraira à la volée ses taux d'avancement cumulés à partir du document sélectionné.
                </p>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  setShowNewSitModal(false);
                  setNewSitComment("");
                }}
                className="px-4 py-2 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
                disabled={loading}
              >
                Annuler
              </button>
              <button
                onClick={handleCreateSituation}
                className="px-4 py-2 text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-md transition-colors cursor-pointer"
                disabled={loading}
              >
                Générer l'Etat
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL FOR DELETING SITUATION */}
      {showDeleteSituationConfirm && currentSituation && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 no-print">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden transform transition-all p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-650">
              <div className="p-2 bg-red-50 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h4 className="font-sans font-bold text-slate-900 text-base">Supprimer la situation ?</h4>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement la <strong>Situation N°{currentSituation.number}</strong> (clôturée le {new Date(currentSituation.date).toLocaleDateString("fr-FR")}) ? Les calculs de rentrées financières associés seront définitivement annulés.
            </p>
            <div className="flex justify-end gap-2.5 font-medium text-xs pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowDeleteSituationConfirm(false)}
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  setShowDeleteSituationConfirm(false);
                  await handleDeleteSituation();
                }}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors cursor-pointer font-semibold"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL FOR DELETING DOCUMENT (PV/JOURNAL/METRE/PLAN) */}
      {docToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 no-print">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden transform transition-all p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-650">
              <div className="p-2 bg-red-50 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h4 className="font-sans font-bold text-slate-900 text-base">Supprimer le document ?</h4>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement le document <strong>{docToDelete.name}</strong> du projet ? Cette opération est irréversible.
            </p>
            <div className="flex justify-end gap-2.5 font-medium text-xs pt-2 border-t border-slate-100">
              <button
                onClick={() => setDocToDelete(null)}
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer font-sans cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeleteDoc}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold font-sans cursor-pointer"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION MODAL FOR DELETING CHANTIER PHOTO */}
      {photoToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 no-print">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full border border-slate-100 overflow-hidden transform transition-all p-6 space-y-4">
            <div className="flex items-center gap-3 text-red-650">
              <div className="p-2 bg-red-50 rounded-full">
                <Trash2 className="w-6 h-6 text-red-600" />
              </div>
              <h4 className="font-sans font-bold text-slate-900 text-base">Supprimer la photo de chantier ?</h4>
            </div>
            <p className="text-slate-600 text-xs leading-relaxed">
              Êtes-vous sûr de vouloir supprimer définitivement cette photo de chantier de l'historique ? Cette opération est irréversible.
            </p>
            <div className="flex justify-end gap-2.5 font-medium text-xs pt-2 border-t border-slate-100">
              <button
                onClick={() => setPhotoToDelete(null)}
                className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors font-sans cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={confirmDeletePhoto}
                className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-semibold font-sans cursor-pointer"
              >
                Oui, Supprimer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DETECTED IFRAME PRINT OPTIMIZER DIALOG */}
      {showPrintIframeModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md flex items-center justify-center p-4 z-55 no-print animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full border border-slate-100 overflow-hidden transform transition-all p-6 space-y-5 animate-scale-up">
            {/* Header */}
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <Printer className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h4 className="font-sans font-bold text-slate-900 text-base">⚠️ Impression & Export PDF depuis un cadre</h4>
                <p className="text-[11px] text-slate-500">Optimiseur d'affichage de document de situation</p>
              </div>
            </div>

            {/* Content body */}
            <div className="space-y-4">
              <p className="text-slate-700 text-xs leading-relaxed">
                Vous êtes actuellement dans l'interface d'AI Studio, qui charge l'application à l'intérieur d'un <strong>cadre sécurisé (iframe)</strong>. Par sécurité, les navigateurs modernes bloquent le lancement de la boîte d'impression depuis ces fenêtres intégrées.
              </p>
              
              <div className="bg-slate-50 border border-slate-150 rounded-xl p-4 space-y-3">
                <h5 className="font-bold text-slate-800 text-xs">Pour imprimer ou exporter en PDF parfait immédiatement :</h5>
                <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-650 leading-relaxed font-sans">
                  <li>
                    Cliquez sur le bouton de partage ou <strong className="text-amber-700">"Ouvrir dans un nouvel onglet" ↗️</strong> tout en haut à droite pour lancer l'application en plein écran.
                  </li>
                  <li>
                    Une fois sur l'application en plein écran, cliquez à nouveau sur le bouton <strong className="text-slate-800">Imprimer / Exporter PDF</strong>.
                  </li>
                  <li>
                    Configurez l'imprimante système sur <strong className="text-emerald-700">"Enregistrer au format PDF"</strong> et décochez les en-têtes/pieds de page pour un résultat professionnel.
                  </li>
                </ol>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row justify-between gap-3 font-medium text-xs pt-3 border-t border-slate-100">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      window.print();
                    } catch (e) {
                      // fallback safety
                    }
                  }}
                  className="px-3 py-2 border border-slate-250 hover:bg-slate-50 text-slate-650 rounded-lg transition-colors cursor-pointer"
                  title="Tente de forcer l'imprimante dans l'iframe"
                >
                  Tenter quand même
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowPrintIframeModal(false);
                    exportSituationToExcel();
                  }}
                  className="px-3 py-2 border border-emerald-250 hover:bg-emerald-50 text-emerald-800 rounded-lg transition-colors cursor-pointer font-semibold"
                  title="Exporter les lignes de la situation en XLSX"
                >
                  Exporter Excel (.xlsx)
                </button>
              </div>

              <button
                type="button"
                onClick={() => setShowPrintIframeModal(false)}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg transition-colors cursor-pointer shadow-sm text-center"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* COUNTRY & MARKET SELECTOR MODAL */}
      {showCountryModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-55 no-print animate-fade-in">
          <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full border border-slate-100 overflow-hidden transform transition-all p-6 space-y-5">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
              <div className="p-2.5 bg-amber-50 rounded-xl">
                <Settings className="w-6 h-6 text-amber-600" />
              </div>
              <div>
                <h4 className="font-sans font-bold text-slate-900 text-base">Sélection du Pays & Norme de Marché</h4>
                <p className="text-[11px] text-slate-500">Adaptez les calculs, devises et taxes du chantier choisi</p>
              </div>
            </div>

            <p className="text-slate-650 text-xs leading-relaxed">
              Sélectionnez le pays pour ce chantier. Toutes les situations de travaux, les devises (<strong className="text-slate-900">DA, €, DH, DT, etc.</strong>) et les formats de nombres seront instantanément mis à jour pour respecter les usages bancaires de ce marché.
            </p>

            <div className="space-y-4">
              <label htmlFor="country-modal-select" className="block text-xs font-bold uppercase tracking-wider text-slate-500">
                Choisir le pays :
              </label>
              <div className="relative">
                <select
                  id="country-modal-select"
                  value={project.countryCode || 'DZ'}
                  onChange={(e) => handleSelectCountryAndMarket(e.target.value as any, true)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all cursor-pointer appearance-none"
                >
                  {Object.values(COUNTRIES).map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {c.name} ({c.currency})
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-500">
                  <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                    <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                  </svg>
                </div>
              </div>

              {/* Dynamic current parameters preview */}
              {(() => {
                const c = COUNTRIES[project.countryCode || 'DZ'] || COUNTRIES.DZ;
                return (
                  <div className="bg-amber-50/50 rounded-xl p-4 border border-amber-200/50 flex items-center gap-4 transition-all">
                    <span className="text-4xl shadow-xs">{c.flag}</span>
                    <div className="flex-1 min-w-0">
                      <div className="font-sans font-bold text-slate-900 text-sm flex items-center gap-2">
                        {c.name}
                        <span className="bg-amber-100 text-amber-800 text-[9px] uppercase tracking-wide font-extrabold px-1.5 py-0.5 rounded">
                          Sélectionné
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-slate-500 font-medium">
                        <span>
                          <strong>Devise :</strong> {c.currency}
                        </span>
                        <span>
                          <strong>TVA standard :</strong> {c.defaultTva}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            <div className="bg-slate-50/80 border border-slate-150 rounded-lg p-3 text-[10px] text-slate-500 leading-normal flex items-start gap-2">
              <span className="text-xs">💡</span>
              <div>
                Lorsque vous basquez de pays, le taux de TVA du projet est automatiquement ajusté à la valeur légale standard du pays sélectionné par mesure de commodité, mais reste personnalisable par la suite dans les configurations.
              </div>
            </div>

            <div className="flex justify-end gap-2.5 font-medium text-xs pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCountryModal(false)}
                className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg transition-colors cursor-pointer"
              >
                Fermer sans modifier
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DOCUMENT PREVIEW MODAL */}
      {selectedDocForPreview && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-4 z-55 no-print select-none">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full border border-slate-150 overflow-hidden transform transition-all flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-amber-500 shrink-0" />
                <div className="min-w-0">
                  <h4 className="font-bold text-sm truncate max-w-md">{selectedDocForPreview.name}</h4>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Type: <span className="uppercase text-amber-400">{selectedDocForPreview.type}</span> | Mis en ligne le: {selectedDocForPreview.date}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedDocForPreview(null)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                ✕
              </button>
            </div>

            {/* Content wrapper */}
            <div className="p-5 overflow-y-auto bg-slate-50 flex-1 flex flex-col items-center justify-center min-h-[300px]">
              {selectedDocForPreview.fileType?.startsWith("image/") ? (
                <div className="border border-slate-200 bg-white p-2 rounded-xl max-w-full shadow-xs">
                  <img
                    src={`data:${selectedDocForPreview.fileType};base64,${selectedDocForPreview.base64}`}
                    alt={selectedDocForPreview.name}
                    referrerPolicy="no-referrer"
                    className="max-h-[55vh] max-w-full rounded object-contain"
                  />
                </div>
              ) : selectedDocForPreview.fileName?.endsWith(".xlsx") || selectedDocForPreview.fileName?.endsWith(".xls") || selectedDocForPreview.fileName?.endsWith(".csv") || selectedDocForPreview.fileType?.includes("excel") || selectedDocForPreview.fileType?.includes("sheet") ? (
                <div className="text-center space-y-3 max-w-sm">
                  <div className="mx-auto w-16 h-16 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-bold text-[14px]">
                    EXCEL
                  </div>
                  <h5 className="font-bold text-slate-800 text-xs">{selectedDocForPreview.fileName}</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Ce document Excel est enregistré et pris en charge. Vous pouvez le télécharger immédiatement pour consultation locale ou lancer l'analyse intelligente pour en extraire les avancements de travaux.
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-3 max-w-sm">
                  <div className="mx-auto w-16 h-16 bg-rose-50 text-rose-500 rounded-2xl flex items-center justify-center font-bold text-xl">
                    PDF
                  </div>
                  <h5 className="font-bold text-slate-800 text-xs">{selectedDocForPreview.fileName}</h5>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Les documents PDF ne peuvent pas être intégrés directement dans l'aperçu de l'iframe, mais vous pouvez les télécharger immédiatement en local ou lancer leur extraction d'avancement par IA.
                  </p>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-150 flex flex-wrap items-center justify-between gap-3">
              <button
                onClick={() => {
                  setSelectedDocForPreview(null);
                  handleAISituationGeneration(selectedDocForPreview);
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Sparkles className="w-4 h-4" />
                Injecter les Avancements par IA ✨
              </button>

              <div className="flex items-center gap-2">
                <a
                  href={`data:${selectedDocForPreview.fileType || 'application/octet-stream'};base64,${selectedDocForPreview.base64}`}
                  download={selectedDocForPreview.fileName}
                  className="flex items-center gap-1 px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-slate-500" />
                  Télécharger
                </a>
                <button
                  onClick={() => setSelectedDocForPreview(null)}
                  className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* EXCEL MERGER CONFIGURATION MODAL DIALOG (COMBINATEUR DE MÉTRÉS & ATTACHEMENTS) */}
      {showExcelMerger && (
        <div className="fixed inset-0 bg-slate-900/70 z-50 flex items-center justify-center p-4 animate-fade-in no-print backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-150 overflow-hidden animate-scale-up">
            {/* Header */}
            <div className="p-5 bg-gradient-to-r from-emerald-600 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-xl">
                  <FileSpreadsheet className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-sans font-bold text-sm tracking-tight leading-none text-white">
                    Fusionneur Tableur de Métrés & Attachements
                  </h3>
                  <p className="text-[10px] text-emerald-100 mt-1 leading-normal">
                    Associez les colonnes de votre carnet de métrés ou attachements Excel (.xlsx) avec les postes de référence pour compléter la situation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowExcelMerger(false);
                  setExcelRows([]);
                  setExcelParseError(null);
                  setExcelMergeStats(null);
                }}
                className="text-white hover:text-slate-100 bg-white/10 hover:bg-white/20 p-1 px-2.5 rounded-lg font-bold"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Etape 1: Selection du fichier */}
              <div className="space-y-2 bg-slate-50 border border-slate-200 p-4 rounded-xl">
                <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                  Étape 1 : Charger l'Attachement de Travaux (.xlsx, .xls)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Option Un: Upload nouveau fichier */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 block">
                      Télécharger un nouveau document :
                    </label>
                    <input
                      type="file"
                      id="excel-merger-file"
                      accept=".xls,.xlsx,.csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      onChange={(e) => {
                        if (e.target.files && e.target.files[0]) {
                          parseSelectedExcelFile(e.target.files[0]);
                        }
                      }}
                      className="w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-[10px] file:font-semibold file:bg-emerald-50 file:text-emerald-700 hover:file:bg-emerald-100"
                    />
                  </div>

                  {/* Option Deux: Utiliser un fichier existant */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-slate-600 block">
                      Ou sélectionner parmi les documents du chantier :
                    </label>
                    <select
                      onChange={(e) => {
                        const doc = (project.documents || []).find(d => d.id === e.target.value);
                        if (doc) parseDocumentBase64Excel(doc.base64);
                      }}
                      className="w-full bg-white px-2.5 py-1.5 border border-slate-200 rounded-lg text-slate-700 text-[11px] focus:ring-1 focus:ring-emerald-500 font-medium"
                    >
                      <option value="">-- Choisir un fichier attaché --</option>
                      {(project.documents || [])
                        .filter(d => d.fileName?.endsWith(".xlsx") || d.fileName?.endsWith(".xls") || d.fileName?.endsWith(".csv") || d.type === "metre")
                        .map(doc => (
                          <option key={doc.id} value={doc.id}>
                            📊 {doc.name.substring(0, 30)}...
                          </option>
                        ))
                      }
                    </select>
                  </div>
                </div>

                {excelParseError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-100 rounded-lg text-rose-700 text-[10px] font-medium flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    {excelParseError}
                  </div>
                )}
              </div>

              {/* Etape 2: Configuration et mapping */}
              {excelRows.length > 0 && (
                <div className="space-y-4 border border-slate-150 p-4 rounded-xl">
                  <h4 className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">
                    Étape 2 : Mapper les colonnes avec le Marché de Référence
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Onglet select */}
                    {excelSheets.length > 1 && (
                      <div className="space-y-1">
                        <label className="text-[11px] font-semibold text-slate-600">Onglet actif du classeur</label>
                        <select
                          value={selectedExcelSheet}
                          onChange={(e) => {
                            setSelectedExcelSheet(e.target.value);
                          }}
                          className="w-full bg-white px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold"
                        >
                          {excelSheets.map(sh => (
                            <option key={sh} value={sh}>{sh}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Ligne des entetes */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600">Ligne d'en-tête (Drapeau Colonnes)</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="0"
                          max={Math.min(50, excelRows.length - 1)}
                          value={excelHeaderRowIdx}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 0;
                            setExcelHeaderRowIdx(val);
                            const headerRow = excelRows[val] || [];
                            setExcelHeaders(headerRow.map((h, i) => (h !== undefined ? String(h).trim() : `Colonne ${i + 1}`)));
                          }}
                          className="w-16 bg-white px-2.5 py-1.5 border border-slate-200 rounded-lg font-semibold text-center"
                        />
                        <span className="text-[10px] text-slate-400">Index de ligne (Débute à 0)</span>
                      </div>
                    </div>

                    {/* Associer par */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600">Recherche de poste par :</label>
                      <div className="flex gap-4 pt-1.5">
                        <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-705">
                          <input
                            type="radio"
                            name="excelMatchBy"
                            checked={excelMatchBy === "code"}
                            onChange={() => setExcelMatchBy("code")}
                            className="text-emerald-500 focus:ring-emerald-550 h-3 w-3"
                          />
                          Code de poste (ex: 1.1)
                        </label>
                        <label className="flex items-center gap-1 cursor-pointer font-bold text-slate-705">
                          <input
                            type="radio"
                            name="excelMatchBy"
                            checked={excelMatchBy === "designation"}
                            onChange={() => setExcelMatchBy("designation")}
                            className="text-emerald-500 focus:ring-emerald-550 h-3 w-3"
                          />
                          Désignation (Sémantique)
                        </label>
                      </div>
                    </div>

                    {/* Colonne Code */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600">
                        {excelMatchBy === "code" ? "Colonne Code du Poste dans Excel" : "Colonne Désignation dans Excel"}
                      </label>
                      <select
                        value={excelCodeColIdx}
                        onChange={(e) => setExcelCodeColIdx(parseInt(e.target.value))}
                        className="w-full bg-white px-2.5 py-1 border border-slate-200 rounded-lg text-[11px] font-medium"
                      >
                        {excelHeaders.map((h, idx) => (
                          <option key={idx} value={idx}>{h} (Col. {idx + 1})</option>
                        ))}
                      </select>
                    </div>

                    {/* Mode de fusion */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600">Format de la valeur importée</label>
                      <select
                        value={excelMergeMode}
                        onChange={(e) => setExcelMergeMode(e.target.value as any)}
                        className="w-full bg-white px-2.5 py-1 border border-slate-200 rounded-lg text-[11px] font-bold text-emerald-800"
                      >
                        <option value="qtyCumule">Quantité cumulée réalisée (valeur brute)</option>
                        <option value="qtyMois">Quantité de la période / du mois (valeur brute)</option>
                        <option value="progress">Taux d'avancement cumulé (%)</option>
                      </select>
                    </div>

                    {/* Colonne Valeur */}
                    <div className="space-y-1">
                      <label className="text-[11px] font-semibold text-slate-600">Colonne contenant l'avancement / quantité dans Excel</label>
                      <select
                        value={excelValColIdx}
                        onChange={(e) => setExcelValColIdx(parseInt(e.target.value))}
                        className="w-full bg-white px-2.5 py-1 border border-slate-200 rounded-lg text-[11px] font-medium"
                      >
                        {excelHeaders.map((h, idx) => (
                          <option key={idx} value={idx}>{h} (Col. {idx + 1})</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Excel Sheet Data Preview */}
                  <div className="space-y-1 text-[10px]">
                    <span className="font-semibold text-slate-500">Aperçu rapide des premières lignes décelées :</span>
                    <div className="overflow-x-auto max-h-32 border border-slate-100 rounded-lg">
                      <table className="w-full text-left divide-y divide-slate-100 bg-slate-55/50 text-[11px]">
                        <thead>
                          <tr className="bg-slate-100 text-slate-700 font-bold">
                            <th className="p-1.5 pl-2">Ligne</th>
                            <th className="p-1.5">Identifiant ({excelMatchBy === 'code' ? 'Code' : 'Désignation'})</th>
                            <th className="p-1.5">Valeur brute de métré</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 text-slate-600 font-mono">
                          {excelRows.slice(excelHeaderRowIdx + 1, excelHeaderRowIdx + 6).map((row, rIdx) => (
                            <tr key={rIdx} className="hover:bg-slate-100/30">
                              <td className="p-1.5 pl-2 text-slate-400">S{excelHeaderRowIdx + 1 + rIdx}</td>
                              <td className="p-1.5 font-semibold text-slate-800">{String(row[excelCodeColIdx] || "")}</td>
                              <td className="p-1.5 text-emerald-800 font-bold">{String(row[excelValColIdx] ?? "vide")}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Status merge report details */}
              {excelMergeStats && (
                <div className="p-4 bg-emerald-50 border border-emerald-150 rounded-xl space-y-1">
                  <h5 className="font-bold text-emerald-900 text-xs flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Fusion de métrés terminée !
                  </h5>
                  <p className="text-[11px] text-emerald-700 font-semibold">
                    Postes du devis appariés et intégrés : <strong className="font-bold text-emerald-950">{excelMergeStats.matched}</strong> sur {excelMergeStats.total}.
                  </p>
                  <p className="text-[10px] text-emerald-650 leading-relaxed font-sans mt-0.5">
                    Les calculs financiers de la période (Quantité Précédente, Quantité du Mois, Cumul & Écarts sur prix) ont été corrigés en conservant la structure officielle de vos lots. Cliquez sur "Enregistrer" sur la grille d'édition pour fixer les changements.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-150 flex justify-between items-center text-xs">
              <span className="text-[10px] font-sans font-medium text-slate-400">
                L'import s'effectue hors-ligne de manière déterministe
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setShowExcelMerger(false);
                    setExcelRows([]);
                    setExcelParseError(null);
                    setExcelMergeStats(null);
                  }}
                  className="px-3.5 py-1.5 font-semibold text-slate-600 border border-slate-250 bg-white rounded-lg hover:bg-slate-50 cursor-pointer"
                >
                  Fermer
                </button>
                {excelRows.length > 0 && (
                  <button
                    onClick={runExcelMerge}
                    className="flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg shadow-sm cursor-pointer transition-colors"
                  >
                    Appliquer le Métré & Fusionner
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* REQUIREMENT 3: IMPORTER / AJOUTER UN LOT MODAL POPUP */}
      {showAddLotModal && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-100 space-y-5 animate-scale-up max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="text-base font-sans font-bold text-indigo-900 flex items-center gap-2">
                  <Plus className="w-5 h-5 text-indigo-600" />
                  Importer / Créer un nouveau Lot contractuel
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Ajoutez un nouveau Lot (groupe de travaux) ainsi que ses postes de prix sous format Excel ou PDF.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowAddLotModal(false);
                  setAddLotName("");
                  setAddLotFile(null);
                  setAddLotParsedItems([]);
                  setAddLotError(null);
                  setAddLotSuccess(null);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {/* Lot Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Nom du nouveau Lot *
                </label>
                <input
                  type="text"
                  value={addLotName}
                  onChange={(e) => setAddLotName(e.target.value)}
                  placeholder="Ex: Lot 03 - Plomberie et Sanitaires, Lot Electricité, etc."
                  className="w-full bg-white px-3 py-2 text-xs border border-slate-200 rounded-lg text-slate-900 font-semibold focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              {/* Source Type selection */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Méthode d'importation
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setAddLotFileType("excel")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                      addLotFileType === "excel"
                        ? "border-indigo-500 bg-indigo-50/20 text-indigo-900 font-extrabold"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <FileSpreadsheet className={`w-6 h-6 ${addLotFileType === "excel" ? "text-indigo-600" : "text-slate-400"}`} />
                    <div className="text-xs font-bold">Tableur Excel (.xlsx, .xls)</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Analyse déterministe immédiate de vos colonnes de devis</div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAddLotFileType("pdf_ia")}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-center cursor-pointer ${
                      addLotFileType === "pdf_ia"
                        ? "border-indigo-500 bg-indigo-50/20 text-indigo-900 font-extrabold"
                        : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    <Sparkles className={`w-6 h-6 ${addLotFileType === "pdf_ia" ? "text-indigo-600 animate-pulse" : "text-slate-400"}`} />
                    <div className="text-xs font-bold">Extraction par IA (PDF, Photo)</div>
                    <div className="text-[10px] text-slate-400 leading-tight">Analyse automatique intelligente via Gemini Pro OCR</div>
                  </button>
                </div>
              </div>

              {/* File input */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 block">
                  Sélectionnez le document *
                </label>
                <div className="relative border-2 border-dashed border-slate-250 hover:border-indigo-400 rounded-xl p-6 transition-all text-center flex flex-col items-center justify-center gap-1 bg-slate-50/45">
                  <input
                    type="file"
                    accept={addLotFileType === "excel" ? ".xlsx, .xls, .csv" : "application/pdf, image/*"}
                    onChange={(e) => {
                      if (e.target.files && e.target.files.length > 0) {
                        setAddLotFile(e.target.files[0]);
                        setAddLotError(null);
                        setAddLotSuccess(null);
                        setAddLotParsedItems([]);
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                  <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100">
                    <Plus className="w-5 h-5 text-indigo-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-800 mt-1">
                    {addLotFile ? addLotFile.name : "Cliquez ou glissez-déposez votre fichier ici"}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {addLotFileType === "excel" ? "XLSX, XLS ou CSV jusqu'à 15 Mo" : "PDF ou Image (JPEG, PNG) jusqu'à 20 Mo"}
                  </span>
                </div>
              </div>

              {/* Action error/success state alerts */}
              {addLotError && (
                <div className="p-3.5 bg-red-50 border border-red-150 rounded-lg text-xs font-semibold text-red-800 leading-normal">
                  ⚠️ {addLotError}
                </div>
              )}

              {addLotSuccess && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-150 rounded-lg text-xs font-semibold text-emerald-800 leading-normal">
                  {addLotSuccess}
                </div>
              )}

              {/* Action Analyze trigger button */}
              {!addLotSuccess && !addLotLoading && (
                <button
                  type="button"
                  onClick={handleUploadAndParseLot}
                  disabled={!addLotFile || !addLotName.trim()}
                  className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow-md cursor-pointer flex items-center justify-center gap-2"
                >
                  {addLotFileType === "excel" ? "Analyser le tableau Excel" : "Lancer l'extraction IA (Gemini)"}
                </button>
              )}

              {addLotLoading && (
                <div className="py-6 flex flex-col items-center justify-center gap-2">
                  <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  <span className="text-xs text-slate-500 font-sans font-semibold animate-pulse">
                    Extraction des données contractuelles en cours... Veuillez patienter.
                  </span>
                </div>
              )}

              {/* Parsed items preview table */}
              {addLotParsedItems.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  <span className="text-xs font-bold text-slate-700 uppercase block tracking-wider font-sans">
                    Aperçu des postes du Lot avant intégration :
                  </span>
                  <div className="overflow-x-auto border border-slate-150 rounded-xl max-h-52">
                    <table className="w-full border-collapse text-left text-[11px] font-sans">
                      <thead className="bg-slate-900 text-slate-200 uppercase tracking-wider font-mono text-[9px] sticky top-0">
                        <tr>
                          <th className="py-2 px-3 text-center">Code</th>
                          <th className="py-2 px-3">Libellé / Désignation</th>
                          <th className="py-2 px-3 text-center">Unité</th>
                          <th className="py-3 px-3 text-right">Quantité</th>
                          <th className="py-3 px-3 text-right">P.U. (HT)</th>
                          <th className="py-3 px-3 text-right">Total (HT)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-slate-800">
                        {addLotParsedItems.map((item, index) => (
                          <tr key={index} className="hover:bg-slate-50 transition-colors">
                            <td className="py-2.5 px-3 font-mono font-bold text-center text-slate-600">{item.code}</td>
                            <td className="py-2.5 px-3 font-medium truncate max-w-xs">{item.designation}</td>
                            <td className="py-2.5 px-3 text-center font-mono text-slate-500 bg-slate-50/30">{item.unit}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-semibold">{formatQty(item.quantity)}</td>
                            <td className="py-2.5 px-3 text-right font-mono">{formatCurrency(item.unitPrice)}</td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 bg-slate-50/20">{formatCurrency(item.quantity * item.unitPrice)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-205 rounded-xl flex items-center justify-between text-xs mt-2 select-none no-print">
                    <span className="font-medium text-slate-650">
                      Montant Global Estimé du Lot (HT) :
                    </span>
                    <strong className="font-mono font-extrabold text-indigo-950 text-sm">
                      {formatCurrency(addLotParsedItems.reduce((acc, it) => acc + (it.quantity * it.unitPrice), 0))}
                    </strong>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setShowAddLotModal(false);
                  setAddLotName("");
                  setAddLotFile(null);
                  setAddLotParsedItems([]);
                  setAddLotError(null);
                  setAddLotSuccess(null);
                }}
                className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-xs font-semibold"
                disabled={addLotLoading}
              >
                Annuler
              </button>
              {addLotParsedItems.length > 0 && (
                <button
                  type="button"
                  onClick={handleSaveImportedLot}
                  className="px-4 py-2 bg-indigo-605 hover:bg-indigo-700 bg-indigo-600 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer text-xs"
                  disabled={addLotLoading}
                >
                  Confirmer et Enregistrer le Lot
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
