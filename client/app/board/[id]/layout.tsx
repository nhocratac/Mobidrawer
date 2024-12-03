"use client";
// Error Boundary Component
const BoardLayout = ({ children }: { children: React.ReactNode }) => {
  return (

    <div className="relative w-full h-full">
      <div className="relative w-full h-full p-4 z-10">{children}</div>
    </div>

  );
};

export default BoardLayout;
