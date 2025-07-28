import { event } from "sst/event";
import {
  SchedulerClient,
  CreateScheduleCommand,
  UpdateScheduleCommand,
  DeleteScheduleCommand,
  FlexibleTimeWindowMode,
} from "@aws-sdk/client-scheduler";
import { Resource } from "sst";
import { nullThrows } from "../util/common";

const scheduler = new SchedulerClient();

// ---- constants ----
const schedulerSource = "openpromo.scheduler";

/**
 * A conditional type for schedule options.
 *
 * This is the core of the type-safety improvement. It inspects the parameters of
 * the `create` function on a given `event.Definition`.
 *
 * - If `create` only takes one argument (`properties`), then the `metadata`
 * property in the options is forbidden (`never`).
 * - If `create` takes two arguments (`properties`, `metadata`), then the
 * `metadata` property is required and its type is inferred from the
 * second argument of `create`.
 */
type ScheduleOptions<T extends event.Definition> = {
  scheduleName?: string;
  schedulerRoleArn?: string;
} & (Parameters<T["create"]> extends [properties: any]
  ? { metadata?: never }
  : { metadata: Parameters<T["create"]>[1] });

/**
 * Validate that the scheduled time is in the future.
 */
function validateScheduledTime(scheduledAt: Date | string): Date {
  const scheduledDate = new Date(scheduledAt);
  const now = new Date();
  if (scheduledDate <= now) {
    throw new Error(
      `Scheduled time ${scheduledDate.toISOString()} must be in the future`,
    );
  }
  return scheduledDate;
}

/**
 * Create the schedule configuration object.
 * This internal function is now updated to dynamically handle the call to `eventDef.create`.
 */
async function createScheduleConfig<T extends event.Definition>(
  scheduleName: string,
  eventDef: T,
  properties: T["$input"],
  scheduledDate: Date,
  options?: ScheduleOptions<T>,
) {
  // The ScheduleOptions<T> type provides compile-time safety for the caller.
  // Inside this function, we dynamically call `create` with the correct arguments
  // by preparing the arguments array.
  const createArgs: [T["$input"], ...any[]] = [properties];
  // Check if options and the metadata property exist. The conditional type ensures
  // this is only possible when the event definition expects it.
  if (options && "metadata" in options && options.metadata !== undefined) {
    createArgs.push(options.metadata);
  }

  // We cast `create` to a function that accepts a spreadable array of arguments.
  // The external type safety from `ScheduleOptions<T>` ensures this call is valid.
  const eventPayload = await (
    eventDef.create as (...args: any[]) => Promise<T["$payload"]>
  )(...createArgs);

  const roleArn = nullThrows(
    options?.schedulerRoleArn || process.env.SCHEDULER_ROLE_ARN,
  );

  return {
    Name: scheduleName,
    ScheduleExpression: `at(${scheduledDate.toISOString().slice(0, 19)})`,
    Target: {
      Arn: Resource.Bus.arn!,
      RoleArn: roleArn,
      EventBridgeParameters: {
        DetailType: eventDef.type,
        Source: schedulerSource,
      },
      Input: JSON.stringify(eventPayload),
    },
    FlexibleTimeWindow: {
      Mode: FlexibleTimeWindowMode.OFF,
    },
    eventPayload,
  };
}

/**
 * Schedules an event with full type-safety for properties and metadata.
 *
 * @param eventDef The `sst/event` definition object.
 * @param properties The type-safe properties for the event.
 * @param scheduledAt The future time to trigger the event.
 * @param options The schedule options, with metadata being conditionally required.
 */
export async function scheduleEvent<T extends event.Definition>(
  eventDef: T,
  properties: T["$input"],
  scheduledAt: Date | string,
  options?: ScheduleOptions<T>,
) {
  const scheduledDate = validateScheduledTime(scheduledAt);

  // Generate a unique schedule name if not provided.
  const scheduleName =
    options?.scheduleName ||
    `${eventDef.type}-${Date.now()}-${Math.random()
      .toString(36)
      .substring(2, 9)}`;

  const { eventPayload, ...scheduleConfig } = await createScheduleConfig(
    scheduleName,
    eventDef,
    properties,
    scheduledDate,
    options,
  );

  // Create the EventBridge Scheduler schedule.
  const result = await scheduler.send(
    new CreateScheduleCommand(scheduleConfig),
  );

  return {
    scheduleArn: result.ScheduleArn,
    scheduleName,
    eventPayload,
  };
}

/**
 * Updates an existing scheduled event with full type-safety.
 *
 * @param scheduleName The name of the schedule to update.
 * @param eventDef The `sst/event` definition object.
 * @param properties The type-safe properties for the event.
 * @param scheduledAt The new future time to trigger the event.
 * @param options The schedule options, with metadata being conditionally required.
 */
export async function updateScheduledEvent<T extends event.Definition>(
  scheduleName: string,
  eventDef: T,
  properties: T["$input"],
  scheduledAt: Date | string,
  options?: ScheduleOptions<T>,
) {
  const scheduledDate = validateScheduledTime(scheduledAt);

  const { eventPayload, ...scheduleConfig } = await createScheduleConfig(
    scheduleName,
    eventDef,
    properties,
    scheduledDate,
    options,
  );

  // Update the EventBridge Scheduler schedule.
  const result = await scheduler.send(
    new UpdateScheduleCommand(scheduleConfig),
  );

  return {
    scheduleArn: result.ScheduleArn,
    scheduleName,
    eventPayload,
  };
}

/**
 * Deletes a scheduled event by its name.
 * @param scheduleName The name of the schedule to delete.
 */
export async function deleteScheduledEvent(scheduleName: string) {
  return await scheduler.send(
    new DeleteScheduleCommand({
      Name: scheduleName,
    }),
  );
}
