'use client'
import {  useEffect, useState } from "react";


interface InputRangeProps {
    label: string;
    min: number;
    max: number;
    defaultValue: number;
}

export default function InputRange({ label, min, max, defaultValue }: InputRangeProps) {
    const [value, setValue] = useState(defaultValue)
    useEffect(() => {
        const range = document.querySelector('input[type="range"]') as HTMLInputElement
        // change value 
        range.addEventListener('input', (e) => {
            const value = (e.target as HTMLInputElement).value
            setValue(parseInt(value))
        })
    })
    return (
        <div className="flex items-center space-x-4">
            <label htmlFor="range" className="text-sm font-medium">
                {label}
            </label>
            <input
                type="range"
                min={min}
                max={max}
                defaultValue={defaultValue}
                className=" h-2 w-[50px] cursor-pointer appearance-none rounded-lg bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-sm font-medium">{value}</span>
        </div>
    )
}
