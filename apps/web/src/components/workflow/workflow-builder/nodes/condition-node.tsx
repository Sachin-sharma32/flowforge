'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { GitBranch } from 'lucide-react';

function ConditionNode({ data, selected }: NodeProps) {
  return (
    <div
      className={`rounded-lg border-2 bg-card px-4 py-3 shadow-sm transition-colors ${
        selected ? 'border-primary shadow-md' : 'border-amber-400'
      }`}
    >
      <Handle type="target" position={Position.Top} className="!bg-amber-500" />
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-amber-100 dark:bg-amber-900">
          <GitBranch className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        </div>
        <div>
          <p className="text-xs font-medium text-amber-600 dark:text-amber-400">CONDITION</p>
          <p className="text-sm font-semibold">{(data as any).label}</p>
        </div>
      </div>
      <div className="mt-2 flex justify-between text-xs">
        <span className="text-green-600">True</span>
        <span className="text-red-500">False</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!bg-green-500"
        style={{ left: '30%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!bg-red-500"
        style={{ left: '70%' }}
      />
    </div>
  );
}

export default memo(ConditionNode);
