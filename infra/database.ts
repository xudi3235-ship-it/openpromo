import { isPermanentStage } from "./stage";

const host = "localhost";
const port = 3307; // Changed to avoid conflict with existing MySQL on port 3306
const username = "root";
const password = "password";
const database = "mydb";

if (!isPermanentStage) {
  const mysqlVolume = new docker.Volume("mysql-data", {
    name: "mysql-data",
  });

  const mysqlContainer = new docker.Container("mysql", {
    image: "mysql:latest",
    name: "mysql",
    ports: [
      {
        internal: 3306, // MySQL always runs on 3306 inside the container
        external: port, // But we expose it on a different external port
      },
    ],
    envs: [`MYSQL_ROOT_PASSWORD=${password}`, `MYSQL_DATABASE=${database}`],
    volumes: [
      {
        volumeName: mysqlVolume.name,
        containerPath: "/var/lib/mysql",
      },
    ],
  });

  // Provide connection details to your app
  new sst.Linkable("Database", {
    properties: {
      host,
      port,
      username,
      password,
      database,
      url: `mysql://${username}:${password}@${host}:${port}/${database}`,
    },
  });
}
