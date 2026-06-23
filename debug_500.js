const http = require('http');
const https = require('https');

const API = 'https://jcuescore-back.onrender.com';
const loginBody = JSON.stringify({
  email: 'garitero@jcuescore.com', // guess email
  password: 'password123' // guess
});

// Since I don't know the garitero credentials, I can't easily get a token.
