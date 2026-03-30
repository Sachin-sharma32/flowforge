export interface IApiResponse<T> {
    success: boolean;
    data: T;
}
export interface IApiErrorResponse {
    success: boolean;
    error: string;
    context?: Record<string, unknown>;
}
export interface IPaginatedResponse<T> {
    success: boolean;
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}
