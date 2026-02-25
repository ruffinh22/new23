import { useState, useEffect } from 'react';
import {
  Settings,
  Plus,
  Trash2,
  AlertCircle,
  ChevronRight,
  ChevronDown,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { Layout } from '@/components/common';
import { Input } from '@/components/common';
import { Modal } from '@/components/common';
import { apiClient } from '@/services/api'
import { departmentService, type Department } from '@/services/departmentService'
import { documentTypeService } from '@/services/documentTypeService'
import { branchService, type Branch } from '@/services/branchService'

interface DepartmentDocumentType {
  id: number;
  department: string;
  department_display: string;
  document_type: string;
  document_type_display: string;
  is_available: boolean;
  description: string;
}

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
              ? 'bg-primary-100 border-l-4 border-primary-600'
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
                <ChevronDown size={16} />
              ) : (
                <ChevronRight size={16} />
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
    <div className="border border-gray-300 rounded-lg p-4 bg-white max-h-96 overflow-y-auto">
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
          <p className="text-sm font-semibold text-primary-600">{selectedPath}</p>
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
  const [departments, setDepartments] = useState<Department[]>([]);
  const [allDocumentTypes, setAllDocumentTypes] = useState<Array<{value: string, label: string}>>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [fileTypeConfigs, setFileTypeConfigs] = useState<Array<{id: number, document_type: string, name: string}>>([]);

  // Document Types
  const [documentTypes, setDocumentTypes] = useState<DepartmentDocumentType[]>([]);
  const [selectedDept, setSelectedDept] = useState('RH');
  const [selectedFiliale, setSelectedFiliale] = useState('');
  const [selectedFilialeForType, setSelectedFilialeForType] = useState('');

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
    name: '',
    description: '',
    priority: 50,
    destination_folder: '',
    department: '',
    document_type: '',
    filiale: '',
  });

  const [typeForm, setTypeForm] = useState({
    department: selectedDept,
    document_type: '',
    description: '',
    is_available: true,
    file_type_configuration: '',
  });

  // Filtrer les départements par filiale sélectionnée pour le modal Type
  const filteredDepartmentsForType = selectedFilialeForType
    ? departments.filter(dept => {
        const selectedBranch = branches.find(b => b.id?.toString() === selectedFilialeForType);
        return dept.branch?.toString() === selectedFilialeForType || dept.branch_name === selectedBranch?.name;
      })
    : departments;

  // Load data
  // Charger les données initiales au montage du composant
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        // Charger les départements depuis l'API
        const depts = await departmentService.getDepartments();
        setDepartments(depts);

        // Charger tous les types de documents depuis l'API
        const types = await documentTypeService.getDocumentTypes();
        setAllDocumentTypes(types.map(t => ({value: String(t.id), label: t.display_name})));

        // Charger les filiales
        const branchList = await branchService.getBranches();
        setBranches(branchList);

        // Charger les configurations de types de fichiers
        const configResponse = await apiClient.get('/documents/file-type-configurations/');
        const configs = Array.isArray(configResponse.data) ? configResponse.data : (configResponse.data.results || []);
        setFileTypeConfigs(configs);

        // Charger les dossiers
        await fetchFolders();

        // Charger les règles initiales
        await fetchRules();

        console.log(`✅ Données initiales chargées: ${depts.length} depts, ${types.length} types, ${branchList.length} filiales, ${configs.length} configs`);
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
    } else if (activeTab === 'types' && selectedDept) {
      fetchDocumentTypes();
    }
  }, [activeTab, selectedDept, activeRulesOnly]);

  const fetchDocumentTypes = async () => {
    if (!selectedDept) {
      console.warn('⚠️ fetchDocumentTypes: selectedDept is empty, skipping');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.get(
        `/routing-rules/document-types/by_department/?department=${selectedDept}`
      );
      const data = response.data;
      setDocumentTypes(Array.isArray(data.document_types) ? data.document_types : []);
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

  const fetchRules = async (onlyActive?: boolean) => {
    setLoading(true);
    try {
      // Utiliser le paramètre si fourni, sinon utiliser l'état
      const shouldFilterActive = onlyActive !== undefined ? onlyActive : activeRulesOnly;
      const endpoint = shouldFilterActive
        ? '/routing-rules/active/'
        : '/routing-rules/';
      const response = await apiClient.get(endpoint);
      const data = response.data;
      const rules = Array.isArray(data) ? data : (data.results || []);
      setRoutingRules(rules);
      setError('');
      console.log(`[fetchRules] Loaded ${rules.length} rules from ${endpoint}`);
    } catch (err: any) {
      console.error('[fetchRules] Error:', err);
      setError(err.response?.data?.detail || 'Erreur lors du chargement des règles');
    } finally {
      setLoading(false);
    }
  };

  // Filtrer les départements par filiale sélectionnée
  const filteredDepartments = selectedFiliale
    ? departments.filter(dept => {
        // Chercher la branche sélectionnée pour voir son nom
        const selectedBranch = branches.find(b => b.id?.toString() === selectedFiliale);
        return dept.branch?.toString() === selectedFiliale || dept.branch_name === selectedBranch?.name;
      })
    : departments;

  const handleAddRule = async () => {
    if (!ruleForm.name || !ruleForm.destination_folder || !ruleForm.department || !ruleForm.document_type) {
      setError('Veuillez remplir tous les champs obligatoires');
      return;
    }

    setLoading(true);
    try {
      console.log('[RoutingRulesManager] Creating rule with data:', {
        name: ruleForm.name,
        description: ruleForm.description,
        priority: ruleForm.priority,
        destination_folder: parseInt(ruleForm.destination_folder),
        conditions: {
          department: { value: ruleForm.department, operator: 'equals' },
          document_type: { value: ruleForm.document_type, operator: 'equals' },
        },
      });

      const conditions: any = {
        department: { value: ruleForm.department, operator: 'equals' },
        document_type: { value: ruleForm.document_type, operator: 'equals' },
      };
      
      // Ajouter la filiale aux conditions si elle est sélectionnée
      if (ruleForm.filiale) {
        conditions.branch = { value: ruleForm.filiale, operator: 'equals' };
      }

      const createResponse = await apiClient.post('/routing-rules/', {
        name: ruleForm.name,
        description: ruleForm.description,
        priority: ruleForm.priority,
        destination_folder: parseInt(ruleForm.destination_folder),
        branch: ruleForm.filiale ? parseInt(ruleForm.filiale) : null,
        conditions: conditions,
      });

      console.log('[RoutingRulesManager] Created rule response:', createResponse.data);

      setSuccess('Règle créée avec succès!');
      setShowRuleModal(false);
      setSelectedFiliale('');
      setRuleForm({
        name: '',
        description: '',
        priority: 50,
        destination_folder: '',
        department: '',
        document_type: '',
        filiale: '',
      });
      setError('');
      
      console.log('[RoutingRulesManager] Refreshing rules list...');
      // Add a small delay to ensure database is updated
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Force switch to rules tab and refresh (pass false to fetch ALL rules)
      setActiveTab('rules');
      setActiveRulesOnly(false);
      fetchRules(false);  // Pass false explicitly to fetch all rules
    } catch (err: any) {
      console.error('[RoutingRulesManager] Error creating rule:', err);
      setError(err.response?.data?.detail || 'Erreur lors de la création de la règle');
    } finally {
      setLoading(false);
    }
  };

  const handleAddType = async () => {
    if (!typeForm.document_type || !typeForm.department) {
      setError('Veuillez sélectionner un département et un type de document');
      return;
    }

    setLoading(true);
    try {
      // Préparer les données à envoyer (exclure file_type_configuration si vide)
      const dataToSend: any = {
        department: typeForm.department,
        document_type: typeForm.document_type,
        description: typeForm.description,
        is_available: typeForm.is_available,
      };
      
      // Ajouter file_type_configuration s'il y a une valeur
      if (typeForm.file_type_configuration) {
        dataToSend.file_type_configuration = typeForm.file_type_configuration;
      }

      await apiClient.post('/routing-rules/document-types/', dataToSend);

      setSuccess('✅ Type créé avec succès! Dossiers en création automatique...');
      setShowTypeModal(false);
      setTypeForm({
        department: selectedDept,
        document_type: '',
        description: '',
        is_available: true,
        file_type_configuration: '',
      });
      setSelectedFilialeForType('');
      setError('');
      
      // Attendre un peu que le backend crée les dossiers, puis actualiser
      setTimeout(() => {
        fetchDocumentTypes();
        fetchFolders();
      }, 500);
      
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
    console.log(`[handleDeleteRule] Called with id=${id}, type=${typeof id}`);
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette règle?')) return;

    try {
      const url = `/routing-rules/${id}/`;
      console.log(`[handleDeleteRule] Sending DELETE to: ${url}`);
      await apiClient.delete(url);

      setSuccess('Règle supprimée avec succès!');
      setError('');
      console.log(`[handleDeleteRule] Rule ${id} deleted successfully`);
      fetchRules();
    } catch (err: any) {
      console.error('[handleDeleteRule] Error:', err);
      console.error('[handleDeleteRule] Response status:', err.response?.status);
      console.error('[handleDeleteRule] Response data:', err.response?.data);
      const errorMsg = err.response?.data?.error?.message || err.response?.data?.detail || `Erreur lors de la suppression (${err.response?.status})`;
      setError(errorMsg);
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

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
        {/* Animated background */}
        <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
        </div>

        <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8 relative z-10">
          
          {/* Modern Glassmorphism Header */}
          <div className="glass-card-hover mb-8 border border-white/30 p-8 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-400 to-accent-600 rounded-2xl flex items-center justify-center shadow-xl shadow-primary/20">
                  <Settings size={32} className="text-white" />
                </div>
                <div>
                  <h1 className="text-4xl font-black bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
                    Gestion du Routage
                  </h1>
                  <p className="text-secondary-600 mt-2 font-medium">Configurez les règles de routage automatique des documents</p>
                </div>
              </div>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="alert alert-error mb-6 animate-slide-up">
              <span className="font-semibold">⚠️ Erreur</span>
              <p>{error}</p>
              <button onClick={() => setError('')} className="ml-auto text-sm font-medium hover:underline">Fermer</button>
            </div>
          )}
          {success && (
            <div className="alert alert-success mb-6 animate-slide-up">
              <CheckCircle2 size={20} className="flex-shrink-0" />
              <span className="font-semibold">Succès</span>
              <p>{success}</p>
              <button onClick={() => setSuccess('')} className="ml-auto text-sm font-medium hover:underline">Fermer</button>
            </div>
          )}

          {/* Modern Tabs with Real Button Styling */}
          <div className="mb-8 flex gap-4">
            <button
              onClick={() => setActiveTab('rules')}
              className={`px-8 py-3 rounded-xl font-bold text-base transition-all duration-300 transform flex items-center gap-2 border-2 ${
                activeTab === 'rules'
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 border-primary-600 scale-105 hover:scale-110'
                  : 'bg-white text-secondary-700 border-secondary-200 hover:border-primary-400 hover:text-primary-600 hover:shadow-md'
              }`}
            >
              <Zap size={20} /> Règles de Routage
            </button>
            <button
              onClick={() => setActiveTab('types')}
              className={`px-8 py-3 rounded-xl font-bold text-base transition-all duration-300 transform flex items-center gap-2 border-2 ${
                activeTab === 'types'
                  ? 'bg-gradient-to-r from-primary-500 to-primary-600 text-white shadow-lg shadow-primary-500/30 border-primary-600 scale-105 hover:scale-110'
                  : 'bg-white text-secondary-700 border-secondary-200 hover:border-primary-400 hover:text-primary-600 hover:shadow-md'
              }`}
            >
              <Settings size={20} /> Types par Département
            </button>
          </div>

          {/* ONGLET RULES */}
          {activeTab === 'rules' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header Actions */}
              <div className="flex justify-between items-center flex-wrap gap-4">
                <label className="flex items-center gap-3 px-4 py-2 bg-white rounded-xl border border-secondary-200 cursor-pointer hover:shadow-md transition-all">
                  <input
                    type="checkbox"
                    checked={activeRulesOnly}
                    onChange={(e) => setActiveRulesOnly(e.target.checked)}
                    className="w-5 h-5 rounded text-primary-600 cursor-pointer"
                  />
                  <span className="text-sm font-semibold text-secondary-900">Afficher uniquement les actives</span>
                </label>
                <button 
                  onClick={() => setShowRuleModal(true)}
                  className="btn-primary btn-lg"
                >
                  <Plus size={20} /> Nouvelle règle
                </button>
              </div>

              {/* Rules Table */}
              {loading ? (
                <div className="card p-12 text-center">
                  <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-secondary-600 font-medium">Chargement des règles...</p>
                </div>
              ) : routingRules.length === 0 ? (
                <div className="card bg-gradient-to-br from-primary-50 to-primary-100/50 border-l-4 border-primary-500 p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-primary-600 mx-auto mb-4 animate-float" />
                  <p className="text-primary-900 font-bold text-lg">Aucune règle trouvée</p>
                  <p className="text-primary-700 text-sm mt-2 mb-6">Créez votre première règle de routage</p>
                  <button 
                    onClick={() => setShowRuleModal(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Plus size={18} /> Créer une règle
                  </button>
                </div>
              ) : (
                <div className="card overflow-hidden border-0 shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      {/* Table Header */}
                      <thead>
                        <tr className="bg-gradient-to-r from-primary-50 to-accent-50 border-b-2 border-primary-200">
                          <th className="px-6 py-4 text-left font-bold text-secondary-900">Nom</th>
                          <th className="px-6 py-4 text-left font-bold text-secondary-900">Département</th>
                          <th className="px-6 py-4 text-left font-bold text-secondary-900">Type Document</th>
                          <th className="px-6 py-4 text-left font-bold text-secondary-900">Destination</th>
                          <th className="px-6 py-4 text-center font-bold text-secondary-900">Priorité</th>
                          <th className="px-6 py-4 text-center font-bold text-secondary-900">Applications</th>
                          <th className="px-6 py-4 text-center font-bold text-secondary-900">Statut</th>
                          <th className="px-6 py-4 text-center font-bold text-secondary-900">Actions</th>
                        </tr>
                      </thead>
                      
                      {/* Table Body */}
                      <tbody>
                        {routingRules && Array.isArray(routingRules) && routingRules.filter(rule => rule && rule.id).map((rule, index) => {
                          if (index === 0) {
                            console.log('[RoutingRulesManager] First rule:', rule);
                          }
                          return (
                          <tr 
                            key={rule.id}
                            className={`border-b transition-all duration-200 hover:bg-primary-50 ${
                              index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/30'
                            } ${rule.is_active ? 'border-success-200' : 'border-secondary-200'}`}
                          >
                            {/* Nom */}
                            <td className="px-6 py-4">
                              <div className="flex flex-col">
                                <p className="font-bold text-secondary-900">{rule.name}</p>
                                <p className="text-xs text-secondary-500 mt-1">{rule.description}</p>
                              </div>
                            </td>
                            
                            {/* Département */}
                            <td className="px-6 py-4">
                              <span className="badge badge-secondary">
                                {rule.conditions?.department?.value || '-'}
                              </span>
                            </td>
                            
                            {/* Type Document */}
                            <td className="px-6 py-4">
                              <span className="badge badge-info">
                                {rule.conditions?.document_type?.value || '-'}
                              </span>
                            </td>
                            
                            {/* Destination */}
                            <td className="px-6 py-4">
                              <div className="flex items-center gap-2">
                                <span className="text-lg">📁</span>
                                <span className="font-medium text-secondary-900">{rule.destination_folder_name}</span>
                              </div>
                            </td>
                            
                            {/* Priorité */}
                            <td className="px-6 py-4 text-center">
                              <div className="flex items-center justify-center">
                                <div className="w-16 h-8 bg-gradient-to-r from-primary-100 to-accent-100 rounded-full flex items-center justify-center">
                                  <span className="font-bold text-primary-700">{rule.priority}</span>
                                </div>
                              </div>
                            </td>
                            
                            {/* Applications */}
                            <td className="px-6 py-4 text-center">
                              <span className="badge badge-accent">
                                {rule.times_applied}x
                              </span>
                            </td>
                            
                            {/* Statut */}
                            <td className="px-6 py-4 text-center">
                              <button
                                onClick={() => handleToggleRule(rule.id, rule.is_active)}
                                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                                  rule.is_active
                                    ? 'routing-status-active hover:shadow-lg'
                                    : 'routing-status-inactive hover:shadow-lg'
                                }`}
                                title={rule.is_active ? 'Cliquer pour désactiver' : 'Cliquer pour activer'}
                              >
                                {rule.is_active ? '✓ Actif' : '○ Inactif'}
                              </button>
                            </td>
                            
                            {/* Actions */}
                            <td className="px-6 py-4 text-center">
                              <div className="flex gap-2 justify-center items-center">
                                <button
                                  onClick={() => handleDeleteRule(rule.id)}
                                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-error-100 text-error-600 hover:bg-error-200 transition-all transform hover:scale-105 font-medium text-sm"
                                  title="Supprimer cette règle"
                                >
                                  <Trash2 size={18} />
                                  <span>Supprimer</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Table Footer - Stats */}
                  <div className="bg-gradient-to-r from-secondary-50 to-primary-50/30 px-6 py-4 border-t border-secondary-200 flex justify-between items-center flex-wrap gap-4">
                    <p className="text-sm text-secondary-600">
                      <span className="font-bold text-secondary-900">{routingRules.length}</span> règles au total
                    </p>
                    <div className="flex gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-success-500"></div>
                        <span className="text-secondary-600">
                          <span className="font-bold text-success-700">{routingRules.filter(r => r.is_active).length}</span> active(s)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-secondary-400"></div>
                        <span className="text-secondary-600">
                          <span className="font-bold text-secondary-700">{routingRules.filter(r => !r.is_active).length}</span> inactive(s)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ONGLET TYPES */}
          {activeTab === 'types' && (
            <div className="space-y-6 animate-fade-in">
              {/* Header */}
              <div className="flex justify-between items-center flex-wrap gap-4">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-bold text-secondary-700">Département:</label>
                  <select
                    value={selectedDept}
                    onChange={(e) => setSelectedDept(e.target.value)}
                    className="select-department"
                  >
                    {departments.map((dept, idx) => (
                      <option key={`tab-types-dept-${idx}-${dept.value}`} value={dept.value}>
                        {dept.label}
                      </option>
                    ))}
                  </select>
                </div>
                <button 
                  onClick={() => setShowTypeModal(true)}
                  className="btn-primary inline-flex items-center gap-2 transform hover:scale-105"
                >
                  <Plus size={20} /> Ajouter un type
                </button>
              </div>

              {/* Types Table */}
              {loading ? (
                <div className="card p-12 text-center">
                  <div className="w-16 h-16 border-4 border-accent-200 border-t-accent-600 rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-secondary-600 font-medium">Chargement des types...</p>
                </div>
              ) : documentTypes.length === 0 ? (
                <div className="card bg-gradient-to-br from-accent-50 to-accent-100/50 border-l-4 border-accent-500 p-8 text-center">
                  <AlertCircle className="w-12 h-12 text-accent-600 mx-auto mb-4 animate-float" />
                  <p className="text-accent-900 font-bold text-lg">Aucun type trouvé</p>
                  <p className="text-accent-700 text-sm mt-2 mb-6">
                    Ajoutez des types de documents pour {departments.find(d => d.value === selectedDept)?.label}
                  </p>
                  <button 
                    onClick={() => setShowTypeModal(true)}
                    className="btn-primary inline-flex items-center gap-2"
                  >
                    <Plus size={18} /> Ajouter un type
                  </button>
                </div>
              ) : (
                <div className="card overflow-hidden border-0 shadow-lg">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      {/* Table Header */}
                      <thead>
                        <tr className="bg-gradient-to-r from-accent-50 to-primary-50 border-b-2 border-accent-200">
                          <th className="px-6 py-4 text-left font-bold text-secondary-900">Type Document</th>
                          <th className="px-6 py-4 text-left font-bold text-secondary-900">Description</th>
                          <th className="px-6 py-4 text-center font-bold text-secondary-900">Disponibilité</th>
                          <th className="px-6 py-4 text-center font-bold text-secondary-900">Actions</th>
                        </tr>
                      </thead>
                      
                      {/* Table Body */}
                      <tbody>
                        {documentTypes?.filter(type => type && type.id).map((type, index) => (
                          <tr 
                            key={type.id}
                            className={`border-b transition-all duration-200 hover:bg-accent-50 group ${
                              index % 2 === 0 ? 'bg-white' : 'bg-secondary-50/30'
                            }`}
                          >
                            {/* Type Document */}
                            <td className="px-6 py-5">
                              <div className="flex items-center gap-2">
                                <span className="text-xl">📄</span>
                                <span className="font-bold text-secondary-900">{type.document_type_display}</span>
                              </div>
                            </td>
                            
                            {/* Description */}
                            <td className="px-6 py-5">
                              <p className="text-secondary-700 line-clamp-2">{type.description || '-'}</p>
                            </td>
                            
                            {/* Disponibilité */}
                            <td className="px-6 py-5 text-center">
                              <span
                                className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
                                  type.is_available
                                    ? 'routing-status-active'
                                    : 'routing-status-inactive'
                                }`}
                              >
                                {type.is_available ? '✓ Disponible' : '○ Indisponible'}
                              </span>
                            </td>
                            
                            {/* Actions */}
                            <td className="px-6 py-5 text-center">
                              <button
                                onClick={() => handleDeleteType(type.id)}
                                className="p-2.5 rounded-lg bg-error-100 text-error-600 hover:bg-error-200 transition-all transform hover:scale-110 inline-flex"
                                title="Supprimer"
                              >
                                <Trash2 size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Table Footer - Stats */}
                  <div className="bg-gradient-to-r from-secondary-50 to-accent-50/30 px-6 py-4 border-t border-secondary-200 flex justify-between items-center flex-wrap gap-4">
                    <p className="text-sm text-secondary-600">
                      <span className="font-bold text-secondary-900">{documentTypes.length}</span> type(s) total
                    </p>
                    <div className="flex gap-6 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-success-500"></div>
                        <span className="text-secondary-600">
                          <span className="font-bold text-success-700">{documentTypes.filter(t => t.is_available).length}</span> disponible(s)
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-secondary-400"></div>
                        <span className="text-secondary-600">
                          <span className="font-bold text-secondary-700">{documentTypes.filter(t => !t.is_available).length}</span> indisponible(s)
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* MODAL Nouvelle Règle */}
          <Modal
            isOpen={showRuleModal}
            title="📋 Créer une nouvelle règle"
            onClose={() => setShowRuleModal(false)}
          >
            <div className="space-y-5">
              <Input
                placeholder="Nom de la règle"
                value={ruleForm.name}
                onChange={(e) => setRuleForm({ ...ruleForm, name: e.target.value })}
              />

              <textarea
                placeholder="Description"
                value={ruleForm.description}
                onChange={(e) => setRuleForm({ ...ruleForm, description: e.target.value })}
                className="textarea"
                rows={2}
              />

              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-2">Filiale (optionnel)</label>
                <select
                  value={selectedFiliale}
                  onChange={(e) => {
                    setSelectedFiliale(e.target.value);
                    setRuleForm({ ...ruleForm, filiale: e.target.value, department: '' });
                  }}
                  className="input cursor-pointer"
                >
                  <option value="">Sélectionner une filiale</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id?.toString() || ''}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-2">Département {selectedFiliale && '(filtré)'}</label>
                <select
                  value={ruleForm.department}
                  onChange={(e) => setRuleForm({ ...ruleForm, department: e.target.value })}
                  className="input cursor-pointer"
                >
                  <option value="">Sélectionner un département</option>
                  {(selectedFiliale ? filteredDepartments : departments).map((dept, idx) => (
                    <option key={`dept-${idx}-${dept.value}`} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-2">Type de Document</label>
                <select
                  value={ruleForm.document_type}
                  onChange={(e) => setRuleForm({ ...ruleForm, document_type: e.target.value })}
                  className="input cursor-pointer"
                >
                  <option value="">Sélectionner un type</option>
                  {allDocumentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                type="number"
                placeholder="Priorité (0-100)"
                value={ruleForm.priority}
                onChange={(e) => setRuleForm({ ...ruleForm, priority: parseInt(e.target.value) || 0 })}
              />

              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-3">
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

              <div className="flex gap-3 justify-end pt-4 border-t border-secondary-200">
                <button
                  onClick={() => {
                    setShowRuleModal(false);
                    setSelectedFiliale('');
                  }}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleAddRule} 
                  disabled={loading}
                  className="btn-primary"
                >
                  {loading ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </Modal>

          {/* MODAL Ajouter Type */}
          <Modal
            isOpen={showTypeModal}
            title="📂 Ajouter un type de document"
            onClose={() => setShowTypeModal(false)}
          >
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-2">Filiale (optionnel)</label>
                <select
                  value={selectedFilialeForType}
                  onChange={(e) => {
                    setSelectedFilialeForType(e.target.value);
                    setTypeForm({ ...typeForm, department: '' });
                  }}
                  className="input cursor-pointer"
                >
                  <option value="">Sélectionner une filiale</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id?.toString() || ''}>
                      {branch.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-2">Département {selectedFilialeForType && '(filtré)'}</label>
                <select
                  value={typeForm.department}
                  onChange={(e) => setTypeForm({ ...typeForm, department: e.target.value })}
                  className="input cursor-pointer"
                >
                  <option value="">Sélectionner un département</option>
                  {(selectedFilialeForType ? filteredDepartmentsForType : departments).map((dept, idx) => (
                    <option key={`type-dept-${idx}-${dept.value}`} value={dept.value}>
                      {dept.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-2">Type de Document</label>
                <select
                  value={typeForm.document_type}
                  onChange={(e) => setTypeForm({ ...typeForm, document_type: e.target.value })}
                  className="input cursor-pointer"
                >
                  <option value="">Sélectionner un type</option>
                  {allDocumentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <Input
                placeholder="Description (optionnelle)"
                value={typeForm.description}
                onChange={(e) => setTypeForm({ ...typeForm, description: e.target.value })}
              />

              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-2">Configuration Fichier (optionnel)</label>
                <select
                  value={typeForm.file_type_configuration}
                  onChange={(e) => setTypeForm({ ...typeForm, file_type_configuration: e.target.value })}
                  className="input cursor-pointer"
                >
                  <option value="">Sélectionner une configuration</option>
                  {fileTypeConfigs.map((config: any) => (
                    <option key={`config-${config.id}`} value={config.id.toString()}>
                      {config.display_name} (Max: {config.max_file_size_mb}MB)
                    </option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 px-4 py-3 bg-secondary-50 rounded-xl border border-secondary-200 cursor-pointer hover:bg-secondary-100 transition-colors">
                <input
                  type="checkbox"
                  checked={typeForm.is_available}
                  onChange={(e) => setTypeForm({ ...typeForm, is_available: e.target.checked })}
                  className="w-5 h-5 rounded text-accent-600 cursor-pointer"
                />
                <span className="text-sm font-semibold text-secondary-900">Disponible</span>
              </label>

              <div className="flex gap-3 justify-end pt-4 border-t border-secondary-200">
                <button
                  onClick={() => {
                    setShowTypeModal(false);
                    setSelectedFilialeForType('');
                  }}
                  className="btn-secondary"
                >
                  Annuler
                </button>
                <button 
                  onClick={handleAddType} 
                  disabled={loading}
                  className="btn-accent"
                >
                  {loading ? 'Ajout...' : 'Ajouter'}
                </button>
              </div>
            </div>
          </Modal>
        </div>
      </div>
    </Layout>
  );
}
