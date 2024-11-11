import CommentItem from "@/components/Comment/CommentItem"


function CommentList() {
    return (
        <ul className="flex flex-col gap-4 max-h-[500px] overflow-auto ">
            <li><CommentItem/></li>
            <li><CommentItem/></li>
            <li><CommentItem/></li>
            <li><CommentItem/></li>
            <li><CommentItem/></li>
            <li><CommentItem/></li>
            <li><CommentItem/></li>
        </ul>
    )
}

export default CommentList