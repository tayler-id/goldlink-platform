/**
 * Socket.io Connection Manager
 * Handles WebRTC signaling and real-time events
 */

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://localhost:3005';

class SocketManager {
  private socket: Socket | null = null;
  private roomId: string | null = null;
  private socketId: string | null = null;

  /**
   * Initialize socket connection
   */
  connect(userName?: string): Socket {
    if (this.socket?.connected) {
      return this.socket;
    }

    // Backend uses /stream namespace
    this.socket = io(`${SOCKET_URL}/stream`, {
      transports: ['websocket', 'polling'],
      rejectUnauthorized: false, // Allow self-signed certs
    });

    this.socket.on('connect', () => {
      console.log('Socket connected:', this.socket?.id);
      this.socketId = this.socket?.id || null;
    });

    this.socket.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    this.socket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return this.socket;
  }

  /**
   * Subscribe to a room (join video session)
   */
  subscribeToRoom(roomId: string, userName?: string) {
    if (!this.socket) {
      throw new Error('Socket not initialized. Call connect() first.');
    }

    this.roomId = roomId;

    // Wait for socket.id to be available before subscribing
    const doSubscribe = () => {
      if (this.socket && this.socket.id) {
        this.socket.emit('subscribe', {
          room: roomId,
          socketId: this.socket.id,
          userName: userName || 'Anonymous',
        });
        console.log(`Subscribed to room: ${roomId} with socket ID: ${this.socket.id}`);
      }
    };

    // If already connected, subscribe immediately
    if (this.socket.connected && this.socket.id) {
      doSubscribe();
    } else {
      // Otherwise wait for connect event
      this.socket.once('connect', doSubscribe);
    }
  }

  /**
   * Send chat message
   */
  sendMessage(message: string, userName: string) {
    if (!this.socket || !this.roomId) return;

    this.socket.emit('message', {
      room: this.roomId,
      message,
      username: userName,
    });
  }

  /**
   * Start WebRTC negotiation with peer
   */
  startNegotiation(peerId: string) {
    if (!this.socket) return;

    this.socket.emit('newUserStart', {
      to: peerId,
      sender: this.socket.id,
    });
  }

  /**
   * Send SDP offer/answer
   */
  sendSDP(to: string, description: RTCSessionDescriptionInit) {
    if (!this.socket) return;

    this.socket.emit('sdp', {
      to,
      description,
      sender: this.socket.id,
    });
  }

  /**
   * Send ICE candidate
   */
  sendICECandidate(to: string, candidate: RTCIceCandidate) {
    if (!this.socket) return;

    this.socket.emit('ice candidates', {
      to,
      candidate,
      sender: this.socket.id,
    });
  }

  /**
   * Request session refresh
   */
  requestRefresh(checksum: string) {
    if (!this.socket || !this.roomId) return;

    this.socket.emit('createRefreshRequest', {
      room: this.roomId,
      checksum,
    });
  }

  /**
   * Set timer
   */
  setTimer(timer: number) {
    if (!this.socket || !this.roomId) return;

    this.socket.emit('settimer', {
      room: this.roomId,
      timer,
    });
  }

  /**
   * Request timer sync
   */
  requestTimer() {
    if (!this.socket || !this.roomId) return;

    this.socket.emit('timer', {
      room: this.roomId,
    });
  }

  /**
   * Listen for new users joining
   */
  onNewUser(callback: (data: { socketId: string }) => void) {
    this.socket?.on('new user', callback);
  }

  /**
   * Listen for user disconnects
   */
  onUserDisconnect(callback: (data: { socketId: string }) => void) {
    this.socket?.on('disconnectedUser', callback);
  }

  /**
   * Listen for WebRTC negotiation start
   */
  onNewUserStart(callback: (data: { sender: string }) => void) {
    this.socket?.on('newUserStart', callback);
  }

  /**
   * Listen for SDP messages
   */
  onSDP(callback: (data: { description: RTCSessionDescriptionInit; sender: string }) => void) {
    this.socket?.on('sdp', callback);
  }

  /**
   * Listen for ICE candidates
   */
  onICECandidate(callback: (data: { candidate: RTCIceCandidate; sender: string }) => void) {
    this.socket?.on('ice candidates', callback);
  }

  /**
   * Listen for chat messages
   */
  onMessage(callback: (data: { message: string; userName: string }) => void) {
    this.socket?.on('createMessage', callback);
  }

  /**
   * Listen for refresh requests
   */
  onRefreshRequest(callback: (data: { request: string }) => void) {
    this.socket?.on('requestRefresh', callback);
  }

  /**
   * Listen for timer updates
   */
  onTimer(callback: (data: { curTime: number; firstTime: number }) => void) {
    this.socket?.on('timer', callback);
  }

  /**
   * Remove all event listeners
   */
  removeAllListeners() {
    if (!this.socket) return;

    this.socket.off('new user');
    this.socket.off('disconnectedUser');
    this.socket.off('newUserStart');
    this.socket.off('sdp');
    this.socket.off('ice candidates');
    this.socket.off('createMessage');
    this.socket.off('requestRefresh');
    this.socket.off('timer');
  }

  /**
   * Disconnect socket
   */
  disconnect() {
    this.removeAllListeners();
    this.socket?.disconnect();
    this.socket = null;
    this.roomId = null;
    this.socketId = null;
  }

  /**
   * Get current socket instance
   */
  getSocket(): Socket | null {
    return this.socket;
  }

  /**
   * Get current room ID
   */
  getRoomId(): string | null {
    return this.roomId;
  }

  /**
   * Get current socket ID
   */
  getSocketId(): string | null {
    return this.socketId;
  }
}

// Singleton instance
export const socketManager = new SocketManager();
