var express = require('express');
var app = express();
const path = require("path");
var bodyParser = require('body-parser')

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}))
var workerPath = path.resolve(__dirname, 'worker.js');

var router = express.Router();
var hbs = require('express-handlebars');

app.engine('hbs', hbs({extname: 'hbs', defaultLayout: 'MainTemplate', layoutsDir: __dirname + '/views/layouts/'}));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

//#region Redis

var redis = require('redis');
var redisClient = redis.createClient('6379', '192.168.100.118');
redisClient.auth('g5X33nFB');

redisClient.on('connect', function () {
    console.log('redis connected');
});

//#endregion

//#region sqlite model
var sqlite3 = require('sqlite3').verbose();
const dbPath = path.resolve(__dirname, 'db/moviesdb')
const db = new sqlite3.Database(dbPath)
const uuidV4 = require('uuid/v4');

var bb = require('express-busboy');
const fs = require('fs-extra');

bb.extend(app,
    {
        upload: true,
        path: 'temp',
        allowedPath: '/movies/create'
    });

movies = {};

movies.createTable = function (callback) {
    db.run('CREATE TABLE IF NOT EXISTS movies (uuid TEXT PRIMARY KEY, name TEXT, description TEXT, keywords TEXT, poster TEXT)', callback);
}

movies.insertMovie = function (movieData, callback) {

    var id = uuidV4();
    var innerCallback = function () {
        var statement = db.prepare('INSERT INTO movies VALUES (?,?,?,?,?)');
        statement.run(id, movieData.nameValue, movieData.descriptionValue, movieData.keywordsValue, movieData.posterPath, callback(id));
        statement.finalize();
    }

    movies.createTable(innerCallback);
}

movies.getMovies = function (callback) {
    db.all("SELECT * FROM movies", function (err, rows) {
        if (err) {
            callback(err, {})
        }
        else {
            callback(null, rows);
        }
    });
}

movies.getMovie = function (uuid, callback) {
    db.get("SELECT * FROM movies where uuid = ?", uuid, function (err, rows) {
        if (err) {
            callback(err, {})
        }
        else {
            callback(null, rows);
        }
    });
}


//#endregion

function startWorker() {
    var childProcess = require('child_process').fork(workerPath);

    childProcess.send('start');
}

//#region CreateMovie
router.get('/movies/create', function (req, res) {
    res.render('createMovie', {title: 'Create Movie', createmovie: true});
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

    if (!(renderParams.invalidDescription || renderParams.invalidName || renderParams.invalidKeywords )) {
        if (req.files != null && req.files.poster != null && req.files.poster.file != null) {
            var filename = '';
            var extension = '';
            if (req.files.poster.filename.indexOf('.') != -1) {
                filename = req.files.poster.filename.split('.');
                extension = filename[filename.length - 1];
            }

            renderParams.posterPath = 'uploads/' + req.files.poster.uuid + '.' + extension

            fs.rename(req.files.poster.file, renderParams.posterPath);
            fs.remove(req.files.poster.file.split('poster')[0], function (err) {
                if (err) return console.error(err);
            });
        }
        else {
            renderParams.invalidPoster = true;
        }
    }

    if (renderParams.invalidPoster) {
        res.render('createMovie', renderParams);
    }
    else {
        movies.insertMovie(renderParams, function (id) {

            console.log(renderParams);

            redisClient.set('emmanuel:' + id, renderParams.posterPath, function (err, res) {
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

    movies.getMovies(function (error, data) {
        if (error == null) {

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
                if(extension != '') {
                    extension = '.' + extension;
                }

                //check if small image exists.
                var smallImagePath ='generated/'+fileName[0]+ '_small' +extension;
                if(fs.existsSync(__dirname +'/'+smallImagePath)){
                    data[index].poster = smallImagePath;
                }
            }

            renderParams.movies = data;
        }
        res.render('listMovies', renderParams);
    });

});


router.get(['/movies/json', '/movies/list/json'], function (req, res) {

    movies.getMovies(function (error, data) {
        var movies = {};
        if (error == null) {

            movies = data;
        }
        res.send(movies);
    });

});


//#endregion

//#region MovieDetails

router.get('/movies/details/*', function (req, res) {

    var renderParams = {};
    renderParams.title = "Movie Detail";


    movies.getMovie(req.params[0], function (error, data) {
        if (error == null && data != null) {


            var fileName = data.poster.split('uploads/')[1];
            var extension = '';
            if (fileName.indexOf('.') != -1) {
                fileName = fileName.split('.');
                extension = fileName[fileName.length - 1];
            }
            if(extension != '') {
                extension = '.' + extension;
            }
            //check if optimized image exists.
            var optimizedImagePath ='generated/'+fileName[0]+ '_optimized' +extension;
            if(fs.existsSync(__dirname +'/'+optimizedImagePath)){
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
startWorker();
app.listen(8083);