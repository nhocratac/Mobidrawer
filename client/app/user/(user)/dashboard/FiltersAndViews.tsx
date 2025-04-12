import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Dispatch, SetStateAction } from "react";

interface FiltersAndViewProps {
  setModeView: Dispatch<SetStateAction<"List" | "Grid">>
  [key: string]: any;
}

const FiltersAndView: React.FC<FiltersAndViewProps> = ({ setModeView, ...props }) => {
  return (
    <div className="mt-6 md:mt-10 w-full px-4 md:px-12" {...props}>
      <div className="flex flex-col md:flex-row md:justify-between gap-6">
        {/* Filter Controls - Left Side */}
        <div className="flex flex-col gap-6 md:flex-row md:gap-8">
          {/* Filter By Section */}
          <div className="flex flex-col gap-2">
            <p className="font-light text-sm md:text-base mb-1">Lọc theo</p>
            <div className="grid grid-cols-2 gap-2 md:flex md:flex-row md:gap-3">
              <Select>
                <SelectTrigger className="min-w-[110px] h-9 text-sm">
                  <SelectValue placeholder="Board" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Tất cả">Tất cả</SelectItem>
                  <SelectItem value="Not in space">Không thuộc không gian</SelectItem>
                </SelectContent>
              </Select>
              <Select>
                <SelectTrigger className="min-w-[110px] h-9 text-sm">
                  <SelectValue placeholder="Chủ sở hữu" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mọi người">Mọi người</SelectItem>
                  <SelectItem value="của tôi">Của tôi</SelectItem>
                  <SelectItem value="khác">Khác</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sort By Section */}
          <div className="flex flex-col gap-2">
            <p className="font-light text-sm md:text-base mb-1">Sắp xếp theo</p>
            <Select>
              <SelectTrigger className="min-w-[110px] h-9 text-sm max-w-[200px]">
                <SelectValue placeholder="Gần đây" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gần đây">Gần đây</SelectItem>
                <SelectItem value="cũ">Cũ</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* View Controls - Right Side */}
        <div className="flex flex-col gap-2">
          <p className="font-light text-sm md:text-base mb-1">Xem theo</p>
          <Select onValueChange={(value: 'Grid' | 'List') => setModeView(value)}>
            <SelectTrigger className="min-w-[110px] h-9 text-sm max-w-[200px]">
              <SelectValue placeholder="Danh sách" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="List">Danh sách</SelectItem>
              <SelectItem value="Grid">Lưới</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
};

export default FiltersAndView;