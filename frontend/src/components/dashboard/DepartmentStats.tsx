/**
 * Department Stats Component
 * Affiche les statistiques par département
 */

import React from 'react'
import { Building2 } from 'lucide-react'
import { DepartmentStats } from '@/services/dashboardService'

interface DepartmentStatsComponentProps {
  departments: DepartmentStats[]
  isLoading?: boolean
}

export const DepartmentStatsComponent: React.FC<DepartmentStatsComponentProps> = ({
  departments,
  isLoading = false,
}) => {
  if (isLoading) {
    return (
      <div className="card">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-6 flex items-center gap-2">
            <Building2 size={20} />
            Statistiques par Département
          </h3>
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 bg-secondary-100 rounded-lg animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (departments.length === 0) {
    return (
      <div className="card">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-secondary-900 mb-6 flex items-center gap-2">
            <Building2 size={20} />
            Statistiques par Département
          </h3>
          <p className="text-center text-secondary-600 py-8">Aucun département avec documents</p>
        </div>
      </div>
    )
  }

  return (
    <div className="card">
      <div className="p-6">
        <h3 className="text-lg font-semibold text-secondary-900 mb-6 flex items-center gap-2">
          <Building2 size={20} />
          Statistiques par Département
        </h3>

        <div className="space-y-4">
          {departments.map((dept, idx) => (
            <div
              key={idx}
              className="p-4 border border-secondary-200 rounded-lg hover:border-primary-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-secondary-900">{dept.name}</p>
                  <p className="text-sm text-secondary-600 mt-1">
                    {dept.documentCount} document{dept.documentCount > 1 ? 's' : ''}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-primary-600">{dept.approvalRate}%</p>
                  <p className="text-xs text-secondary-600">Taux d'approbation</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-secondary-200 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-success-500 to-success-600 h-full transition-all duration-500"
                  style={{ width: `${dept.approvalRate}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
