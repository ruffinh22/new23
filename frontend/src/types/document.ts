/**
 * Document Types
 * Définit les interfaces pour les documents et workflows
 */

import type { User } from './auth'

export type { User }
export type DocumentStatus = 'NOUVEAU' | 'EN_COURS' | 'VALIDE' | 'REJETE' | 'ARCHIVE';

export interface Folder {
  id: string | number;
  name: string;
  parent_id?: string | number | null;
  parent?: string | number | null;
  description?: string;
  folder_type?: 'pole' | 'filiale' | 'service' | 'sub_service' | 'branch' | 'department' | 'section';
  code?: string;
  country_code?: string;
  full_path?: string;
  level?: number;
  auto_type?: string;
  created_by_id?: string;
  created_by_name?: string;
  created_at: Date;
  updated_at: Date;
  is_active: boolean;
  children?: Folder[];
}

export interface DocumentSpecification {
  id: string;
  document_type: string;
  display_name: string;
  description?: string;
  allowed_formats: string[];
  requires_excel: boolean;
  excel_sheet_name?: string;
  required_columns?: string[];
  max_file_size_mb: number;
  max_rows?: number;
  is_active: boolean;
  requires_validation: boolean;
  created_at: string;
  updated_at: string;
}

export interface Document {
  id: string;
  title: string;
  file: string;
  document_type: string;
  description?: string;
  agent?: (User | string) | null;
  folder_id?: string;
  specification_id?: string;
  status: DocumentStatus;
  created_at: Date | string;
  opened_at?: Date | string | null;
  accepted_at?: Date | string | null;
  rejected_at?: Date | string | null;
  archived_at?: Date | string | null;
  rejection_reason?: string;
  file_size: number;
  mime_type: string;
  file_format: string;
  excel_sheet_name?: string;
  excel_row_count: number;
  excel_column_count: number;
  routed_automatically: boolean;
  routing_rule_applied_id?: string;
  updated_at: Date | string;
}

export interface DocumentValidationResult {
  id: string;
  document_id: string;
  status: 'PASSED' | 'FAILED' | 'WARNING';
  errors: string[];
  warnings: string[];
  validation_details: Record<string, any>;
  validated_at: string;
}

export interface WorkflowStep {
  id: string;
  document_id: string;
  step_order: number;
  approver_id: string;
  approver_name: string;
  status: 'pending' | 'approved' | 'rejected';
  comment?: string;
  created_at: string;
  completed_at?: string;
  due_date?: string;
}

export interface RoutingRule {
  id: string;
  name: string;
  description?: string;
  conditions: Record<string, any>;
  destination_folder_id: string;
  priority: number;
  is_active: boolean;
  times_applied: number;
  last_applied?: Date | null;
  created_by_id?: string;
  created_at: Date;
  updated_at: Date;
}

export interface Notification {
  id: string;
  recipient_id: string;
  document_id?: string | null;
  notification_type: 'UPLOAD' | 'VALIDATION' | 'REJECTION' | 'COMMENT' | 'ROUTING' | 'SYSTEM';
  title: string;
  message: string;
  is_read: boolean;
  read_at?: Date | null;
  created_at: Date;
}
// API Response Types
export interface DocumentListResponse {
  results: Document[]
  count: number
  next?: string
  previous?: string
}

export interface DocumentCreateRequest {
  title: string
  description?: string
  folder_id?: string
  document_type: string
}

export interface DocumentUpdateRequest {
  title?: string
  description?: string
  folder_id?: string
}

export interface WorkflowTimeline {
  document_id: string
  current_step: number
  total_steps: number
  steps: WorkflowStep[]
}

export type DocumentTransferType = 
  | 'AUTO_ROUTING' 
  | 'MANUAL_TRANSFER' 
  | 'CROSS_POLE' 
  | 'CROSS_FILIALE' 
  | 'CROSS_SERVICE' 
  | 'COMPLIANCE_MOVE' 
  | 'OTHER';

export interface DocumentTransfer {
  id: string | number;
  document: string | number;
  document_name: string;
  from_folder: string | number | null;
  from_folder_name: string | null;
  to_folder: string | number;
  to_folder_name: string;
  transferred_by: string | number | null;
  transferred_by_name: string | null;
  transfer_type: DocumentTransferType;
  transfer_type_display: string;
  reason: string;
  transferred_at: string;
  notes: string;
}

export interface DocumentTransferRequest {
  to_folder_id: string | number;
  transfer_type?: DocumentTransferType;
  reason?: string;
}

export interface DocumentTransferListResponse {
  results: DocumentTransfer[];
  count: number;
  next?: string;
  previous?: string;
}