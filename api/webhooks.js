export default async function handler(req, res) {
  console.log('--- Incoming Request ---');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  console.log('------------------------');

  // Helper function to send WhatsApp messages back
  async function sendMessage(to, text, mediaUrls = null) {
    const token = process.env.WHATSAPP_TOKEN;
    const phoneId = process.env.PHONE_NUMBER_ID;

    if (!token || !phoneId) {
      console.error("Missing WHATSAPP_TOKEN or PHONE_NUMBER_ID in environment variables");
      return;
    }

    // Helper to fire a single Meta API request
    const sendToMeta = async (payload) => {
      try {
        const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload)
        });
        const data = await response.json();
        if (response.ok) {
          console.log(`Successfully sent message part to ${to}`);
        } else {
          console.error("Meta API Rejected the message:", JSON.stringify(data));
        }
      } catch (error) {
        console.error("Network Error sending message:", error);
      }
    };

    // 1. ALWAYS send the text message first!
    await sendToMeta({
      messaging_product: "whatsapp",
      to: to,
      type: "text",
      text: { body: text }
    });

    // 2. If there are videos, send them after the text
    if (mediaUrls) {
      const urls = Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls];
      
      // Loop through all videos and send them one by one
      for (let i = 0; i < urls.length; i++) {
        // Add a safety delay between large media files so Meta doesn't drop the second video
        await new Promise(resolve => setTimeout(resolve, 1000));

        let payload = {
          messaging_product: "whatsapp",
          to: to,
          type: "video",
          video: { link: urls[i] }
        };
        
        await sendToMeta(payload);
      }
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

          // --- Phase 2: Dynamic Challenge Dictionary ---
          const CHALLENGES = [
            "• 10 Chin Tucks\n• 15 Bodyweight Squats\n• Walk 10 minutes", // Day 1

            "• 10 Wall Angels\n• 20 Bodyweight Squats\n• Walk 10 minutes", // Day 2

            "• 12 Chin Tucks\n• 20 Squats\n• 30s Plank", // Day 3

            "• 10 Pushups (or knee pushups)\n• 10 Cat-Cow Stretch\n• Walk 12 minutes", // Day 4

            "• 12 Wall Angels\n• 25 Squats\n• 30s Plank", // Day 5

            "• 15 Glute Bridges\n• 30 Squats\n• Walk 15 minutes", // Day 6

            "• Recovery Day 🧘\n• 15-minute Stretching\n• Walk 10 minutes", // Day 7

            "• 15 Chin Tucks\n• 30 Squats\n• Walk 15 minutes", // Day 8

            "• 12 Pushups\n• 45s Plank\n• Walk 15 minutes", // Day 9

            "• 35 Squats\n• Hip Flexor Stretch (1 min each side)\n• Walk 20 minutes", // Day 10

            "• 15 Glute Bridges\n• 1-minute Plank\n• 15-minute Stretching", // Day 11

            "• 15 Pushups\n• 40 Squats\n• Walk 20 minutes", // Day 12

            "• 45 Squats\n• Hip Flexor Stretch (1 min each side)\n• Walk 20 minutes", // Day 13

            "• Active Recovery 🧘\n• 20-minute Stretching\n• Light Walk 10 minutes", // Day 14

            "• 50 Squats\n• 1-minute Plank\n• Walk 25 minutes 🎉", // Day 15
          ];

          const ACHIEVEMENTS = [
            "🔥 Great start!\nToday you activated your leg muscles and improved blood circulation. Small movement breaks help reverse the damage caused by long sitting.",
            "👏 Well done!\nToday's session helped open your shoulders and improve posture — something most desk workers struggle with.",
            "💪 Nice work!\nYou strengthened your core today. A stronger core supports your spine and reduces back pain.",
            "🔥 Excellent effort!\nPushups and mobility work helped activate your upper body and improve shoulder stability.",
            "👏 Strong session!\nYour squats and plank improved lower body strength and core stability.",
            "💪 Great job!\nToday's movement activated your glutes — an important muscle group that becomes weak from long sitting.",
            "🧘 Recovery day complete!\nStretching improved flexibility and reduced muscle stiffness from desk work.",
            "🔥 Back at it!\nToday's routine helped improve neck posture and activate your leg muscles.",
            "👏 Well done!\nPushups and plank strengthened your chest, shoulders, and core.",
            "💪 Solid work!\nSquats and mobility improved hip flexibility and boosted circulation.",
            "🔥 Great consistency!\nYour plank and glute bridges strengthened your core and supported your lower back.",
            "👏 Nice effort!\nPushups and squats helped activate major muscle groups and improve daily energy.",
            "💪 Strong session!\nHip mobility work helps reverse tightness caused by long hours of sitting.",
            "🧘 Active recovery complete!\nStretching improves mobility and reduces injury risk.",
            "🎉 Final challenge done!\nYou improved strength, posture, and endurance over the past 15 days. Your body is already stronger!"
          ];

          // Bot Routing logic here
          if (userMessage === "join") {
            const user = await getUserData(from);
            const name = user ? user.name.split(' ')[0] : 'there'; // Get first name

            await sendMessage(
              from,
              `Welcome to FitIn16, ${name}! 💪\n\nYour 30-day health challenge is ready.\n\nType START to begin.`
            );
          } else if (userMessage === "start") {
            const user = await getUserData(from);
            const currentStreak = user && user.streak ? parseInt(user.streak) : 0;

            if (currentStreak >= CHALLENGES.length) {
              await sendMessage(
                from,
                `Wow! You have officially completed the FitIn16 Challenge! 🎉\n\nYou're a legend. Take a break, and text me anytime if you want to restart.`
              );
            } else {
              const todaysWorkout = CHALLENGES[currentStreak];
              
              // An array representing each of the 15 days of videos. 
              // If a day has multiple videos, just put them in a mini-array like Day 1 below!
              const VIDEOS = [
                // Day 1: Multiple real GitHub videos sent one after another!
                [
                  "https://github.com/user-attachments/assets/e71c289b-0892-4e2b-90da-63f161cb088b", 
                  "https://github.com/user-attachments/assets/f6b5737d-77ed-43ca-abcb-54b924c706a0"
                ],
                // Day 2 (Placeholder single video)
                ["https://www.w3schools.com/html/mov_bbb.mp4"],
                // Future days ...
                ["https://www.w3schools.com/html/mov_bbb.mp4"], // Day 3
                ["https://www.w3schools.com/html/mov_bbb.mp4"], // Day 4
                ["https://www.w3schools.com/html/mov_bbb.mp4"], // Day 5
                ["https://www.w3schools.com/html/mov_bbb.mp4"], // Day 6
                ["https://www.w3schools.com/html/mov_bbb.mp4"], // Day 7
                ["https://www.w3schools.com/html/mov_bbb.mp4"], // Day 8
                ["https://www.w3schools.com/html/mov_bbb.mp4"], // Day 9
                ["https://www.w3schools.com/html/mov_bbb.mp4"], // Day 10
                ["https://www.w3schools.com/html/mov_bbb.mp4"], // Day 11
                ["https://www.w3schools.com/html/mov_bbb.mp4"], // Day 12
                ["https://www.w3schools.com/html/mov_bbb.mp4"], // Day 13
                ["https://www.w3schools.com/html/mov_bbb.mp4"], // Day 14
                ["https://www.w3schools.com/html/mov_bbb.mp4"]  // Day 15
              ];

              await sendMessage(
                from,
                `Day ${currentStreak + 1} Challenge:\n\n${todaysWorkout}\n\nReply DONE after completing.`,
                VIDEOS[currentStreak]
              );
            }
          } else if (userMessage === "done") {
            const user = await getUserData(from);
            const currentStreak = user && user.streak ? parseInt(user.streak) : 0;

            if (currentStreak >= ACHIEVEMENTS.length) {
               await sendMessage(
                 from,
                 `You've already completed the entire 15 days! No more days to mark as done.`
               );
            } else {
              const newStreak = currentStreak + 1;

              // Save their new score to Google Sheets!
              await updateStreak(from, newStreak);

              const achievementMsg = ACHIEVEMENTS[currentStreak];

              if (newStreak === ACHIEVEMENTS.length) {
                // Final day completed
                 await sendMessage(
                  from,
                  `${achievementMsg}\n\nYour final streak: ${newStreak} days 🔥\n\nYou are a true champion!`
                );
              } else {
                // Normal day completed
                await sendMessage(
                  from,
                  `${achievementMsg}\n\nYour streak: ${newStreak} days 🔥\n\nSee you tomorrow for Day ${newStreak + 1} of FitIn16.`
                );
              }
            }
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