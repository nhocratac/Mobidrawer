import demo from "../../assets/demo.png";
import VideoDialog from "@/components/BoardThumbnail/VideoDialog";
export default function HeroSection() {
  return (
    <div className="flex flex-col items-center mt-6 lg:mt-20">
      <h1 className="text-4xl sm:text-6xl lg:text-7xl text-center tracking-wide">
        Powerful Collaboration Tools
        <span className="bg-gradient-to-r from-orange-500 to-red-800 text-transparent bg-clip-text">
          {" "}
          for Modern Teams
        </span>
      </h1>
      <h2 className="mt-10 text-lg text-center text-neutral-500 max-w-4xl">
        Optimize your team workflows with MobiDrawer – The ultimate solution for
        project management and remote collaboration.
      </h2>
      <div className="mx-auto mt-10 flex max-w-fit space-x-4">
        <a
          href=""
          className=" rounded-full mx-auto max-w-fit border px-5 py-2 text-lg font-medium shadow-sm border-black bg-primary text-primary-foreground hover:bg-primary/60 hover:ring-2"
        >
          Get Started
        </a>

        <a
          href=""
          className="text-white rounded-full mx-auto max-w-fit border px-5 py-2 text-lg font-medium shadow-sm border-black bg-black text-primary-foreground hover:ring-2"
        >
          Learn More
        </a>
      </div>
      <div className="flex mt-10 item-center justify-center">
        <VideoDialog
          className="rounded-lg border border-orange-700 shadow-orange-400 mx-2 my-4 w-full max-w-md" // Tailwind CSS classes for width
          linkMp4="https://mirostatic.com/app/static/529b435dbf19250f.mp4"
          linkWebm="https://mirostatic.com/app/static/bb1eba3b53c8eab7.webm"
          style={{ width: "100%", maxWidth: "600px", height: "auto" }} // Inline styles for width and height
        />
      </div>
    </div>
  );
}
