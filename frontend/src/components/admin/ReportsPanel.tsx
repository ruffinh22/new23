import React from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface ReportsPanelProps {
  data: Array<{
    name: string
    documents: number
    approved: number
    rejected: number
    pending: number
  }>
  title?: string
}

export const ReportsPanel: React.FC<ReportsPanelProps> = ({
  data,
  title = 'Document Status Report',
}) => {
  return (
    <div className="card p-6">
      <h2 className="text-xl font-bold text-gray-900 mb-6">{title}</h2>

      {data.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No data available
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="documents" fill="#3b82f6" />
            <Bar dataKey="approved" fill="#10b981" />
            <Bar dataKey="rejected" fill="#ef4444" />
            <Bar dataKey="pending" fill="#f59e0b" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}
