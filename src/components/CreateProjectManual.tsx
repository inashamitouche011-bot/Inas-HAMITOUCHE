import React, { useState } from "react";
import { api } from "../lib/api";
import { WorkItem, COUNTRIES } from "../types";
import { AlertCircle, Plus, Trash2, HardHat, CircleDollarSign, Loader2 } from "lucide-react";

interface CreateProjectManualProps {
  onProjectCreated: () => void;
  onCancel: () => void;
  countryCode: 'DZ' | 'FR' | 'MA' | 'TN' | 'CI' | 'SN' | 'EG' | 'LY' | 'MR' | 'ES' | 'IT' | 'BE' | 'DE' | 'CH' | 'US';
}

export default function CreateProjectManual({ onProjectCreated, onCancel, countryCode }: CreateProjectManualProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [contractor, setContractor] = useState("");
  const [contractorEmail, setContractorEmail] = useState("");
  const [supervisor, setSupervisor] = useState("");
  const [supervisorEmail, setSupervisorEmail] = useState("");
  const [location, setLocation] = useState("");
  const [tvaRate, setTvaRate] = useState(() => COUNTRIES[countryCode]?.defaultTva ?? 20);
  const [retentionRate, setRetentionRate] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Rows state for initial work items
  const [items, setItems] = useState<Array<{
    code: string;
    designation: string;
    unit: string;
    quantity: number;
    unitPrice: number;
    lot: string;
  }>>([
    { code: "1.1", designation: "Gros œuvre - Fondation", unit: "m³", quantity: 50, unitPrice: 120, lot: "Lot 1 : Terrassement & Gros Œuvres" },
    { code: "1.2", designation: "Élévation béton armé", unit: "m²", quantity: 200, unitPrice: 85, lot: "Lot 1 : Terrassement & Gros Œuvres" },
  ]);

  const handleAddItemRow = () => {
    const lastLot = items.length > 0 ? items[items.length - 1].lot : "Lot 1 : Terrassement & Gros Œuvres";
    setItems([
      ...items,
      { code: `${items.length + 1}`, designation: "Poste de travaux", unit: "u", quantity: 1, unitPrice: 0, lot: lastLot },
    ]);
  };

  const handleRemoveItemRow = (index: number) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    const updated = [...items];
    let typedValue = value;

    if (field === "quantity" || field === "unitPrice") {
      typedValue = parseFloat(value) || 0;
    }

    updated[index] = {
      ...updated[index],
      [field]: typedValue,
    };
    setItems(updated);
  };

  const handleSaveProject = async () => {
    if (!name.trim()) {
      setError("Le nom de projet est requis.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Map rows with unique random IDs
      const finalItems: WorkItem[] = items.map((row) => {
        const total = Number((row.quantity * row.unitPrice).toFixed(2));
        return {
          id: "item_" + Math.random().toString(36).substring(2, 9),
          code: row.code,
          designation: row.designation,
          unit: row.unit,
          quantity: row.quantity,
          unitPrice: row.unitPrice,
          totalPrice: total,
          lot: row.lot,
        };
      });

      await api.projects.create({
        name,
        description: description || "Saisi manuellement.",
        clientName,
        clientEmail,
        contractor,
        contractorEmail,
        supervisor,
        supervisorEmail,
        location,
        tvaRate,
        retentionRate,
        countryCode,
        workItems: finalItems,
      });

      onProjectCreated();
    } catch (err: any) {
      setError(err.message || "Impossible d'enregistrer le projet");
    } finally {
      setLoading(false);
    }
  };

  const totalMarketHT = items.reduce((acc, curr) => acc + (curr.quantity * curr.unitPrice), 0);

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-xl overflow-hidden p-6 sm:p-8 max-w-4xl mx-auto my-6">
      <div className="border-b border-slate-100 pb-5 mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-sans font-bold text-slate-900 flex items-center gap-2">
            <HardHat className="w-5 h-5 text-amber-500" />
            Création Manuelle d'un Projet de Chantier
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Déclarez votre projet, les parties de contrôle, et saisissez la liste initiale des ouvrages à bâtir.
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-xs border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
        >
          Annuler
        </button>
      </div>

      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-2.5 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 text-red-500" />
          <div>{error}</div>
        </div>
      )}

      <div className="space-y-6">
        {/* Core Metadata Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-650 uppercase tracking-wider">
              Nom de l'Ouvrage / Projet *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Villa Moderne - Lot Gros Œuvre"
              className="w-full bg-slate-50/50 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-650 uppercase tracking-wider">
              Maître d'Ouvrage (Client)
            </label>
            <input
              type="text"
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder="SCI Riviera"
              className="w-full bg-slate-50/50 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-650 uppercase tracking-wider">
              E-mail du Client
            </label>
            <input
              type="email"
              value={clientEmail}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="client@client.com"
              className="w-full bg-slate-50/50 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-650 uppercase tracking-wider">
              Cabinet d'Architecture / Maître d'Œuvre (MŒ)
            </label>
            <input
              type="text"
              value={supervisor}
              onChange={(e) => setSupervisor(e.target.value)}
              placeholder="Cabinet Bernard & Associés"
              className="w-full bg-slate-50/50 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-650 uppercase tracking-wider">
              E-mail du Maître d'Œuvre (MŒ)
            </label>
            <input
              type="email"
              value={supervisorEmail}
              onChange={(e) => setSupervisorEmail(e.target.value)}
              placeholder="moe@architecture.com"
              className="w-full bg-slate-50/50 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-650 uppercase tracking-wider">
              Entreprise générale titulaire
            </label>
            <input
              type="text"
              value={contractor}
              onChange={(e) => setContractor(e.target.value)}
              placeholder="BatiConstruction France"
              className="w-full bg-slate-50/50 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-650 uppercase tracking-wider">
              E-mail de l'Entreprise générale
            </label>
            <input
              type="email"
              value={contractorEmail}
              onChange={(e) => setContractorEmail(e.target.value)}
              placeholder="contact@baticonstruction.com"
              className="w-full bg-slate-50/50 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-semibold text-slate-650 uppercase tracking-wider">
              Emplacement / Commune du Chantier
            </label>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Nice, France"
              className="w-full bg-slate-50/50 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
            />
          </div>

          {/* Guarantee rates configurations */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-650 uppercase tracking-wider">
                Retenue Garantie (%)
              </label>
              <input
                type="number"
                value={retentionRate}
                onChange={(e) => setRetentionRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50/50 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-slate-650 uppercase tracking-wider">
                Taux TVA (%)
              </label>
              <input
                type="number"
                value={tvaRate}
                onChange={(e) => setTvaRate(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-50/50 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="space-y-1 sm:col-span-2">
            <label className="text-xs font-semibold text-slate-650 uppercase tracking-wider">
              Description de la nature des travaux
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Construction d'un immeuble R+2 passif..."
              className="w-full bg-slate-50/50 px-3 py-2 text-sm border border-slate-200 rounded-lg text-slate-900 focus:outline-none focus:ring-1 focus:ring-amber-500 focus:bg-white"
            />
          </div>
        </div>

        {/* Quantitaf items entry lines */}
        <div className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-705">
              Établissement du Devis Descriptif Initial
            </h3>
            <button
              onClick={handleAddItemRow}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Référence de poste
            </button>
          </div>

          <div className="overflow-x-auto border border-slate-100 rounded-xl">
            <table className="w-full border-collapse text-left text-xs bg-white">
              <thead className="bg-slate-900 text-slate-100 uppercase tracking-wider font-mono text-[9px]">
                <tr>
                  <th className="py-2.5 px-3 w-16 text-center">Code</th>
                  <th className="py-2.5 px-3 w-48">Lot de travaux</th>
                  <th className="py-2.5 px-3">Désignation claire du Poste</th>
                  <th className="py-2.5 px-3 w-16 text-center">Unité</th>
                  <th className="py-2.5 px-3 w-24 text-right">Quantité</th>
                  <th className="py-2.5 px-3 w-32 text-right">P.U. HT (DA)</th>
                  <th className="py-2.5 px-3 w-36 text-right font-semibold text-amber-400">Total HT</th>
                  <th className="py-2.5 px-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((row, idx) => {
                  const lineTotal = Number((row.quantity * row.unitPrice).toFixed(2));
                  return (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={row.code}
                          onChange={(e) => handleRowChange(idx, "code", e.target.value)}
                          placeholder="1.1"
                          className="w-full px-1.5 py-1 text-center bg-slate-50 border border-slate-150 rounded text-xs focus:bg-white focus:border-amber-400 focus:outline-none font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={row.lot}
                          onChange={(e) => handleRowChange(idx, "lot", e.target.value)}
                          placeholder="Ex: Lot 1 : Terrassement"
                          className="w-full px-1.5 py-1 bg-slate-50 border border-slate-150 rounded text-xs focus:bg-white focus:border-amber-400 focus:outline-none font-semibold text-slate-800"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={row.designation}
                          onChange={(e) => handleRowChange(idx, "designation", e.target.value)}
                          placeholder="Fouille en pleine masse"
                          className="w-full px-1.5 py-1 bg-slate-50 border border-slate-150 rounded text-xs focus:bg-white focus:border-amber-400 focus:outline-none"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="text"
                          value={row.unit}
                          onChange={(e) => handleRowChange(idx, "unit", e.target.value)}
                          placeholder="m³"
                          className="w-full px-1.5 py-1 text-center bg-slate-50 border border-slate-150 rounded text-xs focus:bg-white focus:border-amber-400 focus:outline-none font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          value={row.quantity}
                          onChange={(e) => handleRowChange(idx, "quantity", e.target.value)}
                          className="w-full px-1.5 py-1 text-right bg-slate-50 border border-slate-150 rounded text-xs focus:bg-white focus:border-amber-400 focus:outline-none font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-2">
                        <input
                          type="number"
                          value={row.unitPrice}
                          onChange={(e) => handleRowChange(idx, "unitPrice", e.target.value)}
                          className="w-full px-1.5 py-1 text-right bg-slate-50 border border-slate-150 rounded text-xs focus:bg-white focus:border-amber-400 focus:outline-none font-mono"
                        />
                      </td>
                      <td className="py-2.5 px-4 text-right font-semibold font-mono text-slate-900 bg-slate-50/30">
                        {lineTotal.toLocaleString("fr-DZ", { minimumFractionDigits: 2 })} DA
                      </td>
                      <td className="py-2.5 px-2 text-center">
                        <button
                          onClick={() => handleRemoveItemRow(idx)}
                          className="text-slate-400 hover:text-red-500 hover:bg-slate-100 p-1 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Global manual creation valuation footer */}
        <div className="flex flex-col items-end gap-1.5 pt-5 border-t border-slate-100">
          <div className="flex items-center gap-1 text-xs text-slate-500 font-mono">
            <CircleDollarSign className="w-3.5 h-3.5" /> Budget Prévisionnel Global (HT) :
          </div>
          <span className="font-mono font-bold text-xl text-slate-950">
            {totalMarketHT.toLocaleString("fr-DZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA
          </span>
        </div>

        <div className="flex justify-end gap-2.5 pt-4">
          <button
            onClick={onCancel}
            className="px-5 py-2 text-sm border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 transition-colors cursor-pointer"
            disabled={loading}
          >
            Annuler
          </button>
          <button
            onClick={handleSaveProject}
            className="px-6 py-2 text-sm font-semibold bg-amber-500 hover:bg-amber-600 text-slate-950 rounded-lg shadow-md transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Envoi sur Supabase...</span>
              </>
            ) : (
              "Enregistrer le Projet"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
