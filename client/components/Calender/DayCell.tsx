import React from 'react';

interface DayCellProps {
  day: number;
  type: 'regular' | 'pink' | 'blue-light' | 'blue' | 'green' | 'orange';
}

const DayCell: React.FC<DayCellProps> = ({ day, type }) => {
  const baseClasses = "px-4 rounded-full h-[20px] w-[20px] flex items-center justify-center";
  const typeClasses = {
    regular: "text-stone-500 hover:bg-slate-300",
    pink: "text-white bg-pink-600",
    'blue-light': "bg-blue-50 text-stone-500",
    blue: "text-white bg-blue-600",
    green: "text-white bg-green-500",
    orange: "text-white bg-orange-400"
  };

  return (
    <div 
      data-layername={`currentDay-${day}`} 
      className={`${baseClasses} ${typeClasses[type]} hover:bg-opacity-25 hover:cursor-pointer`}
      aria-label={`Day ${day}`}
    >
      {day}
    </div>
  );
};

export default DayCell;