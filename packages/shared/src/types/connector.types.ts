export type ConnectorType =
  | 'google_calendar'
  | 'slack_message'
  | 'notion'
  | 'gmail'
  | 'google_drive'
  | 'send_email'
  | 'http_request';

export type ConnectorStatus = 'connected' | 'error' | 'disconnected';

export interface IConnector {
  id: string;
  workspaceId: string;
  type: ConnectorType;
  name: string;
  accountLabel?: string;
  status: ConnectorStatus;
  usedByWorkflows: number;
  createdBy?: string;
  createdAt: string;
  updatedAt: string;
}
