var shelljs = require("shelljs");

Object.keys(shelljs).forEach(function(cmd){
  __nakefile.scope[cmd] = shelljs[cmd];
});