/** @jsxImportSource hono/jsx */

import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import type { ApiEnv } from "../../../types";
import { popupRelayQuerySchema } from "./constants";
import { PopupRelay } from "./template";

/**
 * This route is used to  close the popup window and
 * relay the message from the popup to the parent window via window.postMessage
 */
export const popupRelayRoute = new Hono<ApiEnv>().get(
  "/",
  zValidator("query", popupRelayQuerySchema),
  (c) => {
    const { message } = c.req.valid("query");

    return c.html(<PopupRelay message={message} />);
  },
);
