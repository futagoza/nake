var util = require('util');
var EventEmitter = require('events').EventEmitter;

function Nake ( cwd ) {
  if ( !(this instanceof Nake) ) {
    return new Nake(cwd);
  }
  EventEmitter.call(this);
  this.cwd = cwd || process.cwd();
}

util.inherits(Nake, EventEmitter);

require("./app-setup")(Nake.prototype);

Nake.parseArgvOptions = require("./argv-parser");

module.exports = function ( cwd, argv ) {
  var opts = Nake.parseArgvOptions(argv || []);
  var make = new Nake(opts.args['NAKE.CWD'] || cwd);
  make.run(opts.task, opts.flags, opts.args);
  return make;
};
module.exports.Nake = Nake;