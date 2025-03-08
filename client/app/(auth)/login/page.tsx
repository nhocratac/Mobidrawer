"use client"
import { login } from '@/api/authAPI';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const FormSchema = z.object({
  email: z.string().min(2, {
    message: 'Tên đăng nhập phải ít nhất 2 ký tự.',
  }),
  password: z.string().min(6, {
    message: 'Mật khẩu phải có 6 ký tự.',
  }),
  rememberMe: z.boolean().optional(),
});

export default function InputForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    login({
      email: data.email,
      password: data.password,
    }).then((res) => {
      console.log(res);
    }).catch((error) => {
      console.log("errror login", error);
    });
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-6xl font-bold text-left">Đăng nhập</h1>
      </div>
      <hr className="border-gray-300 my-4 mb-14" />
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-2xl">Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Nhập địa chỉ mail của bạn"
                    className="block w-full h-[40px] px-10 py-3 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-2xl"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-2xl">Mật khẩu</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Nhập mật khẩu của bạn"
                    className="block w-full h-[40px] px-10 py-3 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-2xl"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />
          <div className="flex items-center justify-between h-[40px]">
            <div className="flex items-center">
              <input
                id="remember-me"
                type="checkbox"
                className="h-8 w-8 text-indigo-600 border-gray-300 rounded"
                {...form.register('rememberMe')}
              />
              <label htmlFor="remember-me" className="ml-2 block text-gray-900 text-2xl">
                Ghi nhớ tài khoản
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500 text-2xl underline ">
                Quên mật khấu?
              </a>
            </div>
          </div>

          <div>
            <Button type="submit" className="text-2xl w-full h-[48px] py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Đăng nhập
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}