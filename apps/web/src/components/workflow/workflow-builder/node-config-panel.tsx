'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { Node } from '@xyflow/react';

interface NodeConfigPanelProps {
  node: Node | null;
  onUpdate: (nodeId: string, data: Record<string, unknown>) => void;
  onClose: () => void;
}

export function NodeConfigPanel({ node, onUpdate, onClose }: NodeConfigPanelProps) {
  if (!node) return null;

  const data = node.data as Record<string, unknown>;
  const config = (data.config || {}) as Record<string, unknown>;
  const stepType = data.stepType as string;

  const updateConfig = (key: string, value: string) => {
    onUpdate(node.id, {
      ...data,
      config: { ...config, [key]: value },
    });
  };

  return (
    <div className="w-72 border-l bg-card p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Configure Node</h3>
        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-xs font-medium text-muted-foreground">Name</label>
          <Input
            value={(data.label as string) || ''}
            onChange={(e) => onUpdate(node.id, { ...data, label: e.target.value })}
            placeholder="Step name"
          />
        </div>

        {stepType === 'http_request' && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">URL</label>
              <Input
                value={(config.url as string) || ''}
                onChange={(e) => updateConfig('url', e.target.value)}
                placeholder="https://api.example.com/data"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Method</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={(config.method as string) || 'GET'}
                onChange={(e) => updateConfig('method', e.target.value)}
              >
                <option>GET</option>
                <option>POST</option>
                <option>PUT</option>
                <option>PATCH</option>
                <option>DELETE</option>
              </select>
            </div>
          </>
        )}

        {stepType === 'condition' && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Field</label>
              <Input
                value={(config.field as string) || ''}
                onChange={(e) => updateConfig('field', e.target.value)}
                placeholder="body.status"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Operator</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={(config.operator as string) || 'equals'}
                onChange={(e) => updateConfig('operator', e.target.value)}
              >
                <option value="equals">Equals</option>
                <option value="not_equals">Not Equals</option>
                <option value="contains">Contains</option>
                <option value="greater_than">Greater Than</option>
                <option value="less_than">Less Than</option>
                <option value="exists">Exists</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Value</label>
              <Input
                value={(config.value as string) || ''}
                onChange={(e) => updateConfig('value', e.target.value)}
                placeholder="Expected value"
              />
            </div>
          </>
        )}

        {stepType === 'send_email' && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">To</label>
              <Input
                value={(config.to as string) || ''}
                onChange={(e) => updateConfig('to', e.target.value)}
                placeholder="recipient@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Subject</label>
              <Input
                value={(config.subject as string) || ''}
                onChange={(e) => updateConfig('subject', e.target.value)}
                placeholder="Email subject"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Body</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={(config.body as string) || ''}
                onChange={(e) => updateConfig('body', e.target.value)}
                placeholder="Email body..."
              />
            </div>
          </>
        )}

        {stepType === 'slack_message' && (
          <>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Webhook URL</label>
              <Input
                value={(config.webhookUrl as string) || ''}
                onChange={(e) => updateConfig('webhookUrl', e.target.value)}
                placeholder="https://hooks.slack.com/..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-muted-foreground">Message</label>
              <textarea
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={(config.message as string) || ''}
                onChange={(e) => updateConfig('message', e.target.value)}
                placeholder="Slack message..."
              />
            </div>
          </>
        )}

        {stepType === 'delay' && (
          <div className="space-y-2">
            <label className="text-xs font-medium text-muted-foreground">Duration (seconds)</label>
            <Input
              type="number"
              value={((config.durationMs as number) || 1000) / 1000}
              onChange={(e) => updateConfig('durationMs', String(Number(e.target.value) * 1000))}
              placeholder="5"
              min={1}
              max={300}
            />
          </div>
        )}
      </div>
    </div>
  );
}
