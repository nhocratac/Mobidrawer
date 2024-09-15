
import FlowchartThumb from "@/asset/Flowchart-thumb";
import BoardThumbnail from "@/components/BoardThumbnail/BoardThumbnail";
export default function ListBoardThumbnail() {
    return (
        <div className="h-full  grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-3">
            <div className="h-full">
                <BoardThumbnail
                    title="FlowChart"
                    size="small"
                    Thumbnail={() =>
                        <FlowchartThumb />
                    }
                />
            </div>
            <div className="h-full md:block">
                <BoardThumbnail
                    title="FlowChart"
                    size="small"
                    Thumbnail={() =>
                        <FlowchartThumb />
                    }
                />
            </div>
            <div className="h-full hidden md:block">
                <BoardThumbnail
                    title="FlowChart"
                    size="small"
                    Thumbnail={() =>
                        <FlowchartThumb />
                    }
                />
            </div>
            <div className="h-full  md:block">
                <BoardThumbnail
                    title="FlowChart"
                    size="small"
                    Thumbnail={() =>
                        <FlowchartThumb />
                    }
                />
            </div>
            <div className="h-full  md:block">
                <BoardThumbnail
                    title="FlowChart"
                    size="small"
                    Thumbnail={() =>
                        <FlowchartThumb />
                    }
                />
            </div>
            <div className="h-full hidden md:block">
                <BoardThumbnail
                    title="FlowChart"
                    size="small"
                    Thumbnail={() =>
                        <FlowchartThumb />
                    }
                />
            </div>
            <div className="h-full hidden md:block">
                <BoardThumbnail
                    title="FlowChart"
                    size="small"
                    Thumbnail={() =>
                        <FlowchartThumb />
                    }
                />
            </div>
        </div>
    )
}
