'use client';

import { useEffect } from 'react';
import { getSocket, connectSocket, disconnectSocket } from '@/lib/socket-client';
import { useExecutionStore } from '@/stores/execution-store';

export function useExecutionSocket(workspaceId: string | undefined) {
  const { onStepUpdate, onExecutionUpdate } = useExecutionStore();

  useEffect(() => {
    if (!workspaceId) return;

    connectSocket();
    const socket = getSocket();

    socket.emit('join:workspace', workspaceId);

    socket.on('step.started', onStepUpdate);
    socket.on('step.completed', onStepUpdate);
    socket.on('step.failed', onStepUpdate);
    socket.on('execution.started', onExecutionUpdate);
    socket.on('execution.completed', onExecutionUpdate);
    socket.on('execution.failed', onExecutionUpdate);

    return () => {
      socket.emit('leave:workspace', workspaceId);
      socket.off('step.started', onStepUpdate);
      socket.off('step.completed', onStepUpdate);
      socket.off('step.failed', onStepUpdate);
      socket.off('execution.started', onExecutionUpdate);
      socket.off('execution.completed', onExecutionUpdate);
      socket.off('execution.failed', onExecutionUpdate);
    };
  }, [workspaceId, onStepUpdate, onExecutionUpdate]);
}
