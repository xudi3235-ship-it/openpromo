"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@openpromo/ui/components/command";
import { Textarea } from "@openpromo/ui/components/textarea";
import { Loader2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useDebounceValue } from "usehooks-ts";
import { PLACEHOLDER } from "@/lib/caption-limit";
import { useHashtagSuggestions } from "@/queries/hashtags";
import {
  getCaretCoordinates,
  getCurrentWord,
  replaceWord,
} from "./mention-utils";

export interface TaggableEntity {
  id: string;
  name: string;
  value: string;
  description?: string;
  type: "user" | "hashtag";
  meta?: string[];
}

const users: TaggableEntity[] = [
  {
    id: "1",
    name: "John Doe",
    value: "@johndoe",
    description: "Product Manager",
    type: "user",
  },
  {
    id: "2",
    name: "Jane Smith",
    value: "@janesmith",
    description: "Marketing Lead",
    type: "user",
  },
  {
    id: "3",
    name: "Bob Johnson",
    value: "@bobjohnson",
    description: "Sales Director",
    type: "user",
  },
  {
    id: "4",
    name: "Alice Williams",
    value: "@alicewilliams",
    description: "Content Creator",
    type: "user",
  },
  {
    id: "5",
    name: "Charlie Brown",
    value: "@charliebrown",
    description: "Social Media Manager",
    type: "user",
  },
];

const PLATFORM_LABELS: Record<string, string> = {
  FACEBOOK: "Facebook",
  INSTAGRAM: "Instagram",
  TIKTOK: "TikTok",
};

type ComposerMentionsProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export default function ComposerMentions({
  value,
  onChange,
  placeholder = PLACEHOLDER,
}: ComposerMentionsProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  const [trigger, setTrigger] = useState<"@" | "#" | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery] = useDebounceValue(searchQuery, 250);
  const minHashtagLength = 2;
  const trimmedSearch = searchQuery.trim();
  const shouldShowHashtagResults = trimmedSearch.length >= minHashtagLength;

  const hashtagQuery = useHashtagSuggestions(
    debouncedQuery,
    showDropdown && trigger === "#",
    { minimumLength: minHashtagLength },
  );
  const hashtagSuggestions = hashtagQuery.suggestions;
  const isFetchingHashtags = hashtagQuery.isFetching ?? false;
  const isLoadingHashtags = hashtagQuery.status === "pending";
  const isHashtagError = hashtagQuery.isError ?? false;
  const hashtagErrorMessage =
    hashtagQuery.error instanceof Error
      ? hashtagQuery.error.message
      : "Unable to fetch hashtags.";

  const numberFormatter = useMemo(
    () =>
      new Intl.NumberFormat("en", {
        notation: "compact",
        maximumFractionDigits: 1,
      }),
    [],
  );

  const hashtagEntities = useMemo<TaggableEntity[]>(() => {
    if (!hashtagSuggestions.length) return [];

    return hashtagSuggestions.map((suggestion) => {
      const normalizedTag = suggestion.normalizedTag;
      const displayTag = suggestion.displayTag ?? normalizedTag;
      const statLines = suggestion.stats.map((stat) => {
        const platform = PLATFORM_LABELS[stat.platform] ?? stat.platform;
        const parts: string[] = [];
        if (typeof stat.usageCount === "number") {
          parts.push(`${numberFormatter.format(stat.usageCount)} posts`);
        }
        if (typeof stat.viewCount === "number") {
          parts.push(`${numberFormatter.format(stat.viewCount)} views`);
        }
        if (parts.length === 0) {
          return `${platform} • data unavailable`;
        }
        return `${platform} • ${parts.join(" / ")}`;
      });

      const [primaryLine, ...rest] = statLines;

      return {
        id: `hashtag-${normalizedTag}`,
        name: `#${displayTag}`,
        value: `#${normalizedTag}`,
        description: primaryLine,
        meta: rest.length > 0 ? rest : undefined,
        type: "hashtag" as const,
      };
    });
  }, [hashtagSuggestions, numberFormatter]);

  // Check for mention/hashtag trigger
  useEffect(() => {
    if (!textareaRef.current) return;

    const handleSelectionChange = () => {
      if (!textareaRef.current) return;

      const currentWord = getCurrentWord(textareaRef.current);
      if (!currentWord) {
        setShowDropdown(false);
        return;
      }

      const { word } = currentWord;

      // Check if word starts with @ or #
      if (word.startsWith("@")) {
        setTrigger("@");
        setSearchQuery(word.slice(1));
        setShowDropdown(true);

        // Position dropdown
        const coords = getCaretCoordinates(textareaRef.current);
        setDropdownPosition({
          top: coords.top + coords.height,
          left: coords.left,
        });
      } else if (word.startsWith("#")) {
        setTrigger("#");
        setSearchQuery(word.slice(1));
        setShowDropdown(true);

        // Position dropdown
        const coords = getCaretCoordinates(textareaRef.current);
        setDropdownPosition({
          top: coords.top + coords.height,
          left: coords.left,
        });
      } else {
        setShowDropdown(false);
        setTrigger(null);
        setSearchQuery("");
      }
    };

    // Listen to selection changes
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  // Filter entities based on trigger and search query
  const filteredEntities = useMemo(() => {
    if (!trigger) return [];

    const normalizedSearch = searchQuery.toLowerCase();

    if (trigger === "@") {
      return users.filter((entity) => {
        const matchesSearch =
          normalizedSearch === "" ||
          entity.name.toLowerCase().includes(normalizedSearch) ||
          entity.value.toLowerCase().includes(normalizedSearch);
        return matchesSearch;
      });
    }

    if (trigger === "#") {
      if (!shouldShowHashtagResults) {
        return [];
      }

      if (normalizedSearch === "") {
        return hashtagEntities;
      }

      return hashtagEntities.filter((entity) =>
        entity.value.toLowerCase().includes(normalizedSearch),
      );
    }

    return [];
  }, [trigger, searchQuery, hashtagEntities, shouldShowHashtagResults]);

  const emptyStateMessage =
    trigger === "#"
      ? isHashtagError
        ? hashtagErrorMessage
        : !shouldShowHashtagResults
          ? `Type at least ${minHashtagLength} characters to search hashtags.`
          : "No hashtags found."
      : "No users found.";

  const showLoadingRow =
    trigger === "#" &&
    shouldShowHashtagResults &&
    (isLoadingHashtags || isFetchingHashtags);

  // Handle entity selection
  const handleSelect = (entity: TaggableEntity) => {
    if (!textareaRef.current) return;

    replaceWord(textareaRef.current, entity.value);
    setShowDropdown(false);
    setTrigger(null);
    setSearchQuery("");

    // Update the value through onChange
    onChange(textareaRef.current.value);

    // Keep focus on textarea
    textareaRef.current.focus();
  };

  // Handle keyboard navigation in dropdown
  const handleTextareaKeyDown = (
    e: React.KeyboardEvent<HTMLTextAreaElement>,
  ) => {
    if (showDropdown && inputRef.current) {
      if (
        e.key === "ArrowDown" ||
        e.key === "ArrowUp" ||
        e.key === "Enter" ||
        e.key === "Escape"
      ) {
        e.preventDefault();
        // Forward keyboard event to Command input for navigation
        const event = new KeyboardEvent("keydown", {
          key: e.key,
          code: e.code,
          bubbles: true,
        });
        inputRef.current.dispatchEvent(event);

        // Close on Escape
        if (e.key === "Escape") {
          setShowDropdown(false);
          setTrigger(null);
          setSearchQuery("");
        }
      }
    }
  };

  // Calculate absolute position for portal
  const getAbsolutePosition = () => {
    if (!textareaRef.current) return { top: 0, left: 0 };

    const textareaRect = textareaRef.current.getBoundingClientRect();
    return {
      top: textareaRect.top + dropdownPosition.top,
      left: textareaRect.left + dropdownPosition.left,
    };
  };

  return (
    <div className="relative">
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleTextareaKeyDown}
        placeholder={placeholder}
        className="min-h-[80px] resize-none border-0"
      />

      {showDropdown &&
        createPortal(
          <div
            className="fixed z-[100]"
            style={{
              top: `${getAbsolutePosition().top}px`,
              left: `${getAbsolutePosition().left}px`,
            }}
            onMouseDown={(e) => {
              // Prevent textarea from losing focus
              e.preventDefault();
            }}
          >
            <Command className="border-border bg-popover w-[300px] rounded-lg border shadow-lg">
              <CommandInput
                ref={inputRef}
                value={searchQuery}
                onValueChange={setSearchQuery}
                className="hidden"
              />
              <CommandList className="max-h-[200px]">
                {!showLoadingRow && (
                  <CommandEmpty>{emptyStateMessage}</CommandEmpty>
                )}
                <CommandGroup>
                  {showLoadingRow && (
                    <CommandItem
                      value="loading"
                      disabled
                      className="flex cursor-default items-center gap-2 text-muted-foreground"
                    >
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Searching hashtags…
                    </CommandItem>
                  )}
                  {filteredEntities.map((entity) => (
                    <CommandItem
                      key={entity.id}
                      value={entity.value}
                      onSelect={() => handleSelect(entity)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium">{entity.name}</span>
                        {entity.type === "user" && (
                          <span className="text-muted-foreground text-xs">
                            {entity.value}
                          </span>
                        )}
                        {entity.description && (
                          <span className="text-muted-foreground text-xs">
                            {entity.description}
                          </span>
                        )}
                        {entity.meta?.map((line) => (
                          <span
                            key={line}
                            className="text-muted-foreground text-xs"
                          >
                            {line}
                          </span>
                        ))}
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </div>,
          document.body,
        )}
    </div>
  );
}
