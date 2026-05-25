import { createContext, useContext, useReducer, type ReactNode } from 'react';
import type { AppState, AppAction } from '../types';

const initialState: AppState = {
  currentUser: null,
  plans: [],
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, currentUser: action.user };
    case 'LOGOUT':
      return { ...state, currentUser: null, plans: [] };
    case 'SET_PLANS':
      return { ...state, plans: action.plans };
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}

const AppContext = createContext<AppContextType | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);
  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppContextType {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
