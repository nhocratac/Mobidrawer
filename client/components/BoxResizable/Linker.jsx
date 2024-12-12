import React, { useState, useEffect } from "react";

const handleStyles = {
    top: 'w-[10px] h-[10px] absolute bg-blue-500 rounded-full top-[-30px] left-[calc(50%-5px)]',
    bottom: 'w-[10px] h-[10px] absolute bg-blue-500 rounded-full bottom-[-30px] left-[calc(50%-5px)]',
    left: 'w-[10px] h-[10px] absolute bg-blue-500 rounded-full top-[calc(50%-5px)] left-[-30px]',
    right: 'w-[10px] h-[10px] absolute bg-blue-500 rounded-full top-[calc(50%-5px)] right-[-30px]',
    line: 'absolute bg-red-400 h-[2px]',
};

const Linker = () => {
    const [isDragging, setIsDragging] = useState(false);
    const [startPosition, setStartPosition] = useState({ x: 0, y: 0 });
    const [currentPosition, setCurrentPosition] = useState({ x: 0, y: 0 });

    console.log("Linker",startPosition,currentPosition);
    const onStartLink = (event) => {
        event.preventDefault();
        stopPropagation(event);

        const { clientX, clientY } = event;
        setStartPosition({ x: clientX, y: clientY });
        setCurrentPosition({ x: clientX, y: clientY });
        setIsDragging(true);
        console.log("start link");
    };

    const onLinking = (event) => {
        if (isDragging) {
            const { clientX, clientY } = event;
            setCurrentPosition({ x: clientX, y: clientY });
            console.log("linking", clientX, clientY);
        }
    };

    const onStopLink = (event) => {
        stopPropagation(event);
        setIsDragging(false);
        console.log("stop link");
    };

    const stopPropagation = (event) => {
        event.stopPropagation();
        event.preventDefault();
    };

    // Add and remove mousemove and mouseup listeners dynamically
    useEffect(() => {
        const handleMouseMove = (event) => {
            if (isDragging) {
                onLinking(event);
            }
        };

        const handleMouseUp = (event) => {
            if (isDragging) {
                onStopLink(event);
            }
        };

        // Add listeners when dragging starts
        if (isDragging) {
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
        }

        // Cleanup listeners when dragging stops
        return () => {
            document.removeEventListener("mousemove", handleMouseMove);
            document.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging]);

   

    return (
        <div className="absolute inset-0">
            <button
                onMouseDown={onStartLink}   // Start the drag
                onDragStart={onStartLink}   // Optional for drag event
                onDrag={stopPropagation}    // Prevent normal drag event
                onDragEnd={onStopLink}      // End the drag
                onClick={stopPropagation}   // Prevent click propagation
                className={handleStyles.top}
            />
            <button
               onMouseDown={onStartLink}   // Start the drag
               onDragStart={onStartLink}   // Optional for drag event
               onDrag={stopPropagation}    // Prevent normal drag event
               onDragEnd={onStopLink}      // End the drag
               onClick={stopPropagation} 
                className={handleStyles.bottom}
            />
            <button
              onMouseDown={onStartLink}   // Start the drag
              onDragStart={onStartLink}   // Optional for drag event
              onDrag={stopPropagation}    // Prevent normal drag event
              onDragEnd={onStopLink}      // End the drag
              onClick={stopPropagation} 
                className={handleStyles.left}
            />
            <button
            onMouseDown={onStartLink}   // Start the drag
            onDragStart={onStartLink}   // Optional for drag event
            onDrag={stopPropagation}    // Prevent normal drag event
            onDragEnd={onStopLink}      // End the drag
            onClick={stopPropagation} 
                className={handleStyles.right}
            />

            
        </div>
    );
};

export default Linker;
