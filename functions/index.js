/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 * ...
 */

// Import the Firebase SDK for Google Cloud Functions.
const functions = require('firebase-functions');
// Import and initialize the Firebase Admin SDK.
const admin = require('firebase-admin');
admin.initializeApp(functions.config().firebase);

// TODO(DEVELOPER): Write the addWelcomeMessage Function here.
// Adds a message that welcomes new users into the chat.
exports.addWelcomeMessages = functions.auth.user().onCreate(event => {
  const user = event.data;
  console.log('A new user signed in for the first time.');
  const fullName = user.displayName || 'Anonymous';
  admin.database().ref('users').push({ 
    name: fullName, 
    photoUrl: user.photoURL || '/images/profile_placeholder.png', 
    email: user.email,
    timestamp:Date.now()
  });
  // Saves the new welcome message into the database
  // which then displays it in the FriendlyChat clients.
  return admin.database().ref('messages').push({
    name: 'MJ Chat',
    to: 'mojaavemj@gmail.com',
    from: user.email,
    photoUrl: user.photoURL || '/images/profile_placeholder.png',
    text: `Welcome! ${fullName}`,
    timestamp:Date.now()
  });
});
// TODO(DEVELOPER): Write the blurImages Function here.

// TODO(DEVELOPER): Write the sendNotification Function here.
// Sends a notifications to all users when a new message is posted.
exports.sendNotifications = functions.database.ref('/messages/{messageId}').onWrite(event => {
  const snapshot = event.data;
  // Only send a notification when a new message has been created.
  if (snapshot.previous.val()) {
    return;
  }

  // Notification details.
  const text = snapshot.val().text;
  const payload = {
    notification: {
      title: `${snapshot.val().name} posted ${text ? 'a message' : 'an image'}`,
      body: text ? (text.length <= 100 ? text : text.substring(0, 97) + '...') : '',
      icon: snapshot.val().photoUrl || '/images/profile_placeholder.png',
      click_action: `https://mojaave.com/chat`
    }
  };

  // Get the list of device tokens.
  return admin.database().ref('fcmTokens').once('value').then(allTokens => {
    if (allTokens.val()) {
      // Listing all tokens.
      const tokensObj = allTokens.val();
      const tokens = Object.keys(tokensObj);
      var toEmail = snapshot.val().to;
      const newTokens = [];
      tokens.forEach(function(token,index){
        if(tokensObj[token] === toEmail){
          newTokens.push(token);
        }
      });
      if(newTokens.length > 0) {
          // Send notifications to all tokens.
        return admin.messaging().sendToDevice(newTokens, payload).then(response => {
          // For each message check if there was an error.
          const tokensToRemove = [];
          response.results.forEach((result, index) => {
            const error = result.error;
            if (error) {
              console.error('Failure sending notification to', newTokens[index], error);
              // Cleanup the tokens who are not registered anymore.
              if (error.code === 'messaging/invalid-registration-token' ||
                  error.code === 'messaging/registration-token-not-registered') {
                tokensToRemove.push(allTokens.ref.child(newTokens[index]).remove());
              }
            }
          });
          return Promise.all(tokensToRemove);
        });
      }
    }
  });
});
