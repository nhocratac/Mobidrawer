
const ToolBarBtn = ({icon:Icon, onclick, isChoosing = false})=>{
    return(
        <div className={`h-fit bg-white flex flex-col items-center gap-y-1 justify-center w-fit z-50 p-1`}>
            <button
              onClick={onclick}
              className={`bg-white border w-[40px] h-[40px] p-2 hover:bg-cyan-400 hover:border hover:rounded-md ${isChoosing ? 'border-cyan-400' : 'border-gray-300'}`}
            >
              <Icon className="h-full w-full text-gray-700" />
            </button>
          </div>
    )
}

export default ToolBarBtn