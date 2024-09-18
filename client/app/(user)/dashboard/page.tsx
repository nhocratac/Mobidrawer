'use client'

import FiltersAndView from "@/app/(user)/dashboard/FiltersAndViews"
import ListBoardThumbnail from "@/app/(user)/dashboard/ListBoardThumbnail"
import { Button } from "@/components/ui/button"




export default function page() {
  return (
    <div className="mt-0 bg-[var(--background)] border">
      <div className="flex justify-between lg:h-[80px] items-center ">
        <div className="text-[2.4rem] px-8 ">
          Boards in this team
        </div>
        <div className="flex gap-4 mr-4 text-[1.4rem] items-center">
          <Button className="px-[10px] border lg:h-[32px] text-[1.4rem] rounded-[4px] hover:bg-[#f1f2f5]">
            explore templatess
          </Button>
          <Button variant={'secondary'} className="px-[10px] text-[1.4rem] border lg:h-[32px] rounded-[4px]  " >
            Create new
          </Button>
        </div>
      </div>
      <div className="mx-[24px] h-auto max-h-[300px] bg-[#f1f2f5] p-[25px]">
        <ListBoardThumbnail />
      </div>
      <FiltersAndView/>  
    </div>
  )
}
