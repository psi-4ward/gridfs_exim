# GridFS-EXIM
MongoDB GridFS-EXIM GridFS import/export Utility with support for incremental Backups, written in Node.JS

## Installation
run `npm install` in the root dir

## Usage
`gridfsExim --help`

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

License: http://www.gnu.org/licenses/lgpl-3.0.html LGPL <br>
Author: Christoph Wiechert [4ward.media](http://www.4wardmedia.de)