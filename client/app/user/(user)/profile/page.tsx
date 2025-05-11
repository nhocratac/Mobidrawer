"use client";

import userApi from "@/api/userApi";
import { useToast } from "@/hooks/use-toast";
import useTokenStore from "@/lib/Zustand/tokenStore";
import Image from "next/image";
import { useState } from "react";

function ProfileSetting() {
  const { user, setUser } = useTokenStore()
  const [previewUrl, setPreviewUrl] = useState("");
  const { toast } = useToast();
  const handleUpload = async (f: File) => {
    setPreviewUrl(URL.createObjectURL(f));
    if (!user) return;


    const formData = new FormData();
    formData.append("file", f);
    formData.append("userId", user.id);
    console.log(formData)

    const res = await fetch("/api/upload-avatar", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      toast({
        title: "Upload lỗi",
        description: "Không thể upload avatar",
        variant: "destructive",
      });
      return;
    }
    const { url } = await res.json();
    setPreviewUrl(url);
    setUser(url)

    // Gửi avatar URL tới backend (Spring Boot chẳng hạn)
    try {
      await userApi.uploadAvatar(url)
      toast({
        title: "Thành công",
        description: "Avatar đã được cập nhật!",
      });
    } catch (error) {
      console.log('error uoload')
    }
  };
  return (
    <div className="flex overflow-hidden flex-col items-end py-8 pr-10 pl-20 bg-stone-50 max-md:px-5">
      <div className="flex flex-wrap gap-5 justify-between w-full max-w-[1282px] max-md:max-w-full">
        <div className="flex flex-col">
          <div className="text-2xl font-medium text-slate-700">
            {`${user?.firstName} ${user?.lastName}`}
          </div>
          <div className="self-start mt-3 text-base text-stone-400">
            {(new Date().toDateString())}
          </div>
        </div>
        <div className="flex relative flex-wrap gap-5 my-auto text-base whitespace-nowrap text-stone-400 max-md:max-w-full">
          <Image
            src={user?.avatarUrl || 'https://cdn.builder.io/api/v1/image/assets/TEMP/3f8642bab6c52b757147bfe733d6f992960e1d83?placeholderIfAbsent=true'}
            alt="User profile"
            width={52}
            height={52}
            className="object-contain shrink-0 rounded-xl aspect-square w-[52px]"
          />
          <label htmlFor="avatar-upload" className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center cursor-pointer text-sm">
            +
          </label>
          <input
            id="avatar-upload"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (f) {
                await handleUpload(f);
              }
            }}
          />
        </div>
      </div>
      <div className="pb-16 mt-8 w-full text-black bg-white rounded-xl max-w-[1282px] max-md:max-w-full">
        <Image
          src="https://cdn.builder.io/api/v1/image/assets/TEMP/9432041465fe4023a9d7445b5f98b9e426e180ff?placeholderIfAbsent=true"
          alt="Profile banner"
          width={1282}
          height={100}
          className="object-contain w-full rounded-none aspect-[12.82] max-md:max-w-full"
        />
        <div className="flex flex-col px-8 mt-8 w-full max-md:px-5 max-md:max-w-full">
          <div className="flex flex-wrap gap-5 justify-between max-md:max-w-full">
            <div className="flex flex-col">
              <div className="flex gap-5 justify-between">
                <Image
                  src={ user?.avatarUrl || "https://cdn.builder.io/api/v1/image/assets/TEMP/f9b9a92e6b2a716a89b67fe7cc59827aca530a94?placeholderIfAbsent=true"}
                  alt="Profile picture"
                  width={100}
                  height={100}
                  className="object-contain shrink-0 max-w-full rounded-full aspect-square w-[100px]"
                />
                <div className="flex flex-col my-auto">
                  <div className="self-start text-xl font-medium">
                    {`${user?.firstName} ${user?.lastName}`}
                  </div>
                  <div className="mt-1.5 text-base">{user?.email}</div>
                </div>
              </div>
              <div className="self-start mt-8 text-base">Full Name</div>
            </div>
            <div className="self-end mt-32 text-base max-md:mt-10">
              Nick Name
            </div>
            <button className="self-start px-8 py-2.5 mt-7 text-base text-white whitespace-nowrap bg-blue-500 rounded-lg max-md:px-5">
              Edit
            </button>
          </div>
          <div className="flex flex-wrap gap-8 mt-3 text-base max-md:max-w-full">
            <input
              type="text"
              placeholder="Your First Name"
              className="grow shrink-0 px-5 py-3.5 rounded-lg basis-0 bg-stone-50 w-fit max-md:max-w-full"
            />
            <input
              type="text"
              placeholder="Your First Name"
              className="grow shrink-0 px-5 py-3.5 rounded-lg basis-0 bg-stone-50 w-fit max-md:max-w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileSetting;
