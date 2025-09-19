import type { ValidationError } from "@/stores/composer-store";

interface ValidationErrorsProps {
  errors: ValidationError[];
}

export function ValidationErrors({ errors }: ValidationErrorsProps) {
  if (errors.length === 0) return null;

  return (
    <div className="mt-4 space-y-1">
      {errors.map((error) => (
        <div
          key={`${error.type}-${error.field || "global"}`}
          className={`text-xs ${
            error.severity === "error"
              ? "text-red-600 dark:text-red-400"
              : "text-orange-600 dark:text-orange-400"
          }`}
        >
          {error.message}
        </div>
      ))}
    </div>
  );
}
