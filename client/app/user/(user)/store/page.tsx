'use client'
import ListStoreTemplate from "@/components/Store/ListStoreTemplate";
import ListStoreUser from "@/components/Store/ListStoreUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function StorePage() {
  return (
    <div className="w-full">
      <Tabs defaultValue="store">
        <TabsList className="flex flex-col sm:flex-row gap-1 sm:gap-2 mb-3 bg-yellow-50 p-2 sm:py-8">
          <TabsTrigger value="store" className="block w-full sm:w-auto p-2 sm:p-4">Thêm mẫu</TabsTrigger>
          <TabsTrigger value="own" className="block w-full sm:w-auto p-2 sm:p-4">Mẫu của bạn</TabsTrigger>
        </TabsList>
        <TabsContent value="store"><ListStoreTemplate /></TabsContent>
        <TabsContent value="own"><ListStoreUser /></TabsContent>
      </Tabs>
    </div>
  )
}
