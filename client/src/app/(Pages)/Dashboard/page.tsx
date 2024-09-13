'use client'
import { useRouter } from "next/navigation";


const Dasboard = () => {
    const router = useRouter()
    const onCreateNewPlayground = ()=>{
        router.push("/Playground/dhas232hbh")
    }
    return (
      <div>
        <div>Dashboard</div>
        <button 
            onClick={onCreateNewPlayground}
            className="bg-white hover:bg-white text-black font-bold py-16 px-32 text-6xl">
            
          +
        </button>
      </div>
    );
  };
  
  export default Dasboard;
  