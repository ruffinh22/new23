/**
 * Index des Services
 * Exporte tous les services API
 */

// Core API
export { apiClient, default } from './api';

// Authentication & Users
export { authService } from './authService';
export { userService } from './userService';

// Documents & Validation
export { documentService } from './documentService';
export { validationService } from './validationService';
export { documentTransferService } from './documentTransferService';
export { auditService } from './auditService';

// Organization Hierarchy
export { folderService } from './folderService';
export { departmentService } from './departmentService';
export { branchService } from './branchService';

// Tasks & Workflows
export { tasksService } from './tasksService';

// Configuration & Metadata
export { documentTypeService } from './documentTypeService';
export { statusService } from './statusService';

// Notifications & Reports
export { notificationService } from './notificationService';
export { reportsService } from './reportsService';
export { dashboardService } from './dashboardService';

// WebSocket
export { wsService as websocketService } from './websocketService';
