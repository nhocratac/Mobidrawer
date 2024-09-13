interface ILayoutProps {
    children: React.ReactNode;
  }
  
  const Layout = ({ children }: ILayoutProps) => {
    return (
      <div className="flex">
        <div className="h-screen w-16 bg-gray-800 flex flex-col items-center py-4">
          <div className="text-white mb-6">Tool 1</div>
          <div className="text-white mb-6">Tool 2</div>
          <div className="text-white mb-6">Tool 3</div>
          <div className="text-white">Tool 4</div>
        </div>
        <div className="flex-1 p-4">
          {children}
        </div>
      </div>
    );
  };
  
  export default Layout;
  