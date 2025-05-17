import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from "@/components/ui/context-menu";
export function ContextMenuWrapper({ children, onClickChangeImage }:
    { children: React.ReactNode, onClickChangeImage: () => void }) {

    return (
        <ContextMenu>
            <ContextMenuTrigger className="w-full">{children}</ContextMenuTrigger>
            <ContextMenuContent className="z-50">
                <ContextMenuItem>Hồ sơ</ContextMenuItem>
                <ContextMenuItem>Thanh toán</ContextMenuItem>
                <ContextMenuItem>Nhóm</ContextMenuItem>
                <ContextMenuItem>Đăng kí</ContextMenuItem>
                <ContextMenuItem onClick={() => onClickChangeImage()}>Đổi ảnh</ContextMenuItem>
            </ContextMenuContent>
        </ContextMenu>
    )
}