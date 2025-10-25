import h from './helpers.js';

let roomStatus = 0;
let localRoomInitialized = false;
function getCookie(name) {
    var match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    if (match) return match[2];
    else return '';
}
async function requestClientStatus()
{
    const response = await fetch(h.getAPIServer() + 'GCSR', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({to: socketId, room: room}),
        });

        response.json().then(data => {
            //console.log(data);
            roomStatus = data.status;
            return roomStatus;
        });
}

async function requestClientStatusRecursive(room)
{
    const response = await fetch(h.getAPIServer() + 'GCSR', {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({room: room}),
    });

    response.json().then(data => {
        //console.log(data);
        roomStatus = data.status;
        if(roomStatus&1 && !localRoomInitialized) loadVideoRoom(); // Room is now active, waiting room is over, initialize it
        setTimeout(()=> {
            requestClientStatusRecursive();
        }, 5000);
    });
}

async function loadVideoRoom()
{
        //const room = h.getQString( location.href, 'room' );
        const room = ROOM_ID;
        localRoomInitialized = true;
        //const room = '1234';
        //console.log("room", room);
        //let username = sessionStorage.getItem( 'username' );
        //if(!username) username = h.getQString( location.href, 'username' )
    
        // Defining username override
        //let TherapistUser = sessionStorage.getItem( 'BMUserChecksum' );
        //if(TherapistUser) username = "Therapist";
        //else username = "User";
    
        /*if ( !room ) {
            document.querySelector( '#room-create' ).attributes.removeNamedItem( 'hidden' );
    
            let hasBeenInRoom = sessionStorage.getItem( 'BMUserInVideoRoom' );
            if(hasBeenInRoom)
            {
                sessionStorage.removeItem( 'BMUserInVideoRoom' );
                document.querySelector( '#room-left' ).attributes.removeNamedItem( 'hidden' );
            }
            else document.querySelector( '#room-startup' ).attributes.removeNamedItem( 'hidden' ); 
        }
    
        else if ( !username ) {
            document.querySelector( '#username-set' ).attributes.removeNamedItem( 'hidden' );
        }
    
        else */{
            //let commElem = document.getElementsByClassName( 'room-comm' );
            //for ( let i = 0; i < commElem.length; i++ ) {
            //    commElem[i].attributes.removeNamedItem( 'hidden' );
            //}
    
            const videoGrid = document.getElementById("video-grid");
            const myVideo = document.createElement("video");
            const showChat = document.querySelector("#showChat");
            const backBtn = document.querySelector(".header__back");
            myVideo.muted = true;
            myVideo.id = 'local';
    
            var pc = [];
            var socketId = '';
            var randomNumber = `__${h.generateRandomString()}__${h.generateRandomString()}__`;
            var myStream = '';
            var screen = '';
            var recordedStream = [];
            var mediaRecorder = '';
            var hasMediaToUse = true;
            //const user = prompt("Enter your name");
            // if(user) document.getElementById("headertitletext").innerHTML = user + ' session ' + ROOM_ID.substring(0,8);
            let TherapistUser = sessionStorage.getItem( 'BMUserChecksum' ) || localStorage.getItem( 'BMUserChecksum' ) || getCookie('BMUserChecksum');
            var hasSetupUserNameUniq = false;
            var hasSecondaryClient = 0;
            let username = '';
            if(TherapistUser) username = "Therapist";
            else username = "Client";
            let user = username;
    
            // Send user startup message
            if(!TherapistUser)
            {
                const hippa = alert("Senior Talk is HIPAA compliant and encrypted for your security. To continue, press Ok or Close.");
            }
            //else alert("Senior Talk is HIPAA compliant and encrypted for your security. You are logged in as therapist. When you are ready to continue, press Ok or Close.");
            else 
            {
                sessionStorage.setItem('BMUserChecksum', TherapistUser);
                alert("Senior Talk is HIPAA compliant and encrypted for your security. To continue, press Ok or Close.");
            }
    
            // Hide buttons until HIPPA acknowledgement is done, then re-arrange them instantly as needed
            let OptionsElem = document.querySelector('.options');
            if(OptionsElem) OptionsElem.style.display = 'inherit';
            ArrangeSidebarFix('2vh');
    
            const addVideoStream = (video, stream) => {
                video.srcObject = stream;
                video.autoplay = 'autoplay';
                video.setAttribute('webkit-playsinline', 'webkit-playsinline');
                video.setAttribute('playsinline', 'playsinline');
                video.setAttribute('autoplay', 'autoplay');
                video.addEventListener("loadedmetadata", () => {
                  video.play();
                });
            
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
    
                videoGrid.append(video);
    
                // Custom controls, we want volume control and full screen maybe, that's it (other controls are set in .css file)
                let id = video.id;
                if(id != 'local')
                {
                    //video.setAttribute('controls', 'controls');
                    video.setAttribute('class', 'op-player__media');
                    const player = new OpenPlayerJS(id, { pauseOthers: false,
                    live: {showLabel: true,showProgress: false}
                    });
                    player.init();
                }
            };
    
            //Get user video by default, set hasMediaToUse if either function fails, so we won't try to get our media streams later
            let hasStream = false;
            try
                {
                    await navigator.mediaDevices.getUserMedia({audio: {echoCancellation: true,noiseSuppression: true},video: true}).then((stream) => {
                        myStream = stream;
                        addVideoStream(myVideo, stream);
                        h.setLocalStream( myVideo, stream );
                        hasStream = true;
                    });
            } catch (err) {
                hasStream = false;
                alert("No camera/audio detected. Use text chat.");
            }
    
            // Set helper buttons off or disabled (e.g. mute) if we don't use those anyway
           // if(!hasMediaToUse)  h.toggleMediaBtnsInvisible();
    
        
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
                    console.log("Ice Candidates received", data, pc[data.sender]);
                    data.candidate ? await pc[data.sender].addIceCandidate( new RTCIceCandidate( data.candidate ) ) : '';
                } );
    
                socket.on('disconnectedUser', async (data) => {
                    if(data && data.socketId)
                    {
                        let partnerName = data.socketId;
                        let videoElem = document.getElementById(`${ partnerName }-video`);
                        if(videoElem) videoElem.remove();
                    }
                } );
    
                socket.on('recvClientStatus', async (data) => {
                    if(data && data.status)
                    {
                        let status = data.status;
                        let arrangeButtons = data.status&2;
                        let waitingRoom = data.status&4;
                        //console.log("recvClientStatus", data);
                    }
                });
    
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
                                    h.setLocalStream( stream );
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
                                     h.setLocalStream( stream );
                                 }
     
                                 //save my stream
                                 myStream = stream;*/
                                 stream.getTracks().forEach( ( track ) => {
                                     pc[data.sender].addTrack( track, stream );
                                 } );
     
                                 let answer = await pc[data.sender].createAnswer();
                                 await pc[data.sender].setLocalDescription( answer );
                                 socket.emit( 'sdp', { description: pc[data.sender].localDescription, to: data.sender, sender: socketId } );
                             } ).catch( ( e ) => {
                                 //alert("No microphone or video stream was detected on your machine.")
                                 console.error( e );
                             } );
                        }   
                    }
                    else if ( data.description.type === 'answer' ) {
                        await pc[data.sender].setRemoteDescription( new RTCSessionDescription( data.description ) );
                    }
                } );
    
                socket.emit( 'subscribe', {
                    room: room,
                    socketId: socketId
                } );
    
            } );
    
            function init( createOffer, partnerName ) {
                pc[partnerName] = new RTCPeerConnection( h.getIceServer() );
    
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
                    h.getUserFullMedia().then( ( stream ) => {
                        //save my stream
                        myStream = stream;
    
                        stream.getTracks().forEach( ( track ) => {
                            pc[partnerName].addTrack( track, stream );//should trigger negotiationneeded event
                        } );
    
                        h.setLocalStream( stream );
                        
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
                        newVid.setAttribute('controls', 'controls'); // note this also shows like a slider thing but I can't really control it
                        addVideoStream(newVid, str);
                    }
                };
    
                // ConnectionStateChange
                pc[partnerName].onconnectionstatechange = ( d ) => {
    
                    console.log("OnConnectionStateChange: ", d, partnerName, pc[partnerName]);
    
                    switch ( pc[partnerName].iceConnectionState ) {
                        case 'disconnected':
                        case 'failed':
                            h.closeVideo( partnerName );
                            break;
    
                        case 'closed':
                            h.closeVideo( partnerName );
                            break;
                    }
                };
    
                // SignalingStateChange
                pc[partnerName].onsignalingstatechange = ( d ) => {
    
                    console.log("OnSignalingStateChange: ", d, partnerName, pc[partnerName]);
    
                    switch ( pc[partnerName].signalingState ) {
                        case 'closed':
                            console.log( "Signalling state is 'closed'" );
                            h.closeVideo( partnerName );
                            break;
                    }
                };
    
            }
    
    
            function shareScreen() {
                h.shareScreen().then( ( stream ) => {
                    //h.toggleShareIcons( true );
    
                    //disable the video toggle btns while sharing screen. This is to ensure clicking on the btn does not interfere with the screen sharing
                    //It will be enabled was user stopped sharing screen
                    h.toggleVideoBtnDisabled( true );
    
                    //save my screen stream
                    screen = stream;
    
                    //share the new stream with all partners
                    broadcastNewTracks( stream, 'video', false );
    
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
                h.toggleVideoBtnDisabled( false );
    
                return new Promise( ( res, rej ) => {
                    screen.getTracks().length ? screen.getTracks().forEach( track => track.stop() ) : '';
    
                    res();
                } ).then( () => {
                    //h.toggleShareIcons( false );
                    broadcastNewTracks( myStream, 'video' );
                } ).catch( ( e ) => {
                    console.error( e );
                } );
            }
    
            function broadcastNewTracks( stream, type, mirrorMode = true ) {
                h.setLocalStream( stream, mirrorMode );
    
                let track = type == 'audio' ? stream.getAudioTracks()[0] : stream.getVideoTracks()[0];
    
                for ( let p in pc ) {
                    let pName = pc[p];
    
                    if ( typeof pc[pName] == 'object' ) {
                        h.replaceTrack( track, pc[pName] );
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
    
                    h.saveRecordedStream( recordedStream, username );
    
                    setTimeout( () => {
                        recordedStream = [];
                    }, 3000 );
                };
    
                mediaRecorder.onerror = function ( e ) {
                    console.error( e );
                };
            }
    
            function beep() {
                var snd = new Audio("data:audio/wav;base64,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qJrx4KOQjahZxWbcZgztj2c49nKmkId44S71j0c8eV9yDK6uPRzx5X18eDvjvQ6yKo9ZSS6l//8elePK/Lf//IInrOF/FvDoADYAGBMGb7FtErm5MXMlmPAJQVgWta7Zx2go+8xJ0UiCb8LHHdftWyLJE0QIAIsI+UbXu67dZMjmgDGCGl1H+vpF4NSDckSIkk7Vd+sxEhBQMRU8j/12UIRhzSaUdQ+rQU5kGeFxm+hb1oh6pWWmv3uvmReDl0UnvtapVaIzo1jZbf/pD6ElLqSX+rUmOQNpJFa/r+sa4e/pBlAABoAAAAA3CUgShLdGIxsY7AUABPRrgCABdDuQ5GC7DqPQCgbbJUAoRSUj+NIEig0YfyWUho1VBBBA//uQZB4ABZx5zfMakeAAAAmwAAAAF5F3P0w9GtAAACfAAAAAwLhMDmAYWMgVEG1U0FIGCBgXBXAtfMH10000EEEEEECUBYln03TTTdNBDZopopYvrTTdNa325mImNg3TTPV9q3pmY0xoO6bv3r00y+IDGid/9aaaZTGMuj9mpu9Mpio1dXrr5HERTZSmqU36A3CumzN/9Robv/Xx4v9ijkSRSNLQhAWumap82WRSBUqXStV/YcS+XVLnSS+WLDroqArFkMEsAS+eWmrUzrO0oEmE40RlMZ5+ODIkAyKAGUwZ3mVKmcamcJnMW26MRPgUw6j+LkhyHGVGYjSUUKNpuJUQoOIAyDvEyG8S5yfK6dhZc0Tx1KI/gviKL6qvvFs1+bWtaz58uUNnryq6kt5RzOCkPWlVqVX2a/EEBUdU1KrXLf40GoiiFXK///qpoiDXrOgqDR38JB0bw7SoL+ZB9o1RCkQjQ2CBYZKd/+VJxZRRZlqSkKiws0WFxUyCwsKiMy7hUVFhIaCrNQsKkTIsLivwKKigsj8XYlwt/WKi2N4d//uQRCSAAjURNIHpMZBGYiaQPSYyAAABLAAAAAAAACWAAAAApUF/Mg+0aohSIRobBAsMlO//Kk4soosy1JSFRYWaLC4qZBYWFRGZdwqKiwkNBVmoWFSJkWFxX4FFRQWR+LsS4W/rFRb/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////VEFHAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAU291bmRib3kuZGUAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAMjAwNGh0dHA6Ly93d3cuc291bmRib3kuZGUAAAAAAAAAACU=");  
                snd.volume = 0.5;
                snd.play();
                snd = 0; // nullify and clean up
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
                h.toggleChatNotificationBadge();
                beep();
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
            prompt(
                "Copy this link and send it to people you want to meet with",
                window.location.href
            );
            });
            backBtn.addEventListener("click", () => {
                document.querySelector(".main__left").style.display = "flex";
                document.querySelector(".main__left").style.flex = "1";
                document.querySelector(".main__right").style.display = "none";
                document.querySelector(".header__back").style.display = "none";
            });
              
            showChat.addEventListener("click", () => {
                document.querySelector(".main__right").style.display = "flex";
                document.querySelector(".main__right").style.flex = "1";
                document.querySelector(".main__left").style.display = "none";
                document.querySelector(".header__back").style.display = "block";
                h.toggleChatNotificationBadge(true);
            });
    
            // Any onresize event?
            addEventListener("resize", (event) => {
                h.toggleChatNotificationBadge(false,true);
                ArrangeSidebarFix();
                //VideoOrientationFix();
            });
    
            // headertitletext/counter change
            function recursiveRoomTextCounter(curTime) {
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
            });
    
            // Fixed Sidenavbar arrangement
            function ArrangeSidebarFix(heightStart = 0)
            {
                let heightAdjust = 0;
                if(heightStart) heightStart = heightStart;
                else heightStart = '16vh';
                let elemOptionsLeft = document.querySelector(".options__left");
                if(elemOptionsLeft && elemOptionsLeft.children.length)
                {
                    for(let i=0;i<elemOptionsLeft.children.length;i++)
                    {
                        let elem = elemOptionsLeft.children[i];
                        if(!elem || elem.hidden) continue;
                        let getStyle = getComputedStyle(elem);
                        if(getStyle && getStyle.display == 'none') continue;
                        if(heightAdjust == 0) elem.style['top'] = heightStart;
                        else elem.style['top'] = 'calc(' + heightStart + ' + ' + heightAdjust + 'px)';
                        heightAdjust+=60;
                    }
                }
        
                let elemOptionsRight = document.querySelector(".options__right");
                if(elemOptionsRight && elemOptionsRight.children.length)
                {
                    for(let i=0;i<elemOptionsRight.children.length;i++)
                    {
                        let elem = elemOptionsRight.children[i];
                        if(!elem || elem.hidden) continue;
                        let getStyle = getComputedStyle(elem);
                        if(getStyle && getStyle.display == 'none') continue;
                        if(heightAdjust == 0) elem.style['top'] = heightStart;
                        else elem.style['top'] = 'calc(' + heightStart + ' + ' + heightAdjust + 'px)';
                        heightAdjust+=60;
                    }
                }
            }
            ArrangeSidebarFix('2vh');
    
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

            /*function requestClientStatusRecursive()
            {
                setTimeout(()=> {
                    if(socketId) socket.emit('requestClientStatus', {to: socketId, room: room});
                    requestClientStatusRecursive();
                }, 5000);
            }*/
        }
}

window.addEventListener( 'load', async () => {
    const room = ROOM_ID;
    let TherapistUser = sessionStorage.getItem( 'BMUserChecksum' ) || localStorage.getItem( 'BMUserChecksum' ) || getCookie('BMUserChecksum');

    // Setup video room if it's therapist
    if(TherapistUser && !localRoomInitialized) { loadVideoRoom(); }

    // Setup recursive client status polling for waiting room and other options
    requestClientStatusRecursive();
} );