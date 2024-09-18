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

const FiltersAndView: React.FC<FiltersAndViewProps> = ({ ...props }) => {
  // Implement your component logic here

  return (
    <div className="mt-12 flex flex-col md:flex-row justify-between w-full px-12" {...props}>
      <div className="flex gap-6 text-[1.4rem]">
        <div className='flex gap-4' >
          <p className='font-light'>
            Filter by
          </p>
          <Select>
            <SelectTrigger className="min-w-[100px] w-1/5">
              <SelectValue placeholder="Board" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">
                All
              </SelectItem>
              <SelectItem value="Not in space">
                Not in space
              </SelectItem>
            </SelectContent>
          </Select>
          <Select>
            <SelectTrigger className="min-w-[100px] w-1/5">
              <SelectValue placeholder="Owner" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="everyone">
                Everyone
              </SelectItem>
              <SelectItem value="mine">
                Mine
              </SelectItem>
              <SelectItem value="others">
                Others
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-4">
          <p className='font-light'>
            Sort by
          </p>
          <Select>
            <SelectTrigger className="min-w-[100px] w-1/5">
              <SelectValue placeholder="Recent" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Recent">
                Recent
              </SelectItem>
              <SelectItem value="Old">
                Old
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex gap-4 text-[1.4rem]">
        <p className='font-light'>
          View
        </p>
        <Select>
          <SelectTrigger className="min-w-[100px] w-1/5">
            <SelectValue placeholder="List" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="List">
              List
            </SelectItem>
            <SelectItem value="Grid">
              Grid
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
};

export default FiltersAndView;