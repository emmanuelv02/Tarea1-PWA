/**
 * Created by Emmanuel Vidal on 2/2/2017.
 */
var redis = require("redis");
var redisClient = redis.createClient('6379', '192.168.100.118');
redisClient.auth('g5X33nFB');

var sharp = require('sharp');

function checkUploads() {
    redisClient.keys("emmanuel:*", function (err, keys) {
        if (keys != null && keys.length > 0) {
            if (keys.length > 1) {
                keys.reverse();
            }
            for (var index in keys) {

                redisClient.get(keys[index], function (err, value) {
                    if (err == null) {
                        console.log(value);

                        //TODO handle possible errors
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
                                    console.error('Error creating small thumbnail of movie ' + movieId + ' : ' + err);
                                } else {
                                    console.log('Small image of movie ' + movieId + ' created');
                                }
                            });

                        sharp(__dirname + '/' + value)
                            .resize(675)
                            .jpeg({quality: 60})
                            .toFile(__dirname + '/generated/' + fileName[0] + '_optimized' + extension, function (err, info) {
                                if (err) {
                                    console.error('Error creating small thumbnail of movie ' + movieId + ' : ' + err);
                                } else {
                                    console.log('Optimized image of movie ' + movieId + ' created.');
                                }
                            });

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
        console.log('worker started listening...');
        checkUploads();
    }

});

module.exports = {};