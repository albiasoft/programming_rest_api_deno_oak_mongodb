import { APIServer } from "./src/APIServer.ts";
const server = new APIServer({ hostname: "localhost", port: 8000 });
server.startServer();
