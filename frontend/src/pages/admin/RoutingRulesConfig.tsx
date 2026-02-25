import { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  AlertCircle,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { Layout } from '@/components/common';
import { Input } from '@/components/common';
import { Modal } from '@/components/common';
import { apiClient } from '@/services/api'
import { departmentService } from '@/services/departmentService'
import { documentTypeService } from '@/services/documentTypeService'
import { branchService } from '@/services/branchService'

interface RoutingRule {
  id: number;
  name: string;
  description: string;
  conditions: Record<string, any>;
  destination_folder: number;
  destination_folder_name: string;
  priority: number;
  is_active: boolean;
  times_applied: number;
  last_applied?: string;
}

interface Folder {
  id: number;
  name: string;
  parent: number | null;
  description: string;
  full_path: string;
  level: number;
  is_active: boolean;
  children?: Folder[];
}

// Constantes chargées dynamiquement depuis l'API - voir le useEffect

// Composant sélecteur de dossiers avec arborescence
interface FolderSelectorProps {
  folders: Folder[];
  value: string;
  onChange: (folderId: string) => void;
}

function FolderSelector({ folders, value, onChange }: FolderSelectorProps) {
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [selectedPath, setSelectedPath] = useState('');

  const toggleExpand = (folderId: number) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(folderId)) {
      newExpanded.delete(folderId);
    } else {
      newExpanded.add(folderId);
    }
    setExpanded(newExpanded);
  };

  const handleSelect = (folder: Folder) => {
    onChange(folder.id.toString());
    setSelectedPath(folder.full_path);
  };

  const renderFolder = (folder: Folder, depth: number = 0) => {
    const hasChildren = folder.children && folder.children.length > 0;
    const isExpanded = expanded.has(folder.id);
    const isSelected = value === folder.id.toString();

    return (
      <div key={folder.id}>
        <div
          className={`flex items-center gap-2 px-3 py-2 cursor-pointer rounded transition ${
            isSelected
              ? 'bg-red-50 border-l-4 border-red-600'
              : 'hover:bg-gray-100'
          }`}
          style={{ paddingLeft: `${depth * 20 + 12}px` }}
        >
          {hasChildren && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleExpand(folder.id);
              }}
              className="p-0 flex items-center"
            >
              {isExpanded ? (
                <ChevronDown size={16} className="text-red-600" />
              ) : (
                <ChevronRight size={16} className="text-gray-400" />
              )}
            </button>
          )}
          {!hasChildren && <div className="w-4" />}
          
          <span
            onClick={() => handleSelect(folder)}
            className="flex-1 text-sm"
          >
            📁 {folder.name}
          </span>
        </div>

        {isExpanded && hasChildren && folder.children && (
          <div>
            {folder.children.map((child) =>
              renderFolder(child, depth + 1)
            )}
          </div>
        )}
      </div>
    );
  };

  // Trouver les dossiers racine
  const rootFolders = folders.filter(f => !f.parent);

  return (
    <div className="border border-gray-300 rounded-xl p-4 bg-white max-h-96 overflow-y-auto">
      {rootFolders.length === 0 ? (
        <p className="text-gray-500 text-sm">Aucun dossier disponible</p>
      ) : (
        <div>
          {rootFolders.map((folder) => renderFolder(folder))}
        </div>
      )}
      {value && selectedPath && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-600">Sélectionné:</p>
          <p className="text-sm font-semibold text-red-600">{selectedPath}</p>
        </div>
      )}
    </div>
  );
}

export function RoutingRulesManager() {
  const [activeTab, setActiveTab] = useState<'rules' | 'types'>('rules');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Données chargées depuis l'API
  const [branches, setBranches] = useState<Array<{id: string, name: string, code: string}>>([]);
  const [allDepartments, setAllDepartments] = useState<any[]>([]);
  const [departments, setDepartments] = useState<Array<{value: string, label: string}>>([]);
  const [allDocumentTypes, setAllDocumentTypes] = useState<Array<{value: string, label: string}>>([]);

  // Sélections
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [selectedDept, setSelectedDept] = useState<string>('');

  // Routing Rules
  const [routingRules, setRoutingRules] = useState<RoutingRule[]>([]);
  const [activeRulesOnly, setActiveRulesOnly] = useState(false);

  // Folders
  const [folders, setFolders] = useState<Folder[]>([]);

  // Modals
  const [showRuleModal, setShowRuleModal] = useState(false);
  const [showTypeModal, setShowTypeModal] = useState(false);

  // Forms
  const [ruleForm, setRuleForm] = useState({
    branch: '',  // ✅ Ajouter branche
    name: '',
    description: '',
    priority: 50,
    destination_folder: '',
    department: '',
    document_type: '',
  });

  const [typeForm, setTypeForm] = useState({
    department: '',
    document_type: '',
    description: '',
    is_available: true,
  });

  // Mettre à jour typeForm.department quand selectedDept change
  useEffect(() => {
    setTypeForm(prev => ({
      ...prev,
      department: selectedDept
    }));
  }, [selectedDept]);

  // Charger les données initiales au montage du composant
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Charger les filiales
        const branchesData = await branchService.getBranches();
        const branchesFormatted = branchesData.map((b: any) => ({
          id: String(b.id || b.value),
          name: b.name,
          code: b.code || ''
        }));
        setBranches(branchesFormatted);
        
        // Sélectionner la première filiale par défaut
        if (branchesFormatted.length > 0) {
          const firstBranchId = String(branchesFormatted[0].id);
          setSelectedBranch(firstBranchId);
        }

        // Charger les départements bruts (non filtrés)
        const deptsData = await departmentService.getDepartments();
        setAllDepartments(deptsData);

        // Charger tous les types de documents depuis l'API
        const types = await documentTypeService.getDocumentTypes();
        setAllDocumentTypes(types.map(t => ({value: String(t.id), label: t.display_name})));

        // Charger les dossiers
        await fetchFolders();

        // Charger les règles initiales
        await fetchRules();

        console.log(`✅ Données initiales chargées: ${branchesFormatted.length} filiales, ${deptsData.length} depts, ${types.length} types`);
      } catch (err) {
        console.error('❌ Erreur lors du chargement des données initiales:', err);
        setError('Erreur lors du chargement des données');
      }
    };

    loadInitialData();
  }, []);

  useEffect(() => {
    fetchFolders();
    if (activeTab === 'rules') {
      fetchRules();
    } else {
      fetchDocumentTypes();
    }
  }, [activeTab, selectedDept]);

  // Filtrer les départements quand la filiale change
  useEffect(() => {
    if (selectedBranch && allDepartments.length > 0) {
      const filtered = allDepartments.filter((dept: any) => {
        const deptBranchId = String(dept.branch || dept.branch_id || '');
        return deptBranchId === selectedBranch;
      });
      
      const deptLabels = filtered.map((dept: any) => ({
        value: dept.name || dept.value,
        label: `${dept.name} (${dept.code})`
      }));
      
      setDepartments(deptLabels);
      
      // Sélectionner le premier département de la nouvelle filiale
      if (deptLabels.length > 0 && !selectedDept) {
        setSelectedDept(deptLabels[0].value);
      }
    }
  }, [selectedBranch, allDepartments]);

  const fetchDocumentTypes = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get(
        `/routing-rules/document-types/by_department/?department=${selectedDept}`
      );
      const data = response.data;
      setAllDocumentTypes(Array.isArray(data.document_types) ? data.document_types.map((t: any) => ({value: String(t.id), label: t.display_name})) : []);
      setError('');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors du chargement des types');
    } finally {
      setLoading(false);
    }
  };

  const fetchFolders = async () => {
    try {
      // Récupérer l'arborescence complète
      const response = await apiClient.get('/folders/folders/tree/');
      const data = response.data;
      setFolders(data || []);
    } catch (err: any) {
      // Silently fail for folders, it's optional
      setFolders([]);
    }
  };

  const fetchRules = async () => {
    setLoading(true);
    try {
      const endpoint = activeRulesOnly
        ? '/routing-rules/active/'
        : '/routing-rules/';
      console.log('[RoutingRulesManager] Fetching rules from:', endpoint);
      const response = await apiClient.get(endpoint);
      console.log('[RoutingRulesManager] Raw API response:', response.data);
      const data = response.data;
      const rules = Array.isArray(data) ? data : (data.results || []);
      console.log('[RoutingRulesManager] Parsed rules:', rules);
      console.log('[RoutingRulesManager] Rules count:', rules.length);
      if (rules.length > 0) {
        console.log('[RoutingRulesManager] First rule:', rules[0]);
      }
      setRoutingRules(rules);
      setError('');
    } catch (err: any) {
      console.error('Error fetching rules:', err);
      setError(err.response?.data?.detail || 'Erreur lors du chargement des règles');
    } finally {
      setLoading(false);
    }
  };

  const handleAddRule = async () => {
    if (!ruleForm.name || !ruleForm.destination_folder || !ruleForm.department || !ruleForm.document_type) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/routing-rules/', {
        name: ruleForm.name,
        description: ruleForm.description,
        priority: ruleForm.priority,
        destination_folder: parseInt(ruleForm.destination_folder),
        conditions: {
          department: { value: ruleForm.department, operator: 'equals' },
          document_type: { value: ruleForm.document_type, operator: 'equals' },
        },
      });

      setSuccess('Règle créée avec succès!');
      setShowRuleModal(false);
      setRuleForm({
        branch: '',
        name: '',
        description: '',
        priority: 50,
        destination_folder: '',
        department: '',
        document_type: '',
      });
      setError('');
      fetchRules();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la création de la règle');
    } finally {
      setLoading(false);
    }
  };

  const handleAddType = async () => {
    if (!typeForm.document_type) {
      setError('Veuillez sélectionner un type de document');
      return;
    }

    setLoading(true);
    try {
      await apiClient.post('/routing-rules/document-types/', typeForm);

      setSuccess('Type créé avec succès!');
      setShowTypeModal(false);
      setTypeForm({
        department: selectedDept,
        document_type: '',
        description: '',
        is_available: true,
      });
      setError('');
      fetchDocumentTypes();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la création du type');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleRule = async (id: number, isActive: boolean) => {
    try {
      const endpoint = isActive ? 'deactivate' : 'activate';
      await apiClient.post(`/routing-rules/${id}/${endpoint}/`);

      setSuccess(`Règle ${isActive ? 'désactivée' : 'activée'} avec succès!`);
      setError('');
      fetchRules();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la modification');
    }
  };

  const handleDeleteRule = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette règle?')) return;

    try {
      await apiClient.delete(`/routing-rules/${id}/`);

      setSuccess('Règle supprimée avec succès!');
      setError('');
      fetchRules();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  const handleDeleteType = async (id: number) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce type?')) return;

    try {
      await apiClient.delete(`/routing-rules/document-types/${id}/`);

      setSuccess('Type supprimé avec succès!');
      setError('');
      fetchDocumentTypes();
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de la suppression');
    }
  };

  // Helper function pour accéder en toute sécurité aux conditions
  const getConditionValue = (rule: RoutingRule, field: string): string => {
    try {
      if (!rule) {
        console.warn('getConditionValue: rule is null/undefined');
        return 'N/A';
      }
      if (!rule.conditions) {
        console.warn('getConditionValue: rule.conditions is null/undefined for rule:', rule.name);
        return 'N/A';
      }
      const value = rule.conditions?.[field]?.value || 'N/A';
      return value;
    } catch (e) {
      console.error('Error accessing condition for field', field, ':', e);
      return 'N/A';
    }
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-red-50">
        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
          {/* Modern Header Section */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white rounded-2xl p-8 mb-8 shadow-2xl">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-14 h-14 bg-gradient-to-br from-red-400 to-pink-500 rounded-2xl flex items-center justify-center shadow-xl">
                  <Settings size={28} className="text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-red-200 to-pink-200 bg-clip-text text-transparent">
                    Gestion Avancée du Routage
                  </h1>
                  <p className="text-slate-300 mt-2">Configurez les règles, types de documents et dossiers de destination</p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="mb-6 bg-red-50 border-l-4 border-red-500 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="text-red-500 mr-3 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-red-800">Erreur</p>
                  <p className="text-sm text-red-700 mt-1">{error}</p>
                </div>
                <button onClick={() => setError('')} className="ml-auto text-red-500 hover:text-red-700">
                  ✕
                </button>
              </div>
            </div>
          )}
          {success && (
            <div className="mb-6 bg-green-50 border-l-4 border-green-500 p-4 rounded-lg">
              <div className="flex items-start">
                <AlertCircle className="text-green-500 mr-3 flex-shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-semibold text-green-800">Succès</p>
                  <p className="text-sm text-green-700 mt-1">{success}</p>
                </div>
                <button onClick={() => setSuccess('')} className="ml-auto text-green-500 hover:text-green-700">
                  ✕
                </button>
              </div>
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-3 mb-8">
            <button
              onClick={() => setActiveTab('rules')}
              className={`
                px-6 py-3 rounded-xl font-semibold transition-all duration-200
                ${activeTab === 'rules'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-red-300'
                }
              `}
            >
              📋 Règles de Routage
            </button>
            <button
              onClick={() => setActiveTab('types')}
              className={`
                px-6 py-3 rounded-xl font-semibold transition-all duration-200
                ${activeTab === 'types'
                  ? 'bg-gradient-to-r from-red-600 to-red-700 text-white shadow-lg hover:shadow-xl'
                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 hover:border-red-300'
                }
              `}
            >
              📂 Types par Département
            </button>
          </div>

          {/* ONGLET RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-6">
              {/* Header Actions */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer bg-white px-4 py-2 rounded-xl border border-gray-200 hover:border-red-300 transition">
                    <input
                      type="checkbox"
                      checked={activeRulesOnly}
                      onChange={(e) => setActiveRulesOnly(e.target.checked)}
                      className="w-4 h-4 text-red-600 rounded"
                    />
                    <span className="text-sm font-medium text-gray-700">Afficher uniquement les actives</span>
                  </label>
                </div>
                <button
                  onClick={() => setShowRuleModal(true)}
                  className="
                    flex items-center gap-2 px-5 py-3
                    bg-gradient-to-r from-red-500 to-red-600
                    text-white font-medium rounded-xl
                    hover:from-red-600 hover:to-red-700
                    shadow-lg hover:shadow-xl
                    transition-all duration-200
                    transform hover:scale-105
                  "
                >
                  <Plus size={20} /> Nouvelle règle
                </button>
              </div>

              {/* Rules List */}
              {loading ? (
                <div className="text-center py-16 bg-white rounded-2xl">
                  <div className="inline-block w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500">Chargement...</p>
                </div>
              ) : routingRules.length === 0 ? (
                <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-12 text-center">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <p className="text-red-900 font-bold text-lg">Aucune règle trouvée</p>
                  <p className="text-red-700 text-sm mt-2">Créez votre première règle de routage</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {routingRules && Array.isArray(routingRules) && routingRules.filter(rule => rule && rule.id).map((rule) => (
                    <div
                      key={rule.id}
                      className={`
                        rounded-2xl p-6 transition-all duration-200
                        border-2
                        ${rule.is_active
                          ? 'bg-white border-green-200 shadow-md hover:shadow-lg'
                          : 'bg-gray-50 border-gray-200'
                        }
                      `}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 flex-wrap">
                            <h3 className="text-xl font-bold text-gray-900">{rule.name}</h3>
                            <span
                              className={`
                                px-3 py-1 rounded-full text-sm font-semibold
                                ${rule.is_active
                                  ? 'bg-green-100 text-green-800'
                                  : 'bg-red-100 text-red-800'
                                }
                              `}
                            >
                              {rule.is_active ? '✓ Actif' : '✕ Inactif'}
                            </span>
                            <span className="px-3 py-1 rounded-full text-sm font-semibold bg-red-100 text-red-800">
                              Priorité: {rule.priority}
                            </span>
                          </div>
                          <p className="text-gray-600 mt-2">{rule.description || 'Aucune description'}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleToggleRule(rule.id, rule.is_active)}
                            className={`
                              p-2.5 rounded-xl transition-all duration-200
                              ${rule.is_active
                                ? 'bg-yellow-100 text-yellow-600 hover:bg-yellow-200'
                                : 'bg-green-100 text-green-600 hover:bg-green-200'
                              }
                            `}
                            title={rule.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {rule.is_active ? <EyeOff size={20} /> : <Eye size={20} />}
                          </button>
                          <button
                            onClick={() => handleDeleteRule(rule.id)}
                            className="p-2.5 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-200"
                            title="Supprimer"
                          >
                            <Trash2 size={20} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 pt-4 border-t border-gray-200">
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Département</p>
                          <p className="text-sm font-bold text-gray-900">
                            {getConditionValue(rule, 'department')}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Type</p>
                          <p className="text-sm font-bold text-gray-900">
                            {getConditionValue(rule, 'document_type')}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Destination</p>
                          <p className="text-sm font-bold text-gray-900">
                            📁 {rule.destination_folder_name || 'N/A'}
                          </p>
                        </div>
                        <div className="bg-gray-50 rounded-xl p-3">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Applications</p>
                          <p className="text-sm font-bold text-gray-900">
                            {rule.times_applied || 0} fois
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ONGLET TYPES */}
          {activeTab === 'types' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex justify-between items-center gap-4">
                <div className="flex gap-4 flex-1">
                  {/* Dropdown Filiale */}
                  <select
                    value={selectedBranch}
                    onChange={(e) => setSelectedBranch(e.target.value)}
                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white font-medium"
                  >
                    <option value="">Sélectionner une filiale</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name} ({branch.code})
                      </option>
                    ))}
                  </select>

                  {/* Dropdown Département */}
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white font-medium"
                  >
                    <option value="">Sélectionner un département</option>
                    {departments.map((dept) => (
                      <option key={dept.value} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={() => setShowTypeModal(true)}
                  className="
                    flex items-center gap-2 px-5 py-3 whitespace-nowrap
                    bg-gradient-to-r from-red-500 to-red-600
                    text-white font-medium rounded-xl
                    hover:from-red-600 hover:to-red-700
                    shadow-lg hover:shadow-xl
                    transition-all duration-200
                    transform hover:scale-105
                  "
                >
                  <Plus size={20} /> Ajouter un type
                </button>
              </div>

              {/* Types Grid */}
              {loading ? (
                <div className="text-center py-16 bg-white rounded-2xl">
                  <div className="inline-block w-12 h-12 border-4 border-red-200 border-t-red-600 rounded-full animate-spin mb-4"></div>
                  <p className="text-gray-500">Chargement...</p>
                </div>
              ) : allDocumentTypes.length === 0 ? (
                <div className="bg-gradient-to-br from-red-50 to-orange-50 border border-red-200 rounded-2xl p-12 text-center">
                  <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="w-10 h-10 text-red-600" />
                  </div>
                  <p className="text-red-900 font-bold text-lg">Aucun type trouvé</p>
                  <p className="text-red-700 text-sm mt-2">
                    Ajoutez des types de documents pour {departments.find(d => d.value === selectedDept)?.label}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allDocumentTypes?.filter((type: any) => type && type.id).map((type: any) => (
                    <div
                      key={type.id}
                      className={`
                        rounded-2xl p-6 transition-all duration-200
                        ${type.is_available
                          ? 'bg-white border-2 border-green-200 shadow-md hover:shadow-xl'
                          : 'bg-gray-50 border-2 border-gray-200'
                        }
                      `}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <h4 className="text-lg font-bold text-gray-900">
                          {type.document_type_display}
                        </h4>
                        <button
                          onClick={() => handleDeleteType(type.id)}
                          className="p-2 rounded-xl bg-red-100 text-red-600 hover:bg-red-200 transition-all duration-200"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      <p className="text-sm text-gray-600 mb-4">{type.description || 'Aucune description'}</p>

                      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                        <span
                          className={`
                            px-3 py-1.5 rounded-full text-xs font-bold
                            ${type.is_available
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                            }
                          `}
                        >
                          {type.is_available ? '✓ Disponible' : '✕ Indisponible'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* MODAL Nouvelle Règle */}
          <Modal
            isOpen={showRuleModal}
            title="Créer une nouvelle règle"
            onClose={() => setShowRuleModal(false)}
          >
            <div className="space-y-5">
              <Input
                placeholder="Nom de la règle"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />

              <Input
                placeholder="Description"
                value={ruleForm.description}
                onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />

              {/* ✅ Dropdown Branche */}
              <select
                value={ruleForm.branch}
                onChange={(e) => {
                  setRuleForm({ ...ruleForm, branch: e.target.value, department: '' });
                }}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <option value="">Sélectionner une filiale</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name} ({branch.code})
                  </option>
                ))}
              </select>

              {/* ✅ Dropdown Département filtré */}
              <select
                value={ruleForm.department}
                onChange={(e) => setRuleForm({ ...ruleForm, department: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <option value="">Sélectionner un département</option>
                {ruleForm.branch ? (
                  allDepartments
                    .filter((dept: any) => String(dept.branch || dept.branch_id) === ruleForm.branch)
                    .map((dept: any) => (
                      <option key={dept.value || dept.name} value={dept.name || dept.value}>
                        {dept.name} ({dept.code})
                      </option>
                    ))
                ) : (
                  departments.map((dept) => (
                    <option key={dept.value} value={dept.value}>
                      {dept.label}
                    </option>
                  ))
                )}
              </select>

              <select
                value={ruleForm.document_type}
                onChange={(e) => setRuleForm({ ...ruleForm, document_type: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <option value="">Sélectionner un type</option>
                {allDocumentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <Input
                type="number"
                placeholder="Priorité (0-100)"
                value={ruleForm.priority}
                onChange={(e) => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Dossier destination
                </label>
                <FolderSelector
                  folders={folders}
                  value={ruleForm.destination_folder}
                  onChange={(folderId) => {
                    setRuleForm({ ...ruleForm, destination_folder: folderId });
                  }}
                />
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={handleAddRule}
                  disabled={loading}
                  className="
                    flex-1 px-6 py-3
                    bg-gradient-to-r from-red-500 to-red-600
                    text-white font-medium rounded-xl
                    hover:from-red-600 hover:to-red-700
                    disabled:opacity-50 disabled:cursor-not-allowed
                    shadow-md hover:shadow-lg
                    transition-all duration-200
                  "
                >
                  {loading ? 'Création...' : 'Créer'}
                </button>
                <button
                  onClick={() => setShowRuleModal(false)}
                  className="
                    flex-1 px-6 py-3
                    bg-gray-100 text-gray-700 font-medium rounded-xl
                    hover:bg-gray-200
                    transition-all duration-200
                  "
                >
                  Annuler
                </button>
              </div>
            </div>
          </Modal>

          {/* MODAL Ajouter Type */}
          <Modal
            isOpen={showTypeModal}
            title="Ajouter un type de document"
            onClose={() => setShowTypeModal(false)}
          >
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-2">
                  Département: {departments.find(d => d.value === selectedDept)?.label}
                </label>
              </div>

              <select
                value={typeForm.document_type}
                onChange={(e) => setTypeForm({ ...typeForm, document_type: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white"
              >
                <option value="">Sélectionner un type</option>
                {allDocumentTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>

              <Input
                placeholder="Description (optionnelle)"
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
                className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={typeForm.is_available}
                  onChange={(e) => setTypeForm({ ...typeForm, is_available: e.target.checked })}
                  className="w-5 h-5 rounded text-red-600"
                />
                <span className="text-sm font-medium text-gray-700">Disponible</span>
              </label>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={handleAddType}
                  disabled={loading}
                  className="
                    flex-1 px-6 py-3
                    bg-gradient-to-r from-red-500 to-red-600
                    text-white font-medium rounded-xl
                    hover:from-red-600 hover:to-red-700
                    disabled:opacity-50 disabled:cursor-not-allowed
                    shadow-md hover:shadow-lg
                    transition-all duration-200
                  "
                >
                  {loading ? 'Ajout...' : 'Ajouter'}
                </button>
                <button
                  onClick={() => setShowTypeModal(false)}
                  className="
                    flex-1 px-6 py-3
                    bg-gray-100 text-gray-700 font-medium rounded-xl
                    hover:bg-gray-200
                    transition-all duration-200
                  "
                >
                  Annuler
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    </Layout>
  );
}
