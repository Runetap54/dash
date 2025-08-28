import React, { createContext, useContext, useReducer, useEffect, ReactNode } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Profile {
  id: string;
  email: string;
  role: string;
  status: string;
  luma_api_key?: string;
  created_at: string;
  updated_at: string;
}

interface AppState {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  theme: 'light' | 'dark' | 'system';
  sidebarOpen: boolean;
  notifications: Notification[];
  preferences: UserPreferences;
}

interface UserPreferences {
  autoSave: boolean;
  emailNotifications: boolean;
  keyboardShortcuts: boolean;
  defaultShotType: string;
  exportFormat: 'mp4' | 'mov' | 'avi';
  quality: 'low' | 'medium' | 'high';
}

interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
}

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_PROFILE'; payload: Profile | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'ADD_NOTIFICATION'; payload: Omit<Notification, 'id' | 'timestamp' | 'read'> }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'UPDATE_PREFERENCES'; payload: Partial<UserPreferences> }
  | { type: 'RESET_STATE' };

const initialState: AppState = {
  user: null,
  profile: null,
  loading: true,
  theme: 'system',
  sidebarOpen: false,
  notifications: [],
  preferences: {
    autoSave: true,
    emailNotifications: true,
    keyboardShortcuts: true,
    defaultShotType: 'wide',
    exportFormat: 'mp4',
    quality: 'medium'
  }
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'SET_PROFILE':
      return { ...state, profile: action.payload };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_THEME':
      return { ...state, theme: action.payload };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'ADD_NOTIFICATION':
      const newNotification: Notification = {
        ...action.payload,
        id: Date.now().toString(),
        timestamp: new Date(),
        read: false
      };
      return {
        ...state,
        notifications: [newNotification, ...state.notifications].slice(0, 50) // Keep last 50
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        )
      };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    case 'UPDATE_PREFERENCES':
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload }
      };
    case 'RESET_STATE':
      return initialState;
    default:
      return state;
  }
}

interface AppContextType {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  actions: {
    setUser: (user: User | null) => void;
    setProfile: (profile: Profile | null) => void;
    setLoading: (loading: boolean) => void;
    setTheme: (theme: 'light' | 'dark' | 'system') => void;
    toggleSidebar: () => void;
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => void;
    markNotificationRead: (id: string) => void;
    clearNotifications: () => void;
    updatePreferences: (preferences: Partial<UserPreferences>) => void;
    signOut: () => Promise<void>;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  // Load user preferences from localStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | 'system';
    const savedPreferences = localStorage.getItem('userPreferences');
    
    if (savedTheme) {
      dispatch({ type: 'SET_THEME', payload: savedTheme });
    }
    
    if (savedPreferences) {
      try {
        const preferences = JSON.parse(savedPreferences);
        dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
      } catch (error) {
        console.error('Failed to load user preferences:', error);
      }
    }
  }, []);

  // Save theme to localStorage
  useEffect(() => {
    localStorage.setItem('theme', state.theme);
  }, [state.theme]);

  // Save preferences to localStorage
  useEffect(() => {
    localStorage.setItem('userPreferences', JSON.stringify(state.preferences));
  }, [state.preferences]);

  // Check authentication on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session) {
        dispatch({ type: 'SET_USER', payload: session.user });
        
        // Load profile
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();

        if (profileError) {
          console.error("Profile error:", profileError);
          dispatch({ type: 'ADD_NOTIFICATION', payload: {
            type: 'error',
            title: 'Profile Error',
            message: 'Failed to load user profile'
          }});
        } else {
          dispatch({ type: 'SET_PROFILE', payload: profileData });
        }
      }
    } catch (error) {
      console.error("Auth check error:", error);
      dispatch({ type: 'ADD_NOTIFICATION', payload: {
        type: 'error',
        title: 'Authentication Error',
        message: 'Failed to check authentication status'
      }});
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  };

  const actions = {
    setUser: (user: User | null) => dispatch({ type: 'SET_USER', payload: user }),
    setProfile: (profile: Profile | null) => dispatch({ type: 'SET_PROFILE', payload: profile }),
    setLoading: (loading: boolean) => dispatch({ type: 'SET_LOADING', payload: loading }),
    setTheme: (theme: 'light' | 'dark' | 'system') => dispatch({ type: 'SET_THEME', payload: theme }),
    toggleSidebar: () => dispatch({ type: 'TOGGLE_SIDEBAR' }),
    addNotification: (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
      dispatch({ type: 'ADD_NOTIFICATION', payload: notification });
      toast[notification.type](notification.message, {
        description: notification.title
      });
    },
    markNotificationRead: (id: string) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id }),
    clearNotifications: () => dispatch({ type: 'CLEAR_NOTIFICATIONS' }),
    updatePreferences: (preferences: Partial<UserPreferences>) => {
      dispatch({ type: 'UPDATE_PREFERENCES', payload: preferences });
      toast.success('Preferences updated');
    },
    signOut: async () => {
      try {
        await supabase.auth.signOut();
        dispatch({ type: 'RESET_STATE' });
        toast.success('Signed out successfully');
      } catch (error) {
        toast.error('Error signing out');
      }
    }
  };

  const value: AppContextType = {
    state,
    dispatch,
    actions
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

// Convenience hooks
export function useUser() {
  const { state } = useApp();
  return { user: state.user, profile: state.profile };
}

export function useTheme() {
  const { state, actions } = useApp();
  return { theme: state.theme, setTheme: actions.setTheme };
}

export function useNotifications() {
  const { state, actions } = useApp();
  return {
    notifications: state.notifications,
    addNotification: actions.addNotification,
    markNotificationRead: actions.markNotificationRead,
    clearNotifications: actions.clearNotifications
  };
}

export function usePreferences() {
  const { state, actions } = useApp();
  return {
    preferences: state.preferences,
    updatePreferences: actions.updatePreferences
  };
}
