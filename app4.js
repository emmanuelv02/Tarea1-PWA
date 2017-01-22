/**
 * Create a program that outputs the HTTP method, Path, Port, and Header fields as a JSON object on the body of the Web server's response.
 */

var express = require('express');
var app = express();

app.use(function (req, res, next) {

    var jsonResult = new Object();

    //http://stackoverflow.com/questions/6857468/converting-a-js-object-to-an-array
    var headerArray = Object.keys(req.headers).map(function (key) { return req.headers[key]; });

    jsonResult.header = headerArray;

    jsonResult.method = req.method;
    jsonResult.protocol = req.protocol;
    jsonResult.path = req.path;
    jsonResult.port = req.headers.host.split(':')[1];

    res.send(jsonResult);

    next();
});


app.listen(8083);