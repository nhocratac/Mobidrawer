"use client";

import { register, verifyRegister } from "@/api/authAPI";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
// import { useRouter } from "next/router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

// Schema for Step 1 (Registration)
const FormSchema = z
  .object({
    email: z.string().email({
      message: "Địa chỉ email không hợp lệ.",
    }),
    firstName: z.string().min(2, {
      message: "Tên phải có ít nhất 2 ký tự.",
    }),
    lastName: z.string().min(2, {
      message: "Họ phải có ít nhất 2 ký tự.",
    }),
    phone: z.string().min(10, {
      message: "Số điện thoại phải có ít nhất 10 ký tự.",
    }),
    password: z.string().min(6, {
      message: "Mật khẩu phải có ít nhất 6 ký tự.",
    }),
    rePassword: z.string().min(6, {
      message: "Mật khẩu phải có ít nhất 6 ký tự.",
    }),
  })
  .refine((data) => data.password === data.rePassword, {
    message: "Mật khẩu không khớp.",
    path: ["rePassword"], // Attach the error to the rePassword field
  });

// Schema for Step 2 (Confirmation Code)
const FormCode = z.object({
  code: z
    .string()
    .regex(/^\d{6}$/, "Code bao gồm 6 ký tự số.")
    .min(6, {
      message: "Mã xác nhận phải có ít nhất 6 ký tự.",
    }),
});

export default function RegisterForm() {
  const { toast } = useToast()
  const router = useRouter;
  const [step, setStep] = useState(1);
  const [formValues, setFormValues] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    password: "",
    rePassword: "",
  });

  // Form for Step 1 (Registration)
  const formRegister = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      email: "",
      firstName: "",
      lastName: "",
      phone: "",
      password: "",
      rePassword: "",
    },
  });

  // Form for Step 2 (Confirmation Code)
  const formCode = useForm<z.infer<typeof FormCode>>({
    resolver: zodResolver(FormCode),
    defaultValues: {
      code: "",
    },
  });

  // Handle submission for Step 1
  const onSubmitForm = (data: z.infer<typeof FormSchema>) => {
    setFormValues(data); // Save form values for later use
    register({
      email: data.email,
      password: data.password,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
    }).then(
      () => {
        setStep(2);
      }
    ).catch(err => {
      console.log("error register: ", err);
    }
    )
  };

  // Handle submission for Step 2
  const onSubmitCode = (data: z.infer<typeof FormCode>) => {
    console.log(data);
    verifyRegister({ code: data.code, email: formValues.email })
      .then(res => {
        console.log(res);
        toast({
          title: "Thành công",
          description: "Bạn đã thêm mẫu thành công",
        })
       // router.push('/login')
      })
      .catch(err => {
        console.log(err);
      })
  };

  return (
    <div>
      <div className="mb-4 sm:mb-6">
        <h2 className="text-3xl sm:text-4xl lg:text-6xl font-bold text-left my-2 sm:my-4">Đăng ký</h2>
        <p className="text-lg sm:text-xl lg:text-2xl">
          {step === 1
            ? "Nhập thông tin cá nhân của bạn để đăng ký tài khoản"
            : "Nhập mã xác nhận đã được gửi đến email của bạn"}
        </p>
      </div>

      {step === 1 && (
        // Step 1: Registration Form
        <Form {...formRegister}>
          <form onSubmit={formRegister.handleSubmit(onSubmitForm)} className="space-y-4 sm:space-y-6">
            <FormField
              control={formRegister.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base sm:text-lg lg:text-2xl">Email</FormLabel>
                  <FormControl>
                    <Input
                      type="email"
                      placeholder="Điền địa chỉ mail của bạn"
                      className="block w-full h-[36px] sm:h-[40px] px-4 sm:px-10 py-2 sm:py-3 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-lg lg:text-2xl"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={formRegister.control}
              name="firstName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base sm:text-lg lg:text-2xl">Tên</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Tên"
                      className="block w-full h-[36px] sm:h-[40px] px-4 sm:px-10 py-2 sm:py-3 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-lg lg:text-2xl"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={formRegister.control}
              name="lastName"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base sm:text-lg lg:text-2xl">Họ</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Họ"
                      className="block w-full h-[36px] sm:h-[40px] px-4 sm:px-10 py-2 sm:py-3 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-lg lg:text-2xl"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={formRegister.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base sm:text-lg lg:text-2xl">Số điện thoại</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Số điện thoại"
                      className="block w-full h-[36px] sm:h-[40px] px-4 sm:px-10 py-2 sm:py-3 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-lg lg:text-2xl"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={formRegister.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base sm:text-lg lg:text-2xl">Mật khẩu</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Mật khẩu"
                      className="block w-full h-[36px] sm:h-[40px] px-4 sm:px-10 py-2 sm:py-3 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-lg lg:text-2xl"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={formRegister.control}
              name="rePassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-base sm:text-lg lg:text-2xl">Nhập lại mật khẩu</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Nhập lại mật khẩu"
                      className="block w-full h-[36px] sm:h-[40px] px-4 sm:px-10 py-2 sm:py-3 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-lg lg:text-2xl"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button
              type="submit"
              className="text-base sm:text-lg lg:text-2xl w-full h-[40px] sm:h-[48px] py-2 sm:py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
            >
              Đăng ký
            </Button>
          </form>
        </Form>
      )} {(
        step === 2 && (
          // Step 2: Confirmation Code Form
          <Form {...formCode}>
            <form onSubmit={formCode.handleSubmit(onSubmitCode)} className="space-y-4 sm:space-y-6">
              <FormField
                control={formCode.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-base sm:text-lg lg:text-2xl">Mã xác nhận</FormLabel>
                    <FormControl>
                      <Input
                        type="text"
                        placeholder="Mã xác nhận"
                        className="block w-full h-[36px] sm:h-[40px] px-4 sm:px-10 py-2 sm:py-3 border border-black rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base sm:text-lg lg:text-2xl"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button
                type="submit"
                className="text-base sm:text-lg lg:text-2xl w-full h-[40px] sm:h-[48px] py-2 sm:py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700"
              >
                Xác nhận
              </Button>
              <Button
                type="button"
                className="text-base sm:text-lg lg:text-2xl w-full h-[40px] sm:h-[48px] py-2 sm:py-3 bg-red-600 text-white rounded-xl hover:bg-red-700"
                onClick={() => setStep(1)}
              >
                Quay lại
              </Button>
            </form>
          </Form>
        ))}
      <hr className="border-gray-300 my-4 sm:my-8 lg:my-14" />
      <footer className="mt-4 sm:mt-8 lg:mt-14">
        <p className="text-sm sm:text-base lg:text-lg">
          Khi đăng ký, bạn đồng ý với{" "}
          <Link className="text-blue-500" href="#">
            Điều khoản & Điều kiện
          </Link>{" "}
          cùng{" "}
          <Link className="text-blue-500" href="#">
            Chính sách Bảo mật
          </Link>{" "}
          của MobiDrawer.
        </p>
      </footer>
    </div>
  );
}