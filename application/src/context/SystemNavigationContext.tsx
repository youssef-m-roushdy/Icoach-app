import React, { createContext, useContext } from 'react';

interface SystemNavigationState {
  isThreeButtonNav: boolean;
  systemBottomInset: number;
}

const SystemNavigationContext = createContext<SystemNavigationState>({
  isThreeButtonNav: false,
  systemBottomInset: 0,
});

interface SystemNavigationProviderProps {
  isThreeButtonNav: boolean;
  systemBottomInset: number;
  children: React.ReactNode;
}

export const SystemNavigationProvider: React.FC<SystemNavigationProviderProps> = ({ 
  isThreeButtonNav, 
  systemBottomInset, 
  children 
}) => {
  return (
    <SystemNavigationContext.Provider value={{ isThreeButtonNav, systemBottomInset }}>
      {children}
    </SystemNavigationContext.Provider>
  );
};

export const useSystemNavigation = () => useContext(SystemNavigationContext);
