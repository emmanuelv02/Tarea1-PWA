/**
 *  6.  Return status code 501 at path /notimplemented when get
 *  6.1 The Allow response header  list GET, POST, PUT
 *  6.2  Status code 200 for GET, POST & PUT at this path.
 */

var express = require('express');
var bodyParser = require('body-parser')

var app = express();

app.use(bodyParser.urlencoded({ extended: false }))

app.use('/notimplemented', function (req, res, next) {

    res.setHeader("Allow", "PUT, GET, POST");

    if (req.method == "get") {
        res.status(501);
    }
    else if(req.method == "PUT" || req.method == "GET" || req.method == "POST"){
        res.status(200);
    }
    else{
        //wasn't told on the specification so any other method will returns statuscode 500.
        res.status(500);
    }

    res.send();
});

app.listen(8083);