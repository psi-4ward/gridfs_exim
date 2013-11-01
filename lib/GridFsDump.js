var MongoClient = require('mongodb').MongoClient;
var ObjectID = require('mongodb').ObjectID;
var async = require('async');
var fs = require('fs');
var mongoJson = require('./mongoJson.js');
var cli = require('cli').enable('status');
var extend = require('util')._extend;
var zlib = require('zlib');
var stream = require('stream');

module.exports = function(options, cb) {

  options = extend({
    outputDir: '.',
    host: 'localhost',
    port: '27017',
    query: {},
    filePrefix: '',
    gzip: true
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
    if(options.gzip) f += '.gz';
    cli.debug('Opening outfile: ' + f);
    if(options.gzip) {
      outfile_files = zlib.createGzip();
      outfile_files.pipe(fs.createWriteStream(f), {end: true});
    } else {
      outfile_files = fs.createWriteStream(f);
    }
    cb();
  }

  // open output file for fs.chunks
  function openFile_chunks(cb) {
    var f = options.outputDir + options.filePrefix +'fs.chunks.json';
    if(options.gzip) f += '.gz';
    cli.debug('Opening outfile: ' + f);
    if(options.gzip) {
      outfile_chunks = zlib.createGzip();
      outfile_chunks.pipe(fs.createWriteStream(f), {end: true});
    } else {
      outfile_chunks = fs.createWriteStream(f);
    }
    cb();
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
          outfile_chunks.write(b, cb);
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
        outfile_files.write(b)
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
      outfile_files.end();
      outfile_chunks.end();
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