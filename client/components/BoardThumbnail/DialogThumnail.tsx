import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from "@/components/ui/dialog"
  

  

interface DialogThumnailProp {
    Video?: React.ReactNode;
    Title?: string;
    Description?: string;
    HandleClickCreate?: () => void;
    [key: string]: any;
}

const Data = {
    Video:''
}

export const VideoAuto = () => {
    return (
        <video>
            <source src='@assets/video/flowchart.mp4' />
        </video>
    )
}

export default function DialogThumnail({ Video, Title, Description, HandleClickCreate }: DialogThumnailProp) {
    return (
        <div>
            <Dialog>
                <DialogTrigger>Open</DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Are you absolutely sure?</DialogTitle>
                        <DialogDescription>
                            This action cannot be undone. This will permanently delete your account
                            and remove your data from our servers.
                        </DialogDescription>
                    </DialogHeader>
                </DialogContent>
            </Dialog>

        </div>
    )
}
