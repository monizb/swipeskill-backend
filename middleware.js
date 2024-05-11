const responder = require('./responder');
const admin = require('firebase-admin');

const middleware = {
    
    isAuthenticated: (req, res, next) => {
      if (req.headers.authorization) {
        //check if token exists in redis
        admin.auth().verifyIdToken(req.headers.authorization)
            .then((token) => {
              res.locals.user = token;
              next();
            }).catch((err) => {
                console.log(err)
              return responder.error(res, {"error": "Send Token"}, 401);
            });
      } else {
          return responder.error(res, {"error": "Send Token"}, 401);
      }
  },
}


module.exports = middleware;