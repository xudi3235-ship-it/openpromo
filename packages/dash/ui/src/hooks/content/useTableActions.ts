import { useContentActionController } from "./useContentActionController";

/**
 * Table-specific hook for content actions
 * Includes publish functionality and table-specific behaviors
 */
export const useTableActions = () => {
  return {
    ...useContentActionController(),
  };
};
