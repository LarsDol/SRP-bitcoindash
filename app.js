
/**
 * Module dependencies.
 */
// Laad verschillende modules in
var   express   = require('express')
    , http      = require('http')
    , fs        = require('fs')
    , path      = require('path')
    , app       = express()
    , server    = http.createServer(app)
    , io        = require('socket.io').listen(server)

    , stylus    = require('stylus')
    , nib       = require('nib')
    , moment    = require('moment')
    , sanitize  = require('validator').sanitize
    , config    = require('./config')[app.get('env')]

    , routes    = require('./routes');

// Functie om Stylus te compilen.
function compileStylus(str, path) {
  return stylus(str)
    .set('filename', path)
    .set('compress', true)
    .use(nib());
}

// all environments
app.set('port', process.env.PORT || config.port);
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// Standaard express instellingen
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.json());
app.use(express.urlencoded());
app.use(express.methodOverride());
app.use(express.cookieParser('your secret here'));
app.use(express.session());
app.use(app.router);
app.use(stylus.middleware({
  src: config.stylus.srcPath,
  dest: config.stylus.destPath,
  compile: compileStylus
}));
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// Routes
app.get('/', routes.index);

// Message die getoond wordt wanneer server start.
server.listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});

// Socket connectie die luistert naar het message_to_server event,
// en het bericht opvangt, stript van potentieel schadelijke karakters,
// en vervolgens naar alle clients stuurt, mits het bericht en de username zijn ingevuld.
io.sockets.on('connection', function(socket) {
  socket.on('message_to_server', function(data) {
    var escaped_message = {
      message : sanitize(data.message).escape(),
      username : sanitize(data.username).escape(),
      time : moment().calendar()
    };

    if ( escaped_message.message.length > 0 && escaped_message.username.length > 0) {
      io.sockets.emit("message_to_client", escaped_message );
    }
  });
});

