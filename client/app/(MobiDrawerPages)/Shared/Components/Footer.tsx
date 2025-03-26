import React from 'react';

const Footer = () => {
  return (
    <footer className="bg-[#111827] text-white">
      <div className="mx-auto w-full max-w-[1440px] px-4 md:px-6 lg:px-8 py-8 md:py-12">
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-8">
          <div className="pl-2 md:pl-0">
            <h3 className="text-xl font-semibold mb-4">MobiDrawer</h3>
            <p className="text-gray-400 md:text-base text-sm">
              The ultimate prototyping tool for mobile applications.
            </p>
          </div>
          
          <div className="pl-2 md:pl-0">
            <h4 className="text-lg font-medium mb-4">Product</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white md:text-base text-sm">Features</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white md:text-base text-sm">Pricing</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white md:text-base text-sm">Use Cases</a></li>
            </ul>
          </div>
          
          <div className="pl-2 md:pl-0">
            <h4 className="text-lg font-medium mb-4">Resources</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white md:text-base text-sm">Documentation</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white md:text-base text-sm">Blog</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white md:text-base text-sm">Support</a></li>
            </ul>
          </div>
          
          <div className="pl-2 md:pl-0">
            <h4 className="text-lg font-medium mb-4">Company</h4>
            <ul className="space-y-2">
              <li><a href="#" className="text-gray-400 hover:text-white md:text-base text-sm">About</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white md:text-base text-sm">Contact</a></li>
              <li><a href="#" className="text-gray-400 hover:text-white md:text-base text-sm">Privacy Policy</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center md:flex md:justify-between">
          <p className="text-gray-400 md:text-base text-sm pl-2 md:pl-0">© 2024 MobiDrawer. All rights reserved.</p>
          <div className="mt-4 md:mt-0 space-x-4">
            <a href="#" className="text-gray-400 hover:text-white md:text-base text-sm">Terms</a>
            <a href="#" className="text-gray-400 hover:text-white md:text-base text-sm">Privacy</a>
            <a href="#" className="text-gray-400 hover:text-white md:text-base text-sm">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

