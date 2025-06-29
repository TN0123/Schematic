// Utility functions for Electron integration

import { NextResponse } from "next/server";

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

// Check if we're in Electron environment
export const isElectronBuild = () => {
  return process.env.ELECTRON === "true";
};

// Generic wrapper for API route handlers
export function withElectronSupport<T extends any[]>(
  webHandler: (...args: T) => Promise<Response>,
  electronResponse?: any
) {
  return async function (...args: T): Promise<Response> {
    if (isElectronBuild()) {
      // Return a standard "not available in Electron" response
      return NextResponse.json(
        electronResponse || {
          error: "This feature is not available in the desktop version",
          message:
            "API routes are disabled in Electron for security and performance",
        },
        { status: 503 }
      );
    }

    // For web, use the normal handler
    return webHandler(...args);
  };
}

// Export dynamic configuration for static export
export const electronApiConfig = isElectronBuild()
  ? {
      dynamic: "force-static" as const,
      revalidate: false,
    }
  : {};

// Helper to create conditional exports for routes
export function createElectronApiRoute(handlers: {
  GET?: Function;
  POST?: Function;
  PUT?: Function;
  DELETE?: Function;
  PATCH?: Function;
}) {
  const result: any = {};

  if (isElectronBuild()) {
    // For Electron, create simple static responses
    Object.keys(handlers).forEach((method) => {
      result[method] = async () => {
        return NextResponse.json(
          {
            error: "API not available in desktop version",
            method,
          },
          { status: 503 }
        );
      };
    });
  } else {
    // For web, use original handlers
    Object.assign(result, handlers);
  }

  return result;
}
