/*
  Copyright (c) __YEAR__ __AUTHOR__
  __PROJECT__, v__VERSION__
  __HOMEPAGE__
  
  __LICENSE__
*/
if ( typeof global === "undefined" ) var global = this;
(function(modules){

  // local variables
  var main, factory, cache = {}, __hasOwnProperty = Object.prototype.hasOwnProperty;

  // simulates a module importer
  function require ( id ) {
    var name = id, module;
    if ( !__hasOwnProperty.call(modules, name) ) {
      name = name + '/index';
    }
    module = cache[name];
    if ( !module ) {
      if ( !__hasOwnProperty.call(modules, name) ) {
        throw new Error("cannot find module '" + id + "'");
      }
      module = cache[name] = { exports: {}, main: main };
      modules[name].call(
        {}, require, module, module.exports
      );
    }
    return module.exports;
  }

  // Universal Module Definition (UMD) to support AMD, CommonJS/Node.js, Rhino, and plain browser loading
  main = require('__MAIN__');
  if ( !main.require ) {
    main.require = require;
  }
  if ( typeof define === 'function' ) {
    factory = function ( ) { return main; };
    if ( define.amd ) define(factory);
    else define('__EXPORT_NAME__', [], factory);
  } else {
    if ( typeof exports !== 'undefined' ) {
      if ( typeof module !== 'undefined' ) {
        module.exports = main;
      }
      exports.__EXPORT_NAME__ = main;
    } else {
      global['__EXPORT_NAME__'] = main;
    }
  }

})({

 __MODULES__

});