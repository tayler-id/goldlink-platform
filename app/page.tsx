"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LandingPage() {
  const router = useRouter();
  const [roomInput, setRoomInput] = useState("");

  // Test room UUIDs from database
  const testRooms = [
    { id: "f0cc89bb-ab8d-45be-9048-c6cbfef0a3dc", name: "Test Room 1 (John Test)" },
    { id: "15c9e55f-0d56-4c96-a213-13fe872bfd0c", name: "Test Room 2" },
    { id: "7e8ffbdc-fa04-4a8f-89a5-50ae888cad3c", name: "Test Room 3" },
    { id: "53bcb30f-86a9-4d71-b64c-4ede280a4111", name: "Test Room 4" },
    { id: "b6b77192-f0c2-4789-be4c-7e3c0cf6772e", name: "Test Room 5" },
  ];

  const handleJoinRoom = (roomId: string) => {
    router.push(`/${roomId}`);
  };

  const handleCustomJoin = () => {
    if (roomInput.trim()) {
      router.push(`/${roomInput.trim()}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0A0F1E] via-[#1a1f2e] to-[#0A0F1E] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full bg-black/40 backdrop-blur-xl border-2 border-gold/20 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-gold font-orbitron mb-4">
            GoldLink Therapy Platform
          </h1>
          <p className="text-white/80 text-lg">
            Select a therapy room to join your session
          </p>
        </div>

        {/* Test Rooms */}
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gold font-orbitron mb-4">Available Test Rooms</h2>
          <div className="space-y-3">
            {testRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => handleJoinRoom(room.id)}
                className="w-full p-4 bg-gradient-to-r from-gold/10 to-gold/5 hover:from-gold/20 hover:to-gold/10 border border-gold/30 hover:border-gold/50 rounded-lg transition-all duration-200 text-left group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-medium font-orbitron mb-1">{room.name}</div>
                    <div className="text-white/60 text-sm font-mono">{room.id}</div>
                  </div>
                  <svg
                    className="w-6 h-6 text-gold opacity-50 group-hover:opacity-100 transition-opacity"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                  </svg>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Custom Room ID */}
        <div className="border-t border-white/10 pt-6">
          <h2 className="text-xl font-bold text-gold font-orbitron mb-4">Join Custom Room</h2>
          <div className="flex gap-3">
            <input
              type="text"
              value={roomInput}
              onChange={(e) => setRoomInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleCustomJoin()}
              placeholder="Enter room UUID"
              className="flex-1 px-4 py-3 bg-black/50 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-gold transition-colors font-mono"
            />
            <button
              onClick={handleCustomJoin}
              disabled={!roomInput.trim()}
              className="px-6 py-3 bg-gold text-panel-blue rounded-lg font-orbitron font-bold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Join
            </button>
          </div>
          <p className="text-white/50 text-sm mt-2">
            Example: f0cc89bb-ab8d-45be-9048-c6cbfef0a3dc
          </p>
        </div>

        {/* Info */}
        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-6 h-6 text-blue-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-white/70 text-sm">
              <p className="font-semibold text-white mb-1">Note:</p>
              <p>You will be asked to allow camera and microphone access when you join a room. This is required for video conferencing.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
