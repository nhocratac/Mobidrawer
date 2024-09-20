

export default function FlowChartVideo({ ...props}
    : { [key: string]: any }) {
    return (
        <video
            autoPlay={true}
            loop={true}
            muted={true}
            {...props}
        >
            <source src='https://mirostatic.com/app/static/529b435dbf19250f.mp4' type="video/mp4" />
            <source src='https://mirostatic.com/app/static/bb1eba3b53c8eab7.webm' type="video/webm" />
            Your browser does not support the video tag.
        </video>
    )
}
