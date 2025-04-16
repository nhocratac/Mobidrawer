import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { formatDate, parseTokenInfo } from "@/lib/utils";
import { serializeSlateToHtml } from "@/utils/slateToHtml";
import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { Descendant } from "slate";
import DropdownButton from "./DropdownButton";
import { fetchBlogById } from "@/app/(MobiDrawerPages)/(Resources)/Blog/[slug]/api";

export async function generateMetadata({
  params,
  searchParams,
}: Props<{ slug: string }>): Promise<Metadata> {
  const id = (await searchParams).id;
  const slug = (await params).slug;
  const blog: Blog = await fetchBlogById(id as string);

  if (!blog) {
    redirect("/404");
  }

  // Lấy thông tin từ headers
  const headersList = headers();
  const domain = headersList.get("host") || "";
  const protocol = headersList.get("x-forwarded-proto") || "http";
  const url = `${protocol}://${domain}/${slug}?id=${id}`;

  return {
    title: blog.title,
    description: blog.description,
    keywords: blog.keywords,
    openGraph: {
      title: blog.title,
      description: blog.description,
      url,
      siteName: "Mobidrawer",
      images: [
        {
          url:
            blog.thumbnail ||
            "https://mobidrawer.id.vn/favicon/android-chrome-512x512.png",
          width: 512,
          height: 512,
          alt: blog.title,
        },
      ],
      locale: "vi_VN",
      type: "website",
    },
  };
}

const page = async (props: Props<{ slug: string }>) => {
  const id = (await props.searchParams).id;
  const accessToken = cookies().get("accessToken")?.value;
  let isOwner = false;
  const blog = await fetchBlogById(id as string);

  if (!blog) {
    redirect("/404");
  }

  if (
    accessToken &&
    typeof blog.owner !== "string" &&
    blog.owner.id === parseTokenInfo(accessToken).id
  ) {
    isOwner = true;
  }

  const slateContent = JSON.parse(blog.content)
    .map((item: Descendant) => serializeSlateToHtml(item))
    .join("");

  return (
    <div className="flex flex-col items-center p-10 flex-1">
      <div
        className="space-y-[50px] max-w-[1000px] px-5"
        style={{ wordBreak: "break-word" }}
      >
        <h1 className="text-5xl font-bold">{blog.title}</h1>

        <div className="profile-bar flex gap-5 items-center">
          <Avatar className="w-[50px] h-[50px]">
            <AvatarImage src={blog.owner.avatar} alt={blog.owner.firstName} />
            <AvatarFallback>{blog.owner.lastName}</AvatarFallback>
          </Avatar>

          <div className="flex-1">
            <h1 className="text-2xl font-medium">
              {blog.owner.firstName} {blog.owner.lastName}
            </h1>
            {blog.updatedAt && (
              <p className="text-lg text-gray-500">
                Cập nhật lần cuối: {formatDate(blog.updatedAt)}
              </p>
            )}
          </div>

          <DropdownButton isOwner={isOwner} />
        </div>

        {blog.content && (
          <div className="no-reset">
            <div
              dangerouslySetInnerHTML={{
                __html: slateContent,
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default page;
