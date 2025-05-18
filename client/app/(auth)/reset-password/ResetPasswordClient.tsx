"use client"

import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { verifyForgetPassword } from '@/api/authAPI';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { useRouter } from 'next/navigation';

const FormSchema = z.object({
    code: z.string().length(6, {
        message: "Mã xác nhận phải có 6 ký tự."
    }),
    newPassword: z.string().min(6, {
        message: 'Mật khẩu phải có ít nhất 6 ký tự.',
    }),
    confirmPassword: z.string().min(6, {
        message: 'Xác nhận mật khẩu phải có ít nhất 6 ký tự.',
    }),
    }).refine(data => data.newPassword === data.confirmPassword, {
        message: "Mật khẩu không khớp",
        path: ["confirmPassword"],
});

export default function ResetPasswordPage() {
    const { toast } = useToast();
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams.get('email');

    const form = useForm<z.infer<typeof FormSchema>>({
        resolver: zodResolver(FormSchema),
        defaultValues: {
            code: "",
            newPassword: "",
            confirmPassword: ""
        }
    })

    async function onSubmit(data: z.infer<typeof FormSchema>) {
        if(!email) {
            toast({
                title: "Lỗi",
                description: "Thiếu thông tin email",
                variant: "destructive",
            });
            return;
        }
        
        try {
            await verifyForgetPassword({
                email,
                code: data.code,
                password: data.newPassword
            });

            router.replace(`/login`);
        } catch (error) {
            toast({
                title: "Lỗi",
                description: "Mã xác nhận không hợp lệ hoặc đã hết hạn",
                variant: "destructive",
            })
        }
    }

  if (!email) {
    return (
      <div className="w-full max-w-md mx-auto p-4">
        <div className="mb-4 pl-2">
          <h1 className="text-2xl sm:text-3xl font-bold text-left">Lỗi</h1>
        </div>
        <hr className="border-gray-300 mb-4" />
        <p className="text-gray-600 mb-6 text-base sm:text-lg">
          Thiếu thông tin email. Vui lòng yêu cầu lại liên kết đặt lại mật khẩu.
        </p>
        <div className="mt-4 text-center">
          <a 
            href="/forgot-password" 
            className="font-medium text-indigo-600 hover:text-indigo-500 text-base sm:text-lg underline"
          >
            Quay lại quên mật khẩu
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto p-4">
      <div className="mb-4 pl-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-left">Đặt lại mật khẩu</h1>
      </div>
      <hr className="border-gray-300 mb-4" />
      <p className="text-gray-600 mb-6 text-base sm:text-lg">
        Chúng tôi đã gửi mã xác nhận 6 số đến email <span className="font-semibold">{email}</span>. 
        Vui lòng kiểm tra, nhập mã và mật khẩu bên dưới.
      </p>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="code"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg sm:text-xl">Mã xác nhận</FormLabel>
                <FormControl>
                  <Input
                    type="text"
                    placeholder="Nhập mã 6 số"
                    className="block w-full h-[40px] px-4 py-2 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-xl"
                    maxLength={6}
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="newPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg sm:text-xl">Mật khẩu mới</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Nhập mật khẩu mới"
                    className="block w-full h-[40px] px-4 py-2 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-xl"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-lg sm:text-xl">Xác nhận mật khẩu</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Nhập lại mật khẩu mới"
                    className="block w-full h-[40px] px-4 py-2 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-xl"
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
            Đặt lại mật khẩu
          </Button>
        </form>
      </Form>
      
      <div className="mt-4 text-center">
        <a 
          href="/forgot-password" 
          className="font-medium text-indigo-600 hover:text-indigo-500 text-base sm:text-lg underline"
        >
          Gửi lại mã
        </a>
      </div>
    </div>
  );
}