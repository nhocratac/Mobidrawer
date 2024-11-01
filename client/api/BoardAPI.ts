

const createBoard  =  (type:string, user: string) => {
    try {
        // const response = await fetch(`http://localhost:5000/api/board/create`, {
        //     method: 'POST',
        //     headers: {
        //         'Content-Type': 'application/json',
        //     },
        //     body: JSON.stringify({type, user}),
        // });
        // return await response.json();
        const response = {
            boardID : '1',
            paths : [],
            user : '1',
            type : type,
            shapes: [],
            notes : [],
        }
        return response
    } catch (error) {
        throw error;
    }
}

const BoardAPI = {
    createBoard,
}
export default BoardAPI;