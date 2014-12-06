var resolve = require('path').resolve;

module.exports = function ( cwd, argv ) {
  var options, extras, arg, index, key, value, argi;
  
  options = {
    task: null,
    flags: [],
    args: {},
    strings: [],
    numbers: [],
    booleans: [],
    objects: [],
    paths: []
  };
  
  if ( argv && argv.length === 0 ) {
    
    options.task = 'NAKE.list';
    
  } else {
    
    argvi = -1;
    while ( argv.length !== 0 ) {
      arg = argv.shift();
      ++argvi;
      index = 0;
      
      if ( arg.charAt(0) === '-' ) {
        index = arg.charAt(1) === '-' ? 2 : 1;
        arg = arg.substring(index);
        if ( arg !== '' ) {
          options.flags.push(arg);
        }
        continue;
      }
      
      index = arg.indexOf('=');
      if ( index !== -1 ) {
        key = arg.substring(0, index);
        value = arg.substring(index + 1);
        if ( key === "" || value === "" ) {
          throw new Error('empty key/value supplied to nake: ' + arg);
        }
        try {
          value = JSON.parse(value);
        } catch ( e ) {}
        options.args[key] = value;
        continue;
      }
      
      try {
        
        arg = JSON.parse(arg);
        if ( typeof arg === "string" ) {
          options.strings.push(arg);
        }
        else if ( typeof arg === "number" ) {
          options.numbers.push(arg);
        }
        else if ( typeof arg === "boolean" ) {
          options.booleans.push(arg);
        }
        else if ( typeof arg === "object" ) {
          options.objects.push(arg);
        }
        else {
          extras = extras || [];
          extras.push(arg);
        }
        continue;
        
      } catch ( e ) {
        
        if ( arg.charAt(0) !== "'" ) {
          if ( argvi === 0 ) {
            options.task = arg;
          } else {
            options.paths.push(arg);
          }
          continue;
        }
        
        throw e;
      }
    }
    
  }
  
  options.cwd = resolve(options.args['NAKE.cwd'] || cwd || process.cwd());
  if ( extras ) options.extras = extras;
  
  return options;
};
