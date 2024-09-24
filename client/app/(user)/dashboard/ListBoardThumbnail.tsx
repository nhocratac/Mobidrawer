
import BrainwritingThumb from "@/assets/Thumbnail/BrainwritingThumb";
import FlowchartThumb from "@/assets/Thumbnail/FlowchartThumb";
import IntelligentTemplate from "@/assets/Thumbnail/IntelligentTemplate";
import KanbanFrameworkThumb from "@/assets/Thumbnail/KanbanFrameworkThumb";
import MindMapThumb from "@/assets/Thumbnail/MindMapThumb";
import QuickRetrospective from "@/assets/Thumbnail/QuickRetrospective";
import VideoDialog from "@/components/BoardThumbnail/VideoDialog";
import BoardThumbnail from "@/components/BoardThumbnail/BoardThumbnail";


const DialogData = {
    flowchart: {
        Title: 'Flow Chart',
        Description: 'You have must limit of Three editable boards. Upgrade to creat more editable boards',
        Video: <VideoDialog linkMp4="https://mirostatic.com/app/static/529b435dbf19250f.mp4" linkWebm="https://mirostatic.com/app/static/bb1eba3b53c8eab7.webm" />,
        HandleClickCreate: () => {
            console.log('dax tao flowchart')
        }
    },
    brainwriting: {
        Title: 'Brainwriting',
        Description: 'You have must limit of Three editable boards. Upgrade to creat more editable boards',
        Video: <VideoDialog linkMp4="https://mirostatic.com/app/static/529b435dbf19250f.mp4" linkWebm="https://mirostatic.com/app/static/bb1eba3b53c8eab7.webm" />,
        HandleClickCreate: () => {
            console.log('dax tao Brainwriting')
        }
    },
    intelligentTemplate: {
        Title: 'Intelligent Template',
        Description: 'You have must limit of Three editable boards. Upgrade to creat more editable boards',
        Video: <VideoDialog linkMp4="https://mirostatic.com/app/static/529b435dbf19250f.mp4" linkWebm="https://mirostatic.com/app/static/bb1eba3b53c8eab7.webm" />,
        HandleClickCreate: () => {
            console.log('dax tao Intelligent Template')
        }
    },
    kanbanFramework: {
        Title: 'Kanban Framework',
        Description: 'You have must limit of Three editable boards. Upgrade to creat more editable boards',
        Video: <VideoDialog linkMp4="https://mirostatic.com/app/static/529b435dbf19250f.mp4" linkWebm="https://mirostatic.com/app/static/bb1eba3b53c8eab7.webm" />,
        HandleClickCreate: () => {
            console.log('dax tao Kanban Framework')
        }
    },
    mindMap: {
        Title: 'Mind Map',
        Description: 'You have must limit of Three editable boards. Upgrade to creat more editable boards',
        Video: <VideoDialog linkMp4="https://mirostatic.com/app/static/529b435dbf19250f.mp4" linkWebm="https://mirostatic.com/app/static/bb1eba3b53c8eab7.webm" />,
        HandleClickCreate: () => {
            console.log('dax tao Mind Map')
        }
    },
    quickRetrospective: {
        Title: 'Quick Retrospective',
        Description: 'You have must limit of Three editable boards. Upgrade to creat more editable boards',
        Video: <VideoDialog linkMp4="https://mirostatic.com/app/static/529b435dbf19250f.mp4" linkWebm="https://mirostatic.com/app/static/bb1eba3b53c8eab7.webm" />,
        HandleClickCreate: () => {
            console.log('dax tao Quick Retrospective')
        }
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
                    DialogEle={DialogData.flowchart}
                />
            </div>
            <div className="h-full md:block">
                <BoardThumbnail
                    title="Brainwriting"
                    size="small"
                    Thumbnail={() =>
                        <BrainwritingThumb />
                    }
                    DialogEle={DialogData.brainwriting}
                />
            </div>
            <div className="h-full hidden md:block">
                <BoardThumbnail
                    title="Intelligent Templates"
                    size="small"
                    Thumbnail={() =>
                        <IntelligentTemplate />
                    }
                    DialogEle={DialogData.intelligentTemplate}
                />
            </div>
            <div className="h-full  md:block">
                <BoardThumbnail
                    title="Kanban Framework"
                    size="small"
                    Thumbnail={() =>
                        <KanbanFrameworkThumb />
                    }
                    DialogEle={DialogData.kanbanFramework}
                />
            </div>
            <div className="h-full  md:block">
                <BoardThumbnail
                    title="Mind Map"
                    size="small"
                    Thumbnail={() =>
                        <MindMapThumb />
                    }
                    DialogEle={DialogData.mindMap}
                />
            </div>
            <div className="h-full hidden md:block">
                <BoardThumbnail
                    title="Quick Retrospective"
                    size="small"
                    Thumbnail={() =>
                        <QuickRetrospective />
                    }
                    DialogEle={DialogData.quickRetrospective}
                />
            </div>
            <div className="h-full hidden md:block">
                <BoardThumbnail
                    title="FlowChart"
                    size="small"
                    Thumbnail={() =>
                        <FlowchartThumb />
                    }
                    DialogEle={DialogData.flowchart}
                />
            </div>
        </div>
    )
}
