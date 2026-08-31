import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import toast, { Toaster } from 'react-hot-toast';

const UIContext = createContext();

export const useUI = () => useContext(UIContext);

export const UIProvider = ({ children }) => {
  // Modo de visualización: 'lite' | 'compact' | 'pro'
  const [viewMode, setViewModeState] = useState(() => {
    return localStorage.getItem('soar_view_mode') || 'compact';
  });

  // Módulos visibles en modo personalizable
  const [customModules, setCustomModulesState] = useState(() => {
    try {
      const saved = localStorage.getItem('soar_custom_modules');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return {
      todayTasks: true,
      progress: true,
      events: true,
      shortcuts: true,
      advancedTools: true
    };
  });

  const setViewMode = (mode) => {
    setViewModeState(mode);
    localStorage.setItem('soar_view_mode', mode);
  };

  const setCustomModules = (modules) => {
    setCustomModulesState(modules);
    localStorage.setItem('soar_custom_modules', JSON.stringify(modules));
  };

  const toggleCustomModule = (key) => {
    setCustomModulesState(prev => {
      const next = { ...prev, [key]: !prev[key] };
      localStorage.setItem('soar_custom_modules', JSON.stringify(next));
      return next;
    });
  };

  const [promptState, setPromptState] = useState({
    isOpen: false,
    title: '',
    defaultValue: '',
    resolve: null
  });

  const showToast = useCallback((message, type = 'success') => {
    if (type === 'success') {
      toast.success(message, {
        style: { background: '#22c55e', color: '#fff', borderRadius: '8px' },
        iconTheme: { primary: '#fff', secondary: '#22c55e' }
      });
    } else if (type === 'error') {
      toast.error(message, {
        style: { background: '#ef4444', color: '#fff', borderRadius: '8px' },
        iconTheme: { primary: '#fff', secondary: '#ef4444' }
      });
    } else {
      toast(message, {
        style: { background: '#3b82f6', color: '#fff', borderRadius: '8px' },
        iconTheme: { primary: '#fff', secondary: '#3b82f6' }
      });
    }
  }, []);

  const showPrompt = useCallback((title, defaultValue = '') => {
    return new Promise((resolve) => {
      setPromptState({
        isOpen: true,
        title,
        defaultValue,
        resolve
      });
    });
  }, []);

  const handlePromptClose = useCallback((value) => {
    if (promptState.resolve) {
      promptState.resolve(value);
    }
    setPromptState((prev) => ({ ...prev, isOpen: false, resolve: null }));
  }, [promptState]);

  return (
    <UIContext.Provider value={{ 
      showToast, 
      showPrompt, 
      promptState, 
      handlePromptClose,
      viewMode,
      setViewMode,
      customModules,
      setCustomModules,
      toggleCustomModule
    }}>
      {children}
      <Toaster position="top-center" />
    </UIContext.Provider>
  );
};
