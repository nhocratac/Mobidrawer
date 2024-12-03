'use client'
import UserLiItem from "@/components/Store/UserLiItem"
import { useTemplateStore } from "@/lib/Zustand/store"

function ListStoreUser() {
  const storeData = useTemplateStore((state) => state.templates)
  return (
    <ul className="grid grid-cols-4 gap-y-8 gap-x-24">
      {storeData.map((item, index) => (
        <UserLiItem key={index} {...item} />
      ))}
    </ul>
  )
}

export default ListStoreUser

