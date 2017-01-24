/**
 *  1. Return status code 401 at path /protected when get
 */

var express = require('express');
var app = express();

app.get('/protected', function (req, res) {
  res.status(401);  
  res.send();
});

app.listen(8083);