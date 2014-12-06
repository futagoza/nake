var CoffeeScript = require('coffee-script');
var UglifyJS = require('uglify-js');
var ncdb = {};

include("fs");

function returnSource ( m, source ) { return source; }
function returnText ( m, text ) {
  return "module.exports = \"" + JSON.stringify(text) + "\";";
}
function compileCoffee ( m, source, dontEditExt ) {
  if ( !dontEditExt ) {
    m.id = m.id.split('.').slice(0, -1).join('.');
  }
  return CoffeeScript.compile(source, { filename: m.filename });
}

ncdb.compilers = {
  '.nake': returnSource,
  '.js': returnSource,
  '.json': function ( m, source ) {
    return "module.exports = " + source + ";";
  },
  '.txt': returnText,
  '.css': returnText,
  '.html': returnText,
  '.md': returnText,
  '.coffee': compileCoffee,
  '.litcoffee': compileCoffee,
  '.cson': function ( m, source ) {
    return "module.exports = " + compileCoffee(m, source, true) + ";";
  }
};


ncdb.templates = {
  package: fs.readFileSync(fs.join(__dirname, 'template.js')),
  module: fs.readFileSync(fs.join(__dirname, 'module.js'))
};

function each (a,b,c){for(var d in a){if(a.hasOwnProperty(d))b.call(c,a[d],d,a);}}
function merge (a,b){ each(b, function(v,k){ a[k] = v; }); return a; }

var newLineChars = /(\n|\r\n|\r)/g;
function indent ( data, tabs ) {
  return data.replace(newLineChars, function(m, nl){ return nl + (tabs || "  "); });
}

function str_replace ( string, keywords ) {
  each(keywords, function(newValue, oldValue){
     if ( typeof newValue === "string" ) {
       // http://stackoverflow.com/a/2434431
       newValue = newValue.split("$").join('$$');
     }
    string = string.replace(oldValue, newValue);
  });
  return string;
}

ncdb.project_configname = 'ncdb-project.json';

ncdb.build = function ( project, SRC_DIR, DIST_DIR ) {
  
  if ( typeof project !== 'string' ) {
    die('ncdb.build: must pass a string as the first argument');
  }
  
  SRC_DIR = SRC_DIR || fs.join(__nakefile.cwd, 'src');
  DIST_DIR = DIST_DIR || fs.join(__nakefile.cwd, 'dist');
  var PROJECT_DIR = fs.join(SRC_DIR, project);
  
  if ( !fs.existsSync(SRC_DIR) ) {
    die("ncdb.build: you must specify a src directory where your projects are.");
  }
  if ( !fs.existsSync(PROJECT_DIR) ) {
    die("ncdb.build: could not locate project at " + PROJECT_DIR);
  }
  
  var configname = fs.join(PROJECT_DIR, ncdb.project_configname);
  if ( !fs.existsSync(configname) ) {
    die("ncdb.build: config file not found: " + configname);
  }
  var config = require(configname);
  
  var compilers = merge({}, ncdb.compilers);
  if ( config.compilers ) {
    merge(compilers, config.compilers);
  }
  
  var templates = merge({}, ncdb.templates);
  if ( config.templates ) {
    merge(templates, config.templates);
  }
  
  var ignore = [];
  if ( config.ignore ) {
    ignore = ignore.concat(config.ignore);
  }
  
  function outputName ( minified ) {
    return project + (config['versioned-filename'] ? '-' + config.version : '') + (minified ? '.min' : '') + '.js';
  }
  
  if ( !fs.existsSync(DIST_DIR) ) fs.mkdirSync(DIST_DIR);
  
  function getProjectModules ( name, src_path ) {
    var modules = [];
    fs.walkSync(src_path, true, function(path, stat){
      path = path.replace(/\\/g, "/");
      var module, rel_path = path.replace(src_path + "/", "");
      if ( path === configname ) return;
      if ( ignore.indexOf(rel_path) !== -1 ) return;
      module = {
        id: name + '/' + rel_path,
        filename: path,
        dirname: stat.dirname,
        basename: stat.basename,
        source_relative: rel_path,
        ext: stat.extname,
        comment: "// source: " + path.replace(SRC_DIR, "src"),
        size: stat.size,
        source: fs.readFileSync(path)
      };
      
      var compile = compilers[module.ext];
      if ( !compile ) {
        die("ncdb.build: extention for '" + module.basename + "' is not a known compiler extension!");
      }
      module.data = compile(module, module.source);
      modules.push(module);
    });
    return modules;
  }
  
  var modules = getProjectModules(project, PROJECT_DIR);
  if ( config.include ) {
    each(config.include, function(name, source_dir){
      modules = modules.concat(getProjectModules(name, fs.join(SRC_DIR, source_dir)));
    });
  }
  
  var data = str_replace(templates.package, {
    '__YEAR__': config.years || config.year || (new Date()).getFullYear(),
    '__AUTHOR__': config.author || '',
    '__PROJECT__': project,
    '__VERSION__': config.version || "1",
    '__HOMEPAGE__': config.homepage || config.www || "",
    '__LICENSE__': config.license || "",
    '__MAIN__': config.main || project,
    '__EXPORT_NAME__': config.name || project,
    '__MODULES__':  modules.map(function(module){
      var id = module.id;
      if ( module.ext === '.js' ) {
        id = id.substring(0, id.indexOf('.js'));
      }
      return indent(str_replace(templates.module, {
        '__COMMENT__': module.comment || '',
        '__ID__': id,
        '__DATA__': indent(module.data.trim())
      }));
    }).join(",\n\n")
  });
  
  fs.writeFileSync(fs.join(DIST_DIR, config.distName || outputName()), data);
  
  if ( config.minify ) {
    data = UglifyJS.minify(data, { fromString: true }).code;
    fs.writeFileSync(fs.join(DIST_DIR, config.minName || outputName(true)), data);
  }
};

function buildTask ( ) {
  var project = option('project');
  var src = option('src') || option('source');
  var dist = option('dist') || option('output');
  
  
  if ( !project ) {
    die("ncdb.build: to use the nake task you must specify a 'project' argument, e.g 'nake ncdb.build project=sdk'");
  }
  
  ncdb.build(project, src, dist);
}

buildTask.info = "ncdb will build your dist based on a 'ncdb-project.json'";

define('ncdb', ncdb);
task('ncdb.build', buildTask);