/**
 *  1. Return status code 404 at path /404
 */

var express = require('express');
var app = express();

app.use('/404', function (req, res, next) {
  res.status(404);  
  res.send();
});


app.listen(8083);