export default {
    
    // Get API Server
    getAPIServer() {
        //return "https://sessions.goldlink.live/bmapi/";
        return "https://localhost:3005/bmapi/";
        //return "https://10.0.0.8:3000/bmapi/";
    },

    // Set ICE Server here, we can use a foreign one like this free(or purchase one) from XirSys, or host it like below
    getIceServer() {
        return {
            iceServers: [
            {
                urls: ["stun:stun.l.google.com:19302", "stun:stun2.l.google.com:19302", "stun:eu-turn4.xirsys.com"]
            },
			{ urls: "stun:stun.l.google.com:5349" },
			{ urls: "stun:stun1.l.google.com:3478" },
			{ urls: "stun:stun1.l.google.com:5349" },
			{ urls: "stun:stun2.l.google.com:5349" },
			{ urls: "stun:stun3.l.google.com:3478" },
			{ urls: "stun:stun3.l.google.com:5349" },
			{ urls: "stun:stun4.l.google.com:19302" },
			{ urls: "stun:stun4.l.google.com:5349" },
            {
                username: "glserver",
                credential: "glserver1234",
                urls: [
                    "turn:goldlink.live:3478"
                ]
            },
            {
                username: "free",
                credential: "free",
                urls: [
                    "turn:freeturn.net:3478"
                ]
            },
            {
                username: "ml0jh0qMKZKd9P_9C0UIBY2G0nSQMCFBUXGlk6IXDJf8G2uiCymg9WwbEJTMwVeiAAAAAF2__hNSaW5vbGVl",
                credential: "4dd454a6-feee-11e9-b185-6adcafebbb45",
                urls: [
                    "turn:eu-turn4.xirsys.com:3478"
                ]
            }
        ]
        };
    }

};