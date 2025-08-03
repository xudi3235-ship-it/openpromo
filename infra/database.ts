const mysql = planetscale.getDatabaseOutput({
    name: "openpromo",
    organization: "openpromo",
});

const branch =
    $app.stage !== "production"
        ? new planetscale.Branch("DatabaseBranch", {
              database: mysql.name,
              organization: mysql.organization,
              name: $app.stage,
              parentBranch: "production",
          })
        : planetscale.getBranchOutput({
              name: "production",
              organization: mysql.organization,
              database: mysql.name,
          });

const password = new planetscale.Password("DatabasePassword", {
    database: mysql.name,
    organization: mysql.organization,
    branch: branch.name,
    role: "admin",
    name: `${$app.name}-${$app.stage}-credentials`,
});

export const database = new sst.Linkable("Database", {
    properties: {
        username: password.username,
        host: branch.mysqlAddress,
        password: password.plaintext,
        database: password.database,
        port: 3306,
    },
});
