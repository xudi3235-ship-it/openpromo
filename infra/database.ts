import { secret } from "./secret";
import { isPermanentStage } from "./stage";

const project = neon.getProjectOutput({ id: secret.NEON_PROJECT_ID.value });
const branchName = isPermanentStage ? $app.stage : `dev-${$app.stage}`;

const branch =
  $app.stage !== "production"
    ? new neon.Branch("NeonBranch", {
        projectId: project.id,
        parentId: project.defaultBranchId,
        name: branchName,
      })
    : neon.getBranchesOutput({
        projectId: project.id,
        id: project.defaultBranchId,
      });

const endpoint =
  $app.stage !== "production"
    ? new neon.Endpoint("NeonEndpoint", {
        projectId: project.id,
        branchId: branch.id,
        type: "read_write",
        autoscalingLimitMinCu: 0.25,
        autoscalingLimitMaxCu: 1,
      })
    : neon.getBranchEndpointsOutput({
        projectId: project.id,
        branchId: project.defaultBranchId,
      }).endpoints[0];

const role = new neon.Role("NeonAdminRole", {
  name: "admin",
  projectId: project.id,
  branchId: branch.id,
});

const db = new neon.Database("NeonDatabase", {
  name: "openpromo-db",
  projectId: project.id,
  branchId: branch.id,
  ownerName: role.name,
});

// Create a Linkable resource to use in your app
export const database = new sst.Linkable("Database", {
  properties: {
    host: endpoint.host,
    username: role.name,
    password: role.password,
    database: db.name,
  },
});

// export const studio = new sst.x.DevCommand("Studio", {
//   link: [database],
//   dev: {
//     command: "pnpm db:studio",
//     directory: "packages/core",
//   },
// });
