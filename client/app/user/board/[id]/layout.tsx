
const BoardLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="relative w-screen h-screen">
      <div className="relative w-screen h-screen p-4 z-10">{children}</div>
    </div>

  );
};

export default BoardLayout;
