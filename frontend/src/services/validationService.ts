/**
 * Validation Service - Validation des documents avant upload
 * 
 * Valide:
 * - Structure Excel (colonnes requises, feuilles)
 * - Contenu Excel (types, lignes)
 * - Documents PDF/Word
 * - Métadonnées fichier
 */

import { apiClient } from './api'

export interface ValidationResult {
  is_valid: boolean
  status: 'PASSED' | 'FAILED' | 'WARNING'
  errors: ValidationError[]
  warnings: ValidationWarning[]
  details?: Record<string, any>
}

export interface ValidationError {
  code: string
  field?: string
  message: string
  severity: 'ERROR' | 'CRITICAL'
}

export interface ValidationWarning {
  code: string
  field?: string
  message: string
}

export interface FileValidationRequest {
  file: File
  documentType: string
  specificationId?: number
}

export interface ExcelStructure {
  sheets: string[]
  activeSheet: string
  requiredSheets?: string[]
  columns?: Record<string, string[]>
}

export interface ExcelPreview {
  headers: string[]
  rows: Record<string, any>[]
  totalRows: number
  sheetName: string
}

class ValidationService {
  /**
   * Validate file structure and content
   */
  async validateFile(file: File, documentType: string): Promise<ValidationResult> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', documentType)

      const response = await apiClient.post<ValidationResult>(
        '/documents/validate/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      return response.data
    } catch (error) {
      console.error('Erreur validation fichier:', error)
      throw error
    }
  }

  /**
   * Validate Excel file structure
   */
  async validateExcelStructure(file: File): Promise<ExcelStructure> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiClient.post<ExcelStructure>(
        '/documents/validate-excel-structure/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      return response.data
    } catch (error) {
      console.error('Erreur validation structure Excel:', error)
      throw error
    }
  }

  /**
   * Get Excel file preview
   */
  async getExcelPreview(file: File, sheetName?: string): Promise<ExcelPreview> {
    try {
      const formData = new FormData()
      formData.append('file', file)
      if (sheetName) {
        formData.append('sheet_name', sheetName)
      }

      const response = await apiClient.post<ExcelPreview>(
        '/documents/excel-preview/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      return response.data
    } catch (error) {
      console.error('Erreur preview Excel:', error)
      throw error
    }
  }

  /**
   * Validate PDF file
   */
  async validatePDF(file: File): Promise<ValidationResult> {
    try {
      const formData = new FormData()
      formData.append('file', file)

      const response = await apiClient.post<ValidationResult>(
        '/documents/validate-pdf/',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      )
      return response.data
    } catch (error) {
      console.error('Erreur validation PDF:', error)
      throw error
    }
  }

  /**
   * Client-side file size validation
   */
  validateFileSize(file: File, maxSizeMB: number = 50): boolean {
    const maxSizeBytes = maxSizeMB * 1024 * 1024
    return file.size <= maxSizeBytes
  }

  /**
   * Client-side file type validation
   */
  validateFileType(file: File, allowedTypes: string[]): boolean {
    const fileType = file.type
    const fileExt = file.name.split('.').pop()?.toLowerCase()
    
    return (
      allowedTypes.some(type => fileType.includes(type)) ||
      allowedTypes.includes(fileExt || '')
    )
  }

  /**
   * Get validation result details
   */
  async getValidationResultDetails(documentId: number): Promise<ValidationResult> {
    try {
      const response = await apiClient.get<ValidationResult>(
        `/documents/${documentId}/validation-result/`
      )
      return response.data
    } catch (error) {
      console.error(`Erreur détails validation doc ${documentId}:`, error)
      throw error
    }
  }

  /**
   * Retry validation after fixes
   */
  async retryValidation(documentId: number): Promise<ValidationResult> {
    try {
      const response = await apiClient.post<ValidationResult>(
        `/documents/${documentId}/retry-validation/`
      )
      return response.data
    } catch (error) {
      console.error(`Erreur retry validation doc ${documentId}:`, error)
      throw error
    }
  }

  /**
   * Format validation errors for display
   */
  formatErrors(errors: ValidationError[]): string[] {
    return errors.map(err => {
      const field = err.field ? `[${err.field}] ` : ''
      return `${field}${err.message}`
    })
  }

  /**
   * Format validation warnings for display
   */
  formatWarnings(warnings: ValidationWarning[]): string[] {
    return warnings.map(warn => {
      const field = warn.field ? `[${warn.field}] ` : ''
      return `${field}${warn.message}`
    })
  }
}

export const validationService = new ValidationService()
