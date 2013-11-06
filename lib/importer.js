var cli = require('cli');
var fs = require('fs');
var path = require('path');
var async = require('async');
var exec = require('child_process').exec;

// Check for gm binary in path
exec('which mongoimport', function(err) {
  if(err) {
    console.error('Could not find binary "gm" in path, please install graphicsmagic.');
    process.exit(1);
  }
});


function parseFile(file) {
  var rgxp = new RegExp('^(.+)-(full|inc)-([0-9]+)-(fs\.files|fs\.chunks)\.json(\.gz)?$', 'i');
  var data = file.match(rgxp);
  if(!data) throw new Error('File ' + file + ' does not match gridfsExim file convention!');
  return {
    file: file,
    db: data[1],
    type: data[2],
    dateStr: data[3],
    collection: data[4],
    gzip: data[5] == '.gz'
  };
}


function mongoimport(database, collection, fileWithPath, cb) {
  var msg = 'Importing ' + fileWithPath + ' to ' + database + '.' + collection;
  cli.spinner(msg);

  var cmd = 'mongoimport -d "' + database + '" -c "' + collection + '"';
  if(fileWithPath.match(/\.gz$/)) {
    cmd = 'gunzip -c "' + fs.realpathSync(fileWithPath) + '" | ' + cmd;
  } else {
    cmd += '--file "' + fs.realpathSync(fileWithPath) + '"';
  }
  exec(cmd, function(err, stdout, stderr) {
    if(err) return cb(err);
    if(stderr) return cb(new Error(stderr));
    cli.spinner(msg + ' done\n', true);
    cb();
  });
}


function importFile(file, dir, db, cb) {
  if(typeof file == 'object') {
    var data = file;
    file = data.file;
  } else {
    var data = parseFile(file);
  }
  if(data.collection != 'fs.files') throw new Error('Please sepcify a fs.files file.');

  if(!fs.existsSync(dir + file)) {
    cli.fatal('File ' + dir + file + ' not found!');
  }
  var chunksfile = file.replace('fs.files.', 'fs.chunks.');
  if(!fs.existsSync(dir+chunksfile)) {
    cli.fatal('File ' + dir + chunksfile + ' not found!');
  }

  async.series([
    async.apply(mongoimport, db, 'fs.chunks', dir + chunksfile),
    async.apply(mongoimport, db, 'fs.files', dir + file)
  ], cb);
}


module.exports = function(options, getAll) {

  if(!fs.existsSync(options.import)) {
    cli.fatal('File ' + options.import + ' not found!');
  }

  var dir = path.dirname(options.import) + '/';
  var file = path.basename(options.import);

  try {
    var data = parseFile(file);
  } catch(e) { cli.fatal(e.messae); }

  if(data.collection != 'fs.files') cli.fatal('Please provide a fs.files file!');

  var db = options.db || data.db;


  if(data.type == 'inc') {
    // import a single incremental file
    importFile(file, dir, db, function(err) {
      if(err) return cli.fatal(err.messae);
      cli.ok('Import finished!');
    });
  }


  if(data.type == 'full') {
    // import all files for this fulldump including follwing incrementals
    var files = fs.readdirSync(dir);
     files = files
       .map(parseFile)
       .filter(function(fileData) {
         // only use fs.files newer than the given one
         return fileData.collection == 'fs.files' && fileData.dateStr >= data.dateStr;
       })
       .sort(function(a, b) {
         return a.dateStr > b.dateStr;
       });
    // search for another fulldump file
    var until = null;
    for(var i=1; i<files.length; i++) {
      if(files[i].type == 'full') {
        until = files[i].dateStr;
        break;
      }
    }
    // if theres another fulldump which is newer than the given one
    // include only files older then this fulldump
    if(until) {
      files = files.filter(function(fileData) {
        return fileData.dateStr < until;
      })
    }

    async.eachSeries(files, function(file, next) {
      importFile(file, dir, db, next);
    }, function(err) {
      if(err) return cli.fatal(err.messae);
      cli.ok('Import finished!');
    })
  }

};