import { motion } from 'framer-motion';
import Image from 'next/image';
import landingPageLogo from '@/assets/LandingPageLogo';

export default function LogoSlider() {
    return (
        <div className="flex flex-col items-center">
            <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false }}
                transition={{ duration: 0.3 }}
                className="mt-20 text-4xl sm:text-5xl text-center text mb-8 mx-auto px-4 leading-tight"
                style={{ lineHeight: '1.5', maxWidth: '800px', whiteSpace: 'pre-wrap' }}
            >
                Hơn 80 triệu người dùng và 250.000 công ty cùng hợp tác trong Workspace.
            </motion.h2>

            <div className='h-[100px] relative overflow-hidden w-full'>
                <div className='absolute inset-0 z-20 before:absolute before:left-0 before:top-0 before:w-1/4 before:h-full before:bg-gradient-to-r before:from-white before:to-transparent'></div>
                <div className='absolute inset-0 z-20 after:absolute after:right-0 after:top-0 after:w-1/4 after:h-full after:bg-gradient-to-l after:from-white after:to-transparent'></div>

                <motion.div
                    className="flex no-scrollbar"
                    animate={{ x: ["0%", "-50%"] }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                >
                    {landingPageLogo.map((image, index) => (
                        <div key={index} className="h-full flex-shrink-0">
                            <div className='flex items-center justify-center h-[100px] w-[200px]'>
                                <Image
                                    src={image.src}
                                    alt={image.alt}
                                    width={200}
                                    height={100}
                                    className="h-full max-w-full opacity-75 object-contain hover:opacity-100 transition-opacity duration-300"
                                />
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>

            <div className='h-[150px] relative overflow-hidden w-full'>
                <div className='absolute inset-0 z-20 before:absolute before:left-0 before:top-0 before:w-1/4 before:h-full before:bg-gradient-to-r before:from-white before:to-transparent'></div>
                <div className='absolute inset-0 z-20 after:absolute after:right-0 after:top-0 after:w-1/4 after:h-full after:bg-gradient-to-l after:from-white after:to-transparent'></div>

                <motion.div
                    className="flex no-scrollbar"
                    animate={{ x: ["-50%", "0%"] }}
                    transition={{
                        duration: 15,
                        repeat: Infinity,
                        ease: "linear",
                    }}
                >
                    {landingPageLogo.map((image, index) => (
                        <div key={`row2-duplicate-${index}`} className="h-full flex-shrink-0">
                            <div className='flex items-center justify-center h-[100px] w-[200px]'>
                                <Image
                                    src={image.src}
                                    alt={image.alt}
                                    width={200}
                                    height={100}
                                    className="h-full max-w-full opacity-75 object-contain hover:opacity-100 transition-opacity duration-300"
                                />
                            </div>
                        </div>
                    ))}
                </motion.div>
            </div>
        </div>
    );
}