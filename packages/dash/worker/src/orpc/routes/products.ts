import { EntProduct } from "@core/domain/product";
import type { InferRouterInputs, InferRouterOutputs } from "@orpc/server";
import { ProductListQuerySchema } from "@shared/product";
import * as z from "zod";
import { orpcBuilder } from "../context";
import { withWorkspaceRole } from "../middleware";
import {
  createWorkspaceInputSchema,
  workspaceRoleMappers,
} from "../shared/workspace-helpers";

const listProductsInput = createWorkspaceInputSchema(ProductListQuerySchema);

const productIdentifierInput = createWorkspaceInputSchema(
  z.object({
    productId: z.string().min(1),
  }),
);

const createProductInput = createWorkspaceInputSchema(
  EntProduct.Schemas().create,
);

const updateProductInput = createWorkspaceInputSchema(
  EntProduct.Schemas().update.extend({
    productId: z.string().min(1),
  }),
);

export const listProducts = orpcBuilder
  .input(listProductsInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const { page, pageSize, search, category, source } = input;

    const result = await EntProduct.list({
      page,
      pageSize,
      search,
      category,
      source,
    });

    return {
      products: result.products.map((p) => p.toJSON()),
      pagination: result.pagination,
    };
  });

export const getProduct = orpcBuilder
  .input(productIdentifierInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const product = await EntProduct.fromID(input.productId);
    return {
      product: product.toJSON(),
    };
  });

export const createProduct = orpcBuilder
  .input(createProductInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const {
      workspaceId: _workspaceId,
      workspaceSlug: _workspaceSlug,
      ...data
    } = input;
    const product = await EntProduct.create(data);
    return {
      product: product.toJSON(),
    };
  });

export const updateProduct = orpcBuilder
  .input(updateProductInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const {
      productId,
      workspaceId: _workspaceId,
      workspaceSlug: _workspaceSlug,
      ...data
    } = input;
    const product = await EntProduct.fromID(productId);
    await product.update(data);
    return {
      product: product.toJSON(),
    };
  });

export const deleteProduct = orpcBuilder
  .input(productIdentifierInput)
  .use(withWorkspaceRole, workspaceRoleMappers.editor)
  .handler(async ({ input }) => {
    const product = await EntProduct.fromID(input.productId);
    await product.delete();
    return {
      success: true,
    };
  });

export const productsRouter = orpcBuilder.router({
  list: listProducts,
  get: getProduct,
  create: createProduct,
  update: updateProduct,
  delete: deleteProduct,
});

export type ProductRouterInputs = InferRouterInputs<typeof productsRouter>;
export type ProductRouterOutputs = InferRouterOutputs<typeof productsRouter>;
