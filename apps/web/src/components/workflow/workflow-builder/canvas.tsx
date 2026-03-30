'use client';

import { useCallback, useState, useRef, useMemo } from 'react';
import {
  ReactFlow,
  addEdge,
  useNodesState,
  useEdgesState,
  Controls,
  Background,
  BackgroundVariant,
  type Connection,
  type Edge,
  type Node,
  type NodeTypes,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { v4 as uuidv4 } from 'uuid';
import TriggerNode from './nodes/trigger-node';
import ActionNode from './nodes/action-node';
import ConditionNode from './nodes/condition-node';
import { NodePalette } from './node-palette';
import { NodeConfigPanel } from './node-config-panel';
import { Button } from '@/components/ui/button';
import { Save } from 'lucide-react';

interface CanvasProps {
  workflow: {
    trigger: { type: string; config: Record<string, unknown> };
    steps: Array<{
      id: string;
      type: string;
      name: string;
      config: Record<string, unknown>;
      position: { x: number; y: number };
      connections: Array<{ targetStepId: string; label: string }>;
    }>;
  };
  onSave: (steps: unknown[]) => Promise<void>;
}

export function Canvas({ workflow, onSave }: CanvasProps) {
  const nodeTypes: NodeTypes = useMemo(
    () => ({
      trigger: TriggerNode,
      action: ActionNode,
      condition: ConditionNode,
    }),
    [],
  );

  // Build initial nodes from workflow data
  const initialNodes: Node[] = [
    {
      id: 'trigger',
      type: 'trigger',
      position: { x: 300, y: 50 },
      data: { label: `${workflow.trigger.type} Trigger`, triggerType: workflow.trigger.type },
      deletable: false,
    },
    ...workflow.steps.map((step) => ({
      id: step.id,
      type: step.type === 'condition' ? 'condition' : 'action',
      position: step.position,
      data: {
        label: step.name,
        stepType: step.type,
        config: step.config,
      },
    })),
  ];

  // Build initial edges from connections
  const initialEdges: Edge[] = [];

  // Add edges from trigger to first steps (steps not targeted by any connection)
  const targetedSteps = new Set<string>();
  workflow.steps.forEach((s) => s.connections.forEach((c) => targetedSteps.add(c.targetStepId)));
  workflow.steps.forEach((step) => {
    if (!targetedSteps.has(step.id)) {
      initialEdges.push({
        id: `trigger-${step.id}`,
        source: 'trigger',
        target: step.id,
        animated: true,
      });
    }
    step.connections.forEach((conn) => {
      initialEdges.push({
        id: `${step.id}-${conn.targetStepId}`,
        source: step.id,
        sourceHandle: step.type === 'condition' ? conn.label : undefined,
        target: conn.targetStepId,
        label: step.type === 'condition' ? conn.label : undefined,
        animated: true,
      });
    });
  });

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const reactFlowWrapper = useRef<HTMLDivElement>(null);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true }, eds)),
    [setEdges],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      if (node.id !== 'trigger') {
        setSelectedNode(node);
      }
    },
    [],
  );

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  const handleAddNode = useCallback(
    (nodeType: string, stepType: string, label: string) => {
      const newNode: Node = {
        id: uuidv4(),
        type: nodeType,
        position: { x: 300, y: (nodes.length + 1) * 150 },
        data: {
          label,
          stepType,
          config: {},
        },
      };
      setNodes((nds) => [...nds, newNode]);
    },
    [nodes.length, setNodes],
  );

  const handleUpdateNode = useCallback(
    (nodeId: string, data: Record<string, unknown>) => {
      setNodes((nds) =>
        nds.map((n) => (n.id === nodeId ? { ...n, data } : n)),
      );
      if (selectedNode?.id === nodeId) {
        setSelectedNode((prev) => (prev ? { ...prev, data } : null));
      }
    },
    [setNodes, selectedNode],
  );

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const steps = nodes
        .filter((n) => n.id !== 'trigger')
        .map((n) => {
          const nodeEdges = edges.filter((e) => e.source === n.id);
          return {
            id: n.id,
            type: (n.data as any).stepType,
            name: (n.data as any).label,
            config: (n.data as any).config || {},
            position: n.position,
            connections: nodeEdges.map((e) => ({
              targetStepId: e.target,
              label: (e.sourceHandle as string) || 'next',
            })),
          };
        });
      await onSave(steps);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle drop from palette
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const nodeData = event.dataTransfer.getData('application/flowforge-node');
      if (!nodeData) return;

      const { type, nodeType, label } = JSON.parse(nodeData);
      const bounds = reactFlowWrapper.current?.getBoundingClientRect();
      if (!bounds) return;

      const position = {
        x: event.clientX - bounds.left - 100,
        y: event.clientY - bounds.top - 25,
      };

      const newNode: Node = {
        id: uuidv4(),
        type: nodeType,
        position,
        data: { label, stepType: type, config: {} },
      };

      setNodes((nds) => [...nds, newNode]);
    },
    [setNodes],
  );

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="flex h-full">
      <NodePalette onAddNode={handleAddNode} />
      <div className="relative flex-1" ref={reactFlowWrapper}>
        <div className="absolute right-4 top-4 z-10">
          <Button onClick={handleSave} disabled={isSaving} size="sm">
            <Save className="mr-2 h-4 w-4" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDrop={onDrop}
          onDragOver={onDragOver}
          nodeTypes={nodeTypes}
          fitView
          deleteKeyCode="Delete"
        >
          <Controls />
          <Background variant={BackgroundVariant.Dots} gap={16} size={1} />
        </ReactFlow>
      </div>
      {selectedNode && (
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={handleUpdateNode}
          onClose={() => setSelectedNode(null)}
        />
      )}
    </div>
  );
}
