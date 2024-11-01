"use client"
import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { Form, FormField, FormItem, FormLabel, FormControl, FormDescription, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Layout from './layout';
import Google from '@/assets/logo/google';
import Microsoft from '@/assets/logo/microsoft';

const FormSchema = z.object({
  username: z.string().min(2, {
    message: 'Username must be at least 2 characters.',
  }),
  password: z.string().min(6, {
    message: 'Password must be at least 6 characters.',
  }),
  rememberMe: z.boolean().optional(),
});

export default function InputForm() {
  const form = useForm<z.infer<typeof FormSchema>>({
    resolver: zodResolver(FormSchema),
    defaultValues: {
      username: '',
      password: '',
      rememberMe: false,  
    },
  });

  function onSubmit(data: z.infer<typeof FormSchema>) {
    console.log(data);
  }

  return (
    <div>
        <div className="mb-6">
          <h1 className="text-[50px] font-bold text-left">Sign in</h1>
        </div>

        {/* Social login buttons */}
        <div className="grid grid-cols-4 gap-4 min-h-[48px] mb-14 mt-14">
        <Button variant="outline" className=" text-[20px] w-full h-full py-3 border border-gray-300 rounded-xl text-center border-[#444749] hover:bg-black hover:text-white">
          SSO
        </Button>
        <Button variant="outline" className="w-full h-full py-3 border border-gray-300 rounded-xl flex items-center justify-center border-[#444749] hover:bg-black hover:text-white">
        <Google></Google>
        </Button>
        <Button variant="outline" className="w-full h-full py-3 border border-gray-300 rounded-xl flex items-center justify-center border-[#444749] hover:bg-black hover:text-white">
          <Microsoft></Microsoft>
        </Button>
        <Button variant="outline" className="text-[21px] w-full h-full py-3 border border-gray-300 rounded-xl text-center border-[#444749] hover:bg-black hover:text-white">
            +
        </Button>
      </div>

      <hr className="border-gray-300 my-4 mb-14" />

      {/* Email input */}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <FormField
            control={form.control}
            name="username"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[16px]">Email</FormLabel>
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

          {/* Password input */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-[16px]">Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    placeholder="Enter your password"
                    className="block w-full h-[40px] px-10 py-3 border border-[#444749] rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-[16px]"
                    {...field}
                  />
                </FormControl>
              </FormItem>
            )}
          />

          {/* Remember me and Forgot password */}
          <div className="flex items-center justify-between h-[40px]">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="rememberMe"
                type="checkbox"
                className="h-8 w-8 text-indigo-600 border-gray-300 rounded"
                {...form.register('rememberMe')}
              />
              <label htmlFor="remember-me" className="ml-2 block text-gray-900 text-[16px]">
                Remember me
              </label>
            </div>
            <div className="text-sm">
              <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500 text-[16px] underline ">
                Forgot password?
              </a>
            </div>
          </div>

          {/* Submit button */}
          <div>
            <Button type="submit" className="text-[16px] w-full h-[48px] py-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
              Sign in
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}