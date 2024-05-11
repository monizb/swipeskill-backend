const router = require('express').Router();
const User = require('./models/User');
const Profile = require('./models/Profile');
const authenticationMiddleware = require("./middleware");
const firebaseMiddleware = require('express-firebase-middleware');
const axios = require('axios');

router.post("/testlogin", (req, res) => { //gets you an auth token for testing
    axios
        .post(
            "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" + "AIzaSyDec_i8Z4OG-qN4dKayGc_InRbPtE_MAvE",
            {
                email: req.body.email,
                password: req.body.password,
                returnSecureToken: true,
            }
        )
        .then(async function (response) {
            res.send(response.data);
        }).catch(function (error) {
            res.send(error.message);
        });
})

// router.use(authenticationMiddleware.isAuthenticated);

router.use(firebaseMiddleware.auth);


router.post("/profile", async (req, res) => {
    const user = await User.findOne({uid: res.locals.user.uid});
    const profile = await Profile.findOne({uid: res.locals.user.uid});

    res.send({profile, user});
});

module.exports = router;