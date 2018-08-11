/*
 *  Copyright (c) 2014 The WebRTC project authors. All Rights Reserved.
 *
 *  Use of this source code is governed by a BSD-style license
 *  that can be found in the LICENSE file in the root of the source
 *  tree.
 */

/* More information about these options at jshint.com/docs/options */
/* jshint browser: true, camelcase: true, curly: true, devel: true,
   eqeqeq: true, forin: false, globalstrict: true, node: true,
   quotmark: single, undef: true, unused: strict */
/* global mozRTCIceCandidate, mozRTCPeerConnection, Promise,
mozRTCSessionDescription, webkitRTCPeerConnection, MediaStreamTrack */
/* exported trace,requestUserMedia */
'use strict';

var RTCPeerConnection = null;
var getUserMedia = null;
var attachMediaStream = null;
var reattachMediaStream = null;
var webrtcDetectedBrowser = null;
var webrtcDetectedVersion = null;

function trace(text) {
  // This function is used for logging.
  if (text[text.length - 1] === '\n') {
    text = text.substring(0, text.length - 1);
  }
  if (window.performance) {
    var now = (window.performance.now() / 1000).toFixed(3);
    console.log(now + ': ' + text);
  } else {
    console.log(text);
  }
}

if (navigator.mozGetUserMedia) {
  console.log('This appears to be Firefox');

  webrtcDetectedBrowser = 'firefox';

  webrtcDetectedVersion =
    parseInt(navigator.userAgent.match(/Firefox\/([0-9]+)\./)[1], 10);

  // The RTCPeerConnection object.
  RTCPeerConnection = function (pcConfig, pcConstraints) {
    // .urls is not supported in FF yet.
    if (pcConfig && pcConfig.iceServers) {
      for (var i = 0; i < pcConfig.iceServers.length; i++) {
        if (pcConfig.iceServers[i].hasOwnProperty('urls')) {
          pcConfig.iceServers[i].url = pcConfig.iceServers[i].urls;
          delete pcConfig.iceServers[i].urls;
        }
      }
    }
    return new RTCPeerConnection(pcConfig, pcConstraints);
  };

  // The RTCSessionDescription object.
  window.RTCSessionDescription = mozRTCSessionDescription;

  // The RTCIceCandidate object.
  window.RTCIceCandidate = mozRTCIceCandidate;

  // getUserMedia shim (only difference is the prefix).
  // Code from Adam Barth.
  getUserMedia = navigator.mozGetUserMedia.bind(navigator);
  navigator.getUserMedia = getUserMedia;

  // Shim for MediaStreamTrack.getSources.
  MediaStreamTrack.getSources = function (successCb) {
    setTimeout(function () {
      var infos = [
        { kind: 'audio', id: 'default', label: '', facing: '' },
        { kind: 'video', id: 'default', label: '', facing: '' }
      ];
      successCb(infos);
    }, 0);
  };

  // Creates ICE server from the URL for FF.
  window.createIceServer = function (url, username, password) {
    var iceServer = null;
    var urlParts = url.split(':');
    if (urlParts[0].indexOf('stun') === 0) {
      // Create ICE server with STUN URL.
      iceServer = {
        'url': url
      };
    }
    else if (urlParts[0].indexOf('turn') === 0) {
      if (webrtcDetectedVersion < 27) {
        // Create iceServer with turn url.
        // Ignore the transport parameter from TURN url for FF version <=27.
        var turnUrlParts = url.split('?');
        // Return null for createIceServer if transport=tcp.
        if (turnUrlParts.length === 1 ||
          turnUrlParts[1].indexOf('transport=udp') === 0) {
          iceServer = {
            'url': turnUrlParts[0],
            'credential': password,
            'username': username
          };
        }
      } else {
        // FF 27 and above supports transport parameters in TURN url,
        // So passing in the full url to create iceServer.
        iceServer = {
          'url': url,
          'credential': password,
          'username': username
        };
      }
    }
    return iceServer;
  };

  window.createIceServers = function (urls, username, password) {
    var iceServers = [];
    // Use .url for FireFox.
    for (var i = 0; i < urls.length; i++) {
      var iceServer =
        window.createIceServer(urls[i], username, password);
      if (iceServer !== null) {
        iceServers.push(iceServer);
      }
    }
    return iceServers;
  };

  // Attach a media stream to an element.
  attachMediaStream = function (element, stream) {
    console.log('Attaching media stream');
    element.mozSrcObject = stream;
  };

  reattachMediaStream = function (to, from) {
    console.log('Reattaching media stream');
    to.mozSrcObject = from.mozSrcObject;
  };

}
else if (navigator.webkitGetUserMedia) {
  console.log('This appears to be Chrome');

  webrtcDetectedBrowser = 'chrome';
  // Temporary fix until crbug/374263 is fixed.
  // Setting Chrome version to 999, if version is unavailable.
  var result = navigator.userAgent.match(/Chrom(e|ium)\/([0-9]+)\./);
  if (result !== null) {
    webrtcDetectedVersion = parseInt(result[2], 10);
  } else {
    webrtcDetectedVersion = 999;
  }

  // Creates iceServer from the url for Chrome M33 and earlier.
  window.createIceServer = function (url, username, password) {
    var iceServer = null;
    var urlParts = url.split(':');
    if (urlParts[0].indexOf('stun') === 0) {
      // Create iceServer with stun url.
      iceServer = {
        'url': url
      };
    } else if (urlParts[0].indexOf('turn') === 0) {
      // Chrome M28 & above uses below TURN format.
      iceServer = {
        'url': url,
        'credential': password,
        'username': username
      };
    }
    return iceServer;
  };

  // Creates an ICEServer object from multiple URLs.
  window.createIceServers = function (urls, username, password) {
    return {
      'urls': urls,
      'credential': password,
      'username': username
    };
  };

  // The RTCPeerConnection object.
  RTCPeerConnection = function (pcConfig, pcConstraints) {
    return new webkitRTCPeerConnection(pcConfig, pcConstraints);
  };

  // Get UserMedia (only difference is the prefix).
  // Code from Adam Barth.
  getUserMedia = navigator.webkitGetUserMedia.bind(navigator);
  navigator.getUserMedia = getUserMedia;

  // Attach a media stream to an element.
  attachMediaStream = function (element, stream) {
    if (typeof element.srcObject !== 'undefined') {
      element.srcObject = stream;
    } else if (typeof element.mozSrcObject !== 'undefined') {
      element.mozSrcObject = stream;
    } else if (typeof element.src !== 'undefined') {
      element.src = URL.createObjectURL(stream);
    } else {
      console.log('Error attaching stream to element.');
    }
  };

  reattachMediaStream = function (to, from) {
    to.src = from.src;
  };
}
else if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
  webrtcDetectedBrowser = 'safari';
  var result = navigator.userAgent.match(/Version\/[\d\.]+.*Safari/);
  webrtcDetectedVersion = result[0].split('/')[1];

  getUserMedia = navigator.mediaDevices.getUserMedia({ video: true });
  navigator.getUserMedia = getUserMedia;
  // The RTCPeerConnection object.
  // RTCPeerConnection = function (pcConfig, pcConstraints) {
  //   if (pcConfig && pcConfig.iceServers) {
  //     for (var i = 0; i < pcConfig.iceServers.length; i++) {
  //       if (!pcConfig.iceServers[i].hasOwnProperty('urls') && pcConfig.iceServers[i].hasOwnProperty('url')) {
  //         pcConfig.iceServers[i].urls = pcConfig.iceServers[i].url;
  //         delete pcConfig.iceServers[i].url;
  //       }
  //     }
  //   }
  //   return new RTCPeerConnection(pcConfig, pcConstraints);
  // };
  // Creates iceServer from the url for Chrome M33 and earlier.
  window.createIceServer = function (url, username, password) {
    var iceServer = null;
    var urlParts = url.split(':');
    if (urlParts[0].indexOf('stun') === 0) {
      // Create iceServer with stun url.
      iceServer = {
        'url': url
      };
    } else if (urlParts[0].indexOf('turn') === 0) {
      // Chrome M28 & above uses below TURN format.
      iceServer = {
        'url': url,
        'credential': password,
        'username': username
      };
    }
    return iceServer;
  };

  // Creates an ICEServer object from multiple URLs.
  window.createIceServers = function (urls, username, password) {
    return {
      'urls': urls,
      'credential': password,
      'username': username
    };
  };

   // The RTCPeerConnection object.
   RTCPeerConnection = function (pcConfig, pcConstraints) {
    // .urls is not supported in FF yet.
    if (pcConfig && pcConfig.iceServers) {
      for (var i = 0; i < pcConfig.iceServers.length; i++) {
        if (pcConfig.iceServers[i].hasOwnProperty('url')) {
          pcConfig.iceServers[i].urls = pcConfig.iceServers[i].url;
          delete pcConfig.iceServers[i].url;
        }
      }
    }
    return new RTCPeerConnection(pcConfig, pcConstraints);
  };
  // Attach a media stream to an element.
  // attachMediaStream = function (element, stream) {
  //   console.log("====== attaching media inside safari ");
  //   element.srcObject = stream;
  // };
    // Attach a media stream to an element.
    attachMediaStream = function (element, stream) {
      if (typeof element.srcObject !== 'undefined') {
        console.log("====== attaching media inside safari ");
        element.srcObject = stream;
      } else if (typeof element.mozSrcObject !== 'undefined') {
        element.mozSrcObject = stream;
      } else if (typeof element.src !== 'undefined') {
        element.src = URL.createObjectURL(stream);
      } else {
        console.log('Error attaching stream to element.');
      }
    };
  
    reattachMediaStream = function (to, from) {
      to.src = from.src;
    };
  // reattachMediaStream = function (to, from) {
  //   console.log('====== Reattaching media stream');
  //   to.srcObject = from.srcObject;
  // };
}
else {
  console.log('Browser does not appear to be WebRTC-capable');
}

//=====================Add on===========
// const constraintsSafari = window.constraints = {
//   audio: false,
//   video: true
// };

// function handleSuccess(stream) {
//   //const video = document.querySelector('video');
//   const videoTracks = stream.getVideoTracks();
//   console.log('Got stream with constraints:', constraints);
//   console.log(`Using video device: ${videoTracks[0].label}`);
//   //window.stream = stream; // make variable available to browser console
//   //video.srcObject = stream;
// }

// function handleError(error) {
//   if (error.name === 'ConstraintNotSatisfiedError') {
//     let v = constraints.video;
//     errorMsg(`The resolution ${v.width.exact}x${v.height.exact} px is not supported by your device.`);
//   } else if (error.name === 'PermissionDeniedError') {
//     errorMsg('Permissions have not been granted to use your camera and ' +
//       'microphone, you need to allow the page access to your devices in ' +
//       'order for the demo to work.');
//   }
//   errorMsg(`getUserMedia error: ${error.name}`, error);
// }

// function errorMsg(msg, error) {
//   const errorElement = document.querySelector('#errorMsg');
//   errorElement.innerHTML += `<p>${msg}</p>`;
//   if (typeof error !== 'undefined') {
//     console.error(error);
//   }
// }
//===============================

// Returns the result of getUserMedia as a Promise.
function requestUserMedia(constraints) {
  return new Promise(function (resolve, reject) {
    // if (navigator.mediaDevices.getUserMedia) {
    //   var constraints = { audio: true, video: true };

    //   navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess);

    //   var handleSuccess = function (stream) { 
    //       resolve(stream);
    //   };
    // }
    // else{
    var onSuccess = function (stream) {
      resolve(stream);
    };
    var onError = function (error) {
      reject(error);
    };

    try {
      if (/Version\/[\d\.]+.*Safari/i.test(navigator.userAgent)) {
        // navigator.mediaDevices.getUserMedia({
        //   audio: true,
        //   video: { facingMode: "user" }
        // }, function (stream) {
        //   video.srcObject = stream;
        //   //video.src = window.URL.createObjectURL(stream);
        // },
        //   function (err) {
        //     alert(err.name);
        //   });
        navigator.mediaDevices.getUserMedia(constraintsSafari)
        .then(handleSuccess)
        .catch(handleError);
      }
      else {
        getUserMedia(constraints, onSuccess, onError);

      }
    } catch (e) {
      reject(e);
    }
    //}

  });
}

function requestUserMedia1(constraints) {
  return new Promise(function (resolve, reject) {
    // if (navigator.mediaDevices.getUserMedia) {
    //   var constraints = { audio: true, video: true };

    //   navigator.mediaDevices.getUserMedia(constraints).then(handleSuccess);

    //   var handleSuccess = function (stream) { 
    //       resolve(stream);
    //   };
    // }
    // else{
    var onSuccess = function (stream) {
      resolve(stream);
    };
    var onError = function (error) {
      reject(error);
    };

    try {
        navigator.mediaDevices.getUserMedia(constraints)
        .then(onSuccess)
        .catch(onError);
    } catch (e) {
      reject(e);
    }

  });
}

if (typeof module !== 'undefined') {
  module.exports = {
    RTCPeerConnection: RTCPeerConnection,
    getUserMedia: getUserMedia,
    attachMediaStream: attachMediaStream,
    reattachMediaStream: reattachMediaStream,
    webrtcDetectedBrowser: webrtcDetectedBrowser,
    webrtcDetectedVersion: webrtcDetectedVersion
    //requestUserMedia: not exposed on purpose.
    //trace: not exposed on purpose.
  };
}