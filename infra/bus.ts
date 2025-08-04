import { database } from "./database";

export const bus = new sst.aws.Bus("Bus");

// Create IAM role for EventBridge Scheduler
const schedulerRole = new aws.iam.Role("SchedulerRole", {
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

const _busSubscriber = bus.subscribe("busSubscriber", {
  handler: "packages/functions/src/bus_subscriber.handler",
  environment: {
    SCHEDULER_ROLE_ARN: schedulerRole.arn,
  },
  permissions: [
    {
      actions: ["scheduler:CreateSchedule", "scheduler:DeleteSchedule"],
      resources: ["*"],
    },
  ],
  link: [bus, database],
});
