import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { orpcBuilder } from "../../context";
import {
  deleteContentGroup,
  getContentGroup,
  publishContentGroup,
  updateContentGroup,
} from "./content-groups";
import { createContent } from "./create-content";
import { batchDeleteContent, deleteContent } from "./delete-content";
import { listContents } from "./list-content";

export const contentRouter = orpcBuilder.router({
  list: listContents,
  create: createContent,
  delete: deleteContent,
  batchDelete: batchDeleteContent,
  groups: orpcBuilder.router({
    get: getContentGroup,
    update: updateContentGroup,
    publish: publishContentGroup,
    delete: deleteContentGroup,
  }),
});

export const contentGroupsRouter = contentRouter.groups;

export type ContentRouterInputs = InferRouterInputs<typeof contentRouter>;
export type ContentRouterOutputs = InferRouterOutputs<typeof contentRouter>;
export type ContentGroupsRouterInputs = InferRouterInputs<
  typeof contentGroupsRouter
>;
export type ContentGroupsRouterOutputs = InferRouterOutputs<
  typeof contentGroupsRouter
>;
