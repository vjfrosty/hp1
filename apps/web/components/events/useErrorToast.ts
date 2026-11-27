"use client";

import { useEffect } from "react";

import { useToast } from "@/components/ui/toast";

/** Shows a query error once as a toast (each new error object toasts again). */
export function useErrorToast(error: unknown) {
  const { showError } = useToast();
  useEffect(() => {
    if (error) showError(error);
  }, [error, showError]);
}
