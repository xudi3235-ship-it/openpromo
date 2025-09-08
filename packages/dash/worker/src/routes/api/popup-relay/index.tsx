/** @jsxImportSource hono/jsx */

import type { ApiEnv } from "@core/helpers/api-env";
import { Hono } from "hono";
import { zValidator } from "../../../middleware/zod-validator";
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
