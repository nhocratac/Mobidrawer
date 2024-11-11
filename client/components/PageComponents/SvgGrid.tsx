import * as React from "react";

interface SvgGridProps {
    width?: number | string;
    height?: number | string;
}

const SvgGrid: React.FC<SvgGridProps> = ({ width = "100%", height = "100%" }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        width={width}
        height={height}
        viewBox="0 0 800 800"
        opacity={0.2}
    >
        <defs>
            <pattern id="grid" width="66.667" height="61.538" patternUnits="userSpaceOnUse">
                <rect width="66.667" height="61.538" fill="none" stroke="hsla(0, 0%, 80%, 1)" strokeWidth="0.5" />
            </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
    </svg>
);

export default SvgGrid;
