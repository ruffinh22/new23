import React from 'react'
import { Input, Button } from '@/components/common'

interface DocumentFilterProps {
  onFilter: (filters: FilterOptions) => void
  isLoading?: boolean
}

export interface FilterOptions {
  search?: string
  fileType?: string
  status?: string
  dateFrom?: string
  dateTo?: string
}

// Document status options (matching constants)
const DOCUMENT_STATUSES = [
  { value: 'draft', label: 'Draft' },
  { value: 'pending_review', label: 'Pending Review' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'published', label: 'Published' },
]

// File types
const FILE_TYPES = [
  { value: 'pdf', label: 'PDF' },
  { value: 'docx', label: 'Word' },
  { value: 'xlsx', label: 'Excel' },
  { value: 'csv', label: 'CSV' },
  { value: 'txt', label: 'Text' },
]

export const DocumentFilter: React.FC<DocumentFilterProps> = ({
  onFilter,
  isLoading = false,
}) => {
  const [filters, setFilters] = React.useState<FilterOptions>({})

  const handleChange = (key: keyof FilterOptions, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onFilter(filters)
  }

  const handleReset = () => {
    setFilters({})
    onFilter({})
  }

  return (
    <form onSubmit={handleSubmit} className="card p-6 mb-6">
      <h3 className="text-lg font-bold text-gray-900 mb-4">Filters</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        <Input
          placeholder="Search documents..."
          value={filters.search || ''}
          onChange={(e) => handleChange('search', e.target.value)}
        />

        <select
          value={filters.fileType || ''}
          onChange={(e) => handleChange('fileType', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All File Types</option>
          {FILE_TYPES.map((type) => (
            <option key={type.value} value={type.value}>
              {type.label}
            </option>
          ))}
        </select>

        <select
          value={filters.status || ''}
          onChange={(e) => handleChange('status', e.target.value)}
          className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          {DOCUMENT_STATUSES.map((status) => (
            <option key={status.value} value={status.value}>
              {status.label}
            </option>
          ))}
        </select>

        <Input
          type="date"
          label="From Date"
          value={filters.dateFrom || ''}
          onChange={(e) => handleChange('dateFrom', e.target.value)}
        />

        <Input
          type="date"
          label="To Date"
          value={filters.dateTo || ''}
          onChange={(e) => handleChange('dateTo', e.target.value)}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="secondary"
          onClick={handleReset}
          disabled={isLoading}
        >
          Reset
        </Button>
        <Button type="submit" disabled={isLoading}>
          Apply Filters
        </Button>
      </div>
    </form>
  )
}
