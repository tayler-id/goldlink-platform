export default {
    generateRandomString() {
        const crypto = window.crypto || window.msCrypto;
        let array = new Uint32Array(1);
        
        return crypto.getRandomValues(array);
    },


    closeVideo( elemId ) {
        //console.log("Close video called", elemId, document.getElementById( elemId ));
        if ( document.getElementById( elemId ) ) {
            document.getElementById( elemId ).remove();
            this.adjustVideoElemSize();
        }
    },

    closeVideobyElement( element ) {
        if ( element ) {
            element.remove();
        }
    },

    pageHasFocus() {
        return !( document.hidden || document.onfocusout || window.onpagehide || window.onblur );
    },

    getQString( url = '', keyToReturn = '' ) {
        url = url ? url : location.href;
        let queryStrings = decodeURIComponent( url ).split( '#', 2 )[0].split( '?', 2 )[1];

        if ( queryStrings ) {
            let splittedQStrings = queryStrings.split( '&' );

            if ( splittedQStrings.length ) {
                let queryStringObj = {};

                splittedQStrings.forEach( function ( keyValuePair ) {
                    let keyValue = keyValuePair.split( '=', 2 );

                    if ( keyValue.length ) {
                        queryStringObj[keyValue[0]] = keyValue[1];
                    }
                } );

                return keyToReturn ? ( queryStringObj[keyToReturn] ? queryStringObj[keyToReturn] : null ) : queryStringObj;
            }

            return null;
        }

        return null;
    },


    userMediaAvailable() {
        return !!( navigator.getUserMedia || navigator.webkitGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia );
    },


    getUserFullMedia() {
        if ( this.userMediaAvailable() ) {
            return navigator.mediaDevices.getUserMedia( {
                video: true,
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            } );
        }

        else {
            throw new Error( 'User media not available' );
        }
    },


    getUserAudio() {
        if ( this.userMediaAvailable() ) {
            return navigator.mediaDevices.getUserMedia( {
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true
                }
            } );
        }

        else {
            throw new Error( 'User media not available' );
        }
    },



    shareScreen() {
        if ( this.userMediaAvailable() ) {
            return navigator.mediaDevices.getDisplayMedia( {
                video: {
                    cursor: "always"
                },
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    sampleRate: 44100
                }
            } );
        }

        else {
            alert("You may not have support for sharing screen. Try to use a different browser or system.");
            throw new Error( 'User media not available' );
        }
    },


    // Forceoff==true will reset the counter, forcedoff==false,resizer==true will check only if it's visible again to reset it
    toggleChatNotificationBadge(forcedoff=false,resizer=false) {
        let elem = document.querySelector('.main__right');
        if ( elem ) {
            let display = window.getComputedStyle(elem, null).display;
            let ncnelem = document.querySelector('#new-chat-notification');
            if(ncnelem)
            {
                if(display !== 'none' || forcedoff) 
                { 
                    ncnelem.setAttribute('hidden', true ); 
                    if(UNREAD_NOTIFS !== undefined) 
                    {
                        UNREAD_NOTIFS = 0;
                        ncnelem.innerHTML = UNREAD_NOTIFS.toString();
                    }
                }
                else if(!resizer)
                { 
                    ncnelem.removeAttribute('hidden'); 
                    if(UNREAD_NOTIFS !== undefined) 
                    {
                        UNREAD_NOTIFS++;
                        ncnelem.innerHTML = UNREAD_NOTIFS.toString();

                        // Add shaking class to button and then add timeout to remove shake in 1 second
                        let mainbuttonelem = document.querySelector('#showChat');
                        if(mainbuttonelem)
                        {
                            mainbuttonelem.classList.add('shaking_button');
                            setTimeout(() => { mainbuttonelem.classList.remove('shaking_button') }, 567);
                        }
                    }
                }
            }
        }
    },

    replaceTrack( stream, recipientPeer ) {
        let sender = recipientPeer.getSenders ? recipientPeer.getSenders().find( s => s.track && s.track.kind === stream.kind ) : false;

        sender ? sender.replaceTrack( stream ) : '';
    },


    toggleVideoBtnDisabled( disabled ) {
        document.getElementById( 'toggle-video' ).disabled = disabled;
    },
    
    toggleMediaBtnsInvisible() {
        let elem1 = document.getElementById( 'toggle-mute' );
        if(elem1) elem1 .style = "display:none;";
        let elem2 = document.getElementById( 'toggle-video' );
        if(elem2) style = "display:none;";
    },

    maximiseStream( e ) {
        let elem = e.target.parentElement.previousElementSibling;

        elem.requestFullscreen() || elem.mozRequestFullScreen() || elem.webkitRequestFullscreen() || elem.msRequestFullscreen();
    },


    singleStreamToggleMute( e ) {
        if ( e.target.classList.contains( 'fa-microphone' ) ) {
            e.target.parentElement.previousElementSibling.muted = true;
            e.target.classList.add( 'fa-microphone-slash' );
            e.target.classList.remove( 'fa-microphone' );
        }

        else {
            e.target.parentElement.previousElementSibling.muted = false;
            e.target.classList.add( 'fa-microphone' );
            e.target.classList.remove( 'fa-microphone-slash' );
        }
    },

    setLocalStream( element, stream, mirrorMode = true ) {
        let localVidElem = element;
        if(!element) localVidElem = document.getElementById( 'local' );
        
        localVidElem.srcObject = stream;
        //mirrorMode ? localVidElem.classList.add( 'mirror-mode' ) : localVidElem.classList.remove( 'mirror-mode' );
        //console.log(localVidElem);
    },
};