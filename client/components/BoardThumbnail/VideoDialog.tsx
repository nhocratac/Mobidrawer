
interface VideoDialogProps {
    linkMp4: string;
    linkWebm: string;
    [key: string]: any;
}


export default function VideoDialog({linkMp4,linkWebm , ...props}
    : VideoDialogProps) {
    return (
        <video
            autoPlay={true}
            loop={true}
            muted={true}
            {...props}
        >
            <source src={linkMp4} type="video/mp4" />
            <source src={linkWebm} type="video/webm" />
            Your browser does not support the video tag.
        </video>
    )
}
