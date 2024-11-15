import Reaction from "@/components/Reaction/Reaction"


const CommentItem = () => {

    return (
        <div className="flex gap-4">
            <img
                className='w-14 h-14 rounded-full'
                alt='avatar'
                src='https://scontent.fsgn5-13.fna.fbcdn.net/v/t39.30808-6/292890098_569175404769108_5064898772323390920_n.jpg?_nc_cat=1&ccb=1-7&_nc_sid=6ee11a&_nc_eui2=AeHbnJDz8DVMi-Hr3drAd0kTyTtWdLF6lSbJO1Z0sXqVJvk5aZ5sNifVViRj1JRadlrw4MqijKsjhAYR0XxSluPg&_nc_ohc=T8P_QWM2WE4Q7kNvgH0SNOI&_nc_zt=23&_nc_ht=scontent.fsgn5-13.fna&_nc_gid=A1rJAltpNfTWylQeCAfqOSX&oh=00_AYDBZ7n9Wgl6lVB2fCu0OK_l-upwvPsns7VMmg8KHrejcg&oe=672F6F6D' />
            <div className=" py-4 px-8 rounded-2xl flex flex-col text-2xl gap-2 bg-neutral-200">
                <h5 className="font-bold">Nguyễn Văn A</h5>
                <p>Awesome!. Sao bạn không làm thêm nội dung này</p>
                <Reaction />
            </div>
        </div>
    )
}

export default CommentItem