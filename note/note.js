postUrl = "http://localhost:4040/graphql"
postData = {
    "operationName": null,
    "variables": {},
    "query": "mutation {update_companies(ID: 21, name: \"Updated Company\") {ID name}}"
}

// #########################################
// ###### FETCH ############################

q = `query{
    companies(ID:1, _page:1, _offset:10, order_by:"ID desc"){
      ID name
    }
  }`;

data = {
    "data": {
        "companies": [
            {
                "ID": 1,
                "name": "Sapura Energy"
            }
        ]
    }
}


// #########################################
// ###### COUNT ############################

q = `query{
    companies(_is_count:true, ID:1){
        _count
    }
  }`

data = {
    "data": {
        "companies": [
            {
                "_count": 1
            }
        ]
    }
}
// #########################################
// ###### INSERT ############################

q = `mutation{
    insert_companies(name:"New Company")
    {
      ID
      name
    }
  }`

data = {
    "data": {
        "insert_companies": {
            "ID": 21,
            "name": "New Company",
        }
    }
}

// #########################################
// ###### UPDATE ############################

q = `mutation{
    update_companies(ID:21, name:"Updated Company")
    {
      ID
        name
    }
  }`

data = {
    "data": {
        "update_companies": {
            "ID": 21,
            "name": "Updated Company"
        }
    }
}

// #########################################
// ###### DELETE ############################

q = `mutation{
    delete_companies(ID:20){ID}
  }`

data = {
    "data": {
        "delete_companies": {
            "ID": 20
        }
    }
}