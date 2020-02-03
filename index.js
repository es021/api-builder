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
      Int: ["int", "enum"],
      Float: ["decimal"],
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

    console.log("type not found", type);

    return null;
  }
  getQueryParam({ table }) {
    return `ID: Int`;
  }
  createGqlComponents(results) {
    let curTb = null;
    let tableTypes = ``;
    let queryType = ``;
    let queryParam = ``;
    let keyTypePair = ``;
    let queryResolver = {};
    for (let i in results) {
      let r = results[i];
      let tb = r["TABLE_NAME"];

      // if (tb !== "messages" && tb !== "companies") {
      //   continue;
      // }


      let col = r["COLUMN_NAME"];
      let type = r["DATA_TYPE"];

      if (curTb == null || curTb != tb) {
        if (curTb != null) {
          queryType = queryType.replace("{{keyTypePair}}", keyTypePair);
          tableTypes += `} `;
        }

        // reset keyTypePair
        keyTypePair = "";

        // starting of type
        tableTypes += `\n\ntype ${tb} { `;
        if (curTb != null) {
          queryType += ", ";
        }

        queryType += `\n\n${tb} ( {{keyTypePair}} ): [${tb}]`;
        // queryType += ` ${tb} ( `;
        queryResolver[tb] = this.getQueryResolverFunction({ table: tb });
      }

      // add colum : type
      tableTypes += ` ${col} : ${this.getGqlType(type)} `;
      keyTypePair += ` ${col} : ${this.getGqlType(type)} `;

      curTb = tb;
    }

    // finishing up
    queryType = queryType.replace("{{keyTypePair}}", keyTypePair);
    queryType = `type Query { ${queryType} }`;
    tableTypes += `} `;

    // console.log("--------tableTypes --------------------------");
    // console.log(tableTypes);
    // console.log("--------------------------------------------");
    // console.log("------- queryType -----------------------------");
    // console.log(queryType);
    // console.log("--------------------------------------------");


    let defs = `${tableTypes} \n ${queryType}`;
    this.gqlResolvers = { Query: queryResolver };
    this.gqlTypeDefs = gql(defs);
    /** 
    ############################################################################
    ####### typeDefs ##########################################################
    
    type companies {  
      ID : Int  name : String  tagline : String  description : String  
      more_info : String  img_url : String  img_position : String  img_size : String  
      banner_url : String  banner_position : String  banner_size : String  status : String  
      rec_privacy : Int  sponsor_only : Int  type : Int  is_confirmed : Int  group_url : String  
      message_drop_resume : String  accept_prescreen : Int  priviledge : String  
      created_at : String  updated_at : String 
    }
    type messages {  
      id_message_number : String  
      message : String  from_user_id : Int  
      has_read : Int  created_at : String 
    }

    ############################################################################
    ####### queryAttr ##########################################################

    type Query {  
        companies ( 
                    ID : Int  name : String  tagline : String  description : String  more_info : String  img_url : String  img_position : String  img_size : 
                    String  banner_url : String  banner_position : String  banner_size : String  status : String  
                    rec_privacy : Int  sponsor_only : Int  type : Int  is_confirmed : Int 
                    group_url : String  message_drop_resume : String  accept_prescreen : Int  
                    priviledge : String  created_at : String  updated_at : String  
                  ): [companies],  
  
        messages (  
                    id_message_number : String  
                    message : String  from_user_id : Int  
                    has_read : Int  created_at : String  
                  ): [messages] 
    }

    */

 
  }
  getQueryResolverFunction({ table, page, offset }) {
    return (obj, args, context, info) => {
      console.log("args", args);
      return DB.query(`SELECT * from ${table}`).then(function (res) {
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
