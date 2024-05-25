const functions = require('firebase-functions');
const cors = require('cors')({ origin: true });
const admin = require('firebase-admin');
const serviceAccount = require('./service-account.json');

// Initialize Firebase Admin with credentials and database URL
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://banking-oiqn-default-rtdb.asia-southeast1.firebasedatabase.app/"
});

const { SessionsClient } = require('dialogflow');

// Function to handle dialogflow gateway
exports.dialogflowGateway = functions.https.onRequest((request, response) => {
    cors(request, response, async () => {
        const { queryInput, sessionId } = request.body;

        const sessionClient = new SessionsClient({ credentials: serviceAccount });
        const sessionPath = sessionClient.sessionPath('banking-oiqn', sessionId);

        try {
            const responses = await sessionClient.detectIntent({ session: sessionPath, queryInput });
            const result = responses[0].queryResult;
            response.send(result);
        } catch (error) {
            console.error("Dialogflow API error:", error);
            response.status(500).send("Error processing the Dialogflow request");
        }
    });
});

const { WebhookClient } = require('dialogflow-fulfillment');

// Function to handle webhook for dialogflow
exports.dialogflowWebhook = functions.https.onRequest((request, response) => {
    const agent = new WebhookClient({ request, response });

    console.log(JSON.stringify(request.body));

    function welcome(agent) {
        agent.add(`Welcome to my agent!`);
    }

    function fallback(agent) {
        agent.add(`Sorry, can you try again?`);
    }

    async function userOnboardingHandler(agent) {
        const db = admin.firestore();
        const profile = db.collection('users').doc('jeffd23');

        const { name, color } = agent.parameters;

        try {
            await profile.set({ name, color });
            agent.add(`Welcome aboard my friend!`);
        } catch (error) {
            console.error('Error writing to Firestore:', error);
            agent.add(`Failed to write onboarding data.`);
        }
    }

    let intentMap = new Map();
    intentMap.set('Default Welcome Intent', welcome);
    intentMap.set('Default Fallback Intent', fallback);
    intentMap.set('UserOnboarding', userOnboardingHandler);

    agent.handleRequest(intentMap);
});
