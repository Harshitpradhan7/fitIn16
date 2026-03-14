export default async function handler(req, res) {
  console.log('--- Incoming Request ---');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  console.log('------------------------');

  // Helper function to send WhatsApp messages back
  async function sendMessage(to, text) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      console.error("Missing WHATSAPP_TOKEN or PHONE_NUMBER_ID in environment variables");
      return;
    }

    try {
      await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to,
          text: { body: text }
        })
      });
      console.log(`Message successfully sent to ${to}`);
    } catch (error) {
      console.error("Error sending message:", error);
    }
  }

  // Check the HTTP Method
  if (req.method === 'GET') {
    // Your verify token
    const VERIFY_TOKEN = 'fitin16_verify';

    // Parse params from the webhook verification request
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    // Check if a token and mode were sent
    if (mode && token) {
      // Check the mode and token sent are correct
      if (mode === 'subscribe' && token === VERIFY_TOKEN) {
        // Respond with 200 OK and challenge token from the request
        console.log('WEBHOOK_VERIFIED');
        res.status(200).send(challenge);
      } else {
        // Responds with '403 Forbidden' if verify tokens do not match
        res.status(403).send('Forbidden');
      }
    } else {
      res.status(400).send('Bad Request');
    }
    
  } else if (req.method === 'POST') {
    // Handle incoming webhook events here
    console.log('--- LIVE WHATSAPP MESSAGE RECEIVED ---');
    console.log(JSON.stringify(req.body, null, 2));
    console.log('--------------------------------------');

    // Parse the message from Meta's payload structure
    const body = req.body;
    
    if (body.object) {
      if (
        body.entry &&
        body.entry[0].changes &&
        body.entry[0].changes[0] &&
        body.entry[0].changes[0].value.messages &&
        body.entry[0].changes[0].value.messages[0]
      ) {
        // Extract the actual message
        const message = body.entry[0].changes[0].value.messages[0];

        // Ensure it's a text message (user didn't send an image or button click)
        if (message.type === 'text') {
          const userMessage = message.text.body.toLowerCase().trim();
          const from = message.from; // Phone number of the sender

          console.log(`Received message: "${userMessage}" from: ${from}`);

          // Bot Routing logic here
          if (userMessage === "join") {
            await sendMessage(
              from,
              "Welcome to FitIn15 💪\n\nYour 30 day health challenge starts tomorrow.\n\nType START to begin."
            );
          } else if (userMessage === "start") {
            await sendMessage(
              from,
              "Day 1 Challenge:\n\n• 20 squats\n• walk 10 minutes\n• drink 3L water\n\nReply DONE after completing."
            );
          } else if (userMessage === "done") {
            await sendMessage(
              from,
              "Great job! 🔥\n\nYour streak is now 1 day."
            );
          }
        }
      }
      res.status(200).send('EVENT_RECEIVED');
    } else {
      // Return a '404 Not Found' if event is not from a WhatsApp API
      res.status(404).send('Not Found');
    }
    
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}