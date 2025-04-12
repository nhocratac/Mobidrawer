'use client'

import CalendarComponent from '@/components/Calender/CalendarComponent'
import PostList from '@/components/Post/PostList'
import { Button } from '@/components/ui/button'
import { useState } from 'react'
import { Calendar, ChevronLeft, ChevronRight } from 'lucide-react'

function PostPage() {
    const [showCalendar, setShowCalendar] = useState(false)
    const [hideDesktopCalendar, setHideDesktopCalendar] = useState(false)
    
    const currentDate = new Date()
    const month = (currentDate.getMonth() + 1).toString()
    const year = currentDate.getFullYear()
    
    return (
        <div className='flex-1 flex flex-col relative'>
            {/* Calendar toggle button for mobile */}
            <div className='md:hidden fixed bottom-4 right-4 z-10'>
                <Button 
                    onClick={() => setShowCalendar(!showCalendar)}
                    className='rounded-full w-12 h-12 bg-primary hover:bg-primary/90'
                >
                    <Calendar className='w-6 h-6' />
                </Button>
            </div>
            
            {/* Show calendar button for desktop when hidden */}
            {hideDesktopCalendar && (
                <div className='hidden md:block fixed right-4 top-1/2 transform -translate-y-1/2 z-10'>
                    <Button
                        onClick={() => setHideDesktopCalendar(false)}
                        className='rounded-full w-10 h-10 bg-primary hover:bg-primary/90'
                    >
                        <ChevronLeft className='w-5 h-5' />
                    </Button>
                </div>
            )}
            
            <div className='flex-1 flex flex-col md:flex-row gap-2 sm:gap-4'>
                <div className={`w-full ${hideDesktopCalendar ? 'md:w-full' : 'md:w-4/5'} flex border border-gray-300 rounded-lg overflow-hidden transition-all duration-300`}>
                    <PostList />
                </div>
                
                {/* Calendar - hidden by default on mobile, toggleable with button */}
                <div className={`
                    ${showCalendar ? 'fixed inset-0 bg-black/50 z-20 flex items-center justify-center md:relative md:inset-auto md:bg-transparent' : 'hidden'} 
                    ${hideDesktopCalendar ? 'md:hidden' : 'md:block md:w-1/5'} md:bg-slate-100 md:rounded-lg md:p-2
                    transition-all duration-300
                `}>
                    <div className={`
                        bg-white rounded-lg p-2 max-w-[320px] w-full
                        ${showCalendar ? 'block' : 'hidden md:block'}
                    `}>
                        <div className="flex justify-between mb-2">
                            <div className="hidden md:block">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setHideDesktopCalendar(true)}
                                    className="p-1"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </Button>
                            </div>
                            <div className="md:hidden flex justify-end">
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    onClick={() => setShowCalendar(false)}
                                >
                                    ✕
                                </Button>
                            </div>
                        </div>
                        <CalendarComponent month={month} year={year} />
                    </div>
                </div>
            </div>
        </div>
    )
}

export default PostPage