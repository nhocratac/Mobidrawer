"use client";
// schema/templateSchema.ts
import templatesApi from "@/api/templatesApi";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useCanvasPathsStore } from "@/lib/Zustand/canvasPathsStore";
import useStickyNoteStore from "@/lib/Zustand/stickyNoteStore";
import { useBoardStoreof } from "@/lib/Zustand/store";
import path from "@/utils/path";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";

const TemplateFormSchema = z.object({
    title: z.string().min(3, "Tiêu đề phải có ít nhất 3 ký tự."),
    description: z.string().optional(),
    isPublic: z.boolean(),
});

type TemplateFormValues = z.infer<typeof TemplateFormSchema>;

export default function CreateTemplateForm() {
    const { toast } = useToast();

    const { board } = useBoardStoreof()
    const stickyNotes = useStickyNoteStore((state) => state.stickyNotes);
    const canvasPaths = useCanvasPathsStore((state) => state.canvasPaths);


    const form = useForm<TemplateFormValues>({
        resolver: zodResolver(TemplateFormSchema),
        defaultValues: {
            title: board?.name || "Mẫu mới",
            description: board?.description || "Mô tả mẫu",
            isPublic: true,
        },
    });

    const onSubmit = (data: TemplateFormValues) => {
        try {
            if (!board) {
                toast({
                    title: "Lỗi",
                    description: "Không tìm thấy bảng để tạo mẫu.",
                    variant: "destructive",
                });
                return;
            }
            // chuyển stickyNotes và canvasPaths sang định dạng phù hợp nếu cần
            // canvasPath chỉ giữ lại các thuộc tính cần thiết
            //   thickness: number;
            //   color: string;
            //   opacity: number;
            //   paths: coordinate[];
            // stickyNotes chỉ giữ lại các thuộc tính cần thiết
            //               color: string;
            //   text : string;
            //   size :{
            //     width: number;
            //     height: number;
            //   }
            //   position : {
            //     x: number;
            //     y: number;
            //   },
            if (!board.canvasPaths || !board.stickyNotes) {
                toast({
                    title: "Lỗi",
                    description: "Không có dữ liệu để tạo mẫu.",
                    variant: "destructive",
                });
                return;
            }
            const canvaspaths = canvasPaths.map((path) => ({
                thickness: path.thickness,
                color: path.color,
                opacity: path.opacity,
                paths: path.paths,
            }));

            const StickyNotes = stickyNotes.map((note) => ({
                color: note.color,
                text: note.text,
                size: {
                    width: note.size.width,
                    height: note.size.height,
                },
                position: {
                    x: note.position.x,
                    y: note.position.y,
                },
            }));
            //   await createTemplate(data);
            templatesApi.createTemplate({
                title: data.title,
                description: data.description || "",
                isPublic: data.isPublic,
                previewImageUrl: board?.thumbnail || "",
                canvasPaths: canvaspaths || [], // Chuyển đổi canvasPaths sang định dạng phù hợp
                stickyNotes: StickyNotes || [], // Chuyển đổi stickyNotes sang định dạng phù hợp
            }).then(() => {
                toast({
                    title: "Thành công",
                    description: (
                        <p>
                            Mẫu đã được tạo thành công.{" "}
                            <Link href={path.user.store} className="text-blue-500 underline">
                                Xem ngay
                            </Link>
                        </p>
                    ),
                    variant: "default",
                });
                //router.push("/user/board/templates");
            })

        } catch (err) {
            toast({
                title: "Thất bại",
                description: "Không thể tạo mẫu.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="h-screen w-screen flex ">
            <div className="max-w-[50%] w-2/5  mx-auto px-10">
                <h1 className="text-6xl font-bold mb-6 text-center">Tạo Template</h1>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <FormField
                            control={form.control}
                            name="title"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-2xl">Tiêu đề</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nhập tiêu đề" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-2xl">Mô tả</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Nhập mô tả" {...field} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="isPublic"
                            render={({ field }) => (
                                <FormItem className="flex items-center justify-between">
                                    <FormLabel className="mr-4 text-2xl" >Công khai</FormLabel>
                                    <FormControl>
                                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )}
                        />
                        <Button type="submit" className="w-full bg-indigo-600 text-white hover:bg-indigo-700 text-3xl py-4">
                            Tạo Template
                        </Button>
                    </form>
                </Form>
            </div>
            <div className=" flex-1">
                <Image width={400} height={400} src={board?.thumbnail || ""} alt="Template Preview" className="object-cover" />
                <div className=" bg-black bg-opacity-50 p-4">
                    <h2 className="text-white text-3xl font-bold">{board?.name || "Tên Mẫu"}</h2>
                    <p className="text-white text-lg">{board?.description || "Mô tả mẫu"}</p>
                </div>
            </div>
        </div>
    );
}