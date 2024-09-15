import ListBoardThumbnail from "@/app/(user)/dashboard/ListBoardThumbnail";

export default function page() {
  return (
    <div className="mt-0 bg-white border">
      <div className="flex justify-between lg:h-[80px] items-center ">
        <div className="text-[2.4rem] px-8 ">
          Boards in this team
        </div>
        <div className="flex gap-4 mr-4 text-[1.4rem] items-center">
          <button className="px-[10px] border lg:h-[32px]  rounded-[4px] hover:bg-[#f1f2f5]">
            explore templatess
          </button>
          <button className="px-[10px] text-white border lg:h-[32px] rounded-[4px] bg-[#3859ff] hover:bg-[#7081e3]" >
            Create new
          </button>
        </div>
      </div>
      <div className="mx-[24px] h-auto max-h-[200px] bg-[#f1f2f5] p-[25px]">
        <ListBoardThumbnail />
      </div>
    </div>
  )
}
