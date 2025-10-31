import type { ProductSelectType } from "@core/schemas/product.sql";
import type { ColumnDef } from "@tanstack/react-table";
import { actionsColumn } from "./columns/actions-column";
import { categoryColumn } from "./columns/category-column";
import { createdAtColumn } from "./columns/created-at-column";
import { productColumn } from "./columns/product-column";
import { selectColumn } from "./columns/select-column";
import { stateColumn } from "./columns/state-column";
import { tagsColumn } from "./columns/tags-column";

export const columns: ColumnDef<ProductSelectType>[] = [
  selectColumn,
  productColumn,
  categoryColumn,
  tagsColumn,
  stateColumn,
  createdAtColumn,
  actionsColumn,
];
