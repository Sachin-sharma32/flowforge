'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { Webhook, Clock, MousePointer } from 'lucide-react';

const triggerIcons: Record<string, React.ElementType> = {
  webhook: Webhook,
  cron: Clock,
  manual: MousePointer,
};

function TriggerNode({ data, selected }: NodeProps) {
  const Icon = triggerIcons[(data as any).triggerType] || MousePointer;

  return (
    <div
      className={`rounded-lg border-2 bg-card px-4 py-3 shadow-sm transition-colors ${
        selected ? 'border-primary shadow-md' : 'border-green-400'
      }`}
    >
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-green-100 dark:bg-green-900">
          <Icon className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-green-600 dark:text-green-400">TRIGGER</p>
          <p className="text-sm font-semibold">{(data as any).label}</p>
        </div>
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-green-500" />
    </div>
  );
}

export default memo(TriggerNode);
