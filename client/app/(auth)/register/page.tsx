"use client";
import Google from '@/assets/logo/google';
import Microsoft from '@/assets/logo/microsoft';
import Slack from '@/assets/logo/slack';
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

const FormSchemaEmail = z.object({
  email: z.string().email({
    message: "Địa chỉ email không hợp lệ.",
  }),
});

const FormSchemaName = z.object({
  name: z.string().min(2, {
    message: "Tên phải có ít nhất 2 ký tự.",
  }),
});

const FormSchemaPassword = z.object({
  password: z.string().min(6, {
    message: "Mật khẩu phải có ít nhất 6 ký tự.",
  }),
});

export default function RegisterForm() {
  const [isMounted, setIsMounted] = useState(false);
  const [step, setStep] = useState(1); 
  const router = useRouter();

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const formEmail = useForm<z.infer<typeof FormSchemaEmail>>({
    resolver: zodResolver(FormSchemaEmail),
    defaultValues: { email: "" },
  });

  const formName = useForm<z.infer<typeof FormSchemaName>>({
    resolver: zodResolver(FormSchemaName),
    defaultValues: { name: "" },
  });

  const formPassword = useForm<z.infer<typeof FormSchemaPassword>>({
    resolver: zodResolver(FormSchemaPassword),
    defaultValues: { password: "" },
  });

  function onSubmitEmail(data: z.infer<typeof FormSchemaEmail>) {
    console.log("Email submitted:", data);
    setStep(2); 
  }

  function onSubmitName(data: z.infer<typeof FormSchemaName>) {
    console.log("Name submitted:", data);
    setStep(3); 
  }

  function onSubmitPassword(data: z.infer<typeof FormSchemaPassword>) {
    console.log("Password submitted:", data);
    router.push("/auth/success"); 
  }

  if (!isMounted) {
    return null;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-6xl font-bold text-left my-4">
          {step === 1 ? "Đăng ký" : step === 2 ? "Điền tên của bạn" : "Điền mật khẩu"}
        </h1>
        <h2 className="text-2xl">
          {step === 1 ? "Chúng tôi khuyến nghị sử dụng email công việc để tách biệt công việc và cuộc sống cá nhân." : step === 2 ? "Tên của bạn là gì ?" : "Hãy điền mật khẩu với ít nhất 8 ký tự:"}
        </h2>
      </div>

      {step === 1 && (
        <>
          <Form {...formEmail}>
            <form onSubmit={formEmail.handleSubmit(onSubmitEmail)} className="space-y-6">
              <FormField
                control={formEmail.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-2xl">Email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Điền địa chỉ mail của bạn"
                        className="block w-full h-[40px] px-10 py-3 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-2xl"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" className="text-2xl w-full h-[48px] py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
                Tiếp tục với email
              </Button>
            </form>
          </Form>
          <hr className="border-gray-300 my-4 mb-14 mt-14" />
          <div className="flex flex-col gap-y-4 justify-center">
            <Button
              className="text-2xl w-full h-[48px] py-3 bg-white text-black rounded-xl hover:bg-black hover:text-white focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              style={{ border: '1px solid #444749' }}
            >
              <Google></Google>
              <p className="ml-[5px]">Đăng nhập với Google</p>
            </Button>
            <Button
              className="text-2xl w-full h-[48px] py-3 bg-white text-black rounded-xl hover:bg-black hover:text-white focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              style={{ border: '1px solid #444749' }}
            >
              <Microsoft></Microsoft>
              <p className="ml-[5px]">Đăng nhập với Microsoft</p>
            </Button>
            <Button
              className="text-2xl w-full h-[48px] py-3 bg-white text-black rounded-xl hover:bg-black hover:text-white focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              style={{ border: '1px solid #444749' }}
            >
              <Slack></Slack>
              <p className="ml-2">Đăng nhập với Slack</p>
            </Button>
          </div>
          <footer className="mt-14">
            <p className="text-lg">
              Khi đăng ký, bạn đồng ý với {' '}
              <Link className="text-blue-500" href="#">
                Điều khoản & Điều kiện
              </Link>{' '}
              cùng {' '}
              <Link className="text-blue-500" href="#">
                Chính sách Bảo mật
              </Link>
              {' '}của MobiDrawer.
            </p>
          </footer>
        </>
      )}

      {step === 2 && (
        <Form {...formName}>
          <form onSubmit={formName.handleSubmit(onSubmitName)} className="space-y-6">
            <FormField
              control={formName.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-2xl">Tên</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Tên của bạn"
                      className="block w-full h-[40px] px-10 py-3 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-2xl"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" className="text-2xl w-full h-[48px] py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
              Tiếp tục
            </Button>
          </form>
        </Form>
      )}

      {step === 3 && (
        <Form {...formPassword}>
          <form onSubmit={formPassword.handleSubmit(onSubmitPassword)} className="space-y-6">
            <FormField
              control={formPassword.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-2xl">Mật khẩu</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Mật khẩu"
                      className="block w-full h-[40px] px-10 py-3 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-2xl"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" className="text-2xl w-full h-[48px] py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
              Tiếp tục
            </Button>
          </form>
        </Form>
      )}


    </div>

  );
}
