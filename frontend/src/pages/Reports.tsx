import React, { useState, useEffect, useCallback } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { RefreshCw, Download, Filter, TrendingUp, TrendingDown, BarChart3, Users } from 'lucide-react';
import reportsService, { DocumentStatistics } from '../services/reportsService';
import { statusService } from '../services/statusService';
import './Reports.css';

interface FilterState {
  dateFrom: string;
  dateTo: string;
  documentType: string;
  status: string;
}

const Reports: React.FC = () => {
  const [stats, setStats] = useState<DocumentStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({
    dateFrom: '',
    dateTo: '',
    documentType: '',
    status: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [documentTypes, setDocumentTypes] = useState<Array<{ value: string; label: string }>>([]);

  // Charger les statistiques
  const loadStatistics = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await reportsService.getStatistics({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        documentType: filters.documentType || undefined,
        status: filters.status || undefined,
      });
      setStats(data);
    } catch (err) {
      setError('Erreur lors du chargement des statistiques');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  // Charger les types et formats
  useEffect(() => {
    // Document types are now hardcoded
    setDocumentTypes([
      { value: 'FACTURE', label: 'Facture' },
      { value: 'BON_COMMANDE', label: 'Bon de commande' },
      { value: 'BON_LIVRAISON', label: 'Bon de livraison' },
    ]);
  }, []);

  // Charger les statistiques initiales
  useEffect(() => {
    loadStatistics();
  }, [loadStatistics]);

  // Gestionnaires d'événements
  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFilters((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleApplyFilters = () => {
    loadStatistics();
    setShowFilters(false);
  };

  const handleResetFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      documentType: '',
      status: '',
    });
  };

  const handleRefresh = async () => {
    handleResetFilters();
    loadStatistics();
  };

  const handleExport = async () => {
    try {
      setLoading(true);
      await reportsService.exportDocuments({
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        documentType: filters.documentType || undefined,
      });
    } catch (err) {
      setError('Erreur lors de l\'export');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Les couleurs pour les graphiques viennent du statusService
  // Utiliser statusService.getStatusHexColor() au lieu de la constante en dur

  if (loading && !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-secondary-600 font-medium">Chargement des statistiques...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/50">
      {/* Animated background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none opacity-40">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary-200/30 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent-200/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }}></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        
        {/* Header - Modernized Glassmorphism */}
        <div className="glass-card-hover mb-8 border border-white/30 p-8 backdrop-blur-xl">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div>
              <h1 className="text-4xl font-black bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent mb-2">
                📊 Rapports et Statistiques
              </h1>
              <p className="text-secondary-600 font-medium">Analyse complète des documents et de leur validation</p>
            </div>
            <button
              className="btn-primary btn-lg"
              onClick={handleRefresh}
              disabled={loading}
              title="Actualiser les données"
            >
              <RefreshCw size={20} className={loading ? 'animate-spin' : ''} /> Actualiser
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex gap-3 flex-wrap pt-6 border-t border-white/20">
            <button
              className="btn-success"
              onClick={handleExport}
              disabled={loading}
              title="Exporter en CSV"
            >
              <Download size={18} /> Exporter
            </button>
            <button
              className={`px-4 py-2 rounded-xl font-medium transition-all ${
                showFilters ? 'btn-primary' : 'btn-secondary'
              }`}
              onClick={() => setShowFilters(!showFilters)}
              title="Afficher/Masquer les filtres"
            >
              <Filter size={18} className="inline mr-2" /> Filtrer
            </button>
          </div>
        </div>

        {/* Filters - Modern Design */}
        {showFilters && (
          <div className="card mb-8 p-6 border-l-4 border-primary-500 animate-slide-down">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-2">Du:</label>
                <input
                  type="date"
                  name="dateFrom"
                  value={filters.dateFrom}
                  onChange={handleFilterChange}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-2">Au:</label>
                <input
                  type="date"
                  name="dateTo"
                  value={filters.dateTo}
                  onChange={handleFilterChange}
                  className="input w-full"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-2">Type de document:</label>
                <select
                  name="documentType"
                  value={filters.documentType}
                  onChange={handleFilterChange}
                  className="input w-full"
                >
                  <option value="">Tous les types</option>
                  {documentTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold text-secondary-900 mb-2">Statut:</label>
                <select
                  name="status"
                  value={filters.status}
                  onChange={handleFilterChange}
                  className="input w-full"
                >
                  <option value="">Tous les statuts</option>
                  <option value="NOUVEAU">Nouveau</option>
                  <option value="EN_COURS">En cours</option>
                  <option value="VALIDE">Validé</option>
                  <option value="REJETE">Rejeté</option>
                  <option value="ARCHIVE">Archivé</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                className="btn-primary"
                onClick={handleApplyFilters}
                disabled={loading}
              >
                Appliquer les filtres
              </button>
              <button
                className="btn-secondary"
                onClick={handleResetFilters}
              >
                Réinitialiser
              </button>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="alert alert-error mb-8 animate-slide-up">
            <span className="font-semibold">⚠️ Erreur</span>
            <p>{error}</p>
          </div>
        )}

        {/* KPIs - Enhanced Modern Design */}
        {stats && (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <div className="dashboard-stat group cursor-pointer hover:shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">📄</span>
                  <TrendingUp size={20} className="text-primary-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="dashboard-stat-label">Total documents</p>
                <p className="dashboard-stat-value">{stats.total_documents}</p>
              </div>

              <div className="dashboard-stat group cursor-pointer hover:shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">💾</span>
                  <TrendingDown size={20} className="text-accent-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="dashboard-stat-label">Taille totale</p>
                <p className="dashboard-stat-value">{stats.total_size_mb} MB</p>
              </div>

              <div className="dashboard-stat group cursor-pointer hover:shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">✅</span>
                  <TrendingUp size={20} className="text-success-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="dashboard-stat-label">Taux validation</p>
                <p className="dashboard-stat-value">{stats.completion_rate}%</p>
              </div>

              <div className="dashboard-stat group cursor-pointer hover:shadow-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-3xl">📊</span>
                  <BarChart3 size={20} className="text-info-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="dashboard-stat-label">Validés</p>
                <p className="dashboard-stat-value">{stats.status_stats.VALIDE}</p>
              </div>
            </div>

            {/* Charts Grid - Modernized */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
              {/* Status Distribution */}
              <div className="card p-6 animate-fade-in">
                <h3 className="text-lg font-bold text-secondary-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📈</span> Répartition par statut
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={Object.entries(stats.status_stats).map(([key, value]: [string, unknown]) => ({
                        name: key,
                        value: typeof value === 'number' ? value : 0,
                      }))}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }: any) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {Object.keys(stats.status_stats).map((key, index) => (
                        <Cell key={`cell-${index}`} fill={statusService.getStatusHexColor(key)} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Document Types */}
              <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.1s' }}>
                <h3 className="text-lg font-bold text-secondary-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📋</span> Top 10 types de documents
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.type_stats.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis
                      dataKey="document_type"
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#0ea5e9" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Formats Used */}
              <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                <h3 className="text-lg font-bold text-secondary-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📁</span> Formats utilisés
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={stats.format_stats.slice(0, 8)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="file_format" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#22c55e" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Validation Results */}
              <div className="card p-6 animate-fade-in" style={{ animationDelay: '0.3s' }}>
                <h3 className="text-lg font-bold text-secondary-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">✔️</span> Résultats de validation
                </h3>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart
                    data={[
                      { name: 'Validés', value: stats.validation_stats.PASSED, fill: '#90EE90' },
                      { name: 'Échoués', value: stats.validation_stats.FAILED, fill: '#FF6B6B' },
                      { name: 'Avertissements', value: stats.validation_stats.WARNING, fill: '#FFA07A' },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                      {[stats.validation_stats.PASSED, stats.validation_stats.FAILED, stats.validation_stats.WARNING].map(
                        (_, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={['#90EE90', '#FF6B6B', '#FFA07A'][index]}
                          />
                        )
                      )}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Evolution */}
              <div className="card p-6 lg:col-span-2 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                <h3 className="text-lg font-bold text-secondary-900 mb-4 flex items-center gap-2">
                  <span className="text-2xl">📈</span> Évolution sur 30 jours
                </h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={stats.daily_stats}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="date" tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} />
                    <Tooltip contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }} />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke="#0ea5e9"
                      strokeWidth={3}
                      name="Documents"
                      dot={false}
                      isAnimationActive={true}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Detailed Stats Section */}
            <div className="report-section border-l-4 border-primary-500">
              <h2 className="report-title">Statistiques détaillées</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {/* By Status */}
                <div className="card p-6">
                  <h4 className="text-lg font-bold text-secondary-900 mb-4">Par statut</h4>
                  <ul className="space-y-3">
                    {Object.entries(stats.status_stats).map(([key, value]: [string, unknown]) => (
                      <li key={key} className="flex justify-between items-center p-3 bg-secondary-50 rounded-lg hover:bg-secondary-100 transition-colors">
                        <span className="text-secondary-700 font-medium">{key}:</span>
                        <span className="badge badge-primary">{typeof value === 'number' ? value : 0}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Validation Stats */}
                <div className="card p-6">
                  <h4 className="text-lg font-bold text-secondary-900 mb-4">Validation</h4>
                  <ul className="space-y-3">
                    <li className="flex justify-between items-center p-3 bg-success-50 rounded-lg hover:bg-success-100 transition-colors">
                      <span className="text-success-700 font-medium">Validés:</span>
                      <span className="badge badge-success">{stats.validation_stats.PASSED}</span>
                    </li>
                    <li className="flex justify-between items-center p-3 bg-error-50 rounded-lg hover:bg-error-100 transition-colors">
                      <span className="text-error-700 font-medium">Échoués:</span>
                      <span className="badge badge-error">{stats.validation_stats.FAILED}</span>
                    </li>
                    <li className="flex justify-between items-center p-3 bg-warning-50 rounded-lg hover:bg-warning-100 transition-colors">
                      <span className="text-warning-700 font-medium">Avertissements:</span>
                      <span className="badge badge-warning">{stats.validation_stats.WARNING}</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Top Users Section */}
            <div className="report-section border-l-4 border-accent-500 mt-8">
              <h2 className="report-title flex items-center gap-2">
                <Users size={24} /> Top 10 utilisateurs
              </h2>
              <div className="card p-6">
                <div className="space-y-2">
                  {stats.users_stats.map((user: any, index: number) => (
                    <div key={user.agent__id} className="flex items-center justify-between p-4 bg-gradient-to-r from-secondary-50 to-transparent rounded-lg hover:from-primary-50 transition-colors group">
                      <div className="flex items-center gap-4">
                        <span className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 text-white flex items-center justify-center font-bold text-sm">
                          {index + 1}
                        </span>
                        <span className="font-medium text-secondary-900">{user.agent__matricule}</span>
                      </div>
                      <span className="badge badge-primary group-hover:scale-110 transition-transform">
                        {user.count} documents
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

            
export default Reports;
