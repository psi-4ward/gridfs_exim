# GridFS-EXIM
MongoDB GridFS-EXIM GridFS import/export Utility with support for incremental Backups, written in Node.JS

* Export fulldumps
* Export incremental dumps using the `fs.files.uploadDate` time and the Date (filename) of last dump-file
* Auto make fulldumps every XX days, otherwise make incremental ones
* Optionally GZip the output (its slow and consumes much CPU, perhaps HDD-space is cheaper?)
* Remove files older than XX days
* Import a fulldump including following incremental files


## Installation
run `npm install` in the root dir

## Usage
`gridfsExim --help`

```
Usage:
  gridfsExim [OPTIONS] [ARGS]

Options:
  -d, --db STRING          The Database to Dump
  -i, --inc BOOL           Make a incremental backup
  -f, --full BOOL          Make a full backup
  -a, --auto NUMBER        Make a incremental backup or a full backup if last full
                           is older than the given days
  -c, --clear NUMBER       Clear all backups older than given days
  -o, --outputDir [STRING] Set the output directory for the dump-files (Default is .)
  -h, --host [STRING]      The MongoDB Hostname (Default is localhost)
  -p, --port [NUMBER]      The MongoDB Port (Default is 27017)
  -z, --gzip BOOL          Compress the output using gzip
      --import STRING      Import a fulldump fs.files file with all chunks and
                           all following incrementals
  -k, --no-color           Omit color from output
      --debug              Show debug information
```

## Examples

### Export
Create a full backup and gzip the output
```
./gridfsExim --full --db testdb --outputDir /var/backups/gridfs --gzip --debug
```

Create a incremental backup
```
./gridfsExim --inc --db testdb --outputDir /var/backups/gridfs --debug
```

Create incremental backup or a full backup if last full backup is older than 14 days.<br>
Delete all backup-files older than 60 days but keep at least one fullbackup with its incremental parts.
```
./gridfsExim --auto 14 --db testdb --clear 60 --outputDir /var/backups/gridfs --debug
```

### Import
Import a fulldump with all following incrementals.<br>
Be shure to give the `fs.files` file.
```
./gridfsExim -- import mydb-full-20131105143946-fs.files.json
```

You can also use `mongoimport -d DATABASE -c COLLECTION --file FILE` <br>
be shure to import `fs.files` **and** `fs.chunks`


## Licence
License: http://www.gnu.org/licenses/lgpl-3.0.html LGPL <br>
Author: Christoph Wiechert [4ward.media](http://www.4wardmedia.de)