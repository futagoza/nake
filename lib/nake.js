var util = require('util');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var Module = require('module');
var CoffeeScript = require('coffee-script');
var template = fs.readFileSync(path.join(__dirname, 'template.txt')).toString();
var nakesdir = path.join(__dirname, '..', 'nakes');

function die ( ) {
  console.log.apply(null, arguments);
  process.exit(1);
}

function Nake ( cwd ) {
  if ( !(this instanceof Nake) ) {
    return new Nake(cwd);
  }
  EventEmitter.call(this);
  this.cwd = cwd || process.cwd();
}

util.inherits(Nake, EventEmitter);

Nake.nakesdir = nakesdir;

Nake.isNakecoffeePath = function ( id ) {
  return id.substring(id.length - 12) === '.nake.coffee' || path.basename(id) === 'Nakefile.coffee';
};

Nake.isNakefilePath = function ( id ) {
  return path.extname(id) === '.nake' || path.basename(id) === 'Nakefile' || Nake.isNakecoffeePath(id);
};

Nake.resolveNakefile = function ( type, filename ) {
  var n, names, pkg;
  if ( fs.existsSync(filename) && fs.statSync(filename).isDirectory() ) {
    pkg = filename + '/package.json';
    if ( fs.existsSync(pkg) ) {
      pkg = require(pkg);
      if ( pkg.nake ) {
        type = type || 'main';
        if ( typeof pkg.nake[type] === 'string' ) {
          return path.join(filename, pkg.nake[type]);
        }
        die(new Error("'nake." + type + "' in package '" + filename + "/package.json' must be a string!"));
      }
    }
    names = [
      filename + '/Nakefile',
      filename + '/Nakefile.coffee',
      filename + '/Nakefile.js',
      filename + '/index.nake',
      filename + '/index.nake.coffee',
      filename + '/index.nake.js',
      filename + '/nake-plugin',
      filename + '/nake-plugin.nake',
      filename + '/plugin.nake',
      filename + '/nake-plugin.coffee',
      filename + '/nake-plugin.js'
    ];
  } else {
    names = [
      filename,
      filename + '.js',
      filename + '.coffee',
      filename + '.nake',
      filename + '.nake.js',
      filename + '.nake.coffee'
    ];
  }
  for ( n = 0; n < names.length; ++n ) {
    if ( fs.existsSync(names[n]) ) {
      return names[n];
    }
  }
};
Nake.resolve = function ( type, id, paths ) {
  var filename, length, i, names, n;
  if ( !paths || !paths.length ) {
    return Nake.resolveNakefile(type, id);
  } else {
    length = paths.length;
    for ( i = 0; i < length; ++i ) {
      if ( !paths[i] ) continue;
      filename = Nake.resolveNakefile(type, path.join(path.resolve(paths[i]), id));
      if ( filename ) return filename;
    }
  }
  die(new Error("unable to locate Nakefile: " + id));
};

Nake.prototype.run = function ( options ) {
  var tasks, session;
  
  options = options || {};
  session = {
    exports: {},
    scope: {},
    options: options,
    paths: [
      path.join(nakesdir, 'nake_modules')
    ],
    resolve: function ( id, nake_modules, node_modules ) {
      return Nake.resolve('plugin', id, [].concat.call(nake_modules || [], session.paths, node_modules || []));
    }
  };
  tasks = session.exports;
  
  function invoke ( name ) {
    if ( typeof tasks[name] !== 'function' ) {
      die(new Error("the task '" + name + "' was not recognizable!"));
    }
    tasks[name].call({});
  }
  
  function runNakefile ( filename, type, resolved ) {
    var _module, sandbox, code, data, i, names;
    
    if ( filename ) {
      filename = path.resolve(options.cwd, filename);
      if ( !fs.existsSync(filename) ) {
        if ( !resolved ) filename = Nake.resolve(type || 'plugin', filename);
      }
    } else {
      if ( !resolved ) filename = Nake.resolve(type || 'plugin', options.cwd);
    }
    if ( resolved && !fs.existsSync(filename) ) {
      die(new Error("unable to locate Nakefile: " + filename));
    }
    
    data = fs.readFileSync(filename).toString();
    if ( Nake.isNakecoffeePath(filename) ) {
      data = CoffeeScript.compile(data, { header: false, bare: true });
    }
    code = template.replace('__NAKEFILE__', data);
    
    function include ( id ) {
      var nake_modules = path.join(sandbox.__dirname, 'nake_modules');
      nake_modules = fs.existsSync(nake_modules) ? [nake_modules] : [];
      return runNakefile(session.resolve(id, nake_modules, sandbox.require.paths), _module.exports, true);
    }
    include.paths = [];
    
    sandbox = {
      __filename: filename,
      __dirname: path.dirname(filename),
      __sourcecode: code,
      __nakefile: session,
      invoke: invoke,
      die: die,
      print: console.log,
      include: include
    };
    sandbox.global = sandbox.GLOBAL = sandbox;
    
    sandbox.module = _module = new Module(filename);
    sandbox.exports = _module.exports = tasks;
    _module.filename = sandbox.__filename;
    sandbox.require = (function(){
      var key, length, i, objects;
      function _require ( id ) {
        if ( Nake.isNakefilePath(id) ) {
          return include(id);
        }
        return Module._load(id, _module, true);
      }
      objects = Object.getOwnPropertyNames(require);
      for ( i = 0, length = objects.length; i < length; ++i ) {
        key = objects[i];
        if ( key !== 'paths' ) {
          _require[key] = require[key];
        }
      }
      _require.paths = _module.paths = Module._nodeModulePaths(options.cwd);
      _require.resolve = function ( request ) {
        return Module._resolveFilename(request, _module);
      };
      return _require;
    })();
    
    Object.keys(global).forEach(function(key){
      if ( !sandbox[key] ) sandbox[key] = global[key];
    });
    
    var context = vm.createContext(sandbox);
    vm.runInContext(code, context, path.basename(filename));
    return _module.exports;
  }
  
  runNakefile(path.join(nakesdir, 'nake-default-tasks.js'), 'main', true);
  runNakefile(null, 'main');
  Object.keys(tasks).forEach(function(task){
    if ( typeof tasks[task] !== 'function' && options.args[task] ) {
      tasks[task] = options.args[task];
    }
  });
  if ( !options.task ) {
    options.task = 'NAKE.list';
  }
  return invoke(options.task);
};

Nake.parseArgvOptions = require("./argv-parser");

module.exports = function ( cwd, argv ) {
  var opts = Nake.parseArgvOptions(cwd, argv || []);
  return (new Nake(opts.cwd)).run(opts);
};
module.exports.Nake = Nake;
