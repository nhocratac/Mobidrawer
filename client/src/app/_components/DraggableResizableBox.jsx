import React from 'react';
import { Rnd } from 'react-rnd';

const handleStyles = {
    topLeft: {
      cursor: 'nw-resize',
      width: '10px',
      height: '10px',
      position: 'absolute',
      backgroundColor: 'white',
      border: '2px solid black',
      borderRadius: '50%',
      top: '-5px', // Move handle outside the container
      left: '-5px', // Move handle outside the container
    },
    topRight: {
      cursor: 'ne-resize',
      width: '10px',
      height: '10px',
      position: 'absolute',
      backgroundColor: 'white',
      border: '2px solid black',
      borderRadius: '50%',
      top: '-5px', // Move handle outside the container
      right: '-5px', // Move handle outside the container
    },
    bottomLeft: {
      cursor: 'sw-resize',
      width: '10px',
      height: '10px',
      position: 'absolute',
      backgroundColor: 'white',
      border: '2px solid black',
      borderRadius: '50%',
      bottom: '-5px', // Move handle outside the container
      left: '-5px', // Move handle outside the container
    },
    bottomRight: {
      cursor: 'se-resize',
      width: '10px',
      height: '10px',
      position: 'absolute',
      backgroundColor: 'white',
      border: '2px solid black',
      borderRadius: '50%',
      bottom: '-5px', // Move handle outside the container
      right: '-5px', // Move handle outside the container
    },
   
  };
  
const Box = ({imageUrl}) => (
  <div
    className="box"
    style={{
      margin: 0,
      height: '100%',
      padding: 0,
      background: "white",
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      overflow: 'hidden',
    }}
  >
    <img
      src={imageUrl}
      draggable="false"
      alt="github avatar"
      style={{
        width: '100%',
        height: '100%',
        objectFit: 'fill', // Adjust based on your preference
      }}
    />
  </div>
);

const ResizableDraggableBox = ({imageUrl}) => (
  <div
    style={{
      width: '100px',
      height: '100px',
      position: 'relative', // Required for positioning handles
    }}
  >
    <Rnd
      default={{
        x: 150,
        y: 205,
        width: 100,
        height: 100,
      }}
      minWidth={100}
      minHeight={100}
      bounds="window"
      style={{
        border: '2px solid black',
        position: 'relative', // Required for positioning handles
      }}
      handleStyles={handleStyles}
      enableResizing={{
        top: true,
        right: true,
        bottom: true,
        left: true,
        topRight: true,
        bottomRight: true,
        bottomLeft: true,
        topLeft: true,
      }}
    >
      <Box imageUrl={imageUrl} />
      <div className="resize-handles">
        <div style={handleStyles.topLeft} className="handle top-left"></div>
        <div style={handleStyles.topRight} className="handle top-right"></div>
        <div style={handleStyles.bottomLeft} className="handle bottom-left"></div>
        <div style={handleStyles.bottomRight} className="handle bottom-right"></div>
      
      </div>
    </Rnd>
  </div>
);

export default ResizableDraggableBox;
