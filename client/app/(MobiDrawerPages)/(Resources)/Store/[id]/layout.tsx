import templatesApi from "@/api/templatesApi";
import { Template } from "@/lib/Zustand/templateStore";
import { Metadata } from "next";


type Props = {
    params: {
      id: string;
    };
  };
  

export async function generateMetadata({
    params,
  }: Props): Promise<Metadata> {
    const id = (params).id;
    const template: Template = await templatesApi.getTemplateById(id as string);
  
    if (!template) {
      return {};
    } 
    return {
      title: template.title,
      description: template.description,
      keywords: "template, mobidrawer, template store",
      openGraph: {
        title: template.title,
        description: template.description,
        url : `https://mobidrawer.id.vn/Store/${id}`,
        siteName: "Mobidrawer",
        images: [
          {
            url:
            template.previewImageUrl ||
              "https://mobidrawer.id.vn/favicon/android-chrome-512x512.png",
            width: 512,
            height: 512,
            alt: template.title,
          },
        ],
        locale: "vi_VN",
        type: "website",
      },
    };
  }
  
export default function StorePublicItemlayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <div className='flex flex-col flex-1 min-h-screen'>
            {children}
        </div>
    )
}