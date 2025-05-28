interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

/**
 * Generate a unique key for storing chat history based on user ID and board ID
 */
const getChatHistoryKey = (userId: string, boardId: string): string => {
  return `mobidrawer_chat_history_${userId}_${boardId}`;
};

/**
 * Save chat history to localStorage
 * @param userId - The ID of the current user
 * @param boardId - The ID of the current board
 * @param messages - The messages to save
 */
export const saveChatHistory = (
  userId: string,
  boardId: string,
  messages: Message[]
): void => {
  try {
    // Use a consistent key format that includes both user ID and board ID
    const key = getChatHistoryKey(userId, boardId);
    
    // Convert Date objects to ISO strings for proper serialization
    const serializedMessages = messages.map(message => ({
      ...message,
      timestamp: message.timestamp instanceof Date 
        ? message.timestamp.toISOString() 
        : message.timestamp
    }));
    
    // Save to localStorage
    localStorage.setItem(key, JSON.stringify(serializedMessages));
  } catch (error) {
    console.error('Error saving chat history:', error);
  }
};

/**
 * Load chat history from localStorage
 * @param userId - The ID of the current user
 * @param boardId - The ID of the current board
 * @returns The saved messages or an empty array if none found
 */
export const loadChatHistory = (
  userId: string,
  boardId: string
): Message[] => {
  try {
    // Use the same key format as in saveChatHistory
    const key = getChatHistoryKey(userId, boardId);
    
    // Get the stored item
    const storedMessages = localStorage.getItem(key);
    
    if (!storedMessages) {
      return [];
    }
    
    // Parse the stored JSON and convert ISO date strings back to Date objects
    const parsedMessages = JSON.parse(storedMessages);
    return parsedMessages.map((message: any) => ({
      ...message,
      timestamp: new Date(message.timestamp)
    }));
  } catch (error) {
    console.error('Error loading chat history:', error);
    return [];
  }
};

/**
 * Clear chat history from localStorage
 * @param userId - The ID of the current user
 * @param boardId - The ID of the current board
 */
export const clearChatHistory = (
  userId: string,
  boardId: string
): void => {
  try {
    const key = getChatHistoryKey(userId, boardId);
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error clearing chat history:', error);
  }
};

/**
 * Get all saved chat histories for a specific user
 * @param userId - The ID of the user
 * @returns An object with boardIds as keys and message arrays as values
 */
export const getAllUserChatHistories = (
  userId: string
): Record<string, Message[]> => {
  try {
    const result: Record<string, Message[]> = {};
    const prefix = `mobidrawer_chat_history_${userId}_`;
    
    // Loop through localStorage to find all keys matching the prefix
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(prefix)) {
        // Extract the boardId from the key
        const boardId = key.substring(prefix.length);
        // Load the chat history for this board
        const messages = loadChatHistory(userId, boardId);
        result[boardId] = messages;
      }
    }
    
    return result;
  } catch (error) {
    console.error('Error getting all user chat histories:', error);
    return {};
  }
};