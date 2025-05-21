package com.example.ie213backend.service;

import com.example.ie213backend.domain.dto.BoardDto.BoardDTO;
import com.example.ie213backend.domain.dto.BoardDto.BoardFullDetailResponse;
import com.example.ie213backend.domain.dto.BoardDto.MemberDetailDTO;
import com.example.ie213backend.domain.model.Board;
import com.example.ie213backend.domain.model.CanvasPath;

import java.util.List;

public interface BoardService {
     BoardFullDetailResponse getBoard(String id , String userId ) ;
     Board createBoard(Board board,String ownerId );
     CanvasPath addCanvasPath(String id, CanvasPath canvasPath);
     Board addMemberToBoard(String boardId, String email, Board.ROLE role,String ownerID);
     Board changeRoleOfMember(String boardId, String userId, Board.ROLE role,String ownerID);
     List<BoardDTO> findAllBoardofUser(String userId);
     List<MemberDetailDTO> getMembersDetail(String boardId);
     String getRoleOfMember(String boardId, String userId);
     Board updateThumbnail(String boardId,String userId ,String newThumbnail);
}


