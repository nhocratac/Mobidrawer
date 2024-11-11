import React from 'react';
import DayCell from '@/components/Calender/DayCell';

const CalendarDays: React.FC = () => {
    const days: { day: number; type: 'regular' | 'pink' | 'blue-light' | 'blue' | 'green' | 'orange' }[] = [
        { day: 1, type: 'regular' },
        { day: 2, type: 'regular' },
        { day: 3, type: 'regular' },
        { day: 4, type: 'regular' },
        { day: 5, type: 'regular' },
        { day: 6, type: 'regular' },
        { day: 7, type: 'regular' },
        { day: 8, type: 'pink' },
        { day: 9, type: 'blue-light' },
        { day: 10, type: 'regular' },
        { day: 11, type: 'regular' },
        { day: 12, type: 'blue' },
        { day: 13, type: 'blue-light' },
        { day: 14, type: 'green' },
        { day: 15, type: 'regular' },
        { day: 16, type: 'regular' },
        { day: 17, type: 'regular' },
        { day: 18, type: 'regular' },
        { day: 19, type: 'regular' },
        { day: 20, type: 'orange' },
        { day: 21, type: 'regular' },
        { day: 22, type: 'regular' },
        { day: 23, type: 'regular' },
        { day: 24, type: 'regular' },
        { day: 25, type: 'regular' },
        { day: 26, type: 'regular' },
        { day: 27, type: 'regular' },
        { day: 28, type: 'regular' },
        { day: 29, type: 'regular' },
        { day: 30, type: 'regular' },
        { day: 31, type: 'regular' },
    ];

    return (
        <>
            {days.slice(0, 31).map((day) => (
                <DayCell key={day.day} day={day.day} type={day.type} />
            ))}
        </>
    );
};

export default CalendarDays;