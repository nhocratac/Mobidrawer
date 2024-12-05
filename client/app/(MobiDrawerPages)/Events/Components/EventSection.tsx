import React, { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin } from 'lucide-react';
import event from '@/assets/BlogImages/index'

export default function EventSection() {
    const events = [
        {
            id: 1,
            title: "Hội nghị thường niên 2024",
            date: "29. November 2024",
            time: "09:00 AM - 16:30 PM",
            location: "1600 Pennsylvania Avenue NW, Washington, D.C. 20500",
            image: event[0].image,
        },
        {
            id: 2,
            title: "Hội thảo về công nghệ 2024",
            date: "30. November 2024",
            time: "10:00 AM - 17:30 PM",
            location: "1600 Pennsylvania Avenue NW, Washington, D.C. 20500",
            image: event[1].image,
        },
        {
            id: 3,
            title: "Hội thảo về quản lý 2024",
            date: "1. December 2024",
            time: "11:00 AM - 18:30 PM",
            location: "1600 Pennsylvania Avenue NW, Washington, D.C. 20500",
            image: event[2].image,
        },
        {
            id: 4,
            title: "Hội thảo về marketing 2024",
            date: "2. December 2024",
            time: "12:00 PM - 19:30 PM",
            location: "1600 Pennsylvania Avenue NW, Washington, D.C. 20500",
            image: event[3].image,
        },
        {
            id: 5,
            title: "Hội thảo về kinh doanh 2024",
            date: "3. December 2024",
            time: "13:00 PM - 20:30 PM",
            location: "1600 Pennsylvania Avenue NW, Washington, D.C. 20500",
            image: event[4].image,
        },
        {
            id: 6,
            title: "Hội thảo về quản trị 2024",
            date: "3. December 2024",
            time: "13:00 PM - 20:30 PM",
            location: "1600 Pennsylvania Avenue NW, Washington, D.C. 20500",
            image: event[5].image,
        },

        {
            id: 7,
            title: "Sự kiện thiết kế 2024",
            date: "29. November 2024",
            time: "09:00 AM - 16:30 PM",
            location: "1600 Pennsylvania Avenue NW, Washington, D.C. 20500",
            image: event[0].image,
        },
        {
            id: 8,
            title: "Giao luu kinh doanh 2024",
            date: "30. November 2024",
            time: "10:00 AM - 17:30 PM",
            location: "1600 Pennsylvania Avenue NW, Washington, D.C. 20500",
            image: event[1].image,
        },
        {
            id: 9,
            title: "Giao luu công nghệ 2024",
            date: "1. December 2024",
            time: "11:00 AM - 18:30 PM",
            location: "1600 Pennsylvania Avenue NW, Washington, D.C. 20500",
            image: event[2].image,
        },
        {
            id: 10,
            title: "Giới thiệu sản phẩm 2024",
            date: "2. December 2024",
            time: "12:00 PM - 19:30 PM",
            location: "1600 Pennsylvania Avenue NW, Washington, D.C. 20500",
            image: event[3].image,
        },
        {
            id: 11,
            title: "Ra mắt sản phẩm mới 2024",
            date: "3. December 2024",
            time: "13:00 PM - 20:30 PM",
            location: "1600 Pennsylvania Avenue NW, Washington, D.C. 20500",
            image: event[4].image,
        },
        {
            id: 12,
            title: "Hội thảo về quản trị 2024",
            date: "3. December 2024",
            time: "13:00 PM - 20:30 PM",
            location: "1600 Pennsylvania Avenue NW, Washington, D.C. 20500",
            image: event[5].image,
        },

        
    ];

    const [showAll, setShowAll] = useState(false);

    const handleShowMore = () => {
        setShowAll(true);
    };

    const eventsToShow = showAll ? events : events.slice(0, 6);

    return (
        <div className="container mx-auto py-16">
            <div className="grid md:grid-cols-3 gap-12">
                {eventsToShow.map((event) => (
                    <div key={event.id} className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <Image
                            src={event.image}
                            alt={event.title}
                            width={600}
                            height={300}
                            className="rounded-t-lg"
                        />
                        <div className="p-6 space-y-4">
                            <h3 className="text-xl font-bold">{event.title}</h3>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <Calendar className="w-5 h-5 text-primary" />
                                    <span>{event.date}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Clock className="w-5 h-5 text-primary" />
                                    <span>{event.time}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <MapPin className="w-5 h-5 text-primary" />
                                    <div>
                                        <p>{event.location}</p>
                                    </div>
                                </div>
                            </div>
                            <Button className="text-xl p-8 mt-4">Đăng ký tham gia</Button>
                        </div>
                    </div>
                ))}
            </div>
            {!showAll && (
                <div className="text-center mt-8">
                    <Button className="bg-black text-white hover:bg-black/80 text-md mt-6" onClick={handleShowMore}>
                        Xem thêm
                    </Button>
                </div>
            )}
        </div>
    );
}