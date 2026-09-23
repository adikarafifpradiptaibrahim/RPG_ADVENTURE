import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, Send, X, Users, Globe, Shield } from 'lucide-react';
import { ChatMessage } from '../game/multiplayer';

interface MultiplayerChatProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  roomName: string;
  onlineCount: number;
  playerName: string;
}

export const MultiplayerChat: React.FC<MultiplayerChatProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  roomName,
  onlineCount,
  playerName,
}) => {
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  return (
    <div className="fixed bottom-24 left-4 z-40 w-80 sm:w-96 bg-stone-950/95 border-2 border-amber-500/50 rounded-2xl shadow-2xl backdrop-blur-md flex flex-col overflow-hidden animate-fade-in font-sans">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-gradient-to-r from-amber-950/60 to-stone-900 border-b border-amber-500/30">
        <div className="flex items-center gap-2">
          <Globe className="w-4 h-4 text-amber-400 animate-pulse" />
          <span className="text-xs font-bold text-amber-200">Room: {roomName}</span>
          <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950 border border-emerald-500/40 text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            {onlineCount} Online
          </span>
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-lg text-stone-400 hover:text-white hover:bg-stone-800 transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Message List */}
      <div className="flex-1 h-56 overflow-y-auto p-3 space-y-2 text-xs scrollbar-thin scrollbar-thumb-amber-500/30">
        {messages.length === 0 ? (
          <div className="text-stone-500 text-center py-6 italic">
            Belum ada pesan di room {roomName}. Mulai percakapan dengan petualang lain!
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.sender === playerName;
            if (msg.isSystem) {
              return (
                <div key={msg.id} className="text-center my-1">
                  <span className="inline-block px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-300">
                    📜 {msg.text}
                  </span>
                </div>
              );
            }

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}
              >
                <div className="text-[10px] text-stone-400 font-semibold mb-0.5">
                  {isMe ? 'Kamu' : msg.sender}
                </div>
                <div
                  className={`px-3 py-1.5 rounded-xl max-w-[85%] break-words ${
                    isMe
                      ? 'bg-amber-600 text-white rounded-br-none shadow-md'
                      : 'bg-stone-800/90 text-stone-100 rounded-bl-none border border-stone-700'
                  }`}
                >
                  {msg.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-2 bg-stone-900/80 border-t border-stone-800 flex gap-1.5">
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Ketik pesan untuk pemain lain..."
          className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 transition"
          maxLength={120}
        />
        <button
          type="submit"
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl transition flex items-center justify-center cursor-pointer active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </form>
    </div>
  );
};
