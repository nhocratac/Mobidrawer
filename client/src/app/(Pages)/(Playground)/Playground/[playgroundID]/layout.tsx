interface ILayoutProps {
  children: React.ReactNode;
}

const Layout = ({ children }: ILayoutProps) => {
  return (
    <div className="relative w-full h-full">
      {/* Sidebar */}
      <div className="fixed top-1/2 left-2 transform -translate-y-1/2 h-fit bg-gray-800 flex flex-col items-center   gap-y-1 justify-center w-fit z-50">
        <button className="bg-white w-[40px] h-[40px] p-2 hover:bg-teal-500 hover:border hover:rounded-md"></button>
        <button className="bg-white w-[40px] h-[40px] p-2 hover:bg-teal-500 hover:border hover:rounded-md"></button>
        <button className="bg-white w-[40px] h-[40px] p-2 hover:bg-teal-500 hover:border hover:rounded-md"></button>
        <button className="bg-white w-[40px] h-[40px] p-2 hover:bg-teal-500 hover:border hover:rounded-md"></button>
        <button className="bg-white w-[40px] h-[40px] p-2 hover:bg-teal-500 hover:border hover:rounded-md"></button>
        <button className="bg-white w-[40px] h-[40px] p-2 hover:bg-teal-500 hover:border hover:rounded-md"></button>
        <button className="bg-white w-[40px] h-[40px] p-2 hover:bg-teal-500 hover:border hover:rounded-md"></button>
      </div>


      {/* Main content area */}
      <div className="relative w-full h-full p-4 z-10">
        {children}
      </div>
    </div>
  );
};

export default Layout;
