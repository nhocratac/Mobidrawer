import React from 'react';
import WeekDays from '@/components/Calender/WeekDays';
import CalendarDays from '@/components/Calender/CalendarDays';

interface CalendarComponentProps {
  month: string;
  year: number;
}

const CalendarComponent: React.FC<CalendarComponentProps> = ({ month, year }) => {
  return (
    <section className="flex flex-col bg-white  p-8">
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