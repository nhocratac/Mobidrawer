'use client';

import { Button } from '@/components/ui/button';
import { CreateStickNoteDto } from '@/lib/Zustand/type.type';
import { MessageSquare } from 'lucide-react';
import { useState } from 'react';
import AIChatPopup from './AIChatPopup';

interface AIChatButtonProps {
  boardId?: string;
  CreateManyStickyNotes : (stickyNotes: CreateStickNoteDto[]) => void
}

const AIChatButton = ({ boardId, CreateManyStickyNotes }: AIChatButtonProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <Button
        onClick={toggleChat}
        className="fixed bottom-4 right-4 rounded-full h-12 w-12 p-0 shadow-lg bg-blue-600 hover:bg-blue-700 transition-all z-40"
        aria-label="Open AI Chat"
      >
        <MessageSquare className="h-6 w-6 text-white" />
      </Button>
      
      <AIChatPopup
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        boardId={boardId}
        CreateManyStickyNotes={CreateManyStickyNotes}
      />
    </>
  );
};

export default AIChatButton;