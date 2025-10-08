/**
 * WebRTC Manager
 * Handles peer connections and media streams
 */

import { socketManager } from './socket';

export interface PeerConnection {
  peerId: string;
  connection: RTCPeerConnection;
  stream?: MediaStream;
}

class WebRTCManager {
  private localStream: MediaStream | null = null;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();
  private remoteStreams: Map<string, MediaStream> = new Map();
  private onRemoteStreamCallback?: (peerId: string, stream: MediaStream) => void;

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  /**
   * Initialize local media stream (camera + microphone)
   */
  async initLocalStream(constraints?: MediaStreamConstraints): Promise<MediaStream> {
    try {
      const defaultConstraints: MediaStreamConstraints = {
        video: { width: 1280, height: 720 },
        audio: true,
      };

      this.localStream = await navigator.mediaDevices.getUserMedia(
        constraints || defaultConstraints
      );

      console.log('Local stream initialized');
      return this.localStream;
    } catch (error) {
      console.error('Failed to get local stream:', error);
      throw error;
    }
  }

  /**
   * Get local media stream
   */
  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  /**
   * Get all remote streams
   */
  getRemoteStreams(): Map<string, MediaStream> {
    return this.remoteStreams;
  }

  /**
   * Set callback for remote stream events
   */
  onRemoteStream(callback: (peerId: string, stream: MediaStream) => void) {
    this.onRemoteStreamCallback = callback;
  }

  /**
   * Create peer connection
   */
  createPeerConnection(peerId: string): RTCPeerConnection {
    const pc = new RTCPeerConnection(this.rtcConfig);

    // Add local stream tracks to connection
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socketManager.sendICECandidate(peerId, event.candidate);
      }
    };

    // Handle connection state changes
    pc.onconnectionstatechange = () => {
      console.log(`Peer ${peerId} connection state:`, pc.connectionState);

      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        this.closePeerConnection(peerId);
      }
    };

    // Handle incoming tracks
    pc.ontrack = (event) => {
      console.log(`Received track from peer ${peerId}:`, event.streams[0]);

      if (event.streams && event.streams[0]) {
        this.remoteStreams.set(peerId, event.streams[0]);

        // Notify via callback
        if (this.onRemoteStreamCallback) {
          this.onRemoteStreamCallback(peerId, event.streams[0]);
        }
      }
    };

    this.peerConnections.set(peerId, pc);
    return pc;
  }

  /**
   * Create and send offer
   */
  async createOffer(peerId: string): Promise<void> {
    const pc = this.peerConnections.get(peerId) || this.createPeerConnection(peerId);

    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketManager.sendSDP(peerId, offer);
      console.log(`Sent offer to peer ${peerId}`);
    } catch (error) {
      console.error(`Failed to create offer for peer ${peerId}:`, error);
    }
  }

  /**
   * Handle incoming offer
   */
  async handleOffer(peerId: string, offer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(peerId) || this.createPeerConnection(peerId);

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketManager.sendSDP(peerId, answer);
      console.log(`Sent answer to peer ${peerId}`);
    } catch (error) {
      console.error(`Failed to handle offer from peer ${peerId}:`, error);
    }
  }

  /**
   * Handle incoming answer
   */
  async handleAnswer(peerId: string, answer: RTCSessionDescriptionInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.error(`No peer connection found for ${peerId}`);
      return;
    }

    try {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
      console.log(`Set remote description for peer ${peerId}`);
    } catch (error) {
      console.error(`Failed to handle answer from peer ${peerId}:`, error);
    }
  }

  /**
   * Handle incoming ICE candidate
   */
  async handleICECandidate(peerId: string, candidate: RTCIceCandidateInit): Promise<void> {
    const pc = this.peerConnections.get(peerId);
    if (!pc) {
      console.error(`No peer connection found for ${peerId}`);
      return;
    }

    try {
      await pc.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (error) {
      console.error(`Failed to add ICE candidate for peer ${peerId}:`, error);
    }
  }

  /**
   * Toggle video track
   */
  toggleVideo(enabled?: boolean): boolean {
    if (!this.localStream) return false;

    const videoTrack = this.localStream.getVideoTracks()[0];
    if (!videoTrack) return false;

    videoTrack.enabled = enabled !== undefined ? enabled : !videoTrack.enabled;
    return videoTrack.enabled;
  }

  /**
   * Toggle audio track
   */
  toggleAudio(enabled?: boolean): boolean {
    if (!this.localStream) return false;

    const audioTrack = this.localStream.getAudioTracks()[0];
    if (!audioTrack) return false;

    audioTrack.enabled = enabled !== undefined ? enabled : !audioTrack.enabled;
    return audioTrack.enabled;
  }

  /**
   * Get video track state
   */
  isVideoEnabled(): boolean {
    if (!this.localStream) return false;
    const videoTrack = this.localStream.getVideoTracks()[0];
    return videoTrack ? videoTrack.enabled : false;
  }

  /**
   * Get audio track state
   */
  isAudioEnabled(): boolean {
    if (!this.localStream) return false;
    const audioTrack = this.localStream.getAudioTracks()[0];
    return audioTrack ? audioTrack.enabled : false;
  }

  /**
   * Close peer connection
   */
  closePeerConnection(peerId: string): void {
    const pc = this.peerConnections.get(peerId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(peerId);
      this.remoteStreams.delete(peerId);
      console.log(`Closed connection to peer ${peerId}`);
    }
  }

  /**
   * Close all connections and stop local stream
   */
  cleanup(): void {
    // Close all peer connections
    this.peerConnections.forEach((pc, peerId) => {
      pc.close();
    });
    this.peerConnections.clear();
    this.remoteStreams.clear();

    // Stop local stream
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
      this.localStream = null;
    }

    console.log('WebRTC cleanup complete');
  }
}

// Singleton instance
export const webrtcManager = new WebRTCManager();
