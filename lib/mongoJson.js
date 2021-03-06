module.exports = {

  export: {
    file: function(doc, cb) {
      if(doc._id) doc._id = {'$oid': doc._id};
      if(doc.uploadDate) doc.uploadDate = {'$data': new Date(doc.uploadDate).getTime()};
      cb(null, JSON.stringify(doc));
    },
    chunk: function(doc, cb) {
      if(doc._id) doc._id = {'$oid': doc._id};
      if(doc.files_id) doc.files_id = {'$oid': doc.files_id};
      if(doc.data) doc.data = {'$binary': doc.data.toString('base64'), '$type':'00'};
      cb(null, JSON.stringify(doc));
    }
  }
};