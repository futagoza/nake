debug = option('debug', 0);

task('src-test', function(){
  console.log('hello from nake src-test, debugging is ' + (debug ? 'enabled' : 'disabled'));
});
