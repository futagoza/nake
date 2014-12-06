var fs = {};

var FS = fs.FS = require('fs-extra');
var PATH = fs.PATH = require('path');

Object.keys(FS).forEach(function(name){
  fs[name] = FS[name];
});

fs.resolve = PATH.resolve;
fs.basename = PATH.basename;
fs.dirname = PATH.dirname;
fs.extname = PATH.extname;
fs.relative = PATH.relative;
fs.join = function ( ) {
  return PATH.join.apply(null, arguments).replace('\\', '/');
};

fs.mkdir = require('mkdirp');
fs.mkdirSync = fs.mkdir.sync;

fs.rm = require('rimraf');
fs.rmSync = fs.rm.sync;

fs.readFile = function ( filename, options, callback ) {
  if ( typeof options === 'function' ) {
    callback = options;
    options = null;
  }
  FS.readFile(filename, options, function(err, data){
    callback(err, data ? data.toString() : null);
  });
};
fs.readFileSync = function ( filename, options ) {
  
  return FS.readFileSync(filename, options).toString();
};

fs.writeFile = function ( filename, data, options, callback ) {
  if ( typeof options === 'function' ) {
    callback = options;
    options = null;
  }
  fs.mkdir(fs.dirname(filename), function(err){
    if ( err ) callback(err);
    else FS.writeFile(filename, data, options, callback);
  });
};
fs.writeFileSync = function ( filename, data, options ) {
  fs.mkdirSync(fs.dirname(filename));
  FS.writeFileSync(filename, data, options);
};

function appendStatDetails ( path, stat ) {
  Object.defineProperties(stat, {
    path: { value: path },
    basename: { get: function ( ) { return fs.basename(path); } },
    dirname: { get: function ( ) { return fs.dirname(path); } },
    extname: { get: function ( ) { return fs.extname(path); } }
  });
  return stat;
}
fs.stat = function ( path, callback ) {
  FS.stat(path, function(err, stat){
    callback(err, stat ? appendStatDetails(path, stat) : null);
  });
};
fs.statSync = function ( path ) {
  return appendStatDetails(path, FS.statSync(path));
};

fs.walk = function ( path, recursive, callback ) {
  if ( typeof recursive === 'function' ) {
    callback = recursive;
    recursive = false;
  }
  if ( recursive === false || recursive === null || recursive === void 0 ) {
    recursive = 1;
  }
  fs.stat(path, function(err, stat){
    if ( err ) {
      callback(err);
    } else {
      if ( stat.isDirectory() )
          if ( recursive ) {
            fs.readdir(path, function(err, items){
            if ( err ) {
              callback(err);
            } else {
              if ( items.length ) {
                if ( typeof recursive === 'number' ) {
                  --recursive;
                }
                items.forEach(function(item){
                  fs.walk(fs.join(path, item), recursive, callback);
                });
              }
            }
          });
          }
      else
        callback(null, path, stat);
    }
  });
};
fs.walkSync = function ( path, recursive, callback ) {
  var stat = fs.statSync(path);
  if ( typeof recursive === 'function' ) {
    callback = recursive;
    recursive = false;
  }
  if ( recursive === false || recursive === null || recursive === void 0 ) {
    recursive = 1;
  }
  if ( stat.isDirectory() ) {
    if ( recursive ) {
      var items = fs.readdirSync(path);
      if ( items.length ) {
        if ( typeof recursive === 'number' ) {
          --recursive;
        }
        items.forEach(function(item){
          fs.walkSync(fs.join(path, item), recursive, callback);
        });
      }
    }
  } else {
    callback(path, stat);
  }
};

define('fs', fs);