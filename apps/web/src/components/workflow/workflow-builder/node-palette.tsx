'use client';

import { Globe, Mail, MessageSquare, Timer, Shuffle, GitBranch } from 'lucide-react';

const nodeTypes = [
  { type: 'http_request', label: 'HTTP Request', icon: Globe, color: 'blue', nodeType: 'action' },
  { type: 'condition', label: 'Condition', icon: GitBranch, color: 'amber', nodeType: 'condition' },
  { type: 'transform', label: 'Transform', icon: Shuffle, color: 'blue', nodeType: 'action' },
  { type: 'delay', label: 'Delay', icon: Timer, color: 'blue', nodeType: 'action' },
  { type: 'send_email', label: 'Send Email', icon: Mail, color: 'blue', nodeType: 'action' },
  { type: 'slack_message', label: 'Slack Message', icon: MessageSquare, color: 'blue', nodeType: 'action' },
];

interface NodePaletteProps {
  onAddNode: (type: string, stepType: string, label: string) => void;
}

export function NodePalette({ onAddNode }: NodePaletteProps) {
  return (
    <div className="w-56 border-r bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold text-muted-foreground">ACTIONS</h3>
      <div className="space-y-2">
        {nodeTypes.map((node) => (
          <button
            key={node.type}
            className="flex w-full items-center gap-2 rounded-lg border p-2.5 text-left transition-colors hover:bg-accent"
            onClick={() => onAddNode(node.nodeType, node.type, node.label)}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('application/flowforge-node', JSON.stringify(node));
            }}
          >
            <node.icon className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{node.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
