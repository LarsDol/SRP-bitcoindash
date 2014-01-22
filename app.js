
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
    , stylus    = require('stylus')
    , nib       = require('nib')
    , moment    = require('moment')
    , sanitize  = require('validator').sanitize
    , config    = require('./config')[app.get('env')]

    , mongoose  = require('mongoose')
    , db        = mongoose.connection
    , routes    = require('./routes');

var MtgoxData;

db.on('error', console.error);
db.once('open', function() {
  var mtgoxSchema = new mongoose.Schema({
    json: { type: String }
  });

  MtgoxData = mongoose.model('MtgoxData', mtgoxSchema);
});
mongoose.connect(config.db);

function compileStylus(str, path) {
  return stylus(str)
    .set('filename', path)
    .set('compress', true)
    .use(nib())
}

// all environments
app.set('port', process.env.PORT || config.port);
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
  src: config.stylus.srcPath,
  dest: config.stylus.destPath,
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
  //console.log('step 1', undefined);
  try {
    // Save data to database
    //console.log('test', undefined);
/*    if (data.length > 5) {
      var tick = new MtgoxData({ json: data });
      tick.save(function(err, tick) {
        if (err) return console.error(err);
        //console.dir(tick);
      });

      io.sockets.emit("data_to_client", data);
    } else {
      console.log('Error saving data to database', typeof data);
    }*/

/*  // Tell client to update data.
    var goxObject =  {
      time: 
    }
    var current_value = JSON.parse(data).ticker.last['value'];
    if ( current_value != previous_value ) {
      io.sockets.emit("value_to_client", goxObject );
      previous_value = current_value;
    }*/
  } catch (err) {
    console.log('Error receiving data', err);
  }
});
