// Board template configuration
// Each template index corresponds to the number of sticky notes to create

interface TemplateNote {
  color: string;
  position: { x: number; y: number };
  size: { width: number; height: number };
  text: string;
}

// Configuration for template sticky notes
// The array index corresponds to the template index (0-based)
// Each template has an array of notes to create
// Template 0: Create 0 notes
// Template 1: Create 1 note
// Template 2: Create 2 notes, etc.
export const boardTemplateConfig = [
  // Template 0: Flow Chart - Create 0 notes
  [],
  
  // Template 1: Brainwriting - Create 1 note
  [
    {
      color: "bg-green-200",
      position: { x: 200, y: 150 },
      size: { width: 250, height: 200 },
      text: "Brainwriting session started! Add your ideas as sticky notes and organize them into categories.",
    }
  ],
  
  // Template 2: Intelligent Template - Create 2 notes
  [
    {
      color: "bg-purple-200",
      position: { x: 150, y: 150 },
      size: { width: 250, height: 200 },
      text: "This is your intelligent template board. Organize your content using the tools in the sidebar.",
    },
    {
      color: "bg-blue-200",
      position: { x: 450, y: 150 },
      size: { width: 250, height: 200 },
      text: "Use this note to define your project goals and timeline.",
    }
  ],
  
  // Template 3: Kanban Framework - Create 3 notes (To Do, In Progress, Done)
  [
    {
      color: "bg-yellow-200",
      position: { x: 150, y: 150 },
      size: { width: 250, height: 200 },
      text: "TO DO\n\nAdd tasks that need to be completed.",
    },
    {
      color: "bg-orange-200",
      position: { x: 450, y: 150 },
      size: { width: 250, height: 200 },
      text: "IN PROGRESS\n\nAdd tasks that are currently being worked on.",
    },
    {
      color: "bg-green-200", 
      position: { x: 750, y: 150 },
      size: { width: 250, height: 200 },
      text: "DONE\n\nAdd completed tasks here.",
    }
  ],
  
  // Template 4: Mind Map - Create 4 notes
  [
    {
      color: "bg-red-200",
      position: { x: 400, y: 300 },
      size: { width: 250, height: 200 },
      text: "CENTRAL TOPIC\n\nPlace your main idea here.",
    },
    {
      color: "bg-blue-200",
      position: { x: 150, y: 150 },
      size: { width: 200, height: 150 },
      text: "Subtopic 1",
    },
    {
      color: "bg-green-200",
      position: { x: 700, y: 150 },
      size: { width: 200, height: 150 },
      text: "Subtopic 2",
    },
    {
      color: "bg-purple-200",
      position: { x: 400, y: 550 },
      size: { width: 200, height: 150 },
      text: "Subtopic 3",
    }
  ],
  
  // Template 5: Quick Retrospective - Create 5 notes
  [
    {
      color: "bg-indigo-200",
      position: { x: 400, y: 100 },
      size: { width: 350, height: 100 },
      text: "TEAM RETROSPECTIVE",
    },
    {
      color: "bg-green-200",
      position: { x: 150, y: 250 },
      size: { width: 250, height: 200 },
      text: "What went well?",
    },
    {
      color: "bg-yellow-200",
      position: { x: 450, y: 250 },
      size: { width: 250, height: 200 },
      text: "What could be improved?",
    },
    {
      color: "bg-red-200",
      position: { x: 750, y: 250 },
      size: { width: 250, height: 200 },
      text: "What should we stop doing?",
    },
    {
      color: "bg-blue-200",
      position: { x: 400, y: 500 },
      size: { width: 350, height: 200 },
      text: "Action items for next sprint:",
    }
  ],
  //Template 6: 
  [
    {
      color: "bg-indigo-200",
      position: { x: 400, y: 100 },
      size: { width: 350, height: 100 },
      text: "TEAM RETROSPECTIVE",
    },
    {
      color: "bg-green-200",
      position: { x: 150, y: 250 },
      size: { width: 250, height: 200 },
      text: "What went well?",
    },
    {
      color: "bg-yellow-200",
      position: { x: 450, y: 250 },
      size: { width: 250, height: 200 },
      text: "What could be improved?",
    },
    {
      color: "bg-red-200",
      position: { x: 750, y: 250 },
      size: { width: 250, height: 200 },
      text: "What should we stop doing?",
    },
    {
      color: "bg-blue-200",
      position: { x: 400, y: 500 },
      size: { width: 350, height: 200 },
      text: "Action items for next sprint:",
    }
  ],

];

export default boardTemplateConfig;