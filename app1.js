/**
 * Create a program that outputs the four parts of an URL: Protocol, Hostname, Port, Path to the console.
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
    console.log('Protocol: ' + req.protocol);
    console.log('HostName: ' + req.hostname);
    console.log('Port: ' + req.headers.host.split(':')[1]);
    console.log('Path: ' + req.path);
    console.log();
}

app.listen(8083);