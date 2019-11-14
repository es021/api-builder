const connect = require("connect");
const { ApolloServer, gql } = require("apollo-server-express");
const query = require("qs-middleware");
const PORT = "4040";
const mysql = require("mysql");
const DB = require("./DB");

class MainBuilder {
  constructor() {
    this.con = null;
    this.gqlTypeDefs = null;
    this.gqlResolvers = null;
  }
  init(database) {
    DB.connect(() => {
      let sql =
        "SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE from information_schema.COLUMNS where TABLE_SCHEMA = 'wp_career_fair'";
      DB.query(sql).then(res => {
        this.createGqlComponents(res);
        //this.createGqlResolvers(results);
        this.finishInit({});
      });
    });
    // this.con = mysql.createConnection({
    //   host: "localhost",
    //   user: "root",
    //   password: "",
    //   database: database
    // });
    // this.con.connect();
    // this.con.query(
    //   "SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE from information_schema.COLUMNS where TABLE_SCHEMA = 'wp_career_fair'",
    //   (error, results, fields) => {
    //     if (error) throw error;
    //     this.createGqlComponents(results);
    //     //this.createGqlResolvers(results);
    //     this.finishInit({});
    //   }
    // );

    // this.con.end();
  }
  getGqlType(type) {
    const map = {
      String: ["char", "text", "datetime", "timestamp"],
      Int: ["int", "enum"]
    };

    for (var k in map) {
      let mapList = map[k];
      if (mapList.indexOf(type) >= 0) {
        return k;
      } else {
        for (var i in mapList) {
          if (type.indexOf(mapList[i]) >= 0) {
            return k;
          }
        }
      }
    }

    return null;
  }
  createGqlComponents(results) {
    let curTb = null;
    let defs = ``;
    let queryAttr = ``;

    let queryResolver = {};
    for (let i in results) {
      let r = results[i];
      let tb = r["TABLE_NAME"];
      let col = r["COLUMN_NAME"];
      let type = r["DATA_TYPE"];

      if (curTb == null || curTb != tb) {
        if (curTb != null) {
          defs += `} `;
        }
        defs += `\ntype ${tb} { `;
        if (curTb != null) {
          queryAttr += ", ";
        }

        queryAttr += ` ${tb} (ID: Int): [${tb}]`;
        queryResolver[tb] = this.getQueryResolverFunction({ table: tb });
      }

      defs += ` ${col} : ${this.getGqlType(type)} `;

      curTb = tb;
    }
    defs += `} `;
    defs += `\ntype Query { ${queryAttr} } `;
    //  query getSomething($launchId: String) { name }

    // console.log("--------------------------------------------");
    // console.log(defs);
    // console.log("--------------------------------------------");

    this.gqlResolvers = { Query: queryResolver };
    this.gqlTypeDefs = gql(defs);
  }
  getQueryResolverFunction({ table, page, offset }) {
    return (obj, args, context, info) => {
      console.log("args", args);
    //   console.log("info", JSON.stringify(info));
      return DB.query(`SELECT * from ${table}`).then(function(res) {
        return res;
      });
    };
  }
  finishInit() {
    const server = new ApolloServer({
      typeDefs: this.gqlTypeDefs,
      resolvers: this.gqlResolvers
    });

    const app = connect();
    const path = "/graphql";

    app.use(query());
    server.applyMiddleware({ app, path });

    app.listen({ port: PORT }, () =>
      console.log(
        `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
      )
    );
  }
}

const builder = new MainBuilder();
builder.init("wp_career_fair");
