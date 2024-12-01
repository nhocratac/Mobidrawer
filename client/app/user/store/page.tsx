'use client'
import ListStoreTemplate from "@/components/Store/ListStoreTemplate";
import ListStoreUser from "@/components/Store/ListStoreUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"


export default function StorePage() {
  return (
    <div className="">
      <Tabs defaultValue="store">
        <TabsList className="flex gap-4 mb-4 bg-yellow-50 py-12">
          <TabsTrigger value="store" className="block p-6">Thêm mẫu</TabsTrigger>
          <TabsTrigger value="own" className="block p-6">Mẫu của bạn</TabsTrigger>
        </TabsList>
        <TabsContent value="store"><ListStoreTemplate /></TabsContent>
        <TabsContent value="own"><ListStoreUser /></TabsContent>
      </Tabs>
    </div>
  )
}
