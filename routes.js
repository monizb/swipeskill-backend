const router = require("express").Router();
const User = require("./models/User");
const Profile = require("./models/Profile");
const Project = require("./models/Project");
const authenticationMiddleware = require("./middleware");
const firebaseMiddleware = require("express-firebase-middleware");
const axios = require("axios");
const spawn = require("child_process").spawn;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyCb4tdP2_JmjmM7g_iYoHuiPnFV3LKEazA");
const model = genAI.getGenerativeModel({ model: "gemini-pro"});
var busboy = require('connect-busboy'); //middleware for form/file upload
var path = require('path');     //used for file path
var fs = require('fs-extra');       //File System - for file manipulation
var express = require('express');  

router.use(busboy());
router.use(express.static(path.join(__dirname, 'public')));


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
    console.log(res.locals.user)
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
    [`What are the top skills of the candidate in comma spearated values-${res.locals.user.uid}`],
  ]);
  ls.stderr.on('data', (data) => {
    console.log(`stderr: ${data}`);
  });
  ls.stdout.on("data", (data) => {
    const cleanedInput = data.toString().replace(/\s*\[.*?\]\s*/g, "");
    skillsArray = cleanedInput.split(",").map((skill) => skill.trim());
    const ls2 = spawn("./myvirtenv/bin/python3", [
      "./ai/process-resume.py",
      [
        `Write a one liner about the candidate and experience if any without directly mentioning the skill or the company with years of experience if any-${res.locals.user.uid}`
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

router.post("/generate-jd", async (req, res) => {
    const prompt = `You are a professional Project Description writer, given the project title: ${req.body.title}, write a project description for the project. Write as a freelancing expert with skills good to haves.Dont return anything other than the main JD body, dont send back the title, dont write about the application process anywhere`

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();
  
    res.send({ jd:  text.replace(/[*:#]/g, '').replace(/\s{2,}/g, ' ') });
  });

  router.post("/project", async (req, res) => {
    const project = await new Project(req.body).save();
    res.send({ project });
  });

  router.post('/upload-resume', async (req, res) => {

        var fstream;
        req.pipe(req.busboy);
        req.busboy.on('file', function (fieldname, file, filename) {
            console.log("Uploading: " + filename);

            //Path where image will be uploaded
            fstream = fs.createWriteStream(__dirname + '/cvs/' + `${res.locals.user.uid}.pdf`);
            file.pipe(fstream);
            fstream.on('close', function () {    
                console.log("Upload Finished of " + filename);              
                res.redirect('back');           //where to go next
            });
        });
    });

  
module.exports = router;
