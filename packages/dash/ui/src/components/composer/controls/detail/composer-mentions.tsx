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

type ComposerMentionsProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

// Function to highlight hashtags and mentions in text
function highlightText(text: string) {
  if (!text) return null;

  // Regular expression to match hashtags and mentions
  // Matches # or @ followed by alphanumeric characters and underscores
  const regex = /(#[a-zA-Z0-9_]+|@[a-zA-Z0-9_]+)/g;
  const parts = text.split(regex);

  return parts.map((part, i) => {
    if (part.match(regex)) {
      const isHashtag = part.startsWith("#");
      const isMention = part.startsWith("@");

      if (isHashtag) {
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: static content split
            key={i}
            className="bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded "
          >
            {part}
          </span>
        );
      }

      if (isMention) {
        return (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: static content split
            key={i}
            className="bg-purple-500/10 text-purple-600 dark:text-purple-400 rounded"
          >
            {part}
          </span>
        );
      }
    }

    // biome-ignore lint/suspicious/noArrayIndexKey: static content split
    return <span key={i}>{part}</span>;
  });
}

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

  const hashtagEntities = useMemo<TaggableEntity[]>(() => {
    if (!hashtagSuggestions.length) return [];

    return hashtagSuggestions.map((suggestion) => {
      const normalizedTag = suggestion.normalizedTag;
      const displayTag = suggestion.displayTag ?? normalizedTag;

      return {
        id: `hashtag-${normalizedTag}`,
        name: `#${displayTag}`,
        value: `#${normalizedTag}`,
        type: "hashtag" as const,
        platformStats: suggestion.stats,
      };
    });
  }, [hashtagSuggestions]);

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
      : "Use @ to tag people with their account handle (e.g., @username). You can customize mentions for each platform in the preview panels.";

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
      {/* Highlight overlay */}
      <div
        className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words overflow-hidden"
        style={{
          padding: "0.5rem 0.75rem",
          fontSize: "0.875rem",
          lineHeight: "1.25rem",
          color: "transparent",
          zIndex: 1,
        }}
        aria-hidden="true"
      >
        {highlightText(value)}
      </div>

      {/* Textarea */}
      <Textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleTextareaKeyDown}
        placeholder={placeholder}
        className="min-h-[80px] resize-none border-0 relative bg-transparent"
        style={{ zIndex: 2 }}
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
