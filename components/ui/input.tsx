import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        className={cn(
          "flex h-10 w-full rounded-md border border-nopal/20 bg-papel px-3 py-2 text-sm text-mole ring-offset-papel file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-mole placeholder:text-mole/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-nopal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export { Input };
