import helpers from './helpers.js';
import servers from './servers.js';
import sounds from './sounds.js';


var roomStatus = 0;
var hippaCompliance = 0;
var currentSelectedVideo = 0;
function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    else return '';
}

function until(conditionFunction) {
    const poll = resolve => {
      if(conditionFunction()) resolve();
      else setTimeout(_ => poll(resolve), 500);
    }
    return new Promise(poll);
}

function untilcustom(conditionFunction) {
    if((roomStatus&32) !=0) // EndSession is set
    {
        let elem = document.getElementById('hippaComplianceModal');
        if(elem) elem.style.display = 'none';
        resolve();
    }
    const poll = resolve => {
      if((roomStatus&32) != 0) // EndSession is set
      {
          let elem = document.getElementById('hippaComplianceModal');
          if(elem) elem.style.display = 'none';
          resolve();
      }
      if(conditionFunction()) resolve();
      else setTimeout(_ => poll(resolve), 500);
    }
    return new Promise(poll);
}

async function requestWaitingRoom()
{
    await until(_ => roomStatus&1!=0);
    return true;
}

async function checkHippaCompliantMessage(isTherapist)
{
    await untilcustom(_ => hippaCompliance!=0);
    return true;
}

// Need to define this first here
const initialHippaComplianceCloseBtn = document.querySelector("#hippaComplianceModalCloseButton");
initialHippaComplianceCloseBtn.onclick = async function()
{
    let getHippaComplianceModal = document.querySelector("#hippaComplianceModal");
    if(getHippaComplianceModal) 
    {
        getHippaComplianceModal.style.display = "none"; 
        hippaCompliance = 1;
    }
}
const initialHippaComplianceCloseBtn2 = document.querySelector("#hippaComplianceModalCloseButton2");
initialHippaComplianceCloseBtn2.onclick = async function()
{
    let getHippaComplianceModal = document.querySelector("#hippaComplianceModal");
    if(getHippaComplianceModal) 
    {
        getHippaComplianceModal.style.display = "none"; 
        hippaCompliance = 1;
    }
}


window.addEventListener( 'load', async () => {
    //const room = helpers.getQString( location.href, 'room' );
    const room = ROOM_ID;
    {
        const videoGrid = document.getElementById("video-grid");
        let myVideo = document.createElement("video");
        const showChat = document.querySelector("#showChat");
        const backBtn = document.querySelector(".header__back");
        const backBtn2 = document.querySelector(".header__back2");
        myVideo.muted = true;
        myVideo.id = 'local';

        var pc = [];
        var socketId = '';
        var randomNumber = `__${helpers.generateRandomString()}__${helpers.generateRandomString()}__`;
        var myStream = '';
        var screen = '';
        var recordedStream = [];
        var mediaRecorder = '';
        var outOfWaitingRoom = false;
        var pulseLastTiming = 0;
        let hasTherapistUsrName = false;
        let timerHasBeenSet = false;
        let reconnecting = false;
        let isSharingScreen = false;
        let isBlurringLocalBkground = false;
        let isMirroringLocalVideo = false;
        let flipFlopBorderColor = false; // every time a video is spawned, we will flip this and can use it for any alternating design
        var clientScreenShareLastTiming = 0; // used to avoid certain browsers spaming the ScreenShare dialog twice etc. (not in usage now, using button display)
        let usernamesList = []; // used for nametags, sent from server with socketID match, eventually
        let videoList = []; // save local objects containing video elem and id
        //const user = prompt("Enter your name");
        // if(user) document.getElementById("headertitletext").innerHTML = user + ' session ' + ROOM_ID.substring(0,8);
        let TherapistUser = sessionStorage.getItem( 'BMUserChecksum' ) || localStorage.getItem( 'BMUserChecksum' ) || getCookie('BMUserChecksum');
        TherapistUser = '540609175';
        var hasSetupUserNameUniq = false;
        let username = '';
        let stringdisplayname = ''; // actual data returned with no formatting
        if(TherapistUser) username = "Therapist";
        else username = "Client";
        let user = username;        
        
        // Turn off chatbox if it's not off by default
        SetChatBoxOffByDefault();
        
        // Turn off big buttons on bottom
        SetLargeButtonsOffByDefault();

        // Setup recursive client status polling for waiting room and other options
        let hasSessionEnded = false;
        let localClientStatusRet = await requestClientStatus().then(data => {
            roomStatus = data.status;
            ArrangeSidebarHandler();
            CheckSessionEnded();
            ChangeRoomLook();
        });
        requestClientStatusRecursive();

        // Send user startup message
        let isRefreshing = sessionStorage.getItem("gt_IsRefreshing");
        if(isRefreshing == 1)
        {
            sessionStorage.setItem("gt_IsRefreshing", 0);
            let getHippaComplianceModal = document.querySelector("#hippaComplianceModal");
            if(getHippaComplianceModal) 
            {
                getHippaComplianceModal.style.display = "none"; 
                hippaCompliance = 1;
            }
        }
        else
        {
            checkHippaComplianceRecursive();
            if(!TherapistUser)
            {
                //const hippa = alert("Goldlink is HIPAA compliant and encrypted for your security. To continue, press Ok or Close.");
                let hippaelem = document.getElementById('hippaComplianceModalText');
                if(hippaelem) hippaelem.innerHTML = "Goldlink is HIPAA compliant and encrypted for your security. <br/><br/>To continue, press 'Ok'.<br/>";
                await checkHippaCompliantMessage(false);
            }
            //else alert("Senior Talk is HIPAA compliant and encrypted for your security. You are logged in as therapist. When you are ready to continue, press Ok orClose.");
            else 
            {
                sessionStorage.setItem('BMUserChecksum', TherapistUser);
                //alert("Goldlink is HIPAA compliant and encrypted for your security. To continue as a therapist, press Ok or Close.");
                let hippaelem = document.getElementById('hippaComplianceModalText');
                if(hippaelem) hippaelem.innerHTML = "Goldlink is HIPAA compliant and encrypted for your security. <br/><br/>To continue, press 'Ok'.<br/>";
                await checkHippaCompliantMessage(true);
            }
        }

        // If session ended, stop here
        if(hasSessionEnded) return;

        // Get therapist username if it's a therapist user and still haven't gotten it
        if(TherapistUser && !hasTherapistUsrName)
        {
            getTherapistUsername();
        }
        else if(!hasTherapistUsrName)
        {
            getClientUsername();
        }

        // If the clientstatus is not 1 (active) yet, wait for promise to return that it is (waiting room simple wait), also if Therapist User, skip this waiting room
        if((roomStatus&1)==0 && !TherapistUser)
        {
            let waitingRoom = document.querySelector("#waitingroom1");
            if(waitingRoom) waitingRoom.style.removeProperty('display');
            let waitingRoomVideo = document.querySelector("#waitingroomvideosrc1");
            if(waitingRoomVideo) waitingRoomVideo.src = servers.getAPIServer() + 'waitingroomvideo1';
            //requestClientStatusChange(16); // sendWaitingRoomPulse
            sendInWaitingRoomStatusRecursive(); // sendWaitingRoomPulse, recursively until out of the room
            await requestWaitingRoom();
        }
        outOfWaitingRoom = true;
        let waitingRoomElem = document.querySelector("#waitingroom1");
        if(waitingRoomElem) waitingRoomElem.style.display='none';
        let logoElem = document.querySelector(".header"); // Ensure top logo displays if it wasn't before
        if(logoElem) logoElem.style.display='flex';
        sounds.opendoorsnd();
        fadeeffect1();
        HandleTimerDisplay();

        // Hide settings button if needed
        let localcpanelButton = document.querySelector("#optionsButton");
        let middleTabsElem = document.querySelector(".middle__tabs");
        if(!TherapistUser) 
        {
            if(localcpanelButton) localcpanelButton.style.display = "none";
            if(middleTabsElem) middleTabsElem.style.display = "none";
        }

        // Hide endsesssion button
        let elemBigButton = document.querySelector("#endSessionButton2");
        if(elemBigButton && !TherapistUser)
        {
            elemBigButton.style.display = 'none';
        }

        // Hide buttons until HIPPA acknowledgement is done, then re-arrange them instantly as needed
        let OptionsElem = document.querySelector('.options');
        if(OptionsElem) OptionsElem.style.display = 'inherit';
        ArrangeSidebarHandler();

        // Set endsession loaded to false, if needed
        sessionStorage.setItem( '' + room + 'endSessionLoaded', false );

        const addVideoStream = (video, stream) => {
            video.srcObject = stream;
            //video.autoplay = 'autoplay';
            video.setAttribute('webkit-playsinline', 'webkit-playsinline');
            video.setAttribute('playsinline', 'playsinline');
            video.setAttribute('disablePictureInPicture', 'true');
            video.style.setProperty("transform", "scale(1,1)");
            //video.setAttribute('autoplay', 'autoplay');
            video.addEventListener("loadedmetadata", () => {
              video.play();
            });

            // Simple alternating border
            //if(!flipFlopBorderColor) video.style.setProperty("border", "2px solid gold");
            //else video.style.setProperty("border", "2px solid lightblue");
            //flipFlopBorderColor = !flipFlopBorderColor;
            video.style.setProperty("border", "2px solid lightblue");
        
            /*video.addEventListener( 'click', () => {
                if ( !document.pictureInPictureElement ) {
                    video.requestPictureInPicture()
                        .catch( error => {
                            // Video failed to enter Picture-in-Picture mode.
                            console.error( error );
                        } );
                }
                else {
                    document.exitPictureInPicture()
                        .catch( error => {
                            // Video failed to leave Picture-in-Picture mode.
                            console.error( error );
                        } );
                }
            } );*/

            let id = video.id;
            /*let newDiv = document.createElement( 'div' );
            newDiv.class='gridvideo';
            newDiv.style='max-width:50vw;max-height:75vh;';
            newDiv.append(video);
            video.style.height = '100%';
            video.style.width = '100%';
            videoGrid.append(newDiv);*/
            video.style.setProperty("flex", "1 0 22%");
            videoGrid.append(video);

            // Custom controls, we want volume control and full screen maybe, that's it (other controls are set in .css file)
            
            if(id != 'local')
            {
                video.onclick = OpenOtherStreamingOptions;
		        //video.setAttribute('controls', 'none');
                /*video.setAttribute('class', 'op-player__media');
                const player = new OpenPlayerJS(id, { pauseOthers: false,
                hidePlayBtnTimer: 1,
                live: {showLabel: true,showProgress: false},
                });

		if(TherapistUser)
		{
                player.addControl({
                    icon: "<i class='fa fa-user-times'>dismiss</i>",
                    id: 'dismiss'+id,
                    title: 'Dismiss Client',
                    styles: {},
                    content: '', // Can override the content generated inside the control
                    // Possible values: 'bottom-left', 'bottom-middle', 'bottom-right',
                    // 'left', 'middle', 'right', 'top-left', 'top-middle', 'top-right',
                    // or `main` to add it in the video area
                    position: 'right',
                    showInAds: false, // or true
                    init: (player) => {}, // Pass an instance of the player for advanced operations
                    click: () => { 
                        if(confirm("This client will be removed from the session, continue?"))
                        {
                            DismissCurrentClient(TherapistUser, id);
                        } 
                    },
                    mouseenter: () => {},
                    mouseleave: () => {},
                    keydown: () => {},
                    blur: () => {},
                    focus: () => {},
                    destroy: (player) => {}, // Pass an instance of the player for advanced operations
                });
		}

        player.addControl({
            icon: "<i class='fa fa-arrows'>arrows</i>",
            id: 'videoorientsubmenu'+id,
            title: 'Video Orientation',
            styles: {},
            content: '', // Can override the content generated inside the control
            // Possible values: 'bottom-left', 'bottom-middle', 'bottom-right',
            // 'left', 'middle', 'right', 'top-left', 'top-middle', 'top-right',
            // or `main` to add it in the video area
            position: 'right',
            showInAds: false, // or true
           subitems: [
                {
                    // optional list of items to render a menu
                    id: 'FullscreenVid'+id,
                    label: 'Fullscreen',
                    title: '', // optional
                    icon: '', // optional
                    click: () => { FullScreenCurrentVideo(id); },
                },
                {
                    // optional list of items to render a menu
                    id: 'MirrorFlip'+id,
                    label: 'Mirror',
                    title: '', // optional
                    icon: '', // optional
                    click: () => { FlipCurrentVideo(id); },
                },
                {
                    // optional list of items to render a menu
                    id: 'ResizeSmaller'+id,
                    label: 'Smaller',
                    title: '', // optional
                    icon: '', // optional
                    click: () => { ResizeCurrentVideo(id, true); },
                },
                {
                    // optional list of items to render a menu
                    id: 'ResizeLarger'+id,
                    label: 'Larger',
                    title: '', // optional
                    icon: '', // optional
                    click: () => { ResizeCurrentVideo(id, false); },
                },
                {
                    // optional list of items to render a menu
                    id: 'ResetVid'+id,
                    label: 'Reset',
                    title: '', // optional
                    icon: '', // optional
                    click: () => { ResetCurrentVideo(id); },
                }
            ],
            init: (player) => {}, // Pass an instance of the player for advanced operations
            click: () => {},
            mouseenter: () => {},
            mouseleave: () => {},
            keydown: () => {},
            blur: () => {},
            focus: () => {},
            destroy: (player) => {}, // Pass an instance of the player for advanced operations
        });
                player.init();

                // Button list
                setTimeout( ()=> {
                        let buttonList = document.getElementsByTagName("button");
                        if(buttonList)
                        {
                            for(let i=0;i<buttonList.length;i++)
                            {
                                let buttonelem = buttonList[i];
                                if(!buttonelem) continue;
                                if(buttonelem.id.includes("dismiss"))
                                {
                                    //console.log("Adding to", buttonelem.id);
                                    buttonelem.innerHTML = "<i class='fa fa-user-times' style='display:block;color:white;margin-right:6px;'></i>";
                                }    
                                if(buttonelem.id.includes("videoorient"))
                                {
                                    //console.log("Adding to", buttonelem.id);
                                    buttonelem.innerHTML = "<i class='fa fa-arrows' style='display:block;color:white;margin-right:12px;'></i>";
                                }    
                            }
                        }

                        let divList = document.getElementsByTagName("div");
                        if(divList)
                        {
                            for(let i=0;i<divList.length;i++)
                            {
                                let divelem = divList[i];
                                if(!divelem) continue;
                                if(divelem.id.includes("MirrorFlip") || divelem.id.includes("ResizeSmaller") || divelem.id.includes("ResizeLarger") || divelem.id.includes("ResetVid") || divelem.id.includes("FullscreenVid")) 
                                {
                                    //console.log("Adding to", buttonelem.id);
                                    //divelem.innerHTML = "<i class='fa fa-square-o' style='display:block;color:white;margin-right:6px;cursor:pointer;'>Mirror</i>";
                                    divelem.style.setProperty('padding-top', '12px');
                                    divelem.style.setProperty('padding-bottom','12px');
                                    divelem.style.setProperty('cursor','pointer');
                                }  
                            }
                        }
                          
                    }, 100
                );*/
            }
            else { 

                // IsLocal video
                video.onclick = OpenStreamingOptions;
		video.style.setProperty("max-width", "244px");
		video.style.setProperty("max-height", "188px");
		video.style.setProperty("margin-top", "8rem");
		video.style.setProperty("margin-right", "1rem");
                /*let newDiv = document.createElement( 'div' );
                newDiv.class='largescreen__options';
                newDiv.innerHTML = "<div id='exitRoomButton' class='options__button' style='position: relative;'> <i class='fa fa-door'><i>Exit Room</div>";
                videoGrid.append(newDiv);*/

		        //video.setAttribute('controls', 'controls');
                /*video.setAttribute('class', 'op-player__media');
                const player = new OpenPlayerJS(id, { pauseOthers: false,
                hidePlayBtnTimer: 1,
                live: {showLabel: true,showProgress: false},
                controls: {}
                });

                player.addControl({
                    icon: "<i class='fa fa-video-camera'>videocamera</i>",
                    id: 'videostreamsubmenu'+id,
                    title: 'Streaming Options',
                    styles: {},
                    content: '', // Can override the content generated inside the control
                    // Possible values: 'bottom-left', 'bottom-middle', 'bottom-right',
                    // 'left', 'middle', 'right', 'top-left', 'top-middle', 'top-right',
                    // or `main` to add it in the video area
                    position: 'right',
                    showInAds: false, // or true
                    subitems: [
                        {
                            // optional list of items to render a menu
                            id: 'BlurVid'+id,
                            label: 'Start Background Blur',
                            title: '', // optional
                            icon: '', // optional
                            click: () => { blurVideoStream(id); },
                        },
                        {
                            // optional list of items to render a menu
                            id: 'unBlurVid'+id,
                            label: 'Stop Background Blur',
                            title: '', // optional
                            icon: '', // optional
                            click: () => { unblurVideoStream(id); },
                        }
                    ],
                    init: (player) => {}, // Pass an instance of the player for advanced operations
                    click: () => {},
                    mouseenter: () => {},
                    mouseleave: () => {},
                    keydown: () => {},
                    blur: () => {},
                    focus: () => {},
                    destroy: (player) => {}, // Pass an instance of the player for advanced operations
                });
                player.init();

                // Button list
                setTimeout( ()=> {
                        let buttonList = document.getElementsByTagName("button");
                        if(buttonList)
                        {
                            for(let i=0;i<buttonList.length;i++)
                            {
                                let buttonelem = buttonList[i];
                                if(!buttonelem) continue;
                                if(buttonelem.id.includes("videostream"))
                                {
                                    //console.log("Adding to", buttonelem.id);
                                    buttonelem.innerHTML = "<i class='fa fa-video-camera' style='display:block;color:white;margin-right:12px;'></i>";
                                }    
                            }
                        }

                        let divList = document.getElementsByTagName("div");
                        if(divList)
                        {
                            for(let i=0;i<divList.length;i++)
                            {
                                let divelem = divList[i];
                                if(!divelem) continue;
                                if(divelem.id.includes("BlurVid") ) 
                                {
                                    //console.log("Adding to", buttonelem.id);
                                    //divelem.innerHTML = "<i class='fa fa-square-o' style='display:block;color:white;margin-right:6px;cursor:pointer;'>Mirror</i>";
                                    divelem.style.setProperty('padding-top', '12px');
                                    divelem.style.setProperty('padding-bottom','12px');
                                    divelem.style.setProperty('cursor','pointer');
                                }  
                            }
                        }

                        // Reset local elem back to the video
                        let localElem = document.getElementById("local");
                        if(localElem)
                        {
                            let firstvideo = localElem.getElementsByTagName("video")[0];
                            if(firstvideo)
                            {
                                localElem.id = "localPlayerDiv";
                                firstvideo.id = "local";
                            }
                        }
                          
                    }, 100
                );*/
             }

            // Retrieve username-tags or anything afterward (after a video/stream load)
            setTimeout( ()=> {
                getSocketUsernames();
            }, 1000);

            // Add resize event for nametags or anything rly
            video.addEventListener( "resize", function (e) {
                //SetVideoNameTagPositions(this, id);
                SetVideoNameTagPositionSaved();
            }, false );

            // Save
            videoList.push({video: video, id: id});
        };

        //Get user video by default, set hasMediaToUse if either function fails, so we won't try to get our media streams later
        let hasStream = false;
        try
            {
                await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true,noiseSuppression: true},video: true}).then((stream) => {
                    myStream = stream;
                    addVideoStream(myVideo, stream);
                    helpers.setLocalStream( myVideo, stream );
                    hasStream = true;
                });
        } catch (err) {
            hasStream = false;
            alert("No camera/microphone detected. Use text chat.");
        }

        // Set helper buttons off or disabled (e.g. mute) if we don't use those anyway
        // if(!hasMediaToUse)  helpers.toggleMediaBtnsInvisible();
    
        let socket = io( '/stream' ); // have to intialize this connection here, otherwise it's a race condition where 'connect' is not defined fast enough
        socket.on( 'connect', () => {
            //set socketId
            socketId = socket.io.engine.id;
            console.log("Connected as " + socketId);
            if(socketId && !hasSetupUserNameUniq) 
            {
                username+=socketId[0] + socketId[1];
                hasSetupUserNameUniq = true;
            }
            //document.getElementById('randomNumber').innerText = randomNumber;

            socket.on( 'new user', ( data ) => {
                //console.log("new user received, socketID pushed, init", data);
                socket.emit( 'newUserStart', { to: data.socketId, sender: socketId } );
                pc.push( data.socketId );
                init( true, data.socketId );
            } );

            socket.on( 'newUserStart', ( data ) => {
                //console.log("newUserStart received, sender pushed", data);
                pc.push( data.sender );
                init( false, data.sender );
            } );

            socket.on( 'ice candidates', async ( data ) => {
                //console.log("Ice Candidates received", data, pc[data.sender]);
                data.candidate ? await pc[data.sender].addIceCandidate( new RTCIceCandidate( data.candidate ) ) : '';
            } );

            socket.on( 'timer', async ( data ) => {
                let elapsed = data.curTime - data.firstTime;
                HandleTimerSetTime(elapsed);
            } );

            socket.on('disconnectedUser', async (data) => {
                if(data && data.socketId)
                {
                    let partnerName = data.socketId;
                    let videoElem = document.getElementById(`${ partnerName }-video`);
                    if(videoElem) { videoElem.remove(); setTimeout(()=>{SetVideoNameTagPositionSaved();}, 33);};

                }
            } );

            // Do nothing, just reconnect 
            socket.on( 'disconnect', ( data ) => {
                if(hasSessionEnded) return; // dont bother if session is set ended
                reconnecting = true;
                let disconnectelem = document.querySelector(".disconnectioncircle");
                if(disconnectelem) disconnectelem.style.display = 'inline';
                //setTimeout( ()=> { socket.reconnect(); reconnecting = false; if(disconnectelem) disconnectelem.style.display = 'none';}, 3000);
                setTimeout( ()=> { if(!hasSessionEnded) location.reload(); }, 3000);
                setTimeout( ()=> { if(hasSessionEnded && disconnectelem) disconnectelem.style.display = 'none'; }, 300);
            } );

            socket.on( 'disconnectedDismissed', (data) => {
                socket.close();
                myStream = 0;
                socket.destroy();
                EndSession();
                setTimeout( ()=> { EndSession(); alert("You have been disconnected from this session. If you believe this is an error, then you may try to reconnect."); }, 100);
            });

            // Request the client refreshes (will refresh the whole page)
            socket.on( 'requestRefresh', ( data ) => {
                if(data && data.request != 'refresh') return;
                if(hasSessionEnded) return; // dont bother if session is set ended
                sessionStorage.setItem("gt_IsRefreshing", 1);
                reconnecting = true;
                socket.close();
                myStream = 0;
                socket.destroy();
                let disconnectelem = document.querySelector(".disconnectioncircle");
                if(disconnectelem) disconnectelem.style.display = 'inline';
                setTimeout( ()=> { location.reload(); }, 3000);
            } );

            socket.on( 'sdp', async ( data ) => {
                if ( data.description.type === 'offer' ) {
                    data.description ? await pc[data.sender].setRemoteDescription( new RTCSessionDescription( data.description ) ) : '';

                    // not working right or needs to bechecked how this should be working
                    /*if(myStream && hasStream)
                    {
                        if ( !document.getElementById( 'local' ).srcObject ) {
                            //save my stream
                            let stream = myStream;
                            stream.getTracks().forEach( ( track ) => {
                                pc[data.sender].addTrack( track, stream );
                            } );
                            let answer = await pc[data.sender].createAnswer();
                            await pc[data.sender].setLocalDescription( answer );
                            socket.emit( 'sdp', { description: pc[data.sender].localDescription, to: data.sender, sender: socketId } );
                        }
                    }
                    else*/
                    {
                        /*try
                        {
                            stream = await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true,noiseSuppression: true},video: true});
                            if(stream)
                            {
                                if( myVideo !== undefined && myVideo && !myVideo.srcObject ) {
                                helpers.setLocalStream( stream );
                                myStream = stream;
                                }
                                stream.getTracks().forEach( ( track ) => {
                                    pc[data.sender].addTrack( track, stream );
                                } );
                                let answer = await pc[data.sender].createAnswer();
                                await pc[data.sender].setLocalDescription( answer );
                                socket.emit( 'sdp', { description: pc[data.sender].localDescription, to: data.sender, sender: socketId } );
                            }
                        } 
                        catch (err) 
                        {
                            //console.error( err );
                            console.log("SDP: no devices found");
                        }*/

                        navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true,noiseSuppression: true},video: true}).then( async (stream) => {
                            /* if ( myVideo && !myVideo.srcObject ) {
                                 helpers.setLocalStream( stream );
                             }
 
                             //save my stream
                             myStream = stream;*/
                             let currentSender = 0;
                             stream.getTracks().forEach( ( track ) => {
                                currentSender = pc[data.sender].addTrack( track, stream );
                             } );
 
                             let answer = await pc[data.sender].createAnswer();
                             await pc[data.sender].setLocalDescription( answer );
                             if(currentSender)
                             {
                                let maxBitrate = 4000000;
                                let scaleDownFactor = 1.0;
                                let track = stream.getVideoTracks()[0];
                                if(track)
                                {
                                    let sourceWidth = track.getSettings().width;
                                    //if(sourceWidth>1200) scaleDownFactor=1.15;
                                    //if(sourceWidth>1650) scaleDownFactor=1.35;
                                    track.applyConstraints({ frameRate: { max: 30 } });
                                    //await currentSender.setParameters({encodings: [{maxBitrate, scaleResolutionDownBy: scaleDownFactor}]});
                                }
                             }
                             socket.emit( 'sdp', { description: pc[data.sender].localDescription, to: data.sender, sender: socketId } );
                         } ).catch( async ( e ) => {
                             //alert("No microphone or video stream was detected on your machine.")
                             console.log( e );

                             let silence = () => {
                                let ctx = new AudioContext(), oscillator = ctx.createOscillator();
                                let dst = oscillator.connect(ctx.createMediaStreamDestination());
                                oscillator.start();
                                return Object.assign(dst.stream.getAudioTracks()[0], {enabled: false});
                              }
                              
                              let black = ({width = 640, height = 480} = {}) => {
                                let canvas = Object.assign(document.createElement("canvas"), {width, height});
                                canvas.getContext('2d').fillRect(0, 0, width, height);
                                let stream = canvas.captureStream();
                                return Object.assign(stream.getVideoTracks()[0], {enabled: false});
                              }

                              let blackSilence = (...args) => new MediaStream([black(...args), silence()]);

                            let currentSender = 0;
                            stream.getTracks().forEach((track) => {
                                currentSender = pc[data.sender].addTrack( track, stream );
                            });
                            let answer = await pc[data.sender].createAnswer();
                            await pc[data.sender].setLocalDescription( answer );
                            socket.emit( 'sdp', { description: pc[data.sender].localDescription, to: data.sender, sender: socketId } );
                         } );
                    }   
                }
                else if ( data.description.type === 'answer' ) {
                    await pc[data.sender].setRemoteDescription( new RTCSessionDescription( data.description ) );
                }
            } );

            socket.emit( 'subscribe', {
                room: room,
                socketId: socketId,
                userName: stringdisplayname
            } );

        } );

        function init( createOffer, partnerName ) {
            pc[partnerName] = new RTCPeerConnection( servers.getIceServer() );

            if ( screen && screen.getTracks().length ) {
                screen.getTracks().forEach( ( track ) => {
                    pc[partnerName].addTrack( track, screen );//should trigger negotiationneeded event
                } );
            }
            else if ( myStream ) {
                myStream.getTracks().forEach( ( track ) => {
                    pc[partnerName].addTrack( track, myStream );//should trigger negotiationneeded event
                } );
            }
            /*else {
                helpers.getUserFullMedia().then( ( stream ) => {
                    //save my stream
                    myStream = stream;

                    stream.getTracks().forEach( ( track ) => {
                        pc[partnerName].addTrack( track, stream );//should trigger negotiationneeded event
                    } );

                    helpers.setLocalStream( stream );
                    
                } ).catch( ( e ) => {
			        alert('No microphone or video stream was detected.'); 
                    console.error( `stream error: ${ e }` );  // NotFoundError: The object can not be found here.
                } );
            }*/

            //create offer
            if ( createOffer ) {
                pc[partnerName].onnegotiationneeded = async () => {
                    let offer = await pc[partnerName].createOffer();

                    await pc[partnerName].setLocalDescription( offer );

                    socket.emit( 'sdp', { description: pc[partnerName].localDescription, to: partnerName, sender: socketId } );
                };
            }

            //send ice candidate to partnerNames
            pc[partnerName].onicecandidate = ( { candidate } ) => {
                socket.emit( 'ice candidates', { candidate: candidate, to: partnerName, sender: socketId } );
            };

            //add
            pc[partnerName].ontrack = ( e ) => {
                let str = e.streams[0];
                let elem = document.getElementById( `${ partnerName }-video` );
                if (elem) elem.srcObject = str;
                else 
                {
                    //video elem
                    let newVid = document.createElement( 'video' );
                    newVid.id = `${ partnerName }-video`;
                    newVid.setAttribute('class', 'remote-video');
                    //newVid.setAttribute('controls', 'controls'); // note this also shows like a slider thing but I can't really control it
                    addVideoStream(newVid, str);
                }
            };

            // ConnectionStateChange
            pc[partnerName].onconnectionstatechange = ( d ) => {

                //console.log("OnConnectionStateChange: ", d, partnerName, pc[partnerName]);

                switch ( pc[partnerName].iceConnectionState ) {
                    case 'disconnected':
                    case 'failed':
                        helpers.closeVideo( partnerName );
                        break;

                    case 'closed':
                        helpers.closeVideo( partnerName );
                        break;
                }
            };

            // SignalingStateChange
            pc[partnerName].onsignalingstatechange = ( d ) => {

                //console.log("OnSignalingStateChange: ", d, partnerName, pc[partnerName]);

                switch ( pc[partnerName].signalingState ) {
                    case 'closed':
                        console.log( "Signalling state is 'closed'" );
                        helpers.closeVideo( partnerName );
                        break;
                }
            };

        }

        async function DismissCurrentClient(id, socketid) {
            if(socketid == socket.io.engine.id) { return; }
            socketid = socketid.split('-');
            socketid = socketid[0];
            const response = await fetch(servers.getAPIServer() + 'DCC2', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({id: id, room: room, socketid: socketid}),
                });
    
                response.json().then(data => {
                    //console.log(data);
                });
                //socket.emit( 'dismissconnection', { room: room, id: id, socketid: socketId } );
        }

        async function FlipCurrentVideo(id)
        {
            let elem = document.getElementById(id);
            console.log("flipcv", id, elem);
            if(elem)
            {
                let firstvideo = elem; // elem.getElementsByTagName('video')[0];
                if(firstvideo)
                {
                    let style = firstvideo.style;
                    if(firstvideo.style.transform) { firstvideo.style.removeProperty("transform"); }
                    else 
                    {
                        firstvideo.style.setProperty("transform", "scale(1,1)");
                    }
                }
            }
        }

        async function ResizeCurrentVideo(id, larger)
        {
            let elem = document.getElementById(id);
            console.log("resizecv", id, elem);
            if(elem)
            {
                let firstvideo = elem; // elem.getElementsByTagName('video')[0];
                if(firstvideo)
                {
                    let style = firstvideo.style;
                    let width = '400px';
                    if(style.cssText.includes("width")) { width = firstvideo.style.width; }
                    else { width = '' + firstvideo.offsetWidth + 'px'; firstvideo.style.setProperty("width", firstvideo.offsetWidth); }
                    let widthnumber = widthelpers.replace(/\D/g, "");
                    if(widthnumber) widthnumber = parseInt(widthnumber);
                    if(larger)
                    {
                        if(widthnumber>200) widthnumber-=30;
                        firstvideo.style.setProperty("width", '' + widthnumber + 'px');
                    }
                    else
                    {
                        if(widthnumber<700 && widthnumber<window.innerWidth) widthnumber+=30;
                        firstvideo.style.setProperty("width", '' + widthnumber + 'px');
                    }
                }
            }
        }

        async function ResetCurrentVideo(id)
        {
            let elem = document.getElementById(id);
            console.log("resetcv", id, elem);
            if(elem)
            {
                let firstvideo = elem; // elem.getElementsByTagName('video')[0];
                if(firstvideo)
                {
                    firstvideo.style.removeProperty('width');
                    firstvideo.style.removeProperty('transform');
                    //firstvideo.style = '';
                }
            }
        }

        // from internet
        function enterFullScreen(element) {
            if(element.requestFullscreen) {
              element.requestFullscreen();
            }else if (element.mozRequestFullScreen) {
              element.mozRequestFullScreen();     // Firefox
            }else if (element.webkitRequestFullscreen) {
              element.webkitRequestFullscreen();  // Safari
            }else if(element.msRequestFullscreen) {
              element.msRequestFullscreen();      // IE/Edge
            }
          };

        async function FullScreenCurrentVideo(id)
        {
           
            let elem = document.getElementById(id);
            console.log("fullscreencv", id, elem);
            if(elem)
            {
                let firstvideo = elem; //elem.getElementsByTagName('video')[0];
                if(firstvideo)
                {
                    enterFullScreen(firstvideo);
                }
            }
        }

        function shareScreen() {

            if(isSharingScreen) return; // Already maintained that we are sharing the screen by this method, so don't allow it again until this is ended
            

            helpers.shareScreen().then( ( stream ) => {
                //helpers.toggleShareIcons( true );

                //disable the video toggle btns while sharing screen. This is to ensure clicking on the btn does not interfere with the screen sharing
                //It will be enabled was user stopped sharing screen
                //helpers.toggleVideoBtnDisabled( true );

                //save my screen stream
                screen = stream;

                //share the new stream with all partners
                broadcastNewTracks( stream, 'local', false );

                // set our local vid to show
                let localVidElem = document.getElementById( 'local' );
                if(localVidElem)
                {
                    /*let firstvideo = elem.getElementsByTagName('video')[0]; // only need this if using a div to contain the local vid
                    if(firstvideo) 
                    {
                        localVidElem = firstvideo;
                        localVidElem.srcObject = stream;
                        isSharingScreen = true;
                    }*/
                    //localVidElem = firstvideo;
                    localVidElem.srcObject = stream;
                    isSharingScreen = true;
                }
                //clientScreenShareLastTiming = curTick;

                // Remove additional button, if needed
                let elem2 = document.querySelector("#shareScreenButton2");
                if(elem2) elem2.style.display = 'none';

                //When the stop sharing button shown by the browser is clicked
                screen.getVideoTracks()[0].addEventListener( 'ended', () => {
                    stopSharingScreen();
                } );
            } ).catch( ( e ) => {
                console.error( e );
            } );
        }

        function stopSharingScreen() {
            //enable video toggle btn
            //helpers.toggleVideoBtnDisabled( false );

            return new Promise( ( res, rej ) => {
                screen.getTracks().length ? screen.getTracks().forEach( track => track.stop() ) : '';

                res();
            } ).then( () => {
                //helpers.toggleShareIcons( false );
                broadcastNewTracks( myStream, 'video' );

                // set our local vid back to original stream
                let localVidElem = document.getElementById( 'local' );
                if(localVidElem)
                {
                    /*let firstvideo = elem.getElementsByTagName('video')[0];
                    if(firstvideo) 
                    {
                        localVidElem = firstvideo;
                        localVidElem.srcObject = stream;
                        isSharingScreen = true;
                    }*/
                    localVidElem.srcObject = myStream;
                    isSharingScreen = false;
                }

            } ).catch( ( e ) => {
                console.error( e );
            } );
        }

        function broadcastNewTracks( stream, type, mirrorMode = true ) {
            helpers.setLocalStream( stream, mirrorMode );

            let track = type == 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];

            for ( let p in pc ) {
                let pName = pc[p];

                if ( typeof pc[pName] == 'object' ) {
                    helpers.replaceTrack( track, pc[pName] );
                }
            }
        }

        function toggleRecordingIcons( isRecording ) {
            let e = document.getElementById( 'record' );

            if ( isRecording ) {
                e.setAttribute( 'title', 'Stop recording' );
                e.children[0].classList.add( 'text-danger' );
                e.children[0].classList.remove( 'text-white' );
            }

            else {
                e.setAttribute( 'title', 'Record' );
                e.children[0].classList.add( 'text-white' );
                e.children[0].classList.remove( 'text-danger' );
            }
        }

        function startRecording( stream ) {
            mediaRecorder = new MediaRecorder( stream, {
                mimeType: 'video/webm;codecs=vp9'
            } );

            mediaRecorder.start( 1000 );
            toggleRecordingIcons( true );

            mediaRecorder.ondataavailable = function ( e ) {
                recordedStream.push( e.data );
            };

            mediaRecorder.onstop = function () {
                toggleRecordingIcons( false );

                helpers.saveRecordedStream( recordedStream, username );

                setTimeout( () => {
                    recordedStream = [];
                }, 3000 );
            };

            mediaRecorder.onerror = function ( e ) {
                console.error( e );
            };
        }

        function fadeeffect1()
        {
            let elem = document.querySelector("#fadetoblack1");
            if(elem)
            {
                elem.style.opacity=0.9;
                elem.style.removeProperty('display');
                setTimeout( ()=> {elem.style.opacity=0.85} , 100 );
                setTimeout( ()=> {elem.style.opacity=0.80} , 200 );
                setTimeout( ()=> {elem.style.opacity=0.75} , 300 );
                setTimeout( ()=> {elem.style.opacity=0.70} , 400 );
                setTimeout( ()=> {elem.style.opacity=0.60} , 500 );
                setTimeout( ()=> {elem.style.opacity=0.50} , 600 );
                setTimeout( ()=> {elem.style.opacity=0.45} , 700 );
                setTimeout( ()=> {elem.style.opacity=0.40} , 800 );
                setTimeout( ()=> {elem.style.opacity=0.35} , 900 );
                setTimeout( ()=> {elem.style.opacity=0.30} , 1000 );
                setTimeout( ()=> {elem.style.opacity=0.25} , 1100 );
                setTimeout( ()=> {elem.style.opacity=0.20} , 1200 );
                setTimeout( ()=> {elem.style.opacity=0.15} , 1300 );
                setTimeout( ()=> {elem.style.opacity=0.10} , 1400 );
                setTimeout( ()=> {elem.style.opacity=0.05;elem.style.display='none';} , 1550 );
             }
        }

        // Buttons/User Events // =================================================================================
        //When the mute icon is clicked
        let text = document.querySelector("#chat_message");
        let send = document.getElementById("send");
        let messages = document.querySelector(".messages");
        let closeheader = document.querySelector("#closeheader");

        // Send chat msg with roomID, msg, username
        send.addEventListener("click", (e) => {
        if (text.value.length !== 0) {
            socket.emit("message", { room: room, message: text.value, username: user });
            CreateChatMessage({userName: username, message:text.value});
            text.value = "";
        }
        });
        text.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && text.value.length !== 0) {
            socket.emit("message", { room: room, message: text.value, username: user });
            CreateChatMessage({userName: username, message:text.value});
            text.value = "";
        }
        });
        const CreateChatMessage = (data) => {
            let userNameTemp = data.userName;
            if(/\d/.test(userNameTemp)) userNameTemp.slice(0,-2);
            if(userNameTemp.includes('_')) 
            {
                let splitarr = userNameTemp.split('_');
                userNameTemp = splitarr[1];
            }
            messages.innerHTML =
            messages.innerHTML +
            `<div class="message">
                <b><i class="far fa-user-circle"></i> <span> ${
                data.userName === username ? "me" : userNameTemp
                }</span> </b>
                <span>${data.message}</span>
            </div>`;
        };
        socket.on("createMessage", (data) => {
            CreateChatMessage(data);
            helpers.toggleChatNotificationBadge();
            sounds.beep();
        });

        const inviteButton = document.querySelector("#inviteButton");
        const muteButton = document.querySelector("#muteButton");
        const stopVideo = document.querySelector("#stopVideo");
        let html = '';
        muteButton.addEventListener("click", () => {
        //if(myStream.getVideoTracks === undefined) location.reload(); // reloadif our stream is dead
        const enabled = myStream.getAudioTracks()[0].enabled;
        if (enabled) {
            myStream.getAudioTracks()[0].enabled = false;
            html = `<i class="fas fa-microphone-slash"></i>`;
            muteButton.classList.toggle("background__red");
            muteButton.innerHTML = html;
        } else {
            myStream.getAudioTracks()[0].enabled = true;
            html = `<i class="fas fa-microphone"></i>`;
            muteButton.classList.toggle("background__red");
            muteButton.innerHTML = html;
        }
        });

        stopVideo.addEventListener("click", () => {
        const enabled = myStream.getVideoTracks()[0].enabled;
        if (enabled) {
            myStream.getVideoTracks()[0].enabled = false;
            html = `<i class="fas fa-video-slash"></i>`;
            stopVideo.classList.toggle("background__red");
            stopVideo.innerHTML = html;
        } else {
            myStream.getVideoTracks()[0].enabled = true;
            html = `<i class="fas fa-video"></i>`;
            stopVideo.classList.toggle("background__red");
            stopVideo.innerHTML = html;
        }
        });

        inviteButton.addEventListener("click", (e) => {
        navigator.clipboard.writeText(window.location.href).then().catch(e => console.log(e));
        prompt(
            "Link has been copied! Send it to people you want to meet with",
            window.location.href
        );
        });
        backBtn.addEventListener("click", () => {
            if(window.outerWidth<1080) // mobile
            {
                document.querySelector(".main__left").style.display = "flex";
                document.querySelector(".main__left").style.flex = "1";
                document.querySelector(".main__right").style.display = "none";
                document.querySelector(".main__right").style.flex = "1";
                document.querySelector(".header__back").style.display = "none";
                document.querySelector(".header__back2").style.display = "none";
                document.querySelector("#headertitletext").style['margin-left'] = '5%';
                document.querySelector("#headertitletext").style['display'] = 'inline-block';
                document.querySelector("#headerTimerDisplay").style['margin-left'] = '5%';
                
                let elemBigButton = document.querySelector(".largescreen__options");
                if(elemBigButton && TherapistUser) elemBigButton.style.display = 'flex';
            }
            else
            {
                document.querySelector(".main__right").style.display = "none";
                document.querySelector(".main__right").style.flex = "1";
                document.querySelector(".main__left").style.flex = "1";
                document.querySelector(".header__back").style.display = "none";
                document.querySelector(".header__back2").style.display = "none";

                let elemBigButton = document.querySelector(".largescreen__options");
                if(elemBigButton && TherapistUser) elemBigButton.style.display = 'flex';

                showChat.style.display = 'flex';
                ArrangeSidebarHandler();
            }

            SetVideoNameTagPositionSaved();
        });

        backBtn2.addEventListener("click", () => {
            if(window.outerWidth<1080) // mobile
            {
                document.querySelector(".main__left").style.display = "flex";
                document.querySelector(".main__left").style.flex = "1";
                document.querySelector(".main__right").style.display = "none";
                document.querySelector(".header__back").style.display = "none";
                document.querySelector(".header__back2").style.display = "none";
                document.querySelector("#headertitletext").style['margin-left'] = '5%';
                document.querySelector("#headertitletext").style['display'] = 'inline-block';
                document.querySelector("#headerTimerDisplay").style['margin-left'] = '5%';

                let elemBigButton = document.querySelector(".largescreen__options");
                if(elemBigButton && TherapistUser) elemBigButton.style.display = 'flex';
            }
            else
            {
                document.querySelector(".main__right").style.display = "none";
                document.querySelector(".main__left").style.flex = "1";
                document.querySelector(".header__back").style.display = "none";
                document.querySelector(".header__back2").style.display = "none";

                let elemBigButton = document.querySelector(".largescreen__options");
                if(elemBigButton && TherapistUser) elemBigButton.style.display = 'flex';

                showChat.style.display = 'flex';
                ArrangeSidebarHandler();
            }

            SetVideoNameTagPositionSaved();
        });
          
        showChat.addEventListener("click", () => {

            if(window.outerWidth<1080) // mobile
            {
                document.querySelector(".main__right").style.display = "flex";
                document.querySelector(".main__right").style.flex = "1";
                document.querySelector(".main__left").style.display = "none";
                document.querySelector(".header__back").style.display = "block";
                document.querySelector(".header__back2").style.display = "none";
                document.querySelector("#headertitletext").style['margin-left'] = '14%';
                document.querySelector("#headertitletext").style['display'] = 'none';
                document.querySelector("#headerTimerDisplay").style['margin-left'] = '25%';
                helpers.toggleChatNotificationBadge(true);

                let elemBigButton = document.querySelector(".largescreen__options");
                if(elemBigButton) elemBigButton.style.display = 'none';
            }
            else
            {
                document.querySelector(".main__right").style.display = "flex";
                document.querySelector(".main__right").style.flex = "0.20";
                document.querySelector(".main__left").style.flex = "0.85";
                document.querySelector(".header__back2").style.display = "block";
                helpers.toggleChatNotificationBadge(true);

                showChat.style.display = 'none';
                ArrangeSidebarHandler();
            }

            SetVideoNameTagPositionSaved();
        });

        function SetChatBoxOffByDefault()
        {
            document.querySelector(".main__right").style.display = "none";
            document.querySelector(".main__left").style.flex = "1";
            document.querySelector(".header__back").style.display = "none";
            document.querySelector(".header__back2").style.display = "none";

            let elemBigButton = document.querySelector(".largescreen__options");
            if(elemBigButton && TherapistUser) elemBigButton.style.display = 'flex';

            showChat.style.display = 'flex';
        }

        function SetLargeButtonsOffByDefault()
        {
            let elemBigButton = document.querySelector(".largescreen__options");
            if(elemBigButton) elemBigButton.style.display = 'none';
        }

        // Any onresize event?
        addEventListener("resize", (event) => {
            helpers.toggleChatNotificationBadge(false,true);
            ArrangeSidebarHandler();
            //VideoOrientationFix();

            SetVideoNameTagPositionSaved();
        });

        // headertitletext/counter change
        /*function recursiveRoomTextCounter(curTime) {
            let elemcounter = document.querySelector("#roomtitlecounter");

            if(elemcounter) 
            {
                elemcounter.innerHTML = curTime;
            }
            else
            {
                let elemtext = document.querySelector("#headertitletext");
                if(elemtext) 
                {
                    elemtext.innerHTML = "Please wait, you are in the waiting room. <br/><i style='font-size:14px;margin-top:-6px;'>(removing message in <span id='roomtitlecounter'>" + curTime + "</span>)</i>";
                }
            }
            if(curTime <= 0) 
            {
                let elemtext = document.querySelector("#headertitletext");
                if(elemtext) 
                {
                    elemtext.innerHTML = '';
                    elemtext.style.display = 'none';
                }
                let elemheader = document.querySelector(".header");
                if(elemheader)
                {
                    elemheader.style.height = '0vh !important'; // remove top part
                    elemheader.style.display = 'none';
                }
                ArrangeSidebarFix('2vh');
                return;
            }

            setTimeout( () => {
                if(curTime > 0) 
                {   
                    curTime--;
                    recursiveRoomTextCounter(curTime);
                }
            }, 1000 );
        };
        recursiveRoomTextCounter(0);
        closeheader.addEventListener("click", () => { // Closes header
            recursiveRoomTextCounter(0);
            ArrangeSidebarFix('2vh');
        });*/

        // Arrange sidebar top
        function ArrangeSidebarTop()
        {
            let sideAdjust = 0;
            let elemHeader = document.querySelector(".header");
            let elemHeaderHeight = '1vh';
            if(elemHeader)
            {
                let curHeaderStyle = getComputedStyle(elemHeader);
                elemHeaderHeight = curHeaderStyle.height;
            }
            let elemOptionsLeft = document.querySelector(".options__left");
            if(elemOptionsLeft && elemOptionsLeft.children.length)
            {
                for(let i=0;i<elemOptionsLeft.children.length;i++)
                {
                    let elem = elemOptionsLeft.children[i];
                    if(!elem) continue;
                    let getStyle = getComputedStyle(elem);
                    if(getStyle && getStyle.display == 'none') continue;
                    elem.style.top = 'calc(' + '10px' + ' + ' + elemHeaderHeight + ')';
                    elem.style['left'] = 'calc(' + '6px' + ' + ' + sideAdjust + 'px)';
                    sideAdjust+=60;
                    elem.style.position = 'fixed'
                }
            }
    
            let elemOptionsRight = document.querySelector(".options__right");
            if(elemOptionsRight && elemOptionsRight.children.length)
            {
                for(let i=0;i<elemOptionsRight.children.length;i++)
                {
                    let elem = elemOptionsRight.children[i];
                    if(!elem) continue;
                    let getStyle = getComputedStyle(elem);
                    if(getStyle && getStyle.display == 'none') continue;
                    elem.style.top = 'calc(' + '10px' + ' + ' + elemHeaderHeight + ')';
                    elem.style['left'] = 'calc(' + '6px' + ' + ' + sideAdjust + 'px)';
                    sideAdjust+=60;
                    elem.style.position = 'fixed'
                }
            }

            let elemEndSessionButton = document.querySelector("#endSessionButton2");
            if(elemEndSessionButton)
            {
                let elem = elemEndSessionButton;
                if(elem)
                {
                    elem.style.top = "-24px";
                }
            }
        }

        // Fixed Sidenavbar arrangement
        function ArrangeSidebarFix(heightStart = 0)
        {
            let heightAdjust = 0;
            if(heightStart) heightStart = heightStart;
            else heightStart = '16vh';
            let elemHeader = document.querySelector(".header");
            let elemHeaderHeight = '1vh';
            if(elemHeader)
            {
                let curHeaderStyle = getComputedStyle(elemHeader);
                elemHeaderHeight = curHeaderStyle.height;
            }
            let elemOptionsLeft = document.querySelector(".options__left");
            if(elemOptionsLeft && elemOptionsLeft.children.length)
            {
                for(let i=0;i<elemOptionsLeft.children.length;i++)
                {
                    let elem = elemOptionsLeft.children[i];
                    if(!elem) continue;
                    let getStyle = getComputedStyle(elem);
                    if(getStyle && getStyle.display == 'none') continue;
                    elem.style['top'] = 'calc(' + heightStart + ' + ' + elemHeaderHeight + ' + ' + heightAdjust + 'px)';
                    heightAdjust+=60;
                    elem.style.position = 'fixed';
                    elem.style.left = '0';
                }
            }
    
            let elemOptionsRight = document.querySelector(".options__right");
            if(elemOptionsRight && elemOptionsRight.children.length)
            {
                for(let i=0;i<elemOptionsRight.children.length;i++)
                {
                    let elem = elemOptionsRight.children[i];
                    if(!elem) continue;
                    let getStyle = getComputedStyle(elem);
                    if(getStyle && getStyle.display == 'none') continue;
                    elem.style['top'] = 'calc(' + heightStart + ' + ' + elemHeaderHeight + '+' + heightAdjust + 'px)';
                    heightAdjust+=60;
                    elem.style.position = 'fixed';
                    elem.style.left = '0';
                }
            }

            let elemEndSessionButton = document.querySelector("#endSessionButton2");
            if(elemEndSessionButton)
            {
                let elem = elemEndSessionButton;
                if(elem)
                {
                    elem.style.top = "-24px";
                }
            }
        }
        //ArrangeSidebarFix('2vh');

        function ArrangeSidebarBottom()
        {
            let elemOptionsLeft = document.querySelector(".options__left");
            if(elemOptionsLeft && elemOptionsLeft.children.length)
            {
                for(let i=0;i<elemOptionsLeft.children.length;i++)
                {
                    let elem = elemOptionsLeft.children[i];
                    if(!elem) continue;
                    let getStyle = getComputedStyle(elem);
                    if(getStyle && getStyle.display == 'none') continue;
                    elem.style.top = '';
                    elem.style.position = ''
                }
            }
    
            let elemOptionsRight = document.querySelector(".options__right");
            if(elemOptionsRight && elemOptionsRight.children.length)
            {
                for(let i=0;i<elemOptionsRight.children.length;i++)
                {
                    let elem = elemOptionsRight.children[i];
                    if(!elem) continue;
                    let getStyle = getComputedStyle(elem);
                    if(getStyle && getStyle.display == 'none') continue;
                    elem.style.top = '';
                    elem.style.position = '';
                }
            }

            let elemEndSessionButton = document.querySelector("#endSessionButton2");
            if(elemEndSessionButton)
            {
                let elem = elemEndSessionButton;
                if(elem)
                {
                    elem.style.top = "-76px";
                }
            }
        }

        function ArrangeSidebarHandler()
        {
            if(roomStatus&4) // Arrange buttons on bottom
            {
                ArrangeSidebarBottom();
            }
            else if(roomStatus&8) // Arrange buttons on top(placeholder)
            {
                ArrangeSidebarTop();
            }
            else ArrangeSidebarFix('2vh'); // Arrange buttons on left (default)
        }

        function SetVideoNameTagPositionSaved()
        {
            let videos = videoList;
            if(!videos) return;
            for(let i=0;i<videos.length;i++)
            {
                let videoobj = videos[i];
                if(!videoobj) continue;
                let elem = videoobj.video;
                if(!elem) continue;
                let id = videoobj.id;
                
                let video = elem;
                let nameTagElem = document.getElementById('' + video.id + '-nametag');
                if(!video.id && !nameTagElem) 
                {
                    id = id.substring(0, id.length-6);
                    nameTagElem = document.getElementById('' + id + '-nametag');
                }
    
                let width = video.offsetWidth;
                let height = video.offsetHeight;
                //console.log(width, height, video.id, id);
                if(nameTagElem)
                {
                    if(video.id.includes("local"))
                    {
                        let height2 = height / 20;
                        let innerText = nameTagElem.innerHTML;
                        let width2 = width / 2;
                        let widthadjust = width / 35;
                        if(width2>300) width2 *= width/94;
                        if(innerText) width2 -= (innerText.length*2.85);
                        var viewportOffset = video.getBoundingClientRect();
                        // these are relative to the viewport, i.e. the window
                        var top = viewportOffset.top + 8;
                        var left = viewportOffset.left + widthadjust;
                        //console.log("resize1", height2, width2, top, left);
                        width2 -= (width2-left);
                        //nameTagElem.style = "position: absolute;display:block;margin-top:10px;margin-left:-"+width2+"px;color:cyan;font-weight:600;";
                        nameTagElem.style = "position: absolute;display:block;margin-top:"+top+"px;margin-left:"+left+"px;color:cyan;font-weight:600;top:0;left:0;";
                        //nameTagElem.innerHTML = stringdisplayname;
                    }
                    else
                    {
                        let height2 = height;
                        let innerText = nameTagElem.innerHTML;
                        let width2 = width / 17;
                        if(innerText) width2 += (innerText.length/2);
                        //console.log("resize2", height2, width2);
                        nameTagElem.style = "position: absolute;display:block;margin-top:-"+height2+"px;margin-left:"+width2+"px;color:cyan;font-weight:600;";
                    }
                }


            }
        }

        function VideoOrientationFix()
        {
            let elemVideos = document.querySelectorAll('video');
            let orientation = 0; 
            if(window.orientation !== undefined) orientation = window.orientation;
            else orientation = window.screen.orientation || window.screen.mozOrientation || window.screen.msOrientation;
            console.log("New orientation:", orientation.angle);
            if(elemVideos && elemVideos.length)
            {
                for(let i=0;i<elemVideos.length;i++)
                {
                    let elemVideo = elemVideos[i];
                    if(!elemVideo || elemVideo.hidden) continue;

                    if(orientation.angle !== undefined)
                    {
                        elemVideo.style['-moz-transform'] = 'rotate(' + orientation.angle + 'deg)';
                        elemVideo.style['-webkit-transform'] = 'rotate(' + orientation.angle + 'deg)';
                        elemVideo.style['-o-transform'] = 'rotate(' + orientation.angle + 'deg)';
                        elemVideo.style['-ms-transform'] = 'rotate(' + orientation.angle + 'deg)';
                        elemVideo.style['transform'] = 'rotate(' + orientation.angle + 'deg)';
                    }
                    else if (orientation.includes('andscape'))
                    {
                        elemVideo.style['-moz-transform'] = 'rotate(90deg)';
                        elemVideo.style['-webkit-transform'] = 'rotate(90deg)';
                        elemVideo.style['-o-transform'] = 'rotate(90deg)';
                        elemVideo.style['-ms-transform'] = 'rotate(90deg)';
                        elemVideo.style['transform'] = 'rotate(90deg)';
                    }
                    else if (orientation.includes('ortrait'))
                    {
                        elemVideo.style['-moz-transform'] = 'rotate(0deg)';
                        elemVideo.style['-webkit-transform'] = 'rotate(0deg)';
                        elemVideo.style['-o-transform'] = 'rotate(0deg)';
                        elemVideo.style['-ms-transform'] = 'rotate(0deg)';
                        elemVideo.style['transform'] = 'rotate(0deg)';
                    }
                }
            }
        }

        // Get client status (sockets, recursively)
        /*function requestClientStatusRecursive()
        {
            setTimeout(()=> {
                if(socketId) socket.emit('requestClientStatus', {to: socketId, room: room});
                requestClientStatusRecursive();
            }, 5000);
        }*/

        // Set welcome message
        function AddWelcomeMessage(username)
        {
            let elem = document.querySelector("#headertitletext");
            /*if(elem && username)
            {
                elem.innerHTML = "Welcome " + username + "!";
            }*/

        }

        // Set/handle Users Waiting icon on the top
        function SetUsersWaitingInWaitingRoom()
        {
            let elem = document.querySelector("#headertitletext");
            if(elem)
            {
                if((roomStatus&16)) { elem.innerHTML = "<div style='color:green;'>A user is in the waiting room. <i class='fa fa-user-plus'>Click to allow any users in.</i></div>"; }
                else elem.innerHTML = "";
            }
        }

        // Set client status 
        async function requestClientStatusChange(newStatus)
        {
            const response = await fetch(servers.getAPIServer() + 'SCS', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({checksum: TherapistUser, room: room, status: newStatus}),
            });
           
            /*response.then(data => {
                console.log(data);
            });*/
        }

        // Get Therapist username
        async function getTherapistUsername()
        {
            const response = await fetch(servers.getAPIServer() + 'GTUN', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({checksum: TherapistUser}),
            });
    
            response.json().then(data => {
                if(data.name.length>1) 
                {
                    hasTherapistUsrName = true;
                    data.name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
                    stringdisplayname = data.name;
                    username += '_' + data.name;
                    user += '_' + data.name;

                    // Add welcome message
                    AddWelcomeMessage(data.name);
                }
            });
        }

         // Get Client username
         async function getClientUsername()
         {
             const response = await fetch(servers.getAPIServer() + 'GCUN', {
                 method: 'POST',
                 headers: {
                   'Accept': 'application/json',
                   'Content-Type': 'application/json'
                 },
                 body: JSON.stringify({roomid: room}),
             });
     
             response.json().then(data => {
                 if(data.name.length>1) 
                 {
                    hasTherapistUsrName = true;
                    //let spaceIndex = data.name.indexOf(' ');
                    //if(spaceIndex>0) data.name = data.name.substring(0, spaceIndex);
                    data.name = data.name.charAt(0).toUpperCase() + data.name.slice(1);
                    stringdisplayname = data.name;
                    username += '_' + data.name;
                    user += '_' + data.name;

                    // Add welcome message
                    AddWelcomeMessage(data.name);
                 }
             });
         }


        // Setup nametags for videos
        async function setupNametags(data)
        {

            return;
            if(!data) return;

            // Setup local nametag if needed
            let localvidelem = document.getElementById("local");
            let localvidtagelem = document.getElementById("local-nametag");
            if(localvidelem)
            {
                if(!localvidtagelem)
                {
                    let container = localvidelem;
                    let namediv = document.createElement("div");
                    let height = localvidelem.offsetHeight / 20;
                    let width = localvidelem.offsetWidth / 2 - (stringdisplayname.length*2.85);
                    let widthadjust = localvidelem.offsetWidth / 35;
                    if(localvidelem.offsetWidth>300) width *= width/130;

                    var viewportOffset = localvidelem.getBoundingClientRect();
                    // these are relative to the viewport, i.e. the window
                    var top = viewportOffset.top + 8;
                    var left = viewportOffset.left + widthadjust;
                    //console.log(height, width, top, left);
                    width -= (width-left);

                    namediv.id = "local-nametag";
                    namediv.classList.add("nametag");
                    //namediv.style = "position: absolute;display:block;margin-top:10px;margin-left:-"+width+"px;color:cyan;font-weight:600;";
                    namediv.style = "position: absolute;display:block;margin-top:"+top+"px;margin-left:"+left+"px;color:cyan;font-weight:600;top:0;left:0;";
                    namediv.innerHTML = stringdisplayname;
                    container.after(namediv);
                }
            }

            for(let i=0;i<data.length;i++)
            {
                let curObj = data[i];
                if(!curObj) continue;

                let container = document.getElementById('' + curObj.socketID + '-video');
                if(!container) continue;

                /*let firstvideo = container.getElementsByTagName('video')[0];
                
                let vidtagelem = document.getElementById("" + curObj.socketID + "-nametag");
                if(!vidtagelem)
                {
                    let namediv = document.createElement("div");
                    namediv.id = "" + curObj.socketID + "-nametag";
                    namediv.classList.add("nametag");
                    let height = firstvideo.offsetHeight;
                    let width = firstvideo.offsetWidth / 17 + (curObj.username.length/2);
                    //console.log(height, width);
                    namediv.style = "position: absolute;display:block;margin-top:-"+height+"px;margin-left:"+width+"px;color:cyan;font-weight:600;";
                    namediv.innerHTML = curObj.username;
                    container.appendChild(namediv);
                }*/
                
                let videlem = container;
                let height = videlem.offsetHeight / 20;
                let width = videlem.offsetWidth / 2 - (stringdisplayname.length*2.85);
                let widthadjust = videlem.offsetWidth / 35;
                if(videlem.offsetWidth>300) width *= width/130;

                var viewportOffset = videlem.getBoundingClientRect();
                // these are relative to the viewport, i.e. the window
                var top = viewportOffset.top + 8;
                var left = viewportOffset.left + widthadjust;
                //console.log(height, width, top, left);
                width -= (width-left);

                let namediv = document.createElement("div");
                namediv.id = "" + curObj.socketID + "-nametag";
                namediv.classList.add("nametag");
                //namediv.style = "position: absolute;display:block;margin-top:10px;margin-left:-"+width+"px;color:cyan;font-weight:600;";
                namediv.style = "position: absolute;display:block;margin-top:"+top+"px;margin-left:"+left+"px;color:cyan;font-weight:600;top:0;left:0;";
                namediv.innerHTML = stringdisplayname;
                container.after(namediv);
            }
        }

        // Get username to socket list for this room (maintained on server)
        async function getSocketUsernames()
        {
            const response = await fetch(servers.getAPIServer() + 'GUS', {
                method: 'POST',
                headers: {
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                body: JSON.stringify({room: room}),
            });
    
            response.json().then(data => {
                //console.log(data);
                setupNametags(data);
            });
        }

        // Get client status 
        async function requestClientStatus()
        {
            let response = await fetch(servers.getAPIServer() + 'GCSR', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({to: socketId, room: room}),
            });

            let resolvedata = await response.json();
            return resolvedata;
        }

        // Get client status (recursively)
        async function requestClientStatusRecursive()
        {
            const response = await fetch(servers.getAPIServer() + 'GCSR', {
            method: 'POST',
            headers: {
              'Accept': 'application/json',
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({to: socketId, room: room}),
            });

            response.json().then(data => {
                //console.log(data);
                if(data.status != roomStatus)
                {
                    roomStatus = data.status;
                    handleClientStatusRecv();
                }
                if(!TherapistUser) HandleClientScreenShare();
                if(TherapistUser) 
                {
                sendWaitingRoomPulse();
                //SetUsersWaitingInWaitingRoom();
                }
                
                setTimeout(()=> {
                    requestClientStatusRecursive();
                }, 1200);
            });
        }

        // Check hippa compliance (recursively)
        async function checkHippaComplianceRecursive()
        {
            let elem = document.querySelector("#hippaComplianceModal");
            if(elem)
            {
                if(elem.style.cssText && elem.style.display == "none") return true;
                else 
                {
                    setTimeout(()=> {
                        checkHippaComplianceRecursive();
                    }, 500);
                    return false;
                }
            }
        }

        // Client screenshare on, if the videostream is already active and if the status is allowing it
        function HandleClientScreenShare()
        {
            if(!myStream) return;

            let elem = document.querySelector("#shareScreenButton2");
            let elem2 = document.querySelector(".largescreen__options");
            if(elem)
            {
                if((roomStatus&256)!=0 && !TherapistUser && !isSharingScreen)
                {
                    elem.style.display = 'block';
                    if(elem2) elem2.style.display = 'flex';
                }

                //if((roomStatus&256)==0)
                //{
                //    elem.style.display = 'none';
                //}
            }
        }
        const otherScreenshareButton = document.querySelector("#shareScreenButton2");
        otherScreenshareButton.addEventListener("click", () => {
            shareScreen();
        });

        // Change the look of the room and css variables if needed
        function ChangeRoomLook()
        {
            if((roomStatus&512)!=0) // Simple theme
            {
                document.documentElement.style.setProperty("--main-dark", "rgb(255,255,255)");
                document.documentElement.style.setProperty("--main-darklg", "rgb(245, 245, 220)");
                document.documentElement.style.setProperty("--primary-color", "rgb(47, 128, 236)");
            }
            else if((roomStatus&1024)!=0) // Darken/Black Theme
            {
                document.documentElement.style.setProperty("--main-dark", "black");
                document.documentElement.style.setProperty("--main-darklg", "black");
                document.documentElement.style.setProperty("--primary-color", "black");
            }
            else
            {
                document.documentElement.style.setProperty("--main-dark", "rgb(22, 29, 41)");
                document.documentElement.style.setProperty("--main-darklg", "rgb(29, 38, 53)");
                document.documentElement.style.setProperty("--primary-color", "rgb(47, 128, 236)");
            }
        }

        // Handle reception of client status
        function handleClientStatusRecv()
        {
            ArrangeSidebarHandler();
            CheckSessionEnded();
            if(outOfWaitingRoom) HandleTimerDisplay();
            ChangeRoomLook();
        }

        // Maintain modal for options/streaming options for video
        const streamingOptionsCloseButton = document.querySelector("#streamingOptionsCloseButton");
        function OpenStreamingOptions()
        {
            let getModal = document.querySelector("#streamingOptionsModal");
            if(getModal) 
            {
                let calcedStyle = getComputedStyle(getModal);
                if(calcedStyle.display != 'block') getModal.style.display = "block";
                else getModal.style.display = "none"; 
            }
        }
        streamingOptionsCloseButton.onclick = function()
        {
            let getModal = document.querySelector("#streamingOptionsModal");
            if(getModal) getModal.style.display = "none";
        }

        // Change video volume by ID
        function changeVideoVolume(currentSelectedVideo, newAmount)
        {
            console.log("changevideovolume", currentSelectedVideo, newAmount);
            if(!currentSelectedVideo) return;
            currentSelectedVideo.volume = newAmount;
        }

        // Maintain modal for options/streaming options for other person's video
        const streamingOptionsCloseButton2 = document.querySelector("#streamingOptionsCloseButton2");
        function OpenOtherStreamingOptions(e)
        {
            //console.log(e);
            let videoID = e.target.id;
            if(!videoID) return;

            // Set current video target for functions
            currentSelectedVideo = e.target;

            // Display other therapist options if allowed
            if(TherapistUser)
            {
                let hiddenTherapistOtherButtons = document.getElementsByClassName("otherTherapistOptions"); 
                if(hiddenTherapistOtherButtons)
                {
                    for(let i=0;i<hiddenTherapistOtherButtons.length;i++)
                    {
                        let curElem = hiddenTherapistOtherButtons[i];
                        if(!curElem) continue;
                        curElem.style.display = 'block';
                    }
                }
            }

            // Display modal
            let getModal = document.querySelector("#streamingOptionsModal2");
            if(getModal) 
            {
                let calcedStyle = getComputedStyle(getModal);
                if(calcedStyle.display != 'block') getModal.style.display = "block";
                else getModal.style.display = "none"; 
            }
        }
        streamingOptionsCloseButton2.onclick = function()
        {
            let getModal = document.querySelector("#streamingOptionsModal2");
            if(getModal) getModal.style.display = "none";
        }

        const optionsOtherMirrorButton = document.querySelector("#optionsButtonMirror");
        const optionsOtherSmallerButton = document.querySelector("#optionsButtonLarger");
        const optionsOtherLargerButton = document.querySelector("#optionsButtonSmaller");
        const optionsOtherFullscreenButton = document.querySelector("#optionsButtonFullScreen");
        const optionsOtherResetButton = document.querySelector("#optionsButtonReset");
        const optionsOtherVolumeButton = document.querySelector("#streamingOptionsModal2volume");
        const optionsOtherDismissButton = document.querySelector("#optionsButtonRemoveClient");
        optionsOtherMirrorButton.onclick = function()
        {
            FlipCurrentVideo(currentSelectedVideo.id);
        }
        optionsOtherSmallerButton.onclick = function()
        {
            ResizeCurrentVideo(currentSelectedVideo.id, false);
        }
        optionsOtherLargerButton.onclick = function()
        {
            ResizeCurrentVideo(currentSelectedVideo.id, true);
        }
        optionsOtherFullscreenButton.onclick = function()
        {
            FullScreenCurrentVideo(currentSelectedVideo.id);
        }
        optionsOtherResetButton.onclick = function()
        {
            ResetCurrentVideo(currentSelectedVideo.id);
        }
        optionsOtherVolumeButton.onchange = function()
        {
            changeVideoVolume(currentSelectedVideo, optionsOtherVolumeButton.volume);
        }
        optionsOtherDismissButton.onclick = function()
        {
            DismissCurrentClient(TherapistUser, currentSelectedVideo.id);
            console.log(TherapistUser, currentSelectedVideo.id);
        }


        const optionsBlurOnButton = document.querySelector("#optionsButtonBlurOn");
        const optionsBlurOffButton = document.querySelector("#optionsButtonBlurOff");
        const optionsMirrorButton = document.querySelector("#optionsButtonMirror");
        optionsBlurOnButton.onclick = function()
        {
            blurVideoStream("local");
        }
        optionsBlurOffButton.onclick = function()
        {
            unblurVideoStream("local");
        }
        optionsMirrorButton.onclick = function()
        {
            let elem = document.getElementById("local");
            if(elem)
            {
                let style = elem.style;
                if(elem.style.transform) { elem.style.removeProperty("transform"); isMirroringLocalVideo = false; }
                else 
                {
                    elem.style.setProperty("transform", "scale(1,1)");
                    isMirroringLocalVideo = true;
                }
            }
            
        }

        // Maintain modal for options/cpanel for therapist
        const cpanelButton = document.querySelector("#optionsButton");
        const cpanelCloseButton = document.querySelector("#optionsCloseButton");
        cpanelButton.addEventListener("click", () => {
            let getCpanelModal = document.querySelector("#optionsModal");
            if(getCpanelModal) 
            {
                let calcedStyle = getComputedStyle(getCpanelModal);
                if(calcedStyle.display != 'block') getCpanelModal.style.display = "block";
                else getCpanelModal.style.display = "none"; 
            }
        });
        cpanelCloseButton.onclick = function()
        {
            let getCpanelModal = document.querySelector("#optionsModal");
            if(getCpanelModal) { getCpanelModal.style.display = "none"; optionsHidePanels(); }
        }
        window.onclick = function(e)
        {
            let getCpanelModal = document.querySelector("#optionsModal");
            let getEndSessionModal = document.querySelector("#endSessionModal");
            if(getCpanelModal && e.target == getCpanelModal) { getCpanelModal.style.display = "none"; optionsHidePanels(); }
            let getendSessionModallocal = document.querySelector("#endSessionModal");
            if(getendSessionModallocal && e.target == getEndSessionModal) getendSessionModallocal.style.display = "none";
            let getSetDateModal = document.querySelector("#setDateModal");
            if(getSetDateModal && e.target == getSetDateModal) getSetDateModal.style.display = "none";
            let getViewHomeModal = document.querySelector("#viewHomeModal");
            if(getViewHomeModal && e.target == getViewHomeModal) getViewHomeModal.style.display = "none";
            let getStreamingOptionsModal = document.querySelector("#streamingOptionsModal");
            if(getStreamingOptionsModal && e.target == getStreamingOptionsModal) getStreamingOptionsModal.style.display = "none";
            let getStreamingOptionsModal2 = document.querySelector("#streamingOptionsModal2");
            if(getStreamingOptionsModal2 && e.target == getStreamingOptionsModal2) getStreamingOptionsModal2.style.display = "none";
            let getEncyclopediaOptionsModal = document.querySelector("#modalEncylopedia");
            if(getEncyclopediaOptionsModal && e.target == getEncyclopediaOptionsModal) getEncyclopediaOptionsModal.style.display = "none";
            let getmodalButtonOrient = document.querySelector("#modalButtonOrient");
            if(getmodalButtonOrient && e.target == getmodalButtonOrient) getmodalButtonOrient.style.display = "none";
            let getmodalButtonLook = document.querySelector("#modalButtonLook");
            if(getmodalButtonLook && e.target == getmodalButtonLook) getmodalButtonLook.style.display = "none";
            let getmodalSearchFrame = document.querySelector("#modalSearchFrame");
            if(getmodalSearchFrame && e.target == getmodalSearchFrame) getmodalSearchFrame.style.display = "none";
            let getmodalTimer = document.querySelector("#modalTimer");
            if(getmodalTimer && e.target == getmodalTimer) getmodalTimer.style.display = "none";
            let modalShareScreen = document.querySelector("#modalShareScreen");
            if(modalShareScreen && e.target == modalShareScreen) modalShareScreen.style.display = "none";
        }
        if(!TherapistUser) cpanelButton.style.display = "none"; // extra check
        const cpanelEncylopediaButton = document.querySelector("#optionsButtonEncylopedia");
        cpanelEncylopediaButton.onclick = async function()
        {
            let getCPanelEncylopedia = document.querySelector("#modalEncylopedia");
            if(getCPanelEncylopedia)
            {
                let calcedStyle = getComputedStyle(getCPanelEncylopedia);
                if(calcedStyle.display != 'block') getCPanelEncylopedia.style.display = "block";
                else getCPanelEncylopedia.style.display = "none"; 
            }
        }
        const cpanelEncyclopediaCloseButton = document.querySelector("#modalEncylopediaCloseButton");
        cpanelEncyclopediaCloseButton.onclick = async function()
        {
            let getCPanelEncylopedia = document.querySelector("#modalEncylopedia");
            if(getCPanelEncylopedia) getCPanelEncylopedia.style.display = "none"; 
        }

        const cpanelBLookButton = document.querySelector("#optionsButtonLook");
        cpanelBLookButton.onclick = async function()
        {
            //await optionsHidePanels();
            let getCPanelBLook = document.querySelector("#modalButtonLook");
            if(getCPanelBLook)
            {
                let calcedStyle = getComputedStyle(getCPanelBLook);
                if(calcedStyle.display != 'block') getCPanelBLook.style.display = "block";
                else getCPanelBLook.style.display = "none"; 
            }
        }
        const cpanelBLookCloseButton = document.querySelector("#modalButtonLookCloseButton");
        cpanelBLookCloseButton.onclick = async function()
        {
            let getPanel = document.querySelector("#modalButtonLook");
            if(getPanel) getPanel.style.display = "none"; 
        }
        const cPanelLookButtonZero = document.querySelector("#buttonLook0");
        const cPanelLookButtonOne = document.querySelector("#buttonLook1");
        const cPanelLookButtonTwo = document.querySelector("#buttonLook2");
        cPanelLookButtonZero.onclick = function()
        {
            requestClientStatusChange(512);
            requestClientStatusChange(512);
        }
        cPanelLookButtonOne.onclick = function()
        {
            requestClientStatusChange(512);
        }
        cPanelLookButtonTwo.onclick = function()
        {
            requestClientStatusChange(1024);
        }


        const cpanelBOrientationButton = document.querySelector("#optionsButtonOrientation");
        cpanelBOrientationButton.onclick = async function()
        {
            //await optionsHidePanels();
            let getCPanelBOrientation = document.querySelector("#modalButtonOrient");
            if(getCPanelBOrientation)
            {
                let calcedStyle = getComputedStyle(getCPanelBOrientation);
                if(calcedStyle.display != 'block') getCPanelBOrientation.style.display = "block";
                else getCPanelBOrientation.style.display = "none"; 
            }
        }
        const cpanelBOrientationCloseButton = document.querySelector("#modalButtonOrientCloseButton");
        cpanelBOrientationCloseButton.onclick = async function()
        {
            let getCPanelEncylopedia = document.querySelector("#modalButtonOrient");
            if(getCPanelEncylopedia) getCPanelEncylopedia.style.display = "none"; 
        }
        const cPanelOrientButtonTop = document.querySelector("#buttonOrientTop");
        const cPanelOrientButtonLeft = document.querySelector("#buttonOrientLeft");
        const cPanelOrientButtonBottom = document.querySelector("#buttonOrientBottom");
        cPanelOrientButtonTop.onclick = function()
        {
            requestClientStatusChange(8);
        }
        cPanelOrientButtonLeft.onclick = function()
        {
            requestClientStatusChange(0);
        }
        cPanelOrientButtonBottom.onclick = function()
        {
            requestClientStatusChange(4);
        }
        ArrangeSidebarHandler();

        const cPanelBeginButton = document.querySelector("#buttonSessionBegin");
        cPanelBeginButton.onclick = function()
        {
            openWaitingRoomDoor();
        }
        const cTopHeaderText = document.querySelector("#headertitletext");
        cTopHeaderText.onclick = function()
        {
            if((roomStatus&16)) { openWaitingRoomDoor(); cTopHeaderText.innerHTML = ''; }

        }
        async function openWaitingRoomDoor()
        {
            await requestClientStatusChange(1);
            sounds.opendoorsnd();
        }
        async function sendWaitingRoomPulse()
        {
            let curTick = new Date().getTime(); // Room status must show someone is waiting, and must be 21 seconds between these pulses to ensure less pop ups
            let elem = document.querySelector("#headertitletext");
            if((roomStatus&16)!=0 && (curTick - pulseLastTiming) > 21000)
            {
                sounds.beep();
                /*if(confirm("A user is waiting in the waiting room. Let them in?"))
                {
                    roomStatus &= ~16;
                    openWaitingRoomDoor();
                }*/
                
                if(elem)
                {
                    if((roomStatus&16)) { elem.innerHTML = "<div style='cursor:pointer;font-size:14px;color:white;'><i class='fa fa-user-plus' style='font-size:12px;'></i>&nbsp;A client is in the waiting room.&nbsp;<b style='font-size:12px;color:#d2b412;'>Click to allow them in.</b></div>"; }
                }
                pulseLastTiming = curTick;
            }
            else if ((roomStatus&16)==0) elem.innerHTML = "";
        }
        if(TherapistUser) sendWaitingRoomPulse();

        const cPanelEndButton = document.querySelector("#buttonSessionEnd");
        cPanelEndButton.onclick = async function()
        {
            //closeRoomSession();
            let getendSessionModal = document.querySelector("#endSessionModal");
            if(getendSessionModal) 
            {
                let calcedStyle = getComputedStyle(getendSessionModal);
                if(calcedStyle.display != 'block') getendSessionModal.style.display = "block";
                else getendSessionModal.style.display = "none"; 
            }
        }
        async function closeRoomSession()
        {
            await requestClientStatusChange(32);
        }
        async function CheckSessionEnded()
        {
            if((roomStatus&32)!=0)
            {
                EndSession();
                setTimeout( ()=> 
                {
                    EndSession();
                    let getCpanelModal = document.querySelector("#optionsModal");
                    if(getCpanelModal) getCpanelModal.style.display = "none"; 
                }, 500);
            }
        }
        function EndSession()
        {
            // Set session ended
            hasSessionEnded = true;

            // End waiting room, if they were going Waiting room straight to End Session
            outOfWaitingRoom = true;
            let curTick = new Date().getTime(); // Room status must show someone is waiting, and must be 23 seconds between these pulses to ensure less pop ups
            pulseLastTiming = curTick;

            // Display screen
            let endSessionElem = document.querySelector("#endsession1");
            if(endSessionElem) endSessionElem.style.removeProperty('display');
    
            // Close socket if it's existing and open
            try{
                socket.close();
            }
            catch(e){
                console.log(e);
            }

            // Removes floating buttons if they still exist
            let optionsElem = document.querySelector(".options");
            if(optionsElem) optionsElem.style.display='none';

            // Remove all video track elements
            let videoElems = document.getElementsByTagName("video");
            if(videoElems)
            {
                for(let i=0;i<videoElems.length;i++)
                {
                    let videoElem = videoElems[i];
                    if(!videoElem) continue;
                    if(videoElem.id != 'endsessionvideo1') videoElem.remove();
                }
            }

            // Remove header
            let elemHeader = document.querySelector(".header");
            if(elemHeader) elemHeader.style.display = 'none';

            // If therapist add the link back to the therapist page
            if(TherapistUser) 
            {
                let elemTherapistBack = document.querySelector("#endsessiontherapistlink");
                if(elemTherapistBack) elemTherapistBack.style.display = 'block';
            }

            // Remove any additional option big blue buttons (endsession, etc)
            let elemBigButton = document.querySelector(".largescreen__options");
            if(elemBigButton)
            {
                elemBigButton.style.display = 'none';
            }
            elemBigButton = document.querySelector(".main__chat_window");
            if(elemBigButton)
            {
                elemBigButton.style.display = 'none';
            }

            // Remove any nametags
            let elemsNametags = document.getElementsByClassName("nametag");
            if(elemsNametags)
            {
                for(let i=0;i<elemsNametags.length;i++) 
                {
                    let elemNametag = elemsNametags[i];
                    if(!elemNametag) continue;
                    elemNametag.style.display = 'none';
                }
            }

            // Settimeout, remove page, then redirect
            let hasEndedAlready = false;
            hasEndedAlready = sessionStorage.getItem( '' + room + 'endSessionLoaded' );
            if(hasEndedAlready == true || hasEndedAlready == 'true') 
            {
                // Remove all video track elements
                let videoElems = document.getElementsByTagName("video");
                if(videoElems)
                {
                    for(let i=0;i<videoElems.length;i++)
                    {
                        let videoElem = videoElems[i];
                        if(!videoElem) continue;
                        videoElem.remove();
                    }
                }

                // Redirect
                window.location = 'https://google.com/';
            }
            else
            {
                setTimeout(()=> {
                // Remove all video track elements
                let videoElems = document.getElementsByTagName("video");
                if(videoElems)
                {
                    for(let i=0;i<videoElems.length;i++)
                    {
                        let videoElem = videoElems[i];
                        if(!videoElem) continue;
                        videoElem.remove();
                    }
                }

                // Redirect
                /*window.location = 'https://google.com/';*/
                }, 90000);
            }

            // Store that session has ended in this browser session
            setTimeout(()=> { sessionStorage.setItem( '' + room + 'endSessionLoaded', true ); }, 1500);
    
        }

        // Send set waiting room status (recursively)
        function sendInWaitingRoomStatusRecursive()
        {
            // Recurse every 5 seconds, until there is no longer any waiting room
            if(!outOfWaitingRoom)
            {
                setTimeout(()=> {
                    sendInWaitingRoomStatusRecursive();
                }, 5000);
                requestClientStatusChange(16); // Resend status change pulse for this room

                // Remove top logo while this is here
                let elem = document.querySelector(".header");
                if(elem) elem.style.display = 'none';
            }
			else            
			{
				// Replace top logo if this runs
                let elem = document.querySelector(".header");
                if(elem) elem.style.display = 'flex';
			}
        }

        const cPanelISearchButton = document.querySelector("#optionsButtonSearchFrame");
        cPanelISearchButton.onclick = async function()
        {
            //await optionsHidePanels();
            let getCPanelISearch = document.querySelector("#modalSearchFrame");
            if(getCPanelISearch)
            {
                let calcedStyle = getComputedStyle(getCPanelISearch);
                if(calcedStyle.display != 'block') getCPanelISearch.style.display = "block";
                else getCPanelISearch.style.display = "none"; 
            }
        }
        const cPanelISearchCloseButton = document.querySelector("#modalSearchFrameCloseButton");
        cPanelISearchCloseButton.onclick = async function()
        {
            let getPanel = document.querySelector("#modalSearchFrame");
            if(getPanel) getPanel.style.display = "none"; 
        }

        const cPanelTimerButton = document.querySelector("#optionsButtonTimer");
        cPanelTimerButton.onclick = async function()
        {
            await optionsHidePanels();
            let getCPanelTimer = document.querySelector("#modalTimer");
            if(getCPanelTimer)
            {
                let calcedStyle = getComputedStyle(getCPanelTimer);
                if(calcedStyle.display != 'block') getCPanelTimer.style.display = "block";
                else getCPanelTimer.style.display = "none"; 
            }
        }
        const cPanelTimerCloseButton = document.querySelector("#modalTimerCloseButton");
        cPanelTimerCloseButton.onclick = function()
        {
            let getCPanelTimer = document.querySelector("#modalTimer");
            if(getCPanelTimer) getCPanelTimer.style.display = "none"; 
        }
        const cPanelTimerButtonOff = document.querySelector("#buttonTimerOff");
        const cPanelTimerButtonOn = document.querySelector("#buttonTimerTherapist");
        const cPanelTimerButtonAll = document.querySelector("#buttonTimerAll");
        const cPanelTimerButtonReset = document.querySelector("#buttonTimerReset");
        cPanelTimerButtonOff.onclick = function()
        {
            requestClientStatusChange(0);
        }
        cPanelTimerButtonOn.onclick = function()
        {
            requestClientStatusChange(64);
        }
        cPanelTimerButtonAll.onclick = function()
        {
            requestClientStatusChange(128);
        }
        cPanelTimerButtonReset.onclick = function()
        {
            socket.emit("settimer", { room: room, timer: 0 });
        }
        setInterval(function () {socket.emit("timer", { room: room});}, 1000); // Begin timer polling
        function HandleTimerDisplay()
        {
            let timerElem = document.querySelector("#headerTimerDisplay");
            if(!timerElem) return;
            let hasDisplayStatus = false;
            if((roomStatus&64)!=0 && TherapistUser)
            {
                hasDisplayStatus = true;
                timerElem.style.display = 'block';
            }
            if((roomStatus&128)!=0)
            {
                hasDisplayStatus = true;
                timerElem.style.display = 'block';
            }
            if(!hasDisplayStatus) timerElem.style.display = 'none';
        }
        function HandleTimerSetTime(seconds)
        {
            let timerElem = document.querySelector("#headerInternalTimerDisplay");
            if(timerElem && seconds)
            {
                timerHasBeenSet = true;
                let minutes = Mathelpers.floor(seconds/60);
                let hours = Mathelpers.floor(minutes/60);
                while(minutes>=60) minutes -= 60;
                while(seconds>=60) seconds -= 60;
                let formattedTime = (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);
                if(hours > 0) formattedTime = (hours < 10 ? "0" + hours : hours) + (minutes < 10 ? "0" + minutes : minutes) + ":" + (seconds < 10 ? "0" + seconds : seconds);
                //let formattedTime = hours + ':' + minutes + ':' + seconds;
                //if(minutes < 1) formattedTime =  '00:' + seconds;*/
                //let formattedTime = new Date(seconds * 1000).toISOString().substr(11, 8);
                timerElem.innerHTML = formattedTime;
            }
        }
        async function optionsHidePanels()
        {
            let getCPanelEncyclopedia = document.querySelector("#modalEncylopedia");
            if(getCPanelEncyclopedia) getCPanelEncyclopedia.style.display = 'none';
            let getCPanelISearch = document.querySelector("#modalSearchFrame");
            if(getCPanelISearch) getCPanelISearchelpers.style.display = 'none';
            let getCPanelSession = document.querySelector("#modalSession");
            if(getCPanelSession) getCPanelSession.style.display = 'none';
            let getCPanelTimer = document.querySelector("#modalTimer");
            if(getCPanelTimer) getCPanelTimer.style.display = 'none';
            let getCPanelBOrientation = document.querySelector("#modalButtonOrient");
            if(getCPanelBOrientation) getCPanelBOrientation.style.display = 'none';
            let getCPanelSSButton = document.querySelector("#modalShareScreen");
            if(getCPanelSSButton) getCPanelSSButton.style.display = 'none';
            let getCPanelSetDate = document.querySelector("#modalSetDate");
            if(getCPanelSetDate) getCPanelSetDate.style.display = 'none';
        }
        const cPanelShareScreenOn = document.querySelector("#buttonScreenShareOn");
        const cPanelShareScreenOff = document.querySelector("#buttonScreenShareOff");
        cPanelShareScreenOn.onclick = function()
        {
            shareScreen();
        }
        cPanelShareScreenOff.onclick = function()
        {
            stopSharingScreen();
        }
        const cPanelShareScreenClientOn = document.querySelector("#buttonScreenShareClientOn");
        cPanelShareScreenClientOn.onclick = function()
        {
            requestClientStatusChange(256);
        }

        const cPanelScreenShareButton = document.querySelector("#optionsButtonScreenShare");
        cPanelScreenShareButton.onclick = async function()
        {
            //await optionsHidePanels();
            let getCPanelSS = document.querySelector("#modalShareScreen");
            if(getCPanelSS)
            {
                let calcedStyle = getComputedStyle(getCPanelSS);
                if(calcedStyle.display != 'block') getCPanelSS.style.display = "block";
                else getCPanelSS.style.display = "none"; 
            }
        }
        const cPanelScreenShareCloseButton = document.querySelector("#modalShareScreenCloseButton");
        cPanelScreenShareCloseButton.onclick = async function()
        {
            let getCPanelSS = document.querySelector("#modalShareScreen");
            if(getCPanelSS) getCPanelSS.style.display = "none"; 
        }

        // Maintain modal for options/cpanel for therapist
        const cEndSessionCloseButton = document.querySelector("#endSessionCloseButton");
        const cEndSessionButton2 = document.querySelector("#endSessionButton2");
        const cEndSessionButton3 = document.querySelector("#endSessionCloseButton2");
        const cEndSessionConfirmed = document.querySelector("#yesEndSession");
        cEndSessionButton2.addEventListener("click", () => {
            let getendSessionModal = document.querySelector("#endSessionModal");
            if(getendSessionModal) 
            {
                let calcedStyle = getComputedStyle(getendSessionModal);
                if(calcedStyle.display != 'block') getendSessionModal.style.display = "block";
                else getendSessionModal.style.display = "none"; 
            }
        });
        cEndSessionCloseButton.onclick = function()
        {
            let getendSessionModal = document.querySelector("#endSessionModal");
            if(getendSessionModal) getendSessionModal.style.display = "none";
        }
        cEndSessionButton3.onclick = function()
        {
            let getendSessionModal = document.querySelector("#endSessionModal");
            if(getendSessionModal) 
            {
                let calcedStyle = getComputedStyle(getendSessionModal);
                if(calcedStyle.display != 'block') getendSessionModal.style.display = "block";
                else getendSessionModal.style.display = "none"; 
            }
        }
        if(TherapistUser && cEndSessionButton2) cEndSessionButton2.style.display = '';

        cEndSessionConfirmed.onclick = function()
        {
            closeRoomSession();
            let getendSessionModallocal = document.querySelector("#endSessionModal");
            if(getendSessionModallocal) getendSessionModallocal.style.display = "none";
        }

        // CPanel SetSchedule button
        const cSetDateButton = document.querySelector("#optionsButtonSetupDate");
        cSetDateButton.onclick = function()
        {
            let setDateElem = document.querySelector("#setDateModal");
            if(setDateElem) 
            {
                let calcedStyle = getComputedStyle(setDateElem);
                if(calcedStyle.display != 'block') 
                {
                    setDateElem.style.display = "block";
                    let SetDateIframeElem = document.querySelector("#setupDateIFrame");
                    if(SetDateIframeElem) { SetDateIframeElem.setAttribute("src","https://my.goldlink.live/#/client/mobilescheduling/" + room); }
                }
                else setDateElem.style.display = "none"; 
            }
        }
        const cSetDateCloseButton = document.querySelector("#setDateCloseButton");
        cSetDateCloseButton.onclick = function()
        {
            let getDateModal = document.querySelector("#setDateModal");
            if(getDateModal) getDateModal.style.display = "none";
        }

        // CPanel View Home button
        const cViewHomeButton = document.querySelector("#optionsButtonViewHome");
        cViewHomeButton.onclick = function()
        {
            let setDateElem = document.querySelector("#viewHomeModal");
            if(setDateElem) 
            {
                let calcedStyle = getComputedStyle(setDateElem);
                if(calcedStyle.display != 'block') 
                {
                    setDateElem.style.display = "block";
                    let SetDateIframeElem = document.querySelector("#setupDateIFrame2");
                    if(SetDateIframeElem) { SetDateIframeElem.setAttribute("src","https://my.goldlink.live"); }
                }
                else setDateElem.style.display = "none"; 
            }
        }
        const cViewHomeCloseButton = document.querySelector("#viewClientDetailsCloseButton");
        cViewHomeCloseButton.onclick = function()
        {
            let getViewModal = document.querySelector("#viewHomeModal");
            if(getViewModal) getViewModal.style.display = "none";
        }

        const cRefreshButton = document.querySelector("#buttonSessionRefresh");
        cRefreshButton.onclick = function()
        {
            socket.emit("createRefreshRequest", {checksum: TherapistUser, room: room});
            requestClientStatusChange(1); // open waiting room temporarily
            setTimeout(()=>{location.reload();sessionStorage.setItem("gt_IsRefreshing", 1);},3000);

            reconnecting = true;
            let disconnectelem = document.querySelector(".disconnectioncircle");
            if(disconnectelem) disconnectelem.style.display = 'inline';
        }
            
        //Bitmask mapping for roomStatus (for easier future referencing and maintaining)
        // 0: Active (0 also resets certain ones like button orient and timer if 0 is sent)
        // 1: Waiting Room
        // 2: Unused, or Orient buttons left
        // 4: Orient buttons bottom
        // 8: Orient buttons top
        // 16: 1 or more is waiting in the waiting room
        // 32: Session has ended
        // 64: Show timer for Therapist
        // 128: Show timer for All
        // 256: Client Screenshare Active

        // WebRTC blurring using Tensorflow model

        function blurVideoStream(id)
        {
            let elem = document.getElementById(id);
            if(elem)
            {
                //let firstvideo = elem.getElementsByTagName('video')[0];
                //if(firstvideo)
                {
                    isBlurringLocalBkground = true;
                    elem.height = elem.videoHeight;
                    elem.width = elem.videoWidth;
                    let canvas = document.getElementById("canvas");
                    if(canvas) 
                    {
                        canvas.hidden = false;
                        canvas.height = elem.videoHeight;
                        canvas.width = elem.videoWidth;
                        elem.style.display = 'none';
                        canvas.onclick = OpenStreamingOptions;
                    }
                    loadBodyPix();
                    console.log("Loaded body pix");
                    console.log(elem, canvas);
                }
            }

        }
        function unblurVideoStream(id)
        {
            let elem = document.getElementById(id);
            if(elem)
            {
                //let firstvideo = elem.getElementsByTagName('video')[0];
                //if(firstvideo)
                {
                    isBlurringLocalBkground = false;
                    console.log("Unloaded body pix");
                    let canvas = document.getElementById("canvas");
                    if(canvas) { canvas.hidden = true; canvas.onclick = OpenStreamingOptions; }
                    elem.style.display = 'block';
                }
            }
        }

        function loadBodyPix() {
            let options = {
              multiplier: 1.00,
              stride: 32,
              quantBytes: 4
            }

            bodyPix.load(options)
              .then(net => perform(net))
              .catch(err => console.log(err))
          }
          async function perform(net) {

            let canvas = document.getElementById("canvas");
            let videoElement = document.getElementById("local");
            let canvasStream = canvas.captureStream(25);
            if(canvasStream) broadcastNewTracks(canvasStream, 'local', false);

            while (isBlurringLocalBkground) {
              const segmentation = await net.segmentPerson(local);
          
              const backgroundBlurAmount = 3;
              const edgeBlurAmount = 3;
              const flipHorizontal = !isMirroringLocalVideo;

                bodyPix.drawBokehEffect(
                    canvas, videoElement, segmentation, backgroundBlurAmount,
                    edgeBlurAmount, flipHorizontal);
            }

            //share the new stream with all partners
            //screen.getTracks().length ? screen.getTracks().forEach( track => track.stop() ) : '';
            broadcastNewTracks(myStream, 'video');
            canvasStream = 0;
          }
    }
} );
