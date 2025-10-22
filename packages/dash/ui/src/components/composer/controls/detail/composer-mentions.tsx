"use client";

import { Textarea } from "@openpromo/ui/components/textarea";
import { useEffect, useMemo, useRef, useState } from "react";
import { useDebounceValue } from "usehooks-ts";
import { PLACEHOLDER } from "@/lib/caption-limit";
import { useHashtagSuggestions } from "@/queries/hashtags";
import { MentionDropdown } from "./mention-dropdown";
import {
  getCaretCoordinates,
  getCurrentWord,
  replaceWord,
} from "./mention-utils";
import type { MentionTrigger, TaggableEntity } from "./taggable-entities";
import { STATIC_USER_ENTITIES } from "./taggable-entities";

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
  const [trigger, setTrigger] = useState<MentionTrigger>(null);
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
  const isHashtagError = hashtagQuery.isError;
  const hashtagErrorMessage =
    hashtagQuery.error instanceof Error
      ? hashtagQuery.error.message
      : "Unable to fetch hashtags.";

  // Check if we're waiting for debounce or actively fetching
  const isPendingHashtagFetch =
    trigger === "#" &&
    shouldShowHashtagResults &&
    (searchQuery !== debouncedQuery ||
      hashtagQuery.isLoading ||
      hashtagQuery.isFetching);

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
      return STATIC_USER_ENTITIES.filter((entity) => {
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

      // When loading or pending, return empty array but showLoadingRow will handle the UI
      if (isPendingHashtagFetch) {
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
  }, [
    trigger,
    searchQuery,
    hashtagEntities,
    shouldShowHashtagResults,
    isPendingHashtagFetch,
  ]);

  const emptyStateMessage =
    trigger === "#"
      ? isHashtagError
        ? hashtagErrorMessage
        : !shouldShowHashtagResults
          ? `Type at least ${minHashtagLength} characters to search hashtags.`
          : isPendingHashtagFetch
            ? ""
            : "No hashtags found."
      : "No users found.";

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

      <MentionDropdown
        open={showDropdown}
        position={getAbsolutePosition()}
        trigger={trigger}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        inputRef={inputRef}
        entities={filteredEntities}
        onSelect={handleSelect}
        emptyStateMessage={emptyStateMessage}
        showLoadingRow={isPendingHashtagFetch}
      />
    </div>
  );
}
