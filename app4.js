/**
 *  4.  Define the /login end-point
 *  4.1 The GET request should return a form with Username and Password input fields.
 *  4.2 The Password input field should be of type "password".
 *  4.3 Submit the form using the POST method, your server should respond with a JSON object with the following structure:
 *      { "username": "admin", "password": "12345" }
 *  4.4 Static code for the POST response should be of status code 200 and Content-type application/json
 */


var express = require('express');
var app = express();
var path = require("path");
var bodyParser = require('body-parser')
app.use(bodyParser.urlencoded({ extended: false }))

app.get('/login', function (req, res) {
 res.sendFile(path.join(__dirname+'/pages/login.html'));
});

app.post('/login', function (req, res) {
 
 res.setHeader('Content-Type', 'application/json'); //Done by default

 var credentials = new Object();
 credentials.username = req.body.username;
 credentials.password = req.body.password;

 res.status(200);
 res.send(credentials);
});


app.listen(8083);

