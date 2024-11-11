import * as React from "react";

const Mesh = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 800 450"
        className="absolute"
        style={{ opacity: 0.2 }}
    >
        <defs>
            <filter
                id="bbblurry-filter"
                width="400%"
                height="400%"
                x="-100%"
                y="-100%"
                colorInterpolationFilters="sRGB"
                filterUnits="objectBoundingBox"
                primitiveUnits="userSpaceOnUse"
            >
                <feGaussianBlur
                    width="100%"
                    height="100%"
                    x="0%"
                    y="0%"
                    in="SourceGraphic"
                    result="blur"
                    stdDeviation="40"
                ></feGaussianBlur>
            </filter>
        </defs>
        <g filter="url(#bbblurry-filter)">
            <circle cx="504.788" cy="244.879" r="150" fill="#7aeae8"></circle>
            <circle cx="276.965" cy="239.022" r="150" fill="#F0F98E"></circle>
        </g>
    </svg>
);

export default Mesh;