import { EntStyleComponent } from "@core/domain/style-component";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import * as z from "zod";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

const listStylesInput = createWorkspaceInputSchema(
  z.object({
    page: z.number().int().min(1).default(1),
    pageSize: z.number().int().min(1).max(10).default(10),
    search: z.string().min(1).max(200).optional(),
    sort: z.enum(["latest", "oldest", "most_used"]).default("latest"),
    officialOnly: z.boolean().optional(),
  }),
);

export const listStyles = orpcBuilder
  .input(listStylesInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const { page, pageSize, search, sort, officialOnly } = input;

    const result = await EntStyleComponent.list({
      page,
      pageSize,
      search,
      sort,
      officialOnly,
    });

    return {
      styles: result.styles.map((style) => style.toJSON()),
      pagination: result.pagination,
    };
  });

const styleIdentifierInput = createWorkspaceInputSchema(
  z.object({
    styleId: z.string().min(1),
  }),
);

const createStyleInput = createWorkspaceInputSchema(
  EntStyleComponent.Schemas().create,
);

const createManyStylesInput = createWorkspaceInputSchema(
  z.object({
    styles: z.array(EntStyleComponent.Schemas().create).min(1).max(10),
  }),
);

const updateStyleInput = createWorkspaceInputSchema(
  EntStyleComponent.Schemas().update.extend({
    styleId: z.string().min(1),
  }),
);

export const getStyle = orpcBuilder
  .input(styleIdentifierInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const style = await EntStyleComponent.fromID(input.styleId);
    return {
      style: style.toJSON(),
    };
  });

export const createStyle = orpcBuilder
  .input(createStyleInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const {
      workspaceId: _workspaceId,
      workspaceSlug: _workspaceSlug,
      ...data
    } = input;
    const style = await EntStyleComponent.create(data);
    return {
      style: style.toJSON(),
    };
  });

export const createManyStyles = orpcBuilder
  .input(createManyStylesInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const {
      styles: stylesToCreate,
      workspaceId: _workspaceId,
      workspaceSlug: _workspaceSlug,
    } = input;

    const createdStyles = await Promise.all(
      stylesToCreate.map(async (styleData) => {
        const style = await EntStyleComponent.create(styleData);
        return style.toJSON();
      }),
    );

    return {
      styles: createdStyles,
    };
  });

export const updateStyle = orpcBuilder
  .input(updateStyleInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const {
      styleId,
      workspaceId: _workspaceId,
      workspaceSlug: _workspaceSlug,
      ...payload
    } = input;
    const style = await EntStyleComponent.fromID(styleId);
    await style.update(payload);
    return {
      style: style.toJSON(),
    };
  });

export const deleteStyle = orpcBuilder
  .input(styleIdentifierInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const style = await EntStyleComponent.fromID(input.styleId);
    await style.delete();
    return { styleId: input.styleId };
  });

export const stylesRouter = {
  list: listStyles,
  get: getStyle,
  create: createStyle,
  createMany: createManyStyles,
  update: updateStyle,
  delete: deleteStyle,
};

// infer the inputs / outputs so that clients are easier to use.
export type StyleRouterOutputs = InferRouterOutputs<typeof stylesRouter>;
export type StyleRouterInputs = InferRouterInputs<typeof stylesRouter>;
