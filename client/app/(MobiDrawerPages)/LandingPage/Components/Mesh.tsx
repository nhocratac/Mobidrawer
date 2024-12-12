

const Mesh = () => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1920 800"
        style={{
            opacity: 0.2,
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0
        }}
        preserveAspectRatio="xMidYMid slice"
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
            <circle cx="1200" cy="400" r="300" fill="#7aeae8"></circle>
            <circle cx="720" cy="400" r="300" fill="#F0F98E"></circle>
        </g>
    </svg>
);

export default Mesh;