import { APIServer } from "./src/api_server/APIServer.ts";
const server = new APIServer({ hostname: "localhost", port: 8000 });
server.startServer();
