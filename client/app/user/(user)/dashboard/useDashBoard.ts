import BoardAPI from "@/api/BoardAPI";
import { useEffect, useState } from "react";

interface Board {
    id: string;
    name: string;
    owner: string;
    type: string;
    description: string;
    thumbnail: string;
    updateAt: string
}

export interface ListBoardOfUserProps {
    boardList?: Board[];
    modeView: 'List' | 'Grid';
    [key: string]: unknown;
}

export default function useDashBoard() {
    const [boards, setBoards] = useState<Board[] | null>(null)
    useEffect(() => {
        BoardAPI.getAllBoardOfUser().then((res) => {
            console.log('dashboard log ,', res);
            setBoards(res)
        }).catch((res) => {
            console.log(res)
        })
    }, [])
  return {
    boards,
    setBoards
  }
}
