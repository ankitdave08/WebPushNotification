'use strict';

var API_KEY = window.GoogleSamples.Config.gcmAPIKey;
var GCM_ENDPOINT = 'https://android.googleapis.com/gcm/send';

var curlCommandDiv = document.querySelector('.js-curl-command');
var isPushEnabled = false;

function endpointWorkaround(pushSubscription) {

  if (pushSubscription.endpoint.indexOf('https://android.googleapis.com/gcm/send') !== 0) {
    return pushSubscription.endpoint;
  }

  var mergedEndpoint = pushSubscription.endpoint;
  if (pushSubscription.subscriptionId &&
    pushSubscription.endpoint.indexOf(pushSubscription.subscriptionId) === -1) {

    mergedEndpoint = pushSubscription.endpoint + '/' +
      pushSubscription.subscriptionId;
  }
  return mergedEndpoint;
}

function sendSubscriptionToServer(subscription) {
  console.log('TODO: Implement sendSubscriptionToServer()');

  var mergedEndpoint = endpointWorkaround(subscription);

  showCurlCommand(mergedEndpoint);
}

function showCurlCommand(mergedEndpoint) {

  if (mergedEndpoint.indexOf(GCM_ENDPOINT) !== 0) {
    window.Demo.debug.log('This browser isn\'t currently ' +
      'supported for this demo');
    return;
  }

  var endpointSections = mergedEndpoint.split('/');
  var subscriptionId = endpointSections[endpointSections.length - 1];

  var curlCommand = 'curl --header "Authorization: key=' + API_KEY +
    '" --header Content-Type:"application/json" ' + GCM_ENDPOINT +
    ' -d "{\\"registration_ids\\":[\\"' + subscriptionId + '\\"]}"';

  curlCommandDiv.textContent = curlCommand;
}

function unsubscribe() {
  var pushButton = document.querySelector('.js-push-button');
  pushButton.disabled = true;
  curlCommandDiv.textContent = '';

  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    serviceWorkerRegistration.pushManager.getSubscription().then(
      function(pushSubscription) {

        if (!pushSubscription) {
          isPushEnabled = false;
          pushButton.disabled = false;
          pushButton.textContent = 'Enable Push Messages';
          return;
        }
        pushSubscription.unsubscribe().then(function() {
          pushButton.disabled = false;
          pushButton.textContent = 'Enable Push Messages';
          isPushEnabled = false;
        }).catch(function(e) {

          window.Demo.debug.log('Unsubscription error: ', e);
          pushButton.disabled = false;
        });
      }).catch(function(e) {
        window.Demo.debug.log('Error thrown while unsubscribing from ' +
          'push messaging.', e);
      });
  });
}

function subscribe() {
  var pushButton = document.querySelector('.js-push-button');
  pushButton.disabled = true;

  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {
    serviceWorkerRegistration.pushManager.subscribe({userVisibleOnly: true})
      .then(function(subscription) {

        isPushEnabled = true;
        pushButton.textContent = 'Disable Push Messages';
        pushButton.disabled = false;
        return sendSubscriptionToServer(subscription);
      })
      .catch(function(e) {
        if (Notification.permission === 'denied') {
          window.Demo.debug.log('Permission for Notifications was denied');
          pushButton.disabled = true;
        } else {
          window.Demo.debug.log('Unable to subscribe to push.', e);
          pushButton.disabled = false;
          pushButton.textContent = 'Enable Push Messages';
        }
      });
  });
}

// Once the service worker is registered set the initial state
function initialiseState() {

  if (!('showNotification' in ServiceWorkerRegistration.prototype)) {
    window.Demo.debug.log('Notifications aren\'t supported.');
    return;
  }

  if (Notification.permission === 'denied') {
    window.Demo.debug.log('The user has blocked notifications.');
    return;
  }
  if (!('PushManager' in window)) {
    window.Demo.debug.log('Push messaging isn\'t supported.');
    return;
  }


  navigator.serviceWorker.ready.then(function(serviceWorkerRegistration) {

    serviceWorkerRegistration.pushManager.getSubscription()
      .then(function(subscription) {
        var pushButton = document.querySelector('.js-push-button');
        pushButton.disabled = false;

        if (!subscription) {
          return;
        }


        sendSubscriptionToServer(subscription);
        pushButton.textContent = 'Disable Push Messages';
        isPushEnabled = true;
      })
      .catch(function(err) {
        window.Demo.debug.log('Error during getSubscription()', err);
      });
  });
}

window.addEventListener('load', function() {
  var pushButton = document.querySelector('.js-push-button');
  pushButton.addEventListener('click', function() {
    if (isPushEnabled) {
      unsubscribe();
    } else {
      subscribe();
    }
  });

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./service-worker.js')
    .then(initialiseState);
  } else {
    window.Demo.debug.log('Service workers aren\'t supported in this browser.');
  }
});
