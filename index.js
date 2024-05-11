const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
require('dotenv').config();
const admin = require('firebase-admin');
const serviceAccount = require("./swipeskill-creds.json");
const routes = require('./routes');
const responder = require('./responder');

/////////USAGES/////////
app.use(express.json());
app.use(cors());
///////////////////////



////////// ROUTES ///////

app.get('/', (req, res) => {
    responder.success(res, 'Welcome to the SwipeSkill API', 200);
})

app.use('/api', routes);

//404 route
app.use((req, res, next) => {
    responder.error(res, "Resource not found", 404);
});

/////////////////////////

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


mongoose.connect("mongodb+srv://monish2basaniwal:uxO6v8vcDZFBlkQk@cluster0.9hoeh1d.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0", { useNewUrlParser: true, useUnifiedTopology: true });


app.listen(process.env.PORT || 3000, () => {
    console.log('Server started at port 3000');
});