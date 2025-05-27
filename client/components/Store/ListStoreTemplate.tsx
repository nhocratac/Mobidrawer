'use client'
import templatesApi from "@/api/templatesApi"
import LiItem from "@/components/Store/Item"
import useTemplateStore from "@/lib/Zustand/templateStore"
import { useEffect, useState } from 'react'

function ListStoreTemplate() {
  const storeData = useTemplateStore((state) => state.templates)
  const [page, setPage] = useState(0)
  const [totalPages, setTotalPages] = useState(0)
  const [search, setSearch] = useState("")

  useEffect(() => {
    templatesApi.getTemplates({
      page,
      size: 20,
      search: search.trim() !== "" ? search : undefined,
    }).then((res) => {
      useTemplateStore.getState().setTemplates(res.content)
      setTotalPages(res.totalPages)
    }).catch((err) => {
      console.error("Error fetching templates:", err)
    })
  }, [page, search]) // gọi lại khi page hoặc search thay đổi

  // Reset về trang đầu khi search thay đổi
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value)
    setPage(0) // reset về page đầu
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Search Input */}
      <div className="flex justify-center">
        <input
          type="text"
          value={search}
          onChange={handleSearchChange}
          placeholder="Tìm kiếm theo tên mẫu..."
          className="px-4 py-2 border rounded w-full max-w-md"
        />
      </div>

      {/* Template Grid */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {storeData.map((item) => (
          <LiItem key={item.id} {...item} />
        ))}
      </ul>

      {/* Pagination Controls */}
      <div className="flex justify-center items-center gap-2 mt-4">
        <button
          type="button"
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          onClick={() => setPage(prev => Math.max(prev - 1, 0))}
          disabled={page === 0}
        >
          Previous
        </button>

        <span>Page {page + 1} of {totalPages}</span>

        <button
          type="button"
          className="px-4 py-2 bg-gray-200 rounded disabled:opacity-50"
          onClick={() => setPage(prev => Math.min(prev + 1, totalPages - 1))}
          disabled={page >= totalPages - 1}
        >
          Next
        </button>
      </div>
    </div>
  )
}

export default ListStoreTemplate
