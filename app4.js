
var express = require('express');
var bodyParser = require('body-parser')

var app = express();
app.use(bodyParser.urlencoded({ extended: false }))

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
        //wasn't told on the specification so any other method will returns statuscode 500.
        res.status(500);
    }

    res.send();
});

app.listen(8083);