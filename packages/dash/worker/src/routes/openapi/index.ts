// import { Scalar } from "@scalar/hono-api-reference";
// import { Hono } from "hono";
// import { openAPIRouteHandler } from "hono-openapi";
// import { apiRoutes } from "../api";

// export const openapiRoutes = new Hono()
//   .get(
//     "/openapi.json",
//     openAPIRouteHandler(apiRoutes, {
//       documentation: {
//         info: {
//           title: "OpenpPromo API",
//           version: "0.0.1",
//           description: "API documentation for OpenpPromo",
//         },
//       },
//     }),
//   )
//   .get("/scalar", Scalar({ url: "/openapi/openapi.json" }));
