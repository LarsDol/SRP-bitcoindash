
/**
 * Module dependencies.
 */

var   express   = require('express')
    , http      = require('http')
    , fs        = require('fs')
    , path      = require('path')
    , app       = express()
    , server    = http.createServer(app)
    , io        = require('socket.io').listen(server)
    , gox       = require('goxstream')
    , nib       = require('nib')
    , stylus    = require('stylus')
    , moment    = require('moment')
    , sanitize  = require('validator').sanitize

    , routes    = require('./routes');

function compileStylus(str, path) {
  return stylus(str)
    .set('filename', path)
    .set('compress', true)
    .use(nib())
}

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(stylus.middleware({
  src: __dirname + '/views',
  dest: __dirname + '/public',
  compile: compileStylus
}));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

app.get('/', routes.index);

server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

io.sockets.on('connection', function(socket) {
  socket.on('message_to_server', function(data) {
    var escaped_message = {
      message : sanitize(data["message"]).escape(),
      username : sanitize(data["username"]).escape(),
      time : moment().calendar()
    }

    if ( escaped_message.message.length > 0 && escaped_message.username.length > 0) {
      io.sockets.emit("message_to_client", escaped_message );
    }
  });

  io.sockets.emit("value_to_client", previous_value );
});

var previous_value;
gox.createStream().on('data', function(data){
  try {
    var last_value = JSON.parse(data).ticker.last['value'];
    if ( last_value != previous_value ) {
      io.sockets.emit("value_to_client", last_value );
      previous_value = last_value;
    }
  } catch (err) {}
});
