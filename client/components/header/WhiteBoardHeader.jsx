import { HomeIcon, SparklesIcon } from "@heroicons/react/16/solid";


const BoardHeader = () =>{
    return (
        <header className="fixed w-full h-[60px] bg-gray-900 text-white flex justify-between items-center px-4 shadow-md">
        <div className="flex items-center gap-4">
          <HomeIcon className="h-6 w-6 text-teal-400" />
          <h1 className="text-xl font-bold">Playground</h1>
        </div>
        <div className="flex items-center gap-4">
          <SparklesIcon className="h-6 w-6 text-teal-400" />
          <button
            className="bg-teal-500 text-white px-4 py-2 rounded-md hover:bg-teal-600"
            
          >
            Button
          </button>
        </div>
      </header>
    )
}

export default BoardHeader;