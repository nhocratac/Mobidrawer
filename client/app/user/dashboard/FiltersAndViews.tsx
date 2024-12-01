import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FiltersAndViewProps {
  // Define the props for your component here

  [key: string]: any;
}

const FiltersAndView: React.FC<FiltersAndViewProps> = ({ setModeView, ...props }) => {
  // Implement your component logic here

  return (
    <div className="mt-12 flex flex-col md:flex-row justify-between w-full px-12" {...props}>
      <div className="flex gap-6 text-[1.4rem]">
        <div className='flex gap-4' >
          <p className='font-light'>
            Lọc theo
          </p>
          <Select>
            <SelectTrigger className="min-w-[100px] w-1/5">
              <SelectValue placeholder="Board" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Tất cả">
                Tất cả
              </SelectItem>
              <SelectItem value="Not in space">
                Không thuộc không gian
              </SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="min-w-[100px] w-1/5">
              <SelectValue placeholder="Chủ sở hữu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mọi người">
                Mọi người
              </SelectItem>
              <SelectItem value="của tôi">
                Của tôi
              </SelectItem>
              <SelectItem value="khác">
                Khác
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-4">
          <p className='font-light'>
            Sắp xếp theo
          </p>
          <Select>
            <SelectTrigger className="min-w-[100px] w-1/5">
              <SelectValue placeholder="gần đây" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="gần đây">
                Gần đây
              </SelectItem>
              <SelectItem value="cũ">
                Cũ
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-4 text-[1.4rem]">
        <p className='font-light'>
          Xem theo
        </p>
        <Select onValueChange={(value) => setModeView(value)}>
          <SelectTrigger className="min-w-[100px] w-1/5">
            <SelectValue placeholder="danh sách" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="danh sách">
              Danh sách
            </SelectItem>
            <SelectItem value="lưới" >
              Lưới
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default FiltersAndView;