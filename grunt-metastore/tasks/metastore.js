var fs = require('fs');
var path = require('path');
var exec = require('child_process').exec;
var Promise = require('es6-promise').Promise;

var MetaStore = require('metastore').MetaStore;

module.exports = function(grunt) {
    grunt.task.registerMultiTask('extract_metadata', 'Extracts metadata from source code', function() {
        var done = this.async();
        var taskName = this.target;

        var relativeRoot = this.data.relativeRoot || process.cwd();
        var command = this.data.command;
        var runCommand = function (filename) {
            return new Promise(function (resolve, reject) {
                exec(command.replace(/\{\{\s*filename\s*\}\}/g, filename), function (err, stdout, stderr) {
                    // use stderr as a way of outputting debugging data from extractor
                    if (stderr) {
                        console.log(stderr);
                    } else if (err) {
                        reject(err);
                    } else {
                        process.stdout.write(".");
                        resolve(JSON.parse(stdout));
                    }
                });
            });
        };

        var extractorPromises = [];

        this.files.forEach(function (file) {
            var store = new MetaStore();
            var dest = file.dest;
            // try {
            //     store.import(fs.readFileSync(file.dest, 'utf8'));
            // } catch (e) {
            //     console.warn(e.message);
            // }
            var filePromises = [];

            var writeMetadata = function () {
                done();
            }

            file.src.forEach(function (srcFile) {
                var src = srcFile;

                // find all references to P.whatever.doSomething() and convert to:
                // var whatever = require('P.whatever'); assert.equal(whatever, P.whatever); whatever.doSomething()
                filePromises.push(runCommand(src).then(function (data) {
                    store.addData(taskName, path.relative(relativeRoot, src), data);
                }));
            });

            extractorPromises.push(Promise.all(filePromises).then(function () {
                fs.writeFileSync(file.dest, store.export());
            }));
        })

        Promise.all(extractorPromises).then(function (data) {
            done();
        }, function (err) {
            grunt.log.error(err);
        });
    });
};