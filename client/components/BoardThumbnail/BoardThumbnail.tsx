import { Button } from "@/components/ui/button";
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogContent, DialogFooter } from "@/components/ui/dialog";


interface DialogElementProps {
    Video?: React.ReactNode;
    Title?: string;
    Description?: string;
    HandleClickCreate?: () => void;
    [key: string]: any;
}
interface BoardThumbnailProps {
    Thumbnail: React.ElementType;
    title: string;
    size: 'small' | 'medium' | 'large';
    DialogEle?: DialogElementProps
    [key: string]: any;
}


export default function BoardThumbnail({ Thumbnail, title, size, DialogEle, ...props }: BoardThumbnailProps) {

    return (
        <div {...props} className="flex flex-col gap-4  hover:cursor-pointer" >
            <Dialog>
                <DialogTrigger asChild>
                    <div className="h-full w-full" >
                        <div className=" h-4/5 border rounded-xl shadow-md overflow-hidden transition-transform duration-300 hover:brightness-110  ">
                            <Thumbnail />
                        </div>
                        <div className="text-[1.4rem]">{title}</div>
                    </div>
                </DialogTrigger>
                {DialogEle && <BodyDialog {...DialogEle} />}
            </Dialog>
        </div>
    );
}

const BodyDialog = ({ Video, Title, Description, HandleClickCreate, ...props }: DialogElementProps) => {
    return (
        <DialogContent className="w-[520px] h-[574px]">
            {Video}
            <DialogHeader>
                {Title && <DialogTitle className="text-[2rem]">{Title}</DialogTitle>}
                {Description && <DialogDescription className='text-[1.4rem]'>{Description}</DialogDescription>}
            </DialogHeader>
            <DialogFooter>
                <Button size={'lg'} onClick={HandleClickCreate}>Create</Button>
            </DialogFooter>
        </DialogContent>
    )
}