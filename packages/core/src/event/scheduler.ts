import type { CreateScheduleCommandInput } from "@aws-sdk/client-scheduler";
import { FlexibleTimeWindowMode } from "@aws-sdk/client-scheduler";
import { nullThrows } from "@openpromo/js-shared/common";
import { Resource } from "sst";
import type { event } from "sst/event";
import { DEFAULT_AWS_REGION } from "../aws";
import type { AwsOptions } from "../aws/client";
import { client } from "../aws/client";

export namespace Scheduler {
  const schedulerSource = "openpromo.scheduler";
  export type Name = Extract<typeof Resource, { type: "sst.aws.Bus" }>["name"];

  function url(region: string = DEFAULT_AWS_REGION) {
    return `https://scheduler.${region}.amazonaws.com/`;
  }

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
    aws?: AwsOptions;
    // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
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
  ): Promise<CreateScheduleCommandInput & { eventPayload: T["$payload"] }> {
    // The ScheduleOptions<T> type provides compile-time safety for the caller.
    // Inside this function, we dynamically call `create` with the correct arguments
    // by preparing the arguments array.
    // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
    const createArgs: [T["$input"], ...any[]] = [properties];
    // Check if options and the metadata property exist. The conditional type ensures
    // this is only possible when the event definition expects it.
    if (options && "metadata" in options && options.metadata !== undefined) {
      createArgs.push(options.metadata);
    }

    // We cast `create` to a function that accepts a spreadable array of arguments.
    // The external type safety from `ScheduleOptions<T>` ensures this call is valid.
    const eventPayload =
      await // biome-ignore lint/suspicious/noExplicitAny: TODO: fix later
      (eventDef.create as (...args: any[]) => Promise<T["$payload"]>)(
        ...createArgs,
      );
    const roleArn = nullThrows(
      options?.schedulerRoleArn || process.env.SCHEDULER_ROLE_ARN,
    );
    return {
      Name: scheduleName,
      // use UTC for all dates
      ScheduleExpressionTimezone: "UTC",
      ScheduleExpression: `at(${scheduledDate.toISOString().slice(0, 19)})`,
      // TODO: this is for idempotence, i feel like
      // there should be a better option.
      ClientToken: scheduleName.replace(/[^a-zA-Z0-9\-_]/g, "-"),
      Target: {
        Arn: Resource.Bus.arn,
        RoleArn: roleArn,
        EventBridgeParameters: {
          DetailType: eventDef.type,
          Source: schedulerSource,
        },
        Input: JSON.stringify(eventPayload),
        // TODO: we will next impelemnt retries, DLQ.
        // RetryPolicy: {},
        // DeadLetterConfig
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
  export async function createSchedule<T extends event.Definition>(
    eventDef: T,
    properties: T["$input"],
    scheduledAt: Date,
    options?: ScheduleOptions<T>,
  ): Promise<{
    scheduleArn: string;
    scheduleName: string;
    eventPayload: T["$payload"];
  }> {
    const scheduledDate = validateScheduledTime(scheduledAt);

    // Generate a unique schedule name if not provided.
    const scheduleName =
      options?.scheduleName ||
      `${eventDef.type}-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    const { eventPayload, ...scheduleConfig } = await createScheduleConfig(
      scheduleName,
      eventDef,
      properties,
      scheduledDate,
      options,
    );

    const c = await client();
    const region = process.env.AWS_REGION || DEFAULT_AWS_REGION;
    const u = url(region);

    const response = await c
      .fetch(`${u}schedules/${scheduleName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
        },
        body: JSON.stringify(scheduleConfig),
      })
      .catch((e) => {
        console.error(e);
        if (e instanceof Error) console.log("cause", e.cause);
        throw e;
      });

    console.log("4/ step");
    if (!response.ok) {
      const errorText = await response.text();
      console.log("Error response body:", errorText);
      throw new SchedulerError(response);
    }

    console.log("L158");
    const result = (await response.json()) as { ScheduleArn?: string };
    console.log("Scheduled event created:", result);

    return {
      // FIXME: handle this
      scheduleArn: result.ScheduleArn as string,
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
  export async function update<T extends event.Definition>(
    scheduleName: string,
    eventDef: T,
    properties: T["$input"],
    scheduledAt: Date | string,
    options?: ScheduleOptions<T>,
  ): Promise<{
    scheduleArn: string;
    scheduleName: string;
    eventPayload: T["$payload"];
  }> {
    const scheduledDate = validateScheduledTime(scheduledAt);

    const { eventPayload, ...scheduleConfig } = await createScheduleConfig(
      scheduleName,
      eventDef,
      properties,
      scheduledDate,
      options,
    );

    const c = await client();
    const region = process.env.AWS_REGION || DEFAULT_AWS_REGION;
    const u = url(region);

    // Update the EventBridge Scheduler schedule using AWS API
    const response = await c
      .fetch(`${u}schedules/${scheduleName}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
        },
        body: JSON.stringify(scheduleConfig),
      })
      .catch((e) => {
        if (e instanceof Error) console.log("cause", e.cause);
        throw new SchedulerError(
          e.response || { status: 500, statusText: "Unknown error" },
        );
      });

    if (!response.ok) throw new SchedulerError(response);
    const result = (await response.json()) as { ScheduleArn?: string };

    return {
      scheduleArn:
        result.ScheduleArn ||
        `arn:aws:scheduler:${region}:${process.env.AWS_ACCOUNT_ID}:schedule/default/${scheduleName}`,
      scheduleName,
      eventPayload,
    };
  }

  /**
   * Deletes a scheduled event by its name.
   * @param scheduleName The name of the schedule to delete.
   */
  export async function remove(scheduleName: string): Promise<void> {
    const c = await client();
    const region = process.env.AWS_REGION || DEFAULT_AWS_REGION;
    const u = url(region);

    const response = await c
      .fetch(`${u}schedules/${scheduleName}`, {
        method: "DELETE",
        headers: {
          "Content-Type": "application/x-amz-json-1.1",
        },
      })
      .catch((e) => {
        if (e instanceof Error) console.log("cause", e.cause);
        throw new SchedulerError(
          e.response || { status: 500, statusText: "Unknown error" },
        );
      });

    if (!response.ok) throw new SchedulerError(response);
  }

  export class SchedulerError extends Error {
    constructor(public readonly response: Response) {
      super("Failed to interact with EventBridge Scheduler");
    }
  }
}
