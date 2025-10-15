import type { Platform } from "@core/schemas/connected-account.sql";
import { cn } from "@openpromo/ui/lib/utils";
import { getPlatformMeta } from "@/components/composer/utils/platform-style";
import type { ValidationError } from "@/stores/composer-store";

interface ValidationErrorsProps {
  errors: ValidationError[];
}

type IssueRule =
  | "missing_content"
  | "platform_requires_media"
  | "caption_over_limit";

interface IssueDefinition {
  key: IssueRule;
  types: ValidationError["type"][];
  message: (options: { limit?: number }) => string;
}

const ISSUE_DEFINITIONS: IssueDefinition[] = [
  {
    key: "missing_content",
    types: ["no_message"],
    message: () => "Add text or attach media to publish.",
  },
  {
    key: "platform_requires_media",
    types: ["instagram_requires_media"],
    message: () => "Platform requires at least one image or video.",
  },
  {
    key: "caption_over_limit",
    types: ["message_too_long"],
    message: ({ limit }) =>
      limit ? `Trim caption to ${limit.toLocaleString()}` : "Trim caption.",
  },
];

const PLATFORM_SORT_ORDER: Platform[] = ["FACEBOOK", "INSTAGRAM", "TIKTOK"];

const PLATFORM_SET = new Set<Platform>(PLATFORM_SORT_ORDER);

const unique = <T,>(values: T[]): T[] => Array.from(new Set(values));

const sortPlatforms = (platforms: Platform[]): Platform[] =>
  [...platforms].sort(
    (a, b) => PLATFORM_SORT_ORDER.indexOf(a) - PLATFORM_SORT_ORDER.indexOf(b),
  );

const filterKnownPlatforms = (platforms: Platform[] | undefined): Platform[] =>
  sortPlatforms(
    unique((platforms ?? []).filter((platform) => PLATFORM_SET.has(platform))),
  );

function PlatformIcon({ platform }: { platform: Platform }) {
  const meta = getPlatformMeta(platform);
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex h-6 w-6 items-center justify-center rounded-full border border-rose-200 bg-white text-[10px] shadow-sm",
        meta.accentTextClass,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span className="sr-only">{meta.label}</span>
    </span>
  );
}

export function ValidationErrors({ errors }: ValidationErrorsProps) {
  const activeIssues = ISSUE_DEFINITIONS.reduce<
    Array<{
      key: IssueRule;
      message: string;
      platforms: Platform[];
    }>
  >((acc, definition) => {
    const matches = errors.filter(
      (error) =>
        error.severity === "error" && definition.types.includes(error.type),
    );

    if (matches.length === 0) {
      return acc;
    }

    const limit = matches[0]?.limit;
    const platforms = filterKnownPlatforms(
      matches.flatMap((error) => error.platforms ?? []),
    );

    acc.push({
      key: definition.key,
      message: definition.message({ limit }),
      platforms,
    });

    return acc;
  }, []);

  if (activeIssues.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-4 rounded-[12px] bg-[#F9F5F4] px-4 py-[14px]"
      style={{ borderLeft: "2px solid #B63A3A" }}
    >
      <header className="flex items-center gap-1.5 text-xs font-semibold text-[#7B1F1F]">
        <span aria-hidden className="text-[11px] leading-none text-[#7B1F1F]">
          ⓘ
        </span>
        <span>
          {activeIssues.length} {activeIssues.length === 1 ? "Issue" : "Issues"}{" "}
          Found
        </span>
      </header>

      <ul className="mt-[10px] space-y-1.5 text-xs leading-[1.35] text-[#7B1F1F]">
        {activeIssues.map((issue) => (
          <li key={issue.key}>
            <div>{issue.message}</div>

            {issue.platforms.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {issue.platforms.map((platform) => (
                  <PlatformIcon
                    key={`${issue.key}-${platform}`}
                    platform={platform}
                  />
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}
