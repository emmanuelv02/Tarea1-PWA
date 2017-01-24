
var express = require('express');
var app = express();

/**
 *  1. Return status code 404 at path /404 when GET
 */
app.get('/404', function (req, res) {
  res.status(404);  
  res.send();
});

/**
 *  2. Return status code 401 at path /protected when get
 */
app.get('/protected', function (req, res) {
    res.status(401);
    res.send();
});

/**
 *  3. Return status code 500 at path /error when GET
 */
app.get('/error', function (req, res) {
    res.status(500);
    res.send();
});

app.listen(8083);