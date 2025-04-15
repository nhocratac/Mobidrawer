import path from '@/utils/path';
import Link from 'next/link';
import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-[#111827] text-white">
      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="pl-2 md:pl-0">
            <h3 className="text-3xl font-semibold mb-4">MobiDrawer</h3>
            <p className="text-gray-400 md:text-base text-xl">
              Công cụ vẽ online realtime tối ưu cho trình duyệt web.
            </p>
            <p className=" text-gray-400 md:text-xl text-base">
              <strong className='bold text-white md:text-xl text-base'>Địa chỉ: </strong>
              Hàn Thuyên, Khu Phố 6, Thủ Đức, Hồ Chí Minh
            </p>
            <p className=" text-gray-400 md:text-xl text-base">
              <strong className='bold text-white md:text-xl text-base'> Email: </strong>
              22521339@gm.uit.edu.vn
            </p>
          </div>

          <div className="pl-2 md:pl-0">
            <h4 className="text-lg font-medium mb-4">Sản phẩm</h4>
            <ul className="space-y-2">
              <li><Link href={path.feature} className="text-gray-400 hover:text-white md:text-base text-sm">Tính năng</Link></li>
              <li><Link href={path.pricing} className="text-gray-400 hover:text-white md:text-base text-sm">Giá cả</Link></li>
              <li><Link href={path.useCase} className="text-gray-400 hover:text-white md:text-base text-sm">Sử dụng</Link></li>
            </ul>
          </div>

          <div className="pl-2 md:pl-0">
            <h4 className="text-lg font-medium mb-4">Tài nguyên</h4>
            <ul className="space-y-2">
              <li><Link href={path.heplcenter} className="text-gray-400 hover:text-white md:text-base text-sm">Tài liệu</Link></li>
              <li><Link href={path.blog} className="text-gray-400 hover:text-white md:text-base text-sm">Blog</Link></li>
              <li><Link href={path.envent} className="text-gray-400 hover:text-white md:text-base text-sm">Ủng hộ</Link></li>
            </ul>
          </div>

          <div className="pl-2 md:pl-0">
            <h4 className="text-lg font-medium mb-4">Công ty</h4>
            <ul className="space-y-2">
              <li><Link href={path.team} className="text-gray-400 hover:text-white md:text-base text-sm">Về chúng tôi</Link></li>
              <li><Link href={path.contact} className="text-gray-400 hover:text-white md:text-base text-sm">Liên hệ</Link></li>
              <li><Link href={path.security} className="text-gray-400 hover:text-white md:text-base text-sm">Chính sách bảo mật</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center md:flex md:justify-between">
          <p className="text-gray-400 md:text-base text-sm pl-2 md:pl-0">© 2024 MobiDrawer. All rights reserved.</p>
          <div className="mt-4 md:mt-0 space-x-4">
            <Link href={path.enterprise} className="text-gray-400 hover:text-white md:text-base text-sm">Điều khoản</Link>
            <Link href={path.security} className="text-gray-400 hover:text-white md:text-base text-sm">Sự riêng tư</Link>
            <Link href={path.integration} className="text-gray-400 hover:text-white md:text-base text-sm">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
