const { ApolloServer, gql } = require("apollo-server-express");
const graphqlFields = require("graphql-fields");

class MainBuilder {
    constructor(
        {
            db,
            databaseName,
            additionalAttrForeign,
            finishHandler
        }
    ) {

        this.DB = db;
        this.databaseName = databaseName;
        this.finishHandler = finishHandler;
        this.con = null;
        this.gqlTypeDefs = null;
        this.gqlResolvers = null;

        this.DB_GQL_MAP_TYPE = {
            String: ["char", "text", "datetime", "timestamp"],
            Int: ["int", "enum"],
            Float: ["decimal"],
        };

        this.ADDITIONAL_ATTR = {
            _count: "Int"
        }
        this.ADDITIONAL_ATTR_FOREIGN = additionalAttrForeign;
        this.ADDITIONAL_PARAM = {
            _page: "Int",
            _offset: "Int",
            _order_by: "String",
            _is_count: "Boolean"
        }
    }
    init() {
        this.DB.connect(() => {
            let sql = `SELECT TABLE_NAME, COLUMN_NAME, DATA_TYPE from information_schema.COLUMNS where TABLE_SCHEMA = '${this.databaseName}'`;
            console.log(sql);
            this.DB.query(sql).then(res => {
                this.createGqlComponents(res);
                this.finishInit({});
            });
        });
    }
    getGqlType(type) {
        const map = this.DB_GQL_MAP_TYPE;
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
    getAdditionalAttributeForType(tb) {
        let additional = "";
        for (var k in this.ADDITIONAL_ATTR) {
            additional += ` ${k}:${this.ADDITIONAL_ATTR[k]} `;
        }

        if (this.ADDITIONAL_ATTR_FOREIGN[tb]) {
            for (var k in this.ADDITIONAL_ATTR_FOREIGN[tb]) {
                let table = this.ADDITIONAL_ATTR_FOREIGN[tb][k].table;
                additional += ` ${k} : [${table}] `;
            }
        }

        return additional;
    }
    getQueryParam(keyTypePair) {
        let additional = "";
        for (var k in this.ADDITIONAL_PARAM) {
            additional += ` ${k}:${this.ADDITIONAL_PARAM[k]} `;
        }
        return `${keyTypePair} ${additional}`;
    }
    createGqlComponents(results) {
        const KEY_PAIR_TOKEN = "{{KEY_PAIR_TOKEN}}";
        let curTb = null;
        let tableTypes = ``;
        let queryType = ``;
        let mutationInsertType = ``;
        let mutationUpdateType = ``;
        let mutationDeleteType = ``;

        let keyTypePair = ``;
        let keyTypePairWithoutID = ``;

        let queryResolver = {};
        let mutationResolver = {};

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
                    queryType = queryType.replace(KEY_PAIR_TOKEN, this.getQueryParam(keyTypePair));
                    mutationInsertType = mutationInsertType.replace(KEY_PAIR_TOKEN, this.getQueryParam(keyTypePair));
                    mutationUpdateType = mutationUpdateType.replace(KEY_PAIR_TOKEN, this.getQueryParam(keyTypePairWithoutID));
                    tableTypes += `} `;
                }

                // reset keyTypePair
                keyTypePair = "";

                // starting of type
                tableTypes += `\n\ntype ${tb} { `;
                tableTypes += this.getAdditionalAttributeForType(tb);
                if (curTb != null) {
                    queryType += ", ";
                    mutationInsertType += ", ";
                    mutationUpdateType += ", ";
                    mutationDeleteType += ", ";
                }

                let queryEntity = tb;
                let insertEntity = "insert_" + tb;
                let updateEntity = "update_" + tb;
                let deleteEntity = "delete_" + tb;

                queryType += `\n\n${queryEntity} ( ${KEY_PAIR_TOKEN} ): [${tb}]`;
                mutationInsertType += `\n\n${insertEntity} ( ${KEY_PAIR_TOKEN} ): ${tb}`;
                mutationUpdateType += `\n\n${updateEntity} ( ID:Int! ${KEY_PAIR_TOKEN} ): ${tb}`;
                mutationDeleteType += `\n\n${deleteEntity} ( ID:Int! ): ${tb}`;

                // add resolver
                queryResolver[queryEntity] = this.getQueryResolverFunction({ table: tb });
                mutationResolver[insertEntity] = this.getMutationResolverFunction({ table: tb, isInsert: true });
                mutationResolver[updateEntity] = this.getMutationResolverFunction({ table: tb, isUpdate: true });
                mutationResolver[deleteEntity] = this.getMutationResolverFunction({ table: tb, isDelete: true });
            }

            // add colum : type
            tableTypes += ` ${col} : ${this.getGqlType(type)} `;
            keyTypePair += ` ${col} : ${this.getGqlType(type)} `;
            keyTypePairWithoutID += col == "ID" ? "" : ` ${col} : ${this.getGqlType(type)} `;

            curTb = tb;
        }

        // finishing up
        queryType = queryType.replace(KEY_PAIR_TOKEN, this.getQueryParam(keyTypePair));
        queryType = `type Query { ${queryType} }`;

        mutationInsertType = mutationInsertType.replace(KEY_PAIR_TOKEN, this.getQueryParam(keyTypePair));
        mutationUpdateType = mutationUpdateType.replace(KEY_PAIR_TOKEN, this.getQueryParam(keyTypePairWithoutID));
        let mutationType = `type Mutation { ${mutationInsertType}, ${mutationUpdateType}, ${mutationDeleteType} }`;

        tableTypes += `} `;

        // console.log("--------tableTypes --------------------------");
        // console.log(tableTypes);
        // console.log("--------------------------------------------");
        // console.log("------- queryType -----------------------------");
        // console.log(queryType);
        // console.log("--------------------------------------------");
        // console.log("------- mutationType -----------------------------");
        // console.log(mutationType);
        // console.log("--------------------------------------------");

        // let mutationType = `type Mutation {
        //   addCompanies(ID : Int  name : String  tagline : String  description : String  more_info : String  img_url : String  img_position : String  img_size : 
        //                 String  banner_url : String  banner_position : String  banner_size : String  status : String  
        //                 rec_privacy : Int  sponsor_only : Int  type : Int  is_confirmed : Int 
        //                 group_url : String  message_drop_resume : String  accept_prescreen : Int  
        //                 priviledge : String  created_at : String  updated_at : String): companies

        // }`
        // let mutationResolver = {};
        // mutationResolver["addCompanies"] = (obj, args, context, info) => {
        //   console.log("mutation args", args);
        // };
        let defs = `${tableTypes} \n ${queryType} \n${mutationType}`;
        this.gqlResolvers = { Query: queryResolver, Mutation: mutationResolver };
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
        type Mutation {
          addCompanies(ID : Int  name : String  tagline : String  description : String  more_info : String  img_url : String  img_position : String  img_size : 
                        String  banner_url : String  banner_position : String  banner_size : String  status : String  
                        rec_privacy : Int  sponsor_only : Int  type : Int  is_confirmed : Int 
                        group_url : String  message_drop_resume : String  accept_prescreen : Int  
                        priviledge : String  created_at : String  updated_at : String): companies
        }
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
    getMutationResolverFunction({ table, isInsert, isUpdate, isDelete }) {
        if (isInsert === true) {
            return (obj, args, context, info) => {
                return this.DB.insert(table, args).then((res) => {
                    return res;
                });
            };
        }

        if (isUpdate === true) {
            return (obj, args, context, info) => {
                try {
                    return this.DB.update(table, args).then((res) => {
                        return res;
                    });
                } catch (err) {
                    return {};
                }
            }
        }

        if (isDelete === true) {
            return (obj, args, context, info) => {
                return this.DB.delete(table, args.ID).then((res) => {
                    return res;
                });
            }
        }
    }
    _select(table, args, fields) {
        let where = "1=1";
        for (var k in args) {
            if (typeof this.ADDITIONAL_PARAM[k] !== "undefined") {
                continue;
            }

            where += ` AND ${k} = '${args[k]}' `;
        }

        let offset = "";
        if (args._page && args._offset) {
            offset = this.DB.prepareLimit(args._page, args._offset);
        }

        let order_by = "";
        if (args._order_by) {
            order_by = `ORDER BY ${args._order_by}`;
        }

        let select = "";
        if (args._is_count) {
            select = "COUNT(*) as _count";
            order_by = "";
            offset = "";
        } else {
            select = "*"
        }

        let q = `SELECT ${select} FROM ${table} WHERE ${where} ${order_by} ${offset}`;
        console.log("---------------------------------");
        console.log(args);
        console.log(q);

        return this.DB.query(q).then((res) => {

            let foreign = this.ADDITIONAL_ATTR_FOREIGN[table];
            if (foreign) {
                for (let i in res) {
                    for (let fKey in foreign) {
                        if (typeof fields[fKey] !== "undefined") {
                            let fObj = foreign[fKey];
                            res[i][fKey] = this._select(fObj.table, fObj.getArgs(res[i]), fields[fKey])
                        }
                    }
                }
            }

            return res;
        });
    }
    getQueryResolverFunction({ table }) {
        return (obj, args, context, info) => {
            let fields = graphqlFields(info)
            return this._select(table, args, fields);
        };
    }
    finishInit() {
        const server = new ApolloServer({
            typeDefs: this.gqlTypeDefs,
            resolvers: this.gqlResolvers
        });
        this.finishHandler(server);
    }
}


module.exports = MainBuilder;
