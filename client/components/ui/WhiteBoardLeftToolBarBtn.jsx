
const ToolBarBtn = ({icon:Icon, onclick})=>{
    return(
        <div className="h-fit bg-white flex flex-col items-center gap-y-1 justify-center w-fit z-50 p-1">
            <button
              onClick={onclick}
              className="bg-white w-[40px] h-[40px] p-2 hover:bg-cyan-400 hover:border hover:rounded-md"
            >
              <Icon className="h-full w-full text-gray-700" />
            </button>
          </div>
    )
}

export default ToolBarBtn