import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { orpcBuilder } from "../../context";
import { createContent } from "./create-content";
import { batchDeleteContent, deleteContent } from "./delete-content";
import { listContents } from "./list-content";

export const contentRouter = orpcBuilder.router({
  list: listContents,
  create: createContent,
  delete: deleteContent,
  batchDelete: batchDeleteContent,
});

export type ContentRouterInputs = InferRouterInputs<typeof contentRouter>;
export type ContentRouterOutputs = InferRouterOutputs<typeof contentRouter>;
