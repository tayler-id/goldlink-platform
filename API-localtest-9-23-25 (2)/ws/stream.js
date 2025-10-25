// MySQL
let con = require('../mysql/mysql8.js');

// Roomtimers (each room has a synced 'timer' value)
global.RoomTimers = [];

// Each room can be sent the user's username, we will match this with the socketId and also store the room just incase {roomID:, socketID:, username:}
global.SentUsernames = [];

// Stream
const stream = ( socket ) => {
    socket.on( 'subscribe', ( data ) => {
        //subscribe/join a room
        socket.join( data.room );
        socket.join( data.socketId );

        // store username
        if(data.userName)
        {
            global.SentUsernames.push({socketID: data.socketId, roomID: data.room, username: data.userName});
        }

        //Inform other members in the room of new user's arrival
        if ( socket.adapter.rooms.has(data.room) === true ) {
            socket.to( data.room ).emit( 'new user', { socketId: data.socketId } );
            //setTimeout(() => { con.query("UPDATE clients SET status = status & ~16 WHERE uuid = '" + data.room + "'"); }, 12000); // remove the person in waiting room status in 12 seconds if it's there? maybe I should make a socket-based waiting room to avoid this
        }

        // Create a disconnect sub
        socket.on('disconnect', (reason) => {
            //console.log(socket.adapter.rooms);
            if(socket.adapter.rooms.has(data.room))
            {
                socket.to( data.room ).emit('disconnectedUser', {socketId: data.socketId});
                //console.log("disconnected this socket", data.socketId);

                for(let i=0;i<global.SentUsernames.length;i++)
                {
                    let curUsernameObj = global.SentUsernames[i]; 
                    if(!curUsernameObj) continue;
                    if(data.socketId == curUsernameObj.socketID) global.SentUsernames.splice(i, 1);
                }
            }
        });
    } );

    socket.on( 'newUserStart', ( data ) => {
        socket.to( data.to ).emit( 'newUserStart', { sender: data.sender } );
    } );

    socket.on( 'sdp', ( data ) => {
        socket.to( data.to ).emit( 'sdp', { description: data.description, sender: data.sender } );
    } );

    socket.on( 'ice candidates', ( data ) => {
        socket.to( data.to ).emit( 'ice candidates', { candidate: data.candidate, sender: data.sender } );
    } );

    socket.on( 'message', (data) => {
        socket.to( data.room ).emit("createMessage", { message: data.message, userName: data.username });
    });

    socket.on( 'createRefreshRequest', (data) => {

        if(data && data.checksum !== undefined)
        {
            con.query('SELECT checksum FROM users WHERE checksum = ' + data.checksum , (err,rows) => {
                if(err) console.log(err);
                else if(rows)
                {
                    socket.to( data.room ).emit("requestRefresh", { request: 'refresh' });
                }
            });
        }
    });

    socket.on( 'timer', (data) => {

        let hasAlready = false;
        let foundObj = 0;
        for(let i=0;i<global.RoomTimers.length;i++)
        {
            let roomTimer = global.RoomTimers[i];
            if(!roomTimer) continue;
            if(roomTimer.room == data.room) { foundObj = roomTimer; hasAlready = true; break; }
        }
        if(hasAlready && foundObj)
        {
            let curTickSeconds = process.hrtime()[0];
            socket.to( data.room ).emit("timer", { curTime: curTickSeconds, firstTime: foundObj.firstTime });
        }

    });

    socket.on( 'settimer', (data) => {

        let hasAlready = false;
        let foundObj = 0;
        let curTickSeconds = process.hrtime()[0];
        for(let i=0;i<global.RoomTimers.length;i++)
        {
            let roomTimer = global.RoomTimers[i];
            if(!roomTimer) continue;
            if(roomTimer.room == data.room) { foundObj = roomTimer; hasAlready = true; break; }
        }
        if(!hasAlready) global.RoomTimers.push({room: data.room, firstTime: curTickSeconds, timer: curTickSeconds});
        else if(foundObj)
        {
            if(data.timer == 0) { foundObj.timer = curTickSeconds; foundObj.firstTime = curTickSeconds; }
            else { foundObj.timer = curTickSeconds - data.timer; foundObj.firstTime = curTickSeconds; } 
        }

    });
};

module.exports = stream;
