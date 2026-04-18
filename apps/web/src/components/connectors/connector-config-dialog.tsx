'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { TypographyMuted, TypographySmall } from '@/components/ui/typography';
import { toast } from 'sonner';

export interface ConnectorField {
  key: string;
  label: string;
  placeholder: string;
  type?: 'text' | 'password';
  required?: boolean;
}

export interface ConnectorDefinition {
  name: string;
  type: string;
  color: string;
  description: string;
  fields: ConnectorField[];
}

const STORAGE_KEY = 'flowforge.connector_configs';

function readStoredConfigs(): Record<string, Record<string, string>> {
  if (typeof window === 'undefined') return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeStoredConfigs(configs: Record<string, Record<string, string>>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
}

export const CONNECTOR_DEFINITIONS: ConnectorDefinition[] = [
  {
    name: 'Google Calendar',
    type: 'google_calendar',
    color: 'bg-primary',
    description: 'Connect your Google Calendar to create and manage events.',
    fields: [
      { key: 'clientId', label: 'Client ID', placeholder: 'Google OAuth Client ID' },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        placeholder: 'Google OAuth Client Secret',
        type: 'password',
      },
      {
        key: 'refreshToken',
        label: 'Refresh Token',
        placeholder: 'OAuth Refresh Token',
        type: 'password',
      },
    ],
  },
  {
    name: 'Slack',
    type: 'slack_message',
    color: 'bg-primary-container',
    description: 'Send messages and notifications to Slack channels.',
    fields: [
      {
        key: 'botToken',
        label: 'Bot Token',
        placeholder: 'xoxb-...',
        type: 'password',
        required: true,
      },
      { key: 'defaultChannel', label: 'Default Channel', placeholder: '#general' },
    ],
  },
  {
    name: 'Notion',
    type: 'notion',
    color: 'bg-on-surface-variant',
    description: 'Read and write Notion databases and pages.',
    fields: [
      {
        key: 'apiKey',
        label: 'Integration Token',
        placeholder: 'ntn_...',
        type: 'password',
        required: true,
      },
      { key: 'defaultDatabase', label: 'Default Database ID', placeholder: 'Database UUID' },
    ],
  },
  {
    name: 'Gmail',
    type: 'gmail',
    color: 'bg-secondary',
    description: 'Send, read, and manage Gmail messages.',
    fields: [
      { key: 'clientId', label: 'Client ID', placeholder: 'Google OAuth Client ID' },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        placeholder: 'Google OAuth Client Secret',
        type: 'password',
      },
      {
        key: 'refreshToken',
        label: 'Refresh Token',
        placeholder: 'OAuth Refresh Token',
        type: 'password',
      },
    ],
  },
  {
    name: 'Google Drive',
    type: 'google_drive',
    color: 'bg-tertiary',
    description: 'Upload, download, and manage Google Drive files.',
    fields: [
      { key: 'clientId', label: 'Client ID', placeholder: 'Google OAuth Client ID' },
      {
        key: 'clientSecret',
        label: 'Client Secret',
        placeholder: 'Google OAuth Client Secret',
        type: 'password',
      },
      {
        key: 'refreshToken',
        label: 'Refresh Token',
        placeholder: 'OAuth Refresh Token',
        type: 'password',
      },
    ],
  },
  {
    name: 'Email (SMTP)',
    type: 'send_email',
    color: 'bg-muted-foreground',
    description: 'Send emails via custom SMTP server.',
    fields: [
      { key: 'smtpHost', label: 'SMTP Host', placeholder: 'smtp.example.com', required: true },
      { key: 'smtpPort', label: 'SMTP Port', placeholder: '587' },
      { key: 'smtpUser', label: 'Username', placeholder: 'user@example.com' },
      { key: 'smtpPass', label: 'Password', placeholder: 'Password', type: 'password' },
    ],
  },
  {
    name: 'HTTP Request',
    type: 'http_request',
    color: 'bg-accent',
    description: 'Make custom HTTP/API requests to any endpoint.',
    fields: [
      { key: 'baseUrl', label: 'Base URL', placeholder: 'https://api.example.com' },
      {
        key: 'defaultHeaders',
        label: 'Default Headers (JSON)',
        placeholder: '{"Authorization": "Bearer ..."}',
      },
    ],
  },
];

export function getConnectorStatus(type: string): 'connected' | 'not_configured' {
  const configs = readStoredConfigs();
  const config = configs[type];
  if (!config) return 'not_configured';
  const def = CONNECTOR_DEFINITIONS.find((d) => d.type === type);
  if (!def) return 'not_configured';
  const requiredFields = def.fields.filter((f) => f.required);
  if (requiredFields.length === 0) {
    return Object.values(config).some((v) => v.trim()) ? 'connected' : 'not_configured';
  }
  return requiredFields.every((f) => config[f.key]?.trim()) ? 'connected' : 'not_configured';
}

interface ConnectorConfigDialogProps {
  connector: ConnectorDefinition | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ConnectorConfigDialog({
  connector,
  open,
  onOpenChange,
}: ConnectorConfigDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (connector && open) {
      const configs = readStoredConfigs();
      const stored = configs[connector.type] || {};
      const initial: Record<string, string> = {};
      for (const field of connector.fields) {
        initial[field.key] = stored[field.key] || '';
      }
      setValues(initial);
    }
  }, [connector, open]);

  if (!connector) return null;

  const status = getConnectorStatus(connector.type);

  const handleSave = () => {
    const configs = readStoredConfigs();
    configs[connector.type] = { ...values };
    writeStoredConfigs(configs);
    toast.success(`${connector.name} configuration saved`);
    onOpenChange(false);
  };

  const handleDisconnect = () => {
    const configs = readStoredConfigs();
    delete configs[connector.type];
    writeStoredConfigs(configs);
    setValues({});
    toast.success(`${connector.name} disconnected`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className={`h-3 w-3 rounded-full ${connector.color}`} />
            {connector.name}
            <Badge variant={status === 'connected' ? 'success' : 'secondary'}>
              {status === 'connected' ? 'Connected' : 'Not configured'}
            </Badge>
          </DialogTitle>
          <DialogDescription>{connector.description}</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          {connector.fields.map((field) => (
            <div key={field.key} className="space-y-1.5">
              <TypographySmall className="font-medium">
                {field.label}
                {field.required && <span className="text-destructive ml-1">*</span>}
              </TypographySmall>
              <Input
                type={field.type || 'text'}
                placeholder={field.placeholder}
                value={values[field.key] || ''}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        <TypographyMuted className="text-xs">
          Configuration is stored locally in your browser. For production, these credentials should
          be stored server-side.
        </TypographyMuted>

        <DialogFooter>
          {status === 'connected' && (
            <Button variant="outline" onClick={handleDisconnect}>
              Disconnect
            </Button>
          )}
          <Button onClick={handleSave}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
