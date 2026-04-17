"use client";

import { Toaster as SonnerToaster, type ToasterProps } from "sonner";

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <SonnerToaster
      theme="light"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-papel group-[.toaster]:text-mole group-[.toaster]:border-oro/40 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-mole/70",
          actionButton:
            "group-[.toast]:bg-oro group-[.toast]:text-mole group-[.toast]:hover:bg-oro-light",
          cancelButton:
            "group-[.toast]:bg-papel-warm group-[.toast]:text-mole",
          success: "group-[.toaster]:border-agave-sage/50",
          error: "group-[.toaster]:border-chile/50",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
