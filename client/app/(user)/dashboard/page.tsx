import ListBoardThumbnail from "@/app/(user)/dashboard/ListBoardThumbnail";
import { Button } from "@/components/ui/button";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"


export default function page() {
  return (
    <div className="mt-0 bg-[var(--background)] border">
      <div className="flex justify-between lg:h-[80px] items-center ">
        <div className="text-[2.4rem] px-8 ">
          Boards in this team
        </div>
        <div className="flex gap-4 mr-4 text-[1.4rem] items-center">
          <button className="px-[10px] border lg:h-[32px]  rounded-[4px] hover:bg-[#f1f2f5]">
            explore templatess
          </button>
          <Button variant={'secondary'} className="px-[10px] text-[1.4rem] border lg:h-[32px] rounded-[4px]  " >
            Create new
          </Button>
        </div>
      </div>
      <div className="mx-[24px] h-auto max-h-[200px] bg-[#f1f2f5] p-[25px]">
        <ListBoardThumbnail />
      </div>
      <div className="mt-12 flex justify-between w-full">
        <div className="flex w-full gap-4 text-[1.4rem]">
          <p >
            Filter by
          </p>
          <Select>
            <SelectTrigger className="min-w-[100px] w-1/5">
              <SelectValue placeholder="Board" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">
           <p className="text-[1.4rem]">                  
                  All
           </p>              </SelectItem>
              <SelectItem value="NotIn">Not in space</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  )
}
