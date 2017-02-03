/**
 * Created by Emmanuel Vidal on 2/2/2017.
 */
var yamlConfig = require('node-yaml-config');
var redisConfig = yamlConfig.load(__dirname + '/config/redis_config.yml');

var redis = require("redis");
var redisClient = redis.createClient(redisConfig.port, redisConfig.host);
redisClient.auth(redisConfig.auth);

var sharp = require('sharp');

const fs = require('fs-extra');

var output = fs.createWriteStream(__dirname + '/workerOutput.log', {flags: 'a'});
var errors = fs.createWriteStream(__dirname + '/workerErrors.log', {flags: 'a'});

process.stdout.write = output.write.bind(output);
process.stderr.write = errors.write.bind(errors);


function checkUploads() {
    redisClient.keys("emmanuel:*", function (err, keys) {
        if (keys != null && keys.length > 0) {
            if (keys.length > 1) {
                keys.reverse();
            }
            for (var index in keys) {

                redisClient.get(keys[index], function (err, value) {
                    if (err == null) {
                        //TODO handle possible errors


                        //check and update key status
                        if (value.split(':')[1] == 'todo') {
                            value = value.split(':')[0];
                            redisClient.set(keys[index], value + ':inprogress');

                            var fileName = value.split('uploads/')[1];
                            var extension = '';
                            if (fileName.indexOf('.') != -1) {
                                fileName = fileName.split('.');
                                extension = fileName[fileName.length - 1];
                            }
                            if (extension != '') {
                                extension = '.' + extension;
                            }

                            var movieId = keys[index].split(':')[1];

                            sharp(__dirname + '/' + value)
                                .resize(140, 209)
                                .toFile(__dirname + '/generated/' + fileName[0] + '_small' + extension, function (err, info) {
                                    if (err) {
                                        console.error(getDate() + ': Error creating small thumbnail of movie ' + movieId + ' : ' + err);
                                    } else {
                                        console.log(getDate() + ': Small image of movie ' + movieId + ' created');
                                    }
                                });

                            sharp(__dirname + '/' + value)
                                .resize(675)
                                .jpeg({quality: 60})
                                .toFile(__dirname + '/generated/' + fileName[0] + '_optimized' + extension, function (err, info) {
                                    if (err) {
                                        console.error(getDate() + ': Error creating small thumbnail of movie ' + movieId + ' : ' + err);
                                    } else {
                                        console.log(getDate() + ': Optimized image of movie ' + movieId + ' created.');
                                    }
                                });
                        }
                    }
                    else {
                        //TODO throw error
                    }
                });

            }
            redisClient.del(keys[index]);
        }
    });

    setTimeout(checkUploads, 30000);
}

process.on('message', function (msg) {

    if (msg == 'start') {
        console.log( getDate() + ': worker started listening... \r\n');
        checkUploads();
    }

});



function getDate(){
   var date = new Date();
   date.setHours( date.getHours()-4);

   //helped with http://stackoverflow.com/questions/10645994/node-js-how-to-format-a-date-string-in-utc
   return date.toISOString().replace(/T/, ' ').replace(/\..+/, '')
}
//process.stdout.pipe(output);
//process.stderr.pipe(errors);

module.exports = {};