
const Secret = require("../secret/secret");
const jwt = require('jsonwebtoken');

// let token = jwt.sign({ uuid: '1' }, Secret.JWT_TOKEN_KEY);
// console.log(token)
// Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1dWlkIjoiMSIsImlhdCI6MTU4MDgwMzU0Nn0.7Xg49C_W11kxYmGRglX_6w5jJ01CBHcTvu3WkF2BNgc


function isSkipAuthJwtVerify(req, { PORT, GRAPHQL_PATH }) {
    let skipVerify = [`http://localhost:${PORT}${GRAPHQL_PATH}`]
    if (skipVerify.indexOf(req.headers.referer) >= 0) {
        return true;
    }

    if (req.method !== "POST") {
        return true;
    }

    return false;
}

function jwtAuthentication(param) {

    return function (req, res, next) {
        // console.log("--------------------------------------------------------")
        // console.log("jwtAuthentication", req.method, req.headers.referer, req.headers.authorization)
        try {
            if (isSkipAuthJwtVerify(req, param)) {
                next();
                return;
            }

            let auth = req.headers.authorization;
            if (!auth) {
                // console.log(req.headers.referer)
                next(new Error('Authorization not found in headers'));
                return;
            }

            let token = req.headers.authorization.split(" ")[1];
            jwt.verify(token, Secret.JWT_TOKEN_KEY, (err, payload) => {
                // console.log("payload", payload)
                // console.log("req.body", req.body)
                if (payload && payload.uuid == req.body.uuid) {
                    next()
                } else {
                    // console.log("--------------------------------------------------------")
                    // console.log(req.headers.referer)
                    next(new Error(`Invalid Token (uuid : ${req.body.uuid})`));
                }

            })
        } catch (e) {
            console.log(e)
            next()
        }
    }
}

module.exports = {
    jwtAuthentication
}