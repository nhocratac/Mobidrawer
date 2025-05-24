"use client";
import BoardAPI from "@/api/BoardAPI";
import BrainwritingThumb from "@/assets/Thumbnail/BrainwritingThumb";
import FlowchartThumb from "@/assets/Thumbnail/FlowchartThumb";
import IntelligentTemplate from "@/assets/Thumbnail/IntelligentTemplate";
import KanbanFrameworkThumb from "@/assets/Thumbnail/KanbanFrameworkThumb";
import MindMapThumb from "@/assets/Thumbnail/MindMapThumb";
import QuickRetrospective from "@/assets/Thumbnail/QuickRetrospective";
import BoardThumbnail from "@/components/BoardThumbnail/BoardThumbnail";
import VideoDialog from "@/components/BoardThumbnail/VideoDialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/navigation";
import { useCallback } from "react";

export default function ListBoardThumbnail() {
  const { toast } = useToast();
  const router = useRouter();
  const handleClickCreate = useCallback(
    (name: string, description: string, index: number) => {
      localStorage.setItem("boardTemplateIndex", index.toString());
      BoardAPI.createBoard(name, description)
        .then((res) => {
          router.push("/user/board/" + res.id);
        })
        .catch((error) => {
          console.log("Error creating board:", error);
          toast({
            title: "Lỗi tạo bảng",
            description: "Nâng cấp lên gói Pro để tạo thêm bảng mới",
            variant: "destructive",
          });
        });
    },
    [router]
  );

  const DialogData = {
    flowchart: {
      Title: "Flow Chart",
      Description:
        "You have must limit of Three editable boards. Upgrade to creat more editable boards",
      Video: (
        <VideoDialog
          linkMp4="https://mirostatic.com/app/static/529b435dbf19250f.mp4"
          linkWebm="https://mirostatic.com/app/static/bb1eba3b53c8eab7.webm"
        />
      ),
      HandleClickCreate: (name: string, description: string) => {
        handleClickCreate(name, description, 0);
      },
    },
    brainwriting: {
      Title: "Brainwriting",
      Description:
        "You have must limit of Three editable boards. Upgrade to creat more editable boards",
      Video: (
        <VideoDialog
          linkMp4="https://mirostatic.com/app/static/529b435dbf19250f.mp4"
          linkWebm="https://mirostatic.com/app/static/bb1eba3b53c8eab7.webm"
        />
      ),
      HandleClickCreate: (name: string, description: string) => {
        handleClickCreate(name, description, 1);
      },
    },
    intelligentTemplate: {
      Title: "Intelligent Template",
      Description:
        "You have must limit of Three editable boards. Upgrade to creat more editable boards",
      Video: (
        <VideoDialog
          linkMp4="https://mirostatic.com/app/static/529b435dbf19250f.mp4"
          linkWebm="https://mirostatic.com/app/static/bb1eba3b53c8eab7.webm"
        />
      ),
      HandleClickCreate: (name: string, description: string) => {
        handleClickCreate(name, description, 2);
      },
    },
    kanbanFramework: {
      Title: "Kanban Framework",
      Description:
        "You have must limit of Three editable boards. Upgrade to creat more editable boards",
      Video: (
        <VideoDialog
          linkMp4="https://mirostatic.com/app/static/529b435dbf19250f.mp4"
          linkWebm="https://mirostatic.com/app/static/bb1eba3b53c8eab7.webm"
        />
      ),
      HandleClickCreate: (name: string, description: string) => {
        handleClickCreate(name, description, 3);
      },
    },
    mindMap: {
      Title: "Mind Map",
      Description:
        "You have must limit of Three editable boards. Upgrade to creat more editable boards",
      Video: (
        <VideoDialog
          linkMp4="https://mirostatic.com/app/static/529b435dbf19250f.mp4"
          linkWebm="https://mirostatic.com/app/static/bb1eba3b53c8eab7.webm"
        />
      ),
      HandleClickCreate: (name: string, description: string) => {
        handleClickCreate(name, description, 4);
      },
    },
    quickRetrospective: {
      Title: "Quick Retrospective",
      Description:
        "You have must limit of Three editable boards. Upgrade to creat more editable boards",
      Video: (
        <VideoDialog
          linkMp4="https://mirostatic.com/app/static/529b435dbf19250f.mp4"
          linkWebm="https://mirostatic.com/app/static/bb1eba3b53c8eab7.webm"
        />
      ),
      HandleClickCreate: (name: string, description: string) => {
        handleClickCreate(name, description, 5);
      },
    },
  };
  return (
    <div className="h-full  grid grid-cols-[repeat(auto-fit,minmax(100px,1fr))] gap-3 flex-wrap">
      <div className="h-full">
        <BoardThumbnail
          title="FlowChart"
          size="small"
          Thumbnail={() => <FlowchartThumb />}
          DialogEle={DialogData.flowchart}
        />
      </div>
      <div className="h-full md:block">
        <BoardThumbnail
          title="Brainwriting"
          size="small"
          Thumbnail={() => <BrainwritingThumb />}
          DialogEle={DialogData.brainwriting}
        />
      </div>
      <div className="h-full hidden md:block">
        <BoardThumbnail
          title="Intelligent Templates"
          size="small"
          Thumbnail={() => <IntelligentTemplate />}
          DialogEle={DialogData.intelligentTemplate}
        />
      </div>
      <div className="h-full  md:block">
        <BoardThumbnail
          title="Kanban Framework"
          size="small"
          Thumbnail={() => <KanbanFrameworkThumb />}
          DialogEle={DialogData.kanbanFramework}
        />
      </div>
      <div className="h-full  md:block">
        <BoardThumbnail
          title="Mind Map"
          size="small"
          Thumbnail={() => <MindMapThumb />}
          DialogEle={DialogData.mindMap}
        />
      </div>
      <div className="h-full hidden md:block">
        <BoardThumbnail
          title="Quick Retrospective"
          size="small"
          Thumbnail={() => <QuickRetrospective />}
          DialogEle={DialogData.quickRetrospective}
        />
      </div>
      <div className="h-full hidden md:block">
        <BoardThumbnail
          title="FlowChart"
          size="small"
          Thumbnail={() => <FlowchartThumb />}
          DialogEle={DialogData.flowchart}
        />
      </div>
    </div>
  );
}
