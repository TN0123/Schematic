// Utility functions for Electron integration

export const isElectron = (): boolean => {
  if (typeof window !== "undefined") {
    return !!(window as any).electron;
  }
  return false;
};

export const getElectronAPI = () => {
  if (typeof window !== "undefined" && (window as any).electron) {
    return (window as any).electron;
  }
  return null;
};

// Type definitions for the exposed Electron API
export interface ElectronAPI {
  getVersion: () => string;
  getPlatform: () => string;
  openFile: () => Promise<any>;
  saveFile: (data: any) => Promise<any>;
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  isElectron: boolean;
  sendMessage: (channel: string, data: any) => void;
  onMessage: (
    channel: string,
    callback: (event: any, ...args: any[]) => void
  ) => void;
  removeAllListeners: (channel: string) => void;
}

// Safe way to access Electron APIs with TypeScript
export const useElectron = (): ElectronAPI | null => {
  if (isElectron()) {
    return getElectronAPI() as ElectronAPI;
  }
  return null;
};
