export interface ToastNotification {
  id: string;
  message: string;
  type: "error" | "success" | "warning" | "info";
  duration?: number;
}

// Helper function to add toast notifications
export const createToast = (
  message: string,
  type: ToastNotification["type"] = "error",
  duration = 5000
): ToastNotification => {
  const id = Math.random().toString(36).substr(2, 9);
  return { id, message, type, duration };
};

// Helper function to add toast to state
export const addToast = (
  toasts: ToastNotification[],
  message: string,
  type: ToastNotification["type"] = "error",
  duration = 5000
): ToastNotification[] => {
  const newToast = createToast(message, type, duration);
  return [...toasts, newToast];
};

// Helper function to remove toast from state
export const removeToast = (
  toasts: ToastNotification[],
  id: string
): ToastNotification[] => {
  return toasts.filter((t) => t.id !== id);
};
