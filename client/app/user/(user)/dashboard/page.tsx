'use client'

import FiltersAndView from "@/app/user/(user)/dashboard/FiltersAndViews"
import ListBoardOfUser from "@/app/user/(user)/dashboard/ListBoardOfUser"
import ListBoardThumbnail from "@/app/user/(user)/dashboard/ListBoardThumbnail"
import { Button } from "@/components/ui/button"
import path from "@/utils/path"
import Link from "next/link"
import { useState } from "react"

export default function DashboardPage() {

  const [modeView, setModeView] = useState<'List'| 'Grid'>('List')

  return (
    <div className="mt-0 bg-[var(--background)] border h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between p-4 lg:h-[80px] items-start sm:items-center gap-4">
        <div className="text-xl md:text-[2.4rem] px-0 sm:px-8">
          Các bảng của bạn
        </div>
        <div className="flex gap-4 text-[1.2rem] md:text-[1.4rem] items-center">
          <Button className="px-[10px] border lg:h-[32px] text-[1.4rem] rounded-[4px]">
            <Link href={path.user.store}>
              Khám phá
            </Link>
          </Button>
          <Button variant={'secondary'} className="px-[10px] text-[1.4rem] border lg:h-[32px] rounded-[4px]  " >
            <Link href={path.user.post}>Tạo mới</Link>
          </Button>
        </div>
      </div>
      <div className="mx-4 md:mx-[24px] h-auto max-h-[300px] bg-[#f1f2f5] p-4 md:p-[25px]">
        <ListBoardThumbnail />
      </div>
      <FiltersAndView setModeView={setModeView} />
      <ListBoardOfUser modeView={modeView} />
    </div>
  )
}
