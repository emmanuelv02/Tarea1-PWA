/**
 *  Create a program that outputs the HTTP Request message as text to the console.
 */

var express = require('express');
var bodyParser = require('body-parser')

var app = express();

//Solution found at http://stackoverflow.com/questions/9177049/express-js-req-body-undefined

app.use(bodyParser.urlencoded({ extended: false }))
app.use(bodyParser.json());


app.post('*', function (req, res) {
    console.log(req.body);
});

app.get('*', function (req, res) {
    console.log(req.body);
});

app.listen(8083);