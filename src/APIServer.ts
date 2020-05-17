import { Application, Router, Context, Status, STATUS_TEXT } from "https://deno.land/x/oak/mod.ts";
import { green, cyan, bold } from "https://deno.land/std@0.51.0/fmt/colors.ts";
import { UserManager, User, UserManagerResponse, UserManagerResponseStatus } from "./UserManager.ts";

export interface ServerOptions {
  port: number;
  hostname: string;
}

export class APIServer {

  private app = new Application();
  private router = new Router({methods: ["DELETE", "GET", "POST", "PUT"]});
  private abortController = new AbortController();
  private userManager: UserManager = new UserManager();
  public hostname: string;
  public port: number;
  public isRunning: boolean = false;

  constructor(options: ServerOptions = { hostname: "localhost", port: 8080 }) {
    const {
      hostname,
      port,
    } = options;

    this.hostname = hostname;
    this.port = port;
    this.userManager.connectWithOptions({ hostname: "localhost", port: 27017, db: "api", username: "", password: "" });
    this.initLogger();
    this.initEndpoints();
  }

  async startServer() {
    if (this.isRunning) {
      this.stopServer();
    }

    this.isRunning = true;
    const { signal } = this.abortController;
    console.log(bold(green("Running server at "))+bold(cyan(this.hostname+":"+this.port.toString())));
    await this.app.listen({ hostname: this.hostname, port: this.port, signal });
    console.log(bold(green("Server stoped")));
    this.isRunning = false;
  }

  stopServer() {
    console.log("Server will stop on next API request...");
    this.abortController.abort();
  }

  private initLogger() {
    this.app.use(async (context, next) => {
      const start: number = performance.now(); // float value in miliseconds/microseconds
      await next();
      const duration: string = this.highPrecisionToHumanReadable(performance.now() - start);
      const status = STATUS_TEXT.get(context.response.status || Status.OK) || "OK";
      console.log(bold(this.getFormatedDatetime())+" "+bold(green(context.request.method))+" "+bold(cyan(context.request.url.pathname))+" status:"+bold(status)+" duration:"+bold(duration));
    });
  }

  private initEndpoints() {
    // GET /users
    this.router.get("/users", async (context) => {
      let result: UserManagerResponse = await this.userManager.getUsers();
      context.response.status = this.GetHTTPStatus(result.status);
      context.response.body = result.value;
    });

    // GET /users/:id
    this.router.get("/users/:id", async (context) => {
      if (!context.params.id) {
        context.response.status = Status.BadRequest;
        context.response.body = "Invalid parameters.";
      } else {
        let userId = parseInt(context.params.id);
        let result: UserManagerResponse = await this.userManager.getUserWithId(userId);
        context.response.status = this.GetHTTPStatus(result.status);
        context.response.body = result.value;
      }
    });

    // POST /users
    this.router.post("/users", async (context) => {
      if (!context.request.hasBody) {
        context.response.status = Status.BadRequest;
        context.response.body = "Invalid body.";
      } else {
        let user: User = (await context.request.body()).value;
        let result: UserManagerResponse = await this.userManager.createUser(user);
        context.response.status = this.GetHTTPStatus(result.status);
        context.response.body = result.value;
      }
    });

    // PUT /users/:id
    this.router.put("/users/:id", async (context) => {
      if (!context.request.hasBody || !context.params.id) {
        context.response.status = Status.BadRequest;
        context.response.body = "Invalid body or parameters.";
      } else {
        let user: User = (await context.request.body()).value;
        let userId = parseInt(context.params.id);
        let result: UserManagerResponse = await this.userManager.updateUserWithId(userId, user);
        context.response.status = this.GetHTTPStatus(result.status);
        context.response.body = result.value;
      }
    });

    // DELETE /users/:id
    this.router.delete("/users/:id", async (context) => {
      if (!context.params.id) {
        context.response.status = Status.BadRequest;
        context.response.body = "Invalid parameters.";
      } else {
        let userId = parseInt(context.params.id);
        let result: UserManagerResponse = await this.userManager.deleteUserWithId(userId);
        context.response.status = this.GetHTTPStatus(result.status);
        context.response.body = result.value;
      }
    });

    this.app.use(this.router.routes());
    this.app.use(this.router.allowedMethods());
  }

  private GetHTTPStatus(status: UserManagerResponseStatus): Status {
    switch (status) {
      case UserManagerResponseStatus.OK:
        return Status.OK;
        break;
      case UserManagerResponseStatus.NOT_FOUND:
        return Status.NotFound;
        break;
      case UserManagerResponseStatus.INVALID_DATA:
        return Status.BadRequest;
        break;
      case UserManagerResponseStatus.ERROR:
        return Status.InternalServerError;
        break;
      case UserManagerResponseStatus.CONFLICT_ID:
        return Status.Conflict;
      default:
        return Status.OK;
    }
  }

  private pad2(n: any) {
    return n < 10 ? '0' + n : n;
  }

  private getFormatedDatetime(): string {
    let date = new Date();
    return date.getFullYear().toString()+"/"+this.pad2(date.getMonth() + 1)+"/"+this.pad2( date.getDate())+" "+this.pad2( date.getHours())+":"+this.pad2( date.getMinutes() )+":"+this.pad2(date.getSeconds());
  }

  private highPrecisionToHumanReadable(value: number): string {
    let seconds = Math.trunc(value / 1000);
    let miliseconds = Math.trunc(value - (seconds * 1000));
    let microseconds = Math.trunc((value % 1) * 1000);

    if(!seconds && !miliseconds) return `${microseconds}μ`;
    else if(!seconds) return `${miliseconds}ms ${microseconds}μ`;
    else return `${seconds}s ${miliseconds}ms ${microseconds}μ`;
  }
}
