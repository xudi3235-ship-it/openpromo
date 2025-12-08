import { Input } from "@openpromo/ui/components/input";
import { Search, X } from "lucide-react";
import { useRef } from "react";

export interface FilterSearchProps {
  /** Current search value */
  value: string;
  /** Change handler */
  onValueChange: (value: string) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Custom className */
  className?: string;
  /** Width class */
  width?: string;
  /** Show search icon */
  showSearchIcon?: boolean;
}

/**
 * FilterSearch - Search input with clear button
 *
 * A search input component for filtering with built-in clear functionality
 * and optional search icon.
 *
 * @example
 * ```tsx
 * <FilterSearch
 *   value={search}
 *   onValueChange={setSearch}
 *   placeholder="Search content..."
 * />
 * ```
 */
export function FilterSearch({
  value,
  onValueChange,
  placeholder = "Search...",
  className = "",
  width = "max-w-sm",
  showSearchIcon = true,
}: FilterSearchProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleClear = () => {
    onValueChange("");
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${width} ${className}`}>
      {showSearchIcon && (
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
      )}
      <Input
        ref={inputRef}
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onValueChange(e.target.value)}
        className={showSearchIcon ? "pl-9 pr-9" : "pr-9"}
      />
      {value && (
        <button
          type="button"
          onClick={handleClear}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}
