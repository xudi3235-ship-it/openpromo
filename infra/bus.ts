import { database } from "./database";
import { allSecrets } from "./secret";

export const bus = new sst.aws.Bus("Bus");

// Create IAM role for EventBridge Scheduler
export const schedulerRole = new aws.iam.Role("SchedulerRole", {
  assumeRolePolicy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Principal: {
          Service: "scheduler.amazonaws.com",
        },
        Action: "sts:AssumeRole",
      },
    ],
  },
});

// Attach policy to the role
const _schedulerRolePolicy = new aws.iam.RolePolicy("SchedulerRolePolicy", {
  role: schedulerRole.id,
  policy: {
    Version: "2012-10-17",
    Statement: [
      {
        Effect: "Allow",
        Action: ["events:PutEvents"],
        Resource: [bus.arn],
      },
    ],
  },
});

// permissions for scheduling events
export const schedulerPermissions = sst.aws.permission({
  actions: [
    "scheduler:CreateSchedule",
    "scheduler:UpdateSchedule",
    "scheduler:DeleteSchedule",
    "scheduler:GetSchedule",
    "scheduler:ListSchedules",
  ],
  resources: ["*"],
});

export const eventBridgePermissions = sst.aws.permission({
  actions: ["events:PutEvents"],
  resources: [bus.arn],
});

const _busSubscriber = bus.subscribe("busSubscriber", {
  handler: "packages/functions/src/event/bus_subscriber.handler",
  environment: {
    SCHEDULER_ROLE_ARN: schedulerRole.arn,
  },
  link: [
    bus,
    database,
    ...allSecrets,
    schedulerPermissions,
    eventBridgePermissions,
  ],
});
