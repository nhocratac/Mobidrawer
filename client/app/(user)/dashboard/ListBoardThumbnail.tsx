
import BrainwritingThumb from "@/assets/Thumbnail/BrainwritingThumb";
import FlowchartThumb from "@/assets/Thumbnail/FlowchartThumb";
import IntelligentTemplate from "@/assets/Thumbnail/IntelligentTemplate";
import KanbanFrameworkThumb from "@/assets/Thumbnail/KanbanFrameworkThumb";
import MindMapThumb from "@/assets/Thumbnail/MindMapThumb";
import QuickRetrospective from "@/assets/Thumbnail/QuickRetrospective";
import FlowChartVideo from "@/assets/video/FlowChartVideo";
import BoardThumbnail from "@/components/BoardThumbnail/BoardThumbnail";


const Fltest = {
    Title: 'Flow Chart',
    Description:'You have must limit of Three editable boards. Upgrade to creat more editable boards',
    Video :  FlowChartVideo,
    HandleClickCreate: () => {
        console.log('dax tao flowchart')
    }
}

export default function ListBoardThumbnail() {
    return (
        <div className="h-full  grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-3 flex-wrap">
            <div className="h-full">
                <BoardThumbnail
                    title="FlowChart"
                    size="small"
                    Thumbnail={() =>
                        <FlowchartThumb />
                    }
                    DialogEle={Fltest}
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
