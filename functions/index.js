'use strict';

// Import the Dialogflow module and response creation dependencies
// from the Actions on Google client library.
const {
  dialogflow,
  SignIn,
  Suggestions,
} = require('actions-on-google');

// CImport the firebase package for deployment
var firebase = require("firebase/app");

// Import the firebase-admin package for deployment
const admin = require('firebase-admin');

// Import the firebase-functions package for deployment.
const functions = require('firebase-functions');

// Initialize app with admin credentials
admin.initializeApp(functions.config().firebase);

// Create databse instance
let db = admin.firestore();

// // Import the firebase-functions package for deployment.
// const functions = require('firebase-functions');

// Instantiate the Dialogflow client.
const app = dialogflow({
  debug: true,
  clientId: '1067335608783-j43vajnoqsrt1krms3sk48f7uos6knpl.apps.googleusercontent.com',
});

// Initialize app
firebase.initializeApp();

// Method for getting the object keys in order to find what an object contains
const getKeysOfObject = (obj) => {
  let string = '';

  try {
    const keys = Object.keys(obj);
    keys.forEach(key => { string += `${key} ,` });
  } catch (e) {
    return e;
  }

  return string;
}

const MAX_MEMORIES = 3;

// Enter sign in flow 
app.intent('Sign In', (conv) => {
  conv.followup(`startSignIn`);
});

// Intent that starts the account linking flow.
app.intent('Start Signin', (conv) => {
  conv.ask(new SignIn('Hello, because this is the first time I meet you, I am going to need some permissions from you. In order to use our modules'));
});
// Create a Dialogflow intent with the `actions_intent_SIGN_IN` event.
app.intent('Get Signin', (conv, params, signin) => {
  if (signin.status === 'OK') {
    const payload = conv.user.profile.payload;
    const { email } = conv.user;

    let docRef = db.collection('users').doc(`${payload.email}`);

    let setNewUser = docRef.set({
      firstName: payload.given_name,
      lastName: payload.family_name,
      email: payload.email,
      conversationQuestion: null,
      sandboxMessage: []
    });
    conv.ask(`I have successfully connected you to the app. What would you like to do now? You can: have a conversation, play a game or go to the message board`);
  } else {
    conv.ask(`I won't be able to save your data, but what do you want to do next?`);
  }
});

// Default welcome intent
app.intent('Default Welcome Intent', (conv) => {
  // check if the user has an existing sign in
  if (!conv.user.profile.payload) {
    conv.followup(`startSignIn`);
  } else {
    conv.ask(`Hello again! What would you like to do? You can have a conversation, play a game or go to the message board`);

    conv.ask(new Suggestions('Game'));
    conv.ask(new Suggestions('Conversation'));
    conv.ask(new Suggestions('Message Board'));
    conv.ask(new Suggestions('Help'));
  }
});

/*
  Start of section for the game functionality
  Path: Game enter > Get statements > Guess which is the false statement > Reveal if that is the correct choice > Choose whether to play another round or end
*/

// Game entry point
app.intent('Game Enter', (conv) => {

  // maybe tell them to write the ideas down so that they have them preparred for the next step
  conv.close(`Lets play two truths one lie. One of you should take a pen and paper or open a writing app on your phone and write down three statements about yourself. One of these statements should be false! 
              When you have done that just say: "Ok Google, tell ThisCloser we are ready". If you need help say: "Ok Google, ask ThisCloser to help us with the game"`);
});


// Try again round
app.intent('Game GetStatements TryAgain', (conv, params) => {

  conv.ask(`Awesome! Now you have to guess which is the false statement!`);

  conv.ask(new Suggestions('The first one'));
  conv.ask(new Suggestions('The second one'));
  conv.ask(new Suggestions('The third one'));
});

// What is the right answer entry point
app.intent('Game TheAnswerIs', (conv) => {
  conv.followup(`what-do-you-think`);
});

// Verify if the guess is right
app.intent('Game IsThatTheAnswer', (conv) => {
  conv.ask('Was that the correct guess?');

  conv.ask(new Suggestions('Yes, that is correct!'));
  conv.ask(new Suggestions('No, that is wrong!'));
});

// Intent for the correct guess
app.intent('Correct', (conv) => {
  const audioSound = 'https://actions.google.com/sounds/v1/cartoon/cartoon_cowbell.ogg';

  conv.ask(`<speak><audio src="${audioSound}"></audio> That was correct! Do you want to try again? </speak>`);

  conv.ask(new Suggestions('Yes'));
  conv.ask(new Suggestions('No'));
});

// Intent for the incorrect guess
app.intent('Incorrect', (conv) => {
  const audioSound = 'https://actions.google.com/sounds/v1/cartoon/cartoon_boing.ogg';

  conv.ask(`<speak><audio src="${audioSound}"></audio> Oh no! That was not it! Do you want to play another round? </speak>`);

  conv.ask(new Suggestions('Yes'));
  conv.ask(new Suggestions('No'));
});

// Try again funnel from the correct guess
app.intent('Correct try again', (conv) => {
  conv.followup(`get-statements`);
});

// End of game after correct guess
app.intent('Correct end game', (conv) => {
  conv.ask('Ok, no problem! Let me know if you want to try the other modes by saying: conversation or message board. If you want to quit just say quit.');


  conv.ask(new Suggestions('Conversation'));
  conv.ask(new Suggestions('Message Board'));
  conv.ask(new Suggestions('Quit'));
});

// Try again second funnel
app.intent('Game TryAgainScope', (conv) => {
  conv.close(`Ok, that's awesome. You will have you some time to think of the three statements. When you are done just say: Ok Google, tell ThisCloser we are done!`);
});

// Try again funnel from the incorrect guess
app.intent('Incorrect try again', (conv) => {
  conv.followup(`get-statements`);
});

// End of game after incorrect guess
app.intent('Incorrect end game', (conv) => {
  conv.ask('Ok, no problem! Let me know if you want to try the conversation mode by saying: conversation, or if you want to quit.');

  conv.ask(new Suggestions('Conversation'));
  conv.ask(new Suggestions('Message Board'));
  conv.ask(new Suggestions('Quit'));
});

// Deep link connection for the game statements
app.intent('Game DeepLinkStatements', (conv) => {
  conv.followup(`deepLinkFunnel`);
});

/*
  End of section for the game functionality
*/


/*
  Start of section for the conversation functionality 
  Path: Conversation > Get question > Next question/ Repeat question > End Conversation
*/

// The conversation module takes conversation as invocation and returns a response asking the users to say a phase to begin
// The phase is "Give us a question".
app.intent('Conversation Welcome', (conv) => {
  conv.ask(`Welcome to self-disclosure conversation! Say: "Give us a question" to start. When you are done talking about the matter, just wake me up by saying: "Ok google, ask ThisCloser for the next question". If you want the question repeated say: "Ok google, ask ThisCloser to repeat".`);
});

// The give us a question module is in the context of the Conversation module and it should give the users a 
// random low or high intimacy question and then standby for the "Next question" or "end" invocation.
app.intent('Conversation GetQuestion', async (conv) => {
  const email = conv.user.profile.payload.email;

  // The output command getting a question and asking the users
  // Missing: Wait for the invocation needed to continue. Right now it asked what the users are saying which it should not.
  var returnedQuestion = question.getQuestion();
  question.updateQuestionPool();

  try {
    const userRef = db.collection('users').doc(email);

    userRef.update({ conversationQuestion: returnedQuestion });
  } catch (e) {
    conv.close(`${e}`);
  }

  conv.close(`${returnedQuestion}`);
});

// The next question Intent takes the user from the GetQuestion Intent through the next question scope and to the next question
// where a new queastion is asked.
app.intent('Conversation DeepLinkNextQuestion', (conv) => {

  conv.followup(`getNextQuestion`);
});

// A method for ending the conversation and return to app welcome intent
app.intent('Conversation Cancel', (conv) => {

  conv.ask("Ending conversation! Would you like to try another module or would you like to quit?");

});

// A method for getting the question repeated using deeplinking
app.intent('Conversation DeepLinkRepeatQuestion', (conv) => {

  conv.followup(`get-question-repeat`);

});

// A method for repeating the last question given
app.intent('Conversation RepeatQuestion', async (conv) => {
  // get the user's email
  const email = conv.user.profile.payload.email;

  try {
    // match the current email with a doc from the db
    const usersCollection = db.collection('users');
    const snapshot = await usersCollection.where('email', '==', email).get();

    // return the last question 
    conv.close(`${snapshot.docs[0].data().conversationQuestion}`);
  } catch (e) {
    conv.close(`${e}`);
  }
});

// The question object contains arrays of high and low intimacy questions. It stores them in a question pool.
// It includes the function getQuestion that returns a random question from the pool.
// Afterwards it updates the question pool so it does not ask the same question twice.
var question = {

  // An array containing the pool of high intimacy questions
  highIntimacyQuestions: [
    "What is something your partner did today that made you happy?",
    "What was something that your partner did, that made you thankful this week?",
    "Would any of you do something differently today to make the day more enjoyable?",
    "If you could level up any aspect of yourself (i.e., strength, intelligence, charisma, etc.) but you had to decrease another aspect of yourself by the same amount, what aspects would you increase, and which would you decrease?",
    "Which of your partner's personality traits you do wish you also had to the same degree?",
    "When was the last time that you really felt like doing a difference for your local community or for the environment?",
    "What are the personal aspects that you would most like to improve, or that you are struggling to do something about at present, e.g. appearance, lack of knowledge, loneliness, temper etc?",
    "What kind of future are you aiming towards, working for, planning for - both personally, educationally and professionally?",
    "What are your thoughts about your health, including any problems, worries, or concerns that you might have at present?",
    "For what in your life do you feel most grateful?",
    "If you could change anything about the way you were raised, what would it be?",
    "Take four minutes and tell your partner your life story in as much detail as possible.",
    "Take four minutes and tell your partner a good memory of yours", // new
    "Take four minutes and tell your partner a story from your life", // new
    "If you could wake up tomorrow having gained any one quality or ability, what would it be?",
    "Is there something that you’ve dreamed of doing for a long time? Why haven’t you done it yet?", // updated
    "What is the greatest accomplishment of your life?",
    "What do you value most in a friendship?",
    "What is your most treasured memory?",
    "If you knew that in one year you would die suddenly, would you change anything about the way you are now living? Why?",
    "What does friendship mean to you?",
    "What is the most embarrasing thing you have ever done? Describe it in detail", // new
    "What roles do love and affection play in your life?",
    "How close and warm is your family? Do you feel your childhood was happier than most other people’s?",
    "What, if anything, is too serious to be joked about?",
    "Your house, containing everything you own, catches fire. After saving your loved ones and pets, you have time to safely make a final dash to save any one item. What would it be? Why?",
    "Share a personal challenge and ask your partner’s advice on how he or she might handle it. Also, ask your partner to reflect back to you how you seem to be feeling about the challenge you have chosen." // update
  ],

  // An array containing the pool of low intimacy questions
  lowIntimacyQuestions: [
    "How do you find our current political situation?",
    "What would you guys change about this week?",
    "What do you guys like to do in your spare time at home at the present moment?",
    "What is your favorite song as for now and why?", // updated
    "If you had absolutely free choice and no limitations, what is then the sport that you see yourself participating in?", // updated
    "What was something that happened this week, that made you stop and ponder on it, or fascinated you?",
    "Debate time! What is worse: Laundry or Dishes?",
    "Which places would you like to travel to the most and why?", // new
    "What did you do the last week?",
    "Debate time!What is more intriguing: Science or art?",
    "Are there any skills that you wish you mastered?", // new
    "What kind of pet is your favorite? Why?", // new
    "Debate time! What is best: Money or Free Time?",
    "What are your favorite foods right now? Is there a cuisine you like the best?", // updated
    "Story time! Tell a story about a place you have travelled to that made an unforgettable impression on you.",
    "Debate time! What is more enjoyable: Big Party or Small Gathering?",
    "What do you guys think about the news this past week?",
    "Story time! Tell a story about a proud moment you have had in your educational life or your work life.", // updated
    "Would you like to be famous? In what way?",
    "Before making a telephone call, do you ever rehearse what you are going to say? Why?",
    "What would constitute a “perfect” day for you?",
    "When did you last sing to yourself? Or to someone else?",
    "Name five! Name five things you and your partner appear to have in common.",
    "Name five! Name five things you consider positive characteristics of your partner.",
    "Name five! Name five things that you like to do.", // new
    "Name five! Name five series or movies that you want to rewatch the most.",
    "Name five! Name five things you are grateful for in your life.",
    "Name five! Name five positive experiences you have had today." // new
  ],

  // A merged array containing all the questions for the conversation module
  getQuestionPool: function () {

    return question.highIntimacyQuestions.concat(question.lowIntimacyQuestions)
  },

  // A function that returns a random question from the merged array called questionPool
  getQuestion: function () {

    return question.getQuestionPool()[Math.round(Math.random() * question.getQuestionPool().length)];

  },

  // Updating the question pool to exclude the questions already asked
  updateQuestionPool: function () {

    question.getQuestionPool().splice(question.getQuestion());

  },

  // lastQuestion: this.getQuestion()

};

/*
  End of section for the conversation functionality
*/

/*
  Start of section for sandbox message module
*/

// Action for entering the message sandbox
app.intent('Sandbox MessageWelcome', (conv) => {
  conv.ask(`Welcome to the message board. Here, you can leave memories or messages and later hear them again!`);
  conv.ask(`For leaving a message say: enter message, and for getting a message say: get message`);

  conv.ask(new Suggestions('Enter message'));
  conv.ask(new Suggestions('Get message'));
});

// Action for getting and storing a new memory
app.intent('Sandbox WriteMessage', async (conv) => {
  try {
    // take the current user's email
    const email = conv.user.profile.payload.email;

    // Store the message from the conversation
    var memory = [conv.parameters.message];

    // get the doc from the db based on the request profile
    const usersCollection = db.collection('users');
    const snapshot = await usersCollection.where('email', '==', email).get();

    // take the sandboxMessage object from the found doc
    let memories = snapshot.docs[0].data().sandboxMessage;

    // delete the first array if the lenght > 3
    if (memories.length >= MAX_MEMORIES) {

      memories.splice(0, 1);
    }
    // create a new array with the newest memory
    memories = memories.concat(memory);

    // update db with the new memory
    const userRef = db.collection('users').doc(email);
    userRef.update({ sandboxMessage: memories });
  } catch (e) {
    conv.close(`${e}`);
  }

  conv.ask(`Your message is: "${memory}". Is this what you meant?`);

  // response
  // conv.ask(`Your memory is: "${memory}". If you want to hear one of your memories again at some point in the future just say: "relieve memory". What would you like to do now? You can play a game, get a topic for conversation o quit`);
});


app.intent('Sandbox WriteMessage Correct', (conv) => {
  conv.ask(`Awesome! I have registered your message. What would you like to do now? You can go back to the message board, play a game, get a topic for conversation or quit`);
});

app.intent('Sandbox WriteMessage Incorrect', async (conv) => {
  try {
    // take the current user's email
    const email = conv.user.profile.payload.email;

    // Store the message from the conversation
    var memory = [conv.parameters.message];

    // get the doc from the db based on the request profile
    const usersCollection = db.collection('users');
    const snapshot = await usersCollection.where('email', '==', email).get();

    // take the sandboxMessage object from the found doc
    let memories = snapshot.docs[0].data().sandboxMessage;

    // delete the wrong memory
    memories.splice(2, 1);
    // create a new array with the newest memory
    memories = memories.concat(memory);

    // update db with the new memory
    const userRef = db.collection('users').doc(email);
    userRef.update({ sandboxMessage: memories });
  } catch (e) {
    conv.close(`${e}`);
  }
  conv.ask(`Awesome! I have registered your message. What would you like to do now? You can go back to the message board, play a game, get a topic for conversation or quit`);
});

app.intent('Sandbox WriteMessage Incorrect Yes', (conv) => {
  conv.ask(`Awesome! I have registered your message. What would you like to do now? You can go back to the message board, play a game, get a topic for conversation or quit`);
});


// Action for getting the last memory stored
app.intent('Sandbox Relieve memory', async (conv) => {
  // get the user's email
  const email = conv.user.profile.payload.email;

  try {
    // get the doc from the db based on the request profile
    const usersCollection = db.collection('users');
    const snapshot = await usersCollection.where('email', '==', email).get();

    // get the sandboxMessage field from the retrieved doc
    let memoryList = snapshot.docs[0].data().sandboxMessage;

    // pick a random element from the sandboxMessage array
    let randomMemory = memoryList[Math.floor(Math.random() * memoryList.length)];
    // let string = getKeysOfObject(snapshot.docs[0].data());

    // response
    conv.ask(`Your message is: ${randomMemory}. What would you like to do now? You can have a conversation, play a game or quit.`);
  } catch (e) {
    conv.close(`${e}`);
  }
});

/*
  End of section for sandbox message module
*/


/*
  Start section for the commands help actions
*/
app.intent('Help General Help', (conv) => {
  conv.ask(`<speak> <s> The available commands are: "play a game" to access the game module, <break strength="medium"/> 
          "conversation" to access the conversation module, <break strength="medium"/>
          "message board" to access the message board <break strength="medium"/>.
          Some other commands you can use are:
          "Ok Google, tell ThisCloser we are ready" to start the game, <break strength="medium"/>
          "Ok Google, repeat the question" to get the topic for conversation repeated, <break strength="medium"/>
          And "Ok Google, next question" to get a new topic. </s> </speak>`);
  conv.ask(`For detailed commands available in each module just say: "Ok Google, ask ThisCloser for help with" followed by the name of the module `);
});

app.intent('Help Game Help', (conv) => {
  conv.ask(`<speak> <s> The available commands for the game are: "play a game" to access the module, <break strength="medium"/>. 
  Here, one of you should think of three statements, then say them out loud when I prompt you. The other then has to guess which one is the false statement out of the three.
  When you are done say: "Ok Google, tell ThisCloser we are ready" for proceeding with the game <break strength="medium"/>. 
   </s> </speak>`);
});

app.intent('Help Conversation Help', (conv) => {
  conv.ask(`<speak> <s> The available commands for the conversation are: "conversation" to access the module, <break strength="medium"/>,
  "Give us a question" to get a topic for conversation <break strength="medium"/>,
  "Ok google, ask ThisCloser to repeat" to have the question repeated <break strength="medium"/>,
  "Ok google, ask ThisCloser for the next question" to get the another topic for conversation <break strength="medium"/> </s> </speak>`);
});

app.intent('Help Message Help', (conv) => {
  conv.ask(`<speak> <s> The available commands for the message board are: "message board" to access the module, <break strength="medium"/>,
  "Enter message" to leave a message <break strength="medium"/> and
  "Get message" to retrieve a previous message <break strength="medium"/> </s> </speak>`);
});

/*
  End section for the commands help actions
*/


// Set the DialogflowApp object to handle the HTTPS POST request.
exports.dialogflowFirebaseFulfillment = functions.https.onRequest(app)