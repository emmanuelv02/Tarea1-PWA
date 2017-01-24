/**
 *  1. Return status code 404 at path /404 when GET
 */

var express = require('express');
var app = express();

app.get('/404', function (req, res) {
  res.status(404);  
  res.send();
});

app.listen(8083);