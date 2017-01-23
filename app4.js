/**
 *  1. Return status code 401 at path /protected
 */

var express = require('express');
var app = express();

app.use('/protected', function (req, res, next) {
  res.status(401);  
  res.send();
});

app.listen(8083);