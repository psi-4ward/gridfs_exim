var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var async = require('async');
var fs = require('fs');
var mongoJson = require('./mongoJson.js');
var cli = require('cli').enable('status');
var extend = require('util')._extend;


module.exports = function(options, cb) {

  options = extend({
    outputDir: '.',
    host: 'localhost',
    port: '27017',
    query: {},
    filePrefix: ''
  }, options);
  if(options.outputDir.substr(options.outputDir.length-1,1) != '/') options.outputDir += '/';

  var db = null;
  var outfile_files = null;
  var outfile_chunks = null;

  // Establish database connection
  function connect(cb) {
    cli.debug('Connecting to MongoDB on ' + options.host + ':' + options.port);
    MongoClient.connect("mongodb://" + options.host + ":" + options.port + "/" + options.db, {}, function(err, dbCon) {
      db = dbCon;
      cb(err);
    });
  }

  // open output file for fs.files
  function openFile_files(cb) {
    var f = options.outputDir + options.filePrefix +'fs.files.json';
    cli.debug('Opening outfile: ' + f);
    fs.open(f, 'w', function(err, file) {
      outfile_files = file;
      cb(err);
    })
  }

  // open output file for fs.chunks
  function openFile_chunks(cb) {
    var f = options.outputDir + options.filePrefix +'fs.chunks.json';
    cli.debug('Opening outfile: ' + f);
    fs.open(f, 'w', function(err, file) {
      outfile_chunks = file;
      cb(err);
    })
  }


  // dump the files
  function dump(cb) {
    cli.debug('Query Database');
    var cursor = db.collection('fs.files').find(options.query).sort('uploadDate');

    cli.debug('Start dumping files');

    // dump all chunks for a file_id
    function dumpChunks(files_id, cb) {
      var chunksCursor = db.collection('fs.chunks').find({files_id: new ObjectID(files_id.toHexString())});

      // dump a fs.chunk document
      function dumpChunk(doc, cb) {
        mongoJson.export.chunk(doc, function(err, data) {
          if(err) return cb(err);
          var b = new Buffer(data + "\n");
          fs.write(outfile_chunks, b, 0, b.length, null, cb);
        });
      }

      // serial iterate over all chunks
      function runner() {
        chunksCursor.nextObject({}, function(err, doc) {
          if(err) return done(err);
          if(doc) {
            dumpChunk(doc, function(err) {
              if(err) return done(err);
              runner();
            })
          } else {
            cb();
          }
        });
      }
      runner();
    }

    // dump a fs.files document
    function dumpFile(doc, cb) {
      dumpChunks(doc._id, cb);
      mongoJson.export.file(doc, function(err, data) {
        if(err) return cb(err);
        var b = new Buffer(data+"\n");
        fs.write(outfile_files, b, 0, b.length, null, function(err) {
          if(err) return done(err);
        });
      });
    }

    // iterate over all files
    function runner() {
      cursor.nextObject({}, function(err, doc) {
        if(err) return done(err);
        if(doc) {
          dumpFile(doc, function(err) {
            if(err) return done(err);
            runner(); // next file
          });
        } else {
          done(err);
        }
      });
    }
    runner();

    // done callback, close the filepointer and database connection
    function done(err) {
      db.close();
      fs.close(outfile_files);
      fs.close(outfile_chunks);
      cb(err);
    }

  }

  // run all the tuff
  async.series([
    connect,
    openFile_files,
    openFile_chunks,
    dump
  ], function(err) {
    db.close();
    cb(err);
  });

};