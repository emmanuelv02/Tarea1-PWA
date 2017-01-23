/**
 *  3. Return status code 500 at path /error
 */

var express = require('express');
var app = express();

app.use('/error', function (req, res, next) {
  res.status(500);  
  res.send();
});

app.listen(8083);