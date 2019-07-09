/**
 * A Bot for Slack!
 */

const request = require("request");

/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({user: installer}, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN)?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
    console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    process.exit(1);
}


/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});


/**
 * Core bot logic goes here!
 */
// BEGIN EDITING HERE!

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "I'm here!")
});

controller.hears(['hello', 'hi', 'greetings'], 'direct_message', function (bot, message) {
    bot.reply(message, 'Hullo! :wave: \n How may I help you today?');
});

controller.hears(['daily digest - dba'], 'direct_message', function (bot, message) {
    bot.reply(message, 'Here\'s your digest from the last 24 hours :point_right:');
    bot.reply(message, 'Your DBs - ');
});

controller.hears(['daily digest - dev'], 'direct_message', function (bot, message) {
    bot.reply(message, 'Here\'s your digest from the last 24 hours :point_right:');
    bot.reply(message, 'Commits Made = 5\nQueries Made = 27\nSuccess Rate = 94%\nIssues = 5 above average time\nRequests pending = 2/3');
});

/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
controller.on('direct_message,mention,direct_mention', function (bot, message) {
   bot.api.reactions.add({
       timestamp: message.ts,
       channel: message.channel,
       name: 'robot_face',
   }, function (err) {
       if (err) {
           console.log(err)
       }
       console.log(message)

       if(message.text.includes('joke') || message.text.includes('fun')){
            var rand = Math.random();
            if(rand>0.6)
                bot.reply(message, 'Sure!\n3 Database admins walk into a NoSQL bar.\n They soon walk out because they couldn\'t find a table.');
            else if(rand >0.3)
                bot.reply(message, 'Sure!\nI\'m planning to make a film series on databases.\nI\'ve got the first part ready, but I can\'t think of a SQL.');
            else
                bot.reply(message, 'Sure!\nJesus and Satan were arguing about who was better with computers, when they decided to see for sure by having a contest. Whoever could demonstrate greater skill, as judged by God, would be deemed the winner. So the two sat down at their computers and began typing, furiously creating spreadsheets, databases, and dank memes. All of a sudden, there was a blackout, and as God\'s cloud service was not available, Satan was furious because all his work was lost. Once power was restored, however, Satan saw Jesus quietly posting and printing his work. When asked how he did it, God simply said: "Jesus saves."');
       }else{    
            bot.reply(message, message.text + ' - Working on it boss!');

            var data = {form:{
                    username: message.user,
                    query: message.text
                }};
            
                console.log(data)
                request.post('http://34.93.146.204:8005/', data, function (error, response, body) {
                        console.log(JSON.parse(response.body).topScoringIntent)
                        bot.reply(message, JSON.parse(response.body).result);
                    });
        }
   });
});
