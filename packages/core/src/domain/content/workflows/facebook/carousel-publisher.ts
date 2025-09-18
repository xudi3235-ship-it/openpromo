import type {
  CoreWorkflowContext,
  CoreWorkflowStep,
} from "@core/helpers/workflow";
import { NotImplementedError } from "@core/utils/error";

export async function publishCarouselPost(
  _ctx: CoreWorkflowContext,
  _step: CoreWorkflowStep,
  _pendingContentID: string,
): Promise<string> {
  throw new NotImplementedError(
    "Facebook carousel publishing is not implemented",
  );
}
