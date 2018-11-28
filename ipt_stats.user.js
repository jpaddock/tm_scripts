// ==UserScript==
// @name          IPT Stats
// @namespace     crdl_ipt_stats
// @require       https://code.jquery.com/jquery-2.1.1.min.js
// @run-at        document-end
// @version       1.0
// @description   Prints out summarized Inbox Placement Test Stats
// @include       https://admin.cordial.*
// @updateURL     https://github.com/jpaddock/tm_scripts/raw/master/ipt_stats.user.js
// @grant   GM_getValue
// @grant   GM_setValue
// @grant   GM_deleteValue
// ==/UserScript==


//Get inbox placement test details

var keepTrying = function keepTrying(func, callback, sleep, maxAttempts) {
    if (typeof(sleep) == 'undefined') {
      sleep = 100;
    }
    var totalAttempts = 0;
    var args = Array.prototype.slice.call(arguments, 2);
    var timer = setInterval(function() {
      if (func.apply(null, args)) {
        clearInterval(timer);
        // console.log('done trying: '+func);
        callback();
      } else {
        // console.log('tried: '+func);
        totalAttempts++;
        if (typeof maxAttempts !== 'undefined') {
          if (totalAttempts > maxAttempts) {
            clearInterval(timer);
            console.log('Reached maximum number of attepts.  Going to stop checking.');
          }
        }
      }
    }, sleep);
  };

  var when = function when(test, run, sleep, maxAttempts) {
    var args = Array.prototype.slice.call(arguments, 2);
    keepTrying(test, function() {
        run.apply(null, args);
      },
      sleep, maxAttempts);
  };

function makeRequest(url,method,successCB,errorCB){
    var xhr = new XMLHttpRequest();
    xhr.open(method, url);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.onload = function() {
        if (xhr.status === 200) {
            successCB(JSON.parse(xhr.responseText));
        }else {
            errorCB(xhr);
        }
    };
    xhr.send();
}

function gmMain(){
    if(document.location.hash.match(/#message\/performance\/([^/]*)\/manual$/)){
        var msgId = document.location.hash.match(/#message\/performance\/([^/]*)\/manual$/)[1];
        //Make a request to get details on the email
        var url = "https://admin.cordial.io/api/batchmessages/"+msgId+"/dashboard";
        console.info('Going to make a request to: '+url);
        makeRequest(url,"GET",function(response){
            console.info('Got a response:');
            console.info(response);
            var data = {};
            data.spam = {};
            data.missing = {};
            data.message = response.message;
            data.message.msgId = response._id;
            //Get inbox placement test data
            if(response.inboxPlacementTest){
                //Assuming that we only have 250OK as a vendor
                data.stats = response.inboxPlacementTest._250ok.stats;
                //Loop through ISP summary to see which ones have spam and missing
                var summary = response.inboxPlacementTest._250ok.summary.isp_summary;
                Object.keys(summary).forEach(function(key){
                    if(summary[key].isp_spam !== '0%'){
                        data.spam[summary[key].isp_name] = summary[key].isp_spam;
                    }
                    if(summary[key].isp_missing !== '0%'){
                        data.missing[summary[key].isp_name] = summary[key].isp_missing;
                    }
                });
            }
            console.info(data);
            when(function(){
                return document.querySelector('div[data-block="inbox-placement"] .header');
            },function(){
                showDataToUser(data);
            });
        },null);
    }
}


function showDataToUser(data){
    var msg = 'Inbox Placement Test - ' + data.stats.inboxpct + '% Inbox\n';
    msg += '    Spam:\n';
    Object.keys(data.spam).forEach(function(key){
        msg += '        ' + key + ': ' + data.spam[key] + '\n';
    });
    msg += '    Missing:\n';
    Object.keys(data.missing).forEach(function(key){
        msg += '        ' + key + ': ' + data.missing[key] + '\n';
    });
    console.info(msg);
    createTextArea(msg);
}

function createTextArea(msg){
    var iptDiv = document.querySelector('div[data-block="inbox-placement"] .header');
    var div = document.createElement("div");
    div.id = "ipt-stats";
    div.classList.add("pull-right");
    div.style.paddingRight = "60px";
    div.innerHTML = '<textarea cols="40" rows="5">' + msg + '</textarea>';
    iptDiv.appendChild(div);
}

  /*--- Note, gmMain () will fire under all these conditions:
      http://stackoverflow.com/questions/18989345/how-do-i-reload-a-greasemonkey-script-when-ajax-changes-the-url-without-reloadin
      1) The page initially loads or does an HTML reload (F5, etc.).
      2) The scheme, host, or port change.  These all cause the browser to
         load a fresh page.
      3) AJAX changes the URL (even if it does not trigger a new HTML load).
  */
 var fireOnHashChangesToo    = true;
 var pageURLCheckTimer       = setInterval (
     function () {
         if (   this.lastPathStr  !== location.pathname
             || this.lastQueryStr !== location.search
             || (fireOnHashChangesToo && this.lastHashStr !== location.hash)
         ) {
             this.lastPathStr  = location.pathname;
             this.lastQueryStr = location.search;
             this.lastHashStr  = location.hash;
             gmMain ();
         }
     }
     , 111
 );
