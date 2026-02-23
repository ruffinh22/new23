/**
 * Dashboard Statistics Charts Component
 * Affiche les graphiques et statistiques détaillées
 */

import React from 'react'
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { DashboardStats } from '@/services/dashboardService'
import { Activity, Zap } from 'lucide-react'

interface DashboardChartsProps {
  stats: DashboardStats | null
  isLoading?: boolean
}

export const DashboardCharts: React.FC<DashboardChartsProps> = ({ stats, isLoading = false }) => {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-6 h-80 bg-secondary-50 animate-pulse rounded-lg" />
        <div className="card p-6 h-80 bg-secondary-50 animate-pulse rounded-lg" />
      </div>
    )
  }

  if (!stats) {
    return null
  }

  // Data for status distribution chart
  const statusData = [
    { name: 'Approuvés', value: stats.approvedDocuments, color: '#22c55e' },
    { name: 'En attente', value: stats.pendingDocuments, color: '#f59e0b' },
    { name: 'En cours', value: stats.inProgressDocuments, color: '#3b82f6' },
    { name: 'Rejetés', value: stats.rejectedDocuments, color: '#ef4444' },
  ]

  // Data for documents trend (mock data)
  const trendData = [
    { day: 'Lun', count: Math.floor(stats.totalDocuments * 0.15) },
    { day: 'Mar', count: Math.floor(stats.totalDocuments * 0.18) },
    { day: 'Mer', count: Math.floor(stats.totalDocuments * 0.12) },
    { day: 'Jeu', count: Math.floor(stats.totalDocuments * 0.2) },
    { day: 'Ven', count: Math.floor(stats.totalDocuments * 0.25) },
    { day: 'Sam', count: Math.floor(stats.totalDocuments * 0.1) },
  ]

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Status Distribution Pie Chart */}
      <div className="card">
        <div className="p-6 border-b border-secondary-200">
          <h3 className="text-lg font-semibold text-secondary-900 flex items-center gap-2">
            <Activity size={20} />
            Distribution des Statuts
          </h3>
        </div>
        <div className="p-6 flex justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={statusData.filter((d) => d.value > 0)}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, value, percent }) => `${name}: ${value} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {statusData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value} documents`} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Documents Trend Bar Chart */}
      <div className="card">
        <div className="p-6 border-b border-secondary-200">
          <h3 className="text-lg font-semibold text-secondary-900 flex items-center gap-2">
            <Zap size={20} />
            Activité hebdomadaire
          </h3>
        </div>
        <div className="p-6 flex justify-center">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={trendData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
              <XAxis dataKey="day" stroke="#64748b" />
              <YAxis stroke="#64748b" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '8px',
                }}
                formatter={(value) => [`${value} documents`, 'Traités']}
              />
              <Bar dataKey="count" fill="#E30613" radius={[8, 8, 0, 0]} name="Documents traités" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}
