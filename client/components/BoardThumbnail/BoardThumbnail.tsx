import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form,FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";


interface DialogElementProps {
    Video?: React.ReactNode;
    Title?: string;
    Description?: string;
    HandleClickCreate: (name: string , description: string) => void;
    [key: string]: any;
}
interface BoardThumbnailProps {
    Thumbnail: React.ElementType;
    title: string;
    size: 'small' | 'medium' | 'large';
    DialogEle?: DialogElementProps
    [key: string]: any;
}

const creatBoardSchema = z.object({
    name: z.string().min(1, "Name không được để trống"),
    description: z.string().min(1,"Desciption hãy nhập"),
})


export default function BoardThumbnail({ Thumbnail, title, DialogEle, ...props }: BoardThumbnailProps) {


    return (
        <div {...props} className="flex flex-col gap-4  hover:cursor-pointer" >
            <Dialog>
                <DialogTrigger asChild>
                    <div className="h-full w-full" >
                        <div className=" h-4/5 border rounded-xl shadow-md overflow-hidden transition-transform duration-300 hover:scale-105 hover:brightness-110 hover:rotate-1">
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
    const formCreateBoard = useForm<z.infer<typeof creatBoardSchema>>({
        resolver: zodResolver(creatBoardSchema),
        defaultValues: {
            name: "",
            description: ""
        },
    });

    const onSubmitCreateBoard = (data: z.infer<typeof creatBoardSchema>) => {
        HandleClickCreate(data.name,data.description)
    }
    return (
        <DialogContent className="w-[520px] h-[574px]" {...props}>
            {Video}
            <DialogHeader>
                <DialogTitle>{Title}</DialogTitle>
                <DialogDescription>{Description}</DialogDescription>
            </DialogHeader>
                <Form {...formCreateBoard}>
                    <form onSubmit={formCreateBoard.handleSubmit(onSubmitCreateBoard)} className="space-y-6">
                        <FormField
                            control={formCreateBoard.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className=" text-md lg:text-2xl">Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter board name" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <FormField
                            control={formCreateBoard.control}
                            name="description"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className=" text-md lg:text-2xl">Description</FormLabel>
                                    <FormControl>
                                        <Input placeholder="Enter board description" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <DialogFooter>
                            <Button type="submit" size="lg">
                                Create
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
        </DialogContent>
    )
}