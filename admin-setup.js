// Download service account JSON and run: node admin-setup.js
const admin = require('firebase-admin');
const serviceAccount = require('./qroster-4a631-firebase-adminsdk-xxx.json');

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Set YOUR email as admin
admin.auth().setCustomUserClaims('YOUR_USER_UID_HERE', { role: 'admin' })
    .then(() => console.log('✅ Admin role set! Refresh your app.'))
    .catch(console.error);