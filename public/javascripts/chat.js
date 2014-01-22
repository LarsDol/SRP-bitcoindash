(function (){
	var socketio	= io.connect("127.0.0.1:1337"),
		unseen		= 0,
		counter		= 0,
		pageTitle	= document.title,
		isActive	= true,
		message;


	// Wanneer de window weer actief is.
	window.onfocus = function() {
		isActive = true;

		// Als er messages zijn die nog niet gezien zijn, geef ze dan een class mee.
		if (unseen > 0) {
			unseen = 0;
			document.title = pageTitle;
			$('.chat-message').removeClass('unseen');
		}
	};

	// Als de window niet langer actief is
	window.onblur = function() {
		isActive = false;
	};

	// Op het ontvangst event v/d socket
	socketio.on("message_to_client", function(data) {
		var $msg = null,
			$chatlog = $("#chatlog"),
			message = data.message.replace(/\n/g,"<br>"),
			$message = '<div class="chat-message" id="msg-'+counter+'"><span>' + message + '</span> <span class="message-info">'+ data.username +' - '+ data.time +'</span></div>';
		
		// Voeg de message toe aan de chatlog.
		$chatlog.append($message);
		$msg = $('#msg-'+counter);

		// Als de pagina geen focus heeft, toon dan aantal ongelezen in titel
		if (!isActive) {
			unseen ++;
			title = '(' + unseen + ') ' + pageTitle;
			document.title = title;

			$msg.addClass('unseen');
		}

		// Scroll de chat omlaag
		$chatlog.animate({ scrollTop: $chatlog[0].scrollHeight}, 1000);

		// Fade de message in.
		$msg.fadeIn('fast');

		// Tel 1 op bij de message counter
		counter ++;
	});

	function sendMessage() {
		var $user_input = $("#username_input"),
			$msg_input = $("#message_input"),
			name = $user_input.val(),
			msg = $msg_input.val();

		if ( name !== '' && msg !== '' ) {
			socketio.emit("message_to_server", { message : msg, username : name });
			$msg_input.val('');
		} else {
			if (name === '') {
				$user_input.addClass('attention');
			} 
			if (msg === '') {
				$msg_input.addClass('attention');
			}
		}
	}

	// Als de window niet langer actief is
	$("#username_input").blur(function() {
		unAttentionize($(this));
	});
	$("#message_input").blur(function() {
		unAttentionize($(this));
	});

	function unAttentionize($this) {
		if( $this.val() !== '' && $this.hasClass('attention') ) {
			$this.removeClass('attention');
		}
	}

  // Key input

	$("#message_input").keydown(function(e){
		var $this         = $(this),
			keyPressed    = e.keyCode,
			shiftPressed  = e.shiftKey,
			string;

		switch(keyPressed)
		{
		case 13: // Enter key
			e.preventDefault();
			if( shiftPressed ) {
				string = $this.val();
				$this.val( string + "\n" );
			} 
			else {
				sendMessage();
			}
			break; 

		case 9: // Tab key
			e.preventDefault();
			string = $this.val();
			$this.val( string + "\t" );
			break;

		default:
			break;
		}
	});

	// Als er op enter gedrukt wordt, verstuur dan de message.
	$("#username_input").keypress(function(e){
		if (e.which == '13') {
			e.preventDefault();
			sendMessage();
		}
	});

	// Als er op de send knop geklikt wordt, verstuur dan de message.
	$('#chat-send').click(function(){
		sendMessage();
	});
}());