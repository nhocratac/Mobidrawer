import React from 'react';

const WeekDays: React.FC = () => {
    const days = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

    return (
        <>
            {
                days.map((day) => (
                    <div key={day}>{day}</div>
                ))
            }
        </>

    );
};

export default WeekDays;