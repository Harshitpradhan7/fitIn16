export default function handler(req, res) {
  console.log('--- Incoming Request ---');
  console.log('Method:', req.method);
  console.log('Query:', req.query);
  console.log('Body:', req.body);
  console.log('------------------------');

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
    res.status(200).send('EVENT_RECEIVED');
  } else {
    res.setHeader('Allow', ['GET', 'POST']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}