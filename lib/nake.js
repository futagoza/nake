var util = require('util');
var EventEmitter = require('events').EventEmitter;
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var CoffeeScript = require('coffee-script');

function Nake ( cwd ) {
  if ( !(this instanceof Nake) ) {
    return new Nake(cwd);
  }
  EventEmitter.call(this);
  this.cwd = cwd || process.cwd();
}

util.inherits(Nake, EventEmitter);

Nake.prototype.run = function ( options ) {
  var sandbox, code;
  
  options = options || {};
  sandbox = {
    Nakefile: {
      scope: {},
      tasks: {},
      options: options
    }
  };
  
  vm.runInNewContext(code, 'Nakefile', sandbox);
};

Nake.parseArgvOptions = require("./argv-parser");

module.exports = function ( cwd, argv ) {
  var opts = Nake.parseArgvOptions(cwd, argv || []);
  return (new Nake(opts.cwd)).run(opts);
};
module.exports.Nake = Nake;