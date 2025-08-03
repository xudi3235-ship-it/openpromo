import { prefixes } from "./util/id";

export namespace Examples {
    export const Id = (prefix: keyof typeof prefixes) =>
        `${prefixes[prefix]}_XXXXXXXXXXXXXXXXXXXXXXXXX`;

    export const User = {
        id: Id("user"),
        name: "John Doe",
        email: "john@example.com",
        stripeCustomerID: "cus_XXXXXXXXXXXXXXXXX",
    };

    export const Profile = {
        user: User,
    };

    export const Subscription = {
        id: Id("subscription"),
        schedule: { type: "weekly" as const, interval: 3 },
        next: new Date("2025-02-01 19:36:19.000"),
        created: new Date("2024-06-29 19:36:19.000"),
    };

    export const Workspace = {
        id: Id("workspace"),
        slug: "example-workspace",
    };

    export const UnifiedContent = {
        id: Id("unified_content"),
        title: "Example Content",
        bodyText: "This is an example content body.",
        attachments: [],
        metadata: {},
    };
}
