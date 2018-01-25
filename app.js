'use strict';
const PAGE_ACCESS_TOKEN = process.env.PAGE_ACCESS_TOKEN;
// Imports dependencies and set up http server
const request = require('request');
const
  express = require('express'),
  bodyParser = require('body-parser'),
  app = express().use(bodyParser.json()); // creates express http server

// Sets server port and logs message on success
app.listen(process.env.PORT || 1337, function() {
	console.log('webhook is listening');
	setGreetingText();
});

// Creates the endpoint for our webhook
// Todos webhook events sao enviados por post requests
app.post('/webhook', (req, res) => {  
 
  let body = req.body;

  // Checks this is an event from a page subscription
  if (body.object === 'page') {

    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {

      // Gets the message. entry.messaging is an array, but 
      // will only ever contain one message, so we get index 0
      let webhook_event = entry.messaging[0];
      console.log(webhook_event);

      // Get the sender PSID
	  let sender_psid = webhook_event.sender.id;
	  console.log('Sender PSID: ' + sender_psid);

	  // Check if the event is a message or postback and
	  // pass the event to the appropriate handler function
	  if (webhook_event.message) {
	    handleMessage(sender_psid, webhook_event.message);        
	  } else if (webhook_event.postback) {
	    handlePostback(sender_psid, webhook_event.postback);
	  }
    });

    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

});

// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.
  let VERIFY_TOKEN = "90MTFD0fpYwHz7FdzPkn";
    
  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];
    
  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
  
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);      
    }
  }
});

// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;
  let message = received_message.text;
  
  // Checks if the message contains text
  if (message) {    
    // Create the payload for a basic text message, which
    // will be added to the body of our request to the Send API
    if (message.toLowerCase() === 'filmes') {
    	//crawler
    } else if (message.toLowerCase() === 'horário' || message.toLowerCase() === 'horario') {
    	response = {
    		"text": defaultMessages.horario
    	};
    } else if (message.toLowerCase() === 'preços' || message.toLowerCase() === 'precos') {
    	response = {
    		"text": defaultMessages.valores
    	};
    } else {
    	response = {
    		"text": defaultMessages.default
    	};
    }

    /*response = {
      "text": `You sent the message: "${received_message.text}". Now send me an attachment!`
    }*/
  } 
  
  // Send the response message
  callSendAPI(sender_psid, response);    
}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  let response;
  
  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { "text": "Thanks!" }
  } else if (payload === 'no') {
    response = { "text": "Oops, try sending another image." }
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);
}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  }); 
}

function createGreetingApi(data) {
	request({
		uri: 'https://graph.facebook.com/v2.6/me/thread_settings',
		qs: { access_token: PAGE_ACCESS_TOKEN },
		method: 'POST',
		json: data

	}, function (error, response, body) {
		if (!error && response.statusCode == 200) {
  			console.log("Greeting set successfully!");
		} else {
  			console.error("Failed calling Thread Reference API", response.statusCode, response.statusMessage, body.error);
		}
	});  
}

function setGreetingText() {
	var greetingData = {
		setting_type: "greeting",
		greeting:{
			text: "Olá {{user_first_name}}! Posso lhe dar informações sobre o Cinesercla Cinemas do shopping Partage de Campina Grande. Qual informação deseja obter? Filmes\nPreços\nHorário\nMe envie uma mensagem com um desses itens e responderei o mais rápido possível :)"
		}
	};
	createGreetingApi(greetingData);
}

defaultMessages = {
	default: "Qual informação deseja obter? Filmes\nPreços\nHorário\nMe envie uma mensagem com um dessas palavras e responderei o mais rápido possível :)",
	horario: "Todos os dias de 14h ás 22h!",
	valores: "Segunda a Sexta-Feira\nPreço único: R$ 12,00 (2D) | R$ 14,00 (3D)\nSábado, Domingo e feriados\nInteira: R$ 24,00 (2D) | Meia: R$ 12,00 (2D)\nInteira: R$ 28,00 (3D) | Meia: R$ 14,00 (3D)"
};