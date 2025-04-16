'use client';
import React, { useState } from 'react';
import { geminiChatWithStickyNotes, ChatMessage, StickyNote } from '@/api/AiApi';

function App() {
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chatMessages, setChatMessages] = useState<{text: string, isUser: boolean}[]>([]);
  const [history, setHistory] = useState<ChatMessage[]>([]);
  const [stickyNotes, setStickyNotes] = useState<StickyNote[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userInput.trim()) return;

    // Add user message to chat
    const newUserMessage = { text: userInput, isUser: true };
    setChatMessages(prev => [...prev, newUserMessage]);
    
    setLoading(true);
    setError('');
    
    try {
      // Call Gemini API with chat history
      const response = await geminiChatWithStickyNotes(
        userInput,
        3,  // default sticky note count
        undefined,  // default content
        'yellow',  // default color
        history  // pass current history
      );
      
      // Update state with response
      if (response.responseText) {
        setChatMessages(prev => [...prev, { text: response.responseText || '', isUser: false }]);
      }
      
      // Update sticky notes if any were created
      if (response.stickyNotes.length > 0) {
        setStickyNotes(response.stickyNotes);
      }
      
      // Update chat history
      setHistory(response.history);
    } catch (err: any) {
      setError('Error: ' + (err.message || 'Something went wrong'));
    } finally {
      setLoading(false);
      setUserInput('');
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Gemini Chat with History</h1>
      
      {/* Chat Messages */}
      <div className="flex-grow overflow-y-auto mb-4 border border-gray-300 rounded-lg p-4 space-y-4">
        {chatMessages.length === 0 && (
          <p className="text-gray-500 text-center">Start a conversation with Gemini</p>
        )}
        
        {chatMessages.map((msg, index) => (
          <div 
            key={index} 
            className={`p-3 rounded-lg max-w-[80%] ${
              msg.isUser 
                ? 'bg-blue-100 ml-auto' 
                : 'bg-gray-100 mr-auto'
            }`}
          >
            {msg.text}
          </div>
        ))}
        
        {loading && (
          <div className="bg-gray-100 p-3 rounded-lg animate-pulse">
            Thinking...
          </div>
        )}
        
        {error && (
          <div className="bg-red-100 p-3 rounded-lg text-red-700">
            {error}
          </div>
        )}
      </div>
      
      {/* Sticky Notes Display */}
      {stickyNotes.length > 0 && (
        <div className="mb-4">
          <h2 className="text-lg font-semibold mb-2">Sticky Notes</h2>
          <div className="flex flex-wrap gap-2">
            {stickyNotes.map(note => (
              <div 
                key={note.id}
                className="p-3 rounded-lg shadow-md"
                style={{ backgroundColor: note.color || 'yellow' }}
              >
                {note.content}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Form */}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={userInput}
          onChange={(e) => setUserInput(e.target.value)}
          placeholder="Type your message here..."
          className="flex-grow p-2 border border-gray-300 rounded-lg"
          disabled={loading}
        />
        <button 
          type="submit" 
          className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition-colors"
          disabled={loading}
        >
          {loading ? 'Sending...' : 'Send'}
        </button>
      </form>
      
      {/* History Status */}
      <div className="mt-4 text-sm text-gray-500">
        Chat History: {history.length} messages stored
      </div>
    </div>
  );
}

export default App;
