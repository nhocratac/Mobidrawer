'use client'

import BoardAPI from "@/api/BoardAPI"
import { Button } from "@/components/ui/button"
import { useParams } from "next/navigation"


export default function SendRequestJoin() {
    const {id} = useParams()
    const handleSendquestJoin = ( ) => {
        BoardAPI.sendRequestJoin(id.toString()).then((res)=> {
            console.log(res)
        })
    }
    return (
        <Button size={'lg'} variant={'link'} onClick={handleSendquestJoin}>
            <p className="text-3xl">Liên hệ</p>
        </Button>
    )
}
