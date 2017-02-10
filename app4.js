var express = require('express');
var app = express();
const path = require("path");
var bodyParser = require('body-parser')
var yamlConfig = require('node-yaml-config');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }))
var workerPath = path.resolve(__dirname, 'worker.js');

var router = express.Router();
var hbs = require('express-handlebars');

app.engine('hbs', hbs({ extname: 'hbs', defaultLayout: 'MainTemplate', layoutsDir: __dirname + '/views/layouts/' }));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

//#region Redis
var redisConfig = yamlConfig.load(__dirname + '/config/redis_config.yml');

var redis = require('redis');
var redisClient = redis.createClient(redisConfig.port, redisConfig.host);
redisClient.auth(redisConfig.auth);

//#endregion
const uuidV4 = require('uuid/v4');

var bb = require('express-busboy');
const fs = require('fs-extra');

bb.extend(app,
    {
        upload: true,
        path: 'temp',
        allowedPath: '/movies/create',
        mimeTypeLimit: [
            'image/jpeg',
            'image/png'
        ]
    });

//#region mongodb model
var MongoClient = require('mongodb').MongoClient;

//TODO write in a external config file.
var mongodbConfig = yamlConfig.load(__dirname + '/config/mongodb_config.yml');
var url = mongodbConfig.url;

var moviesMongo = {};

moviesMongo.insertMovie = function (movieData, callback) {
    var id = uuidV4();
    var movieToInsert = {};
    movieToInsert.uuid = id;
    movieToInsert.name = movieData.nameValue;
    movieToInsert.description = movieData.descriptionValue;
    movieToInsert.keywords = movieData.keywordsValue;
    movieToInsert.poster = movieData.posterPath;

    var insertMovieFunction = function (db, callback) {
        db.collection('movies').insertOne(movieToInsert, function (err, result) {
            if (err != null) console.log(err);
            callback();
        });
    };

    callMongo(insertMovieFunction);
    callback(id);
}

moviesMongo.getMovies = function (callback) {
    var getAllMovies = function (db, innerCallback) {

        var cursor = db.collection('movies').find();
        cursor.toArray(function (err, docs) {
            if (err != null) console.log(err);
            callback(docs);
        });
        innerCallback();
    };

    callMongo(getAllMovies);
}

moviesMongo.getMovie = function (movieUuid, callback) {

    var movieToFind = {};
    movieToFind.uuid = movieUuid;

    var getMovieByUiid = function (db, innerCallback) {

        var cursor = db.collection('movies').find(movieToFind);
        cursor.nextObject(function (err, doc) {
            if (err != null) console.log(err);
            callback(doc);
        });
        innerCallback();
    };

    callMongo(getMovieByUiid);
}

function callMongo(func) {
    MongoClient.connect(url, function (err, db) {
        if (err != null) console.log(err);
        func(db, function () {
            db.close();
        });
    });
}

//#endregion


//#region CreateMovie
router.get('/movies/create', function (req, res) {
    res.render('createMovie', { title: 'Create Movie', createmovie: true });
});

router.post('/movies/create', function (req, res) {
    var renderParams = {};

    renderParams.title = 'Create Movie';
    renderParams.createmovie = true;

    if (req.body.name != null && req.body.name.trim() != '') {
        renderParams.nameValue = req.body.name.trim();
    } else {
        renderParams.invalidName = true;
    }

    if (req.body.description != null && req.body.description.trim() != '') {
        renderParams.descriptionValue = req.body.description.trim();
    } else {
        renderParams.invalidDescription = true;
    }

    if (req.body.keywords != null && req.body.keywords.trim() != '') {
        renderParams.keywordsValue = req.body.keywords.trim();
    } else {
        renderParams.invalidKeywords = true;
    }

    var anyInvalidField = (renderParams.invalidDescription || renderParams.invalidName || renderParams.invalidKeywords);


    if (req.files != null && req.files.poster != null && req.files.poster.file != null) {
        var filename = '';
        var extension = '';
        if (req.files.poster.filename.indexOf('.') != -1) {
            filename = req.files.poster.filename.split('.');
            extension = filename[filename.length - 1];
        }

        if (!anyInvalidField) {
            renderParams.posterPath = 'uploads/' + req.files.poster.uuid + '.' + extension

            fs.rename(req.files.poster.file, renderParams.posterPath);
        }

        fs.remove(req.files.poster.file.split('poster')[0], function (err) {
            if (err) console.log(err);
        });
    }
    else {
        renderParams.invalidPoster = true;
    }


    if (renderParams.invalidPoster || anyInvalidField) {
        res.render('createMovie', renderParams);
    }
    else {
        moviesMongo.insertMovie(renderParams, function (id) {
            //save redis entry with status at the end of the value.
            redisClient.set('emmanuel:' + id, renderParams.posterPath + ':todo', function (err, res) {
                if (err != null) {
                    //TODO
                    console.log(err);
                }
            });
            redirect(res, '/movies')
        });
    }
});

function redirect(res, path) {
    return res.redirect(path);
}

//#endregion

//#region ListMovies

router.get(['/movies', '/movies/list'], function (req, res) {

    var renderParams = {};
    renderParams.title = "Movies List";
    renderParams.listmovies = true;

    moviesMongo.getMovies(function (data) {

        for (var index in data) {
            Object.defineProperty(data[index], 'shortDescription', {
                get: function () {
                    if (this.description.length > 150) {
                        return this.description.substr(0, 149).trim() + '...';
                    }

                    return this.description;
                }
            });

            var fileName = data[index].poster.split('uploads/')[1];
            var extension = '';
            if (fileName.indexOf('.') != -1) {
                fileName = fileName.split('.');
                extension = fileName[fileName.length - 1];
            }
            if (extension != '') {
                extension = '.' + extension;
            }

            //check if small image exists.
            var smallImagePath = 'generated/' + fileName[0] + '_small' + extension;
            if (fs.existsSync(__dirname + '/' + smallImagePath)) {
                data[index].poster = smallImagePath;
            }
        }

        renderParams.movies = data;

        res.render('listMovies', renderParams);
    });

});


router.get(['/movies/json', '/movies/list/json'], function (req, res) {

    moviesMongo.getMovies(function (data) {
        res.send(data);
    });

});


//#endregion

//#region MovieDetails

router.get('/movies/details/*', function (req, res) {

    var renderParams = {};
    renderParams.title = "Movie Detail";

    moviesMongo.getMovie(req.params[0], function (data) {
        if (data != null) {

            var fileName = data.poster.split('uploads/')[1];
            var extension = '';
            if (fileName.indexOf('.') != -1) {
                fileName = fileName.split('.');
                extension = fileName[fileName.length - 1];
            }
            if (extension != '') {
                extension = '.' + extension;
            }
            //check if optimized image exists.
            var optimizedImagePath = 'generated/' + fileName[0] + '_optimized' + extension;
            if (fs.existsSync(__dirname + '/' + optimizedImagePath)) {
                data.poster = optimizedImagePath;
            }

            renderParams.movie = data;
        } else {
            renderParams.error = true;
        }

        res.render('movieDetail', renderParams);
    });
});

//#endregion

app.get('*/css/*', function (req, res) {
    res.sendFile(path.join(__dirname + '/views/css/' + req.path.split('/css')[1]));
});
app.get('*/js/*', function (req, res) {
    res.sendFile(path.join(__dirname + '/views/js/' + req.path.split('/js')[1]));
});

app.get(['/generated/*', '/uploads/*'], function (req, res) {
    res.sendFile(path.join(__dirname + req.path));
});

app.use('/', router);

//#region previous assignations

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

/**
 *  5.  Return status code 501 at path /notimplemented when get
 *  5.1 The Allow response header  list GET, POST, PUT
 *  5.2  Status code 200 for GET, POST & PUT at this path.
 */
app.use('/notimplemented', function (req, res, next) {

    res.setHeader("Allow", "PUT, GET, POST");

    if (req.method == "get") {
        res.status(501);
    }
    else if (req.method == "PUT" || req.method == "GET" || req.method == "POST") {
        res.status(200);
    }
    else {
        //any other shall return 501
        res.status(501);
    }

    res.send();
});

/**
 *  4.  Define the /login end-point
 *  4.1 The GET request should return a form with Username and Password input fields.
 *  4.2 The Password input field should be of type "password".
 *  4.3 Submit the form using the POST method, your server should respond with a JSON object with the following structure:
 *      { "username": "admin", "password": "12345" }
 *  4.4 Static code for the POST response should be of status code 200 and Content-type application/json
 */
app.get('/login', function (req, res) {
    res.sendFile(path.join(__dirname + '/views/login.html'));
});

app.post('/login', function (req, res) {

    res.setHeader('Content-Type', 'application/json'); //Done by default
    res.status(200); //Done by default

    res.send(req.body);
});


//Second assignation
app.get('*', function (req, res) {

    var jsonResult = new Object();

    //http://stackoverflow.com/questions/6857468/converting-a-js-object-to-an-array
    var headerArray = Object.keys(req.headers).map(function (key) {
        return req.headers[key];
    });

    jsonResult.header = headerArray;

    jsonResult.method = req.method;
    jsonResult.protocol = req.protocol;
    jsonResult.path = req.path;
    jsonResult.port = req.headers.host.split(':')[1];
    jsonResult.host = req.headers.host.split(':')[0];
    res.send(jsonResult);

});

//#endregion
app.listen(8083);