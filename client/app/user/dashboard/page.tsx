'use client'

import FiltersAndView from "@/app/user/dashboard/FiltersAndViews"
import ListBoardOfUser from "@/components/dashboard/ListBoardOfUser"
import ListBoardThumbnail from "@/components/dashboard/ListBoardThumbnail"
import { Button } from "@/components/ui/button"
import path from "@/utils/path"
import Link from "next/link"
import { useState } from "react"




export default function DashboardPage() {
  const [modeView, setModeView] = useState<'List'| 'Grid'>('List')
  return (
    <div className="mt-0 bg-[var(--background)] border h-full flex flex-col">
      <div className="flex justify-between lg:h-[80px] items-center ">
        <div className="text-[2.4rem] px-8 ">
          Các bảng của bạn
        </div>
        <div className="flex gap-4 mr-4 text-[1.4rem] items-center">
          <Button className="px-[10px] border lg:h-[32px] text-[1.4rem] rounded-[4px]">
            <Link href={path.user.store}>
              khám phá
            </Link>
          </Button>
          <Button variant={'secondary'} className="px-[10px] text-[1.4rem] border lg:h-[32px] rounded-[4px]  " >
            <Link href={path.user.post}>Tạo mới</Link>
          </Button>
        </div>
      </div>
      <div className="mx-[24px] h-auto max-h-[300px] bg-[#f1f2f5] p-[25px]">
        <ListBoardThumbnail />
      </div>
      <FiltersAndView setModeView={setModeView} />
      <ListBoardOfUser modeView={modeView} />
    </div>
  )
}
