// Requires
var irc = require('irc'),
    http = require('https'),
    logger = require('./logger'),
    utils = require('./utils.js');

// read nick and channel from command line arguments if they exist
var CHANNEL = (process.argv[3]) ? process.argv[3] : '#mozwebqa',
    NICK = (process.argv[2]) ? process.argv[2] : 'mozwebqabot',
    ircServer = 'irc.mozilla.org',
    nick = NICK,
    options = {channels: [CHANNEL]},
    client = new irc.Client(ircServer, nick, options),
    help = { ":help" : "This is Help! :)",
             ":gist" : "Gives you a link to Pastebin",
             ":yt" : "Pass in your search and I will give you a youtube link",
             "Bugzilla" : "Just add bug xxxxxx to a conversation and it will show a summary of the bug",
             ":source" : "Returns the GitHub URL for me",
             ":list" : "Returns the URL to the groups mailing list",
             ":standup" : "Shows the details for the standup the team has twice a week",
             ":meeting" : "Shows details and a link to the meetings page",
             ":newissue" : "Just add :newissue project to a conversation and it will show a summary of the bug",
             ":github" : "Show a list of github projects",
             ":getInvolved" : "Provide some information on getting involved in Web QA testing"
           },
    source = 'https://github.com/bobsilverberg/mozwebqa-bot',

    github = {
      "flightdeck": "mozilla/FlightDeck-selenium",
      "affiliates": "mozilla/Affiliates-Tests",
      "moztrap": "mozilla/moztrap-tests",
      "addons": "mozilla/Addon-Tests",
      "mdn": "mozilla/mdn-tests",
      "mcom": "mozilla/mcom-tests",
      "snippets": "mozilla/snippets-tests",
      "sumo": "mozilla/sumo-tests",
      "socorro": "mozilla/Socorro-Tests",
      "marketing-template": "mozilla/marketing-project-template",
      "templates": "mozilla/mozwebqa-test-templates",
      "qmo": "mozilla/qmo-tests",
      "wiki": "mozilla/wiki-tests",
      "bouncer": "mozilla/bouncer-tests",
      "marketplace": "mozilla/marketplace-tests"
    };

client.addListener('join'+CHANNEL, function (nick) {
  if (nick === 'firebot' || nick === NICK) {
    return;
  }
  if (!utils.seen(nick)){
    client.say(CHANNEL, "Welcome to "+CHANNEL+" "+nick+"! We love visitors! Please say hi and let us know how we can help you help us. For more information, type ':getInvolved'.");
    utils.joined.push(nick);
  }
});

client.addListener('message', function (from, to, message) {
  if (from === 'firebot' || from === NICK) {
    console.log("ignoring firebot");
    return;
  }

  console.log(from + ' => ' + to + ': ' + message);
  logger.log({channel:to, from:from, message:message});
  if (message.search(nick) >= 0){
    if (message.search(/ hi[ $]?/i) >= 1){
      client.say(to, "Hi hi " + from);
    }
    if (message.search(/damn you/i) >= 0) {
      client.say(to, "I am so sorry " + from + ", can we hug?");
    }
    if (message.search(/pew pew/i) >= 0) {
      client.say(to, "Ouch! Damn you, " + from + "!");
    }
  }

  if (message.search(/:welcome/i) === 0){
    client.say(to, "Welcome to the Mozilla Web QA IRC channel. We love visitors! Please say hi and let us know how we can help you help us.");
  }

  if (message.search(/:getinvolved/i) === 0){
    client.say(to, "Hey " + from + " that's awesome that you'd like to get involved. Please tell me, are you interested in :Manual or :Automated testing.");
  }

  if (message.search(/:automated/i) === 0){
    client.say(to, "Very cool, " + from + ", I love automated testing too! You can find out more at https://quality.mozilla.org/teams/web-qa/#Automated, or just ask a question here.");
  }

  if (message.search(/:manual/i) === 0){
    client.say(to, "Very cool, " + from + ", I love manual testing too! You can find out more at https://quality.mozilla.org/teams/web-qa/#Manual, or just ask a question here.");
  }

  if (message.search(/:gist/i) === 0){
    client.say(to, "Please paste >3 lines of text to http://pastebin.mozilla.org");
  }

  if (message.search(/:help/i) === 0){
    for (var item in help){
      client.say(from, item + " : " + help[item]);
    }
  }

  if (message.search(/:yt/i) === 0){
    var options = {
        host: 'gdata.youtube.com',
        port: 443,
        path: "/feeds/api/videos?q=" + message.substring(4).replace(/ /g, '+') + "&alt=json",
        method: 'GET'
    };
    var req = http.request(options, function(res) {
      var apiResult = '';
          
      res.on('data', function(d) {
        apiResult += d;
      });
      res.on('end', function(){
        try{
          data = JSON.parse(apiResult);
          title = data["feed"]["entry"][0]["title"]["$t"]
          link = data["feed"]["entry"][0]["link"][0]["href"];
          client.say(to, title + " -- " + link);
        } catch(e) {
          console.error(e.message);
        }
      });
    });
    req.end();
  }

  if (message.search(/bug \d+/i) >= 0 || message.search(/https:\/\/bugzilla.mozilla.org\/show_bug.cgi\?id=(\d+)/i) >= 0 ){
    var bugID = "";
    if (/bug (\d+)/i.exec(message)) {
      bugID = /bug (\d+)/i.exec(message)[1]
    } else {
      bugID = /https:\/\/bugzilla.mozilla.org\/show_bug.cgi\?id=(\d+)/i.exec(message)[1];
    }

    var options = {
        host: 'api-dev.bugzilla.mozilla.org',
        port: 443,
        path: "/latest/bug?id=" + bugID,
        method: 'GET'
    };
    var apiResult = ''
    var req = http.request(options, function(res) {
      res.on('data', function(d) {
      apiResult += d; 
      });
            
      res.on('end', function(){
        var returnMessage = '';
        try{
          data = JSON.parse(apiResult);
          url = "https://bugzilla.mozilla.org/show_bug.cgi?id=" + bugID;
          if (data["bugs"].length === 0){
            returnMessage = "I can not see this bug, try clicking on " + url + " to see if it exists";
            logger.log({channel:to, from:nick, message:returnMessage}); 
            client.say(to, returnMessage);
            return;
          }
          summary = data["bugs"]["0"]["summary"];
          severity = data["bugs"]["0"]["severity"];
          status = data["bugs"]["0"]["status"];
          resolution = data["bugs"]["0"]["resolution"];
          returnMessage = "Bug " + url + " " + severity + ", " + status + " " + resolution + ", " + summary;
          logger.log({channel:to, from:nick, message:returnMessage});
          client.say(to, returnMessage); 
        }catch(e){
          console.error(e);            
        }
      });
    });

    req.on('error', function (error) {
      console.error(error);
      client.say(to, "Unfortunately there was an error trying to retrieve that bug, please try again. If this happens again please ping AutomatedTester");
    });

    req.end();
  }

  if (message.search(/:source/i) === 0){
    client.say(to, 'My details and code lives at ' + source + '. Go have a look!');
  }

  if (message.search(/:list/i) === 0){
    client.say(to, 'mozwebqa mailing list https://mail.mozilla.org/listinfo/mozwebqa');
  }

  if (message.search(/:meeting/i) === 0){
    client.say(to, "Come join us at 9AM PDT/PST on a Thursday. You can join in with Vidyo at https://v.mozilla.com/flex.html?roomdirect.html&key=ZAlDIwL9AJcf or dial in 650-903-0800 or 650-215-1282 x92 Conf #9303 (US/INTL) or 1-800-707-2533 (pin 369) Conf #9303 (US)");
  }

  if (message.search(/:newissue/i) >= 0){
    var project = /:newissue ([a-z-_]+)/.exec(message);
    if (project !== null){
      if (project[1] in github){
        client.say(to, "Please raise an issue at https://github.com/" + github[project[1]] + "/issues/new");
      } else {
        client.say(to, "I am sorry I don't know of that project. Please raise an issue at " + source + '/issues/new/ if I should know about it!');
      }
    } else {
      client.say(to, "please use the syntax :newissue project. You can get a list of projects by calling :github");
    }
  }

  if (message.search(/:issues/i) >= 0){
    var project = /:issues ([a-z-_]+)/.exec(message);
    if (project !== null){
      var key = to.substring(1).toLowerCase();
      console.log(key);
      if (github[key] && github[key][project[1]]){
        client.say(to, "Issues for " + project[1] +  " can be found at " + github[key][project[1]] + "/issues");
      } else {
        client.say(to, "I am sorry I don't know of that project. Please raise an issue on " +
            source + "/issues/new if I should know about it");
      }
    } else {
      client.say(to, "please use the syntax :issues project. You can get a list of projects by calling :github");
    }
  }

  if (message.search(/:github/i) === 0){
    for (var item in github){
      client.say(from, item + ": https://github.com/" + github[item]);
    }
  }
});

client.addListener('error', function(message){
  console.error("message");
});

//make server to keep heroku happy
http.createServer(function (req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('IRC bot at '+CHANNEL+' on irc.mozilla.org\n');
}).listen(process.env.PORT||8080);

