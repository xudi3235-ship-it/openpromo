import type { InboxConversationSummary, InboxMessage } from "@shared/inbox";

const baseNow = Date.now();

export const mockConversations: InboxConversationSummary[] = [
  {
    id: "conv-1",
    platform: "INSTAGRAM",
    channel: "dm",
    lastMessageAt: new Date(baseNow - 5 * 60 * 1000),
    contact: {
      id: "contact-ig-1",
      name: "Emily Chen",
      profilePicUrl: "https://i.pravatar.cc/150?img=47",
    },
    connectedAccount: {
      id: "acc-ig-1",
      accountName: "@sunnycafe",
    },
    contentId: null,
    externalThreadId: null,
  },
  {
    id: "conv-2",
    platform: "FACEBOOK",
    channel: "post_comment",
    lastMessageAt: new Date(baseNow - 45 * 60 * 1000),
    contact: {
      id: "contact-fb-1",
      name: "Robert Garcia",
      profilePicUrl: "https://i.pravatar.cc/150?img=32",
    },
    connectedAccount: {
      id: "acc-fb-1",
      accountName: "Sunny Coffee Facebook",
    },
    contentId: "content-1",
    externalThreadId: "fb-comment-thread-22",
  },
  {
    id: "conv-3",
    platform: "INSTAGRAM",
    channel: "dm",
    lastMessageAt: new Date(baseNow - 2 * 60 * 60 * 1000),
    contact: {
      id: "contact-ig-2",
      name: "Studio Bloom",
      profilePicUrl: "",
    },
    connectedAccount: {
      id: "acc-ig-1",
      accountName: "@sunnycafe",
    },
    contentId: null,
    externalThreadId: null,
  },
];

export const mockMessages: Record<string, InboxMessage[]> = {
  "conv-1": [
    {
      id: "conv-1-msg-1",
      externalId: "msg-001",
      sender: "user",
      channel: "dm",
      text: "Hey there! We loved the latte art in your recent post. Do you take catering orders for private events?",
      attachments: [],
      createdAt: new Date(baseNow - 30 * 60 * 1000),
      contentId: null,
      metadata: {},
    },
    {
      id: "conv-1-msg-2",
      externalId: "msg-002",
      sender: "self",
      channel: "dm",
      text: "Hi Emily! Thanks so much. Yes, we cater events up to 80 guests. I can share our seasonal menu if that helps.",
      attachments: [],
      createdAt: new Date(baseNow - 12 * 60 * 1000),
      contentId: null,
      metadata: {},
    },
    {
      id: "conv-1-msg-3",
      externalId: "msg-003",
      sender: "user",
      channel: "dm",
      text: "That would be great! We're looking at an outdoor brunch in June.",
      attachments: [],
      createdAt: new Date(baseNow - 5 * 60 * 1000),
      contentId: null,
      metadata: {},
    },
  ],
  "conv-2": [
    {
      id: "conv-2-msg-1",
      externalId: "msg-101",
      sender: "user",
      channel: "post_comment",
      text: "The new single-origin roast is unreal! Do you ship internationally?",
      attachments: [],
      createdAt: new Date(baseNow - 3 * 60 * 60 * 1000),
      contentId: "content-1",
      metadata: {
        referencedPost: "Sunny Coffee — Launching Ethiopia Single Origin",
      },
    },
    {
      id: "conv-2-msg-2",
      externalId: "msg-102",
      sender: "self",
      channel: "post_comment",
      text: "Thanks Robert! We ship across the US right now and are working on EU fulfilment this summer.",
      attachments: [],
      createdAt: new Date(baseNow - 46 * 60 * 1000),
      contentId: "content-1",
      metadata: {},
    },
  ],
  "conv-3": [
    {
      id: "conv-3-msg-1",
      externalId: "msg-201",
      sender: "user",
      channel: "dm",
      text: "Could we collaborate on a giveaway? We can shoot content at your space.",
      attachments: [
        {
          type: "image",
          url: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=400&q=80",
        },
      ],
      createdAt: new Date(baseNow - 4 * 60 * 60 * 1000),
      contentId: null,
      metadata: {},
    },
    {
      id: "conv-3-msg-2",
      externalId: "msg-202",
      sender: "self",
      channel: "dm",
      text: "Love that idea! Let me share it with the team and circle back.",
      attachments: [],
      createdAt: new Date(baseNow - 2 * 60 * 60 * 1000),
      contentId: null,
      metadata: {},
    },
  ],
};
