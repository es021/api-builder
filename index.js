const connect = require("connect");
const query = require("qs-middleware");
const ApiBuilder = require("./lib/ApiBuilder");
const { jwtAuthentication } = require("./lib/Authentication");
const DB = require("./lib/DB");
const bodyParser = require('body-parser');

const PORT = "4040";
const GRAPHQL_PATH = "/graphql";

const DATABASE_NAME = "wp_career_fair";
const ATTR_FOREIGN = {
  cfs: {
    _meta: {
      table: "cfs_meta",
      getArgs: (d) => {
        return { cf_name: d.name }
      }
    }
  },
  wp_cf_users: {
    _meta: {
      table: "wp_cf_usermeta",
      getArgs: (d) => {
        return { user_id: d.ID }
      }
    }
  }
}

// const DATABASE_NAME = "kk_app";
// const ATTR_FOREIGN = {
//   companies: {
//     _meta: {
//       table: "companies_meta",
//       getArgs: (d) => {
//         return { _id: d.ID }
//       }
//     }
//   }
// }

var app = connect();
app.use(query());
app.use(bodyParser.json()); // support json encoded bodies
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(jwtAuthentication({
  PORT: PORT,
  GRAPHQL_PATH: GRAPHQL_PATH
}));

const db = new DB("DEV", DATABASE_NAME);
const apiBuilder = new ApiBuilder({
  db: db,
  databaseName: DATABASE_NAME,
  additionalAttrForeign: ATTR_FOREIGN,
  finishHandler: (server) => {
    server.applyMiddleware({ app, GRAPHQL_PATH });
    app.listen({ port: PORT }, () =>
      console.log(
        `Server ready at http://localhost:${PORT}${server.graphqlPath}`
      )
    );
  }
});
apiBuilder.init();


