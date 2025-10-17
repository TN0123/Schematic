export interface ErrorState {
  message: string;
  type: "network" | "server" | "auth" | "validation" | "unknown";
  canRetry: boolean;
  retryAction?: () => void;
}

// Helper function to parse API errors
export const parseApiError = async (response: Response): Promise<ErrorState> => {
  let message = "An unexpected error occurred";
  let type: ErrorState["type"] = "unknown";
  let canRetry = false;

  try {
    const errorData = await response.json();
    message = errorData.error || errorData.message || message;
  } catch {
    // If we can't parse the error response, use status-based messages
    switch (response.status) {
      case 400:
        message = "Invalid request. Please check your input and try again.";
        type = "validation";
        break;
      case 401:
        message = "Authentication required. Please log in and try again.";
        type = "auth";
        break;
      case 403:
        message = "Access denied. You may have reached your usage limit.";
        type = "auth";
        break;
      case 429:
        message = "Too many requests. Please wait a moment and try again.";
        type = "server";
        canRetry = true;
        break;
      case 500:
        message = "Server error. Please try again in a moment.";
        type = "server";
        canRetry = true;
        break;
      case 503:
        message = "Service temporarily unavailable. Please try again later.";
        type = "server";
        canRetry = true;
        break;
      default:
        message = `Request failed with status ${response.status}`;
        type = "server";
        canRetry = response.status >= 500;
    }
  }

  return { message, type, canRetry };
};

// Helper function to handle network errors
export const handleNetworkError = (error: Error): ErrorState => {
  if (error.name === "TypeError" && error.message.includes("fetch")) {
    return {
      message:
        "Network connection failed. Please check your internet connection and try again.",
      type: "network",
      canRetry: true,
    };
  }

  return {
    message: error.message || "An unexpected error occurred",
    type: "unknown",
    canRetry: false,
  };
};
