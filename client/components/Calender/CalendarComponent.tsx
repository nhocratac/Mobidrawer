import React, { useRef, useEffect } from 'react';
import WeekDays from '@/components/Calender/WeekDays';
import CalendarDays from '@/components/Calender/CalendarDays';

interface CalendarComponentProps {
  month: string;
  year: number;
  onOutsideClick?: () => void; // Callback for when the background is clicked
}

const CalendarComponent: React.FC<CalendarComponentProps> = ({ month, year, onOutsideClick }) => {
  const calendarRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node) && onOutsideClick) {
        onOutsideClick();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onOutsideClick]);

  return (
    <section ref={calendarRef} className="flex flex-col bg-white  p-8">
      <div className="flex gap-5 justify-between self-end w-full font-bold max-w-[278px]">
        <p className="text-2xl text-zinc-800">Lịch</p>
        <div className="flex gap-4 self-start text-lg text-zinc-500">
          <time dateTime={`${year}-${month}`}>{`Tháng ${month} ${year}`}</time>
        </div>
      </div>
      <div className="bg-red mt-4 text-lg font-medium ">
        <div className=" py-1 grid grid-cols-7 gap-2 w-full  max-w-full">
          <WeekDays />
          <CalendarDays />
        </div>
      </div>
    </section>
  );
};

export default CalendarComponent;