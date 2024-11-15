import CommentList from "@/components/Comment/CommentList"
import { SendHorizontal } from "lucide-react"

const ModalComment = ({ handleToggleModal }: { handleToggleModal: any }) => {
    const handleOverlayClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            handleToggleModal()
        }
    }
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center"
            onClick={handleOverlayClick} >
            <div className="bg-white rounded-lg p-6 w-full max-w-7xl animate-slide-up">
                <h2 className="text-3xl font-semibold mb-4">Comments</h2>
                <CommentList />
                <div className="relative">
                    <textarea
                        placeholder="Write a comment"
                        className="mt-4 text-2xl w-full h-32 p-2 border border-gray-300 rounded-lg"
                        rows={4}
                    ></textarea>
                    <p className="absolute bottom-[50%] right-4 translate-y-[50%] text-gray-400">
                        <SendHorizontal size={24} fill="#0062d2" strokeWidth="0.5" color="white" />
                    </p>
                </div>
            </div>
        </div>
    )
}

export default ModalComment