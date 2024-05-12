const router = require("express").Router();
const User = require("./models/User");
const Profile = require("./models/Profile");
const Project = require("./models/Project");
const Status = require("./models/Status");
const authenticationMiddleware = require("./middleware");
const firebaseMiddleware = require("express-firebase-middleware");
const axios = require("axios");
const spawn = require("child_process").spawn;
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI("AIzaSyCb4tdP2_JmjmM7g_iYoHuiPnFV3LKEazA");
const model = genAI.getGenerativeModel({ model: "gemini-pro" });
var busboy = require("connect-busboy"); //middleware for form/file upload
var path = require("path"); //used for file path
var fs = require("fs-extra"); //File System - for file manipulation
var express = require("express");

router.use(busboy());
router.use(express.static(path.join(__dirname, "public")));

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
  console.log(res.locals.user);
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
    [
      `What are the top skills of the candidate in comma spearated values-${res.locals.user.uid}`,
    ],
  ]);
  ls.stderr.on("data", (data) => {
    console.log(`stderr: ${data}`);
  });
  ls.stdout.on("data", (data) => {
    const cleanedInput = data.toString().replace(/\s*\[.*?\]\s*/g, "");
    skillsArray = cleanedInput.split(",").map((skill) => skill.trim());
    const ls2 = spawn("./myvirtenv/bin/python3", [
      "./ai/process-resume.py",
      [
        `Write a one liner about the candidate and experience if any without directly mentioning the skill or the company with years of experience if any-${res.locals.user.uid}`,
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
  const prompt = `You are a professional Project Description writer, given the project title: ${req.body.title}, write a project description for the project. Write as a freelancing expert with skills good to haves.Dont return anything other than the main JD body, dont send back the title, dont write about the application process anywhere`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  res.send({ jd: text.replace(/[*:#]/g, "").replace(/\s{2,}/g, " ") });
});

router.post("/generate-skills", async (req, res) => {
  const prompt = `You are a professional Project skills needed writer, given the project description: ${req.body.jd}, write comma separated skills to do the project.`;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  const text = response.text();

  res.send({ skills: text });
});

router.post("/project", async (req, res) => {
  const project = await new Project({
    ...req.body,
    owner: res.locals.user.uid,
  }).save();

  const skillString = project.skills[0];
  const skillsRegex = skillString.split(",").map(
    (skill) => new RegExp(skill.trim(), "i") // 'i' for case-insensitive matching
  );

  // Create the query to find users with any skills matching the regex patterns
  try {
    const matchedUsers = await Profile.find({
      skills: { $in: skillsRegex },
    }).select("uid");

    const projNew = await Project.updateOne(
            { _id: project._id },
            { assignedTo: matchedUser.uid }
            );
            
    res.send({ matchedUsers, user, projNew, project });

    // if more then one matched user, return the first one
    // if (matchedUsers.length > 0) {
    //   const matchedUser = matchedUsers[0];
    //   const user = await User.findOne({ uid: matchedUser.uid });
    //   const projNew = await Project.updateOne(
    //     { _id: project._id },
    //     { assignedTo: matchedUser.uid }
    //     );
    //   res.send({ matchedUser, user, projNew, project });
    // } else {
    //   res.send({ matchedUser: null });
    // }
  } catch (error) {
    console.error("Error finding users:", error);
  }
});

router.get("/projects", async (req, res) => {
  const myProjects = await Project.find({ owner: res.locals.user.uid });
  res.send({ myProjects });
});

router.get("/projects/all", async (req, res) => {
    const myProjects = await Project.find({});
    res.send({ myProjects });
  });

router.get("/freelancers", async (req, res) => {
  const freelancers = await User.find({ role: "freelancer" });
  const profiles = await Profile.find({
    uid: { $in: freelancers.map((freelancer) => freelancer.uid) },
  });
  //merge profiles with users
  const merged = freelancers.map((freelancer) => {
    const profile = profiles.find((profile) => profile.uid === freelancer.uid);
    return { ...freelancer._doc, profile };
  });

  res.send({ freelancers: merged });
});

router.get("/project/:id", async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id });
  const owner = await User.findOne({ uid: project.owner });
  const ownerProfile = await Profile.findOne({ uid: project.owner });

  res.send({ project, owner, ownerProfile });
});

router.post("/upload-resume", async (req, res) => {
  var fstream;
  req.pipe(req.busboy);
  req.busboy.on("file", function (fieldname, file, filename) {
    console.log("Uploading: " + filename);

    //Path where image will be uploaded
    fstream = fs.createWriteStream(
      __dirname + "/cvs/" + `${res.locals.user.uid}.pdf`
    );
    file.pipe(fstream);
    fstream.on("close", function () {
      console.log("Upload Finished of " + filename);
      res.redirect("back"); //where to go next
    });
  });
});

router.get("/matching/freelancers/:id", async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id });
  console.log(project);
  // Convert the comma-separated string into an array of regex patterns
  const skillString = project.skills[0];
  const skillsRegex = skillString.split(",").map(
    (skill) => new RegExp(skill.trim(), "i") // 'i' for case-insensitive matching
  );

  // Create the query to find users with any skills matching the regex patterns
  try {
    const matchedUsers = await Profile.find({
      skills: { $in: skillsRegex },
    });

    // if more then one matched user, return the first one
    if (matchedUsers.length > 0) {
      const matchedUser = matchedUsers[0];
      const user = await User.findOne({ uid: matchedUser.uid });
      res.send({ matchedUser, user });
    } else {
      res.send({ matchedUser: null });
    }
  } catch (error) {
    console.error("Error finding users:", error);
  }
});

router.get("/matches/freelancer", async (req, res) => {
    const projects = await Project.find({ });
    //find owner of each project and attach to project
    for (let i = 0; i < projects.length; i++) {
      const
        owner = await User.findOne({ uid: projects[i].owner }); 
        const ownerProfile = await Profile.findOne({ uid: projects[i].owner });
        projects[i] = { ...projects[i]._doc, owner, ownerProfile };

    }
    res.send({ projects });
});

module.exports = router;
