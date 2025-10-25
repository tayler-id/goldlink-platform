// Main Server/Setup // ========================================================================
require('dotenv').config();
let express = require( 'express' );
const fs = require('fs');
let app = express();

// Environment configuration
const PORT = process.env.PORT || 3005;
const USE_HTTPS = process.env.USE_HTTPS === 'true';
const SSL_KEY_PATH = process.env.SSL_KEY_PATH || './localhost+2-key.pem';
const SSL_CERT_PATH = process.env.SSL_CERT_PATH || './localhost+2.pem';
process.env.TZ = process.env.TZ || 'America/New_York'; // Process set EST timezone

// Create server (HTTPS for local dev, HTTP for Railway which handles SSL)
let server;
if (USE_HTTPS && fs.existsSync(SSL_KEY_PATH) && fs.existsSync(SSL_CERT_PATH)) {
    server = require('https').createServer({
        key: fs.readFileSync(SSL_KEY_PATH),
        cert: fs.readFileSync(SSL_CERT_PATH),
        requestCert: false,
        rejectUnauthorized: false,
    }, app).listen(PORT);
    console.log(`HTTPS Server running on port ${PORT}`);
} else {
    server = require('http').Server(app).listen(PORT);
    console.log(`HTTP Server running on port ${PORT}`);
} 
let path = require( 'path' );
//let favicon = require( 'serve-favicon' );
let bodyParser = require('body-parser');
const { v4: uuidv4 } = require("uuid");
app.set("view engine", "ejs");
const io = require("socket.io")(server, {
    pingInterval: parseInt(process.env.SOCKET_PING_INTERVAL) || 11000,
    pingTimeout: parseInt(process.env.SOCKET_PING_TIMEOUT) || 10000,
    cors: {origin: process.env.CORS_ORIGIN || '*'}
});
let stream = require( './ws/stream' );
//app.use( favicon( path.join( __dirname, 'favicon.ico' ) ) );
//app.use( '/assets', express.static( path.join( __dirname, 'assets' ) ) );
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.use(bodyParser.json());

// Emailing (primary server)
const nodemailer = require('nodemailer');
let mail_transport = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'localhost',
    port: parseInt(process.env.SMTP_PORT) || 465,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
       user: process.env.SMTP_USER || 'no-reply@goldlink.live',
       pass: process.env.SMTP_PASS || 'removed'
    },
    tls: {
        secure: process.env.SMTP_SECURE === 'true',
        ignoreTLS: false,
        rejectUnauthorized: false
    }
});

// Emailing (secondary server)
/*let mail_transport_secondary = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
       user: 'jurugi@gmail.com',
       pass: ''
    },
    tls: {
        secure: false,
        ignoreTLS: false,
        rejectUnauthorized: false
    }
});*/

// Texting
const brevo = require('@getbrevo/brevo');
const SibApiV3Sdk = require('sib-api-v3-sdk');

// MySQL
let con = require('./mysql/mysql8.js');
const { Socket } = require('socket.io');

// Cors configuration
app.all('/*', function(req, res, next) {
    res.header("Access-Control-Allow-Origin", process.env.CORS_ORIGIN || "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");
    next();
});

// Helpful functions // ========================================================================
async function bAuthCheck(checksum) // Check checksum authorization before proceeding, this was being reused so made into a function, returns the ID of the logged in user, or 0 if fails
{
    let isAuthed = 0;
    if(!checksum) return isAuthed;
    const waitforAuthQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT id, accesslevel, displaynamefirst, displaynamelast, status, pagelimit FROM users WHERE checksum = " + checksum, (err,rows) => {
                if(err) console.log(err);
                if(rows.length==1) isAuthed = rows[0];
                resolve(isAuthed);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("bAuthCheck", err); return 0; });
    return isAuthed;
}
async function getInvolvedClients(uid) // Gets involved clients for this UID
{
    let returnedRows = [];
    if(!uid) return returnedRows;
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT cid, uid FROM clientinvolved WHERE uid = " + uid, (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedRows = rows;
                resolve(returnedRows);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("getInvolvedClients", err); return 0; });
    return returnedRows;
}

// Gets the related company id and names for this user, slot 0 will be the primary/first company
async function getInvolvedCompanies(uid) 
{
    let returnedRows = [];
    if(!uid) return returnedRows;
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT c.name, c.id FROM userinvolved u JOIN companies c ON c.id = u.cid WHERE u.uid = " + uid, (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedRows = rows;
                resolve(returnedRows);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("getInvolvedCompanies", err); return 0; });
    return returnedRows;
}

async function getInvolvedUsers(compid) // Gets involved clients for this CompID
{
    let returnedRows = [];
    if(!uid) return returnedRows;
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT cid, uid FROM userinvolved WHERE cid = " + compid, (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedRows = rows;
                resolve(returnedRows);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("getInvolvedUsers", err); return 0; });
    return returnedRows;
}

async function resetWaitingRoomOpened(uuid) // Reset waiting room opened status to 0 after a time for this client
{
    if(!uuid) return false;
    if(con)
    {
        con.query("UPDATE clients SET status = status & ~1 WHERE uuid = '" + uuid + "'", (err,rows) => {
            if(err) { console.log(err); return false; }
            if (rows.changedRows == 1) return true;
            else return false;
        });
    }
}

async function resetAllowClientScreenShare(uuid) // Reset client screenshare
{
    if(!uuid) return false;
    if(con)
    {
        con.query("UPDATE clients SET status = status & ~256 WHERE uuid = '" + uuid + "'", (err,rows) => {
            if(err) { console.log(err); return false; }
            if (rows.changedRows == 1) return true;
            else return false;
        });
    }
}

async function resetWaitingRoomUsers(uuid, status=0) // Reset waiting room opened status to 0 after a time for this client
{
    if(!uuid) return false;
   
    if(con)
    {
        if(status==0)
        {
            con.query("UPDATE clients SET status = status & ~16 WHERE uuid = '" + uuid + "'", (err,rows) => {
                if(err) { console.log(err); return false; }
                if (rows.changedRows == 1) return true;
                else return false;
            });
        }
        else
        {
            status &= ~16;
            con.query("UPDATE clients SET status = " + status + " WHERE uuid = '" + uuid + "'", (err,rows) => {
                if(err) { console.log(err); return false; }
                if (rows.changedRows == 1) return true;
                else return false;
            });
        }
    }
}

global.WaitingRoomPulseChecks = []; // array of roomID and last TickTimes that are being pulse-checked [{room:'',time:0,status:0},...]
function addorupdateWaitingRoomPulseCheck(room, status)
{
    let curTickSeconds = process.hrtime()[0];
    let foundRoom = 0;
    for(let i=0; i<global.WaitingRoomPulseChecks.length; i++)
    {
        let curRoom = global.WaitingRoomPulseChecks[i];
        if(!curRoom) continue;
        if(curRoom.room == room) { foundRoom = curRoom; break; }
    }
    if(foundRoom) 
    {
        foundRoom.time=curTickSeconds;
        foundRoom.status=status;
    }
    else
    {
        global.WaitingRoomPulseChecks.push({room: room, time: curTickSeconds});
    }
}
function intervalResetWaitingRoomStatus() 
{
    let curTickSeconds = process.hrtime()[0];
    for(let i=0; i<global.WaitingRoomPulseChecks.length; i++)
    {
        let curRoom = global.WaitingRoomPulseChecks[i];
        if(!curRoom) continue;
        if(curTickSeconds - curRoom.time > 10) { resetWaitingRoomUsers(curRoom.room); global.WaitingRoomPulseChecks.splice(i, 1); } // over 10 seconds from last time update
    }
}
setInterval(intervalResetWaitingRoomStatus,3000);
async function getCachedStatus(room) // if available, just returns status from the cached version for WaitingRoom, for polling generic status without querying (big performance boost)
{
    let retStatus = 0;
    let foundRoom = 0;
    for(let i=0; i<global.WaitingRoomPulseChecks.length; i++)
    {
        let curRoom = global.WaitingRoomPulseChecks[i];
        if(!curRoom) continue;
        if(curRoom.room == room) { foundRoom = curRoom; break; }
    }
    if(foundRoom) retStatus = foundRoom.status;
    return retStatus;
}

// This is not maintained and the statuses can be referenced in /SCS endpoint
var ClientStatus = { // Bitfield for client statuses, can possibly add more statuses in the future
    ButtonOrientLeft: 0,
    Active: 1, // clients can join from waiting room
    Streaming: 2, // ?
    ButtonOrientBottom: 4,
    ButtonOrientTop: 8,
    SendWaitingPing: 16
};

function StringEscape(obj) // Local security to ensure character escape, without polling the SQL server
{
    if(!obj) return '';

    for (var key in obj) 
    {
        if (obj.hasOwnProperty(key)) 
        {
            //console.log(key + " -> " + obj[key]);
            let val = obj[key];
            if(typeof val !== 'string') continue;
            val = val.replace(/[\0\n\r\b\t\\'"\x1a]/g, function (s) {
                switch (s) {
                  case "\0":
                    return "\\0";
                  case "\n":
                    return "\\n";
                  case "\r":
                    return "\\r";
                  case "\b":
                    return "\\b";
                  case "\t":
                    return "\\t";
                  case "\x1a":
                    return "\\Z";
                  case "'":
                    return "''";
                  case '"':
                    return '""';
                  default:
                    return "\\" + s;
                }
            });
            obj[key] = val;
        }
    }

  return true;
};

// Fast Local CRC32 Func
function fcrc32 (str) 
{
    let a_table = "00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F 63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC 51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E 7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D 806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA 11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F 30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D";
    let b_table = a_table.split(' ').map(function(s){ return parseInt(s,16) });
    var crc = -1;
    for(var i=0, iTop=str.length; i<iTop; i++) {
        crc = ( crc >>> 8 ) ^ b_table[( crc ^ str.charCodeAt( i ) ) & 0xFF];
    }
    return (crc ^ (-1)) >>> 0;
}

// Routes below // =============================================================================

app.get("/", (req, res) => {
    res.redirect(`/${uuidv4()}`);
});

// Default index for Video rooms/chat
app.get( '/:room', ( req, res ) => {
    //res.sendFile( __dirname + '/index.html' );
    res.render('room', {roomId: req.params.room});
} );

// Stream/Connection IO route
io.of( '/stream' ).on( 'connection', stream );


// Other/API Routes // ===========================================================================

// Authcheck
app.post( '/bmapi/AC', ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Parse input
    if(parsedInput.checksum === undefined || parsedInput.checksum == 0) return res.send('N');

    con.query('SELECT checksum FROM users WHERE checksum = ' + parsedInput.checksum , (err,rows) => {
        //if(err) throw err;
        if(err) console.log(err);
        if(rows.length>0) return res.send((parsedInput.checksum).toString());
        else return res.send('N');
    });
});

// CheckLoginPage
app.post( '/bmapi/CLP', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);

    // Parse input
    if(parsedInput.user === undefined || parsedInput.user == '') return res.send('N');
    let user = parsedInput.user.trim();
    let pass = parsedInput.pass.trim();
    let code = parsedInput.code.trim();

    // Grab userdata and check 2FA setting
    let twofactorauth = false;
    let userdata = 0;
    let query = "SELECT id, user, pass, twofactorauth, email, phone, status, accesslevel FROM users WHERE (user = '" + user + "')";
    let userDataQuery = con.query(query, (err,rows) => {
        //if(err) throw err;
        if(rows.length==1) userdata = rows[0];
    });

    const waitingForQueries = await Promise.all([
        new Promise((resolve, reject) => {
            con.query(query, (err,rows) => {
                //if(err) throw err;
                if(rows.length==1) userdata = rows[0];
                //console.log(rows);
                resolve(userdata);
            });
        }),
        new Promise((resolve, reject) => {
            con.query('SELECT twofactorauth FROM settings WHERE id=1', (err,rows) => {
                //if(err) throw err;
                if(rows.length==1 && rows[0]['twofactorauth']!=0) 
                {
                    twofactorauth = true; 
                }
                resolve(twofactorauth);
            });
        }),
    ]).then((values) => {
    }).catch(function (err) { console.log(err); });

    // Check userdata's password or handle 2FA
    if(userdata)
    {
        // Check user statuses are set for phone or email 2fa, otherwise 2fa will be skipped
        let userstatus = userdata.status;
        if(twofactorauth)
        {
            if((userstatus&2)!=0 || (userstatus&4)!=0) twofactorauth = true;
            else twofactorauth = false;
        }

        let data = userdata;
        let uid = data.id;
        let curstatus = data.status;
        let curaccesslevel = data.accesslevel;
        if(data.pass == pass) // Successful login credentials, proceed to 2FA check
        {
            // Check inactive status (1=inactive flag) and access level (must be less than 3); if so they can't login
            if((curstatus&1)!=0 && curaccesslevel<3) 
            {
                return res.send('I');
            }

            if(!twofactorauth) // 2FA not required, so login
            {
                let checksum = fcrc32('' + user + pass);
                con.query("UPDATE users SET logincount = logincount + 1, checksum = " + checksum + " WHERE id = " + uid);
                return res.send(checksum.toString());
            }
            else // 2FA code is required, generate a code for this user
            {
                let cac = data.twofactorauth;
                let email = data.email;
                let phone = data.phone;
    
                if(cac) // Code provided
                {
                    if(parseInt(code) == parseInt(cac)) // Code equals the 2FA code, so login
                    {
                        let checksum = fcrc32('' + user + pass);
                        con.query("UPDATE users SET logincount = logincount + 1, twofactorauth = 0, checksum = " + checksum + " WHERE id = " + uid);
                        return res.send(checksum.toString()); // Send login checksum back as signal
                    }
                    else if (!code) return res.send('2'); 
                    else return res.send('3'); // 2FA code was provided, but entered one was wrong, send signal
                }
                else // Code not provided yet
                {
                    if(!cac) // If not set yet, generate and set the 2FA code
                    {
                        let randomcode = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
                        con.query("UPDATE users SET twofactorauth = " + randomcode + " WHERE id = " + uid + " LIMIT 1");
        
                        // Send Email
                        if((curstatus&2)!=0)
                        {
                            if(email && email.length>0)
                            {
                                let emailSender = '"Goldlink Authentication System" <no-reply@goldlink.live>';
                                let emailSubject = "Your 2FA Code";
                                let htmlBody = "Use this code to login: <b>" + randomcode + "</b>";
                                let textBody = "Use this code to login: " + randomcode;
                            
                                // Send email  
                                let info = await mail_transport.sendMail({
                                from: emailSender, // sender address
                                to: email, // list of receivers
                                subject: emailSubject, // Subject line
                                text: textBody, // plain text body
                                html: htmlBody, // html body
                                });

                                //return res.send('2'); // 2FA requested, no code yet provided, send signal
                            }
                            //else res.send('4'); // User has no email account anyway, so sending is impossible, send signal
                        }

                        // Send Text
                        if((curstatus&4)!=0)
                        {
                            if(phone && phone.length>0)
                            {
                                let textSender = '18445669468';
                                let textBody = "Use this code to login: " + randomcode;

                                // Send SMS 
                                // https://developers.sendinblue.com/reference/sendtransacsms
                                const defaultClient = SibApiV3Sdk.ApiClient.instance;
                                let apiKey = defaultClient.authentications['api-key'];
                                apiKey.apiKey = 'xkeysib-redacted-rNMIMbKN5dJJGc0I';
                                let apiInstance = new SibApiV3Sdk.TransactionalSMSApi();
                                let sendTransacSms = new SibApiV3Sdk.SendTransacSms();
                                sendTransacSms = {
                                    "sender":textSender,
                                    "recipient":phone,
                                    "content":textBody,
                                };
                                apiInstance.sendTransacSms(sendTransacSms).then(function(data) {
                                    //console.log('Texted 2fa successfully. Returned data: ' + JSON.stringify(data));
                                    return res.send('2'); // 2FA requested, no code yet provided, send signal
                                }, function(error) {
                                    console.error("2fa Texting Error", error);
                                    //return res.send('');
                                });
                            }
                            //else return res.send('4'); // User has no phone anyway, so sending is impossible, send signal
                        }
                        
                    }
                    return res.send('2'); // 2FA requested, no code yet provided, send signal
                }
            }

        }
        else return res.send('L'); // No password found
    }
    else return res.send('N'); // No username found
});

// GetGlobalSettings (e.g. 2FA, etc.)
app.post( '/bmapi/GGS', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);

    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;

    // Check authorization
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization, all 'users table' have access to the global settings, no roles etc. for now
    
    // Define return data
    let returndata = {'userregistration': 0, 'twofactorauth': 0, 'version': 0.00};
     
    // Fetch global settings
    const waitforGlobalSettingsQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT * FROM settings WHERE id = 1", (err,rows) => {
                if(err) console.log(err);
                if(rows.length==1) 
                {
                    returndata.userregistration = rows[0]['selfregistration'];
                    returndata.twofactorauth = rows[0]['twofactorauth'];
                    returndata.version = rows[0]['version'];
                }
                resolve(returndata);
            });
        })
    ]).then((values) => {
        // Return the data sent
       return res.json(returndata);
    }).catch(function (err) { console.log(err); return res.send('N'); });
});

// SetGlobalSettings (e.g. 2FA, etc.)
app.post( '/bmapi/SGS', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);

    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;

    // Check authorization
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization, all 'users table' have access to the global settings, no roles etc. for now
    
    // Define return data
    let userreg = parsedInput.userregistration;
    let twofactor = parsedInput.twofactorauth;
     
    // Set global settings
    const waitforGlobalSettingsQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("UPDATE settings SET selfregistration = " + userreg +", twofactorauth = " + twofactor + " WHERE id = 1 LIMIT 1", (err,result) => {
                if(err) console.log(err);
                resolve(result.changedRows);
            });
        })
    ]).then((values) => {
        // Return the data sent
       if(values[0] == 1) return res.send('Y');
       else return res.send('N');
    }).catch(function (err) { console.log(err); return res.send('N'); });
});


// Reset Password, for current logged in user
app.post( '/bmapi/RP', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);

    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
   
    // Check authorization
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization

    // Get Old/New Pass
    let oldpass = parsedInput.oldpass.trim();
    let newpass = parsedInput.newpass.trim();
    if(newpass.length < 2 || oldpass.length < 2) return res.send('N');

    con.query("UPDATE users SET pass = '" + newpass + "' WHERE pass LIKE '" + oldpass + "' AND checksum = " + checksum  + " LIMIT 1", (err,result) => {
        if(err) console.log(err);
        if(result.changedRows == 1) return res.send('Y');
        else return res.send('N');
    });
});

// Add Client, endpoint for a user to login and add new client/room
app.post( '/bmapi/AC2', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
    
    // Check authorization
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization

    // Get other client inputs
    let creatorUserID = isAuthed.id;
    let email = parsedInput.email;
    if(!email) email=''; // Email field is required
    let address = parsedInput.address;
    let name = parsedInput.name;
    let phone = parsedInput.phone;
    let notes = parsedInput.notes;
    let roomID = uuidv4();
    let compID = 1;
    if(parsedInput.compid !== undefined) 
    {
    compID = parsedInput.compid;
    }
    else 
    {
        let involvedCompanies = [];
        involvedCompanies = await getInvolvedCompanies(isAuthed.id);
        if(involvedCompanies.length) compID = involvedCompanies[0].id;
    }

    // Add client, set status flag(1) which will simply indicate the client is active and able to create or join their room
    let query = "INSERT INTO clients (email, status, name, addr, phone, notes, creationtime, uuid, compid, createdby) VALUES ('" + email +"', 0, '" + name + "', '" + address + "', '" + phone + "', '" + notes + "', CURRENT_TIMESTAMP, '" + roomID + "', "+compID+", "+creatorUserID+");";
    con.query(query, (err,result) => {
        if(err) { console.log(err); return res.send('N'); } 
        else if(result.affectedRows > 0) 
        {
            // Add involved UID (accesses)
            let newID = result.insertId;
            let query2 = "INSERT INTO clientinvolved (cid,uid) VALUES (" + newID + "," + creatorUserID + ");";
            con.query(query2); // don't need to await, it will just be added in time
            return res.send('Y');
        }
        else return res.send('N');
    });
});

// Edit Client, endpoint for a user to edit their client/room
app.post( '/bmapi/CE', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
   
    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization

    // Get other client inputs
    let clientid = parsedInput.id;
    let email = parsedInput.email;
    let address = parsedInput.address;
    let name = parsedInput.name;
    let phone = parsedInput.phone
    let notes = parsedInput.notes;
    let compid = parsedInput.compid;

    // Update client by ID
    let query = "UPDATE clients SET name='" + name + "', addr='" + address + "', email='" + email + "', phone='" + phone + "', notes='" + notes + "', compid=" + compid + " WHERE id = " + clientid + " LIMIT 1";
    con.query(query, (err,result) => {
        if(err) { console.log(err); return res.send('D'); }
        else if(result.changedRows > 0) return res.send('Y');
        else return res.send('N');
    });
});

// Get Client Info, send specific user info by ID
app.post( '/bmapi/GCI', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;

    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization

    // Get clientID (required input)
    let clientID = parsedInput.id;
    if(!clientID) return res.send('N');

    // Get involved company of user
    let involvedcompanies = [];
    involvedcompanies = await getInvolvedCompanies(isAuthed.id);
    if(!involvedcompanies) return res.send('C');

    // Get involved clients of user
    let involvedClients = [];
    involvedClients = await getInvolvedClients(isAuthed.id);
    if(!involvedClients) return res.send('C');

    // Get ClientInfo
    let query = "SELECT * FROM clients WHERE id = " + clientID;
    con.query(query, (err,rows) => {
        if(err) { console.log(err); return res.send('N'); }
        else 
        { 
            if(rows !== undefined && rows && rows.length==1) 
            {
                rows[0]['crcid'] = fcrc32(clientID); 
                rows[0]['isCreator'] = 0;
                if(rows[0].createdby && rows[0].createdby==isAuthed.id) rows[0]['isCreator'] = 1; 

                let isSuitableToSend = 0;
                if(rows[0]['isCreator']) isSuitableToSend = 1;
                if(!isSuitableToSend)
                {
                    for(let i=0;i<involvedClients.length;i++)
                    {
                        let involvedClient = involvedClients[i];
                        if(!involvedClient) continue;
                        if(involvedClient.uid==isAuthed.id && involvedClient.cid==rows[0].id) isSuitableToSend = 1;
                    }
                }

                // Company check for administrator
                if(!isSuitableToSend && isAuthed.accesslevel>=5)
                {
                    for(let i=0;i<involvedcompanies.length;i++)
                    {
                        let involvedCompany = involvedcompanies[i];
                        if(!involvedCompany) continue;
                        if(involvedCompany.id == rows[0]['compid']) isSuitableToSend = 1;
                    }
                }

                if(isSuitableToSend) return res.json(rows);
                else return res.send('N2');
            }
            else return res.send('N');
        }
    });
});

// Get Client Details
app.post( '/bmapi/GCD', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;

    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization

    // Get clientID (required input)
    let clientID = parsedInput.id;
    if(!clientID) return res.send('N');

    // Get involved CIDs
    let involvedIDs = 0;
    involvedIDs = await getInvolvedClients(isAuthed.id);

    // Get ClientInfo
    let query = "SELECT * FROM clients WHERE id = " + clientID;
    con.query(query, (err,rows) => {
        if(err) { console.log(err); return res.send('N'); }
        else 
        { 

            let sendRow = true;
            if(row[0].compid == 1) // Company is set 'Private', involved IDs are retrieved
            {
                sendRow = false;
                for(let i = 0; i<involvedIDs.length; i++)
                {
                    let involvedID = involvedIDs[i];
                    if(!involvedID || involvedID.cid === undefined) continue;
                    if(involvedID.cid == row[0].id && involvedID.uid == isAuthed.id) 
                    {
                        sendRow = true;
                    }
                }
            }
            
            if(sendRow) return res.json(rows) 
            else return res.send('I');
        }
    });
});

// Get Client Table Details
app.post( '/bmapi/GCTD', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;

    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization
    let accesslevel = isAuthed.accesslevel;

    // Get involved company of user
    let involvedcompanies = [];
    involvedcompanies = await getInvolvedCompanies(isAuthed.id);
    if(!involvedcompanies) return res.send('C');

    // Get clients, and get involved IDs
    let involvedIDs = [];
    const waitingForQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT cid, uid FROM clientinvolved", (err,rows) => {
                if(err) { console.log(err); return res.send('N'); }
                else { 
                    involvedIDs = rows;
                    resolve(involvedIDs);
                }
            })
        })
    ]).then((values) => {
    }).catch(function (err) { console.log(err); });
    if(!involvedIDs) return res.send('I');

    // Get clients, and filter involved IDs (todo: when adding new companies, we should make this include 'any' involved companies for this user with OR chaining, otherwise, this already should work)
    con.query("SELECT * FROM clients WHERE compid = 1 OR compid = " + involvedcompanies[0].id + " ORDER BY id DESC", (err,rows) => {
        if(err) { console.log(err); return res.send('N'); }
        else { 
            // Filter involved IDs before returning
            let newRows = [];
            if(involvedIDs && accesslevel<5) 
            {
                for(let i = 0; i<rows.length; i++)
                {
                    let row = rows[i];
                    for(let j = 0; j<involvedIDs.length; j++)
                    {
                        let involvedID = involvedIDs[j];
                        if(!involvedID || involvedID.cid === undefined) continue;
                        if(involvedID.cid == row.id && involvedID.uid == isAuthed.id) 
                        {
                            row['involvedCID'] = involvedID.cid;
                            newRows.push(row); // involved match, add this client to be sent
                        }
                    }
                }
                return res.json(newRows); 
            }
            else 
            {
                for(let i = 0; i<rows.length; i++) // add involvedCID anyway
                {
                    let row = rows[i];
                    let shouldAddRow = true;
                    if(row.compid == 1) shouldAddRow = false; // CompID is set to private company, set to false
                    for(let j = 0; j<involvedIDs.length; j++)
                    {
                        let involvedID = involvedIDs[j];
                        if(!involvedID || involvedID.cid === undefined) continue;
                        if(involvedID.cid == row.id) 
                        {
                            row['involvedCID'] = involvedID.cid;
                            if(involvedID.uid == isAuthed.id) // UID is involved directly, set it back to true
                            {
                                shouldAddRow = true;
                            }
                        }              
                    }
                    if(shouldAddRow) newRows.push(row);
                }
                return res.json(newRows);
            }
        };
    });

    
});

// Get Client Table Details Paginated
app.post( '/bmapi/GCTDP', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;

    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization
    let accesslevel = isAuthed.accesslevel;

    // Get page from parsed input
    let currentPage = 0;
    let limitPerPage = parseInt(isAuthed.pagelimit);
    if(parsedInput.page!==undefined) currentPage = parseInt(parsedInput.page);

    // Get involved company of user
    let involvedcompanies = [];
    involvedcompanies = await getInvolvedCompanies(isAuthed.id);
    if(!involvedcompanies) return res.send('C');

    // Get clients, and get involved IDs
    let involvedIDs = [];
    const waitingForQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT cid, uid FROM clientinvolved", (err,rows) => {
                if(err) { console.log(err); return res.send('N'); }
                else { 
                    involvedIDs = rows;
                    resolve(involvedIDs);
                }
            })
        })
    ]).then((values) => {
    }).catch(function (err) { console.log(err); });
    if(!involvedIDs) return res.send('I');

    // Get clients, and filter involved IDs (todo: when adding new companies, we should make this include 'any' involved companies for this user with OR chaining, otherwise, this already should work)
    con.query("SELECT * FROM clients WHERE compid = 1 OR compid = " + involvedcompanies[0].id + " ORDER BY id DESC", (err,rows) => {
        if(err) { console.log(err); return res.send('N'); }
        else { 
            // Filter involved IDs before returning
            let newRows = [];
            if(involvedIDs && accesslevel<5) 
            {
                let addedRowsforPagination = 0;
                let totalValidRows = 0;
                for(let i = 0; i<rows.length; i++)
                {
                    let row = rows[i];
                    let shouldAddRow = false;
                    for(let j = 0; j<involvedIDs.length; j++)
                    {
                        let involvedID = involvedIDs[j];
                        if(!involvedID || involvedID.cid === undefined) continue;
                        if(involvedID.cid == row.id && involvedID.uid == isAuthed.id) 
                        {
                            row['involvedCID'] = involvedID.cid;
                            shouldAddRow = true;
                            addedRowsforPagination++;
                        }
                    }
                    if(shouldAddRow) 
                    {
                        totalValidRows++;
                        if(currentPage>0 && totalValidRows<((currentPage-1)*limitPerPage)) continue; // skip prior entries if there is a page number sent
                        if(currentPage>0 && newRows.length>=limitPerPage) continue; // skip entries that go over the page amount, we still need to count total amount
                        newRows.push(row); // involved match, add this client to be sent
                    }
                }

                // Set the total amount of values (not accounting for amount sent by pagelimit/limitPerPage) into row[0]
                if(newRows.length>0) newRows[0].totalValidRows = totalValidRows;

                return res.json(newRows); 
            }
            else 
            {
                let addedRowsforPagination = 0;
                let totalValidRows = 0;
                for(let i = 0; i<rows.length; i++) // add involvedCID anyway
                {
                    let row = rows[i];
                    let shouldAddRow = true;
                    if(row.compid == 1) shouldAddRow = false; // CompID is set to private company, set to false
                    for(let j = 0; j<involvedIDs.length; j++)
                    {
                        let involvedID = involvedIDs[j];
                        if(!involvedID || involvedID.cid === undefined) continue;
                        if(involvedID.cid == row.id) 
                        {
                            row['involvedCID'] = involvedID.cid;
                            if(involvedID.uid == isAuthed.id) // UID is involved directly, set it back to true
                            {
                                shouldAddRow = true;
                                addedRowsforPagination++;
                            }
                        }              
                    }
                    if(shouldAddRow) 
                    {
                        totalValidRows++;
                        if(currentPage>0 && totalValidRows<((currentPage-1)*limitPerPage)) continue; // skip prior entries if there is a page number sent
                        if(currentPage>0 && newRows.length>=limitPerPage) continue; // skip entries that go over the page amount, we still need to count total amount
                        newRows.push(row);
                    }
                }
                // Set the total amount of values (not accounting for amount sent by pagelimit/limitPerPage) into row[0]
                if(newRows.length>0) newRows[0].totalValidRows = totalValidRows;
                return res.json(newRows);
            }
        };
    });

    
});

// Go to Room (redirect to video room)
app.get( '/bmapi/GTR/:id', ( req, res ) => {
    let redirectStr = '/' + req.params.id;
    res.redirect(redirectStr);
} );

// Go to Room (redirect to video room, depreciated)
app.get( '/bmapi/GTRo/:id', ( req, res ) => {
    let redirectStr = 'https://goldlink.live/?room=' + req.params.id;
    res.redirect(redirectStr);
} );

// CreateNewRoom
app.get( '/bmapi/CNR/:id', async ( req, res ) => {
    let checksum = req.params.id;
    StringEscape(checksum);
    if(!checksum) return res.send('Not authorized to create a room.'); 

    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('Not authorized to create a room.'); // exit if no checksum authorization

    // Redirect string
    res.redirect(`/${uuidv4()}`);
} );

// Get Room(s) Info
app.post( '/bmapi/GRI', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;

    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization

    // Get Rooms Initialized, and number of clients
    let Rooms = [];
    let Sockets = await io.of('/stream').fetchSockets();
    if(Sockets && Sockets.length>0)
    {
        for(let i=0;i<Sockets.length;i++)
        {
            let Socket = Sockets[i];
            if(!Socket || !Socket.adapter || !Socket.adapter.rooms) continue;
            let localRooms = Array.from(Socket.adapter.rooms.keys());
            for(let j=0;j<localRooms.length;j++)
            {
                let curKey = localRooms[j];
                let clientcount = Socket.adapter.rooms.get(curKey);
                if(curKey && curKey.includes('-') && curKey.length>20) // must match a UUID such as db573329-59e1-4865-95db-c36d5f6abbce
                {
                    let hasRoom=false;
                    for(let k=0;k<Rooms.length;k++)
                    {
                        let checkforRoom = Rooms[k];
                        if(!checkforRoom) continue;
                        if(checkforRoom.room === curKey) { checkforRoom.clients = clientcount.size; hasRoom = true; break; }
                    }
                    if(!hasRoom) 
                    {
						let returnedRows = [];
						const waitforQuery = await Promise.all([
							new Promise((resolve, reject) => {
								con.query("SELECT id FROM clients WHERE uuid = '" + curKey + "'", (err,rows) => {
									if(err) console.log(err);
									if(rows.length==1) returnedRows = rows;
									resolve(returnedRows);
								});
							})
						]).then((values) => {
						}).catch(function (err) { console.log("GetRoomInfo::getRoomInternalID", err); resolve(returnedRows); });
                        let pushedObj = {room: curKey, clients: Math.floor(clientcount.size)}; // each client joins 2 things so there shuld be 2 other ones per active client
                        if(returnedRows.length) pushedObj['id'] = returnedRows[0].id;
						Rooms.push(pushedObj);
                    }
                }
            }
        }
    }

    return res.json(Rooms);
});

// Get Client Status Request
app.post( '/bmapi/GCSR', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    //let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    //StringEscape(parsedInput);
    let parsedInput = req.body;

    let StatusObject = {status: 0};
    if(con)
    {
        con.query("SELECT status FROM clients WHERE uuid = '" + parsedInput.room + "'", (err,rows) => {
            if(err) { console.log(err);  res.send("N"); }
            if(rows.length==1) StatusObject.status = rows[0].status;
            else StatusObject.status = -1;
            return res.json(StatusObject);
        });
    }        
});

// Get Client Status Request (Angular parsing)
app.post( '/bmapi/GCSRA', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);

    let StatusObject = {status: 0};
    if(con)
    {
        con.query("SELECT status FROM clients WHERE uuid = '" + parsedInput.room + "'", (err,rows) => {
            if(err) { console.log(err);  res.send("N"); }
            if(rows.length==1) StatusObject.status = rows[0].status;
            return res.json(StatusObject);
        });
    }        
});

// Reset Client Status (remove endsession, etc.)
app.post( '/bmapi/RES', async ( req, res ) => {

   // Parse Angular's application/x-www-form-urlencoded
   let parsedInput = JSON.parse(Object.keys(req.body)[0]);
   StringEscape(parsedInput);
   
   // Get checksum (parse input)
   if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
   let checksum = parsedInput.checksum;
   let uuid = parsedInput.uuid;
   if(!uuid) return res.send('M');

   // Check authorization (this can all be improved if needed later)
   let isAuthed = await bAuthCheck(checksum);
   if(!isAuthed) return res.send('U'); // exit if no checksum authorization

    if(con)
    {
        con.query("UPDATE clients SET status = status & ~32 WHERE uuid = '" + uuid + "'", (err,rows) => {
            if(err) { console.log(err); return res.send('N'); }
            if (rows.changedRows == 1) return res.send('Y');
            else res.send('N');
        });
    }        

    // Remove/reset the timer for the room
    if(global.RoomTimers !== undefined)
    {
        let hasAlready = false;
        let foundObj = 0;
        for(let i=0;i<global.RoomTimers.length;i++)
        {
            let roomTimer = global.RoomTimers[i];
            if(!roomTimer) continue;
            if(roomTimer.room == uuid) { foundObj = roomTimer; hasAlready = true; global.RoomTimers.splice(i, 1); }
        }
    }
});

// Set Client Status Request
app.post( '/bmapi/SCS', async ( req, res ) => {

    let parsedInput = req.body;
    let checksum = parsedInput.checksum;
    let newStatus = parsedInput.status;

    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed && newStatus != 16) return res.send('U'); // exit if no checksum authorization, and status isn't a public one like 16(sendWaitingRoomPulse)

    // Can also check if this user is tied to this client/room, for now it's fine

    // Get current status
    let returnedRows = [];
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT status FROM clients WHERE uuid = '" + parsedInput.room + "'", (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedRows = rows;
                resolve(returnedRows);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("SetClientStatus::getStatus", err); return res.json({response:'N'}); });

    // Send results of update query
    let status = 0;
    if(returnedRows && returnedRows.length>0) status = returnedRows[0].status;
    if(con)
    {
        if(newStatus==0) { status &= ~64; status &= ~128; } // reset timer and anything else on newstatus = 0
        if(newStatus==0 || newStatus==4 || newStatus==8) { status &= ~4; status &= ~8;} // button orientation, can only be one of these, so unset other ones in these cases
        if((newStatus&1)!=0) { status &= ~1; resetWaitingRoomUsers(parsedInput.room); setTimeout(() => { resetWaitingRoomOpened(parsedInput.room); }, 15000); } // waiting room opened status, let's reset this on the server after 10 seconds to be sure
        if((newStatus&16)!=0) // user in waiting room
        {
            status &= ~16; // ensure it is being set
            addorupdateWaitingRoomPulseCheck(parsedInput.room); //add to update pulse check, it check the last updated time, then reset and stop after X seconds of inactivity
        }
        if(newStatus == 64 || newStatus == 128) { status &= ~64; status &= ~128; }// settings for show timer
        if(newStatus==0 && (status&256)!=0) { status &= ~256; } // allow client to screenshare, if newstatus=0 then just switch it off if it's on
        if((newStatus&256)!=0) { setTimeout(() => { resetAllowClientScreenShare(parsedInput.room); }, 10000); } // reset it after x seconds if the status included 256

        if((newStatus&512)!=0) {status &= ~1024; } // change room to be white look
        if((newStatus&1024)!=0) { status &= ~512; } // change room to be dark look
        // otherwise is original look

        //status |= newStatus; // add new status in
        if((status&newStatus)!=0) status &= ~newStatus;
        else status |= newStatus;
        
        con.query("UPDATE clients SET status = " + status + " WHERE uuid = '" + parsedInput.room + "'", (err,rows) => {
            if(err) { console.log(err); return res.json({response:'N'}); }
            if (rows.changedRows == 1) return res.json({response:'Y'});
            else res.json({response:'N'});
        });
    }        
});

// Get all room/client statuses in an array
app.post( '/bmapi/GRSA', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);

    // Check authorization
    let checksum = parsedInput.checksum;
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization

    if(con)
    {
        con.query("SELECT status, id FROM clients", (err,rows) => {
            if(err) { console.log(err); return res.send("N"); }
            else return res.json(rows);
        });
    }        
});


// Get Waiting Room Status Request
/*app.post( '/bmapi/GWRS', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);

    let clientrequest = parsedInput;
    let StatusObject = {status: 0};
    if(con)
    {
        con.query("SELECT status FROM clients WHERE uuid = '" + clientrequest.room + "'", (err,rows) => {
            if(err) { console.log(err);  res.send("N"); }
            if(rows.length==1) StatusObject.status = rows[0].status;
            return res.JSON(StatusObject);
           // socket.to( clientrequest.room ).emit('recvClientStatus', StatusObject);
        });
    }        
});*/

app.get( '/bmapi/waitingroomvideo1', async ( req, res ) => {

    // Randomize (if enabled)
    let number = 1;
    number = Math.floor(Math.random() * 4) + 1; // 0+1=1 to 3+1=4

    // Setup file
    let path = 'public/mp4/waitingroom' + number + '.mp4';
    const stat = fs.statSync(path)
    const fileSize = stat.size
    const range = req.headers.range
  
    if (range) {
      const parts = range.replace(/bytes=/, "").split("-")
      const start = parseInt(parts[0], 10)
      const end = parts[1]
        ? parseInt(parts[1], 10)
        : fileSize-1
  
      if(start >= fileSize) {
        res.status(416).send('Requested range not satisfiable\n'+start+' >= '+fileSize);
        return
      }
      
      const chunksize = (end-start)+1
      const file = fs.createReadStream(path, {start, end})
      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'video/mp4',
      }
  
      res.writeHead(206, head)
      file.pipe(res)
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'video/mp4',
      }
      res.writeHead(200, head)
      fs.createReadStream(path).pipe(res)
    }
});

app.get( '/bmapi/endsessionvideo1', async ( req, res ) => {
  const path = 'public/mp4/endsession1.mp4'
  const stat = fs.statSync(path)
  const fileSize = stat.size
  const range = req.headers.range

  if (range) {
    const parts = range.replace(/bytes=/, "").split("-")
    const start = parseInt(parts[0], 10)
    const end = parts[1]
      ? parseInt(parts[1], 10)
      : fileSize-1

    if(start >= fileSize) {
      res.status(416).send('Requested range not satisfiable\n'+start+' >= '+fileSize);
      return
    }
    
    const chunksize = (end-start)+1
    const file = fs.createReadStream(path, {start, end})
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    }

    res.writeHead(206, head)
    file.pipe(res)
  } else {
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    }
    res.writeHead(200, head)
    fs.createReadStream(path).pipe(res)
  }
});

// Get Therapist Username
app.post( '/bmapi/GTUN', async ( req, res ) => {

    let parsedInput = req.body;

    // Check authorization
    let checksum = parsedInput.checksum;
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.json({response: 'U'}); // exit if no checksum authorization

    let RetName = {name: ''};
    if(con)
    {
        con.query("SELECT displaynamefirst, displaynamelast FROM users WHERE checksum = " + checksum, (err,rows) => {
            if(err) { console.log(err); res.send("N"); }
            if(rows.length==1) 
            {
            RetName.name = '' + rows[0].displaynamefirst;
            if(rows[0].displaynamelast) RetName.name += ' ' + rows[0].displaynamelast;
            }
            return res.json(RetName);
        });
    }        
});

// Get Client Username
app.post( '/bmapi/GCUN', async ( req, res ) => {

    let parsedInput = req.body;

    // Parse input
    let RetName = {name: ''};
    if(parsedInput.roomid === undefined || !parsedInput.roomid) return res.json(RetName);
    let roomID = parsedInput.roomid;

    if(con)
    {
        con.query("SELECT name FROM clients WHERE uuid = '" + roomID + "'", (err,rows) => {
            if(err) { console.log(err); res.send("N"); }
            if(rows.length==1) RetName.name = rows[0].name;
            return res.json(RetName);
        });
    }        
});

// Send Client Session Email
app.post( '/bmapi/SCSE', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);

    // Check authorization
    let checksum = parsedInput.checksum;
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.json({response: 'U'}); // exit if no checksum authorization

    // Get current client data
    let returnedUser = '';
    let returnedLocalUser = '';
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT id, name, email, phone FROM clients WHERE uuid = '" + parsedInput.room + "'", (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedUser = rows[0];
                resolve(returnedUser);
            });
        }),
        new Promise((resolve, reject) => {
            con.query("SELECT email, displaynametitle FROM users WHERE checksum = " + checksum, (err,rows) => {
                if(err) console.log(err);
                if(rows.length==1) returnedLocalUser = rows[0];
                resolve(returnedLocalUser);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("SendClientSessionEmail::getClient", err); return res.send('N'); });
    if(!returnedUser) return res.send('N');

    // Get required client data, and username data.
    let roomUUID = parsedInput.room;
    let displayNameFirst = isAuthed.displaynamefirst;
    let displayNameLast = isAuthed.displaynamelast;
    let displayName = '' + displayNameFirst + ' ' + displayNameLast;
    let clientName = returnedUser.name;
    let clientEmail = returnedUser.email;
    if(returnedUser.email !== undefined) clientEmail = returnedUser.email;
    let clientPhone = '';
    if(returnedUser.phone !== undefined) clientPhone = returnedUser.phone;
    if(clientName) clientName = clientName.split(" ")[0]; // Take first name or first thing before space
    if(!clientEmail) return res.send('M');
    let displayNameTitle = 'Therapist'; 
    if(returnedLocalUser) // Add title if it exists to displayname 
    {
        if(returnedLocalUser.displaynametitle !== undefined & returnedLocalUser.displaynametitle)
        {
            displayNameTitle = returnedLocalUser.displaynametitle;
        }
    }
    if(displayNameTitle) displayName = displayNameTitle + ' ' + displayName;


    // SMS (placeholder)
    // https://developers.sendinblue.com/reference/sendtransacsms

    // Get latest scheduled time/date (maybe place this into the message too?) (placeholder)

    // Create HTML
    let aHrefLink = "<a href='https://sessions.goldlink.live/" + roomUUID  + "'>Click here to join meeting.</a>"
    let emailSender = '"Goldlink Sessions" <no-reply@goldlink.live>';
    let foundUserEmail = false;
    let replytoEmail = 'no-reply@goldlink.live';
    if(returnedLocalUser && returnedLocalUser.email !== undefined && returnedLocalUser.email.length > 6) { replytoEmail = returnedLocalUser.email; foundUserEmail = true; }
    let emailSubject = "Video Session Reminder";
    let htmlBody = "Hi " + clientName + ",<br/><br/>Please click the link below to join our meeting.<br/><br/>" + aHrefLink + "<br/><br/>Or go to https://goldlink.live and input your ID " + returnedUser.id + ".<br/><br/>Looking forward to seeing you!<br/>" + displayName;
    let textBody = "Hi " + clientName + ", Please click the link below to join our meeting. Click here to join: https://sessions.goldlink.live/" + roomUUID + " . Or go to https://goldlink.live and input your ID " + returnedUser.id + " . Looking forward to seeing you! -" + displayName;

    // Send email  
    let info = await mail_transport.sendMail({
    from: emailSender, // sender address
    to: clientEmail, // list of receivers
    subject: emailSubject, // Subject line
    text: textBody, // plain text body
    html: htmlBody, // html body
    replyTo: replytoEmail
    });

    //console.log("Email Message sent: %s", info.messageId);
    return res.send('Y');
 });

// Send Client Session Text
app.post( '/bmapi/SCST', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);

    // Check authorization
    let checksum = parsedInput.checksum;
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.json({response: 'U'}); // exit if no checksum authorization

    // Get current client data
    let returnedUser = '';
    let returnedLocalUser = '';
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT name, email, phone FROM clients WHERE uuid = '" + parsedInput.room + "'", (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedUser = rows[0];
                resolve(returnedUser);
            });
        }),
        new Promise((resolve, reject) => {
            con.query("SELECT phone,displaynametitle FROM users WHERE checksum = " + checksum, (err,rows) => {
                if(err) console.log(err);
                if(rows.length==1) returnedLocalUser = rows[0];
                resolve(returnedLocalUser);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("SendClientSessionText::getClient", err); return res.send('N'); });
    if(!returnedUser) return res.send('N');

    // Get required client data, and username data.
    let roomUUID = parsedInput.room;
    let displayNameFirst = isAuthed.displaynamefirst;
    let displayNameLast = isAuthed.displaynamelast;
    let displayName = '' + displayNameFirst + ' ' + displayNameLast;
    let clientName = returnedUser.name;
    let clientEmail = returnedUser.email;
    if(returnedUser.email !== undefined) clientEmail = returnedUser.email;
    let clientPhone = '';
    if(returnedUser.phone !== undefined) clientPhone = returnedUser.phone;
    if(!clientPhone) return res.send('M');
    if(clientPhone.length<=10 || clientPhone[0] != '1') clientPhone = '1' + clientPhone; // add US countrycode
    if(clientName) clientName = clientName.split(" ")[0]; // Take first name or first thing before space
    let sender = '18445669468';
    let displayNameTitle = 'Therapist'; 
    if(returnedLocalUser) 
    {
        //if(returnedLocalUser.phone !== undefined && returnedLocalUser.phone.length > 6)
        //{
            //sender = returnedLocalUser.phone;
            //sender = sender.replace(/\D/g,'');
        //}
        if(returnedLocalUser.displaynametitle !== undefined)
        {
            displayNameTitle = returnedLocalUser.displaynametitle;
        }
    }
    if(displayNameTitle) displayName = displayNameTitle + ' ' + displayName;

    // Create HTML
    //let textBody = "Hi " + clientName + ", May I request you join the video meeting soon? Click to join: https://therapy.goldlink.live/" + roomUUID + " . Looking forward to meeting with you! Therapist " + displayName;
    let textBody = "Hi " + clientName + ", please click the following link to join your meeting: https://sessions.goldlink.live/" + roomUUID + " . I'm looking forward to meeting with you! -" + displayName;

    // Send SMS 
    // https://developers.sendinblue.com/reference/sendtransacsms
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = 'xkeysib-redacted-rNMIMbKN5dJJGc0I';
    let apiInstance = new SibApiV3Sdk.TransactionalSMSApi();
    let sendTransacSms = new SibApiV3Sdk.SendTransacSms();
    sendTransacSms = {
        "sender":sender,
        "recipient":clientPhone,
        "content":textBody,
    };
    apiInstance.sendTransacSms(sendTransacSms).then(function(data) {
    console.log('Texted successfully. Returned data: ' + JSON.stringify(data));
    return res.send('Y');
    }, function(error) {
    console.error(error);
    return res.send('N2');
    });
 });

 // Get User Data
app.post( '/bmapi/GUD', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
 
    // Check authorization (this can all be improved if needed later)
    let isAuthed = 0;
    const waitforAuthQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT id, accesslevel, displaynamefirst, displaynamelast, email, phone, status, tzOffset, pagelimit FROM users WHERE checksum = " + checksum, (err,rows) => {
                if(err) console.log(err);
                if(rows.length==1) isAuthed = rows[0];
                resolve(isAuthed);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("bAuthCheck", err); return 0; });
    if(!isAuthed) return res.json({response: 'N'}); // exit if no checksum authorization 

    // Get user company
    let returnedRows = [];
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT u.cid, u.uid, c.name, c.id FROM userinvolved u JOIN companies c WHERE uid = " + isAuthed.id, (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedRows = rows;
                resolve(returnedRows);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("GetUserInfo::getInvolvedUsers", err); return res.send('N'); });
    //console.log(returnedRows);
    if(returnedRows && returnedRows.length>0)
    {
        let row = returnedRows[0];
        isAuthed['compid'] = row.cid;
        isAuthed['compname'] = row.name;
    }
    
    // Send all user data from query
    return res.json(isAuthed);
 });

  // Delete Current Client
app.post( '/bmapi/DCC', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
 
    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization
    
    // Check CID, sanitize to be a number
    if(parsedInput.CID === undefined || !parsedInput.CID) return res.send('C');
    let inputClientID = parseInt(parsedInput.CID);

    // Check accesslevel or createdby 
    let hasAccess = 0;
    if(isAuthed.accesslevel >= 5) 
    {
        hasAccess = 1;
    }
    if(!hasAccess)
    {
        const waitingForQuery = await Promise.all([
            new Promise((resolve, reject) => {
                con.query("SELECT id, createdby FROM clients WHERE createdby="+isAuthed.id, (err,rows) => {
                    if(err) { console.log(err); resolve(hasAccess); }
                    else { 
                        for(let i=0;i<rows.length;i++)
                        {
                            let row = rows[i];
                            if(!row) continue;
                            if(row.id == inputClientID) hasAccess=1;
                        }
                        resolve(hasAccess);
                    }
                })
            })
        ]).then((values) => {
        }).catch(function (err) { console.log(err); });
    } 
    // Failed authorization
    if(!hasAccess) return res.send('N');

    // Delete this client
    let query = "DELETE FROM clients WHERE id=" + parsedInput.CID;
    con.query(query, (err,result) => {
        if(err) console.log(err);
        else if(result.affectedRows > 0) return res.send('Y');
        else return res.send('N');
    });
 });

 // Get Schedule for Client
 app.post( '/bmapi/GSC', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
 
    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization 

    // Check CID
    if(parsedInput.id === undefined || !parsedInput.id) return res.send('C');
    let cid = parsedInput.id;

    // Get schedules for this client
    con.query("SELECT id, date, status, length FROM scheduling WHERE cid = '" + cid + "'", (err,rows) => {
        if(err) { console.log(err);  res.send('N'); }
        if(rows.length>0) return res.json(rows);
        else return res.send('Y');
    });
 });

  // Add Schedule for Client
  app.post( '/bmapi/ASC', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
 
    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization 

    // Check inputs
    if(parsedInput.id === undefined || !parsedInput.id) return res.send('C');
    let cid = parsedInput.id;
    if(parsedInput.status === undefined) return res.send('S');
    let status = parsedInput.status;
    if(parsedInput.date === undefined || !parsedInput.date) return res.send('D');
    let date = parsedInput.date;
    if(parsedInput.slength === undefined || !parsedInput.slength) return res.send('L');
    let slength = parsedInput.slength;
    let uid = isAuthed.id;

    // Wait, to find overlapping schedules first
    let hasOverlap = false;
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT id, date, length FROM scheduling WHERE cid = " + cid, (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) 
                {
                    let originaldate = new Date(date);
                    let originaldateend = new Date(originaldate);
                    let originallen = slength;
                    let hasEndOverlap = false;
                    let hasStartOverlap = false;
                    originaldateend.setMinutes( originaldateend.getMinutes() + parseInt(originallen));
                    

                    for(let i=0;i<rows.length;i++)
                    {
                        let row = rows[i];
                        if(!row) continue;

                        // Split timestamp into [ Y, M, D, h, m, s ]
                        let scheduledate = row.date;
                        let datestart = new Date(scheduledate);
                        let dateend = new Date(datestart);
                        dateend.setMinutes(dateend.getMinutes() + row.length);

                        // Check month and year first
                        let CheckMonthYear = false;
                        if((datestart.getMonth() == originaldate.getMonth() && datestart.getYear() == originaldate.getYear()) || (dateend.getMonth() == originaldateend.getMonth() && datestart.getYear() == originaldate.getYear())) CheckMonthYear = true;
                        if(!CheckMonthYear) continue;

                        // Check Day First, it must be the same day for either the start/end periods
                        let CheckDayFirst = false;
                        if(datestart.getDate() == originaldate.getDate() || dateend.getDate() == originaldateend.getDate()) CheckDayFirst = true;
                        if(!CheckDayFirst) continue;

                        //console.log("same date", originaldate, originaldateend, "vs", datestart, dateend);

                        if(originaldate > datestart && originaldate < dateend) { hasOverlap = row; break; }
                        if(originaldate < datestart && originaldateend > datestart) { hasOverlap = row; break; }
                    }
                }
                resolve(hasOverlap);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("AddScheduledClient::bHasOverlap", err); return 0; });
    if(hasOverlap) return res.send('O');

    // Insert schedule
    let query = "INSERT INTO scheduling (cid,uid,status,date,length) VALUES (" + cid + "," + uid + "," + status + ",'" + date + "'," + slength + ");";
    con.query(query, (err,result) => {
        if(err) { console.log(err); return res.send('N'); } 
        else if(result.affectedRows > 0) 
        {
            // Add involved UID (accesses)
            let newID = result.insertId;
            return res.send('Y' + newID);
        }
        else return res.send('N');
    });
 });

  // Edit Schedule for Client
  app.post( '/bmapi/ESC', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
 
    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization 

    // Check inputs
    if(parsedInput.id === undefined || !parsedInput.id) return res.send('C');
    let sid = parsedInput.id;
    if(parsedInput.status === undefined) return res.send('S');
    let status = parsedInput.status;
    let deleteschedule = false;
    if(parsedInput.deletes !== undefined && parsedInput.deletes) deleteschedule = true;
    if(parsedInput.slength === undefined || !parsedInput.slength) return res.send('L');
    let slength = parsedInput.slength;

    // Insert schedule
    /*let query = "INSERT INTO scheduling (cid,uid,status,date,length) VALUES (" + cid + "," + isAuthed.id + "," + status + ",'" + date + "'," + slength + ");";
    con.query(query, (err,result) => {
        if(err) { console.log(err); return res.send('N'); } 
        else if(result.affectedRows > 0) 
        {
            // Add involved UID (accesses)
            let newID = result.insertId;
            return res.send('Y');
        }
        else return res.send('N');
    });*/

    if(deleteschedule)
    {
        // Delete this client
        let query = "DELETE FROM scheduling WHERE id=" + sid;
        con.query(query, (err,result) => {
            if(err) console.log(err);
            else if(result.affectedRows > 0) return res.send('Y');
            else return res.send('N');
        });
    }
    else
    {
        // Update client by ID
        let query = "UPDATE scheduling SET status=" + status + ", length=" + slength + " WHERE id=" + sid + " LIMIT 1";
        con.query(query, (err,result) => {
            if(err) console.log(err);
            else if(result.changedRows > 0) return res.send('Y');
            else return res.send('N');
        });
    }
 });

  // Get Closest Schedule for Client
  app.post( '/bmapi/GCSC', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
 
    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization 

    // Check CID
    if(parsedInput.id === undefined || !parsedInput.id) return res.send('C');
    let cid = parsedInput.id;

    // Get schedules for this client
    let returnedObject = [0,0];
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT id, date, status, length FROM scheduling WHERE cid = " + cid + " AND date > NOW() ORDER BY ABS( DATEDIFF( date, NOW() ) ) LIMIT 1", (err,rows) => {
                if(err) { console.log(err); res.send('N'); }
                if(rows.length>0) returnedObject[0] = rows[0];
                resolve(returnedObject);
            });
        }),
        new Promise((resolve, reject) => {
            con.query("SELECT id, date, status, length FROM scheduling WHERE cid = " + cid + " AND date <= NOW() ORDER BY ABS( DATEDIFF( date, NOW() ) ) LIMIT 1", (err,rows) => {
                if(err) { console.log(err); res.send('N'); }
                if(rows.length>0) returnedObject[1] = rows[0];
                resolve(returnedObject);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("GetClosestScheduleforClient", err); return 0; });

    return res.json(returnedObject);
 });

  // Get Schedule for User (all clients involved with this user)
  app.post( '/bmapi/GSU', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
 
    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization 

    // Check UID
    if(parsedInput.id === undefined || !parsedInput.id) return res.send('U');
    let uid = parsedInput.id;

    // Check AccessLevel or if this is the same user
    let hasAccess = false;
    if(isAuthed.accesslevel > 4 || isAuthed.id == uid) hasAccess = true;
    if(!hasAccess) return res.send('U');

    // Get schedules for this client
    con.query("SELECT s.id, s.date, s.status, s.length, s.cid, c.name, u.displaynamefirst, u.displaynamelast FROM scheduling s JOIN clients c ON c.id = s.cid JOIN users u ON u.id = s.uid WHERE s.uid = " + uid, (err,rows) => {
        if(err) { console.log(err); return res.send('N'); }
        if(rows.length>0) return res.json(rows);
        else return res.send('Y');
    });
 });

 // Get Client First Related Physicist
app.post( '/bmapi/GCFRP', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;

    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization

    // Get clientID (required input)
    let clientID = parsedInput.id;
    if(!clientID) return res.send('C');

    // Get Client Involved and add the user data
    let returnedRows = [];
    con.query("SELECT c.cid, c.uid, u.displaynamefirst, u.displaynamelast FROM  clientinvolved c JOIN users u ON u.id = c.uid WHERE c.cid =" + clientID, (err,rows) => {
        if(err) console.log(err);
        if(rows.length>0) return res.json(rows);
        else return res.send('N');
    });

});

// Send Client Session Email (gets latest 'scheduled' date, then sends email about it, or if 'sid' is sent, gets that date and sends the notification)
app.post( '/bmapi/SCSE2', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);

    // Check authorization
    let checksum = parsedInput.checksum;
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.json({response: 'U'}); // exit if no checksum authorization

     // Check if cid was supplied
     if(parsedInput.cid === undefined || !parsedInput.cid) return res.send('C');

    // Check if sid was supplied
    let sid = '';
    if(parsedInput.sid !== undefined && parsedInput.sid) sid = parsedInput.sid;

    // Get current client data
    let returnedUser = '';
    let returnedLocalUser = '';
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT id, name, email, phone FROM clients WHERE id= '" + parsedInput.cid + "'", (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedUser = rows[0];
                resolve(returnedUser);
            });
        }),
        new Promise((resolve, reject) => {
            con.query("SELECT email FROM users WHERE checksum = " + checksum, (err,rows) => {
                if(err) console.log(err);
                if(rows.length==1) returnedLocalUser = rows[0];
                resolve(returnedLocalUser);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("SendClientSessionEmail2::getClient", err); return res.send('N'); });
    if(!returnedUser) return res.send('N');

    // Get required client data, and username data.
    let displayNameFirst = isAuthed.displaynamefirst;
    let displayNameLast = isAuthed.displaynamelast;
    let displayName = '' + displayNameFirst + ' ' + displayNameLast;
    let clientName = returnedUser.name;
    let clientEmail = returnedUser.email;
    if(returnedUser.email !== undefined) clientEmail = returnedUser.email;
    let clientPhone = '';
    if(returnedUser.phone !== undefined) clientPhone = returnedUser.phone;
    if(clientName) clientName = clientName.split(" ")[0]; // Take first name or first thing before space
    if(!clientEmail) return res.send('M');

    // Get latest scheduled time/date (maybe place this into the message too?) (placeholder)
    let returnedScheduling = [0];
    let cid = returnedUser.id;
    let squery = "SELECT id, date, status, length FROM scheduling WHERE cid = " + cid + " AND date > NOW() ORDER BY ABS( DATEDIFF( date, NOW() ) ) LIMIT 1";
    if(sid) squery = "SELECT id, date, status, length FROM scheduling WHERE id = " + sid;
    const waitforQuery2 = await Promise.all([
        new Promise((resolve, reject) => {
            con.query(squery, (err,rows) => {
                if(err) { console.log(err); res.send('N'); }
                if(rows.length>0) returnedScheduling[0] = rows[0];
                resolve(returnedScheduling);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("SendClientSessionEmail2::getScheduling", err); return res.send('N'); });

    // Create HTML
    let sessionDateStr = '';
    if(returnedScheduling[0])
    {
        let newDate = new Date(returnedScheduling[0].date);
        sessionDateStr = '  for ' + newDate.toUTCString();
    }
    let emailSender = '"Gold Link Sessions" <no-reply@goldlink.live>';
    let foundUserEmail = false;
    let replytoEmail = 'no-reply@goldlink.live';
    if(returnedLocalUser && returnedLocalUser.email !== undefined && returnedLocalUser.email.length > 6) { replytoEmail = returnedLocalUser.email; foundUserEmail = true; }
    let emailSubject = "Your Therapy Session is Scheduled";
    let htmlBody = "Hi " + clientName + ",<br/><br/>A new session has been scheduled" + sessionDateStr + ". <br/><br/>See you soon!<br/>Therapist " + displayName;
    let textBody = "Hi " + clientName + ", A new session has been scheduled" + sessionDateStr + ". See you soon! Therapist " + displayName;

    // Send email  
    let info = await mail_transport.sendMail({
    from: emailSender, // sender address
    to: clientEmail, // list of receivers
    subject: emailSubject, // Subject line
    text: textBody, // plain text body
    html: htmlBody, // html body
    replyTo: replytoEmail
    });

    //console.log("Emailed successfully: %s", info.messageId);
    return res.send('Y');
 });

 // Send Client Session Text (gets latest 'scheduled' date, then sends text about it, or if 'sid' is sent, gets that date and sends the notification)
app.post( '/bmapi/SCST2', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);

    // Check authorization
    let checksum = parsedInput.checksum;
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.json({response: 'U'}); // exit if no checksum authorization

    // Check if cid was supplied
    if(parsedInput.cid === undefined || !parsedInput.cid) return res.send('C');

    // Check if sid was supplied
    let sid = '';
    if(parsedInput.sid !== undefined && parsedInput.sid) sid = parsedInput.sid;

    // Get current client data
    let returnedUser = '';
    let returnedLocalUser = '';
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT id, name, email, phone FROM clients WHERE id = '" + parsedInput.cid + "'", (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedUser = rows[0];
                resolve(returnedUser);
            });
        }),
        new Promise((resolve, reject) => {
            con.query("SELECT phone FROM users WHERE checksum = " + checksum, (err,rows) => {
                if(err) console.log(err);
                if(rows.length==1) returnedLocalUser = rows[0];
                resolve(returnedLocalUser);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("SendClientSessionText2::getClient", err); return res.send('N'); });
    if(!returnedUser) return res.send('N');

    // Get required client data, and username data.
    let displayNameFirst = isAuthed.displaynamefirst;
    let displayNameLast = isAuthed.displaynamelast;
    let displayName = '' + displayNameFirst + ' ' + displayNameLast;
    let clientName = returnedUser.name;
    let clientEmail = returnedUser.email;
    if(returnedUser.email !== undefined) clientEmail = returnedUser.email;
    let clientPhone = '';
    if(returnedUser.phone !== undefined) clientPhone = returnedUser.phone;
    if(!clientPhone) return res.send('M');
    if(clientPhone.length<=10) clientPhone = '1' + clientPhone; // add US countrycode
    if(clientName) clientName = clientName.split(" ")[0]; // Take first name or first thing before space
    let sender = 'autotext';
    if(returnedLocalUser && returnedLocalUser.phone !== undefined && returnedLocalUser.phone.length > 6) 
    {
        sender = returnedLocalUser.phone;
        sender = sender.replace(/\D/g,'');
    }

    // Get latest scheduled time/date (maybe place this into the message too?) (placeholder)
    let returnedScheduling = [0];
    let cid = returnedUser.id;
    let squery = "SELECT id, date, status, length FROM scheduling WHERE cid = " + cid + " AND date > NOW() ORDER BY ABS( DATEDIFF( date, NOW() ) ) LIMIT 1";
    if(sid) squery = "SELECT id, date, status, length FROM scheduling WHERE id = " + sid;
    const waitforQuery2 = await Promise.all([
        new Promise((resolve, reject) => {
            con.query(squery, (err,rows) => {
                if(err) { console.log(err); res.send('N'); }
                if(rows.length>0) returnedScheduling[0] = rows[0];
                resolve(returnedScheduling);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("SendClientSessionText2::getScheduling", err); return res.send('N'); });

    // Create HTML
    let sessionDateStr = '';
    if(returnedScheduling[0])
    {
        let newDate = new Date(returnedScheduling[0].date);
        sessionDateStr = newDate.toUTCString();
    }
    let textBody = "Hi " + clientName + ", Your new session has been requested for " + sessionDateStr +". See you soon! Therapist " + displayName;

    // Send SMS 
    // https://developers.sendinblue.com/reference/sendtransacsms
    const defaultClient = SibApiV3Sdk.ApiClient.instance;
    let apiKey = defaultClient.authentications['api-key'];
    apiKey.apiKey = 'xkeysib-redacted-rNMIMbKN5dJJGc0I';
    let apiInstance = new SibApiV3Sdk.TransactionalSMSApi();
    let sendTransacSms = new SibApiV3Sdk.SendTransacSms();
    sendTransacSms = {
        "sender":sender,
        "recipient":clientPhone,
        "content":textBody,
    };
    apiInstance.sendTransacSms(sendTransacSms).then(function(data) {
    console.log('Texted successfully. Returned data: ' + JSON.stringify(data));
    return res.send('Y');
    }, function(error) {
    console.error(error);
    return res.send('N');
    });
 });

 // Get Schedule for Client
async function ScheduleNotificationBot()
{
    // Get schedules
    let schedules = [];
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT * FROM scheduling WHERE date >= (NOW() - INTERVAL 1240 MINUTE) AND date < (NOW() + INTERVAL 1240 MINUTE) ORDER BY ABS( DATEDIFF( date, NOW() ) )", (err,rows) => {
                if(err) { console.log(err);  res.send('N'); }
                if(rows.length>0) schedules = rows;
                resolve(schedules);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("SendClientSessionText2::getScheduling", err); return res.send('N'); });
    if(!schedules) return res.send('N');

    // Iterate schedules and get the statuses checked
    for(let i=0;i<schedules.length;i++)
    {
        let schedule = schedules[i];
        if(!schedule) continue;
        let curStatus = parseInt(schedule.status);

        let hasEmailNotif = false;
        let hasTextNotif = false;
        if((curStatus&16)) hasTextNotif = true; // Notify by text
        if((curStatus&32)) hasEmailNotif = true; // Notify by email
        if(!hasEmailNotif && !hasTextNotif) continue;

        // Get user/cid of sessionID (userID is the one who set up the session)
        let cid = schedule.cid;
        let uid = schedule.uid;
        if(!cid || !uid) continue;

        // Check if it's been past 24 hrs or 1 hr
        let hasPassed24Hrs = false;
        let hasPassed1Hr = false;
        let schedDate = new Date(schedule.date);
        let curDate = new Date();
        let T24HoursAgo = new Date(schedDate);
        T24HoursAgo.setDate( T24HoursAgo.getDate() - 1 );
        let T1HourAgo = new Date(schedDate);
        T1HourAgo.setHours( T24HoursAgo.getHours() - 1 );
        if(T24HoursAgo < curDate) hasPassed24Hrs = true;
        if(T1HourAgo < curDate) hasPassed1Hr = true;
        if(!hasPassed24Hrs && !hasPassed1Hr) continue;
        //console.log(schedule.date, hasPassed24Hrs, hasPassed1Hr, cid, uid, hasEmailNotif, hasTextNotif, curStatus, (curStatus&1), (curStatus&4));
        
        // Set has updated status
        hasUpdatedStatus = false;

        // If notify 24 hours has been set, and has not been sent yet
        if((curStatus&1)>0 && (curStatus&4)==0 && hasPassed24Hrs) // Notify 24 hours
        {
            // Get current client data
            let returnedUser = '';
            let returnedLocalUser = '';
            const waitforQuery = await Promise.all([
                new Promise((resolve, reject) => {
                    con.query("SELECT id, name, email, phone, uuid FROM clients WHERE id = '" + cid + "'", (err,rows) => {
                        if(err) console.log(err);
                        if(rows.length>0) returnedUser = rows[0];
                        resolve(returnedUser);
                    });
                }),
                new Promise((resolve, reject) => {
                    con.query("SELECT email, phone, displaynamefirst, displaynamelast FROM users WHERE id = " + uid, (err,rows) => {
                        if(err) console.log(err);
                        if(rows.length==1) returnedLocalUser = rows[0];
                        resolve(returnedLocalUser);
                    });
                })
            ]).then((values) => {
            }).catch(function (err) { console.log("SendTextEmailBot::getClientandUserInfo", err); });
            if(!returnedUser) continue;

            // Handle text notification
            if(hasTextNotif)
            {
                // Get required client data, and username data.
                let displayNameFirst = returnedLocalUser.displaynamefirst;
                let displayNameLast = returnedLocalUser.displaynamelast;
                let displayName = '' + displayNameFirst + ' ' + displayNameLast;
                let clientName = returnedUser.name;
                let clientEmail = returnedUser.email;
                if(returnedUser.email !== undefined) clientEmail = returnedUser.email;
                let clientPhone = '';
                if(returnedUser.phone !== undefined) clientPhone = returnedUser.phone;
                if(!clientPhone) return res.send('M');
                if(clientPhone.length<=10) clientPhone = '1' + clientPhone; // add US countrycode
                if(clientName) clientName = clientName.split(" ")[0]; // Take first name or first thing before space
                let sender = 'autotext';
                if(returnedLocalUser && returnedLocalUser.phone !== undefined && returnedLocalUser.phone.length > 6) 
                {
                    sender = returnedLocalUser.phone;
                    sender = sender.replace(/\D/g,'');
                }

                // Create HTML
                let sessionDateStr = '';
                if(schedule.date)
                {
                    let newDate = new Date(schedule.date);
                    sessionDateStr = newDate.toUTCString();
                }
                let textBody = "Hi " + clientName + ", reminder that your therapy session is within 24 hours @ " + sessionDateStr +". See you there!";

                // Send SMS 
                // https://developers.sendinblue.com/reference/sendtransacsms
                const defaultClient = SibApiV3Sdk.ApiClient.instance;
                let apiKey = defaultClient.authentications['api-key'];
                apiKey.apiKey = 'xkeysib-redacted-rNMIMbKN5dJJGc0I';
                let apiInstance = new SibApiV3Sdk.TransactionalSMSApi();
                let sendTransacSms = new SibApiV3Sdk.SendTransacSms();
                sendTransacSms = {
                    "sender":sender,
                    "recipient":clientPhone,
                    "content":textBody,
                };
                apiInstance.sendTransacSms(sendTransacSms).then(function(data) {
                console.log('Texted successfully. Returned data: ' + JSON.stringify(data));
                }, function(error) {
                console.error(error);
                });
            }

            // Handle email notification
            if(hasEmailNotif)
            {
                // Get required client data, and username data.
                let displayNameFirst = returnedLocalUser.displaynamefirst;
                let displayNameLast = returnedLocalUser.displaynamelast;
                let displayName = '' + displayNameFirst + ' ' + displayNameLast;
                let clientName = returnedUser.name;
                let clientEmail = returnedUser.email;
                if(returnedUser.email !== undefined) clientEmail = returnedUser.email;
                let clientPhone = '';
                if(returnedUser.phone !== undefined) clientPhone = returnedUser.phone;
                if(clientName) clientName = clientName.split(" ")[0]; // Take first name or first thing before space
                if(!clientEmail) return res.send('M');

                // Create HTML
                let sessionDateStr = '';
                if(schedule.date)
                {
                    let newDate = new Date(schedule.date);
                    sessionDateStr = '  for ' + newDate.toUTCString();
                }
                let emailSender = '"Gold Link Sessions" <no-reply@goldlink.live>';
                let foundUserEmail = false;
                let replytoEmail = 'no-reply@goldlink.live';
                if(returnedLocalUser && returnedLocalUser.email !== undefined && returnedLocalUser.email.length > 6) { replytoEmail = returnedLocalUser.email; replytoEmail = true; }
                let emailSubject = "Your Therapy Session is Scheduled";
                let htmlBody = "Hi " + clientName + ",<br/><br/>This is an automatic reminder your session is within 24 hours" + sessionDateStr + ". <br/><br/>See you soon!<br/>Therapist " + displayName;
                let textBody = "Hi " + clientName + ",This is an automatic reminder that your therapy session is within 24 hours" + sessionDateStr + ". See you soon! Therapist " + displayName;

                // Send email  
                let info = await mail_transport.sendMail({
                from: emailSender, // sender address
                to: clientEmail, // list of receivers
                subject: emailSubject, // Subject line
                text: textBody, // plain text body
                html: htmlBody, // html body
                replyTo: replytoEmail
                });
            }

            // Set status &4 afterward (sent 24 hour notification)
            curStatus |= 4;
            con.query("UPDATE scheduling SET status = " + curStatus + " WHERE id = " + schedule.id, (err,rows) => {
                if(err) { console.log(err); }
                else hasUpdatedStatus = true;
                if(hasUpdatedStatus) console.log("Notify24 by email/text for", schedule);
            });
        }
            
    
        // If notify 1 hour has been set, and has not been sent yet
        if((curStatus&2) && !(curStatus&8) && hasPassed1Hr) // Notify 1 hour
        {
           // Get current client data
           let returnedUser = '';
           let returnedLocalUser = '';
           const waitforQuery = await Promise.all([
               new Promise((resolve, reject) => {
                   con.query("SELECT id, name, email, phone, uuid FROM clients WHERE id = '" + cid + "'", (err,rows) => {
                       if(err) console.log(err);
                       if(rows.length>0) returnedUser = rows[0];
                       resolve(returnedUser);
                   });
               }),
               new Promise((resolve, reject) => {
                   con.query("SELECT email, phone, displaynamefirst, displaynamelast FROM users WHERE id = " + uid, (err,rows) => {
                       if(err) console.log(err);
                       if(rows.length==1) returnedLocalUser = rows[0];
                       resolve(returnedLocalUser);
                   });
               })
           ]).then((values) => {
           }).catch(function (err) { console.log("SendTextEmailBot::getClientandUserInfo", err); });
           if(!returnedUser) continue;

           // Handle text notification
           if(hasTextNotif)
           {
               // Get required client data, and username data.
               let displayNameFirst = returnedLocalUser.displaynamefirst;
               let displayNameLast = returnedLocalUser.displaynamelast;
               let displayName = '' + displayNameFirst + ' ' + displayNameLast;
               let clientName = returnedUser.name;
               let clientEmail = returnedUser.email;
               if(returnedUser.email !== undefined) clientEmail = returnedUser.email;
               let clientPhone = '';
               if(returnedUser.phone !== undefined) clientPhone = returnedUser.phone;
               if(!clientPhone) return res.send('M');
               if(clientPhone.length<=10) clientPhone = '1' + clientPhone; // add US countrycode
               if(clientName) clientName = clientName.split(" ")[0]; // Take first name or first thing before space
               let sender = 'autotext';
               if(returnedLocalUser && returnedLocalUser.phone !== undefined && returnedLocalUser.phone.length > 6) 
               {
                   sender = returnedLocalUser.phone;
                   sender = sender.replace(/\D/g,'');
               }

               // Create HTML
               let sessionDateStr = '';
               if(schedule.date)
               {
                   let newDate = new Date(schedule.date);
                   sessionDateStr = newDate.toUTCString();
               }
               let textBody = "Hey " + clientName + ", This is a reminder that your therapy session is within 1 hour @ " + sessionDateStr +". See you there! Click to join: https://sessions.goldlink.live/" + returnedUser.uuid + " .";

               // Send SMS 
               // https://developers.sendinblue.com/reference/sendtransacsms
               const defaultClient = SibApiV3Sdk.ApiClient.instance;
               let apiKey = defaultClient.authentications['api-key'];
               apiKey.apiKey = 'xkeysib-redacted-rNMIMbKN5dJJGc0I';
               let apiInstance = new SibApiV3Sdk.TransactionalSMSApi();
               let sendTransacSms = new SibApiV3Sdk.SendTransacSms();
               sendTransacSms = {
                   "sender":sender,
                   "recipient":clientPhone,
                   "content":textBody,
               };
               apiInstance.sendTransacSms(sendTransacSms).then(function(data) {
               console.log('Texted successfully. Returned data: ' + JSON.stringify(data));
               }, function(error) {
               console.error(error);
               });
           }

           // Handle email notification
           if(hasEmailNotif)
           {
               // Get required client data, and username data.
               let displayNameFirst = returnedLocalUser.displaynamefirst;
               let displayNameLast = returnedLocalUser.displaynamelast;
               let displayName = '' + displayNameFirst + ' ' + displayNameLast;
               let clientName = returnedUser.name;
               let clientEmail = returnedUser.email;
               if(returnedUser.email !== undefined) clientEmail = returnedUser.email;
               let clientPhone = '';
               if(returnedUser.phone !== undefined) clientPhone = returnedUser.phone;
               if(clientName) clientName = clientName.split(" ")[0]; // Take first name or first thing before space
               if(!clientEmail) return res.send('M');

               // Create HTML
               let sessionDateStr = '';
               if(schedule.date)
               {
                   let newDate = new Date(schedule.date);
                   sessionDateStr = '  for ' + newDate.toUTCString();
               }
               let aHrefLink = "<a href='https://sessions.goldlink.live/" + returnedUser.uuid  + "'>Click here to join the waiting room.</a>";
               let emailSender = '"Gold Link Sessions" <no-reply@goldlink.live>';
               let foundUserEmail = false;
               let replytoEmail = 'no-reply@goldlink.live';
               if(returnedLocalUser && returnedLocalUser.email !== undefined && returnedLocalUser.email.length > 6) { replytoEmail = returnedLocalUser.email; foundUserEmail = true; }
               let emailSubject = "Your Therapy Session is Scheduled";
               let htmlBody = "Hi " + clientName + ",<br/><br/>This is a reminder that your therapy session is in 1 hour" + sessionDateStr + ". <br/><br/>See you soon!<br/>Therapist " + displayName;
               let textBody = "Hi " + clientName + ", This is a reminder that your therapy session is in 1 hour" + sessionDateStr + ". See you soon! Therapist " + displayName;

               // Send email  
               let info = await mail_transport.sendMail({
               from: emailSender, // sender address
               to: clientEmail, // list of receivers
               subject: emailSubject, // Subject line
               text: textBody, // plain text body
               html: htmlBody, // html body
               replyTo: replytoEmail
               });
           }

           // Set status &8 afterward (sent 1 hour notification)
           curStatus |= 8;
           con.query("UPDATE scheduling SET status = " + curStatus + " WHERE id = " + schedule.id, (err,rows) => {
               if(err) { console.log(err); }
               else hasUpdatedStatus = true;
               if(hasUpdatedStatus) console.log("Notify1 by email/text for", schedule);
           });
        }

    } // schedule loop end

    //return res.send('Y');
    return true;
}
setInterval(ScheduleNotificationBot,(15 * 60000));

// Send Client Session Text (gets latest 'scheduled' date, then sends text about it, or if 'sid' is sent, gets that date and sends the notification)
app.post( '/bmapi/GIN', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
   
    // Check authorization
    let checksum = parsedInput.checksum;
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.json({response: 'U'}); // exit if no checksum authorization
   
    // Check if cid was supplied
    let cid = '';
    if(parsedInput.cid === undefined || !parsedInput.cid) return res.send('C');
    cid = parsedInput.cid;
   
    // Find clients involved
    con.query("SELECT c.cid, c.uid, u.displaynamefirst, u.displaynamelast FROM clientinvolved c JOIN users u ON u.id = c.uid WHERE c.cid =" + cid, (err,rows) => {
        if(err) console.log(err);
        if(rows.length>0) return res.json(rows);
        else return res.send('N');
    });
});

// Add User, endpoint for adding user to the admin account's company
app.post( '/bmapi/AU', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.json({status:'U'});
    let checksum = parsedInput.checksum;
    
    // Check authorization
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed || isAuthed.accesslevel < 5) return res.json({status:'U'}); // exit if no checksum authorization

    // Get user company
    let returnedRows = [];
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT u.cid, u.uid, c.name, c.id FROM userinvolved u JOIN companies c WHERE uid = " + isAuthed.id, (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedRows = rows;
                resolve(returnedRows);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("AddUser::getInvolvedUsers", err); return res.json({status:'N'}) });
    if(!returnedRows) return res.json({status:'N'});

    // Get other client inputs
    let email = parsedInput.email;
    if(!email) email='';
    let phone = parsedInput.phone;
    if(!phone) phone='';
    let fname = parsedInput.fname;
    let lname = parsedInput.lname;
    let utitle = parsedInput.usrtitle;
    let compID = returnedRows[0].id;

    // Create a username login
    const alphabet = "abcdefghijklmnopqrstuvwxyz";
    const randomCharacter = alphabet[Math.floor(Math.random() * alphabet.length)];
    let firstChar = randomCharacter;
    if(fname) firstChar = fname.charAt(0);
    let user = firstChar + lname;
    let randomPass='',d=0; while(d<4){randomPass+=Math.floor(Math.random()*10);d++}
    let pass = randomCharacter + randomPass;
    if(lname) pass = lname.charAt(0) + randomPass;
    if(pass) pass = pass.toLowerCase();

    // Gnerate a checksum
    let minm = 10000000;
    let maxm = 99999999;
    let newchecksum = Math.floor(Math.random() * (maxm - minm + 1)) + minm;

    // Add user 
    let query = "INSERT INTO users (user, pass, displaynamefirst, displaynamelast, displaynametitle, email, phone, checksum) VALUES ('" + user + "', '" + pass + "', '" + fname + "', '"+ lname + "', '" + utitle + "', '" + email + "', '" + phone + "', "+newchecksum+");";
    con.query(query, (err,result) => {
        if(err) { console.log(err); return res.json({status: 'N'}); }
        else if(result.affectedRows > 0)
        {
            // Add involved UID (accesses) (loop this by returnedRows if we ever have multiple returnedRows for companies, so we can add each one)
            let newID = result.insertId;
            let query2 = "INSERT INTO userinvolved (cid,uid) VALUES (" + compID + "," + newID + ");";
            con.query(query2); // don't need to await, it will just be added in time
            return res.json({status: 'Y', newID: newID, user: user, pass: pass});
        }
        else res.json({status: 'N'});
    });
});

// Edit User, endpoint for editing user
app.post( '/bmapi/EU', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
    
    // Check authorization
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed || isAuthed.accessLevel < 5) return res.send('U'); // exit if no checksum authorization

    // Check uid input
    let userid = 0;
    if(parsedInput.uid !== undefined && parsedInput.uid) userid = parsedInput.uid;
    if(!userid) return res.json({status:'I'});

    // Get user company
    let returnedRows = [];
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT u.cid, u.uid, c.name, c.id FROM userinvolved u JOIN companies c WHERE uid = " + isAuthed.id, (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedRows = rows;
                resolve(returnedRows);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("EditUser::getInvolvedUsers", err); return res.send('N') });
    if(!returnedRows) return res.send('N');

    // Get other client inputs
    let email = parsedInput.email;
    if(!email) email='';
    let phone = parsedInput.phone;
    if(!phone) phone='';
    let fname = parsedInput.fname;
    let lname = parsedInput.lname;
    let utitle = parsedInput.usrtitle;
    let status = parsedInput.status;

    // Edit user
    let query = "UPDATE users SET displaynamefirst='" + fname + "', displaynamelast='" + lname + "', displaynametitle='" + utitle + "', email='" + email + "', phone='" + phone + "', status=" + status + " WHERE id = " + userid + " LIMIT 1";
    con.query(query, (err,result) => {
        if(err) { console.log(err); return res.send('D'); }
        else if(result.changedRows > 0) return res.send('Y');
        else return res.send('N');
    });

});

// Delete User, endpoint for removing the user
app.post( '/bmapi/DU', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
    
    // Check authorization
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed || isAuthed.accesslevel < 5) return res.send('U'); // exit if no checksum authorization

    // Check uid input
    let userid = 0;
    if(parsedInput.uid !== undefined && parsedInput.uid) userid = parsedInput.uid;
    if(!userid) return res.send('I');

    // Get user company
    let returnedRows = [];
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT u.cid, u.uid, c.name, c.id FROM userinvolved u JOIN companies c WHERE uid = " + isAuthed.id, (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedRows = rows;
                resolve(returnedRows);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("DeleteUser::getInvolvedUsers", err); return res.JSON({status:'N'}) });
    if(!returnedRows) return res.send('N');

    // Delete this client
    let query = "DELETE FROM users WHERE id=" + userid;
    con.query(query, (err,result) => {
        if(err) console.log(err);
        else if(result.affectedRows > 0) {
            con.query("DELETE FROM userinvolved WHERE uid=" + userid);
            return res.send('Y');
        }
        else return res.send('N');
    });

});

// Edit User, endpoint for user to edit their own fields in settings (change status for user, change user status)
app.post( '/bmapi/EUU', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
    
    // Check authorization
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization

    // Check uid input
    let userid = isAuthed.id;

    // Get status from auth
    let status = isAuthed.status;

    // Get user company
    let returnedRows = [];
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT u.cid, u.uid, c.name, c.id FROM userinvolved u JOIN companies c WHERE uid = " + userid, (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedRows = rows;
                resolve(returnedRows);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("EditUser::getInvolvedUsers", err); return res.send('N') });
    if(!returnedRows) return res.send('N');

    // Get other client inputs
    let email = parsedInput.email;
    if(!email) email='';
    let phone = parsedInput.phone;
    if(!phone) phone='';
    let fname = parsedInput.fname;
    let lname = parsedInput.lname;
    let inputstatus = parsedInput.status;

    // Let top defined status
     // Statuses: 1=inactive, 2=2FAEmail, 4=2FAPhone, 8=autoupdate, 16-64=currentthemes, 128=paginationoption
    let topDefinedStatus = 128;
    if(inputstatus>topDefinedStatus) return res.send('N');

    if(inputstatus > 0 && ((status&2)!=0 || (status&4)!=0) && ((inputstatus&2)!=0 || (inputstatus&4)!=0 || inputstatus==0)) // user 2FA email or phone is present, so clear both of them
    {
        status &= ~2; // clear bits
        status &= ~4; // clear bits
    }
    else if(inputstatus==0) 
    {
        status &= ~2; // clear bits
        status &= ~4; // clear bits
    }

    //console.log(status, inputstatus);

    // Check status for autoupdate
    if(inputstatus == -8)
    {
        status &= ~8; // clear bits
    }

    // Check status for themes
    if(inputstatus == -16)
    {
        status &= ~16; // clear bits
        status &= ~32; 
        status &= ~64; 
    }
    else if(inputstatus > 0 && ((status&16)!=0 || (status&32)!=0 || (status&64)!=0) && ((inputstatus&16)!=0 || (inputstatus&32)!=0 || (inputstatus&64)!=0))
    {
        status &= ~16; // clear bits
        status &= ~32; 
        status &= ~64; 
    }

    // Check status for pagination option
    if(inputstatus == -128)
    {
        status &= ~128; // clear bits
    }

    // Can't be negative check
    if(inputstatus > 0) status |= inputstatus;
    
    // Edit user
    let query = "UPDATE users SET displaynamefirst='" + fname + "', displaynamelast='" + lname + "', email='" + email + "', phone='" + phone + "', status=" + status + " WHERE id = " + userid + " LIMIT 1";
    con.query(query, (err,result) => {
        if(err) { console.log(err); return res.send('D'); }
        else if(result.changedRows > 0) return res.send('Y');
        else return res.send('N');
    });

});

// Edit User Page Limit for Pagination
app.post( '/bmapi/EUPL', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
    
    // Check authorization
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization

    // Check uid input
    let userid = isAuthed.id;

    // Get status from auth, fail to set if pagination setting is off
    let status = isAuthed.status;
    if((status&128)==0) return res.send('N');

    // Get pagelimit
    let pagelimit = 25;
    if(parsedInput.pagelimit !== undefined) pagelimit = parseInt(parsedInput.pagelimit);
    if(pagelimit<5) return res.send('N');
    
    // Edit user
    let query = "UPDATE users SET pagelimit=" + pagelimit + " WHERE id = " + userid + " LIMIT 1";
    con.query(query, (err,result) => {
        if(err) { console.log(err); return res.send('N'); }
        else if(result.changedRows == 1) return res.send('Y');
        else return res.send('N');
    });
});

// Edit User timezone, endpoint to edit user timezone
app.post( '/bmapi/EUT', async ( req, res ) => {

    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
    
    // Check authorization
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization

    // Check uid input
    let userid = 0;
    userid = isAuthed.id;

    // Check tzinput
    let timezoneOffset = 0;
    if(parsedInput.tzo !== undefined && parsedInput.tzo) timezoneOffset = parsedInput.tzo;
    if(!userid) return res.json({status:'T'});

    // Edit user
    let query = "UPDATE users SET tzOffset=" +timezoneOffset+ " WHERE id = " + userid + " LIMIT 1";
    con.query(query, (err,result) => {
        if(err) { console.log(err); return res.send('D'); }
        else if(result.changedRows > 0) return res.send('Y');
        else return res.send('N');
    });

});

// Get Users Table data, used by higher access level in the company
app.post( '/bmapi/GUTD', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
    
    // Check authorization
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed || isAuthed.accesslevel < 5) return res.send('U'); // exit if no checksum authorization

    // Get user company
    let returnedRows = [];
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT u.cid, u.uid, c.name, c.id FROM userinvolved u JOIN companies c WHERE uid = " + isAuthed.id, (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedRows = rows;
                resolve(returnedRows);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("GetUserTableData::getInvolvedUsers", err); return res.send('N'); });
    if(!returnedRows) return res.send('N');


    // Get users
    let compID = -1;
    for(let i=0;i<returnedRows.length;i++)
    {
        if(returnedRows[i].name !== 'Private') { compID = returnedRows[i].id; break; }
    }
    if(compID == -1) return res.send('W');
    con.query("SELECT u.* FROM users u LEFT JOIN userinvolved i ON i.uid = u.id WHERE i.cid = " + compID, (err,rows) => {
        if(err) console.log(err);
        if(rows.length>0) return res.json(rows);
        else return res.send('N');
    });
});

// Get User Info, send specific user info by ID
app.post( '/bmapi/GUI', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;

    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed || isAuthed.accesslevel<4) return res.send('U'); // exit if no checksum authorization

    // Get userID (required input)
    let userID = parsedInput.id;
    if(!userID) return res.send('I');

    // Get user company
    let returnedRows = [];
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT u.cid, u.uid, c.name, c.id FROM userinvolved u JOIN companies c ON c.id = u.cid WHERE u.uid = " + userID, (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedRows = rows;
                resolve(returnedRows);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("GetUserInfo::getInvolvedUsers", err); return res.send('N'); });

    // Get UserInfo
    let query = "SELECT id, status, email, phone, accesslevel, displaynamefirst, displaynamelast, displaynametitle, tzOffset. pagelimit FROM users WHERE id = " + userID;
    if(isAuthed.accesslevel>=5) query = "SELECT id, status, email, phone, accesslevel, displaynamefirst, displaynamelast, displaynametitle, tzOffset, user, pass FROM users WHERE id = " + userID; // send user/pass if accesslevel is 5 or higher
    con.query(query, (err,rows) => {
        if(err) { console.log(err); return res.send('N2'); }
        else
        { 
            if(returnedRows)
            {
                rows[0].companies = []; 
                rows[0].companies.push({name: returnedRows[0].name, id: returnedRows[0].id});
            }
            return res.json(rows) ;
        }
    });
});

// Get User Info, send user's own info
app.post( '/bmapi/GUI2', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;

    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization
    let userID = isAuthed.id;

    // Get user company
    let returnedRows = [];
    const waitforQuery = await Promise.all([
        new Promise((resolve, reject) => {
            con.query("SELECT u.cid, u.uid, c.name, c.id FROM userinvolved u JOIN companies c ON c.id = u.cid WHERE u.uid = " + userID, (err,rows) => {
                if(err) console.log(err);
                if(rows.length>0) returnedRows = rows;
                resolve(returnedRows);
            });
        })
    ]).then((values) => {
    }).catch(function (err) { console.log("GetUserInfo::getInvolvedUsers", err); return res.send('N'); });

    // Get UserInfo
    let query = "SELECT id, status, email, phone, accesslevel, displaynamefirst, displaynamelast, displaynametitle, tzOffset, pagelimit FROM users WHERE id = " + userID;
    if(isAuthed.accesslevel>=5) query = "SELECT id, status, email, phone, accesslevel, displaynamefirst, displaynamelast, displaynametitle, tzOffset, user, pass, pagelimit FROM users WHERE id = " + userID; // send user/pass if accesslevel is 5 or higher
    con.query(query, (err,rows) => {
        if(err) { console.log(err); return res.send('N2'); }
        else
        { 
            if(returnedRows)
            {
                rows[0].companies = []; 
                rows[0].companies.push({name: returnedRows[0].name, id: returnedRows[0].id});
            }
            return res.json(rows) ;
        }
    });
});

// Get User Clients, send specific user info by ID
app.post( '/bmapi/GUC', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;

    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed || isAuthed.accesslevel<5) return res.send('U'); // exit if no checksum authorization

    // Get userID (required input)
    let userID = parsedInput.id;
    if(!userID) return res.send('I');

    // Get user involved
    con.query("SELECT c.name, c.id, i.uid, c.compid FROM clientinvolved i JOIN clients c ON c.id = i.cid WHERE i.uid = " + userID, (err,rows) => {
        if(err) { console.log(err); return res.send('N'); } 
        else if(rows.length>0) return res.json(rows);
        else return res.send('E');
    });
});

// Get Involved Clients (with user)
app.post( '/bmapi/GICS', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;
 
    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization 

    // Get involved clients
    let involvedIDs = 0;
    involvedIDs = await getInvolvedClients(isAuthed.id);
    if(!involvedIDs) return res.send('N');
    let formattedIDs = '';
    for(let i=0;i<involvedIDs.length;i++)
    {
        let involvedID = involvedIDs[i];
        if(!involvedID || involvedID.cid === undefined || !involvedID.cid) continue;
        formattedIDs += '' + involvedID.cid;
        if(i != involvedIDs.length-1) formattedIDs += ',';
    }

    // If no involvedclients, just return something
    if(formattedIDs === undefined || !formattedIDs) return res.send('E');

    // Get ClientInfo
    let query = "SELECT id, name FROM clients WHERE id IN (" + formattedIDs + ")";
    con.query(query, (err,rows) => {
        if(err) { console.log(err); return res.send('N'); }
        else 
        { 
            return res.json(rows) 
        }
    });
});

// Dismiss Current Client
app.post( '/bmapi/DCC2', async ( req, res ) => {
    let parsedInput = req.body;

    // Check authorization
    let checksum = parsedInput.id;
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.json({response: 'U'}); // exit if no checksum authorization
    let socketID = '';
    if(parsedInput.socketid !== undefined) socketID = parsedInput.socketid;
    if(!socketID) return res.json({response: 'S' });
    let roomID = '';
    if(parsedInput.room !== undefined) roomID = parsedInput.room;
    if(!roomID) return res.json({response: 'R'});

    // Any therapist can currently kick clients, if they're in the room already
    let Rooms = [];
    //let Sockets = await io.of('/stream').in(roomID).fetchSockets();
    //console.log(Sockets);
    //let Socket = await io.of('/stream').in(socketID).disconnectSockets();
    let Socket = await io.of('/stream').in(socketID).emit('disconnectedDismissed', { candidate: socketID, sender: 'server' });
    await io.of('/stream').to(socketID).emit('disconnectedDismissed', { candidate: socketID, sender: 'server' });
    //console.log("Sent " + socketID, Sockets);
    // emit disconnectedDismissed
    /*if(Sockets && Sockets.length>0)
    {
        Sockets.disconnect();
        for(let i=0;i<Sockets.length;i++)
        {
            let Socket = Sockets[i];
            console.log(Socket);
            if(!Socket || !Socket.adapter || !Socket.adapter.rooms) continue;
            let localRooms = Array.from(Socket.adapter.rooms.keys());
            for(let j=0;j<localRooms.length;j++)
            {
                let curKey = localRooms[j];
                console.log("Found this socket: " + curKey);
                if(curKey && curKey == socketID) // must match a UUID such as db573329-59e1-4865-95db-c36d5f6abbce
                {
                    console.log("Matched this socket: " + curKey + " with " + socketID);
                    //Socket.disconnect();
                    return res.json({response: 'Y'});
                }
            }
        }
    }*/
    return res.json({response: 'Y'});
});

// Get Client ID, UUID to ID
app.post( '/bmapi/GCID', async ( req, res ) => {
    // Parse Angular's application/x-www-form-urlencoded
    let parsedInput = JSON.parse(Object.keys(req.body)[0]);
    StringEscape(parsedInput);
    
    // Get checksum (parse input)
    if(parsedInput.checksum === undefined || !parsedInput.checksum) return res.send('U');
    let checksum = parsedInput.checksum;

    // Check authorization (this can all be improved if needed later)
    let isAuthed = await bAuthCheck(checksum);
    if(!isAuthed) return res.send('U'); // exit if no checksum authorization

    // Get clientID (required input)
    let clientID = parsedInput.id;
    if(!clientID) return res.send('N');

    // Get ClientInfo
    let query = "SELECT id, uuid FROM clients WHERE uuid = '" + clientID + "'";
    con.query(query, (err,rows) => {
        if(err) { console.log(err); return res.send('N'); }
        else 
        {
            if(rows !== undefined && rows && rows.length>0) 
            {
                return res.json(rows);
            }
            else return res.send('N');
        }
    });
});

// GetUserNames (retrieves usernames from the socket array, for 'nametags')
app.post( '/bmapi/GUS', async ( req, res ) => {

    let parsedInput = req.body;

    // Check authorization
    let roomID = '';
    if(parsedInput.room !== undefined) roomID = parsedInput.room;
    if(!roomID) return res.json({response: 'R'});
 
     // Add usernames to an array, if they match the roomID
     let sentUsernames = [];
     if(global.SentUsernames !== undefined)
     {
         let hasAlready = false;
         let foundObj = 0;
         for(let i=0;i<global.SentUsernames.length;i++)
         {
             let curUsernameObj = global.SentUsernames[i];
             if(!curUsernameObj) continue;
             if(curUsernameObj.roomID == roomID) sentUsernames.push(curUsernameObj);
         }
     }

     if(sentUsernames) return res.json(sentUsernames);
     else return res.send('N');
 });

 // Validate and Send Client ID/Next Schedule
app.get( '/bmapi/VCID/:id/:name', async ( req, res ) => {

    // Get ID, name, both inputs must be sent and valid
    let ID = req.params.id;
    let name = req.params.name;
    if(!ID || !name || name.length<3) return res.send('U');

    // Check if ID sent is short ID or UUID
    let isUUID = false;
    if(ID.includes('-')) isUUID = true;

    // Set up query
    let query = "SELECT id, uuid, name FROM clients WHERE id = '" + ID + "'";
    if(isUUID) query = "SELECT id, uuid, name FROM clients WHERE uuid = '" + ID + "'";

    // Get client info, check name against the sent name
    con.query(query, async (err,rows) => {
        if(err) { console.log(err); return res.send('N'); }
        else 
        {
            if(rows !== undefined && rows && rows.length==1) 
            {
                if(rows[0].name && rows[0].name.toLowerCase().includes(name.toLowerCase())) 
                {

                    con.query("SELECT id, date, status, length FROM scheduling WHERE cid = " + ID + " AND date > NOW() ORDER BY ABS( DATEDIFF( date, NOW() ) ) LIMIT 1", (err2,rows2) => {
                        if(err2) { console.log(err); res.send('N'); }
                        if(rows2) rows[0]['newschedule'] = rows2[0];
                        else rows[0]['newschedule'] = 0;
                        return res.json(rows);
                    });
                }
                else return res.send('W');
            }
            else return res.send('N');
        }
    });

 });

 // CheckLoginPage (get/external version)
 app.get( '/bmapi/CLP/:user/:pass', async ( req, res ) => {

    // Get ID, name, both inputs must be sent and valid
    let user = req.params.user;
    let pass = req.params.pass;
    let code = req.params.code;
    if(!user || !pass) return res.send('U');

    if(user) user = user.trim();
    if(pass) pass = pass.trim();
    if(code) code = code.trim();

    let shellObj = {'escapedUser': user, 'escapedPass': pass, 'escapedCode': code};
    StringEscape(shellObj);
    user = shellObj.escapedUser;
    pass = shellObj.escapedPass;
    code = shellObj.escapedCode;

    // Grab userdata and check 2FA setting
    let twofactorauth = false;
    let userdata = 0;
    let query = "SELECT id, user, pass, twofactorauth, email, status, accesslevel FROM users WHERE (user = '" + user + "')";
    let userDataQuery = con.query(query, (err,rows) => {
        //if(err) throw err;
        if(rows.length==1) userdata = rows[0];
    });

    const waitingForQueries = await Promise.all([
        new Promise((resolve, reject) => {
            con.query(query, (err,rows) => {
                //if(err) throw err;
                if(rows.length==1) userdata = rows[0];
                //console.log(rows);
                resolve(userdata);
            });
        }),
        new Promise((resolve, reject) => {
            con.query('SELECT twofactorauth FROM settings WHERE id=1', (err,rows) => {
                //if(err) throw err;
                if(rows.length==1 && rows[0]['twofactorauth']!=0) twofactorauth = true; 
                resolve(twofactorauth);
            });
        }),
    ]).then((values) => {
    }).catch(function (err) { console.log(err); });

    // Check userdata's password or handle 2FA
    if(userdata)
    {
        // Check user statuses are set for phone or email 2fa, otherwise 2fa will be skipped
        let userstatus = userdata.status;
        if(twofactorauth)
        {
            if((userstatus&2)!=0 || (userstatus&4)!=0) twofactorauth = true;
            else twofactorauth = false;
        }

        let data = userdata;
        let uid = data.id;
        let curstatus = data.status;
        let curaccesslevel = data.accesslevel;
        if(data.pass == pass) // Successful login credentials, proceed to 2FA check
        {
            // Check inactive status (1=inactive flag) and access level (must be less than 3); if so they can't login
            if((curstatus&1)!=0 && curaccesslevel<3) 
            {
                return res.send('I');
            }

            if(!twofactorauth) // 2FA not required, so login
            {
                let checksum = fcrc32('' + user + pass);
                con.query("UPDATE users SET logincount = logincount + 1, checksum = " + checksum + " WHERE id = " + uid);
                return res.send(checksum.toString());
            }
            else // 2FA code is required, generate a code for this user
            {
                let cac = data.twofactorauth;
                let email = data.email;
                let phone = data.phone;
    
                if(cac && code !== undefined) // Code provided
                {
                    if(code === cac) // Code equals the 2FA code, so login
                    {
                        let checksum = fcrc32('' + user + pass);
                        con.query("UPDATE users SET logincount = logincount + 1, twofactorauth = 0, checksum = " + checksum + " WHERE id = " + uid);
                        return res.send(checksum.toString()); // Send login checksum back as signal
                    }
                    else if(!code) return res.send('2');
                    else return res.send('3'); // 2FA code was provided, but entered one was wrong, send signal
                }
                else // Code not provided yet
                {
                    if(!cac) // If not set yet, generate and set the 2FA code
                    {
                        let randomcode = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
                        con.query("UPDATE users SET twofactorauth = " + randomcode + " WHERE id = " + uid + " LIMIT 1");
        
                        // Send Email
                        if((curstatus&2)!=0)
                        {
                            if(email && email.length>0)
                            {
                                let emailSender = 'no-reply@goldlink.live';
                                let emailSubject = "GoldLink 2FA Code";
                                let htmlBody = "Use this code to login: <b>" + randomcode + "</b>";
                                let textBody = "Use this code to login: " + randomcode;
                            
                                // Send email  
                                let info = await mail_transport.sendMail({
                                from: emailSender, // sender address
                                to: email, // list of receivers
                                subject: emailSubject, // Subject line
                                text: textBody, // plain text body
                                html: htmlBody, // html body
                                });

                                return res.send('2'); // 2FA requested, no code yet provided, send signal
                            }
                            else res.send('4'); // User has no email account anyway, so sending is impossible, send signal
                        }

                        // Send Text
                        if((curstatus&4)!=0)
                        {
                            if(phone && phone.length>0)
                            {
                                let textSender = '18445669468';
                                let textBody = "Use this code to login: " + randomcode + " -GoldLink";

                                // Send SMS 
                                // https://developers.sendinblue.com/reference/sendtransacsms
                                const defaultClient = SibApiV3Sdk.ApiClient.instance;
                                let apiKey = defaultClient.authentications['api-key'];
                                apiKey.apiKey = 'xkeysib-redacted-rNMIMbKN5dJJGc0I';
                                let apiInstance = new SibApiV3Sdk.TransactionalSMSApi();
                                let sendTransacSms = new SibApiV3Sdk.SendTransacSms();
                                sendTransacSms = {
                                    "sender":textSender,
                                    "recipient":phone,
                                    "content":textBody,
                                };
                                apiInstance.sendTransacSms(sendTransacSms).then(function(data) {
                                    //console.log('Texted 2fa successfully. Returned data: ' + JSON.stringify(data));
                                    return res.send('2'); // 2FA requested, no code yet provided, send signal
                                }, function(error) {
                                    console.error("2fa Texting", error);
                                    //return res.send('');
                                });
                            }
                            else return res.send('4'); // User has no phone anyway, so sending is impossible, send signal
                        }
                        
                    }
                    else
                    {
                        // Define randomcode as existing cac
                        let randomcode = cac;

                        // Send Email
                        if((curstatus&2)!=0)
                        {
                            if(email && email.length>0)
                            {
                                let emailSender = 'no-reply@goldlink.live';
                                let emailSubject = "GoldLink 2FA Code";
                                let htmlBody = "Use this code to login: <b>" + randomcode + "</b>";
                                let textBody = "Use this code to login: " + randomcode;
                            
                                // Send email  
                                let info = await mail_transport.sendMail({
                                from: emailSender, // sender address
                                to: email, // list of receivers
                                subject: emailSubject, // Subject line
                                text: textBody, // plain text body
                                html: htmlBody, // html body
                                });
                    
                                return res.send('2'); // 2FA requested, no code yet provided, send signal
                            }
                            else res.send('4'); // User has no email account anyway, so sending is impossible, send signal
                        }
                    
                        // Send Text
                        if((curstatus&4)!=0)
                        {
                            if(phone && phone.length>0)
                            {
                                let textSender = '18445669468';
                                let textBody = "Use this code to login: " + randomcode + " -GoldLink";
                    
                                // Send SMS 
                                // https://developers.sendinblue.com/reference/sendtransacsms
                                const defaultClient = SibApiV3Sdk.ApiClient.instance;
                                let apiKey = defaultClient.authentications['api-key'];
                                apiKey.apiKey = 'xkeysib-redacted-rNMIMbKN5dJJGc0I';
                                let apiInstance = new SibApiV3Sdk.TransactionalSMSApi();
                                let sendTransacSms = new SibApiV3Sdk.SendTransacSms();
                                sendTransacSms = {
                                    "sender":textSender,
                                    "recipient":phone,
                                    "content":textBody,
                                };
                                apiInstance.sendTransacSms(sendTransacSms).then(function(data) {
                                    //console.log('Texted 2fa successfully. Returned data: ' + JSON.stringify(data));
                                    return res.send('2'); // 2FA requested, no code yet provided, send signal
                                }, function(error) {
                                    console.error("2fa Texting", error);
                                    //return res.send('');
                                });
                            }
                            else return res.send('4'); // User has no phone anyway, so sending is impossible, send signal
                        }
                    }
                    return res.send('2'); // 2FA requested, no code yet provided, send signal
                }
            }

        }
        else return res.send('L'); // No password found
    }
    else return res.send('N'); // No username found
});


 // CheckLoginPage (get/external version with 2FA code)
 app.get( '/bmapi/CLP/:user/:pass/:code', async ( req, res ) => {

    // Get ID, name, both inputs must be sent and valid
    let user = req.params.user;
    let pass = req.params.pass;
    let code = req.params.code;
    if(!user || !pass) return res.send('U');

    if(user) user = user.trim();
    if(pass) pass = pass.trim();
    if(code) code = code.trim();

    let shellObj = {'escapedUser': user, 'escapedPass': pass, 'escapedCode': code};
    StringEscape(shellObj);
    user = shellObj.escapedUser;
    pass = shellObj.escapedPass;
    code = shellObj.escapedCode;

   
    // Grab userdata and check 2FA setting
    let twofactorauth = false;
    let userdata = 0;
    let query = "SELECT id, user, pass, twofactorauth, email, status, accesslevel FROM users WHERE (user = '" + user + "')";
    let userDataQuery = con.query(query, (err,rows) => {
        //if(err) throw err;
        if(rows.length==1) userdata = rows[0];
    });

    const waitingForQueries = await Promise.all([
        new Promise((resolve, reject) => {
            con.query(query, (err,rows) => {
                //if(err) throw err;
                if(rows.length==1) userdata = rows[0];
                //console.log(rows);
                resolve(userdata);
            });
        }),
        new Promise((resolve, reject) => {
            con.query('SELECT twofactorauth FROM settings WHERE id=1', (err,rows) => {
                //if(err) throw err;
                if(rows.length==1 && rows[0]['twofactorauth']!=0) twofactorauth = true; 
                resolve(twofactorauth);
            });
        }),
    ]).then((values) => {
    }).catch(function (err) { console.log(err); });

    // Check userdata's password or handle 2FA
    if(userdata)
    {
        // Check user statuses are set for phone or email 2fa, otherwise 2fa will be skipped
        let userstatus = userdata.status;
        if(twofactorauth)
        {
            if((userstatus&2)!=0 || (userstatus&4)!=0) twofactorauth = true;
            else twofactorauth = false;
        }

        let data = userdata;
        let uid = data.id;
        let curstatus = data.status;
        let curaccesslevel = data.accesslevel;
        if(data.pass == pass) // Successful login credentials, proceed to 2FA check
        {
            // Check inactive status (1=inactive flag) and access level (must be less than 3); if so they can't login
            if((curstatus&1)!=0 && curaccesslevel<3) 
            {
                return res.send('I');
            }

            if(!twofactorauth) // 2FA not required, so login
            {
                let checksum = fcrc32('' + user + pass);
                con.query("UPDATE users SET logincount = logincount + 1, checksum = " + checksum + " WHERE id = " + uid);
                return res.send(checksum.toString());
            }
            else // 2FA code is required, generate a code for this user
            {
                let cac = data.twofactorauth;
                let email = data.email;
                let phone = data.phone;
    
                if(cac) // Code provided
                {
                    if(parseInt(code) == parseInt(cac)) // Code equals the 2FA code, so login
                    {
                        let checksum = fcrc32('' + user + pass);
                        con.query("UPDATE users SET logincount = logincount + 1, twofactorauth = 0, checksum = " + checksum + " WHERE id = " + uid);
                        return res.send(checksum.toString()); // Send login checksum back as signal
                    }
                    else if(!code) return res.send('2');
                    else return res.send('3'); // 2FA code was provided, but entered one was wrong, send signal
                }
                else // Code not provided yet
                {
                    if(!cac) // If not set yet, generate and set the 2FA code
                    {
                        let randomcode = Math.floor(Math.random() * (9999 - 1000 + 1)) + 1000;
                        con.query("UPDATE users SET twofactorauth = " + randomcode + " WHERE id = " + uid + " LIMIT 1");
        
                        // Send Email
                        if((curstatus&2)!=0)
                        {
                            if(email && email.length>0)
                            {
                                let emailSender = '"Goldlink Authentication System" <no-reply@goldlink.live>';
                                let emailSubject = "Your 2FA Code";
                                let htmlBody = "Use this code to login: <b>" + randomcode + "</b>";
                                let textBody = "Use this code to login: " + randomcode;
                            
                                // Send email  
                                let info = await mail_transport.sendMail({
                                from: emailSender, // sender address
                                to: email, // list of receivers
                                subject: emailSubject, // Subject line
                                text: textBody, // plain text body
                                html: htmlBody, // html body
                                });

                                return res.send('2'); // 2FA requested, no code yet provided, send signal
                            }
                            else res.send('4'); // User has no email account anyway, so sending is impossible, send signal
                        }

                        // Send Text
                        if((curstatus&4)!=0)
                        {
                            if(phone && phone.length>0)
                            {
                                let textSender = '18445669468';
                                let textBody = "Use this code to login: " + randomcode;

                                // Send SMS 
                                // https://developers.sendinblue.com/reference/sendtransacsms
                                const defaultClient = SibApiV3Sdk.ApiClient.instance;
                                let apiKey = defaultClient.authentications['api-key'];
                                apiKey.apiKey = 'xkeysib-redacted-rNMIMbKN5dJJGc0I';
                                let apiInstance = new SibApiV3Sdk.TransactionalSMSApi();
                                let sendTransacSms = new SibApiV3Sdk.SendTransacSms();
                                sendTransacSms = {
                                    "sender":textSender,
                                    "recipient":phone,
                                    "content":textBody,
                                };
                                apiInstance.sendTransacSms(sendTransacSms).then(function(data) {
                                    //console.log('Texted 2fa successfully. Returned data: ' + JSON.stringify(data));
                                    return res.send('2'); // 2FA requested, no code yet provided, send signal
                                }, function(error) {
                                    console.error("2fa Texting", error);
                                    //return res.send('');
                                });
                            }
                            else return res.send('4'); // User has no phone anyway, so sending is impossible, send signal
                        }
                        
                    }
                    return res.send('2'); // 2FA requested, no code yet provided, send signal
                }
            }

        }
        else return res.send('L'); // No password found
    }
    else return res.send('N'); // No username found
});

 // CheckLoginPage (get/external version, only username sent)
 app.get( '/bmapi/CLP/:user/', async ( req, res ) => {

    // Get ID, name, both inputs must be sent and valid
    let user = req.params.user;
    if(!user) return res.send('U');

    if(user) user = user.trim();

    let shellObj = {'escapedUser': user};
    StringEscape(shellObj);
    user = shellObj.escapedUser;

    // Grab userdata
    let userdata = 0;
    let query = "SELECT id FROM users WHERE (user LIKE '" + user + "')";
    let userDataQuery = con.query(query, (err,rows) => {
        //if(err) throw err;
        if(rows.length==1) userdata = rows[0];

        // Return if username is valid/found
        if(userdata) return res.send('Y');
        else return res.send('N'); // No username found
    });

});

/*
// Test the email and text (manually)
app.get('/bmapi/TESTSTUFF1', async ( req, res ) => {

            // Inputs
            let email = 'jdcherskov@gmail.com'
            let phone = '19545296818'
            let randomcode = '12345';

            // Send email  
            let emailSender = '"Goldlink" <no-reply@goldlink.live>';
            let emailSubject = "Goldlink 2FA Code";
            let htmlBody = "Use this code to login: <b>" + randomcode + "</b>";
            let emailTextBody = "Use this code to login: " + randomcode;
            let info = await mail_transport.sendMail({
            from: emailSender, // sender address
            to: email, // list of receivers
            subject: emailSubject, // Subject line
            text: emailTextBody, // plain text body
            html: htmlBody, // html body
            });

            // Send SMS https://developers.sendinblue.com/reference/sendtransacsms
            let textSender = '18445669468';
            let textBody = "Use this code to login: " + randomcode;
            const defaultClient = SibApiV3Sdk.ApiClient.instance;
            let apiKey = defaultClient.authentications['api-key'];
            apiKey.apiKey = 'xkeysib-redacted-rNMIMbKN5dJJGc0I';
            let apiInstance = new SibApiV3Sdk.TransactionalSMSApi();
            let sendTransacSms = new SibApiV3Sdk.SendTransacSms();
            sendTransacSms = {
                "sender":textSender,
                "recipient":phone,
                "content":textBody,
            };
            apiInstance.sendTransacSms(sendTransacSms).then(function(data) {
                //console.log('Texted 2fa successfully. Returned data: ' + JSON.stringify(data));
                return res.send('2'); // 2FA requested, no code yet provided, send signal
            }, function(error) {
                console.error("2fa Texting", error);
                //return res.send('');
            });
});

// Fill createdby fields and update if it is empty
app.get('/bmapi/TESTSTUFF2', async ( req, res ) => {

        // Get clients, and get involved IDs
        let involvedIDs = [];
        const waitingForQuery = await Promise.all([
            new Promise((resolve, reject) => {
                con.query("SELECT cid, uid FROM clientinvolved", (err,rows) => {
                    if(err) { console.log(err); return res.send('N'); }
                    else { 
                        involvedIDs = rows;
                        resolve(involvedIDs);
                    }
                })
            })
        ]).then((values) => {
        }).catch(function (err) { console.log(err); });
        if(!involvedIDs) return res.send('I');

        //console.log("Found " + involvedIDs.length + " id involvements to loop through");
    
        // Get clients, and filter involved IDs (todo: when adding new companies, we should make this include 'any' involved companies for this user with OR chaining, otherwise, this already should work)
        con.query("SELECT * FROM clients ORDER BY id DESC", (err,rows) => {
            if(err) { console.log(err); return res.send('N'); }
            else { 
                // Filter involved IDs before returning
                let rowsToUpdate = 0;
                let rowsUpdated = 0;
                if(involvedIDs) 
                {
                    //res.send("Found " + rows.length + " total client rows".)
                    for(let i = 0; i<rows.length; i++)
                    {
                        let row = rows[i];
                        if(row.createdby) continue; // already filled
                        rowsToUpdate++;
                        for(let j = 0; j<involvedIDs.length; j++)
                        {
                            let involvedID = involvedIDs[j];
                            if(!involvedID || involvedID.cid === undefined) continue;
                            if(involvedID.cid == row.id) 
                            {
                                let curFirstUser = involvedID.uid;
                                con.query("UPDATE clients SET createdby="+curFirstUser+" WHERE id="+involvedID.cid+" LIMIT 1", (err,rows) => {
                                    if(err) { console.log(err); }
                                    if (rows.changedRows == 1) { 
                                        rowsUpdated++; 
                                        if(rowsUpdated==rowsToUpdate && rowsToUpdate>1) return res.send(''+rowsUpdated+'/'+rowsToUpdate+' updated successfully');
                                    }
                                });
                                row.createdby = curFirstUser;
                            }
                        }
                    }
                }
            }
        });
});*/

// Retrieve stream for specific waiting room videos, returns nothing if not available.
app.get('/bmapi/getwaitingroomvideo/:vidid', async ( req, res ) => {

    // Randomize (if enabled)
    //for(let i=0;i<4;i++)
    {
        //let number = i+1;
        let number = req.params.vidid;
        // Setup file
        let path = 'public/mp4/waitingroom' + number + '.mp4';
        if(!fs.existsSync(path)) return;
        const stat = fs.statSync(path);
        const fileSize = stat.size;
        const range = req.headers.range;

        if (range) {
            const parts = range.replace(/bytes=/, "").split("-")
            const start = parseInt(parts[0], 10)
            const end = parts[1]
                ? parseInt(parts[1], 10)
                : fileSize-1
        
            if(start >= fileSize) {
                res.status(416).send('Requested range not satisfiable\n'+start+' >= '+fileSize);
                return
            }
            
            const chunksize = (end-start)+1
            const file = fs.createReadStream(path, {start, end})
            const head = {
                'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                'Accept-Ranges': 'bytes',
                'Content-Length': chunksize,
                'Content-Type': 'video/mp4',
            }
        
            res.writeHead(206, head)
            file.pipe(res)
            } else {
            const head = {
                'Content-Length': fileSize,
                'Content-Type': 'video/mp4',
            }
            res.writeHead(200, head)
            fs.createReadStream(path).pipe(res)
            }
    }  
});
app.get( '/bmapi/testwaitingrooms', async ( req, res ) => {
    res.render('waitingroomstest', {});
});

// Forgot User Request (get/external version)
app.get( '/bmapi/FUR/:email', async ( req, res ) => {

    // Get ID, name, both inputs must be sent and valid
    let email = req.params.email;
    if(!email) return res.send('N');
    if(email) email = email.trim();

    let shellObj = {'escapedEmail': email};
    StringEscape(shellObj);
    email = shellObj.escapedEmail;

    // Check whether email exists, if so, send an email with the data needed to login
    let twofactorauth = false;
    let userdata = 0;
    let query = "SELECT id, user, pass, twofactorauth, email, displaynamefirst FROM users WHERE email LIKE '" + email + "'";
    let userDataQuery = con.query(query, async(err,rows) => {
        //if(err) throw err;
        if(rows.length==1) userdata = rows[0];
        
        // Check userdata's password or handle 2FA
        if(userdata)
        {
            let data = userdata;
            let uid = data.id;
            let user = data.user;
            let pass = data.pass;
            let displaynamefirst = data.displaynamefirst;
            let onrecordemail = data.email;
            if(onrecordemail) // Successfully obtained an email
            {
                let emailSender = '"Goldlink Authentication System" <no-reply@goldlink.live>';
                let emailSubject = "Your Account Credentials";
                let htmlBody = "Hi " + displaynamefirst + ",<br/><br/>Your account has the following details: <br/><br/> <b>User:</b> " + user + " <br/> <b>Pass:</b> " + pass + "<br/><br/>Login at <a href='https://goldlink.live'>https://goldlink.live</a>.";
                let textBody = "Hi " + displaynamefirst + ", Your account has the following details: User:" + user + "; Pass: " + pass + "; Login at https://goldlink.live";

                // Send email  
                let info = await mail_transport.sendMail({
                from: emailSender, // sender address
                to: onrecordemail, // list of receivers
                subject: emailSubject, // Subject line
                text: textBody, // plain text body
                html: htmlBody, // html body
                });

                return res.send('Y');
            }
            else return res.send('N'); // No internal email found, this should never happen though
        }
        else return res.send('N'); // No email found
    });

});