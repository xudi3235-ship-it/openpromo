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
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { PLACEHOLDER } from "@/lib/caption-limit";
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
}

const dummyTaggableEntities: TaggableEntity[] = [
  // Users
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
  // Hashtags
  {
    id: "h1",
    name: "Marketing",
    value: "#marketing",
    description: "Marketing campaigns and content",
    type: "hashtag",
  },
  {
    id: "h2",
    name: "Sales",
    value: "#sales",
    description: "Sales updates and deals",
    type: "hashtag",
  },
  {
    id: "h3",
    name: "Product",
    value: "#product",
    description: "Product announcements",
    type: "hashtag",
  },
  {
    id: "h4",
    name: "Announcement",
    value: "#announcement",
    description: "General announcements",
    type: "hashtag",
  },
  {
    id: "h5",
    name: "Update",
    value: "#update",
    description: "Updates and news",
    type: "hashtag",
  },
  {
    id: "h6",
    name: "Launch",
    value: "#launch",
    description: "Product launches",
    type: "hashtag",
  },
  {
    id: "h7",
    name: "Promo",
    value: "#promo",
    description: "Promotional content",
    type: "hashtag",
  },
  {
    id: "h8",
    name: "Discount",
    value: "#discount",
    description: "Discount offers",
    type: "hashtag",
  },
];

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
  const filteredEntities = dummyTaggableEntities.filter((entity) => {
    if (!trigger) return false;

    const matchesType =
      (trigger === "@" && entity.type === "user") ||
      (trigger === "#" && entity.type === "hashtag");

    const matchesSearch =
      searchQuery === "" ||
      entity.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      entity.value.toLowerCase().includes(searchQuery.toLowerCase());

    return matchesType && matchesSearch;
  });

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
                <CommandEmpty>
                  No {trigger === "@" ? "users" : "hashtags"} found.
                </CommandEmpty>
                <CommandGroup>
                  {filteredEntities.map((entity) => (
                    <CommandItem
                      key={entity.id}
                      value={entity.name}
                      onSelect={() => handleSelect(entity)}
                      className="cursor-pointer"
                    >
                      <div className="flex flex-col">
                        <span className="font-medium">{entity.name}</span>
                        <span className="text-muted-foreground text-xs">
                          {entity.value}
                        </span>
                        {entity.description && (
                          <span className="text-muted-foreground text-xs">
                            {entity.description}
                          </span>
                        )}
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
