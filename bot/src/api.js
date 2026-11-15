const demo=require("../../config/demo");
module.exports=function(app,{db,client,sendAlert,sendDemo,sendDemoTTS,sendTTS,generateTransactionNumber,colors}){
app.post("/api/v1/alert", (req, res) => { // Legacy alert endpoint
	console.log(req.body);

	// Check length of inputs, if any are over 500 characters, return 400
	if (req.body.placeName.length > (process.env.MAX_LENGTH || 500) || req.body.systemName.length > (process.env.MAX_LENGTH || 500) || req.body.zoneName.length > (process.env.MAX_LENGTH || 500) || req.body.event.length > (process.env.MAX_LENGTH || 500)) {
		console.log(`${colors.red("[ERROR]")} Input too long. From ${req.ip}`);
		console.log(`${colors.red("[ERROR]")} PlaceName: ${req.body.placeName.length} SystemName: ${req.body.systemName.length} ZoneName: ${req.body.zoneName.length} EventName: ${req.body.event.length}`);
		res.status(400).send("Input too long");
	}
	// send no content response
	sendAlert(req.body.accountNumber, req.body.transaction, req.body.placeName, req.body.systemName, req.body.zoneNumber, req.body.zoneName, req.body.event).then(() => {
		res.status(204).send();
	}).catch((error) => {
		res.status(500).send(error);
	});
})

app.post("/api/v1/webhook/:brand/:accountNumber", (req, res) => {
	// Check length of inputs, if any are over 500 characters, return 400
	switch (req.params.brand) {
		case "kca":
			if (req.body.placeName.length > (process.env.MAX_LENGTH || 500) || req.body.systemName.length > (process.env.MAX_LENGTH || 500) || req.body.zoneName.length > (process.env.MAX_LENGTH || 500) || req.body.event.length > (process.env.MAX_LENGTH || 500)) {
				console.log(`${colors.red("[ERROR]")} Input too long. From ${req.ip}`);
				console.log(`${colors.red("[ERROR]")} PlaceName: ${req.body.placeName.length} SystemName: ${req.body.systemName.length} ZoneName: ${req.body.zoneName.length} EventName: ${req.body.event.length}`);
				res.status(400).send("Input too long");
			}
			if (String(req.params.accountNumber) === String(demo.accountId)) {
				// Generate the audio files, then post it to discord
				sendDemo(req.params.accountNumber, req.body.transaction, req.body.placeName, req.body.systemName, req.body.zoneNumber, req.body.zoneName, req.body.event, req.body.placeId).then(() => {
					res.status(204).send();
				}).catch((error) => {
					res.status(500).send(error);
				});
			} else {

				// send alert to accountNumber
				sendAlert(req.params.accountNumber, req.body.transaction, req.body.placeName, req.body.systemName, req.body.zoneNumber, req.body.zoneName, req.body.event).then((resp) => {
					if (resp == "Cooldown") {
						return res.status(429).send("Cooldown");
					}
					res.status(204).send();
				}).catch((error) => {
					res.status(500).send(error);
				});
			}
			break;
		default:
			res.status(400).send("Brand not found");
			break;
	}
});

app.post("/api/v1/tts", (req, res) => {
	// Check length of inputs, if any are over 500 characters, return 400
	if (req.body.text.length > (process.env.MAX_LENGTH || 500)) {
		console.log(`${colors.red("[ERROR]")} Input too long. From ${req.ip}`);
		console.log(`${colors.red("[ERROR]")} Text: ${req.body.text.length}`);
		res.status(400).send("Input too long");
	}
	console.log(req.body);
	// send no content response
	(String(req.body.accountNumber) === String(demo.accountId) ? sendDemoTTS(req.body.accountNumber, req.body.transaction, req.body.text) : sendTTS(req.body.accountNumber, req.body.transaction, req.body.text)).then(() => {
		res.status(204).send();
	}).catch((error) => {
		res.status(500).send(error);
		console.log(error.stack)
	});
});

app.ws("/api/v1/websocket/:accountNumber", (ws, req) => {
	var userData;
	// Check if account number is valid and is verified
	db.get("SELECT * FROM accounts WHERE id = ? AND verified = 1", req.params.accountNumber, (err, row) => {
		if (err) {
			console.error(err);
			ws.send(JSON.stringify({ status: "error", code: 500, message: "Internal Server Error", timestamp: new Date().toISOString() }));
			ws.close();
			return;
		} else if (row) {
			userData = row;
			ws.send(JSON.stringify({ status: "connected", code: 200, timestamp: new Date().toISOString() }));
		} else {
			ws.send(JSON.stringify({ status: "error", code: 404, message: "Account not found or not verified", timestamp: new Date().toISOString() }));
			ws.close();
			return;
		}
	});

	ws.on("message", (msg) => {
		// Validate json
		try {
			msg = JSON.parse(msg);
		} catch (error) {
			console.error(error);
			ws.send(JSON.stringify({ status: "error", message: "Invalid JSON", timestamp: new Date().toISOString() }));
			return;
		}
		switch (msg.action) {
			case "close":
				ws.send(JSON.stringify({ response: "closed", timestamp: new Date().toISOString() }));
				ws.close();
				break;
			case "ping":
				ws.send(JSON.stringify({ response: "pong", timestamp: new Date().toISOString() }));
				break;
			case "getStatus":
				// Get the armState column from the account database
				db.get("SELECT armState FROM accounts WHERE id = ?", req.params.accountNumber, (err, row) => {
					if (err) {
						console.error(err);
						ws.send(JSON.stringify({ action: msg.action, status: "error", code: 500, message: "Internal Server Error", timestamp: new Date().toISOString() }));
					} else {
						ws.send(JSON.stringify({ action: msg.action, status: "success", code: 200, armState: row.armState, timestamp: new Date().toISOString() }));
					}
				});
				break;
			case "report":
				console.log(msg)
				// Check length of inputs, if any are over 500 characters, return 400
				if (msg.data.placeName.length > (process.env.MAX_LENGTH || 500) || msg.data.systemName.length > (process.env.MAX_LENGTH || 500) || msg.data.zoneName.length > (process.env.MAX_LENGTH || 500) || msg.data.event.length > (process.env.MAX_LENGTH || 500)) {
					console.log(`${colors.red("[ERROR]")} Input too long.`);
					console.log(`${colors.red("[ERROR]")} PlaceName: ${msg.data.placeName.length} SystemName: ${msg.data.systemName.length} ZoneName: ${msg.data.zoneName.length} EventName: ${msg.data.event.length}`);
					ws.send(JSON.stringify({ action: msg.action, status: "error", code: 400, message: "Input too long", timestamp: new Date().toISOString() }));
					return;
				}

				// Check cooldown
				if (new Date(userData.cooldown) > new Date()) {
					console.log("Cooldown")
					ws.send(JSON.stringify({ action: msg.action, status: "error", code: 429, message: "Cooldown", timestamp: new Date().toISOString() }));
					return;
				} else {
					console.log("Not cooldown")
					newCooldown = new Date();
					newCooldown.setMinutes(newCooldown.getMinutes() + 5);
				}

				sendAlert(req.params.accountNumber, generateTransactionNumber(), msg.data.placeName, msg.data.systemName, msg.data.zoneNumber, msg.data.zoneName, msg.data.event).then(() => {
					ws.send(JSON.stringify({ action: msg.action, status: "success", code: 200, timestamp: new Date().toISOString() }));
				}).catch((error) => {
					ws.send(JSON.stringify({ action: msg.action, status: "error", code: 500, message: error, timestamp: new Date().toISOString() }));
				});
				break;
			case "updateState":
				// Update the armState column in the account database
				db.run("UPDATE accounts SET armState = ? WHERE id = ?", msg.armState, req.params.accountNumber, (err) => {
					if (err) {
						console.error(err);
						ws.send(JSON.stringify({ action: msg.action, status: "error", code: 500, message: "Internal Server Error", timestamp: new Date().toISOString() }));
					} else {
						ws.send(JSON.stringify({ action: msg.action, status: "success", code: 200, timestamp: new Date().toISOString() }));
					}
				});
				break;

		}
	});
});


app.get('/api/healthcheck', (req, res) => {
	// Check if the bot is logged in and connected to Discord
	const botHealthy = client.isReady();

	// Respond with the health check status
	res.json({
		healthy: botHealthy,
		botStatus: botHealthy ? 'Bot is connected and healthy' : 'Bot is not connected or has failed',
		timestamp: new Date(),
	});
});

startTime = new Date();
client.login(process.env.DISCORD_TOKEN);
};