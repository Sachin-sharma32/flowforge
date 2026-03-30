export declare const ExecutionStatus: {
    readonly PENDING: "pending";
    readonly RUNNING: "running";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
    readonly CANCELLED: "cancelled";
};
export type ExecutionStatusValue = (typeof ExecutionStatus)[keyof typeof ExecutionStatus];
export declare const StepStatus: {
    readonly PENDING: "pending";
    readonly RUNNING: "running";
    readonly COMPLETED: "completed";
    readonly FAILED: "failed";
    readonly SKIPPED: "skipped";
};
export type StepStatusValue = (typeof StepStatus)[keyof typeof StepStatus];
export declare const WorkflowStatus: {
    readonly DRAFT: "draft";
    readonly ACTIVE: "active";
    readonly PAUSED: "paused";
    readonly ARCHIVED: "archived";
};
export type WorkflowStatusValue = (typeof WorkflowStatus)[keyof typeof WorkflowStatus];
