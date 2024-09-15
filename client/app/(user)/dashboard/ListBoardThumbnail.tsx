
import BrainwritingThumb from "@/asses/Thumbnail/BrainwritingThumb";
import FlowchartThumb from "@/asses/Thumbnail/FlowchartThumb";
import IntelligentTemplate from "@/asses/Thumbnail/IntelligentTemplate";
import KanbanFrameworkThumb from "@/asses/Thumbnail/KanbanFrameworkThumb";
import MindMapThumb from "@/asses/Thumbnail/MindMapThumb";
import QuickRetrospective from "@/asses/Thumbnail/QuickRetrospective";
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
                    title="Brainwriting"
                    size="small"
                    Thumbnail={() =>
                        <BrainwritingThumb />
                    }
                />
            </div>
            <div className="h-full hidden md:block">
                <BoardThumbnail
                    title="Intelligent Templates"
                    size="small"
                    Thumbnail={() =>
                        <IntelligentTemplate />
                    }
                />
            </div>
            <div className="h-full  md:block">
                <BoardThumbnail
                    title="Kanban Framework"
                    size="small"
                    Thumbnail={() =>
                        <KanbanFrameworkThumb />
                    }
                />
            </div>
            <div className="h-full  md:block">
                <BoardThumbnail
                    title="Mind Map"
                    size="small"
                    Thumbnail={() =>
                        <MindMapThumb />
                    }
                />
            </div>
            <div className="h-full hidden md:block">
                <BoardThumbnail
                    title="Quick Retrospective"
                    size="small"
                    Thumbnail={() =>
                        <QuickRetrospective />
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
