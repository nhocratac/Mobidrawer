import { Board } from "@/lib/Zustand/type.type";
import httpRequest from "@/utils/httpRequest";

// const boardAvatar = [
//   "https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_6.png?etag=20230906",
//   "https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_30.png?etag=20230906",
//   "https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_18.png?etag=20230906",
// ];

const createBoard = async (name: string, description: string) => {
  try {
    const data = {
      name,
      description,
      type: "private",
      thumbnail:
        "https://miro.com/app/images/application/icons/board_vis_230905/icon/board_icon_18.png?etag=20230906",
    };
    const newBoard = await httpRequest.post("/board/create", data);
    return newBoard.data;
  } catch (error) {
    throw error;
  }
};

const getAllBoardOfUser = async () => {
  try {
    const boardResponse = await httpRequest.get("/board/get-boards");
    return boardResponse.data;
  } catch (error) {
    throw error;
  }
};
const getBoardById = async (id: string)  : Promise<Board>=> {
  try {
    const board = await httpRequest.get("/board/" + id);
    return board.data
  } catch (error) {
    throw error
  }
};

const addPersonToBoard = async (boardId: string, data : {
  email : string,
  role: "EDITOR" | "VIEWER"
}) => {
  try {
    const response = await httpRequest.post(
      `/board/addMember/${boardId}`,
      data
    );
    return response.data;
  } catch (error) {
    throw error;
  }
}

const getDetailMemberInBoard = async (boardId: string) => {
  try {
    const response = await httpRequest.get(`/board/getMembersDetail/${boardId}`);
    return response.data;
  } catch (error) {
    throw error;
  }
}

const changeRoleMember  = async (boardId: string , memberId : string , role : 'EDITOR' | 'VIEWER' ) => {
  try {
    const response = await httpRequest.post(`/board/change-role/${boardId}`, {
      memberId,
      role,
    });
    return response.data;
  } catch (error) {
    throw error
  }
}

const sendRequestJoin = async(boardId: string) => {
  try {
    const res = await httpRequest.post(`/notification/joinBoard/${boardId}`)
    return res.data
  } catch (error) {
    throw error
  }
}

const BoardAPI = {
  createBoard,
  getAllBoardOfUser,
  getBoardById,
  addPersonToBoard,
  getDetailMemberInBoard,
  changeRoleMember,
  sendRequestJoin
};
export default BoardAPI;

// const createBoard = (type: boardType, id: number) => {
//   const now = new Date();
//   const year = now.getFullYear();
//   const month = String(now.getMonth() + 1).padStart(2, '0'); // Thêm số 0 nếu cần
//   const day = String(now.getDate()).padStart(2, '0');
//   const hour = String(now.getHours()).padStart(2, '0');

//   // Tạo chuỗi ngày giờ tùy chỉnh
//   const customDate = `${year}-${month}-${day} ${hour}:00`;
//   try {
//     const response: BoardState = {
//       id: id,
//       name: `${type} ${id}`,
//       lastOpened : customDate,
//       description: `Đây là ${type} bảng đã được tạo tại${new Date().toISOString()}`,
//       canvasPaths: [],
//       thumbnail: boardAvatar[id % boardAvatar.length],
//       type: type,
//       options: {
//         grid: true,
//         backgroundColor: 'bg-slate-700',
//       },
//     };
//     return response;
//   } catch (error) {
//     throw error;
//   }
// };
