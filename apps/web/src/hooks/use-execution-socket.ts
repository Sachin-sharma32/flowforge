'use client';

import { useEffect, useRef } from 'react';
import { getSocket, connectSocket } from '@/lib/socket-client';
import { useExecutionStore } from '@/stores/execution-store';

export function useExecutionSocket(workspaceId: string | undefined) {
  const onStepUpdateRef = useRef(useExecutionStore.getState().onStepUpdate);
  const onExecutionUpdateRef = useRef(useExecutionStore.getState().onExecutionUpdate);

  // Keep refs in sync without re-running the effect
  useEffect(() => {
    return useExecutionStore.subscribe((state) => {
      onStepUpdateRef.current = state.onStepUpdate;
      onExecutionUpdateRef.current = state.onExecutionUpdate;
    });
  }, []);

  useEffect(() => {
    if (!workspaceId) return;

    connectSocket();
    const socket = getSocket();

    socket.emit('join:workspace', workspaceId);

    const handleStepUpdate = (data: Record<string, unknown>) => onStepUpdateRef.current(data);
    const handleExecutionUpdate = (data: Record<string, unknown>) =>
      onExecutionUpdateRef.current(data);

    socket.on('step.started', handleStepUpdate);
    socket.on('step.completed', handleStepUpdate);
    socket.on('step.failed', handleStepUpdate);
    socket.on('execution.started', handleExecutionUpdate);
    socket.on('execution.completed', handleExecutionUpdate);
    socket.on('execution.failed', handleExecutionUpdate);

    return () => {
      socket.emit('leave:workspace', workspaceId);
      socket.off('step.started', handleStepUpdate);
      socket.off('step.completed', handleStepUpdate);
      socket.off('step.failed', handleStepUpdate);
      socket.off('execution.started', handleExecutionUpdate);
      socket.off('execution.completed', handleExecutionUpdate);
      socket.off('execution.failed', handleExecutionUpdate);
    };
  }, [workspaceId]);
}
