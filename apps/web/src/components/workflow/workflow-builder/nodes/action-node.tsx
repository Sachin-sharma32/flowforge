'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Globe, Mail, MessageSquare, Timer, Shuffle } from 'lucide-react';

const actionIcons: Record<string, React.ElementType> = {
  http_request: Globe,
  send_email: Mail,
  slack_message: MessageSquare,
  delay: Timer,
  transform: Shuffle,
};

function ActionNode({ data, selected }: NodeProps) {
  const Icon = actionIcons[(data as any).stepType] || Globe;

  return (
    <div
      className={`rounded-lg border-2 bg-card px-4 py-3 shadow-sm transition-colors ${
        selected ? 'border-primary shadow-md' : 'border-blue-400'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-blue-500" />
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-blue-100 dark:bg-blue-900">
          <Icon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-blue-600 dark:text-blue-400">
            {((data as any).stepType || '').replace('_', ' ').toUpperCase()}
          </p>
          <p className="text-sm font-semibold">{(data as any).label}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-blue-500" />
    </div>
  );
}

export default memo(ActionNode);
