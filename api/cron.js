export default async function handler(req, res) {
  console.log('--- CRON JOB STARTED: Sending Daily Reminders ---');

  const sheetDbUrl = 'https://sheetdb.io/api/v1/zndh0qndlbig6';
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.PHONE_NUMBER_ID;

  if (!token || !phoneId) {
    console.error("Missing WHATSAPP_TOKEN or PHONE_NUMBER_ID in environment variables");
    return res.status(500).send("Server configuration error.");
  }

  try {
    // 1. Fetch all users from Google Sheets
    console.log("Fetching users from database...");
    const sheetRes = await fetch(sheetDbUrl);
    const users = await sheetRes.json();

    if (!users || users.length === 0) {
      console.log("No users found in database.");
      return res.status(200).send("No users to track.");
    }

    // 2. Loop through users and send daily reminders
    for (const user of users) {
      if (!user.whatsapp) continue; // Skip if no number
      
      const currentStreak = user.streak ? parseInt(user.streak) : 0;
      
      // Stop messaging if they finished all 15 days
      if (currentStreak >= 15) {
        continue;
      }

      // Format phone number to clean WhatsApp ID
      let rawPhone = user.whatsapp.trim().replace(/[\s\-\+]/g, '');
      
      // Just for international formatting safety from form to Meta
      if (rawPhone.length <= 10) {
        // If they just put a 10 digit assumed US number, add country code (optional logic depending on region)
        // Usually, Meta requires country code. If user inputs "+1 555...", the regex above leaves "1555..."
      }

      const name = user.name ? user.name.split(' ')[0] : 'there';
      const dayToSend = currentStreak + 1;

      // Ensure we don't hit rate limits by adding a tiny delay
      await new Promise(resolve => setTimeout(resolve, 300));

      console.log(`Sending reminder to ${name} for Day ${dayToSend}...`);

      try {
        const response = await fetch(`https://graph.facebook.com/v18.0/${phoneId}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            messaging_product: "whatsapp",
            to: rawPhone,
            type: "text",
            text: { 
              body: `Good morning, ${name}! ☀️\n\nAre you ready for your Day ${dayToSend} Challenge?\n\nType *START* whenever you're ready.` 
            }
          })
        });
        
        const data = await response.json();
        if (!response.ok) {
          console.error(`Failed to message ${rawPhone}:`, JSON.stringify(data));
        }
      } catch (err) {
        console.error(`Network error sending to ${rawPhone}:`, err);
      }
    }

    console.log('--- CRON JOB FINISHED ---');
    res.status(200).send("Reminders sent successfully.");

  } catch (error) {
    console.error("Cron Error:", error);
    res.status(500).send("Failed to execute Cron Job.");
  }
}
