const router = require("express").Router();
const User = require("./models/User");
const Profile = require("./models/Profile");
const authenticationMiddleware = require("./middleware");
const firebaseMiddleware = require("express-firebase-middleware");
const axios = require("axios");
const spawn = require("child_process").spawn;

router.post("/testlogin", (req, res) => {
  //gets you an auth token for testing
  axios
    .post(
      "https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=" +
        "AIzaSyDec_i8Z4OG-qN4dKayGc_InRbPtE_MAvE",
      {
        email: req.body.email,
        password: req.body.password,
        returnSecureToken: true,
      }
    )
    .then(async function (response) {
      res.send(response.data);
    })
    .catch(function (error) {
      res.send(error.message);
    });
});

// router.use(authenticationMiddleware.isAuthenticated);

router.use(firebaseMiddleware.auth);

router.post("/profile", async (req, res) => {
  const user = await User.findOne({ uid: res.locals.user.uid });
  const profile = await Profile.findOne({ uid: res.locals.user.uid });

  res.send({ profile, user });
});

router.post("/register", async (req, res) => {
  const user = await new User({
    name: req.body.name,
    email: res.locals.user.email,
    role: req.body.role,
    uid: res.locals.user.uid,
    company: req.body.company ?? null,
  }).save();
  const profile = await Profile.findOne({ uid: res.locals.user.uid });

  res.send({ profile, user });
});

router.post("/process-resume", async (req, res) => {
  let skillsArray;
  let oneLiner;

  const existingProfile = await Profile.findOne({ uid: res.locals.user.uid });
    if (existingProfile) {
        return res.send({ profile: existingProfile });
    }
  const ls = spawn("./myvirtenv/bin/python3", [
    "./ai/process-resume.py",
    ["What are the top skills of the candidate in comma spearated values"],
  ]);
  ls.stdout.on("data", (data) => {
    const cleanedInput = data.toString().replace(/\s*\[.*?\]\s*/g, "");
    skillsArray = cleanedInput.split(",").map((skill) => skill.trim());
    const ls2 = spawn("./myvirtenv/bin/python3", [
      "./ai/process-resume.py",
      [
        "Write a one liner about the candidate and experience if any without directly mentioning the skill or the company with years of experience if any",
      ],
    ]);

    ls2.stdout.on("data", (data) => {
      oneLiner = data.toString();
      const profile = new Profile({
        skills: skillsArray,
        oneLiner,
        uid: res.locals.user.uid,
      });
      profile.save();
      res.send({ profile });
    });
  });
});

module.exports = router;
