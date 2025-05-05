
import BoardAPI from "@/api/BoardAPI";

import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useBoardStoreof } from "@/lib/Zustand/store";
import useTokenStore from "@/lib/Zustand/tokenStore";
import useUserInBoardStore from "@/lib/Zustand/userInBoardStore";
import { zodResolver } from "@hookform/resolvers/zod";
import { Avatar, AvatarFallback, AvatarImage } from "@radix-ui/react-avatar";
import { ChevronUp, UserRoundPlus, Users } from "lucide-react";
import { ChangeEvent, useCallback, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";


const AddUserSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  role: z.enum(["EDITOR", "VIEWER"]),
})
function TopRightBar({
  handleChangeRole
}: {
  handleChangeRole: (memberId: string, role: 'EDITOR' | 'VIEWER') => void
}) {
  const { board, setMembers } = useBoardStoreof()
  const [isVisible, setIsVisible] = useState(false);
  const [isVisibleUsers, setIsVisibleUsers] = useState(false);
  const [isVisibleAddUser, setIsVisibleAddUser] = useState(false);
  const { users } = useUserInBoardStore()
  const { user } = useTokenStore()
  const { toast } = useToast()

  const formAddUser = useForm<z.infer<typeof AddUserSchema>>({
    resolver: zodResolver(AddUserSchema),
    defaultValues: {
      email: "",
      role: "EDITOR",
    },
  });

  const handleAddUser = useCallback((data: z.infer<typeof AddUserSchema>) => {
    if (!board?.id) return
    BoardAPI.addPersonToBoard(board?.id, data)
      .then((res) => {
        toast({
          title: "Thành công",
          description: `Thêm người dùng ${data.email} thành công`,
          variant: "default",
        })
        setMembers(res.members)
      })
      .catch((err) => {
        toast({
          title: "Thất bại",
          description: `Thêm người dùng ${data.email} thất bại. ${err.response.data.message}`,
          variant: "destructive",
        })
      })
    // TODO: Gọi API hoặc logic thêm user vào board
  }, [board?.id]);

  const handleToggleAddUser = () => {
    setIsVisibleAddUser(!isVisibleAddUser);
    setIsVisibleUsers(false);
  };

  const handleRoleChange = async (event: ChangeEvent<HTMLSelectElement>, memberId: string) => {
    const newRole = event.target.value as "EDITOR" | "VIEWER";
    // convert mewRole to type "EDITOR" |"VIEWER"
    console.log(users)
    handleChangeRole(memberId, newRole)
  }

  return (
    <div className="w-full relative">

      {/* Top bar panel */}
      <div
        className={`fixed z-50 top-0 right-[35px] w-[350px] max-h-[300px] overflow-y-auto bg-white text-black shadow-lg rounded-xl
        transform ${isVisible ? "translate-y-0" : "-translate-y-full"}
        transition-transform duration-300 ease-in-out px-4 py-2`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex space-x-2">
            <Button size="icon" variant="outline" onClick={handleToggleAddUser}>
              <UserRoundPlus />
            </Button>
            <Button size="icon" variant="outline" onClick={() => setIsVisibleUsers(!isVisibleUsers)}>
              <Users />
            </Button>
          </div>
        </div>
        {/* Add User Form */}
        <div
          className={`flex flex-col space-y-2 transform transition-all duration-300 ease-in-out
            ${isVisibleAddUser ? "opacity-100 max-h-[300px] visible translate-y-0" : "opacity-0 max-h-0 invisible -translate-y-4"}
          `}
        >
          <Form {...formAddUser}>
            <form onSubmit={formAddUser.handleSubmit(handleAddUser)} className="flex flex-col items-center space-y-4">
              <FormField
                control={formAddUser.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="flex items-center space-x-2">
                    <FormLabel className="text-md lg:text-2xl">Email</FormLabel>
                    <FormControl>
                      <Input type='email'  {...field} placeholder="Enter user email" />
                    </FormControl>
                  </FormItem>
                )}
              />
              <FormField
                control={formAddUser.control}
                name="role"
                render={({ field }) => (
                  <FormItem className="flex flex-col items-start space-y-1">
                    <FormLabel className="text-md lg:text-2xl">Role</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="border rounded-md p-2 text-lg w-full"
                      >
                        <option value="EDITOR">Editor</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                    </FormControl>
                  </FormItem>
                )}
              />
              <Button type="submit" variant="default" className="text-md lg:text-2xl">
                Add User
              </Button>
            </form>
          </Form>
        </div>

        <div className={`flex flex-col space-y-2 overflow-hidden  transform 
          ${isVisibleUsers ? "  opacity-100 translate-y-0 visible " : "opacity-0 max-h-0  -translate-y-full invisible"}
          transition-transform duration-300 ease-in-out`}>
          {users.map((myuser, index) => (
            <div key={index} className="flex items-center space-x-2 p-2 bg-gray-100 rounded-md">
              <Avatar className="w-8 h-8">
                <AvatarImage src={`https://ui-avatars.com/api/?name=${myuser.firstName}+${myuser.lastName}`} />
                <AvatarFallback>{myuser.firstName[0]}</AvatarFallback>
              </Avatar>
              <div className="flex items-center justify-between w-full">
                <div className="text-2xl">
                  <div className="font-medium">{myuser.firstName} {myuser.lastName}</div>
                  <div className="text-xl text-gray-600">{myuser.email}</div>
                </div>
                {user && user.id === board?.owner && (
                  myuser.userId === board.owner ? (
                    <div className="text-xl text-gray-600 ml-2 font-semibold">Owner</div>
                  ) : (
                    <select
                      title="role"
                      className="text-xl text-gray-600 ml-2"
                      defaultValue={myuser.role}
                      onChange={(e) => handleRoleChange(e, myuser.userId)}>
                      <option value="EDITOR">Editor</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                  )
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toggle button */}
      <div className="fixed top-0 right-[10px] z-50 bg-white h-10 w-10 rounded-full shadow-lg flex items-center justify-center mt-2">
        <button type='button' title="toggle" onClick={() => setIsVisible(!isVisible)} className="w-full h-full">
          {isVisible ? (
            <ChevronUp className="text-black" />
          ) : (
            <ChevronUp className="text-black rotate-180" />
          )}
        </button>
      </div>
    </div>
  );
}

export default TopRightBar;
