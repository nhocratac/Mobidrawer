"use client";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import Link from "next/link";
import { useRouter } from "next/navigation"; // Ensure you're using next/navigation
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Google from '@/assets/logo/google';
import Microsoft from '@/assets/logo/microsoft';
import Slack from '@/assets/logo/slack';

// Schema validation for email, name, and password
const FormSchemaEmail = z.object({
  email: z.string().email({
    message: "Invalid email address.",
  }),
});

const FormSchemaName = z.object({
  name: z.string().min(2, {
    message: "Name must have at least 2 characters.",
  }),
});

const FormSchemaPassword = z.object({
  password: z.string().min(6, {
    message: "Password must have at least 6 characters.",
  }),
});

export default function RegisterForm() {
  const [isMounted, setIsMounted] = useState(false);
  const [step, setStep] = useState(1); // Step to track which form is currently being shown
  const router = useRouter();

  // Ensure component is mounted on the client
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Form for each step
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

  // Handle email submit
  function onSubmitEmail(data: z.infer<typeof FormSchemaEmail>) {
    console.log("Email submitted:", data);
    setStep(2); // Move to the name step
  }

  // Handle name submit
  function onSubmitName(data: z.infer<typeof FormSchemaName>) {
    console.log("Name submitted:", data);
    setStep(3); // Move to the password step
  }

  // Handle password submit
  function onSubmitPassword(data: z.infer<typeof FormSchemaPassword>) {
    console.log("Password submitted:", data);
    router.push("/auth/success"); // Replace with your success page
  }

  // If not mounted yet, return null to avoid SSR errors
  if (!isMounted) {
    return null;
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-[50px] font-bold text-left">
          {step === 1 ? "Register for free" : step === 2 ? "Set your name" : "Pick a password"}
        </h1>
        <h2 className="text-[16px]">
          {step === 1 ? "We recommend using your work email — it keeps work and life separate." : step === 2 ? "To start, What your name?" : "Now, set your password with at least 8 characters:"}
        </h2>
      </div>

      {/* Conditional rendering of forms based on the step */}
      {step === 1 && (
        <>
          <Form {...formEmail}>
            <form onSubmit={formEmail.handleSubmit(onSubmitEmail)} className="space-y-6">
              <FormField
                control={formEmail.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-[16px]">Work email</FormLabel>
                    <FormControl>
                      <Input
                        type="email"
                        placeholder="Enter your email address"
                        className="block w-full h-[40px] px-10 py-3 border border-[#444749] rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-[16px]"
                        {...field}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" className="text-[16px] w-full h-[48px] py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
                Continue with email
              </Button>
            </form>
          </Form>
          <hr className="border-gray-300 my-4 mb-14 mt-14" />
          <div className="flex flex-col gap-y-4 justify-center">
            <Button
              className="text-[16px] w-full h-[48px] py-3 bg-white text-black rounded-xl hover:bg-black hover:text-white focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              style={{ border: '1px solid #444749' }}
            >
              <Google></Google>
              <p className="ml-[5px]">Sign up with Google</p>
            </Button>
            <Button
              className="text-[16px] w-full h-[48px] py-3 bg-white text-black rounded-xl hover:bg-black hover:text-white focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              style={{ border: '1px solid #444749' }}
            >
              <Microsoft></Microsoft>
              <p className="ml-[5px]">Sign up with Microsoft</p>
            </Button>
            <Button
              className="text-[16px] w-full h-[48px] py-3 bg-white text-black rounded-xl hover:bg-black hover:text-white focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              style={{ border: '1px solid #444749' }}
            >
              <Slack></Slack>
              <p className="ml-[5px]">Sign up with Slack</p>
            </Button>
          </div>
          <footer className="mt-14">
            <p className="text-[12px]">
              By signing up, you agree with Miro's{' '}
              <Link className="text-blue-500" href="#">
                Terms & Conditions
              </Link>{' '}
              and{' '}
              <Link className="text-blue-500" href="#">
                Privacy Policy
              </Link>
              .
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
                  <FormLabel className="text-[16px]">Name</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Name"
                      className="block w-full h-[40px] px-10 py-3 border border-[#444749] rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-[16px]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" className="text-[16px] w-full h-[48px] py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
              Continue
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
                  <FormLabel className="text-[16px]">Password</FormLabel>
                  <FormControl>
                    <Input
                      type="password"
                      placeholder="Password"
                      className="block w-full h-[40px] px-10 py-3 border border-[#444749] rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-[16px]"
                      {...field}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" className="text-[16px] w-full h-[48px] py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
              Continue
            </Button>
          </form>
        </Form>
      )}


    </div>

  );
}
