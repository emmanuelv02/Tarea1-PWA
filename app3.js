/**
 * Create a program that outputs all of the header fields passed in an HTTP Request message as a JSON object to the console.
 */

var express = require('express');
var app = express();

app.get('*', function (req, res) {
    showInformation(req);
});

app.post('*', function (req, res) {
    showInformation(req);
});

function showInformation(req) {
    console.log(JSON.stringify(req.headers));
}

app.listen(8083);