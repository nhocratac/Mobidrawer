"use client"
import templatesApi from "@/api/templatesApi";
import userApi from "@/api/userApi";
import { Button } from "@/components/ui/button";
import { Template } from "@/lib/Zustand/templateStore";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";

export default function StorePublicPage() {
    const { id } = useParams()
    const [template, setTemplate] = useState<Template | null>(null);

    useEffect(() => {
        templatesApi.getTemplateById(id.toString())
            .then((res) => {
                setTemplate(res);
            })
            .catch((err) => {
                console.error("Error fetching template:", err);
            });
    }, [id])

    if (!template) {
        return (
            <div className="h-full w-full bg-black">
                Loading...
            </div>
        )
    }
    return (
        <div className="flex w-full flex-1">
            <div className="flex-1 max-w-7xl mx-auto p-4 flex items-center justify-center gap-10" >
                <div>
                    <div className="text-gray-500 text-2xl flex items-center">
                        <UserLiItem owner={template.owner} />
                    </div>
                    <h1 className="text-6xl font-bold mt-4">{template.title}</h1>
                    <p className="text-gray-300 mb-6 text-2xl">{template.description}</p>
                    <div className="flex justify-between items-center">
                        <span className="text-yellow-400 text-2xl">Rating: {4}</span>
                    </div>
                    <Button className=" text-center text-3xl px-5 py-7" type="button">
                        Dùng template này
                    </Button>
                </div>
                <Image height={200} width={400} src={template.previewImageUrl} alt={template.title} className=" rounded-lg mb-6 h-auto" />
            </div>
        </div>
    )
}


const UserLiItem = ({ owner }: { owner: string }) => {
    const [ownerDetail, setOwner] = useState({
        logo: '',
        name: ''
    });
    userApi.getUserDetailById(owner)
        .then((res) => {
            setOwner({
                logo: res.avatarUrl || '/default-logo.png', // fallback logo if none provided
                name: res.firstName + res.lastName || 'Unknown User'
            });
        })
        .catch((err) => {
            console.error("Error fetching user details:", err);
        });

    return (
        <>
            <Image src={ownerDetail.logo} alt={`${ownerDetail.name} logo`} height={56} width={56} />
            <span className="font-bold text-2xl sm:text-base md:text-2xl">{ownerDetail.name}</span>
        </>
    )
}