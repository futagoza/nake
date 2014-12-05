var util = require('util');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var Module = require('module');
var CoffeeScript = require('coffee-script');
var template = fs.readFileSync(path.join(__dirname, 'template.js')).toString();

function Nake ( cwd ) {
  if ( !(this instanceof Nake) ) {
    return new Nake(cwd);
  }
  EventEmitter.call(this);
  this.cwd = cwd || process.cwd();
}

util.inherits(Nake, EventEmitter);

Nake.isNakecoffeePath = function ( id ) {
  return path.extname(id) === '.nake.coffee' || path.basename(id) === 'Nakefile.coffee';
};

Nake.isNakefilePath = function ( id ) {
  return path.extname(id) === '.nake' || path.basename(id) === 'Nakefile' || Nake.isNakecoffeePath(id);
};

Nake.resolve = function ( id, paths ) {
  var filename, length = paths.length, i;
  for ( i = 0; i < length; ++i ) {
    filename = path.join(path.resolve(paths[i]), id);
    if ( fs.existsSync(filename) ) {
      return filename;
    }
  }
};

Nake.prototype.run = function ( options ) {
  var tasks, session;
  
  options = options || {};
  session = {
    exports: {},
    scope: {},
    options: options,
    paths: [
      path.join(__dirname, '..', 'nake_modules')
    ],
    resolve: function ( id, nake_modules, node_modules ) {
      return Nake.resolve(id, [].concat.call(nake_modules || [], session.paths, node_modules || []));
    }
  };
  tasks = session.exports;
  
  function invoke ( name ) {
    if ( typeof tasks[name] !== 'function' ) {
      throw new Error("the task '" + name + "' was not regonizable!");
    }
    tasks[name].call({});
  }
  
  function runNakefile ( filename ) {
    var _module, sandbox, code, data;
    
    filename = path.resolve(options.cwd, filename);
    if ( !fs.existsSync(filename) ) {
      throw new Error("unable to locate Nakefile: " + filename);
    }
    
    data = fs.readFileSync(filename).toString();
    if ( Nake.isNakecoffeePath(filename) ) {
      data = CoffeeScript.compile(data, { header: false, bare: true });
    }
    code = template.replace('__NAKEFILE__', data);
    
    sandbox = {
      __filename: filename,
      __dirname: path.dirname(filename),
      __sourcecode: code,
      __nakefile: session,
      invoke: invoke
    };
    
    sandbox.module = _module = new Module(filename);
    sandbox.exports = _module.exports = tasks;
    _module.filename = sandbox.__filename;
    sandbox.require = (function(){
      var key, length, i, objects, _require;
      _require = function ( id ) {
        var nake_modules = [];
        if ( Nake.isNakefilePath(id) ) {
          nake_modules[0] = path.join(sandbox.__dirname, 'nake_modules');
          if ( !fs.existsSync(nake_modules[0]) ) {
            delete nake_modules[0];
          }
          return runNakefile(session.resolve(id, nake_modules, _require.paths), _module.exports);
        }
        return Module._load(id, _module, true);
      };
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

    vm.runInNewContext(code, path.basename(filename), sandbox);
    return _module.exports;
  }
  
  runNakefile('Nakefile');
  Object.keys(tasks).forEach(function(task){
    if ( typeof tasks[task] !== 'function' && options.args[task] ) {
      tasks[task] = options.args[task];
    }
  });
  return invoke(options.task);
};

Nake.parseArgvOptions = require("./argv-parser");

module.exports = function ( cwd, argv ) {
  var opts = Nake.parseArgvOptions(cwd, argv || []);
  return (new Nake(opts.cwd)).run(opts);
};
module.exports.Nake = Nake;