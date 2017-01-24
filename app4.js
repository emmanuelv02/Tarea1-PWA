/**
 *  3. Return status code 500 at path /error when GET
 */

var express = require('express');
var app = express();

app.get('/error', function (req, res) {
  res.status(500);  
  res.send();
});

app.listen(8083);