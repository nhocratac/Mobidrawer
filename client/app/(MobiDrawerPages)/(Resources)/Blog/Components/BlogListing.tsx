"use client"

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import AllPost from "@/app/(MobiDrawerPages)/(Resources)/Blog/Components/AllPost"
import News from "@/app/(MobiDrawerPages)/(Resources)/Blog/Components/News"
import Templates from "@/app/(MobiDrawerPages)/(Resources)/Blog/Components/Templates"
import Guides from "@/app/(MobiDrawerPages)/(Resources)/Blog/Components/Guides"
import { useState } from "react";
import Blogs from "./Blogs"

export default function BlogListing() {
    const [selectedTab, setSelectedTab] = useState("all");

    return (
        <div className="container mx-auto pt-20 text-center">
            <Tabs defaultValue="all" className="w-full mb-8" onValueChange={setSelectedTab}>
                <TabsList className="h-fit inline-flex rounded-md text-2xl py-3 font-semibold gap-4 shadow-md bg-black flex-wrap overflow-hidden">
                    <TabsTrigger
                        value="all"
                        className=" whitespace-nowrap rounded-md px-4 py-2 text-2xl font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-lg"
                    >
                        Tất cả
                    </TabsTrigger>
                    <TabsTrigger value="success-stories" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-2xl font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-lg">Tin tức</TabsTrigger>
                    <TabsTrigger value="templates" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-2xl font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-lg">Templates</TabsTrigger >
                    <TabsTrigger value="guides" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-2xl font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-lg">Hướng dẫn</TabsTrigger>
                    <TabsTrigger value="blogs" className="inline-flex items-center justify-center whitespace-nowrap rounded-md px-4 py-2 text-2xl font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-lg">Bài viết</TabsTrigger>
                </TabsList>
            </Tabs>
            {selectedTab === "all" && <AllPost />}
            {selectedTab === "success-stories" && <News />}
            {selectedTab === "templates" && <Templates />}
            {selectedTab === "guides" && <Guides />}
            {selectedTab === "blogs" && <Blogs />}
        </div>
    )
}

