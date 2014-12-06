var path = require('path');
var nakeModuleRoot = path.join(__dirname, '..');

function list ( mustStartWith ) {
  var task, name, exports, tasks = [], gapLength = 0, minNameLength, gap;
  
  exports = __nakefile.exports;
  
  if ( !mustStartWith ) {
    mustStartWith = option('filter_sw', null);
  }
  
  for ( name in exports ) {
    if ( exports.hasOwnProperty(name) ) {
      task = exports[name];
      if ( typeof task === 'function' ) {
        if ( mustStartWith ) {
          if ( name.indexOf(mustStartWith) !== 0 ) continue;
        }
        tasks[tasks.length] = { name: name, info: task.info };
        if ( name.length > gapLength ) {
          gapLength = name.length;
        }
      }
    }
  }
  
  gap = '';
  minNameLength = gapLength;
  while ( gapLength !== 0 ) {
    gap += " ";
    --gapLength;
  }
    
  print("");
  print("nake [task] [FLAGS / OPTIONS / PATHS / OBJECTS]...");
  print("");
  tasks.forEach(function(task){
    var name = task.name, info = task.info;
    if ( name.length !== minNameLength ) {
      while ( name.length !== minNameLength ) name += " ";
    }
    print("    " + name + (info ? gap + info : ""));
  });
  print("");
}
list.info = "Lists all currently available tasks";

task('NAKE.list', list);
task('NAKE.l', list);

function version ( ) {
  print("");
  print("teamnora.nake " + require(path.join(nakeModuleRoot, 'package.json')).version);
  print("");
}
version.info = "Display teamnora.nake package version";

task('NAKE.version', version);
task('NAKE.v', version);

function help ( ) {
  list('NAKE.');
}
help.info = "List all Nake.* tasks";

task('NAKE.help', help);
task('NAKE.h', help);
task('?', help);