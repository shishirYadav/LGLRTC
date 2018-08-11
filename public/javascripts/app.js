(function () {
	var app = angular.module('projectRtc', [],
		function ($locationProvider) { $locationProvider.html5Mode(true); }

	);

	var client = new PeerManager();
	var mediaConfig = {
		audio: true,
		video: {
			mandatory: {},
			optional: []
		}
	};
	var constraintsSafari = window.constraints = {
		audio: false,
		video: true
	};

	app.factory('camera', ['$rootScope', '$window', function ($rootScope, $window) {
		if (/Version\/[\d\.]+.*Safari/i.test(navigator.userAgent)) {
			var camera = {};
			const video = document.querySelector('video');
			camera.preview = video;
			console.log("print me============================ hsdsjf");
			
			requestUserMedia1(constraintsSafari)
				.then(function (stream) {
					const videoTracks = stream.getVideoTracks();
					console.log('Got stream with constraints:', constraints);
					console.log(`Using video device: ${videoTracks[0].label}`);
					window.stream = stream; // make variable available to browser console
					video.srcObject = stream;
					attachMediaStream(camera.preview, stream);
					client.setLocalStream(stream);
					camera.stream = stream;
					$rootScope.$broadcast('cameraIsOn', true);
				})
				.catch(Error('Failed to get access to local media.'));


		}
		else {
			var camera = {};
			camera.preview = $window.document.getElementById('localVideo');
			//camera.start = function () {
			requestUserMedia(mediaConfig)
				.then(function (stream) {
					console.log(stream);
					attachMediaStream(camera.preview, stream);
					client.setLocalStream(stream);
					camera.stream = stream;
					$rootScope.$broadcast('cameraIsOn', true);
				})
				.catch(Error('Failed to get access to local media.'));
		}
		//};
		// camera.stop = function () {
		// 	return new Promise(function (resolve, reject) {
		// 		try {
		// 			//camera.stream.stop() no longer works
		// 			for (var track in camera.stream.getTracks()) {
		// 				track.stop();
		// 			}
		// 			camera.preview.src = '';
		// 			resolve();
		// 		} catch (error) {
		// 			reject(error);
		// 		}
		// 	})
		// 		.then(function (result) {
		// 			$rootScope.$broadcast('cameraIsOn', false);
		// 		});
		// };
		return camera;
	}]);

	app.controller('RemoteStreamsController', ['camera', '$location', '$http', function (camera, $location, $http) {
		var rtc = this;
		rtc.remoteStreams = [];
		function getStreamById(id) {
			for (var i = 0; i < rtc.remoteStreams.length; i++) {
				if (rtc.remoteStreams[i].id === id) { return rtc.remoteStreams[i]; }
			}
		}
		rtc.loadData = function () {
			// get list of streams from the server
			$http.get('/streams.json').success(function (data) {
				// filter own stream
				var streams = data.filter(function (stream) {
					return stream.id != client.getId();
				});
				// get former state
				for (var i = 0; i < streams.length; i++) {
					var stream = getStreamById(streams[i].id);
					streams[i].isPlaying = (!!stream) ? stream.isPLaying : false;
				}
				// save new streams
				rtc.remoteStreams = streams;
			});
		};

		rtc.view = function (stream) {
			client.peerInit(stream.id);
			stream.isPlaying = !stream.isPlaying;
		};
		rtc.call = function (stream) {
			/* If json isn't loaded yet, construct a new stream 
			 * This happens when you load <serverUrl>/<socketId> : 
			 * it calls socketId immediatly.
			**/
			if (!stream.id) {
				stream = { id: stream, isPlaying: false };
				rtc.remoteStreams.push(stream);
			}
			//if (camera.isOn) {
			client.toggleLocalStream(stream.id);
			if (stream.isPlaying) {
				client.peerRenegociate(stream.id);
			} else {
				client.peerInit(stream.id);
			}
			stream.isPlaying = !stream.isPlaying;
			// } 
			// else {
			// 	camera.start()
			// 		.then(function (result) {
			// 			client.toggleLocalStream(stream.id);
			// 			if (stream.isPlaying) {
			// 				client.peerRenegociate(stream.id);
			// 			} else {
			// 				client.peerInit(stream.id);
			// 			}
			// 			stream.isPlaying = !stream.isPlaying;
			// 		})
			// 		.catch(function (err) {
			// 			console.log(err);
			// 		});
			//}
		};

		//initial load
		rtc.loadData();
		if ($location.url() != '/') {
			rtc.call($location.url().slice(1));
		};
	}]);

	app.controller('LocalStreamController', ['camera', '$scope', '$window', '$http', function (camera, $scope, $window, $http) {
		var localStream = this;
		localStream.name = 'Guest';
		localStream.link = '';
		localStream.cameraIsOn = false;

		$scope.$on('cameraIsOn', function (event, data) {
			$scope.$apply(function () {
				localStream.cameraIsOn = data;
			});
		});

		//	localStream.toggleCam = function () {
		//if (localStream.cameraIsOn) {
		// 	camera.stop()
		// 		.then(function (result) {
		// 			client.send('leave');
		// 			client.setLocalStream(null);
		// 		})
		// 		.catch(function (err) {
		// 			console.log(err);
		// 		});
		// } else {
		//camera.start()
		//	.then(function (result) {
		setTimeout(function () {
			localStream.link = $window.location.host + '/' + client.getId();
			var data = {
				"link": localStream.link
			};
			console.log(data);
			$http.post("/getChannel", data).success(function (data, status) {
				console.log('Data posted successfully');
			});
		}, 2000);

		// 		})
		// 		.catch(function (err) {
		// 			console.log(err);
		// 		});
		// }
		//	};
		//};
	}]);
})();
