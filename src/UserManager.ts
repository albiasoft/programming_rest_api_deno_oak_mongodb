import { init, MongoClient, Database, Collection } from "https://deno.land/x/mongo/mod.ts";

export interface DatabaseOptions {
  port: number;
  hostname: string;
  db: string;
  username: string;
  password: string;
}

export interface User {
  Id: number;
  Name?: string;
  Email?: string;
  City?: string;
  Enabled?: boolean;
  Gender?: string;
  Profession?: string;
  Description?: string;
  Birthdate?: Date;
}

export enum UserManagerResponseStatus {
  OK,
  ERROR,
  NOT_FOUND,
  INVALID_DATA,
  CONFLICT_ID,
}

export interface UserManagerResponse {
  status: UserManagerResponseStatus;
  value?: any | undefined;
}

export class UserManager {

  private client = new MongoClient();
  private users?: Collection;

  public async connectWithOptions(options: DatabaseOptions = { hostname: "localhost", port: 27017, db: "api", username: "", password: "" }) {
    const {
      hostname,
      port,
      db,
      username,
      password
    } = options;

    await init(); // Initialize the plugin
    let mongoUri: string = (username == '') ? `mongodb://${hostname}:${port}` : `mongodb://${username}:${password}@${hostname}:${port}`;
    this.client.connectWithUri(mongoUri); // Connect to Mongo
    this.users = this.client.database(db).collection("users");
  }

  public async updateUserWithId(userId: number, user: User | undefined): Promise<UserManagerResponse> {
    if(!this.users) {
      return { status: UserManagerResponseStatus.ERROR, value: "Error fetching users from database." };
    } else if(!user) {
      return { status: UserManagerResponseStatus.INVALID_DATA, value: "Invalid body data." };
    }

    const { matchedCount, modifiedCount, upsertedId } = await this.users.updateOne( {Id: userId}, { $set: user } );
    return matchedCount ? { status: UserManagerResponseStatus.OK, value: user} : { status: UserManagerResponseStatus.NOT_FOUND, value: ""};
  }

  public async getUserWithId(userId: number): Promise<UserManagerResponse> {
    if(!this.users) {
      return { status: UserManagerResponseStatus.ERROR, value: "Error fetching users from database." };
    }

    const user = await this.users.findOne({Id: userId});
    if(user) {
      delete user._id;
      return { status: UserManagerResponseStatus.OK, value: user};
    } else {
      return { status: UserManagerResponseStatus.NOT_FOUND, value: ""};
    }
  }

  public async getUsers(): Promise<UserManagerResponse> {
    if(!this.users) {
      return { status: UserManagerResponseStatus.ERROR, value: "Error fetching users from database."};
    }

    const users = await this.users.find({});
    users.forEach(function(user: any) {
      delete user._id;
    });
    return {status: UserManagerResponseStatus.OK, value: users};
  }

  public async createUser(user: User | undefined): Promise<UserManagerResponse> {
    if(!this.users) {
      return { status: UserManagerResponseStatus.ERROR, value: "Error fetching users from database." };
    } else if(!user) {
      return { status: UserManagerResponseStatus.INVALID_DATA, value: "Invalid body data." };
    }

    // Search for existing user with same Id
    let result: UserManagerResponse = await this.getUserWithId(user.Id);
    if(result.status == UserManagerResponseStatus.OK) {
      return { status: UserManagerResponseStatus.CONFLICT_ID, value: "A user with same Id already exists."}
    } else {
      // Insert the new user
      const insertId = await this.users.insertOne(user);
      return insertId ? { status: UserManagerResponseStatus.OK, value: user} : { status: UserManagerResponseStatus.ERROR, value: ""};
    }
  }

  public async deleteUserWithId(userId: number): Promise<UserManagerResponse> {
    if(!this.users) {
      return { status: UserManagerResponseStatus.ERROR, value: "Error fetching users from database." };
    }

    const deleteCount = await this.users.deleteOne({Id: userId});
    if(deleteCount) {
      return { status: UserManagerResponseStatus.OK, value: ""};
    } else {
      return { status: UserManagerResponseStatus.NOT_FOUND, value: ""};
    }
  }

}
/*
module.exports = {
  getUserWithId: getUserWithId,
  deleteUserWithId: deleteUserWithId,
  getUsers: getUsers,
  createUser: createUser,
  updateUserWithId: updateUserWithId
};

function updateUserWithId(userId, user, callback) {
  var db = DB.openConnection();
  try {
    db.users.update({Id: userId}, { $set: user }, function(err, doc) {
      if (err == null) {
        callback(true);
      } else {
        callback(false);
      }

      DB.closeConnection(db);
    });
  } catch(err) {
    DB.closeConnection(db);
    callback(false);
  } finally {

  }
}

function createUser(user, callback) {
  var db = DB.openConnection();
  try {
    db.users.insert(user, function(err, doc) {
      if(err == null) {
        delete doc._id;
        callback(doc, true);
      } else {
        callback(undefined, false);
      }

      DB.closeConnection(db);
    });
  } catch(err) {
    DB.closeConnection(db);
    callback(undefined, false);
  } finally {

  }
}

function getUserWithId(userId, callback) {
  var db = DB.openConnection();
  try {
    db.users.findOne({Id: userId}, {
        "Id": 1,
        "Name": 1,
        "Email": 1,
        "City": 1,
        "Enabled": 1,
        "Gender": 1,
        "Profession": 1,
        "Description": 1,
        "Birthdate": 1
      }, function(err, doc) {
      if(err == null) {
        delete doc._id;
        callback(doc, true);
      } else {
        callback(undefined, false);
      }

      DB.closeConnection(db);
    });
  } catch(err) {
    DB.closeConnection(db);
    callback(undefined, false);
  } finally {

  }
}

function deleteUserWithId(userId, callback) {
  var db = DB.openConnection();
  try {
    db.users.remove({Id: userId}, function(err, doc) {
      if(err == null) {
        callback(true);
      } else {
        callback(false);
      }

      DB.closeConnection(db);
    });
  } catch(err) {
    DB.closeConnection(db);
    callback(false);
  } finally {

  }
}

function getUsers(callback) {
  var db = DB.openConnection();
  try {
    db.users.find({}, {
      "Id": 1,
      "Name": 1,
      "Email": 1,
      "City": 1,
      "Enabled": 1,
      "Gender": 1,
      "Profession": 1,
      "Description": 1,
      "Birthdate": 1
    }, function(err, docs) {
      if (docs == null) {
        callback(undefined, false);
      } else {
        docs.forEach(function(user) {
          delete user._id;
        });
        callback(docs, true);
      }

      DB.closeConnection(db);
    });
  } catch(err) {
    DB.closeConnection(db);
    callback(undefined, false);
  } finally {

  }
}*/
