import { XMarkIcon, SparklesIcon } from "@heroicons/react/16/solid";
const AIGenerationPopup = ({ togglePopup }) => {


  return (

    
    <div className="bg-red-300 w-full h-full flex flex-col gap-1 items-center">
      <div className="w-full h-[100px] bg-slate-500 relative flex justify-center items-center">
        <h2>TITLE GROUP</h2>

        <button className="absolute top-2 right-2 w-[24px] h-[24px]" onClick={togglePopup}>
          <XMarkIcon className="w-full h-full" />
        </button>
      </div>
      <div className="w-full h-[400px]">
        <input className="w-full h-full flex" />
      </div>
      <button className="text-[18px] rounded-2xl h-[40px] w-[180px] flex bg-teal-400 m-2 justify-center items-center">
        <SparklesIcon className="h-10 w-10" />
        Generate
      </button>



     

    </div>
  );
};

export default AIGenerationPopup;
