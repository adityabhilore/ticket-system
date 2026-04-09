const { google } = require('googleapis');
const readline   = require('readline');
require('dotenv').config();

const oauth2Client = new google.auth.OAuth2(
  process.env.GMAIL_CLIENT_ID,
  process.env.GMAIL_CLIENT_SECRET,
  process.env.GMAIL_REDIRECT_URI
);

// Generate auth URL
const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  scope: ['https://www.googleapis.com/auth/gmail.modify'],
});

console.log('\n=== GMAIL AUTHORIZATION ===');
console.log('1. Open this URL in your browser:');
console.log('\n' + authUrl + '\n');
console.log('2. Login with your support Gmail account');
console.log('3. Grant permission when prompted');
console.log('4. You will be redirected to a URL');
console.log('5. Copy the code parameter from that URL\n');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Paste the authorization code here: ', async (code) => {
  rl.close();
  try {
    const { tokens } = await oauth2Client.getToken(code);
    console.log('\n=== ✅ SUCCESS! COPY THIS TO YOUR .env FILE ===');
    console.log('GMAIL_REFRESH_TOKEN=' + tokens.refresh_token);
    console.log('\n📝 Add this line to your .env file in the backend folder');
    console.log('⚠️  Then you can delete this script (scripts/getGmailToken.js)\n');
  } catch(err) {
    console.error('❌ Error getting token:', err.message);
    process.exit(1);
  }
});
