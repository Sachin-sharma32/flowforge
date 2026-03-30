"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WorkflowStatus = exports.StepStatus = exports.ExecutionStatus = void 0;
exports.ExecutionStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    CANCELLED: 'cancelled',
};
exports.StepStatus = {
    PENDING: 'pending',
    RUNNING: 'running',
    COMPLETED: 'completed',
    FAILED: 'failed',
    SKIPPED: 'skipped',
};
exports.WorkflowStatus = {
    DRAFT: 'draft',
    ACTIVE: 'active',
    PAUSED: 'paused',
    ARCHIVED: 'archived',
};
//# sourceMappingURL=execution-statuses.js.map