"use client"
import { Button } from "@/components/ui/button"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from "@/components/ui/input";
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from "react-hook-form"
import { z } from "zod"
import { requestForgetPassword } from "@/api/authAPI"
import { useToast } from '@/hooks/use-toast';
import { useRouter } from "next/navigation"

const FormSchema = z.object({
    email: z.string().email({
        message: "Vui lòng nhập địa chỉ email hợp lệ"
    }),
});

export default function ForgotPasswordForm() {
    const { toast } = useToast();
    const router = useRouter();
    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            email: "",
        },
    });

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        try {
            await requestForgetPassword(data.email);
            toast({
                title: "Thành công",
                description: "Liên kết đặt lại mật khẩu đã được gửi đến email của bạn.",
                variant: "default",
            });
            router.replace(`/reset-password?email=${encodeURIComponent(data.email)}`);
        } catch (error) {
            toast({
                title: "Lỗi",
                description: "Có lỗi xảy ra khi gửi yêu cầu đặt lại mật khẩu.",
                variant: "destructive",
            });
        }
    }

    return (
        <div className='w-full max-w-md mx-auto p-4'>
            <div className="mb-4 pl-2">
                <h1 className="text-2xl sm:text-3xl font-bold text-left">Quên mật khẩu</h1>
            </div>
            <hr className="border-gray-300 mb-4" />
            <p className="text-gray-600 mb-6 text-base sm:text-lg">
                Nhập địa chỉ email của bạn và chúng tôi sẽ gửi cho bạn liên kết để đặt lại mật khẩu.
            </p>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 sm:space-y-6">
                    <FormField
                        control={form.control}
                        name='email'
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-lg sm:text-xl">Email</FormLabel>
                                <FormControl>
                                    <Input 
                                        type='email'
                                        placeholder='Nhập địa chỉ email của bạn'
                                        className='block w-full h-[40px] px-4 py-2 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-xl'
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <Button
                        type="submit"
                        className="text-base sm:text-xl w-full h-[48px] py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                    >
                        Gửi
                    </Button>
                </form>
            </Form>

            <div className="mt-4 text-center">
                <a
                    href="/login"
                    className="font-medium text-indigo-600 hover:text-indigo-500 text-base sm:text-lg underline"
                >
                    Quay lại đăng nhập
                </a>
            </div>
        </div>
    )
}