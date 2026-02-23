import { apiClient } from './api'

export interface Template {
  id: number
  name: string
  description: string
  template_type: string
  type_display: string
  visibility: string
  visibility_display: string
  file_type: string
  file_size: number
  downloads_count: number
  created_by_name: string
  is_active: boolean
  version: number
  created_at: string
  updated_at: string
  file_url?: string
  departments?: number[]
  allowed_users?: number[]
}

export interface TemplateVersion {
  id: number
  version_number: number
  changelog: string
  created_at: string
  created_by_name: string
}

export interface DownloadLog {
  id: number
  user_name: string
  downloaded_at: string
  ip_address: string
}

export const templateService = {
  // List all templates available to user
  async getTemplates(filters?: {
    search?: string
    template_type?: string
    visibility?: string
    is_active?: boolean
  }) {
    const params = new URLSearchParams()
    if (filters?.search) params.append('search', filters.search)
    if (filters?.template_type) params.append('template_type', filters.template_type)
    if (filters?.visibility) params.append('visibility', filters.visibility)
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active))

    const response = await apiClient.get('/documents/templates/', { params })
    return Array.isArray(response.data) ? response.data : response.data?.results || []
  },

  // Get single template details
  async getTemplate(id: number) {
    const response = await apiClient.get(`/documents/templates/${id}/`)
    return response.data
  },

  // Get templates created by current user
  async getMyTemplates() {
    const response = await apiClient.get('/documents/templates/my_templates/')
    return Array.isArray(response.data) ? response.data : response.data?.results || []
  },

  // Get templates for a specific department
  async getTemplatesByDepartment(departmentId: number) {
    const response = await apiClient.get('/documents/templates/by_department/', {
      params: { department_id: departmentId }
    })
    return Array.isArray(response.data) ? response.data : response.data?.results || []
  },

  // Create new template
  async createTemplate(data: {
    name: string
    description?: string
    template_type: string
    visibility: string
    departments?: number[]
    allowed_users?: number[]
    file: File
  }) {
    const formData = new FormData()
    formData.append('name', data.name)
    if (data.description) formData.append('description', data.description)
    formData.append('template_type', data.template_type)
    formData.append('visibility', data.visibility)
    formData.append('file', data.file)

    if (data.departments) {
      data.departments.forEach(deptId => {
        formData.append('departments', String(deptId))
      })
    }

    if (data.allowed_users) {
      data.allowed_users.forEach(userId => {
        formData.append('allowed_users', String(userId))
      })
    }

    const response = await apiClient.post('/documents/templates/', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
    return response.data
  },

  // Update template
  async updateTemplate(id: number, data: Partial<Template>) {
    const response = await apiClient.patch(`/documents/templates/${id}/`, data)
    return response.data
  },

  // Delete template
  async deleteTemplate(id: number) {
    await apiClient.delete(`/documents/templates/${id}/`)
  },

  // Download template file
  async downloadTemplate(id: number) {
    const response = await apiClient.get(`/documents/templates/${id}/download/`, {
      responseType: 'blob'
    })
    return response.data
  },

  // Get template preview
  async previewTemplate(id: number) {
    const response = await apiClient.get(`/documents/templates/${id}/preview/`)
    return response.data
  },

  // Get template versions
  async getTemplateVersions(id: number) {
    const response = await apiClient.get(`/documents/templates/${id}/versions/`)
    return Array.isArray(response.data) ? response.data : response.data?.results || []
  },

  // Restore previous version
  async restoreTemplateVersion(id: number, versionId: number) {
    const response = await apiClient.post(
      `/documents/templates/${id}/restore_version/`,
      { version_id: versionId }
    )
    return response.data
  },

  // Get download history
  async getDownloadHistory(id: number, limit: number = 100) {
    const response = await apiClient.get(
      `/documents/templates/${id}/download_history/`,
      { params: { limit } }
    )
    return response.data
  },

  // Get template statistics (admin only)
  async getTemplateStatistics() {
    const response = await apiClient.get('/documents/templates/statistics/')
    return response.data
  },

  // Helper: Save file to disk
  saveFile(blob: Blob, filename: string) {
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', filename)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  },

  // Helper: Download template with auto filename
  async downloadTemplateFile(template: Template) {
    const blob = await this.downloadTemplate(template.id)
    const ext = template.file_type?.toLowerCase() || 'docx'
    const filename = `${template.name}.${ext}`
    this.saveFile(blob, filename)
  }
}
