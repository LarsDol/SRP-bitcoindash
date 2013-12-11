socketio.on("value_to_client", function(data) {
  $('#gox-value').text(data);
});