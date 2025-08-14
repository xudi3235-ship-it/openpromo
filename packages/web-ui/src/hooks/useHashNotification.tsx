import { useRouter } from "@tanstack/react-router";
import { useEffect } from "react";
import { type ExternalToast, toast } from "sonner";

const HashMessages = {
  LoginError: "login-error",
} as const;

type HashMessage = (typeof HashMessages)[keyof typeof HashMessages];

const hashMessageMap: Record<
  HashMessage,
  {
    message: string;
    type: "success" | "info" | "warning" | "error";
    data?: ExternalToast;
  }
> = {
  [HashMessages.LoginError]: {
    message: "Login failed",
    type: "error",
    data: {
      description: "Please try again",
    },
  },
};

function isHashDefined(hash: string): hash is HashMessage {
  return Object.values(HashMessages).includes(hash as HashMessage);
}

export const useHashNotification = () => {
  const { state, history } = useRouter();

  useEffect(() => {
    const hash = state.location.hash;
    const pathname = state.location.pathname;

    if (!isHashDefined(hash)) {
      return;
    }

    const hashMessage = hashMessageMap[hash];
    toast[hashMessage.type](hashMessage.message, {
      // Use id to prevent duplicate toasts
      id: hash,
      ...hashMessage.data,
    });

    history.replace(pathname);
  }, [state.location.hash, state.location.pathname, history.replace]);
};
