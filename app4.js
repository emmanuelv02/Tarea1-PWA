

var express = require('express');
var app = express();
var path = require("path");
var bodyParser = require('body-parser')
app.use(bodyParser.json());

/**
 *  1. Return status code 404 at path /404 when GET
 */
app.get('/404', function (req, res) {
  res.status(404);  
  res.send();
});

/**
 *  2. Return status code 401 at path /protected when get
 */
app.get('/protected', function (req, res) {
    res.status(401);
    res.send();
});

/**
 *  3. Return status code 500 at path /error when GET
 */
app.get('/error', function (req, res) {
    res.status(500);
    res.send();
});

/**
 *  5.  Return status code 501 at path /notimplemented when get
 *  5.1 The Allow response header  list GET, POST, PUT
 *  5.2  Status code 200 for GET, POST & PUT at this path.
 */
app.use('/notimplemented', function (req, res, next) {

    res.setHeader("Allow", "PUT, GET, POST");

    if (req.method == "get") {
        res.status(501);
    }
    else if (req.method == "PUT" || req.method == "GET" || req.method == "POST") {
        res.status(200);
    }
    else {
        //any other shall return 501
        res.status(501);
    }

    res.send();
});

/**
 *  4.  Define the /login end-point
 *  4.1 The GET request should return a form with Username and Password input fields.
 *  4.2 The Password input field should be of type "password".
 *  4.3 Submit the form using the POST method, your server should respond with a JSON object with the following structure:
 *      { "username": "admin", "password": "12345" }
 *  4.4 Static code for the POST response should be of status code 200 and Content-type application/json
 */
app.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname + '/pages/login.html'));
});

app.post('/login', function (req, res) {

    res.setHeader('Content-Type', 'application/json'); //Done by default
    res.status(200); //Done by default
    
    res.send(req.body);
});



app.get('*', function(req,res){

    var jsonResult = new Object();

    //http://stackoverflow.com/questions/6857468/converting-a-js-object-to-an-array
    var headerArray = Object.keys(req.headers).map(function (key) { return req.headers[key]; });

    jsonResult.header = headerArray;

    jsonResult.method = req.method;
    jsonResult.protocol = req.protocol;
    jsonResult.path = req.path;
    jsonResult.port = req.headers.host.split(':')[1];
    jsonResult.host = req.headers.host.split(':')[0];
    res.send(jsonResult);

});

app.listen(8083);