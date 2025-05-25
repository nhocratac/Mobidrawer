'use client';

import { ChatMessage, geminiChatWithStickyNotes } from '@/api/AiApi';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { clearChatHistory, loadChatHistory, saveChatHistory } from '@/lib/chatHistoryStorage';
import useTokenStore from '@/lib/Zustand/tokenStore';
import { CreateStickNoteDto } from '@/lib/Zustand/type.type';
import { Bot, Send, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface AIChatPopupProps {
  isOpen: boolean;
  onClose: () => void;
  boardId?: string;
  CreateManyStickyNotes : (stickyNotes: CreateStickNoteDto []) => void
}

const AIChatPopup = ({ isOpen, onClose, boardId, CreateManyStickyNotes}: AIChatPopupProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useTokenStore();
  
  // Load chat history from localStorage when component mounts
  useEffect(() => {
    if (user?.id && boardId) {
      const savedMessages = loadChatHistory(user.id, boardId);
      if (savedMessages && savedMessages.length > 0) {
        setMessages(savedMessages);
      } else {
        // Add initial greeting message if no history exists
        setMessages([
          {
            id: '1',
            content: 'Xin chào! Tôi là trợ lý AI MobiDrawer. Tôi có thể giúp gì cho bạn hôm nay?',
            role: 'assistant',
            timestamp: new Date(),
          },
        ]);
      }
    }
  }, [boardId, user?.id]);

  // Auto scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Transform AiApi StickyNote to Zustand StickyNote format
  const transformStickyNotes = (
    notes: { id: string; content: string; color: string }[], 
    // boardId: string
  ): CreateStickNoteDto[] => {
    return notes.map(note => ({
      // Use the exact color from AI response
      color: note.color, 
      // Use the exact content from AI response
      text: note.content,
      size: {
        width: 200, // Default width
        height: 200, // Default height
      },
      position: {
        x: Math.floor(Math.random() * 600), // Random position
        y: Math.floor(Math.random() * 400), // Random position
      },

    }));
  };
  // Save messages to localStorage
  useEffect(() => {
    if (user?.id && boardId && messages.length > 0) {
      saveChatHistory(user.id, boardId, messages);
    }
  }, [messages, user?.id, boardId]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || !user?.id) return;

    const userMessage = {
      id: Date.now().toString(),
      content: inputValue,
      role: 'user' as const,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      // Call Gemini API to process the message with chat history
      const response = await geminiChatWithStickyNotes(
        inputValue,
        3, // Default number of sticky notes to create if needed
        undefined,
        'bg-yellow-200',
        chatHistory // Pass the chat history to maintain context
      );      // Add AI response to chat
      if (response.responseText) {
        const assistantMessage = {
          id: Date.now().toString(),
          content: response.responseText,
          role: 'assistant' as const,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
      
      // Update chat history for context in future messages
      if (response.history) {
        setChatHistory(response.history);
      }

      // If sticky notes were created via function calling
      if (response.hasFunctionCall && response.stickyNotes && response.stickyNotes.length > 0 && boardId) {
        // Transform the sticky notes to match the Zustand store format
        const transformedNotes = transformStickyNotes(response.stickyNotes);
        
        // Add the transformed notes to the store
        CreateManyStickyNotes(transformedNotes)
        // setStickyNotes(transformedNotes);
        
        // Add notification about sticky notes creation if no response text
        if (!response.responseText) {
          const notificationMessage = {
            id: Date.now().toString(),
            content: `Tôi đã tạo ${response.stickyNotes.length} sticky note trên bảng của bạn!`,
            role: 'assistant' as const,
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, notificationMessage]);
        }
      } 
      // If no response text was returned (error case)
      else if (!response.responseText) {
        const fallbackMessage = {
          id: Date.now().toString(),
          content: 'Rất tiếc, tôi không thể xử lý yêu cầu của bạn lúc này. Vui lòng thử lại sau.',
          role: 'assistant' as const,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, fallbackMessage]);
      }
    } catch (error) {
      console.error('Error in AI chat:', error);
      const errorMessage = {
        id: Date.now().toString(),
        content: 'Rất tiếc, đã có lỗi xảy ra. Vui lòng thử lại sau.',
        role: 'assistant' as const,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-16 right-16 w-[350px] bg-white rounded-lg shadow-lg flex flex-col z-50">      {/* Header */}
      <div className="flex justify-between items-center px-4 py-3 bg-blue-600 text-white rounded-t-lg">
        <div className="flex items-center gap-2">
          <Bot className="w-5 h-5" />
          <span className="font-semibold">MobiDrawer AI</span>
        </div>
        <div className="flex items-center gap-2">
          {messages.length > 1 && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                if (user?.id && boardId) {
                  // Clear local state
                  setMessages([{
                    id: '1',
                    content: 'Xin chào! Tôi là trợ lý AI MobiDrawer. Tôi có thể giúp gì cho bạn hôm nay?',
                    role: 'assistant',
                    timestamp: new Date(),
                  }]);
                  setChatHistory([]);
                    // Clear from localStorage
                  clearChatHistory(user.id, boardId);
                }
              }} 
              className="hover:bg-blue-700 p-1 h-auto"
              title="Clear History"
            >
              <span className="text-xs text-white">Clear</span>
            </Button>
          )}
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={onClose} 
            className="hover:bg-blue-700 p-1 h-auto"
          >
            <X className="w-5 h-5 text-white" />
          </Button>
        </div>
      </div>

      {/* Messages container */}
      <div className="flex-1 overflow-auto p-4 h-[350px] space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] px-3 py-2 rounded-lg ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white rounded-tr-none'
                  : 'bg-gray-100 text-gray-800 rounded-tl-none'
              }`}
            >
              {message.content}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 text-gray-800 px-3 py-2 rounded-lg rounded-tl-none max-w-[80%]">
              <span className="inline-block animate-pulse">...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input area */}
      <div className="border-t p-3 flex gap-2 items-center">
        <Input
          type="text"
          placeholder="Nhập tin nhắn..."
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !isLoading) {
              handleSendMessage();
            }
          }}
          disabled={isLoading}
          className="flex-1"
        />
        <Button 
          onClick={handleSendMessage} 
          disabled={isLoading || !inputValue.trim()}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
};

export default AIChatPopup;