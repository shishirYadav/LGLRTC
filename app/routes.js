var request = require('request');
var userId= '';
module.exports = function (app, streams) {
  // GET home 
  var index = function (req, res) {
    console.log(req.query.userId);
    userId = req.query.userId;

    res.render('index', {
      title: 'Project RTC',
      header: 'WebRTC live streaming',
      username: 'Username',
      share: 'Share this link',
      footer: 'Shishir569@gmail.com',
      id: req.params.id
    });
  };

  var index1 = function (req, res) {
    res.render('index1', {
      title: 'Project RTC',
      header: 'WebRTC live streaming',
      username: 'Username',
      share: 'Share this link',
      footer: 'Shishir569@gmail.com',
      id: req.params.id
    });
  };

  // GET streams as JSON
  var displayStreams = function (req, res) {
    var streamList = streams.getStreams();
    // JSON exploit to clone streamList.public
    var data = (JSON.parse(JSON.stringify(streamList)));

    res.status(200).json(data);
  };

  app.get('/streams.json', displayStreams);
  app.get('/', index);
  app.get('/:id', index1);
  app.post('/getChannel', function (req, res) {
    var channel = req.body.link.split('/')[1];
    var options = {
      method: 'POST',
      url: 'http://23.101.141.185:3000/letsgolive/api/v1/liveChanel.php',
      body: '{"user_id":'+userId+',"chanel":"'+channel+'"}'
    };

    request(options, function (error, response, body) {
      if (error) throw new Error(error);

      console.log(body);
    });
    console.log("==============" + channel);
  });
}
