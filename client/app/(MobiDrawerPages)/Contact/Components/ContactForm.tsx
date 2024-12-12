"use client"

import { useForm } from "react-hook-form"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"


const formSchema = z.object({
    username: z.string().min(2, {
        message: "Hãy nhập tên của bạn.",
    }),
    email: z.string().email({
        message: "Invalid email address.",
    }),
    phone: z.string().min(10, {
        message: "Hãy nhập số điện thoại hợp lệ.",
    }),
    occupation: z.string().min(2, {
        message: "Hãy nhập nghề nghiệp của bạn.",
    }),
    expectedPeople: z.number().min(1, {
        message: "Hãy nhập số lượng người dự kiến.",
    }),
    message: z.string().min(5, {
        message: "Hãy nhập lời nhắn của bạn.",
    }),
})

export function ContactForm() {

    const form = useForm<z.infer<typeof formSchema>>({
        defaultValues: {
            email: "",
            username: "",
            phone: "",
            occupation: "",
            expectedPeople: 1,
            message: "",
        },
    })

    function onSubmit(values: z.infer<typeof formSchema>) {
        console.log(values)
    }

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8 bg-[#FDE050] p-20 rounded-2xl">
                <h2 className="text-5xl py-2"
                    style={{ maxWidth: 500 }}>
                    Liên hệ với chúng tôi để nhận được sự tư vấn
                </h2>
                <FormField
                    control={form.control}
                    name="username"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-2xl">Họ và tên</FormLabel>
                            <FormControl className="py-8 px-4 rounded-lg text-2xl">
                                <Input placeholder="Nguyễn Văn A" {...field} />
                            </FormControl>
                            <FormMessage className="text-xl" />
                        </FormItem>
                    )}
                />

                <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-2xl">Email</FormLabel>
                            <FormControl className="py-8 px-4 rounded-lg text-2xl">
                                <Input placeholder="nva@gmail.com" {...field} />
                            </FormControl>
                            <FormMessage className="text-xl" />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-2xl">Số điện thoại</FormLabel>
                            <FormControl className="py-8 px-4 rounded-lg text-2xl">
                                <Input placeholder="0123456789" {...field} />
                            </FormControl>
                            <FormMessage className="text-xl" />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="occupation"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-2xl">Nghề nghiệp</FormLabel>
                            <FormControl className="py-8 px-4 rounded-lg text-2xl">
                                <Input placeholder="Kỹ sư" {...field} />
                            </FormControl>
                            <FormMessage className="text-xl" />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="expectedPeople"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-2xl">Số lượng người dự kiến</FormLabel>
                            <FormControl className="py-8 px-4 rounded-lg text-2xl">
                                <Input type="number" placeholder="1" {...field} />
                            </FormControl>
                            <FormMessage className="text-xl" />
                        </FormItem>
                    )}
                />
                <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-2xl">Lời nhắn</FormLabel>
                            <FormControl className="py-4 px-4 rounded-lg placeholder:text-2xl">
                                <Textarea className="text-2xl" placeholder="Hãy để lại câu hỏi, mục đích, hoặc bất cứ gì bạn muốn từ chúng tôi." {...field}/>
                            </FormControl>
                            <FormMessage className="text-xl" />
                        </FormItem>
                    )}
                />
                <Button className="py-8 px-10 text-2xl bg-blue-600 hover:bg-blue-700 text-white hover:opacity-90 transition-opacity duration-200"
                    type="submit">Liên hệ ngay
                </Button>
            </form>
        </Form>
    )
}
