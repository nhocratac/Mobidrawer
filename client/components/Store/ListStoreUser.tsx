'use client'
import UserLiItem from "@/components/Store/UserLiItem"
import { useTemplateStore } from "@/lib/Zustand/store"

function ListStoreUser() {
  const storeData = useTemplateStore((state) => state.templates)
  return (
    <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {storeData.map((item, index) => (
        <UserLiItem key={index} {...item} />
      ))}
    </ul>
  )
}

export default ListStoreUser

