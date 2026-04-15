import { configureStore } from '@reduxjs/toolkit';
import { authReducer } from './auth-store';
import { workspaceReducer } from './workspace-slice';
import { workflowReducer } from './workflow-slice';
import { executionReducer } from './execution-slice';
import { folderReducer } from './folder-slice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    workspace: workspaceReducer,
    workflow: workflowReducer,
    execution: executionReducer,
    folder: folderReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
