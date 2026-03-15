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
      const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to: to,
          type: "text",
          text: { body: text }
        })
      });
      
      const data = await response.json();
      if (response.ok) {
        console.log(`Message successfully sent to ${to}`);
      } else {
        console.error("Meta API Rejected the message. Reason:", JSON.stringify(data));
      }
    } catch (error) {
      console.error("Network Error sending message:", error);
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

          // --- Phase 1: Database Integration (SheetDB) ---
          const sheetDbUrl = 'https://sheetdb.io/api/v1/zndh0qndlbig6';

          // Helper function to find user in Google Sheet by phone number
          async function getUserData(phoneNumber) {
            try {
              // WhatsApp adds standard country codes (like '1' or '91'), we do a wildcard search just in case
              const res = await fetch(`${sheetDbUrl}/search?whatsapp=*${phoneNumber.slice(-10)}*`);
              const data = await res.json();
              return data.length > 0 ? data[data.length - 1] : null; // Get most recent sign-up
            } catch (error) {
              console.error("Error fetching from SheetDB:", error);
              return null;
            }
          }

          // Helper function to update user streak in Google Sheet
          async function updateStreak(phoneNumber, newStreak) {
            try {
              await fetch(`${sheetDbUrl}/whatsapp/*${phoneNumber.slice(-10)}*`, {
                method: 'PATCH',
                headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
                body: JSON.stringify({ data: { streak: newStreak } })
              });
            } catch (error) {
              console.error("Error updating SheetDB:", error);
            }
          }

          // Bot Routing logic here
          if (userMessage === "join") {
            const user = await getUserData(from);
            const name = user ? user.name.split(' ')[0] : 'there'; // Get first name
            
            await sendMessage(
              from,
              `Welcome to FitIn16, ${name}! 💪\n\nYour 30-day health challenge is ready.\n\nType START to begin Day 1.`
            );
          } else if (userMessage === "start") {
            const user = await getUserData(from);
            const currentStreak = user && user.streak ? parseInt(user.streak) : 0;
            
            await sendMessage(
              from,
              `Day ${currentStreak + 1} Challenge:\n\n• 20 squats\n• Walk 10 minutes\n• Drink 3L water\n\nReply DONE after completing.`
            );
          } else if (userMessage === "done") {
            const user = await getUserData(from);
            const currentStreak = user && user.streak ? parseInt(user.streak) : 0;
            const newStreak = currentStreak + 1;
            
            // Save their new score to Google Sheets!
            await updateStreak(from, newStreak);

            await sendMessage(
              from,
              `Great job! 🔥\n\nYour streak is now ${newStreak} days. I've updated your record in the database.\n\nSee you tomorrow!`
            );
          } else {
             await sendMessage(
              from,
               "I'm a simple bot right now! Send *START* to get today's challenge, or *DONE* when you finish it."
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