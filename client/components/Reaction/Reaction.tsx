
import { svgs } from "@/assets"
import {  useEffect, useState } from "react"

const ReactionIcon = ({ Icon, textTooltip, onClick, className, ...props }: {
    Icon: any,
    className?: string,
    textTooltip?: string,
    onClick?: any,
    [key: string]: any
}) => {
    // tooltip here
    return (
        <div className="relative" onClick={onClick}>
            <div className="group/icon">
                <p className="group-hover/icon:block hidden  text-base -left-2  absolute -top-12 bg-black text-white bg-opacity-60   0 p-2 rounded-full">
                    {textTooltip}
                </p>
                <Icon className={`group-hover/icon:scale-125 transition-transform duration-100 ease-linear ${className}`} {...props} />
            </div>
        </div>
    )
}




const Reaction = () => {
    const [reaction, setReaction] = useState('')

    const [reactionList, setReactionList] = useState([{
        'name': "james",
        'reaction': "Like"
    }, {
        'name': "anna",
        'reaction': "Love"
    }, {
        'name': "katy",
        'reaction': "Haha"
    }, {
        'name': "janet",
        'reaction': "Like"
    }, {
        'name': "tom",
        'reaction': "Like"
    }])

    useEffect(() => {
        if (reaction != '') {
            setReactionList((pre) => {
                // if user already react
                if (pre.find((item) => item.name == 'You')) {
                    return pre.map((item) => item.name == 'You' ? { name: 'You', reaction: reaction } : item)
                }
                return [...pre, { name: 'You', reaction: reaction }]
            }
            )
        }
        else {
            setReactionList((pre) => pre.filter((item) => item.name != 'You'))
        }
    }, [reaction])
    const GetCurrentReaction = (type: string): JSX.Element => {
        switch (type) {
            case 'Like':
                return svgs.Like
            case 'Love':
                return svgs.Love
            case 'Haha':
                return svgs.Haha
            default:
                return svgs.LikeOutline
        }
    }

    return (
        <>
            <div className="group/bar relative w-auto">
                <div className={`flex gap-1 items-center opacity-0  transition-transform duration-300
                    absolute  bg-white px-4 py-2 rounded-full 
                    group-hover/bar:flex group-hover/bar:opacity-100 group-hover/bar:translate-y-[-100%]`} >
                    <ReactionIcon Icon={svgs.Like} textTooltip="Like" onClick={() => setReaction((pre) => (pre == 'Like' ? '' : 'Like'))} />
                    <ReactionIcon Icon={svgs.Love} textTooltip="Love" onClick={() => setReaction((pre) => (pre == 'Love' ? '' : 'Love'))} />
                    <ReactionIcon Icon={svgs.Haha} textTooltip="Haha" onClick={() => setReaction((pre) => (pre == 'Haha' ? '' : 'Haha'))} />
                </div>
                <div className="flex gap-2 items-center">
                    <p className="text-2xl font-bold">{reactionList.length}</p>
                    <ReactionIcon Icon={GetCurrentReaction(reaction)} className="w-8 h-8" onClick={() => setReaction((pre) => (pre == '' ? 'Like' : ''))} />
                </div>
            </div>
        </>
    )
}



export default  Reaction