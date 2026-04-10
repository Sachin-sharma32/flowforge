'use client';

import { useEffect, useRef } from 'react';
import { getSocket, connectSocket } from '@/lib/socket-client';
import { store } from '@/stores/store';
import { onStepUpdate, onExecutionUpdate } from '@/stores/execution-slice';

export function useExecutionSocket(workspaceId: string | undefined) {
  const dispatchRef = useRef(store.dispatch);

  useEffect(() => {
    if (!workspaceId) return;

    connectSocket();
    const socket = getSocket();

    socket.emit('join:workspace', workspaceId);

    const handleStepUpdate = (data: Record<string, unknown>) =>
      dispatchRef.current(onStepUpdate(data));
    const handleExecutionUpdate = (data: Record<string, unknown>) =>
      dispatchRef.current(onExecutionUpdate(data));

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
